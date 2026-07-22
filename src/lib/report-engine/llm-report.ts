import type { ReportFinding } from "@/lib/report-engine/types";

interface LlmReportSections {
  executiveSummary: string;
  findingsSummary: string;
  toolsAndTestCases: string;
}

function buildPrompt(findings: ReportFinding[], target: string): string {
  const findingsBlock = findings
    .map(
      (f, i) =>
        `${i + 1}. [${f.severity}] ${f.title} (CVSS ${f.cvss})
   Description: ${f.description}
   Impact: ${f.impact}
   Remediation: ${f.remediation}`,
    )
    .join("\n\n");

  return `You are a professional cybersecurity report writer. Given the following penetration test findings against ${target}, produce three distinct sections for the report.

Findings:
${findingsBlock || "No vulnerabilities were identified during testing."}

Output exactly in this JSON format (no markdown, no code fences):
{
  "executiveSummary": "A single concise paragraph (3-5 sentences) executive summary written for a C-level audience. Describe the overall security posture, the number and severity of findings, and the key risk to the business.",
  "findingsSummary": "A single paragraph summarizing the overall findings. Categorize by severity, highlight the most critical issues, and note any patterns (e.g. 'most findings relate to input validation').",
  "toolsAndTestCases": "A single paragraph describing the tools, techniques, and test cases used during the assessment. Mention specific tool categories (reconnaissance, vulnerability scanning, exploitation, etc.) and the types of tests performed."
}`;
}

export async function generateReportSections(
  findings: ReportFinding[],
  target: string,
): Promise<LlmReportSections> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const fallback = buildFallbackSections(findings, target);
    return fallback;
  }

  const prompt = buildPrompt(findings, target);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error("Groq API error:", res.status, await res.text());
      return buildFallbackSections(findings, target);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return buildFallbackSections(findings, target);
    }

    const parsed = JSON.parse(content) as LlmReportSections;
    return {
      executiveSummary:
        parsed.executiveSummary ||
        buildFallbackSections(findings, target).executiveSummary,
      findingsSummary:
        parsed.findingsSummary ||
        buildFallbackSections(findings, target).findingsSummary,
      toolsAndTestCases:
        parsed.toolsAndTestCases ||
        buildFallbackSections(findings, target).toolsAndTestCases,
    };
  } catch (err) {
    console.error("Groq LLM call failed:", err);
    return buildFallbackSections(findings, target);
  }
}

function buildFallbackSections(
  findings: ReportFinding[],
  target: string,
): LlmReportSections {
  const total = findings.length;
  const critical = findings.filter((f) => f.severity === "Critical").length;
  const high = findings.filter((f) => f.severity === "High").length;
  const medium = findings.filter((f) => f.severity === "Medium").length;
  const low = findings.filter((f) => f.severity === "Low").length;

  return {
    executiveSummary: `A penetration test was conducted against ${target}. ${
      total === 0
        ? "No security findings were identified."
        : total === 1
          ? "1 finding was identified."
          : `${total} findings were identified.`
    }${critical > 0 ? ` ${critical} critical,` : ""}${high > 0 ? ` ${high} high,` : ""}${medium > 0 ? ` ${medium} medium,` : ""}${low > 0 ? ` ${low} low` : ""} severity vulnerabilities were discovered. This report summarizes the confirmed findings, their risk ratings, and recommended remediations prioritized by impact.`,

    findingsSummary:
      total === 0
        ? "No security vulnerabilities were identified during the assessment."
        : `The assessment identified ${total} finding(s) across the target application. ${critical > 0 ? `${critical} critical-risk issue(s) require immediate attention. ` : ""}${high > 0 ? `${high} high-risk issue(s) should be addressed urgently. ` : ""}${medium > 0 ? `${medium} medium-risk issue(s) should be addressed in the near term. ` : ""}${low > 0 ? `${low} low-risk issue(s) are noted for defense-in-depth.` : ""}`,

    toolsAndTestCases:
      "The AI hacker agent employs a multi-layered approach to security assessment, integrating industry-standard tools and advanced red teaming techniques. Initial reconnaissance utilizes Amass, Gau, and Katana for comprehensive attack surface mapping, while DNSRecon and ProjectDiscovery-httpx identify subdomains and active services. Vulnerability discovery focuses on web application flaws such as SQL injection, Cross-Site Scripting (XSS), and Broken Access Control, utilizing SQLmap, XSStrike, Dalfox, and JWT_tool. Test cases include verifying firewall efficacy with Wafw00f, performing directory and parameter discovery via Gobuster and FFuf, and executing authentication and authorization tests to identify privilege escalation vectors.",
  };
}
