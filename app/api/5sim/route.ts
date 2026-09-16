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

function calculateCustomerPrice(priceUSD: number) {
  return Math.round(
    priceUSD * USD_TO_NGN + PROFIT_NGN
  );
}

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

function successResponse(data: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: true,
      ...data,
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
 * AUTHENTICATED USER
 */
async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
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
      "SUPABASE AUTH ERROR:",
      error
    );

    return null;
  }

  return user;
}

/*
 * 5SIM REQUEST
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
    const response = await fetch(
      `${FIVESIM_BASE_URL}${path}`,
      {
        ...options,
        signal: controller.signal,
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization:
            `Bearer ${FIVESIM_API_KEY}`,
          ...(options.headers || {}),
        },
      }
    );

    const rawText =
      await response.text();

    let data: any = null;

    try {
      data = rawText
        ? JSON.parse(rawText)
        : null;
    } catch {
      data = rawText;
    }

    if (!response.ok) {
      console.error(
        "5SIM ERROR",
        {
          status: response.status,
          path,
          response: data,
        }
      );

      throw new Error(
        `5SIM HTTP ${response.status}`
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/*
 * Convert 5SIM countries object
 * into the array your frontend expects.
 */
function normalizeCountries(data: any) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return [];
  }

  return Object.entries(data)
    .map(
      ([key, value]: [string, any]) => {
        if (
          !value ||
          typeof value !== "object"
        ) {
          return null;
        }

        const ignoredKeys = new Set([
          "iso",
          "prefix",
          "text_en",
          "text_ru",
          "name",
          "code",
        ]);

        const operators =
          Object.keys(value)
            .filter(
              (operator) =>
                !ignoredKeys.has(operator) &&
                value[operator] &&
                typeof value[operator] ===
                  "object"
            )
            .sort();

        return {
          key: key.toLowerCase(),
          name:
            value.text_en ||
            value.name ||
            key,
          operators,
        };
      }
    )
    .filter(Boolean);
}

/*
 * Convert 5SIM products object
 * into your Product[] format.
 */
function normalizeProducts(
  data: any
) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return [];
  }

  return Object.entries(data)
    .map(
      ([name, value]: [string, any]) => {
        const priceUSD = Number(
          value?.Price ?? 0
        );

        const quantity = Number(
          value?.Qty ?? 0
        );

        return {
          name,
          category:
            value?.Category ?? null,
          quantity,
          priceUSD,
          basePriceNGN:
            Math.round(
              priceUSD * USD_TO_NGN
            ),
          profitNGN: PROFIT_NGN,
          priceNGN:
            calculateCustomerPrice(
              priceUSD
            ),
        };
      }
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}

/*
 * GET
 */
export async function GET(
  request: NextRequest
) {
  try {
    const {
      searchParams,
    } = new URL(request.url);

    const action =
      searchParams.get("action");

    /*
     * ========================================
     * COUNTRIES
     * ========================================
     */
    if (action === "countries") {
      const result =
        await fiveSimRequest(
          "/guest/countries"
        );

      const countries =
        normalizeCountries(result);

      return successResponse({
        countries,
      });
    }

    /*
     * ========================================
     * PRODUCTS / SERVICES
     * ========================================
     */
    if (
      action === "products" ||
      action === "product"
    ) {
      const country =
        searchParams.get("country");

      const operator =
        searchParams.get("operator") ||
        "any";

      if (!country) {
        return safeErrorResponse(
          "Missing country.",
          400
        );
      }

      const result =
        await fiveSimRequest(
          `/guest/products/${encodeURIComponent(
            country
          )}/${encodeURIComponent(
            operator
          )}`
        );

      const products =
        normalizeProducts(result);

      return successResponse({
        country,
        operator,
        products,
      });
    }

    /*
     * ========================================
     * SEARCH
     * ========================================
     */
    if (action === "search") {
      const country =
        searchParams.get("country");

      const operator =
        searchParams.get("operator") ||
        "any";

      const product =
        searchParams.get("product");

      if (
        !country ||
        !operator ||
        !product
      ) {
        return safeErrorResponse(
          "Missing search parameters.",
          400
        );
      }

      const result =
        await fiveSimRequest(
          `/guest/products/${encodeURIComponent(
            country
          )}/${encodeURIComponent(
            operator
          )}`
        );

      const products =
        normalizeProducts(result);

      const found =
        products.find(
          (item) =>
            item.name.toLowerCase() ===
            product.toLowerCase()
        );

      if (!found) {
        return successResponse({
          country,
          operator,
          product,
          quantity: 0,
          priceUSD: 0,
          basePriceNGN: 0,
          profitNGN: 0,
          priceNGN: 0,
        });
      }

      return successResponse({
        country,
        operator,
        product: found.name,
        quantity: found.quantity,
        priceUSD: found.priceUSD,
        basePriceNGN:
          found.basePriceNGN,
        profitNGN:
          found.profitNGN,
        priceNGN:
          found.priceNGN,
      });
    }

    /*
     * ========================================
     * BUY NUMBER
     * ========================================
     */
    if (action === "buy") {
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
          { status: 401 }
        );
      }

      const country =
        searchParams.get("country");

      const operator =
        searchParams.get("operator") ||
        "any";

      const product =
        searchParams.get("product");

      if (
        !country ||
        !operator ||
        !product
      ) {
        return safeErrorResponse(
          "Missing purchase parameters.",
          400
        );
      }

      /*
       * First get live product price
       * from 5SIM.
       */
      const productResponse =
        await fiveSimRequest(
          `/guest/products/${encodeURIComponent(
            country
          )}/${encodeURIComponent(
            operator
          )}`
        );

      const products =
        normalizeProducts(
          productResponse
        );

      const selectedProduct =
        products.find(
          (item) =>
            item.name.toLowerCase() ===
            product.toLowerCase()
        );

      if (!selectedProduct) {
        return safeErrorResponse(
          "Selected service is no longer available.",
          400
        );
      }

      if (
        selectedProduct.quantity <= 0
      ) {
        return safeErrorResponse(
          "No numbers are currently available.",
          400
        );
      }

      /*
       * BUY FROM 5SIM
       */
      const activation =
        await fiveSimRequest(
          `/user/buy/activation/${encodeURIComponent(
            country
          )}/${encodeURIComponent(
            operator
          )}/${encodeURIComponent(
            product
          )}`
        );

      const providerPriceUSD =
        Number(
          activation?.price ??
          selectedProduct.priceUSD
        );

      const customerPrice =
        calculateCustomerPrice(
          providerPriceUSD
        );

      /*
       * Record the purchase.
       */
      const {
        data: purchase,
        error:
          purchaseError,
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
                providerPriceUSD *
                  USD_TO_NGN
              ),

            p_fivesim_order_id:
              String(
                activation?.id ?? ""
              ),

            p_phone_number:
              activation?.phone ??
              "",

            p_country:
              country,

            p_service:
              product,

            p_status:
              "PENDING",

            p_payment_reference:
              null,
          }
        );

      if (purchaseError) {
        /*
         * IMPORTANT:
         * The number has already been purchased
         * from 5SIM at this point.
         *
         * We log the database failure so it can
         * be reconciled rather than pretending
         * the provider purchase did not happen.
         */
        console.error(
          "5SIM PURCHASE DB ERROR",
          {
            purchaseError,
            activation,
          }
        );

        throw purchaseError;
      }

      return successResponse({
        data: activation,
        orderId: purchase?.id ?? purchase?.order_id ?? null,
        fivesimOrderId: activation?.id,
        purchase,
        amount:
          customerPrice,
        providerCost:
          Math.round(
            providerPriceUSD *
              USD_TO_NGN
          ),
        profit:
          PROFIT_NGN,
      });
    }

    /*
     * ========================================
     * CHECK SMS
     * ========================================
     */
    if (action === "check") {
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
          { status: 401 }
        );
      }

      const orderId =
        searchParams.get(
          "orderId"
        );

      if (!orderId) {
        return safeErrorResponse(
          "Missing order ID.",
          400
        );
      }

      const result =
        await fiveSimRequest(
          `/user/check/${encodeURIComponent(
            orderId
          )}`
        );

      const providerStatus =
        String(result?.status || "")
          .trim()
          .toLowerCase();

      const sms =
        Array.isArray(result?.sms)
          ? result.sms
          : [];

      const normalizedStatus =
        sms.length > 0 ||
        providerStatus === "received" ||
        providerStatus === "finished"
          ? "COMPLETED"
          : providerStatus === "canceled" ||
            providerStatus === "cancelled" ||
            providerStatus === "timeout" ||
            providerStatus === "expired"
          ? "CANCELLED"
          : "PENDING";

      const { error: updateError } =
        await supabaseAdmin
          .from("orders")
          .update({
            order_status: normalizedStatus,
            status: normalizedStatus,
          })
          .eq(
            "fivesim_order_id",
            String(orderId)
          );

      if (updateError) {
        console.error(
          "Unable to update activation status:",
          updateError.message
        );
      }

      return successResponse({
        result,
        status: normalizedStatus,
        phone:
          result?.phone ?? null,
        country:
          result?.country ?? null,
        service:
          result?.service ?? null,
        sms,
        fivesim_order_id:
          result?.id ?? orderId,
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
