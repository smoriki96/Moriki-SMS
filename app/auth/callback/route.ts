import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const next =
    requestUrl.searchParams.get("next") ||
    "/reset-password";

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=missing_reset_code",
        requestUrl.origin
      )
    );
  }

  let response = NextResponse.redirect(
    new URL(next, requestUrl.origin)
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          response = NextResponse.redirect(
            new URL(next, requestUrl.origin)
          );

          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const {
    error,
  } =
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
        "/reset-password?error=invalid_or_expired",
        requestUrl.origin
      )
    );
  }

  return response;
}
