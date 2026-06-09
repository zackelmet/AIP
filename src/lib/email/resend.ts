import { Resend } from "resend";

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
  process.env.EMAIL_FROM || "Affordable Pentesting <noreply@msppentesting.com>";
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "zack@msppentesting.com";

const TYPE_LABELS: Record<string, string> = {
  web_app: "Web Application",
  external_ip: "External IP",
  pentest_plus: "Pentest+",
};

function shell(title: string, bodyHtml: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#041018;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e6f1f1;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="font-size:18px;font-weight:800;color:#34D399;margin-bottom:24px;">
        Affordable Pentesting
      </div>
      <div style="background:#0d1f2d;border:1px solid rgba(52,211,153,0.25);border-radius:12px;padding:28px 24px;">
        <h1 style="margin:0 0 16px;font-size:20px;color:#ffffff;">${title}</h1>
        ${bodyHtml}
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#6b7d83;">
        Affordable Pentesting · Authorized security testing only.
      </p>
    </div>
  </body>
</html>`;
}

function detailRows(rows: Array<[string, string]>) {
  return rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:6px 0;font-size:13px;color:#8aa0a4;width:120px;">${label}</td>
          <td style="padding:6px 0;font-size:13px;color:#e6f1f1;font-weight:600;">${value}</td>
        </tr>`,
    )
    .join("");
}

export interface PentestLaunchedParams {
  userEmail: string | null;
  target: string;
  type: string;
  pentestId: string;
}

/**
 * Fire-and-forget notification for a freshly launched pentest. Sends a
 * confirmation to the client and an internal alert to the admin. Never throws —
 * email failures must not break the launch flow.
 */
export async function sendPentestLaunchedEmails({
  userEmail,
  target,
  type,
  pentestId,
}: PentestLaunchedParams): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping launch emails");
    return;
  }

  const typeLabel = TYPE_LABELS[type] || type;
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/app/dashboard`;

  const details = detailRows([
    ["Target", target],
    ["Type", typeLabel],
    ["Pentest ID", pentestId],
  ]);

  const sends: Promise<unknown>[] = [];

  // Client confirmation
  if (userEmail) {
    const clientHtml = shell(
      "Your pentest has launched 🚀",
      `<p style="margin:0 0 16px;font-size:14px;color:#c4d4d6;line-height:1.6;">
         Good news — your penetration test is now underway. Our team is on it and
         you'll get an email the moment your report is ready to download.
       </p>
       <table style="width:100%;border-collapse:collapse;margin:8px 0 20px;">${details}</table>
       <a href="${dashboardUrl}" style="display:inline-block;background:#34D399;color:#041018;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:8px;">
         View in dashboard
       </a>`,
    );
    sends.push(
      resend.emails.send({
        from: FROM,
        to: userEmail,
        subject: "Your pentest has launched — Affordable Pentesting",
        html: clientHtml,
      }),
    );
  }

  // Admin alert
  const adminHtml = shell(
    "New pentest launched",
    `<p style="margin:0 0 16px;font-size:14px;color:#c4d4d6;line-height:1.6;">
       A client just launched a pentest. Details below.
     </p>
     <table style="width:100%;border-collapse:collapse;margin:8px 0 4px;">
       ${detailRows([
         ["Client", userEmail || "Unknown"],
         ["Target", target],
         ["Type", typeLabel],
         ["Pentest ID", pentestId],
       ])}
     </table>`,
  );
  sends.push(
    resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `New pentest: ${target} (${typeLabel})`,
      html: adminHtml,
    }),
  );

  const results = await Promise.allSettled(sends);
  results.forEach((r) => {
    if (r.status === "rejected") {
      console.error("Launch email failed:", r.reason);
    }
  });
}
