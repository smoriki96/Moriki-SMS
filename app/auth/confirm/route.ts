import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const tokenHash =
    requestUrl.searchParams.get("token_hash");

  const type =
    requestUrl.searchParams.get("type");

  const next =
    requestUrl.searchParams.get("next") ||
    "/reset-password";

  if (!tokenHash) {
    return NextResponse.redirect(
      new URL(
        "/reset-password?error=missing_token",
        request.url
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

  const allowedType =
    type === "recovery"
      ? "recovery"
      : null;

  if (!allowedType) {
    return NextResponse.redirect(
      new URL(
        "/reset-password?error=invalid_type",
        request.url
      )
    );
  }

  const { error } =
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

  if (error) {
    console.error(
      "PASSWORD RECOVERY CONFIRM ERROR:",
      error.message
    );

    return NextResponse.redirect(
      new URL(
        "/reset-password?error=expired",
        request.url
      )
    );
  }

  return NextResponse.redirect(
    new URL(
      next,
      request.url
    )
  );
}
