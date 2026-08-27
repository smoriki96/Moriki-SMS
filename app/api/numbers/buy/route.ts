import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { phone_id, access_token } = await request.json();

    if (!phone_id || !access_token) {
      return NextResponse.json(
        { error: "Missing phone ID or login session." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase server configuration." },
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

    // Get logged-in user
    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser(access_token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Invalid login session." },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // Get available number
    const { data: phone, error: phoneError } =
      await supabase
        .from("phones")
        .select("*")
        .eq("id", phone_id)
        .eq("status", "available")
        .maybeSingle();

    if (phoneError) {
      return NextResponse.json(
        {
          error:
            "PHONE ERROR: " + phoneError.message,
        },
        { status: 500 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          error: "This number is no longer available.",
        },
        { status: 409 }
      );
    }

    const price = Number(phone.price);

    if (!price || price <= 0) {
      return NextResponse.json(
        {
          error: "Invalid number price.",
        },
        { status: 400 }
      );
    }

    // Get wallet transactions
    const {
      data: transactions,
      error: walletError,
    } = await supabase
      .from("wallet_transactions")
      .select("amount, status")
      .eq("user_id", userId);

    if (walletError) {
      return NextResponse.json(
        {
          error:
            "WALLET ERROR: " +
            walletError.message,
        },
        { status: 500 }
      );
    }

    // Calculate balance
    const balance = (transactions || [])
      .filter(
        (item) =>
          item.status === "success" ||
          item.status === "completed" ||
          item.status === "paid"
      )
      .reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      );

    if (balance < price) {
      return NextResponse.json(
        {
          error:
            `Insufficient balance. Your balance is ₦${balance.toLocaleString(
              "en-NG"
            )}. Number price is ₦${price.toLocaleString(
              "en-NG"
            )}.`,
        },
        { status: 400 }
      );
    }

    // Unique purchase reference
    const reference =
      `purchase_${Date.now()}_${phone.id}`;

    // Deduct wallet
    const {
      error: deductionError,
    } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: userId,
        amount: -price,
        status: "success",
        reference: reference,
      });

    if (deductionError) {
      return NextResponse.json(
        {
          error:
            "DEDUCTION ERROR: " +
            deductionError.message,
        },
        { status: 500 }
      );
    }

    // Mark number as sold
    const {
      data: soldPhone,
      error: soldError,
    } = await supabase
      .from("phones")
      .update({
        status: "sold",
      })
      .eq("id", phone.id)
      .eq("status", "available")
      .select()
      .maybeSingle();

    if (soldError || !soldPhone) {
      // Refund wallet
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: userId,
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

    // Create order
    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        phone_id: phone.id,
        phone_number: phone.phone_number,
        country: phone.country,
        service: phone.service,
        amount: price,
        payment: "wallet",
        payment_reference: reference,
        status: "completed",
      })
      .select()
      .single();

    if (orderError) {
      console.error(
        "ORDER DATABASE ERROR:",
        orderError
      );

      // Put number back
      await supabase
        .from("phones")
        .update({
          status: "available",
        })
        .eq("id", phone.id);

      // Refund wallet
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: userId,
          amount: price,
          status: "success",
          reference:
            `refund_order_${Date.now()}_${phone.id}`,
        });

      return NextResponse.json(
        {
          error:
            "ORDER ERROR: " +
            orderError.message,
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
            : "Unknown error.",
      },
      { status: 500 }
    );
  }
}