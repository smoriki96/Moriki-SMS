"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const countries = [
  { name: "United States", code: "US", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
  { name: "Canada", code: "CA", flag: "🇨🇦" },
  { name: "Nigeria", code: "NG", flag: "🇳🇬" },
  { name: "Mexico", code: "MX", flag: "🇲🇽" },
  { name: "India", code: "IN", flag: "🇮🇳" },
  { name: "Germany", code: "DE", flag: "🇩🇪" },
  { name: "France", code: "FR", flag: "🇫🇷" },
  { name: "Spain", code: "ES", flag: "🇪🇸" },
  { name: "Italy", code: "IT", flag: "🇮🇹" },
  { name: "Brazil", code: "BR", flag: "🇧🇷" },
  { name: "Australia", code: "AU", flag: "🇦🇺" },
  { name: "Japan", code: "JP", flag: "🇯🇵" },
  { name: "South Korea", code: "KR", flag: "🇰🇷" },
  { name: "Netherlands", code: "NL", flag: "🇳🇱" },
  { name: "Turkey", code: "TR", flag: "🇹🇷" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦" },
  { name: "United Arab Emirates", code: "AE", flag: "🇦🇪" },
  { name: "Saudi Arabia", code: "SA", flag: "🇸🇦" },
  { name: "Ghana", code: "GH", flag: "🇬🇭" },
];

const services = [
  {
    name: "WhatsApp",
    icon: "💬",
    description: "Verification number for WhatsApp",
  },
  {
    name: "Telegram",
    icon: "✈️",
    description: "Verification number for Telegram",
  },
  {
    name: "Facebook",
    icon: "ⓕ",
    description: "Verification number for Facebook",
  },
  {
    name: "TextNow",
    icon: "📱",
    description: "Verification number for TextNow",
  },
  {
    name: "Email",
    icon: "✉️",
    description: "Number for email verification",
  },
];

export default function BuyPage() {
  const router = useRouter();

  const [country, setCountry] = useState("");
  const [service, setService] = useState("");

  const selectedCountry = countries.find(
    (item) => item.code === country
  );

  function continueToOrder() {
    if (!country || !service) return;

    const params = new URLSearchParams({
      country,
      service,
    });

    router.push(`/order?${params.toString()}`);
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
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #1e293b",
          background: "#020617",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
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
            onClick={() => router.push("/dashboard")}
            style={{
              background: "transparent",
              color: "#94a3b8",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      {/* Content */}
      <section
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "45px 24px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              color: "#60a5fa",
              fontWeight: "700",
              marginBottom: "8px",
            }}
          >
            BUY A NUMBER
          </p>

          <h1
            style={{
              fontSize: "36px",
              margin: 0,
            }}
          >
            Choose your verification
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginTop: "12px",
            }}
          >
            Select a country and the service you want
            to verify.
          </p>
        </div>

        {/* Country */}
        <div style={{ marginTop: "45px" }}>
          <h2>1. Select Country</h2>

          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setService("");
            }}
            style={{
              width: "100%",
              padding: "16px",
              marginTop: "12px",
              borderRadius: "12px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#ffffff",
              fontSize: "16px",
              outline: "none",
            }}
          >
            <option value="">
              Select a country
            </option>

            {countries.map((item) => (
              <option
                key={item.code}
                value={item.code}
              >
                {item.flag} {item.name}
              </option>
            ))}
          </select>

          {selectedCountry && (
            <div
              style={{
                marginTop: "12px",
                color: "#60a5fa",
              }}
            >
              Selected: {selectedCountry.flag}{" "}
              {selectedCountry.name}
            </div>
          )}
        </div>

        {/* Services */}
        {country && (
          <div style={{ marginTop: "40px" }}>
            <h2>2. Select Service</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginTop: "15px",
              }}
            >
              {services.map((item) => {
                const selected =
                  service === item.name;

                return (
                  <button
                    key={item.name}
                    onClick={() =>
                      setService(item.name)
                    }
                    style={{
                      textAlign: "left",
                      padding: "20px",
                      borderRadius: "15px",
                      border: selected
                        ? "2px solid #3b82f6"
                        : "1px solid #334155",
                      background: selected
                        ? "#172554"
                        : "#0f172a",
                      color: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "28px",
                        marginBottom: "10px",
                      }}
                    >
                      {item.icon}
                    </div>

                    <strong
                      style={{
                        fontSize: "17px",
                      }}
                    >
                      {item.name}
                    </strong>

                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: "13px",
                        lineHeight: "1.5",
                        marginBottom: 0,
                      }}
                    >
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Continue */}
        {country && service && (
          <div
            style={{
              marginTop: "40px",
              padding: "22px",
              borderRadius: "15px",
              background: "#0f172a",
              border: "1px solid #1e293b",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "20px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#94a3b8",
                  }}
                >
                  Your selection
                </p>

                <h3 style={{ marginBottom: 0 }}>
                  {selectedCountry?.flag}{" "}
                  {selectedCountry?.name} —{" "}
                  {service}
                </h3>
              </div>

              <button
                onClick={continueToOrder}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "14px 25px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Continue →
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}