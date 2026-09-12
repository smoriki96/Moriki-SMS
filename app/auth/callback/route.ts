import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const nextParam =
    url.searchParams.get("next") || "/reset-password";

  const next =
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")
      ? nextParam
      : "/reset-password";

  let response = NextResponse.next();

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

          response = NextResponse.next({
            request,
          });

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

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=missing_reset_code",
        request.url
      )
    );
  }

  const { error } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (error) {
    console.error(
      "AUTH CALLBACK ERROR:",
      error.message
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=reset_link_invalid",
        request.url
      )
    );
  }

  const redirectResponse =
    NextResponse.redirect(
      new URL(
        next,
        request.url
      )
    );

  response.cookies
    .getAll()
    .forEach((cookie) => {
      redirectResponse.cookies.set(
        cookie.name,
        cookie.value
      );
    });

  return redirectResponse;
}
