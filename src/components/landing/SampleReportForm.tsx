"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function SampleReportForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/sample-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(null);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center" role="status">
        <p className="text-xl font-semibold text-[#34D399] mb-2">
          Check your inbox ✓
        </p>
        <p className="text-gray-400 text-sm">
          We just emailed the sample report to <strong className="text-white">{email}</strong>.
          If it doesn&apos;t arrive within a minute, check spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="you@company.com"
          aria-label="Work email"
          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#34D399] text-sm"
          autoComplete="email"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-6 py-3 bg-[#34D399] hover:bg-[#10b981] text-[#041018] font-semibold rounded-lg transition-colors text-sm whitespace-nowrap disabled:opacity-50"
        >
          {status === "loading" ? "Sending…" : "Email me the report"}
        </button>
      </div>
      <p className={`text-xs mt-2 ${status === "error" ? "text-red-400" : "text-gray-500"}`}>
        {status === "error"
          ? message
          : "Work email only. We'll send the full 43-page PDF straight to your inbox — no account needed."}
      </p>
    </form>
  );
}