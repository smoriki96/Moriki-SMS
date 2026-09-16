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

const USD_TO_NGN = 1400;
const PROFIT_NGN = 700;

const CUSTOMER_ERROR =
  "Service unavailable at the moment, please try another service.";

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

function jsonResponse(
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

function errorResponse(
  error: unknown,
  status = 500
) {
  console.error("5SIM INTERNAL ERROR:", error);

  return jsonResponse(
    {
      success: false,
      error: CUSTOMER_ERROR,
    },
    status
  );
}

function calculateCustomerPrice(
  priceUSD: number
) {
  return Math.round(
    priceUSD * USD_TO_NGN + PROFIT_NGN
  );
}

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
      "5SIM AUTH ERROR:",
      error
    );

    return null;
  }

  return user;
}

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
        "5SIM PROVIDER ERROR:",
        {
          status: response.status,
          statusText: response.statusText,
          path,
          response: data,
        }
      );

      throw new Error(
        `5SIM request failed: ${response.status}`
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| Supported actions:
|
| countries
| operators
| services
| products
| prices
| check
|
*/

export async function GET(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authentication required.",
        },
        401
      );
    }

    const { searchParams } =
      new URL(request.url);

    const action =
      searchParams.get("action");

    /*
    |--------------------------------------------------------------------------
    | COUNTRIES
    |--------------------------------------------------------------------------
    |
    | GET /api/5sim?action=countries
    |
    */

    if (action === "countries") {
      const result =
        await fiveSimRequest(
          "/guest/countries"
        );

      const countries = Object.entries(
        (result || {}) as Record<
          string,
          any
        >
      ).map(
        ([code, value]) => ({
          code,
          name:
            value?.text_en ||
            value?.name ||
            code,
          iso:
            value?.iso
              ? Object.keys(
                  value.iso
                )[0] || ""
              : "",
          prefix:
            value?.prefix
              ? Object.keys(
                  value.prefix
                )[0] || ""
              : "",
        })
      );

      return jsonResponse({
        success: true,
        countries,
        result,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | OPERATORS
    |--------------------------------------------------------------------------
    |
    | GET /api/5sim?action=operators&country=usa
    |
    | 5SIM does not provide a reliable public
    | guest operators endpoint. Operators are
    | contained inside the countries response.
    |
    */

    if (action === "operators") {
      const country =
        searchParams.get(
          "country"
        );

      if (!country) {
        return jsonResponse(
          {
            success: false,
            error:
              "Country is required.",
          },
          400
        );
      }

      const result =
        await fiveSimRequest(
          "/guest/countries"
        );

      const countryData =
        (
          result as Record<
            string,
            any
          >
        )?.[country];

      if (!countryData) {
        return jsonResponse(
          {
            success: true,
            operators: [],
          }
        );
      }

      const ignoredKeys =
        new Set([
          "iso",
          "prefix",
          "text_en",
          "text_ru",
          "name",
        ]);

      const operators =
        Object.keys(
          countryData
        )
          .filter(
            (operator) =>
              !ignoredKeys.has(
                operator
              )
          )
          .map(
            (operator) => ({
              name: operator,
              code: operator,
            })
          );

      return jsonResponse({
        success: true,
        country,
        operators,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | SERVICES
    |--------------------------------------------------------------------------
    |
    | GET /api/5sim?action=services&country=usa&operator=any
    |
    */

    if (action === "services") {
      const country =
        searchParams.get(
          "country"
        );

      const operator =
        searchParams.get(
          "operator"
        ) || "any";

      if (!country) {
        return jsonResponse(
          {
            success: false,
            error:
              "Country is required.",
          },
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

      const services =
        Object.entries(
          (result || {}) as Record<
            string,
            any
          >
        ).map(
          ([service, data]) => ({
            service,
            name: service,
            category:
              data?.Category ||
              "activation",
            available:
              Number(
                data?.Qty || 0
              ),
            priceUSD:
              Number(
                data?.Price || 0
              ),
            priceNGN:
              calculateCustomerPrice(
                Number(
                  data?.Price || 0
                )
              ),
          })
        );

      return jsonResponse({
        success: true,
        country,
        operator,
        services,
        result,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PRODUCTS
    |--------------------------------------------------------------------------
    |
    | This keeps compatibility with the existing
    | frontend.
    |
    | GET:
    | /api/5sim?action=products&country=usa&operator=any
    |
    */

    if (
      action === "products" ||
      action === "product"
    ) {
      const country =
        searchParams.get(
          "country"
        );

      const operator =
        searchParams.get(
          "operator"
        ) || "any";

      if (!country) {
        return jsonResponse(
          {
            success: false,
            error:
              "Country is required.",
          },
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

      return jsonResponse({
        success: true,
        country,
        operator,
        result,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PRICES
    |--------------------------------------------------------------------------
    |
    | This is useful after the customer chooses:
    | country + service.
    |
    | GET:
    | /api/5sim?action=prices&country=usa&service=telegram
    |
    */

    if (action === "prices") {
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
        return jsonResponse(
          {
            success: false,
            error:
              "Country and service are required.",
          },
          400
        );
      }

      const result =
        await fiveSimRequest(
          `/guest/prices?country=${encodeURIComponent(
            country
          )}&product=${encodeURIComponent(
            service
          )}`
        );

      return jsonResponse({
        success: true,
        country,
        service,
        result,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK ORDER
    |--------------------------------------------------------------------------
    */

    if (action === "check") {
      const orderId =
        searchParams.get(
          "orderId"
        );

      if (!orderId) {
        return jsonResponse(
          {
            success: false,
            error:
              "Missing 5SIM order ID.",
          },
          400
        );
      }

      const result =
        await fiveSimRequest(
          `/user/check/${encodeURIComponent(
            orderId
          )}`
        );

      return jsonResponse({
        success: true,
        result,
      });
    }

    return jsonResponse(
      {
        success: false,
        error:
          "Unknown 5SIM action.",
      },
      400
    );
  } catch (error) {
    return errorResponse(
      error,
      500
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST - PURCHASE
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authentication required.",
        },
        401
      );
    }

    let body: Record<
      string,
      unknown
    >;

    try {
      body =
        await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid request.",
        },
        400
      );
    }

    const country =
      String(
        body.country || ""
      ).trim();

    const operator =
      String(
        body.operator ||
          "any"
      ).trim();

    const service =
      String(
        body.service || ""
      ).trim();

    const maxPriceRaw =
      body.maxPrice;

    const maxPrice =
      maxPriceRaw !== undefined &&
      maxPriceRaw !== null &&
      String(
        maxPriceRaw
      ).trim() !== ""
        ? Number(maxPriceRaw)
        : undefined;

    if (
      !country ||
      !service
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Country and service are required.",
        },
        400
      );
    }

    if (
      maxPrice !== undefined &&
      (!Number.isFinite(
        maxPrice
      ) ||
        maxPrice <= 0)
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid maximum price.",
        },
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Get available product first.
    |--------------------------------------------------------------------------
    */

    const products =
      await fiveSimRequest(
        `/guest/products/${encodeURIComponent(
          country
        )}/${encodeURIComponent(
          operator
        )}`
      );

    const productData =
      (
        products as Record<
          string,
          any
        >
      )?.[service];

    if (!productData) {
      return jsonResponse(
        {
          success: false,
          error:
            "This service is not available for the selected country and operator.",
        },
        400
      );
    }

    const priceUSD =
      Number(
        productData.Price || 0
      );

    const available =
      Number(
        productData.Qty || 0
      );

    if (
      !Number.isFinite(
        priceUSD
      ) ||
      priceUSD <= 0
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Service price is unavailable.",
        },
        400
      );
    }

    if (
      available <= 0
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "No numbers are currently available for this service.",
        },
        400
      );
    }

    if (
      maxPrice !== undefined &&
      priceUSD > maxPrice
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "The current provider price is above your selected maximum price.",
        },
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Customer price
    |--------------------------------------------------------------------------
    */

    const customerPrice =
      calculateCustomerPrice(
        priceUSD
      );

    const providerCost =
      Math.round(
        priceUSD *
          USD_TO_NGN
      );

    /*
    |--------------------------------------------------------------------------
    | Check wallet before buying.
    |--------------------------------------------------------------------------
    */

    const {
      data: wallet,
      error: walletError,
    } =
      await supabaseAdmin
        .from("wallets")
        .select("balance")
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (walletError) {
      throw walletError;
    }

    const balance =
      Number(
        wallet?.balance || 0
      );

    if (
      balance <
      customerPrice
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Not enough user balance.",
        },
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | BUY FROM 5SIM
    |--------------------------------------------------------------------------
    */

    let purchasePath =
      `/user/buy/activation/${encodeURIComponent(
        country
      )}/${encodeURIComponent(
        operator
      )}/${encodeURIComponent(
        service
      )}`;

    if (
      maxPrice !== undefined
    ) {
      purchasePath +=
        `?maxPrice=${encodeURIComponent(
          maxPrice
        )}`;
    }

    const providerOrder =
      await fiveSimRequest(
        purchasePath
      );

    const providerOrderData =
      providerOrder as Record<
        string,
        any
      >;

    const fivesimOrderId =
      Number(
        providerOrderData?.id ||
          0
      );

    const phoneNumber =
      String(
        providerOrderData?.phone ||
          ""
      );

    const actualProviderPrice =
      Number(
        providerOrderData?.price ||
          priceUSD
      );

    if (
      !fivesimOrderId ||
      !phoneNumber
    ) {
      console.error(
        "5SIM PURCHASE RETURNED INVALID ORDER:",
        providerOrder
      );

      throw new Error(
        "5SIM returned an invalid order."
      );
    }

    const actualProviderCost =
      Math.round(
        actualProviderPrice *
          USD_TO_NGN
      );

    const actualCustomerPrice =
      calculateCustomerPrice(
        actualProviderPrice
      );

    /*
    |--------------------------------------------------------------------------
    | Complete the purchase in our database.
    |--------------------------------------------------------------------------
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
            actualCustomerPrice,

          p_provider_cost:
            actualProviderCost,

          p_fivesim_order_id:
            fivesimOrderId,

          p_phone_number:
            phoneNumber,

          p_country:
            country,

          p_service:
            service,

          p_status:
            String(
              providerOrderData?.status ||
                "PENDING"
            ),

          p_payment_reference:
            null,
        }
      );

    if (purchaseError) {
      console.error(
        "DATABASE PURCHASE ERROR:",
        purchaseError
      );

      /*
      If our wallet/database purchase
      fails after 5SIM already issued
      the number, try to cancel it.
      */

      try {
        await fiveSimRequest(
          `/user/cancel/${encodeURIComponent(
            String(
              fivesimOrderId
            )
          )}`
        );
      } catch (
        cancelError
      ) {
        console.error(
          "5SIM CANCEL AFTER DB FAILURE ERROR:",
          cancelError
        );
      }

      throw purchaseError;
    }

    return jsonResponse({
      success: true,

      order:
        providerOrder,

      result:
        purchase,

      amount:
        actualCustomerPrice,

      providerCost:
        actualProviderCost,

      profit:
        actualCustomerPrice -
        actualProviderCost,

      phoneNumber,

      fivesimOrderId,
    });
  } catch (error) {
    return errorResponse(
      error,
      500
    );
  }
}
