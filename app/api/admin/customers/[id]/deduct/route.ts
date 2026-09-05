import { NextRequest, NextResponse } from "next/server";
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
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    // ==========================================
    // SERVER CONFIGURATION
    // ==========================================

    if (
      !SUPABASE_URL ||
      !SUPABASE_PUBLISHABLE_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !ADMIN_EMAIL
    ) {
      console.error(
        "DEDUCT FUNDS: Missing server configuration."
      );

      return json(
        {
          success: false,
          error:
            "Server configuration is incomplete.",
        },
        500
      );
    }

    // ==========================================
    // CUSTOMER ID
    // ==========================================

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

    // ==========================================
    // AUTHORIZATION
    // ==========================================

    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return json(
        {
          success: false,
          error: "Authorization is required.",
        },
        401
      );
    }

    const token =
      authorization
        .replace(/^Bearer\s+/i, "")
        .trim();

    if (!token) {
      return json(
        {
          success: false,
          error:
            "Invalid authorization token.",
        },
        401
      );
    }

    // ==========================================
    // VERIFY LOGGED-IN USER
    // ==========================================

    const authClient = createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
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
      await authClient.auth.getUser(token);

    if (userError || !user) {
      console.error(
        "DEDUCT FUNDS AUTH ERROR:",
        userError
      );

      return json(
        {
          success: false,
          error:
            "Your session is invalid or has expired.",
        },
        401
      );
    }

    // ==========================================
    // VERIFY ADMIN
    // ==========================================

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
      console.error(
        "DEDUCT FUNDS ADMIN ACCESS DENIED:",
        {
          loggedInEmail,
        }
      );

      return json(
        {
          success: false,
          error:
            "You are not authorized to deduct funds.",
        },
        403
      );
    }

    // ==========================================
    // READ REQUEST BODY
    // ==========================================

    let body: any;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    const amount =
      Number(body?.amount);

    const description =
      typeof body?.description === "string" &&
      body.description.trim()
        ? body.description.trim()
        : "Admin wallet deduction";

    // ==========================================
    // VALIDATE AMOUNT
    // ==========================================

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return json(
        {
          success: false,
          error:
            "Enter a valid amount greater than zero.",
        },
        400
      );
    }

    const cleanAmount =
      Math.round(amount * 100) / 100;

    // ==========================================
    // SERVICE ROLE CLIENT
    // ==========================================

    const adminClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ==========================================
    // VERIFY CUSTOMER EXISTS
    // ==========================================

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
      console.error(
        "DEDUCT FUNDS CUSTOMER ERROR:",
        customerError
      );

      return json(
        {
          success: false,
          error:
            "Customer account could not be found.",
        },
        404
      );
    }

    // ==========================================
    // ATOMIC DEDUCTION
    // ==========================================

    const {
      data: result,
      error: rpcError,
    } =
      await adminClient.rpc(
        "admin_deduct_funds",
        {
          p_customer_id: customerId,
          p_amount: cleanAmount,
          p_description: description,
        }
      );

    if (rpcError) {
      console.error(
        "DEDUCT FUNDS RPC ERROR:",
        rpcError
      );

      const message =
        rpcError.message || "";

      if (
        message
          .toLowerCase()
          .includes("insufficient wallet balance")
      ) {
        return json(
          {
            success: false,
            error:
              "Insufficient wallet balance.",
          },
          400
        );
      }

      if (
        message
          .toLowerCase()
          .includes(
            "does not have a wallet"
          )
      ) {
        return json(
          {
            success: false,
            error:
              "This customer does not have a wallet.",
          },
          404
        );
      }

      if (
        message
          .toLowerCase()
          .includes(
            "greater than zero"
          )
      ) {
        return json(
          {
            success: false,
            error:
              "Enter a valid amount greater than zero.",
          },
          400
        );
      }

      return json(
        {
          success: false,
          error:
            "Unable to deduct funds.",
        },
        500
      );
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    return json({
      success: true,
      message:
        "Funds deducted successfully.",
      customerId,
      amount: Number(
        result?.amount ?? cleanAmount
      ),
      previousBalance: Number(
        result?.previous_balance ?? 0
      ),
      balance: Number(
        result?.new_balance ?? 0
      ),
      transactionId:
        result?.transaction_id ?? null,
    });
  } catch (error) {
    console.error(
      "DEDUCT FUNDS API ERROR:",
      error
    );

    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to deduct funds.",
      },
      500
    );
  }
}