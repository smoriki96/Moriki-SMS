"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-slate-800/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          {/* LOGO */}
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-slate-950 shadow-lg">
              M
            </div>

            <div className="text-xl font-bold tracking-tight">
              Moriki
              <span className="text-blue-500">
                SMS
              </span>
            </div>
          </Link>

          {/* NAVIGATION */}
          <nav className="hidden items-center gap-8 text-sm md:flex">

            <Link
              href="/"
              className="font-medium text-white"
            >
              Home
            </Link>

            <Link
              href="/numbers"
              className="font-medium text-slate-400 transition hover:text-white"
            >
              Get Started
            </Link>

            <a
              href="#how-it-works"
              className="font-medium text-slate-400 transition hover:text-white"
            >
              How it works
            </a>

          </nav>

          {/* MOBILE GET STARTED */}
          <Link
            href="/numbers"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 md:hidden"
          >
            Get Started
          </Link>

        </div>
      </header>


      {/* HERO */}
      <section className="relative overflow-hidden">

        {/* Background glow */}
        <div className="pointer-events-none absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-[680px] max-w-7xl items-center justify-center px-6 py-24">

          <div className="w-full max-w-5xl text-center">

            {/* BADGE */}
            <div className="mb-8 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-5 py-2 text-sm font-medium text-blue-400">
              Virtual SMS numbers
            </div>


            {/* MAIN BRAND */}
            <h1 className="text-6xl font-black tracking-tight sm:text-7xl md:text-8xl lg:text-9xl">
              <span className="text-white">
                Moriki
              </span>
              <span className="text-blue-500">
                SMS
              </span>
            </h1>


            {/* TAGLINE */}
            <p className="mx-auto mt-7 max-w-2xl text-xl font-medium text-slate-300 sm:text-2xl">
              Virtual numbers made simple
            </p>

            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-500">
              Get virtual SMS numbers for your online services
              quickly and easily.
            </p>


            {/* BUTTONS */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">

              <Link
                href="/numbers"
                className="w-full rounded-xl bg-white px-8 py-4 font-semibold text-slate-950 shadow-xl transition hover:bg-slate-200 sm:w-auto"
              >
                Get Started
              </Link>

              <a
                href="#how-it-works"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-8 py-4 font-semibold text-white transition hover:border-slate-600 hover:bg-slate-800 sm:w-auto"
              >
                How it works
              </a>

            </div>


            {/* LARGE DESIGN CARD */}
            <div className="relative mx-auto mt-20 max-w-4xl">

              <div className="absolute inset-0 rounded-3xl bg-blue-600/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl sm:p-16">

                <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-600/10 blur-3xl" />

                <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-blue-600/10 blur-3xl" />

                <div className="relative">

                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-3xl font-black text-slate-950 shadow-xl">
                    M
                  </div>

                  <h2 className="mt-7 text-4xl font-black tracking-tight sm:text-6xl">
                    <span className="text-white">
                      Moriki
                    </span>
                    <span className="text-blue-500">
                      SMS
                    </span>
                  </h2>

                  <p className="mt-4 text-lg text-slate-400">
                    Virtual numbers made simple
                  </p>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="border-t border-slate-800/70 bg-slate-950 px-6 py-24"
      >
        <div className="mx-auto max-w-6xl">

          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
              Simple process
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              How it works
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Get your virtual SMS number in just a few simple steps.
            </p>
          </div>


          <div className="mt-14 grid gap-6 md:grid-cols-3">

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 font-bold text-blue-400">
                01
              </div>

              <h3 className="mt-6 text-xl font-bold">
                Create an account
              </h3>

              <p className="mt-3 leading-7 text-slate-400">
                Sign up for your Moriki SMS account and get started.
              </p>
            </div>


            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 font-bold text-blue-400">
                02
              </div>

              <h3 className="mt-6 text-xl font-bold">
                Choose a number
              </h3>

              <p className="mt-3 leading-7 text-slate-400">
                Select the country and service you need a number for.
              </p>
            </div>


            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 font-bold text-blue-400">
                03
              </div>

              <h3 className="mt-6 text-xl font-bold">
                Receive your SMS
              </h3>

              <p className="mt-3 leading-7 text-slate-400">
                Use your number and receive verification messages directly
                through Moriki SMS.
              </p>
            </div>

          </div>


          <div className="mt-14 text-center">
            <Link
              href="/numbers"
              className="inline-flex rounded-xl bg-white px-8 py-4 font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Get Started
            </Link>
          </div>

        </div>
      </section>


      {/* FOOTER */}
      <footer className="border-t border-slate-800/70 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">

          <p>
            � 2026 Moriki SMS. All rights reserved.
          </p>

          <div className="flex gap-6">
            <Link
              href="/login"
              className="transition hover:text-white"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="transition hover:text-white"
            >
              Create account
            </Link>
          </div>

        </div>
      </footer>

    </main>
  );
}
