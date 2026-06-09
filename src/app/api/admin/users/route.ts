import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { verifyAdmin } from "@/lib/auth/verifyAuth";

const admin = initializeAdmin();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = await verifyAdmin(request);
    if (!token) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestedLimit = Number(
      request.nextUrl.searchParams.get("limit") || "50",
    );
    const limit = Math.min(
      Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 50, 1),
      200,
    );

    const usersSnap = await admin
      .firestore()
      .collection("users")
      .orderBy("email")
      .limit(limit)
      .get();

    const uids = usersSnap.docs.map((doc) => doc.id);

    // Aggregate pentest count + most recent launch per user. Firestore "in"
    // supports up to 30 values, so chunk the uids and read only the fields we
    // need. createdAt is a Firestore Timestamp.
    const pentestStats = new Map<
      string,
      { count: number; lastPentestAt: string | null }
    >();

    for (let i = 0; i < uids.length; i += 30) {
      const chunk = uids.slice(i, i + 30);
      if (chunk.length === 0) continue;
      const pentestsSnap = await admin
        .firestore()
        .collection("pentests")
        .where("userId", "in", chunk)
        .select("userId", "createdAt")
        .get();

      pentestsSnap.docs.forEach((p) => {
        const pdata = p.data();
        const ownerId: string | undefined = pdata.userId;
        if (!ownerId) return;
        const createdAt: string | null =
          pdata.createdAt?.toDate?.()?.toISOString() ?? null;
        const existing = pentestStats.get(ownerId) ?? {
          count: 0,
          lastPentestAt: null,
        };
        existing.count += 1;
        if (
          createdAt &&
          (!existing.lastPentestAt || createdAt > existing.lastPentestAt)
        ) {
          existing.lastPentestAt = createdAt;
        }
        pentestStats.set(ownerId, existing);
      });
    }

    const users = usersSnap.docs.map((doc) => {
      const data = doc.data();
      const stats = pentestStats.get(doc.id);
      return {
        uid: doc.id,
        email: data.email ?? "Unknown",
        name: data.name ?? null,
        isAdmin: data.isAdmin === true,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        pentestCount: stats?.count ?? 0,
        lastPentestAt: stats?.lastPentestAt ?? null,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("admin users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
