"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Ticket = {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  attachment_path: string | null;
  attachment_url?: string | null;
  created_at: string;
  updated_at: string;
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [category, setCategory] = useState("WhatsApp");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [messageText, setMessageText] =
    useState("");

  const [messageType, setMessageType] =
    useState<"success" | "error">("success");

  useEffect(() => {
    loadTickets();
  }, []);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadTickets() {
    setLoading(true);
    setMessageText("");

    try {
      const token = await getAccessToken();

      if (!token) {
        setMessageType("error");
        setMessageText(
          "Please log in again."
        );
        setLoading(false);
        return;
      }

      const response = await fetch(
        "/api/support",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load support tickets."
        );
      }

      setTickets(result.tickets || []);
    } catch (error: any) {
      console.error(
        "LOAD SUPPORT ERROR:",
        error
      );

      setMessageType("error");
      setMessageText(
        error?.message ||
          "Unable to load support tickets."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessageType("error");
      setMessageText(
        "Please select a JPG, PNG, WEBP or GIF image."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessageType("error");
      setMessageText(
        "Image must be smaller than 5MB."
      );

      event.target.value = "";
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const imageUrl =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setPreview(imageUrl);
    setMessageText("");
  }

  function removeFile() {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(null);
    setPreview(null);

    const input =
      document.getElementById(
        "support-attachment"
      ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  async function submitTicket(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessageText("");

    if (!subject.trim()) {
      setMessageType("error");
      setMessageText(
        "Please enter a subject."
      );
      return;
    }

    if (!message.trim()) {
      setMessageType("error");
      setMessageText(
        "Please describe your problem."
      );
      return;
    }

    setSending(true);

    try {
      const token =
        await getAccessToken();

      if (!token) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const formData = new FormData();

      formData.append(
        "category",
        category
      );

      formData.append(
        "subject",
        subject.trim()
      );

      formData.append(
        "message",
        message.trim()
      );

      if (selectedFile) {
        formData.append(
          "attachment",
          selectedFile
        );
      }

      const response = await fetch(
        "/api/support",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to send support request."
        );
      }

      if (result.ticket) {
        setTickets((current) => [
          result.ticket,
          ...current,
        ]);
      }

      setSubject("");
      setMessage("");
      setCategory("WhatsApp");

      removeFile();

      setMessageType("success");
      setMessageText(
        "Your support request has been sent successfully."
      );
    } catch (error: any) {
      console.error(
        "SEND SUPPORT ERROR:",
        error
      );

      setMessageType("error");
      setMessageText(
        error?.message ||
          "Unable to send support request."
      );
    } finally {
      setSending(false);
    }
  }

  function statusClass(status: string) {
    switch (status) {
      case "resolved":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

      case "closed":
        return "border-slate-600 bg-slate-800 text-slate-300";

      case "in_progress":
        return "border-blue-500/30 bg-blue-500/10 text-blue-300";

      default:
        return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    }
  }

  function formatStatus(status: string) {
    if (status === "in_progress") {
      return "In progress";
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-slate-950">
              M
            </div>

            <div>
              <h1 className="font-bold">
                Moriki{" "}
                <span className="text-slate-400">
                  SMS
                </span>
              </h1>

              <p className="text-xs text-slate-500">
                Customer Care
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/account"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Account
            </a>

            <a
              href="/admin/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
            >
              ← Dashboard
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-slate-500">
            CUSTOMER CARE
          </p>

          <h2 className="text-3xl font-bold">
            How can we help?
          </h2>

          <p className="mt-2 text-slate-400">
            Send us your problem and our support team will respond.
          </p>
        </div>

        {messageText && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {messageText}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold">
              Contact Customer Care
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Having a problem with WhatsApp or another service?
              Send us the details.
            </p>

            <form
              onSubmit={submitTicket}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Category
                </label>

                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-white"
                >
                  <option value="WhatsApp">
                    WhatsApp
                  </option>

                  <option value="Telegram">
                    Telegram
                  </option>

                  <option value="Number">
                    Number problem
                  </option>

                  <option value="Payment">
                    Payment
                  </option>

                  <option value="Account">
                    Account
                  </option>

                  <option value="General">
                    General
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Subject
                </label>

                <input
                  value={subject}
                  onChange={(e) =>
                    setSubject(e.target.value)
                  }
                  maxLength={120}
                  placeholder="Example: WhatsApp verification problem"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Describe the problem
                </label>

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  rows={6}
                  maxLength={3000}
                  placeholder="Tell us what happened..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white"
                />

                <p className="mt-1 text-right text-xs text-slate-600">
                  {message.length}/3000
                </p>
              </div>

              {/* ATTACHMENT */}
              <div>
                <label
                  htmlFor="support-attachment"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Attach a picture
                </label>

                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <label
                    htmlFor="support-attachment"
                    className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-600 px-4 py-6 text-center transition hover:border-blue-500 hover:bg-slate-900"
                  >
                    <div>
                      <div className="text-3xl">
                        📎
                      </div>

                      <p className="mt-2 font-semibold text-white">
                        Choose a picture
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        JPG, PNG, WEBP or GIF
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Maximum size: 5MB
                      </p>
                    </div>
                  </label>

                  <input
                    id="support-attachment"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="mt-4 block w-full cursor-pointer text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-500"
                  />

                  {selectedFile && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-700">
                      {preview && (
                        <img
                          src={preview}
                          alt="Selected picture"
                          className="max-h-64 w-full object-contain"
                        />
                      )}

                      <div className="flex items-center justify-between gap-3 border-t border-slate-800 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {selectedFile.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {(
                              selectedFile.size /
                              1024 /
                              1024
                            ).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={removeFile}
                          className="shrink-0 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending
                  ? "Sending..."
                  : "Send Support Request"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 p-6">
              <div>
                <h3 className="font-semibold">
                  Your Support Requests
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  View your previous requests and replies.
                </p>
              </div>

              <button
                onClick={loadTickets}
                disabled={loading}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500">
                Loading your requests...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-4xl">
                  💬
                </div>

                <p className="mt-4 font-medium">
                  No support requests yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Your support conversations will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-600">
                          {ticket.category}
                        </p>

                        <h4 className="mt-1 font-semibold">
                          {ticket.subject}
                        </h4>

                        <p className="mt-1 text-xs text-slate-600">
                          {new Date(
                            ticket.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                          ticket.status
                        )}`}
                      >
                        {formatStatus(
                          ticket.status
                        )}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                        Your message
                      </p>

                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {ticket.message}
                      </p>
                    </div>

                    {ticket.attachment_url && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">
                          Attached Picture
                        </p>

                        <a
                          href={ticket.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={ticket.attachment_url}
                            alt="Support attachment"
                            className="max-h-72 max-w-full rounded-xl border border-slate-800 object-contain"
                          />
                        </a>
                      </div>
                    )}

                    {ticket.admin_reply && (
                      <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-400">
                          Customer Care Reply
                        </p>

                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                          {ticket.admin_reply}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}