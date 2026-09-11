import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/reset-password";

  const safeNext =
    next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/reset-password";

  if (!code) {
    return NextResponse.redirect(
      new URL("/reset-password?error=missing_code", request.url)
    );
  }

  let response = NextResponse.redirect(
    new URL(safeNext, request.url)
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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.redirect(
            new URL(safeNext, request.url)
          );

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
      "PASSWORD RECOVERY CALLBACK ERROR:",
      error.message
    );

    return NextResponse.redirect(
      new URL(
        "/reset-password?error=invalid_code",
        request.url
      )
    );
  }

  return response;
}
