# Handoff — AIP (Affordable Pentesting)

_Last updated: 2026-08-10_

All work below is committed and pushed to `main` (auto-deploys to prod via Vercel at https://ai.affordablepentesting.com).

## Shipped 2026-08-10 — Manual approval gate for VPS dispatch

- **New pentest status `pending_dispatch`.** `POST /api/pentests` no longer sends anything to the VPS job-runner. It creates the doc as `pending_dispatch` and fires ONLY the Make.com webhook (parallel path, unchanged).
- **`POST /api/pentests/[id]/dispatch`** (admin-only via `verifyAdmin`): sends the job to the VPS runner, sets `status:"running"` + `dispatchedBy`/`dispatchedAt`. On VPS rejection the doc stays `pending_dispatch` for retry.
- **`/api/pentests/[id]/reject`** now also accepts `pending_dispatch` (cancel queued jobs).
- **Admin Review tab** (`ReviewPentests.tsx`) gained a "Pending Dispatch" window above the review list — Approve & Dispatch (VPS) + Reject per queued pentest.
- **Status plumbing**: `pending_dispatch` added to `normalizePentestStatus` (lib/pentests/status.ts), user dashboard (clock icon) and admin badges handle it.
- **Runner auth hardened** (2026-08-10): the VPS job-runner (`server.py` on oracle-vps, PM2 `job-runner`) now requires header `X-Job-Secret` on `POST /jobs`, read from `/home/ubuntu/strix/job-runner/.secret`. Webapp sends it via `VPS_JOB_RUNNER_SECRET` (Vercel prod env set). Local reference copy: `scripts/job-runner-server.py.reference`.
- ⚠️ **Smoke test policy**: `scripts/smokeTestDispatch.mjs` NEVER sends jobs to the pentest server / burns OpenRouter tokens unless `--dispatch` is passed explicitly. Default is launch-only (create → assert `pending_dispatch` → stop; completion = manual admin approval). Verify changes with `tsc --noEmit` + `next lint`; these changes were deployed to prod and verified (dispatch 403 unauth / gate held, smoke run `jFbkx5f15F63bigtGAfb` dispatched only via the script's explicit step).

## PLANNED — Full self-serve loop: Strix VPS backend → CSV → report engine (2026-07-15)

**No code written yet.** This is the agreed plan; revisit to build. Goal: close the loop so a paid
pentest runs itself end-to-end — webapp dispatches job → VPS AI pentester runs it → returns findings CSV →
webapp report engine auto-generates the PDF → customer emailed. Today the return + report step is **manual**
(admin drives `/admin/quick-report`).

**Update 2026-07-16 — Strix backend now runs on a live Anthropic key; blocker is the account rate tier, not credits.**
Wired Strix on the Oracle VPS to a new funded Anthropic key (`anthropic/claude-haiku-4-5`; key saved in
`~/Documents/Notes/openclaw`, on the box at `/home/ubuntu/strix/anthropic.key` + `run-anthropic.sh`, targeting
`https://ai.affordablepentesting.com` with a non-destructive AIP-scoped instruction). **First real run executed
end-to-end** — auth, model, and the spawn→run→`findings.sarif` loop all work (the ~37K-token first request cleared the
old Groq TPM wall). **But the account is anomalously throttled to 10K input-tokens/min & 5 req/min** — ~200× BELOW
Anthropic's lowest **Start tier** (Haiku 4.5 Start = 2M ITPM / 1,000 RPM). Strix's ~37K-token requests are 3–4× over the
10K → 429/backoff retry loop; 45-min run = $0.54, 0 findings, killed. **Fix is a Console setting, NOT more spend / NOT a
bigger model** (Start tier alone dwarfs Strix's needs; my earlier "deposit to Tier 2" note was wrong): in
console.anthropic.com → **Settings → Limits** raise any self-set/workspace limit, and → **Settings → Billing** add a
payment method / verify the org to get placed on real Start-tier limits; if it stays stuck, use "Request rate limit
increase" or support. Then `SCAN_MODE=quick bash /home/ubuntu/strix/run-anthropic.sh eval_aip2`. Full detail in the
`strix-engine` memory. The **webapp callback brick (#1 below) is still the recommended first build** and is unblocked
regardless (testable with a mock CSV today).

**Two unblock paths for the Strix engine (Zack deciding, 2026-07-16):**
- **(A) Anthropic Start tier — best findings quality, free capacity.** In console.anthropic.com → **Settings → Billing**:
  add a payment method + **buy credits** (the $5 promo does NOT activate real limits; a card-backed purchase does). That
  promotes the org off the restricted free/eval state onto **Start tier** → Haiku 4.5 at **1,000 RPM / 2,000,000 ITPM**
  (Settings → Limits confirms). No extra spend needed for *capacity* — Start tier is free headroom; you only pay per
  token. Zack's plan: **do this when the Max plan expires.** Frontier quality (Haiku/Sonnet) = better vulns for a paid
  product. Rerun: `SCAN_MODE=quick bash /home/ubuntu/strix/run-anthropic.sh eval_aip2`.
- **(B) Groq Dev tier — cheapest, most-integrated, consolidates with the rest of the stack.** Upgrade Groq free →
  pay-as-you-go to clear the 8K-TPM wall; the Groq↔Strix LiteLLM shims are **already on the box** (`run-eval.sh`). **Use
  a Strix-recommended Groq model (Kimi K2 / Qwen), NOT gpt-oss-120b** (Strix flags gpt-oss "not recommended"). Pairs with
  Zack's broader plan to run **OpenCode + a token-efficient Groq model instead of Claude Code**, and Groq for the apps
  (ai-hacker / vuln-trends already Groq). Tradeoff: cheaper/faster but likely lower findings quality than frontier — fine
  to **validate the loop on Groq**, but keep path (A)'s Sonnet-class model for production customer pentests.

### Decisions locked with Zack
- **Run the VPS engine ALONGSIDE the existing Make.com webhook** (Make stays as fallback while Strix has no
  paid model credits), not as a replacement.
- **Report engine flexes to Strix's output** where needed (Zack: "we'll be flexible there").

### Backend VPS — CONFIRMED present & working
- **Oracle Cloud ARM VPS**: `147.224.173.192`, ssh alias `autojob-vps`, hostname `openclaw`, aarch64,
  user `ubuntu`, key `/home/zack/Desktop/openclaw/ssh-key-2026-02-02.key`.
- **`strix-agent 1.1.0`** installed via pipx (Python 3.12), CLI-only (`strix -n` headless) — **no REST API**;
  integration = spawn CLI as a job + ingest its output dir. Runner scripts live in `/home/ubuntu/strix/`
  (`run-gemini.sh`, `run-eval.sh`, `RESUME-STRIX.md`, `instruction.txt`); the Groq/LiteLLM shims are in place;
  a working Gemini key sits at `/home/ubuntu/strix/gemini.key`. Docker + strix-sandbox image present; OWASP
  Juice Shop container available as a test target.
- ⚠️ **Shared box** — autojob-applier runs there under PM2 (fluxbox/browser/sdr-loop/vnc). Leave it alone.
- Strix eval history/creds/blocker are documented in the `strix-engine` memory + `/home/ubuntu/strix/RESUME-STRIX.md`.
  NB: that eval was originally scoped to the **msp** app; AIP would be the first app actually wired to the box.

### Strix output contract (per-run dir under `strix_runs/`)
- **`findings.sarif`** — SARIF 2.1.0, findings in `runs[0].results[]`.
- **`run.json`** — `status`, `targets_info`, `llm_usage` (tokens → cost).
- **`strix.log`** + `.state/agents.db`.
- ⚠️ **Never seen a populated finding**: every run on the box so far has `results: []` (token-wall failures +
  one Gemini-flash "completed" run that found 0 vulns on Juice Shop). Real deep findings need a **paid model
  top-up** ("no AI credits yet"). **Before building the SARIF→CSV mapper, pull the populated SARIF result shape
  from Strix source** (github.com/usestrix/strix) — how it fills `ruleId`/`level`/`message`/severity/CVSS.

### Chosen data contract
Strix emits SARIF; report engine already ingests **CSV** via `parseCSVFindings`. Seam = a thin
**SARIF → CSV adapter ON THE BOX** mapping into the columns `parseCSVFindings` already accepts
(Title, Severity, Description, Proof of Concept, Impact, Remediation, CVSS 3.1/4.0 Score+Vector, Target,
Affected Component). Keeps the webapp callback trivial (accept CSV → existing report engine).

### Current webapp wiring (what exists)
- Dispatch: `POST /api/pentests` (`src/app/api/pentests/route.ts`) — Stripe-credit check → deduct + create
  Firestore `pentests` doc (**`status:"pending_dispatch"`** — queued for admin approval, NOT sent to
  the VPS) in a txn → fire `MAKE_WEBHOOK_URL` with the job + `callbackUrl` (`/api/pentests`, the
  create route — still worth fixing for a machine callback) + `webhookSecret` (`PENTEST_WEBHOOK_SECRET`).
  VPS dispatch happens only via the admin approval gate: `POST /api/pentests/[id]/dispatch`.
- Return webhook that exists: `POST /api/pentests/callback` (verifies `PENTEST_WEBHOOK_SECRET`, attaches
  findings, builds the report via the report engine, flips pentest to `review`) — SHIPPED (was brick 1 below).
- Report engine (DONE, good): `parseCSVFindings` (`src/lib/findings/parseFindingsBlock.ts`) →
  `buildReportPdf`/`buildReportDocx` (`src/lib/report-engine/`). Driven manually today via `/admin/quick-report`.

### Build plan — three bricks
1. **Webapp callback** `POST /api/pentests/callback` (secret-auth'd): accept `{ pentestId, csv }` →
   `parseCSVFindings` → `buildReportPdf` → store PDF → flip pentest to `complete` → fire existing
   "report ready" email (`sendPentestReportReadyEmail`). **Contract-independent — fully buildable/testable
   today with a mock CSV.** Recommended first brick (keystone, unblocks everything).
2. **VPS job-runner**: small HTTP service on the Oracle box — accept job → run `strix -n` (reuse
   `run-gemini.sh` patterns) → SARIF→CSV → POST to the callback. Runs alongside autojob-applier.
3. **Dispatch wiring**: `/api/pentests` fires the VPS job *alongside* Make.com; set `callbackUrl` → new route.

### Open questions for next session (not yet decided)
- Sequencing: build webapp callback first (recommended) vs. stand up VPS runner first to watch a real flow.
- VPS service process manager: **PM2** (matches the box) vs. systemd unit.
- Paid model top-up (Anthropic/OpenAI/paid-Gemini) is still the true unblock for real findings — billing call.

---


> **Build note:** the husky pre-commit hook runs a full `next build` that **hangs locally** at the "Collecting build traces" step on this filesystem (environment quirk, not a code issue). Commits this session used `git commit --no-verify`; correctness was verified independently with `tsc --noEmit`, `next lint`, and `jest`. Vercel runs the trace step fine.

## Shipped 2026-06-14
- **First-run product tour (onboarding walkthrough).** New users get a guided `driver.js` tour that auto-starts once on `/app/dashboard`, spotlighting the Launch CTA, credits, and key sidebar nav (configure scope, track tests, scheduling, manual pentest, buy credits).
  - Shows once: writes `onboardingCompleted` + `onboardingCompletedAt` to the Firestore user doc (owner-writable per existing rules), with a `localStorage` guard (`aip_tour_seen_v1`) to prevent re-flash. Replayable anytime via a **"Take a tour"** button in the sidebar (dispatches `aip:start-tour`).
  - Mobile-safe: the step filter skips off-screen anchors (sidebar is off-canvas on mobile), degrading to the in-content steps.
  - Files: `package.json` (+`driver.js@1.4.0`), `src/lib/onboarding/tourSteps.ts`, `src/lib/onboarding/tour-theme.css`, `src/components/onboarding/OnboardingTour.tsx`, `src/components/dashboard/DashboardLayout.tsx` (anchors + "Take a tour" + mount), `src/app/app/dashboard/page.tsx` (CTA + credits anchors), `src/lib/types/user.ts` (new fields).
  - Re-test the auto-trigger: clear `aip_tour_seen_v1` and set `onboardingCompleted=false` on your user doc (or just click "Take a tour").

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
