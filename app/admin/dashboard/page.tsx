"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Order = {
  id: string;
  country: string | null;
  service: string | null;
  amount: number | null;
  phone_number: string | null;
  order_status: string | null;
  status: string | null;
  created_at: string;
};

type Wallet = {
  balance: number | null;
};

export default function CustomerDashboard() {
  const router = useRouter();

  const [userName, setUserName] = useState("Customer");
  const [email, setEmail] = useState("");

  const [balance, setBalance] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeNumbers, setActiveNumbers] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    setEmail(user.email || "");

    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "Customer";

    setUserName(fullName);

    // Load wallet
    const { data: walletData, error: walletError } =
      await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

    if (walletError) {
      console.error("WALLET ERROR:", walletError);
    }

    if (walletData) {
      setBalance(Number(walletData.balance || 0));
    } else {
      setBalance(0);
    }

    // Load customer's orders
    const { data: orderData, error: orderError } =
      await supabase
        .from("orders")
        .select(
          "id, country, service, amount, phone_number, order_status, status, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

    if (orderError) {
      console.error("ORDERS ERROR:", orderError);
    }

    const customerOrders = orderData || [];

    setOrders(customerOrders);

    // Count active numbers
    const active = customerOrders.filter((order) => {
      const status =
        order.status ||
        order.order_status ||
        "";

      return (
        status !== "refunded" &&
        status !== "cancelled" &&
        status !== "canceled" &&
        status !== "completed"
      );
    }).length;

    setActiveNumbers(active);

    setLoading(false);
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("LOGOUT ERROR:", error);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
  }

  function formatMoney(value: number) {
    return `₦${value.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function getOrderStatus(order: Order) {
    return (
      order.status ||
      order.order_status ||
      "pending"
    );
  }

  function formatStatus(status: string) {
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  if (loading) {
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
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              border: "4px solid #1e293b",
              borderTop: "4px solid #3b82f6",
              borderRadius: "50%",
              margin: "0 auto 15px",
              animation: "spin 1s linear infinite",
            }}
          />

          <p
            style={{
              color: "#94a3b8",
            }}
          >
            Loading your dashboard...
          </p>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
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
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "25px",
                fontWeight: "800",
              }}
            >
              Moriki{" "}
              <span
                style={{
                  color: "#3b82f6",
                }}
              >
                SMS
              </span>
            </h1>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              Customer Dashboard
            </p>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#cbd5e1",
              cursor: loggingOut
                ? "not-allowed"
                : "pointer",
              opacity: loggingOut ? 0.6 : 1,
            }}
          >
            {loggingOut
              ? "Logging out..."
              : "Logout"}
          </button>
        </div>
      </header>

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "40px 24px",
        }}
      >
        <div
          style={{
            marginBottom: "30px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Welcome back
          </p>

          <h2
            style={{
              margin: "8px 0 0",
              fontSize: "32px",
              fontWeight: "800",
            }}
          >
            {userName}
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              color: "#94a3b8",
            }}
          >
            {email}
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #7f1d1d",
              background: "#450a0a",
              color: "#fca5a5",
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Balance */}
        <div
          style={{
            marginBottom: "25px",
            padding: "25px",
            borderRadius: "18px",
            border: "1px solid #1e293b",
            background:
              "linear-gradient(135deg, #0f172a, #111827)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#94a3b8",
              fontSize: "14px",
            }}
          >
            Wallet Balance
          </p>

          <div
            style={{
              marginTop: "8px",
              fontSize: "34px",
              fontWeight: "800",
            }}
          >
            {formatMoney(balance)}
          </div>

          <button
            onClick={() => router.push("/wallet")}
            style={{
              marginTop: "18px",
              padding: "10px 16px",
              border: "none",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#ffffff",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Manage Wallet
          </button>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              padding: "22px",
              borderRadius: "16px",
              border: "1px solid #1e293b",
              background: "#0f172a",
            }}
          >
            <div style={{ fontSize: "27px" }}>
              📱
            </div>

            <p
              style={{
                margin: "12px 0 4px",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              My Numbers
            </p>

            <p
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: "800",
              }}
            >
              {activeNumbers}
            </p>
          </div>

          <div
            style={{
              padding: "22px",
              borderRadius: "16px",
              border: "1px solid #1e293b",
              background: "#0f172a",
            }}
          >
            <div style={{ fontSize: "27px" }}>
              🧾
            </div>

            <p
              style={{
                margin: "12px 0 4px",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Total Orders
            </p>

            <p
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: "800",
              }}
            >
              {orders.length}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
            marginBottom: "30px",
          }}
        >
          <button
            onClick={() => router.push("/numbers")}
            style={{
              textAlign: "left",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #1e293b",
              background: "#0f172a",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "30px" }}>
              📱
            </div>

            <h3
              style={{
                margin: "15px 0 5px",
                fontSize: "18px",
              }}
            >
              My Numbers
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              View and manage your virtual numbers.
            </p>
          </button>

          <button
            onClick={() => router.push("/orders")}
            style={{
              textAlign: "left",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #1e293b",
              background: "#0f172a",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "30px" }}>
              🧾
            </div>

            <h3
              style={{
                margin: "15px 0 5px",
                fontSize: "18px",
              }}
            >
              My Orders
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              View all your number orders.
            </p>
          </button>

          <button
            onClick={() => router.push("/account")}
            style={{
              textAlign: "left",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #1e293b",
              background: "#0f172a",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "30px" }}>
              👤
            </div>

            <h3
              style={{
                margin: "15px 0 5px",
                fontSize: "18px",
              }}
            >
              Account
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Manage your account and password.
            </p>
          </button>

          <button
            onClick={() => router.push("/support")}
            style={{
              textAlign: "left",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #1e293b",
              background: "#0f172a",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "30px" }}>
              💬
            </div>

            <h3
              style={{
                margin: "15px 0 5px",
                fontSize: "18px",
              }}
            >
              Customer Care
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Contact Moriki SMS support.
            </p>
          </button>
        </div>

        {/* Recent orders */}
        <section
          style={{
            borderRadius: "18px",
            border: "1px solid #1e293b",
            background: "#0f172a",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px 22px",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                }}
              >
                Recent Orders
              </h3>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                Your latest number purchases
              </p>
            </div>

            <button
              onClick={() => router.push("/orders")}
              style={{
                border: "none",
                background: "transparent",
                color: "#60a5fa",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              View all
            </button>
          </div>

          {orders.length === 0 ? (
            <div
              style={{
                padding: "45px 20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "40px",
                }}
              >
                📭
              </div>

              <p
                style={{
                  margin: "12px 0 5px",
                  fontWeight: "700",
                }}
              >
                No orders yet
              </p>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                Your number purchases will appear here.
              </p>
            </div>
          ) : (
            <div>
              {orders.slice(0, 5).map((order) => {
                const status = getOrderStatus(order);

                return (
                  <div
                    key={order.id}
                    style={{
                      padding: "18px 22px",
                      borderBottom:
                        "1px solid #1e293b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "space-between",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: "700",
                        }}
                      >
                        {order.service ||
                          "Number"}
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#64748b",
                          fontSize: "13px",
                        }}
                      >
                        {order.country ||
                          "Unknown country"}
                        {order.phone_number
                          ? ` • ${order.phone_number}`
                          : ""}
                      </p>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontWeight: "700",
                        }}
                      >
                        {formatMoney(
                          Number(
                            order.amount || 0
                          )
                        )}
                      </p>

                      <span
                        style={{
                          display: "inline-block",
                          marginTop: "5px",
                          padding:
                            "4px 9px",
                          borderRadius: "999px",
                          background:
                            "#1e293b",
                          color:
                            "#cbd5e1",
                          fontSize: "11px",
                        }}
                      >
                        {formatStatus(status)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}