import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ADMIN_EMAIL = "namoriki30@gmail.com";

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

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

export async function POST(request: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
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

    const email =
      authData.user.email || "";

    if (
      email.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      return jsonResponse(
        {
          error: "Admin access required.",
        },
        403
      );
    }

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          error: "Invalid JSON request.",
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
        ? body.type.trim()
        : "info";

    const userId =
      typeof body.user_id === "string" &&
      body.user_id.trim()
        ? body.user_id.trim()
        : null;

    if (!title) {
      return jsonResponse(
        {
          error: "Notification title is required.",
        },
        400
      );
    }

    if (!message) {
      return jsonResponse(
        {
          error:
            "Notification message is required.",
        },
        400
      );
    }

    if (userId) {
      const {
        data: customer,
        error: customerError,
      } =
        await supabaseAdmin.auth.admin.getUserById(
          userId
        );

      if (
        customerError ||
        !customer
      ) {
        return jsonResponse(
          {
            error:
              "Selected customer could not be found.",
          },
          400
        );
      }
    }

    const {
      error: archiveError,
    } = await supabaseAdmin
      .from("notifications")
      .update({
        is_active: false,
      })
      .eq("is_active", true);

    if (archiveError) {
      console.error(
        "ARCHIVE OLD NOTIFICATIONS ERROR:",
        archiveError
      );

      return jsonResponse(
        {
          error:
            "Could not archive previous notifications.",
        },
        500
      );
    }

    const {
      data: notification,
      error: insertError,
    } = await supabaseAdmin
      .from("notifications")
      .insert({
        title,
        message,
        type,
        user_id: userId,
        is_active: true,
        published_at:
          new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertError) {
      console.error(
        "CREATE NOTIFICATION ERROR:",
        insertError
      );

      return jsonResponse(
        {
          error:
            "Could not create notification.",
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      notification,
      message:
        "Notification published successfully.",
    });
  } catch (error) {
    console.error(
      "ADMIN NOTIFICATION ERROR:",
      error
    );

    return jsonResponse(
      {
        error:
          "Something went wrong while publishing the notification.",
      },
      500
    );
  }
}
