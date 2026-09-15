import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="border-b border-slate-800/80">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-950 shadow-lg">
              M
            </div>

            <div className="text-2xl font-black tracking-tight">
              Moriki<span className="text-blue-500">SMS</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center gap-10 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-white transition hover:text-blue-400"
            >
              Home
            </Link>

            <Link
              href="/register"
              className="text-sm font-medium text-slate-400 transition hover:text-white"
            >
              Get Started
            </Link>

            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-400 transition hover:text-white"
            >
              How it works
            </a>
          </nav>

        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">

        {/* Background glow */}
        <div className="pointer-events-none absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl flex-col items-center justify-center px-6 pb-20 text-center">

          {/* Badge */}
          <div className="mb-10 rounded-full border border-blue-500/20 bg-blue-500/10 px-6 py-3 text-sm font-semibold text-blue-400">
            Virtual SMS numbers
          </div>

          {/* Main title */}
          <h1 className="text-6xl font-black tracking-tight sm:text-7xl md:text-8xl lg:text-9xl">
            <span className="text-white">Moriki</span>
            <span className="text-blue-500">SMS</span>
          </h1>

          {/* Subtitle */}
          <h2 className="mt-8 text-2xl font-semibold text-slate-200 sm:text-3xl">
            Virtual numbers made simple
          </h2>

          {/* Description */}
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
            Get virtual SMS numbers for your online services quickly and easily.
          </p>

          {/* Buttons */}
          <div className="mt-12 flex flex-col gap-4 sm:flex-row">

            <Link
              href="/register"
              className="rounded-2xl bg-white px-10 py-4 text-base font-semibold text-slate-950 shadow-xl transition hover:bg-slate-200"
            >
              Get Started
            </Link>

            <a
              href="#how-it-works"
              className="rounded-2xl border border-slate-700 bg-slate-900 px-10 py-4 text-base font-semibold text-white transition hover:border-slate-600 hover:bg-slate-800"
            >
              How it works
            </a>

          </div>

        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-t border-slate-800 bg-slate-950 px-6 py-24"
      >
        <div className="mx-auto max-w-6xl">

          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
              Simple process
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              How it works
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-slate-500">
              Get a virtual number in just a few simple steps.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 font-bold text-blue-400">
                1
              </div>

              <h3 className="text-xl font-bold">
                Create an account
              </h3>

              <p className="mt-3 leading-7 text-slate-500">
                Create your Moriki SMS account and get started.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 font-bold text-blue-400">
                2
              </div>

              <h3 className="text-xl font-bold">
                Choose a number
              </h3>

              <p className="mt-3 leading-7 text-slate-500">
                Select the country and service you need.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 font-bold text-blue-400">
                3
              </div>

              <h3 className="text-xl font-bold">
                Receive your SMS
              </h3>

              <p className="mt-3 leading-7 text-slate-500">
                Use your number and receive your verification SMS.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} MorikiSMS. All rights reserved.
          </p>

          <Link
            href="/login"
            className="transition hover:text-white"
          >
            Login
          </Link>
        </div>
      </footer>

    </main>
  );
}
