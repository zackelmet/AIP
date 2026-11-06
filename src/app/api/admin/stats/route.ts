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

    const db = admin.firestore();
    const usersRef = db.collection("users");
    const pentestsRef = db.collection("pentests");

    const [totalUsersSnap, completedPentestsSnap] = await Promise.all([
      usersRef.count().get(),
      pentestsRef.where("status", "==", "completed").count().get(),
    ]);

    const totalUsers = totalUsersSnap.data().count;
    const completedPentests = completedPentestsSnap.data().count;

    let revenueYTDCents = 0;
    let revenueCountYTD = 0;

    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2023-10-16",
      });

      const ytdStart = Math.floor(
        new Date(`${now.getFullYear()}-01-01T00:00:00Z`).getTime() / 1000,
      );

      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const sessions = await stripe.checkout.sessions.list({
          limit: 100,
          created: { gte: ytdStart },
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });

        sessions.data.forEach((session) => {
          const amount = session.amount_total ?? 0;
          const isPaid = session.payment_status === "paid";
          if (isPaid && amount > 0) {
            revenueCountYTD += 1;
            revenueYTDCents += amount;
          }
        });

        hasMore = sessions.has_more;
        startingAfter = sessions.data.length
          ? sessions.data[sessions.data.length - 1].id
          : undefined;
      }
    }

    return NextResponse.json({
      totalUsers,
      completedPentests,
      revenueYTDCents,
      revenueCountYTD,
      revenueUnavailable: !process.env.STRIPE_SECRET_KEY,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
