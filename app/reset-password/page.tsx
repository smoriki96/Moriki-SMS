"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "../../lib/supabase";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"error" | "success">("error");

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recoveryMode, setRecoveryMode] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepareRecovery() {
      try {
        /*
         * Supabase may send the user back with a
         * ?code=... parameter when PKCE is being used.
         */
        const code = searchParams.get("code");

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(
              code
            );

          if (error) {
            console.error(
              "PASSWORD RECOVERY CODE ERROR:",
              error
            );

            if (mounted) {
              setRecoveryMode(false);
              setMessage(
                "This password reset link is invalid or has expired. Please request a new one."
              );
              setMessageType("error");
              setChecking(false);
            }

            return;
          }

          if (mounted) {
            setRecoveryMode(true);
            setMessage("");
            setChecking(false);
          }

          return;
        }

        /*
         * Listen for Supabase's PASSWORD_RECOVERY event.
         * This is important when the recovery token comes
         * through the URL hash.
         */
        const {
          data: { subscription },
        } =
          supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (
                event === "PASSWORD_RECOVERY" &&
                session
              ) {
                if (mounted) {
                  setRecoveryMode(true);
                  setMessage("");
                  setChecking(false);
                }
              }
            }
          );

        /*
         * Give Supabase a moment to process a recovery
         * URL before checking the current session.
         */
        await new Promise((resolve) =>
          setTimeout(resolve, 700)
        );

        const {
          data: { session },
        } = await supabase.auth.getSession();

        /*
         * Do NOT automatically treat an ordinary logged-in
         * session as password recovery.
         *
         * A normal session should show the email form.
         */
        if (mounted && !recoveryMode) {
          setRecoveryMode(false);
          setChecking(false);
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error(
          "PASSWORD RECOVERY ERROR:",
          error
        );

        if (mounted) {
          setRecoveryMode(false);
          setChecking(false);
          setMessage(
            "Unable to process the password reset link. Please request a new one."
          );
          setMessageType("error");
        }
      }
    }

    let cleanup:
      | (() => void)
      | undefined;

    prepareRecovery().then((result) => {
      if (typeof result === "function") {
        cleanup = result;
      }
    });

    return () => {
      mounted = false;

      if (cleanup) {
        cleanup();
      }
    };
  }, [searchParams, recoveryMode]);

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
       * On Vercel this will use the production URL.
       * On localhost it will use localhost.
       */
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        window.location.origin;

      const redirectTo =
        `${siteUrl.replace(/\/$/, "")}/reset-password`;

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
          "SEND RESET ERROR:",
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
        "SEND RESET ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while sending the reset link."
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
          "UPDATE PASSWORD ERROR:",
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
        "UPDATE PASSWORD ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while updating your password."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-white" />

          <p className="text-slate-400">
            Checking password reset...
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
            ? Back to login
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-white" />
            <p className="text-slate-400">
              Loading...
            </p>
          </div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
