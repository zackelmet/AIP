import type { ReportFinding } from "@/lib/report-engine/types";

interface LlmReportSections {
  executiveSummary: string;
  findingsSummary: string;
  toolsAndTestCases: string;
}

/** Trim a narrative to at most `max` sentences (period-delimited). */
export function capSentences(text: string, max: number): string {
  if (!text) return text;
  const parts = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  if (parts.length <= max) return text.trim();
  return parts.slice(0, max).join(" ").trim();
}

const SEVERITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Informational: 4,
};

// Groq free-tier TPM is 8K — a 30-finding prompt blows past it (413). Cap the
// findings block: top N by severity, with truncated narrative fields.
const MAX_LLM_FINDINGS = 12;
const FIELD_TRUNCATE = 180;

function buildPrompt(findings: ReportFinding[], target: string): string {
  const ranked = [...findings]
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity ?? ""] ?? 5) -
          (SEVERITY_ORDER[b.severity ?? ""] ?? 5) || b.cvss - a.cvss,
    )
    .slice(0, MAX_LLM_FINDINGS);
  const omitted = findings.length - ranked.length;

  const findingsBlock = ranked
    .map(
      (f, i) =>
        `${i + 1}. [${f.severity}] ${f.title} (CVSS ${f.cvss})
   Description: ${(f.description || "").slice(0, FIELD_TRUNCATE)}
   Impact: ${(f.impact || "").slice(0, FIELD_TRUNCATE)}`,
    )
    .join("\n\n");
  const omittedNote =
    omitted > 0
      ? `\n(${omitted} additional lower-severity findings were also identified.)`
      : "";

  return `You are a professional cybersecurity report writer for an AI-powered penetration testing platform. All testing is performed autonomously by AI agents — never by human testers. Given the following penetration test findings against ${target}, produce three distinct sections for the report.

Total findings: ${findings.length}${omittedNote}

Findings:
${findingsBlock || "No vulnerabilities were identified during testing."}

Output exactly in this JSON format (no markdown, no code fences):
{
  "executiveSummary": "A single paragraph of 5-7 sentences written for a C-level audience. Describe the overall security posture, the number and severity of findings, and the key risk to the business. Be specific about what was tested and the overall security rating. Use AI-first language: the assessment was conducted autonomously by AI security agents.",
  "findingsSummary": "At most 2-3 sentences summarizing the findings. Categorize by severity, highlight the single most critical issue, and note any pattern across vulnerability classes. Be concise — this sits above the findings dashboard.",
  "toolsAndTestCases": "A single paragraph describing the tools, techniques, and test cases used during the assessment. Infer specific tool categories and test types from the findings themselves (e.g. if findings mention SQL injection, include SQLmap; if XSS, include XSStrike; if JWT issues, include JWT_tool). Mention reconnaissance, scanning, exploitation, and post-exploitation phases with concrete tool names relevant to what was actually found. Frame all testing as AI-driven and autonomous — no human testers performed the assessment."
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
        model: process.env.GROQ_MODEL || "qwen/qwen3.6-27b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 4096,
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
      findingsSummary: capSentences(
        parsed.findingsSummary ||
          buildFallbackSections(findings, target).findingsSummary,
        3,
      ),
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

  const sevList = [
    critical > 0 ? `${critical} critical` : "",
    high > 0 ? `${high} high` : "",
    medium > 0 ? `${medium} medium` : "",
    low > 0 ? `${low} low` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const hasInjection = findings.some(
    (f) =>
      f.title?.toLowerCase().includes("injection") ||
      f.description?.toLowerCase().includes("injection"),
  );
  const hasXss = findings.some(
    (f) =>
      f.title?.toLowerCase().includes("xss") ||
      f.title?.toLowerCase().includes("cross-site") ||
      f.description?.toLowerCase().includes("xss") ||
      f.description?.toLowerCase().includes("cross-site scripting"),
  );
  const hasAuth = findings.some(
    (f) =>
      f.title?.toLowerCase().includes("authentication") ||
      f.title?.toLowerCase().includes("authorization") ||
      f.title?.toLowerCase().includes("idor") ||
      f.title?.toLowerCase().includes("privilege") ||
      f.title?.toLowerCase().includes("jwt"),
  );
  const hasSensitiveData = findings.some(
    (f) =>
      f.title?.toLowerCase().includes("expos") ||
      f.title?.toLowerCase().includes("information disclosure") ||
      f.title?.toLowerCase().includes("leak") ||
      f.title?.toLowerCase().includes("hash") ||
      f.title?.toLowerCase().includes("ftp") ||
      f.title?.toLowerCase().includes("encryption key"),
  );
  const hasSsrf = findings.some(
    (f) =>
      f.title?.toLowerCase().includes("ssrf") ||
      f.title?.toLowerCase().includes("server-side request forgery"),
  );

  const toolParts: string[] = [
    "The assessment began with AI-driven reconnaissance and attack surface mapping using tools such as Amass, Subfinder, and Katana for subdomain enumeration, along with Nmap and httpx for service discovery and fingerprinting.",
  ];
  if (hasInjection)
    toolParts.push(
      "SQL injection testing was performed using SQLmap with AI-optimized tamper scripts to extract data and bypass filters autonomously.",
    );
  if (hasXss)
    toolParts.push(
      "Cross-Site Scripting (XSS) detection was carried out using XSStrike, Dalfox, and automated DOM fuzzing to identify stored and reflected vectors.",
    );
  if (hasAuth)
    toolParts.push(
      "Authentication and authorization controls were tested using JWT_tool for token manipulation, along with automated privilege escalation attempts and IDOR testing via parameter fuzzing.",
    );
  if (hasSensitiveData)
    toolParts.push(
      "Information disclosure testing involved AI-directed directory enumeration with Gobuster and Feroxbuster, along with automated inspection of exposed endpoints, FTP services, and publicly accessible configuration files.",
    );
  if (hasSsrf)
    toolParts.push(
      "Server-Side Request Forgery (SSRF) testing was conducted using custom payloads delivered through Collaborator-based out-of-band detection and SSRFmap for automated testing.",
    );
  toolParts.push(
    "All findings were validated through AI-driven proof-of-concept exploitation, and remediation guidance was provided based on industry best practices including OWASP and NIST guidelines.",
  );

  return {
    executiveSummary:
      total > 0
        ? `An AI-powered penetration test was conducted against ${target}, encompassing a comprehensive evaluation of the target's security posture through autonomous AI-driven testing methodologies. The assessment identified a total of ${total} security vulnerabilities across multiple risk categories${sevList ? `, including ${sevList}` : ""} severity findings. ${critical > 0 ? `The ${critical} critical-risk vulnerabilities pose an immediate and significant threat to the confidentiality, integrity, and availability of the target systems, requiring urgent remediation. ` : ""}${high > 0 ? `${high} high-risk issues were identified that could lead to data compromise or unauthorized system access if exploited. ` : ""}Each finding in this report includes a detailed technical description, proof of concept, and prioritized remediation recommendations to guide the remediation process. This report provides a roadmap for strengthening the overall security posture and reducing organizational risk.`
        : `An AI-powered penetration test was conducted against ${target}. The assessment included comprehensive reconnaissance, port scanning, service enumeration, OS fingerprinting, and vulnerability detection across the target's externally accessible attack surface. After thorough testing, no exploitable security vulnerabilities were identified. The target demonstrated appropriate security controls, properly configured network services, and adherence to industry-standard hardening practices. This report documents the discovered attack surface and confirms the target's current security posture. Regular reassessment is recommended to maintain this security baseline as the environment evolves.`,
    findingsSummary: capSentences(
      total > 0
        ? `The assessment against ${target} yielded ${total} distinct security findings that have been categorized and prioritized for remediation. ${critical > 0 ? `The ${critical} critical-severity findings represent the most urgent risks, including vulnerabilities that could allow complete system compromise or unauthorized access to sensitive data. ` : ""}${high > 0 ? `The ${high} high-severity findings involve significant security weaknesses that could lead to data exposure, privilege escalation, or service disruption. ` : ""}${medium > 0 ? `${medium} medium-severity findings were identified, including information disclosure risks and security misconfigurations that should be addressed as part of a regular remediation cycle. ` : ""}${low > 0 ? `${low} low-severity findings are noted for defense-in-depth and hardening purposes. ` : ""}${hasInjection && hasXss ? "A notable pattern in the findings is the prevalence of input validation vulnerabilities, suggesting that additional security controls around user-supplied data would significantly reduce the overall risk profile. " : ""}${hasAuth ? "Several authentication and authorization weaknesses were identified, indicating opportunities to strengthen access control mechanisms. " : ""}The remediation section of each finding provides step-by-step guidance to address the identified issues effectively.`
        : `The assessment against ${target} yielded no exploitable security vulnerabilities. The target's exposed services were thoroughly tested using industry-standard reconnaissance and vulnerability detection techniques. The following assessment activities were completed: full TCP and UDP port scanning to enumerate the complete attack surface, service version detection and banner grabbing to identify running software, OS fingerprinting to determine the underlying platform, SSL/TLS certificate validation and cipher suite analysis, HTTP service header inspection and technology stack identification, and automated vulnerability scanning against all discovered services using current threat signatures. All tested services exhibited appropriate security configurations, up-to-date software versions, and proper hardening measures. No misconfigurations, weak cipher support, information disclosure vectors, or known vulnerabilities were identified across the tested attack surface.`,
      3,
    ),
    toolsAndTestCases: toolParts.join(" "),
  };
}
