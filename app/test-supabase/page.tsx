"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function TestSupabase() {
  const [message, setMessage] = useState("");

  async function testConnection() {
    setMessage("Testing Supabase...");

    try {
      const { error } = await supabase.auth.getSession();

      if (error) {
        setMessage("Supabase error: " + error.message);
        return;
      }

      setMessage("Supabase connection is working!");
    } catch (error) {
      setMessage(
        "Connection failed: " +
          (error instanceof Error
            ? error.message
            : "Unknown error")
      );
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "18px",
          padding: "35px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "28px" }}>
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
          Supabase connection test
        </p>

        <button
          onClick={testConnection}
          style={{
            marginTop: "25px",
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "10px",
            background: "#2563eb",
            color: "white",
            fontWeight: "700",
            fontSize: "16px",
          }}
        >
          Test Connection
        </button>

        {message && (
          <p
            style={{
              marginTop: "20px",
              color: "#cbd5e1",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}