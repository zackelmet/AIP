# Apps Script Integration (Report Jobs)

## Overview
The webapp can send report jobs to Apps Script, which:
1. Validates the signed request and requester email allowlist
2. Injects placeholders + findings into a Google Docs template
3. Keeps a Drive copy
4. Exports both PDF + DOCX
5. Calls webapp finalize endpoint to store in Firebase GCS and return signed URLs

## Authorization Model
- Primary authorization happens in the webapp at `POST /api/admin/report-engine/submit` via `verifyAdmin`, which checks Firebase auth + Firestore `isAdmin`.
- Apps Script validates the HMAC signature (`JOB_SIGNING_SECRET`) to trust only webapp-issued jobs.
- `ALLOWED_REQUESTER_EMAILS` is optional defense-in-depth. Leave it empty to rely only on Firestore admin checks and signed webapp jobs.

## Apps Script Placeholders
Use these in your Google Doc template:
- `{{report_type}}`
- `{{client_name}}`
- `{{project_title}}`
- `{{target}}`
- `{{completed_date}}`
- `{{tester}}`
- `{{version}}`
- `{{notes}}`
- `{{executive_summary}}`
- `{{purpose}}`
- `{{detailed_analysis}}`
- `{{scope_targets}}`

Findings insertion markers:
- `{{FINDINGS_START}}`
- `{{FINDINGS_END}}`

## Required Script Properties
Set in Apps Script > Project Settings > Script Properties:
- `TEMPLATE_ID`
- `FOLDER_ID`
- `GEMINI_API_KEY`
- `JOB_SIGNING_SECRET`
- `FINALIZE_URL`
- `FINALIZE_BEARER_TOKEN`

Optional:
- `ALLOWED_REQUESTER_EMAILS` (example: `connor@msppentesting,zack@msppentesting`)

## Required Webapp Environment Variables
Set in Vercel for this app:
- `APPS_SCRIPT_REPORT_JOB_URL`
- `APPS_SCRIPT_JOB_SIGNING_SECRET`
- `APPS_SCRIPT_FINALIZE_BEARER_TOKEN`

## Finalize Endpoint
Apps Script uploads generated artifacts to:
- `POST /api/admin/report-engine/finalize`

Response includes:
- `pdfSignedUrl`
- `docxSignedUrl`
- `pdfSignedUrlExpiresAt`
- `docxSignedUrlExpiresAt`
- `accessUrl` (authenticated PDF route)
