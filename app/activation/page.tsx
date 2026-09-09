"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useSearchParams,
  useRouter,
} from "next/navigation";
import { supabase } from "../../lib/supabase";

type SmsMessage = {
  sender?: string;
  text?: string;
  code?: string;
  created_at?: string;
};

type Order = {
  id: string;
  country?: string | null;
  service?: string | null;
  phone_number?: string | null;
  status?: string | null;
  order_status?: string | null;
  amount?: number | null;
  fivesim_order_id?: number | null;
  created_at?: string | null;
};

function ActivationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("id");

  const [order, setOrder] =
    useState<Order | null>(null);

  const [sms, setSms] =
    useState<SmsMessage[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [checking, setChecking] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const checkRunning =
    useRef(false);

  const getSession = useCallback(
    async () => {
      let {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        const {
          data: refreshData,
        } =
          await supabase.auth.refreshSession();

        session = refreshData.session;
      }

      return session;
    },
    []
  );

  const loadOrder = useCallback(
    async () => {
      if (!orderId) {
        setError(
          "No order ID was provided."
        );
        setLoading(false);
        return;
      }

      try {
        setError("");

        const session =
          await getSession();

        if (!session?.access_token) {
          setError(
            "Your session has expired. Please log in again."
          );
          setLoading(false);
          return;
        }

        const response =
          await fetch(
            `/api/orders/${encodeURIComponent(
              orderId
            )}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                Accept:
                  "application/json",
              },
              cache: "no-store",
            }
          );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          !contentType.includes(
            "application/json"
          )
        ) {
          throw new Error(
            "The server returned an invalid response."
          );
        }

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Unable to load this activation."
          );
        }

        setOrder(result.order);
      } catch (err) {
        console.error(
          "Activation load error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load activation."
        );
      } finally {
        setLoading(false);
      }
    },
    [orderId, getSession]
  );

  const checkFiveSim =
    useCallback(async () => {
      if (
        !orderId ||
        checkRunning.current
      ) {
        return;
      }

      checkRunning.current = true;
      setChecking(true);
      setMessage("");

      try {
        const session =
          await getSession();

        if (!session?.access_token) {
          setError(
            "Your session has expired. Please log in again."
          );
          return;
        }

        const response =
          await fetch(
            `/api/5sim?action=check&orderId=${encodeURIComponent(
              orderId
            )}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                Accept:
                  "application/json",
              },
              cache: "no-store",
            }
          );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          !contentType.includes(
            "application/json"
          )
        ) {
          throw new Error(
            "The server returned an invalid response."
          );
        }

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Unable to check activation."
          );
        }

        if (result.phone) {
          setOrder(
            (previous) =>
              previous
                ? {
                    ...previous,
                    phone_number:
                      result.phone,
                    country:
                      result.country ||
                      previous.country,
                    service:
                      result.service ||
                      previous.service,
                    status:
                      result.status ||
                      previous.status,
                    fivesim_order_id:
                      result.fivesim_order_id ||
                      previous.fivesim_order_id,
                  }
                : previous
          );
        }

        if (
          Array.isArray(result.sms)
        ) {
          setSms(result.sms);
        }

        if (result.status) {
          const smsReceived =
            Array.isArray(
              result.sms
            ) &&
            result.sms.length > 0;

          setMessage(
            smsReceived
              ? "SMS received successfully."
              : `Activation status: ${result.status}`
          );
        }
      } catch (err) {
        console.error(
          "5SIM check error:",
          err
        );

        setMessage(
          err instanceof Error
            ? err.message
            : "Unable to check activation."
        );
      } finally {
        checkRunning.current =
          false;

        setChecking(false);
      }
    }, [orderId, getSession]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (
      !order?.fivesim_order_id
    ) {
      return;
    }

    checkFiveSim();

    const interval =
      setInterval(() => {
        checkFiveSim();
      }, 10000);

    return () =>
      clearInterval(interval);
  }, [
    order?.fivesim_order_id,
    checkFiveSim,
  ]);

  const copyValue = async (
    value: string,
    successMessage: string
  ) => {
    try {
      await navigator.clipboard.writeText(
        value
      );

      setMessage(successMessage);
    } catch {
      setMessage(
        "Unable to copy. Please copy it manually."
      );
    }
  };

  const status =
    order?.status ||
    order?.order_status ||
    "pending";

  const normalizedStatus =
    status.toLowerCase();

  const isReceived =
    sms.length > 0 ||
    normalizedStatus ===
      "received";

  const isFinished =
    normalizedStatus ===
    "finished";

  const isCanceled =
    normalizedStatus ===
      "canceled" ||
    normalizedStatus ===
      "cancelled";

  const statusText =
    isReceived
      ? "SMS Received"
      : isFinished
      ? "Completed"
      : isCanceled
      ? "Canceled"
      : "Waiting for SMS";

  const statusBadge =
    isReceived
      ? "Received"
      : isFinished
      ? "Finished"
      : isCanceled
      ? "Canceled"
      : "Pending";

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
            <button
              onClick={() =>
                router.push("/")
              }
              className="text-xl font-bold tracking-tight"
            >
              Moriki{" "}
              <span className="text-cyan-400">
                SMS
              </span>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/numbers"
                )
              }
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Numbers
            </button>
          </div>
        </header>

        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center shadow-2xl">
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />

            <h1 className="text-2xl font-bold">
              Loading activation...
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Please wait while we load your
              number.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-white/10 bg-slate-950">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
            <button
              onClick={() =>
                router.push("/")
              }
              className="text-xl font-bold tracking-tight"
            >
              Moriki{" "}
              <span className="text-cyan-400">
                SMS
              </span>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-3xl border border-red-400/20 bg-red-500/5 p-8 shadow-2xl">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">
              ⚠️
            </div>

            <h1 className="text-2xl font-bold">
              Activation could not be loaded
            </h1>

            <p className="mt-3 text-sm leading-6 text-red-300">
              {error}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={loadOrder}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Try Again
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/dashboard"
                  )
                }
                className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            onClick={() =>
              router.push("/")
            }
            className="text-xl font-bold tracking-tight"
          >
            Moriki{" "}
            <span className="text-cyan-400">
              SMS
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </button>

            <button
              onClick={() =>
                router.push(
                  "/numbers"
                )
              }
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
            >
              Numbers
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Activation
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your activation
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Keep this page open while waiting
            for your verification SMS.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Your number
                  </p>

                  <h2 className="mt-1 text-xl font-bold">
                    Activation details
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl">
                  📱
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Phone number
                </p>

                <div className="mt-2 flex items-center justify-between gap-4">
                  <p className="break-all text-2xl font-bold tracking-wide text-white sm:text-3xl">
                    {order?.phone_number ||
                      "Waiting..."}
                  </p>

                  {order?.phone_number && (
                    <button
                      onClick={() =>
                        copyValue(
                          order.phone_number ||
                            "",
                          "Phone number copied."
                        )
                      }
                      className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Country
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {order?.country ||
                      "Unknown"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Service
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {order?.service ||
                      "Unknown"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Status
                    </p>

                    <p className="mt-2 font-semibold text-white">
                      {statusText}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      isReceived
                        ? "bg-emerald-400/10 text-emerald-400"
                        : isCanceled
                        ? "bg-red-400/10 text-red-400"
                        : isFinished
                        ? "bg-blue-400/10 text-blue-400"
                        : "bg-amber-400/10 text-amber-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isReceived
                          ? "bg-emerald-400"
                          : isCanceled
                          ? "bg-red-400"
                          : isFinished
                          ? "bg-blue-400"
                          : "animate-pulse bg-amber-400"
                      }`}
                    />

                    {statusBadge}
                  </span>
                </div>
              </div>

              <button
                onClick={checkFiveSim}
                disabled={
                  checking ||
                  !order?.fivesim_order_id
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {checking
                  ? "Checking activation..."
                  : "Refresh activation"}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Verification
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  SMS messages
                </h2>
              </div>

              <button
                onClick={checkFiveSim}
                disabled={
                  checking ||
                  !order?.fivesim_order_id
                }
                className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {checking
                  ? "Checking..."
                  : "Check SMS"}
              </button>
            </div>

            <div className="p-6">
              {sms.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl">
                    💬
                  </div>

                  <h3 className="mt-5 text-lg font-bold">
                    Waiting for SMS
                  </h3>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                    Once your verification message
                    arrives, it will automatically
                    appear here.
                  </p>

                  {order?.fivesim_order_id ? (
                    <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-4 py-2 text-xs font-medium text-amber-400">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                      Automatically checking
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs leading-5 text-amber-400">
                      This order is not connected
                      to a 5SIM activation.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {sms.map(
                    (item, index) => (
                      <div
                        key={`${item.created_at || "sms"}-${index}`}
                        className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500">
                              Sender
                            </p>

                            <p className="mt-1 font-semibold text-white">
                              {item.sender ||
                                "Unknown sender"}
                            </p>
                          </div>

                          {item.code && (
                            <button
                              onClick={() =>
                                copyValue(
                                  item.code ||
                                    "",
                                  "Verification code copied."
                                )
                              }
                              className="rounded-xl bg-emerald-400 px-4 py-2.5 text-lg font-bold tracking-wider text-slate-950 transition hover:bg-emerald-300"
                            >
                              {item.code}
                            </button>
                          )}
                        </div>

                        <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-4">
                          <p className="text-sm leading-6 text-slate-200">
                            {item.text ||
                              "No message text"}
                          </p>
                        </div>

                        {item.created_at && (
                          <p className="mt-3 text-xs text-slate-500">
                            {new Date(
                              item.created_at
                            ).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {message && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-slate-400">
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Order ID
              </p>

              <p className="mt-1 break-all font-mono text-xs text-slate-400">
                {order?.id}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() =>
                  router.push(
                    "/orders"
                  )
                }
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                ← My Orders
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/numbers"
                  )
                }
                className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                Get another number
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ActivationLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />

          <p className="text-slate-400">
            Loading activation...
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ActivationPage() {
  return (
    <Suspense
      fallback={
        <ActivationLoading />
      }
    >
      <ActivationContent />
    </Suspense>
  );
}