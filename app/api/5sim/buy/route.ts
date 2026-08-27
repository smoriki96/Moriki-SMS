
import { NextRequest, NextResponse } from "next/server";

const FIVE_SIM_API_KEY =
  process.env.FIVESIM_API_KEY;

const FIVE_SIM_BASE_URL =
  "https://5sim.net/v1";

export async function POST(
  request: NextRequest
) {
  try {
    if (!FIVE_SIM_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "5sim API key is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const country = String(
      body.country || ""
    ).trim();

    const operator = String(
      body.operator || "any"
    ).trim();

    const product = String(
      body.product || ""
    ).trim();

    if (!country || !product) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Country and service are required.",
        },
        { status: 400 }
      );
    }

    /*
     * 5sim order endpoint
     */
    const url =
      `${FIVE_SIM_BASE_URL}/user/buy/activation/` +
      `${encodeURIComponent(country)}/` +
      `${encodeURIComponent(operator)}/` +
      `${encodeURIComponent(product)}`;

    console.log(
      "5sim BUY REQUEST:",
      url
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization:
          `Bearer ${FIVE_SIM_API_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();

    let data: any = null;

    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    console.log(
      "5sim BUY STATUS:",
      response.status
    );

    console.log(
      "5sim BUY RESPONSE:",
      data || text
    );

    if (!response.ok) {
      let message =
        "5sim could not provide the number.";

      if (
        data &&
        typeof data.message === "string"
      ) {
        message = data.message;
      } else if (
        data &&
        typeof data.error === "string"
      ) {
        message = data.error;
      } else if (text) {
        message = text;
      }

      return NextResponse.json(
        {
          success: false,
          error: message,
          status: response.status,
        },
        {
          status: response.status,
        }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error:
            "5sim returned an invalid response.",
        },
        { status: 502 }
      );
    }

    /*
     * 5sim normally returns:
     * id
     * phone
     * product
     * operator
     * status
     * price
     * sms
     */
    if (!data.phone) {
      return NextResponse.json(
        {
          success: false,
          error:
            "5sim accepted the request but did not return a phone number.",
          data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      number: data.phone,
      phone: data.phone,
      product:
        data.product || product,
      operator:
        data.operator || operator,
      providerPrice:
        Number(data.price) || 0,
      status:
        data.status || "PENDING",
    });
  } catch (error) {
    console.error(
      "5sim BUY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to purchase number from 5sim.",
      },
      { status: 500 }
    );
  }
}