#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${REPORT_ENGINE_BASE_URL:-}" ]]; then
  echo "Missing REPORT_ENGINE_BASE_URL"
  exit 1
fi

if [[ -z "${ADMIN_ID_TOKEN:-}" ]]; then
  echo "Missing ADMIN_ID_TOKEN"
  exit 1
fi

PAYLOAD_FILE="${PAYLOAD_FILE:-docs/report-samples/smoke-report-payload.json}"
if [[ ! -f "$PAYLOAD_FILE" ]]; then
  echo "Payload file not found: $PAYLOAD_FILE"
  exit 1
fi

RESPONSE=$(curl -sS -X POST "${REPORT_ENGINE_BASE_URL%/}/api/admin/report-engine/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_ID_TOKEN}" \
  --data-binary "@${PAYLOAD_FILE}")

echo "$RESPONSE"

echo "$RESPONSE" | node -e '
let input="";
process.stdin.on("data", c => input += c);
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    if (data.signedUrl) {
      console.log(`\nSigned PDF URL: ${data.signedUrl}`);
      if (data.signedUrlExpiresAt) {
        console.log(`Signed URL Expires At: ${new Date(data.signedUrlExpiresAt).toISOString()}`);
      }
    }
    if (data.accessUrl) {
      console.log(`\nReport URL: ${process.env.REPORT_ENGINE_BASE_URL.replace(/\/$/, "")}${data.accessUrl}`);
    }
  } catch {}
});
'
