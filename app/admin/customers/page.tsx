"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Customer = {
  id: string;
  email: string;
  created_at: string;
  banned_until?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

type FilterType = "all" | "active" | "suspended";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  async function getFreshAccessToken() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("SESSION ERROR:", sessionError);
    }

    if (session?.access_token) {
      return session.access_token;
    }

    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (refreshError) {
      console.error("REFRESH SESSION ERROR:", refreshError);
      return null;
    }

    return refreshedSession?.access_token || null;
  }

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      let accessToken = await getFreshAccessToken();

      if (!accessToken) {
        setError("Your login session has expired. Please log in again.");
        return;
      }

      let response = await fetch("/api/admin/customers", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      /*
       * If the API says the token is invalid, refresh the
       * Supabase session once and retry the request.
       */
      if (
        response.status === 401 &&
        (
          result?.error === "Invalid or expired login session." ||
          result?.error === "Unauthorized." ||
          result?.error === "Missing authorization token."
        )
      ) {
        const {
          data: { session: refreshedSession },
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession?.access_token) {
          console.error(
            "SESSION REFRESH FAILED:",
            refreshError
          );

          setError(
            "Your login session has expired. Please log in again."
          );

          return;
        }

        accessToken = refreshedSession.access_token;

        response = await fetch("/api/admin/customers", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        try {
          result = await response.json();
        } catch {
          result = {};
        }
      }

      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to load customers."
        );
      }

      setCustomers(
        Array.isArray(result?.customers)
          ? result.customers
          : []
      );
    } catch (err) {
      console.error("LOAD CUSTOMERS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function isSuspended(customer: Customer) {
    return (
      !!customer.banned_until &&
      new Date(customer.banned_until).getTime() >
        Date.now()
    );
  }

  function getCustomerName(customer: Customer) {
    return (
      customer.user_metadata?.full_name ||
      customer.user_metadata?.name ||
      "Customer"
    );
  }

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const suspended = isSuspended(customer);

      if (filter === "active" && suspended) {
        return false;
      }

      if (filter === "suspended" && !suspended) {
        return false;
      }

      if (!query) {
        return true;
      }

      const name =
        getCustomerName(customer).toLowerCase();

      const email =
        (customer.email || "").toLowerCase();

      const id = customer.id.toLowerCase();

      return (
        name.includes(query) ||
        email.includes(query) ||
        id.includes(query)
      );
    });
  }, [customers, search, filter]);

  const activeCount = customers.filter(
    (customer) => !isSuspended(customer)
  ).length;

  const suspendedCount = customers.filter(
    (customer) => isSuspended(customer)
  ).length;

  async function changeStatus(
    customerId: string,
    action: "suspend" | "activate"
  ) {
    const customer = customers.find(
      (item) => item.id === customerId
    );

    if (!customer) {
      return;
    }

    const name =
      getCustomerName(customer) ||
      customer.email ||
      "this customer";

    const confirmed = window.confirm(
      action === "suspend"
        ? `Are you sure you want to suspend ${name}?`
        : `Are you sure you want to activate ${name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(customerId);
      setError("");

      let accessToken = await getFreshAccessToken();

      if (!accessToken) {
        setError(
          "Your login session has expired. Please log in again."
        );
        return;
      }

      let response = await fetch(
        `/api/admin/customers/${customerId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            action,
          }),
          cache: "no-store",
        }
      );

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      /*
       * Retry once with a freshly refreshed session
       * if the API rejects the current access token.
       */
      if (response.status === 401) {
        const {
          data: { session: refreshedSession },
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (
          !refreshError &&
          refreshedSession?.access_token
        ) {
          accessToken =
            refreshedSession.access_token;

          response = await fetch(
            `/api/admin/customers/${customerId}/status`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                action,
              }),
              cache: "no-store",
            }
          );

          try {
            result = await response.json();
          } catch {
            result = {};
          }
        }
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to update customer status."
        );
      }

      await loadCustomers();
    } catch (err) {
      console.error(
        "CHANGE CUSTOMER STATUS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update customer status."
      );
    } finally {
      setActionLoading("");
    }
  }

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #f8fafc;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(37,99,235,.08),
              transparent 35%
            ),
            #f8fafc;
          color: #111827;
        }

        .container {
          width: 100%;
          max-width: 1250px;
          margin: 0 auto;
          padding: 32px 20px 70px;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 28px;
        }

        .title-area h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 800;
          color: #111827;
        }

        .title-area p {
          margin: 8px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .top-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .admin-link {
          text-decoration: none;
          background: #ffffff;
          border: 1px solid #dbe1ea;
          color: #374151;
          padding: 10px 15px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
        }

        .admin-link:hover {
          background: #f1f5f9;
        }

        .refresh {
          border: none;
          background: #2563eb;
          color: white;
          padding: 10px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
        }

        .refresh:hover {
          background: #1d4ed8;
        }

        .refresh:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
        }

        .stat-label {
          color: #6b7280;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        .stat-value {
          margin-top: 8px;
          font-size: 28px;
          font-weight: 900;
        }

        .stat-total {
          color: #2563eb;
        }

        .stat-active {
          color: #16a34a;
        }

        .stat-suspended {
          color: #dc2626;
        }

        .toolbar {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          gap: 15px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
        }

        .search-input {
          width: 100%;
          height: 44px;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          padding: 0 14px;
          outline: none;
          color: #111827;
          background: #ffffff;
          font-size: 14px;
        }

        .search-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,.10);
        }

        .filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-button {
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #4b5563;
          padding: 9px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
        }

        .filter-button:hover {
          background: #f9fafb;
        }

        .filter-button.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
        }

        .error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 15px 18px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .table-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .table-top {
          padding: 18px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .table-title {
          font-weight: 800;
          color: #111827;
        }

        .result-count {
          color: #6b7280;
          font-size: 13px;
        }

        .loading,
        .empty {
          padding: 60px 20px;
          text-align: center;
          color: #6b7280;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 850px;
        }

        th {
          background: #f9fafb;
          padding: 14px 18px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        td {
          padding: 17px 18px;
          border-bottom: 1px solid #e5e7eb;
          color: #111827;
          font-size: 14px;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #f8fafc;
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        .customer-name {
          font-weight: 800;
          color: #111827;
        }

        .customer-id {
          margin-top: 4px;
          color: #9ca3af;
          font-size: 11px;
          font-family: monospace;
        }

        .email {
          color: #374151;
          word-break: break-word;
        }

        .status {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .status-active {
          background: #dcfce7;
          color: #15803d;
        }

        .status-suspended {
          background: #fee2e2;
          color: #b91c1c;
        }

        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .view-button {
          display: inline-block;
          background: #2563eb;
          color: #ffffff;
          text-decoration: none;
          padding: 8px 13px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 700;
        }

        .view-button:hover {
          background: #1d4ed8;
        }

        .status-button {
          border: none;
          color: #ffffff;
          padding: 8px 13px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .suspend-button {
          background: #dc2626;
        }

        .suspend-button:hover {
          background: #b91c1c;
        }

        .activate-button {
          background: #16a34a;
        }

        .activate-button:hover {
          background: #15803d;
        }

        .status-button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .footer {
          text-align: center;
          margin-top: 30px;
          color: #9ca3af;
          font-size: 12px;
        }

        @media (max-width: 800px) {
          .topbar {
            align-items: flex-start;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .toolbar {
            align-items: stretch;
          }

          .search-box {
            width: 100%;
            min-width: 0;
          }
        }

        @media (max-width: 600px) {
          .container {
            padding: 22px 14px 50px;
          }

          .topbar {
            flex-direction: column;
          }

          .top-actions {
            width: 100%;
          }

          .admin-link,
          .refresh {
            flex: 1;
            text-align: center;
          }

          .title-area h1 {
            font-size: 28px;
          }

          .filters {
            width: 100%;
          }

          .filter-button {
            flex: 1;
          }

          .table-top {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="container">
        <div className="topbar">
          <div className="title-area">
            <h1>Customers</h1>

            <p>
              Manage Moriki SMS customers
            </p>
          </div>

          <div className="top-actions">
            <Link
              href="/admin"
              className="admin-link"
            >
              ← Admin Dashboard
            </Link>

            <button
              onClick={loadCustomers}
              disabled={loading}
              className="refresh"
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <section className="stats">
          <div className="stat">
            <div className="stat-label">
              Total Customers
            </div>

            <div className="stat-value stat-total">
              {customers.length.toLocaleString()}
            </div>
          </div>

          <div className="stat">
            <div className="stat-label">
              Active Customers
            </div>

            <div className="stat-value stat-active">
              {activeCount.toLocaleString()}
            </div>
          </div>

          <div className="stat">
            <div className="stat-label">
              Suspended Customers
            </div>

            <div className="stat-value stat-suspended">
              {suspendedCount.toLocaleString()}
            </div>
          </div>
        </section>

        <section className="toolbar">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, email or customer ID..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="filters">
            <button
              className={`filter-button ${
                filter === "all" ? "active" : ""
              }`}
              onClick={() => setFilter("all")}
            >
              All ({customers.length})
            </button>

            <button
              className={`filter-button ${
                filter === "active" ? "active" : ""
              }`}
              onClick={() => setFilter("active")}
            >
              Active ({activeCount})
            </button>

            <button
              className={`filter-button ${
                filter === "suspended"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter("suspended")
              }
            >
              Suspended ({suspendedCount})
            </button>
          </div>
        </section>

        <div className="table-card">
          <div className="table-top">
            <div className="table-title">
              Customer Management
            </div>

            <div className="result-count">
              Showing {filteredCustomers.length} of{" "}
              {customers.length}
            </div>
          </div>

          {loading ? (
            <div className="loading">
              Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="empty">
              No customers found.
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="empty">
              No customers match your search or filter.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map(
                    (customer) => {
                      const suspended =
                        isSuspended(customer);

                      const name =
                        getCustomerName(customer);

                      const isProcessing =
                        actionLoading ===
                        customer.id;

                      return (
                        <tr
                          key={customer.id}
                        >
                          <td>
                            <div className="customer-name">
                              {name}
                            </div>

                            <div className="customer-id">
                              {customer.id}
                            </div>
                          </td>

                          <td>
                            <div className="email">
                              {customer.email ||
                                "No email"}
                            </div>
                          </td>

                          <td>
                            <span
                              className={`status ${
                                suspended
                                  ? "status-suspended"
                                  : "status-active"
                              }`}
                            >
                              {suspended
                                ? "Suspended"
                                : "Active"}
                            </span>
                          </td>

                          <td>
                            {customer.created_at
                              ? new Date(
                                  customer.created_at
                                ).toLocaleDateString(
                                  "en-NG",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )
                              : "—"}
                          </td>

                          <td>
                            <div className="actions">
                              <Link
                                href={`/admin/customers/${encodeURIComponent(
                                  customer.id
                                )}`}
                                className="view-button"
                              >
                                View
                              </Link>

                              <button
                                className={`status-button ${
                                  suspended
                                    ? "activate-button"
                                    : "suspend-button"
                                }`}
                                onClick={() =>
                                  changeStatus(
                                    customer.id,
                                    suspended
                                      ? "activate"
                                      : "suspend"
                                  )
                                }
                                disabled={
                                  isProcessing
                                }
                              >
                                {isProcessing
                                  ? "Updating..."
                                  : suspended
                                  ? "Activate"
                                  : "Suspend"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="footer">
          Moriki SMS Customer Management
        </div>
      </div>
    </main>
  );
}