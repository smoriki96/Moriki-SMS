import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "namoriki30@gmail.com";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function responseJson(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    /*
     * -------------------------------------------------------
     * 1. CHECK SERVER CONFIGURATION
     * -------------------------------------------------------
     */

    if (
      !SUPABASE_URL ||
      !SUPABASE_PUBLISHABLE_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return responseJson(
        {
          success: false,
          error:
            "Supabase server configuration is incomplete.",
        },
        500
      );
    }

    /*
     * -------------------------------------------------------
     * 2. GET ACCESS TOKEN
     * -------------------------------------------------------
     */

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return responseJson(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    const accessToken =
      authorization.substring("Bearer ".length).trim();

    if (!accessToken) {
      return responseJson(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    /*
     * -------------------------------------------------------
     * 3. VERIFY USER
     * -------------------------------------------------------
     */

    const authClient = createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } =
      await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return responseJson(
        {
          success: false,
          error:
            "Your login session is invalid or expired.",
        },
        401
      );
    }

    /*
     * -------------------------------------------------------
     * 4. ADMIN CHECK
     * -------------------------------------------------------
     */

    if (
      !user.email ||
      user.email.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
    ) {
      return responseJson(
        {
          success: false,
          error:
            "Administrator access required.",
        },
        403
      );
    }

    /*
     * -------------------------------------------------------
     * 5. SERVER-ONLY SERVICE ROLE CLIENT
     * -------------------------------------------------------
     */

    const adminClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /*
     * -------------------------------------------------------
     * 6. GET LATEST TRANSACTIONS
     *
     * We use "*" so this endpoint won't break simply
     * because another transaction column exists.
     * -------------------------------------------------------
     */

    const {
      data: transactions,
      error: transactionsError,
    } =
      await adminClient
        .from("wallet_transactions")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(500);

    if (transactionsError) {
      console.error(
        "ADMIN TRANSACTIONS ERROR:",
        transactionsError
      );

      return responseJson(
        {
          success: false,
          error:
            transactionsError.message ||
            "Unable to load transactions.",
        },
        500
      );
    }

    /*
     * -------------------------------------------------------
     * 7. RETURN LATEST TRANSACTIONS
     * -------------------------------------------------------
     */

    return responseJson({
      success: true,
      transactions: Array.isArray(transactions)
        ? transactions
        : [],
    });
  } catch (error) {
    console.error(
      "ADMIN TRANSACTIONS SERVER ERROR:",
      error
    );

    return responseJson(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load admin transactions.",
      },
      500
    );
  }
}