"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMIN_EMAIL = "namoriki30@gmail.com";

type Ticket = {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  attachment_url: string | null;
  customer_email: string;
  created_at: string;
  updated_at: string;
};

export default function AdminSupportPage() {
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState("");
  const [pageMessageType, setPageMessageType] = useState<
    "success" | "error"
  >("error");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    setLoading(true);
    setPageMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      if (
        !user.email ||
        user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
      ) {
        router.replace("/login");
        return;
      }

      await loadTickets();
    } catch (error) {
      console.error("ADMIN SUPPORT PAGE ERROR:", error);

      setPageMessageType("error");
      setPageMessage(
        error instanceof Error
          ? error.message
          : "Unable to load support requests."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadTickets() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/support", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load support requests."
        );
      }

      setTickets(data.tickets || []);
    } catch (error) {
      console.error("LOAD ADMIN SUPPORT ERROR:", error);

      setPageMessageType("error");
      setPageMessage(
        error instanceof Error
          ? error.message
          : "Unable to load support requests."
      );
    }
  }

  async function saveTicket(
    ticketId: string,
    status: string,
    adminReply: string
  ) {
    setSavingId(ticketId);
    setPageMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `/api/admin/support/${ticketId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            admin_reply: adminReply,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to update support request."
        );
      }

      setTickets((currentTickets) =>
        currentTickets.map((ticket) =>
          ticket.id === ticketId
            ? {
                ...ticket,
                status: data.ticket.status,
                admin_reply: data.ticket.admin_reply,
                updated_at: data.ticket.updated_at,
              }
            : ticket
        )
      );

      setPageMessageType("success");
      setPageMessage("Support request updated successfully.");
    } catch (error) {
      console.error("SAVE SUPPORT ERROR:", error);

      setPageMessageType("error");
      setPageMessage(
        error instanceof Error
          ? error.message
          : "Unable to update support request."
      );
    } finally {
      setSavingId(null);
    }
  }

  function updateTicketField(
    ticketId: string,
    field: "status" | "admin_reply",
    value: string
  ) {
    setTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              [field]: value,
            }
          : ticket
      )
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "30px",
            borderRadius: "16px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          }}
        >
          Loading Customer Care...
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          background: "#111827",
          color: "#ffffff",
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
            }}
          >
            Moriki SMS Customer Care
          </h1>

          <p
            style={{
              margin: "5px 0 0",
              color: "#d1d5db",
              fontSize: "14px",
            }}
          >
            Manage customer support requests
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => router.push("/admin")}
            style={{
              border: "1px solid #374151",
              background: "#1f2937",
              color: "#ffffff",
              padding: "10px 15px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Admin Dashboard
          </button>

          <button
            onClick={handleLogout}
            style={{
              border: "none",
              background: "#dc2626",
              color: "#ffffff",
              padding: "10px 15px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "30px 20px 60px",
        }}
      >
        {pageMessage && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              borderRadius: "10px",
              background:
                pageMessageType === "success"
                  ? "#dcfce7"
                  : "#fee2e2",
              color:
                pageMessageType === "success"
                  ? "#166534"
                  : "#991b1b",
              border:
                pageMessageType === "success"
                  ? "1px solid #86efac"
                  : "1px solid #fecaca",
            }}
          >
            {pageMessage}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                color: "#111827",
              }}
            >
              Support Requests
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#6b7280",
              }}
            >
              {tickets.length} request
              {tickets.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            onClick={loadTickets}
            style={{
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {tickets.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "45px 20px",
              textAlign: "center",
              boxShadow: "0 5px 20px rgba(0,0,0,0.06)",
            }}
          >
            <h3
              style={{
                margin: "0 0 8px",
                color: "#111827",
              }}
            >
              No support requests yet
            </h3>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
              }}
            >
              Customer complaints will appear here.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "20px",
            }}
          >
            {tickets.map((ticket) => (
              <SupportTicketCard
                key={ticket.id}
                ticket={ticket}
                saving={savingId === ticket.id}
                onChange={updateTicketField}
                onSave={saveTicket}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SupportTicketCard({
  ticket,
  saving,
  onChange,
  onSave,
}: {
  ticket: Ticket;
  saving: boolean;
  onChange: (
    ticketId: string,
    field: "status" | "admin_reply",
    value: string
  ) => void;
  onSave: (
    ticketId: string,
    status: string,
    adminReply: string
  ) => void;
}) {
  return (
    <article
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "22px",
        boxShadow: "0 5px 20px rgba(0,0,0,0.06)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "15px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div>
          <div
            style={{
              color: "#6b7280",
              fontSize: "13px",
              marginBottom: "5px",
            }}
          >
            Customer
          </div>

          <strong
            style={{
              color: "#111827",
              wordBreak: "break-word",
            }}
          >
            {ticket.customer_email}
          </strong>
        </div>

        <div
          style={{
            color: "#6b7280",
            fontSize: "13px",
          }}
        >
          {new Date(ticket.created_at).toLocaleString()}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "15px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "5px",
            }}
          >
            Category
          </div>

          <div
            style={{
              color: "#111827",
              fontWeight: 600,
            }}
          >
            {ticket.category}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "5px",
            }}
          >
            Subject
          </div>

          <div
            style={{
              color: "#111827",
              fontWeight: 600,
            }}
          >
            {ticket.subject}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "5px",
            }}
          >
            Customer Complaint
          </div>

          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "14px",
              color: "#374151",
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            {ticket.message}
          </div>
        </div>

        {ticket.attachment_url && (
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "#6b7280",
                marginBottom: "7px",
              }}
            >
              Attachment
            </div>

            <a
              href={ticket.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#2563eb",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              View attachment
            </a>
          </div>
        )}

        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "7px",
            }}
          >
            Status
          </label>

          <select
            value={ticket.status}
            onChange={(event) =>
              onChange(
                ticket.id,
                "status",
                event.target.value
              )
            }
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#111827",
            }}
          >
            <option value="open">Open</option>
            <option value="in_progress">
              In Progress
            </option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "7px",
            }}
          >
            Reply to Customer
          </label>

          <textarea
            value={ticket.admin_reply || ""}
            onChange={(event) =>
              onChange(
                ticket.id,
                "admin_reply",
                event.target.value
              )
            }
            placeholder="Write your reply to the customer..."
            rows={5}
            maxLength={3000}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              resize: "vertical",
              color: "#111827",
              background: "#ffffff",
            }}
          />
        </div>

        <button
          onClick={() =>
            onSave(
              ticket.id,
              ticket.status,
              ticket.admin_reply || ""
            )
          }
          disabled={saving}
          style={{
            width: "100%",
            border: "none",
            background: saving ? "#9ca3af" : "#111827",
            color: "#ffffff",
            padding: "13px",
            borderRadius: "8px",
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {saving ? "Saving..." : "Save Response"}
        </button>
      </div>
    </article>
  );
}