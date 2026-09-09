import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function jsonResponse(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(
  request: NextRequest
) {
  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_PUBLISHABLE_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Server configuration is incomplete.",
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
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    const accessToken =
      authorization
        .substring("Bearer ".length)
        .trim();

    if (!accessToken) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    /*
     * Validate the customer session.
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
      await authClient.auth.getUser(
        accessToken
      );

    if (userError || !user) {
      return jsonResponse(
        {
          success: false,
          error:
            "Your login session is invalid or expired.",
        },
        401
      );
    }

    /*
     * Server-side service-role client.
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
     * Get global notifications separately.
     */
    const {
      data: globalNotifications,
      error: globalError,
    } = await adminClient
      .from("notifications")
      .select(
        "id,user_id,title,message,type,created_at"
      )
      .is("user_id", null)
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (globalError) {
      console.error(
        "GLOBAL NOTIFICATIONS ERROR:",
        globalError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Could not load global notifications.",
          details: globalError.message,
        },
        500
      );
    }

    /*
     * Get notifications specifically for this user.
     */
    const {
      data: personalNotifications,
      error: personalError,
    } = await adminClient
      .from("notifications")
      .select(
        "id,user_id,title,message,type,created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (personalError) {
      console.error(
        "PERSONAL NOTIFICATIONS ERROR:",
        personalError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Could not load personal notifications.",
          details: personalError.message,
        },
        500
      );
    }

    const allNotifications = [
      ...(globalNotifications || []),
      ...(personalNotifications || []),
    ];

    /*
     * Remove duplicates and sort newest first.
     */
    const uniqueNotifications = Array.from(
      new Map(
        allNotifications.map((notification) => [
          notification.id,
          notification,
        ])
      ).values()
    ).sort(
      (a, b) =>
        new Date(
          String(b.created_at)
        ).getTime() -
        new Date(
          String(a.created_at)
        ).getTime()
    );

    if (uniqueNotifications.length === 0) {
      return jsonResponse({
        success: true,
        notifications: [],
      });
    }

    /*
     * Find notifications already shown to this user.
     */
    const notificationIds =
      uniqueNotifications.map(
        (notification) => notification.id
      );

    const {
      data: existingViews,
      error: viewsError,
    } = await adminClient
      .from("notification_views")
      .select("notification_id")
      .eq("user_id", user.id)
      .in(
        "notification_id",
        notificationIds
      );

    if (viewsError) {
      console.error(
        "NOTIFICATION VIEWS ERROR:",
        viewsError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Could not check notification history.",
          details: viewsError.message,
        },
        500
      );
    }

    const seenIds = new Set(
      (existingViews || []).map(
        (view) => view.notification_id
      )
    );

    /*
     * Only return notifications that this
     * customer has not seen before.
     */
    const unseenNotifications =
      uniqueNotifications.filter(
        (notification) =>
          !seenIds.has(notification.id)
      );

    /*
     * Mark returned notifications as shown.
     */
    if (unseenNotifications.length > 0) {
      const views =
        unseenNotifications.map(
          (notification) => ({
            notification_id:
              notification.id,
            user_id: user.id,
          })
        );

      const {
        error: insertViewsError,
      } = await adminClient
        .from("notification_views")
        .upsert(views, {
          onConflict:
            "notification_id,user_id",
          ignoreDuplicates: true,
        });

      if (insertViewsError) {
        console.error(
          "NOTIFICATION VIEW INSERT ERROR:",
          insertViewsError
        );

        /*
         * We still return the notification.
         * This means the customer can see it even
         * if recording the view fails.
         */
      }
    }

    return jsonResponse({
      success: true,
      notifications: unseenNotifications,
    });
  } catch (error) {
    console.error(
      "CUSTOMER NOTIFICATIONS API ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500
    );
  }
}