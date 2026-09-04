// Server-only chart primitives for the PDF report engine (pdf-lib).
// All positions are TOP-BASED (distance from page top) — the helpers convert
// internally, because pdf-lib's drawSvgPath is y-down (SVG space) while
// drawText is y-up. Robust approach: all curves are polygons (L commands
// only), so no SVG arc-support questions.

import { PDFFont, PDFPage, rgb } from "pdf-lib";
import type { ReportFinding } from "./types";

export type Severity = "Critical" | "High" | "Medium" | "Low" | "Informational";

export const CHART_COLORS: Record<
  Severity,
  { r: number; g: number; b: number }
> = {
  Critical: { r: 0.29, g: 0.08, b: 0.29 }, // dark purple #4A154B
  High: { r: 0.55, g: 0.1, b: 0.1 }, // dark red #8B1A1A
  Medium: { r: 0.98, g: 0.45, b: 0.09 }, // orange #F97316
  Low: { r: 0.09, g: 0.64, b: 0.29 }, // green #16A34A
  Informational: { r: 0.15, g: 0.39, b: 0.92 }, // blue #2563EB
};

const TRACK_GREY = { r: 0.9, g: 0.91, b: 0.94 };
const INK = { r: 0.09, g: 0.16, b: 0.25 };
const MUTED = { r: 0.45, g: 0.52, b: 0.6 };

const SEV_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Informational: 4,
};

/** #e5e9ef-style rounded rectangle path (y-down SVG). */
function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rr = Math.min(r, w / 2, h / 2);
  return (
    `M ${x + rr} ${y} h ${w - 2 * rr} q ${rr} 0 ${rr} ${rr} ` +
    `v ${h - 2 * rr} q 0 ${rr} ${-rr} ${rr} ` +
    `h ${-(w - 2 * rr)} q ${-rr} 0 ${-rr} ${-rr} ` +
    `v ${-(h - 2 * rr)} q 0 ${-rr} ${rr} ${-rr} Z`
  );
}

/** Annular sector (donut wedge) path, angles in degrees: 0 = 12 o'clock, clockwise. */
function annularSector(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
): string {
  const span = Math.abs(a1 - a0);
  const steps = Math.max(2, Math.ceil(span / 5));
  const pt = (a: number, r: number) => {
    const rad = (a * Math.PI) / 180;
    return `${(cx + r * Math.sin(rad)).toFixed(2)} ${(cy - r * Math.cos(rad)).toFixed(2)}`;
  };
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++)
    parts.push(pt(a0 + (a1 - a0) * (i / steps), r1));
  for (let i = steps; i >= 0; i--)
    parts.push(pt(a0 + (a1 - a0) * (i / steps), r0));
  return "M " + parts.join(" L ") + " Z";
}

function drawPath(
  page: PDFPage,
  pageHeight: number,
  path: string,
  color: { r: number; g: number; b: number },
) {
  page.drawSvgPath(path, {
    x: 0,
    y: pageHeight,
    color: rgb(color.r, color.g, color.b),
    borderWidth: 0,
    borderOpacity: 0,
  });
}

function textTop(
  page: PDFPage,
  pageHeight: number,
  text: string,
  x: number,
  yTop: number,
  size: number,
  font: PDFFont,
  color: { r: number; g: number; b: number },
) {
  page.drawText(text, {
    x,
    y: pageHeight - yTop - size,
    size,
    font,
    color: rgb(color.r, color.g, color.b),
  });
}

function textCentered(
  page: PDFPage,
  pageHeight: number,
  text: string,
  cx: number,
  yTop: number,
  size: number,
  font: PDFFont,
  color: { r: number; g: number; b: number },
) {
  const w = font.widthOfTextAtSize(text, size);
  textTop(page, pageHeight, text, cx - w / 2, yTop, size, font, color);
}

export function worstSeverity(findings: ReportFinding[]): Severity {
  let worst: Severity = "Informational";
  for (const f of findings) {
    const s = (f.severity || "") as Severity;
    if (s in SEV_ORDER && SEV_ORDER[s] < SEV_ORDER[worst]) worst = s;
  }
  return worst;
}

export function severityCounts(
  findings: ReportFinding[],
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
    Informational: 0,
  };
  for (const f of findings) {
    const s = (f.severity || "Informational") as Severity;
    counts[s in SEV_ORDER ? s : "Informational"]++;
  }
  return counts;
}

/** Cluster findings into vulnerability classes (from CWE + title keywords). */
export function classifyFindings(
  findings: ReportFinding[],
): Array<{ label: string; count: number }> {
  const classes: Record<string, number> = {};
  const add = (k: string) => {
    classes[k] = (classes[k] || 0) + 1;
  };
  for (const f of findings) {
    const t = `${f.title} ${f.description}`.toLowerCase();
    const cwe = (f.cwe || "").toUpperCase();
    if (t.includes("sql") || cwe.includes("89")) add("SQL Injection");
    else if (
      t.includes("xss") ||
      t.includes("cross-site scripting") ||
      cwe.includes("79")
    )
      add("Cross-Site Scripting");
    else if (
      /(auth|jwt|session|idor|privilege|access control|mass assignment)/.test(
        t,
      ) ||
      /28[57]|639|86[23]/.test(cwe)
    )
      add("Auth & Access Control");
    else if (
      /(deserializ|command injection|template injection|code execution|rce|prototype pollution)/.test(
        t,
      ) ||
      /502|78|94|13[23]/.test(cwe)
    )
      add("Injection & Execution");
    else if (/(disclosur|expos|leak|enumerat)/.test(t) || cwe.includes("200"))
      add("Info Disclosure");
    else if (
      /(misconfig|headers|cors|default credential|outdated|deprecated|hardcod)/.test(
        t,
      ) ||
      cwe.includes("16")
    )
      add("Misconfiguration");
    else add("Other");
  }
  return Object.entries(classes)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** NodeZero-style big-number chips row. Returns height used. */
export function drawStatChips(
  page: PDFPage,
  pageHeight: number,
  x: number,
  yTop: number,
  totalWidth: number,
  chips: Array<{ value: string; label: string }>,
  font: PDFFont,
  bold: PDFFont,
): number {
  const h = 58;
  const gap = 10;
  const w = (totalWidth - gap * (chips.length - 1)) / chips.length;
  chips.forEach((c, i) => {
    const cx = x + i * (w + gap);
    drawPath(page, pageHeight, roundedRectPath(cx, yTop, w, h, 10), {
      r: 0.93,
      g: 0.95,
      b: 0.97,
    });
    const vSize = 19;
    const vw = bold.widthOfTextAtSize(c.value, vSize);
    textTop(
      page,
      pageHeight,
      c.value,
      cx + (w - vw) / 2,
      yTop + 12,
      vSize,
      bold,
      INK,
    );
    const lSize = 6.8;
    const lw = bold.widthOfTextAtSize(c.label.toUpperCase(), lSize);
    textTop(
      page,
      pageHeight,
      c.label.toUpperCase(),
      cx + (w - lw) / 2,
      yTop + 38,
      lSize,
      bold,
      MUTED,
    );
  });
  return h;
}

/** Severity donut with center total + side legend. Returns height used. */
export function drawSeverityDonut(
  page: PDFPage,
  pageHeight: number,
  cx: number,
  yTop: number,
  radius: number,
  counts: Record<Severity, number>,
  font: PDFFont,
  bold: PDFFont,
): number {
  const order: Severity[] = [
    "Critical",
    "High",
    "Medium",
    "Low",
    "Informational",
  ];
  const total = order.reduce((acc, s) => acc + counts[s], 0);
  const size = radius * 2 + 10;

  if (total === 0) {
    drawPath(
      page,
      pageHeight,
      annularSector(cx, yTop + radius, radius * 0.58, radius, 0, 359.99),
      TRACK_GREY,
    );
    textCentered(page, pageHeight, "0", cx, yTop + radius - 12, 20, bold, INK);
    textCentered(
      page,
      pageHeight,
      "FINDINGS",
      cx,
      yTop + radius + 10,
      6.5,
      bold,
      MUTED,
    );
    return size;
  }

  // Segments clockwise from 12 o'clock, 2.5° gaps.
  let angle = 0;
  const gapDeg = total > 1 ? 2.5 : 0;
  for (const s of order) {
    if (counts[s] === 0) continue;
    const sweep = (counts[s] / total) * 360;
    const a0 = angle + gapDeg / 2;
    const a1 = angle + sweep - gapDeg / 2;
    drawPath(
      page,
      pageHeight,
      annularSector(
        cx,
        yTop + radius,
        radius * 0.58,
        radius,
        a0,
        Math.max(a0 + 0.5, a1),
      ),
      CHART_COLORS[s],
    );
    angle += sweep;
  }

  textCentered(
    page,
    pageHeight,
    String(total),
    cx,
    yTop + radius - 12,
    21,
    bold,
    INK,
  );
  textCentered(
    page,
    pageHeight,
    "FINDINGS",
    cx,
    yTop + radius + 11,
    6.5,
    bold,
    MUTED,
  );

  // Legend right of the donut.
  const lx = cx + radius + 16;
  let ly = yTop + radius - order.length * 7;
  for (const s of order) {
    drawPath(
      page,
      pageHeight,
      roundedRectPath(lx, ly - 2, 7, 7, 1.5),
      CHART_COLORS[s],
    );
    textTop(page, pageHeight, `${s}`, lx + 11, ly - 2, 7.5, font, INK);
    const v = String(counts[s]);
    textTop(page, pageHeight, v, lx + 11 + 62, ly - 2, 7.5, bold, INK);
    ly += 15;
  }
  return size;
}

/**
 * Spiral vortex — a different swirly shape: concentric spiral lines swirling
 * around a center (cx, cyTop), bleeding off page edges when placed low.
 */
export function drawSpiralVortex(
  page: PDFPage,
  pageHeight: number,
  cx: number,
  cyTop: number,
  maxR: number,
  color: { r: number; g: number; b: number },
  lines = 30,
): void {
  const turns = 2.6;
  const steps = 70;
  for (let i = 0; i < lines; i++) {
    const off = i / (lines - 1);
    const rStart = maxR * 0.08 * off;
    const rEnd = maxR * (0.3 + 0.7 * off);
    const phase = off * 1.9;
    const squash = 0.82;
    const pts: string[] = [];
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const theta = u * turns * Math.PI * 2 + phase;
      const r = rStart + (rEnd - rStart) * u;
      const px = cx + r * Math.cos(theta);
      const py = cyTop + r * Math.sin(theta) * squash;
      pts.push(`${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    page.drawSvgPath("M " + pts.join(" L "), {
      x: 0,
      y: pageHeight,
      borderColor: rgb(color.r, color.g, color.b),
      borderWidth: 0.9,
      borderOpacity: 0.6,
    });
  }
}

/**
 * Wireframe mesh wave — decorative flowing-line streams that enter from off
 * one page edge and exit through another (sample-report style). Thin stroked
 * curves stacked into a flowing sheet. Positions top-based.
 */
export function drawWireWave(
  page: PDFPage,
  pageHeight: number,
  x: number,
  yTop: number,
  w: number,
  h: number,
  color: { r: number; g: number; b: number },
  lines = 30,
  mirrorX = false,
): void {
  const steps = 44;
  for (let i = 0; i < lines; i++) {
    const off = i / (lines - 1);
    // Normal: enters from off the RIGHT edge, exits through the bottom.
    // Mirrored: enters from off the LEFT edge, sweeps down toward center/right.
    const sx = mirrorX ? x : x + w;
    const sy = yTop + off * h * 0.35;
    const ex = mirrorX ? x + w * 1.15 : x - w * 0.15;
    const ey = mirrorX
      ? yTop + h * (1.15 + off * 0.7) // deeper exit — lines end off the bottom edge
      : yTop + h * (0.7 + off * 0.6);
    const amp = h * (0.12 + 0.2 * off);
    const phase = off * 2.3;
    const pts: string[] = [];
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const px = sx + (ex - sx) * u;
      const base = sy + (ey - sy) * u;
      // Crest tapers to zero at both ends so lines enter/exit smoothly.
      const crest =
        Math.sin(u * Math.PI * 1.7 + phase) *
        amp *
        Math.pow(Math.sin(u * Math.PI), 1.2);
      const py = base + crest;
      pts.push(`${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    page.drawSvgPath("M " + pts.join(" L "), {
      x: 0,
      y: pageHeight,
      borderColor: rgb(color.r, color.g, color.b),
      borderWidth: 1.1,
      borderOpacity: 0.65,
    });
  }
}

/** Height that drawSeverityBars will use for the given counts. */
export function drawSeverityBarsHeight(
  counts: Record<Severity, number>,
): number {
  const present = order5().filter((s) => counts[s] > 0);
  return present.length * 24;
}

function order5(): Severity[] {
  return ["Critical", "High", "Medium", "Low", "Informational"];
}

/** Horizontal findings-by-severity bars (each bar colored per severity). */
export function drawSeverityBars(
  page: PDFPage,
  pageHeight: number,
  x: number,
  yTop: number,
  width: number,
  counts: Record<Severity, number>,
  font: PDFFont,
  bold: PDFFont,
): number {
  const present = order5().filter((s) => counts[s] > 0);
  if (present.length === 0) return 0;
  const maxCount = Math.max(...present.map((s) => counts[s]));
  const rowH = 24;
  const barH = 11;
  const labelW = Math.min(90, width * 0.35);
  const barW = width - labelW - 26;
  present.forEach((s, i) => {
    const ry = yTop + i * rowH;
    textTop(page, pageHeight, s, x, ry, 7.5, font, INK);
    const bw = Math.max(8, (counts[s] / maxCount) * barW);
    drawPath(
      page,
      pageHeight,
      roundedRectPath(x + labelW, ry + 1, bw, barH, barH / 2),
      CHART_COLORS[s],
    );
    textTop(
      page,
      pageHeight,
      String(counts[s]),
      x + labelW + bw + 6,
      ry + 1,
      8.5,
      bold,
      INK,
    );
  });
  return present.length * rowH;
}

/** Horizontal vuln-class bars. Returns height used. */
export function drawClassBars(
  page: PDFPage,
  pageHeight: number,
  x: number,
  yTop: number,
  width: number,
  classes: Array<{ label: string; count: number }>,
  font: PDFFont,
  bold: PDFFont,
  barColor: { r: number; g: number; b: number },
): number {
  const shown = classes.slice(0, 6);
  if (shown.length === 0) return 0;
  const maxCount = Math.max(...shown.map((c) => c.count));
  const rowH = 24;
  const barH = 11;
  const labelW = Math.min(105, width * 0.4);
  const barW = width - labelW - 26;
  shown.forEach((c, i) => {
    const ry = yTop + i * rowH;
    textTop(page, pageHeight, c.label, x, ry, 7.5, font, INK);
    const bw = Math.max(8, (c.count / maxCount) * barW);
    drawPath(
      page,
      pageHeight,
      roundedRectPath(x + labelW, ry + 1, bw, barH, barH / 2),
      barColor,
    );
    const vTxt = String(c.count);
    textTop(
      page,
      pageHeight,
      vTxt,
      x + labelW + bw + 6,
      ry + 1,
      8.5,
      bold,
      INK,
    );
  });
  return shown.length * rowH;
}

/** Overall-exposure semicircular gauge. Returns height used. */
export function drawExposureGauge(
  page: PDFPage,
  pageHeight: number,
  cx: number,
  yTop: number,
  radius: number,
  severity: Severity,
  font: PDFFont,
  bold: PDFFont,
): number {
  const grade = severityToGrade(severity);
  return drawGradeGauge(
    page,
    pageHeight,
    cx,
    yTop,
    radius,
    grade.letter,
    grade.color,
    font,
    bold,
  );
}

/**
 * Letter grade derived from the finding mix. Weighted so volume matters:
 * a lone low finding doesn't outweigh a stack of mediums.
 *
 *   A  no findings ≥ Medium
 *   B  no Critical, ≤2 High, ≤5 Medium
 *   C  no Critical (beyond-B High/Medium volume)
 *   D  1–3 Critical
 *   F  4+ Critical
 */
export function severityToGrade(severity: Severity): {
  letter: string;
  color: { r: number; g: number; b: number };
} {
  // Grade color follows the arc color of the underlying severity band.
  const bySev: Record<
    Severity,
    { letter: string; color: { r: number; g: number; b: number } }
  > = {
    Critical: { letter: "F", color: CHART_COLORS.Critical },
    High: { letter: "C", color: CHART_COLORS.High },
    Medium: { letter: "B", color: CHART_COLORS.Medium },
    Low: { letter: "A", color: CHART_COLORS.Low },
    Informational: { letter: "A", color: CHART_COLORS.Informational },
  };
  return bySev[severity];
}

/**
 * Grade from the full finding distribution (preferred over the single
 * worst-severity mapping). Returns letter + gauge arc color.
 */
export function computeGrade(counts: Record<Severity, number>): {
  letter: string;
  color: { r: number; g: number; b: number };
} {
  const { Critical, High, Medium } = counts;
  const atRisk = Critical + High;
  let letter: string;
  let color: { r: number; g: number; b: number };
  if (Critical >= 4) {
    letter = "F";
    color = CHART_COLORS.Critical;
  } else if (Critical >= 1) {
    letter = "D";
    color = CHART_COLORS.Critical;
  } else if (High === 0 && Medium === 0) {
    letter = "A";
    color = CHART_COLORS.Low;
  } else if (High <= 2 && Medium <= 5) {
    letter = "B";
    color = CHART_COLORS.High;
  } else {
    letter = "C";
    color = CHART_COLORS.High;
  }
  return { letter, color };
}

/** Overall-exposure semicircular gauge with a letter grade center. */
export function drawGradeGauge(
  page: PDFPage,
  pageHeight: number,
  cx: number,
  yTop: number,
  radius: number,
  letter: string,
  color: { r: number; g: number; b: number },
  font: PDFFont,
  bold: PDFFont,
): number {
  const r0 = radius - 13;
  const aLeft = -90;
  const aRight = 90;
  const span = aRight - aLeft;

  // Arc fill fraction by grade: A small (healthy) → F full (worst).
  const fracByLetter: Record<string, number> = {
    A: 0.2,
    B: 0.4,
    C: 0.6,
    D: 0.8,
    F: 1.0,
  };
  const frac = fracByLetter[letter] ?? 0.5;

  // Track.
  const trackSteps = 18;
  for (let i = 0; i < trackSteps; i++) {
    const a0 = aLeft + (span * i) / trackSteps;
    const a1 = aLeft + (span * (i + 1)) / trackSteps;
    drawPath(
      page,
      pageHeight,
      annularSector(cx, yTop + radius, r0, radius, a0, a1),
      TRACK_GREY,
    );
  }
  // Colored fraction.
  const filled = span * frac;
  const fillSteps = Math.max(1, Math.ceil(filled / (span / trackSteps)));
  for (let i = 0; i < fillSteps; i++) {
    const a0 = aLeft + (filled * i) / fillSteps;
    const a1 = aLeft + (filled * (i + 1)) / fillSteps;
    drawPath(
      page,
      pageHeight,
      annularSector(cx, yTop + radius, r0, radius, a0, a1),
      color,
    );
  }

  const letterSize = radius * 0.62;
  textCentered(
    page,
    pageHeight,
    letter,
    cx,
    yTop + radius - letterSize - 2,
    letterSize,
    bold,
    color,
  );
  textCentered(
    page,
    pageHeight,
    "OVERALL GRADE",
    cx,
    yTop + radius + 8,
    6.5,
    bold,
    MUTED,
  );
  return radius + 22;
}
