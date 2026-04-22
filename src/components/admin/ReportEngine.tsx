"use client";

import { FormEvent, useState } from "react";

interface Finding {
  title: string;
  description: string;
  poc: string;
  impact: string;
  remediation: string;
  cvss: string;
  cvssValue: string;
}

const emptyFinding = (): Finding => ({
  title: "",
  description: "",
  poc: "",
  impact: "",
  remediation: "",
  cvss: "",
  cvssValue: "",
});

export default function ReportEngine() {
  const [reportType, setReportType] = useState<"external" | "webapp">(
    "external",
  );
  const [clientName, setClientName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [target, setTarget] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [detailedAnalysis, setDetailedAnalysis] = useState("");
  const [findings, setFindings] = useState<Finding[]>([emptyFinding()]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [generatedReportUrl, setGeneratedReportUrl] = useState("");
  const [downloadFileName, setDownloadFileName] = useState("");

  const addFinding = () => setFindings([...findings, emptyFinding()]);

  const removeFinding = (index: number) => {
    if (findings.length === 1) return;
    setFindings(findings.filter((_, i) => i !== index));
  };

  const updateFinding = (
    index: number,
    field: keyof Finding,
    value: string,
  ) => {
    const updated = [...findings];
    updated[index] = { ...updated[index], [field]: value };
    setFindings(updated);
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (!clientName.trim()) errs["clientName"] = "Required";
    if (!projectTitle.trim()) errs["projectTitle"] = "Required";

    findings.forEach((finding, index) => {
      if (!finding.title.trim()) errs[`findings.${index}.title`] = "Required";
      if (!finding.description.trim()) errs[`findings.${index}.description`] = "Required";
      if (!finding.poc.trim()) errs[`findings.${index}.poc`] = "Required";
      if (!finding.impact.trim()) errs[`findings.${index}.impact`] = "Required";
      if (!finding.remediation.trim()) errs[`findings.${index}.remediation`] = "Required";
      if (!finding.cvssValue.trim()) errs[`findings.${index}.cvssValue`] = "Required";
      const cvss = Number.parseFloat(finding.cvss);
      if (Number.isNaN(cvss) || cvss < 0 || cvss > 10) {
        errs[`findings.${index}.cvss`] = "Must be 0–10";
      }
    });

    return errs;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitStatus("idle");
    setGeneratedReportUrl("");

    const validationErrors = validate();
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const payload = {
      reportType,
      clientName: clientName.trim(),
      projectTitle: projectTitle.trim(),
      target: target.trim() || undefined,
      executiveSummary: executiveSummary.trim() || undefined,
      detailedAnalysis: detailedAnalysis.trim() || undefined,
      findings: findings.map((finding) => ({
        title: finding.title.trim(),
        description: finding.description.trim(),
        poc: finding.poc.trim(),
        impact: finding.impact.trim(),
        remediation: finding.remediation.trim(),
        cvss: Number.parseFloat(finding.cvss),
        cvssValue: finding.cvssValue.trim(),
      })),
    };

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/report-engine/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      setSubmitStatus("success");
      setGeneratedReportUrl(data.signedUrl || data.accessUrl || "");
      setDownloadFileName(data.fileName || "report.docx");
      setClientName("");
      setProjectTitle("");
      setTarget("");
      setReportType("external");
      setExecutiveSummary("");
      setDetailedAnalysis("");
      setFindings([emptyFinding()]);
      setFieldErrors({});
    } catch {
      setSubmitStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName =
    "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#34D399]/40 focus:border-[#34D399]/40 transition";
  const errorInputClassName =
    "w-full rounded-lg border border-red-500/60 bg-red-500/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/60 transition";
  const cx = (key: string) =>
    fieldErrors[key] ? errorInputClassName : inputClassName;
  const fe = (key: string) =>
    fieldErrors[key] ? (
      <p className="text-xs text-red-400 mt-1">{fieldErrors[key]}</p>
    ) : null;

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-light text-white mb-2">Report Engine</h1>
        <p className="text-gray-400">
          Generate branded pentest DOCX reports from structured findings.
        </p>
      </div>

      {hasErrors && (
        <div className="neon-card p-4 border border-red-500/30 bg-red-500/10">
          <p className="text-red-400 text-sm">Please fix the highlighted fields before generating.</p>
        </div>
      )}

      {submitStatus === "success" && (
        <div className="neon-card p-5 border border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399] text-sm flex items-center justify-between gap-4 flex-wrap">
          <span>Report generated successfully.</span>
          {generatedReportUrl && (
            <a
              href={generatedReportUrl}
              download={downloadFileName || "report.docx"}
              className="px-4 py-2 rounded-md bg-[#34D399] text-[#041018] hover:bg-[#10b981] transition-colors"
            >
              Download Report
            </a>
          )}
        </div>
      )}

      {submitStatus === "error" && (
        <div className="neon-card p-5 border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          Failed to generate report. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="neon-card p-6 space-y-4">
          <h2 className="text-xl text-[var(--text)]">Engagement Details</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <label className="space-y-1.5">
              <span className="text-sm text-gray-400">Report Type *</span>
              <select
                value={reportType}
                onChange={(event) =>
                  setReportType(event.target.value as "external" | "webapp")
                }
                className={inputClassName}
              >
                <option value="external">External Pentest</option>
                <option value="webapp">WebApp Pentest</option>
              </select>
            </label>
            <div className="space-y-1.5">
              <span className="text-sm text-gray-400">Client Name *</span>
              <input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="e.g. Acme Corp"
                className={cx("clientName")}
              />
              {fe("clientName")}
            </div>
            <div className="space-y-1.5">
              <span className="text-sm text-gray-400">Project Title *</span>
              <input
                value={projectTitle}
                onChange={(event) => setProjectTitle(event.target.value)}
                placeholder="e.g. External Pentest Q2"
                className={cx("projectTitle")}
              />
              {fe("projectTitle")}
            </div>
            <label className="space-y-1.5">
              <span className="text-sm text-gray-400">Target (optional)</span>
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="domain/IP"
                className={inputClassName}
              />
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-sm text-gray-400">
                Executive Summary (optional)
              </span>
              <textarea
                rows={4}
                value={executiveSummary}
                onChange={(event) => setExecutiveSummary(event.target.value)}
                placeholder="High-level business summary for leadership"
                className={`${inputClassName} resize-y`}
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-sm text-gray-400">
                Detailed Analysis (optional)
              </span>
              <textarea
                rows={4}
                value={detailedAnalysis}
                onChange={(event) => setDetailedAnalysis(event.target.value)}
                placeholder="Raw notes, methodology details, or analyst output"
                className={`${inputClassName} resize-y`}
              />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl text-[var(--text)]">
              Findings ({findings.length})
            </h2>
            <button
              type="button"
              onClick={addFinding}
              className="rounded-lg bg-[#34D399] hover:bg-[#10b981] text-[#041018] px-4 py-2 text-sm transition-colors"
            >
              Add Finding
            </button>
          </div>

          {findings.map((finding, index) => (
            <div key={index} className="neon-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg text-[var(--text)]">
                  Finding #{index + 1}
                </h3>
                {findings.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFinding(index)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-[1fr_160px] gap-4">
                <div className="space-y-1.5">
                  <span className="text-sm text-gray-400">Title *</span>
                  <input
                    value={finding.title}
                    onChange={(event) =>
                      updateFinding(index, "title", event.target.value)
                    }
                    className={cx(`findings.${index}.title`)}
                  />
                  {fe(`findings.${index}.title`)}
                </div>
                <div className="space-y-1.5">
                  <span className="text-sm text-gray-400">CVSS Score *</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={finding.cvss}
                    onChange={(event) =>
                      updateFinding(index, "cvss", event.target.value)
                    }
                    className={cx(`findings.${index}.cvss`)}
                  />
                  {fe(`findings.${index}.cvss`)}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-sm text-gray-400">CVSS Value *</span>
                <input
                  value={finding.cvssValue}
                  onChange={(event) =>
                    updateFinding(index, "cvssValue", event.target.value)
                  }
                  placeholder="CVSS:3.1/AV:N/AC:L/..."
                  className={cx(`findings.${index}.cvssValue`)}
                />
                {fe(`findings.${index}.cvssValue`)}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-sm text-gray-400">Description *</span>
                  <textarea
                    rows={3}
                    value={finding.description}
                    onChange={(event) =>
                      updateFinding(index, "description", event.target.value)
                    }
                    className={`${cx(`findings.${index}.description`)} resize-y`}
                  />
                  {fe(`findings.${index}.description`)}
                </div>
                <div className="space-y-1.5">
                  <span className="text-sm text-gray-400">Proof of Concept *</span>
                  <textarea
                    rows={3}
                    value={finding.poc}
                    onChange={(event) =>
                      updateFinding(index, "poc", event.target.value)
                    }
                    className={`${cx(`findings.${index}.poc`)} resize-y`}
                  />
                  {fe(`findings.${index}.poc`)}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-sm text-gray-400">Impact *</span>
                  <textarea
                    rows={3}
                    value={finding.impact}
                    onChange={(event) =>
                      updateFinding(index, "impact", event.target.value)
                    }
                    className={`${cx(`findings.${index}.impact`)} resize-y`}
                  />
                  {fe(`findings.${index}.impact`)}
                </div>
                <div className="space-y-1.5">
                  <span className="text-sm text-gray-400">Remediation *</span>
                  <textarea
                    rows={3}
                    value={finding.remediation}
                    onChange={(event) =>
                      updateFinding(index, "remediation", event.target.value)
                    }
                    className={`${cx(`findings.${index}.remediation`)} resize-y`}
                  />
                  {fe(`findings.${index}.remediation`)}
                </div>
              </div>
            </div>
          ))}
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#34D399] hover:bg-[#10b981] disabled:opacity-50 disabled:cursor-not-allowed text-[#041018] px-8 py-3 text-sm transition-colors"
          >
            {submitting ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
