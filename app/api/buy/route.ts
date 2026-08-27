import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phoneId = body.phone_id;
    const accessToken = body.access_token;

    if (!phoneId || !accessToken) {
      return NextResponse.json(
        { error: "Missing purchase information." },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          error: "User session is invalid.",
        },
        { status: 401 }
      );
    }

    const user = userData.user;

    const { data: phone, error: phoneError } =
      await supabase
        .from("phones")
        .select("*")
        .eq("id", phoneId)
        .eq("status", "available")
        .maybeSingle();

    if (phoneError) {
      return NextResponse.json(
        {
          error:
            "Phone lookup failed: " +
            phoneError.message,
        },
        { status: 500 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          error:
            "Number is no longer available.",
        },
        { status: 409 }
      );
    }

    const price = Number(phone.price);

    if (price <= 0) {
      return NextResponse.json(
        {
          error: "Invalid number price.",
        },
        { status: 400 }
      );
    }

    const {
      data: transactions,
      error: transactionError,
    } = await supabase
      .from("wallet_transactions")
      .select("amount, status")
      .eq("user_id", user.id);

    if (transactionError) {
      return NextResponse.json(
        {
          error:
            "Wallet lookup failed: " +
            transactionError.message,
        },
        { status: 500 }
      );
    }

    const balance = (transactions || [])
      .filter(
        (tx) =>
          tx.status === "success" ||
          tx.status === "completed" ||
          tx.status === "paid"
      )
      .reduce(
        (total, tx) =>
          total + Number(tx.amount || 0),
        0
      );

    if (balance < price) {
      return NextResponse.json(
        {
          error:
            `Insufficient balance. Available: ₦${balance.toLocaleString(
              "en-NG"
            )}`,
        },
        { status: 400 }
      );
    }

    const reference =
      `purchase_${Date.now()}_${phone.id}`;

    const { error: deductionError } =
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          amount: -price,
          status: "success",
          reference,
        });

    if (deductionError) {
      return NextResponse.json(
        {
          error:
            "Wallet deduction failed: " +
            deductionError.message,
        },
        { status: 500 }
      );
    }

    const {
      data: soldPhone,
      error: sellError,
    } = await supabase
      .from("phones")
      .update({
        status: "sold",
      })
      .eq("id", phone.id)
      .eq("status", "available")
      .select()
      .maybeSingle();

    if (sellError || !soldPhone) {
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          amount: price,
          status: "success",
          reference:
            `refund_${Date.now()}_${phone.id}`,
        });

      return NextResponse.json(
        {
          error:
            "Number could not be reserved. Wallet refunded.",
        },
        { status: 409 }
      );
    }

    // CREATE ORDER
    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          phone_id: phone.id,
          country: phone.country,
          service: phone.service,
          amount: price,
          payment: "wallet",
          status: "completed",
          phone_number: phone.phone_number,
        })
        .select()
        .single();

    // THIS WILL SHOW THE REAL SUPABASE ERROR
    if (orderError) {
      console.error(
        "REAL ORDER DATABASE ERROR:",
        orderError
      );

      // Put number back
      await supabase
        .from("phones")
        .update({
          status: "available",
        })
        .eq("id", phone.id);

      // Refund
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          amount: price,
          status: "success",
          reference:
            `refund_order_${Date.now()}_${phone.id}`,
        });

      return NextResponse.json(
        {
          error:
            `ORDER DATABASE ERROR: ${orderError.message}`,
          code: orderError.code,
          details: orderError.details,
          hint: orderError.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Number purchased successfully.",
      order,
      remaining_balance:
        balance - price,
    });
  } catch (error) {
    console.error(
      "BUY NUMBER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}