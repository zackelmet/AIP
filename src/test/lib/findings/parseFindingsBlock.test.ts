import {
  parseFindingsBlock,
  parseCSVFindings,
} from "@/lib/findings/parseFindingsBlock";

describe("parseFindingsBlock", () => {
  it("parses a single finding", () => {
    const input = `
Title: SQL Injection in Login Form
Severity: High
Target: https://example.com/login
Affected Component: /api/login
Description: The login endpoint is vulnerable to SQL injection.
Evidence: Payload: ' OR 1=1--
Steps to Reproduce: 1. Navigate to login page
Remediation: Use parameterised queries
`.trim();

    const results = parseFindingsBlock(input);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("SQL Injection in Login Form");
    expect(results[0].severity).toBe("high");
    expect(results[0].target).toBe("https://example.com/login");
    expect(results[0].affectedComponent).toBe("/api/login");
    expect(results[0].description).toContain("SQL injection");
    expect(results[0].evidence).toContain("OR 1=1");
    expect(results[0].remediation).toContain("parameterised");
  });

  it("parses multiple findings separated by ---", () => {
    const input = `
Title: SQL Injection
Severity: High
Target: https://example.com
Description: SQL vuln
---
Title: Reflected XSS
Severity: Medium
Target: https://example.com/search
Description: XSS in search input
`.trim();

    const results = parseFindingsBlock(input);
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("SQL Injection");
    expect(results[1].title).toBe("Reflected XSS");
    expect(results[1].severity).toBe("medium");
  });

  it("normalises severity aliases", () => {
    const cases: [string, string][] = [
      ["Critical", "critical"],
      ["HIGH", "high"],
      ["Med", "medium"],
      ["Informational", "info"],
      ["INFO", "info"],
      ["bogus", "medium"],
    ];
    for (const [raw, expected] of cases) {
      const input = `Title: Test\nSeverity: ${raw}\nTarget: host`;
      const [f] = parseFindingsBlock(input);
      expect(f.severity).toBe(expected);
    }
  });

  it("returns empty array when no Title field present", () => {
    const results = parseFindingsBlock("Some random text with no labels");
    expect(results).toHaveLength(0);
  });

  it("handles === as a separator", () => {
    const input = `Title: Finding One\nSeverity: Low\nTarget: host1\n===\nTitle: Finding Two\nSeverity: High\nTarget: host2`;
    const results = parseFindingsBlock(input);
    expect(results).toHaveLength(2);
  });
});

describe("parseCSVFindings", () => {
  const csvSample = [
    `Title,Risk Level,Description,Proof of Concept,Impact,Remediation`,
    `"SQL Injection","High","Login form is vulnerable","' OR 1=1--","Full DB access","Use parameterised queries"`,
    `"Reflected XSS","Medium","Search input not sanitised","<script>alert(1)</script>","Session hijacking","Encode output"`,
  ].join("\n");

  it("parses header row and data rows", () => {
    const results = parseCSVFindings(csvSample);
    expect(results).toHaveLength(2);
  });

  it("maps Risk Level to severity correctly", () => {
    const results = parseCSVFindings(csvSample);
    expect(results[0].severity).toBe("high");
    expect(results[1].severity).toBe("medium");
  });

  it("maps Description and PoC fields", () => {
    const results = parseCSVFindings(csvSample);
    expect(results[0].description).toContain("vulnerable");
    expect(results[0].evidence).toContain("OR 1=1");
  });

  it("maps Remediation field", () => {
    const results = parseCSVFindings(csvSample);
    expect(results[0].remediation).toContain("parameterised");
  });

  it("maps Impact into stepsToReproduce", () => {
    const results = parseCSVFindings(csvSample);
    expect(results[0].stepsToReproduce).toContain("Full DB access");
  });

  it("handles quoted fields containing commas", () => {
    const csv = `Title,Risk Level,Description\n"Finding, with comma","Critical","Desc"`;
    const [f] = parseCSVFindings(csv);
    expect(f.title).toBe("Finding, with comma");
    expect(f.severity).toBe("critical");
  });

  it("returns empty array for CSV with no data rows", () => {
    const csv = `Title,Risk Level,Description\n`;
    expect(parseCSVFindings(csv)).toHaveLength(0);
  });

  it("skips rows with no Title", () => {
    const csv = `Title,Risk Level\n"",High\n"Real Finding",Medium`;
    const results = parseCSVFindings(csv);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Real Finding");
  });
});
