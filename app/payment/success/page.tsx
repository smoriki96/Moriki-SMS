"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type PaymentState = "verifying" | "success" | "failed";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reference = searchParams.get("reference");

  const [status, setStatus] =
    useState<PaymentState>("verifying");

  const [message, setMessage] = useState(
    "Verifying your payment..."
  );

  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    async function processPayment() {
      if (!reference) {
        setStatus("failed");
        setMessage("Payment reference was not found.");
        return;
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setStatus("failed");
          setMessage(
            "Your session has expired. Please log in again."
          );
          return;
        }

        const verifyResponse = await fetch(
          `/api/paystack/verify?reference=${encodeURIComponent(
            reference
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const payment = await verifyResponse.json();

        if (!verifyResponse.ok || !payment.success) {
          setStatus("failed");
          setMessage(
            payment.error ||
              "We could not verify your payment."
          );
          return;
        }

        const metadata = payment.metadata;

        const country = metadata?.country;
        const service = metadata?.service;

        if (!country || !service) {
          setStatus("failed");
          setMessage(
            "Payment was verified, but order information is missing."
          );
          return;
        }

        const orderResponse = await fetch(
          "/api/orders",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: user.id,
              country,
              service,
              amount:
                Number(payment.amount) / 100,
              payment_reference:
                payment.reference,
            }),
          }
        );

        const order = await orderResponse.json();

        if (!orderResponse.ok) {
          if (
            order.error
              ?.toLowerCase()
              .includes("duplicate") ||
            order.error
              ?.toLowerCase()
              .includes("unique")
          ) {
            setStatus("success");
            setMessage(
              "Your payment has already been processed."
            );
            return;
          }

          setStatus("failed");
          setMessage(
            order.error ||
              "Payment was successful, but we could not create your order."
          );
          return;
        }

        setOrderId(order.order?.id || "");

        setStatus("success");
        setMessage(
          "Your payment has been successfully verified and your order has been created."
        );
      } catch (error) {
        console.error(
          "Payment processing error:",
          error
        );

        setStatus("failed");
        setMessage(
          "Something went wrong while processing your payment."
        );
      }
    }

    processPayment();
  }, [reference]);

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
          maxWidth: "520px",
          textAlign: "center",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "20px",
          padding: "40px 30px",
        }}
      >
        {status === "verifying" && (
          <>
            <div
              style={{
                width: "70px",
                height: "70px",
                margin: "0 auto 25px",
                borderRadius: "50%",
                background: "#172554",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
              }}
            >
              ⏳
            </div>

            <h1>Verifying Payment</h1>

            <p
              style={{
                color: "#94a3b8",
                lineHeight: "1.6",
              }}
            >
              Please wait while we verify your
              Paystack payment.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div
              style={{
                width: "70px",
                height: "70px",
                margin: "0 auto 25px",
                borderRadius: "50%",
                background: "#14532d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "35px",
              }}
            >
              ✓
            </div>

            <h1>Payment Successful</h1>

            <p
              style={{
                color: "#94a3b8",
                lineHeight: "1.6",
              }}
            >
              {message}
            </p>

            {reference && (
              <div
                style={{
                  marginTop: "25px",
                  padding: "15px",
                  background: "#020617",
                  borderRadius: "10px",
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Payment Reference
                </p>

                <p
                  style={{
                    marginBottom: 0,
                    wordBreak: "break-all",
                    fontSize: "14px",
                  }}
                >
                  {reference}
                </p>
              </div>
            )}

            {orderId && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "15px",
                  background: "#020617",
                  borderRadius: "10px",
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Order ID
                </p>

                <p
                  style={{
                    marginBottom: 0,
                    wordBreak: "break-all",
                    fontSize: "14px",
                  }}
                >
                  {orderId}
                </p>
              </div>
            )}

            <div
              style={{
                marginTop: "25px",
                padding: "18px",
                background: "#172554",
                borderRadius: "12px",
                color: "#bfdbfe",
              }}
            >
              Your order is now waiting for a
              virtual number.
            </div>

            <button
              onClick={() =>
                router.push("/admin/dashboard")
              }
              style={{
                width: "100%",
                marginTop: "25px",
                padding: "15px",
                border: "none",
                borderRadius: "10px",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === "failed" && (
          <>
            <div
              style={{
                width: "70px",
                height: "70px",
                margin: "0 auto 25px",
                borderRadius: "50%",
                background: "#450a0a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
              }}
            >
              !
            </div>

            <h1>Payment Not Verified</h1>

            <p
              style={{
                color: "#fca5a5",
                lineHeight: "1.6",
              }}
            >
              {message}
            </p>

            <button
              onClick={() =>
                router.push("/admin/dashboard")
              }
              style={{
                width: "100%",
                marginTop: "25px",
                padding: "15px",
                border: "none",
                borderRadius: "10px",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function PaymentSuccessLoading() {
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
        Loading payment...
      </p>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}