"use client";

import {
  faChartLine,
  faDollarSign,
  faFlask,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useMemo, useState } from "react";

type AdminStatsResponse = {
  totalUsers: number;
  newUsers30Days: number;
  totalPentests: number;
  pentestStatusCounts: {
    completed: number;
    running: number;
  };
  pentestsLast7Days: Array<{
    date: string;
    label: string;
    count: number;
  }>;
  sales30DaysCents: number;
  salesCount30Days: number;
  averageOrderValueCents: number;
};

const initialStats: AdminStatsResponse = {
  totalUsers: 0,
  newUsers30Days: 0,
  totalPentests: 0,
  pentestStatusCounts: {
    completed: 0,
    running: 0,
  },
  pentestsLast7Days: [],
  sales30DaysCents: 0,
  salesCount30Days: 0,
  averageOrderValueCents: 0,
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

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

  const completionRate = useMemo(() => {
    if (stats.totalPentests === 0) return 0;
    return Math.round(
      (stats.pentestStatusCounts.completed / stats.totalPentests) * 100,
    );
  }, [stats]);

  const dailyMax = useMemo(() => {
    return Math.max(1, ...stats.pentestsLast7Days.map((day) => day.count));
  }, [stats.pentestsLast7Days]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="neon-card p-8 flex items-center gap-3 text-[var(--text-muted)]">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          Loading analytics…
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-light text-white mb-2">Admin Analytics</h1>
        <p className="text-gray-400">
          Track users, test volume, and sales performance.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        <div className="neon-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Total Tests
            </p>
            <FontAwesomeIcon icon={faFlask} className="text-[#34D399]" />
          </div>
          <p className="text-3xl font-black text-[var(--text)]">
            {stats.totalPentests}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {completionRate}% completed
          </p>
        </div>

        <div className="neon-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Sales (30d)
            </p>
            <FontAwesomeIcon icon={faDollarSign} className="text-[#34D399]" />
          </div>
          <p className="text-3xl font-black text-[var(--text)]">
            {formatCurrency(stats.sales30DaysCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {stats.salesCount30Days} paid checkouts
          </p>
        </div>

        <div className="neon-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Avg Order
            </p>
            <FontAwesomeIcon icon={faChartLine} className="text-[#34D399]" />
          </div>
          <p className="text-3xl font-black text-[var(--text)]">
            {formatCurrency(stats.averageOrderValueCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Last 30 days</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <div className="neon-card p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Pentest Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Completed</span>
              <span className="text-[#34D399] font-semibold">
                {stats.pentestStatusCounts.completed}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Running</span>
              <span className="text-yellow-400 font-semibold">
                {stats.pentestStatusCounts.running}
              </span>
            </div>
          </div>
        </div>

        <div className="neon-card p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Tests Launched (7d)
          </h2>
          <div className="space-y-3">
            {stats.pentestsLast7Days.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No recent test activity found.
              </p>
            ) : (
              stats.pentestsLast7Days.map((day) => (
                <div key={day.date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{day.label}</span>
                    <span>{day.count}</span>
                  </div>
                  <div className="h-2 rounded bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#34D399]"
                      style={{
                        width: `${Math.max(6, Math.round((day.count / dailyMax) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
