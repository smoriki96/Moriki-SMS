"use client";

import { useEffect, useState } from "react";

type Country = {
  code: string;
  name: string;
  iso?: string;
  prefix?: string;
};

type Service = string;

type Operator = {
  operator: string;
  operatorName: string;
  providerPrice: number;
  stock: number;
  customerPrice: number;
  currency: string;
};

export default function NumbersPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  const [country, setCountry] = useState("");
  const [service, setService] = useState("");

  const [loadingCountries, setLoadingCountries] =
    useState(true);
  const [loadingServices, setLoadingServices] =
    useState(false);
  const [loadingOperators, setLoadingOperators] =
    useState(false);

  const [error, setError] = useState("");
  const [buyingOperator, setBuyingOperator] =
    useState("");

  useEffect(() => {
    loadCountries();
  }, []);

  async function loadCountries() {
    try {
      setLoadingCountries(true);
      setError("");

      const response = await fetch(
        "/api/5sim/countries",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load countries."
        );
      }

      setCountries(data.countries || []);
    } catch (err) {
      console.error(
        "COUNTRIES ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load countries."
      );
    } finally {
      setLoadingCountries(false);
    }
  }

  async function handleCountryChange(
    value: string
  ) {
    setCountry(value);
    setService("");
    setServices([]);
    setOperators([]);
    setError("");

    if (!value) return;

    try {
      setLoadingServices(true);

      const response = await fetch(
        `/api/5sim/products?country=${encodeURIComponent(
          value
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load services."
        );
      }

      setServices(
        Array.isArray(data.services)
          ? data.services
          : []
      );
    } catch (err) {
      console.error(
        "SERVICES ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load services."
      );
    } finally {
      setLoadingServices(false);
    }
  }

  async function handleServiceChange(
    value: string
  ) {
    setService(value);
    setOperators([]);
    setError("");

    if (!country || !value) return;

    try {
      setLoadingOperators(true);

      const response = await fetch(
        `/api/5sim/products?country=${encodeURIComponent(
          country
        )}&product=${encodeURIComponent(
          value
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load operators."
        );
      }

      setOperators(
        Array.isArray(data.operators)
          ? data.operators
          : []
      );
    } catch (err) {
      console.error(
        "OPERATORS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load operators."
      );
    } finally {
      setLoadingOperators(false);
    }
  }

  async function buyNumber(
    operator: Operator
  ) {
    if (!country || !service) {
      setError(
        "Please select a country and service first."
      );
      return;
    }

    try {
      setBuyingOperator(
        operator.operator
      );
      setError("");

      /*
       * The buy route receives the exact
       * operator selected by the customer.
       */
      const response = await fetch(
        "/api/5sim/buy",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            country,
            product: service,
            operator:
              operator.operator,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to purchase number."
        );
      }

      /*
       * The number has been successfully
       * provided by 5sim.
       */
      alert(
        `Number purchased successfully!\n\n${data.number}`
      );
    } catch (err) {
      console.error(
        "BUY NUMBER ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to purchase number."
      );
    } finally {
      setBuyingOperator("");
    }
  }

  function formatPrice(
    value: number
  ) {
    return `₦${Math.round(
      Number(value) || 0
    ).toLocaleString("en-NG")}`;
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
        }

        .page {
          min-height: 100vh;
          color: white;
          font-family: Arial, sans-serif;
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
          border-bottom: 1px solid
            rgba(255,255,255,.08);
          background:
            rgba(2,6,23,.96);
        }

        .header-inner {
          max-width: 1100px;
          margin: auto;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          font-size: 25px;
          font-weight: 800;
        }

        .logo span {
          color: #2196f3;
        }

        .nav {
          display: flex;
          gap: 18px;
        }

        .nav a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
        }

        .nav a:hover {
          color: white;
        }

        .container {
          max-width: 1100px;
          margin: auto;
          padding: 45px 20px 70px;
        }

        .label {
          color: #2196f3;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 10px 0;
          font-size: 42px;
        }

        .subtitle {
          color: #94a3b8;
          margin-bottom: 35px;
        }

        .selectors {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .field {
          padding: 20px;
          border-radius: 16px;
          background:
            rgba(15,23,42,.96);
          border: 1px solid
            rgba(255,255,255,.08);
        }

        .field label {
          display: block;
          margin-bottom: 9px;
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 700;
        }

        select {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid #334155;
          background: #020617;
          color: white;
          font-size: 15px;
          outline: none;
        }

        select:focus {
          border-color: #2196f3;
        }

        .error {
          margin-top: 20px;
          padding: 15px;
          border-radius: 10px;
          background:
            rgba(127,29,29,.30);
          border: 1px solid
            rgba(248,113,113,.30);
          color: #fecaca;
        }

        .results {
          margin-top: 30px;
        }

        .results-title {
          margin-bottom: 15px;
          font-size: 20px;
          font-weight: 800;
        }

        .operators {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .operator {
          padding: 20px;
          border-radius: 16px;
          background:
            rgba(15,23,42,.96);
          border: 1px solid
            rgba(255,255,255,.08);
          transition:
            transform .15s ease,
            border-color .15s ease;
        }

        .operator:hover {
          transform: translateY(-2px);
          border-color:
            rgba(33,150,243,.55);
        }

        .operator-name {
          font-size: 18px;
          font-weight: 800;
        }

        .stock {
          margin-top: 7px;
          color: #94a3b8;
          font-size: 13px;
        }

        .price {
          margin-top: 20px;
          font-size: 27px;
          font-weight: 900;
        }

        .buy {
          width: 100%;
          margin-top: 16px;
          padding: 13px;
          border: none;
          border-radius: 10px;
          background:
            linear-gradient(
              135deg,
              #1976d2,
              #2196f3
            );
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .buy:hover {
          opacity: .92;
        }

        .buy:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .loading {
          margin-top: 25px;
          padding: 30px;
          text-align: center;
          color: #94a3b8;
        }

        .empty {
          margin-top: 25px;
          padding: 35px;
          text-align: center;
          border-radius: 16px;
          background:
            rgba(15,23,42,.96);
          color: #94a3b8;
        }

        @media (max-width: 800px) {
          .operators {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .selectors {
            grid-template-columns: 1fr;
          }

          .operators {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 34px;
          }

          .container {
            padding:
              30px 15px 50px;
          }
        }
      `}</style>

      <header className="header">
        <div className="header-inner">
          <div className="logo">
            Moriki <span>SMS</span>
          </div>

          <nav className="nav">
            <a href="/">Home</a>
            <a href="/wallet">Wallet</a>
          </nav>
        </div>
      </header>

      <div className="container">
        <div className="label">
          LIVE INVENTORY
        </div>

        <h1>Buy a Number</h1>

        <p className="subtitle">
          Choose a country, service, and
          operator. Prices and availability
          come from our live provider inventory.
        </p>

        <section className="selectors">
          <div className="field">
            <label htmlFor="country">
              Country
            </label>

            <select
              id="country"
              value={country}
              onChange={(e) =>
                handleCountryChange(
                  e.target.value
                )
              }
              disabled={loadingCountries}
            >
              <option value="">
                {loadingCountries
                  ? "Loading countries..."
                  : "Select country"}
              </option>

              {countries.map(
                (item) => (
                  <option
                    key={item.code}
                    value={item.code}
                  >
                    {item.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="field">
            <label htmlFor="service">
              Service
            </label>

            <select
              id="service"
              value={service}
              onChange={(e) =>
                handleServiceChange(
                  e.target.value
                )
              }
              disabled={
                !country ||
                loadingServices
              }
            >
              <option value="">
                {!country
                  ? "Select country first"
                  : loadingServices
                  ? "Loading services..."
                  : "Select service"}
              </option>

              {services.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </div>
        </section>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {loadingOperators && (
          <div className="loading">
            Loading available operators...
          </div>
        )}

        {!loadingOperators &&
          service &&
          operators.length === 0 && (
            <div className="empty">
              No available operators found
              for this country and service.
            </div>
          )}

        {!loadingOperators &&
          operators.length > 0 && (
            <section className="results">
              <div className="results-title">
                Available Operators
              </div>

              <div className="operators">
                {operators.map(
                  (operator) => (
                    <article
                      className="operator"
                      key={
                        operator.operator
                      }
                    >
                      <div className="operator-name">
                        {
                          operator.operatorName
                        }
                      </div>

                      <div className="stock">
                        {
                          operator.stock
                        }{" "}
                        numbers available
                      </div>

                      <div className="price">
                        {formatPrice(
                          operator.customerPrice
                        )}
                      </div>

                      <button
                        className="buy"
                        onClick={() =>
                          buyNumber(
                            operator
                          )
                        }
                        disabled={
                          buyingOperator ===
                          operator.operator
                        }
                      >
                        {buyingOperator ===
                        operator.operator
                          ? "Processing..."
                          : "Buy Number"}
                      </button>
                    </article>
                  )
                )}
              </div>
            </section>
          )}
      </div>
    </main>
  );
}