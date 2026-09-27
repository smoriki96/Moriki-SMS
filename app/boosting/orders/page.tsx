"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type BoostingOrder = {
  id: string;
  provider_order_id?: string | null;
  service_name?: string | null;
  platform?: string | null;
  category?: string | null;
  link?: string | null;
  quantity?: number | null;
  customer_amount?: number | null;
  status?: string | null;
  failure_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function money(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortId(id: string) {
  return id.length > 10 ? id.slice(0, 8).toUpperCase() : id;
}

function statusClass(status?: string | null) {
  switch (status) {
    case "SUBMITTED":
    case "PENDING":
      return "border-blue-500/20 bg-blue-500/10 text-blue-300";

    case "IN_PROGRESS":
      return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";

    case "PARTIAL":
      return "border-orange-500/20 bg-orange-500/10 text-orange-300";

    case "COMPLETED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

    case "CANCELLED":
    case "FAILED":
    case "REFUNDED":
      return "border-red-500/20 bg-red-500/10 text-red-300";

    case "PROVIDER_UNKNOWN":
      return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";

    default:
      return "border-slate-700 bg-slate-800/50 text-slate-300";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "IN_PROGRESS":
      return "IN PROGRESS";
    case "CANCELLED":
      return "CANCELLED";
    case "PROVIDER_UNKNOWN":
      return "CHECKING";
    default:
      return status ?? "PENDING";
  }
}

function isFinalStatus(status?: string | null) {
  return (
    status === "COMPLETED" ||
    status === "PARTIAL" ||
    status === "CANCELLED" ||
    status === "FAILED" ||
    status === "REFUNDED"
  );
}

export default function BoostingOrdersPage() {
  const [orders, setOrders] = useState<BoostingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadOrders(showLoading = false) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("Please sign in to view your orders.");
        return;
      }

      const response = await fetch("/api/boosting/orders", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ?? "Unable to load your boosting orders."
        );
      }

      setOrders(result.orders ?? []);
      setMessage("");
    } catch (error) {
      console.error("Boosting orders load error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load your boosting orders."
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function refreshOrderStatus(order: BoostingOrder) {
    if (!order.provider_order_id || isFinalStatus(order.status)) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      const response = await fetch(
        `/api/boosting/orders/status?orderId=${encodeURIComponent(order.id)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            Accept: "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        console.error("Order status refresh failed:", result?.error);
        return;
      }

      if (result.status) {
        setOrders((currentOrders) =>
          currentOrders.map((currentOrder) =>
            currentOrder.id === order.id
              ? {
                  ...currentOrder,
                  status: result.status,
                  updated_at: new Date().toISOString(),
                }
              : currentOrder
          )
        );
      }
    } catch (error) {
      console.error("Order status refresh error:", error);
    }
  }

  useEffect(() => {
    loadOrders(true);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const activeOrders = orders.filter(
        (order) =>
          order.provider_order_id && !isFinalStatus(order.status)
      );

      if (activeOrders.length === 0) {
        return;
      }

      await Promise.all(
        activeOrders.map((order) => refreshOrderStatus(order))
      );
    }, 15000);

    return () => window.clearInterval(interval);
  }, [orders]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Boosting Orders</h1>
            <p className="mt-1 text-sm text-slate-400">
              View your social media boosting orders and live provider status.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/boosting"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              New Order
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="font-medium text-white">No boosting orders yet</p>
            <p className="mt-2 text-sm text-slate-400">
              Your boosting orders will appear here.
            </p>

            <Link
              href="/boosting"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Place Your First Order
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Order
                    </p>

                    <p className="mt-1 font-bold text-white">
                      #{shortId(order.id)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                      order.status
                    )}`}
                  >
                    {statusLabel(order.status)}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Service</p>
                    <p className="mt-1 text-sm text-slate-200">
                      {order.service_name ?? "Boosting service"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Platform</p>
                    <p className="mt-1 text-sm text-slate-200">
                      {order.platform ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Quantity</p>
                    <p className="mt-1 text-sm text-slate-200">
                      {Number(order.quantity ?? 0).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {money(Number(order.customer_amount ?? 0))}
                    </p>
                  </div>
                </div>

                {order.link && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-500">Link</p>
                    <p className="mt-1 break-all text-sm text-blue-400">
                      {order.link}
                    </p>
                  </div>
                )}

                {order.provider_order_id && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-500">
                      Provider Order ID
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {order.provider_order_id}
                    </p>
                  </div>
                )}

                {order.failure_reason && (
                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                    {order.failure_reason}
                  </div>
                )}

                <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-500">
                  {order.created_at
                    ? new Date(order.created_at).toLocaleString("en-NG")
                    : "Date unavailable"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
