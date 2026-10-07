import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { verifyAdmin } from "@/lib/auth/verifyAuth";
import { getStripeServerSide } from "@/lib/stripe/getStripeServerSide";

export const dynamic = "force-dynamic";

const admin = initializeAdmin();

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return {
    startTs: admin.firestore.Timestamp.fromDate(start),
    endTs: admin.firestore.Timestamp.fromDate(end),
    startIso: start.toISOString().slice(0, 10),
    endIso: end.toISOString().slice(0, 10),
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = await verifyAdmin(request);
    if (!token) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    const param = request.nextUrl.searchParams.get("month");
    if (param) {
      const parts = param.split("-");
      year = Number(parts[0]);
      month = Number(parts[1]);
      if (month < 1 || month > 12) {
        return NextResponse.json({ error: "Invalid month" }, { status: 400 });
      }
    }

    const range = monthRange(year, month);
    const db = admin.firestore();

    // New users this month
    const newUsersSnap = await db
      .collection("users")
      .where("createdAt", ">=", range.startTs)
      .where("createdAt", "<", range.endTs)
      .get();
    const newUsersThisMonth = newUsersSnap.docs.length;

    // New pentests this month (+ fetch details for table)
    const pentestsSnap = await db
      .collection("pentests")
      .where("createdAt", ">=", range.startTs)
      .where("createdAt", "<", range.endTs)
      .orderBy("createdAt", "desc")
      .get();

    const newPentestsThisMonth = pentestsSnap.docs.length;

    // Fetch user emails for pentest table
    const userIds = Array.from(new Set(
      pentestsSnap.docs.map(d => d.data().userId as string).filter(Boolean),
    ));
    const emailByUid: Record<string, string> = {};
    if (userIds.length > 0) {
      const userRefs = userIds.map(id => db.collection("users").doc(id));
      const userDocs = await db.getAll(...userRefs);
      userDocs.forEach(ud => {
        if (ud.exists) emailByUid[ud.id] = ud.data()?.email || "";
      });
    }

    const pentests = pentestsSnap.docs.map(doc => {
      const d = doc.data();
      return {
        pentestId: doc.id,
        userEmail: emailByUid[d.userId] || d.userEmail || "Unknown",
        target: d.targetUrl || (d.targets?.[0] || "—"),
        targetOrg: d.targetOrg || null,
        type: d.type || "—",
        amountCents: d.amountCents || 0,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    // Revenue from pentest amountCents
    const revenueThisMonthCents = pentests.reduce((sum, p) => sum + (p.amountCents || 0), 0);

    return NextResponse.json({
      year,
      month,
      newUsersThisMonth,
      newPentestsThisMonth,
      revenueThisMonthCents,
      pentests,
    });
  } catch (error: any) {
    console.error("monthly-stats error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}