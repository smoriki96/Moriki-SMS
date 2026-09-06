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

  if (!token) {
    throw new Error("Unauthorized.");
  }

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

export async function GET(request: NextRequest) {
  try {
    const adminClient = await authenticateAdmin(request);

    const { data: tickets, error } = await adminClient
      .from("support_tickets")
      .select(
        "id, user_id, category, subject, message, status, admin_reply, attachment_url, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ADMIN SUPPORT DB ERROR:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Unable to load support requests.",
        },
        { status: 500 }
      );
    }

    const ticketsWithCustomers = await Promise.all(
      (tickets || []).map(async (ticket) => {
        let customerEmail = "Unknown";

        try {
          const {
            data: { user },
          } = await adminClient.auth.admin.getUserById(
            ticket.user_id
          );

          if (user?.email) {
            customerEmail = user.email;
          }
        } catch (error) {
          console.error(
            "CUSTOMER LOOKUP ERROR:",
            error
          );
        }

        return {
          ...ticket,
          customer_email: customerEmail,
        };
      })
    );

    return NextResponse.json({
      success: true,
      tickets: ticketsWithCustomers,
    });
  } catch (error) {
    console.error("ADMIN SUPPORT ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load support requests.";

    return NextResponse.json(
      { error: message },
      { status: 401 }
    );
  }
}
