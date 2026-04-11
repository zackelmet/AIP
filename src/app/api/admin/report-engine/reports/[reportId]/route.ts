import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verifyAuth";
import {
  downloadReportPdf,
  getReportRecord,
} from "@/lib/report-engine/storage";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: { reportId: string } },
) {
  const adminToken = await verifyAdmin(request);
  if (!adminToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reportId = context.params.reportId;
  const report = await getReportRecord(reportId);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const fileBytes = await downloadReportPdf(report.storagePath);
  if (!fileBytes) {
    return NextResponse.json(
      { error: "Stored report file not found." },
      { status: 404 },
    );
  }

  return new NextResponse(new Uint8Array(fileBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${report.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
