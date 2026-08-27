import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Paystack secret key is missing.",
        },
        { status: 500 }
      );
    }

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /*
     * Get the logged-in user from the
     * Authorization header.
     */
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Please log in before funding your wallet.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Your login session has expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const amount = Number(body?.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid funding amount.",
        },
        { status: 400 }
      );
    }

    /*
     * Paystack expects the amount in kobo.
     */
    const amountInKobo = Math.round(
      amount * 100
    );

    /*
     * Use the current website URL so that
     * Paystack returns to this same deployment.
     */
    const origin =
      request.headers.get("origin") ||
      new URL(request.url).origin;

    const callbackUrl =
      `${origin}/api/paystack/verify`;

    /*
     * Initialize Paystack payment.
     */
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email:
            user.email ||
            `user-${user.id}@morikisms.local`,

          amount: amountInKobo,

          callback_url: callbackUrl,

          metadata: {
            user_id: user.id,
            email: user.email || "",
            wallet_funding: true,
          },
        }),
        cache: "no-store",
      }
    );

    const paystackData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      !paystackData?.data?.authorization_url
    ) {
      console.error(
        "PAYSTACK INITIALIZE ERROR:",
        paystackData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData?.message ||
            "Unable to initialize Paystack payment.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,

      authorization_url:
        paystackData.data.authorization_url,

      access_code:
        paystackData.data.access_code,

      reference:
        paystackData.data.reference,
    });
  } catch (error) {
    console.error(
      "PAYSTACK INITIALIZE SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to start payment.",
      },
      { status: 500 }
    );
  }
}