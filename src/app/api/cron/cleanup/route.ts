import { NextResponse } from "next/server";
import { initializeAdmin, adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";

const RETENTION_DAYS = 90;
const CUTOFF_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    initializeAdmin();
    const cutoff = new Date(Date.now() - CUTOFF_MS);

    // Get all pentests and filter in-memory to avoid needing a composite index
    const allPentests = await adminDb.collection("pentests").get();
    const bucket = adminStorage.bucket();

    let deletedPentests = 0;
    let deletedReports = 0;
    let deletedStorage = 0;

    for (const doc of allPentests.docs) {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
      if (!createdAt || createdAt > cutoff) continue;

      // Delete associated report doc
      if (data.reportId) {
        try {
          await adminDb.collection("reports").doc(data.reportId).delete();
          deletedReports++;
        } catch {
          // report may not exist
        }
      }

      // Delete storage files
      if (data.reportStoragePath) {
        try {
          await bucket.file(data.reportStoragePath).delete();
          deletedStorage++;
        } catch {
          // file may not exist
        }
      }

      // Also try removing any results/report files stored under reports/
      if (data.reportId) {
        try {
          const [files] = await bucket.getFiles({ prefix: `reports/${data.userId || "unknown"}/` });
          for (const file of files) {
            if (file.name.includes(doc.id)) {
              await file.delete();
              deletedStorage++;
            }
          }
        } catch {
          // noop
        }
      }

      // Delete the pentest doc
      await adminDb.collection("pentests").doc(doc.id).delete();
      deletedPentests++;
    }

    return NextResponse.json({
      success: true,
      deletedPentests,
      deletedReports,
      deletedStorage,
      cutoff: cutoff.toISOString(),
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
