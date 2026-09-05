"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAIL = "namoriki30@gmail.com";

type Order = {
  id: string;
  user_id?: string | null;
  phone_number?: string | null;
  number?: string | null;
  country?: string | null;
  operator?: string | null;
  service?: string | null;
  status?: string | null;
  price?: number | null;
  cost?: number | null;
  profit?: number | null;
  created_at?: string | null;
};

type Wallet = {
  id: string;
  user_id: string;
  balance?: number | null;
  created_at?: string | null;
};

type Transaction = {
  id: string;
  user_id?: string | null;
  amount?: number | null;
  type?: string | null;
  status?: string | null;
  description?: string | null;
  created_at?: string | null;
};

type Customer = {
  user_id: string;
  balance: number;
  orders: number;
  spent: number;
};

export default function AdminPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transactionWarning, setTransactionWarning] = useState("");

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalBalance: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalCustomers: 0,
  });

  useEffect(() => {
    loadAdminDashboard();
  }, []);

  async function loadAdminDashboard() {
    try {
      setLoading(true);
      setError("");
      setTransactionWarning("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      /*
       * =========================================================
       * ADMIN AUTHENTICATION
       * =========================================================
       */

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

      /*
       * =========================================================
       * LOAD ORDERS
       * =========================================================
       */

      const {
        data: orderData,
        error: orderError,
      } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      if (orderError) {
        console.error("ORDERS ERROR:", orderError);

        throw new Error(
          "Unable to load orders. Check your orders table permissions."
        );
      }

      /*
       * =========================================================
       * LOAD WALLETS
       * =========================================================
       */

      const {
        data: walletData,
        error: walletError,
      } = await supabase
        .from("wallets")
        .select("id, user_id, balance, created_at")
        .limit(1000);

      if (walletError) {
        console.error("WALLETS ERROR:", walletError);

        throw new Error(
          "Unable to load wallets. Check your wallets table permissions."
        );
      }

      /*
       * =========================================================
       * LOAD TRANSACTIONS
       * =========================================================
       */

      const {
        data: transactionData,
        error: transactionError,
      } = await supabase
        .from("wallet_transactions")
        .select(
          "id, user_id, amount, type, status, description, created_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      if (transactionError) {
        console.warn(
          "TRANSACTIONS COULD NOT BE LOADED:",
          transactionError
        );

        setTransactionWarning(
          "Wallet transactions are currently unavailable because of Supabase table permissions. Orders and customer information are still working."
        );

        setTransactions([]);
      } else {
        setTransactions(
          (transactionData || []) as Transaction[]
        );
      }

      const safeOrders = (orderData || []) as Order[];
      const safeWallets = (walletData || []) as Wallet[];

      setOrders(safeOrders);
      setWallets(safeWallets);

      /*
       * =========================================================
       * CALCULATE STATISTICS
       * =========================================================
       */

      const totalBalance = safeWallets.reduce(
        (total, wallet) =>
          total + Number(wallet.balance || 0),
        0
      );

      const totalRevenue = safeOrders.reduce(
        (total, order) =>
          total + Number(order.price || 0),
        0
      );

      const totalProfit = safeOrders.reduce(
        (total, order) =>
          total + Number(order.profit || 0),
        0
      );

      /*
       * =========================================================
       * BUILD CUSTOMER LIST
       * =========================================================
       */

      const customerMap = new Map<string, Customer>();

      for (const wallet of safeWallets) {
        if (!wallet.user_id) {
          continue;
        }

        customerMap.set(wallet.user_id, {
          user_id: wallet.user_id,
          balance: Number(wallet.balance || 0),
          orders: 0,
          spent: 0,
        });
      }

      for (const order of safeOrders) {
        if (!order.user_id) {
          continue;
        }

        const existing = customerMap.get(order.user_id);

        if (existing) {
          existing.orders += 1;

          existing.spent += Number(
            order.price || 0
          );
        } else {
          customerMap.set(order.user_id, {
            user_id: order.user_id,
            balance: 0,
            orders: 1,
            spent: Number(order.price || 0),
          });
        }
      }

      const customerList = Array.from(
        customerMap.values()
      ).sort((a, b) => b.spent - a.spent);

      setCustomers(customerList);

      setStats({
        totalOrders: safeOrders.length,
        totalBalance,
        totalRevenue,
        totalProfit,
        totalCustomers: customerList.length,
      });
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

  function formatMoney(amount: number) {
    return `₦${amount.toLocaleString("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(date?: string | null) {
    if (!date) {
      return "Unknown date";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Unknown date";
    }

    return parsed.toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function getPhoneNumber(order: Order) {
    return (
      order.phone_number ||
      order.number ||
      "Unavailable"
    );
  }

  function getStatusClass(status?: string | null) {
    const value = status?.toLowerCase() || "pending";

    if (
      value === "completed" ||
      value === "active" ||
      value === "success" ||
      value === "successful"
    ) {
      return "status success";
    }

    if (
      value === "cancelled" ||
      value === "canceled" ||
      value === "failed"
    ) {
      return "status danger";
    }

    return "status pending";
  }

  function isCredit(transaction: Transaction) {
    const type = transaction.type?.toLowerCase();

    return (
      type === "deposit" ||
      type === "fund" ||
      type === "funding" ||
      type === "credit" ||
      type === "refund"
    );
  }

  function shortUserId(userId: string) {
    if (userId.length <= 18) {
      return userId;
    }

    return `${userId.slice(0, 8)}...${userId.slice(-6)}`;
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
            linear-gradient(
              135deg,
              #020617,
              #0f172a,
              #020617
            );
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 30;
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: rgba(2,6,23,.95);
          backdrop-filter: blur(14px);
        }

        .header-inner {
          max-width: 1200px;
          margin: auto;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .logo {
          color: white;
          text-decoration: none;
          font-size: 25px;
          font-weight: 900;
        }

        .logo span {
          color: #2196f3;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .back {
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
          padding: 10px 12px;
          border-radius: 9px;
          transition: .2s ease;
        }

        .back:hover {
          color: white;
          background: rgba(255,255,255,.06);
        }

        .customers-button,
        .support-button {
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
          padding: 10px 15px;
          border-radius: 9px;
          transition: .2s ease;
        }

        .customers-button {
          background: rgba(33,150,243,.15);
          border: 1px solid rgba(33,150,243,.35);
        }

        .customers-button:hover {
          background: #2196f3;
          border-color: #2196f3;
        }

        .support-button {
          background: rgba(168,85,247,.15);
          border: 1px solid rgba(168,85,247,.35);
        }

        .support-button:hover {
          background: #9333ea;
          border-color: #9333ea;
        }

        .refresh {
          border: 0;
          cursor: pointer;
          padding: 10px 15px;
          border-radius: 9px;
          background: #2196f3;
          color: white;
          font-weight: 900;
        }

        .refresh:hover {
          background: #1976d2;
        }

        .refresh:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .container {
          width: 100%;
          max-width: 1200px;
          margin: auto;
          padding: 45px 20px 80px;
        }

        .hero {
          margin-bottom: 30px;
        }

        .eyebrow {
          color: #2196f3;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .hero h1 {
          margin: 8px 0;
          font-size: 42px;
        }

        .hero p {
          margin: 0;
          color: #94a3b8;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }

        .stat {
          padding: 22px;
          border-radius: 17px;
          background: rgba(15,23,42,.95);
          border: 1px solid rgba(255,255,255,.08);
        }

        .stat-label {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 10px;
        }

        .stat-value {
          font-size: 23px;
          font-weight: 900;
          word-break: break-word;
        }

        .blue {
          color: #60a5fa;
        }

        .green {
          color: #4ade80;
        }

        .purple {
          color: #c084fc;
        }

        .orange {
          color: #fb923c;
        }

        .red {
          color: #f87171;
        }

        .section {
          margin-top: 30px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .section-title {
          font-size: 21px;
          font-weight: 900;
        }

        .section-count {
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .table-wrap {
          overflow-x: auto;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(15,23,42,.95);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 850px;
        }

        th {
          padding: 15px;
          text-align: left;
          color: #64748b;
          font-size: 11px;
          letter-spacing: .7px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        td {
          padding: 16px 15px;
          color: #cbd5e1;
          font-size: 13px;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }

        tr:last-child td {
          border-bottom: none;
        }

        .number {
          color: white;
          font-weight: 900;
        }

        .muted {
          color: #64748b;
        }

        .price {
          color: #4ade80;
          font-weight: 900;
        }

        .profit {
          color: #60a5fa;
          font-weight: 900;
        }

        .status {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .status.success {
          background: rgba(34,197,94,.12);
          color: #4ade80;
        }

        .status.pending {
          background: rgba(234,179,8,.12);
          color: #facc15;
        }

        .status.danger {
          background: rgba(239,68,68,.12);
          color: #f87171;
        }

        .cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .card {
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(15,23,42,.95);
        }

        .card-header {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          font-size: 17px;
          font-weight: 900;
        }

        .card-item {
          padding: 17px 20px;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }

        .card-item:last-child {
          border-bottom: none;
        }

        .item-top {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .item-title {
          color: white;
          font-weight: 800;
          font-size: 14px;
        }

        .item-sub {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
          word-break: break-all;
        }

        .item-amount {
          text-align: right;
          font-weight: 900;
          white-space: nowrap;
        }

        .customer-card {
          overflow-x: auto;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(15,23,42,.95);
        }

        .customer-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 15px;
          align-items: center;
          padding: 17px 20px;
          border-bottom: 1px solid rgba(255,255,255,.05);
          min-width: 650px;
        }

        .customer-row:last-child {
          border-bottom: none;
        }

        .customer-header {
          color: #64748b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .7px;
        }

        .customer-user {
          color: white;
          font-size: 13px;
          font-weight: 800;
          word-break: break-all;
        }

        .customer-balance {
          color: #4ade80;
          font-weight: 900;
        }

        .customer-orders {
          color: #c084fc;
          font-weight: 900;
        }

        .customer-spent {
          color: #60a5fa;
          font-weight: 900;
        }

        .customer-link {
          color: inherit;
          text-decoration: none;
          cursor: pointer;
          transition:
            background .2s ease,
            transform .2s ease;
        }

        .customer-link:hover {
          background: rgba(33,150,243,.08);
        }

        .customer-link:active {
          background: rgba(33,150,243,.14);
        }

        .customer-open {
          margin-top: 5px;
          color: #2196f3;
          font-size: 11px;
          font-weight: 800;
        }

        .empty {
          padding: 35px 20px;
          text-align: center;
          color: #64748b;
        }

        .error {
          margin-bottom: 25px;
          padding: 17px;
          border-radius: 12px;
          background: rgba(127,29,29,.3);
          border: 1px solid rgba(248,113,113,.25);
          color: #fecaca;
        }

        .warning {
          margin-bottom: 25px;
          padding: 15px 17px;
          border-radius: 12px;
          background: rgba(120,53,15,.25);
          border: 1px solid rgba(251,191,36,.25);
          color: #fde68a;
          font-size: 13px;
        }

        .loading {
          padding: 80px 20px;
          text-align: center;
          color: #94a3b8;
        }

        .footer-note {
          margin-top: 35px;
          color: #475569;
          font-size: 12px;
          text-align: center;
        }

        @media (max-width: 1050px) {
          .stats {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 900px) {
          .cards {
            grid-template-columns: 1fr;
          }

          .customer-row {
            grid-template-columns: 2fr 1fr 1fr 1fr;
          }
        }

        @media (max-width: 700px) {
          .header-inner {
            padding: 15px;
          }

          .header-right {
            gap: 6px;
          }

          .back {
            display: none;
          }

          .customers-button,
          .support-button {
            padding: 9px 10px;
            font-size: 11px;
          }

          .refresh {
            padding: 9px 12px;
            font-size: 12px;
          }

          .container {
            padding: 30px 15px 60px;
          }

          .hero h1 {
            font-size: 34px;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .stat {
            padding: 18px;
          }

          .stat-value {
            font-size: 20px;
          }
        }

        @media (max-width: 430px) {
          .logo {
            font-size: 21px;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .customers-button,
          .support-button {
            padding: 9px 8px;
            font-size: 10px;
          }

          .refresh {
            padding: 9px 10px;
          }
        }
      `}</style>

      <header className="header">
        <div className="header-inner">
          <Link
            href="/"
            className="logo"
          >
            Moriki <span>SMS</span>
          </Link>

          <div className="header-right">
            <Link
              href="/dashboard"
              className="back"
            >
              ← Dashboard
            </Link>

            <Link
              href="/admin/customers"
              className="customers-button"
            >
              Customers
            </Link>

            <Link
              href="/admin/support"
              className="support-button"
            >
              Customer Support
            </Link>

            <button
              className="refresh"
              onClick={loadAdminDashboard}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="eyebrow">
            MORIKI SMS ADMIN
          </div>

          <h1>
            Admin Dashboard
          </h1>

          <p>
            Manage customers, orders,
            wallets and business activity.
          </p>
        </section>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {transactionWarning && (
          <div className="warning">
            {transactionWarning}
          </div>
        )}

        {loading ? (
          <div className="loading">
            Loading admin dashboard...
          </div>
        ) : (
          <>
            <section className="stats">
              <div className="stat">
                <div className="stat-label">
                  TOTAL CUSTOMERS
                </div>

                <div className="stat-value purple">
                  {stats.totalCustomers.toLocaleString()}
                </div>
              </div>

              <div className="stat">
                <div className="stat-label">
                  TOTAL ORDERS
                </div>

                <div className="stat-value purple">
                  {stats.totalOrders.toLocaleString()}
                </div>
              </div>

              <div className="stat">
                <div className="stat-label">
                  USER WALLET BALANCE
                </div>

                <div className="stat-value green">
                  {formatMoney(
                    stats.totalBalance
                  )}
                </div>
              </div>

              <div className="stat">
                <div className="stat-label">
                  TOTAL REVENUE
                </div>

                <div className="stat-value orange">
                  {formatMoney(
                    stats.totalRevenue
                  )}
                </div>
              </div>

              <div className="stat">
                <div className="stat-label">
                  TOTAL PROFIT
                </div>

                <div className="stat-value blue">
                  {formatMoney(
                    stats.totalProfit
                  )}
                </div>
              </div>
            </section>

            <section className="section">
              <div className="section-header">
                <div className="section-title">
                  Customer Management
                </div>

                <div className="section-count">
                  {customers.length} customers
                </div>
              </div>

              <div className="customer-card">
                {customers.length === 0 ? (
                  <div className="empty">
                    No customers found.
                  </div>
                ) : (
                  <>
                    <div className="customer-row">
                      <div className="customer-header">
                        CUSTOMER
                      </div>

                      <div className="customer-header">
                        BALANCE
                      </div>

                      <div className="customer-header">
                        ORDERS
                      </div>

                      <div className="customer-header">
                        TOTAL SPENT
                      </div>
                    </div>

                    {customers
                      .slice(0, 50)
                      .map((customer) => (
                        <Link
                          href={`/admin/customers/${encodeURIComponent(
                            customer.user_id
                          )}`}
                          className="customer-row customer-link"
                          key={customer.user_id}
                        >
                          <div>
                            <div className="customer-user">
                              {shortUserId(
                                customer.user_id
                              )}
                            </div>

                            <div className="customer-open">
                              View customer →
                            </div>
                          </div>

                          <div className="customer-balance">
                            {formatMoney(
                              customer.balance
                            )}
                          </div>

                          <div className="customer-orders">
                            {customer.orders}
                          </div>

                          <div className="customer-spent">
                            {formatMoney(
                              customer.spent
                            )}
                          </div>
                        </Link>
                      ))}
                  </>
                )}
              </div>
            </section>

            <section className="section">
              <div className="section-header">
                <div className="section-title">
                  Recent Orders
                </div>

                <div className="section-count">
                  {orders.length} loaded
                </div>
              </div>

              <div className="table-wrap">
                {orders.length === 0 ? (
                  <div className="empty">
                    No orders found.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>NUMBER</th>
                        <th>COUNTRY</th>
                        <th>SERVICE</th>
                        <th>STATUS</th>
                        <th>PRICE</th>
                        <th>PROFIT</th>
                        <th>DATE</th>
                      </tr>
                    </thead>

                    <tbody>
                      {orders
                        .slice(0, 20)
                        .map((order) => (
                          <tr key={order.id}>
                            <td>
                              <div className="number">
                                {getPhoneNumber(
                                  order
                                )}
                              </div>
                            </td>

                            <td>
                              {order.country ||
                                "Unknown"}
                            </td>

                            <td>
                              {order.service ||
                                "Unknown"}
                            </td>

                            <td>
                              <span
                                className={getStatusClass(
                                  order.status
                                )}
                              >
                                {order.status ||
                                  "pending"}
                              </span>
                            </td>

                            <td>
                              <span className="price">
                                {formatMoney(
                                  Number(
                                    order.price ||
                                      0
                                  )
                                )}
                              </span>
                            </td>

                            <td>
                              <span className="profit">
                                {formatMoney(
                                  Number(
                                    order.profit ||
                                      0
                                  )
                                )}
                              </span>
                            </td>

                            <td className="muted">
                              {formatDate(
                                order.created_at
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="section">
              <div className="cards">
                <div className="card">
                  <div className="card-header">
                    Recent Wallet Activity
                  </div>

                  {transactions.length === 0 ? (
                    <div className="empty">
                      Wallet transaction
                      information is not
                      currently available.
                    </div>
                  ) : (
                    transactions
                      .slice(0, 8)
                      .map((transaction) => {
                        const amount =
                          Number(
                            transaction.amount ||
                              0
                          );

                        const credit =
                          isCredit(
                            transaction
                          );

                        return (
                          <div
                            className="card-item"
                            key={
                              transaction.id
                            }
                          >
                            <div className="item-top">
                              <div>
                                <div className="item-title">
                                  {transaction.description ||
                                    transaction.type ||
                                    "Wallet transaction"}
                                </div>

                                <div className="item-sub">
                                  {formatDate(
                                    transaction.created_at
                                  )}
                                </div>
                              </div>

                              <div
                                className={`item-amount ${
                                  credit
                                    ? "green"
                                    : "red"
                                }`}
                              >
                                {credit
                                  ? "+"
                                  : "-"}
                                {formatMoney(
                                  Math.abs(
                                    amount
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    User Wallets
                  </div>

                  {wallets.length === 0 ? (
                    <div className="empty">
                      No wallets found.
                    </div>
                  ) : (
                    wallets
                      .slice(0, 8)
                      .map((wallet) => (
                        <div
                          className="card-item"
                          key={wallet.id}
                        >
                          <div className="item-top">
                            <div>
                              <div className="item-title">
                                Customer
                              </div>

                              <div className="item-sub">
                                {wallet.user_id}
                              </div>
                            </div>

                            <div className="item-amount blue">
                              {formatMoney(
                                Number(
                                  wallet.balance ||
                                    0
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </section>

            <div className="footer-note">
              Moriki SMS Admin Dashboard
            </div>
          </>
        )}
      </div>
    </main>
  );
}