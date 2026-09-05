import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const FIVESIM_API_KEY = process.env.FIVESIM_API_KEY;
const FIVESIM_BASE_URL = "https://5sim.net/v1";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const PROFIT_NGN = 700;
const USD_TO_NGN = 1400;

function responseJSON(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function calculateCustomerPrice(priceUSD: number) {
  return Math.round(priceUSD * USD_TO_NGN + PROFIT_NGN);
}

function normalizeCountryCode(value: string) {
  return value.trim().toLowerCase();
}

function normalizeOperator(value: string) {
  return value.trim().toLowerCase();
}

function getPriceFromProduct(product: any) {
  const price = Number(
    product?.Price ??
      product?.price ??
      product?.cost ??
      0
  );

  const quantity = Number(
    product?.Qty ??
      product?.qty ??
      product?.quantity ??
      0
  );

  return {
    priceUSD: price,
    quantity,
    priceNGN: calculateCustomerPrice(price),
  };
}

async function fiveSimRequest(path: string) {
  if (!FIVESIM_API_KEY) {
    throw new Error("FIVESIM_API_KEY is not configured.");
  }

  const url = `${FIVESIM_BASE_URL}${path}`;

  console.log("5SIM REQUEST:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${FIVESIM_API_KEY}`,
    },
    cache: "no-store",
  });

  const text = await response.text();

  console.log("5SIM STATUS:", response.status);

  if (text) {
    console.log("5SIM RESPONSE:", text);
  }

  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    let providerMessage = "";

    if (typeof data === "string") {
      providerMessage = data;
    } else {
      providerMessage =
        data?.message ||
        data?.error ||
        data?.msg ||
        "";
    }

    if (!providerMessage) {
      providerMessage = `HTTP ${response.status}`;
    }

    throw new Error(
      `5SIM rejected the request. HTTP ${response.status}: ${providerMessage}`
    );
  }

  if (data === null) {
    throw new Error(
      `5SIM returned an empty response. HTTP ${response.status}`
    );
  }

  return data;
}

/*
 * Get the authenticated customer.
 */
async function getAuthenticatedUser(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase configuration is missing.");
  }

  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      user: null,
      error: "Authentication required.",
    };
  }

  const token = authorization.substring(7).trim();

  if (!token) {
    return {
      user: null,
      error: "Authentication required.",
    };
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: "Invalid or expired session.",
    };
  }

  return {
    user,
    token,
  };
}

/*
 * Extract real operators from the 5SIM
 * countries response.
 *
 * 5SIM can return countries like:
 *
 * usa: {
 *   iso: {...},
 *   prefix: {...},
 *   text_en: "USA",
 *   text_ru: "США",
 *   virtual12: {...},
 *   virtual28: {...}
 * }
 *
 * The operator names are therefore the
 * keys other than metadata.
 */
function extractOperators(countryData: any): string[] {
  if (!countryData || typeof countryData !== "object") {
    return [];
  }

  const metadataKeys = new Set([
    "key",
    "code",
    "country",
    "name",
    "text_en",
    "text_ru",
    "iso",
    "prefix",
    "operators",
  ]);

  const operators: string[] = [];

  /*
   * If a normal operators array exists,
   * use it first.
   */
  if (Array.isArray(countryData.operators)) {
    for (const item of countryData.operators) {
      const operator =
        typeof item === "string"
          ? item
          : item?.name ||
            item?.code ||
            "";

      if (operator) {
        operators.push(
          normalizeOperator(operator)
        );
      }
    }
  }

  /*
   * Also inspect the actual object keys.
   */
  for (const key of Object.keys(countryData)) {
    if (metadataKeys.has(key)) {
      continue;
    }

    const value = countryData[key];

    if (
      value &&
      typeof value === "object"
    ) {
      operators.push(
        normalizeOperator(key)
      );
    }
  }

  return Array.from(
    new Set(
      operators.filter(Boolean)
    )
  );
}

/*
 * Resolve "any" into an actual 5SIM operator.
 *
 * IMPORTANT:
 * We NEVER send "any" to 5SIM.
 */
async function resolveOperator(
  country: string,
  requestedOperator: string
) {
  const normalized =
    normalizeOperator(requestedOperator);

  if (
    normalized &&
    normalized !== "any"
  ) {
    return normalized;
  }

  console.log(
    "5SIM: resolving automatic operator for",
    country
  );

  const countries =
    await fiveSimRequest(
      "/guest/countries"
    );

  const countryData =
    countries?.[country];

  if (!countryData) {
    throw new Error(
      `5SIM country "${country}" was not found.`
    );
  }

  const operators =
    extractOperators(
      countryData
    );

  if (operators.length === 0) {
    throw new Error(
      `No 5SIM operator is available for ${country}.`
    );
  }

  console.log(
    "5SIM REAL OPERATORS:",
    {
      country,
      operators,
      selected: operators[0],
    }
  );

  return operators[0];
}

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const action =
      searchParams.get("action") || "";

    /*
     * ========================================
     * COUNTRIES
     * ========================================
     */
    if (action === "countries") {
      const data =
        await fiveSimRequest(
          "/guest/countries"
        );

      const countries: any[] = [];

      Object.entries(
        data || {}
      ).forEach(
        ([code, value]: [
          string,
          any
        ]) => {
          const realCode =
            normalizeCountryCode(
              code
            );

          if (!realCode) {
            return;
          }

          const operators =
            extractOperators(
              value
            );

          countries.push({
            key: realCode,
            code: realCode,

            name:
              value?.text_en ||
              value?.name ||
              realCode.toUpperCase(),

            iso:
              value?.iso ||
              null,

            prefix:
              value?.prefix ||
              null,

            operators,
          });
        }
      );

      console.log(
        "5SIM COUNTRIES COUNT:",
        countries.length
      );

      return responseJSON({
        success: true,
        countries,
      });
    }

    /*
     * ========================================
     * PRODUCTS
     * ========================================
     */
    if (action === "products") {
      const countryParam =
        searchParams.get("country");

      const operatorParam =
        searchParams.get("operator");

      if (!countryParam) {
        return responseJSON(
          {
            success: false,
            error:
              "Country is required.",
          },
          400
        );
      }

      const country =
        normalizeCountryCode(
          countryParam
        );

      const operator =
        await resolveOperator(
          country,
          operatorParam || "any"
        );

      console.log(
        "5SIM PRODUCTS:",
        {
          country,
          requestedOperator:
            operatorParam || "any",
          resolvedOperator:
            operator,
        }
      );

      const data =
        await fiveSimRequest(
          `/guest/products/${encodeURIComponent(
            country
          )}/${encodeURIComponent(
            operator
          )}`
        );

      const products: any[] = [];

      Object.entries(
        data || {}
      ).forEach(
        ([productName, productValue]: [
          string,
          any
        ]) => {
          const pricing =
            getPriceFromProduct(
              productValue
            );

          products.push({
            product:
              productName,

            priceUSD:
              pricing.priceUSD,

            basePriceNGN:
              Math.round(
                pricing.priceUSD *
                  USD_TO_NGN
              ),

            profitNGN:
              PROFIT_NGN,

            priceNGN:
              pricing.priceNGN,

            quantity:
              pricing.quantity,
          });
        }
      );

      return responseJSON({
        success: true,
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
      const countryParam =
        searchParams.get("country");

      const operatorParam =
        searchParams.get("operator");

      const productParam =
        searchParams.get("product");

      if (
        !countryParam ||
        !productParam
      ) {
        return responseJSON(
          {
            success: false,
            error:
              "Country and product are required.",
          },
          400
        );
      }

      const country =
        normalizeCountryCode(
          countryParam
        );

      const operator =
        await resolveOperator(
          country,
          operatorParam || "any"
        );

      const product =
        productParam.trim();

      const data =
        await fiveSimRequest(
          `/guest/products/${encodeURIComponent(
            country
          )}/${encodeURIComponent(
            operator
          )}`
        );

      const rawProduct =
        data?.[product];

      if (!rawProduct) {
        return responseJSON(
          {
            success: false,
            error:
              "The requested product was not found.",
            country,
            operator,
            product,
            availableProducts:
              Object.keys(
                data || {}
              ),
          },
          404
        );
      }

      const pricing =
        getPriceFromProduct(
          rawProduct
        );

      return responseJSON({
        success: true,
        country,
        operator,
        product,

        priceUSD:
          pricing.priceUSD,

        basePriceNGN:
          Math.round(
            pricing.priceUSD *
              USD_TO_NGN
          ),

        profitNGN:
          PROFIT_NGN,

        priceNGN:
          pricing.priceNGN,

        quantity:
          pricing.quantity,
      });
    }

    /*
     * ========================================
     * BUY
     * ========================================
     */
    if (action === "buy") {
      const countryParam =
        searchParams.get("country");

      const operatorParam =
        searchParams.get("operator");

      const productParam =
        searchParams.get("product");

      if (
        !countryParam ||
        !productParam
      ) {
        return responseJSON(
          {
            success: false,
            error:
              "Country and product are required.",
          },
          400
        );
      }

      const country =
        normalizeCountryCode(
          countryParam
        );

      /*
       * Resolve "any" to a real operator.
       */
      let operator: string;

      try {
        operator =
          await resolveOperator(
            country,
            operatorParam || "any"
          );
      } catch (error: any) {
        return responseJSON(
          {
            success: false,
            error:
              error?.message ||
              "Unable to determine a 5SIM operator.",
          },
          400
        );
      }

      const product =
        productParam.trim();

      console.log(
        "5SIM BUY:",
        {
          country,
          requestedOperator:
            operatorParam || "any",
          resolvedOperator:
            operator,
          product,
        }
      );

      /*
       * Authenticate customer.
       */
      const auth =
        await getAuthenticatedUser(
          request
        );

      if (!auth.user) {
        return responseJSON(
          {
            success: false,
            error:
              auth.error ||
              "Authentication required.",
          },
          401
        );
      }

      if (
        !SUPABASE_URL ||
        !SUPABASE_SERVICE_ROLE_KEY
      ) {
        return responseJSON(
          {
            success: false,
            error:
              "Server configuration is incomplete.",
          },
          500
        );
      }

      /*
       * Get current product information.
       */
      let productData: any;

      try {
        productData =
          await fiveSimRequest(
            `/guest/products/${encodeURIComponent(
              country
            )}/${encodeURIComponent(
              operator
            )}`
          );
      } catch (error: any) {
        console.error(
          "5SIM PRODUCT ERROR:",
          error
        );

        return responseJSON(
          {
            success: false,
            error:
              error?.message ||
              "Unable to load 5SIM products.",
          },
          400
        );
      }

      const rawProduct =
        productData?.[product];

      if (!rawProduct) {
        return responseJSON(
          {
            success: false,
            error:
              "This product is currently unavailable.",
            country,
            operator,
            requestedProduct:
              product,
            availableProducts:
              Object.keys(
                productData || {}
              ),
          },
          400
        );
      }

      const pricing =
        getPriceFromProduct(
          rawProduct
        );

      const amount =
        pricing.priceNGN;

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return responseJSON(
          {
            success: false,
            error:
              "Invalid purchase price.",
          },
          400
        );
      }

      /*
       * Server-only Supabase client.
       */
      const adminClient =
        createClient(
          SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        );

      /*
       * Check customer's wallet.
       */
      const {
        data: wallet,
        error: walletError,
      } =
        await adminClient
          .from("wallets")
          .select("balance")
          .eq(
            "user_id",
            auth.user.id
          )
          .maybeSingle();

      if (walletError) {
        console.error(
          "Wallet lookup error:",
          walletError
        );

        return responseJSON(
          {
            success: false,
            error:
              "Unable to check wallet balance.",
          },
          500
        );
      }

      const balance =
        Number(
          wallet?.balance || 0
        );

      if (balance < amount) {
        return responseJSON(
          {
            success: false,
            error:
              "Insufficient wallet balance.",
            balance,
            required: amount,
          },
          400
        );
      }

      /*
       * ========================================
       * BUY FROM 5SIM
       * ========================================
       */
      let activation: any;

      try {
        activation =
          await fiveSimRequest(
            `/user/buy/activation/${encodeURIComponent(
              country
            )}/${encodeURIComponent(
              operator
            )}/${encodeURIComponent(
              product
            )}`
          );
      } catch (error: any) {
        console.error(
          "5SIM BUY ERROR:",
          error
        );

        return responseJSON(
          {
            success: false,
            error:
              error?.message ||
              "5SIM purchase failed.",
          },
          400
        );
      }

      /*
       * Validate provider response.
       */
      const fiveSimOrderId =
        Number(
          activation?.id
        );

      const phoneNumber =
        activation?.phone ||
        activation?.number ||
        null;

      if (
        !Number.isFinite(
          fiveSimOrderId
        ) ||
        !phoneNumber
      ) {
        console.error(
          "INVALID 5SIM ACTIVATION:",
          activation
        );

        return responseJSON(
          {
            success: false,
            error:
              "5SIM returned an invalid activation.",
          },
          502
        );
      }

      const paymentReference =
        `purchase_${crypto.randomUUID()}`;

      /*
       * Atomically:
       *
       * 1. Lock wallet
       * 2. Check balance
       * 3. Deduct money
       * 4. Create order
       * 5. Create wallet transaction
       */
      const {
        data: result,
        error: rpcError,
      } =
        await adminClient.rpc(
          "complete_5sim_purchase",
          {
            p_user_id:
              auth.user.id,

            p_amount:
              amount,

            p_fivesim_order_id:
              fiveSimOrderId,

            p_phone_number:
              phoneNumber,

            p_country:
              country,

            p_service:
              product,

            p_status:
              activation?.status ||
              "PENDING",

            p_payment_reference:
              paymentReference,
          }
        );

      /*
       * If local database completion fails,
       * attempt provider cancellation.
       */
      if (
        rpcError ||
        !result?.success
      ) {
        console.error(
          "5SIM DATABASE COMPLETION ERROR:",
          rpcError
        );

        try {
          await fiveSimRequest(
            `/user/cancel/${fiveSimOrderId}`
          );

          console.log(
            "5SIM ACTIVATION CANCELLED:",
            fiveSimOrderId
          );
        } catch (cancelError) {
          console.error(
            "5SIM CANCELLATION FAILED:",
            cancelError
          );
        }

        return responseJSON(
          {
            success: false,
            error:
              "The 5SIM number was purchased, but we could not complete the local order. The provider cancellation was attempted.",
          },
          500
        );
      }

      return responseJSON({
        success: true,

        message:
          "Number purchased successfully.",

        orderId:
          result.order_id,

        transactionId:
          result.transaction_id,

        fivesimOrderId:
          fiveSimOrderId,

        phoneNumber,

        country,

        operator,

        product,

        amount,

        status:
          activation?.status ||
          "PENDING",

        expires:
          activation?.expires ||
          null,

        sms:
          activation?.sms ||
          [],
      });
    }

    /*
     * ========================================
     * CHECK ACTIVATION
     * ========================================
     */
    if (action === "check") {
      const orderId =
        searchParams.get(
          "orderId"
        );

      if (!orderId) {
        return responseJSON(
          {
            success: false,
            error:
              "Order ID is required.",
          },
          400
        );
      }

      const auth =
        await getAuthenticatedUser(
          request
        );

      if (!auth.user) {
        return responseJSON(
          {
            success: false,
            error:
              auth.error ||
              "Authentication required.",
          },
          401
        );
      }

      if (
        !SUPABASE_URL ||
        !SUPABASE_SERVICE_ROLE_KEY
      ) {
        return responseJSON(
          {
            success: false,
            error:
              "Server configuration is incomplete.",
          },
          500
        );
      }

      const adminClient =
        createClient(
          SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        );

      const {
        data: order,
        error: orderError,
      } =
        await adminClient
          .from("orders")
          .select(
            "id,user_id,fivesim_order_id,status,phone_number,country,service"
          )
          .eq(
            "id",
            orderId
          )
          .eq(
            "user_id",
            auth.user.id
          )
          .maybeSingle();

      if (orderError) {
        console.error(
          "Order lookup error:",
          orderError
        );

        return responseJSON(
          {
            success: false,
            error:
              "Unable to load the order.",
          },
          500
        );
      }

      if (!order) {
        return responseJSON(
          {
            success: false,
            error:
              "Order not found.",
          },
          404
        );
      }

      const fiveSimOrderId =
        Number(
          order.fivesim_order_id
        );

      if (
        !Number.isFinite(
          fiveSimOrderId
        )
      ) {
        return responseJSON(
          {
            success: false,
            error:
              "This order is not linked to a 5SIM activation.",
          },
          400
        );
      }

      let activation: any;

      try {
        activation =
          await fiveSimRequest(
            `/user/check/${fiveSimOrderId}`
          );
      } catch (error: any) {
        console.error(
          "5SIM CHECK ERROR:",
          error
        );

        return responseJSON(
          {
            success: false,
            error:
              error?.message ||
              "Unable to check the activation.",
          },
          400
        );
      }

      const newStatus =
        activation?.status ||
        order.status ||
        "PENDING";

      const newPhone =
        activation?.phone ||
        order.phone_number ||
        null;

      const newCountry =
        activation?.country ||
        order.country ||
        null;

      const newService =
        activation?.product ||
        order.service ||
        null;

      const {
        error: updateError,
      } =
        await adminClient
          .from("orders")
          .update({
            status:
              newStatus,

            phone_number:
              newPhone,

            country:
              newCountry,

            service:
              newService,
          })
          .eq(
            "id",
            order.id
          )
          .eq(
            "user_id",
            auth.user.id
          );

      if (updateError) {
        console.error(
          "Order update error:",
          updateError
        );

        return responseJSON(
          {
            success: false,
            error:
              "Unable to update the order status.",
          },
          500
        );
      }

      return responseJSON({
        success: true,

        orderId:
          order.id,

        fiveSimOrderId,

        status:
          activation?.status ||
          newStatus,

        phoneNumber:
          newPhone,

        country:
          newCountry,

        service:
          newService,

        expires:
          activation?.expires ||
          null,

        sms:
          activation?.sms ||
          [],
      });
    }

    return responseJSON(
      {
        success: false,
        error:
          "Unknown action.",
      },
      400
    );
  } catch (error: any) {
    console.error(
      "5SIM ROUTE ERROR:",
      error
    );

    return responseJSON(
      {
        success: false,
        error:
          error?.message ||
          "An unexpected server error occurred.",
      },
      500
    );
  }
}