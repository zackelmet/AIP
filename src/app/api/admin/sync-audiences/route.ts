import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { verifyAdmin } from "@/lib/auth/verifyAuth";
import { addToAudience } from "@/lib/email/audience";

export const dynamic = "force-dynamic";

const admin = initializeAdmin();

export async function POST(request: NextRequest) {
  try {
    const token = await verifyAdmin(request);
    if (!token) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const db = admin.firestore();
    const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago (buffer)

    // Find users created >25h ago
    const usersSnap = await db
      .collection("users")
      .orderBy("createdAt", "asc")
      .get();

    let pushed = 0;
    let skipped = 0;

    for (const doc of usersSnap.docs) {
      const u = doc.data();
      if (!u.email) continue;

      const createdAt = u.createdAt?.toDate?.();
      if (!createdAt || createdAt > cutoff) continue;

      // Already pushed? (tracked via custom field on user doc to avoid re-pushes)
      if (u._audienceNoLaunchPushedAt) continue;

      // Check if user has any pentests
      const pentestsSnap = await db
        .collection("pentests")
        .where("userId", "==", doc.id)
        .limit(1)
        .get();

      if (pentestsSnap.docs.length > 0) {
        skipped++;
        continue; // has launched, skip
      }

      // Push to the no-launch nurture audience
      const result = await addToAudience("no_launch", {
        email: u.email,
        first_name: u.name?.split(" ")[0] || u.email.split("@")[0],
        data: { signed_up_at: createdAt.toISOString() },
      });

      if (result.ok) {
        await doc.ref.update({
          _audienceNoLaunchPushedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        pushed++;
      } else {
        console.warn(`[sync-audiences] failed to push ${u.email}: ${result.error}`);
      }
    }

    return NextResponse.json({
      ok: true,
      checked: usersSnap.docs.length,
      pushedNoLaunchAudience: pushed,
      skippedHasLaunched: skipped,
    });
  } catch (error: any) {
    console.error("[sync-audiences] error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}