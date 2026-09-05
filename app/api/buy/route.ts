import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phoneId = body.phone_id || body.phoneId;
    const country = body.country;
    const service = body.product || body.service;
    const operator = body.operator;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase server configuration is missing.",
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

    /*
     * Get logged-in user
     */
    const authHeader =
      request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Please log in before buying a number.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authHeader.replace("Bearer ", "");

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your login session has expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    const user = userData.user;

    /*
     * Find available number
     */
    let phone: any = null;

    if (phoneId) {
      const {
        data,
        error,
      } = await supabase
        .from("phones")
        .select("*")
        .eq("id", phoneId)
        .eq("status", "available")
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Phone lookup failed: " +
              error.message,
          },
          { status: 500 }
        );
      }

      phone = data;
    } else {
      if (!country || !service) {
        return NextResponse.json(
          {
            success: false,
            error: "Country and service are required.",
          },
          { status: 400 }
        );
      }

      let query = supabase
        .from("phones")
        .select("*")
        .eq("status", "available")
        .eq("country", country)
        .eq("service", service);

      if (operator) {
        query = query.eq("operator", operator);
      }

      const {
        data,
        error,
      } = await query
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Number lookup failed: " +
              error.message,
          },
          { status: 500 }
        );
      }

      phone = data;
    }

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No number is currently available for this selection.",
        },
        { status: 404 }
      );
    }

    /*
     * Customer selling price
     */
    const price = Number(phone.price);

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid number price.",
        },
        { status: 400 }
      );
    }

    /*
     * Calculate wallet balance
     */
    const {
      data: transactions,
      error: transactionError,
    } =
      await supabase
        .from("wallet_transactions")
        .select("amount, status")
        .eq("user_id", user.id);

    if (transactionError) {
      return NextResponse.json(
        {
          success: false,
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

    /*
     * Check customer balance
     */
    if (balance < price) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Not enough user balance. Available: ₦${balance.toLocaleString(
              "en-NG"
            )}. Required: ₦${price.toLocaleString(
              "en-NG"
            )}.`,
        },
        { status: 400 }
      );
    }

    const purchaseReference =
      `purchase_${Date.now()}_${phone.id}`;

    /*
     * Deduct wallet
     */
    const {
      error: deductionError,
    } =
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          amount: -price,
          status: "success",
          reference: purchaseReference,
        });

    if (deductionError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Wallet deduction failed: " +
            deductionError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Reserve number
     */
    const {
      data: soldPhone,
      error: sellError,
    } =
      await supabase
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
          success: false,
          error:
            "Number could not be reserved. Your wallet has been refunded.",
        },
        { status: 409 }
      );
    }

    /*
     * TEST MODE ACTIVATION
     *
     * This is a demo activation ID.
     * No real 5SIM purchase is made.
     */
    const activationId =
      `demo_${Date.now()}_${phone.id}`;

    /*
     * Create order
     */
    const {
      data: order,
      error: orderError,
    } =
      await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          phone_id: phone.id,

          country:
            phone.country || country || null,

          service:
            phone.service || service || null,

          amount: price,

          payment: "wallet",

          status: "completed",

          phone_number:
            phone.phone_number || null,

          activation_id: activationId,
        })
        .select()
        .single();

    /*
     * If order creation fails,
     * return the number to inventory
     * and refund the customer.
     */
    if (orderError) {
      console.error(
        "REAL ORDER DATABASE ERROR:",
        orderError
      );

      await supabase
        .from("phones")
        .update({
          status: "available",
        })
        .eq("id", phone.id);

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
          success: false,
          error:
            `ORDER DATABASE ERROR: ${orderError.message}`,
          code: orderError.code,
          details: orderError.details,
          hint: orderError.hint,
        },
        { status: 500 }
      );
    }

    /*
     * Successful purchase
     */
    return NextResponse.json({
      success: true,

      message:
        "Number purchased successfully.",

      orderId:
        order.id,

      activationId:
        activationId,

      number:
        phone.phone_number || null,

      country:
        phone.country || country || null,

      service:
        phone.service || service || null,

      price:
        price,

      remaining_balance:
        balance - price,

      test_mode:
        true,
    });
  } catch (error) {
    console.error(
      "BUY NUMBER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to purchase number.",
      },
      { status: 500 }
    );
  }
}