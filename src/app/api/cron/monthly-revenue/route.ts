import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { initializeAdmin, adminDb } from "@/lib/firebase/firebaseAdmin";
import { getStripeServerSide } from "@/lib/stripe/getStripeServerSide";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

initializeAdmin();

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

const HERMES_WEBHOOK_URL =
  "https://hooks.vulnscanners.com/webhooks/ap-monthly-revenue";

async function stripeRevenueBetween(startSec: number, endSec: number) {
  let salesCents = 0;
  let salesCount = 0;
  let startingAfter: string | undefined;
  const checkouts: Array<{ userEmail: string; amount: number }> = [];
  const stripe = await getStripeServerSide();

  try {
    while (true) {
      const page = await stripe.checkout.sessions.list({
        limit: 100,
        created: { gte: startSec, lt: endSec },
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const s of page.data) {
        if (s.payment_status !== "paid") continue;
        const amount = s.amount_total || 0;
        if (amount <= 0) continue;
        salesCents += amount;
        salesCount += 1;
        checkouts.push({
          userEmail:
            s.customer_email ||
            s.customer_details?.email ||
            s.metadata?.userEmail ||
            "Unknown",
          amount,
        });
      }
      if (!page.has_more || page.data.length === 0) break;
      startingAfter = page.data[page.data.length - 1].id;
    }
  } catch (err) {
    console.error("Stripe monthly revenue aggregation failed:", err);
    return { salesCents: 0, salesCount: 0, checkouts: [], unavailable: true };
  }

  return { salesCents, salesCount, checkouts, unavailable: false };
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
  try {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const startSec = Math.floor(Date.UTC(year, month, 1) / 1000);
    const endSec = Math.floor(Date.UTC(year, month + 1, 1) / 1000);
    const monthLabel = `${year}-${String(month + 1).padStart(2, "0")}`;

    console.log(`Reporting AP revenue for ${monthLabel}`);

    const { salesCents, salesCount, checkouts, unavailable } =
      await stripeRevenueBetween(startSec, endSec);

    const payload = {
      event_type: "monthly_revenue",
      brand: "AP",
      month: monthLabel,
      total_revenue_cents: salesCents,
      total_revenue: salesCents / 100,
      transaction_count: salesCount,
      breakdown: checkouts,
    };

    // Log to Firestore
    try {
      await adminDb
        .collection("_cron_logs")
        .doc(`monthly-revenue-${monthLabel}`)
        .set({
          ...payload,
          reportedAt: FieldValue.serverTimestamp(),
        });
    } catch (logErr) {
      console.error("Firestore log failed:", logErr);
    }

    // POST to Hermes
    const webhookResp = await fetch(HERMES_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GitHub-Event": "monthly_revenue",
      },
      body: JSON.stringify(payload),
    });

    if (!webhookResp.ok) {
      console.error(`Hermes webhook returned ${webhookResp.status}`);
      return NextResponse.json(
        { error: "Webhook failed", status: webhookResp.status },
        { status: 500 },
      );
    }

    const result = await webhookResp.text();
    console.log(`Hermes webhook accepted: ${result}`);

    return NextResponse.json({
      success: true,
      month: monthLabel,
      total_revenue_cents: salesCents,
      transaction_count: salesCount,
      webhook_response: result,
    });
  } catch (error: any) {
    console.error("Monthly revenue cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
