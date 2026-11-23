import { Resend } from "resend";
import { AP_LOGO_PNG_BASE64 } from "./logo";

// Lazily construct the client so missing config never crashes module load /
// build. Returns null when no API key is configured.
let cachedClient: Resend | null = null;
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

const FROM =
  process.env.EMAIL_FROM ||
  "Affordable Pentesting <noreply@affordablepentesting.com>";
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "zack@msppentesting.com";
// Monitored mailbox for replies — the From address is no-reply by design.
const REPLY_TO = process.env.EMAIL_REPLY_TO || "zack@affordablepentesting.com";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ai.affordablepentesting.com";

// Inline the logo as a CID attachment so it renders without a hosted asset and
// survives image-blocking clients better than a remote URL.
const LOGO_CID = "ap-logo";
const logoAttachment = {
  filename: "affordable-pentesting.png",
  content: AP_LOGO_PNG_BASE64,
  contentId: LOGO_CID,
};

// Brand palette (mirrors tailwind.config.ts).
const COLORS = {
  bg: "#ffffff",
  headerText: "#0a141f",
  card: "#ffffff",
  border: "#e5e7eb",
  green: "#34D399",
  text: "#0a141f",
  muted: "#374151",
  faint: "#6b7280",
};

const TYPE_LABELS: Record<string, string> = {
  web_app: "Web Application",
  external_ip: "External IP",
  pentest_plus: "Pentest+",
};

interface ShellOptions {
  preheader: string;
  heading: string;
  intro: string;
  rows: Array<[string, string]>;
  cta?: { label: string; href: string };
  closing?: string;
  closingText?: string;
  // A lighter-weight secondary link rendered below the closing (e.g. "Rate us").
  secondaryCta?: {
    lead?: string;
    body?: string;
    label: string;
    href: string;
    prominent?: boolean;
  };
}

/**
 * Renders a branded, table-based HTML email. Table layout + inline styles keep
 * it consistent across Gmail, Outlook and Apple Mail.
 */
function renderEmail({
  preheader,
  heading,
  intro,
  rows,
  cta,
  closing,
  closingText,
  secondaryCta,
}: ShellOptions): string {
  const detailRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};font-size:13px;color:${COLORS.muted};width:140px;vertical-align:top;">${label}</td>
          <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};font-size:13px;color:${COLORS.text};font-weight:600;vertical-align:top;">${value}</td>
        </tr>`,
    )
    .join("");

  const ctaBlock = cta
    ? `
      <tr>
        <td style="padding:28px 0 4px;">
          <a href="${cta.href}" style="display:inline-block;background:${COLORS.green};color:#04231a;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.2px;padding:13px 28px;border-radius:8px;">${cta.label}</a>
        </td>
      </tr>`
    : "";

  const closingBlock = closing
    ? `
      <tr>
        <td style="padding:20px 0 0;font-size:13px;line-height:1.7;color:${COLORS.muted};">${closing}</td>
      </tr>`
    : "";

  const secondaryBlock = secondaryCta
    ? secondaryCta.prominent
      ? `
      <tr>
        <td style="padding:26px 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLORS.border};">
            <tr><td style="padding:22px 0 0;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${COLORS.faint};">Your feedback</p>
              ${secondaryCta.lead ? `<p style="margin:0 0 6px;font-size:17px;font-weight:600;color:${COLORS.text};line-height:1.35;">${secondaryCta.lead}</p>` : ""}
              ${secondaryCta.body ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.65;color:${COLORS.muted};">${secondaryCta.body}</p>` : ""}
              <a href="${secondaryCta.href}" style="display:inline-block;border:1px solid ${COLORS.green};color:#0a7a5a;background:transparent;text-decoration:none;font-weight:600;font-size:13px;padding:10px 22px;border-radius:999px;">${secondaryCta.label}</a>
            </td></tr>
          </table>
        </td>
      </tr>`
      : `
      <tr>
        <td style="padding:18px 0 0;font-size:13px;line-height:1.7;color:${COLORS.muted};">
          ${secondaryCta.lead ? `${secondaryCta.lead} ` : ""}<a href="${secondaryCta.href}" style="color:${COLORS.green};text-decoration:none;font-weight:600;">${secondaryCta.label} &rarr;</a>
        </td>
      </tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
  </head>
  <body style="margin:0;padding:0;background:${COLORS.bg};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLORS.bg};">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
            <!-- Header / wordmark -->
            <tr>
              <td style="padding:0 4px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <img src="cid:${LOGO_CID}" width="36" height="36" alt="Affordable Pentesting" style="display:block;border:0;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;color:${COLORS.headerText};letter-spacing:0.2px;">Affordable Pentesting</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Card -->
            <tr>
              <td style="background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:14px;padding:36px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:6px;">
                      <span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.green};">Affordable Pentesting</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:22px;font-weight:700;color:${COLORS.text};line-height:1.3;padding-bottom:14px;">${heading}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;line-height:1.7;color:${COLORS.muted};padding-bottom:20px;">${intro}</td>
                  </tr>
                  <tr>
                    <td>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLORS.border};">${detailRows}</table>
                    </td>
                  </tr>
                  ${ctaBlock}
                  ${closingBlock}
                  ${secondaryBlock}
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:24px 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <p style="margin:0 0 4px;font-size:12px;color:${COLORS.faint};">Affordable Pentesting &middot; Professional penetration testing</p>
                <p style="margin:0;font-size:12px;color:${COLORS.faint};">Authorized security testing only. This message was sent regarding activity on your account.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function send(
  to: string,
  subject: string,
  html: string,
  text: string,
  replyTo?: string,
) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email:", subject);
    return Promise.resolve();
  }
  return resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    // A plain-text alternative alongside the HTML improves deliverability —
    // HTML-only messages are a moderate spam signal.
    text,
    replyTo: replyTo || REPLY_TO,
    attachments: [logoAttachment],
  });
}

/** Builds a plain-text counterpart to the HTML email for the text/plain part. */
function renderText({
  heading,
  intro,
  rows,
  cta,
  closing,
  closingText,
  secondaryCta,
}: ShellOptions): string {
  const lines = [heading, "", intro, ""];
  rows.forEach(([label, value]) => lines.push(`${label}: ${value}`));
  if (cta) lines.push("", `${cta.label}: ${cta.href}`);
  if (closing || closingText) lines.push("", closingText || closing!);
  if (secondaryCta) {
    lines.push("");
    if (secondaryCta.lead) lines.push(secondaryCta.lead);
    if (secondaryCta.body) lines.push(secondaryCta.body);
    lines.push(`${secondaryCta.label}: ${secondaryCta.href}`);
  }
  lines.push(
    "",
    "—",
    "Affordable Pentesting · Professional penetration testing",
    "Authorized security testing only. This message was sent regarding activity on your account.",
  );
  return lines.join("\n");
}

function reportRejected(
  results: PromiseSettledResult<unknown>[],
  context: string,
) {
  results.forEach((r) => {
    if (r.status === "rejected") {
      console.error(`${context} email failed:`, r.reason);
    }
  });
}

export interface PentestEmailParams {
  userEmail: string | null;
  target: string;
  type: string;
  pentestId: string;
}

/**
 * Sent when a pentest is launched: a confirmation to the client and an internal
 * alert to the admin. Fire-and-forget — never throws, so email failures can't
 * break the launch flow.
 */
export async function sendPentestLaunchedEmails({
  userEmail,
  target,
  type,
}: PentestEmailParams): Promise<void> {
  if (!getResend()) {
    console.warn("RESEND_API_KEY not set — skipping launch emails");
    return;
  }

  const typeLabel = TYPE_LABELS[type] || type;
  const dashboardUrl = `${SITE_URL}/app/dashboard`;
  const rows: Array<[string, string]> = [
    ["Target", esc(target)],
    ["Assessment", esc(typeLabel)],
  ];

  const sends: Promise<unknown>[] = [];

  if (userEmail) {
    const clientOpts: ShellOptions = {
      preheader: `Your assessment of ${target} is underway.`,
      heading: `We've started testing ${target}`,
      intro:
        "Your assessment is underway. You'll get an email the moment your report is ready to download.",
      rows,
      cta: { label: "View in dashboard", href: dashboardUrl },
      closing: `No action is required from you at this stage. If you have questions about scope or timing, visit our <a href="${SITE_URL}/support" style="color:${COLORS.green};text-decoration:none;font-weight:600;">support page</a>.`,
      closingText: `No action is required from you at this stage. If you have questions about scope or timing, visit ${SITE_URL}/support.`,
    };
    sends.push(
      send(
        userEmail,
        `We've started testing ${target}`,
        renderEmail(clientOpts),
        renderText(clientOpts),
      ),
    );
  }

  const adminOpts: ShellOptions = {
    preheader: `A new ${typeLabel} assessment was launched.`,
    heading: "New assessment launched",
    intro: "A customer just launched an assessment. Details are below.",
    rows: [["Client", esc(userEmail || "Unknown")], ...rows],
  };
  sends.push(
    send(
      ADMIN_EMAIL,
      `[Launch] ${target} — ${userEmail || "unknown client"}`,
      renderEmail(adminOpts),
      renderText(adminOpts),
    ),
  );

  reportRejected(await Promise.allSettled(sends), "Launch");
}

/**
 * Sent to the client when their completed report is uploaded. Fire-and-forget —
 * never throws, so email failures can't break report delivery.
 */
export async function sendPentestReportReadyEmail({
  userEmail,
  target,
  type,
}: PentestEmailParams): Promise<void> {
  if (!userEmail) {
    console.warn("No client email — skipping report-ready email");
    return;
  }
  if (!getResend()) {
    console.warn("RESEND_API_KEY not set — skipping report-ready email");
    return;
  }

  const typeLabel = TYPE_LABELS[type] || type;
  const site = SITE_URL;
  const dashboardUrl = `${site}/app/dashboard`;
  const rateUsUrl = `${site}/rate-us?${new URLSearchParams({
    e: userEmail,
    t: target,
    ty: type,
  }).toString()}`;

  const reportOpts: ShellOptions = {
    preheader:
      "Your report has passed quality review and is ready to download.",
    heading: "Your report is ready",
    intro: `The assessment of ${esc(target)} is complete and has passed our quality review. Sign in to review the findings and download the full report.`,
    rows: [
      ["Target", esc(target)],
      ["Assessment", esc(typeLabel)],
      ["Status", "Reviewed and ready"],
    ],
    cta: { label: "View your report", href: dashboardUrl },
    closing: `We recommend reviewing the findings with your technical team and prioritizing remediation by severity. If you would like to discuss the results, visit our <a href="${SITE_URL}/support" style="color:${COLORS.green};text-decoration:none;font-weight:600;">support page</a>.`,
    closingText: `We recommend reviewing the findings with your technical team and prioritizing remediation by severity. If you would like to discuss the results, visit ${SITE_URL}/support.`,
    secondaryCta: {
      lead: "How did we do?",
      body: "A 10-second review helps other teams find us — and helps us improve.",
      label: "Rate your experience",
      href: rateUsUrl,
      prominent: true,
    },
  };

  try {
    await send(
      userEmail,
      `${target}: your security report is ready`,
      renderEmail(reportOpts),
      renderText(reportOpts),
    );
  } catch (error) {
    console.error("Report-ready email failed:", error);
  }
}

// ── Ops alerts ──────────────────────────────────────────────────────────────

/** Internal alert when a scan finishes and is waiting for review. */
export async function sendOpsReviewEmail(opts: {
  target: string;
  findingCount: number;
  criticalCount: number;
  highCount: number;
  pentestId: string;
}): Promise<void> {
  const shell: ShellOptions = {
    preheader: "A completed assessment is waiting for review.",
    heading: "Report ready for review",
    intro: `The assessment of ${esc(opts.target)} finished and is waiting for your review before delivery.`,
    rows: [
      ["Target", esc(opts.target)],
      ["Findings", String(opts.findingCount)],
      ["Critical / High", `${opts.criticalCount} / ${opts.highCount}`],
      ["Pentest", esc(opts.pentestId)],
    ],
    cta: { label: "Review in admin", href: `${SITE_URL}/admin` },
    closing: "Accept to deliver the report and email the customer.",
  };
  try {
    await send(
      ADMIN_EMAIL,
      `[Review] ${opts.target} — ${opts.findingCount} finding${opts.findingCount === 1 ? "" : "s"} ready`,
      renderEmail(shell),
      renderText(shell),
    );
  } catch (error) {
    console.error("Ops review email failed:", error);
  }
}

/** Internal alert for a failed scan. */
export async function sendOpsFailureEmail(opts: {
  target: string;
  pentestId: string;
  reason?: string;
}): Promise<void> {
  const shell: ShellOptions = {
    preheader: "A scan failed and needs attention.",
    heading: "Scan failed",
    intro: `The assessment of ${esc(opts.target)} did not complete. No customer email has been sent.`,
    rows: [
      ["Target", esc(opts.target)],
      ["Pentest", esc(opts.pentestId)],
      ["Reason", esc(opts.reason || "Runner reported failure")],
    ],
    cta: { label: "Open admin", href: `${SITE_URL}/admin` },
    closing: "Re-run or refund as appropriate.",
  };
  try {
    await send(
      ADMIN_EMAIL,
      `[Failed] ${opts.target} — scan did not complete`,
      renderEmail(shell),
      renderText(shell),
    );
  } catch (error) {
    console.error("Ops failure email failed:", error);
  }
}

// ── Weekly signup digest ───────────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface WeeklySignupRow {
  email: string;
  name?: string | null;
  meta?: string | null;
  signedUp: string;
  launched: boolean;
}

/** Internal weekly digest of new AIP signups. */
export async function sendWeeklySignupsDigest(opts: {
  total: number;
  previousTotal: number;
  weekLabel: string;
  days: Array<{ label: string; count: number }>;
  users: WeeklySignupRow[];
  sample?: boolean;
}): Promise<boolean> {
  if (!getResend()) return false;

  const delta = opts.total - opts.previousTotal;
  const deltaText =
    opts.previousTotal === 0
      ? "No signups the previous week."
      : `${delta >= 0 ? "+" : ""}${delta} vs ${opts.previousTotal} the previous week.`;
  const launched = opts.users.filter((u) => u.launched).length;

  const rows = opts.users
    .slice(0, 50)
    .map(
      (u) => `
        <tr>
          <td style="padding:9px 0;border-bottom:1px solid ${COLORS.border};font-size:12px;color:${COLORS.text};word-break:break-all;">${esc(u.email)}</td>
          <td style="padding:9px 0;border-bottom:1px solid ${COLORS.border};font-size:12px;color:${COLORS.muted};">${esc(u.name || "—")}</td>
          <td style="padding:9px 0;border-bottom:1px solid ${COLORS.border};font-size:12px;color:${COLORS.muted};white-space:nowrap;">${esc(u.meta || "—")}</td>
          <td style="padding:9px 0;border-bottom:1px solid ${COLORS.border};font-size:12px;color:${COLORS.muted};white-space:nowrap;">${esc(u.signedUp)}</td>
          <td style="padding:9px 0;border-bottom:1px solid ${COLORS.border};font-size:12px;color:${u.launched ? "#0a7a5a" : COLORS.muted};font-weight:600;">${u.launched ? "Yes" : "No"}</td>
        </tr>`,
    )
    .join("");

  const table = opts.users.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid ${COLORS.border};">
         <tr>
           <th align="left" style="padding:8px 0;border-bottom:1px solid ${COLORS.border};font-size:10px;letter-spacing:0.8px;text-transform:uppercase;color:${COLORS.faint};">Email</th>
           <th align="left" style="padding:8px 0;border-bottom:1px solid ${COLORS.border};font-size:10px;letter-spacing:0.8px;text-transform:uppercase;color:${COLORS.faint};">Name</th>
           <th align="left" style="padding:8px 0;border-bottom:1px solid ${COLORS.border};font-size:10px;letter-spacing:0.8px;text-transform:uppercase;color:${COLORS.faint};">Credits</th>
           <th align="left" style="padding:8px 0;border-bottom:1px solid ${COLORS.border};font-size:10px;letter-spacing:0.8px;text-transform:uppercase;color:${COLORS.faint};">Signed up</th>
           <th align="left" style="padding:8px 0;border-bottom:1px solid ${COLORS.border};font-size:10px;letter-spacing:0.8px;text-transform:uppercase;color:${COLORS.faint};">Launched</th>
         </tr>
         ${rows}
       </table>
       ${opts.users.length > 50 ? `<p style="margin:10px 0 0;font-size:12px;color:${COLORS.faint};">…and ${opts.users.length - 50} more.</p>` : ""}`
    : "";

  const intro = `
    <p style="margin:0 0 8px;">${opts.weekLabel}</p>
    <p style="margin:0 0 8px;">${deltaText} <strong>${launched}</strong> of ${opts.total} have launched.</p>
    <p style="margin:0;font-size:12px;color:${COLORS.faint};">${opts.days
      .map((d) => `${d.label} ${d.count}`)
      .join(" &middot; ")}</p>
    ${table}`;

  const shell: ShellOptions = {
    preheader: `${opts.total} new signup${opts.total === 1 ? "" : "s"} this week.`,
    heading: `${opts.total} new signup${opts.total === 1 ? "" : "s"}`,
    intro,
    rows: [
      ["Week", opts.weekLabel],
      ["Previous week", String(opts.previousTotal)],
      ["Launched", `${launched} of ${opts.total}`],
    ],
    cta: { label: "Open admin", href: `${SITE_URL}/admin` },
    closing: "Automated weekly digest — Sunday nights.",
  };

  try {
    await send(
      ADMIN_EMAIL,
      `${opts.sample ? "[Sample] " : ""}[Signups] ${opts.total} new this week — Affordable Pentesting`,
      renderEmail(shell),
      renderText(shell),
    );
    return true;
  } catch (error) {
    console.error("Weekly signups digest failed:", error);
    return false;
  }
}

// ── Billing ─────────────────────────────────────────────────────────────────

/** Branded receipt when a paid Stripe invoice is generated. */
export async function sendInvoiceEmail(opts: {
  userEmail: string | null;
  amount: string;
  invoiceNumber: string;
  invoiceUrl?: string | null;
  productLabel?: string | null;
}): Promise<void> {
  if (!opts.userEmail) return;
  const rows: Array<[string, string]> = [
    ["Amount", esc(opts.amount)],
    ["Invoice", esc(opts.invoiceNumber)],
  ];
  if (opts.productLabel) rows.push(["For", esc(opts.productLabel)]);

  const shell: ShellOptions = {
    preheader: "Your payment was received and your invoice is ready.",
    heading: "Payment received",
    intro:
      "Thanks for your purchase. Your invoice is ready to view or download.",
    rows,
    cta: {
      label: "View / download invoice",
      href: opts.invoiceUrl || `${SITE_URL}/app/dashboard`,
    },
    closing: `You can find all your invoices in your account billing history. Questions? Visit our <a href="${SITE_URL}/support" style="color:${COLORS.green};text-decoration:none;font-weight:600;">support page</a>.`,
    closingText: `You can find all your invoices in your account billing history. Questions? Visit ${SITE_URL}/support.`,
  };
  try {
    await send(
      opts.userEmail,
      `Payment received — invoice ${opts.invoiceNumber}`,
      renderEmail(shell),
      renderText(shell),
    );
  } catch (error) {
    console.error("Invoice email failed:", error);
  }
}

// ── Sample report ───────────────────────────────────────────────────────────

/**
 * Sends the sample-report PDF with a branded shell. Returns the Resend id (or
 * null on failure/skip). Used by the public landing-page form.
 */
export async function sendSampleReportEmail(opts: {
  to: string;
  pdfBase64: string;
  filename: string;
}): Promise<string | null> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping sample report");
    return null;
  }
  const shell: ShellOptions = {
    preheader: "Your sample penetration test report is attached.",
    heading: "Your sample report is ready",
    intro:
      "Here is a full AI-powered penetration test report — executive summary, severity breakdown, and detailed findings with remediation guidance.",
    rows: [],
    cta: { label: "Launch your first pentest", href: SITE_URL },
    closing:
      "Ready to test your own targets? Sign up and launch your first assessment in minutes.",
  };
  const sent = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Your sample penetration test report",
    html: renderEmail(shell),
    text: renderText(shell),
    replyTo: REPLY_TO,
    attachments: [
      logoAttachment,
      { filename: opts.filename, content: opts.pdfBase64 },
    ],
  });
  return "data" in sent && sent.data ? sent.data.id : null;
}

// ── Verification ────────────────────────────────────────────────────────────

/** Branded email-verification link (sent from our API, not Firebase). */
export async function sendVerificationEmail(opts: {
  to: string;
  url: string;
}): Promise<boolean> {
  if (!getResend()) return false;
  const shell: ShellOptions = {
    preheader: "Confirm your email address to finish setting up your account.",
    heading: "Confirm your email",
    intro:
      "Thanks for signing up. Confirm your email address to finish setting up your Affordable Pentesting account.",
    rows: [],
    cta: { label: "Verify email", href: opts.url },
    closing:
      "This link expires in one hour. If you didn't create an account, you can ignore this email.",
  };
  try {
    await send(
      opts.to,
      "Verify your email for Affordable Pentesting",
      renderEmail(shell),
      renderText(shell),
    );
    return true;
  } catch (error) {
    console.error("Verification email failed:", error);
    return false;
  }
}
