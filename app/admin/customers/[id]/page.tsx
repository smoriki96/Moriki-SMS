"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Customer = {
  id: string;
  email?: string | null;
};

type Wallet = {
  id: string;
  user_id: string;
  balance?: number | null;
  updated_at?: string | null;
};

type Order = {
  id: string;
  phone_number?: string | null;
  number?: string | null;
  phone?: string | null;
  country?: string | null;
  operator?: string | null;
  service?: string | null;
  product?: string | null;
  status?: string | null;
  price?: number | null;
  amount?: number | null;
  cost?: number | null;
  profit?: number | null;
  reference?: string | null;
  transaction_reference?: string | null;
  order_reference?: string | null;
  created_at?: string | null;
};

type Transaction = {
  id: string;
  user_id?: string | null;
  wallet_id?: string | null;
  amount?: number | null;
  display_amount?: number | null;
  type?: string | null;
  category?: string | null;
  direction?: "credit" | "debit" | string | null;
  status?: string | null;
  description?: string | null;
  reference?: string | null;
  transaction_reference?: string | null;
  number?: string | null;
  country?: string | null;
  operator?: string | null;
  service?: string | null;
  source?: string | null;
  order_id?: string | null;
  created_at?: string | null;
};

type Stats = {
  totalOrders: number;
  totalSpent: number;
  totalProfit: number;
  totalFunding: number;
  walletBalance: number;
};

type TransactionFilter =
  | "all"
  | "funding"
  | "purchase"
  | "deduction"
  | "refund";

export default function CustomerDetailsPage() {
  const params = useParams();

  const customerId =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [wallet, setWallet] =
    useState<Wallet | null>(null);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [stats, setStats] =
    useState<Stats>({
      totalOrders: 0,
      totalSpent: 0,
      totalProfit: 0,
      totalFunding: 0,
      walletBalance: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [fundAmount, setFundAmount] =
    useState("");

  const [fundDescription, setFundDescription] =
    useState("");

  const [funding, setFunding] =
    useState(false);

  const [fundMessage, setFundMessage] =
    useState("");

  const [fundError, setFundError] =
    useState("");

  const [showFundsBox, setShowFundsBox] =
    useState(false);

  const [fundAction, setFundAction] =
    useState<"add" | "deduct">("add");

  const [refundingOrderId, setRefundingOrderId] =
    useState("");

  const [refundMessage, setRefundMessage] =
    useState("");

  const [refundError, setRefundError] =
    useState("");

  const [transactionFilter, setTransactionFilter] =
    useState<TransactionFilter>("all");

  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId]);

  async function loadCustomer() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError(
          "Please log in to access customer details."
        );
        return;
      }

      const response = await fetch(
        `/api/admin/customers/${encodeURIComponent(
          customerId
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const text = await response.text();

      let result: any = null;

      try {
        result = text
          ? JSON.parse(text)
          : null;
      } catch {
        throw new Error(
          `Server returned an invalid response. HTTP ${response.status}.`
        );
      }

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.error ||
            `Unable to load customer. HTTP ${response.status}.`
        );
      }

      setCustomer(
        result.customer || {
          id: customerId,
          email: null,
        }
      );

      setWallet(
        result.wallet || null
      );

      setOrders(
        Array.isArray(result.orders)
          ? result.orders
          : []
      );

      setTransactions(
        Array.isArray(result.transactions)
          ? result.transactions
          : []
      );

      setStats({
        totalOrders: Number(
          result.stats?.totalOrders || 0
        ),
        totalSpent: Number(
          result.stats?.totalSpent || 0
        ),
        totalProfit: Number(
          result.stats?.totalProfit || 0
        ),
        totalFunding: Number(
          result.stats?.totalFunding || 0
        ),
        walletBalance: Number(
          result.stats?.walletBalance || 0
        ),
      });
    } catch (err) {
      console.error(
        "CUSTOMER DETAILS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customer details."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleFunds() {
    if (funding) return;

    try {
      setFundError("");
      setFundMessage("");

      const amount =
        Number(fundAmount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        setFundError(
          "Please enter a valid amount greater than ₦0."
        );
        return;
      }

      const currentBalance =
        Number(
          wallet?.balance ??
            stats.walletBalance ??
            0
        );

      if (
        fundAction === "deduct" &&
        amount > currentBalance
      ) {
        setFundError(
          "The deduction cannot be greater than the customer's wallet balance."
        );
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session
      ) {
        setFundError(
          "Your session has expired. Please log in again."
        );
        return;
      }

      setFunding(true);

      const endpoint =
        fundAction === "deduct"
          ? `/api/admin/customers/${encodeURIComponent(
              customerId
            )}/deduct`
          : `/api/admin/customers/${encodeURIComponent(
              customerId
            )}/funds`;

      const body =
        fundAction === "deduct"
          ? {
              amount,
            }
          : {
              amount,
              action: "add",
              description:
                fundDescription.trim() ||
                "Admin wallet funding",
            };

      const response =
        await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            Accept: "application/json",
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
          cache: "no-store",
        });

      const text =
        await response.text();

      let result: any = null;

      try {
        result = text
          ? JSON.parse(text)
          : null;
      } catch {
        throw new Error(
          `Server returned an invalid response. HTTP ${response.status}.`
        );
      }

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.error ||
            `Unable to ${
              fundAction === "add"
                ? "add"
                : "deduct"
            } customer funds. HTTP ${response.status}.`
        );
      }

      setFundMessage(
        fundAction === "add"
          ? "Customer funds added successfully."
          : "Customer funds deducted successfully."
      );

      setFundAmount("");
      setFundDescription("");

      await loadCustomer();
    } catch (err) {
      console.error(
        "CUSTOMER FUNDS ERROR:",
        err
      );

      setFundError(
        err instanceof Error
          ? err.message
          : "Unable to update customer wallet."
      );
    } finally {
      setFunding(false);
    }
  }

  async function handleRefund(order: Order) {
    if (refundingOrderId) return;

    setRefundError("");
    setRefundMessage("");

    const currentStatus =
      String(
        order.status || ""
      ).toLowerCase();

    if (
      currentStatus === "refunded" ||
      currentStatus === "refund"
    ) {
      setRefundError(
        "This order has already been refunded."
      );
      return;
    }

    const refundAmount =
      Number(
        order.price ??
          order.amount ??
          order.cost ??
          0
      );

    if (
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {
      setRefundError(
        "This order does not have a valid refund amount."
      );
      return;
    }

    const phone =
      getPhoneNumber(order);

    const service =
      order.service ||
      order.product ||
      "Number";

    const confirmed =
      window.confirm(
        `Refund ${formatMoney(
          refundAmount
        )} to this customer?\n\nNumber: ${phone}\nService: ${service}\n\nThis will mark the order as refunded and return the money to the customer's wallet.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setRefundingOrderId(
        order.id
      );

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session
      ) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const response =
        await fetch(
          `/api/admin/customers/${encodeURIComponent(
            customerId
          )}/refund`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              Accept: "application/json",
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              orderId: order.id,
            }),
            cache: "no-store",
          }
        );

      const text =
        await response.text();

      let result: any = null;

      try {
        result = text
          ? JSON.parse(text)
          : null;
      } catch {
        throw new Error(
          `Server returned an invalid response. HTTP ${response.status}.`
        );
      }

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.error ||
            `Unable to refund this order. HTTP ${response.status}.`
        );
      }

      setRefundMessage(
        `Refund successful. ${formatMoney(
          Number(
            result.amount ??
              refundAmount
          )
        )} has been returned to the customer's wallet.`
      );

      await loadCustomer();
    } catch (err) {
      console.error(
        "CUSTOMER REFUND ERROR:",
        err
      );

      setRefundError(
        err instanceof Error
          ? err.message
          : "Unable to refund this order."
      );
    } finally {
      setRefundingOrderId("");
    }
  }

  function formatMoney(
    amount: number
  ) {
    return `₦${amount.toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  function formatDate(
    date?: string | null
  ) {
    if (!date) {
      return "Unknown date";
    }

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return "Unknown date";
    }

    return parsed.toLocaleString(
      "en-NG",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  function getPhoneNumber(
    order: Order
  ) {
    return (
      order.phone_number ||
      order.number ||
      order.phone ||
      "Unavailable"
    );
  }

  function getTransactionNumber(
    transaction: Transaction
  ) {
    return (
      transaction.number ||
      "—"
    );
  }

  function getTransactionReference(
    transaction: Transaction
  ) {
    return (
      transaction.reference ||
      transaction.transaction_reference ||
      transaction.order_id ||
      transaction.id ||
      "—"
    );
  }

  function getTransactionDirection(
    transaction: Transaction
  ) {
    if (
      transaction.direction
    ) {
      return (
        String(
          transaction.direction
        ).toLowerCase() ===
        "credit"
          ? "credit"
          : "debit"
      );
    }

    const type =
      String(
        transaction.type ||
          ""
      ).toLowerCase();

    if (
      type === "deposit" ||
      type === "fund" ||
      type === "funding" ||
      type === "credit" ||
      type === "refund" ||
      type === "refund_credit" ||
      type === "wallet_funding" ||
      type === "payment"
    ) {
      return "credit";
    }

    return "debit";
  }

  function getTransactionType(
    transaction: Transaction
  ) {
    const type =
      String(
        transaction.type ||
          ""
      ).toLowerCase();

    if (
      transaction.source ===
      "order" ||
      type === "purchase"
    ) {
      return "Purchase";
    }

    if (
      type === "refund" ||
      type === "refund_credit"
    ) {
      return "Refund";
    }

    if (
      type === "deposit" ||
      type === "fund" ||
      type === "funding" ||
      type === "credit" ||
      type === "wallet_funding"
    ) {
      return "Add Funds";
    }

    if (
      type === "deduction" ||
      type === "debit" ||
      type === "withdrawal"
    ) {
      return "Deduct Funds";
    }

    if (transaction.category) {
      return String(
        transaction.category
      )
        .replace(
          /_/g,
          " "
        )
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        );
    }

    if (transaction.type) {
      return String(
        transaction.type
      )
        .replace(
          /_/g,
          " "
        )
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        );
    }

    return "Transaction";
  }

  function getTransactionDescription(
    transaction: Transaction
  ) {
    if (
      transaction.description
    ) {
      return transaction.description;
    }

    if (
      transaction.source ===
      "order"
    ) {
      const service =
        transaction.service ||
        "Number";

      const country =
        transaction.country ||
        "";

      const number =
        transaction.number ||
        "";

      return [
        "Number purchase",
        service,
        country,
        number,
      ]
        .filter(Boolean)
        .join(" • ");
    }

    return getTransactionType(
      transaction
    );
  }

  function getStatusClass(
    status?: string | null
  ) {
    const value =
      status?.toLowerCase() ||
      "completed";

    if (
      value === "completed" ||
      value === "active" ||
      value === "success" ||
      value === "successful" ||
      value === "paid" ||
      value === "confirmed" ||
      value === "refunded" ||
      value === "refund"
    ) {
      return "status success";
    }

    if (
      value === "cancelled" ||
      value === "canceled" ||
      value === "failed" ||
      value === "rejected"
    ) {
      return "status danger";
    }

    return "status pending";
  }

  function getDirectionClass(
    direction: string
  ) {
    return direction ===
      "credit"
      ? "direction credit"
      : "direction debit";
  }

  function getDirectionLabel(
    direction: string
  ) {
    return direction ===
      "credit"
      ? "CREDIT"
      : "DEBIT";
  }

  const filteredTransactions =
    useMemo(() => {
      if (
        transactionFilter ===
        "all"
      ) {
        return transactions;
      }

      return transactions.filter(
        (transaction) => {
          const type =
            String(
              transaction.type ||
                ""
            ).toLowerCase();

          const transactionType =
            getTransactionType(
              transaction
            ).toLowerCase();

          if (
            transactionFilter ===
            "funding"
          ) {
            return (
              type === "deposit" ||
              type === "fund" ||
              type === "funding" ||
              type === "credit" ||
              type === "wallet_funding" ||
              transactionType ===
                "add funds"
            );
          }

          if (
            transactionFilter ===
            "purchase"
          ) {
            return (
              transaction.source ===
                "order" ||
              type ===
                "purchase" ||
              transactionType ===
                "purchase"
            );
          }

          if (
            transactionFilter ===
            "deduction"
          ) {
            return (
              type ===
                "deduction" ||
              type ===
                "debit" ||
              type ===
                "withdrawal" ||
              transactionType ===
                "deduct funds"
            );
          }

          if (
            transactionFilter ===
            "refund"
          ) {
            return (
              type ===
                "refund" ||
              type ===
                "refund_credit" ||
              transactionType ===
                "refund"
            );
          }

          return true;
        }
      );
    }, [
      transactions,
      transactionFilter,
    ]);

  function getFilterCount(
    filter: TransactionFilter
  ) {
    if (filter === "all") {
      return transactions.length;
    }

    return transactions.filter(
      (transaction) => {
        const type =
          String(
            transaction.type ||
              ""
          ).toLowerCase();

        const transactionType =
          getTransactionType(
            transaction
          ).toLowerCase();

        if (
          filter === "funding"
        ) {
          return (
            type === "deposit" ||
            type === "fund" ||
            type === "funding" ||
            type === "credit" ||
            type === "wallet_funding" ||
            transactionType ===
              "add funds"
          );
        }

        if (
          filter === "purchase"
        ) {
          return (
            transaction.source ===
              "order" ||
            type === "purchase" ||
            transactionType ===
              "purchase"
          );
        }

        if (
          filter === "deduction"
        ) {
          return (
            type === "deduction" ||
            type === "debit" ||
            type === "withdrawal" ||
            transactionType ===
              "deduct funds"
          );
        }

        if (
          filter === "refund"
        ) {
          return (
            type === "refund" ||
            type === "refund_credit" ||
            transactionType ===
              "refund"
          );
        }

        return true;
      }
    ).length;
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
          gap: 12px;
        }

        .back,
        .refresh {
          padding: 10px 15px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 900;
        }

        .back {
          color: #cbd5e1;
          text-decoration: none;
          background: rgba(255,255,255,.05);
        }

        .refresh {
          border: none;
          cursor: pointer;
          color: white;
          background: #2196f3;
        }

        .refresh:hover {
          background: #1976d2;
        }

        .refresh:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .container {
          width: 100%;
          max-width: 1200px;
          margin: auto;
          padding: 45px 20px 80px;
        }

        .hero {
          margin-bottom: 28px;
        }

        .eyebrow {
          color: #2196f3;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .hero h1 {
          margin: 8px 0;
          font-size: 40px;
        }

        .hero p {
          margin: 0;
          color: #94a3b8;
        }

        .customer-email {
          margin-top: 12px;
          color: #cbd5e1;
          font-size: 14px;
        }

        .customer-id {
          margin-top: 10px;
          padding: 10px 13px;
          display: inline-block;
          border-radius: 9px;
          background: rgba(255,255,255,.04);
          color: #64748b;
          font-size: 11px;
          word-break: break-all;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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
          font-weight: 900;
          margin-bottom: 10px;
        }

        .stat-value {
          font-size: 25px;
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

        .balance-card {
          padding: 25px;
          margin-bottom: 30px;
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              rgba(25,118,210,.18),
              rgba(15,23,42,.96)
            );
          border: 1px solid rgba(33,150,243,.25);
        }

        .balance-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .balance-label {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 800;
        }

        .balance {
          margin-top: 8px;
          font-size: 38px;
          font-weight: 900;
        }

        .balance-id {
          margin-top: 8px;
          color: #64748b;
          font-size: 11px;
          word-break: break-all;
        }

        .fund-button {
          border: none;
          cursor: pointer;
          padding: 12px 18px;
          border-radius: 10px;
          color: white;
          background: #2196f3;
          font-weight: 900;
        }

        .fund-button:hover {
          background: #1976d2;
        }

        .fund-box {
          margin-top: 22px;
          padding: 20px;
          border-radius: 14px;
          background: rgba(2,6,23,.65);
          border: 1px solid rgba(255,255,255,.08);
        }

        .fund-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 18px;
        }

        .fund-tab {
          border: none;
          cursor: pointer;
          padding: 10px 16px;
          border-radius: 9px;
          color: #94a3b8;
          background: rgba(255,255,255,.06);
          font-weight: 900;
        }

        .fund-tab.active-add {
          background: rgba(34,197,94,.15);
          color: #4ade80;
        }

        .fund-tab.active-deduct {
          background: rgba(239,68,68,.15);
          color: #f87171;
        }

        .fund-form {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 12px;
          align-items: end;
        }

        .field label {
          display: block;
          margin-bottom: 7px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
        }

        .field input {
          width: 100%;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 9px;
          outline: none;
          background: #0f172a;
          color: white;
        }

        .submit-add,
        .submit-deduct {
          border: none;
          cursor: pointer;
          padding: 12px 18px;
          border-radius: 9px;
          color: white;
          font-weight: 900;
        }

        .submit-add {
          background: #16a34a;
        }

        .submit-deduct {
          background: #dc2626;
        }

        .submit-add:disabled,
        .submit-deduct:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .fund-message,
        .refund-message {
          margin-top: 14px;
          padding: 12px;
          border-radius: 9px;
          background: rgba(34,197,94,.1);
          color: #4ade80;
          font-size: 13px;
          font-weight: 700;
        }

        .fund-error,
        .refund-error {
          margin-top: 14px;
          padding: 12px;
          border-radius: 9px;
          background: rgba(239,68,68,.1);
          color: #f87171;
          font-size: 13px;
          font-weight: 700;
        }

        .section {
          margin-top: 30px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
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
          min-width: 1050px;
        }

        th {
          padding: 15px;
          text-align: left;
          color: #64748b;
          font-size: 10px;
          letter-spacing: .7px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          white-space: nowrap;
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

        .refund-button {
          border: none;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          background: #dc2626;
          color: white;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .refund-button:hover {
          background: #b91c1c;
        }

        .refund-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .refunded-button {
          border: 1px solid rgba(34,197,94,.25);
          background: rgba(34,197,94,.1);
          color: #4ade80;
          cursor: default;
        }

        .status {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          white-space: nowrap;
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

        .transactions {
          overflow-x: auto;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(15,23,42,.95);
        }

        .transaction-filter-box {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 15px;
          padding: 6px;
          border-radius: 12px;
          background: rgba(15,23,42,.95);
          border: 1px solid rgba(255,255,255,.08);
        }

        .transaction-filter {
          border: 1px solid transparent;
          cursor: pointer;
          padding: 10px 13px;
          border-radius: 8px;
          color: #94a3b8;
          background: transparent;
          font-size: 11px;
          font-weight: 900;
          transition: .2s;
        }

        .transaction-filter:hover {
          background: rgba(255,255,255,.05);
          color: white;
        }

        .transaction-filter.active {
          color: white;
          background: #2196f3;
          border-color: rgba(96,165,250,.35);
        }

        .filter-count {
          margin-left: 5px;
          opacity: .7;
        }

        .transaction-table {
          width: 100%;
          min-width: 1050px;
          border-collapse: collapse;
        }

        .transaction-table th {
          white-space: nowrap;
        }

        .transaction-table td {
          vertical-align: middle;
        }

        .transaction-type {
          color: white;
          font-weight: 900;
        }

        .transaction-description {
          margin-top: 4px;
          max-width: 260px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .direction {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 68px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
        }

        .direction.credit {
          background: rgba(34,197,94,.12);
          color: #4ade80;
        }

        .direction.debit {
          background: rgba(239,68,68,.12);
          color: #f87171;
        }

        .transaction-amount {
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
        }

        .transaction-reference {
          max-width: 190px;
          color: #94a3b8;
          font-family: monospace;
          font-size: 11px;
          word-break: break-all;
        }

        .transaction-date {
          min-width: 150px;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.5;
        }

        .transaction-number {
          color: white;
          font-weight: 800;
          white-space: nowrap;
        }

        .transaction-service {
          color: #cbd5e1;
          font-weight: 700;
        }

        .transaction-location {
          margin-top: 3px;
          color: #64748b;
          font-size: 10px;
        }

        .empty {
          padding: 40px 20px;
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

        .loading {
          padding: 80px 20px;
          text-align: center;
          color: #94a3b8;
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .fund-form {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .header-inner {
            padding: 15px;
          }

          .container {
            padding: 30px 15px 60px;
          }

          .hero h1 {
            font-size: 32px;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .stat-value {
            font-size: 22px;
          }

          .back {
            display: none;
          }

          .balance-top {
            align-items: flex-start;
            flex-direction: column;
          }

          .balance {
            font-size: 32px;
          }

          .transaction-filter-box {
            overflow-x: auto;
            flex-wrap: nowrap;
          }

          .transaction-filter {
            white-space: nowrap;
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
              href="/admin"
              className="back"
            >
              ← Admin Dashboard
            </Link>

            <button
              className="refresh"
              onClick={loadCustomer}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {loading ? (
          <div className="loading">
            Loading customer details...
          </div>
        ) : error ? (
          <div className="error">
            {error}
          </div>
        ) : (
          <>
            <section className="hero">
              <div className="eyebrow">
                CUSTOMER MANAGEMENT
              </div>

              <h1>
                Customer Details
              </h1>

              <p>
                Complete wallet, order and
                transaction activity.
              </p>

              {customer?.email && (
                <div className="customer-email">
                  {customer.email}
                </div>
              )}

              <div className="customer-id">
                Customer ID:{" "}
                {customer?.id}
              </div>
            </section>

            <section className="stats">
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
                  TOTAL SPENT
                </div>

                <div className="stat-value green">
                  {formatMoney(
                    stats.totalSpent
                  )}
                </div>
              </div>

              <div className="stat">
                <div className="stat-label">
                  TOTAL FUNDING
                </div>

                <div className="stat-value orange">
                  {formatMoney(
                    stats.totalFunding
                  )}
                </div>
              </div>

              <div className="stat">
                <div className="stat-label">
                  BUSINESS PROFIT
                </div>

                <div className="stat-value blue">
                  {formatMoney(
                    stats.totalProfit
                  )}
                </div>
              </div>
            </section>

            <section className="balance-card">
              <div className="balance-top">
                <div>
                  <div className="balance-label">
                    CUSTOMER WALLET BALANCE
                  </div>

                  <div className="balance">
                    {formatMoney(
                      Number(
                        wallet?.balance ??
                          stats.walletBalance ??
                          0
                      )
                    )}
                  </div>

                  {wallet?.id && (
                    <div className="balance-id">
                      Wallet ID:{" "}
                      {wallet.id}
                    </div>
                  )}
                </div>

                <button
                  className="fund-button"
                  onClick={() => {
                    setShowFundsBox(
                      !showFundsBox
                    );
                    setFundError("");
                    setFundMessage("");
                  }}
                >
                  {showFundsBox
                    ? "Close"
                    : "Add / Deduct Funds"}
                </button>
              </div>

              {showFundsBox && (
                <div className="fund-box">
                  <div className="fund-tabs">
                    <button
                      type="button"
                      className={`fund-tab ${
                        fundAction ===
                        "add"
                          ? "active-add"
                          : ""
                      }`}
                      onClick={() => {
                        setFundAction(
                          "add"
                        );
                        setFundError("");
                        setFundMessage("");
                      }}
                    >
                      + Add Funds
                    </button>

                    <button
                      type="button"
                      className={`fund-tab ${
                        fundAction ===
                        "deduct"
                          ? "active-deduct"
                          : ""
                      }`}
                      onClick={() => {
                        setFundAction(
                          "deduct"
                        );
                        setFundError("");
                        setFundMessage("");
                      }}
                    >
                      − Deduct Funds
                    </button>
                  </div>

                  <div className="fund-form">
                    <div className="field">
                      <label>
                        AMOUNT
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Enter amount"
                        value={
                          fundAmount
                        }
                        onChange={(e) =>
                          setFundAmount(
                            e.target
                              .value
                          )
                        }
                      />
                    </div>

                    <div className="field">
                      <label>
                        DESCRIPTION
                      </label>

                      <input
                        type="text"
                        placeholder={
                          fundAction ===
                          "add"
                            ? "Admin wallet funding"
                            : "Admin wallet deduction"
                        }
                        value={
                          fundDescription
                        }
                        onChange={(e) =>
                          setFundDescription(
                            e.target
                              .value
                          )
                        }
                      />
                    </div>

                    <button
                      type="button"
                      className={
                        fundAction ===
                        "add"
                          ? "submit-add"
                          : "submit-deduct"
                      }
                      onClick={
                        handleFunds
                      }
                      disabled={
                        funding
                      }
                    >
                      {funding
                        ? "Processing..."
                        : fundAction ===
                          "add"
                        ? "Add Funds"
                        : "Deduct Funds"}
                    </button>
                  </div>

                  {fundMessage && (
                    <div className="fund-message">
                      {fundMessage}
                    </div>
                  )}

                  {fundError && (
                    <div className="fund-error">
                      {fundError}
                    </div>
                  )}
                </div>
              )}
            </section>

            {refundMessage && (
              <div className="refund-message">
                {refundMessage}
              </div>
            )}

            {refundError && (
              <div className="refund-error">
                {refundError}
              </div>
            )}

            <section className="section">
              <div className="section-header">
                <div className="section-title">
                  Customer Orders
                </div>

                <div className="section-count">
                  {orders.length}{" "}
                  orders
                </div>
              </div>

              <div className="table-wrap">
                {orders.length ===
                0 ? (
                  <div className="empty">
                    This customer has no
                    orders yet.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>
                          NUMBER
                        </th>

                        <th>
                          COUNTRY
                        </th>

                        <th>
                          SERVICE
                        </th>

                        <th>
                          STATUS
                        </th>

                        <th>
                          PRICE
                        </th>

                        <th>
                          PROFIT
                        </th>

                        <th>
                          DATE
                        </th>

                        <th>
                          ACTION
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {orders.map(
                        (order) => {
                          const orderStatus =
                            String(
                              order.status ||
                                ""
                            ).toLowerCase();

                          const isRefunded =
                            orderStatus ===
                              "refunded" ||
                            orderStatus ===
                              "refund";

                          const isRefunding =
                            refundingOrderId ===
                            order.id;

                          return (
                            <tr
                              key={
                                order.id
                              }
                            >
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
                                  order.product ||
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
                                      order.price ??
                                        order.amount ??
                                        0
                                    )
                                  )}
                                </span>
                              </td>

                              <td>
                                <span className="profit">
                                  {formatMoney(
                                    Number(
                                      order.profit ??
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

                              <td>
                                {isRefunded ? (
                                  <button
                                    type="button"
                                    className="refund-button refunded-button"
                                    disabled
                                  >
                                    Refunded
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="refund-button"
                                    onClick={() =>
                                      handleRefund(
                                        order
                                      )
                                    }
                                    disabled={
                                      Boolean(
                                        refundingOrderId
                                      )
                                    }
                                  >
                                    {isRefunding
                                      ? "Refunding..."
                                      : "Refund"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="section">
              <div className="section-header">
                <div className="section-title">
                  Complete Transaction History
                </div>

                <div className="section-count">
                  {filteredTransactions.length}{" "}
                  of{" "}
                  {transactions.length}{" "}
                  transactions
                </div>
              </div>

              <div className="transaction-filter-box">
                <button
                  type="button"
                  className={`transaction-filter ${
                    transactionFilter ===
                    "all"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setTransactionFilter(
                      "all"
                    )
                  }
                >
                  All
                  <span className="filter-count">
                    ({getFilterCount("all")})
                  </span>
                </button>

                <button
                  type="button"
                  className={`transaction-filter ${
                    transactionFilter ===
                    "funding"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setTransactionFilter(
                      "funding"
                    )
                  }
                >
                  Funding
                  <span className="filter-count">
                    ({getFilterCount("funding")})
                  </span>
                </button>

                <button
                  type="button"
                  className={`transaction-filter ${
                    transactionFilter ===
                    "purchase"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setTransactionFilter(
                      "purchase"
                    )
                  }
                >
                  Purchase
                  <span className="filter-count">
                    ({getFilterCount("purchase")})
                  </span>
                </button>

                <button
                  type="button"
                  className={`transaction-filter ${
                    transactionFilter ===
                    "deduction"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setTransactionFilter(
                      "deduction"
                    )
                  }
                >
                  Deduction
                  <span className="filter-count">
                    ({getFilterCount("deduction")})
                  </span>
                </button>

                <button
                  type="button"
                  className={`transaction-filter ${
                    transactionFilter ===
                    "refund"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setTransactionFilter(
                      "refund"
                    )
                  }
                >
                  Refund
                  <span className="filter-count">
                    ({getFilterCount("refund")})
                  </span>
                </button>
              </div>

              <div className="transactions">
                {filteredTransactions.length ===
                0 ? (
                  <div className="empty">
                    No transactions found
                    for this filter.
                  </div>
                ) : (
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>
                          DIRECTION
                        </th>

                        <th>
                          TYPE
                        </th>

                        <th>
                          NUMBER
                        </th>

                        <th>
                          SERVICE
                        </th>

                        <th>
                          AMOUNT
                        </th>

                        <th>
                          STATUS
                        </th>

                        <th>
                          REFERENCE
                        </th>

                        <th>
                          DATE & TIME
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredTransactions.map(
                        (
                          transaction
                        ) => {
                          const direction =
                            getTransactionDirection(
                              transaction
                            );

                          const rawAmount =
                            Number(
                              transaction.amount ??
                                0
                            );

                          const absoluteAmount =
                            Math.abs(
                              rawAmount
                            );

                          const displayAmount =
                            direction ===
                            "credit"
                              ? absoluteAmount
                              : -absoluteAmount;

                          const type =
                            getTransactionType(
                              transaction
                            );

                          return (
                            <tr
                              key={
                                transaction.id
                              }
                            >
                              <td>
                                <span
                                  className={getDirectionClass(
                                    direction
                                  )}
                                >
                                  {direction ===
                                  "credit"
                                    ? "↑ "
                                    : "↓ "}
                                  {getDirectionLabel(
                                    direction
                                  )}
                                </span>
                              </td>

                              <td>
                                <div className="transaction-type">
                                  {type}
                                </div>

                                <div className="transaction-description">
                                  {getTransactionDescription(
                                    transaction
                                  )}
                                </div>
                              </td>

                              <td>
                                <div className="transaction-number">
                                  {getTransactionNumber(
                                    transaction
                                  )}
                                </div>
                              </td>

                              <td>
                                <div className="transaction-service">
                                  {transaction.service ||
                                    "—"}
                                </div>

                                {(transaction.country ||
                                  transaction.operator) && (
                                  <div className="transaction-location">
                                    {[
                                      transaction.country,
                                      transaction.operator,
                                    ]
                                      .filter(
                                        Boolean
                                      )
                                      .join(
                                        " • "
                                      )}
                                  </div>
                                )}
                              </td>

                              <td>
                                <div
                                  className={`transaction-amount ${
                                    displayAmount >=
                                    0
                                      ? "green"
                                      : "red"
                                  }`}
                                >
                                  {displayAmount >=
                                  0
                                    ? "+"
                                    : "-"}
                                  {formatMoney(
                                    Math.abs(
                                      displayAmount
                                    )
                                  )}
                                </div>
                              </td>

                              <td>
                                <span
                                  className={getStatusClass(
                                    transaction.status
                                  )}
                                >
                                  {transaction.status ||
                                    "completed"}
                                </span>
                              </td>

                              <td>
                                <div className="transaction-reference">
                                  {getTransactionReference(
                                    transaction
                                  )}
                                </div>
                              </td>

                              <td>
                                <div className="transaction-date">
                                  {formatDate(
                                    transaction.created_at
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}