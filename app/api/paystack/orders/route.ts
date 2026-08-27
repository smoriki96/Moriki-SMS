import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      user_id,
      country,
      service,
      amount,
      payment_reference,
    } = body;

    if (
      !user_id ||
      !country ||
      !service ||
      !amount ||
      !payment_reference
    ) {
      return NextResponse.json(
        {
          error: "Missing order information",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error:
            "Supabase environment variables are missing",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id,
        country,
        service,
        amount,
        payment_reference,
        payment_status: "paid",
        order_status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Supabase order error:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: data,
    });
  } catch (error) {
    console.error(
      "Create order error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to create order",
      },
      { status: 500 }
    );
  }
}