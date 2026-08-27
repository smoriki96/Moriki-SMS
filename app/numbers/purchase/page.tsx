"use client";

import { useEffect, useState } from "react";

type PhoneNumber = {
  phoneNumber: string;
  friendlyName?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  capabilities?: {
    sms?: boolean;
    voice?: boolean;
    mms?: boolean;
  };
};

export default function NumbersPage() {
  const [country, setCountry] = useState("US");
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchNumbers(selectedCountry = country) {
    setLoading(true);
    setError("");
    setNumbers([]);

    try {
      const response = await fetch(
        `/api/twilio/numbers?country=${encodeURIComponent(
          selectedCountry
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load available numbers."
        );
      }

      setNumbers(data.numbers || []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load available numbers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    searchNumbers("US");
  }, []);

  function buyNumber(phoneNumber: string) {
    const url =
      `/numbers/purchase?number=${encodeURIComponent(
        phoneNumber
      )}&country=${encodeURIComponent(country)}`;

    window.location.href = url;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        padding: "30px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "35px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
              }}
            >
              Buy a Number
            </h1>

            <p
              style={{
                color: "#94a3b8",
                marginTop: "8px",
                lineHeight: "1.5",
              }}
            >
              Choose a country and find available
              SMS-capable business numbers.
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href =
                "/dashboard";
            }}
            style={{
              padding: "10px 16px",
              borderRadius: "9px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Dashboard
          </button>
        </div>

        {/* Country Selection */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "25px",
          }}
        >
          <label
            htmlFor="country"
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
            }}
          >
            Country
          </label>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <select
              id="country"
              name="country"
              value={country}
              onChange={(e) =>
                setCountry(e.target.value)
              }
              style={{
                flex: 1,
                minWidth: "220px",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #334155",
                background: "#020617",
                color: "#ffffff",
                fontSize: "16px",
              }}
            >
              <option value="US">
                🇺🇸 United States
              </option>

              <option value="CA">
                🇨🇦 Canada
              </option>

              <option value="GB">
                🇬🇧 United Kingdom
              </option>
            </select>

            <button
              onClick={() =>
                searchNumbers(country)
              }
              disabled={loading}
              style={{
                padding: "14px 24px",
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
                ? "Searching..."
                : "Search Numbers"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#450a0a",
              border: "1px solid #7f1d1d",
              color: "#fecaca",
              padding: "18px",
              borderRadius: "12px",
              marginBottom: "25px",
            }}
          >
            <strong>
              Unable to load numbers
            </strong>

            <p
              style={{
                marginBottom: 0,
                marginTop: "8px",
                lineHeight: "1.5",
              }}
            >
              {error}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "16px",
              padding: "35px",
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            Searching for available numbers...
          </div>
        )}

        {/* No Numbers */}
        {!loading &&
          !error &&
          numbers.length === 0 && (
            <div
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "16px",
                padding: "40px 20px",
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              <div
                style={{
                  fontSize: "40px",
                  marginBottom: "10px",
                }}
              >
                📱
              </div>

              <h2
                style={{
                  color: "#ffffff",
                }}
              >
                No numbers available
              </h2>

              <p>
                Try another country or search
                again later.
              </p>
            </div>
          )}

        {/* Numbers */}
        {numbers.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {numbers.map((number) => (
              <div
                key={number.phoneNumber}
                style={{
                  background: "#0f172a",
                  border:
                    "1px solid #1e293b",
                  borderRadius: "16px",
                  padding: "22px",
                }}
              >
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: "700",
                    marginBottom: "12px",
                  }}
                >
                  {number.phoneNumber}
                </div>

                {number.locality && (
                  <p
                    style={{
                      color: "#94a3b8",
                      margin: "6px 0",
                    }}
                  >
                    Location:{" "}
                    {number.locality}
                  </p>
                )}

                {number.region && (
                  <p
                    style={{
                      color: "#94a3b8",
                      margin: "6px 0",
                    }}
                  >
                    Region:{" "}
                    {number.region}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "15px",
                    flexWrap: "wrap",
                  }}
                >
                  {number.capabilities?.sms && (
                    <span
                      style={{
                        background: "#14532d",
                        color: "#bbf7d0",
                        padding: "6px 10px",
                        borderRadius: "20px",
                        fontSize: "13px",
                      }}
                    >
                      SMS
                    </span>
                  )}

                  {number.capabilities?.voice && (
                    <span
                      style={{
                        background: "#172554",
                        color: "#bfdbfe",
                        padding: "6px 10px",
                        borderRadius: "20px",
                        fontSize: "13px",
                      }}
                    >
                      Voice
                    </span>
                  )}

                  {number.capabilities?.mms && (
                    <span
                      style={{
                        background: "#3f1d5a",
                        color: "#e9d5ff",
                        padding: "6px 10px",
                        borderRadius: "20px",
                        fontSize: "13px",
                      }}
                    >
                      MMS
                    </span>
                  )}
                </div>

                <button
                  onClick={() =>
                    buyNumber(
                      number.phoneNumber
                    )
                  }
                  style={{
                    width: "100%",
                    marginTop: "20px",
                    padding: "13px",
                    border: "none",
                    borderRadius: "10px",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Buy Number
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}