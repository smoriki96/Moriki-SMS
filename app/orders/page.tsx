"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in to view your orders.");
      setLoading(false);
      return;
    }

    const { data, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (orderError) {
      console.error(orderError);
      setError("Could not load your orders.");
      setOrders([]);
    } else {
      setOrders((data || []) as Order[]);
    }

    setLoading(false);
  }

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
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(2,6,23,.94);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255,255,255,.08);
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
          max-width: 950px;
          margin: auto;
          padding: 50px 20px 80px;
        }

        .title {
          margin-bottom: 30px;
        }

        .title h1 {
          margin: 0 0 10px;
          font-size: 40px;
        }

        .title p {
          margin: 0;
          color: #94a3b8;
        }

        .order {
          padding: 24px;
          margin-bottom: 18px;
          border-radius: 20px;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,.08);
        }

        .top {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: center;
          margin-bottom: 20px;
        }

        .number {
          font-size: 21px;
          font-weight: 900;
          word-break: break-word;
        }

        .status {
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(34,197,94,.12);
          color: #4ade80;
          font-size: 12px;
          font-weight: 900;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .details {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .detail {
          padding: 14px;
          border-radius: 12px;
          background: #020617;
        }

        .label {
          color: #64748b;
          font-size: 11px;
          margin-bottom: 6px;
        }

        .value {
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 800;
          word-break: break-word;
        }

        .activation {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 13px 18px;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            #1976d2,
            #2196f3
          );
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
        }

        .empty {
          padding: 55px 20px;
          text-align: center;
          border-radius: 20px;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,.08);
        }

        .emptyIcon {
          font-size: 45px;
          margin-bottom: 15px;
        }

        .empty h2 {
          margin: 0 0 8px;
        }

        .empty p {
          color: #94a3b8;
          margin-bottom: 22px;
        }

        .browse {
          display: inline-flex;
          padding: 13px 20px;
          border-radius: 10px;
          background: #2196f3;
          color: white;
          text-decoration: none;
          font-weight: 900;
        }

        .loading {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .error {
          padding: 20px;
          border-radius: 15px;
          background: rgba(239,68,68,.1);
          border: 1px solid rgba(239,68,68,.25);
          color: #fca5a5;
          text-align: center;
        }

        @media (max-width: 650px) {
          .container {
            padding: 35px 15px 60px;
          }

          .title h1 {
            font-size: 32px;
          }

          .top {
            align-items: flex-start;
            flex-direction: column;
          }

          .details {
            grid-template-columns: 1fr;
          }

          .activation {
            width: 100%;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <Link href="/" className="logo">
            Moriki <span>SMS</span>
          </Link>

          <Link href="/dashboard" className="back">
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="container">
        <div className="title">
          <h1>My Orders</h1>
          <p>
            View your purchased numbers and manage
            their activations.
          </p>
        </div>

        {loading ? (
          <div className="loading">
            Loading your orders...
          </div>
        ) : error ? (
          <div className="error">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty">
            <div className="emptyIcon">
              📋
            </div>

            <h2>
              No orders yet
            </h2>

            <p>
              Your purchased numbers will appear
              here.
            </p>

            <Link
              href="/numbers"
              className="browse"
            >
              Browse Numbers
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            const phoneNumber =
              order.phone_number ||
              order.number ||
              "Number unavailable";

            return (
              <div
                className="order"
                key={order.id}
              >
                <div className="top">
                  <div className="number">
                    📱 {phoneNumber}
                  </div>

                  <div className="status">
                    {order.status || "pending"}
                  </div>
                </div>

                <div className="details">
                  <div className="detail">
                    <div className="label">
                      COUNTRY
                    </div>

                    <div className="value">
                      {order.country || "Unknown"}
                    </div>
                  </div>

                  <div className="detail">
                    <div className="label">
                      SERVICE
                    </div>

                    <div className="value">
                      {order.service || "Unknown"}
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

                <Link
                  href={`/activation?id=${encodeURIComponent(
                    order.id
                  )}`}
                  className="activation"
                >
                  View Activation →
                </Link>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}