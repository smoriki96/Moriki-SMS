"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type CustomerNotification = {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "security";
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [notifications, setNotifications] = useState<
    CustomerNotification[]
  >([]);

  const [currentNotification, setCurrentNotification] =
    useState<CustomerNotification | null>(null);

  const [notificationLoading, setNotificationLoading] =
    useState(true);

  const [purchaseWarning, setPurchaseWarning] =
    useState(false);

  const notificationLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      try {
        setLoadingBalance(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!cancelled) {
            router.replace("/login");
          }
          return;
        }

        const { data: wallet, error } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("DASHBOARD WALLET ERROR:", error);
          setBalance(0);
          return;
        }

        setBalance(Number(wallet?.balance ?? 0));
      } catch (error) {
        if (!cancelled) {
          console.error("DASHBOARD BALANCE ERROR:", error);
          setBalance(0);
        }
      } finally {
        if (!cancelled) {
          setLoadingBalance(false);
        }
      }
    }

    loadBalance();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      if (notificationLoaded.current) return;

      notificationLoaded.current = true;

      try {
        setNotificationLoading(true);

        let {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          const {
            data: refreshData,
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.error(
              "SESSION REFRESH ERROR:",
              refreshError
            );
          }

          session = refreshData.session;
        }

        if (!session?.access_token) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000)
          );

          const {
            data: retryData,
          } = await supabase.auth.getSession();

          session = retryData.session;
        }

        if (!session?.access_token) {
          console.error(
            "NO CUSTOMER SESSION AVAILABLE"
          );
          return;
        }

        if (cancelled) return;

        const response = await fetch(
          "/api/notifications",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const contentType =
          response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await response.text();

          console.error(
            "NOTIFICATIONS API RETURNED NON-JSON:",
            text
          );

          return;
        }

        const data = await response.json();

        if (!response.ok) {
          console.error(
            "NOTIFICATIONS API ERROR:",
            data
          );

          return;
        }

        if (cancelled) return;

        const list: CustomerNotification[] =
          Array.isArray(data.notifications)
            ? data.notifications
            : [];

        console.log(
          "CUSTOMER NOTIFICATIONS RECEIVED:",
          list
        );

        setNotifications(list);

        if (list.length > 0) {
          setCurrentNotification(list[0]);
        }
      } catch (error) {
        console.error(
          "CUSTOMER NOTIFICATIONS ERROR:",
          error
        );
      } finally {
        if (!cancelled) {
          setNotificationLoading(false);
        }
      }
    }

    const timer = setTimeout(() => {
      loadNotifications();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  function closeNotification() {
    const currentIndex = notifications.findIndex(
      (notification) =>
        notification.id === currentNotification?.id
    );

    if (
      currentIndex !== -1 &&
      currentIndex + 1 < notifications.length
    ) {
      setCurrentNotification(
        notifications[currentIndex + 1]
      );
    } else {
      setCurrentNotification(null);
    }
  }

  function showPurchaseWarning() {
    setPurchaseWarning(true);
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error("LOGOUT ERROR:", error);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
  }

  function formatMoney(amount: number) {
    return `NGN ${Number(amount || 0).toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  function getNotificationIcon(
    type: CustomerNotification["type"]
  ) {
    if (type === "security") return "SECURITY";
    if (type === "warning") return "WARNING";
    if (type === "success") return "SUCCESS";

    return "INFORMATION";
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
        }

        .logoutButton:hover {
          background: rgba(248,113,113,0.15);
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
          font-size: 13px;
          font-weight: 900;
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

        .securityBanner {
          margin-top: 30px;
          padding: 20px;
          border-radius: 16px;
          background: rgba(120,53,15,0.25);
          border: 1px solid rgba(245,158,11,0.25);
        }

        .securityBanner h3 {
          margin: 0 0 8px;
          color: #fbbf24;
        }

        .securityBanner p {
          margin: 0;
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.6;
        }

        .footer {
          text-align: center;
          padding: 30px 20px;
          color: #64748b;
          font-size: 12px;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(0,0,0,0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal {
          width: 100%;
          max-width: 520px;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 25px 70px rgba(0,0,0,0.45);
        }

        .modalLabel {
          color: #60a5fa;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }

        .modal h2 {
          margin: 0 0 12px;
          font-size: 23px;
        }

        .modalMessage {
          color: #cbd5e1;
          line-height: 1.7;
          font-size: 14px;
          white-space: pre-wrap;
        }

        .modalButton {
          width: 100%;
          margin-top: 20px;
          padding: 13px;
          border: none;
          border-radius: 10px;
          background: #2196f3;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .warningModal {
          border-color: rgba(245,158,11,0.35);
        }

        .warningModal .modalLabel {
          color: #fbbf24;
        }

        .warningModal .modalButton {
          background: #d97706;
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
            <Link href="/" className="home">
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

          <h1>Welcome back</h1>

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
              PHONE
            </div>

            <h2>My Numbers</h2>

            <p>
              Browse available virtual numbers
              and choose a country and service.
            </p>

            <div className="arrow">
              &gt;
            </div>
          </Link>

          <Link
            href="/orders"
            className="card"
          >
            <div className="icon">
              ORDERS
            </div>

            <h2>My Orders</h2>

            <p>
              View your purchased numbers,
              activations, and order status.
            </p>

            <div className="arrow">
              &gt;
            </div>
          </Link>

          <Link
            href="/wallet"
            className="card"
          >
            <div className="icon">
              WALLET
            </div>

            <h2>Wallet</h2>

            <p>
              Check your balance, fund your
              account, and view transactions.
            </p>

            <div className="arrow">
              &gt;
            </div>
          </Link>

          <Link
            href="/account"
            className="card"
          >
            <div className="icon">
              ACCOUNT
            </div>

            <h2>Account</h2>

            <p>
              Manage your account information
              and personal settings.
            </p>

            <div className="arrow">
              &gt;
            </div>
          </Link>
        </section>

        <section className="securityBanner">
          <h3>Security reminder</h3>

          <p>
            After purchasing a virtual number, protect
            your account by enabling two-step verification.
            Never share your account password, passkey,
            email access, or verification credentials
            with anyone.
          </p>
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
            onClick={showPurchaseWarning}
          >
            Browse Numbers
          </Link>
        </section>
      </div>

      <footer className="footer">
        Copyright {new Date().getFullYear()} Moriki SMS
      </footer>

      {currentNotification && (
        <div className="modalOverlay">
          <div
            className={`modal ${
              currentNotification.type === "warning" ||
              currentNotification.type === "security"
                ? "warningModal"
                : ""
            }`}
          >
            <div className="modalLabel">
              {getNotificationIcon(
                currentNotification.type
              )}
            </div>

            <h2>
              {currentNotification.title}
            </h2>

            <div className="modalMessage">
              {currentNotification.message}
            </div>

            <button
              type="button"
              className="modalButton"
              onClick={closeNotification}
            >
              {notifications.length > 1
                ? "Continue"
                : "Got it"}
            </button>
          </div>
        </div>
      )}

      {purchaseWarning && (
        <div className="modalOverlay">
          <div className="modal warningModal">
            <div className="modalLabel">
              PURCHASE SECURITY WARNING
            </div>

            <h2>
              Protect your account after purchasing
            </h2>

            <div className="modalMessage">
              After purchasing a number, enable
              two-step verification on the account
              you are using.

              {"\n\n"}

              Never share your password, passkey,
              email access, or verification codes.
            </div>

            <button
              type="button"
              className="modalButton"
              onClick={() =>
                setPurchaseWarning(false)
              }
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {notificationLoading && null}
    </main>
  );
}