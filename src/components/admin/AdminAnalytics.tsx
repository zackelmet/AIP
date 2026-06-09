"use client";

import { faChartLine, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";

type AdminStatsResponse = {
  totalPentests: number;
  pentestStatusCounts: {
    completed: number;
    running: number;
  };
  newUsers30Days: number;
};

const initialStats: AdminStatsResponse = {
  totalPentests: 0,
  pentestStatusCounts: {
    completed: 0,
    running: 0,
  },
  newUsers30Days: 0,
};

/**
 * Compact analytics panel embedded at the bottom of the admin dashboard.
 * Numbers only — test volume/status and recent signups. The /api/admin/stats
 * endpoint returns more (revenue, charts); we intentionally show just the
 * essentials here.
 */
export default function AdminAnalytics() {
  const [stats, setStats] = useState<AdminStatsResponse>(initialStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch("/api/admin/stats");
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Failed to load analytics");
        setStats({ ...initialStats, ...data });
      } catch {
        setStats(initialStats);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="neon-card p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <FontAwesomeIcon
          icon={faChartLine}
          className="text-[#34D399] text-lg"
        />
        <h2 className="text-lg font-bold text-[var(--text)]">Analytics</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          Loading analytics…
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Total Tests
            </p>
            <p className="text-3xl font-black text-[var(--text)] mt-1">
              {stats.totalPentests}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              <span className="text-[#34D399] font-semibold">
                {stats.pentestStatusCounts.completed}
              </span>{" "}
              completed ·{" "}
              <span className="text-yellow-400 font-semibold">
                {stats.pentestStatusCounts.running}
              </span>{" "}
              running
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
              New Users
            </p>
            <p className="text-3xl font-black text-[var(--text)] mt-1">
              {stats.newUsers30Days}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Last 30 days
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
