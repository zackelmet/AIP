"use client";

import { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faBug,
  faSearch,
  faFilter,
  faExclamationTriangle,
  faExclamationCircle,
  faInfoCircle,
  faCheckCircle,
  faChevronRight,
  faShieldAlt,
  faPaste,
  faEdit,
  faTrash,
  faSpinner,
  faUpload,
  faFileAlt,
} from "@fortawesome/free-solid-svg-icons";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useFindings } from "@/lib/hooks/useFindings";
import { useAuth } from "@/lib/context/AuthContext";
import { auth } from "@/lib/firebase/firebaseClient";
import { Severity, FindingStatus } from "@/lib/types/pentest";
import {
  parseFindingsBlock,
  parseCSVFindings,
  type ParsedFinding,
} from "@/lib/findings/parseFindingsBlock";

const severityConfig: Record<
  Severity,
  { icon: any; color: string; bg: string }
> = {
  critical: {
    icon: faExclamationCircle,
    color: "text-red-400",
    bg: "bg-red-500/20",
  },
  high: {
    icon: faExclamationTriangle,
    color: "text-orange-400",
    bg: "bg-orange-500/20",
  },
  medium: {
    icon: faExclamationTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
  low: {
    icon: faInfoCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
  },
  info: {
    icon: faInfoCircle,
    color: "text-gray-400",
    bg: "bg-gray-500/20",
  },
};

const statusLabels: Record<FindingStatus, string> = {
  open: "Open",
  confirmed: "Confirmed",
  false_positive: "False Positive",
  remediated: "Remediated",
  accepted_risk: "Accepted Risk",
};

// ─────────────────────────────────────────────────────────────────────────────

export default function FindingsPage() {
  const { findings, loading } = useFindings();
  const { currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [target, setTarget] = useState("");
  const [affectedComponent, setAffectedComponent] = useState("");
  const [evidence, setEvidence] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [remediation, setRemediation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Paste-block mode
  const [inputMode, setInputMode] = useState<"manual" | "paste">("manual");
  const [pasteMode, setPasteMode] = useState<"text" | "csv">("text");
  const [pasteBlock, setPasteBlock] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [parsedFindings, setParsedFindings] = useState<ParsedFinding[] | null>(
    null,
  );
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filteredFindings = findings.filter((finding) => {
    const matchesSearch =
      finding.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finding.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finding.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity =
      filterSeverity === "all" || finding.severity === filterSeverity;
    const matchesStatus =
      filterStatus === "all" || finding.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const stats = useMemo(() => {
    return {
      total: findings.length,
      critical: findings.filter((f) => f.severity === "critical").length,
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
      open: findings.filter((f) => f.status === "open").length,
    };
  }, [findings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/findings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          severity,
          target,
          affectedComponent,
          evidence,
          stepsToReproduce,
          remediation,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create finding");
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("Error creating finding:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSeverity("medium");
    setTarget("");
    setAffectedComponent("");
    setEvidence("");
    setStepsToReproduce("");
    setRemediation("");
    // reset paste mode
    setInputMode("manual");
    setPasteMode("text");
    setPasteBlock("");
    setCsvFileName(null);
    setParsedFindings(null);
    setBulkError(null);
  };

  const handleParse = () => {
    setBulkError(null);
    const results = parseFindingsBlock(pasteBlock);
    if (results.length === 0) {
      setBulkError(
        "No findings detected. Make sure each finding has at least a 'Title:' field.",
      );
      return;
    }
    setParsedFindings(results);
  };

  const handleBulkSubmit = async () => {
    if (!currentUser || !parsedFindings) return;
    setBulkSubmitting(true);
    setBulkError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const errors: string[] = [];
      for (const f of parsedFindings) {
        const res = await fetch("/api/findings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(f),
        });
        if (!res.ok) errors.push(f.title);
      }
      if (errors.length) {
        setBulkError(`Failed to submit: ${errors.join(", ")}`);
      } else {
        setShowModal(false);
        resetForm();
      }
    } catch (err) {
      setBulkError("Unexpected error during bulk submit.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light text-white mb-2">Findings</h1>
            <p className="text-gray-400 mt-1">
              Track vulnerabilities and security findings
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#34D399] text-white font-semibold rounded-lg hover:bg-[#10b981] transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
            Add Finding
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-red-400">
              {stats.critical}
            </div>
            <div className="text-sm text-gray-400">Critical</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-orange-400">
              {stats.high}
            </div>
            <div className="text-sm text-gray-400">High</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {stats.medium}
            </div>
            <div className="text-sm text-gray-400">Medium</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-emerald-400">
              {stats.low}
            </div>
            <div className="text-sm text-gray-400">Low</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-purple-400">
              {stats.open}
            </div>
            <div className="text-sm text-gray-400">Open</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4"
              />
              <input
                type="text"
                placeholder="Search findings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] bg-white/5 text-white"
              />
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] min-w-[140px] bg-white/5 text-white"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] min-w-[140px] bg-white/5 text-white"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="confirmed">Confirmed</option>
              <option value="remediated">Remediated</option>
              <option value="false_positive">False Positive</option>
              <option value="accepted_risk">Accepted Risk</option>
            </select>
          </div>
        </div>

        {/* Findings List */}
        <div className="bg-white/5 rounded-xl border border-white/10">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading findings...
            </div>
          ) : filteredFindings.length === 0 ? (
            <div className="p-8 text-center">
              <FontAwesomeIcon
                icon={faShieldAlt}
                className="w-12 h-12 text-gray-600 mb-4"
              />
              <h3 className="text-lg font-medium text-white">
                No findings yet
              </h3>
              <p className="text-gray-400 mt-1">
                Add findings from your pentests.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#34D399] text-white font-semibold rounded-lg hover:bg-[#10b981] transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                Add Finding
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredFindings.map((finding) => {
                const sevConfig = severityConfig[finding.severity];
                return (
                  <div
                    key={finding.id}
                    className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${sevConfig.bg}`}>
                          <FontAwesomeIcon
                            icon={sevConfig.icon}
                            className={`w-4 h-4 ${sevConfig.color}`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-white">
                              {finding.title}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${sevConfig.bg} ${sevConfig.color}`}
                            >
                              {finding.severity}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-gray-300">
                              {finding.target}
                            </span>
                            <span>{statusLabels[finding.status]}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(finding.discoveredAt)}
                        </span>
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          className="w-4 h-4 text-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Finding Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
            {/* Modal header + tab toggle */}
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Add Finding</h2>
              <p className="text-gray-400 mt-1">
                Document a security vulnerability or issue
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("manual");
                    setParsedFindings(null);
                    setBulkError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === "manual"
                      ? "bg-[#34D399] text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <FontAwesomeIcon icon={faEdit} className="w-3.5 h-3.5" />
                  Manual Entry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("paste");
                    setParsedFindings(null);
                    setBulkError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === "paste"
                      ? "bg-[#34D399] text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <FontAwesomeIcon icon={faPaste} className="w-3.5 h-3.5" />
                  Paste Block
                </button>
              </div>
            </div>

            {/* ── MANUAL ENTRY ── */}
            {inputMode === "manual" && (
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        placeholder="e.g., SQL Injection in Login Form"
                        className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] bg-white/5 text-white"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Severity *
                      </label>
                      <select
                        value={severity}
                        onChange={(e) =>
                          setSeverity(e.target.value as Severity)
                        }
                        className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] bg-white/5 text-white"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="info">Info</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Target *
                      </label>
                      <input
                        type="text"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        required
                        placeholder="e.g., https://example.com"
                        className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] font-mono text-sm bg-white/5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Affected Component
                      </label>
                      <input
                        type="text"
                        value={affectedComponent}
                        onChange={(e) => setAffectedComponent(e.target.value)}
                        placeholder="e.g., /api/login endpoint"
                        className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] bg-white/5 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe the vulnerability..."
                      className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] bg-white/5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Evidence / Proof of Concept
                    </label>
                    <textarea
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      rows={3}
                      placeholder="Include payloads, screenshots description, etc."
                      className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] font-mono text-sm bg-white/5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Steps to Reproduce
                    </label>
                    <textarea
                      value={stepsToReproduce}
                      onChange={(e) => setStepsToReproduce(e.target.value)}
                      rows={3}
                      placeholder="1. Go to login page&#10;2. Enter payload in username field&#10;3. ..."
                      className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] bg-white/5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Remediation Recommendation
                    </label>
                    <textarea
                      value={remediation}
                      onChange={(e) => setRemediation(e.target.value)}
                      rows={2}
                      placeholder="How to fix this vulnerability..."
                      className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] bg-white/5 text-white"
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-400 font-medium hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-[#34D399] text-white font-semibold rounded-lg hover:bg-[#10b981] transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Adding..." : "Add Finding"}
                  </button>
                </div>
              </form>
            )}

            {/* ── PASTE BLOCK ── */}
            {inputMode === "paste" && (
              <div className="p-6 space-y-4">

                {/* Sub-tab: Text vs CSV */}
                <div className="flex gap-2 bg-white/5 p-1 rounded-lg w-fit">
                  <button
                    type="button"
                    onClick={() => { setPasteMode("text"); setParsedFindings(null); setBulkError(null); setCsvFileName(null); }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      pasteMode === "text" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <FontAwesomeIcon icon={faPaste} className="w-3 h-3" />
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPasteMode("csv"); setParsedFindings(null); setBulkError(null); setPasteBlock(""); }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      pasteMode === "csv" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <FontAwesomeIcon icon={faFileAlt} className="w-3 h-3" />
                    Upload CSV
                  </button>
                </div>

                {/* ── TEXT mode ── */}
                {pasteMode === "text" && (
                  <>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-gray-400 font-mono leading-relaxed">
                      <span className="text-[#34D399] font-semibold">Supported format</span>
                      {" "}— label each field, separate findings with{" "}
                      <code className="bg-white/10 px-1 rounded">---</code>:<br />
                      <span className="text-gray-300">Title:</span> SQL Injection in Login Form<br />
                      <span className="text-gray-300">Severity:</span> High<br />
                      <span className="text-gray-300">Target:</span> https://example.com/login<br />
                      <span className="text-gray-300">Affected Component:</span> /api/login<br />
                      <span className="text-gray-300">Description:</span> The login endpoint is vulnerable…<br />
                      <span className="text-gray-300">Evidence:</span> Payload: &apos; OR 1=1--<br />
                      <span className="text-gray-300">Remediation:</span> Use parameterised queries<br />
                      <span className="text-gray-500">---</span><br />
                      <span className="text-gray-300">Title:</span> Reflected XSS …
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Paste findings block</label>
                      <textarea
                        value={pasteBlock}
                        onChange={(e) => { setPasteBlock(e.target.value); setParsedFindings(null); setBulkError(null); }}
                        rows={12}
                        placeholder="Paste your findings text here…"
                        className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] bg-white/5 text-white font-mono text-sm resize-y"
                      />
                    </div>
                  </>
                )}

                {/* ── CSV mode ── */}
                {pasteMode === "csv" && (
                  <>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-gray-400 leading-relaxed">
                      <span className="text-[#34D399] font-semibold">Expected CSV columns</span>
                      {" "}(header row required, order flexible):<br />
                      <span className="font-mono text-gray-300">
                        Title, Risk Level, Description, Proof of Concept, Impact, Remediation
                      </span><br />
                      <span className="text-gray-500">Optional: Target, Affected Component</span>
                    </div>

                    {!csvFileName ? (
                      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-[#34D399]/50 hover:bg-white/5 transition-colors group">
                        <FontAwesomeIcon icon={faUpload} className="w-8 h-8 text-gray-600 group-hover:text-[#34D399] transition-colors mb-2" />
                        <span className="text-sm text-gray-400 group-hover:text-gray-300">Click to upload CSV file</span>
                        <span className="text-xs text-gray-600 mt-1">.csv files only</span>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setCsvFileName(file.name);
                            setParsedFindings(null);
                            setBulkError(null);
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const text = ev.target?.result as string;
                              const results = parseCSVFindings(text);
                              if (results.length === 0) {
                                setBulkError("No findings found in CSV. Check that the file has a header row with a 'Title' column.");
                                setCsvFileName(null);
                              } else {
                                setParsedFindings(results);
                              }
                            };
                            reader.readAsText(file);
                            // reset input so same file can be re-uploaded
                            e.target.value = "";
                          }}
                        />
                      </label>
                    ) : (
                      <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                        <FontAwesomeIcon icon={faFileAlt} className="w-5 h-5 text-[#34D399]" />
                        <span className="text-sm text-white font-medium truncate flex-1">{csvFileName}</span>
                        <button
                          type="button"
                          onClick={() => { setCsvFileName(null); setParsedFindings(null); setBulkError(null); }}
                          className="text-gray-500 hover:text-red-400 transition-colors text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── PASTE BLOCK shared: error + preview + action bar ── */}
            {inputMode === "paste" && (
              <div className="px-6 pb-6 space-y-4">

                {bulkError && (
                  <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    {bulkError}
                  </div>
                )}

                {/* Parse preview */}
                {parsedFindings && parsedFindings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300 font-medium">
                      {parsedFindings.length} finding
                      {parsedFindings.length !== 1 ? "s" : ""} parsed — review
                      before submitting:
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {parsedFindings.map((f, i) => {
                        const sevColors: Record<Severity, string> = {
                          critical: "text-red-400 bg-red-500/20",
                          high: "text-orange-400 bg-orange-500/20",
                          medium: "text-yellow-400 bg-yellow-500/20",
                          low: "text-emerald-400 bg-emerald-500/20",
                          info: "text-gray-400 bg-gray-500/20",
                        };
                        return (
                          <div
                            key={i}
                            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium truncate">
                                {f.title}
                              </p>
                              <p className="text-gray-500 text-xs font-mono truncate">
                                {f.target}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${sevColors[f.severity]}`}
                              >
                                {f.severity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setParsedFindings((prev) =>
                                    prev!.filter((_, idx) => idx !== i),
                                  )
                                }
                                className="text-gray-500 hover:text-red-400 transition-colors"
                                title="Remove"
                              >
                                <FontAwesomeIcon
                                  icon={faTrash}
                                  className="w-3 h-3"
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="px-4 py-2 text-gray-400 font-medium hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  {!parsedFindings ? (
                    pasteMode === "text" && (
                      <button
                        type="button"
                        onClick={handleParse}
                        disabled={!pasteBlock.trim()}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-40"
                      >
                        Parse Findings
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={handleBulkSubmit}
                      disabled={bulkSubmitting || parsedFindings.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#34D399] text-white font-semibold rounded-lg hover:bg-[#10b981] transition-colors disabled:opacity-50"
                    >
                      {bulkSubmitting && (
                        <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                      )}
                      {bulkSubmitting
                        ? "Submitting…"
                        : `Submit ${parsedFindings.length} Finding${parsedFindings.length !== 1 ? "s" : ""}`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
