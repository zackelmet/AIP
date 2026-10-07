import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { verifyAuth } from "@/lib/auth/verifyAuth";
import { Resend } from "resend";

const FROM =
  process.env.EMAIL_FROM || "Affordable Pentesting <noreply@affordablepentesting.com>";

export async function POST(request: NextRequest) {
  try {
    const token = await verifyAuth(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = token.uid;
    const email = token.email || "";

    const admin = initializeAdmin();

    const userRecord = await admin.auth().getUser(uid);
    if (userRecord.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    const link = await admin.auth().generateEmailVerificationLink(email);

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: "Verify your email — Affordable Pentesting",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#0a141f;">Verify your email</h2>
<p style="color:#374151;">Click the link below to verify your email and start launching pentests.</p>
          <a href="${link}" style="display:inline-block;background:#34D399;color:#041018;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Verify Email</a>
          <p style="color:#6b7280;font-size:12px;">Or paste this link into your browser: ${link}</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("resend-verification error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}