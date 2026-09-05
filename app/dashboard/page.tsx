"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadBalance() {
      try {
        setLoadingBalance(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setBalance(0);
          return;
        }

        const { data: wallet, error } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error(
            "DASHBOARD WALLET ERROR:",
            error
          );
          setBalance(0);
          return;
        }

        setBalance(
          Number(wallet?.balance ?? 0)
        );
      } catch (error) {
        console.error(
          "DASHBOARD BALANCE ERROR:",
          error
        );
        setBalance(0);
      } finally {
        setLoadingBalance(false);
      }
    }

    loadBalance();
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );

      setLoggingOut(false);
      return;
    }

    router.replace("/login");
  }

  function formatMoney(amount: number) {
    return `₦${Number(amount || 0).toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  return (
    <main className="dashboard">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #020617;
          font-family: Arial, sans-serif;
        }

        .dashboard {
          min-height: 100vh;
          color: #ffffff;
          background:
            radial-gradient(
              circle at top right,
              rgba(33, 150, 243, 0.18),
              transparent 35%
            ),
            radial-gradient(
              circle at bottom left,
              rgba(37, 99, 235, 0.12),
              transparent 35%
            ),
            #020617;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(2, 6, 23, 0.92);
          backdrop-filter: blur(15px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .topbarInner {
          max-width: 1150px;
          margin: 0 auto;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .logo {
          color: #ffffff;
          text-decoration: none;
          font-size: 24px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .logo span {
          color: #2196f3;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .home {
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          padding: 10px 12px;
        }

        .home:hover {
          color: #ffffff;
        }

        .logoutButton {
          border: 1px solid rgba(248,113,113,0.25);
          background: rgba(248,113,113,0.08);
          color: #f87171;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease;
        }

        .logoutButton:hover {
          background: rgba(248,113,113,0.15);
          border-color: rgba(248,113,113,0.4);
          color: #fca5a5;
        }

        .logoutButton:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .container {
          max-width: 1150px;
          margin: 0 auto;
          padding: 45px 20px 80px;
        }

        .welcome {
          margin-bottom: 35px;
        }

        .eyebrow {
          color: #60a5fa;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin-bottom: 10px;
        }

        .welcome h1 {
          margin: 0;
          font-size: clamp(32px, 6vw, 48px);
        }

        .welcome p {
          color: #94a3b8;
          margin-top: 10px;
          font-size: 15px;
        }

        .balance {
          margin-bottom: 30px;
          padding: 28px;
          border-radius: 22px;
          background:
            linear-gradient(
              135deg,
              rgba(25,118,210,0.25),
              rgba(15,23,42,0.95)
            );
          border: 1px solid rgba(33,150,243,0.22);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .balanceLabel {
          color: #94a3b8;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .balanceAmount {
          font-size: 32px;
          font-weight: 900;
        }

        .fundButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 13px 20px;
          border-radius: 10px;
          background: #2196f3;
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .card {
          position: relative;
          min-height: 210px;
          padding: 28px;
          border-radius: 20px;
          background: rgba(15,23,42,0.92);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          text-decoration: none;
          overflow: hidden;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        .card:hover {
          transform: translateY(-4px);
          border-color: rgba(33,150,243,0.4);
        }

        .card::after {
          content: "";
          position: absolute;
          width: 130px;
          height: 130px;
          right: -50px;
          bottom: -55px;
          border-radius: 50%;
          background: rgba(33,150,243,0.08);
        }

        .icon {
          width: 55px;
          height: 55px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(33,150,243,0.12);
          border: 1px solid rgba(33,150,243,0.16);
          font-size: 27px;
          margin-bottom: 22px;
        }

        .card h2 {
          margin: 0 0 9px;
          font-size: 21px;
        }

        .card p {
          margin: 0;
          max-width: 400px;
          color: #94a3b8;
          line-height: 1.6;
          font-size: 14px;
        }

        .arrow {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          font-size: 25px;
        }

        .quick {
          margin-top: 30px;
          padding: 30px;
          border-radius: 20px;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .quick h2 {
          margin: 0 0 8px;
          font-size: 22px;
        }

        .quick p {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 20px;
        }

        .buyButton {
          display: inline-flex;
          padding: 13px 20px;
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

        .footer {
          text-align: center;
          padding: 30px 20px;
          color: #64748b;
          font-size: 12px;
        }

        @media (max-width: 700px) {
          .topbarInner {
            padding: 15px;
          }

          .logo {
            font-size: 21px;
          }

          .headerActions {
            gap: 5px;
          }

          .home {
            padding: 8px;
            font-size: 13px;
          }

          .logoutButton {
            padding: 9px 11px;
            font-size: 12px;
          }

          .container {
            padding: 32px 15px 60px;
          }

          .balance {
            align-items: flex-start;
            flex-direction: column;
          }

          .fundButton {
            width: 100%;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .card {
            min-height: 190px;
          }

          .arrow {
            right: 20px;
            top: 25px;
            transform: none;
          }
        }
      `}</style>

      <header className="topbar">
        <div className="topbarInner">
          <Link href="/" className="logo">
            Moriki <span>SMS</span>
          </Link>

          <div className="headerActions">
            <Link
              href="/"
              className="home"
            >
              Home
            </Link>

            <button
              type="button"
              className="logoutButton"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="welcome">
          <div className="eyebrow">
            MORIKI SMS DASHBOARD
          </div>

          <h1>
            Welcome back 👋
          </h1>

          <p>
            Manage your numbers, orders, wallet,
            and account from here.
          </p>
        </section>

        <section className="balance">
          <div>
            <div className="balanceLabel">
              AVAILABLE BALANCE
            </div>

            <div className="balanceAmount">
              {loadingBalance
                ? "Loading..."
                : formatMoney(balance)}
            </div>
          </div>

          <Link
            href="/wallet"
            className="fundButton"
          >
            Fund Wallet
          </Link>
        </section>

        <section className="grid">
          <Link
            href="/numbers"
            className="card"
          >
            <div className="icon">
              📱
            </div>

            <h2>
              My Numbers
            </h2>

            <p>
              Browse available virtual numbers
              and choose a country and service.
            </p>

            <div className="arrow">
              →
            </div>
          </Link>

          <Link
            href="/orders"
            className="card"
          >
            <div className="icon">
              📋
            </div>

            <h2>
              My Orders
            </h2>

            <p>
              View your purchased numbers,
              activations, and order status.
            </p>

            <div className="arrow">
              →
            </div>
          </Link>

          <Link
            href="/wallet"
            className="card"
          >
            <div className="icon">
              💳
            </div>

            <h2>
              Wallet
            </h2>

            <p>
              Check your balance, fund your
              account, and view transactions.
            </p>

            <div className="arrow">
              →
            </div>
          </Link>

          <Link
            href="/account"
            className="card"
          >
            <div className="icon">
              👤
            </div>

            <h2>
              Account
            </h2>

            <p>
              Manage your account information
              and personal settings.
            </p>

            <div className="arrow">
              →
            </div>
          </Link>
        </section>

        <section className="quick">
          <h2>
            Need a virtual number?
          </h2>

          <p>
            Browse the available countries and
            services and choose the number you
            want.
          </p>

          <Link
            href="/numbers"
            className="buyButton"
          >
            Browse Numbers
          </Link>
        </section>
      </div>

      <footer className="footer">
        © {new Date().getFullYear()} Moriki SMS
      </footer>
    </main>
  );
}