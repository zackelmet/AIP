import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verifyAuth";
import { adminAuth } from "@/lib/firebase/firebaseAdmin";
import { sendVerificationEmail as sendBrandedVerification } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

/**
 * Sends a branded verification link via Resend. Auth = caller's Firebase token
 * (ID token during signup, session cookie afterwards).
 */
export async function POST(request: NextRequest) {
  try {
    const token = await verifyAuth(request, { allowUnverified: true });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await adminAuth.getUser(token.uid);
    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }
    if (!user.email) {
      return NextResponse.json(
        { error: "No email on account" },
        { status: 400 },
      );
    }

    const site =
      process.env.NEXT_PUBLIC_SITE_URL || "https://ai.affordablepentesting.com";
    const url = await adminAuth.generateEmailVerificationLink(user.email, {
      url: `${site}/app/dashboard`,
    });

    const sent = await sendBrandedVerification({ to: user.email, url });
    if (!sent) {
      return NextResponse.json(
        { error: "Email delivery unavailable" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("send-verification error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
