"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #020617;
          font-family: Arial, sans-serif;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 15% 10%,
              rgba(33,150,243,.18),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 30%,
              rgba(59,130,246,.12),
              transparent 30%
            ),
            #020617;
          color: white;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(2,6,23,.88);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .headerInner {
          max-width: 1150px;
          margin: auto;
          padding: 17px 20px;
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

        .nav {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .nav a {
          color: #cbd5e1;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
        }

        .nav a:hover {
          color: white;
        }

        .hero {
          max-width: 1150px;
          margin: auto;
          min-height: 650px;
          padding: 90px 20px;
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 50px;
          align-items: center;
        }

        .badge {
          display: inline-block;
          padding: 8px 13px;
          border-radius: 999px;
          background: rgba(33,150,243,.12);
          border: 1px solid rgba(33,150,243,.25);
          color: #60a5fa;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        h1 {
          margin: 20px 0;
          font-size: clamp(45px, 7vw, 72px);
          line-height: 1;
        }

        h1 span {
          color: #2196f3;
        }

        .heroText {
          max-width: 650px;
          color: #94a3b8;
          font-size: 18px;
          line-height: 1.8;
        }

        .buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .button {
          padding: 15px 22px;
          border-radius: 11px;
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
        }

        .primary {
          background: linear-gradient(
            135deg,
            #1976d2,
            #2196f3
          );
        }

        .secondary {
          background: #0f172a;
          border: 1px solid rgba(255,255,255,.1);
        }

        .visual {
          min-height: 430px;
          border-radius: 30px;
          padding: 25px;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(
              145deg,
              rgba(33,150,243,.18),
              rgba(15,23,42,.95)
            );
          border: 1px solid rgba(255,255,255,.1);
          box-shadow: 0 30px 80px rgba(0,0,0,.35);
        }

        .phone {
          position: absolute;
          width: 210px;
          height: 365px;
          left: 50%;
          top: 50%;
          transform: translate(-50%,-50%);
          border-radius: 30px;
          background: #020617;
          border: 5px solid #334155;
          box-shadow: 0 25px 60px rgba(0,0,0,.5);
          padding: 35px 18px;
        }

        .phoneTop {
          width: 70px;
          height: 7px;
          border-radius: 10px;
          background: #334155;
          margin: -18px auto 30px;
        }

        .screen {
          border-radius: 18px;
          padding: 18px;
          background: linear-gradient(
            180deg,
            #0f172a,
            #020617
          );
        }

        .screenTitle {
          font-weight: 900;
          margin-bottom: 20px;
        }

        .number {
          padding: 13px;
          margin-bottom: 10px;
          border-radius: 10px;
          background: rgba(33,150,243,.12);
          border: 1px solid rgba(33,150,243,.2);
          font-size: 12px;
        }

        .number strong {
          display: block;
          color: #60a5fa;
          margin-bottom: 5px;
        }

        .section {
          max-width: 1150px;
          margin: auto;
          padding: 80px 20px;
        }

        .sectionTitle {
          text-align: center;
          max-width: 650px;
          margin: auto auto 45px;
        }

        .sectionTitle h2 {
          font-size: 38px;
          margin: 10px 0;
        }

        .sectionTitle p {
          color: #94a3b8;
          line-height: 1.7;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 20px;
        }

        .card {
          padding: 28px;
          min-height: 220px;
          border-radius: 20px;
          background: rgba(15,23,42,.9);
          border: 1px solid rgba(255,255,255,.08);
        }

        .cardIcon {
          width: 55px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: rgba(33,150,243,.12);
          font-size: 27px;
          margin-bottom: 20px;
        }

        .card h3 {
          font-size: 20px;
          margin: 0 0 10px;
        }

        .card p {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.7;
          margin: 0;
        }

        .countries {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 14px;
        }

        .country {
          padding: 18px;
          border-radius: 14px;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,.07);
          text-align: center;
          color: #cbd5e1;
          font-weight: 800;
        }

        .country span {
          display: block;
          font-size: 28px;
          margin-bottom: 8px;
        }

        .cta {
          max-width: 1000px;
          margin: 50px auto 80px;
          padding: 55px 25px;
          text-align: center;
          border-radius: 25px;
          background:
            linear-gradient(
              135deg,
              rgba(25,118,210,.25),
              rgba(15,23,42,.95)
            );
          border: 1px solid rgba(33,150,243,.2);
        }

        .cta h2 {
          font-size: 35px;
          margin: 0 0 12px;
        }

        .cta p {
          color: #94a3b8;
          margin-bottom: 25px;
        }

        .footer {
          padding: 30px 20px;
          text-align: center;
          color: #64748b;
          border-top: 1px solid rgba(255,255,255,.07);
          font-size: 13px;
        }

        @media (max-width: 850px) {
          .hero {
            grid-template-columns: 1fr;
            padding-top: 60px;
          }

          .visual {
            min-height: 400px;
          }

          .cards {
            grid-template-columns: 1fr;
          }

          .countries {
            grid-template-columns: repeat(2,1fr);
          }

          .nav a:nth-child(2),
          .nav a:nth-child(3) {
            display: none;
          }
        }

        @media (max-width: 500px) {
          .headerInner {
            padding: 15px;
          }

          .nav {
            gap: 9px;
          }

          .nav a {
            font-size: 12px;
          }

          .hero {
            padding: 55px 16px;
          }

          .section {
            padding: 60px 16px;
          }

          .countries {
            grid-template-columns: 1fr 1fr;
          }

          .phone {
            transform: translate(-50%,-50%) scale(.85);
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <Link href="/" className="logo">
            Moriki <span>SMS</span>
          </Link>

          <nav className="nav">
            <Link href="/numbers">Numbers</Link>
            <Link href="/wallet">Wallet</Link>
            <Link href="/orders">Orders</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div>
          <div className="badge">
            VIRTUAL NUMBERS MADE SIMPLE
          </div>

          <h1>
            Virtual numbers for your{" "}
            <span>business</span>
          </h1>

          <p className="heroText">
            Choose virtual numbers from different
            countries and manage your purchases,
            wallet, and orders from one simple
            platform.
          </p>

          <div className="buttons">
            <Link
              href="/numbers"
              className="button primary"
            >
              Browse Numbers
            </Link>

            <Link
              href="/dashboard"
              className="button secondary"
            >
              My Dashboard
            </Link>
          </div>
        </div>

        <div className="visual">
          <div className="phone">
            <div className="phoneTop" />

            <div className="screen">
              <div className="screenTitle">
                Moriki SMS
              </div>

              <div className="number">
                <strong>🇺🇸 United States</strong>
                Virtual Number
              </div>

              <div className="number">
                <strong>🇬🇧 United Kingdom</strong>
                Virtual Number
              </div>

              <div className="number">
                <strong>🇳🇬 Nigeria</strong>
                Virtual Number
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <div className="badge">
            WHY MORIKI SMS
          </div>

          <h2>
            Everything in one place
          </h2>

          <p>
            Buy numbers, manage your wallet and
            keep track of your orders from your
            account.
          </p>
        </div>

        <div className="cards">
          <div className="card">
            <div className="cardIcon">
              📱
            </div>

            <h3>
              Virtual Numbers
            </h3>

            <p>
              Browse available numbers by country
              and service and choose the option
              that works for you.
            </p>
          </div>

          <div className="card">
            <div className="cardIcon">
              💳
            </div>

            <h3>
              Easy Wallet
            </h3>

            <p>
              Add funds to your wallet and use
              your available balance when buying
              numbers.
            </p>
          </div>

          <div className="card">
            <div className="cardIcon">
              📋
            </div>

            <h3>
              Orders
            </h3>

            <p>
              Keep track of your purchased numbers
              and activation orders from your
              account.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <div className="badge">
            AVAILABLE COUNTRIES
          </div>

          <h2>
            Numbers from around the world
          </h2>

          <p>
            More countries can be added as
            numbers become available.
          </p>
        </div>

        <div className="countries">
          <div className="country">
            <span>🇺🇸</span>
            United States
          </div>

          <div className="country">
            <span>🇬🇧</span>
            United Kingdom
          </div>

          <div className="country">
            <span>🇨🇦</span>
            Canada
          </div>

          <div className="country">
            <span>🇳🇬</span>
            Nigeria
          </div>

          <div className="country">
            <span>🇿🇦</span>
            South Africa
          </div>

          <div className="country">
            <span>🇲🇽</span>
            Mexico
          </div>

          <div className="country">
            <span>🇩🇪</span>
            Germany
          </div>

          <div className="country">
            <span>🇫🇷</span>
            France
          </div>
        </div>
      </section>

      <section className="cta">
        <h2>
          Ready to get a number?
        </h2>

        <p>
          Browse available countries and
          services now.
        </p>

        <Link
          href="/numbers"
          className="button primary"
        >
          Browse Numbers
        </Link>
      </section>

      <footer className="footer">
        © {new Date().getFullYear()} Moriki SMS.
        All rights reserved.
      </footer>
    </main>
  );
}