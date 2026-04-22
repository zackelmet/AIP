import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import fs from "node:fs";
import path from "node:path";
import { ReportPayload } from "@/lib/report-engine/types";

type Severity = "Critical" | "High" | "Medium" | "Low" | "Informational";

function normalizeSeverity(value: string | undefined, cvss: number): Severity {
  const normalized = (value || "").toLowerCase();
  if (
    ["critical", "high", "medium", "low", "informational", "info"].includes(
      normalized,
    )
  ) {
    if (normalized === "info") return "Informational";
    return `${normalized[0].toUpperCase()}${normalized.slice(1)}` as Severity;
  }
  if (cvss >= 9) return "Critical";
  if (cvss >= 7) return "High";
  if (cvss >= 4) return "Medium";
  if (cvss > 0) return "Low";
  return "Informational";
}

function resolveTemplatePath(reportType: string): string {
  // If a webapp template exists, use it; otherwise fall back to external
  if (reportType === "webapp") {
    const webappPath = path.join(
      process.cwd(),
      "public",
      "templates",
      "webapp-report-template.docx",
    );
    if (fs.existsSync(webappPath)) return webappPath;
  }
  return path.join(
    process.cwd(),
    "public",
    "templates",
    "external-report-template.docx",
  );
}

export function buildReportDocx(payload: ReportPayload): Buffer {
  const templatePath = resolveTemplatePath(payload.reportType ?? "external");

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Report template not found at ${templatePath}`);
  }

  const templateBuffer = fs.readFileSync(templatePath);
  const zip = new PizZip(templateBuffer);

  const doc = new Docxtemplater(zip, {
    // Template uses {{double braces}}
    delimiters: { start: "{{", end: "}}" },
    paragraphLoop: true,
    linebreaks: true,
  });

  const now = new Date();
  const completedDate =
    payload.completedDate ?? now.toLocaleDateString("en-US");

  const scopeTargets = payload.scopeTargets?.length
    ? payload.scopeTargets
    : payload.target
      ? [payload.target]
      : ["Not provided"];

  const findings = payload.findings.map((finding, index) => ({
    index: String(index + 1).padStart(2, "0"),
    title: finding.title,
    description: finding.description,
    severity: normalizeSeverity(finding.severity, finding.cvss),
    cvss_vector: finding.cvssValue,
    impact: finding.impact,
    poc: finding.poc,
    remediation: finding.remediation,
  }));

  const toc_findings = findings.map((f) => ({
    toc_index: f.index,
    toc_title: f.title,
  }));

  doc.render({
    // Cover / header fields
    REPORT_TITLE: payload.projectTitle,
    TARGET: payload.target ?? "",
    COMPLETION_DATE: completedDate,

    // Metadata table
    REPORT_VERSION: payload.version ?? "1.0",
    REPORT_DATE: completedDate,
    TESTER_NAME: payload.tester ?? "AIP",
    REPORT_NOTES: payload.notes ?? `Penetration Test for ${payload.clientName}`,

    // Executive summary
    EXECUTIVE_SUMMARY_PARAGRAPH_1: payload.executiveSummary ?? "",
    EXECUTIVE_SUMMARY_PARAGRAPH_2: payload.detailedAnalysis ?? "",

    // Assessment overview
    PURPOSE_STATEMENT: payload.purpose ?? "",
    ASSESSMENT_INTEGRITY_STATEMENT: "",

    // Scope — single joined string for {{SCOPE_TARGET}} placeholder
    SCOPE_TARGET: scopeTargets.join("\n"),

    // Findings loop — {{#findings}}...{{/findings}}
    findings,
    // TOC findings loop — {{#toc_findings}}...{{/toc_findings}}
    toc_findings,
  });

  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
}
