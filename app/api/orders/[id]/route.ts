import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return jsonResponse(
        {
          error: "Order ID is required",
        },
        400
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return jsonResponse(
        {
          error: "Authentication required",
        },
        401
      );
    }

    const accessToken = authorization
      .slice(7)
      .trim();

    if (!accessToken) {
      return jsonResponse(
        {
          error: "Invalid access token",
        },
        401
      );
    }

    /*
     * Verify the customer's Supabase session.
     */
    const authClient = createClient(
      supabaseUrl,
      supabasePublishableKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      return jsonResponse(
        {
          error:
            "Your login session is invalid or expired",
        },
        401
      );
    }

    /*
     * Service-role client is server-side only.
     */
    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /*
     * IMPORTANT:
     * The order must belong to the authenticated user.
     */
    const {
      data: order,
      error: orderError,
    } = await adminClient
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError) {
      console.error(
        "Order database error:",
        orderError.message
      );

      return jsonResponse(
        {
          error: "Unable to load order",
        },
        500
      );
    }

    if (!order) {
      return jsonResponse(
        {
          error: "Order not found",
        },
        404
      );
    }

    return jsonResponse({
      success: true,
      order,
    });
  } catch (error) {
    console.error(
      "Order API error:",
      error
    );

    return jsonResponse(
      {
        error: "Internal server error",
      },
      500
    );
  }
}