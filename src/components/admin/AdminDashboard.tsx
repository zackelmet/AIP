"use client";

import { faUsers } from "@fortawesome/free-solid-svg-icons/faUsers";
import { faUpload } from "@fortawesome/free-solid-svg-icons/faUpload";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons/faFilePdf";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons/faCheckCircle";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons/faShieldHalved";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons/faArrowRight";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons/faChevronLeft";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons/faChevronRight";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faRocket } from "@fortawesome/free-solid-svg-icons/faRocket";
import { faClipboard } from "@fortawesome/free-solid-svg-icons/faClipboard";
import { faClock } from "@fortawesome/free-solid-svg-icons/faClock";
import { faInbox } from "@fortawesome/free-solid-svg-icons/faInbox";
import { faChartLine } from "@fortawesome/free-solid-svg-icons/faChartLine";
import { faDollarSign } from "@fortawesome/free-solid-svg-icons/faDollarSign";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizePentestStatus } from "@/lib/pentests/status";
import FeedbackWindow from "./FeedbackWindow";

const showToast = (type: "error" | "success", message: string) => {
  import("react-hot-toast")
    .then((mod) => {
      const { toast } = mod as any;
      if (type === "error") toast.error(message);
      else toast.success(message);
    })
    .catch(() => {});
};

type Step = 1 | 2 | 3 | 4;

interface UserSuggestion {
  uid: string;
  email: string;
}
interface PentestOption {
  pentestId: string;
  target: string;
  status: string;
  createdAt: string | null;
}

interface AdminUser {
  uid: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  createdAt: string | null;
  pentestCount: number;
  lastPentestAt: string | null;
}

interface PentestHistoryItem {
  pentestId: string;
  target: string;
  status: string;
  createdAt: string | null;
}

interface ActivePentest {
  pentestId: string;
  userId: string;
  userEmail: string | null;
  target: string;
  status: string;
  createdAt: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function monthLabel(monthStr: string) {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatAge(iso: string | null) {
  if (!iso) return { label: "—", className: "text-[var(--text-muted)]" };
  const elapsedMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(elapsedMs / 3_600_000);
  let label: string;
  if (hours < 1) label = "just now";
  else if (hours < 24) label = `${hours}h ago`;
  else label = `${Math.floor(hours / 24)}d ago`;
  // Color-code by SLA age: fresh < 1d, aging 1–3d, stale > 3d.
  let className = "text-green-theme";
  if (hours >= 72) className = "text-red-400";
  else if (hours >= 24) className = "text-yellow-400";
  return { label, className };
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-500/20 text-green-700 border-green-500/30",
  running: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  pending: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  pending_dispatch: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  review: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  failed: "bg-red-500/20 text-red-700 border-red-500/30",
  rejected: "bg-red-500/20 text-red-700 border-red-500/30",
};

function statusBadge(status: string) {
  const normalized = normalizePentestStatus(status);
  const map: Record<string, string> = {
    completed: "text-green-theme",
    running: "text-yellow-400",
    review: "text-yellow-400",
    pending_dispatch: "text-yellow-400",
    rejected: "text-red-400",
  };
  return map[normalized] ?? "text-[var(--text-muted)]";
}

export default function AdminDashboard() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUserDirectory, setLoadingUserDirectory] = useState(true);
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

  // Active pentest queue
  const [activePentests, setActivePentests] = useState<ActivePentest[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [uploadingByPentest, setUploadingByPentest] = useState<
    Record<string, boolean>
  >({});

  // Monthly analytics
  const [analyticsMonth, setAnalyticsMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [analyticsData, setAnalyticsData] = useState<{
    newUsersThisMonth: number;
    newPentestsThisMonth: number;
    revenueThisMonthCents: number;
    purchasesThisMonth?: number;
    creditsPurchasedThisMonth?: number;
    revenueUnavailable?: boolean;
    checkouts?: Array<{ userEmail: string; amount: number }>;
    pentests: any[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [userEmail, setUserEmail] = useState("");
  const [selectedPentest, setSelectedPentest] = useState<PentestOption | null>(
    null,
  );
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isUploadingReport, setIsUploadingReport] = useState(false);

  // Step 1 autocomplete
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionBoxRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Step 2 pentest list
  const [pentests, setPentests] = useState<PentestOption[]>([]);
  const [loadingPentests, setLoadingPentests] = useState(false);
  const [pentestDropdownOpen, setPentestDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoadingStats(true);
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setStatsData(d);
        setTotalUsers(d.totalUsers ?? 0);
      })
      .catch(() => {
        setStatsData(null);
        setTotalUsers(0);
      })
      .finally(() => {
        setLoadingUsers(false);
        setLoadingStats(false);
      });
  }, []);

  // Monthly analytics
  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/monthly-stats?month=${analyticsMonth}`,
      );
      const data = await res.json();
      if (res.ok) setAnalyticsData(data);
    } catch {
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [analyticsMonth]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch("/api/admin/users?limit=100");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load users");
        }
        const sorted = (data.users || []).sort((a: AdminUser, b: AdminUser) => {
          const ta = a.createdAt || "";
          const tb = b.createdAt || "";
          return tb.localeCompare(ta); // most recent first
        });
        setUsers(sorted);
      } catch (error: any) {
        setUsers([]);
        setUsersError(error.message || "Failed to load users");
      } finally {
        setLoadingUserDirectory(false);
      }
    };

    loadUsers();
  }, []);

  const loadActivePentests = async () => {
    setLoadingActive(true);
    setActiveError(null);
    try {
      const response = await fetch("/api/admin/active-pentests");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load active pentests");
      }
      setActivePentests(data.pentests || []);
    } catch (error: any) {
      setActivePentests([]);
      setActiveError(error.message || "Failed to load active pentests");
    } finally {
      setLoadingActive(false);
    }
  };

  useEffect(() => {
    loadActivePentests();
  }, []);

  const uploadForPentest = async (pentestId: string, file: File) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      showToast("error", "Only PDF and DOCX files are accepted");
      return;
    }
    setUploadingByPentest((previous) => ({ ...previous, [pentestId]: true }));
    try {
      const form = new FormData();
      form.append("pentestId", pentestId);
      form.append("file", file);
      const res = await fetch("/api/admin/upload-report", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Upload failed");
      }
      showToast("success", "Report delivered — pentest marked completed ✓");
      // Drop the now-completed pentest from the queue.
      setActivePentests((previous) =>
        previous.filter((p) => p.pentestId !== pentestId),
      );
    } catch (err: any) {
      showToast("error", err.message || "Upload failed");
    } finally {
      setUploadingByPentest((previous) => {
        const next = { ...previous };
        delete next[pentestId];
        return next;
      });
    }
  };

  // Close autocomplete on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(e.target as Node) &&
        emailInputRef.current &&
        !emailInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setPentestDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleEmailChange = (value: string) => {
    setUserEmail(value);
    setShowSuggestions(false);
    if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    suggestDebounce.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `/api/admin/search-users?q=${encodeURIComponent(value.toLowerCase())}`,
        );
        const data = await res.json();
        setSuggestions(data.users || []);
        setShowSuggestions((data.users || []).length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);
  };

  const selectSuggestion = (email: string) => {
    setUserEmail(email);
    setSuggestions([]);
    setShowSuggestions(false);
  };

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

  const confirmEmail = async () => {
    const email = userEmail.trim();
    if (!email) {
      showToast("error", "Enter the client email");
      return;
    }
    setLoadingPentests(true);
    setPentests([]);
    setSelectedPentest(null);
    try {
      const res = await fetch(
        `/api/admin/user-pentests?userEmail=${encodeURIComponent(email)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "User not found");
      setPentests(data.pentests || []);
      if ((data.pentests || []).length === 0) {
        showToast("error", "No pentests found for this user");
        return;
      }
      setStep(2);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoadingPentests(false);
    }
  };

  const uploadReport = async () => {
    if (!selectedPentest?.pentestId || !reportFile) {
      showToast("error", "Select a file first");
      return;
    }
    setIsUploadingReport(true);
    try {
      const form = new FormData();
      form.append("pentestId", selectedPentest.pentestId);
      form.append("file", reportFile);
      const res = await fetch("/api/admin/upload-report", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Upload failed");
      }
      showToast("success", "Report uploaded — pentest marked completed ✓");
      setStep(4);
    } catch (err: any) {
      showToast("error", err.message || "Upload failed");
    } finally {
      setIsUploadingReport(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setUserEmail("");
    setSuggestions([]);
    setSelectedPentest(null);
    setPentests([]);
    setReportFile(null);
  };

  const steps = [
    { n: 1, label: "Client Email" },
    { n: 2, label: "Select Pentest" },
    { n: 3, label: "Upload Report" },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FontAwesomeIcon
          icon={faShieldHalved}
          className="text-green-theme text-2xl"
        />
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">Overview</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Affordable Pentesting — internal tools
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {(() => {
          if (loadingStats) {
            return [1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-5"
              >
                <div className="animate-pulse">
                  <div className="h-4 w-4 rounded bg-gray-500/30 mb-6" />
                  <div className="h-8 w-20 bg-gray-500/20 rounded mb-2" />
                  <div className="h-3 w-16 bg-gray-500/20 rounded" />
                </div>
              </div>
            ));
          }
          const dollars = (cents: number) =>
            `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
          const cards = [
            {
              label: "Total Users",
              value: statsData?.totalUsers?.toLocaleString() || "0",
              icon: faUsers,
              color: "text-[#4590e2]",
            },
            {
              label: "Completed Pentests",
              value: statsData?.completedPentests?.toLocaleString() || "0",
              icon: faCheckCircle,
              color: "text-green-400",
            },
            {
              label: `Revenue (${new Date().getFullYear()})`,
              value: statsData?.revenueUnavailable
                ? "n/a"
                : dollars(statsData?.revenueYTDCents || 0),
              icon: faDollarSign,
              color: "text-yellow-400",
              sub: statsData?.revenueCountYTD
                ? `${statsData.revenueCountYTD} orders`
                : undefined,
            },
          ];
          return cards.map((c) => (
            <div
              key={c.label}
              className="bg-white/[0.03] border border-white/10 rounded-xl p-5"
            >
              <FontAwesomeIcon icon={c.icon} className={`text-lg ${c.color}`} />
              <p className="text-2xl font-bold text-[var(--text)] mt-3">
                {c.value}
              </p>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mt-1">
                {c.label}
              </p>
              {c.sub && (
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  {c.sub}
                </p>
              )}
            </div>
          ));
        })()}
      </div>

      {/* Monthly Revenue — paid checkouts for the selected month */}
      {(() => {
        const revMonth = monthLabel(analyticsMonth);
        const revCheckouts = analyticsData?.checkouts as
          Array<{ userEmail: string; amount: number }> | undefined;

        return (
          <div className="neon-card p-6 space-y-4 max-w-4xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faDollarSign}
                  className="text-green-theme text-lg"
                />
                <h2 className="text-lg font-bold text-[var(--text)]">
                  Monthly Revenue
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const [y, m] = analyticsMonth.split("-").map(Number);
                    const d = new Date(y, m - 2, 1);
                    setAnalyticsMonth(
                      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                    );
                  }}
                  className="neon-outline-btn px-2 py-1 text-sm"
                  title="Previous month"
                >
                  ‹
                </button>
                <span className="min-w-32 text-center text-sm font-semibold text-[var(--text)]">
                  {revMonth}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const [y, m] = analyticsMonth.split("-").map(Number);
                    const d = new Date(y, m, 1);
                    setAnalyticsMonth(
                      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                    );
                  }}
                  className="neon-outline-btn px-2 py-1 text-sm"
                  title="Next month"
                >
                  ›
                </button>
              </div>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                Loading…
              </div>
            ) : (
              <>
                {analyticsData?.revenueThisMonthCents != null && (
                  <div
                    onClick={() => {
                      const v = analyticsData.revenueThisMonthCents;
                      const s = `$${(v / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
                      navigator.clipboard
                        .writeText(s)
                        .then(() =>
                          import("react-hot-toast").then((m) =>
                            m.toast.success("Revenue copied"),
                          ),
                        )
                        .catch(() => {});
                    }}
                    className="rounded-lg border border-white/10 bg-black/20 p-4 cursor-pointer"
                    title="Click to copy"
                  >
                    <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
                      Revenue
                    </p>
                    <p className="text-3xl font-black text-[var(--text)] mt-1 flex items-center gap-2 text-green-400">
                      {analyticsData.revenueUnavailable
                        ? "n/a"
                        : `$${(
                            analyticsData.revenueThisMonthCents / 100
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}`}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      {revMonth}
                    </p>
                  </div>
                )}

                {revCheckouts && revCheckouts.length > 0 ? (
                  <div
                    className="overflow-x-auto"
                    style={{ userSelect: "text" }}
                  >
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-[var(--text-muted)]">
                          <th className="text-left py-2 pr-3 font-semibold">
                            User
                          </th>
                          <th className="text-right py-2 font-semibold">
                            Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {revCheckouts.map((c) => (
                          <tr
                            key={c.userEmail + c.amount}
                            className="border-b border-white/5 hover:bg-white/5"
                          >
                            <td
                              className="py-2 pr-3 text-[var(--text)] truncate max-w-64"
                              style={{ userSelect: "text" }}
                            >
                              {c.userEmail}
                            </td>
                            <td
                              className="py-2 text-right text-[var(--text)] whitespace-nowrap"
                              style={{ userSelect: "text" }}
                            >
                              $
                              {(c.amount / 100).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    No paid checkouts in {revMonth}.
                  </p>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Monthly Analytics */}
      <div className="neon-card p-6 space-y-5 max-w-4xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faChartLine}
              className="text-[#34D399] text-lg"
            />
            <h2 className="text-lg font-bold text-[var(--text)]">
              Monthly Analytics
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const [y, m] = analyticsMonth.split("-").map(Number);
                const d = new Date(y, m - 2, 1);
                setAnalyticsMonth(
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                );
              }}
              className="neon-outline-btn px-2 py-1 text-sm"
              title="Previous month"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <span className="min-w-32 text-center text-sm font-semibold text-[var(--text)]">
              {monthLabel(analyticsMonth)}
            </span>
            <button
              type="button"
              onClick={() => {
                const [y, m] = analyticsMonth.split("-").map(Number);
                const d = new Date(y, m, 1);
                setAnalyticsMonth(
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                );
              }}
              className="neon-outline-btn px-2 py-1 text-sm"
              title="Next month"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </div>

        {analyticsLoading && analyticsData === null ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
                  Pentests Launched
                </p>
                {analyticsLoading ? (
                  <p className="text-3xl font-black mt-1">
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin text-gray-400 text-base"
                    />
                  </p>
                ) : (
                  <p className="text-3xl font-black mt-1 flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={faRocket}
                      className="text-green-400 text-lg"
                    />
                    <span className="text-green-400">
                      {analyticsData
                        ? (
                            analyticsData.newPentestsThisMonth ??
                            analyticsData.pentests.length ??
                            0
                          ).toLocaleString()
                        : null}
                    </span>
                  </p>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {monthLabel(analyticsMonth)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
                  New Sign Ups
                </p>
                {analyticsLoading ? (
                  <p className="text-3xl font-black mt-1">
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin text-gray-400 text-base"
                    />
                  </p>
                ) : (
                  <p className="text-3xl font-black mt-1 flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={faUsers}
                      className="text-[#4590e2] text-lg"
                    />
                    <span className="text-[#4590e2]">
                      {analyticsData
                        ? analyticsData.newUsersThisMonth.toLocaleString()
                        : null}
                    </span>
                  </p>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {monthLabel(analyticsMonth)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
                  Credits Purchased
                </p>
                {analyticsLoading ? (
                  <p className="text-3xl font-black mt-1">
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin text-gray-400 text-base"
                    />
                  </p>
                ) : (
                  <p className="text-3xl font-black mt-1 flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={faShieldHalved}
                      className="text-purple-400 text-lg"
                    />
                    <span className="text-purple-400">
                      {analyticsData
                        ? (
                            analyticsData.creditsPurchasedThisMonth ??
                            analyticsData.purchasesThisMonth ??
                            0
                          ).toLocaleString()
                        : null}
                    </span>
                  </p>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {analyticsData &&
                  analyticsData.creditsPurchasedThisMonth != null
                    ? `${analyticsData.purchasesThisMonth ?? 0} checkout${(analyticsData.purchasesThisMonth ?? 0) === 1 ? "" : "s"}`
                    : monthLabel(analyticsMonth)}
                </p>
              </div>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                Loading…
              </div>
            ) : analyticsData && analyticsData.pentests.length > 0 ? (
              <div>
                <div className="flex items-center justify-end gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const rows = [
                        [
                          "User",
                          "Target Org",
                          "Target URL / IP",
                          "Status",
                          "Launched",
                        ],
                      ];
                      for (const p of analyticsData.pentests)
                        rows.push([
                          p.userEmail,
                          p.targetOrg || "",
                          p.target,
                          p.status,
                          formatDate(p.createdAt),
                        ]);
                      const text = rows.map((r) => r.join("\t")).join("\n");
                      navigator.clipboard.writeText(text).catch(() => {});
                    }}
                    className="neon-outline-btn px-3 py-1 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <FontAwesomeIcon icon={faClipboard} className="w-3 h-3" />
                    Copy table
                  </button>
                </div>
                <div
                  className="overflow-x-auto select-all"
                  style={{ userSelect: "text" }}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-[var(--text-muted)]">
                        <th className="text-left py-2 pr-3 font-semibold">
                          User
                        </th>
                        <th className="text-left py-2 pr-3 font-semibold">
                          Target Org
                        </th>
                        <th className="text-left py-2 pr-3 font-semibold">
                          Target URL / IP
                        </th>
                        <th className="text-left py-2 pr-3 font-semibold">
                          Status
                        </th>
                        <th className="text-right py-2 font-semibold">
                          Launched
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.pentests.map((p: any) => (
                        <tr
                          key={p.pentestId}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          <td
                            className="py-2 pr-3 text-[var(--text)] truncate max-w-44"
                            style={{ userSelect: "text" }}
                          >
                            {p.userEmail}
                          </td>
                          <td
                            className="py-2 pr-3 text-[var(--text-muted)] truncate max-w-32"
                            style={{ userSelect: "text" }}
                          >
                            {p.targetOrg || "—"}
                          </td>
                          <td
                            className="py-2 pr-3 text-[var(--text-muted)] truncate max-w-48"
                            style={{ userSelect: "text" }}
                          >
                            {p.target}
                          </td>
                          <td className="py-2 pr-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[p.status] || "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td
                            className="py-2 text-right text-[var(--text-muted)] whitespace-nowrap"
                            style={{ userSelect: "text" }}
                          >
                            {formatDate(p.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                No customer pentests in {monthLabel(analyticsMonth)}.
              </p>
            )}
          </>
        )}
      </div>

      {/* Active pentest queue */}
      <div className="neon-card p-6 space-y-4 max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faInbox}
              className="text-green-theme text-lg"
            />
            <h2 className="text-lg font-bold text-[var(--text)]">
              Delivery Queue
            </h2>
            {!loadingActive && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#34D399]/15 text-green-theme">
                {activePentests.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={loadActivePentests}
            disabled={loadingActive}
            className="text-xs underline opacity-60 hover:opacity-100 disabled:opacity-30"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] -mt-2">
          Pentests launched but not yet delivered. Upload a report to mark one
          completed.
        </p>

        {loadingActive ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            Loading queue…
          </div>
        ) : activeError ? (
          <p className="text-sm text-red-400">{activeError}</p>
        ) : activePentests.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-2">
            <FontAwesomeIcon
              icon={faCheckCircle}
              className="text-green-theme"
            />
            All caught up — no pentests awaiting delivery.
          </div>
        ) : (
          <div className="space-y-2">
            {activePentests.map((pentest) => {
              const age = formatAge(pentest.createdAt);
              const isUploading =
                uploadingByPentest[pentest.pentestId] === true;
              return (
                <div
                  key={pentest.pentestId}
                  className="rounded-lg border border-white/10 px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">
                      {pentest.target}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {pentest.userEmail || "Unknown client"} · ID:{" "}
                      {pentest.pentestId}
                    </p>
                    <p className="text-xs mt-1 flex items-center gap-1.5">
                      <FontAwesomeIcon
                        icon={faClock}
                        className={`${age.className} text-[10px]`}
                      />
                      <span className={age.className}>
                        Launched {age.label}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        · {formatDate(pentest.createdAt)}
                      </span>
                    </p>
                  </div>
                  <label
                    className={`neon-primary-btn px-4 py-2 text-sm font-semibold flex items-center gap-2 flex-shrink-0 ${
                      isUploading
                        ? "opacity-60 pointer-events-none"
                        : "cursor-pointer"
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <FontAwesomeIcon
                          icon={faSpinner}
                          className="animate-spin"
                        />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faUpload} /> Upload report
                      </>
                    )}
                    <input
                      type="file"
                      accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadForPentest(pentest.pentestId, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FeedbackWindow />

      {/* Upload Wizard */}
      <div className="neon-card p-6 space-y-6 max-w-2xl">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faFilePdf}
            className="text-green-theme text-lg"
          />
          <h2 className="text-lg font-bold text-[var(--text)]">
            Upload Pentest Report
          </h2>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div className="flex items-center gap-2 flex-wrap">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                    step === s.n
                      ? "bg-[#34D399] text-[#041018]"
                      : step > s.n
                        ? "bg-[#34D399]/20 text-green-theme"
                        : "bg-white/5 text-[var(--text-muted)]"
                  }`}
                >
                  {step > s.n ? (
                    <FontAwesomeIcon icon={faCheckCircle} />
                  ) : (
                    <span>{s.n}</span>
                  )}
                  {s.label}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-px w-6 ${step > s.n ? "bg-[#34D399]/40" : "bg-white/10"}`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Email with autocomplete */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <label className="text-sm font-semibold text-[var(--text-muted)] block mb-2">
                Client email address
              </label>
              <div className="relative">
                <input
                  ref={emailInputRef}
                  type="text"
                  placeholder="client@company.com"
                  value={userEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmEmail()}
                  onFocus={() =>
                    suggestions.length > 0 && setShowSuggestions(true)
                  }
                  className="neon-input w-full py-3 pr-10"
                  autoFocus
                  autoComplete="off"
                />
                {loadingSuggestions && (
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] animate-spin text-sm"
                  />
                )}
              </div>

              {/* Autocomplete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionBoxRef}
                  className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#0d1f2d] border border-[#34D399]/30 rounded-lg overflow-hidden shadow-xl"
                >
                  {suggestions.map((s) => (
                    <button
                      key={s.uid}
                      type="button"
                      onClick={() => selectSuggestion(s.email)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#34D399]/10 transition-colors text-[var(--text)] border-b border-white/5 last:border-0"
                    >
                      {s.email}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={confirmEmail}
              disabled={!userEmail.trim() || loadingPentests}
              className="neon-primary-btn px-6 py-3 font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {loadingPentests ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />{" "}
                  Loading pentests…
                </>
              ) : (
                <>
                  Next <FontAwesomeIcon icon={faArrowRight} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Choose pentest from dropdown */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
              <span>Client:</span>
              <span className="text-[var(--text)] font-semibold">
                {userEmail}
              </span>
              <button
                onClick={() => setStep(1)}
                className="ml-auto text-xs underline opacity-60 hover:opacity-100"
              >
                Change
              </button>
            </div>

            <div>
              <label className="text-sm font-semibold text-[var(--text-muted)] block mb-2">
                Select pentest{" "}
                <span className="opacity-60 font-normal">
                  ({pentests.length} found)
                </span>
              </label>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setPentestDropdownOpen((o) => !o)}
                  className="neon-input w-full py-3 px-4 flex items-center justify-between text-left"
                >
                  {selectedPentest ? (
                    <div>
                      <span className="font-semibold text-[var(--text)]">
                        {selectedPentest.target}
                      </span>
                      <span className="text-[var(--text-muted)] text-xs ml-2">
                        {formatDate(selectedPentest.createdAt)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)]">
                      Choose a pentest…
                    </span>
                  )}
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[var(--text-muted)] text-sm transition-transform ml-3 flex-shrink-0 ${pentestDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {pentestDropdownOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#0d1f2d] border border-[#34D399]/30 rounded-lg overflow-hidden shadow-xl max-h-64 overflow-y-auto">
                    {pentests.map((p) => (
                      <button
                        key={p.pentestId}
                        type="button"
                        onClick={() => {
                          setSelectedPentest(p);
                          setPentestDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-[#34D399]/10 transition-colors border-b border-white/5 last:border-0 ${
                          selectedPentest?.pentestId === p.pentestId
                            ? "bg-[#34D399]/10"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--text)]">
                              {p.target}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              {formatDate(p.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-semibold capitalize flex-shrink-0 ${statusBadge(p.status)}`}
                          >
                            {normalizePentestStatus(p.status)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="neon-outline-btn px-4 py-3 font-semibold flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faArrowLeft} /> Back
              </button>
              <button
                onClick={() => {
                  if (!selectedPentest) {
                    showToast("error", "Select a pentest first");
                    return;
                  }
                  setStep(3);
                }}
                disabled={!selectedPentest}
                className="neon-primary-btn px-6 py-3 font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                Next <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload */}
        {step === 3 && selectedPentest && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-sm bg-[#34D399]/10 border border-[#34D399]/30 rounded-lg px-4 py-3">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="text-green-theme mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-green-theme font-semibold truncate">
                  {selectedPentest.target}
                </p>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">
                  {userEmail} · {formatDate(selectedPentest.createdAt)} · ID:{" "}
                  {selectedPentest.pentestId}
                </p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="text-xs underline opacity-60 hover:opacity-100 flex-shrink-0"
              >
                Change
              </button>
            </div>

            <div>
              <label className="text-sm font-semibold text-[var(--text-muted)] block mb-2">
                Attach report (PDF or DOCX)
              </label>
              <label className="neon-outline-btn w-full py-3 font-semibold flex items-center justify-center gap-2 cursor-pointer">
                <FontAwesomeIcon icon={faUpload} />
                {reportFile ? reportFile.name : "Choose file…"}
                <input
                  type="file"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="neon-outline-btn px-4 py-3 font-semibold flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faArrowLeft} /> Back
              </button>
              <button
                onClick={uploadReport}
                disabled={isUploadingReport || !reportFile}
                className="neon-primary-btn px-6 py-3 font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {isUploadingReport ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin"
                    />{" "}
                    Uploading…
                  </>
                ) : (
                  "Upload Report"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[#34D399]/10 flex items-center justify-center mx-auto">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="text-green-theme text-3xl"
              />
            </div>
            <div>
              <p className="text-lg font-bold text-green-theme">
                Report uploaded successfully
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                The pentest for <strong>{userEmail}</strong> has been marked{" "}
                <strong>completed</strong>.<br />
                The client can now download their report from the dashboard.
              </p>
            </div>
            <button
              onClick={resetWizard}
              className="neon-outline-btn px-6 py-3 font-semibold"
            >
              Upload Another Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
