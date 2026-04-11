import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { ReportPayload } from "@/lib/report-engine/types";

const PAGE_MARGIN = 50;
const FONT_SIZE_BODY = 11;
const FONT_SIZE_HEADING = 18;
const FONT_SIZE_SUBHEADING = 14;
const FONT_SIZE_SMALL = 10;

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
) {
  const words = text.split(/\s+/);
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
      color: rgb(0.02, 0.08, 0.12),
    });
    y -= 28;
  };

  const drawSubheading = (title: string) => {
    ensureSpace(24);
    page.drawText(title, {
      x: PAGE_MARGIN,
      y,
      size: FONT_SIZE_SUBHEADING,
      font: bold,
      color: rgb(0.08, 0.08, 0.08),
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
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(value, {
      x: PAGE_MARGIN + 120,
      y,
      size: FONT_SIZE_BODY,
      font,
      color: rgb(0.1, 0.1, 0.1),
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
      maxWidth: page.getWidth() - PAGE_MARGIN * 2,
      lineHeight: 15,
    });
    y -= 8;
  };

  const now = new Date();
  const completedDate = payload.completedDate ?? now.toLocaleDateString();
  const tester = payload.tester ?? "AIP";
  const version = payload.version ?? "1.0";

  drawHeading("External Pentest Report");
  drawSubheading(payload.projectTitle);
  sectionText(`Client: ${payload.clientName}`);
  if (payload.target) sectionText(`Target: ${payload.target}`);
  sectionText(`Completed: ${completedDate}`);

  y -= 6;
  page.drawLine({
    start: { x: PAGE_MARGIN, y },
    end: { x: page.getWidth() - PAGE_MARGIN, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 20;

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

  drawSubheading("Technical Findings");

  payload.findings.forEach((finding, index) => {
    ensureSpace(200);

    page.drawText(`${String(index + 1).padStart(2, "0")}- ${finding.title}`, {
      x: PAGE_MARGIN,
      y,
      size: 12,
      font: bold,
      color: rgb(0.05, 0.05, 0.05),
    });
    y -= 18;

    const severity = finding.severity ?? "Informational";
    const cvssDisplay = Number.isFinite(finding.cvss)
      ? finding.cvss.toFixed(1)
      : String(finding.cvss);

    drawLabelValue("Severity", severity);
    drawLabelValue("CVSS", `${cvssDisplay} (${finding.cvssValue})`);

    page.drawText("Finding Description:", {
      x: PAGE_MARGIN,
      y,
      size: FONT_SIZE_BODY,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 15;
    sectionText(finding.description);

    page.drawText("Impact:", {
      x: PAGE_MARGIN,
      y,
      size: FONT_SIZE_BODY,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 15;
    sectionText(finding.impact);

    page.drawText("Proof of Concept:", {
      x: PAGE_MARGIN,
      y,
      size: FONT_SIZE_BODY,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 15;

    const pocText = finding.poc || "N/A";
    const pocLines = wrapText(
      pocText,
      mono,
      FONT_SIZE_SMALL,
      page.getWidth() - PAGE_MARGIN * 2 - 14,
    );
    const codeBlockHeight = Math.max(40, pocLines.length * 13 + 16);
    ensureSpace(codeBlockHeight + 12);

    page.drawRectangle({
      x: PAGE_MARGIN,
      y: y - codeBlockHeight + 8,
      width: page.getWidth() - PAGE_MARGIN * 2,
      height: codeBlockHeight,
      color: rgb(0.96, 0.96, 0.96),
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1,
    });

    let pocY = y - 6;
    for (const line of pocLines) {
      page.drawText(line, {
        x: PAGE_MARGIN + 7,
        y: pocY,
        size: FONT_SIZE_SMALL,
        font: mono,
        color: rgb(0.12, 0.12, 0.12),
      });
      pocY -= 12;
    }
    y -= codeBlockHeight + 8;

    page.drawText("Remediation Recommendations:", {
      x: PAGE_MARGIN,
      y,
      size: FONT_SIZE_BODY,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 15;
    sectionText(finding.remediation);

    if (finding.references && finding.references.length > 0) {
      page.drawText("References:", {
        x: PAGE_MARGIN,
        y,
        size: FONT_SIZE_BODY,
        font: bold,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 15;
      sectionText(
        finding.references
          .map((ref, refIndex) => `${refIndex + 1}. ${ref}`)
          .join("\n"),
      );
    }

    y -= 10;
  });

  ensureSpace(120);
  drawSubheading("Appendix");
  sectionText(
    "Severity descriptions and risk matrix should be interpreted using your internal risk policies.",
  );

  const bytes = await pdf.save();
  return bytes;
}
