import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!supabaseUrl || !serviceRoleKey || !adminEmail) {
      return NextResponse.json(
        { error: "Server environment variables are missing." },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        { error: "A valid Bearer token is required." },
        { status: 401 }
      );
    }

    const token = authorization.substring(7).trim();

    if (!token) {
      return NextResponse.json(
        { error: "A valid Bearer token is required." },
        { status: 401 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: loggedInUser, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !loggedInUser.user) {
      return NextResponse.json(
        { error: "Invalid or expired login session." },
        { status: 401 }
      );
    }

    if (
      loggedInUser.user.email?.toLowerCase() !==
      adminEmail.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID is required." },
        { status: 400 }
      );
    }

    if (id === loggedInUser.user.id) {
      return NextResponse.json(
        { error: "You cannot suspend your own admin account." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const action = body.action;

    if (action !== "suspend" && action !== "activate") {
      return NextResponse.json(
        { error: "Action must be suspend or activate." },
        { status: 400 }
      );
    }

    const { data: customerData, error: customerError } =
      await supabase.auth.admin.getUserById(id);

    if (customerError || !customerData.user) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }

    const banDuration =
      action === "suspend"
        ? "876000h"
        : "none";

    const { data: updatedData, error: updateError } =
      await supabase.auth.admin.updateUserById(id, {
        ban_duration: banDuration,
      });

    if (updateError) {
      console.error("Customer status update error:", updateError);

      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      customer: {
        id: updatedData.user.id,
        email: updatedData.user.email,
        banned_until: updatedData.user.banned_until,
      },
    });
  } catch (error) {
    console.error("Customer status API error:", error);

    return NextResponse.json(
      { error: "Failed to update customer status." },
      { status: 500 }
    );
  }
}