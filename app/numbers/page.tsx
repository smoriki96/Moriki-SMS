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
  category: string | null;
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

const REQUEST_TIMEOUT = 15000;

function naira(value: number) {
  return `?${Number(value || 0).toLocaleString("en-NG")}`;
}

function pretty(value: string) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function friendlyError(
  action: "countries" | "services" | "search" | "purchase",
  error: unknown
) {
  console.error(`MORIKI ${action.toUpperCase()} ERROR:`, error);

  if (
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return "The request took too long. Please try again.";
  }

  if (action === "countries") {
    return "Unable to load countries right now. Please refresh and try again.";
  }

  if (action === "services") {
    return "Unable to load services for this selection. Please try another country or operator.";
  }

  if (action === "search") {
    return "We could not find available numbers for this selection. Please try another service or operator.";
  }

  if (action === "purchase") {
    return "We could not complete the purchase right now. Please check your balance and try again.";
  }

  return "Something went wrong. Please try again.";
}

async function fetchJson(
  url: string,
  options: RequestInit = {}
) {
  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();

    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      console.error("MORIKI INVALID JSON RESPONSE:", {
        url,
        status: response.status,
        body: text,
      });

      throw new Error("INVALID_SERVER_RESPONSE");
    }

    if (!response.ok || !data?.success) {
      console.error("MORIKI API FAILURE:", {
        url,
        status: response.status,
        data,
      });

      throw new Error("PROVIDER_REQUEST_FAILED");
    }

    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function NumbersPage() {
  const router = useRouter();

  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState("");
  const [service, setService] = useState("");

  const [countrySearch, setCountrySearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  const [countryOpen, setCountryOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);

  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /*
   * LOAD COUNTRIES
   */
  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      try {
        setLoadingCountries(true);
        setError("");

        const data = await fetchJson(
          "/api/5sim?action=countries"
        );

        if (cancelled) return;

        const incoming = Array.isArray(data.countries)
          ? data.countries
          : [];

        const uniqueMap = new Map<string, Country>();

        incoming.forEach((item: any) => {
          const realKey =
            item.key ||
            item.code ||
            item.country;

          if (
            typeof realKey !== "string" ||
            !realKey.trim()
          ) {
            return;
          }

          const key = realKey
            .trim()
            .toLowerCase();

          const name =
            item.name ||
            item.text_en ||
            pretty(key);

          let operators: string[] = [];

          if (Array.isArray(item.operators)) {
            operators = item.operators
              .map((value: any) => String(value))
              .filter(Boolean);
          }

          if (
            operators.length === 0 &&
            item &&
            typeof item === "object"
          ) {
            const ignoredKeys = new Set([
              "key",
              "code",
              "country",
              "name",
              "text_en",
              "text_ru",
              "iso",
              "prefix",
            ]);

            operators = Object.keys(item).filter(
              (operatorName) =>
                !ignoredKeys.has(operatorName) &&
                item[operatorName] &&
                typeof item[operatorName] === "object"
            );
          }

          operators = Array.from(
            new Set(operators)
          ).sort();

          uniqueMap.set(key, {
            key,
            name: String(name),
            operators,
          });
        });

        const unique = Array.from(
          uniqueMap.values()
        ).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        if (unique.length === 0) {
          throw new Error("NO_COUNTRIES");
        }

        setCountries(unique);
      } catch (err) {
        if (cancelled) return;

        setCountries([]);
        setError(
          friendlyError("countries", err)
        );
      } finally {
        if (!cancelled) {
          setLoadingCountries(false);
        }
      }
    }

    loadCountries();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * FILTER COUNTRIES
   */
  const filteredCountries = useMemo(() => {
    const query = countrySearch
      .trim()
      .toLowerCase();

    if (!query) {
      return countries;
    }

    return countries.filter((item) =>
      `${item.name} ${item.key}`
        .toLowerCase()
        .includes(query)
    );
  }, [countries, countrySearch]);

  /*
   * COUNTRY SEARCH
   */
  function handleCountrySearch(value: string) {
    setCountrySearch(value);
    setCountryOpen(true);
    setError("");
    setMessage("");

    const query = value
      .trim()
      .toLowerCase();

    if (!query) {
      setCountry("");
      return;
    }

    const exact = countries.find(
      (item) =>
        item.name.trim().toLowerCase() === query ||
        item.key.trim().toLowerCase() === query
    );

    if (exact) {
      setCountry(exact.key);
      setCountrySearch(exact.name);
      setCountryOpen(false);
      return;
    }

    const matches = countries.filter((item) =>
      `${item.name} ${item.key}`
        .toLowerCase()
        .includes(query)
    );

    if (matches.length === 1) {
      setCountry(matches[0].key);
      setCountrySearch(matches[0].name);
      setCountryOpen(false);
    }
  }

  /*
   * SELECT COUNTRY
   */
  function selectCountry(item: Country) {
    setCountry(item.key);
    setCountrySearch(item.name);
    setCountryOpen(false);

    setOperator("");
    setService("");
    setServiceSearch("");
    setProducts([]);
    setResults([]);

    setError("");
    setMessage("");
  }

  /*
   * SELECTED COUNTRY
   */
  const selectedCountry = useMemo(() => {
    return countries.find(
      (item) => item.key === country
    );
  }, [countries, country]);

  const operators = useMemo(() => {
    if (!selectedCountry) {
      return [];
    }

    return Array.from(
      new Set(selectedCountry.operators || [])
    ).sort();
  }, [selectedCountry]);

  /*
   * LOAD SERVICES
   */
  useEffect(() => {
    if (!country) {
      return;
    }

    let cancelled = false;

    async function loadServices() {
      try {
        setLoadingProducts(true);
        setError("");
        setService("");
        setServiceSearch("");
        setResults([]);

        const selectedOperator =
          operator || "any";

        const url =
          `/api/5sim?action=products` +
          `&country=${encodeURIComponent(country)}` +
          `&operator=${encodeURIComponent(selectedOperator)}`;

        const data = await fetchJson(url);

        if (cancelled) return;

        const incoming = Array.isArray(
          data.products
        )
          ? data.products
          : [];

        const productMap =
          new Map<string, Product>();

        incoming.forEach((item: any) => {
          const name = String(
            item.product ||
              item.name ||
              ""
          ).trim();

          if (!name) {
            return;
          }

          if (!productMap.has(name)) {
            productMap.set(name, {
              name,
              category:
                item.category ||
                item.Category ||
                null,
              quantity: Number(
                item.quantity ||
                  item.Qty ||
                  0
              ),
              priceUSD: Number(
                item.priceUSD ||
                  item.Price ||
                  0
              ),
              basePriceNGN: Number(
                item.basePriceNGN || 0
              ),
              profitNGN: Number(
                item.profitNGN || 0
              ),
              priceNGN: Number(
                item.priceNGN || 0
              ),
            });
          }
        });

        const unique = Array.from(
          productMap.values()
        ).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        setProducts(unique);

        if (!operator && data.operator) {
          setOperator(String(data.operator));
        }
      } catch (err) {
        if (cancelled) return;

        setProducts([]);
        setError(
          friendlyError("services", err)
        );
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, [country, operator]);

  /*
   * FILTER SERVICES
   */
  const filteredProducts = useMemo(() => {
    const query = serviceSearch
      .trim()
      .toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((item) =>
      `${item.name} ${item.category || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [products, serviceSearch]);

  /*
   * SERVICE SEARCH
   */
  function handleServiceSearch(value: string) {
    setServiceSearch(value);
    setServiceOpen(true);
    setError("");
    setMessage("");

    const query = value
      .trim()
      .toLowerCase();

    if (!query) {
      setService("");
      return;
    }

    const exact = products.find(
      (item) =>
        item.name.trim().toLowerCase() === query ||
        String(item.category || "")
          .trim()
          .toLowerCase() === query
    );

    if (exact) {
      setService(exact.name);
      setServiceSearch(pretty(exact.name));
      setServiceOpen(false);
      return;
    }

    const matches = products.filter((item) =>
      `${item.name} ${item.category || ""}`
        .toLowerCase()
        .includes(query)
    );

    if (matches.length === 1) {
      setService(matches[0].name);
      setServiceSearch(
        pretty(matches[0].name)
      );
      setServiceOpen(false);
    }
  }

  /*
   * SELECT SERVICE
   */
  function selectService(item: Product) {
    setService(item.name);
    setServiceSearch(pretty(item.name));
    setServiceOpen(false);

    setError("");
    setMessage("");
  }

  /*
   * SEARCH NUMBERS
   */
  async function searchNumbers() {
    if (!country) {
      setError("Please select a country.");
      return;
    }

    if (!operator) {
      setError("Please select an operator.");
      return;
    }

    if (!service) {
      setError("Please select a service.");
      return;
    }

    try {
      setSearching(true);
      setError("");
      setMessage("");
      setResults([]);

      const url =
        `/api/5sim?action=search` +
        `&country=${encodeURIComponent(country)}` +
        `&operator=${encodeURIComponent(operator)}` +
        `&product=${encodeURIComponent(service)}`;

      const data = await fetchJson(url);

      const found: SearchResult = {
        country: String(
          data.country || country
        ),
        operator: String(
          data.operator || operator
        ),
        service: String(
          data.product || service
        ),
        quantity: Number(
          data.quantity || 0
        ),
        priceUSD: Number(
          data.priceUSD || 0
        ),
        basePriceNGN: Number(
          data.basePriceNGN || 0
        ),
        profitNGN: Number(
          data.profitNGN || 0
        ),
        priceNGN: Number(
          data.priceNGN || 0
        ),
        currency: "NGN",
      };

      if (found.quantity <= 0) {
        setMessage(
          "No available numbers were found for this selection. Please try another service or operator."
        );
        return;
      }

      setResults([found]);
    } catch (err) {
      setError(
        friendlyError("search", err)
      );
    } finally {
      setSearching(false);
    }
  }

  /*
   * BUY NUMBER
   */
  async function buyNumber(item: SearchResult) {
    if (buying) {
      return;
    }

    try {
      setBuying(true);
      setError("");
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "MORIKI SESSION ERROR:",
          sessionError
        );
      }

      if (!session) {
        setError(
          "Your session has expired. Please log in again."
        );
        return;
      }

      const url =
        `/api/5sim?action=buy` +
        `&country=${encodeURIComponent(item.country)}` +
        `&operator=${encodeURIComponent(item.operator)}` +
        `&product=${encodeURIComponent(item.service)}`;

      const data = await fetchJson(url, {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${session.access_token}`,
        },
      });

      const activationData =
        data.data || data;

      try {
        sessionStorage.setItem(
          "moriki_activation",
          JSON.stringify(activationData)
        );
      } catch (storageError) {
        console.error(
          "MORIKI STORAGE ERROR:",
          storageError
        );
      }

      const orderId =
        data.orderId ||
        activationData.orderId ||
        activationData.order_id;

      if (orderId) {
        router.push(
          `/activation?id=${encodeURIComponent(
            String(orderId)
          )}`
        );
      } else {
        router.push("/activation");
      }
    } catch (err) {
      setError(
        friendlyError("purchase", err)
      );
    } finally {
      setBuying(false);
    }
  }

  const selectedProduct =
    products.find(
      (item) => item.name === service
    );

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #020617;
        }

        body {
          color: white;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        button,
        select,
        input {
          font-family: inherit;
        }

        .moriki-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(14, 165, 233, 0.12),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 20%,
              rgba(37, 99, 235, 0.14),
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
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 5%;
          border-bottom: 1px solid
            rgba(148, 163, 184, 0.12);
          background: rgba(2, 6, 23, 0.92);
          backdrop-filter: blur(16px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .brand {
          font-size: 23px;
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
          gap: 20px;
          align-items: center;
        }

        .nav a {
          color: #94a3b8;
          text-decoration: none;
          font-weight: 700;
          font-size: 13px;
        }

        .nav a:hover {
          color: #38bdf8;
        }

        .page-container {
          width: min(1100px, 94%);
          margin: 0 auto;
          padding: 26px 0 60px;
        }

        .security-warning {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          padding: 10px 13px;
          border: 1px solid
            rgba(250, 204, 21, 0.22);
          border-radius: 12px;
          background: rgba(120, 80, 0, 0.16);
          color: #fde68a;
          font-size: 12px;
          line-height: 1.4;
        }

        .security-warning strong {
          color: #fef3c7;
        }

        .warning-icon {
          flex: 0 0 auto;
          width: 24px;
          height: 24px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(250, 204, 21, 0.15);
          font-size: 13px;
        }

        .hero {
          margin-bottom: 16px;
          padding: 8px 2px 4px;
        }

        .eyebrow {
          color: #38bdf8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(30px, 5vw, 46px);
          line-height: 1;
          letter-spacing: -2px;
        }

        .hero h1 span {
          color: #2196f3;
        }

        .hero p {
          color: #64748b;
          font-size: 13px;
          line-height: 1.4;
          max-width: 600px;
          margin: 8px 0 0;
        }

        .search-card {
          border-radius: 18px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid
            rgba(148, 163, 184, 0.13);
          box-shadow:
            0 20px 50px
            rgba(0, 0, 0, 0.25);
        }

        .search-grid {
          display: grid;
          grid-template-columns:
            1fr 1fr 1fr 145px;
          gap: 10px;
          align-items: end;
        }

        .field label {
          display: block;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.8px;
          margin: 0 0 5px;
          text-transform: uppercase;
        }

        .search-input,
        .field select {
          width: 100%;
          height: 42px;
          border-radius: 10px;
          border: 1px solid #334155;
          background: #020617;
          color: white;
          padding: 0 11px;
          font-size: 13px;
          outline: none;
        }

        .search-input:focus,
        .field select:focus {
          border-color: #2196f3;
          box-shadow:
            0 0 0 2px
            rgba(33, 150, 243, 0.12);
        }

        .search-input::placeholder {
          color: #64748b;
        }

        .field select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .combo {
          position: relative;
          width: 100%;
        }

        .dropdown {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 5px);
          max-height: 240px;
          overflow-y: auto;
          z-index: 100;
          border: 1px solid #334155;
          border-radius: 10px;
          background: #020617;
          box-shadow:
            0 15px 35px
            rgba(0, 0, 0, 0.5);
        }

        .dropdown-item {
          width: 100%;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 0;
          border-bottom: 1px solid
            rgba(148, 163, 184, 0.08);
          background: transparent;
          color: white;
          padding: 8px 11px;
          text-align: left;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .dropdown-item:last-child {
          border-bottom: 0;
        }

        .dropdown-item:hover,
        .dropdown-item-active {
          background: rgba(33, 150, 243, 0.14);
          color: #38bdf8;
        }

        .dropdown-item small {
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .dropdown-empty {
          padding: 14px;
          color: #64748b;
          font-size: 12px;
          text-align: center;
        }

        .search-button {
          height: 42px;
          width: 100%;
          border: 0;
          border-radius: 10px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #0ea5e9,
              #2563eb
            );
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .search-button:hover:not(:disabled) {
          filter: brightness(1.08);
        }

        .search-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .alert {
          margin-top: 10px;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .error {
          background: rgba(127, 29, 29, 0.28);
          border: 1px solid
            rgba(248, 113, 113, 0.3);
          color: #fecaca;
        }

        .success {
          background: rgba(6, 78, 59, 0.28);
          border: 1px solid
            rgba(52, 211, 153, 0.3);
          color: #a7f3d0;
        }

        .service-card {
          margin-top: 10px;
          border-radius: 14px;
          padding: 13px;
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid
            rgba(148, 163, 184, 0.12);
        }

        .service-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        .service-label {
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .service-value {
          margin-top: 3px;
          font-size: 15px;
          font-weight: 900;
        }

        .price {
          color: #38bdf8;
        }

        .results {
          margin-top: 16px;
        }

        .results-title {
          font-size: 17px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .result-card {
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 8px;
          background:
            linear-gradient(
              135deg,
              rgba(15, 23, 42, 0.96),
              rgba(15, 23, 42, 0.75)
            );
          border: 1px solid
            rgba(56, 189, 248, 0.12);
        }

        .result-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .available {
          color: #38bdf8;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .result-name {
          font-size: 17px;
          font-weight: 900;
          margin-top: 3px;
        }

        .badges {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 7px;
        }

        .badge {
          padding: 4px 7px;
          border-radius: 999px;
          background: #1e293b;
          color: #cbd5e1;
          font-size: 9px;
          font-weight: 700;
        }

        .result-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .customer-label {
          color: #64748b;
          font-size: 8px;
          text-transform: uppercase;
          font-weight: 800;
        }

        .customer-price {
          color: #38bdf8;
          font-size: 20px;
          font-weight: 900;
          margin-top: 2px;
        }

        .buy-button {
          border: 0;
          border-radius: 9px;
          padding: 10px 15px;
          background:
            linear-gradient(
              135deg,
              #0ea5e9,
              #2563eb
            );
          color: white;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .buy-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /*
         * IMPORTANT:
         * The large "Find a Number" placeholder is
         * intentionally hidden until search results exist.
         */
        .empty {
          display: none;
        }

        @media (max-width: 900px) {
          .page-container {
            padding-top: 18px;
          }

          .hero p {
            display: none;
          }

          .search-grid {
            grid-template-columns: 1fr 1fr;
          }

          .search-button {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 600px) {
          .topbar {
            height: 56px;
            padding: 0 4%;
          }

          .brand {
            font-size: 19px;
          }

          .nav {
            gap: 10px;
          }

          .nav a {
            font-size: 10px;
          }

          .page-container {
            width: 94%;
            padding: 12px 0 35px;
          }

          .security-warning {
            margin-bottom: 9px;
            padding: 8px 9px;
            font-size: 10px;
            border-radius: 9px;
          }

          .warning-icon {
            width: 20px;
            height: 20px;
            border-radius: 6px;
            font-size: 11px;
          }

          .hero {
            margin-bottom: 9px;
            padding: 2px 1px;
          }

          .eyebrow {
            font-size: 8px;
            letter-spacing: 1.5px;
            margin-bottom: 4px;
          }

          .hero h1 {
            font-size: 28px;
            letter-spacing: -1.2px;
          }

          .search-card {
            padding: 11px;
            border-radius: 13px;
          }

          .search-grid {
            grid-template-columns: 1fr;
            gap: 7px;
          }

          .field label {
            display: inline-block;
            margin-bottom: 3px;
            font-size: 9px;
          }

          .search-input,
          .field select {
            height: 38px;
            border-radius: 8px;
            font-size: 12px;
            padding: 0 9px;
          }

          .search-button {
            height: 38px;
            grid-column: auto;
            border-radius: 8px;
            font-size: 11px;
          }

          .service-grid {
            grid-template-columns:
              1fr 1fr 1fr;
            gap: 7px;
          }

          .service-card {
            padding: 10px;
            border-radius: 10px;
          }

          .service-value {
            font-size: 12px;
          }

          .results {
            margin-top: 12px;
          }

          .results-title {
            font-size: 15px;
            margin-bottom: 7px;
          }

          .result-card {
            padding: 11px;
            border-radius: 10px;
          }

          .result-row {
            gap: 8px;
          }

          .result-name {
            font-size: 14px;
          }

          .result-right {
            gap: 7px;
          }

          .customer-price {
            font-size: 16px;
          }

          .buy-button {
            padding: 8px 10px;
            font-size: 9px;
          }

          .badge {
            font-size: 8px;
            padding: 3px 5px;
          }
        }

        @media (max-width: 390px) {
          .nav {
            gap: 7px;
          }

          .nav a {
            font-size: 9px;
          }

          .security-warning {
            font-size: 9px;
          }

          .hero h1 {
            font-size: 25px;
          }

          .search-card {
            padding: 9px;
          }

          .search-input,
          .field select,
          .search-button {
            height: 36px;
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

        <main className="page-container">

          <div className="security-warning">
            <div className="warning-icon">
              !
            </div>

            <div>
              <strong>Security reminder:</strong>{" "}
              Enable 2FA and add a recovery email to
              protect your account and purchased
              services. Use a trusted VPN when
              appropriate.
            </div>
          </div>

          <section className="hero">
            <div className="eyebrow">
              Live Number Marketplace
            </div>

            <h1>
              Browse{" "}
              <span>Virtual Numbers.</span>
            </h1>

            <p>
              Select a country, operator and service
              to check live number availability.
            </p>
          </section>

          <section className="search-card">
            <div className="search-grid">

              <div className="field">
                <label>
                  Country
                </label>

                <div className="combo">
                  <input
                    className="search-input"
                    value={countrySearch}
                    onChange={(e) =>
                      handleCountrySearch(
                        e.target.value
                      )
                    }
                    onFocus={() =>
                      setCountryOpen(true)
                    }
                    placeholder={
                      loadingCountries
                        ? "Loading..."
                        : "Search country..."
                    }
                    disabled={
                      loadingCountries
                    }
                    autoComplete="off"
                  />

                  {countryOpen &&
                    !loadingCountries && (
                      <div className="dropdown">
                        {filteredCountries.length >
                        0 ? (
                          filteredCountries
                            .slice(0, 12)
                            .map((item) => (
                              <button
                                type="button"
                                key={item.key}
                                className={`dropdown-item ${
                                  item.key ===
                                  country
                                    ? "dropdown-item-active"
                                    : ""
                                }`}
                                onMouseDown={(e) =>
                                  e.preventDefault()
                                }
                                onClick={() =>
                                  selectCountry(
                                    item
                                  )
                                }
                              >
                                <span>
                                  {item.name}
                                </span>

                                <small>
                                  {item.key.toUpperCase()}
                                </small>
                              </button>
                            ))
                        ) : (
                          <div className="dropdown-empty">
                            No countries found
                          </div>
                        )}
                      </div>
                    )}
                </div>
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
                    operators.length === 0
                  }
                >
                  <option value="">
                    {!country
                      ? "Select country first"
                      : operators.length === 0
                        ? "No operators"
                        : "Select operator"}
                  </option>

                  {operators.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {pretty(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>
                  Service
                </label>

                <div className="combo">
                  <input
                    className="search-input"
                    value={serviceSearch}
                    onChange={(e) =>
                      handleServiceSearch(
                        e.target.value
                      )
                    }
                    onFocus={() => {
                      if (
                        country &&
                        operator &&
                        !loadingProducts
                      ) {
                        setServiceOpen(true);
                      }
                    }}
                    placeholder={
                      !country
                        ? "Select country"
                        : !operator
                          ? "Select operator"
                          : loadingProducts
                            ? "Loading..."
                            : "Search service..."
                    }
                    disabled={
                      !country ||
                      !operator ||
                      loadingProducts
                    }
                    autoComplete="off"
                  />

                  {serviceOpen &&
                    country &&
                    operator &&
                    !loadingProducts && (
                      <div className="dropdown">
                        {filteredProducts.length >
                        0 ? (
                          filteredProducts
                            .slice(0, 12)
                            .map((item) => (
                              <button
                                type="button"
                                key={item.name}
                                className={`dropdown-item ${
                                  item.name ===
                                  service
                                    ? "dropdown-item-active"
                                    : ""
                                }`}
                                onMouseDown={(e) =>
                                  e.preventDefault()
                                }
                                onClick={() =>
                                  selectService(
                                    item
                                  )
                                }
                              >
                                <span>
                                  {pretty(
                                    item.name
                                  )}
                                </span>

                                {item.category && (
                                  <small>
                                    {pretty(
                                      item.category
                                    )}
                                  </small>
                                )}
                              </button>
                            ))
                        ) : (
                          <div className="dropdown-empty">
                            No matching services
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>

              <button
                type="button"
                className="search-button"
                onClick={searchNumbers}
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

          {message && !error && (
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

          {results.length > 0 && (
            <section className="results">
              <div className="results-title">
                Available Numbers
              </div>

              {results.map(
                (item, index) => (
                  <div
                    className="result-card"
                    key={`${item.country}-${item.operator}-${item.service}-${index}`}
                  >
                    <div className="result-row">

                      <div>
                        <div className="available">
                          Available
                        </div>

                        <div className="result-name">
                          {pretty(
                            item.service
                          )}
                        </div>

                        <div className="badges">
                          <span className="badge">
                            {pretty(
                              item.country
                            )}
                          </span>

                          <span className="badge">
                            {pretty(
                              item.operator
                            )}
                          </span>

                          <span className="badge">
                            {Number(
                              item.quantity || 0
                            ).toLocaleString()}{" "}
                            available
                          </span>
                        </div>
                      </div>

                      <div className="result-right">

                        <div>
                          <div className="customer-label">
                            Customer Price
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
                          disabled={buying}
                          onClick={() =>
                            buyNumber(item)
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
          )}

        </main>
      </div>
    </>
  );
}
