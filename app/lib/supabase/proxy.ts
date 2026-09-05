import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_EMAIL = "namoriki30@gmail.com";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

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

  // IMPORTANT:
  // Do not destructure data.claims directly.
  // Supabase can return data as null.
  const {
    data,
    error,
  } = await supabase.auth.getClaims();

  const claims =
    data?.claims ?? null;

  const pathname =
    request.nextUrl.pathname;

  /*
   * /admin/dashboard is the CUSTOMER dashboard
   * in this project, so it must NOT be treated
   * as an admin-only page.
   */
  const isCustomerDashboard =
    pathname ===
      "/admin/dashboard" ||
    pathname.startsWith(
      "/admin/dashboard/"
    );

  /*
   * These are the REAL admin-only areas.
   */
  const isAdminArea =
    pathname === "/admin" ||
    pathname === "/admin/customers" ||
    pathname.startsWith(
      "/admin/customers/"
    ) ||
    pathname === "/admin/support" ||
    pathname.startsWith(
      "/admin/support/"
    );

  /*
   * Protect admin pages.
   */
  if (
    isAdminArea &&
    !isCustomerDashboard
  ) {
    const email =
      typeof claims?.email ===
      "string"
        ? claims.email
        : "";

    /*
     * No authenticated user.
     */
    if (!email) {
      return NextResponse.redirect(
        new URL(
          "/login",
          request.url
        )
      );
    }

    /*
     * Only the admin email can enter
     * the admin area.
     */
    if (
      email.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.redirect(
        new URL(
          "/login",
          request.url
        )
      );
    }
  }

  /*
   * Log the auth error without crashing
   * the entire application.
   */
  if (error) {
    console.error(
      "Supabase proxy auth error:",
      error.message
    );
  }

  return response;
}