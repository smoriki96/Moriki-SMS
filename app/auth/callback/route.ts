import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next =
    requestUrl.searchParams.get("next") || "/reset-password";

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=password-reset-link-invalid",
        request.url
      )
    );
  }

  const cookieStore = await cookies();

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              cookieStore.set(
                name,
                value,
                options
              );

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
        "/login?error=password-reset-link-invalid",
        request.url
      )
    );
  }

  const safeNext =
    next.startsWith("/") &&
    !next.startsWith("//")
      ? next
      : "/reset-password";

  const redirectResponse =
    NextResponse.redirect(
      new URL(
        safeNext,
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
