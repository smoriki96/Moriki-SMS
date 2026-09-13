import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const tokenHash =
    requestUrl.searchParams.get("token_hash");

  const type =
    requestUrl.searchParams.get("type");

  const requestedNext =
    requestUrl.searchParams.get("next");

  const next =
    requestedNext &&
    requestedNext.startsWith("/")
      ? requestedNext
      : "/reset-password";

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL(
        "/reset-password?error=invalid_reset_link",
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
  } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as
      | "signup"
      | "invite"
      | "recovery"
      | "email"
      | "email_change",
  });

  if (error) {
    console.error(
      "SUPABASE AUTH CONFIRM ERROR:",
      error.message
    );

    return NextResponse.redirect(
      new URL(
        "/reset-password?error=invalid_reset_link",
        requestUrl.origin
      )
    );
  }

  return response;
}
