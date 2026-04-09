import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { verifyAdmin } from "@/lib/auth/verifyAuth";
import Stripe from "stripe";

const admin = initializeAdmin();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = await verifyAdmin(request);
    if (!token)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const now = new Date();
    const daysAgo = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      return date;
    };

    const db = admin.firestore();
    const usersRef = db.collection("users");
    const pentestsRef = db.collection("pentests");

    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(daysAgo(30));
    const sevenDaysAgo = admin.firestore.Timestamp.fromDate(daysAgo(6));

    const [
      totalUsersSnap,
      newUsers30dSnap,
      totalPentestsSnap,
      completedPentestsSnap,
      runningPentestsSnap,
      pendingPentestsSnap,
      failedPentestsSnap,
      recentPentestsSnap,
    ] = await Promise.all([
      usersRef.count().get(),
      usersRef.where("createdAt", ">=", thirtyDaysAgo).count().get(),
      pentestsRef.count().get(),
      pentestsRef.where("status", "==", "completed").count().get(),
      pentestsRef.where("status", "==", "running").count().get(),
      pentestsRef.where("status", "==", "pending").count().get(),
      pentestsRef.where("status", "==", "failed").count().get(),
      pentestsRef.where("createdAt", ">=", sevenDaysAgo).get(),
    ]);

    const totalUsers = totalUsersSnap.data().count;
    const newUsers30Days = newUsers30dSnap.data().count;
    const totalPentests = totalPentestsSnap.data().count;

    const pentestStatusCounts = {
      completed: completedPentestsSnap.data().count,
      running: runningPentestsSnap.data().count,
      pending: pendingPentestsSnap.data().count,
      failed: failedPentestsSnap.data().count,
    };

    const dayKeys = Array.from({ length: 7 }, (_, index) => {
      const date = daysAgo(6 - index);
      return date.toISOString().slice(0, 10);
    });

    const pentestsByDay = dayKeys.reduce<Record<string, number>>(
      (accumulator, key) => {
        accumulator[key] = 0;
        return accumulator;
      },
      {},
    );

    recentPentestsSnap.docs.forEach((doc) => {
      const createdAtDate = doc.data().createdAt?.toDate?.();
      if (!createdAtDate) return;
      const dayKey = createdAtDate.toISOString().slice(0, 10);
      if (dayKey in pentestsByDay) {
        pentestsByDay[dayKey] += 1;
      }
    });

    const pentestsLast7Days = dayKeys.map((dayKey) => {
      const date = new Date(dayKey + "T00:00:00.000Z");
      return {
        date: dayKey,
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        count: pentestsByDay[dayKey] ?? 0,
      };
    });

    let sales30DaysCents = 0;
    let salesCount30Days = 0;

    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2023-10-16",
      });

      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const sessions = await stripe.checkout.sessions.list({
          limit: 100,
          created: { gte: Math.floor(daysAgo(30).getTime() / 1000) },
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });

        sessions.data.forEach((session) => {
          const amount = session.amount_total ?? 0;
          const isPaid = session.payment_status === "paid";
          if (isPaid && amount > 0) {
            salesCount30Days += 1;
            sales30DaysCents += amount;
          }
        });

        hasMore = sessions.has_more;
        startingAfter = sessions.data.length
          ? sessions.data[sessions.data.length - 1].id
          : undefined;
      }
    }

    const averageOrderValueCents =
      salesCount30Days > 0
        ? Math.round(sales30DaysCents / salesCount30Days)
        : 0;

    return NextResponse.json({
      totalUsers,
      newUsers30Days,
      totalPentests,
      pentestStatusCounts,
      pentestsLast7Days,
      sales30DaysCents,
      salesCount30Days,
      averageOrderValueCents,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
