"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  const [message, setMessage] = useState(
    "Verifying your password reset link..."
  );

  useEffect(() => {
    let mounted = true;

    async function handleCallback() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const next =
          url.searchParams.get("next") ||
          "/reset-password";

        if (!code) {
          if (mounted) {
            setMessage(
              "No password reset code was found. Please request a new reset link."
            );
          }
          return;
        }

        const { error } =
          await supabase.auth.exchangeCodeForSession(
            code
          );

        if (error) {
          console.error(
            "PASSWORD RESET CALLBACK ERROR:",
            error
          );

          if (mounted) {
            setMessage(
              "This password reset link is invalid or has expired. Please request a new one."
            );
          }

          return;
        }

        if (!mounted) return;

        router.replace(
          next.startsWith("/")
            ? next
            : "/reset-password"
        );
      } catch (error) {
        console.error(
          "AUTH CALLBACK ERROR:",
          error
        );

        if (mounted) {
          setMessage(
            "Unable to verify this password reset link. Please request a new one."
          );
        }
      }
    }

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">

          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-950">
            M
          </div>

          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-white" />

          <h1 className="text-xl font-bold">
            Verifying reset link
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            {message}
          </p>

        </div>
      </div>
    </main>
  );
}
