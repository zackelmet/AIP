import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { verifyAuth } from "@/lib/auth/verifyAuth";
import {
  downloadReportPdf,
  getReportRecord,
} from "@/lib/report-engine/storage";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: { reportId: string } },
) {
  const token = await verifyAuth(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reportId = context.params.reportId;
  const report = await getReportRecord(reportId);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const admin = initializeAdmin();
  const isAdminClaim = token.isAdmin === true;
  const isAdminDb =
    (await admin.firestore().collection("users").doc(token.uid).get()).data()
      ?.isAdmin === true;
  const isOwner = report.ownerUid === token.uid;
  const isSharedWithUser = Array.isArray(report.sharedWithUserIds)
    ? report.sharedWithUserIds.includes(token.uid)
    : false;

  if (!isAdminClaim && !isAdminDb && !isOwner && !isSharedWithUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${report.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
