# Email Nurture Plan — AIP (Affordable Pentesting)

_Last updated: 2026-10-07_

## Overview

Three Resend Broadcasts audiences feed automated nurture sequences. Contacts land in an audience based on in-app events. The actual email content and scheduling is built in the **Resend Broadcasts dashboard** — this doc describes when contacts enter each audience and what env vars are needed.

---

## Audiences

| Audience | ID (prod) | Trigger | Details |
|----------|-----------|---------|---------|
| **Sample Report Downloaders** | `05228824-fc17-47f8-bf3e-abced5c6a12b` | User submits email on the landing page sample-report form (`POST /api/sample-report`) | Called via `src/lib/email/audience.ts:addToAudience()`. Custom fields: `source`, `signed_up_at` |
| **Signups (No Launch)** | `c9d6606b-4153-4297-ae67-fd6c3d715630` | Admin cron job `POST /api/admin/sync-audiences` finds users signed up >25h ago with 0 pentests | Called from `src/app/api/admin/sync-audiences/route.ts`. Custom fields: `signed_up_at`. Tracks `_audienceNoLaunchPushedAt` on the user doc to avoid re-pushes |
| **Active Users** | `f9cb66e0-60ba-4b6f-9bc7-c5d1e3d8a211` | User launches their first pentest (`POST /api/pentests`) | Called from `src/app/api/pentests/route.ts`. Custom fields: `launched_at`. Reuses the default "General" audience (rename it in Resend dashboard) |

---

## Trigger Details

### 1. Sample Report Download
- **File:** `src/app/api/sample-report/route.ts`
- **When:** After the PDF email is successfully sent via Resend transactional API
- **How:** Fire-and-forget call to `addToAudience("sample_report", { email, first_name, data })` — does not block the response
- **Audience ID env var:** `RESEND_AUDIENCE_SAMPLE_REPORT`

### 2. No-Launch Drip (24h+ stale signups)
- **File:** `src/app/api/admin/sync-audiences/route.ts`
- **Auth:** Admin-only (requires admin auth)
- **When:** Called manually or via cron (e.g. Vercel Cron Jobs)
- **What it does:**
  1. Queries all Firestore users sorted by `createdAt` ascending
  2. Filters to those created >25h ago
  3. Checks `_audienceNoLaunchPushedAt` marker — skips if already pushed
  4. Checks `pentests` collection for any pentest by this user — skips if ≥1 exists
  5. Pushes remaining users to "Signups (No Launch)" audience
  6. Sets `_audienceNoLaunchPushedAt` timestamp to avoid re-push
- **Recommended cron schedule:** Once daily
- **Audience ID env var:** `RESEND_AUDIENCE_NO_LAUNCH`

### 3. Active User (pentest launched)
- **File:** `src/app/api/pentests/route.ts`
- **When:** After a pentest is successfully launched (after the Firestore transaction + email)
- **How:** Fire-and-forget call to `addToAudience("active_user", { email, first_name, data })`
- **Note:** Fires on every launch (not gated to first only — Resend upserts by email within an audience)
- **Audience ID env var:** `RESEND_AUDIENCE_ACTIVE_USER`

---

## Shared Library

**File:** `src/lib/email/audience.ts`

```ts
addToAudience(audience: "sample_report" | "no_launch" | "active_user", contact: {
  email: string;
  first_name?: string;
  last_name?: string;
  data?: Record<string, string>;
}): Promise<{ ok: boolean; error?: string }>
```

Uses `RESEND_API_KEY` (same key as transactional) and audience-specific env vars. Calls `POST /audiences/{id}/contacts` on the Resend API.

---

## Environment Variables (set on Vercel prod)

| Variable | Value |
|----------|-------|
| `RESEND_AUDIENCE_SAMPLE_REPORT` | `05228824-fc17-47f8-bf3e-abced5c6a12b` |
| `RESEND_AUDIENCE_NO_LAUNCH` | `c9d6606b-4153-4297-ae67-fd6c3d715630` |
| `RESEND_AUDIENCE_ACTIVE_USER` | `f9cb66e0-60ba-4b6f-9bc7-c5d1e3d8a211` |

---

## To Do in Resend Broadcasts Dashboard

1. **Rename "General" → "Active Users"** (it's being used as the active-user audience)
2. **Build automations** in each audience (trigger: contact added):
   - **Sample Report** (3 emails): report value prop → case studies → launch CTA
   - **No Launch** (5 emails): welcome → what is a pentest → how AI works → FAQ → limited-time offer
   - **Active Users** (5 emails): welcome → interpreting results → next steps → retesting → referrals
3. **Verify contacts are flowing** by checking audience stats after events

---

## Future (when upgrading from free tier)

- Create a dedicated **"Active Users"** audience (currently re-uses the default "General" due to the free plan's 3-segment limit)
- Add a **"Returning Customer"** audience for users who purchase a second pentest
- Consider a **"Churned"** audience: users who haven't logged in or launched in 60+ days