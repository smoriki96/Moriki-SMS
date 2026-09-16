import { NextResponse } from "next/server";

const FIVESIM_COUNTRIES_URL =
  "https://5sim.net/v1/guest/countries";

function jsonResponse(
  data: unknown,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalizeCountryCode(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function extractOperators(countryData: any) {
  if (
    !countryData ||
    typeof countryData !== "object"
  ) {
    return [];
  }

  const ignoredKeys = new Set([
    "iso",
    "prefix",
    "text_en",
    "text_ru",
  ]);

  const operators: string[] = [];

  for (const key of Object.keys(countryData)) {
    if (ignoredKeys.has(key)) {
      continue;
    }

    const value = countryData[key];

    if (
      value &&
      typeof value === "object"
    ) {
      operators.push(
        String(key)
          .trim()
          .toLowerCase()
      );
    }
  }

  return Array.from(
    new Set(operators)
  ).sort();
}

async function request5SimCountries() {
  const maxAttempts = 3;

  let lastError = "Unknown 5SIM error.";

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      console.log(
        `5SIM COUNTRIES REQUEST - attempt ${attempt}`
      );

      const response = await fetch(
        FIVESIM_COUNTRIES_URL,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const text =
        await response.text();

      console.log(
        "5SIM COUNTRIES STATUS:",
        response.status
      );

      console.log(
        "5SIM COUNTRIES RAW RESPONSE:",
        text
      );

      if (!response.ok) {
        lastError =
          `HTTP ${response.status}: ${text}`;

        /*
         * Retry temporary provider/server errors.
         */
        if (
          response.status === 429 ||
          response.status >= 500
        ) {
          if (attempt < maxAttempts) {
            await new Promise((resolve) =>
              setTimeout(
                resolve,
                700 * attempt
              )
            );

            continue;
          }
        }

        throw new Error(lastError);
      }

      if (!text.trim()) {
        throw new Error(
          "5SIM returned an empty countries response."
        );
      }

      let data: any;

      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error(
          "5SIM COUNTRIES JSON PARSE ERROR:",
          parseError
        );

        throw new Error(
          "5SIM returned invalid JSON."
        );
      }

      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
      ) {
        throw new Error(
          "5SIM returned an unexpected countries format."
        );
      }

      return data;
    } catch (error) {
      console.error(
        `5SIM COUNTRIES ATTEMPT ${attempt} ERROR:`,
        error
      );

      lastError =
        error instanceof Error
          ? error.message
          : String(error);

      if (attempt < maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            700 * attempt
          )
        );
      }
    }
  }

  throw new Error(lastError);
}

export async function GET() {
  try {
    const data =
      await request5SimCountries();

    const countries = Object.entries(
      data
    )
      .map(
        ([code, value]: [
          string,
          any
        ]) => {
          const key =
            normalizeCountryCode(code);

          if (!key) {
            return null;
          }

          return {
            key,
            code: key,

            name:
              typeof value?.text_en ===
              "string"
                ? value.text_en
                : key
                    .replace(
                      /[-_]/g,
                      " "
                    )
                    .replace(
                      /\b\w/g,
                      (letter) =>
                        letter.toUpperCase()
                    ),

            iso:
              value?.iso &&
              typeof value.iso ===
                "object"
                ? Object.keys(
                    value.iso
                  )[0] || null
                : null,

            prefix:
              value?.prefix &&
              typeof value.prefix ===
                "object"
                ? Object.keys(
                    value.prefix
                  )[0] || null
                : null,

            operators:
              extractOperators(value),
          };
        }
      )
      .filter(Boolean);

    if (countries.length === 0) {
      console.error(
        "5SIM COUNTRIES ERROR: zero countries returned"
      );

      return jsonResponse(
        {
          success: false,
          error:
            "No countries were returned by 5SIM.",
        },
        502
      );
    }

    countries.sort(
      (a: any, b: any) =>
        a.name.localeCompare(
          b.name
        )
    );

    console.log(
      "5SIM COUNTRIES SUCCESS:",
      countries.length
    );

    return jsonResponse({
      success: true,
      countries,
    });
  } catch (error) {
    console.error(
      "5SIM COUNTRIES SERVER ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to load countries right now.",
      },
      502
    );
  }
}