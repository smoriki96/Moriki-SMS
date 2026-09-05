"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "error" | "success"
  >("error");

  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    setMessage("");
    setMessageType("error");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setMessage("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        console.error("LOGIN ERROR:", error);
        setMessage(error.message);
        return;
      }

      if (!data.user || !data.session) {
        setMessage("Login failed. Please try again.");
        return;
      }

      // Never put credentials in the URL.
      // Navigate only after Supabase authentication succeeds.
      router.replace("/admin/dashboard");
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while logging in."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setMessage("");
    setMessageType("error");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setMessage(
        "Enter your email address first, then click Forgot password."
      );
      return;
    }

    setForgotLoading(true);

    try {
      const redirectTo =
        `${window.location.origin}/reset-password`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessageType("success");

      setMessage(
        "Password reset email sent. Check your email and follow the link to create a new password."
      );
    } catch (error) {
      console.error(
        "PASSWORD RESET ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "20px",
          padding: "35px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              fontWeight: "800",
            }}
          >
            Moriki{" "}
            <span style={{ color: "#3b82f6" }}>
              SMS
            </span>
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginTop: "10px",
            }}
          >
            Login to your account
          </p>
        </div>

        <form
          method="post"
          action="#"
          onSubmit={handleLogin}
        >
          <label
            htmlFor="email"
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
            }}
          >
            Email
          </label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            disabled={
              loading || forgotLoading
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#020617",
              color: "#ffffff",
              outline: "none",
              fontSize: "15px",
            }}
          />

          <label
            htmlFor="password"
            style={{
              display: "block",
              marginTop: "20px",
              marginBottom: "8px",
              fontWeight: "600",
            }}
          >
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            disabled={
              loading || forgotLoading
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#020617",
              color: "#ffffff",
              outline: "none",
              fontSize: "15px",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "10px",
            }}
          >
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={
                loading || forgotLoading
              }
              style={{
                border: "none",
                background: "transparent",
                color: "#60a5fa",
                fontSize: "14px",
                fontWeight: "600",
                cursor:
                  loading || forgotLoading
                    ? "not-allowed"
                    : "pointer",
                padding: "4px 0",
              }}
            >
              {forgotLoading
                ? "Sending..."
                : "Forgot password?"}
            </button>
          </div>

          <button
            type="submit"
            disabled={
              loading || forgotLoading
            }
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "15px",
              border: "none",
              borderRadius: "10px",
              background:
                loading || forgotLoading
                  ? "#475569"
                  : "#2563eb",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "700",
              cursor:
                loading || forgotLoading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        {message && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              borderRadius: "10px",
              background:
                messageType === "success"
                  ? "#052e16"
                  : "#020617",
              color:
                messageType === "success"
                  ? "#4ade80"
                  : "#f87171",
              border:
                messageType === "success"
                  ? "1px solid #166534"
                  : "1px solid #1e293b",
              textAlign: "center",
              lineHeight: "1.5",
              fontSize: "14px",
            }}
          >
            {message}
          </div>
        )}

        <p
          style={{
            marginTop: "25px",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "14px",
          }}
        >
          Don't have an account?{" "}
          <a
            href="/register"
            style={{
              color: "#60a5fa",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            Create Account
          </a>
        </p>
      </div>
    </main>
  );
}