"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Country = {
  key: string;
  name: string;
  operators: string[];
};

type Product = {
  name: string;
  category?: string | null;
  quantity: number;
  priceUSD: number;
  basePriceNGN: number;
  profitNGN: number;
  priceNGN: number;
};

type SearchResult = {
  country: string;
  operator: string;
  service: string;
  quantity: number;
  priceUSD: number;
  basePriceNGN: number;
  profitNGN: number;
  priceNGN: number;
  currency: string;
};

function naira(value: number) {
  return `₦${Number(value || 0).toLocaleString("en-NG")}`;
}

function pretty(value: string) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export default function NumbersPage() {
  const router = useRouter();

  const [countries, setCountries] =
    useState<Country[]>([]);

  const [country, setCountry] =
    useState("");

  const [operator, setOperator] =
    useState("");

  const [service, setService] =
    useState("");

  const [products, setProducts] =
    useState<Product[]>([]);

  const [results, setResults] =
    useState<SearchResult[]>([]);

  const [loadingCountries, setLoadingCountries] =
    useState(true);

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  const [searching, setSearching] =
    useState(false);

  const [buying, setBuying] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /*
   * ========================================
   * LOAD COUNTRIES
   * ========================================
   */
  useEffect(() => {
    async function loadCountries() {
      try {
        setLoadingCountries(true);
        setError("");

        const response = await fetch(
          "/api/5sim?action=countries",
          {
            cache: "no-store",
          }
        );

        const text =
          await response.text();

        let data: any;

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            "The server returned an invalid response while loading countries."
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data?.error ||
              "Unable to load countries."
          );
        }

        const incoming =
          Array.isArray(
            data.countries
          )
            ? data.countries
            : [];

        const uniqueMap =
          new Map<
            string,
            Country
          >();

        incoming.forEach(
          (item: any) => {
            const realKey =
              item?.key ||
              item?.code ||
              item?.country;

            if (
              typeof realKey !==
                "string" ||
              !realKey.trim()
            ) {
              return;
            }

            const key =
              realKey
                .trim()
                .toLowerCase();

            const name =
              item?.name ||
              item?.text_en ||
              pretty(key);

            let operators: string[] =
              [];

            if (
              Array.isArray(
                item?.operators
              )
            ) {
              operators =
                item.operators
                  .map(
                    (value: any) =>
                      String(value)
                  )
                  .filter(Boolean);
            }

            /*
             * Some 5SIM responses store
             * operators as object keys.
             */
            if (
              operators.length ===
                0 &&
              item &&
              typeof item ===
                "object"
            ) {
              const ignoredKeys =
                new Set([
                  "key",
                  "code",
                  "country",
                  "name",
                  "text_en",
                  "text_ru",
                  "iso",
                  "prefix",
                ]);

              operators =
                Object.keys(
                  item
                ).filter(
                  (operatorName) =>
                    !ignoredKeys.has(
                      operatorName
                    ) &&
                    item[
                      operatorName
                    ] &&
                    typeof item[
                      operatorName
                    ] === "object"
                );
            }

            operators =
              Array.from(
                new Set(
                  operators
                )
              ).sort();

            uniqueMap.set(
              key,
              {
                key,
                name: String(
                  name
                ),
                operators,
              }
            );
          }
        );

        const unique =
          Array.from(
            uniqueMap.values()
          ).sort((a, b) =>
            a.name.localeCompare(
              b.name
            )
          );

        if (
          unique.length === 0
        ) {
          throw new Error(
            "No valid 5SIM countries were returned."
          );
        }

        setCountries(
          unique
        );
      } catch (err) {
        setCountries([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load countries."
        );
      } finally {
        setLoadingCountries(
          false
        );
      }
    }

    loadCountries();
  }, []);

  /*
   * ========================================
   * SELECTED COUNTRY
   * ========================================
   */
  const selectedCountry =
    useMemo(() => {
      return countries.find(
        (item) =>
          item.key ===
          country
      );
    }, [
      countries,
      country,
    ]);

  const operators =
    useMemo(() => {
      if (
        !selectedCountry
      ) {
        return [];
      }

      return Array.from(
        new Set(
          selectedCountry
            .operators || []
        )
      ).sort();
    }, [
      selectedCountry,
    ]);

  /*
   * ========================================
   * COUNTRY CHANGED
   * ========================================
   */
  useEffect(() => {
    setOperator("");
    setService("");
    setProducts([]);
    setResults([]);
    setMessage("");
  }, [country]);

  /*
   * ========================================
   * LOAD SERVICES
   * ========================================
   */
  useEffect(() => {
    if (!country) {
      return;
    }

    async function loadServices() {
      try {
        setLoadingProducts(
          true
        );
        setError("");
        setService("");
        setResults([]);

        /*
         * If operator is empty,
         * the API will automatically
         * choose a real 5SIM operator.
         */
        const selectedOperator =
          operator || "any";

        const url =
          `/api/5sim?action=products` +
          `&country=${encodeURIComponent(
            country
          )}` +
          `&operator=${encodeURIComponent(
            selectedOperator
          )}`;

        console.log(
          "Loading 5SIM products:",
          {
            country,
            operator:
              selectedOperator,
            url,
          }
        );

        const response =
          await fetch(
            url,
            {
              cache:
                "no-store",
            }
          );

        const text =
          await response.text();

        let data: any;

        try {
          data =
            JSON.parse(
              text
            );
        } catch {
          throw new Error(
            "The server returned an invalid response while loading services."
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data?.error ||
              "Unable to load services."
          );
        }

        /*
         * IMPORTANT:
         *
         * The API returns:
         *
         * {
         *   product: "telegram",
         *   priceUSD: 0.13,
         *   quantity: 55032
         * }
         *
         * NOT:
         *
         * {
         *   name: "telegram"
         * }
         */
        const incoming =
          Array.isArray(
            data.products
          )
            ? data.products
            : [];

        const productMap =
          new Map<
            string,
            Product
          >();

        incoming.forEach(
          (item: any) => {
            const name =
              String(
                item?.product ||
                  item?.name ||
                  ""
              ).trim();

            if (!name) {
              return;
            }

            if (
              !productMap.has(
                name
              )
            ) {
              productMap.set(
                name,
                {
                  name,

                  category:
                    item?.category ||
                    item?.Category ||
                    null,

                  quantity:
                    Number(
                      item?.quantity ||
                        item?.Qty ||
                        0
                    ),

                  priceUSD:
                    Number(
                      item?.priceUSD ||
                        item?.Price ||
                        0
                    ),

                  basePriceNGN:
                    Number(
                      item?.basePriceNGN ||
                        0
                    ),

                  profitNGN:
                    Number(
                      item?.profitNGN ||
                        0
                    ),

                  priceNGN:
                    Number(
                      item?.priceNGN ||
                        0
                    ),
                }
              );
            }
          }
        );

        const unique =
          Array.from(
            productMap.values()
          ).sort((a, b) =>
            a.name.localeCompare(
              b.name
            )
          );

        setProducts(
          unique
        );

        /*
         * The API tells us which real
         * operator was actually used.
         *
         * If the user didn't choose one,
         * select that real operator in
         * the dropdown.
         */
        if (
          !operator &&
          data.operator
        ) {
          setOperator(
            String(
              data.operator
            )
          );
        }
      } catch (err) {
        setProducts([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load services."
        );
      } finally {
        setLoadingProducts(
          false
        );
      }
    }

    loadServices();
  }, [
    country,
    operator,
  ]);

  /*
   * ========================================
   * SEARCH NUMBERS
   * ========================================
   */
  async function searchNumbers() {
    if (!country) {
      setError(
        "Please select a country."
      );
      return;
    }

    if (!operator) {
      setError(
        "Please select an operator."
      );
      return;
    }

    if (!service) {
      setError(
        "Please select a service."
      );
      return;
    }

    try {
      setSearching(true);
      setError("");
      setMessage("");
      setResults([]);

      const url =
        `/api/5sim?action=search` +
        `&country=${encodeURIComponent(
          country
        )}` +
        `&operator=${encodeURIComponent(
          operator
        )}` +
        `&product=${encodeURIComponent(
          service
        )}`;

      console.log(
        "Searching 5SIM numbers:",
        {
          country,
          operator,
          product:
            service,
          url,
        }
      );

      const response =
        await fetch(
          url,
          {
            cache:
              "no-store",
          }
        );

      const text =
        await response.text();

      let data: any;

      try {
        data =
          JSON.parse(
            text
          );
      } catch {
        throw new Error(
          "The server returned an invalid response while searching."
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data?.error ||
            "Unable to search for numbers."
        );
      }

      /*
       * The current API returns the
       * selected product directly,
       * not data.results[].
       *
       * Convert it into the format
       * used by the result cards.
       */
      const found: SearchResult =
        {
          country:
            String(
              data.country ||
                country
            ),

          operator:
            String(
              data.operator ||
                operator
            ),

          service:
            String(
              data.product ||
                service
            ),

          quantity:
            Number(
              data.quantity ||
                0
            ),

          priceUSD:
            Number(
              data.priceUSD ||
                0
            ),

          basePriceNGN:
            Number(
              data.basePriceNGN ||
                0
            ),

          profitNGN:
            Number(
              data.profitNGN ||
                0
            ),

          priceNGN:
            Number(
              data.priceNGN ||
                0
            ),

          currency:
            "NGN",
        };

      if (
        found.quantity <=
        0
      ) {
        setMessage(
          "No available numbers were found for this selection."
        );
        return;
      }

      setResults([
        found,
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to search for numbers."
      );
    } finally {
      setSearching(
        false
      );
    }
  }

  /*
   * ========================================
   * BUY NUMBER
   * ========================================
   */
  async function buyNumber(
    item: SearchResult
  ) {
    try {
      setBuying(true);
      setError("");
      setMessage("");

      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !session
      ) {
        setError(
          "Please log in before purchasing a number."
        );
        return;
      }

      const url =
        `/api/5sim?action=buy` +
        `&country=${encodeURIComponent(
          item.country
        )}` +
        `&operator=${encodeURIComponent(
          item.operator
        )}` +
        `&product=${encodeURIComponent(
          item.service
        )}`;

      console.log(
        "Buying 5SIM number:",
        {
          country:
            item.country,
          operator:
            item.operator,
          product:
            item.service,
        }
      );

      const response =
        await fetch(
          url,
          {
            method:
              "GET",

            cache:
              "no-store",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

      const text =
        await response.text();

      let data: any;

      try {
        data =
          JSON.parse(
            text
          );
      } catch {
        throw new Error(
          "The purchase server returned an invalid response."
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data?.error ||
            "Unable to purchase number."
        );
      }

      const activationData =
        data.data ||
        data;

      try {
        sessionStorage.setItem(
          "moriki_activation",
          JSON.stringify(
            activationData
          )
        );
      } catch {}

      const orderId =
        data.orderId ||
        activationData.orderId ||
        activationData.order_id;

      if (orderId) {
        router.push(
          `/activation?id=${encodeURIComponent(
            String(
              orderId
            )
          )}`
        );
      } else {
        router.push(
          "/activation"
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to purchase number."
      );
    } finally {
      setBuying(false);
    }
  }

  /*
   * ========================================
   * SELECTED PRODUCT
   * ========================================
   */
  const selectedProduct =
    products.find(
      (item) =>
        item.name ===
        service
    );

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #020617;
          color: white;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        button,
        select {
          font-family: inherit;
        }

        .moriki-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(14, 165, 233, 0.16),
              transparent 32%
            ),
            radial-gradient(
              circle at 90% 20%,
              rgba(37, 99, 235, 0.18),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #020617 0%,
              #07142f 50%,
              #020617 100%
            );
        }

        .topbar {
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6%;
          border-bottom: 1px solid
            rgba(148, 163, 184, 0.14);
          background: rgba(
            2,
            6,
            23,
            0.88
          );
          backdrop-filter: blur(16px);
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .brand {
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .brand-white {
          color: white;
        }

        .brand-blue {
          color: #2196f3;
        }

        .nav {
          display: flex;
          gap: 28px;
          align-items: center;
        }

        .nav a {
          color: #94a3b8;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
        }

        .nav a:hover {
          color: #38bdf8;
        }

        .page-container {
          width: min(1200px, 92%);
          margin: 0 auto;
          padding: 70px 0 100px;
        }

        .eyebrow {
          color: #38bdf8;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 15px;
        }

        .hero {
          display: grid;
          grid-template-columns:
            1.35fr 0.65fr;
          gap: 45px;
          align-items: center;
          margin-bottom: 50px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(
            44px,
            6vw,
            72px
          );
          line-height: 0.98;
          letter-spacing: -3px;
        }

        .hero h1 span {
          color: #2196f3;
        }

        .hero p {
          color: #94a3b8;
          font-size: 18px;
          line-height: 1.7;
          max-width: 680px;
          margin-top: 22px;
        }

        .visual {
          min-height: 250px;
          border-radius: 30px;
          border: 1px solid
            rgba(
              56,
              189,
              248,
              0.25
            );
          background:
            radial-gradient(
              circle at 50% 40%,
              rgba(
                14,
                165,
                233,
                0.3
              ),
              transparent 42%
            ),
            rgba(
              15,
              23,
              42,
              0.8
            );
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .visual-phone {
          width: 115px;
          height: 190px;
          border: 5px solid
            #38bdf8;
          border-radius: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 0 60px
              rgba(
                14,
                165,
                233,
                0.55
              );
          transform: rotate(-8deg);
        }

        .visual-phone-inner {
          width: 65px;
          height: 65px;
          border-radius: 50%;
          background: #2196f3;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
        }

        .search-card {
          border-radius: 28px;
          padding: 30px;
          background: rgba(
            15,
            23,
            42,
            0.86
          );
          border: 1px solid
            rgba(
              148,
              163,
              184,
              0.14
            );
          box-shadow:
            0 25px 70px
              rgba(
                0,
                0,
                0,
                0.3
              );
        }

        .search-grid {
          display: grid;
          grid-template-columns:
            1fr 1fr 1fr 160px;
          gap: 18px;
          align-items: end;
        }

        .field label {
          display: block;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 9px;
          text-transform: uppercase;
        }

        .field select {
          width: 100%;
          height: 54px;
          border-radius: 14px;
          border: 1px solid
            #334155;
          background: #020617;
          color: white;
          padding: 0 15px;
          font-size: 15px;
          outline: none;
          cursor: pointer;
        }

        .field select:focus {
          border-color: #2196f3;
          box-shadow:
            0 0 0 3px
              rgba(
                33,
                150,
                243,
                0.12
              );
        }

        .field select:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .search-button {
          height: 54px;
          width: 100%;
          border: 0;
          border-radius: 14px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #0ea5e9,
              #2563eb
            );
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .search-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .alert {
          margin-top: 22px;
          border-radius: 16px;
          padding: 16px 20px;
          font-weight: 600;
        }

        .error {
          background: rgba(
            127,
            29,
            29,
            0.28
          );
          border: 1px solid
            rgba(
              248,
              113,
              113,
              0.3
            );
          color: #fecaca;
        }

        .success {
          background: rgba(
            6,
            78,
            59,
            0.28
          );
          border: 1px solid
            rgba(
              52,
              211,
              153,
              0.3
            );
          color: #a7f3d0;
        }

        .service-card {
          margin-top: 25px;
          border-radius: 24px;
          padding: 25px;
          background: rgba(
            15,
            23,
            42,
            0.75
          );
          border: 1px solid
            rgba(
              148,
              163,
              184,
              0.12
            );
        }

        .service-grid {
          display: grid;
          grid-template-columns:
            1fr 1fr 1fr;
          gap: 20px;
        }

        .service-label {
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .service-value {
          margin-top: 6px;
          font-size: 20px;
          font-weight: 900;
        }

        .price {
          color: #38bdf8;
          font-size: 25px;
        }

        .results {
          margin-top: 30px;
        }

        .results-title {
          font-size: 24px;
          font-weight: 900;
          margin-bottom: 18px;
        }

        .result-card {
          border-radius: 25px;
          padding: 26px;
          margin-bottom: 15px;
          background:
            linear-gradient(
              135deg,
              rgba(
                15,
                23,
                42,
                0.95
              ),
              rgba(
                15,
                23,
                42,
                0.7
              )
            );
          border: 1px solid
            rgba(
              56,
              189,
              248,
              0.12
            );
        }

        .result-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
        }

        .available {
          color: #38bdf8;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .result-name {
          font-size: 24px;
          font-weight: 900;
          margin-top: 8px;
        }

        .badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 13px;
        }

        .badge {
          padding: 7px 11px;
          border-radius: 999px;
          background: #1e293b;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 700;
        }

        .result-right {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .customer-label {
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 800;
        }

        .customer-price {
          color: #38bdf8;
          font-size: 29px;
          font-weight: 900;
          margin-top: 4px;
        }

        .buy-button {
          border: 0;
          border-radius: 14px;
          padding: 15px 24px;
          background:
            linear-gradient(
              135deg,
              #0ea5e9,
              #2563eb
            );
          color: white;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .buy-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty {
          margin-top: 30px;
          min-height: 260px;
          border-radius: 25px;
          border: 1px solid
            rgba(
              148,
              163,
              184,
              0.12
            );
          background: rgba(
            15,
            23,
            42,
            0.55
          );
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 35px;
        }

        .empty-icon {
          width: 70px;
          height: 70px;
          border-radius: 22px;
          margin: 0 auto 18px;
          background:
            linear-gradient(
              135deg,
              #0ea5e9,
              #2563eb
            );
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
        }

        .empty-title {
          font-size: 22px;
          font-weight: 900;
        }

        .empty-text {
          color: #64748b;
          margin-top: 8px;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .visual {
            display: none;
          }

          .search-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .service-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .result-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .result-right {
            width: 100%;
            justify-content: space-between;
          }
        }

        @media (max-width: 600px) {
          .topbar {
            padding: 0 5%;
          }

          .nav {
            gap: 12px;
          }

          .nav a {
            font-size: 12px;
          }

          .page-container {
            padding-top: 45px;
          }

          .hero h1 {
            font-size: 48px;
          }

          .search-grid {
            grid-template-columns: 1fr;
          }

          .service-grid {
            grid-template-columns: 1fr;
          }

          .result-right {
            flex-direction: column;
            align-items: flex-start;
          }

          .buy-button {
            width: 100%;
          }
        }
      `}</style>

      <div className="moriki-page">
        <header className="topbar">
          <div className="brand">
            <span className="brand-white">
              Moriki
            </span>{" "}
            <span className="brand-blue">
              SMS
            </span>
          </div>

          <nav className="nav">
            <a href="/dashboard">
              Dashboard
            </a>

            <a href="/orders">
              Orders
            </a>

            <a href="/wallet">
              Wallet
            </a>
          </nav>
        </header>

        <div className="page-container">
          <section className="hero">
            <div>
              <div className="eyebrow">
                Live Number Marketplace
              </div>

              <h1>
                Browse{" "}
                <span>
                  Numbers.
                </span>
              </h1>

              <p>
                Find available virtual
                numbers from our live
                catalogue. Select your
                country, operator and
                service to see current
                availability and Moriki
                pricing.
              </p>
            </div>

            <div className="visual">
              <div className="visual-phone">
                <div className="visual-phone-inner">
                  ☎
                </div>
              </div>
            </div>
          </section>

          <section className="search-card">
            <div className="search-grid">
              <div className="field">
                <label>
                  Country
                </label>

                <select
                  value={country}
                  onChange={(e) =>
                    setCountry(
                      e.target.value
                    )
                  }
                  disabled={
                    loadingCountries
                  }
                >
                  <option value="">
                    {loadingCountries
                      ? "Loading countries..."
                      : "Select country"}
                  </option>

                  {countries.map(
                    (item) => (
                      <option
                        key={
                          item.key
                        }
                        value={
                          item.key
                        }
                      >
                        {item.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="field">
                <label>
                  Operator
                </label>

                <select
                  value={operator}
                  onChange={(e) =>
                    setOperator(
                      e.target.value
                    )
                  }
                  disabled={
                    !country ||
                    operators.length ===
                      0
                  }
                >
                  <option value="">
                    {!country
                      ? "Select country first"
                      : operators.length ===
                        0
                      ? "No operators available"
                      : "Select operator"}
                  </option>

                  {operators.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {pretty(
                          item
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="field">
                <label>
                  Service
                </label>

                <select
                  value={service}
                  onChange={(e) =>
                    setService(
                      e.target.value
                    )
                  }
                  disabled={
                    !country ||
                    !operator ||
                    loadingProducts ||
                    products.length ===
                      0
                  }
                >
                  <option value="">
                    {!country
                      ? "Select country first"
                      : !operator
                      ? "Select operator first"
                      : loadingProducts
                      ? "Loading services..."
                      : products.length ===
                        0
                      ? "No services available"
                      : "Select service"}
                  </option>

                  {products.map(
                    (item) => (
                      <option
                        key={
                          item.name
                        }
                        value={
                          item.name
                        }
                      >
                        {pretty(
                          item.name
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              <button
                type="button"
                className="search-button"
                onClick={
                  searchNumbers
                }
                disabled={
                  searching ||
                  !country ||
                  !operator ||
                  !service
                }
              >
                {searching
                  ? "Searching..."
                  : "Search Numbers"}
              </button>
            </div>
          </section>

          {error && (
            <div className="alert error">
              {error}
            </div>
          )}

          {message &&
            !error && (
              <div className="alert success">
                {message}
              </div>
            )}

          {selectedProduct && (
            <section className="service-card">
              <div className="service-grid">
                <div>
                  <div className="service-label">
                    Service
                  </div>

                  <div className="service-value">
                    {pretty(
                      selectedProduct.name
                    )}
                  </div>
                </div>

                <div>
                  <div className="service-label">
                    Available
                  </div>

                  <div className="service-value">
                    {selectedProduct.quantity.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="service-label">
                    Moriki Price
                  </div>

                  <div className="service-value price">
                    {naira(
                      selectedProduct.priceNGN
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {results.length > 0 ? (
            <section className="results">
              <div className="results-title">
                Available Numbers
              </div>

              {results.map(
                (
                  item,
                  index
                ) => (
                  <div
                    className="result-card"
                    key={`${item.country}-${item.operator}-${item.service}-${index}`}
                  >
                    <div className="result-row">
                      <div>
                        <div className="available">
                          ● Available
                        </div>

                        <div className="result-name">
                          {pretty(
                            item.service
                          )}
                        </div>

                        <div className="badges">
                          <span className="badge">
                            🌍{" "}
                            {pretty(
                              item.country
                            )}
                          </span>

                          <span className="badge">
                            📡{" "}
                            {pretty(
                              item.operator
                            )}
                          </span>

                          <span className="badge">
                            {Number(
                              item.quantity ||
                                0
                            ).toLocaleString()}{" "}
                            available
                          </span>
                        </div>
                      </div>

                      <div className="result-right">
                        <div>
                          <div className="customer-label">
                            Customer
                            Price
                          </div>

                          <div className="customer-price">
                            {naira(
                              item.priceNGN
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="buy-button"
                          disabled={
                            buying
                          }
                          onClick={() =>
                            buyNumber(
                              item
                            )
                          }
                        >
                          {buying
                            ? "Processing..."
                            : "Buy Number"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </section>
          ) : (
            <section className="empty">
              <div>
                <div className="empty-icon">
                  📱
                </div>

                <div className="empty-title">
                  Find a Number
                </div>

                <div className="empty-text">
                  Select a country,
                  operator and
                  service above,
                  then press{" "}
                  <strong>
                    Search Numbers
                  </strong>{" "}
                  to check live
                  availability.
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}