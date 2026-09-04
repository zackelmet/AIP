const path = require("path");
const fs = require("fs");

// AIP smoke test — Juice Shop findings (dumped from mspp-ai prod) through the
// upgraded AIP PDF engine. Local only; nothing uploaded.
const findingsJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "assets", "juice-findings.json"), "utf8"),
);
const findings = findingsJson.findings;
const target = findingsJson.target;
console.log(`Smoke: ${findings.length} findings against ${target}`);

const tsConfigPaths = require("tsconfig-paths");
const tsConfig = require("../tsconfig.json");
tsConfigPaths.register({
  baseUrl: path.resolve(__dirname, "..", tsConfig.compilerOptions.baseUrl || "."),
  paths: tsConfig.compilerOptions.paths || {},
});

const { buildReportPdf } = require("@/lib/report-engine/pdf-template");
const { generateReportSections, capSentences } = require("@/lib/report-engine/llm-report");

(async () => {
  const llm = await generateReportSections(findings, target);

  const payload = {
    reportType: "external",
    brand: "aip",
    clientName: "OWASP Juice Shop",
    projectTitle: `Penetration Test on ${target}`,
    target,
    completedDate: new Date().toLocaleDateString("en-US"),
    tester: "AIP Hacker Agent",
    findings,
    executiveSummary: llm.executiveSummary,
    detailedAnalysis: capSentences(llm.findingsSummary, 3),
    toolsAndTestCases: llm.toolsAndTestCases,
  };

  const pdfBytes = await buildReportPdf(payload);
  const out = "/tmp/opencode/aip-sample-report.pdf";
  fs.writeFileSync(out, pdfBytes);
  console.log(`OK: ${out} (${(pdfBytes.length / 1024).toFixed(1)} KB)`);
})();