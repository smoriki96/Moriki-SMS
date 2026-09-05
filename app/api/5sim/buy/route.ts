import { NextResponse } from "next/server";

const FIVE_SIM_API = "https://5sim.net/v1";

function getApiKey() {
  return process.env.FIVESIM_API_KEY;
}

export async function GET(request: Request) {
  try {
    const apiKey = getApiKey();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "FIVESIM_API_KEY is missing from .env.local",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const action = searchParams.get("action");
    const country = searchParams.get("country");
    const operator =
      searchParams.get("operator") || "any";
    const product = searchParams.get("product");

    /*
     * ==============================
     * 5SIM PRODUCTS / AVAILABILITY
     * ==============================
     *
     * Returns live products, prices and
     * available quantity for a country/operator.
     */
    if (action === "prices") {
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
        `${FIVE_SIM_API}/guest/products/` +
        `${encodeURIComponent(country)}/` +
        `${encodeURIComponent(operator)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const text = await response.text();

      let data: unknown;

      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error:
              typeof data === "string"
                ? data
                : "5SIM products request failed.",
            data,
          },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        data,
      });
    }

    /*
     * ==============================
     * 5SIM ACCOUNT BALANCE
     * ==============================
     */
    if (action === "profile") {
      const response = await fetch(
        `${FIVE_SIM_API}/user/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const text = await response.text();

      let data: unknown;

      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error:
              typeof data === "string"
                ? data
                : "Unable to read 5SIM profile.",
            data,
          },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        data,
      });
    }

    /*
     * ==============================
     * BUY ACTIVATION
     * ==============================
     */
    if (action === "buy") {
      if (!country) {
        return NextResponse.json(
          {
            success: false,
            error: "Country is required.",
          },
          { status: 400 }
        );
      }

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: "Product/service is required.",
          },
          { status: 400 }
        );
      }

      const url =
        `${FIVE_SIM_API}/user/buy/activation/` +
        `${encodeURIComponent(country)}/` +
        `${encodeURIComponent(operator)}/` +
        `${encodeURIComponent(product)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const text = await response.text();

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error:
              data?.message ||
              data?.error ||
              text ||
              "5SIM purchase failed.",
            data,
          },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        data,
      });
    }

    /*
     * ==============================
     * CHECK ACTIVATION
     * ==============================
     */
    if (action === "status") {
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json(
          {
            success: false,
            error: "Activation ID is required.",
          },
          { status: 400 }
        );
      }

      const response = await fetch(
        `${FIVE_SIM_API}/user/check/${encodeURIComponent(id)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const text = await response.text();

      let data: unknown;

      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error:
              typeof data === "string"
                ? data
                : "Unable to check activation.",
            data,
          },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        data,
      });
    }

    /*
     * ==============================
     * INVALID ACTION
     * ==============================
     */
    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid action. Use prices, profile, buy, or status.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("5SIM ROUTE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to connect to 5SIM.",
      },
      { status: 500 }
    );
  }
}