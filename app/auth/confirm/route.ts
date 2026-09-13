import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") || "/reset-password";

  if (!token_hash || type !== "recovery") {
    return NextResponse.redirect(
      new URL(
        "/login?error=invalid-reset-link",
        origin
      )
    );
  }

  const cookieStore = await cookies();

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
            }
          );
        },
      },
    }
  );

  const { error } =
    await supabase.auth.verifyOtp({
      token_hash,
      type: "recovery",
    });

  if (error) {
    console.error(
      "PASSWORD RESET CONFIRM ERROR:",
      error.message
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=invalid-reset-link",
        origin
      )
    );
  }

  /*
   * Only allow internal paths.
   * This prevents the reset link from
   * redirecting users to another website.
   */
  const safeNext =
    next.startsWith("/") &&
    !next.startsWith("//")
      ? next
      : "/reset-password";

  return NextResponse.redirect(
    new URL(safeNext, origin)
  );
}
