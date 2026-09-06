import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "namoriki30@gmail.com";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function authenticateAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Unauthorized.");
  }

  const token = authorization.substring(7);

  const adminClient = getAdminClient();

  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);

  if (error || !user) {
    throw new Error("Please log in again.");
  }

  if (
    !user.email ||
    user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
  ) {
    throw new Error("You are not authorized.");
  }

  return adminClient;
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const adminClient = await authenticateAdmin(request);

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Ticket ID is required." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const status = String(body.status || "open");

    const adminReply =
      body.admin_reply === null ||
      body.admin_reply === undefined
        ? ""
        : String(body.admin_reply);

    const allowedStatuses = [
      "open",
      "in_progress",
      "resolved",
      "closed",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid support ticket status." },
        { status: 400 }
      );
    }

    if (adminReply.length > 3000) {
      return NextResponse.json(
        {
          error: "Admin reply must be 3000 characters or less.",
        },
        { status: 400 }
      );
    }

    const { data: ticket, error } = await adminClient
      .from("support_tickets")
      .update({
        status,
        admin_reply: adminReply.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, status, admin_reply, updated_at")
      .single();

    if (error) {
      console.error("ADMIN SUPPORT UPDATE DB ERROR:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Unable to update support request.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("ADMIN SUPPORT UPDATE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update support request.",
      },
      { status: 401 }
    );
  }
}
