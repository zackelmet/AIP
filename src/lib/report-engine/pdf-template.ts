import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";
import { ReportPayload, ReportFinding } from "@/lib/report-engine/types";
import { deriveLikelihoodImpact, Rating } from "@/lib/report-engine/cvss";
import fs from "node:fs";
import path from "node:path";

const PAGE_SIZE: [number, number] = [612, 792];
const PAGE_WIDTH = PAGE_SIZE[0];
const PAGE_HEIGHT = PAGE_SIZE[1];
const PAGE_MARGIN = 52;
const TOP_Y = PAGE_HEIGHT - 72;
const BOTTOM_Y = 60;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const BRAND_DARK = rgb(0.04, 0.08, 0.12);
const BRAND_GREEN = rgb(0.2, 0.83, 0.6);
const GREY = rgb(0.42, 0.45, 0.5);
const TEXT = rgb(0.12, 0.12, 0.12);

type Severity = "Critical" | "High" | "Medium" | "Low" | "Informational";

const SEVERITY_RANK: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Informational: 4,
};

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

function severityColor(severity: Severity) {
  if (severity === "Critical") return rgb(0.82, 0.2, 0.2);
  if (severity === "High") return rgb(0.9, 0.45, 0.18);
  if (severity === "Medium") return rgb(0.92, 0.72, 0.2);
  if (severity === "Low") return rgb(0.15, 0.68, 0.56);
  return rgb(0.2, 0.62, 0.9);
}

function ratingColor(rating: Rating) {
  if (rating === "None") return GREY;
  return severityColor(rating as Severity);
}

// Codepoints > 0xFF that the standard WinAnsi (CP1252) encoding still supports.
const WINANSI_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/**
 * Standard PDF fonts can only encode WinAnsi/CP1252. Pentest findings routinely
 * contain arrows, emoji, box-drawing, and other Unicode — map the common ones to
 * ASCII and drop anything else that can't be encoded.
 */
function sanitize(input: string): string {
  if (!input) return "";
  const s = input
    .replace(/\r\n/g, "\n")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[–—―]/g, "-")
    .replace(/[→⇒➜➡➔➙]/g, "->")
    .replace(/[←⇐]/g, "<-")
    .replace(/[↑↓↔↕]/g, "|")
    .replace(/…/g, "...")
    .replace(/[     ]/g, " ")
    .replace(/[​‌‍﻿]/g, "")
    .replace(/[●■▪‣·◦]/g, "•")
    .replace(/[✓✔]/g, "[check]")
    .replace(/[✗✘❌✖]/g, "[x]");
  return Array.from(s)
    .map((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      if (ch === "\n" || ch === "\t") return ch;
      if (cp < 0x20) return " ";
      if (cp <= 0xff || WINANSI_EXTRA.has(cp)) return ch;
      return "";
    })
    .join("");
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  // Preserve author paragraph breaks, then wrap each within maxWidth.
  const paragraphs = (text || "").replace(/\r\n/g, "\n").split("\n");
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
        current = next;
      } else {
        if (current) out.push(current);
        // Hard-break tokens longer than the line (e.g. long vectors/URLs).
        if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
          let chunk = "";
          for (const ch of word) {
            if (font.widthOfTextAtSize(chunk + ch, fontSize) <= maxWidth) {
              chunk += ch;
            } else {
              out.push(chunk);
              chunk = ch;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current) out.push(current);
  }
  return out;
}

export async function buildReportPdf(payload: ReportPayload) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const now = new Date();
  const completedDate =
    payload.completedDate ?? now.toLocaleDateString("en-US");
  const reportTypeLabel =
    payload.reportType === "webapp"
      ? "Web Application Pentest Report"
      : "External Pentest Report";

  const brand = payload.brand ?? "msp";
  const brandName =
    brand === "aip" ? "Affordable Pentesting" : "MSP Pentesting";
  const brandLogoFile: Record<string, string> = {
    msp: "msp pentesting logo (1) (3) (1).png",
    aip: "affordable-pentesting-logo.png",
  };

  // ── Sort findings by severity (Critical → Informational) ──
  const findings = [...payload.findings].sort((a, b) => {
    const sa = SEVERITY_RANK[normalizeSeverity(a.severity, a.cvss)];
    const sb = SEVERITY_RANK[normalizeSeverity(b.severity, b.cvss)];
    if (sa !== sb) return sa - sb;
    return b.cvss - a.cvss; // tie-break: higher CVSS first
  });

  // ── Embed brand logo + cover background (independently — one failing must
  //    not take out the other) ──
  const embedPng = async (relPath: string): Promise<PDFImage | null> => {
    try {
      const abs = path.join(process.cwd(), "public", relPath);
      if (!fs.existsSync(abs)) return null;
      // Wrap in a fresh Uint8Array so pdf-lib's instanceof check holds across
      // runtimes (Node Buffers can fail it under jsdom's separate realm).
      return await pdf.embedPng(new Uint8Array(fs.readFileSync(abs)));
    } catch (err) {
      console.error(`PDF: failed to embed ${relPath}:`, err);
      return null;
    }
  };
  const landingLogo = brandLogoFile[brand]
    ? await embedPng(brandLogoFile[brand])
    : null;
  const landingBackground = await embedPng("brain.png");

  // ── Layout cursor + pagination engine ──
  const state = { page: null as unknown as PDFPage, y: TOP_Y };

  const newPage = (): PDFPage => {
    state.page = pdf.addPage(PAGE_SIZE);
    state.y = TOP_Y;
    return state.page;
  };
  const ensure = (needed: number) => {
    if (state.y - needed < BOTTOM_Y) newPage();
  };
  const gap = (h: number) => {
    state.y -= h;
  };

  const heading = (
    text: string,
    size = 18,
    color = BRAND_DARK,
    gapAfter = 12,
  ) => {
    ensure(size + gapAfter);
    state.page.drawText(text, {
      x: PAGE_MARGIN,
      y: state.y - size,
      size,
      font: bold,
      color,
    });
    state.y -= size + gapAfter;
  };

  const paragraph = (
    text: string,
    opts: {
      size?: number;
      lineHeight?: number;
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      bg?: ReturnType<typeof rgb>;
    } = {},
  ) => {
    const size = opts.size ?? 11;
    const lineHeight = opts.lineHeight ?? 15;
    const f = opts.font ?? font;
    const color = opts.color ?? TEXT;
    const indent = opts.indent ?? 0;
    const width = CONTENT_WIDTH - indent;
    const lines = wrapText(sanitize(text || ""), f, size, width);
    for (const line of lines) {
      ensure(lineHeight);
      if (opts.bg) {
        // Cover exactly this line's slot so it never paints over the
        // previous line's text.
        state.page.drawRectangle({
          x: PAGE_MARGIN,
          y: state.y - lineHeight,
          width: CONTENT_WIDTH,
          height: lineHeight,
          color: opts.bg,
        });
      }
      if (line) {
        state.page.drawText(line, {
          x: PAGE_MARGIN + indent + (opts.bg ? 8 : 0),
          y: state.y - size,
          size,
          font: f,
          color,
        });
      }
      state.y -= lineHeight;
    }
  };

  const label = (text: string, size = 11.5) => {
    ensure(size + 6);
    state.page.drawText(text, {
      x: PAGE_MARGIN,
      y: state.y - size,
      size,
      font: bold,
      color: BRAND_DARK,
    });
    state.y -= size + 6;
  };

  // Rounded "pill" badge. Returns its total width.
  const drawPill = (
    page: PDFPage,
    rawText: string,
    x: number,
    yBottom: number,
    fill: ReturnType<typeof rgb>,
    opts: { size?: number; textColor?: ReturnType<typeof rgb> } = {},
  ): number => {
    const text = sanitize(rawText);
    const size = opts.size ?? 9;
    const textColor = opts.textColor ?? rgb(1, 1, 1);
    const padX = 8;
    const h = size + 8;
    const r = h / 2;
    const textW = bold.widthOfTextAtSize(text, size);
    const w = textW + padX * 2;
    page.drawCircle({ x: x + r, y: yBottom + r, size: r, color: fill });
    page.drawCircle({ x: x + w - r, y: yBottom + r, size: r, color: fill });
    page.drawRectangle({
      x: x + r,
      y: yBottom,
      width: Math.max(0, w - 2 * r),
      height: h,
      color: fill,
    });
    page.drawText(text, {
      x: x + padX,
      y: yBottom + (h - size) / 2 + 1,
      size,
      font: bold,
      color: textColor,
    });
    return w;
  };

  // ════════════════════════════════ COVER ════════════════════════════════
  const cover = pdf.addPage(PAGE_SIZE);
  if (landingBackground) {
    cover.drawImage(landingBackground, {
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
    });
    cover.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: BRAND_DARK,
      opacity: 0.62,
    });
  } else {
    cover.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: BRAND_DARK,
    });
  }
  if (landingLogo) {
    const maxW = 230;
    const maxH = 150;
    const scale = Math.min(
      maxW / landingLogo.width,
      maxH / landingLogo.height,
    );
    const lw = landingLogo.width * scale;
    const lh = landingLogo.height * scale;
    cover.drawImage(landingLogo, {
      x: (PAGE_WIDTH - lw) / 2,
      y: PAGE_HEIGHT - 110 - lh,
      width: lw,
      height: lh,
    });
  } else {
    const wordmark = brandName.toUpperCase();
    const ws = 24;
    const ww = bold.widthOfTextAtSize(wordmark, ws);
    cover.drawText(wordmark, {
      x: (PAGE_WIDTH - ww) / 2,
      y: PAGE_HEIGHT - 165,
      size: ws,
      font: bold,
      color: BRAND_GREEN,
    });
  }
  cover.drawText(reportTypeLabel, {
    x: 86,
    y: PAGE_HEIGHT - 330,
    size: 28,
    font: bold,
    color: rgb(1, 1, 1),
  });
  cover.drawText(sanitize(payload.projectTitle) || "Penetration Test Engagement", {
    x: 86,
    y: PAGE_HEIGHT - 366,
    size: 16,
    font,
    color: rgb(0.96, 0.96, 0.96),
  });
  cover.drawText(`Completed ${completedDate}`, {
    x: 86,
    y: PAGE_HEIGHT - 390,
    size: 12,
    font,
    color: BRAND_GREEN,
  });
  if (payload.target) {
    cover.drawText(sanitize(`Target: ${payload.target}`), {
      x: 86,
      y: PAGE_HEIGHT - 412,
      size: 11,
      font,
      color: rgb(0.9, 0.9, 0.9),
    });
  }

  // ════════════════════════════ METADATA TABLE ════════════════════════════
  const metadata = pdf.addPage(PAGE_SIZE);
  {
    let my = PAGE_HEIGHT - 90;
    const cols: Array<[string, string, number]> = [
      ["Version", payload.version ?? "1.0", PAGE_MARGIN],
      ["Date", completedDate, 220],
      ["Tester", payload.tester ?? brandName, 350],
      [
        "Notes",
        payload.notes ?? `Penetration Test for ${payload.clientName}`,
        470,
      ],
    ];
    cols.forEach(([h, , x]) =>
      metadata.drawText(h, { x, y: my, size: 13, font: bold, color: BRAND_DARK }),
    );
    my -= 24;
    cols.forEach(([, v, x]) =>
      metadata.drawText(sanitize(v), { x, y: my, size: 11, font, maxWidth: 120 }),
    );
  }

  // ════════════════════ RESERVE TABLE OF CONTENTS PAGES ════════════════════
  const tocEntryCount = 8 + findings.length; // fixed rows + one per finding
  const ROWS_PER_TOC_PAGE = 33;
  const tocPageCount = Math.max(
    1,
    Math.ceil(tocEntryCount / ROWS_PER_TOC_PAGE),
  );
  const tocPages: PDFPage[] = [];
  for (let i = 0; i < tocPageCount; i++) tocPages.push(pdf.addPage(PAGE_SIZE));

  // TOC targets are filled in after body layout, once page numbers are known.
  const tocEntries: Array<{ label: string; ref: PDFPage }> = [];

  // ═══════════════════════════ EXECUTIVE SUMMARY ═══════════════════════════
  const execRef = newPage();
  tocEntries.push({ label: "Executive Summary", ref: execRef });
  heading("Executive Summary", 24);
  paragraph(
    payload.executiveSummary ??
      `This security assessment of ${payload.target || payload.projectTitle} identified material findings and recommended remediations prioritized by risk.`,
    { size: 12, lineHeight: 17 },
  );
  if (payload.detailedAnalysis) {
    gap(10);
    heading("Findings Summary", 16);
    paragraph(payload.detailedAnalysis, { size: 12, lineHeight: 17 });
  }

  // ═══════════════════════════ ASSESSMENT OVERVIEW ═════════════════════════
  const overviewRef = newPage();
  tocEntries.push({ label: "Assessment Overview", ref: overviewRef });
  heading("Assessment Overview", 24);
  tocEntries.push({ label: "Purpose", ref: overviewRef });
  heading("Purpose", 16);
  paragraph(
    payload.purpose ??
      "This assessment was conducted to identify security issues and assess potential business impact if exploited.",
    { size: 11, lineHeight: 15 },
  );
  gap(8);
  tocEntries.push({ label: "Scope", ref: overviewRef });
  heading("Scope", 16);
  const scopeTargets = payload.scopeTargets?.length
    ? payload.scopeTargets
    : payload.target
      ? [payload.target]
      : ["Not provided"];
  scopeTargets.forEach((t) =>
    paragraph(`•  ${t}`, { size: 11, lineHeight: 16 }),
  );

  // ═════════════════════════════ TECHNICAL FINDINGS ════════════════════════
  const findingsRef = newPage();
  tocEntries.push({ label: "Technical Findings", ref: findingsRef });
  heading("Technical Findings", 22);

  findings.forEach((finding: ReportFinding, index: number) => {
    const sev = normalizeSeverity(finding.severity, finding.cvss);
    const { likelihood, impact } = deriveLikelihoodImpact(
      finding.cvss31Vector,
    );

    // Keep the finding header block (pill + title + meta) together.
    ensure(120);
    if (index > 0) {
      // Divider between findings.
      state.page.drawRectangle({
        x: PAGE_MARGIN,
        y: state.y - 2,
        width: CONTENT_WIDTH,
        height: 1,
        color: rgb(0.88, 0.9, 0.93),
      });
      gap(16);
    }
    const startRef = state.page;
    tocEntries.push({
      label: `${String(index + 1).padStart(2, "0")}- ${finding.title}`,
      ref: startRef,
    });

    // Severity pill above the title.
    const pillH = 17;
    ensure(pillH + 8);
    drawPill(
      state.page,
      sev.toUpperCase(),
      PAGE_MARGIN,
      state.y - pillH,
      severityColor(sev),
    );
    state.y -= pillH + 10;

    // Title.
    paragraph(`${String(index + 1).padStart(2, "0")}.  ${finding.title}`, {
      size: 14,
      lineHeight: 18,
      font: bold,
      color: BRAND_DARK,
    });
    gap(2);

    // CVSS 3.1 score + vector.
    if (finding.cvss31Score || finding.cvss31Vector) {
      const cvssLine = [
        finding.cvss31Score ? `CVSS 3.1: ${finding.cvss31Score}` : null,
        finding.cvss31Vector ?? null,
      ]
        .filter(Boolean)
        .join("   ");
      paragraph(cvssLine, { size: 8.5, lineHeight: 12, font: mono, color: GREY });
      gap(2);
    }

    // Likelihood + Impact rating pills.
    if (likelihood || impact) {
      ensure(pillH + 6);
      let rx = PAGE_MARGIN;
      if (likelihood) {
        rx +=
          drawPill(
            state.page,
            `Likelihood: ${likelihood}`,
            rx,
            state.y - pillH,
            ratingColor(likelihood),
            { size: 8.5 },
          ) + 8;
      }
      if (impact) {
        drawPill(
          state.page,
          `Impact: ${impact}`,
          rx,
          state.y - pillH,
          ratingColor(impact),
          { size: 8.5 },
        );
      }
      state.y -= pillH + 12;
    } else {
      gap(6);
    }

    const section = (
      title: string,
      text: string,
      opts: { mono?: boolean; bg?: ReturnType<typeof rgb> } = {},
    ) => {
      label(`${title}:`);
      paragraph(text || "N/A", {
        size: opts.mono ? 9 : 11,
        lineHeight: opts.mono ? 12 : 14.5,
        font: opts.mono ? mono : font,
        bg: opts.bg,
      });
      gap(10);
    };

    section("Finding Description", finding.description);
    if (finding.impact) section("Impact", finding.impact);
    section("Proof of Concept", finding.poc, {
      mono: true,
      bg: rgb(0.96, 0.97, 0.98),
    });
    section("Remediation Recommendations", finding.remediation, {
      bg: rgb(0.93, 0.97, 0.95),
    });
    gap(8);
  });

  // ════════════════════════════════ APPENDIX ═══════════════════════════════
  const appendixRef = newPage();
  tocEntries.push({ label: "Appendix", ref: appendixRef });
  heading("Appendix", 24);
  tocEntries.push({ label: "Severity Descriptions", ref: appendixRef });
  heading("Severity Descriptions", 16);
  const severityText: Array<[string, string]> = [
    ["Critical", "High business impact with likely exploitation path."],
    ["High", "Direct exposure risk to sensitive systems/data."],
    ["Medium", "Meaningful weakness often requiring chaining."],
    ["Low", "Limited exposure or hard-to-exploit issue."],
    [
      "Informational",
      "Security-relevant observation without direct exploitability.",
    ],
  ];
  severityText.forEach(([sev, text]) => {
    label(sev, 12);
    paragraph(text, { size: 10.5, lineHeight: 14 });
    gap(8);
  });

  // ════════════════════════════════ RISK MATRIX ════════════════════════════
  const matrixRef = newPage();
  tocEntries.push({ label: "Risk Matrix", ref: matrixRef });
  heading("Risk Matrix", 24);
  {
    const cols = [
      "Likelihood",
      "Insignificant",
      "Minor",
      "Moderate",
      "Major",
      "Critical",
    ];
    const rows = [
      ["Almost Certain", "High", "High", "Critical", "Critical", "Critical"],
      ["Likely", "Moderate", "High", "High", "Critical", "Critical"],
      ["Moderate", "Low", "Moderate", "High", "Critical", "Critical"],
      ["Unlikely", "Low", "Low", "Moderate", "High", "Critical"],
      ["Rare", "Low", "Low", "Moderate", "High", "High"],
    ];
    const colWidth = CONTENT_WIDTH / cols.length;
    const rowHeight = 28;
    let my = state.y;
    cols.forEach((col, i) => {
      state.page.drawRectangle({
        x: PAGE_MARGIN + i * colWidth,
        y: my - rowHeight,
        width: colWidth,
        height: rowHeight,
        color: BRAND_DARK,
      });
      state.page.drawText(col, {
        x: PAGE_MARGIN + i * colWidth + 6,
        y: my - 18,
        size: 9,
        font: bold,
        color: rgb(1, 1, 1),
      });
    });
    my -= rowHeight;
    rows.forEach((row) => {
      row.forEach((value, i) => {
        state.page.drawRectangle({
          x: PAGE_MARGIN + i * colWidth,
          y: my - rowHeight,
          width: colWidth,
          height: rowHeight,
          color: i === 0 ? rgb(0.93, 0.95, 0.98) : rgb(0.98, 0.98, 0.99),
          borderColor: rgb(0.86, 0.88, 0.92),
          borderWidth: 1,
        });
        state.page.drawText(value, {
          x: PAGE_MARGIN + i * colWidth + 6,
          y: my - 18,
          size: 9,
          font: i === 0 ? bold : font,
          color: TEXT,
        });
      });
      my -= rowHeight;
    });
  }

  // ════════════════ FILL TABLE OF CONTENTS (page numbers now known) ════════
  const allPages = pdf.getPages();
  const pageNumberOf = (ref: PDFPage) => allPages.indexOf(ref) + 1;
  {
    let tocPageIdx = 0;
    let ty = TOP_Y;
    const drawTocTitle = () => {
      tocPages[tocPageIdx].drawText("Table of Contents", {
        x: PAGE_MARGIN,
        y: ty - 24,
        size: 24,
        font: bold,
        color: BRAND_DARK,
      });
      ty -= 24 + 22;
    };
    drawTocTitle();
    for (const entry of tocEntries) {
      if (ty - 18 < BOTTOM_Y && tocPageIdx < tocPages.length - 1) {
        tocPageIdx++;
        ty = TOP_Y;
      }
      const tp = tocPages[tocPageIdx];
      const safeLabel = sanitize(entry.label);
      const trimmed =
        safeLabel.length > 74 ? `${safeLabel.slice(0, 71)}...` : safeLabel;
      tp.drawText(trimmed, {
        x: PAGE_MARGIN,
        y: ty - 11,
        size: 11,
        font,
        color: TEXT,
      });
      tp.drawText(String(pageNumberOf(entry.ref)), {
        x: PAGE_WIDTH - PAGE_MARGIN - 16,
        y: ty - 11,
        size: 11,
        font,
        color: TEXT,
      });
      ty -= 18;
    }
  }

  return pdf.save();
}
