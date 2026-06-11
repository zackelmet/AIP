import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verifyAuth";
import { buildReportPdf } from "@/lib/report-engine/pdf-template";
import { ReportPayload, ReportFinding } from "@/lib/report-engine/types";

export const runtime = "nodejs";

// CSV severity label → representative CVSS score (mirrors the Report Engine).
const RISK_TO_CVSS: Record<string, number> = {
  critical: 9.0,
  high: 7.5,
  medium: 5.0,
  low: 2.5,
  info: 0.0,
  informational: 0.0,
};

function sanitizeFileName(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9-_ ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "report"
  );
}

export async function POST(request: NextRequest) {
  try {
    const adminToken = await verifyAdmin(request);
    if (!adminToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const clientName = String(body?.clientName ?? "").trim();
    const target = String(body?.target ?? "").trim();
    const reportType =
      body?.reportType === "webapp" ? "webapp" : "external";
    const brand = body?.brand === "aip" ? "aip" : "msp";

    if (!clientName) {
      return NextResponse.json(
        { error: "Target organization name is required." },
        { status: 400 },
      );
    }
    if (!Array.isArray(body?.findings) || body.findings.length === 0) {
      return NextResponse.json(
        { error: "At least one finding is required (import a CSV)." },
        { status: 400 },
      );
    }

    const findings: ReportFinding[] = body.findings.map((f: any) => {
      const cvss31Score = String(f?.cvss31Score ?? "").trim();
      const cvss31Vector = String(f?.cvss31Vector ?? "").trim();
      const severityLabel = String(f?.cvssValue ?? f?.severity ?? "").trim();
      // Prefer the real CVSS 3.1 base score; fall back to severity-derived.
      const fromScore = Number(cvss31Score);
      const cvssRaw = Number(f?.cvss);
      const cvss = Number.isFinite(fromScore)
        ? fromScore
        : Number.isFinite(cvssRaw)
          ? cvssRaw
          : (RISK_TO_CVSS[severityLabel.toLowerCase()] ?? 5.0);
      return {
        title: String(f?.title ?? "").trim() || "Untitled Finding",
        description: String(f?.description ?? "").trim(),
        poc: String(f?.poc ?? "").trim(),
        impact: String(f?.impact ?? "").trim(),
        remediation: String(f?.remediation ?? "").trim(),
        cvss,
        cvssValue: severityLabel,
        cvss31Score: cvss31Score || undefined,
        cvss31Vector: cvss31Vector || undefined,
        severity: f?.severity,
      };
    });

    const envLabel =
      reportType === "webapp"
        ? "Web Application Penetration Test"
        : "External Penetration Test";

    const payload: ReportPayload = {
      reportType,
      brand,
      clientName,
      projectTitle: `${clientName} ${envLabel}`,
      target: target || undefined,
      executiveSummary: String(body?.executiveSummary ?? "").trim() || undefined,
      detailedAnalysis: String(body?.detailedAnalysis ?? "").trim() || undefined,
      findings,
    };

    const pdfBytes = await buildReportPdf(payload);
    const fileName = `Pentest Report - ${sanitizeFileName(clientName)}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(pdfBytes.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Quick report generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF report." },
      { status: 500 },
    );
  }
}
