import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FREE_PROVIDERS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com",
  "hotmail.co.uk", "outlook.com", "live.com", "msn.com", "aol.com",
  "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com",
  "pm.me", "gmx.com", "mail.com", "zoho.com", "yandex.com",
  "tutanota.com", "fastmail.com", "hey.com", "comcast.net",
  "verizon.net", "att.net", "qq.com", "163.com", "naver.com",
]);

function leadDocId(email: string): string {
  return email.replace(/[^a-z0-9._-]/gi, "_").slice(0, 256);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawEmail = (body as { email?: unknown })?.email;
  if (typeof rawEmail !== "string" || !EMAIL_RE.test(rawEmail.trim())) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const email = rawEmail.trim().toLowerCase();
  const domain = email.slice(email.lastIndexOf("@") + 1);

  if (FREE_PROVIDERS.has(domain)) {
    return NextResponse.json(
      { error: "Please use your work email — free mailboxes (Gmail, Outlook, etc.) aren't accepted." },
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
      { error: "Email delivery is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const pdfPath = path.join(process.cwd(), "public/templates/AIP Sample Report - WebApp Pentest.docx.pdf");
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = fs.readFileSync(pdfPath);
  } catch {
    return NextResponse.json({ error: "Report file not found." }, { status: 500 });
  }

  const resend = new Resend(resendApiKey);
  const from = process.env.EMAIL_FROM || "Affordable Pentesting <noreply@affordablepentesting.com>";

  try {
    const sent = await resend.emails.send({
      from,
      to: email,
      subject: "Your AI Pentest Sample Report from Affordable Pentesting",
      html: `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr><td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr><td style="padding-bottom:24px;">
            <span style="font-size:17px;font-weight:700;color:#0a141f;">Affordable Pentesting</span>
          </td></tr>
          <tr><td style="background:#0f1f2e;border:1px solid #1d3140;border-radius:14px;padding:36px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding-bottom:6px;">
                <span style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#34D399;">Affordable Pentesting</span>
              </td></tr>
              <tr><td style="font-size:22px;font-weight:700;color:#e8f1f0;padding-bottom:14px;">Your sample report is ready</td></tr>
              <tr><td style="font-size:14px;line-height:1.7;color:#8aa0a4;padding-bottom:20px;">
                Here is a full AI-powered penetration test report — executive summary, severity breakdown, and detailed findings with remediation guidance.
              </td></tr>
              <tr><td style="padding-top:8px;">
                <a href="https://ai.affordablepentesting.com" style="display:inline-block;background:#34D399;color:#04231a;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:8px;">Launch your first pentest</a>
              </td></tr>
              <tr><td style="padding:20px 0 0;font-size:13px;color:#8aa0a4;">
                Ready to test your own targets? Sign up and launch your first AI pentest in minutes.
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:24px 8px 0;font-size:12px;color:#5f7178;">
            Affordable Pentesting &middot; Professional penetration testing
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
      attachments: [
        {
          filename: "AIP Sample Pentest Report.pdf",
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    console.log(`[sample-report] sent to ${email} — resend id: ${"data" in sent && sent.data ? sent.data.id : "unknown"}`);
  } catch (err) {
    console.error("Failed to send sample report email:", err);
    return NextResponse.json({ error: "We couldn't send the report. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}