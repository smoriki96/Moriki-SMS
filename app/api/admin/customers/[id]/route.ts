import { NextResponse } from "next/server";
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function numberValue(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function getTransactionDirection(
  transaction: any
) {
  if (transaction?.direction) {
    return String(
      transaction.direction
    ).toLowerCase() === "credit"
      ? "credit"
      : "debit";
  }

  const type = String(
    transaction?.type || ""
  ).toLowerCase();

  if (
    type === "deposit" ||
    type === "fund" ||
    type === "funding" ||
    type === "credit" ||
    type === "refund" ||
    type === "refund_credit" ||
    type === "wallet_funding" ||
    type === "payment"
  ) {
    return "credit";
  }

  return "debit";
}

function getTransactionReference(
  transaction: any
) {
  return (
    transaction?.reference ??
    transaction?.transaction_reference ??
    transaction?.transactionReference ??
    transaction?.ref ??
    transaction?.reference_id ??
    transaction?.referenceId ??
    transaction?.id ??
    null
  );
}

function getOrderReference(order: any) {
  return (
    order?.reference ??
    order?.transaction_reference ??
    order?.transactionReference ??
    order?.order_reference ??
    order?.orderReference ??
    order?.ref ??
    order?.id ??
    null
  );
}

function getOrderNumber(order: any) {
  return (
    order?.phone_number ??
    order?.number ??
    order?.phone ??
    null
  );
}

function getOrderAmount(order: any) {
  return Math.abs(
    numberValue(
      order?.price ??
      order?.amount ??
      order?.cost ??
      0
    )
  );
}

function getOrderDescription(order: any) {
  const service =
    order?.service ??
    order?.product ??
    "Number purchase";

  const country =
    order?.country ??
    "";

  const phone =
    getOrderNumber(order);

  return [
    "Number purchase",
    service,
    country,
    phone,
  ]
    .filter(Boolean)
    .join(" • ");
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    /*
     * SERVER CONFIGURATION
     */

    if (
      !SUPABASE_URL ||
      !SUPABASE_PUBLISHABLE_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !ADMIN_EMAIL
    ) {
      console.error(
        "ADMIN CUSTOMER API: Missing environment variables"
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

    /*
     * CUSTOMER ID
     */

    const { id } =
      await context.params;

    const customerId =
      String(id || "").trim();

    if (!customerId) {
      return json(
        {
          success: false,
          error:
            "Customer ID is required.",
        },
        400
      );
    }

    if (!isUuid(customerId)) {
      console.error(
        "ADMIN CUSTOMER API: Invalid UUID:",
        customerId
      );

      return json(
        {
          success: false,
          error:
            "Invalid customer ID.",
        },
        400
      );
    }

    /*
     * ADMIN SESSION
     */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (!authorization) {
      return json(
        {
          success: false,
          error:
            "You must be logged in.",
        },
        401
      );
    }

    const userClient =
      createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
          global: {
            headers: {
              Authorization:
                authorization,
            },
          },
        }
      );

    const {
      data: {
        user: adminUser,
      },
      error: adminAuthError,
    } =
      await userClient.auth.getUser();

    if (
      adminAuthError ||
      !adminUser
    ) {
      console.error(
        "ADMIN AUTH ERROR:",
        adminAuthError
      );

      return json(
        {
          success: false,
          error:
            "Your session has expired. Please log in again.",
        },
        401
      );
    }

    /*
     * ADMIN EMAIL CHECK
     */

    const loggedInEmail =
      adminUser.email
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
        "ADMIN EMAIL MISMATCH:",
        loggedInEmail
      );

      return json(
        {
          success: false,
          error:
            "You are not authorized to access customer management.",
        },
        403
      );
    }

    /*
     * SERVICE ROLE CLIENT
     */

    const adminClient =
      createClient(
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
     * CUSTOMER
     *
     * IMPORTANT:
     * Do not return 404 merely because the
     * Auth lookup has an issue.
     */

    const {
      data: customerAuth,
      error:
        customerAuthError,
    } =
      await adminClient.auth.admin.getUserById(
        customerId
      );

    if (
      customerAuthError ||
      !customerAuth?.user
    ) {
      console.error(
        "CUSTOMER AUTH LOOKUP ERROR:",
        customerAuthError
      );

      /*
       * We still try to find the customer
       * through the application tables.
       */

      const {
        data: walletCustomer,
        error:
          walletCustomerError,
      } =
        await adminClient
          .from("wallets")
          .select(
            "user_id"
          )
          .eq(
            "user_id",
            customerId
          )
          .maybeSingle();

      if (
        walletCustomerError ||
        !walletCustomer
      ) {
        return json(
          {
            success: false,
            error:
              "Customer could not be found.",
          },
          404
        );
      }
    }

    const customerEmail =
      customerAuth?.user?.email ||
      null;

    /*
     * WALLET
     */

    const {
      data: walletData,
      error: walletError,
    } =
      await adminClient
        .from("wallets")
        .select(
          "id, user_id, balance, updated_at"
        )
        .eq(
          "user_id",
          customerId
        )
        .maybeSingle();

    if (walletError) {
      console.error(
        "CUSTOMER WALLET ERROR:",
        walletError
      );

      return json(
        {
          success: false,
          error:
            "Unable to load customer wallet.",
          details:
            walletError.message,
        },
        500
      );
    }

    /*
     * ORDERS
     */

    const {
      data: orderData,
      error: orderError,
    } =
      await adminClient
        .from("orders")
        .select("*")
        .eq(
          "user_id",
          customerId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(100);

    if (orderError) {
      console.error(
        "CUSTOMER ORDERS ERROR:",
        orderError
      );

      return json(
        {
          success: false,
          error:
            "Unable to load customer orders.",
          details:
            orderError.message,
        },
        500
      );
    }

    /*
     * WALLET TRANSACTIONS
     */

    const {
      data: transactionData,
      error:
        transactionError,
    } =
      await adminClient
        .from("wallet_transactions")
        .select("*")
        .eq(
          "user_id",
          customerId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(100);

    /*
     * If transaction history fails,
     * continue with orders.
     */

    const orders =
      orderData || [];

    const transactions =
      transactionData || [];

    /*
     * FORMAT WALLET TRANSACTIONS
     */

    const formattedWalletTransactions =
      transactions.map(
        (transaction: any) => {
          const direction =
            getTransactionDirection(
              transaction
            );

          const amount =
            Math.abs(
              numberValue(
                transaction?.amount
              )
            );

          return {
            ...transaction,

            amount,

            display_amount:
              direction === "credit"
                ? amount
                : -amount,

            direction,

            reference:
              getTransactionReference(
                transaction
              ),

            category:
              direction === "credit"
                ? String(
                    transaction?.type ||
                      ""
                  ).toLowerCase() ===
                  "refund"
                  ? "refund"
                  : "funding"
                : "debit",

            source:
              "wallet_transaction",

            number:
              transaction?.number ??
              null,

            country:
              transaction?.country ??
              null,

            operator:
              transaction?.operator ??
              null,

            service:
              transaction?.service ??
              null,
          };
        }
      );

    /*
     * FORMAT PURCHASE TRANSACTIONS
     */

    const formattedPurchaseTransactions =
      orders.map(
        (order: any) => ({
          id:
            `order-${order.id}`,

          user_id:
            customerId,

          wallet_id:
            walletData?.id ||
            null,

          amount:
            getOrderAmount(order),

          display_amount:
            -getOrderAmount(order),

          direction:
            "debit",

          type:
            "purchase",

          category:
            "number",

          status:
            order?.status ||
            "pending",

          description:
            getOrderDescription(
              order
            ),

          number:
            getOrderNumber(order),

          country:
            order?.country ||
            null,

          operator:
            order?.operator ||
            null,

          service:
            order?.service ??
            order?.product ??
            null,

          reference:
            getOrderReference(
              order
            ),

          created_at:
            order?.created_at ||
            null,

          source:
            "order",

          order_id:
            order?.id ||
            null,
        })
      );

    /*
     * COMBINE TRANSACTIONS
     */

    const combinedTransactions = [
      ...formattedWalletTransactions,
      ...formattedPurchaseTransactions,
    ].sort(
      (
        a: any,
        b: any
      ) => {
        const dateA =
          new Date(
            a.created_at || 0
          ).getTime();

        const dateB =
          new Date(
            b.created_at || 0
          ).getTime();

        return dateB - dateA;
      }
    );

    /*
     * TOTALS
     */

    const totalSpent =
      orders.reduce(
        (
          total: number,
          order: any
        ) =>
          total +
          numberValue(
            order?.price ??
              order?.amount ??
              order?.cost
          ),
        0
      );

    const totalProfit =
      orders.reduce(
        (
          total: number,
          order: any
        ) =>
          total +
          numberValue(
            order?.profit
          ),
        0
      );

    /*
     * TOTAL FUNDING
     *
     * Only actual wallet funding.
     * Refunds are NOT counted as funding.
     */

    const totalFunding =
      transactions
        .filter(
          (transaction: any) => {
            const type =
              String(
                transaction?.type ||
                  ""
              ).toLowerCase();

            return (
              type === "deposit" ||
              type === "fund" ||
              type === "funding" ||
              type === "wallet_funding"
            );
          }
        )
        .reduce(
          (
            total: number,
            transaction: any
          ) =>
            total +
            Math.abs(
              numberValue(
                transaction?.amount
              )
            ),
          0
        );

    /*
     * RETURN
     */

    return json({
      success: true,

      customer: {
        id:
          customerId,

        email:
          customerEmail,
      },

      wallet:
        walletData || null,

      orders,

      transactions:
        combinedTransactions,

      ...(transactionError
        ? {
            transactionWarning:
              "Wallet transaction history could not be loaded.",
          }
        : {}),

      stats: {
        totalOrders:
          orders.length,

        totalSpent,

        totalProfit,

        totalFunding,

        walletBalance:
          numberValue(
            walletData?.balance
          ),
      },
    });
  } catch (error) {
    console.error(
      "ADMIN CUSTOMER API ERROR:",
      error
    );

    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load customer details.",
      },
      500
    );
  }
}