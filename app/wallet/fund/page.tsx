"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function FundWalletPage() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function continuePayment() {
    try {
      setError("");

      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount < 100
      ) {
        setError("Minimum funding amount is ₦100.");
        return;
      }

      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          "Unable to check your login session."
        );
      }

      if (!session?.access_token) {
        setError(
          "Your login session could not be found. Please log in again."
        );
        return;
      }

      const response = await fetch(
        "/api/paystack/initialize",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            amount: numericAmount,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to start payment."
        );
      }

      if (!data.authorization_url) {
        throw new Error(
          "Paystack payment link was not returned."
        );
      }

      window.location.href =
        data.authorization_url;
    } catch (err) {
      console.error(
        "FUND WALLET ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to continue payment."
      );
    } finally {
      setLoading(false);
    }
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
        }

        .page {
          min-height: 100vh;
          padding: 30px 16px;
          color: white;
          font-family: Arial, sans-serif;

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

        .card {
          width: 100%;
          max-width: 500px;
          margin: 60px auto;
          padding: 30px;

          border-radius: 20px;

          background: rgba(15,23,42,.96);

          border: 1px solid
            rgba(255,255,255,.08);

          box-shadow:
            0 20px 60px
            rgba(0,0,0,.3);
        }

        .back {
          display: inline-block;
          margin-bottom: 25px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
        }

        .back:hover {
          color: white;
        }

        .label {
          color: #2196f3;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 8px 0;
          font-size: 34px;
        }

        .description {
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 28px;
        }

        .field-label {
          display: block;
          margin-bottom: 9px;
          color: #cbd5e1;
          font-size: 14px;
          font-weight: 700;
        }

        .input-wrapper {
          position: relative;
        }

        .currency {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-weight: 800;
        }

        input {
          width: 100%;
          padding: 15px 15px 15px 42px;

          border-radius: 11px;
          border: 1px solid #334155;

          background: #020617;
          color: white;

          font-size: 18px;
          outline: none;
        }

        input:focus {
          border-color: #2196f3;
        }

        .button {
          width: 100%;
          margin-top: 20px;
          padding: 15px;

          border: none;
          border-radius: 11px;

          background:
            linear-gradient(
              135deg,
              #1976d2,
              #2196f3
            );

          color: white;

          font-size: 15px;
          font-weight: 900;

          cursor: pointer;
        }

        .button:hover {
          opacity: .92;
        }

        .button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .error {
          margin-top: 18px;
          padding: 14px;

          border-radius: 10px;

          background:
            rgba(127,29,29,.30);

          border: 1px solid
            rgba(248,113,113,.30);

          color: #fecaca;

          font-size: 14px;
        }

        .note {
          margin-top: 18px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          text-align: center;
        }

        @media (max-width: 600px) {
          .card {
            margin: 25px auto;
            padding: 24px;
          }

          h1 {
            font-size: 30px;
          }
        }
      `}</style>

      <div className="card">
        <a
          href="/wallet"
          className="back"
        >
          ← Back to Wallet
        </a>

        <div className="label">
          MORIKI SMS
        </div>

        <h1>Fund Wallet</h1>

        <p className="description">
          Add money to your Moriki SMS wallet
          using Paystack. You are currently
          using Paystack Test Mode.
        </p>

        <label className="field-label">
          Amount
        </label>

        <div className="input-wrapper">
          <span className="currency">
            ₦
          </span>

          <input
            type="number"
            min="100"
            step="100"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            disabled={loading}
          />
        </div>

        <button
          className="button"
          onClick={continuePayment}
          disabled={loading}
        >
          {loading
            ? "Opening Paystack..."
            : "Continue Payment"}
        </button>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <div className="note">
          This is a test payment. Do not use
          real card details or real money.
        </div>
      </div>
    </main>
  );
}