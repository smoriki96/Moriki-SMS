import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL;

function json(
  data: unknown,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isValidUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    // =========================================================
    // SERVER CONFIGURATION
    // =========================================================

    if (
      !SUPABASE_URL ||
      !SUPABASE_PUBLISHABLE_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !ADMIN_EMAIL
    ) {
      return json(
        {
          success: false,
          error:
            "Server configuration is incomplete.",
        },
        500
      );
    }

    // =========================================================
    // CUSTOMER ID
    // =========================================================

    const { id: customerId } =
      await context.params;

    if (
      !customerId ||
      !isValidUUID(customerId)
    ) {
      return json(
        {
          success: false,
          error: "Invalid customer ID.",
        },
        400
      );
    }

    // =========================================================
    // AUTHORIZATION
    // =========================================================

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (!authorization) {
      return json(
        {
          success: false,
          error:
            "You must be logged in.",
        },
        401
      );
    }

    if (
      !authorization
        .toLowerCase()
        .startsWith("bearer ")
    ) {
      return json(
        {
          success: false,
          error:
            "A valid Bearer token is required.",
        },
        401
      );
    }

    const token =
      authorization
        .substring(7)
        .trim();

    if (!token) {
      return json(
        {
          success: false,
          error:
            "A valid Bearer token is required.",
        },
        401
      );
    }

    // =========================================================
    // VERIFY ADMIN
    // =========================================================

    const authClient =
      createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const {
      data: { user },
      error: userError,
    } =
      await authClient.auth.getUser();

    if (userError || !user) {
      console.error(
        "REFUND AUTH ERROR:",
        userError
      );

      return json(
        {
          success: false,
          error:
            "Your session has expired. Please log in again.",
        },
        401
      );
    }

    const loggedInEmail =
      user.email
        ?.trim()
        .toLowerCase();

    const configuredAdminEmail =
      ADMIN_EMAIL
        .trim()
        .toLowerCase();

    if (
      !loggedInEmail ||
      loggedInEmail !==
        configuredAdminEmail
    ) {
      return json(
        {
          success: false,
          error:
            "You are not authorized to process refunds.",
        },
        403
      );
    }

    // =========================================================
    // SERVICE ROLE CLIENT
    // =========================================================

    const adminClient =
      createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    // =========================================================
    // VERIFY CUSTOMER EXISTS
    // =========================================================

    const {
      data: customerData,
      error: customerError,
    } =
      await adminClient.auth.admin.getUserById(
        customerId
      );

    if (
      customerError ||
      !customerData?.user
    ) {
      return json(
        {
          success: false,
          error:
            "Customer was not found.",
        },
        404
      );
    }

    // =========================================================
    // READ REQUEST BODY
    // =========================================================

    let body: {
      orderId?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return json(
        {
          success: false,
          error:
            "Invalid request body.",
        },
        400
      );
    }

    const orderId =
      typeof body?.orderId === "string"
        ? body.orderId.trim()
        : "";

    if (!orderId) {
      return json(
        {
          success: false,
          error:
            "Order ID is required.",
        },
        400
      );
    }

    if (!isValidUUID(orderId)) {
      return json(
        {
          success: false,
          error:
            "Invalid order ID.",
        },
        400
      );
    }

    // =========================================================
    // ATOMIC REFUND
    //
    // The database function locks the order and wallet,
    // prevents double refunds, adds the money, creates the
    // transaction, and marks the order refunded as one
    // database operation.
    // =========================================================

    const {
      data: refundResult,
      error: refundError,
    } =
      await adminClient.rpc(
        "admin_refund_order",
        {
          p_order_id: orderId,
          p_customer_id:
            customerId,
        }
      );

    if (refundError) {
      console.error(
        "ATOMIC REFUND ERROR:",
        refundError
      );

      const message =
        refundError.message ||
        "Unable to process refund.";

      const lowerMessage =
        message.toLowerCase();

      if (
        lowerMessage.includes(
          "already been refunded"
        )
      ) {
        return json(
          {
            success: false,
            error: message,
          },
          400
        );
      }

      if (
        lowerMessage.includes(
          "order was not found"
        )
      ) {
        return json(
          {
            success: false,
            error: message,
          },
          404
        );
      }

      if (
        lowerMessage.includes(
          "does not belong"
        )
      ) {
        return json(
          {
            success: false,
            error: message,
          },
          403
        );
      }

      if (
        lowerMessage.includes(
          "does not have a wallet"
        )
      ) {
        return json(
          {
            success: false,
            error: message,
          },
          404
        );
      }

      return json(
        {
          success: false,
          error: message,
        },
        500
      );
    }

    // =========================================================
    // RETURN SUCCESS
    // =========================================================

    const result =
      refundResult &&
      typeof refundResult === "object"
        ? refundResult
        : {};

    return json({
      success: true,
      message:
        "Order refunded successfully.",
      customerId,
      orderId,
      amount:
        result.amount ?? null,
      newBalance:
        result.new_balance ?? null,
      reference:
        result.reference ?? null,
      transactionId:
        result.transaction_id ?? null,
    });
  } catch (error) {
    console.error(
      "REFUND API ERROR:",
      error
    );

    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to process refund.",
      },
      500
    );
  }
}