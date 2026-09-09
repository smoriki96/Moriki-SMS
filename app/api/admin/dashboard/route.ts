import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "namoriki30@gmail.com";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    /*
     * -------------------------------------------------------
     * 1. CHECK SERVER CONFIGURATION
     * -------------------------------------------------------
     */

    if (
      !SUPABASE_URL ||
      !SUPABASE_PUBLISHABLE_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Supabase server configuration is incomplete.",
        },
        500
      );
    }

    /*
     * -------------------------------------------------------
     * 2. GET ACCESS TOKEN
     * -------------------------------------------------------
     */

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    const accessToken =
      authorization.substring("Bearer ".length).trim();

    if (!accessToken) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    /*
     * -------------------------------------------------------
     * 3. VERIFY THE LOGGED-IN USER
     * -------------------------------------------------------
     */

    const authClient = createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
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
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return jsonResponse(
        {
          success: false,
          error:
            "Your login session is invalid or expired.",
        },
        401
      );
    }

    /*
     * -------------------------------------------------------
     * 4. ADMIN CHECK
     * -------------------------------------------------------
     */

    if (
      !user.email ||
      user.email.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Administrator access required.",
        },
        403
      );
    }

    /*
     * -------------------------------------------------------
     * 5. SERVER-ONLY SERVICE ROLE CLIENT
     * -------------------------------------------------------
     */

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

    /*
     * -------------------------------------------------------
     * 6. LOAD ORDERS
     *
     * We use "*" here instead of selecting individual
     * columns. This prevents the dashboard from breaking
     * if an optional order column is missing.
     * -------------------------------------------------------
     */

    const {
      data: orders,
      error: ordersError,
    } = await adminClient
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(500);

    if (ordersError) {
      console.error(
        "ADMIN DASHBOARD ORDERS ERROR:",
        ordersError
      );

      return jsonResponse(
        {
          success: false,
          error: "Could not load orders.",
          details: ordersError.message,
        },
        500
      );
    }

    /*
     * -------------------------------------------------------
     * 7. LOAD WALLETS
     * -------------------------------------------------------
     */

    const {
      data: wallets,
      error: walletsError,
    } = await adminClient
      .from("wallets")
      .select("*")
      .order("balance", {
        ascending: false,
      })
      .limit(2000);

    if (walletsError) {
      console.error(
        "ADMIN DASHBOARD WALLETS ERROR:",
        walletsError
      );

      return jsonResponse(
        {
          success: false,
          error: "Could not load wallets.",
          details: walletsError.message,
        },
        500
      );
    }

    /*
     * -------------------------------------------------------
     * 8. LOAD LATEST TRANSACTIONS
     * -------------------------------------------------------
     */

    const {
      data: transactions,
      error: transactionsError,
    } = await adminClient
      .from("wallet_transactions")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(500);

    if (transactionsError) {
      console.error(
        "ADMIN DASHBOARD TRANSACTIONS ERROR:",
        transactionsError
      );

      return jsonResponse(
        {
          success: false,
          error: "Could not load transactions.",
          details: transactionsError.message,
        },
        500
      );
    }

    /*
     * -------------------------------------------------------
     * 9. NORMALIZE ARRAYS
     * -------------------------------------------------------
     */

    const allOrders = Array.isArray(orders)
      ? orders
      : [];

    const allWallets = Array.isArray(wallets)
      ? wallets
      : [];

    const allTransactions =
      Array.isArray(transactions)
        ? transactions
        : [];

    /*
     * -------------------------------------------------------
     * 10. DETERMINE ORDER STATUS
     * -------------------------------------------------------
     */

    function getOrderStatus(order: any) {
      return String(
        order?.status ||
          order?.order_status ||
          order?.payment_status ||
          ""
      )
        .trim()
        .toLowerCase();
    }

    /*
     * -------------------------------------------------------
     * 11. REFUNDED / CANCELLED ORDERS
     * -------------------------------------------------------
     */

    const refundedOrCancelledOrders =
      allOrders.filter((order) => {
        const status = getOrderStatus(order);

        return (
          status === "refunded" ||
          status === "cancelled" ||
          status === "canceled"
        );
      });

    /*
     * -------------------------------------------------------
     * 12. VALID ORDERS
     *
     * These are the orders counted toward revenue and
     * provider cost.
     * -------------------------------------------------------
     */

    const validOrders = allOrders.filter((order) => {
      const status = getOrderStatus(order);

      return (
        status !== "refunded" &&
        status !== "cancelled" &&
        status !== "canceled"
      );
    });

    /*
     * -------------------------------------------------------
     * 13. TOTAL REVENUE
     * -------------------------------------------------------
     */

    const totalRevenue = validOrders.reduce(
      (sum, order) => {
        return (
          sum + Number(order?.amount ?? 0)
        );
      },
      0
    );

    /*
     * -------------------------------------------------------
     * 14. TOTAL 5SIM PROVIDER COST
     * -------------------------------------------------------
     */

    const totalProviderCost =
      validOrders.reduce(
        (sum, order) => {
          return (
            sum +
            Number(
              order?.provider_cost ?? 0
            )
          );
        },
        0
      );

    /*
     * -------------------------------------------------------
     * 15. TOTAL PROFIT
     * -------------------------------------------------------
     */

    const totalProfit =
      totalRevenue - totalProviderCost;

    /*
     * -------------------------------------------------------
     * 16. TOTAL CUSTOMER WALLET FUNDS
     * -------------------------------------------------------
     */

    const totalWalletFunds =
      allWallets.reduce(
        (sum, wallet) => {
          return (
            sum +
            Number(wallet?.balance ?? 0)
          );
        },
        0
      );

    /*
     * -------------------------------------------------------
     * 17. ACTIVE ORDERS
     * -------------------------------------------------------
     */

    const activeOrders =
      allOrders.filter((order) => {
        const status = getOrderStatus(order);

        return (
          status === "pending" ||
          status === "active" ||
          status === "processing"
        );
      }).length;

    /*
     * -------------------------------------------------------
     * 18. DASHBOARD RESPONSE
     * -------------------------------------------------------
     */

    return jsonResponse({
      success: true,

      orders: allOrders,

      wallets: allWallets,

      transactions: allTransactions,

      stats: {
        totalRevenue,
        totalProviderCost,
        totalProfit,
        totalWalletFunds,

        totalOrders:
          allOrders.length,

        activeOrders,

        refundedOrders:
          refundedOrCancelledOrders.length,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN DASHBOARD SERVER ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500
    );
  }
}