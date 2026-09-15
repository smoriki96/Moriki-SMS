"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-black">
            Moriki<span className="text-blue-500">SMS</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-900"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
            >
              Create account
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-400">
            Virtual numbers made simple
          </p>

          <h1 className="text-5xl font-black leading-tight sm:text-6xl">
            Get virtual numbers for your online services.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Buy virtual numbers quickly and manage your SMS activations
            from one simple dashboard.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="rounded-xl bg-white px-6 py-3 font-bold text-slate-950 hover:bg-slate-200"
            >
              Get started
            </Link>

            <Link
              href="/numbers"
              className="rounded-xl border border-slate-700 px-6 py-3 font-bold hover:bg-slate-900"
            >
              View numbers
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Fast activation</h2>
            <p className="mt-3 text-slate-400">
              Get your virtual number and start your activation quickly.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Easy wallet</h2>
            <p className="mt-3 text-slate-400">
              Fund your wallet and use your balance whenever you need it.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Simple dashboard</h2>
            <p className="mt-3 text-slate-400">
              Manage your numbers, orders and account from one place.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
