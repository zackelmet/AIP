import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";
import { ReportPayload } from "@/lib/report-engine/types";

export interface StoredReportRecord {
  id: string;
  ownerUid: string;
  sharedWithUserIds: string[];
  storagePath: string;
  fileName: string;
  clientName: string;
  projectTitle: string;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

function sanitizePathPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function saveReportPdf(params: {
  pdfBytes: Uint8Array;
  payload: ReportPayload;
  ownerUid: string;
}) {
  const bucket = adminStorage.bucket();
  const reportRef = adminDb.collection("reports").doc();
  const reportId = reportRef.id;

  const client = sanitizePathPart(params.payload.clientName || "client");
  const project = sanitizePathPart(params.payload.projectTitle || "report");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${timestamp}-${project}.pdf`;
  const storagePath = `reports/${client}/${fileName}`;

  const file = bucket.file(storagePath);
  await file.save(Buffer.from(params.pdfBytes), {
    contentType: "application/pdf",
    resumable: false,
    metadata: {
      metadata: {
        reportId,
        ownerUid: params.ownerUid,
      },
    },
  });

  const sharedWithUserIds = params.payload.sharedWithUserIds ?? [];

  const record: StoredReportRecord = {
    id: reportId,
    ownerUid: params.ownerUid,
    sharedWithUserIds,
    storagePath,
    fileName,
    clientName: params.payload.clientName,
    projectTitle: params.payload.projectTitle,
    createdAt: FieldValue.serverTimestamp(),
  };

  await reportRef.set(record);

  return {
    reportId,
    storagePath,
    fileName,
  };
}

export async function getReportRecord(reportId: string) {
  const snapshot = await adminDb.collection("reports").doc(reportId).get();
  if (!snapshot.exists) return null;
  return snapshot.data() as StoredReportRecord;
}

export async function downloadReportPdf(storagePath: string) {
  const bucket = adminStorage.bucket();
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) return null;

  const [bytes] = await file.download();
  return bytes;
}
