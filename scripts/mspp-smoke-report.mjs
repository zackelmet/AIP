/**
 * Smoke test for the reporting engine — creates a pentest with 4 mock findings
 * and POSTs to the callback endpoint. No Strix tokens are burned.
 *
 * Usage (from the AIP directory, using its node_modules):
 *   node scripts/mspp-smoke-report.mjs [--report] [--local]
 *
 *   --report  Also download the generated PDF to /tmp/opencode
 *   --local   Run against localhost:3000 instead of production
 */
import admin from "firebase-admin";
import { readFileSync, writeFileSync } from "fs";
import { setTimeout as sleep } from "timers/promises";

// Load the MSPP AI portal's env (not AIP's)
const envText = readFileSync(new URL("../../mspp-ai-pentesting/.env.local", import.meta.url), "utf-8");
// BufferedReader for multi-line values (private keys)
const lines = envText.split("\n");
let buf = null;
for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  if (buf) {
    buf.val += "\n" + t;
    if (t.endsWith('"')) {
      let v = buf.val.replace(/^"(.*)"\s*$/s, "$1");
      if (buf.key.includes("PRIVATE_KEY")) v = v.replace(/\\n/g, "\n");
      process.env[buf.key] = v;
      buf = null;
    }
    continue;
  }
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const key = t.slice(0, eq).trim();
  let val = t.slice(eq + 1).trim();
  if (val.startsWith('"') && !val.endsWith('"')) {
    buf = { key, val };
    continue;
  }
  val = val.replace(/^"(.*)"\s*$/, "$1").replace(/\\n/g, "\n");
  process.env[key] = val;
}

const IS_LOCAL = process.argv.includes("--local");
const DOWNLOAD_REPORT = process.argv.includes("--report");
const BASE_URL = IS_LOCAL ? "http://localhost:3000" : "https://dashboard.msppentesting.com";

const findings = [
  {
    title: "SQL Injection in User Login (/rest/user/login) leading to Auth Bypass",
    description: "The email parameter in /rest/user/login is vulnerable to SQL injection due to improper input sanitization and string concatenation in the SQL query construction. An unauthenticated attacker can bypass authentication completely and log in as the administrative user.",
    poc: "POST /rest/user/login with {\"email\": \"' OR 1=1--\", \"password\": \"arbitrary\"}. Observe HTTP 200 containing an admin JWT token.",
    impact: "Complete authentication bypass allowing an unauthenticated external attacker to obtain full administrative privileges and access sensitive data.",
    remediation: "Use parameterized queries or an ORM with parameter binding. Never concatenate user-supplied input into SQL strings.",
    cvss: 9.8,
    cvssValue: "9.8",
    severity: "Critical",
    references: ["https://cwe.mitre.org/data/definitions/89.html"],
  },
  {
    title: "Stored Cross-Site Scripting (XSS) in Product Reviews",
    description: "The product review endpoint is vulnerable to Stored XSS. User-supplied content in the message field is saved without sanitization and rendered in the victim's browser.",
    poc: "PUT /rest/products/1/reviews with {\"message\": \"<iframe src=\\\"javascript:alert(1)\\\">\"}. Observe the HTML payload returned unencoded.",
    impact: "Execution of arbitrary JavaScript in victim users' browser sessions, enabling session hijacking and credential theft.",
    remediation: "Sanitize user input before storing or enforce context-aware HTML entity encoding prior to rendering.",
    cvss: 8.7,
    cvssValue: "8.7",
    severity: "High",
    references: ["https://cwe.mitre.org/data/definitions/79.html"],
  },
  {
    title: "Insecure Direct Object Reference (IDOR) in Shopping Basket Endpoint",
    description: "The /rest/basket/{basketId} endpoint fails to verify whether the authenticated user is the owner of the requested basket ID, allowing any logged-in user to view other users' cart contents.",
    poc: "Authenticate as a standard non-admin user, then GET /rest/basket/1. Observe HTTP 200 returning basket items of another user.",
    impact: "Unauthorized disclosure of other users' shopping carts, purchase history, and personal order data.",
    remediation: "Enforce authorization checks to verify the basket's owner matches the authenticated user's session token.",
    cvss: 6.5,
    cvssValue: "6.5",
    severity: "Medium",
    references: ["https://cwe.mitre.org/data/definitions/639.html"],
  },
  {
    title: "Broken Function Level Authorization (BFLA) on User Listing Endpoint",
    description: "The /api/Users endpoint fails to enforce role-based access controls. Any authenticated user with the customer role can retrieve the full list of registered user accounts.",
    poc: "Authenticate as a standard customer, then GET /api/Users with the customer JWT. Observe HTTP 200 returning all user accounts.",
    impact: "Systemic information disclosure and user enumeration across all registered accounts, enabling targeted account takeover attempts.",
    remediation: "Implement role-based authorization middleware to ensure only admin-role requests can access user management resources.",
    cvss: 6.5,
    cvssValue: "6.5",
    severity: "Medium",
    references: ["https://cwe.mitre.org/data/definitions/862.html"],
  },
];

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
    storageBucket: (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").replace(/^"|"$/g, ""),
  });
}
const db = admin.firestore();

async function main() {
  console.log(`\n🚀  REPORT ENGINE SMOKE TEST (no Strix tokens)`);
  console.log(`   Target  : ${BASE_URL}/api/pentests/callback`);

  const pentestRef = db.collection("pentests").doc();
  await pentestRef.set({
    id: pentestRef.id,
    userId: "smoke-test",
    type: "ai_pentest",
    targetUrl: "juice-shop.example.com",
    targets: ["juice-shop.example.com"],
    status: "running",
    billingMode: "credits",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    vulnerabilities: [],
    results: null,
    completedAt: null,
  });
  console.log(`   Pentest : ${pentestRef.id}`);

  const res = await fetch(`${BASE_URL}/api/pentests/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": process.env.PENTEST_WEBHOOK_SECRET || "",
    },
    body: JSON.stringify({ pentestId: pentestRef.id, findings }),
  });
  const result = await res.json();
  console.log(`   Callback: ${JSON.stringify(result, null, 2)}`);

  if (!res.ok) {
    console.error("\n❌ CALLBACK FAILED");
    process.exit(1);
  }

  const doc = await pentestRef.get();
  const data = doc.data();
  console.log(`\n   status: ${data?.status}`);
  console.log(`   findings: ${(data?.vulnerabilities || []).length}`);
  console.log(`   reportId: ${data?.reportId || "—"}`);

  if (DOWNLOAD_REPORT && data?.reportStoragePath) {
    const bucket = admin.storage().bucket();
    const [contents] = await bucket.file(data.reportStoragePath).download();
    const filename = `smoke-report-${pentestRef.id}.pdf`;
    writeFileSync(`/tmp/opencode/${filename}`, contents);
    console.log(`   PDF saved: /tmp/opencode/${filename} (${contents.length} bytes)`);
  }

  console.log(`\n=== SUCCESS ===`);
  console.log(`   Pentest ID: ${pentestRef.id}`);
  console.log(`   Report ID: ${result.reportId || "—"}`);
}

main().catch((e) => {
  console.error("Unhandled:", e);
  process.exit(1);
});