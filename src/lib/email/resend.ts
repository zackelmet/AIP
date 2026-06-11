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
  bg: "#ffffff", // outer email page background
  headerText: "#0a141f", // wordmark/footer text on the white page
  card: "#0f1f2e",
  border: "#1d3140",
  green: "#34D399",
  text: "#e8f1f0",
  muted: "#8aa0a4",
  faint: "#5f7178",
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
  // A lighter-weight secondary link rendered below the closing (e.g. "Rate us").
  secondaryCta?: { lead?: string; label: string; href: string };
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
    ? `
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
    <meta name="color-scheme" content="dark" />
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

function send(to: string, subject: string, html: string, text: string) {
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
  secondaryCta,
}: ShellOptions): string {
  const lines = [heading, "", intro, ""];
  rows.forEach(([label, value]) => lines.push(`${label}: ${value}`));
  if (cta) lines.push("", `${cta.label}: ${cta.href}`);
  if (closing) lines.push("", closing);
  if (secondaryCta)
    lines.push(
      "",
      `${secondaryCta.lead ? `${secondaryCta.lead} ` : ""}${secondaryCta.label}: ${secondaryCta.href}`,
    );
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
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/app/dashboard`;
  const rows: Array<[string, string]> = [
    ["Target", target],
    ["Assessment", typeLabel],
  ];

  const sends: Promise<unknown>[] = [];

  if (userEmail) {
    const clientOpts: ShellOptions = {
      preheader: "Your engagement is now underway.",
      heading: "Your penetration test has started",
      intro:
        "Your engagement is now underway. Our team has begun assessing your target, and we will email you the moment your report is ready to download.",
      rows,
      cta: { label: "View in dashboard", href: dashboardUrl },
      closing:
        "No action is required from you at this stage. If you have questions about scope or timing, simply reply to this email.",
    };
    sends.push(
      send(
        userEmail,
        "Your penetration test has started",
        renderEmail(clientOpts),
        renderText(clientOpts),
      ),
    );
  }

  const adminOpts: ShellOptions = {
    preheader: `A new ${typeLabel} engagement was launched.`,
    heading: "New pentest launched",
    intro: "A client just launched a new engagement. Details are below.",
    rows: [["Client", userEmail || "Unknown"], ...rows],
  };
  sends.push(
    send(
      ADMIN_EMAIL,
      `New pentest launched — ${target}`,
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
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const dashboardUrl = `${site}/app/dashboard`;
  const rateUsUrl = `${site}/rate-us?${new URLSearchParams({
    e: userEmail,
    t: target,
    ty: type,
  }).toString()}`;

  const reportOpts: ShellOptions = {
    preheader: "Your report is now available to download.",
    heading: "Your report is ready",
    intro:
      "Your penetration test is complete and your report is now available. Sign in to your dashboard to review the findings and download the full report.",
    rows: [
      ["Target", target],
      ["Assessment", typeLabel],
    ],
    cta: { label: "Download your report", href: dashboardUrl },
    closing:
      "We recommend reviewing the findings with your technical team and prioritizing remediation by severity. If you would like to discuss the results, simply reply to this email.",
    secondaryCta: {
      lead: "Enjoyed working with us?",
      label: "Rate your experience",
      href: rateUsUrl,
    },
  };

  try {
    await send(
      userEmail,
      "Your penetration test report is ready",
      renderEmail(reportOpts),
      renderText(reportOpts),
    );
  } catch (error) {
    console.error("Report-ready email failed:", error);
  }
}
