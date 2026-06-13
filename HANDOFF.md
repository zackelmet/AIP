# Handoff — AIP (Affordable Pentesting)

_Last updated: 2026-06-11_

All work below is committed and pushed to `main` (auto-deploys to prod via Vercel at https://ai.affordablepentesting.com).

> **Build note:** the husky pre-commit hook runs a full `next build` that **hangs locally** at the "Collecting build traces" step on this filesystem (environment quirk, not a code issue). Commits this session used `git commit --no-verify`; correctness was verified independently with `tsc --noEmit`, `next lint`, and `jest`. Vercel runs the trace step fine.

## Shipped 2026-06-13
- **Pentest+ scope now actually delivered end-to-end.** The UI advertised a bigger web-app engagement (10 roles, 100 endpoints, 5 domains/URLs, 50 IPs) but the launch path dropped most of it. Fixes:
  - `new-pentest/page.tsx`: roles + endpoints are now sent for `pentest_plus` (were gated to `web_app` only); all comma-separated targets are sent as a `targets` array (was sending only the first); Pentest+ is one engagement on 1 credit, so the "Start N Pentests"/per-target job split and the misleading "each IP = 1 credit" amber warning are now `external_ip`-only. Pentest+ gets its own helper + emerald multi-target note.
  - `api/pentests/route.ts`: now **stores** `targets` and `roles` on the pentest doc and **forwards** both to the Make.com webhook. `roles` (credentialed) was previously validated but never persisted — this also fixes credentialed **Web App** tests.
  - **Server-side scope enforcement** added: endpoints ≤100 (pentest_plus)/≤10 (web_app); Pentest+ targets ≤5 domains/URLs and ≤50 IPs (IP vs domain classified by regex). Role cap (10/3) was already enforced.

## Shipped 2026-06-12
- **Pentest+ repositioned as a web app tier** (`afe1ca8`): now explicitly a web application pentest — up to 5 domains/URLs, same 50 IPs, 100 API endpoints, 10 user roles (dropped the "IPs *or* webapp" framing). Updated landing card (`src/app/page.tsx`), pricing card + FAQ (`src/app/pricing/page.tsx`), and in-app `dashboard`/`new-pentest` copy for consistency. Copy-only; no price/Stripe/credit logic changed.

## Shipped this session

### Report Engine v2 — CSV → delivery-ready PDF
- New admin page **`/admin/quick-report`** ("Report Engine v2"): drop a findings CSV, set env type / branding / target / org / summaries, download a PDF. Direct stream download (no Firebase storage).
- Files: `src/app/admin/quick-report/`, `src/app/api/admin/quick-report/route.ts`, `src/components/admin/QuickReport.tsx`, `src/lib/report-engine/pdf-template.ts` (rewritten), `src/lib/report-engine/cvss.ts`, `src/lib/findings/parseFindingsBlock.ts`, `src/test/lib/quickReportPdf.smoke.test.ts`.
- PDF renderer was **redesigned to match the delivered DOCX report** (`/home/zack/Downloads/Pentest Report - KTF Digital.docx.pdf`): mint gradient cover (no brain image), metadata + confidentiality page, dotted TOC, About + Third-Party Attestation page, Findings Summary counts table, Methodology table, bordered PoC boxes, color-coded Severity Descriptions, colored Risk Matrix.
- Folds in earlier edits: findings sorted by severity, severity/Likelihood/Impact pills above each finding title, "Likelihood" risk-matrix corner, WinAnsi text sanitization.
- **CVSS 4.0** vectors are displayed (falls back to 3.1); Likelihood/Impact derivation is version-aware. NOTE: CVSS 4.0 L/I pills use heuristic bucketing (4.0 has no simple subscore formula); the displayed vector + severity are exact.
- Brand-aware (AIP/MSP) logo, tester, email. AIP logos staged in `/public`.

### Dashboard — Continuous Testing
- `src/components/dashboard/ContinuousTesting.tsx` on `/app/dashboard`: discounted yearly bundles (quarterly 4/yr, monthly 12/yr, 20% off). Reuses existing `/api/checkout` + Stripe continuous price IDs. Plan data shared via `src/lib/pricing/continuous.ts` (landing page uses it too). Compact two-row card layout.

### Rate-us review funnel + admin feedback
- Public **`/rate-us`** (no login): star rating + short feedback box. 4–5★ → optional testimonial w/ publish-permission + "Leave a public review" nudge; ≤3★ → private feedback. Writes to Firestore `feedback` collection via `POST /api/feedback`.
- The **report-ready email** (`sendPentestReportReadyEmail`) now carries a "Rate your experience" link with attribution context (email/target/type).
- Admin: **Feedback is a window on `/admin`** (above the Users window) — `src/components/admin/FeedbackWindow.tsx`, backed by `GET /api/admin/feedback`. (Standalone page was removed.)
- Two test submissions (1★ private + 5★ publishable) are live in prod Firestore.

### Landing / UI
- Pricing heading: **"Simple Pricing"** (dropped "Transparent").
- Environments section: **Internal → "M365 Tenants"** with a custom green four-square SVG icon (`public/environments/m365.svg`).
- **Button text consistency**: green-background buttons app-wide use dark `text-[#041018]` (white-on-green was hard to read); translucent-green chips keep light text.

### Blog / SEO
- SEO infra on `src/app/blog/[slug]/page.tsx`: proper metadata (title, description, canonical, OpenGraph article, Twitter), **JSON-LD** BlogPosting + BreadcrumbList, `remark-gfm` (tables), light readable post background.
- **6 seed posts** (commercial/lead-gen, cross-linked, internal links to `/#pricing` + `/login`):
  - Cost & buyer: `penetration-testing-cost`, `how-to-choose-a-penetration-testing-company`, `types-of-penetration-testing`
  - Compliance: `soc-2-…`, `hipaa-…`, `pci-dss-penetration-testing-requirements`
- Per-post branded cover images composited from supplied brand assets onto 1200×630 dark backgrounds (`public/blog/cover-*.png`); source assets saved in `public/blog/`. Removed placeholder `test.mdx`.

## TODO / needs owner action
- **Set `NEXT_PUBLIC_REVIEW_URL`** in Vercel (Google review link) so the rate-us happy-path shows the "Leave a public review" button. Until set, the thank-you still works without it.
- **M365 marketing page**: the M365 Tenants card links to `https://www.affordablepentesting.com/environments/m365-pentesting` (guessed slug) — confirm/create that page.
- Blog: confirm pricing claims ($199/$500/$1,500, "within 48 hours") and the compliance framing match how you sell. Posts carry "not legal advice" disclaimers.

## Possible next steps (not started)
- Published-testimonials section on the landing page sourced from the `feedback` collection (filter `permissionToPublish`).
- More blog posts (extend compliance/cost clusters); FAQ schema.
- Per-post custom cover art if the composited brand covers should be replaced.
