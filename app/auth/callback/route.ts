import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const requestedNext =
    requestUrl.searchParams.get("next") ||
    "/reset-password";

  const next =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//")
      ? requestedNext
      : "/reset-password";

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=password_reset_invalid",
        requestUrl.origin
      )
    );
  }

  const cookieStore = await cookies();

  let response = NextResponse.redirect(
    new URL(next, requestUrl.origin)
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          for (const {
            name,
            value,
            options,
          } of cookiesToSet) {
            response.cookies.set(
              name,
              value,
              options
            );
          }
        },
      },
    }
  );

  const { error } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (error) {
    console.error(
      "PASSWORD RESET CALLBACK ERROR:",
      error.message
    );

    return NextResponse.redirect(
      new URL(
        "/reset-password?error=invalid",
        requestUrl.origin
      )
    );
  }

  return response;
}
