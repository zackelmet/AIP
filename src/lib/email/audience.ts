const RESEND_API_BASE = "https://api.resend.com";

const AUDIENCE_IDS: Record<string, string | undefined> = {
  sample_report: process.env.RESEND_AUDIENCE_SAMPLE_REPORT,
  no_launch: process.env.RESEND_AUDIENCE_NO_LAUNCH,
  active_user: process.env.RESEND_AUDIENCE_ACTIVE_USER,
};

interface AudienceContact {
  email: string;
  first_name?: string;
  last_name?: string;
  data?: Record<string, string>;
}

export async function addToAudience(
  audience: "sample_report" | "no_launch" | "active_user",
  contact: AudienceContact,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };

  const audienceId = AUDIENCE_IDS[audience];
  if (!audienceId) return { ok: false, error: `Audience ID not configured for: ${audience}` };

  try {
    const res = await fetch(
      `${RESEND_API_BASE}/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: contact.email,
          first_name: contact.first_name || "",
          last_name: contact.last_name || "",
          unsubscribed: false,
          data: contact.data || {},
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[audience] failed to add ${contact.email} to ${audience}:`, errBody);
      return { ok: false, error: `Resend API error: ${res.status}` };
    }

    return { ok: true };
  } catch (err: any) {
    console.error(`[audience] network error for ${contact.email}:`, err.message);
    return { ok: false, error: err.message };
  }
}