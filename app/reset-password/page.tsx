"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"error" | "success">("error");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error(
            "RESET SESSION ERROR:",
            error
          );
          setRecoveryMode(false);
          setCheckingSession(false);
          return;
        }

        /*
         * A normal logged-in session must NOT automatically
         * put the user into password-recovery mode.
         *
         * PASSWORD_RECOVERY is detected through the
         * auth state change below.
         */
        if (data.session) {
          const hash =
            typeof window !== "undefined"
              ? window.location.hash
              : "";

          if (
            hash.includes("access_token=") ||
            hash.includes("type=recovery")
          ) {
            setRecoveryMode(true);
          } else {
            setRecoveryMode(false);
          }
        } else {
          setRecoveryMode(false);
        }

        setCheckingSession(false);
      } catch (error) {
        console.error(
          "RESET SESSION CHECK ERROR:",
          error
        );

        if (mounted) {
          setRecoveryMode(false);
          setCheckingSession(false);
        }
      }
    }

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log(
          "PASSWORD RESET AUTH EVENT:",
          event
        );

        if (
          event === "PASSWORD_RECOVERY" &&
          session
        ) {
          setRecoveryMode(true);
          setCheckingSession(false);
          setMessage("");
          return;
        }

        /*
         * Do not treat ordinary SIGNED_IN as recovery.
         */
        if (event === "SIGNED_IN") {
          const hash =
            typeof window !== "undefined"
              ? window.location.hash
              : "";

          if (
            hash.includes("access_token=") ||
            hash.includes("type=recovery")
          ) {
            setRecoveryMode(true);
          }
        }

        setCheckingSession(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSendResetLink(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setMessageType("error");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Production:
       * NEXT_PUBLIC_SITE_URL should be:
       * https://moriki-nimid2edi-smoriki96.vercel.app
       *
       * Localhost:
       * Falls back to the current local origin.
       */
      const configuredSiteUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.trim();

      let baseUrl =
        configuredSiteUrl ||
        window.location.origin;

      baseUrl = baseUrl.replace(/\/+$/, "");

      const redirectTo =
        `${baseUrl}/reset-password`;

      console.log(
        "PASSWORD RESET REDIRECT:",
        redirectTo
      );

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        console.error(
          "PASSWORD RESET REQUEST ERROR:",
          error
        );

        setMessage(error.message);
        setMessageType("error");
        return;
      }

      setMessage(
        "Password reset link sent. Please check your email and tap the reset link."
      );
      setMessageType("success");
    } catch (error) {
      console.error(
        "PASSWORD RESET REQUEST ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to send password reset email."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setMessageType("error");

    if (!password) {
      setMessage("Please enter a new password.");
      return;
    }

    if (password.length < 6) {
      setMessage(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (!confirmPassword) {
      setMessage(
        "Please confirm your new password."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        console.error(
          "PASSWORD UPDATE ERROR:",
          error
        );

        setMessage(error.message);
        setMessageType("error");
        return;
      }

      setMessage(
        "Password updated successfully. Redirecting to login..."
      );
      setMessageType("success");

      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (error) {
      console.error(
        "PASSWORD UPDATE ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update password."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-white" />

          <p className="text-slate-400">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-950 shadow-lg">
            M
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            {recoveryMode
              ? "Create new password"
              : "Forgot password?"}
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {recoveryMode
              ? "Create a new password for your Moriki SMS account."
              : "Enter your email address and we will send you a password reset link."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">

          {message && (
            <div
              className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                messageType === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {message}
            </div>
          )}

          {!recoveryMode ? (
            <form
              onSubmit={handleSendResetLink}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="Enter your email"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-white disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Sending reset link..."
                  : "Send reset link"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleUpdatePassword}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  New password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-white disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Confirm new password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-white disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Updating password..."
                  : "Update password"}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-5 w-full text-sm text-slate-400 transition hover:text-white"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </main>
  );
}