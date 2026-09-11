import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");

  let next = "/reset-password";

  if (
    nextParam &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")
  ) {
    next = nextParam;
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/reset-password?error=missing_code", url.origin)
    );
  }

  let response = NextResponse.redirect(
    new URL(next, url.origin)
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers.get("cookie")
            ? request.headers
                .get("cookie")!
                .split(";")
                .map((item) => {
                  const index = item.indexOf("=");

                  return {
                    name: item.slice(0, index).trim(),
                    value: decodeURIComponent(
                      item.slice(index + 1).trim()
                    ),
                  };
                })
            : [];
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
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

  const { error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(
      "AUTH CALLBACK ERROR:",
      error.message
    );

    return NextResponse.redirect(
      new URL(
        "/reset-password?error=invalid_or_expired",
        url.origin
      )
    );
  }

  return response;
}
