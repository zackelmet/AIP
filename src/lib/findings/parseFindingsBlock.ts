import { Severity } from "@/lib/types/pentest";

export interface ParsedFinding {
  title: string;
  severity: Severity;
  target: string;
  affectedComponent: string;
  description: string;
  evidence: string;
  stepsToReproduce: string;
  remediation: string;
}

const SEVERITY_MAP: Record<string, Severity> = {
  critical: "critical",
  high: "high",
  med: "medium",
  medium: "medium",
  low: "low",
  info: "info",
  informational: "info",
};

export function normalizeSeverity(raw: string): Severity {
  return SEVERITY_MAP[raw.trim().toLowerCase()] ?? "medium";
}

const KNOWN_LABELS = [
  "title",
  "severity",
  "risk",
  "target",
  "url",
  "host",
  "endpoint",
  "affected component",
  "affectedcomponent",
  "component",
  "parameter",
  "description",
  "summary",
  "detail",
  "details",
  "evidence",
  "proof of concept",
  "poc",
  "payload",
  "steps to reproduce",
  "steps",
  "reproduction",
  "repro",
  "remediation",
  "fix",
  "recommendation",
  "mitigation",
  "cvss",
  "cve",
  "references",
];

/**
 * Extracts the value for a labelled field inside a single finding block.
 * Grabs everything from the label up to the next known label (or end of block).
 */
function extractField(block: string, ...labels: string[]): string {
  for (const label of labels) {
    const pattern = new RegExp(
      `(?:^|\\n)[ \\t]*${label}[ \\t]*[:\\-][ \\t]*([\\s\\S]*?)(?=\\n[ \\t]*(?:${KNOWN_LABELS.join("|")})[ \\t]*[:\\-]|$)`,
      "i",
    );
    const m = block.match(pattern);
    if (m) return m[1].trim();
  }
  return "";
}

/**
 * Splits a raw text block into individual finding objects.
 * Delimiters: `---`, `===`, or a blank line before a new `Title:` line.
 */
export function parseFindingsBlock(raw: string): ParsedFinding[] {
  const chunks = raw
    .split(/\n[ \t]*(?:-{3,}|={3,})[ \t]*\n/)
    .flatMap((chunk) => chunk.split(/\n{2,}(?=[ \t]*title[ \t]*[:\-])/i))
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const results: ParsedFinding[] = [];

  for (const chunk of chunks) {
    const title = extractField(chunk, "title");
    if (!title) continue;

    const severityRaw = extractField(chunk, "severity", "risk");
    const target = extractField(chunk, "target", "url", "host", "endpoint");
    const affectedComponent = extractField(
      chunk,
      "affected component",
      "affectedcomponent",
      "component",
      "parameter",
    );
    const description = extractField(
      chunk,
      "description",
      "summary",
      "detail",
      "details",
    );
    const evidence = extractField(
      chunk,
      "evidence",
      "proof of concept",
      "poc",
      "payload",
    );
    const stepsToReproduce = extractField(
      chunk,
      "steps to reproduce",
      "steps",
      "reproduction",
      "repro",
    );
    const remediation = extractField(
      chunk,
      "remediation",
      "fix",
      "recommendation",
      "mitigation",
    );

    results.push({
      title,
      severity: normalizeSeverity(severityRaw),
      target: target || "—",
      affectedComponent,
      description,
      evidence,
      stepsToReproduce,
      remediation,
    });
  }

  return results;
}
