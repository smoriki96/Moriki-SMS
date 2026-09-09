"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function AccountPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error"
  >("success");

  const loadAccount = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      let {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        const { data: refreshed } =
          await supabase.auth.refreshSession();

        user = refreshed.user ?? null;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email || "");
      setFullName(user.user_metadata?.full_name || "");
      setCreatedAt(user.created_at || "");
    } catch (err) {
      console.error("ACCOUNT LOAD ERROR:", err);

      setMessageType("error");
      setMessage("Unable to load your account.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  async function handleSave(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");

    if (!fullName.trim()) {
      setMessageType("error");
      setMessage("Please enter your full name.");
      return;
    }

    try {
      setSaving(true);

      const { error } =
        await supabase.auth.updateUser({
          data: {
            full_name: fullName.trim(),
          },
        });

      if (error) {
        throw error;
      }

      setMessageType("success");
      setMessage(
        "Your account details have been updated successfully."
      );
    } catch (err) {
      console.error("ACCOUNT SAVE ERROR:", err);

      setMessageType("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to update your account."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      setMessage("");

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("LOGOUT ERROR:", err);

      setLoggingOut(false);
      setMessageType("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to log out."
      );
    }
  }

  if (loading) {
    return (
      <main className="loading-page">
        <div className="loading-box">
          <div className="spinner" />
          <p>Loading account...</p>
        </div>
      </main>
    );
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

        .loading-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #020617;
          color: white;
        }

        .loading-box {
          text-align: center;
          color: #94a3b8;
        }

        .spinner {
          width: 38px;
          height: 38px;
          margin: 0 auto 15px;
          border: 4px solid rgba(255,255,255,.10);
          border-top-color: #2196f3;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .header {
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: rgba(2,6,23,.96);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .header-inner {
          max-width: 1100px;
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
          font-size: 24px;
          font-weight: 900;
        }

        .logo span {
          color: #2196f3;
        }

        .nav {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .nav a:hover {
          color: white;
        }

        .dashboard-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 15px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.10);
          color: #e2e8f0 !important;
          background: rgba(255,255,255,.04);
        }

        .dashboard-button:hover {
          background: rgba(255,255,255,.08);
        }

        .container {
          max-width: 950px;
          margin: auto;
          padding: 45px 20px 70px;
        }

        .heading {
          margin-bottom: 30px;
        }

        .eyebrow {
          color: #2196f3;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.8px;
        }

        h1 {
          margin: 8px 0 0;
          font-size: 40px;
          letter-spacing: -1px;
        }

        .subtitle {
          margin-top: 10px;
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.6;
        }

        .card {
          margin-top: 18px;
          padding: 25px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(15,23,42,.96);
          box-shadow: 0 15px 40px rgba(0,0,0,.18);
        }

        .card-header {
          margin-bottom: 22px;
        }

        .card-title {
          font-size: 19px;
          font-weight: 900;
        }

        .card-description {
          margin-top: 6px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .message {
          margin-bottom: 20px;
          padding: 13px 15px;
          border-radius: 11px;
          font-size: 13px;
          line-height: 1.5;
        }

        .success {
          border: 1px solid rgba(74,222,128,.25);
          background: rgba(34,197,94,.08);
          color: #86efac;
        }

        .error {
          border: 1px solid rgba(248,113,113,.25);
          background: rgba(127,29,29,.20);
          color: #fecaca;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .field label {
          display: block;
          margin-bottom: 8px;
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 700;
        }

        .input {
          width: 100%;
          min-height: 48px;
          padding: 0 14px;
          border-radius: 11px;
          border: 1px solid #334155;
          outline: none;
          background: #020617;
          color: white;
          font-size: 14px;
        }

        .input::placeholder {
          color: #475569;
        }

        .input:focus {
          border-color: #2196f3;
          box-shadow: 0 0 0 3px rgba(33,150,243,.10);
        }

        .input:disabled {
          color: #64748b;
          cursor: not-allowed;
        }

        .hint {
          margin-top: 7px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .save-button {
          align-self: flex-start;
          min-height: 45px;
          padding: 0 20px;
          border: none;
          border-radius: 11px;
          background: linear-gradient(
            135deg,
            #1976d2,
            #2196f3
          );
          color: white;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .save-button:hover {
          opacity: .92;
        }

        .save-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .info-box {
          padding: 17px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,.07);
          background: #020617;
        }

        .info-label {
          color: #64748b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .8px;
          text-transform: uppercase;
        }

        .info-value {
          margin-top: 8px;
          color: #f8fafc;
          font-size: 14px;
          font-weight: 700;
          word-break: break-word;
        }

        .security-row,
        .support-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .security-text,
        .support-text {
          min-width: 0;
        }

        .security-title,
        .support-title {
          font-size: 16px;
          font-weight: 800;
        }

        .security-description,
        .support-description {
          margin-top: 6px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .outline-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 43px;
          padding: 0 17px;
          flex-shrink: 0;
          border-radius: 10px;
          border: 1px solid #334155;
          color: white;
          background: transparent;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
        }

        .outline-button:hover {
          background: rgba(255,255,255,.05);
          border-color: #475569;
        }

        .logout-card {
          border-color: rgba(248,113,113,.14);
        }

        .logout-button {
          min-height: 43px;
          padding: 0 17px;
          border: 1px solid rgba(248,113,113,.30);
          border-radius: 10px;
          background: rgba(127,29,29,.15);
          color: #fca5a5;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .logout-button:hover {
          background: rgba(127,29,29,.28);
        }

        .logout-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        @media (max-width: 700px) {
          .header-inner {
            padding: 15px;
          }

          .nav a:not(.dashboard-button) {
            display: none;
          }

          .container {
            padding: 32px 15px 50px;
          }

          h1 {
            font-size: 33px;
          }

          .card {
            padding: 20px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .security-row,
          .support-row {
            align-items: stretch;
            flex-direction: column;
          }

          .outline-button,
          .logout-button {
            width: 100%;
          }
        }
      `}</style>

      <header className="header">
        <div className="header-inner">
          <Link href="/dashboard" className="logo">
            Moriki <span>SMS</span>
          </Link>

          <nav className="nav">
            <Link href="/wallet">
              Wallet
            </Link>

            <Link href="/orders">
              Orders
            </Link>

            <Link
              href="/dashboard"
              className="dashboard-button"
            >
              ← Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="container">
        <div className="heading">
          <div className="eyebrow">
            MY ACCOUNT
          </div>

          <h1>Account Management</h1>

          <p className="subtitle">
            Manage your profile, account information,
            security, and customer support.
          </p>
        </div>

        {message && (
          <div
            className={`message ${
              messageType === "success"
                ? "success"
                : "error"
            }`}
          >
            {message}
          </div>
        )}

        <section className="card">
          <div className="card-header">
            <div className="card-title">
              Profile information
            </div>

            <div className="card-description">
              Update the name associated with your
              Moriki SMS account.
            </div>
          </div>

          <form
            onSubmit={handleSave}
            className="form"
          >
            <div className="field">
              <label htmlFor="fullName">
                Full name
              </label>

              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                placeholder="Enter your full name"
                disabled={saving}
                className="input"
              />
            </div>

            <div className="field">
              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="input"
              />

              <div className="hint">
                Your login email cannot be changed
                from this page.
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="save-button"
            >
              {saving
                ? "Saving..."
                : "Save changes"}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title">
              Account information
            </div>

            <div className="card-description">
              Basic information about your Moriki
              SMS account.
            </div>
          </div>

          <div className="info-grid">
            <div className="info-box">
              <div className="info-label">
                Email
              </div>

              <div className="info-value">
                {email || "Unavailable"}
              </div>
            </div>

            <div className="info-box">
              <div className="info-label">
                Account created
              </div>

              <div className="info-value">
                {createdAt
                  ? new Date(
                      createdAt
                    ).toLocaleDateString(
                      "en-NG",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )
                  : "Unavailable"}
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title">
              Security
            </div>

            <div className="card-description">
              Keep your account protected with a
              strong password.
            </div>
          </div>

          <div className="security-row">
            <div className="security-text">
              <div className="security-title">
                Password
              </div>

              <div className="security-description">
                Change your account password whenever
                you need to.
              </div>
            </div>

            <Link
              href="/reset-password"
              className="outline-button"
            >
              Change password
            </Link>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title">
              Customer Care
            </div>

            <div className="card-description">
              We're here to help with your account,
              wallet, numbers, or orders.
            </div>
          </div>

          <div className="support-row">
            <div className="support-text">
              <div className="support-title">
                Need help?
              </div>

              <div className="support-description">
                Contact support and send us the
                details of your issue.
              </div>
            </div>

            <Link
              href="/support"
              className="outline-button"
            >
              Contact Support
            </Link>
          </div>
        </section>

        <section className="card logout-card">
          <div className="security-row">
            <div className="security-text">
              <div className="security-title">
                Sign out
              </div>

              <div className="security-description">
                Sign out of your Moriki SMS account
                on this device.
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="logout-button"
            >
              {loggingOut
                ? "Signing out..."
                : "Sign out"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}