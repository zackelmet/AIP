import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { ReportPayload } from "@/lib/report-engine/types";
import fs from "node:fs";
import path from "node:path";

const PAGE_MARGIN = 52;
const BRAND_DARK = rgb(0.04, 0.08, 0.12);
const BRAND_GREEN = rgb(0.2, 0.83, 0.6);

type Severity = "Critical" | "High" | "Medium" | "Low" | "Informational";

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrapped(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    width: number;
    font: PDFFont;
    size: number;
    lineHeight: number;
    color?: ReturnType<typeof rgb>;
  },
) {
  const lines = wrapText(text, options.font, options.size, options.width);
  let y = options.y;
  lines.forEach((line) => {
    page.drawText(line, {
      x: options.x,
      y,
      size: options.size,
      font: options.font,
      color: options.color ?? rgb(0.1, 0.1, 0.1),
    });
    y -= options.lineHeight;
  });
  return y;
}

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

export async function buildReportPdf(payload: ReportPayload) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const pageSize: [number, number] = [612, 792];
  const pageWidth = pageSize[0];
  const pageHeight = pageSize[1];
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  const now = new Date();
  const completedDate =
    payload.completedDate ?? now.toLocaleDateString("en-US");
  const reportTypeLabel =
    payload.reportType === "webapp"
      ? "WebApp Pentest Report"
      : "External Pentest Report";
  const findingsStartPage = 6;
  const appendixPage = findingsStartPage + payload.findings.length;
  const riskMatrixPage = appendixPage + 1;

  let landingLogo: any = null;
  let landingBackground: any = null;
  try {
    const logoPath = path.join(
      process.cwd(),
      "public",
      "msp pentesting logo (1) (3) (1).png",
    );
    const backgroundPath = path.join(process.cwd(), "public", "brain.png");
    if (fs.existsSync(logoPath)) {
      landingLogo = await pdf.embedPng(fs.readFileSync(logoPath));
    }
    if (fs.existsSync(backgroundPath)) {
      landingBackground = await pdf.embedPng(fs.readFileSync(backgroundPath));
    }
  } catch {
    landingLogo = null;
    landingBackground = null;
  }

  const cover = pdf.addPage(pageSize);
  if (landingBackground) {
    cover.drawImage(landingBackground, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
    cover.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: BRAND_DARK,
      opacity: 0.62,
    });
  } else {
    cover.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: BRAND_DARK,
    });
  }
  if (landingLogo) {
    cover.drawImage(landingLogo, {
      x: (pageWidth - 160) / 2,
      y: pageHeight - 245,
      width: 160,
      height: 160,
    });
  }
  cover.drawText(reportTypeLabel, {
    x: 86,
    y: pageHeight - 330,
    size: 30,
    font: bold,
    color: rgb(1, 1, 1),
  });
  cover.drawText(payload.projectTitle || "Penetration Test Engagement", {
    x: 86,
    y: pageHeight - 368,
    size: 17,
    font,
    color: rgb(0.96, 0.96, 0.96),
  });
  cover.drawText(`Completed ${completedDate}`, {
    x: 86,
    y: pageHeight - 392,
    size: 12,
    font,
    color: BRAND_GREEN,
  });
  if (payload.target) {
    cover.drawText(`Target: ${payload.target}`, {
      x: 86,
      y: pageHeight - 414,
      size: 11,
      font,
      color: rgb(0.9, 0.9, 0.9),
    });
  }

  const metadata = pdf.addPage(pageSize);
  let y = pageHeight - 90;
  metadata.drawText("Version", {
    x: PAGE_MARGIN,
    y,
    size: 13,
    font: bold,
    color: BRAND_DARK,
  });
  metadata.drawText("Date", {
    x: 220,
    y,
    size: 13,
    font: bold,
    color: BRAND_DARK,
  });
  metadata.drawText("Tester", {
    x: 350,
    y,
    size: 13,
    font: bold,
    color: BRAND_DARK,
  });
  metadata.drawText("Notes", {
    x: 470,
    y,
    size: 13,
    font: bold,
    color: BRAND_DARK,
  });
  y -= 24;
  metadata.drawText(payload.version ?? "1.0", {
    x: PAGE_MARGIN,
    y,
    size: 12,
    font,
  });
  metadata.drawText(completedDate, { x: 220, y, size: 12, font });
  metadata.drawText(payload.tester ?? "AIP", { x: 350, y, size: 12, font });
  metadata.drawText(
    payload.notes ?? `Penetration Test for ${payload.clientName}`,
    { x: 470, y, size: 11, font, maxWidth: 120 },
  );

  const toc = pdf.addPage(pageSize);
  y = pageHeight - 90;
  toc.drawText("Table of Contents", {
    x: PAGE_MARGIN,
    y,
    size: 24,
    font: bold,
    color: BRAND_DARK,
  });
  y -= 40;
  const tocRows: Array<[string, number]> = [
    ["Executive Summary", 4],
    ["Assessment Overview", 5],
    ["Purpose", 5],
    ["Scope", 5],
    ["Technical Findings", findingsStartPage],
    ...payload.findings.map((finding, index): [string, number] => [
      `${String(index + 1).padStart(2, "0")}- ${finding.title}`,
      findingsStartPage + index,
    ]),
    ["Appendix", appendixPage],
    ["Severity Descriptions", appendixPage],
    ["Risk Matrix", riskMatrixPage],
  ];
  tocRows.forEach(([label, pageNum]) => {
    const trimmed = label.length > 70 ? `${label.slice(0, 67)}...` : label;
    toc.drawText(trimmed, {
      x: PAGE_MARGIN,
      y,
      size: 11,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
    toc.drawText(String(pageNum), {
      x: pageWidth - PAGE_MARGIN - 10,
      y,
      size: 11,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= 18;
    if (y < 70) return;
  });

  const execPage = pdf.addPage(pageSize);
  y = pageHeight - 90;
  execPage.drawText("Executive Summary", {
    x: PAGE_MARGIN,
    y,
    size: 24,
    font: bold,
    color: BRAND_DARK,
  });
  y -= 30;
  y = drawWrapped(
    execPage,
    payload.executiveSummary ??
      `This security assessment of ${payload.target || payload.projectTitle} identified material findings and recommended remediations prioritized by risk.`,
    {
      x: PAGE_MARGIN,
      y,
      width: contentWidth,
      font,
      size: 12,
      lineHeight: 17,
    },
  );

  const overview = pdf.addPage(pageSize);
  y = pageHeight - 90;
  overview.drawText("Assessment Overview", {
    x: PAGE_MARGIN,
    y,
    size: 24,
    font: bold,
    color: BRAND_DARK,
  });
  y -= 38;
  overview.drawText("Purpose", {
    x: PAGE_MARGIN,
    y,
    size: 16,
    font: bold,
    color: BRAND_DARK,
  });
  y -= 24;
  y = drawWrapped(
    overview,
    payload.purpose ??
      "This assessment was conducted to identify security issues and assess potential business impact if exploited.",
    {
      x: PAGE_MARGIN,
      y,
      width: contentWidth,
      font,
      size: 11,
      lineHeight: 15,
    },
  );
  y -= 20;
  overview.drawText("Scope", {
    x: PAGE_MARGIN,
    y,
    size: 16,
    font: bold,
    color: BRAND_DARK,
  });
  y -= 24;
  const scopeTargets = payload.scopeTargets?.length
    ? payload.scopeTargets
    : payload.target
      ? [payload.target]
      : ["Not provided"];
  scopeTargets.forEach((target) => {
    overview.drawText(`• ${target}`, {
      x: PAGE_MARGIN,
      y,
      size: 11,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= 16;
  });

  payload.findings.forEach((finding, index) => {
    const findingPage = pdf.addPage(pageSize);
    let fy = pageHeight - 90;
    const severity = normalizeSeverity(finding.severity, finding.cvss);
    const sevColor = severityColor(severity);

    findingPage.drawText(`Technical Findings`, {
      x: PAGE_MARGIN,
      y: fy,
      size: 22,
      font: bold,
      color: BRAND_DARK,
    });
    fy -= 34;
    findingPage.drawText(
      `${String(index + 1).padStart(2, "0")}- ${finding.title}`,
      { x: PAGE_MARGIN, y: fy, size: 14, font: bold, color: BRAND_DARK },
    );
    fy -= 24;
    findingPage.drawRectangle({
      x: PAGE_MARGIN,
      y: fy - 2,
      width: 94,
      height: 16,
      color: sevColor,
    });
    findingPage.drawText(severity, {
      x: PAGE_MARGIN + 8,
      y: fy + 2,
      size: 9,
      font: bold,
      color: rgb(1, 1, 1),
    });
    findingPage.drawText(`CVSS: ${finding.cvssValue}`, {
      x: PAGE_MARGIN + 110,
      y: fy + 2,
      size: 10,
      font,
      color: rgb(0.18, 0.18, 0.18),
    });
    fy -= 26;

    const section = (title: string, text: string, monoBlock = false) => {
      findingPage.drawText(title, {
        x: PAGE_MARGIN,
        y: fy,
        size: 12,
        font: bold,
        color: BRAND_DARK,
      });
      fy -= 16;
      if (monoBlock) {
        findingPage.drawRectangle({
          x: PAGE_MARGIN,
          y: fy - 84,
          width: contentWidth,
          height: 86,
          color: rgb(0.96, 0.97, 0.98),
          borderColor: rgb(0.85, 0.87, 0.9),
          borderWidth: 1,
        });
        fy = drawWrapped(findingPage, text || "N/A", {
          x: PAGE_MARGIN + 8,
          y: fy - 12,
          width: contentWidth - 16,
          font: mono,
          size: 9,
          lineHeight: 12,
        });
      } else {
        fy = drawWrapped(findingPage, text, {
          x: PAGE_MARGIN,
          y: fy,
          width: contentWidth,
          font,
          size: 11,
          lineHeight: 14,
        });
      }
      fy -= 12;
    };

    section("Finding Description:", finding.description);
    section("Impact:", finding.impact);
    section("Proof of Concept:", finding.poc, true);
    findingPage.drawRectangle({
      x: PAGE_MARGIN,
      y: fy - 60,
      width: contentWidth,
      height: 62,
      color: rgb(0.88, 0.95, 0.98),
      borderColor: rgb(0.74, 0.87, 0.94),
      borderWidth: 1,
    });
    section("Remediation Recommendations:", finding.remediation);
  });

  const appendix = pdf.addPage(pageSize);
  y = pageHeight - 90;
  appendix.drawText("Appendix", {
    x: PAGE_MARGIN,
    y,
    size: 24,
    font: bold,
    color: BRAND_DARK,
  });
  y -= 32;
  appendix.drawText("Severity Descriptions", {
    x: PAGE_MARGIN,
    y,
    size: 16,
    font: bold,
    color: BRAND_DARK,
  });
  y -= 22;
  const severityText = [
    ["Critical", "High business impact with likely exploitation path."],
    ["High", "Direct exposure risk to sensitive systems/data."],
    ["Medium", "Meaningful weakness often requiring chaining."],
    ["Low", "Limited exposure or hard-to-exploit issue."],
    [
      "Informational",
      "Security-relevant observation without direct exploitability.",
    ],
  ] as const;
  severityText.forEach(([label, text]) => {
    appendix.drawText(label, {
      x: PAGE_MARGIN,
      y,
      size: 12,
      font: bold,
      color: BRAND_DARK,
    });
    y -= 14;
    y = drawWrapped(appendix, text, {
      x: PAGE_MARGIN,
      y,
      width: contentWidth,
      font,
      size: 10.5,
      lineHeight: 14,
    });
    y -= 10;
  });

  const matrix = pdf.addPage(pageSize);
  y = pageHeight - 90;
  matrix.drawText("Risk Matrix", {
    x: PAGE_MARGIN,
    y,
    size: 24,
    font: bold,
    color: BRAND_DARK,
  });
  y -= 34;
  const cols = [
    "Impact",
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
  const colWidth = contentWidth / cols.length;
  const rowHeight = 28;

  cols.forEach((col, index) => {
    matrix.drawRectangle({
      x: PAGE_MARGIN + index * colWidth,
      y: y - rowHeight,
      width: colWidth,
      height: rowHeight,
      color: BRAND_DARK,
    });
    matrix.drawText(col, {
      x: PAGE_MARGIN + index * colWidth + 6,
      y: y - 18,
      size: 9,
      font: bold,
      color: rgb(1, 1, 1),
    });
  });
  y -= rowHeight;

  rows.forEach((row) => {
    row.forEach((value, index) => {
      matrix.drawRectangle({
        x: PAGE_MARGIN + index * colWidth,
        y: y - rowHeight,
        width: colWidth,
        height: rowHeight,
        color: index === 0 ? rgb(0.93, 0.95, 0.98) : rgb(0.98, 0.98, 0.99),
        borderColor: rgb(0.86, 0.88, 0.92),
        borderWidth: 1,
      });
      matrix.drawText(value, {
        x: PAGE_MARGIN + index * colWidth + 6,
        y: y - 18,
        size: 9,
        font: index === 0 ? bold : font,
        color: rgb(0.12, 0.12, 0.12),
      });
    });
    y -= rowHeight;
  });

  return pdf.save();
}
