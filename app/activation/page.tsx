"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Order = {
  id: string;
  phone_number?: string | null;
  number?: string | null;
  country?: string | null;
  service?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export default function ActivationPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadOrder() {
    if (!orderId) {
      setError("No order was selected.");
      setLoading(false);
      return;
    }

    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in to view this activation.");
      setLoading(false);
      return;
    }

    const { data, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError) {
      console.error(orderError);
      setError("Order could not be found.");
      setOrder(null);
    } else {
      setOrder(data as Order);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function refreshActivation() {
    setRefreshing(true);
    await loadOrder();
    setRefreshing(false);
  }

  const phoneNumber =
    order?.phone_number ||
    order?.number ||
    "Number not available";

  const country = order?.country || "Unknown country";
  const service = order?.service || "Unknown service";
  const status = order?.status || "pending";

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #020617;
          font-family: Arial, sans-serif;
        }

        .page {
          min-height: 100vh;
          color: white;
          background:
            radial-gradient(
              circle at top right,
              rgba(33,150,243,.18),
              transparent 35%
            ),
            #020617;
        }

        .header {
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: rgba(2,6,23,.95);
        }

        .headerInner {
          max-width: 1100px;
          margin: auto;
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          color: white;
          text-decoration: none;
          font-size: 24px;
          font-weight: 900;
        }

        .logo span {
          color: #2196f3;
        }

        .back {
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
        }

        .container {
          max-width: 850px;
          margin: auto;
          padding: 55px 20px 80px;
        }

        .title {
          text-align: center;
          margin-bottom: 35px;
        }

        .title h1 {
          margin: 0 0 10px;
          font-size: 38px;
        }

        .title p {
          margin: 0;
          color: #94a3b8;
        }

        .card {
          background: #0f172a;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          padding: 30px;
          margin-bottom: 20px;
        }

        .numberBox {
          text-align: center;
          padding: 30px 15px;
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              rgba(33,150,243,.16),
              rgba(2,6,23,.5)
            );
          border: 1px solid rgba(33,150,243,.2);
          margin-bottom: 25px;
        }

        .numberLabel {
          color: #94a3b8;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .number {
          font-size: 30px;
          font-weight: 900;
          letter-spacing: 1px;
          word-break: break-word;
        }

        .details {
          display: grid;
          grid-template-columns: repeat(2,1fr);
          gap: 15px;
        }

        .detail {
          padding: 18px;
          border-radius: 14px;
          background: #020617;
          border: 1px solid rgba(255,255,255,.06);
        }

        .label {
          color: #64748b;
          font-size: 12px;
          margin-bottom: 7px;
        }

        .value {
          color: #e2e8f0;
          font-weight: 800;
          word-break: break-word;
        }

        .status {
          display: inline-flex;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(34,197,94,.12);
          color: #4ade80;
          font-size: 12px;
          font-weight: 900;
          text-transform: capitalize;
        }

        .smsBox {
          text-align: center;
          padding: 35px 20px;
          border: 1px dashed rgba(255,255,255,.15);
          border-radius: 18px;
        }

        .smsIcon {
          font-size: 45px;
          margin-bottom: 12px;
        }

        .smsBox h2 {
          margin: 0 0 10px;
        }

        .smsBox p {
          color: #94a3b8;
          line-height: 1.6;
          font-size: 14px;
        }

        .refresh {
          margin-top: 15px;
          border: 0;
          border-radius: 10px;
          padding: 13px 20px;
          background: #2196f3;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .refresh:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .error {
          padding: 20px;
          border-radius: 15px;
          background: rgba(239,68,68,.1);
          border: 1px solid rgba(239,68,68,.25);
          color: #fca5a5;
          text-align: center;
        }

        .loading {
          text-align: center;
          color: #94a3b8;
          padding: 60px 20px;
        }

        .links {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 25px;
        }

        .linkButton {
          padding: 12px 18px;
          border-radius: 10px;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,.08);
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
        }

        @media (max-width: 600px) {
          .container {
            padding: 40px 15px 60px;
          }

          .title h1 {
            font-size: 30px;
          }

          .card {
            padding: 20px;
          }

          .details {
            grid-template-columns: 1fr;
          }

          .number {
            font-size: 24px;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <Link href="/" className="logo">
            Moriki <span>SMS</span>
          </Link>

          <Link href="/orders" className="back">
            ← My Orders
          </Link>
        </div>
      </header>

      <div className="container">
        <div className="title">
          <h1>Number Activation</h1>
          <p>
            View your purchased number and activation status.
          </p>
        </div>

        {loading ? (
          <div className="loading">
            Loading activation...
          </div>
        ) : error ? (
          <div className="error">
            {error}
          </div>
        ) : order ? (
          <>
            <section className="card">
              <div className="numberBox">
                <div className="numberLabel">
                  YOUR VIRTUAL NUMBER
                </div>

                <div className="number">
                  {phoneNumber}
                </div>
              </div>

              <div className="details">
                <div className="detail">
                  <div className="label">
                    COUNTRY
                  </div>

                  <div className="value">
                    {country}
                  </div>
                </div>

                <div className="detail">
                  <div className="label">
                    SERVICE
                  </div>

                  <div className="value">
                    {service}
                  </div>
                </div>

                <div className="detail">
                  <div className="label">
                    STATUS
                  </div>

                  <div className="status">
                    {status}
                  </div>
                </div>

                <div className="detail">
                  <div className="label">
                    ORDER ID
                  </div>

                  <div className="value">
                    {order.id}
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="smsBox">
                <div className="smsIcon">
                  💬
                </div>

                <h2>
                  Waiting for SMS
                </h2>

                <p>
                  Your verification SMS will appear
                  here when it becomes available.
                </p>

                <button
                  className="refresh"
                  onClick={refreshActivation}
                  disabled={refreshing}
                >
                  {refreshing
                    ? "Checking..."
                    : "↻ Refresh Activation"}
                </button>
              </div>
            </section>

            <div className="links">
              <Link
                href="/orders"
                className="linkButton"
              >
                View Orders
              </Link>

              <Link
                href="/numbers"
                className="linkButton"
              >
                Buy Another Number
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}