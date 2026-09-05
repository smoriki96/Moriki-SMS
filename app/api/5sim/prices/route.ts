import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const country = searchParams.get("country");
    const product = searchParams.get("product");

    const params = new URLSearchParams();

    if (country) {
      params.set("country", country);
    }

    if (product) {
      params.set("product", product);
    }

    const url =
      `https://5sim.net/v1/guest/prices${
        params.toString()
          ? `?${params.toString()}`
          : ""
      }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            data?.error ||
            "5SIM price request failed.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("5SIM PRICES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load 5SIM prices.",
      },
      { status: 500 }
    );
  }
}