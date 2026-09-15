"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link
            href="/"
            className="text-2xl font-black tracking-tight"
          >
            <span className="text-white">Moriki</span>
            <span className="text-blue-500"> SMS</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              How it works
            </Link>

            <Link
              href="#numbers"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Virtual numbers
            </Link>
          </nav>

          <Link
            href="/register"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
          >
            Get started
          </Link>

        </div>
      </header>

      <section className="relative overflow-hidden">

        <div className="pointer-events-none absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-24 text-center md:pb-32 md:pt-32">

          <div className="mx-auto mb-6 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
            Virtual numbers made simple
          </div>

          <h1 className="text-5xl font-black tracking-tight sm:text-6xl md:text-8xl">
            <span className="text-white">Moriki</span>
            <span className="text-blue-500"> SMS</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-400 md:text-xl">
            Get reliable virtual phone numbers for SMS verification,
            messaging and online services � all in one simple platform.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">

            <Link
              href="/register"
              className="w-full rounded-xl bg-white px-8 py-4 font-bold text-slate-950 shadow-xl transition hover:bg-slate-200 sm:w-auto"
            >
              Get started
            </Link>

            <Link
              href="#how-it-works"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-8 py-4 font-semibold text-white transition hover:border-slate-500 hover:bg-slate-800 sm:w-auto"
            >
              How it works
            </Link>

          </div>

        </div>
      </section>

      <section
        id="numbers"
        className="border-y border-slate-800 bg-slate-900/40"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">

          <div className="mx-auto max-w-2xl text-center">

            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Virtual numbers
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-5xl">
              Choose the number you need
            </h2>

            <p className="mt-4 text-slate-400">
              Select a country and service, then get your virtual number
              when you need it.
            </p>

          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-7 transition hover:-translate-y-1 hover:border-blue-500/40">

              <div className="flex items-center justify-between">

                <div>
                  <div className="text-4xl">????</div>

                  <h3 className="mt-4 text-2xl font-bold">
                    United States
                  </h3>

                  <p className="mt-2 text-slate-400">
                    USA virtual numbers
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-500">
                    Starting from
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    $5
                  </p>
                </div>

              </div>

              <Link
                href="/numbers?country=US"
                className="mt-7 block rounded-xl bg-white px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                View numbers
              </Link>

            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-7 transition hover:-translate-y-1 hover:border-blue-500/40">

              <div className="flex items-center justify-between">

                <div>
                  <div className="text-4xl">????</div>

                  <h3 className="mt-4 text-2xl font-bold">
                    Mexico
                  </h3>

                  <p className="mt-2 text-slate-400">
                    Mexico virtual numbers
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-500">
                    Starting from
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    $4
                  </p>
                </div>

              </div>

              <Link
                href="/numbers?country=MX"
                className="mt-7 block rounded-xl bg-white px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                View numbers
              </Link>

            </div>

          </div>

        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-6 py-24"
      >

        <div className="text-center">

          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            Simple process
          </p>

          <h2 className="mt-3 text-3xl font-bold md:text-5xl">
            How Moriki SMS works
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Getting a virtual number takes only a few simple steps.
          </p>

        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-lg font-bold text-blue-400">
              01
            </div>

            <h3 className="mt-6 text-xl font-bold">
              Create an account
            </h3>

            <p className="mt-3 leading-7 text-slate-400">
              Sign up for your Moriki SMS account and access your dashboard.
            </p>

          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-lg font-bold text-blue-400">
              02
            </div>

            <h3 className="mt-6 text-xl font-bold">
              Choose a number
            </h3>

            <p className="mt-3 leading-7 text-slate-400">
              Select the country and service you want and purchase an available number.
            </p>

          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-lg font-bold text-blue-400">
              03
            </div>

            <h3 className="mt-6 text-xl font-bold">
              Receive your SMS
            </h3>

            <p className="mt-3 leading-7 text-slate-400">
              View your number and incoming verification messages directly from your account.
            </p>

          </div>

        </div>

      </section>

      <section className="px-6 pb-24">

        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900">

          <div className="relative px-6 py-24 text-center md:px-12 md:py-32">

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-3xl" />

            <div className="relative">

              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
                Welcome to
              </p>

              <h2 className="mt-5 text-5xl font-black tracking-tight sm:text-6xl md:text-8xl">
                <span className="text-white">Moriki</span>
                <span className="text-blue-500"> SMS</span>
              </h2>

              <p className="mx-auto mt-7 max-w-xl text-lg leading-8 text-slate-400">
                Virtual numbers made simple.
                <br />
                Fast. Simple. Built for you.
              </p>

              <Link
                href="/register"
                className="mt-10 inline-block rounded-xl bg-white px-8 py-4 font-bold text-slate-950 transition hover:bg-slate-200"
              >
                Create your account
              </Link>

            </div>

          </div>

        </div>

      </section>

      <footer className="border-t border-slate-800">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-8 md:flex-row">

          <div>
            <span className="font-black text-white">
              Moriki
            </span>
            <span className="font-black text-blue-500">
              {" "}SMS
            </span>
          </div>

          <p className="text-sm text-slate-500">
            Virtual numbers made simple.
          </p>

          <div className="flex gap-5 text-sm text-slate-400">

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
              Register
            </Link>

            <Link
              href="/support"
              className="transition hover:text-white"
            >
              Support
            </Link>

          </div>

        </div>

      </footer>

    </main>
  );
}
