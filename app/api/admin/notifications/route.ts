import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "namoriki30@gmail.com";

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

export async function POST(
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

    // Validate the logged-in admin.
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
          error: "Your login session is invalid.",
        },
        401
      );
    }

    if (
      !user.email ||
      user.email.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Admin access required.",
        },
        403
      );
    }

    // Safely read the request body.
    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        400
      );
    }

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const type =
      typeof body.type === "string"
        ? body.type
        : "info";

    const userId =
      typeof body.user_id === "string" &&
      body.user_id.trim()
        ? body.user_id.trim()
        : null;

    if (!title) {
      return jsonResponse(
        {
          success: false,
          error:
            "Notification title is required.",
        },
        400
      );
    }

    if (!message) {
      return jsonResponse(
        {
          success: false,
          error:
            "Notification message is required.",
        },
        400
      );
    }

    if (title.length > 150) {
      return jsonResponse(
        {
          success: false,
          error:
            "Notification title is too long.",
        },
        400
      );
    }

    if (message.length > 2000) {
      return jsonResponse(
        {
          success: false,
          error:
            "Notification message is too long.",
        },
        400
      );
    }

    const allowedTypes = [
      "info",
      "warning",
      "success",
      "security",
    ];

    if (!allowedTypes.includes(type)) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid notification type.",
        },
        400
      );
    }

    // Validate customer UUID when sending
    // to one specific customer.
    if (userId) {
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidPattern.test(userId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid customer ID.",
          },
          400
        );
      }
    }

    // Service-role client is server-side only.
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

    // Verify selected customer exists.
    if (userId) {
      const {
        data: customer,
        error: customerError,
      } =
        await adminClient.auth.admin.getUserById(
          userId
        );

      if (
        customerError ||
        !customer?.user
      ) {
        return jsonResponse(
          {
            success: false,
            error: "Customer not found.",
          },
          404
        );
      }
    }

    // Create notification.
    const {
      data: notification,
      error: notificationError,
    } = await adminClient
      .from("notifications")
      .insert({
        user_id: userId,
        title,
        message,
        type,
      })
      .select(
        "id,user_id,title,message,type,created_at"
      )
      .single();

    if (notificationError) {
      console.error(
        "CREATE NOTIFICATION ERROR:",
        notificationError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Could not create notification.",
          details:
            notificationError.message,
        },
        500
      );
    }

    return jsonResponse(
      {
        success: true,
        message:
          "Notification created successfully.",
        notification,
      },
      201
    );
  } catch (error) {
    console.error(
      "ADMIN NOTIFICATION API ERROR:",
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