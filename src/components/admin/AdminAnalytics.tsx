"use client";

import {
  faChartLine,
  faChevronDown,
  faChevronUp,
  faDollarSign,
  faFlask,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useMemo, useState } from "react";
import { normalizePentestStatus } from "@/lib/pentests/status";

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

type AdminUser = {
  uid: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  createdAt: string | null;
};

type PentestHistoryItem = {
  pentestId: string;
  target: string;
  status: string;
  createdAt: string | null;
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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: string) {
  const normalized = normalizePentestStatus(status);
  const map: Record<string, string> = {
    completed: "text-[#34D399]",
    running: "text-yellow-400",
  };
  return map[normalized] ?? "text-[var(--text-muted)]";
}

export default function AdminAnalytics() {
  const [stats, setStats] = useState<AdminStatsResponse>(initialStats);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [loadingHistoryByUser, setLoadingHistoryByUser] = useState<
    Record<string, boolean>
  >({});
  const [historyByUser, setHistoryByUser] = useState<
    Record<string, PentestHistoryItem[]>
  >({});
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const usersPerPage = 12;

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

    const loadUsers = async () => {
      try {
        const response = await fetch("/api/admin/users?limit=100");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load users");
        }
        setUsers(data.users || []);
      } catch (error: any) {
        setUsers([]);
        setUsersError(error.message || "Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    };

    loadStats();
    loadUsers();
  }, []);

  const handleToggleUser = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }

    setExpandedUserId(userId);
    if (historyByUser[userId]) return;

    setLoadingHistoryByUser((previous) => ({ ...previous, [userId]: true }));
    try {
      const response = await fetch(
        `/api/admin/user-pentests?userId=${encodeURIComponent(userId)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load user pentests");
      }
      setHistoryByUser((previous) => ({
        ...previous,
        [userId]: data.pentests || [],
      }));
    } catch {
      setHistoryByUser((previous) => ({
        ...previous,
        [userId]: [],
      }));
    } finally {
      setLoadingHistoryByUser((previous) => ({ ...previous, [userId]: false }));
    }
  };

  const completionRate = useMemo(() => {
    if (stats.totalPentests === 0) return 0;
    return Math.round(
      (stats.pentestStatusCounts.completed / stats.totalPentests) * 100,
    );
  }, [stats]);

  const dailyMax = useMemo(() => {
    return Math.max(1, ...stats.pentestsLast7Days.map((day) => day.count));
  }, [stats.pentestsLast7Days]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const email = user.email.toLowerCase();
      const name = (user.name || "").toLowerCase();
      return email.includes(query) || name.includes(query);
    });
  }, [users, userSearch]);

  const totalUserPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / usersPerPage),
  );

  const pagedUsers = useMemo(() => {
    const startIndex = (usersPage - 1) * usersPerPage;
    return filteredUsers.slice(startIndex, startIndex + usersPerPage);
  }, [filteredUsers, usersPage]);

  useEffect(() => {
    setUsersPage(1);
  }, [userSearch]);

  useEffect(() => {
    if (usersPage > totalUserPages) {
      setUsersPage(totalUserPages);
    }
  }, [usersPage, totalUserPages]);

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

      <div className="neon-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--text)]">Users</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Click a user to view pentest history
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            type="text"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Search users by email or name"
            className="neon-input w-full sm:max-w-sm py-2.5 px-4 text-sm"
          />
          <p className="text-xs text-[var(--text-muted)]">
            Showing {filteredUsers.length} user
            {filteredUsers.length === 1 ? "" : "s"}
          </p>
        </div>

        {loadingUsers ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            Loading users…
          </div>
        ) : usersError ? (
          <p className="text-sm text-red-400">{usersError}</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No users found.</p>
        ) : (
          <div className="space-y-2">
            {pagedUsers.map((user) => {
              const isExpanded = expandedUserId === user.uid;
              const isHistoryLoading = loadingHistoryByUser[user.uid] === true;
              const history = historyByUser[user.uid] || [];

              return (
                <div
                  key={user.uid}
                  className="rounded-lg border border-white/10"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleUser(user.uid)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--text)] truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {user.name || "Unnamed user"}
                        {user.isAdmin ? " • Admin" : ""}
                      </p>
                    </div>
                    <FontAwesomeIcon
                      icon={isExpanded ? faChevronUp : faChevronDown}
                      className="text-[var(--text-muted)]"
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4">
                      {isHistoryLoading ? (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          <FontAwesomeIcon
                            icon={faSpinner}
                            className="animate-spin"
                          />
                          Loading pentest history…
                        </div>
                      ) : history.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">
                          No pentests found for this user.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {history.map((pentest) => (
                            <div
                              key={pentest.pentestId}
                              className="rounded-md bg-white/5 border border-white/10 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="text-[var(--text)] truncate">
                                  {pentest.target}
                                </span>
                                <span className="text-[var(--text-muted)] whitespace-nowrap">
                                  {formatDate(pentest.createdAt)}
                                </span>
                              </div>
                              <p
                                className={`text-xs mt-1 font-semibold ${statusBadge(pentest.status)}`}
                              >
                                {normalizePentestStatus(pentest.status)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setUsersPage((previous) => Math.max(1, previous - 1))
                }
                disabled={usersPage <= 1}
                className="neon-outline-btn px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <p className="text-xs text-[var(--text-muted)]">
                Page {usersPage} of {totalUserPages}
              </p>
              <button
                type="button"
                onClick={() =>
                  setUsersPage((previous) =>
                    Math.min(totalUserPages, previous + 1),
                  )
                }
                disabled={usersPage >= totalUserPages}
                className="neon-outline-btn px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
