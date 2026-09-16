import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://5sim.net/v1/guest/countries",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

    if (!response.ok) {
      console.error(
        "5SIM COUNTRIES ERROR:",
        response.status,
        text
      );

      return NextResponse.json(
        {
          success: false,
          error: "5SIM countries request failed",
          status: response.status,
        },
        { status: 502 }
      );
    }

    let data: unknown;

    try {
      data = JSON.parse(text);
    } catch {
      console.error(
        "5SIM COUNTRIES INVALID JSON:",
        text
      );

      return NextResponse.json(
        {
          success: false,
          error: "5SIM returned invalid JSON",
        },
        { status: 502 }
      );
    }

    /*
     * 5SIM returns countries as an object.
     * Convert it into a simple array for Moriki SMS.
     */
    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data)
    ) {
      const countries = Object.entries(
        data as Record<string, unknown>
      ).map(([key, value]) => {
        const item =
          value &&
          typeof value === "object"
            ? (value as Record<string, unknown>)
            : {};

        return {
          code:
            typeof item.iso === "string"
              ? item.iso.toUpperCase()
              : key.toUpperCase(),

          name:
            typeof item.name === "string"
              ? item.name
              : key,

          iso:
            typeof item.iso === "string"
              ? item.iso.toUpperCase()
              : key.toUpperCase(),

          prefix:
            typeof item.prefix === "string"
              ? item.prefix
              : "",
        };
      });

      return NextResponse.json({
        success: true,
        countries,
      });
    }

    /*
     * Fallback in case 5SIM changes the response
     * into an array in the future.
     */
    if (Array.isArray(data)) {
      return NextResponse.json({
        success: true,
        countries: data,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected 5SIM countries response",
      },
      { status: 502 }
    );
  } catch (error) {
    console.error(
      "5SIM COUNTRIES SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to connect to 5SIM",
      },
      { status: 502 }
    );
  }
}
