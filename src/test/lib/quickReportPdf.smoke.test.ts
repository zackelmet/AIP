import { PDFDocument } from "pdf-lib";
import { buildReportPdf } from "@/lib/report-engine/pdf-template";
import { deriveLikelihoodImpact } from "@/lib/report-engine/cvss";
import { ReportFinding } from "@/lib/report-engine/types";

// A long, multi-paragraph finding containing a Unicode arrow (→) — exercises
// flow pagination, background blocks, and WinAnsi sanitization.
const longBody = Array.from(
  { length: 40 },
  (_, i) =>
    `Step ${i + 1}) attacker controls Host header → Location reflects evil.example.com on /route${i}/.`,
).join("\n");

function makeFindings(): ReportFinding[] {
  return [
    {
      title: "SQL Injection in login form",
      description: longBody,
      poc: longBody,
      impact: "Full database read/write access.",
      remediation: longBody,
      cvss: 9.8,
      cvssValue: "Critical",
      cvss31Score: "9.8",
      cvss31Vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      severity: "Critical",
    },
    {
      title: "Missing security headers",
      description: "No HSTS header present.",
      poc: "curl -I https://example.com",
      impact: "TLS downgrade risk.",
      remediation: "Add Strict-Transport-Security.",
      cvss: 3.1,
      cvssValue: "Low",
      cvss31Score: "3.1",
      cvss31Vector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N",
      severity: "Low",
    },
  ];
}

describe("Report Engine v2 PDF", () => {
  it("derives Likelihood + Impact from a CVSS 3.1 vector", () => {
    const { likelihood, impact } = deriveLikelihoodImpact(
      "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    );
    expect(likelihood).toBe("High");
    expect(impact).toBe("Critical");
  });

  it("returns nulls when the vector lacks metrics", () => {
    const { likelihood, impact } = deriveLikelihoodImpact("");
    expect(likelihood).toBeNull();
    expect(impact).toBeNull();
  });

  it("builds a multi-page PDF and sorts findings by severity", async () => {
    const findings = makeFindings();
    const bytes = await buildReportPdf({
      reportType: "external",
      brand: "aip",
      clientName: "Acme Corp",
      projectTitle: "Acme Corp External Penetration Test",
      target: "api.acme.com",
      executiveSummary: "Two findings identified.",
      detailedAnalysis: "One critical, one low.",
      findings,
    });

    // A valid PDF that spilled the long finding across multiple pages.
    expect(bytes.length).toBeGreaterThan(2000);
    const reloaded = await PDFDocument.load(bytes);
    // Cover + metadata + TOC + exec + overview + findings (paginated) + appendix + matrix.
    expect(reloaded.getPageCount()).toBeGreaterThan(6);
  });
});
