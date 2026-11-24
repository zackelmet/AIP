import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  sendWeeklySignupsDigest,
  WeeklySignupRow,
  WeeklyTestRow,
  WeeklyCreditPurchaseRow,
} from "@/lib/email/resend";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CREDIT_LABELS: Record<string, string> = {
  web_app: "Web Application",
  external_ip: "External IP",
  pentest_plus: "Pentest+",
};

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function authorized(request: NextRequest): boolean {
  const expected =
    process.env.CRON_SECRET || process.env.PENTEST_WEBHOOK_SECRET || "";
  if (!expected) return false;
  const provided =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  return !!provided && safeEqual(provided, expected);
}

function weekRange(now: Date) {
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  const weekEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday,
    ),
  );
  const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);
  return { weekStart, weekEnd };
}

function fmtDay(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function creditLabel(type: unknown): string {
  const key = String(type || "");
  return CREDIT_LABELS[key] || key || "—";
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function buildDigest(weekStart: Date, weekEnd: Date) {
  const snap = await adminDb
    .collection("users")
    .where("createdAt", ">=", weekStart)
    .where("createdAt", "<", weekEnd)
    .get();

  const docs = snap.docs
    .map((d) => ({ id: d.id, data: d.data() }))
    .sort((a, b) => {
      const ta = a.data.createdAt?.toMillis?.() || 0;
      const tb = b.data.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });

  const prevStart = new Date(weekStart.getTime() - 7 * 86400000);
  const [prevSnap, testsSnap, purchasesSnap] = await Promise.all([
    adminDb
      .collection("users")
      .where("createdAt", ">=", prevStart)
      .where("createdAt", "<", weekStart)
      .count()
      .get(),
    adminDb
      .collection("pentests")
      .where("createdAt", ">=", weekStart)
      .where("createdAt", "<", weekEnd)
      .get(),
    adminDb
      .collection("stripeEvents")
      .where("processedAt", ">=", weekStart)
      .where("processedAt", "<", weekEnd)
      .get(),
  ]);

  const userInfo = new Map<string, { email: string; isAdmin: boolean }>();
  for (const { id, data } of docs) {
    userInfo.set(id, {
      email: String(data.email || ""),
      isAdmin: data.isAdmin === true,
    });
  }

  const extraIds = new Set<string>();
  for (const d of testsSnap.docs) {
    const uid = String(d.data().userId || "");
    if (uid && !userInfo.has(uid)) extraIds.add(uid);
  }
  for (const d of purchasesSnap.docs) {
    const uid = String(d.data().userId || "");
    if (uid && !userInfo.has(uid)) extraIds.add(uid);
  }
  for (const group of chunk(Array.from(extraIds), 300)) {
    const snaps = await adminDb.getAll(
      ...group.map((id) => adminDb.collection("users").doc(id)),
    );
    for (const s of snaps) {
      if (!s.exists) continue;
      const data = s.data() || {};
      userInfo.set(s.id, {
        email: String(data.email || ""),
        isAdmin: data.isAdmin === true,
      });
    }
  }

  const testDocs = testsSnap.docs
    .filter((d) => !userInfo.get(String(d.data().userId || ""))?.isAdmin)
    .sort((a, b) => {
      const ta = a.data().createdAt?.toMillis?.() || 0;
      const tb = b.data().createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
  const launchedIds = new Set(
    testDocs.map((d) => String(d.data().userId || "")).filter(Boolean),
  );

  const tests: WeeklyTestRow[] = testDocs.map((d) => {
    const data = d.data();
    const created = data.createdAt?.toDate?.() as Date | undefined;
    const uid = String(data.userId || "");
    return {
      email: userInfo.get(uid)?.email || String(data.userEmail || "Unknown"),
      target: String(
        data.targetUrl || data.targets?.[0] || data.targetOrg || "—",
      ),
      type: creditLabel(data.type),
      launchedAt: created ? fmtDay(created) : "—",
    };
  });

  const purchaseDocs = purchasesSnap.docs
    .filter((d) => !userInfo.get(String(d.data().userId || ""))?.isAdmin)
    .sort((a, b) => {
      const ta = a.data().processedAt?.toMillis?.() || 0;
      const tb = b.data().processedAt?.toMillis?.() || 0;
      return tb - ta;
    });
  const purchases: WeeklyCreditPurchaseRow[] = purchaseDocs.map((d) => {
    const data = d.data();
    const processed = data.processedAt?.toDate?.() as Date | undefined;
    const uid = String(data.userId || "");
    return {
      email: userInfo.get(uid)?.email || "Unknown",
      credits: Math.max(1, Number(data.quantity) || 1),
      type: creditLabel(data.pentestType),
      purchasedAt: processed ? fmtDay(processed) : "—",
    };
  });

  const days = DAY_LABELS.map((label) => ({ label, count: 0 }));
  const users: WeeklySignupRow[] = docs.map(({ id, data }) => {
    const created = data.createdAt?.toDate?.() as Date | undefined;
    if (created) {
      const idx = (created.getUTCDay() + 6) % 7;
      days[idx].count += 1;
    }
    return {
      email: String(data.email || id),
      name: data.name || data.displayName || null,
      signedUp: created ? fmtDay(created) : "—",
      launched: launchedIds.has(id),
    };
  });

  return {
    total: docs.length,
    previousTotal: prevSnap.data().count,
    weekLabel: `${fmtDay(weekStart)} – ${fmtDay(new Date(weekEnd.getTime() - 86400000))}`,
    days,
    users,
    tests,
    purchases,
  };
}

async function handle(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const { weekStart, weekEnd } = weekRange(now);
    const digest = await buildDigest(weekStart, weekEnd);

    if (request.nextUrl.searchParams.get("dryRun") === "1") {
      return NextResponse.json({
        dryRun: true,
        weekStart: isoDate(weekStart),
        ...digest,
      });
    }

    if (
      digest.total === 0 &&
      digest.tests.length === 0 &&
      digest.purchases.length === 0
    ) {
      return NextResponse.json({
        sent: false,
        reason: "no_activity",
        weekStart: isoDate(weekStart),
      });
    }

    const markerRef = adminDb
      .collection("digests")
      .doc(`signups_${isoDate(weekStart)}`);
    if ((await markerRef.get()).exists) {
      return NextResponse.json({
        sent: false,
        reason: "already_sent",
        weekStart: isoDate(weekStart),
      });
    }

    const sent = await sendWeeklySignupsDigest(digest);
    if (!sent) {
      return NextResponse.json(
        { sent: false, error: "email_failed" },
        { status: 502 },
      );
    }

    await markerRef.set({
      type: "signup-digest",
      weekStart,
      total: digest.total,
      sentAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      sent: true,
      weekStart: isoDate(weekStart),
      total: digest.total,
    });
  } catch (error: any) {
    console.error("signup-digest failed:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
