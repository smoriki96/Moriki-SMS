import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getShoprimeOrderStatus } from "../../../../../lib/shoprime";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeStatus(value: unknown) {
  const status = String(value ?? "").trim().toLowerCase();

  if (status === "pending") return "PENDING";
  if (status === "processing" || status === "in progress" || status === "in_progress") {
    return "IN_PROGRESS";
  }
  if (status === "completed" || status === "complete") return "COMPLETED";
  if (status === "partial") return "PARTIAL";
  if (status === "canceled" || status === "cancelled") return "CANCELLED";

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Please sign in to continue." },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Your session has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const orderId = request.nextUrl.searchParams.get("orderId")?.trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required." },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("boosting_orders")
      .select("id, provider_order_id, status")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    if (!order.provider_order_id) {
      return NextResponse.json({
        success: true,
        status: order.status,
        providerStatus: null,
      });
    }

    const providerResult = await getShoprimeOrderStatus(
      String(order.provider_order_id)
    );

    const rawStatus =
      providerResult &&
      !Array.isArray(providerResult)
        ? providerResult.status
        : null;

    const normalizedStatus = normalizeStatus(rawStatus);

    if (normalizedStatus) {
      await supabaseAdmin
        .from("boosting_orders")
        .update({
          status: normalizedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      success: true,
      status: normalizedStatus ?? order.status,
      providerStatus: rawStatus ?? null,
    });
  } catch (error) {
    console.error("Boosting order status error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to refresh order status.",
      },
      { status: 502 }
    );
  }
}
