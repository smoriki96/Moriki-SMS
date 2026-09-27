"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Service = {
  id: string;
  service: string;
  platform: string;
  category: string;
  name: string;
  min: number;
  max: number;
  pricePer1000: number;
  currency: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);

export default function BoostingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [platform, setPlatform] = useState("All");
  const [serviceId, setServiceId] = useState("");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [wallet, setWallet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const serviceResponse = await fetch("/api/boosting/services", {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        const serviceData = await serviceResponse.json();

        if (!serviceResponse.ok || !serviceData?.success) {
          throw new Error(
            serviceData?.error || "Unable to load boosting services."
          );
        }

        const loadedServices = Array.isArray(serviceData.services)
          ? serviceData.services
          : [];

        setServices(loadedServices);

        const {
          data: walletData,
          error: walletError,
        } = await supabase
          .from("wallets")
          .select("balance")
          .single();

        if (!walletError && walletData) {
          setWallet(Number(walletData.balance ?? 0));
        }

        if (loadedServices.length === 0) {
          setMessage("No boosting services are currently available.");
        }
      } catch (error) {
        console.error("Boosting services load error:", error);
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load boosting services."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);
  const platforms = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(services.map((service) => service.platform))
      ).sort(),
    ];
  }, [services]);

  const filteredServices = useMemo(() => {
    if (platform === "All") return services;

    return services.filter(
      (service) => service.platform === platform
    );
  }, [services, platform]);

  const selectedService = services.find(
    (service) => service.id === serviceId
  );

  const qty = Number(quantity) || 0;

  const total = selectedService
    ? (selectedService.pricePer1000 / 1000) * qty
    : 0;

  function changePlatform(value: string) {
    setPlatform(value);

    if (
      serviceId &&
      !services.find(
        (service) =>
          service.id === serviceId &&
          (value === "All" || service.platform === value)
      )
    ) {
      setServiceId("");
      setQuantity("");
    }
  }

  async function placeOrder() {
    setMessage("");
    setSuccess(false);

    if (!selectedService) {
      setMessage("Please select a service.");
      return;
    }

    if (!link.trim()) {
      setMessage("Please enter the link.");
      return;
    }

    if (
      qty < selectedService.min ||
      qty > selectedService.max
    ) {
      setMessage(
        `Quantity must be between ${selectedService.min.toLocaleString()} and ${selectedService.max.toLocaleString()}.`
      );
      return;
    }

    if (total > wallet) {
      setMessage("Insufficient wallet balance.");
      return;
    }

    setPlacing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("Please sign in again.");
        return;
      }

      const response = await fetch("/api/boosting/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          link: link.trim(),
          quantity: qty,
        }),
      });

      const result = await response.json();

      if (!response.ok && !result?.pending) {
        throw new Error(
          result?.error || "Unable to place order."
        );
      }

      if (result?.success) {
        setSuccess(true);
        const orderId = String(result.order?.id ?? "");
        const shortOrderId = orderId.length > 10 ? orderId.slice(0, 8).toUpperCase() : orderId;
        setMessage(`Order placed successfully. Order #${shortOrderId}`);

        setWallet((current) =>
          Math.max(0, current - Number(result.order.amount ?? total))
        );

        setLink("");
        setQuantity("");
      } else {
        setMessage(
          result?.error ||
            "Your order is being confirmed. Please check your orders."
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to place order."
      );
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-6">
            Loading boosting services...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Back to Dashboard
            </Link>

            <Link
              href="/boosting/orders"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              My Boosting Orders
            </Link>
          </div>

          <p className="text-sm font-medium text-blue-400">
            MORIKI SMS
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Social Boosting
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Grow your social media with fast and reliable services.
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Wallet balance
          </p>

          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {money(wallet)}
          </p>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {platforms.map((item) => (
            <button
              key={item}
              onClick={() => changePlatform(item)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                platform === item
                  ? "bg-blue-600 text-white"
                  : "border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Service
              </label>

              <select
                value={serviceId}
                onChange={(event) => {
                  setServiceId(event.target.value);
                  setQuantity("");
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="">Select a service</option>

                {filteredServices.map((service) => (
                  <option key={service.id} value={service.id}>
                      {service.name} - NGN {service.pricePer1000.toLocaleString()} / 1K
                  </option>
                ))}
              </select>
            </div>

            {selectedService && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Link
                  </label>

                  <input
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Quantity
                  </label>

                  <input
                    type="number"
                    min={selectedService.min}
                    max={selectedService.max}
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    placeholder={`${selectedService.min.toLocaleString()} - ${selectedService.max.toLocaleString()}`}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Minimum: {selectedService.min.toLocaleString()} - Maximum: {selectedService.max.toLocaleString()}
                    Maximum: {selectedService.max.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      Price per 1,000
                    </span>

                    <span className="font-semibold">
                      {money(selectedService.pricePer1000)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      Total
                    </span>

                    <span className="text-xl font-bold text-blue-400">
                      {money(total)}
                    </span>
                  </div>
                </div>
              </>
            )}

            {message && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  success
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/20 bg-red-500/10 text-red-300"
                }`}
              >
                {message}
              </div>
            )}

            <button
              onClick={placeOrder}
              disabled={
                placing ||
                !selectedService ||
                !quantity ||
                total <= 0
              }
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {placing
                ? "Placing order..."
                : `Place Order${total > 0 ? ` - ${money(total)}` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
