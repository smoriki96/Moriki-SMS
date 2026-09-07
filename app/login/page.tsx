"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);

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

      setMessageType("success");
      setMessage("Login successful. Redirecting...");

      /*
       * All normal login accounts go to the
       * customer dashboard.
       *
       * Admin access is protected separately
       * by the server-side proxy.
       */
      router.replace("/dashboard");
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

        <form onSubmit={handleLogin}>
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
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
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
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
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

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "15px",
              border: "none",
              borderRadius: "10px",
              background: loading ? "#475569" : "#2563eb",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </form>

        {message && (
          <div
            style={{
              marginTop: "20px",
              padding: "14px",
              borderRadius: "10px",
              background: "#020617",
              color:
                messageType === "success"
                  ? "#4ade80"
                  : "#f87171",
              border: "1px solid #334155",
              fontSize: "14px",
              lineHeight: "1.5",
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
