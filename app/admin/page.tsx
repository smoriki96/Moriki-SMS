"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAIL = "namoriki30@gmail.com";

type Order = {
  id: string;
  user_id: string;
  country: string;
  service: string;
  amount: number;
  payment_reference: string | null;
  payment_status: string | null;
  order_status: string | null;
  status: string | null;
  created_at: string;
  payment: string | null;
  phone_id: string | null;
  phone_number: string | null;
  verification_code: string | null;
  fivesim_order_id: number | null;
  provider_cost: number | null;
};

type Wallet = {
  user_id: string;
  balance: number;
};

type Transaction = {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string | null;
  reference: string | null;
  description: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  email: string;
  name: string;
};

function formatNGN(value: number) {
  return `NGN ${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProviderCost, setTotalProviderCost] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalWalletFunds, setTotalWalletFunds] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);
  const [refundedOrders, setRefundedOrders] = useState(0);

  const [errorMessage, setErrorMessage] = useState("");

  // Notification form
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "info" | "warning" | "success" | "security"
  >("warning");

  const [notificationRecipient, setNotificationRecipient] =
    useState("all");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationResult, setNotificationResult] = useState("");

  async function loadDashboard(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      if (
        !user.email ||
        user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
      ) {
        router.replace("/login");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Could not load admin dashboard."
        );
      }

      setOrders(data.orders || []);
      setWallets(data.wallets || []);
      setTransactions(data.transactions || []);

      const stats = data.stats || {};

      setTotalRevenue(Number(stats.totalRevenue || 0));
      setTotalProviderCost(Number(stats.totalProviderCost || 0));
      setTotalProfit(Number(stats.totalProfit || 0));
      setTotalWalletFunds(Number(stats.totalWalletFunds || 0));
      setTotalOrders(Number(stats.totalOrders || 0));
      setActiveOrders(Number(stats.activeOrders || 0));
      setRefundedOrders(Number(stats.refundedOrders || 0));
    } catch (error) {
      console.error("ADMIN DASHBOARD ERROR:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadCustomers() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      const response = await fetch("/api/admin/customers", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();

      const list = Array.isArray(data.customers)
        ? data.customers
        : [];

      setCustomers(
        list.map((customer: any) => ({
          id: customer.id,
          email: customer.email || "",
          name:
            customer.name ||
            customer.user_metadata?.full_name ||
            customer.user_metadata?.name ||
            customer.email ||
            "Customer",
        }))
      );
    } catch (error) {
      console.error("CUSTOMERS LOAD ERROR:", error);
    }
  }

  async function sendNotification() {
    setNotificationResult("");

    if (!notificationTitle.trim()) {
      setNotificationResult("Please enter a notification title.");
      return;
    }

    if (!notificationMessage.trim()) {
      setNotificationResult("Please enter a notification message.");
      return;
    }

    if (
      notificationRecipient === "customer" &&
      !selectedCustomer
    ) {
      setNotificationResult("Please select a customer.");
      return;
    }

    try {
      setSendingNotification(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setNotificationResult("Your admin session has expired.");
        return;
      }

      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: notificationTitle.trim(),
          message: notificationMessage.trim(),
          type: notificationType,
          user_id:
            notificationRecipient === "all"
              ? null
              : selectedCustomer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Could not send notification."
        );
      }

      setNotificationResult(
        notificationRecipient === "all"
          ? "Notification sent to all customers."
          : "Notification sent successfully."
      );

      setNotificationTitle("");
      setNotificationMessage("");
      setSelectedCustomer("");
    } catch (error) {
      console.error("SEND NOTIFICATION ERROR:", error);

      setNotificationResult(
        error instanceof Error
          ? error.message
          : "Could not send notification."
      );
    } finally {
      setSendingNotification(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  useEffect(() => {
    loadDashboard();
    loadCustomers();
  }, []);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 18 }}>Loading admin dashboard...</div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
      }}
    >
      <header
        style={{
          background: "#111827",
          color: "white",
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 15,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 25 }}>
            Moriki SMS Admin
          </h1>

          <p
            style={{
              margin: "5px 0 0",
              opacity: 0.75,
              fontSize: 13,
            }}
          >
            Administration Dashboard
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            style={{
              padding: "10px 15px",
              borderRadius: 8,
              border: "1px solid #4b5563",
              background: "#1f2937",
              color: "white",
              cursor: refreshing ? "not-allowed" : "pointer",
            }}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={logout}
            style={{
              padding: "10px 15px",
              borderRadius: 8,
              border: "none",
              background: "#dc2626",
              color: "white",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: 24,
        }}
      >
        {errorMessage && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: 14,
              borderRadius: 10,
              marginBottom: 20,
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* STATS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(190px,1fr))",
            gap: 15,
            marginBottom: 25,
          }}
        >
          <StatCard
            title="Total Revenue"
            value={formatNGN(totalRevenue)}
          />

          <StatCard
            title="5SIM Cost"
            value={formatNGN(totalProviderCost)}
          />

          <StatCard
            title="Total Profit"
            value={formatNGN(totalProfit)}
          />

          <StatCard
            title="Wallet Funds"
            value={formatNGN(totalWalletFunds)}
          />

          <StatCard
            title="Total Orders"
            value={String(totalOrders)}
          />

          <StatCard
            title="Active Orders"
            value={String(activeOrders)}
          />

          <StatCard
            title="Refunded / Cancelled"
            value={String(refundedOrders)}
          />
        </section>

        {/* NAVIGATION */}
        <section
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 25,
          }}
        >
          <button
            onClick={() => router.push("/admin/customers")}
            style={navButton}
          >
            Customers
          </button>

          <button
            onClick={() => router.push("/admin/support")}
            style={navButton}
          >
            Support
          </button>
        </section>

        {/* CREATE NOTIFICATION */}
        <section style={cardStyle}>
          <h2 style={sectionTitle}>
            ?? Create Customer Notification
          </h2>

          <p
            style={{
              color: "#6b7280",
              fontSize: 14,
              marginTop: 0,
            }}
          >
            Send a one-time notification directly to customers.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap: 15,
            }}
          >
            <div>
              <label style={labelStyle}>Title</label>

              <input
                value={notificationTitle}
                onChange={(e) =>
                  setNotificationTitle(e.target.value)
                }
                placeholder="Important security warning"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Type</label>

              <select
                value={notificationType}
                onChange={(e) =>
                  setNotificationType(
                    e.target.value as
                      | "info"
                      | "warning"
                      | "success"
                      | "security"
                  )
                }
                style={inputStyle}
              >
                <option value="info">Information</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="security">Security</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Send To</label>

              <select
                value={notificationRecipient}
                onChange={(e) =>
                  setNotificationRecipient(e.target.value)
                }
                style={inputStyle}
              >
                <option value="all">All Customers</option>
                <option value="customer">
                  Specific Customer
                </option>
              </select>
            </div>

            {notificationRecipient === "customer" && (
              <div>
                <label style={labelStyle}>Customer</label>

                <select
                  value={selectedCustomer}
                  onChange={(e) =>
                    setSelectedCustomer(e.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Select customer
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name} � {customer.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ marginTop: 15 }}>
            <label style={labelStyle}>Message</label>

            <textarea
              value={notificationMessage}
              onChange={(e) =>
                setNotificationMessage(e.target.value)
              }
              placeholder="Your message to the customer..."
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>

          <button
            onClick={sendNotification}
            disabled={sendingNotification}
            style={{
              marginTop: 15,
              padding: "12px 18px",
              border: "none",
              borderRadius: 8,
              background: "#2563eb",
              color: "white",
              fontWeight: 600,
              cursor: sendingNotification
                ? "not-allowed"
                : "pointer",
            }}
          >
            {sendingNotification
              ? "Sending..."
              : "Send Notification"}
          </button>

          {notificationResult && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 8,
                background: notificationResult
                  .toLowerCase()
                  .includes("successfully") ||
                notificationResult
                  .toLowerCase()
                  .includes("sent")
                  ? "#dcfce7"
                  : "#fee2e2",
                color: notificationResult
                  .toLowerCase()
                  .includes("successfully") ||
                notificationResult
                  .toLowerCase()
                  .includes("sent")
                  ? "#166534"
                  : "#991b1b",
              }}
            >
              {notificationResult}
            </div>
          )}
        </section>

        {/* LATEST ORDERS */}
        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitle}>
              Latest Orders
            </h2>

            <span style={countBadge}>
              {orders.length}
            </span>
          </div>

          {orders.length === 0 ? (
            <p style={emptyStyle}>No orders found.</p>
          ) : (
            <div style={tableWrapper}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Country</th>
                    <th style={thStyle}>Service</th>
                    <th style={thStyle}>Number</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Customer Price</th>
                    <th style={thStyle}>5SIM Cost</th>
                    <th style={thStyle}>Profit</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.slice(0, 20).map((order) => {
                    const providerCost = Number(
                      order.provider_cost || 0
                    );

                    const amount = Number(order.amount || 0);

                    const profit =
                      amount - providerCost;

                    return (
                      <tr key={order.id}>
                        <td style={tdStyle}>
                          {formatDate(order.created_at)}
                        </td>

                        <td style={tdStyle}>
                          {order.country}
                        </td>

                        <td style={tdStyle}>
                          {order.service}
                        </td>

                        <td style={tdStyle}>
                          {order.phone_number || "�"}
                        </td>

                        <td style={tdStyle}>
                          <StatusBadge
                            status={
                              order.status ||
                              order.order_status ||
                              "unknown"
                            }
                          />
                        </td>

                        <td style={tdStyle}>
                          {formatNGN(amount)}
                        </td>

                        <td style={tdStyle}>
                          {formatNGN(providerCost)}
                        </td>

                        <td style={tdStyle}>
                          {formatNGN(profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* LATEST TRANSACTIONS */}
        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitle}>
              Latest Transactions
            </h2>

            <span style={countBadge}>
              {transactions.length}
            </span>
          </div>

          {transactions.length === 0 ? (
            <p style={emptyStyle}>
              No transactions found.
            </p>
          ) : (
            <div style={tableWrapper}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Reference</th>
                    <th style={thStyle}>Description</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions
                    .slice(0, 30)
                    .map((transaction) => (
                      <tr key={transaction.id}>
                        <td style={tdStyle}>
                          {formatDate(
                            transaction.created_at
                          )}
                        </td>

                        <td style={tdStyle}>
                          {transaction.type}
                        </td>

                        <td style={tdStyle}>
                          {formatNGN(
                            Number(transaction.amount || 0)
                          )}
                        </td>

                        <td style={tdStyle}>
                          <StatusBadge
                            status={
                              transaction.status || "unknown"
                            }
                          />
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            maxWidth: 260,
                            wordBreak: "break-word",
                          }}
                        >
                          {transaction.reference || "�"}
                        </td>

                        <td style={tdStyle}>
                          {transaction.description || "�"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: 13,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  let background = "#e5e7eb";
  let color = "#374151";

  if (
    normalized === "completed" ||
    normalized === "success" ||
    normalized === "successful" ||
    normalized === "active"
  ) {
    background = "#dcfce7";
    color = "#166534";
  }

  if (
    normalized === "pending" ||
    normalized === "processing"
  ) {
    background = "#fef3c7";
    color = "#92400e";
  }

  if (
    normalized === "failed" ||
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "refunded"
  ) {
    background = "#fee2e2";
    color = "#991b1b";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: 999,
        background,
        color,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 12,
  padding: 20,
  marginBottom: 25,
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 15,
};

const countBadge: React.CSSProperties = {
  background: "#e5e7eb",
  color: "#374151",
  borderRadius: 999,
  padding: "4px 9px",
  fontSize: 12,
  fontWeight: 600,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  background: "white",
};

const navButton: React.CSSProperties = {
  padding: "11px 16px",
  border: "none",
  borderRadius: 8,
  background: "#1f2937",
  color: "white",
  cursor: "pointer",
};

const tableWrapper: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 850,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  borderBottom: "1px solid #e5e7eb",
  fontSize: 13,
  background: "#f9fafb",
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
};

const emptyStyle: React.CSSProperties = {
  color: "#6b7280",
  margin: 0,
};
