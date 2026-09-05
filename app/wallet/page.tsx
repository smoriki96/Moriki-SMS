"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Transaction = {
  id: string;
  amount: number;
  type: string;
  status: string;
  description?: string | null;
  created_at: string;
};

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWallet();
  }, []);

  async function loadWallet() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please log in to view your wallet.");
        return;
      }

      const { data: wallet, error: walletError } =
        await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();

      if (walletError) {
        throw walletError;
      }

      setBalance(Number(wallet?.balance ?? 0));

      const {
        data: transactionData,
        error: transactionError,
      } = await supabase
        .from("wallet_transactions")
        .select(
          "id, amount, type, status, description, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

      if (transactionError) {
        throw transactionError;
      }

      setTransactions(
        (transactionData || []) as Transaction[]
      );
    } catch (err) {
      console.error("WALLET ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load wallet."
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

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
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

  function transactionLabel(transaction: Transaction) {
    if (transaction.description) {
      return transaction.description;
    }

    if (isCredit(transaction)) {
      return "Wallet funding";
    }

    if (
      transaction.type?.toLowerCase() === "purchase" ||
      transaction.type?.toLowerCase() === "debit"
    ) {
      return "Number purchase";
    }

    return "Wallet transaction";
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
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: rgba(2,6,23,.96);
        }

        .header-inner {
          max-width: 1100px;
          margin: auto;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
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

        .nav {
          display: flex;
          gap: 18px;
        }

        .nav a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
        }

        .nav a:hover {
          color: white;
        }

        .container {
          width: 100%;
          max-width: 1100px;
          margin: auto;
          padding: 45px 20px 70px;
        }

        .top {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 25px;
          margin-bottom: 30px;
        }

        .label {
          color: #2196f3;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 8px 0 0;
          font-size: 42px;
        }

        .fund-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 22px;
          border-radius: 11px;
          background: linear-gradient(
            135deg,
            #1976d2,
            #2196f3
          );
          color: white;
          text-decoration: none;
          font-size: 15px;
          font-weight: 900;
        }

        .balance-card {
          padding: 30px;
          border-radius: 20px;
          background:
            linear-gradient(
              135deg,
              rgba(25,118,210,.20),
              rgba(15,23,42,.96)
            );
          border: 1px solid rgba(33,150,243,.28);
        }

        .balance-label {
          color: #94a3b8;
          font-size: 13px;
          font-weight: 700;
        }

        .balance {
          margin-top: 10px;
          font-size: 42px;
          font-weight: 900;
        }

        .balance-note {
          margin-top: 8px;
          color: #64748b;
          font-size: 13px;
        }

        .section {
          margin-top: 30px;
        }

        .section-title {
          margin-bottom: 15px;
          font-size: 21px;
          font-weight: 900;
        }

        .transactions {
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(15,23,42,.96);
        }

        .transaction {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 19px 20px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }

        .transaction:last-child {
          border-bottom: none;
        }

        .transaction-left {
          min-width: 0;
        }

        .transaction-title {
          font-weight: 800;
          font-size: 15px;
        }

        .transaction-date {
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
        }

        .transaction-right {
          text-align: right;
          flex-shrink: 0;
        }

        .amount {
          font-size: 16px;
          font-weight: 900;
        }

        .credit {
          color: #4ade80;
        }

        .debit {
          color: #f87171;
        }

        .status {
          display: inline-block;
          margin-top: 5px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,.06);
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .empty {
          padding: 45px 20px;
          text-align: center;
          color: #64748b;
        }

        .empty-title {
          margin-bottom: 8px;
          color: #cbd5e1;
          font-size: 17px;
          font-weight: 800;
        }

        .error {
          margin-top: 20px;
          padding: 15px;
          border-radius: 10px;
          background: rgba(127,29,29,.30);
          border: 1px solid rgba(248,113,113,.30);
          color: #fecaca;
        }

        .loading {
          padding: 50px 20px;
          text-align: center;
          color: #94a3b8;
        }

        @media (max-width: 650px) {
          .header-inner {
            padding: 16px;
          }

          .container {
            padding: 30px 15px 50px;
          }

          .top {
            align-items: stretch;
            flex-direction: column;
          }

          h1 {
            font-size: 34px;
          }

          .fund-button {
            width: 100%;
          }

          .balance {
            font-size: 34px;
          }

          .transaction {
            padding: 17px 14px;
          }
        }
      `}</style>

      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo">
            Moriki <span>SMS</span>
          </Link>

          <nav className="nav">
            <Link href="/">Home</Link>
            <Link href="/numbers">Numbers</Link>
            <Link href="/orders">Orders</Link>
          </nav>
        </div>
      </header>

      <div className="container">
        <div className="top">
          <div>
            <div className="label">
              MORIKI SMS WALLET
            </div>

            <h1>My Wallet</h1>
          </div>

          <Link
            href="/wallet/fund"
            className="fund-button"
          >
            + Fund Wallet
          </Link>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">
            Loading wallet...
          </div>
        ) : (
          <>
            <section className="balance-card">
              <div className="balance-label">
                Available Balance
              </div>

              <div className="balance">
                {formatMoney(balance)}
              </div>

              <div className="balance-note">
                Use your wallet balance to purchase
                virtual numbers.
              </div>
            </section>

            <section className="section">
              <div className="section-title">
                Transactions
              </div>

              <div className="transactions">
                {transactions.length === 0 ? (
                  <div className="empty">
                    <div className="empty-title">
                      No transactions yet
                    </div>

                    <div>
                      Your wallet transactions
                      will appear here.
                    </div>
                  </div>
                ) : (
                  transactions.map((transaction) => {
                    const credit =
                      isCredit(transaction);

                    return (
                      <div
                        className="transaction"
                        key={transaction.id}
                      >
                        <div className="transaction-left">
                          <div className="transaction-title">
                            {transactionLabel(
                              transaction
                            )}
                          </div>

                          <div className="transaction-date">
                            {formatDate(
                              transaction.created_at
                            )}
                          </div>
                        </div>

                        <div className="transaction-right">
                          <div
                            className={`amount ${
                              credit
                                ? "credit"
                                : "debit"
                            }`}
                          >
                            {credit ? "+" : "-"}
                            {formatMoney(
                              Math.abs(
                                Number(
                                  transaction.amount
                                )
                              )
                            )}
                          </div>

                          <div className="status">
                            {transaction.status ||
                              "completed"}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}