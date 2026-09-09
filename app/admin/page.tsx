"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAIL = "namoriki30@gmail.com";

type Order = {
  id?: string | number;
  user_id?: string;
  phone_number?: string;
  phone_id?: string | number;
  country?: string;
  service?: string;
  status?: string;
  amount?: number | string;
  provider_cost?: number | string;
  profit?: number | string;
  payment_reference?: string;
  fivesim_order_id?: string | number;
  verification_code?: string;
  created_at?: string;
};

type Wallet = {
  user_id?: string;
  balance?: number | string;
};

type Transaction = {
  id?: string | number;
  user_id?: string;
  type?: string;
  amount?: number | string;
  balance_before?: number | string;
  balance_after?: number | string;
  reference?: string;
  description?: string;
  created_at?: string;
};

type Customer = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

type DashboardData = {
  success?: boolean;
  orders?: Order[];
  wallets?: Wallet[];
  transactions?: Transaction[];
  stats?: {
    totalRevenue?: number;
    totalProviderCost?: number;
    totalProfit?: number;
    totalWalletFunds?: number;
    totalOrders?: number;
    activeOrders?: number;
    refundedOrders?: number;
  };
  error?: string;
};

function formatNGN(value: unknown) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "NGN 0";
  }

  return `NGN ${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-NG");
}

function getStatus(value: unknown) {
  if (!value) return "UNKNOWN";

  return String(value).replace(/_/g, " ").toUpperCase();
}

async function readJson(response: Response) {
  const text = await response.text();

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      `Server returned ${response.status} instead of JSON.`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Server returned an invalid JSON response."
    );
  }
}

export default function AdminDashboard() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProviderCost: 0,
    totalProfit: 0,
    totalWalletFunds: 0,
    totalOrders: 0,
    activeOrders: 0,
    refundedOrders: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [notificationTitle, setNotificationTitle] =
    useState("");

  const [notificationMessage, setNotificationMessage] =
    useState("");

  const [notificationType, setNotificationType] =
    useState<
      "info" | "warning" | "success" | "security"
    >("info");

  const [notificationRecipient, setNotificationRecipient] =
    useState<"all" | "customer">("all");

  const [selectedCustomer, setSelectedCustomer] =
    useState("");

  const [sendingNotification, setSendingNotification] =
    useState(false);

  const [notificationResult, setNotificationResult] =
    useState("");

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Your login session has expired.");
    }

    return session.access_token;
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      if (
        user.email.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
      ) {
        router.replace("/dashboard");
        return;
      }

      const token = await getAccessToken();

      const response = await fetch(
        "/api/admin/dashboard",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data: DashboardData =
        await readJson(response);

      if (!response.ok || data.success === false) {
        throw new Error(
          data.error ||
            "Unable to load admin dashboard."
        );
      }

      setOrders(
        Array.isArray(data.orders)
          ? data.orders
          : []
      );

      setWallets(
        Array.isArray(data.wallets)
          ? data.wallets
          : []
      );

      setStats({
        totalRevenue: Number(
          data.stats?.totalRevenue ?? 0
        ),
        totalProviderCost: Number(
          data.stats?.totalProviderCost ?? 0
        ),
        totalProfit: Number(
          data.stats?.totalProfit ?? 0
        ),
        totalWalletFunds: Number(
          data.stats?.totalWalletFunds ?? 0
        ),
        totalOrders: Number(
          data.stats?.totalOrders ??
            data.orders?.length ??
            0
        ),
        activeOrders: Number(
          data.stats?.activeOrders ?? 0
        ),
        refundedOrders: Number(
          data.stats?.refundedOrders ?? 0
        ),
      });

      // Load the latest transactions from the
      // dedicated protected transaction endpoint.
      const transactionResponse = await fetch(
        "/api/admin/transactions",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const transactionData =
        await readJson(transactionResponse);

      if (
        !transactionResponse.ok ||
        transactionData.success === false
      ) {
        throw new Error(
          transactionData.error ||
            "Unable to load latest transactions."
        );
      }

      setTransactions(
        Array.isArray(
          transactionData.transactions
        )
          ? transactionData.transactions
          : []
      );
    } catch (err) {
      console.error("ADMIN DASHBOARD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    try {
      const token = await getAccessToken();

      const response = await fetch(
        "/api/admin/customers",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      if (!response.ok || data.success === false) {
        throw new Error(
          data.error ||
            "Unable to load customers."
        );
      }

      setCustomers(
        Array.isArray(data.customers)
          ? data.customers
          : []
      );
    } catch (err) {
      console.error("CUSTOMERS ERROR:", err);
    }
  }

  async function sendNotification() {
    setNotificationResult("");

    const title = notificationTitle.trim();
    const message = notificationMessage.trim();

    if (!title) {
      setNotificationResult(
        "Please enter a notification title."
      );
      return;
    }

    if (!message) {
      setNotificationResult(
        "Please enter a notification message."
      );
      return;
    }

    if (
      notificationRecipient === "customer" &&
      !selectedCustomer
    ) {
      setNotificationResult(
        "Please select a customer."
      );
      return;
    }

    try {
      setSendingNotification(true);

      const token = await getAccessToken();

      const response = await fetch(
        "/api/admin/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            message,
            type: notificationType,
            user_id:
              notificationRecipient === "all"
                ? null
                : selectedCustomer,
          }),
        }
      );

      const data = await readJson(response);

      if (!response.ok || data.success === false) {
        throw new Error(
          data.error ||
            "Unable to send notification."
        );
      }

      setNotificationResult(
        "Notification sent successfully."
      );

      setNotificationTitle("");
      setNotificationMessage("");
      setSelectedCustomer("");
    } catch (err) {
      console.error(
        "NOTIFICATION ERROR:",
        err
      );

      setNotificationResult(
        err instanceof Error
          ? err.message
          : "Unable to send notification."
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

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        color: "#111827",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: 800,
              }}
            >
              Moriki SMS Admin
            </h1>

            <p
              style={{
                marginTop: "6px",
                color: "#6b7280",
              }}
            >
              Manage customers, orders,
              transactions and notifications.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={loadDashboard}
              style={buttonStyle}
            >
              Refresh
            </button>

            <button
              onClick={() => router.push("/admin/customers")}
              style={buttonStyle}
            >
              Customers
            </button>

            <button
              onClick={() => router.push("/admin/support")}
              style={buttonStyle}
            >
              Support
            </button>

            <button
              onClick={logout}
              style={{
                ...buttonStyle,
                background: "#111827",
                color: "#fff",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "14px 16px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* STATS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <StatCard
            title="Revenue"
            value={formatNGN(stats.totalRevenue)}
          />

          <StatCard
            title="Provider Cost"
            value={formatNGN(
              stats.totalProviderCost
            )}
          />

          <StatCard
            title="Profit"
            value={formatNGN(stats.totalProfit)}
          />

          <StatCard
            title="Wallet Funds"
            value={formatNGN(
              stats.totalWalletFunds
            )}
          />

          <StatCard
            title="Total Orders"
            value={String(stats.totalOrders)}
          />

          <StatCard
            title="Active Orders"
            value={String(stats.activeOrders)}
          />

          <StatCard
            title="Refunded Orders"
            value={String(stats.refundedOrders)}
          />
        </div>

        {/* NOTIFICATION */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "22px",
            marginBottom: "24px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "6px",
              fontSize: "21px",
            }}
          >
            Create Customer Notification
          </h2>

          <p
            style={{
              color: "#6b7280",
              marginTop: 0,
            }}
          >
            Send an announcement or security
            message to all customers or one
            customer.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <input
              value={notificationTitle}
              onChange={(e) =>
                setNotificationTitle(
                  e.target.value
                )
              }
              placeholder="Notification title"
              style={inputStyle}
            />

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
              <option value="info">Info</option>
              <option value="warning">
                Warning
              </option>
              <option value="success">
                Success
              </option>
              <option value="security">
                Security
              </option>
            </select>

            <select
              value={notificationRecipient}
              onChange={(e) => {
                setNotificationRecipient(
                  e.target.value as
                    | "all"
                    | "customer"
                );

                setSelectedCustomer("");
              }}
              style={inputStyle}
            >
              <option value="all">
                Send to all customers
              </option>

              <option value="customer">
                Send to one customer
              </option>
            </select>

            {notificationRecipient ===
              "customer" && (
              <select
                value={selectedCustomer}
                onChange={(e) =>
                  setSelectedCustomer(
                    e.target.value
                  )
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
                    {customer.email ||
                      customer.user_metadata
                        ?.full_name ||
                      customer.id}
                  </option>
                ))}
              </select>
            )}
          </div>

          <textarea
            value={notificationMessage}
            onChange={(e) =>
              setNotificationMessage(
                e.target.value
              )
            }
            placeholder="Write your notification message..."
            rows={5}
            style={{
              ...inputStyle,
              width: "100%",
              marginTop: "14px",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={sendNotification}
            disabled={sendingNotification}
            style={{
              marginTop: "14px",
              padding: "12px 20px",
              border: "none",
              borderRadius: "9px",
              background: "#111827",
              color: "#ffffff",
              fontWeight: 700,
              cursor: sendingNotification
                ? "not-allowed"
                : "pointer",
              opacity: sendingNotification
                ? 0.6
                : 1,
            }}
          >
            {sendingNotification
              ? "Sending..."
              : "Send Notification"}
          </button>

          {notificationResult && (
            <div
              style={{
                marginTop: "14px",
                padding: "12px",
                borderRadius: "8px",
                background:
                  notificationResult.includes(
                    "successfully"
                  )
                    ? "#dcfce7"
                    : "#fee2e2",
                color:
                  notificationResult.includes(
                    "successfully"
                  )
                    ? "#166534"
                    : "#991b1b",
              }}
            >
              {notificationResult}
            </div>
          )}
        </section>

        {/* ORDERS */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "22px",
            marginBottom: "24px",
            border: "1px solid #e5e7eb",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "21px",
              }}
            >
              Latest Orders
            </h2>

            <span
              style={{
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              {orders.length} loaded
            </span>
          </div>

          {loading ? (
            <p>Loading orders...</p>
          ) : orders.length === 0 ? (
            <p
              style={{
                color: "#6b7280",
              }}
            >
              No orders found.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "950px",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Country</th>
                  <th style={thStyle}>Service</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>
                    Provider Cost
                  </th>
                  <th style={thStyle}>Profit</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order, index) => {
                  const amount = Number(
                    order.amount ?? 0
                  );

                  const providerCost = Number(
                    order.provider_cost ?? 0
                  );

                  const profit =
                    order.profit !== undefined
                      ? Number(order.profit)
                      : amount -
                        providerCost;

                  return (
                    <tr
                      key={
                        order.id ??
                        `${order.created_at}-${index}`
                      }
                    >
                      <td style={tdStyle}>
                        {formatDate(
                          order.created_at
                        )}
                      </td>

                      <td style={tdStyle}>
                        {order.phone_number ||
                          "-"}
                      </td>

                      <td style={tdStyle}>
                        {order.country || "-"}
                      </td>

                      <td style={tdStyle}>
                        {order.service || "-"}
                      </td>

                      <td style={tdStyle}>
                        {formatNGN(amount)}
                      </td>

                      <td style={tdStyle}>
                        {formatNGN(
                          providerCost
                        )}
                      </td>

                      <td style={tdStyle}>
                        {formatNGN(profit)}
                      </td>

                      <td style={tdStyle}>
                        {getStatus(
                          order.status
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* TRANSACTIONS */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "22px",
            border: "1px solid #e5e7eb",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "21px",
              }}
            >
              Latest Transaction History
            </h2>

            <span
              style={{
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              {transactions.length} loaded
            </span>
          </div>

          {loading ? (
            <p>Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p
              style={{
                color: "#6b7280",
              }}
            >
              No transactions found.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "900px",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>
                    Balance Before
                  </th>
                  <th style={thStyle}>
                    Balance After
                  </th>
                  <th style={thStyle}>
                    Reference
                  </th>
                  <th style={thStyle}>
                    Description
                  </th>
                </tr>
              </thead>

              <tbody>
                {transactions.map(
                  (transaction, index) => (
                    <tr
                      key={
                        transaction.id ??
                        `${transaction.created_at}-${index}`
                      }
                    >
                      <td style={tdStyle}>
                        {formatDate(
                          transaction.created_at
                        )}
                      </td>

                      <td style={tdStyle}>
                        {getStatus(
                          transaction.type
                        )}
                      </td>

                      <td style={tdStyle}>
                        {formatNGN(
                          transaction.amount
                        )}
                      </td>

                      <td style={tdStyle}>
                        {formatNGN(
                          transaction.balance_before
                        )}
                      </td>

                      <td style={tdStyle}>
                        {formatNGN(
                          transaction.balance_after
                        )}
                      </td>

                      <td style={tdStyle}>
                        {transaction.reference ||
                          "-"}
                      </td>

                      <td style={tdStyle}>
                        {transaction.description ||
                          "-"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
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
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "18px",
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: "14px",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "22px",
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "10px 15px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  fontWeight: 700,
  cursor: "pointer",
};

const inputStyle = {
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  fontSize: "14px",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "13px",
  whiteSpace: "nowrap" as const,
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "14px",
  whiteSpace: "nowrap" as const,
};