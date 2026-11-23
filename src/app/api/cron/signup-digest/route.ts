import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendWeeklySignupsDigest, WeeklySignupRow } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const prevSnap = await adminDb
    .collection("users")
    .where("createdAt", ">=", prevStart)
    .where("createdAt", "<", weekStart)
    .count()
    .get();

  const launchSnap = await adminDb
    .collection("pentests")
    .where("createdAt", ">=", weekStart)
    .where("createdAt", "<", new Date())
    .select("userId")
    .get();
  const launchedIds = new Set(
    launchSnap.docs.map((d) => d.data().userId as string),
  );

  const days = DAY_LABELS.map((label) => ({ label, count: 0 }));
  const users: WeeklySignupRow[] = docs.map(({ id, data }) => {
    const created = data.createdAt?.toDate?.() as Date | undefined;
    if (created) {
      const idx = (created.getUTCDay() + 6) % 7;
      days[idx].count += 1;
    }
    const web = data.credits?.web_app || 0;
    const ip = data.credits?.external_ip || 0;
    return {
      email: String(data.email || id),
      name: data.name || data.displayName || null,
      meta: `web ${web} · ip ${ip}`,
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

    if (digest.total === 0) {
      return NextResponse.json({
        sent: false,
        reason: "no_signups",
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
