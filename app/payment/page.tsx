"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

const countryNames: Record<string, string> = {
  US: "🇺🇸 United States",
  GB: "🇬🇧 United Kingdom",
  CA: "🇨🇦 Canada",
  NG: "🇳🇬 Nigeria",
  MX: "🇲🇽 Mexico",
  IN: "🇮🇳 India",
  DE: "🇩🇪 Germany",
  FR: "🇫🇷 France",
  ES: "🇪🇸 Spain",
  IT: "🇮🇹 Italy",
  BR: "🇧🇷 Brazil",
  AU: "🇦🇺 Australia",
  JP: "🇯🇵 Japan",
  KR: "🇰🇷 South Korea",
  NL: "🇳🇱 Netherlands",
  TR: "🇹🇷 Turkey",
  ZA: "🇿🇦 South Africa",
  AE: "🇦🇪 United Arab Emirates",
  SA: "🇸🇦 Saudi Arabia",
  GH: "🇬🇭 Ghana",
};

const prices: Record<string, number> = {
  WhatsApp: 1500,
  Telegram: 1200,
  Facebook: 1300,
  TextNow: 1000,
  Email: 800,
};

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const country = searchParams.get("country");
  const service = searchParams.get("service");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!country || !service) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1>Payment information missing</h1>

          <button
            onClick={() => router.push("/buy")}
            style={{
              padding: "13px 22px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "9px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            Choose a Number
          </button>
        </div>
      </main>
    );
  }

  const countryName =
    countryNames[country] || country;

  const price = prices[service] || 1500;

  async function startPayment() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        "/api/paystack/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            amount: price,
            country,
            service,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Payment initialization failed"
        );
      }

      if (!data.authorization_url) {
        throw new Error(
          "Paystack did not return a payment URL"
        );
      }

      window.location.href =
        data.authorization_url;
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );

      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            marginBottom: "25px",
          }}
        >
          ← Back
        </button>

        <p
          style={{
            color: "#60a5fa",
            fontWeight: "700",
          }}
        >
          PAYMENT
        </p>

        <h1>Complete your payment</h1>

        <p style={{ color: "#94a3b8" }}>
          Review your order before continuing.
        </p>

        <div
          style={{
            marginTop: "30px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "18px",
            padding: "25px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}
          >
            <span style={{ color: "#94a3b8" }}>
              Country
            </span>

            <strong>{countryName}</strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}
          >
            <span style={{ color: "#94a3b8" }}>
              Service
            </span>

            <strong>{service}</strong>
          </div>

          <div
            style={{
              borderTop: "1px solid #334155",
              paddingTop: "20px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Total</span>

            <strong
              style={{
                fontSize: "25px",
                color: "#60a5fa",
              }}
            >
              ₦{price.toLocaleString()}
            </strong>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: "20px",
              padding: "14px",
              background: "#450a0a",
              border: "1px solid #7f1d1d",
              borderRadius: "10px",
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={startPayment}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            marginTop: "25px",
            border: "none",
            borderRadius: "10px",
            background: loading
              ? "#475569"
              : "#2563eb",
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: "700",
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          {loading
            ? "Opening Paystack..."
            : `Pay ₦${price.toLocaleString()}`}
        </button>

        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: "13px",
            marginTop: "20px",
          }}
        >
          You are currently using Paystack test mode.
          No real payment should be made during testing.
        </p>
      </div>
    </main>
  );
}