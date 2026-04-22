import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verifyAuth";
import { buildReportDocx } from "@/lib/report-engine/docx-template";
import { getReportSignedUrl, saveReportPdf } from "@/lib/report-engine/storage";
import { ReportPayload, ReportFinding } from "@/lib/report-engine/types";

export const runtime = "nodejs";

function validateFinding(finding: Partial<ReportFinding>, index: number) {
  const errors: Array<{ path: string; message: string }> = [];
  const pathPrefix = `findings.${index}`;

  if (!finding.title?.trim()) {
    errors.push({ path: `${pathPrefix}.title`, message: "Title is required" });
  }
  if (!finding.description?.trim()) {
    errors.push({
      path: `${pathPrefix}.description`,
      message: "Description is required",
    });
  }
  if (!finding.poc?.trim()) {
    errors.push({ path: `${pathPrefix}.poc`, message: "POC is required" });
  }
  if (!finding.impact?.trim()) {
    errors.push({
      path: `${pathPrefix}.impact`,
      message: "Impact is required",
    });
  }
  if (!finding.remediation?.trim()) {
    errors.push({
      path: `${pathPrefix}.remediation`,
      message: "Remediation is required",
    });
  }
  if (!finding.cvssValue?.trim()) {
    errors.push({
      path: `${pathPrefix}.cvssValue`,
      message: "CVSS value is required",
    });
  }

  const cvssNumber = Number(finding.cvss);
  if (Number.isNaN(cvssNumber) || cvssNumber < 0 || cvssNumber > 10) {
    errors.push({
      path: `${pathPrefix}.cvss`,
      message: "CVSS must be a number between 0 and 10",
    });
  }

  return errors;
}

function validatePayload(body: any) {
  const errors: Array<{ path: string; message: string }> = [];

  if (!body || typeof body !== "object") {
    return [{ path: "body", message: "Payload must be a JSON object" }];
  }

  if (!body.clientName?.trim()) {
    errors.push({ path: "clientName", message: "Client Name is required" });
  }
  if (!body.projectTitle?.trim()) {
    errors.push({
      path: "projectTitle",
      message: "Project Title is required",
    });
  }

  if (
    body.reportType &&
    body.reportType !== "external" &&
    body.reportType !== "webapp"
  ) {
    errors.push({
      path: "reportType",
      message: "reportType must be either 'external' or 'webapp'",
    });
  }

  if (!Array.isArray(body.findings) || body.findings.length === 0) {
    errors.push({
      path: "findings",
      message: "At least one finding is required",
    });
  } else {
    body.findings.forEach((finding: Partial<ReportFinding>, index: number) => {
      errors.push(...validateFinding(finding, index));
    });
  }

  return errors;
}

export async function POST(request: NextRequest) {
  try {
    const adminToken = await verifyAdmin(request);
    if (!adminToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validationErrors = validatePayload(body);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Invalid report payload", details: validationErrors },
        { status: 400 },
      );
    }

    const payload: ReportPayload = {
      reportType: body.reportType === "webapp" ? "webapp" : "external",
      clientName: body.clientName.trim(),
      projectTitle: body.projectTitle.trim(),
      target: body.target?.trim() || undefined,
      completedDate: body.completedDate?.trim() || undefined,
      tester: body.tester?.trim() || undefined,
      version: body.version?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      executiveSummary: body.executiveSummary?.trim() || undefined,
      purpose: body.purpose?.trim() || undefined,
      detailedAnalysis: body.detailedAnalysis?.trim() || undefined,
      scopeTargets: Array.isArray(body.scopeTargets)
        ? body.scopeTargets.filter((item: unknown) => typeof item === "string")
        : undefined,
      sharedWithUserIds: Array.isArray(body.sharedWithUserIds)
        ? body.sharedWithUserIds.filter(
            (item: unknown) => typeof item === "string",
          )
        : undefined,
      findings: body.findings.map((finding: ReportFinding) => ({
        title: finding.title.trim(),
        description: finding.description.trim(),
        poc: finding.poc.trim(),
        impact: finding.impact.trim(),
        remediation: finding.remediation.trim(),
        cvss: Number(finding.cvss),
        cvssValue: finding.cvssValue.trim(),
        severity: finding.severity,
        references: Array.isArray(finding.references)
          ? finding.references.filter(
              (item: unknown) => typeof item === "string",
            )
          : undefined,
      })),
    };

    const docxBytes = buildReportDocx(payload);
    const saved = await saveReportPdf({
      pdfBytes: docxBytes,
      payload,
      ownerUid: adminToken.uid,
    });

    const signed = await getReportSignedUrl({
      storagePath: saved.storagePath,
      fileName: saved.fileName,
      expiresInMinutes: 15,
    });

    return NextResponse.json({
      status: "success",
      reportId: saved.reportId,
      fileName: saved.fileName,
      accessUrl: `/api/admin/report-engine/reports/${saved.reportId}`,
      signedUrl: signed?.url ?? null,
      signedUrlExpiresAt: signed?.expiresAt ?? null,
    });
  } catch (error) {
    console.error("Report submit failed:", error);
    return NextResponse.json(
      { error: "Failed to generate or store report." },
      { status: 500 },
    );
  }
}
