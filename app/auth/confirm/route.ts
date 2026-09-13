import { createClient, type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const token_hash =
    requestUrl.searchParams.get("token_hash");

  const type =
    requestUrl.searchParams.get("type") as EmailOtpType | null;

  const next =
    requestUrl.searchParams.get("next") ||
    "/reset-password";

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL(
        "/reset-password?error=missing_confirmation",
        requestUrl.origin
      )
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  });

  if (error) {
    console.error(
      "AUTH CONFIRM ERROR:",
      error.message
    );

    return NextResponse.redirect(
      new URL(
        "/reset-password?error=invalid_or_expired",
        requestUrl.origin
      )
    );
  }

  return NextResponse.redirect(
    new URL(next, requestUrl.origin)
  );
}
