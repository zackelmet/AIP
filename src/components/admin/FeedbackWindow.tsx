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
          className={`text-xs ${i <= r ? "text-[#34D399]" : "text-white/15"}`}
        />
      ))}
    </span>
  );
}

export default function FeedbackWindow() {
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

  const avg = useMemo(() => {
    const rated = items.filter((i) => typeof i.rating === "number");
    return rated.length
      ? rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length
      : 0;
  }, [items]);

  const publishable = useMemo(
    () => items.filter((i) => i.permissionToPublish).length,
    [items],
  );

  const visible = useMemo(() => {
    if (filter === "publishable")
      return items.filter((i) => i.permissionToPublish);
    if (filter === "low") return items.filter((i) => (i.rating ?? 0) <= 3);
    return items;
  }, [items, filter]);

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  return (
    <div className="neon-card p-5 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faStar} className="text-[#34D399]" />
          <h2 className="text-lg font-semibold text-[var(--text)]">Feedback</h2>
          {!loading && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#34D399]/15 text-[#34D399]">
              {items.length}
              {avg ? ` · ${avg.toFixed(1)}★` : ""}
              {publishable ? ` · ${publishable} publishable` : ""}
            </span>
          )}
        </div>
        <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-0.5">
          {(
            [
              ["all", "All"],
              ["publishable", "Publishable"],
              ["low", "Low"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                filter === key
                  ? "bg-[#34D399] text-[#041018]"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-gray-500 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && visible.length === 0 && (
        <p className="text-gray-500 text-sm">No feedback yet.</p>
      )}

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {visible.map((f) => (
          <div
            key={f.id}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Stars n={f.rating} />
                {f.permissionToPublish && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30">
                    Publishable
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-500">
                {fmtDate(f.createdAt)}
              </span>
            </div>
            {f.comment && (
              <p className="text-sm text-gray-200 whitespace-pre-wrap">
                {f.comment}
              </p>
            )}
            {f.permissionToPublish && (f.name || f.company) && (
              <p className="text-xs text-[#34D399]">
                {[f.name, f.role, f.company].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
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
