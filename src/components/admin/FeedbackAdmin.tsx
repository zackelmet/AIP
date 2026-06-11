"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

interface FeedbackItem {
  id: string;
  rating: number | null;
  comment: string;
  name: string;
  company: string;
  role: string;
  quote: string;
  permissionToPublish: boolean;
  email: string;
  target: string;
  type: string;
  source: string;
  status: string;
  createdAt: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  web_app: "Web Application",
  external_ip: "External IP",
  pentest_plus: "Pentest+",
};

function Stars({ n }: { n: number | null }) {
  const r = n ?? 0;
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <FontAwesomeIcon
          key={i}
          icon={faStar}
          className={`text-sm ${i <= r ? "text-[#34D399]" : "text-white/15"}`}
        />
      ))}
    </span>
  );
}

export default function FeedbackAdmin() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "publishable" | "low">("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/feedback");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setItems(data.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load feedback");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const rated = items.filter((i) => typeof i.rating === "number");
    const avg = rated.length
      ? rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length
      : 0;
    return {
      count: items.length,
      avg,
      publishable: items.filter((i) => i.permissionToPublish).length,
    };
  }, [items]);

  const visible = useMemo(() => {
    if (filter === "publishable")
      return items.filter((i) => i.permissionToPublish);
    if (filter === "low") return items.filter((i) => (i.rating ?? 0) <= 3);
    return items;
  }, [items, filter]);

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-light text-white mb-1">Feedback</h1>
        <p className="text-gray-400 text-sm">
          Client ratings and testimonials submitted via the rate-us form.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="neon-card p-5">
          <p className="text-gray-400 text-xs mb-1">Total</p>
          <p className="text-3xl font-light text-white">{stats.count}</p>
        </div>
        <div className="neon-card p-5">
          <p className="text-gray-400 text-xs mb-1">Average rating</p>
          <p className="text-3xl font-light text-[#34D399]">
            {stats.avg ? stats.avg.toFixed(1) : "—"}
          </p>
        </div>
        <div className="neon-card p-5">
          <p className="text-gray-400 text-xs mb-1">Publishable</p>
          <p className="text-3xl font-light text-white">{stats.publishable}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-1">
        {(
          [
            ["all", "All"],
            ["publishable", "Publishable"],
            ["low", "Low (≤3)"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              filter === key
                ? "bg-[#34D399] text-[#041018]"
                : "text-gray-300 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500 text-sm">Loading…</p>}
      {error && (
        <div className="neon-card p-4 border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="neon-card p-8 text-center text-gray-500 text-sm">
          No feedback yet.
        </div>
      )}

      <div className="space-y-4">
        {visible.map((f) => (
          <div key={f.id} className="neon-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Stars n={f.rating} />
                {f.permissionToPublish && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30">
                    Publishable
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">{fmtDate(f.createdAt)}</span>
            </div>

            {f.comment && (
              <p className="text-sm text-gray-200 whitespace-pre-wrap">
                {f.comment}
              </p>
            )}

            {f.permissionToPublish && (f.name || f.company || f.quote) && (
              <div className="rounded-lg border border-[#34D399]/20 bg-[#34D399]/5 p-3 text-sm">
                {f.quote && (
                  <p className="text-gray-200 italic mb-2">“{f.quote}”</p>
                )}
                <p className="text-[#34D399] text-xs">
                  {[f.name, f.role, f.company].filter(Boolean).join(" · ") ||
                    "Anonymous"}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
              {f.email && <span>{f.email}</span>}
              {f.target && <span>Target: {f.target}</span>}
              {f.type && <span>{TYPE_LABELS[f.type] || f.type}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
