import { NextResponse } from "next/server";

const FIVE_SIM_COUNTRIES =
  "https://5sim.net/v1/guest/countries";

export async function GET() {
  try {
    const response = await fetch(
      FIVE_SIM_COUNTRIES,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

    let data: Record<string, any>;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "5sim returned an invalid countries response.",
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load countries from 5sim.",
        },
        { status: response.status }
      );
    }

    const countries = Object.entries(data)
      .map(([code, country]: [string, any]) => ({
        code,
        name:
          country?.text_en ||
          code
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/^\w/, (c) =>
              c.toUpperCase()
            ),
        iso:
          country?.iso?.["2"] ||
          country?.iso?.["1"] ||
          "",
        prefix:
          Object.keys(
            country?.prefix || {}
          )[0] || "",
      }))
      .filter(
        (country) =>
          country.code &&
          country.name
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );

    return NextResponse.json({
      success: true,
      countries,
      total: countries.length,
    });
  } catch (error) {
    console.error(
      "5sim countries error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load 5sim countries.",
      },
      { status: 500 }
    );
  }
}