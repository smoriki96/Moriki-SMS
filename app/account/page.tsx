"use client";

import { useEffect, useState } from "react";
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
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    setEmail(user.email || "");
    setFullName(user.user_metadata?.full_name || "");
    setCreatedAt(user.created_at || "");

    setLoading(false);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");

    if (!fullName.trim()) {
      setMessageType("error");
      setMessage("Please enter your full name.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
      },
    });

    setSaving(false);

    if (error) {
      setMessageType("error");
      setMessage(error.message);
      return;
    }

    setMessageType("success");
    setMessage("Your account details have been updated successfully.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-white" />
          <p className="text-slate-400">Loading account...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-slate-950">
              M
            </div>

            <div>
              <div className="font-bold">Moriki SMS</div>
              <div className="text-xs text-slate-500">
                Account Management
              </div>
            </div>
          </Link>

          <Link
            href="/admin/dashboard"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-slate-500">
            MY ACCOUNT
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Account Management
          </h1>

          <p className="mt-2 text-slate-400">
            Manage your Moriki SMS account information and security.
          </p>
        </div>

        {/* Profile card */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Profile information</h2>
            <p className="mt-1 text-sm text-slate-500">
              Update the name associated with your account.
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                messageType === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Full name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                disabled={saving}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Email address
              </label>

              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-500 outline-none"
              />

              <p className="mt-2 text-xs text-slate-600">
                Your login email cannot be changed from this page.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>

        {/* Account information */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Account information</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Email
              </p>
              <p className="mt-2 break-all font-medium text-white">
                {email}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Account created
              </p>
              <p className="mt-2 font-medium text-white">
                {createdAt
                  ? new Date(createdAt).toLocaleDateString()
                  : "Unavailable"}
              </p>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Security</h2>

          <p className="mt-2 text-sm text-slate-400">
            Keep your account secure by using a strong password.
          </p>

          <Link
            href="/reset-password"
            className="mt-5 inline-flex rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-800"
          >
            Change password
          </Link>
        </section>

        {/* Customer care */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">Customer Care</h2>
              <p className="mt-2 text-sm text-slate-400">
                Need help with your account, numbers, wallet, or an order?
              </p>
            </div>

            <Link
              href="/support"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Contact Support
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
