"use client";

import { FormEvent, useRef, useState } from "react";
import { parseCSVFindings } from "@/lib/findings/parseFindingsBlock";

interface Finding {
  title: string;
  description: string;
  poc: string;
  impact: string;
  remediation: string;
  cvss: number;
  cvssValue: string;
  cvss31Score?: string;
  cvss31Vector?: string;
  severity: string;
}

const RISK_TO_CVSS: Record<string, number> = {
  critical: 9.0,
  high: 7.5,
  medium: 5.0,
  low: 2.5,
  info: 0.0,
};

export default function QuickReport() {
  const [reportType, setReportType] = useState<"external" | "webapp">(
    "external",
  );
  const [brand, setBrand] = useState<"msp" | "aip">("msp");
  const [clientName, setClientName] = useState("");
  const [target, setTarget] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [findingSummary, setFindingSummary] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCSVImport = (file: File) => {
    setCsvImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSVFindings(text);
      if (parsed.length === 0) {
        setCsvImportError(
          "No findings found. Ensure the CSV has a header row with a 'Title' column.",
        );
        setFindings([]);
        setCsvFileName("");
        return;
      }
      const mapped: Finding[] = parsed.map((f) => ({
        title: f.title,
        description: f.description,
        poc: f.evidence,
        impact: f.stepsToReproduce, // Impact column maps here
        remediation: f.remediation,
        cvss: Number(f.cvss31Score) || RISK_TO_CVSS[f.severity] || 5.0,
        cvssValue: f.severity.charAt(0).toUpperCase() + f.severity.slice(1),
        cvss31Score: f.cvss31Score,
        cvss31Vector: f.cvss31Vector,
        severity: f.severity,
      }));
      setFindings(mapped);
      setCsvFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!clientName.trim()) {
      setFormError("Target organization name is required.");
      return;
    }
    if (findings.length === 0) {
      setFormError("Import a CSV of findings first.");
      return;
    }

    const payload = {
      reportType,
      brand,
      clientName: clientName.trim(),
      target: target.trim() || undefined,
      executiveSummary: executiveSummary.trim() || undefined,
      detailedAnalysis: findingSummary.trim() || undefined,
      findings,
    };

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/quick-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const data = await response.json();
          message = data?.error || message;
        } catch {}
        throw new Error(message);
      }

      // Stream the PDF blob to a download.
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pentest Report - ${clientName.trim() || "Client"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to generate PDF report.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName =
    "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#34D399]/40 focus:border-[#34D399]/40 transition";
  const selectClassName =
    "w-full rounded-lg border border-white/20 bg-[#0a1929] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#34D399]/40 transition cursor-pointer";

  const severityCounts = findings.reduce(
    (acc, f) => {
      const sev = (f.severity || "medium").toLowerCase();
      acc[sev] = (acc[sev] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white mb-1">
            Report Engine v2
          </h1>
          <p className="text-gray-400 text-sm">
            Drop a findings CSV, add a few details, and download a
            delivery-ready PDF.
          </p>
        </div>
        <button
          type="submit"
          form="quick-report-form"
          disabled={submitting}
          className="rounded-lg bg-[#34D399] hover:bg-[#10b981] disabled:opacity-50 disabled:cursor-not-allowed text-[#041018] px-6 py-2.5 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
        >
          {submitting ? "Generating…" : "Generate PDF"}
        </button>
      </div>

      {formError && (
        <div className="neon-card p-4 border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          {formError}
        </div>
      )}

      <form id="quick-report-form" onSubmit={handleSubmit} className="space-y-6">
        {/* ── Step 1: findings CSV ── */}
        <section className="neon-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-xl text-[var(--text)]">Findings CSV</h2>
            <div className="flex items-center gap-3">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCSVImport(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="rounded-lg bg-[#34D399] hover:bg-[#10b981] text-[#041018] px-4 py-2 text-sm transition-colors"
              >
                {findings.length > 0 ? "Replace CSV" : "Import CSV"}
              </button>
            </div>
          </div>

          {csvImportError && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {csvImportError}
            </div>
          )}

          {findings.length > 0 ? (
            <div className="text-sm text-gray-300 space-y-1">
              <p>
                <span className="text-[#34D399] font-medium">
                  {findings.length}
                </span>{" "}
                finding{findings.length === 1 ? "" : "s"} imported
                {csvFileName ? ` from ${csvFileName}` : ""}.
              </p>
              <p className="text-gray-400 text-xs">
                {(["critical", "high", "medium", "low", "info"] as const)
                  .filter((s) => severityCounts[s])
                  .map(
                    (s) =>
                      `${severityCounts[s]} ${s.charAt(0).toUpperCase()}${s.slice(1)}`,
                  )
                  .join(" · ") || "Severity not specified"}
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Expected columns (case-insensitive): Title, Severity, Description,
              Evidence/PoC, Impact, Remediation.
            </p>
          )}
        </section>

        {/* ── Step 2: engagement details ── */}
        <section className="neon-card p-6 space-y-4">
          <h2 className="text-xl text-[var(--text)]">Report Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-sm text-gray-400">Environment Type *</span>
              <select
                value={reportType}
                onChange={(e) =>
                  setReportType(e.target.value as "external" | "webapp")
                }
                className={selectClassName}
              >
                <option value="external" className="bg-[#0a1929] text-white">
                  External
                </option>
                <option value="webapp" className="bg-[#0a1929] text-white">
                  Web App
                </option>
              </select>
            </label>
            <label className="space-y-1.5 block">
              <span className="text-sm text-gray-400">Branding *</span>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as "msp" | "aip")}
                className={selectClassName}
              >
                <option value="msp" className="bg-[#0a1929] text-white">
                  MSP Pentesting
                </option>
                <option value="aip" className="bg-[#0a1929] text-white">
                  Affordable Pentesting
                </option>
              </select>
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-sm text-gray-400">
                Target Organization Name *
              </span>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className={inputClassName}
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-sm text-gray-400">Target</span>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="domain / IP / app URL"
                className={inputClassName}
              />
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-sm text-gray-400">Executive Summary</span>
            <textarea
              rows={4}
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              placeholder="High-level business summary for leadership"
              className={`${inputClassName} resize-y`}
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-sm text-gray-400">Finding Summary</span>
            <textarea
              rows={4}
              value={findingSummary}
              onChange={(e) => setFindingSummary(e.target.value)}
              placeholder="Overall summary of the findings / analyst notes"
              className={`${inputClassName} resize-y`}
            />
          </label>
        </section>
      </form>
    </div>
  );
}
