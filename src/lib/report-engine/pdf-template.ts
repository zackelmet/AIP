import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { ReportPayload } from "@/lib/report-engine/types";

const PAGE_MARGIN = 50;
const FONT_SIZE_BODY = 11;
const FONT_SIZE_HEADING = 22;
const FONT_SIZE_SUBHEADING = 14;
const FONT_SIZE_SMALL = 10;

const BRAND_DARK = rgb(0.04, 0.08, 0.12);
const BRAND_GREEN = rgb(0.2, 0.83, 0.6);
const LIGHT_BORDER = rgb(0.85, 0.87, 0.9);
const LIGHT_SURFACE = rgb(0.97, 0.98, 0.99);

type Severity = "critical" | "high" | "medium" | "low" | "info";

function normalizeSeverity(input: string | undefined, cvss: number): Severity {
  const value = (input || "").toLowerCase();
  if (
    ["critical", "high", "medium", "low", "info", "informational"].includes(
      value,
    )
  ) {
    if (value === "informational") return "info";
    return value as Severity;
  }
  if (cvss >= 9) return "critical";
  if (cvss >= 7) return "high";
  if (cvss >= 4) return "medium";
  if (cvss > 0) return "low";
  return "info";
}

function severityColors(severity: Severity) {
  if (severity === "critical")
    return { stripe: rgb(0.86, 0.19, 0.2), badge: rgb(0.86, 0.19, 0.2) };
  if (severity === "high")
    return { stripe: rgb(0.93, 0.49, 0.17), badge: rgb(0.93, 0.49, 0.17) };
  if (severity === "medium")
    return { stripe: rgb(0.95, 0.75, 0.2), badge: rgb(0.95, 0.75, 0.2) };
  if (severity === "low")
    return { stripe: rgb(0.12, 0.7, 0.58), badge: rgb(0.12, 0.7, 0.58) };
  return { stripe: rgb(0.2, 0.73, 0.94), badge: rgb(0.2, 0.73, 0.94) };
}

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
    const candidate = current ? `${current} ${word}` : word;
    const candidateWidth = font.widthOfTextAtSize(candidate, fontSize);
    if (candidateWidth <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function estimateParagraphHeight(options: {
  text: string;
  font: PDFFont;
  fontSize: number;
  maxWidth: number;
  lineHeight: number;
}) {
  const lines = wrapText(
    options.text,
    options.font,
    options.fontSize,
    options.maxWidth,
  );
  return Math.max(options.lineHeight, lines.length * options.lineHeight);
}

function drawParagraph(options: {
  page: PDFPage;
  text: string;
  font: PDFFont;
  fontSize: number;
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
}) {
  const lines = wrapText(
    options.text,
    options.font,
    options.fontSize,
    options.maxWidth,
  );
  let y = options.y;
  for (const line of lines) {
    options.page.drawText(line, {
      x: options.x,
      y,
      size: options.fontSize,
      font: options.font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= options.lineHeight;
  }
  return y;
}

export async function buildReportPdf(payload: ReportPayload) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const pageSize: [number, number] = [595.28, 841.89];
  let page = pdf.addPage(pageSize);
  let y = page.getHeight() - PAGE_MARGIN;
  const contentWidth = page.getWidth() - PAGE_MARGIN * 2;

  const ensureSpace = (spaceNeeded: number) => {
    if (y - spaceNeeded < PAGE_MARGIN) {
      page = pdf.addPage(pageSize);
      y = page.getHeight() - PAGE_MARGIN;
    }
  };

  const drawHeading = (title: string) => {
    ensureSpace(36);
    page.drawText(title, {
      x: PAGE_MARGIN,
      y,
      size: FONT_SIZE_HEADING,
      font: bold,
      color: BRAND_DARK,
    });
    y -= 28;
  };

  const drawSubheading = (title: string) => {
    ensureSpace(24);
    page.drawRectangle({
      x: PAGE_MARGIN,
      y: y - 2,
      width: 4,
      height: 18,
      color: BRAND_GREEN,
    });
    page.drawText(title, {
      x: PAGE_MARGIN + 10,
      y,
      size: FONT_SIZE_SUBHEADING,
      font: bold,
      color: BRAND_DARK,
    });
    y -= 20;
  };

  const drawLabelValue = (label: string, value: string) => {
    ensureSpace(20);
    page.drawText(`${label}:`, {
      x: PAGE_MARGIN,
      y,
      size: FONT_SIZE_BODY,
      font: bold,
      color: BRAND_DARK,
    });
    page.drawText(value, {
      x: PAGE_MARGIN + 120,
      y,
      size: FONT_SIZE_BODY,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= 16;
  };

  const sectionText = (text: string) => {
    ensureSpace(40);
    y = drawParagraph({
      page,
      text,
      font,
      fontSize: FONT_SIZE_BODY,
      x: PAGE_MARGIN,
      y,
      maxWidth: contentWidth,
      lineHeight: 15,
    });
    y -= 8;
  };

  const drawHeader = () => {
    const headerHeight = 106;
    page.drawRectangle({
      x: 0,
      y: page.getHeight() - headerHeight,
      width: page.getWidth(),
      height: headerHeight,
      color: BRAND_DARK,
    });

    page.drawText("AFFORDABLE PENTESTING", {
      x: PAGE_MARGIN,
      y: page.getHeight() - 48,
      size: 19,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page.drawText("AI-Powered Penetration Testing", {
      x: PAGE_MARGIN,
      y: page.getHeight() - 68,
      size: 11,
      font,
      color: BRAND_GREEN,
    });

    y = page.getHeight() - headerHeight - 26;
  };

  const drawMetadataCard = () => {
    const rows: Array<[string, string]> = [
      ["Client", payload.clientName],
      ["Project", payload.projectTitle],
      ["Target", payload.target || "N/A"],
      ["Date", completedDate],
      ["Findings", `${payload.findings.length} identified`],
    ];

    const cardHeight = rows.length * 22 + 16;
    ensureSpace(cardHeight + 16);

    page.drawRectangle({
      x: PAGE_MARGIN,
      y: y - cardHeight + 8,
      width: contentWidth,
      height: cardHeight,
      color: LIGHT_SURFACE,
      borderColor: LIGHT_BORDER,
      borderWidth: 1,
    });

    page.drawRectangle({
      x: PAGE_MARGIN,
      y: y - cardHeight + 8,
      width: 4,
      height: cardHeight,
      color: BRAND_GREEN,
    });

    let rowY = y - 12;
    rows.forEach(([label, value], index) => {
      page.drawText(`${label}:`, {
        x: PAGE_MARGIN + 14,
        y: rowY,
        size: 10,
        font: bold,
        color: BRAND_DARK,
      });
      page.drawText(value, {
        x: PAGE_MARGIN + 95,
        y: rowY,
        size: 10,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });

      if (index < rows.length - 1) {
        page.drawLine({
          start: { x: PAGE_MARGIN + 12, y: rowY - 6 },
          end: { x: PAGE_MARGIN + contentWidth - 12, y: rowY - 6 },
          thickness: 0.6,
          color: LIGHT_BORDER,
        });
      }

      rowY -= 22;
    });

    y -= cardHeight + 10;
  };

  const now = new Date();
  const completedDate = payload.completedDate ?? now.toLocaleDateString();
  const tester = payload.tester ?? "AIP";
  const version = payload.version ?? "1.0";

  drawHeader();
  drawHeading("Penetration Test Report");
  drawMetadataCard();

  drawSubheading(payload.projectTitle);

  drawSubheading("Assessment Overview");
  drawLabelValue("Version", version);
  drawLabelValue("Date", completedDate);
  drawLabelValue("Tester", tester);
  if (payload.notes) drawLabelValue("Notes", payload.notes);

  y -= 12;
  drawSubheading("Executive Summary");
  sectionText(
    payload.executiveSummary ??
      `This security assessment evaluates ${payload.projectTitle} for ${payload.clientName}. The report details the technical findings, impact, and remediation recommendations.`,
  );

  drawSubheading("Purpose");
  sectionText(
    payload.purpose ??
      "This assessment was conducted to identify security issues and evaluate risk and impact if exploited by a malicious actor.",
  );

  drawSubheading("Scope");
  const scopeTargets = payload.scopeTargets?.length
    ? payload.scopeTargets
    : payload.target
      ? [payload.target]
      : ["Not provided"];
  sectionText(
    scopeTargets.map((target, index) => `${index + 1}. ${target}`).join("\n"),
  );

  drawSubheading("Vulnerability Findings");

  payload.findings.forEach((finding, index) => {
    const severity = normalizeSeverity(finding.severity, finding.cvss);
    const severityTheme = severityColors(severity);
    const cvssDisplay = Number.isFinite(finding.cvss)
      ? finding.cvss.toFixed(1)
      : String(finding.cvss);

    const findingWidth = contentWidth - 24;
    const paragraphWidth = findingWidth - 20;

    const descHeight = estimateParagraphHeight({
      text: finding.description,
      font,
      fontSize: FONT_SIZE_BODY,
      maxWidth: paragraphWidth,
      lineHeight: 14,
    });
    const impactHeight = estimateParagraphHeight({
      text: finding.impact,
      font,
      fontSize: FONT_SIZE_BODY,
      maxWidth: paragraphWidth,
      lineHeight: 14,
    });

    const pocText = finding.poc || "N/A";
    const pocHeight = estimateParagraphHeight({
      text: pocText,
      font: mono,
      fontSize: FONT_SIZE_SMALL,
      maxWidth: paragraphWidth - 10,
      lineHeight: 12,
    });

    const remediationHeight = estimateParagraphHeight({
      text: finding.remediation,
      font,
      fontSize: FONT_SIZE_BODY,
      maxWidth: paragraphWidth,
      lineHeight: 14,
    });

    const cardHeight =
      28 +
      24 +
      16 +
      descHeight +
      14 +
      impactHeight +
      14 +
      pocHeight +
      26 +
      remediationHeight +
      26;

    ensureSpace(cardHeight + 16);

    const cardTop = y;
    const cardBottom = y - cardHeight;
    const cardX = PAGE_MARGIN + 12;

    page.drawRectangle({
      x: cardX,
      y: cardBottom,
      width: findingWidth,
      height: cardHeight,
      color: rgb(1, 1, 1),
      borderColor: LIGHT_BORDER,
      borderWidth: 1,
    });
    page.drawRectangle({
      x: cardX,
      y: cardBottom,
      width: 5,
      height: cardHeight,
      color: severityTheme.stripe,
    });

    let cardY = cardTop - 16;
    page.drawText(`${index + 1}. ${finding.title}`, {
      x: cardX + 12,
      y: cardY,
      size: 12,
      font: bold,
      color: BRAND_DARK,
    });

    const badgeLabel = severity.toUpperCase();
    const badgeWidth = bold.widthOfTextAtSize(badgeLabel, 8) + 12;
    page.drawRectangle({
      x: cardX + findingWidth - badgeWidth - 12,
      y: cardY - 1,
      width: badgeWidth,
      height: 12,
      color: severityTheme.badge,
    });
    page.drawText(badgeLabel, {
      x: cardX + findingWidth - badgeWidth - 6,
      y: cardY + 2,
      size: 8,
      font: bold,
      color: rgb(1, 1, 1),
    });

    cardY -= 18;
    page.drawText(`CVSS: ${cvssDisplay} (${finding.cvssValue})`, {
      x: cardX + 12,
      y: cardY,
      size: 9,
      font,
      color: rgb(0.38, 0.38, 0.38),
    });

    const drawCardSection = (label: string, text: string, isMono = false) => {
      cardY -= 16;
      page.drawText(label, {
        x: cardX + 12,
        y: cardY,
        size: 10,
        font: bold,
        color: BRAND_DARK,
      });
      cardY -= 12;

      const lines = wrapText(
        text,
        isMono ? mono : font,
        isMono ? FONT_SIZE_SMALL : FONT_SIZE_BODY,
        paragraphWidth,
      );

      lines.forEach((line) => {
        page.drawText(line, {
          x: cardX + 12,
          y: cardY,
          size: isMono ? FONT_SIZE_SMALL : FONT_SIZE_BODY,
          font: isMono ? mono : font,
          color: rgb(0.15, 0.15, 0.15),
        });
        cardY -= isMono ? 12 : 14;
      });
    };

    drawCardSection("Description:", finding.description);
    drawCardSection("Impact:", finding.impact);
    drawCardSection("Proof of Concept:", pocText, true);

    const remHeight = Math.max(24, remediationHeight + 10);
    page.drawRectangle({
      x: cardX + 10,
      y: cardY - remHeight + 10,
      width: paragraphWidth + 6,
      height: remHeight,
      color: rgb(0.88, 0.95, 0.98),
      borderColor: rgb(0.72, 0.88, 0.94),
      borderWidth: 1,
    });
    cardY -= 6;
    page.drawText("Remediation:", {
      x: cardX + 14,
      y: cardY,
      size: 10,
      font: bold,
      color: BRAND_DARK,
    });
    cardY -= 12;

    wrapText(
      finding.remediation,
      font,
      FONT_SIZE_BODY,
      paragraphWidth - 4,
    ).forEach((line) => {
      page.drawText(line, {
        x: cardX + 14,
        y: cardY,
        size: FONT_SIZE_BODY,
        font,
        color: rgb(0.14, 0.14, 0.14),
      });
      cardY -= 14;
    });

    y = cardBottom - 14;
  });

  drawSubheading("Detailed Analysis");
  const analysisText =
    payload.detailedAnalysis ||
    "Detailed analysis not provided. Use this section for deeper technical context, methodology notes, and raw scanner output excerpts.";

  const analysisHeight = estimateParagraphHeight({
    text: analysisText,
    font: mono,
    fontSize: FONT_SIZE_SMALL,
    maxWidth: contentWidth - 20,
    lineHeight: 12,
  });
  const codeBlockHeight = Math.max(70, analysisHeight + 16);
  ensureSpace(codeBlockHeight + 20);

  page.drawRectangle({
    x: PAGE_MARGIN,
    y: y - codeBlockHeight + 6,
    width: contentWidth,
    height: codeBlockHeight,
    color: LIGHT_SURFACE,
    borderColor: LIGHT_BORDER,
    borderWidth: 1,
  });

  let analysisY = y - 10;
  wrapText(analysisText, mono, FONT_SIZE_SMALL, contentWidth - 16).forEach(
    (line) => {
      page.drawText(line, {
        x: PAGE_MARGIN + 8,
        y: analysisY,
        size: FONT_SIZE_SMALL,
        font: mono,
        color: rgb(0.15, 0.15, 0.15),
      });
      analysisY -= 12;
    },
  );
  y -= codeBlockHeight + 8;

  drawSubheading("Disclaimer");
  sectionText(
    "This penetration test report is provided for informational purposes only. Findings represent conditions observed at the time of testing. Validate remediation steps in your environment before production rollout.",
  );

  ensureSpace(30);
  page.drawLine({
    start: { x: PAGE_MARGIN, y },
    end: { x: PAGE_MARGIN + contentWidth, y },
    thickness: 0.8,
    color: LIGHT_BORDER,
  });
  y -= 16;
  page.drawText("Affordable Pentesting · Confidential Report", {
    x: PAGE_MARGIN,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  const bytes = await pdf.save();
  return bytes;
}
