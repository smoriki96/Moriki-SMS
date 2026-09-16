"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type?: string | null;
  created_at?: string;
};

type WalletTransaction = {
  id: string;
  type?: string | null;
  amount: number | string;
  status?: string | null;
  description?: string | null;
  reference?: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const [balance, setBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);

  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);

  const [notificationIndex, setNotificationIndex] =
    useState(0);

  const [showNotification, setShowNotification] =
    useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  const notificationLoaded = useRef(false);

  const getAuthSession = useCallback(async () => {
    let {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const refreshed =
        await supabase.auth.refreshSession();

      session = refreshed.data.session;
    }

    return session;
  }, []);

  const loadWallet = useCallback(async () => {
    try {
      setWalletLoading(true);

      const session = await getAuthSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const user = session.user;

      setUserEmail(user.email ?? "");

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "";

      setFullName(name);

      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "DASHBOARD WALLET ERROR:",
          error
        );
        return;
      }

      setBalance(
        Number(data?.balance ?? 0)
      );
    } catch (error) {
      console.error(
        "DASHBOARD LOAD ERROR:",
        error
      );
    } finally {
      setWalletLoading(false);
    }
  }, [getAuthSession, router]);

  const loadNotifications = useCallback(
    async () => {
      try {
        const session = await getAuthSession();

        if (!session?.access_token) {
          return;
        }

        const response = await fetch(
          "/api/notifications",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          }
        );

        const contentType =
          response.headers.get("content-type") ||
          "";

        if (!contentType.includes("application/json")) {
          console.error(
            "NOTIFICATION RESPONSE WAS NOT JSON"
          );
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          console.error(
            "NOTIFICATION API ERROR:",
            result
          );
          return;
        }

        const items =
          Array.isArray(result?.notifications)
            ? result.notifications
            : [];

        console.log(
          "CUSTOMER NOTIFICATIONS RECEIVED:",
          items
        );

        if (items.length > 0) {
          setNotifications(items);
          setNotificationIndex(0);
          setShowNotification(true);
        }
      } catch (error) {
        console.error(
          "NOTIFICATION LOAD ERROR:",
          error
        );
      }
    },
    [getAuthSession]
  );

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const session = await getAuthSession();

      if (!mounted) return;

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      await loadWallet();

      if (
        mounted &&
        !notificationLoaded.current
      ) {
        notificationLoaded.current = true;

        setTimeout(() => {
          loadNotifications();
        }, 300);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [
    getAuthSession,
    loadWallet,
    loadNotifications,
    router,
  ]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );
      setLoggingOut(false);
    }
  }

  function handleNotificationContinue() {
    const nextIndex =
      notificationIndex + 1;

    if (
      nextIndex <
      notifications.length
    ) {
      setNotificationIndex(nextIndex);
      return;
    }

    setShowNotification(false);
    setNotifications([]);
    setNotificationIndex(0);
  }

  function formatAmount(amount: number) {
    return new Intl.NumberFormat(
      "en-NG",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(amount);
  }

  const currentNotification =
    notifications[notificationIndex];

  const displayName =
    fullName ||
    userEmail.split("@")[0] ||
    "Customer";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">
              M
            </div>

            <div>
              <div className="text-base font-black leading-none">
                Moriki
                <span className="text-blue-500">
                  SMS
                </span>
              </div>

              <div className="mt-0.5 text-[9px] text-slate-500">
                Virtual numbers made simple
              </div>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500/50 hover:text-red-300 disabled:opacity-50"
          >
            {loggingOut
              ? "Logging out..."
              : "Logout"}
          </button>
        </div>
      </header>

      {/* MAIN */}
      <div className="mx-auto max-w-5xl px-4 py-4">
        {/* WELCOME */}
        <div className="mb-3">
          <p className="text-[11px] text-slate-500">
            Welcome back
          </p>

          <h1 className="text-xl font-bold tracking-tight">
            {displayName}
          </h1>
        </div>

        {/* WALLET + FUND SAME ROW */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span>💰</span>
              <span>Wallet balance</span>
            </div>

            <div className="mt-1 text-xl font-bold">
              ₦
              {walletLoading
                ? "..."
                : formatAmount(balance)}
            </div>
          </div>

          <Link
            href="/wallet/fund"
            className="flex min-h-[82px] items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-3 text-center transition hover:bg-blue-500/20"
          >
            <div>
              <div className="text-lg">
                💳
              </div>

              <div className="mt-0.5 text-xs font-bold text-blue-300">
                Fund Wallet
              </div>

              <div className="mt-0.5 text-[9px] text-slate-500">
                Add money
              </div>
            </div>
          </Link>
        </div>

        {/* QUICK ACTIONS */}
        <div className="mb-3">
          <h2 className="mb-2 text-xs font-semibold text-slate-400">
            Quick actions
          </h2>

          <div className="grid grid-cols-4 gap-2">
            <Link
              href="/numbers"
              className="flex min-h-[76px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-1 py-2 text-center transition hover:border-blue-500/40 hover:bg-slate-800"
            >
              <div className="text-xl">
                📱
              </div>

              <div className="mt-1 text-[10px] font-semibold">
                Numbers
              </div>
            </Link>

            <Link
              href="/orders"
              className="flex min-h-[76px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-1 py-2 text-center transition hover:border-blue-500/40 hover:bg-slate-800"
            >
              <div className="text-xl">
                🧾
              </div>

              <div className="mt-1 text-[10px] font-semibold">
                Orders
              </div>
            </Link>

            <Link
              href="/wallet"
              className="flex min-h-[76px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-1 py-2 text-center transition hover:border-blue-500/40 hover:bg-slate-800"
            >
              <div className="text-xl">
                💰
              </div>

              <div className="mt-1 text-[10px] font-semibold">
                Wallet
              </div>
            </Link>

            <Link
              href="/account"
              className="flex min-h-[76px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-1 py-2 text-center transition hover:border-blue-500/40 hover:bg-slate-800"
            >
              <div className="text-xl">
                👤
              </div>

              <div className="mt-1 text-[10px] font-semibold">
                Account
              </div>
            </Link>
          </div>
        </div>

        {/* SECURITY BANNER */}
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-sm">
            🔐
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-emerald-300">
              Your account is protected
            </p>

            <p className="text-[9px] leading-3.5 text-slate-500">
              Keep your password private and never
              share your login details.
            </p>
          </div>
        </div>

        {/* ACCOUNT EMAIL */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] text-slate-500">
                Signed in as
              </p>

              <p className="truncate text-[11px] font-medium text-slate-300">
                {userEmail}
              </p>
            </div>

            <Link
              href="/account"
              className="shrink-0 text-[10px] font-medium text-blue-400 hover:text-blue-300"
            >
              Account →
            </Link>
          </div>
        </div>
      </div>

      {/* NOTIFICATION MODAL */}
      {showNotification &&
        currentNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-lg">
                  🔔
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-medium uppercase tracking-wider text-blue-400">
                    Notification
                  </p>

                  <h2 className="mt-0.5 text-base font-bold">
                    {currentNotification.title}
                  </h2>
                </div>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {currentNotification.message}
              </p>

              {notifications.length > 1 && (
                <p className="mt-3 text-[10px] text-slate-500">
                  {notificationIndex + 1} of{" "}
                  {notifications.length}
                </p>
              )}

              <button
                onClick={
                  handleNotificationContinue
                }
                className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
              >
                {notificationIndex + 1 <
                notifications.length
                  ? "Continue"
                  : "Got it"}
              </button>
            </div>
          </div>
        )}
    </main>
  );
}