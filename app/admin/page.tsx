"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAIL = "namoriki30@gmail.com";

type Order = {
  id: string;
  user_id: string;
  phone_number: string | null;
  country: string | null;
  service: string | null;
  status: string | null;
  amount: number | null;
  provider_cost: number | null;
  created_at: string;
};

type Wallet = {
  user_id: string;
  balance: number | null;
};

type Transaction = {
  id: string;
  user_id: string;
  amount: number | null;
  type: string | null;
  status: string | null;
  reference: string | null;
  description: string | null;
  created_at: string;
};

type ProfitData = {
  totalRevenue: number;
  totalProviderCost: number;
  totalProfit: number;
  availableProfit: number;
  ordersAnalyzed: number;
  validOrders: number;
  refundedOrders: number;
};

export default function AdminPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [profitData, setProfitData] = useState<ProfitData>({
    totalRevenue: 0,
    totalProviderCost: 0,
    totalProfit: 0,
    availableProfit: 0,
    ordersAnalyzed: 0,
    validOrders: 0,
    refundedOrders: 0,
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
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

      await loadDashboard();
    } catch (error) {
      console.error("ADMIN CHECK ERROR:", error);
      router.replace("/login");
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const [ordersResponse, walletsResponse, profitResponse] =
        await Promise.all([
          supabase
            .from("orders")
            .select(
              "id,user_id,phone_number,country,service,status,amount,provider_cost,created_at"
            )
            .order("created_at", {
              ascending: false,
            })
            .limit(100),

          supabase
            .from("wallets")
            .select("user_id,balance"),

          fetch("/api/admin/profit", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          }),
        ]);

      const transactionsResponse = await fetch(
        "/api/admin/transactions",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      if (ordersResponse.error) {
        console.error("ORDERS ERROR:", ordersResponse.error);
        setMessage(
          `Orders error: ${ordersResponse.error.message}`
        );
      }

      if (walletsResponse.error) {
        console.error("WALLETS ERROR:", walletsResponse.error);
      }

      if (!transactionsResponse.ok) {
        const transactionError =
          await transactionsResponse.json().catch(() => null);

        console.error(
          "ADMIN TRANSACTIONS API ERROR:",
          transactionError
        );

        setMessage(
          transactionError?.error ||
            "Unable to load transaction history."
        );
      }

      if (!profitResponse.ok) {
        const profitError =
          await profitResponse.json().catch(() => null);

        console.error("PROFIT API ERROR:", profitError);

        setMessage(
          profitError?.error ||
            "Unable to load profit balance."
        );
      } else {
        const profit = await profitResponse.json();

        setProfitData({
          totalRevenue: Number(profit.totalRevenue || 0),
          totalProviderCost: Number(
            profit.totalProviderCost || 0
          ),
          totalProfit: Number(profit.totalProfit || 0),
          availableProfit: Number(
            profit.availableProfit || 0
          ),
          ordersAnalyzed: Number(
            profit.ordersAnalyzed || 0
          ),
          validOrders: Number(profit.validOrders || 0),
          refundedOrders: Number(
            profit.refundedOrders || 0
          ),
        });
      }

      let loadedTransactions: Transaction[] = [];

      if (transactionsResponse.ok) {
        const transactionResult =
          await transactionsResponse.json();

        loadedTransactions = Array.isArray(
          transactionResult?.transactions
        )
          ? transactionResult.transactions
          : [];
      }

      setOrders(
        (ordersResponse.data || []) as Order[]
      );

      setWallets(
        (walletsResponse.data || []) as Wallet[]
      );

      setTransactions(loadedTransactions);
    } catch (error) {
      console.error("DASHBOARD LOAD ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const totalRevenue = profitData.totalRevenue;
  const totalProviderCost = profitData.totalProviderCost;
  const totalProfit = profitData.totalProfit;
  const availableProfit = profitData.availableProfit;

  const totalWalletBalance = useMemo(() => {
    return wallets.reduce(
      (total, wallet) =>
        total + Number(wallet.balance || 0),
      0
    );
  }, [wallets]);

  const activeOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = String(
        order.status || ""
      ).toLowerCase();

      return (
        status === "pending" ||
        status === "active" ||
        status === "received"
      );
    });
  }, [orders]);

  function formatNGN(value: number) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "NGN 0";
    }

    return `NGN ${numericValue.toLocaleString("en-NG")}`;
  }

  function formatDate(value: string) {
    try {
      return new Date(value).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return value;
    }
  }

  function getOrderPhone(order: Order) {
    return order.phone_number || "N/A";
  }

  function getOrderProfit(order: Order) {
    return (
      Number(order.amount || 0) -
      Number(order.provider_cost || 0)
    );
  }

  function goToCustomers() {
    router.push("/admin/customers");
  }

  function goToSupport() {
    router.push("/admin/support");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        color: "#111827",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <header
        style={{
          background: "#111827",
          color: "#ffffff",
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            Moriki SMS
          </h1>

          <p
            style={{
              margin: "5px 0 0",
              color: "#cbd5e1",
              fontSize: "13px",
            }}
          >
            Administrator Dashboard
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            border: "1px solid #475569",
            background: "#1e293b",
            color: "#ffffff",
            padding: "10px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Logout
        </button>
      </header>

      <div
        style={{
          display: "flex",
          minHeight: "calc(100vh - 82px)",
          flexWrap: "wrap",
        }}
      >
        <aside
          style={{
            width: "250px",
            background: "#ffffff",
            borderRight: "1px solid #e5e7eb",
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: "8px",
            }}
          >
            <button
              onClick={() => setActiveSection("overview")}
              style={navButtonStyle(
                activeSection === "overview"
              )}
            >
              Overview
            </button>

            <button
              onClick={() => setActiveSection("orders")}
              style={navButtonStyle(
                activeSection === "orders"
              )}
            >
              Orders
            </button>

            <button
              onClick={() =>
                setActiveSection("transactions")
              }
              style={navButtonStyle(
                activeSection === "transactions"
              )}
            >
              Transactions
            </button>

            <div
              style={{
                height: "1px",
                background: "#e5e7eb",
                margin: "10px 0",
              }}
            />

            <button
              onClick={goToCustomers}
              style={navButtonStyle(false)}
            >
              Customers
            </button>

            <button
              onClick={goToSupport}
              style={navButtonStyle(false)}
            >
              Customer Support
            </button>
          </div>

          <div
            style={{
              marginTop: "30px",
              padding: "14px",
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "6px",
              }}
            >
              Customer Wallet Funds
            </div>

            <div
              style={{
                fontSize: "18px",
                fontWeight: 800,
              }}
            >
              {formatNGN(totalWalletBalance)}
            </div>
          </div>
        </aside>

        <section
          style={{
            flex: 1,
            padding: "24px",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "25px",
                }}
              >
                {activeSection === "overview"
                  ? "Overview"
                  : activeSection === "orders"
                  ? "Orders"
                  : "Transactions"}
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                Monitor your Moriki SMS business.
              </p>
            </div>

            <button
              onClick={loadDashboard}
              disabled={loading}
              style={{
                border: "1px solid #d1d5db",
                background: "#ffffff",
                padding: "10px 15px",
                borderRadius: "8px",
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 700,
              }}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {message && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "13px",
                borderRadius: "9px",
                marginBottom: "20px",
              }}
            >
              {message}
            </div>
          )}

          {loading ? (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "30px",
                textAlign: "center",
              }}
            >
              Loading dashboard...
            </div>
          ) : (
            <>
              {activeSection === "overview" && (
                <>
                  <div
                    style={{
                      background: "#111827",
                      color: "#ffffff",
                      borderRadius: "16px",
                      padding: "22px",
                      marginBottom: "20px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#cbd5e1",
                        marginBottom: "6px",
                      }}
                    >
                      Admin Profit Balance
                    </div>

                    <div
                      style={{
                        fontSize: "34px",
                        fontWeight: 900,
                        marginBottom: "5px",
                      }}
                    >
                      {formatNGN(availableProfit)}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                      }}
                    >
                      Available profit from valid number sales
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(210px, 1fr))",
                      gap: "16px",
                      marginBottom: "24px",
                    }}
                  >
                    <ProfitCard
                      title="Total Revenue"
                      value={formatNGN(totalRevenue)}
                      description="All valid customer sales"
                    />

                    <ProfitCard
                      title="Total 5SIM Cost"
                      value={formatNGN(
                        totalProviderCost
                      )}
                      description="All recorded 5SIM costs"
                    />

                    <ProfitCard
                      title="Your Profit"
                      value={formatNGN(totalProfit)}
                      description="Revenue minus 5SIM cost"
                    />

                    <ProfitCard
                      title="Available Profit"
                      value={formatNGN(
                        availableProfit
                      )}
                      description="After refunds and cancellations"
                    />
                  </div>

                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "15px 18px",
                      marginBottom: "24px",
                      display: "flex",
                      gap: "25px",
                      flexWrap: "wrap",
                      color: "#64748b",
                      fontSize: "13px",
                    }}
                  >
                    <span>
                      Orders analyzed:{" "}
                      <strong style={{ color: "#111827" }}>
                        {profitData.ordersAnalyzed.toLocaleString()}
                      </strong>
                    </span>

                    <span>
                      Valid orders:{" "}
                      <strong style={{ color: "#111827" }}>
                        {profitData.validOrders.toLocaleString()}
                      </strong>
                    </span>

                    <span>
                      Refunded/cancelled:{" "}
                      <strong style={{ color: "#111827" }}>
                        {profitData.refundedOrders.toLocaleString()}
                      </strong>
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: "16px",
                      marginBottom: "24px",
                    }}
                  >
                    <StatCard
                      title="Total Orders"
                      value={String(orders.length)}
                      description="Recent orders shown"
                    />

                    <StatCard
                      title="Active Orders"
                      value={String(
                        activeOrders.length
                      )}
                      description="Pending or active"
                    />

                    <StatCard
                      title="Wallet Funds"
                      value={formatNGN(
                        totalWalletBalance
                      )}
                      description="Customer balances"
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "16px",
                      marginBottom: "24px",
                    }}
                  >
                    <QuickAction
                      title="Customers"
                      description="View and manage customer accounts"
                      onClick={goToCustomers}
                    />

                    <QuickAction
                      title="Customer Support"
                      description="View and reply to customer complaints"
                      onClick={goToSupport}
                    />
                  </div>

                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "20px",
                      marginBottom: "24px",
                    }}
                  >
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: "16px",
                      }}
                    >
                      Profit Summary
                    </h3>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "15px",
                      }}
                    >
                      <SummaryBox
                        label="Customer Spending"
                        value={formatNGN(
                          totalRevenue
                        )}
                      />

                      <SummaryBox
                        label="5SIM Provider Cost"
                        value={formatNGN(
                          totalProviderCost
                        )}
                      />

                      <SummaryBox
                        label="Your Profit"
                        value={formatNGN(totalProfit)}
                      />

                      <SummaryBox
                        label="Available Profit"
                        value={formatNGN(
                          availableProfit
                        )}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "18px 20px",
                        borderBottom:
                          "1px solid #e5e7eb",
                      }}
                    >
                      <h3 style={{ margin: 0 }}>
                        Recent Orders
                      </h3>
                    </div>

                    <OrderTable
                      orders={orders.slice(0, 10)}
                      formatNGN={formatNGN}
                      formatDate={formatDate}
                      getOrderPhone={getOrderPhone}
                      getOrderProfit={
                        getOrderProfit
                      }
                    />
                  </div>
                </>
              )}

              {activeSection === "orders" && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "18px 20px",
                      borderBottom:
                        "1px solid #e5e7eb",
                    }}
                  >
                    <h3 style={{ margin: 0 }}>
                      All Orders
                    </h3>
                  </div>

                  <OrderTable
                    orders={orders}
                    formatNGN={formatNGN}
                    formatDate={formatDate}
                    getOrderPhone={getOrderPhone}
                    getOrderProfit={
                      getOrderProfit
                    }
                  />
                </div>
              )}

              {activeSection === "transactions" && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "18px 20px",
                      borderBottom:
                        "1px solid #e5e7eb",
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>
                        Wallet Transactions
                      </h3>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#64748b",
                          fontSize: "12px",
                        }}
                      >
                        Latest transactions from all customers
                      </p>
                    </div>

                    <span
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        fontWeight: 700,
                      }}
                    >
                      {transactions.length.toLocaleString()} shown
                    </span>
                  </div>

                  <div
                    style={{
                      overflowX: "auto",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse:
                          "collapse",
                        minWidth: "850px",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background:
                              "#f8fafc",
                          }}
                        >
                          <th style={thStyle}>
                            Date
                          </th>

                          <th style={thStyle}>
                            Customer
                          </th>

                          <th style={thStyle}>
                            Type
                          </th>

                          <th style={thStyle}>
                            Amount
                          </th>

                          <th style={thStyle}>
                            Status
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
                        {transactions.length ===
                        0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                padding:
                                  "30px",
                                textAlign:
                                  "center",
                                color:
                                  "#64748b",
                              }}
                            >
                              No transactions found.
                            </td>
                          </tr>
                        ) : (
                          transactions.map(
                            (transaction) => (
                              <tr
                                key={
                                  transaction.id
                                }
                              >
                                <td style={tdStyle}>
                                  {formatDate(
                                    transaction.created_at
                                  )}
                                </td>

                                <td
                                  style={{
                                    ...tdStyle,
                                    fontSize:
                                      "11px",
                                    color:
                                      "#64748b",
                                  }}
                                >
                                  {transaction.user_id}
                                </td>

                                <td style={tdStyle}>
                                  {transaction.type ||
                                    "N/A"}
                                </td>

                                <td
                                  style={{
                                    ...tdStyle,
                                    fontWeight:
                                      800,
                                  }}
                                >
                                  {formatNGN(
                                    Number(
                                      transaction.amount ||
                                        0
                                    )
                                  )}
                                </td>

                                <td style={tdStyle}>
                                  {transaction.status ||
                                    "N/A"}
                                </td>

                                <td
                                  style={{
                                    ...tdStyle,
                                    fontSize:
                                      "11px",
                                  }}
                                >
                                  {transaction.reference ||
                                    "N/A"}
                                </td>

                                <td style={tdStyle}>
                                  {transaction.description ||
                                    "N/A"}
                                </td>
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function navButtonStyle(
  active: boolean
): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    cursor: "pointer",
    background: active ? "#111827" : "#f3f4f6",
    color: active ? "#ffffff" : "#111827",
    fontWeight: 700,
  };
}

function QuickAction({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        borderRadius: "12px",
        padding: "20px",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          fontSize: "18px",
          fontWeight: 800,
          marginBottom: "7px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#64748b",
          fontSize: "13px",
        }}
      >
        {description}
      </div>
    </button>
  );
}

function ProfitCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "13px",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "25px",
          fontWeight: 900,
          marginBottom: "6px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: "#94a3b8",
          fontSize: "12px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "18px",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "13px",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "24px",
          fontWeight: 800,
          marginBottom: "5px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: "#94a3b8",
          fontSize: "12px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "16px",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "12px",
          marginBottom: "7px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "20px",
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function OrderTable({
  orders,
  formatNGN,
  formatDate,
  getOrderPhone,
  getOrderProfit,
}: {
  orders: Order[];
  formatNGN: (value: number) => string;
  formatDate: (value: string) => string;
  getOrderPhone: (order: Order) => string;
  getOrderProfit: (order: Order) => number;
}) {
  return (
    <div
      style={{
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "1050px",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#f8fafc",
            }}
          >
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
          {orders.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                style={{
                  padding: "30px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                No orders found.
              </td>
            </tr>
          ) : (
            orders.map((order) => {
              const amount = Number(
                order.amount || 0
              );

              const providerCost = Number(
                order.provider_cost || 0
              );

              const profit =
                getOrderProfit(order);

              return (
                <tr key={order.id}>
                  <td style={tdStyle}>
                    {formatDate(
                      order.created_at
                    )}
                  </td>

                  <td style={tdStyle}>
                    {order.country || "N/A"}
                  </td>

                  <td style={tdStyle}>
                    {order.service || "N/A"}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 700,
                    }}
                  >
                    {getOrderPhone(order)}
                  </td>

                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "5px 9px",
                        borderRadius: "999px",
                        background: "#f1f5f9",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {order.status || "N/A"}
                    </span>
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 800,
                    }}
                  >
                    {formatNGN(amount)}
                  </td>

                  <td style={tdStyle}>
                    {formatNGN(providerCost)}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 800,
                    }}
                  >
                    {formatNGN(profit)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "13px 14px",
  textAlign: "left",
  fontSize: "12px",
  color: "#64748b",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "14px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "13px",
  whiteSpace: "nowrap",
};
