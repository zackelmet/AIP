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
  const [clientName, setClientName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [target, setTarget] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [detailedAnalysis, setDetailedAnalysis] = useState("");
  const [findings, setFindings] = useState<Finding[]>([emptyFinding()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [generatedReportUrl, setGeneratedReportUrl] = useState("");

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

  const validate = (): string[] => {
    const validationErrors: string[] = [];

    if (!clientName.trim()) validationErrors.push("Client Name is required.");
    if (!projectTitle.trim())
      validationErrors.push("Project Title is required.");

    findings.forEach((finding, index) => {
      const number = index + 1;
      if (!finding.title.trim()) {
        validationErrors.push(`Finding #${number}: Title is required.`);
      }
      if (!finding.description.trim()) {
        validationErrors.push(`Finding #${number}: Description is required.`);
      }
      if (!finding.poc.trim()) {
        validationErrors.push(
          `Finding #${number}: Proof of Concept is required.`,
        );
      }
      if (!finding.impact.trim()) {
        validationErrors.push(`Finding #${number}: Impact is required.`);
      }
      if (!finding.remediation.trim()) {
        validationErrors.push(`Finding #${number}: Remediation is required.`);
      }
      if (!finding.cvssValue.trim()) {
        validationErrors.push(`Finding #${number}: CVSS Value is required.`);
      }

      const cvss = Number.parseFloat(finding.cvss);
      if (Number.isNaN(cvss) || cvss < 0 || cvss > 10) {
        validationErrors.push(
          `Finding #${number}: CVSS Score must be a number between 0 and 10.`,
        );
      }
    });

    return validationErrors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitStatus("idle");
    setGeneratedReportUrl("");

    const validationErrors = validate();
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    const payload = {
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
      setGeneratedReportUrl(data.accessUrl || "");
      setClientName("");
      setProjectTitle("");
      setTarget("");
      setExecutiveSummary("");
      setDetailedAnalysis("");
      setFindings([emptyFinding()]);
      setErrors([]);
    } catch {
      setSubmitStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName =
    "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#34D399]/40 focus:border-[#34D399]/40 transition";

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-light text-white mb-2">Report Engine</h1>
        <p className="text-gray-400">
          Generate branded pentest PDF reports from structured findings.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="neon-card p-5 border border-red-500/30 bg-red-500/10 space-y-2">
          <p className="text-red-400 text-xs uppercase tracking-widest">
            Please fix the following
          </p>
          <ul className="list-disc list-inside text-sm text-red-300 space-y-0.5">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {submitStatus === "success" && (
        <div className="neon-card p-5 border border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399] text-sm flex items-center justify-between gap-4 flex-wrap">
          <span>Report generated successfully.</span>
          {generatedReportUrl && (
            <a
              href={generatedReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-md bg-[#34D399] text-[#041018] hover:bg-[#10b981] transition-colors"
            >
              Open PDF
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
              <span className="text-sm text-gray-400">Client Name *</span>
              <input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="e.g. Acme Corp"
                className={inputClassName}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-gray-400">Project Title *</span>
              <input
                value={projectTitle}
                onChange={(event) => setProjectTitle(event.target.value)}
                placeholder="e.g. External Pentest Q2"
                className={inputClassName}
              />
            </label>
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
                <label className="space-y-1.5">
                  <span className="text-sm text-gray-400">Title *</span>
                  <input
                    value={finding.title}
                    onChange={(event) =>
                      updateFinding(index, "title", event.target.value)
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="space-y-1.5">
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
                    className={inputClassName}
                  />
                </label>
              </div>

              <label className="space-y-1.5 block">
                <span className="text-sm text-gray-400">CVSS Value *</span>
                <input
                  value={finding.cvssValue}
                  onChange={(event) =>
                    updateFinding(index, "cvssValue", event.target.value)
                  }
                  placeholder="CVSS:3.1/..."
                  className={inputClassName}
                />
              </label>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-1.5 block">
                  <span className="text-sm text-gray-400">Description *</span>
                  <textarea
                    rows={3}
                    value={finding.description}
                    onChange={(event) =>
                      updateFinding(index, "description", event.target.value)
                    }
                    className={`${inputClassName} resize-y`}
                  />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-sm text-gray-400">
                    Proof of Concept *
                  </span>
                  <textarea
                    rows={3}
                    value={finding.poc}
                    onChange={(event) =>
                      updateFinding(index, "poc", event.target.value)
                    }
                    className={`${inputClassName} resize-y`}
                  />
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-1.5 block">
                  <span className="text-sm text-gray-400">Impact *</span>
                  <textarea
                    rows={3}
                    value={finding.impact}
                    onChange={(event) =>
                      updateFinding(index, "impact", event.target.value)
                    }
                    className={`${inputClassName} resize-y`}
                  />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-sm text-gray-400">Remediation *</span>
                  <textarea
                    rows={3}
                    value={finding.remediation}
                    onChange={(event) =>
                      updateFinding(index, "remediation", event.target.value)
                    }
                    className={`${inputClassName} resize-y`}
                  />
                </label>
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
