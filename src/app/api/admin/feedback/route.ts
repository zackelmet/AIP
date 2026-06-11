import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verifyAuth";
import { adminDb } from "@/lib/firebase/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = await verifyAdmin(request);
  if (!token) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const snapshot = await adminDb
      .collection("feedback")
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();

    const items = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        rating: d.rating ?? null,
        comment: d.comment ?? "",
        name: d.name ?? "",
        company: d.company ?? "",
        role: d.role ?? "",
        quote: d.quote ?? "",
        permissionToPublish: d.permissionToPublish === true,
        email: d.email ?? "",
        target: d.target ?? "",
        type: d.type ?? "",
        source: d.source ?? "",
        status: d.status ?? "",
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to load feedback:", error);
    return NextResponse.json(
      { error: "Failed to load feedback." },
      { status: 500 },
    );
  }
}
