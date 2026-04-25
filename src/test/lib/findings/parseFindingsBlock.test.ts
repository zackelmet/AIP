import { parseFindingsBlock } from "@/lib/findings/parseFindingsBlock";

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
