"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useUserData } from "@/lib/hooks/useUserData";
import {
  useUserSchedules,
  useScheduleRuns,
  Schedule,
} from "@/lib/hooks/useUserSchedules";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarCheck,
  faGlobe,
  faServer,
  faPlay,
  faPause,
  faBan,
  faPlus,
  faChevronDown,
  faChevronUp,
  faClock,
  faCheck,
  faXmark,
  faTriangleExclamation,
  faArrowRotateRight,
} from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";

type PentestType = "web_app" | "external_ip";
type IntervalPreset =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "custom";

const INTERVAL_OPTIONS: {
  value: IntervalPreset;
  label: string;
  days?: number;
}[] = [
  { value: "weekly", label: "Weekly", days: 7 },
  { value: "biweekly", label: "Every 2 Weeks", days: 14 },
  { value: "monthly", label: "Monthly", days: 30 },
  { value: "quarterly", label: "Quarterly", days: 90 },
  { value: "custom", label: "Custom interval" },
];

function formatDate(ts: any): string {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDatetime(ts: any): string {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysUntil(ts: any): string {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `in ${diff} days`;
}

/* ─── Run History for a single schedule ──────────────────────── */
function RunHistory({ scheduleId }: { scheduleId: string }) {
  const { runs, loading } = useScheduleRuns(scheduleId);

  if (loading)
    return <p className="text-gray-500 text-sm py-3 px-4">Loading history…</p>;
  if (runs.length === 0)
    return (
      <p className="text-gray-500 text-sm py-3 px-4">
        No runs yet — first run will execute at the next scheduled date.
      </p>
    );

  return (
    <div className="divide-y divide-white/5">
      {runs.map((run) => (
        <div
          key={run.id}
          className="flex items-center justify-between px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-3">
            {run.status === "pending" && (
              <FontAwesomeIcon icon={faClock} className="text-amber-400 w-4" />
            )}
            {run.status === "completed" && (
              <FontAwesomeIcon icon={faCheck} className="text-[#34D399] w-4" />
            )}
            {run.status === "failed" && (
              <FontAwesomeIcon icon={faXmark} className="text-red-400 w-4" />
            )}
            {run.status === "skipped_no_credits" && (
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="text-amber-400 w-4"
              />
            )}
            <span className="text-gray-300 capitalize">
              {run.status === "skipped_no_credits"
                ? "Skipped — no credits"
                : run.status}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {run.pentestId && (
              <a
                href={`/app/pentests#${run.pentestId}`}
                className="text-[#34D399] hover:text-[#10b981] text-xs font-semibold transition-colors"
              >
                View Results →
              </a>
            )}
            <span className="text-gray-500 text-xs">
              {formatDatetime(run.ranAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Schedule Card ──────────────────────────────────────────── */
function ScheduleCard({
  schedule,
  onAction,
}: {
  schedule: Schedule;
  onAction: (id: string, action: "pause" | "resume" | "cancel") => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColor =
    schedule.status === "active"
      ? "text-[#34D399] bg-[#34D399]/10 border-[#34D399]/30"
      : schedule.status === "paused"
        ? "text-amber-400 bg-amber-400/10 border-amber-400/30"
        : "text-gray-500 bg-gray-500/10 border-gray-500/30";

  const intervalText =
    schedule.intervalLabel === "weekly"
      ? "Weekly"
      : schedule.intervalLabel === "biweekly"
        ? "Every 2 Weeks"
        : schedule.intervalLabel === "monthly"
          ? "Monthly"
          : schedule.intervalLabel === "quarterly"
            ? "Quarterly"
            : schedule.intervalLabel || `Every ${schedule.intervalDays}d`;

  return (
    <div className="bg-gradient-to-br from-[#0a141f] to-[#0a141f]/80 border border-white/10 rounded-xl overflow-hidden hover:border-[#34D399]/20 transition-colors">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-[#34D399]/10 border border-[#34D399]/30 flex-shrink-0">
              <FontAwesomeIcon
                icon={schedule.type === "web_app" ? faGlobe : faServer}
                className="text-[#34D399] w-4"
              />
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold truncate">
                {schedule.targetUrl}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                {schedule.type === "web_app"
                  ? "Web Application"
                  : "External IP"}{" "}
                · {intervalText}
              </p>
            </div>
          </div>
          <span
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusColor}`}
          >
            {schedule.status}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">
              Next Run
            </p>
            <p className="text-white text-sm font-semibold">
              {schedule.status === "active"
                ? daysUntil(schedule.nextRunAt)
                : "—"}
            </p>
            <p className="text-gray-500 text-[10px] mt-0.5">
              {schedule.status === "active"
                ? formatDate(schedule.nextRunAt)
                : ""}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">
              Last Run
            </p>
            <p className="text-white text-sm font-semibold">
              {schedule.lastRunAt ? formatDate(schedule.lastRunAt) : "Never"}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">
              Total Runs
            </p>
            <p className="text-white text-sm font-semibold">
              {schedule.totalRuns}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {schedule.status === "active" && (
            <button
              onClick={() => onAction(schedule.id, "pause")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/30 text-xs font-semibold hover:bg-amber-400/20 transition-colors"
            >
              <FontAwesomeIcon icon={faPause} className="w-3" />
              Pause
            </button>
          )}
          {schedule.status === "paused" && (
            <button
              onClick={() => onAction(schedule.id, "resume")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30 text-xs font-semibold hover:bg-[#34D399]/20 transition-colors"
            >
              <FontAwesomeIcon icon={faPlay} className="w-3" />
              Resume
            </button>
          )}
          {schedule.status !== "cancelled" && (
            <button
              onClick={() => onAction(schedule.id, "cancel")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-400/10 text-red-400 border border-red-400/30 text-xs font-semibold hover:bg-red-400/20 transition-colors"
            >
              <FontAwesomeIcon icon={faBan} className="w-3" />
              Cancel
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-3 py-2 text-gray-400 hover:text-white text-xs transition-colors"
          >
            Run History
            <FontAwesomeIcon
              icon={expanded ? faChevronUp : faChevronDown}
              className="w-3"
            />
          </button>
        </div>
      </div>

      {/* Expandable run history */}
      {expanded && (
        <div className="border-t border-white/5 bg-white/[0.02] max-h-64 overflow-y-auto">
          <RunHistory scheduleId={schedule.id} />
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function SchedulingPage() {
  const { currentUser } = useAuth();
  const { userData, loading: userLoading } = useUserData();
  const { schedules, loading: schedulesLoading } = useUserSchedules(
    currentUser?.uid,
  );

  const [showForm, setShowForm] = useState(false);
  const [pentestType, setPentestType] = useState<PentestType | null>(null);
  const [targetUrl, setTargetUrl] = useState("");
  const [userRoles, setUserRoles] = useState("");
  const [roleType, setRoleType] = useState<"credentialed" | "uncredentialed">(
    "uncredentialed",
  );
  const [roles, setRoles] = useState<
    Array<{ name: string; username: string; password: string }>
  >([{ name: "", username: "", password: "" }]);
  const addRole = () =>
    setRoles((r) =>
      r.length < 3 ? [...r, { name: "", username: "", password: "" }] : r,
    );
  const removeRole = (idx: number) =>
    setRoles((r) => r.filter((_, i) => i !== idx));
  const updateRole = (
    idx: number,
    next: { name: string; username: string; password: string },
  ) => setRoles((r) => r.map((v, i) => (i === idx ? next : v)));
  const [endpoints, setEndpoints] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [intervalPreset, setIntervalPreset] =
    useState<IntervalPreset>("monthly");
  const [customDays, setCustomDays] = useState("60");
  const [submitting, setSubmitting] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const webAppCredits = userData?.credits?.web_app || 0;
  const externalIpCredits = userData?.credits?.external_ip || 0;

  const activeSchedules = schedules.filter((s) => s.status === "active");
  const pausedSchedules = schedules.filter((s) => s.status === "paused");
  const cancelledSchedules = schedules.filter((s) => s.status === "cancelled");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pentestType || !targetUrl || !hasPermission) {
      toast.error("Please fill in all required fields and confirm permission");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        type: pentestType,
        targetUrl,
        userRoles:
          pentestType === "web_app" && roleType === "uncredentialed"
            ? userRoles || null
            : null,
        roles:
          pentestType === "web_app" && roleType === "credentialed"
            ? roles
            : null,
        endpoints: endpoints || null,
        additionalContext: additionalContext || null,
      };

      if (intervalPreset === "custom") {
        payload.customIntervalDays = Number(customDays);
      } else {
        payload.intervalPreset = intervalPreset;
      }

      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create schedule");

      toast.success(
        "Schedule created! First run: " +
          new Date(data.nextRunAt).toLocaleDateString(),
      );
      setShowForm(false);
      setPentestType(null);
      setTargetUrl("");
      setUserRoles("");
      setRoleType("uncredentialed");
      setRoles([{ name: "", username: "", password: "" }]);
      setEndpoints("");
      setAdditionalContext("");
      setHasPermission(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (
    scheduleId: string,
    action: "pause" | "resume" | "cancel",
  ) => {
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} schedule`);
    }
  };

  const loading = userLoading || schedulesLoading;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <FontAwesomeIcon
                icon={faCalendarCheck}
                className="text-[#34D399]"
              />
              Test Scheduling
            </h1>
            <p className="text-gray-400">
              Set up recurring pentests that run automatically. Credits are
              deducted per run.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 bg-[#34D399] hover:bg-[#10b981] text-white font-semibold rounded-lg transition-colors"
          >
            <FontAwesomeIcon
              icon={showForm ? faXmark : faPlus}
              className="w-4"
            />
            {showForm ? "Cancel" : "New Schedule"}
          </button>
        </div>

        {/* ─── Create Form ──────────────────────────────── */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-gradient-to-br from-[#0a141f] to-[#0a141f]/80 border border-[#34D399]/30 rounded-xl p-6 space-y-6"
          >
            <h2 className="text-xl font-bold text-white">
              Create Recurring Schedule
            </h2>

            {/* Pentest Type */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Pentest Type *
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPentestType("web_app")}
                  className={`p-5 rounded-lg border-2 text-left transition-all ${
                    pentestType === "web_app"
                      ? "border-[#34D399] bg-[#34D399]/10"
                      : "border-white/10 bg-white/5 hover:border-[#34D399]/50"
                  }`}
                >
                  <FontAwesomeIcon
                    icon={faGlobe}
                    className="text-2xl text-[#34D399] mb-2"
                  />
                  <h3 className="text-lg font-bold text-white mb-1">
                    Web Application
                  </h3>
                  <p className="text-gray-400 text-xs">
                    $500/credit · Up to 3 roles, 10 endpoints
                  </p>
                  {webAppCredits > 0 && (
                    <p className="text-green-400 text-xs mt-1">
                      {webAppCredits} credit{webAppCredits !== 1 ? "s" : ""}{" "}
                      available
                    </p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPentestType("external_ip")}
                  className={`p-5 rounded-lg border-2 text-left transition-all ${
                    pentestType === "external_ip"
                      ? "border-[#34D399] bg-[#34D399]/10"
                      : "border-white/10 bg-white/5 hover:border-[#34D399]/50"
                  }`}
                >
                  <FontAwesomeIcon
                    icon={faServer}
                    className="text-2xl text-[#34D399] mb-2"
                  />
                  <h3 className="text-lg font-bold text-white mb-1">
                    External IP
                  </h3>
                  <p className="text-gray-400 text-xs">
                    $199/credit · Gateways & firewalls
                  </p>
                  {externalIpCredits > 0 && (
                    <p className="text-green-400 text-xs mt-1">
                      {externalIpCredits} credit
                      {externalIpCredits !== 1 ? "s" : ""} available
                    </p>
                  )}
                </button>
              </div>
            </div>

            {/* Target */}
            <div>
              <label
                htmlFor="targetUrl"
                className="block text-sm font-semibold text-white mb-2"
              >
                Target *
              </label>
              <input
                type="text"
                id="targetUrl"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder={
                  pentestType === "external_ip"
                    ? "192.168.1.1"
                    : "https://example.com"
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#34D399]"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This target will be tested on every run.
              </p>
            </div>

            {/* Web App extras */}
            {pentestType === "web_app" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-white mb-4">
                    Authentication Mode
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRoleType("credentialed")}
                      className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                        roleType === "credentialed"
                          ? "border-[#34D399] bg-[#34D399]/10"
                          : "border-white/10 bg-white/5 hover:border-[#34D399]/50"
                      }`}
                    >
                      <h3 className="text-lg font-bold text-white mb-1">
                        Credentialed
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Test with user accounts &amp; credentials. Up to 3
                        roles.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleType("uncredentialed")}
                      className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                        roleType === "uncredentialed"
                          ? "border-[#34D399] bg-[#34D399]/10"
                          : "border-white/10 bg-white/5 hover:border-[#34D399]/50"
                      }`}
                    >
                      <h3 className="text-lg font-bold text-white mb-1">
                        Uncredentialed
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Scan externally without any authenticated sessions.
                      </p>
                    </button>
                  </div>
                </div>

                {roleType === "credentialed" && (
                  <div className="space-y-3">
                    <p className="text-sm text-white">
                      Add user roles and credentials for credentialed testing.
                    </p>
                    {roles.map((r, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-3 gap-3 items-end"
                      >
                        <div>
                          <label className="text-sm font-semibold text-white">
                            Role name
                          </label>
                          <input
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                            value={r.name}
                            onChange={(e) =>
                              updateRole(idx, { ...r, name: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-white">
                            Username
                          </label>
                          <input
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                            value={r.username}
                            onChange={(e) =>
                              updateRole(idx, {
                                ...r,
                                username: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-white">
                            Password / Key
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                              value={r.password}
                              onChange={(e) =>
                                updateRole(idx, {
                                  ...r,
                                  password: e.target.value,
                                })
                              }
                            />
                            <button
                              type="button"
                              className="px-3 py-2 bg-white/5 rounded-lg text-white"
                              onClick={() => removeRole(idx)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-3">
                      {roles.length < 3 && (
                        <button
                          type="button"
                          className="px-4 py-2 bg-[#34D399] rounded-lg text-[#041018] font-semibold"
                          onClick={addRole}
                        >
                          Add Role
                        </button>
                      )}
                      <span className="text-sm text-gray-400">
                        {roles.length} / 3 roles
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    API Endpoints (optional)
                  </label>
                  <textarea
                    value={endpoints}
                    onChange={(e) => setEndpoints(e.target.value)}
                    placeholder="e.g., /api/users, /api/posts (max 10)"
                    rows={2}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#34D399]"
                  />
                </div>
              </>
            )}

            {/* Additional Context */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Additional Context (optional)
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Any additional information for the pentest…"
                rows={2}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#34D399]"
              />
            </div>

            {/* Interval picker */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Run Frequency *
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntervalPreset(opt.value)}
                    className={`px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                      intervalPreset === opt.value
                        ? "border-[#34D399] bg-[#34D399]/10 text-[#34D399]"
                        : "border-white/10 bg-white/5 text-gray-400 hover:border-[#34D399]/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {intervalPreset === "custom" && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-gray-400 text-sm">Run every</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:border-[#34D399]"
                  />
                  <span className="text-gray-400 text-sm">days</span>
                </div>
              )}
            </div>

            {/* Credit notice */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-gray-300 text-sm">
                <FontAwesomeIcon
                  icon={faArrowRotateRight}
                  className="text-[#34D399] mr-2"
                />
                <strong>1 credit</strong> will be deducted each time this
                schedule runs. If you have no credits when a run is due, the run
                will be skipped and the schedule paused until you purchase more
                credits.
              </p>
            </div>

            {/* Permission checkbox */}
            <div
              onClick={() => setHasPermission(!hasPermission)}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all select-none ${
                hasPermission
                  ? "border-[#34D399] bg-[#34D399]/10"
                  : "border-white/20 bg-white/5 hover:border-[#34D399]/50"
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                  hasPermission
                    ? "bg-[#34D399] border-[#34D399]"
                    : "border-gray-500"
                }`}
              >
                {hasPermission && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 12 12"
                  >
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="text-white font-semibold">
                  I confirm I have ongoing permission
                </span>{" "}
                to perform recurring penetration testing on the target specified
                above. I accept full responsibility for ensuring I am authorised
                to test this target on each scheduled run.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                submitting || !pentestType || !targetUrl || !hasPermission
              }
              className="w-full py-4 bg-[#34D399] hover:bg-[#10b981] text-white font-bold rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating…" : "Create Schedule"}
            </button>
          </form>
        )}

        {/* ─── Loading state ────────────────────────────── */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading schedules…</div>
          </div>
        )}

        {/* ─── Active Schedules ─────────────────────────── */}
        {!loading && activeSchedules.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              Active Schedules
              <span className="text-gray-500 font-normal text-sm ml-1">
                ({activeSchedules.length})
              </span>
            </h2>
            <div className="grid gap-4">
              {activeSchedules.map((s) => (
                <ScheduleCard key={s.id} schedule={s} onAction={handleAction} />
              ))}
            </div>
          </div>
        )}

        {/* ─── Paused Schedules ─────────────────────────── */}
        {!loading && pausedSchedules.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Paused
              <span className="text-gray-500 font-normal text-sm ml-1">
                ({pausedSchedules.length})
              </span>
            </h2>
            <div className="grid gap-4">
              {pausedSchedules.map((s) => (
                <ScheduleCard key={s.id} schedule={s} onAction={handleAction} />
              ))}
            </div>
          </div>
        )}

        {/* ─── Cancelled Schedules ──────────────────────── */}
        {!loading && cancelledSchedules.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              Cancelled
              <span className="text-gray-500 font-normal text-sm ml-1">
                ({cancelledSchedules.length})
              </span>
            </h2>
            <div className="grid gap-4">
              {cancelledSchedules.map((s) => (
                <ScheduleCard key={s.id} schedule={s} onAction={handleAction} />
              ))}
            </div>
          </div>
        )}

        {/* ─── Empty State ──────────────────────────────── */}
        {!loading && schedules.length === 0 && !showForm && (
          <div className="bg-gradient-to-br from-[#0a141f] to-[#0a141f]/80 border border-white/10 rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 rounded-full bg-white/5 inline-flex mb-4">
                <FontAwesomeIcon
                  icon={faCalendarCheck}
                  className="text-5xl text-gray-500"
                />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No Scheduled Tests
              </h3>
              <p className="text-gray-400 mb-6">
                Set up recurring pentests to automatically test your targets on
                a schedule. Credits are deducted one at a time as each run
                executes.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-block px-8 py-3 bg-[#34D399] hover:bg-[#10b981] text-white font-semibold rounded-lg transition-colors"
              >
                Create Your First Schedule
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
