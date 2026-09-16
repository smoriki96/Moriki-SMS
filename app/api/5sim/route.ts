import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FIVESIM_API_KEY =
  process.env.FIVESIM_API_KEY!;

const FIVESIM_BASE_URL =
  "https://5sim.net/v1";

const CUSTOMER_ERROR =
  "Service unavailable at the moment, please try another service.";

const USD_TO_NGN = 1400;
const PROFIT_NGN = 700;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

/*
 * NEVER send raw provider errors to customers.
 */
function safeErrorResponse(
  internalError: unknown,
  status = 500
) {
  console.error(
    "5SIM INTERNAL ERROR:",
    internalError
  );

  return NextResponse.json(
    {
      success: false,
      error: CUSTOMER_ERROR,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function successResponse(data: unknown) {
  return NextResponse.json(
    {
      success: true,
      ...((data as Record<string, unknown>) || {}),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

/*
 * Convert provider USD price into customer NGN price.
 */
function calculateCustomerPrice(
  priceUSD: number
) {
  return Math.round(
    Number(priceUSD) * USD_TO_NGN +
      PROFIT_NGN
  );
}

/*
 * Get authenticated user from bearer token.
 */
async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.toLowerCase().startsWith(
      "bearer "
    )
  ) {
    return null;
  }

  const token =
    authorization.slice(7).trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } =
    await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error(
      "5SIM AUTH ERROR:",
      error
    );

    return null;
  }

  return user;
}

/*
 * Make request to 5SIM.
 *
 * Raw provider errors are logged only on
 * the server and NEVER returned to the browser.
 */
async function fiveSimRequest(
  path: string,
  options: RequestInit = {}
) {
  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const response =
      await fetch(
        `${FIVESIM_BASE_URL}${path}`,
        {
          ...options,
          signal: controller.signal,
          cache: "no-store",
          headers: {
            Accept:
              "application/json",
            Authorization:
              `Bearer ${FIVESIM_API_KEY}`,
            ...(options.headers || {}),
          },
        }
      );

    const rawText =
      await response.text();

    let data: unknown = null;

    try {
      data = rawText
        ? JSON.parse(rawText)
        : null;
    } catch {
      data = rawText;
    }

    if (!response.ok) {
      console.error(
        "5SIM PROVIDER RESPONSE:",
        {
          status:
            response.status,
          statusText:
            response.statusText,
          path,
          response: data,
        }
      );

      throw new Error(
        `5SIM rejected request. HTTP ${response.status}: ${rawText}`
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const {
      searchParams,
    } = new URL(
      request.url
    );

    const action =
      searchParams.get("action");

    /*
     * Get available products.
     */
    if (
      action === "products" ||
      action === "product"
    ) {
      const country =
        searchParams.get(
          "country"
        );

      const service =
        searchParams.get(
          "service"
        );

      if (
        !country ||
        !service
      ) {
        return safeErrorResponse(
          "Missing country or service.",
          400
        );
      }

      const result =
        await fiveSimRequest(
          `/guest/products/${encodeURIComponent(
            country
          )}/${encodeURIComponent(
            service
          )}`
        );

      return successResponse({
        result,
      });
    }

    /*
     * Check activation/order.
     */
    if (
      action === "check"
    ) {
      const orderId =
        searchParams.get(
          "orderId"
        );

      if (!orderId) {
        return safeErrorResponse(
          "Missing 5SIM order ID.",
          400
        );
      }

      const result =
        await fiveSimRequest(
          `/user/check/${encodeURIComponent(
            orderId
          )}`
        );

      return successResponse({
        result,
      });
    }

    return safeErrorResponse(
      `Unknown 5SIM action: ${action}`,
      400
    );
  } catch (error) {
    return safeErrorResponse(
      error,
      500
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    let body: Record<
      string,
      unknown
    >;

    try {
      body =
        await request.json();
    } catch (error) {
      return safeErrorResponse(
        error,
        400
      );
    }

    const country =
      String(
        body.country || ""
      ).trim();

    const service =
      String(
        body.service || ""
      ).trim();

    const product =
      body.product as
        | Record<
            string,
            unknown
          >
        | undefined;

    const phoneNumber =
      String(
        body.phone_number ||
          body.phoneNumber ||
          ""
      ).trim();

    if (
      !country ||
      !service ||
      !product
    ) {
      return safeErrorResponse(
        "Missing purchase information.",
        400
      );
    }

    const priceUSD =
      Number(
        product.price ||
          product.cost ||
          product.priceUSD ||
          0
      );

    if (
      !Number.isFinite(
        priceUSD
      ) ||
      priceUSD <= 0
    ) {
      return safeErrorResponse(
        "Invalid provider price.",
        400
      );
    }

    const customerPrice =
      calculateCustomerPrice(
        priceUSD
      );

    /*
     * If your existing application uses
     * the database RPC, perform the purchase
     * through the existing secure function.
     */
    const {
      data: purchase,
      error: purchaseError,
    } =
      await supabaseAdmin.rpc(
        "complete_5sim_purchase",
        {
          p_user_id:
            user.id,

          p_amount:
            customerPrice,

          p_provider_cost:
            Math.round(
              priceUSD *
                USD_TO_NGN
            ),

          p_fivesim_order_id:
            null,

          p_phone_number:
            phoneNumber,

          p_country:
            country,

          p_service:
            service,

          p_status:
            "PENDING",

          p_payment_reference:
            null,
        }
      );

    if (purchaseError) {
      throw purchaseError;
    }

    /*
     * NOTE:
     * The actual 5SIM purchase should continue
     * through your existing purchase endpoint/RPC
     * if your current implementation handles
     * provider ordering separately.
     */

    return successResponse({
      result: purchase,
      amount:
        customerPrice,
      providerCost:
        Math.round(
          priceUSD *
            USD_TO_NGN
        ),
      profit:
        PROFIT_NGN,
    });
  } catch (error) {
    return safeErrorResponse(
      error,
      500
    );
  }
}