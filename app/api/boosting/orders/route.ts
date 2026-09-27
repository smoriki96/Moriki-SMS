import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { data: orders, error } = await supabaseAdmin
      .from("boosting_orders")
      .select(
        "id, provider_order_id, service_name, platform, category, link, quantity, customer_amount, status, failure_reason, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Boosting orders lookup error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load your boosting orders.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orders: orders ?? [],
    });
  } catch (error) {
    console.error("Boosting orders error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load your boosting orders.",
      },
      { status: 500 }
    );
  }
}
