import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { shoprimeRequest } from "../../../../lib/shoprime";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Please sign in to continue.", 401);
    }

    const token = authHeader.substring(7);

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return errorResponse("Your session has expired. Please sign in again.", 401);
    }

    const body = await request.json();

    const serviceId = String(body?.serviceId ?? "").trim();
    const link = String(body?.link ?? "").trim();
    const quantity = Number(body?.quantity);

    if (!serviceId || !link) {
      return errorResponse("Service and link are required.");
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return errorResponse("Enter a valid quantity.");
    }

    if (!/^https?:\/\/\S+$/i.test(link)) {
      return errorResponse("Enter a valid link.");
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("boosting_services")
      .select(
        "id, provider_service_id, platform, category, name, provider_rate, min_quantity, max_quantity, markup_type, markup_value, enabled"
      )
      .eq("id", serviceId)
      .eq("enabled", true)
      .single();

    if (serviceError || !service) {
      console.error("Boosting service lookup error:", serviceError);
      return errorResponse("This service is currently unavailable.");
    }

    if (
      quantity < Number(service.min_quantity) ||
      quantity > Number(service.max_quantity)
    ) {
      return errorResponse(
        `Quantity must be between ${Number(service.min_quantity).toLocaleString()} and ${Number(service.max_quantity).toLocaleString()}.`
      );
    }

    const providerRate = Number(service.provider_rate);
    const markupValue = Number(service.markup_value);

    const customerRate =
      service.markup_type === "percentage"
        ? providerRate * (1 + markupValue / 100)
        : providerRate + markupValue;

    const providerCost = (providerRate / 1000) * quantity;
    const customerAmount = (customerRate / 1000) * quantity;
    const profit = customerAmount - providerCost;

    const idempotencyKey =
      request.headers.get("x-idempotency-key") ||
      `${user.id}-${service.id}-${Date.now()}-${crypto.randomUUID()}`;

    const { data: createdOrder, error: createError } = await supabaseAdmin.rpc(
      "create_boosting_order",
      {
        p_user_id: user.id,
        p_provider_service_id: String(service.provider_service_id),
        p_service_name: String(service.name),
        p_platform: String(service.platform),
        p_category: String(service.category),
        p_link: link,
        p_quantity: quantity,
        p_provider_rate: providerRate,
        p_provider_cost: providerCost,
        p_customer_amount: customerAmount,
        p_profit: profit,
        p_idempotency_key: idempotencyKey,
      }
    );

    if (createError) {
      console.error("Create boosting order error:", createError);

      const message = createError.message.toLowerCase();

      if (message.includes("insufficient")) {
        return errorResponse("Insufficient wallet balance.");
      }

      return errorResponse("Unable to create your order.", 500);
    }

    const localOrderId =
      createdOrder?.order_id ??
      createdOrder?.id ??
      createdOrder?.order?.id;

    if (!localOrderId) {
      console.error("Missing local boosting order ID:", createdOrder);
      return errorResponse("Unable to create your order.", 500);
    }

    let providerResult:
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null = null;

    try {
      providerResult = await shoprimeRequest("add", {
        service: String(service.provider_service_id),
        link,
        quantity,
      });
    } catch (providerError) {
      console.error("Shoprime add error:", providerError);

      const reason =
        providerError instanceof Error
          ? providerError.message
          : "Provider request failed.";

      await supabaseAdmin.rpc("refund_boosting_order", {
        p_order_id: localOrderId,
        p_reason: reason,
      });

      return errorResponse(
        "The provider could not accept this order. Your wallet has been refunded.",
        502
      );
    }

    const providerOrderId =
      providerResult &&
      !Array.isArray(providerResult)
        ? String(
            providerResult.order ??
              providerResult.order_id ??
              providerResult.id ??
              ""
          ).trim()
        : "";

    if (!providerOrderId) {
      console.error("Shoprime response missing order ID:", providerResult);

      await supabaseAdmin
        .from("boosting_orders")
        .update({
          status: "PROVIDER_UNKNOWN",
          failure_reason: "Provider accepted response without an order ID.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", localOrderId);

      return NextResponse.json(
        {
          success: false,
          pending: true,
          error:
            "Your payment was received, but the provider response is still being confirmed.",
          orderId: localOrderId,
        },
        { status: 202 }
      );
    }

    const { data: confirmed, error: confirmError } =
      await supabaseAdmin.rpc("confirm_boosting_order", {
        p_order_id: localOrderId,
        p_provider_order_id: providerOrderId,
      });

    if (confirmError) {
      console.error("Confirm boosting order error:", confirmError);

      await supabaseAdmin
        .from("boosting_orders")
        .update({
          provider_order_id: providerOrderId,
          provider_response_received: true,
          status: "SUBMITTED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", localOrderId);
    }

    return NextResponse.json({
      success: true,
      order: {
        id: localOrderId,
        providerOrderId,
        status: "SUBMITTED",
        amount: Math.round(customerAmount * 100) / 100,
        quantity,
        service: service.name,
      },
      confirmation: confirmed ?? null,
    });
  } catch (error) {
    console.error("Boosting order error:", error);

    return errorResponse(
      "Unable to place your boosting order right now.",
      500
    );
  }
}
