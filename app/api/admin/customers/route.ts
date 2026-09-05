import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!supabaseUrl || !serviceRoleKey || !adminEmail) {
      return NextResponse.json(
        {
          error: "Server environment variables are missing.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        {
          error: "Authorization header is required.",
        },
        { status: 401 }
      );
    }

    if (
      !authorization
        .toLowerCase()
        .startsWith("bearer ")
    ) {
      return NextResponse.json(
        {
          error: "A valid Bearer token is required.",
        },
        { status: 401 }
      );
    }

    const token = authorization
      .substring(7)
      .trim();

    if (!token) {
      return NextResponse.json(
        {
          error: "A valid Bearer token is required.",
        },
        { status: 401 }
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: userData,
      error: userError,
    } =
      await adminClient.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired login session.",
        },
        { status: 401 }
      );
    }

    const loggedInEmail =
      userData.user.email?.toLowerCase();

    const allowedAdminEmail =
      adminEmail.toLowerCase();

    if (
      !loggedInEmail ||
      loggedInEmail !== allowedAdminEmail
    ) {
      return NextResponse.json(
        {
          error: "Admin access required.",
        },
        { status: 403 }
      );
    }

    const {
      data: usersData,
      error: usersError,
    } =
      await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      console.error(
        "List users error:",
        usersError
      );

      return NextResponse.json(
        {
          error: usersError.message,
        },
        { status: 500 }
      );
    }

    const customers =
      usersData.users.map((user) => ({
        id: user.id,
        email: user.email || "",
        created_at: user.created_at,
        banned_until:
          user.banned_until || null,
        user_metadata:
          user.user_metadata || {},
      }));

    return NextResponse.json({
      customers,
    });
  } catch (error) {
    console.error(
      "Customers API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load customers.",
      },
      { status: 500 }
    );
  }
}