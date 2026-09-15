import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

function jsonResponse(
  data: unknown,
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

export async function GET(request: Request) {
  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return jsonResponse(
        {
          error:
            "Supabase server environment variables are missing.",
        },
        500
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
          error: "Unauthorized.",
        },
        401
      );
    }

    const accessToken =
      authorization.substring(7);

    const supabaseAdmin =
      createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      authError ||
      !authData.user
    ) {
      return jsonResponse(
        {
          error: "Invalid authentication.",
        },
        401
      );
    }

    const userId =
      authData.user.id;

    const {
      data: globalNotifications,
      error: globalError,
    } =
      await supabaseAdmin
        .from("notifications")
        .select("*")
        .eq("is_active", true)
        .is("user_id", null)
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

    if (globalError) {
      console.error(
        "GLOBAL NOTIFICATION ERROR:",
        globalError
      );

      return jsonResponse(
        {
          error:
            "Could not load notifications.",
        },
        500
      );
    }

    const {
      data: personalNotifications,
      error: personalError,
    } =
      await supabaseAdmin
        .from("notifications")
        .select("*")
        .eq("is_active", true)
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

    if (personalError) {
      console.error(
        "PERSONAL NOTIFICATION ERROR:",
        personalError
      );

      return jsonResponse(
        {
          error:
            "Could not load notifications.",
        },
        500
      );
    }

    const candidates = [
      ...(globalNotifications || []),
      ...(personalNotifications || []),
    ];

    candidates.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

    const latest =
      candidates.length > 0
        ? candidates[0]
        : null;

    if (!latest) {
      return jsonResponse({
        notifications: [],
      });
    }

    const {
      data: view,
      error: viewError,
    } =
      await supabaseAdmin
        .from("notification_views")
        .select("id")
        .eq(
          "notification_id",
          latest.id
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (viewError) {
      console.error(
        "NOTIFICATION VIEW ERROR:",
        viewError
      );

      return jsonResponse(
        {
          error:
            "Could not check notification status.",
        },
        500
      );
    }

    if (view) {
      return jsonResponse({
        notifications: [],
      });
    }

    const {
      error: insertViewError,
    } =
      await supabaseAdmin
        .from("notification_views")
        .upsert(
          {
            notification_id:
              latest.id,
            user_id: userId,
          },
          {
            onConflict:
              "notification_id,user_id",
          }
        );

    if (insertViewError) {
      console.error(
        "SAVE NOTIFICATION VIEW ERROR:",
        insertViewError
      );
    }

    return jsonResponse({
      notifications: [latest],
    });
  } catch (error) {
    console.error(
      "CUSTOMER NOTIFICATIONS ERROR:",
      error
    );

    return jsonResponse(
      {
        error:
          "Something went wrong while loading notifications.",
      },
      500
    );
  }
}
