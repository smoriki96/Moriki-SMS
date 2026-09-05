"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  attachment_url: string | null;
  created_at: string;
};

export default function SupportPage() {
  const router = useRouter();

  const [category, setCategory] = useState("General");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loading, setLoading] = useState(false);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">(
    "success"
  );

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoadingTickets(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setLoadingTickets(false);
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .select(
        "id, category, subject, message, status, admin_reply, attachment_url, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("LOAD SUPPORT TICKETS ERROR:", error);
      setNoticeType("error");
      setNotice("Unable to load your support requests.");
    } else {
      setTickets(data || []);
    }

    setLoadingTickets(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setNotice("");

    if (!subject.trim()) {
      setNoticeType("error");
      setNotice("Please enter a subject.");
      return;
    }

    if (!message.trim()) {
      setNoticeType("error");
      setNotice("Please describe your problem.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    let attachmentUrl: string | null = null;

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setLoading(false);
        setNoticeType("error");
        setNotice("The picture must be smaller than 5MB.");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setLoading(false);
        setNoticeType("error");
        setNotice("Please attach an image file.");
        return;
      }

      const extension = file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("support-attachments")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("SUPPORT IMAGE UPLOAD ERROR:", uploadError);
        setLoading(false);
        setNoticeType("error");
        setNotice(
          "The picture could not be uploaded. Please try again."
        );
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("support-attachments")
        .getPublicUrl(fileName);

      attachmentUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        category,
        subject: subject.trim(),
        message: message.trim(),
        status: "open",
        attachment_url: attachmentUrl,
      })
      .select(
        "id, category, subject, message, status, admin_reply, attachment_url, created_at"
      )
      .single();

    setLoading(false);

    if (error) {
      console.error("SUPPORT TICKET ERROR:", error);
      setNoticeType("error");
      setNotice(
        "We could not send your support request. Please try again."
      );
      return;
    }

    setSubject("");
    setMessage("");
    setCategory("General");
    setFile(null);

    const fileInput = document.getElementById(
      "support-image"
    ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }

    if (data) {
      setTickets((current) => [data, ...current]);
    }

    setNoticeType("success");
    setNotice(
      "Your support request has been submitted successfully."
    );
  }

  function getStatusStyle(status: string) {
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

    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-slate-950">
              M
            </div>

            <div>
              <div className="font-bold">Moriki SMS</div>
              <div className="text-xs text-slate-500">
                Customer Support
              </div>
            </div>
          </Link>

          <Link
            href="/admin/dashboard"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-slate-500">
            CUSTOMER SUPPORT
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            How can we help?
          </h1>

          <p className="mt-2 text-slate-400">
            Send us a support request and our team will get back to you.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="text-xl font-semibold">
            Contact Support
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Tell us what you need help with.
          </p>

          {notice && (
            <div
              className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
                noticeType === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {notice}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-5"
          >
            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                What do you need help with?
              </label>

              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-white disabled:opacity-60"
              >
                <option>General</option>
                <option>Account</option>
                <option>Wallet</option>
                <option>Payment</option>
                <option>Number Purchase</option>
                <option>SMS / Verification</option>
                <option>Order</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="subject"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Subject
              </label>

              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Example: My verification code has not arrived"
                disabled={loading}
                maxLength={120}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Message
              </label>

              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the problem you are experiencing..."
                disabled={loading}
                rows={7}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white disabled:opacity-60"
              />

              <p className="mt-2 text-right text-xs text-slate-600">
                {message.length}/2000
              </p>
            </div>

            <div>
              <label
                htmlFor="support-image"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Attach a picture
              </label>

              <input
                id="support-image"
                type="file"
                accept="image/*"
                disabled={loading}
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-medium file:text-slate-950"
              />

              <p className="mt-2 text-xs text-slate-600">
                Optional. Images only, maximum 5MB.
              </p>

              {file && (
                <p className="mt-2 text-sm text-slate-400">
                  Selected: {file.name}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Sending request..."
                : "Send Support Request"}
            </button>
          </form>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                My Support Requests
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                View your previous requests and replies.
              </p>
            </div>

            <button
              type="button"
              onClick={loadTickets}
              disabled={loadingTickets}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
            >
              {loadingTickets ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loadingTickets ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-white" />

              <p className="text-sm text-slate-500">
                Loading your support requests...
              </p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-10 text-center">
              <h3 className="font-semibold">
                No support requests yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                If you need help, send us a support request above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">
                        {ticket.subject}
                      </h3>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusStyle(
                          ticket.status
                        )}`}
                      >
                        {formatStatus(ticket.status)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-600">
                      {ticket.category} -{" "}
                      {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
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
                        Attached picture
                      </p>

                      <a
                        href={ticket.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={ticket.attachment_url}
                          alt="Support attachment"
                          className="max-h-72 max-w-full rounded-xl border border-slate-700 object-contain"
                        />
                      </a>
                    </div>
                  )}

                  {ticket.admin_reply && (
                    <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-400">
                        Moriki SMS Support
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

        <div className="mt-8 text-center">
          <Link
            href="/admin/dashboard"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}