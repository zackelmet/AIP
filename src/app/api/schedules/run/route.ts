import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue, Transaction } from "firebase-admin/firestore";
import { dispatchPentest } from "@/lib/pentests/dispatch";
import { sendPentestLaunchedEmails } from "@/lib/email/resend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

type RunResult = {
  scheduleId: string;
  status: string;
  pentestId?: string;
  pentestIds?: string[];
  error?: string;
};

/**
 * Fires all active schedules whose nextRunAt ≤ now.
 *
 * Each schedule is claimed inside a transaction (advance nextRunAt + deduct
 * credits + create pentests) so a cron retry or overlapping invocation cannot
 * double-charge. Jobs are created as `pending_dispatch` and then sent to the
 * Strix runner; anything the runner rejects stays queued for admin dispatch.
 */
async function collectDueSchedules() {
  const now = new Date();
  // Single-field query (no composite index needed); filter the due time in code.
  const activeSnap = await adminDb
    .collection("schedules")
    .where("status", "==", "active")
    .limit(200)
    .get();

  return activeSnap.docs.filter((d) => {
    const t = d.data().nextRunAt;
    const ms = t?.toMillis?.() ?? (t ? new Date(t).getTime() : 0);
    return ms > 0 && ms <= now.getTime();
  });
}

async function runDueSchedules(): Promise<{
  processed: number;
  results: RunResult[];
}> {
  const due = await collectDueSchedules();
  const results: RunResult[] = [];

  for (const scheduleDoc of due) {
    const scheduleRef = scheduleDoc.ref;
    const scheduleId = scheduleDoc.id;
    let schedule: any = scheduleDoc.data();
    let launchedIds: string[] = [];
    let targets: string[] = [];
    let creditsNeeded = 0;

    try {
      const targetsRaw =
        schedule.type === "external_ip"
          ? String(schedule.targetUrl || "")
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean)
          : [schedule.targetUrl];

      if (targetsRaw.length === 0) throw new Error("invalid_targets");
      targets = targetsRaw;
      creditsNeeded = targets.length;

      const userRef = adminDb.collection("users").doc(schedule.userId);
      const pentestRefs = targets.map(() =>
        adminDb.collection("pentests").doc(),
      );
      const claimTime = new Date();

      await adminDb.runTransaction(async (tx: Transaction) => {
        const fresh = await tx.get(scheduleRef);
        if (!fresh.exists) throw new Error("not_found");

        const s = fresh.data()!;
        const nextMs =
          s.nextRunAt?.toMillis?.() ??
          (s.nextRunAt ? new Date(s.nextRunAt).getTime() : 0);
        if (s.status !== "active" || nextMs > claimTime.getTime()) {
          throw new Error("not_due");
        }
        schedule = s;

        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw new Error("user_not_found");

        const creditType =
          s.type === "web_app"
            ? "web_app"
            : s.type === "pentest_plus"
              ? "pentest_plus"
              : "external_ip";
        const available = userSnap.data()?.credits?.[creditType] || 0;
        if (available < creditsNeeded) throw new Error("no_credits");

        tx.update(userRef, {
          [`credits.${creditType}`]: FieldValue.increment(-creditsNeeded),
          updatedAt: FieldValue.serverTimestamp(),
        });

        const intervalDays = Number(s.intervalDays) || 30;
        pentestRefs.forEach((ref, index) => {
          tx.set(ref, {
            id: ref.id,
            userId: s.userId,
            type: s.type,
            targetUrl: targets[index],
            userRoles: s.userRoles || null,
            endpoints: s.endpoints || null,
            additionalContext: s.additionalContext || null,
            status: "pending_dispatch",
            billingMode: "credits",
            billableIps: 1,
            budget: 8,
            scanMode: "deep",
            authMode: "blackbox",
            scheduledBy: scheduleId,
            scheduledTargetIndex: index,
            scheduledTargetCount: targets.length,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            results: null,
            vulnerabilities: [],
            completedAt: null,
          });
        });

        tx.update(scheduleRef, {
          nextRunAt: new Date(claimTime.getTime() + intervalDays * 86400000),
          lastRunAt: claimTime,
          totalRuns: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      launchedIds = pentestRefs.map((r) => r.id);

      // Dispatch after commit; failures stay pending_dispatch for admin retry.
      let dispatched = 0;
      for (let i = 0; i < launchedIds.length; i += 1) {
        const r = await dispatchPentest(
          launchedIds[i],
          {
            targetUrl: targets[i],
            type: schedule.type,
            userRoles: schedule.userRoles || null,
            roles: schedule.roles || [],
            endpoints: schedule.endpoints || null,
            targetOrg: schedule.targetOrg || null,
            authMode: "blackbox",
            budget: 8,
            scanMode: "deep",
            additionalContext: schedule.additionalContext || null,
          },
          "scheduled",
        );
        if (r.ok) dispatched += 1;
        else
          console.error(
            `scheduled dispatch failed for ${launchedIds[i]}:`,
            r.reason,
          );
      }

      await scheduleRef.collection("runs").add({
        scheduleId,
        pentestId: launchedIds[0] || null,
        pentestIds: launchedIds,
        status: dispatched > 0 ? "launched" : "pending_dispatch",
        ranAt: FieldValue.serverTimestamp(),
        creditDeducted: true,
        creditsUsed: creditsNeeded,
        targetCount: targets.length,
        dispatchedCount: dispatched,
      });

      if (dispatched > 0) {
        const userSnap = await userRef.get();
        await sendPentestLaunchedEmails({
          userEmail: (userSnap.data()?.email as string) || null,
          target: targets.join(", "),
          type: schedule.type,
          pentestId: launchedIds[0],
        }).catch((e) => console.error("scheduled launch email failed:", e));
      }

      results.push({
        scheduleId,
        status: "launched",
        pentestId: launchedIds[0],
        pentestIds: launchedIds,
      });
    } catch (err: any) {
      const msg = err?.message || "error";

      if (msg === "not_due" || msg === "not_found") {
        continue; // claimed by another invocation or deleted
      }

      if (msg === "no_credits") {
        await scheduleRef
          .collection("runs")
          .add({
            scheduleId,
            pentestId: null,
            status: "skipped_no_credits",
            ranAt: FieldValue.serverTimestamp(),
            creditDeducted: false,
          })
          .catch(() => {});
        await scheduleRef
          .update({
            status: "paused",
            updatedAt: FieldValue.serverTimestamp(),
          })
          .catch(() => {});
        results.push({ scheduleId, status: "skipped_no_credits" });
        continue;
      }

      console.error(`Schedule ${scheduleId} failed:`, err);
      await scheduleRef
        .collection("runs")
        .add({
          scheduleId,
          pentestId: null,
          status: "failed",
          error:
            msg === "invalid_targets" ? "Invalid or empty target list" : msg,
          ranAt: FieldValue.serverTimestamp(),
          creditDeducted: false,
        })
        .catch(() => {});
      results.push({ scheduleId, status: "error", error: msg });
    }
  }

  return { processed: results.length, results };
}

async function handle(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (request.nextUrl.searchParams.get("dryRun") === "1") {
      const due = await collectDueSchedules();
      return NextResponse.json({
        dryRun: true,
        dueCount: due.length,
        due: due.map((d) => ({
          id: d.id,
          userId: d.data().userId,
          targetUrl: d.data().targetUrl,
          type: d.data().type,
          nextRunAt: d.data().nextRunAt?.toDate?.()?.toISOString?.() || null,
        })),
      });
    }
    const { processed, results } = await runDueSchedules();
    return NextResponse.json({
      message: `Processed ${processed} schedule(s)`,
      processed,
      results,
    });
  } catch (error: any) {
    console.error("Cron schedule runner error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// Vercel Cron invokes schedules with GET.
export async function GET(request: NextRequest) {
  return handle(request);
}

// Manual triggers (and the documented API) use POST.
export async function POST(request: NextRequest) {
  return handle(request);
}
