import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const token_hash =
    requestUrl.searchParams.get("token_hash");

  const type =
    requestUrl.searchParams.get("type") as EmailOtpType | null;

  const nextParam =
    requestUrl.searchParams.get("next");

  const next =
    nextParam &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")
      ? nextParam
      : "/reset-password";

  if (!token_hash) {
    return NextResponse.redirect(
      new URL(
        "/reset-password?error=missing-token",
        request.url
      )
    );
  }

  let response = NextResponse.redirect(
    new URL(next, request.url)
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          response = NextResponse.redirect(
            new URL(next, request.url)
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

  const otpType: EmailOtpType =
    type || "recovery";

  const { error } =
    await supabase.auth.verifyOtp({
      token_hash,
      type: otpType,
    });

  if (error) {
    console.error(
      "AUTH CONFIRM ERROR:",
      error.message
    );

    return NextResponse.redirect(
      new URL(
        "/reset-password?error=invalid-or-expired",
        request.url
      )
    );
  }

  return response;
}
