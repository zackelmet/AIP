import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { addToAudience } from "@/lib/email/audience";
import { rateLimitDistributed } from "@/lib/security/distributedRateLimit";
import { sendSampleReportEmail } from "@/lib/email/resend";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FREE_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "tutanota.com",
  "fastmail.com",
  "hey.com",
  "comcast.net",
  "verizon.net",
  "att.net",
  "qq.com",
  "163.com",
  "naver.com",
]);

function leadDocId(email: string): string {
  return email.replace(/[^a-z0-9._-]/gi, "_").slice(0, 256);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const rawEmail = (body as { email?: unknown })?.email;
  if (typeof rawEmail !== "string" || !EMAIL_RE.test(rawEmail.trim())) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const email = rawEmail.trim().toLowerCase();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const [perMin, perHour, perEmail] = await Promise.all([
    rateLimitDistributed(`sample-report:min:${ip}`, 5, 60_000),
    rateLimitDistributed(`sample-report:hour:${ip}`, 20, 3_600_000),
    rateLimitDistributed(`sample-report:email:${email}`, 3, 3_600_000),
  ]);
  if (!perMin.ok || !perHour.ok || !perEmail.ok) {
    return NextResponse.json(
      { error: "Too many sample-report requests. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(
              perMin.retryAfterSec,
              perHour.retryAfterSec,
              perEmail.retryAfterSec,
            ),
          ),
        },
      },
    );
  }
  const domain = email.slice(email.lastIndexOf("@") + 1);

  if (FREE_PROVIDERS.has(domain)) {
    return NextResponse.json(
      {
        error:
          "Please use your work email — free mailboxes (Gmail, Outlook, etc.) aren't accepted.",
      },
      { status: 400 },
    );
  }

  try {
    await adminDb
      .collection("sampleReportLeads")
      .doc(leadDocId(email))
      .set(
        {
          email,
          source: "landing-sample-report",
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
          userAgent: req.headers.get("user-agent") || null,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          requestCount: FieldValue.increment(1),
        },
        { merge: true },
      );
  } catch (err) {
    console.error("Failed to record sample-report lead:", err);
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json(
      {
        error:
          "Email delivery is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  const pdfPath = path.join(
    process.cwd(),
    "public/templates/AIP Sample Report - WebApp Pentest.docx.pdf",
  );
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = fs.readFileSync(pdfPath);
  } catch {
    return NextResponse.json(
      { error: "Report file not found." },
      { status: 500 },
    );
  }

  try {
    const resendId = await sendSampleReportEmail({
      to: email,
      pdfBase64: pdfBuffer.toString("base64"),
      filename: "AIP Sample Pentest Report.pdf",
    });

    console.log(
      `[sample-report] sent to ${email} — resend id: ${resendId || "unknown"}`,
    );

    // Push to Resend Broadcasts nurture audience (fire-and-forget)
    addToAudience("sample_report", {
      email,
      first_name: email.split("@")[0] || "",
      data: {
        source: "landing-sample-report",
        signed_up_at: new Date().toISOString(),
      },
    }).then((r) => {
      if (!r.ok)
        console.warn(
          `[audience] sample_report push failed for ${email}: ${r.error}`,
        );
    });
  } catch (err) {
    console.error("Failed to send sample report email:", err);
    return NextResponse.json(
      { error: "We couldn't send the report. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
