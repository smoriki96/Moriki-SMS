import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const authClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

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
    const { id: customerId } =
      await context.params;

    /*
     * ==========================================
     * VALIDATE CUSTOMER ID
     * ==========================================
     */

    if (
      !customerId ||
      !isValidUUID(customerId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid customer ID.",
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================
     * GET AUTHORIZATION TOKEN
     * ==========================================
     */

    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        {
          success: false,
          error: "Authorization is required.",
        },
        { status: 401 }
      );
    }

    const token =
      authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : authorization.trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid authorization token.",
        },
        { status: 401 }
      );
    }

    /*
     * ==========================================
     * VERIFY USER SESSION
     * ==========================================
     */

    const {
      data: { user },
      error: userError,
    } =
      await authClient.auth.getUser(token);

    if (userError || !user) {
      console.error(
        "ADMIN FUNDS AUTH ERROR:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Your session is invalid or has expired.",
        },
        { status: 401 }
      );
    }

    /*
     * ==========================================
     * VERIFY ADMIN EMAIL
     * ==========================================
     */

    const adminEmail =
      process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    const loggedInEmail =
      user.email
        ?.trim()
        .toLowerCase();

    if (
      !adminEmail ||
      !loggedInEmail ||
      loggedInEmail !== adminEmail
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to add customer funds.",
        },
        { status: 403 }
      );
    }

    /*
     * ==========================================
     * READ REQUEST BODY
     * ==========================================
     */

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const amount = Number(body?.amount);

    const description =
      typeof body?.description === "string" &&
      body.description.trim()
        ? body.description.trim()
        : "Admin wallet funding";

    /*
     * ==========================================
     * VALIDATE AMOUNT
     * ==========================================
     */

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid amount greater than ₦0.",
        },
        { status: 400 }
      );
    }

    const cleanAmount =
      Math.round(amount * 100) / 100;

    /*
     * ==========================================
     * CHECK CUSTOMER EXISTS
     * ==========================================
     */

    const {
      data: customer,
      error: customerError,
    } =
      await adminClient.auth.admin.getUserById(
        customerId
      );

    if (
      customerError ||
      !customer?.user
    ) {
      console.error(
        "ADMIN FUNDS CUSTOMER ERROR:",
        customerError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Customer account could not be found.",
        },
        { status: 404 }
      );
    }

    /*
     * ==========================================
     * ATOMIC WALLET FUNDING
     * ==========================================
     *
     * The RPC performs:
     *
     * 1. Lock wallet
     * 2. Add funds
     * 3. Record transaction
     *
     * All inside ONE database transaction.
     */

    const {
      data: result,
      error: rpcError,
    } =
      await adminClient.rpc(
        "admin_add_funds",
        {
          p_customer_id: customerId,
          p_amount: cleanAmount,
          p_description: description,
        }
      );

    if (rpcError) {
      console.error(
        "ADMIN FUNDS RPC ERROR:",
        rpcError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            rpcError.message ||
            "Unable to add customer funds.",
        },
        { status: 500 }
      );
    }

    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

    return NextResponse.json({
      success: true,
      message:
        "Customer funds added successfully.",
      customerId,
      amount: Number(
        result?.amount ?? cleanAmount
      ),
      previousBalance: Number(
        result?.previous_balance ?? 0
      ),
      newBalance: Number(
        result?.new_balance ?? 0
      ),
      transactionId:
        result?.transaction_id ?? null,
    });
  } catch (error) {
    console.error(
      "ADMIN FUNDS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to add customer funds.",
      },
      { status: 500 }
    );
  }
}