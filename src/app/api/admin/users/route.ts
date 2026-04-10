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

    const users = usersSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email ?? "Unknown",
        name: data.name ?? null,
        isAdmin: data.isAdmin === true,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
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
