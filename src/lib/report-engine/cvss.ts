// CVSS 3.1 base-metric helpers.
//
// We derive qualitative Likelihood and Impact ratings the way most vulnerability
// scanners present them: Likelihood from the Exploitability sub-score
// (Attack Vector / Complexity / Privileges / User Interaction) and Impact from
// the Impact sub-score (Confidentiality / Integrity / Availability + Scope).
// Formulas per the CVSS v3.1 specification.

export type Rating = "Critical" | "High" | "Medium" | "Low" | "None";

interface Cvss31Metrics {
  AV?: string;
  AC?: string;
  PR?: string;
  UI?: string;
  S?: string;
  C?: string;
  I?: string;
  A?: string;
}

export function parseCvss31Vector(vector: string | undefined): Cvss31Metrics {
  const metrics: Cvss31Metrics = {};
  if (!vector) return metrics;
  for (const part of vector.split("/")) {
    const [key, value] = part.split(":");
    if (key && value && key !== "CVSS") {
      (metrics as Record<string, string>)[key.trim().toUpperCase()] =
        value.trim().toUpperCase();
    }
  }
  return metrics;
}

const AV_WEIGHT: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const AC_WEIGHT: Record<string, number> = { L: 0.77, H: 0.44 };
const UI_WEIGHT: Record<string, number> = { N: 0.85, R: 0.62 };
const CIA_WEIGHT: Record<string, number> = { H: 0.56, L: 0.22, N: 0 };

function prWeight(pr: string | undefined, scopeChanged: boolean): number {
  if (pr === "L") return scopeChanged ? 0.68 : 0.62;
  if (pr === "H") return scopeChanged ? 0.5 : 0.27;
  return 0.85; // None
}

/** Exploitability sub-score, range ~0.12 – 3.89. */
export function exploitabilitySubscore(m: Cvss31Metrics): number {
  const scopeChanged = m.S === "C";
  return (
    8.22 *
    (AV_WEIGHT[m.AV ?? ""] ?? 0) *
    (AC_WEIGHT[m.AC ?? ""] ?? 0) *
    prWeight(m.PR, scopeChanged) *
    (UI_WEIGHT[m.UI ?? ""] ?? 0)
  );
}

/** Impact sub-score (ISC), range ~0 – 6.05. */
export function impactSubscore(m: Cvss31Metrics): number {
  const c = CIA_WEIGHT[m.C ?? ""] ?? 0;
  const i = CIA_WEIGHT[m.I ?? ""] ?? 0;
  const a = CIA_WEIGHT[m.A ?? ""] ?? 0;
  const iscBase = 1 - (1 - c) * (1 - i) * (1 - a);
  if (m.S === "C") {
    return (
      7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15)
    );
  }
  return 6.42 * iscBase;
}

function bucketLikelihood(exploit: number): Rating {
  if (exploit >= 3.0) return "High";
  if (exploit >= 1.6) return "Medium";
  if (exploit > 0) return "Low";
  return "None";
}

function bucketImpact(isc: number): Rating {
  if (isc >= 5.0) return "Critical";
  if (isc >= 3.5) return "High";
  if (isc >= 2.0) return "Medium";
  if (isc > 0) return "Low";
  return "None";
}

/**
 * Returns derived Likelihood and Impact ratings from a CVSS 3.1 vector.
 * Returns null for either rating if the vector lacks the needed metrics.
 */
export function deriveLikelihoodImpact(vector: string | undefined): {
  likelihood: Rating | null;
  impact: Rating | null;
} {
  const m = parseCvss31Vector(vector);
  const hasExploit = m.AV && m.AC && m.UI;
  const hasImpact = m.C && m.I && m.A;
  return {
    likelihood: hasExploit ? bucketLikelihood(exploitabilitySubscore(m)) : null,
    impact: hasImpact ? bucketImpact(impactSubscore(m)) : null,
  };
}
