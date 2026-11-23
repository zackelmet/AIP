import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  initializeAdmin,
  adminDb,
  adminStorage,
} from "@/lib/firebase/firebaseAdmin";

export const dynamic = "force-dynamic";

const RETENTION_DAYS = 90;
const CUTOFF_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET || "";
  if (!expected) return false;
  const provided =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  return !!provided && safeEqual(provided, expected);
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";

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

      if (dryRun) {
        deletedPentests++;
        continue;
      }

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
          const [files] = await bucket.getFiles({
            prefix: `reports/${data.userId || "unknown"}/`,
          });
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

    if (!dryRun) {
      console.log(
        `[cleanup] deleted pentests=${deletedPentests} reports=${deletedReports} storage=${deletedStorage} cutoff=${cutoff.toISOString()}`,
      );
    }

    return NextResponse.json({
      success: true,
      dryRun,
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
