import { NextRequest, NextResponse } from "next/server";

const FIVE_SIM_URL = "https://5sim.net/v1/guest/prices";

const USD_TO_NGN = 1410;
const PROFIT_NGN = 600;

function calculateCustomerPrice(
  providerPrice: number
) {
  const nairaCost =
    providerPrice * USD_TO_NGN;

  const sellingPrice =
    nairaCost + PROFIT_NGN;

  return Math.ceil(sellingPrice / 100) * 100;
}

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const country = (
      searchParams.get("country") || ""
    ).trim();

    const product = (
      searchParams.get("product") || ""
    ).trim();

    if (!country) {
      return NextResponse.json(
        {
          success: false,
          error: "Country is required.",
        },
        { status: 400 }
      );
    }

    const url =
      `${FIVE_SIM_URL}?country=${encodeURIComponent(
        country
      )}`;

    console.log(
      "5sim prices request:",
      url
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "5sim returned an invalid response.",
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            data?.error ||
            `5sim returned HTTP ${response.status}.`,
        },
        { status: response.status }
      );
    }

    const countryData =
      data?.[country];

    if (!countryData) {
      return NextResponse.json({
        success: true,
        country,
        product: product || null,
        services: [],
        operators: [],
        products: [],
        message:
          "No services available for this country.",
      });
    }

    /*
     * If no service has been selected yet,
     * return the available services.
     */
    if (!product) {
      const services = Object.keys(
        countryData
      );

      return NextResponse.json({
        success: true,
        country,
        product: null,
        services,
        operators: [],
        products: [],
        totalServices:
          services.length,
      });
    }

    const productData =
      countryData?.[product];

    if (!productData) {
      return NextResponse.json({
        success: true,
        country,
        product,
        services: Object.keys(
          countryData
        ),
        operators: [],
        products: [],
        message:
          "No matching service found.",
      });
    }

    const operators = Object.entries(
      productData
    )
      .map(
        ([operatorName, value]: [
          string,
          any
        ]) => {
          const providerPrice =
            Number(value?.cost ?? 0);

          const stock =
            Number(value?.count ?? 0);

          if (
            !Number.isFinite(
              providerPrice
            ) ||
            providerPrice <= 0
          ) {
            return null;
          }

          if (
            !Number.isFinite(stock) ||
            stock <= 0
          ) {
            return null;
          }

          const price =
            calculateCustomerPrice(
              providerPrice
            );

          return {
            operator: operatorName,

            operatorName,

            product,

            country,

            providerPrice,

            providerPriceUsd:
              providerPrice,

            stock,

            count: stock,

            exchangeRate:
              USD_TO_NGN,

            profit:
              PROFIT_NGN,

            customerPrice:
              price,

            price,

            currency: "NGN",

            customerCurrency:
              "NGN",
          };
        }
      )
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > => item !== null
      );

    operators.sort(
      (a, b) =>
        a.customerPrice -
        b.customerPrice
    );

    const products = operators.map(
      (item) => ({
        ...item,
        category: "activation",
      })
    );

    return NextResponse.json({
      success: true,

      country,

      product,

      category: "activation",

      services: Object.keys(
        countryData
      ),

      operators,

      products,

      exchangeRate:
        USD_TO_NGN,

      profit:
        PROFIT_NGN,

      currency: "NGN",

      total:
        operators.length,
    });
  } catch (error) {
    console.error(
      "5sim products error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load 5sim inventory.",
      },
      { status: 500 }
    );
  }
}