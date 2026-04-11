"use client";

import {
  faUsers,
  faUpload,
  faFilePdf,
  faCheckCircle,
  faShieldHalved,
  faArrowRight,
  faArrowLeft,
  faChevronDown,
  faChevronUp,
  faSpinner,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { normalizePentestStatus } from "@/lib/pentests/status";

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
}

interface PentestHistoryItem {
  pentestId: string;
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

function statusBadge(status: string) {
  const normalized = normalizePentestStatus(status);
  const map: Record<string, string> = {
    completed: "text-[#34D399]",
    running: "text-yellow-400",
  };
  return map[normalized] ?? "text-[var(--text-muted)]";
}

export default function AdminDashboard() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [newUsers30Days, setNewUsers30Days] = useState<number>(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
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
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setTotalUsers(d.totalUsers ?? 0);
        setNewUsers30Days(d.newUsers30Days ?? 0);
      })
      .catch(() => {
        setTotalUsers(0);
        setNewUsers30Days(0);
      })
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
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
        setLoadingUserDirectory(false);
      }
    };

    loadUsers();
  }, []);

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
          className="text-[#34D399] text-2xl"
        />
        <div>
          <h1 className="text-2xl font-black text-[var(--text)]">
            Admin Dashboard
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Affordable Pentesting — internal tools
          </p>
        </div>
        <Link
          href="/admin/analytics"
          className="ml-auto neon-outline-btn px-4 py-2 text-sm font-semibold flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faChartLine} /> Analytics
        </Link>
      </div>

      {/* Stats */}
      <div className="neon-card p-5 flex items-center gap-4 w-fit">
        <div className="w-12 h-12 rounded-xl bg-[#34D399]/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faUsers} className="text-[#34D399] text-xl" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Total Users
          </p>
          <p className="text-3xl font-black text-[var(--text)]">
            {loadingUsers ? <span className="opacity-40">—</span> : totalUsers}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            +{newUsers30Days} in last 30 days
          </p>
        </div>
      </div>

      {/* Upload Wizard */}
      <div className="neon-card p-6 space-y-6 max-w-2xl">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faFilePdf}
            className="text-[#34D399] text-lg"
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
                        ? "bg-[#34D399]/20 text-[#34D399]"
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

              {/* Custom dropdown */}
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
                className="text-[#34D399] mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[#34D399] font-semibold truncate">
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
                className="text-[#34D399] text-3xl"
              />
            </div>
            <div>
              <p className="text-lg font-bold text-[#34D399]">
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

      <div className="neon-card p-5 space-y-4 max-w-4xl">
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

        {loadingUserDirectory ? (
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
