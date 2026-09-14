"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "code" | "password">("email");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"error" | "success">("error");

  function showError(text: string) {
    setMessage(text);
    setMessageType("error");
  }

  function showSuccess(text: string) {
    setMessage(text);
    setMessageType("success");
  }

  async function sendCode(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail
        );

      if (error) {
        showError(error.message);
        return;
      }

      showSuccess(
        "A 6-digit password reset code has been sent to your email."
      );

      setStep("code");
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to send the reset code."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanCode) {
      showError("Please enter the 6-digit code.");
      return;
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      showError("The code must contain exactly 6 digits.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "recovery",
        });

      if (error) {
        showError(
          error.message ||
            "The code is invalid or expired. Please request a new code."
        );
        return;
      }

      if (!data.session) {
        showError(
          "The code was verified, but a recovery session was not created. Please request a new code."
        );
        return;
      }

      showSuccess(
        "Code verified. You can now create a new password."
      );

      setStep("password");
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to verify the code."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");

    if (!password) {
      showError("Please enter a new password.");
      return;
    }

    if (password.length < 6) {
      showError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (!confirmPassword) {
      showError("Please confirm your new password.");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        showError(error.message);
        return;
      }

      showSuccess(
        "Password changed successfully. Redirecting to login..."
      );

      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to update your password."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setStep("email");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail
        );

      if (error) {
        showError(error.message);
        return;
      }

      showSuccess(
        "A new 6-digit code has been sent to your email."
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to resend the code."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-950 shadow-lg">
            M
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            {step === "email" && "Forgot password?"}
            {step === "code" && "Enter reset code"}
            {step === "password" && "Create new password"}
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {step === "email" &&
              "Enter your email and we will send you a 6-digit reset code."}

            {step === "code" &&
              "Check your email and enter the 6-digit code we sent you."}

            {step === "password" &&
              "Create a new password for your Moriki SMS account."}
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

          {step === "email" && (
            <form
              onSubmit={sendCode}
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
                  ? "Sending code..."
                  : "Send reset code"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form
              onSubmit={verifyCode}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="code"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  6-digit reset code
                </label>

                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder="123456"
                  autoComplete="one-time-code"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none transition placeholder:text-slate-600 focus:border-white disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Verifying..."
                  : "Verify code"}
              </button>

              <button
                type="button"
                onClick={resendCode}
                disabled={loading}
                className="w-full text-sm text-slate-400 transition hover:text-white disabled:opacity-50"
              >
                Send me a new code
              </button>
            </form>
          )}

          {step === "password" && (
            <form
              onSubmit={updatePassword}
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
