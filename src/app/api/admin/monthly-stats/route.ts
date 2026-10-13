import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { verifyAdmin } from "@/lib/auth/verifyAuth";
import { getStripeServerSide } from "@/lib/stripe/getStripeServerSide";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const admin = initializeAdmin();

/**
 * Sum PAID Stripe checkout revenue in a time window. This is the actual money
 * taken (credits purchased), not pentest-attributed amountCents — that field is
 * stamped at launch and double-counts multi-IP jobs / mis-dates spend months.
 * Best-effort: on any Stripe failure we report unavailable so the UI can say "n/a"
 * instead of showing a misleading $0.
 */
async function stripeRevenueBetween(startSec: number, endSec: number) {
  let salesCents = 0;
  let salesCount = 0;
  let creditsPurchased = 0;
  let startingAfter: string | undefined;
  const stripe = await getStripeServerSide();

  try {
    // eslint-disable-next-line no-constant-condition
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
        try {
          const expanded = await stripe.checkout.sessions.retrieve(s.id, {
            expand: ["line_items"],
          });
          const qty =
            expanded.line_items?.data?.[0]?.quantity ||
            expanded.line_items?.data?.reduce((sum, li) => sum + (li.quantity || 0), 0) ||
            0;
          creditsPurchased += qty || 1;
        } catch {
          creditsPurchased += 1;
        }
      }
      if (!page.has_more || page.data.length === 0) break;
      startingAfter = page.data[page.data.length - 1].id;
    }
  } catch (err) {
    console.error("Stripe monthly revenue aggregation failed:", err);
    return { salesCents: 0, salesCount: 0, creditsPurchased: 0, unavailable: true };
  }

  return { salesCents, salesCount, creditsPurchased, unavailable: false };
}

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

    // Internal pentests (launched by admin users, e.g. zack/connor) are
    // excluded from analytics so metrics reflect real customers only.
    // Fetch user docs to resolve emails + admin users.
    const userIds = Array.from(new Set(
      pentestsSnap.docs.map(d => d.data().userId as string).filter(Boolean),
    ));
    const emailByUid: Record<string, string> = {};
    const adminUids = new Set<string>();
    if (userIds.length > 0) {
      const userRefs = userIds.map(id => db.collection("users").doc(id));
      const userDocs = await db.getAll(...userRefs);
      userDocs.forEach(ud => {
        if (ud.exists) {
          const data = ud.data();
          if (data?.isAdmin === true) adminUids.add(ud.id);
          emailByUid[ud.id] = data?.email || "";
        }
      });
    }

    const pentests = pentestsSnap.docs
      .filter(doc => !adminUids.has(doc.data().userId))
      .map(doc => {
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

    const newPentestsThisMonth = pentests.length;

    // Revenue = actual paid checkouts (credits purchased) in this month.
    const rangeSec = {
      startSec: Math.floor(new Date(year, month - 1, 1).getTime() / 1000),
      endSec: Math.floor(new Date(year, month, 1).getTime() / 1000),
    };
    const revenue = await stripeRevenueBetween(rangeSec.startSec, rangeSec.endSec);

    return NextResponse.json({
      year,
      month,
      newUsersThisMonth,
      newPentestsThisMonth,
      revenueThisMonthCents: revenue.salesCents,
      purchasesThisMonth: revenue.salesCount,
      creditsPurchasedThisMonth: revenue.creditsPurchased,
      revenueUnavailable: revenue.unavailable,
      pentests,
    });
  } catch (error: any) {
    console.error("monthly-stats error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}