import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/firebaseAdmin";

export const runtime = "nodejs";

const clamp = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/**
 * Public review-funnel submission. No auth — the link is emailed to clients
 * after their report is delivered. Stored in the `feedback` collection.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const rating = Number(body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "A rating between 1 and 5 is required." },
        { status: 400 },
      );
    }

    const permissionToPublish = body?.permissionToPublish === true;

    const doc = {
      rating,
      comment: clamp(body?.comment, 4000),
      // Testimonial (only meaningful on the happy path)
      name: clamp(body?.name, 200),
      company: clamp(body?.company, 200),
      role: clamp(body?.role, 200),
      quote: clamp(body?.quote, 2000),
      permissionToPublish,
      // Attribution context passed from the email link
      email: clamp(body?.email, 320),
      target: clamp(body?.target, 500),
      type: clamp(body?.type, 80),
      source: "rate-us",
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection("feedback").add(doc);
    return NextResponse.json({ status: "success", id: ref.id });
  } catch (error) {
    console.error("Feedback submission failed:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback." },
      { status: 500 },
    );
  }
}
