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
  revenueLast30Days: Array<{
    date: string;
    label: string;
    cents: number;
  }>;
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
  revenueLast30Days: [],
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

  const revenueMax = useMemo(() => {
    return Math.max(1, ...stats.revenueLast30Days.map((day) => day.cents));
  }, [stats.revenueLast30Days]);

  const revenueMetrics = useMemo(() => {
    const last7 = stats.revenueLast30Days.slice(-7);
    const previous7 = stats.revenueLast30Days.slice(-14, -7);

    const last7Revenue = last7.reduce((sum, day) => sum + day.cents, 0);
    const previous7Revenue = previous7.reduce((sum, day) => sum + day.cents, 0);
    const averageDailyRevenueCents =
      stats.revenueLast30Days.length > 0
        ? Math.round(stats.sales30DaysCents / stats.revenueLast30Days.length)
        : 0;

    const revenueChangePercent =
      previous7Revenue > 0
        ? Math.round(
            ((last7Revenue - previous7Revenue) / previous7Revenue) * 100,
          )
        : last7Revenue > 0
          ? 100
          : 0;

    const checkoutToTestRatio =
      stats.totalPentests > 0
        ? Math.round((stats.salesCount30Days / stats.totalPentests) * 100)
        : 0;

    return {
      last7Revenue,
      previous7Revenue,
      averageDailyRevenueCents,
      revenueChangePercent,
      checkoutToTestRatio,
    };
  }, [stats]);

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

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
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
              Avg Order
            </p>
            <FontAwesomeIcon icon={faChartLine} className="text-[#34D399]" />
          </div>
          <p className="text-3xl font-black text-[var(--text)]">
            {formatCurrency(stats.averageOrderValueCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Last 30 days</p>
        </div>

        <div className="neon-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Paid Checkouts
            </p>
            <FontAwesomeIcon icon={faDollarSign} className="text-[#34D399]" />
          </div>
          <p className="text-3xl font-black text-[var(--text)]">
            {stats.salesCount30Days}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Last 30 days</p>
        </div>

        <div className="neon-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
              7d Revenue Trend
            </p>
            <FontAwesomeIcon icon={faChartLine} className="text-[#34D399]" />
          </div>
          <p className="text-3xl font-black text-[var(--text)]">
            {revenueMetrics.revenueChangePercent >= 0 ? "+" : ""}
            {revenueMetrics.revenueChangePercent}%
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            vs previous 7 days
          </p>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <div className="neon-card p-5 space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">
                Revenue (30d)
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {formatCurrency(stats.sales30DaysCents)} total in the last 30
                days
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-muted)]">Avg daily</p>
              <p className="text-sm font-semibold text-[var(--text)]">
                {formatCurrency(revenueMetrics.averageDailyRevenueCents)}
              </p>
            </div>
          </div>

          {stats.revenueLast30Days.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No revenue activity in the last 30 days.
            </p>
          ) : (
            <>
              <div className="h-48 rounded-lg border border-white/10 bg-black/20 p-3 flex items-end gap-1">
                {stats.revenueLast30Days.map((day) => (
                  <div
                    key={day.date}
                    className="flex-1 min-w-0 h-full flex items-end"
                    title={`${day.label}: ${formatCurrency(day.cents)}`}
                  >
                    <div
                      className="w-full bg-[#34D399]/80 hover:bg-[#34D399] transition-colors rounded-sm"
                      style={{
                        height: `${Math.max(4, Math.round((day.cents / revenueMax) * 100))}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{stats.revenueLast30Days[0]?.label}</span>
                <span>
                  {
                    stats.revenueLast30Days[stats.revenueLast30Days.length - 1]
                      ?.label
                  }
                </span>
              </div>
            </>
          )}
        </div>

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
            Revenue Insights
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Last 7 days</span>
              <span className="font-semibold text-[var(--text)]">
                {formatCurrency(revenueMetrics.last7Revenue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Previous 7 days</span>
              <span className="font-semibold text-[var(--text)]">
                {formatCurrency(revenueMetrics.previous7Revenue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">
                Checkout/Test ratio
              </span>
              <span className="font-semibold text-[var(--text)]">
                {revenueMetrics.checkoutToTestRatio}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">New users (30d)</span>
              <span className="font-semibold text-[var(--text)]">
                {stats.newUsers30Days}
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
