import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "namoriki30@gmail.com";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabasePublishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !supabasePublishableKey ||
      !serviceRoleKey
    ) {
      return NextResponse.json(
        {
          error: "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.substring(7).trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const authClient = createClient(
      supabaseUrl,
      supabasePublishableKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const {
      data: userData,
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    const email = userData.user.email || "";

    if (
      email.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

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

    const pageSize = 1000;
    let from = 0;

    const allOrders: Array<{
      amount: number | null;
      provider_cost: number | null;
      status: string | null;
    }> = [];

    while (true) {
      const {
        data,
        error,
      } = await adminClient
        .from("orders")
        .select(
          "amount,provider_cost,status"
        )
        .range(
          from,
          from + pageSize - 1
        );

      if (error) {
        console.error(
          "ADMIN PROFIT ORDERS ERROR:",
          error
        );

        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        break;
      }

      allOrders.push(...data);

      if (data.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    const validOrders = allOrders.filter(
      (order) => {
        const status = String(
          order.status || ""
        ).toLowerCase();

        return (
          status !== "refunded" &&
          status !== "cancelled" &&
          status !== "canceled"
        );
      }
    );

    const totalRevenue =
      validOrders.reduce(
        (total, order) =>
          total +
          Number(order.amount || 0),
        0
      );

    const totalProviderCost =
      validOrders.reduce(
        (total, order) =>
          total +
          Number(
            order.provider_cost || 0
          ),
        0
      );

    const totalProfit =
      totalRevenue -
      totalProviderCost;

    const availableProfit =
      validOrders.reduce(
        (total, order) => {
          const amount =
            Number(order.amount || 0);

          const providerCost =
            Number(
              order.provider_cost || 0
            );

          return (
            total +
            (amount - providerCost)
          );
        },
        0
      );

    const refundedOrders =
      allOrders.filter(
        (order) => {
          const status = String(
            order.status || ""
          ).toLowerCase();

          return (
            status === "refunded" ||
            status === "cancelled" ||
            status === "canceled"
          );
        }
      ).length;

    return NextResponse.json({
      success: true,
      ordersAnalyzed: allOrders.length,
      validOrders: validOrders.length,
      refundedOrders,

      totalRevenue:
        Math.round(
          totalRevenue * 100
        ) / 100,

      totalProviderCost:
        Math.round(
          totalProviderCost * 100
        ) / 100,

      totalProfit:
        Math.round(
          totalProfit * 100
        ) / 100,

      availableProfit:
        Math.round(
          availableProfit * 100
        ) / 100,
    });
  } catch (error) {
    console.error(
      "ADMIN PROFIT API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
