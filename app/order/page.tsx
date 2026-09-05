"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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

function OrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const country = searchParams.get("country");
  const service = searchParams.get("service");

  const countryName = country
    ? countryNames[country] || country
    : "Not selected";

  function continueToPayment() {
    if (!country || !service) {
      router.push("/buy");
      return;
    }

    const params = new URLSearchParams({
      country,
      service,
    });

    router.push(`/payment?${params.toString()}`);
  }

  if (!country || !service) {
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
        <div style={{ textAlign: "center" }}>
          <h1>Selection not found</h1>

          <p style={{ color: "#94a3b8" }}>
            Please choose a country and service first.
          </p>

          <button
            onClick={() => router.push("/buy")}
            style={{
              padding: "13px 22px",
              background: "#2563eb",
              color: "#ffffff",
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

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #1e293b",
          background: "#020617",
        }}
      >
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0 }}>
            Moriki{" "}
            <span style={{ color: "#3b82f6" }}>
              SMS
            </span>
          </h2>

          <button
            onClick={() => router.push("/buy")}
            style={{
              background: "transparent",
              color: "#94a3b8",
              border: "none",
              cursor: "pointer",
            }}
          >
            ← Change selection
          </button>
        </div>
      </header>

      <section
        style={{
          maxWidth: "650px",
          margin: "0 auto",
          padding: "50px 24px",
        }}
      >
        <p
          style={{
            color: "#60a5fa",
            fontWeight: "700",
            marginBottom: "8px",
          }}
        >
          ORDER SUMMARY
        </p>

        <h1>Confirm your order</h1>

        <p style={{ color: "#94a3b8" }}>
          Check your selection before continuing
          to payment.
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
              gap: "20px",
              paddingBottom: "18px",
              borderBottom: "1px solid #1e293b",
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
              gap: "20px",
              padding: "18px 0",
              borderBottom: "1px solid #1e293b",
            }}
          >
            <span style={{ color: "#94a3b8" }}>
              Service
            </span>

            <strong>{service}</strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "20px",
              paddingTop: "18px",
            }}
          >
            <span style={{ color: "#94a3b8" }}>
              Number
            </span>

            <strong>Assigned after payment</strong>
          </div>
        </div>

        <div
          style={{
            marginTop: "20px",
            padding: "18px",
            background: "#172554",
            borderRadius: "14px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#bfdbfe",
              lineHeight: "1.5",
            }}
          >
            Your virtual number will be assigned
            after successful payment.
          </p>
        </div>

        <button
          onClick={continueToPayment}
          style={{
            width: "100%",
            marginTop: "25px",
            padding: "16px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            fontSize: "16px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          Continue to Payment →
        </button>
      </section>
    </main>
  );
}

function OrderLoading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <p style={{ color: "#94a3b8" }}>
        Loading order...
      </p>
    </main>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<OrderLoading />}>
      <OrderContent />
    </Suspense>
  );
}