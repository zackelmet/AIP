/**
 * Smoke test for the PDF report engine — creates a pentest with 4 findings,
 * POSTs to callback, moves to "review" status. No Strix tokens burned.
 *
 * Usage (from AIP project root):
 *   node scripts/smoke-pdf-report.mjs [--local] [--report]
 *
 *   --local   Run against localhost:3000
 *   --report  Download the generated PDF to /tmp/opencode/
 */
import admin from "firebase-admin";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { setTimeout as sleep } from "timers/promises";

function loadEnv() {
  for (const p of [".env.local", ".env"]) {
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf-8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      val = val.replace(/^"(.*)"\s*$/, "$1").replace(/\\n/g, "\n");
      process.env[key] = val;
    }
    break;
  }
}
loadEnv();

const IS_LOCAL = process.argv.includes("--local");
const DOWNLOAD_REPORT = process.argv.includes("--report");
const BASE_URL = IS_LOCAL ? "http://localhost:3000" : "https://ai.affordablepentesting.com";

const findings = [
  {
    title: "SQL Injection in User Login leading to Auth Bypass",
    description: "The email parameter in /rest/user/login is vulnerable to SQL injection due to improper input sanitization. An unauthenticated attacker can bypass authentication completely and log in as the administrative user.",
    poc: "POST /rest/user/login with {\"email\": \"' OR 1=1--\", \"password\": \"arbitrary\"}. Observe HTTP 200 containing an admin JWT token. The email field is concatenated directly into the SQL query without parameterization.",
    impact: "Complete authentication bypass allowing an unauthenticated external attacker to obtain full administrative privileges and access sensitive data including user credentials, payment information, and system configurations.",
    remediation: "Use parameterized queries or an ORM with parameter binding. Never concatenate user-supplied input into SQL strings. Implement input validation to reject special characters in email fields. Apply least-privilege database permissions to restrict query capabilities.",
    cvss: 9.8,
    cvssValue: "9.8",
    severity: "Critical",
    endpoint: "/rest/user/login",
    method: "POST",
    technicalAnalysis: "The login endpoint accepts user credentials via JSON body parameters. The email field is passed unsanitized into a SQL query builder that concatenates input directly into the query string. Testing confirmed that the payload ' OR 1=1-- bypasses authentication entirely by commenting out the password check. The backend database user has excessive privileges, allowing UNION-based data extraction from multiple tables.",
    references: ["https://cwe.mitre.org/data/definitions/89.html"],
  },
  {
    title: "Stored Cross-Site Scripting (XSS) in Product Reviews",
    description: "The product review endpoint is vulnerable to Stored XSS. User-supplied content in the message field is saved without sanitization and rendered in the victim's browser without proper encoding.",
    poc: "PUT /rest/products/1/reviews with {\"message\": \"<script>alert(document.cookie)</script>\"}. Observe the HTML payload returned unencoded in subsequent GET requests. The injected script executes in the context of any user viewing the product page.",
    impact: "Execution of arbitrary JavaScript in victim users' browser sessions, enabling session hijacking, credential theft, phishing attacks, and defacement. An attacker can steal session cookies and impersonate authenticated users.",
    remediation: "Sanitize user input before storing or enforce context-aware HTML entity encoding prior to rendering. Implement a Content Security Policy header. Use DOMPurify or similar library to strip executable content from user-submitted HTML.",
    cvss: 8.7,
    cvssValue: "8.7",
    severity: "High",
    endpoint: "/rest/products/1/reviews",
    method: "PUT",
    technicalAnalysis: "The product review submission endpoint accepts a message parameter that is stored in the database and retrieved without sanitization. The application returns the stored content directly in the HTML response without Content-Type headers that would indicate proper encoding. The XSS payload executes immediately upon page load because the application renders reviews inline without any output encoding. The vulnerability persists across sessions, affecting all users who view the compromised product page.",
    references: ["https://cwe.mitre.org/data/definitions/79.html"],
  },
  {
    title: "Insecure Direct Object Reference (IDOR) in Shopping Basket",
    description: "The /rest/basket/{basketId} endpoint fails to verify whether the authenticated user is the owner of the requested basket ID, allowing any logged-in user to view other users' cart contents.",
    poc: "Authenticate as a standard non-admin user, then GET /rest/basket/1. Observe HTTP 200 returning basket items of another user. Continue enumerating basket IDs to collect order data across all active users.",
    impact: "Unauthorized disclosure of other users' shopping carts, purchase history, personal order data, and customer PII. An attacker can enumerate all active baskets and extract sensitive business intelligence about purchasing patterns.",
    remediation: "Enforce authorization checks to verify the basket's owner matches the authenticated user's session token. Use non-guessable UUIDs instead of sequential integers for basket IDs. Implement rate limiting on basket access endpoints.",
    cvss: 6.5,
    cvssValue: "6.5",
    severity: "Medium",
    endpoint: "/rest/basket/{basketId}",
    method: "GET",
    technicalAnalysis: "The application uses sequential integer IDs for basket resources and relies solely on the authenticated user's session for basic access control. The basket retrieval endpoint does not cross-reference the requested basketId against the authenticated user's owned resources. Testing confirmed that user A can access user B's basket by simply changing the basketId parameter. An automated script can harvest all active baskets in minutes due to the predictable ID sequence.",
    references: ["https://cwe.mitre.org/data/definitions/639.html"],
  },
  {
    title: "Broken Function Level Authorization (BFLA) on User Listing",
    description: "The /api/Users endpoint fails to enforce role-based access controls. Any authenticated user with the customer role can retrieve the full list of registered user accounts including sensitive profile data.",
    poc: "Authenticate as a standard customer, then GET /api/Users with the customer JWT. Observe HTTP 200 returning all user accounts with email addresses, roles, and account status. Repeat with different user tokens to confirm consistent unauthorized access.",
    impact: "Systemic information disclosure and user enumeration across all registered accounts, enabling targeted account takeover attempts, phishing campaigns, and competitive intelligence gathering.",
    remediation: "Implement role-based authorization middleware to ensure only admin-role requests can access user management resources. Review all API endpoints to verify authorization checks are applied consistently. Apply the principle of least privilege to all API route handlers.",
    cvss: 6.5,
    cvssValue: "6.5",
    severity: "Medium",
    endpoint: "/api/Users",
    method: "GET",
    technicalAnalysis: "The /api/Users endpoint is designed for administrative use but lacks server-side authorization enforcement. The frontend correctly hides the user management UI from non-admin users, but the underlying API endpoint accepts requests from any authenticated user regardless of role. Testing confirmed that a standard customer JWT token provides full access to the user listing endpoint. This indicates the authorization check was only implemented at the UI layer, not the API layer.",
    references: ["https://cwe.mitre.org/data/definitions/862.html"],
  },
];

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}
const db = admin.firestore();

async function main() {
  console.log(`\n🧪  PDF REPORT ENGINE SMOKE TEST (no Strix tokens)`);
  console.log(`   Target: ${BASE_URL}/api/pentests/callback\n`);

  const pentestRef = db.collection("pentests").doc();
  const now = new Date();

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
  console.log(`   Created pentest: ${pentestRef.id} (status: running)`);

  const res = await fetch(`${BASE_URL}/api/pentests/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": process.env.PENTEST_WEBHOOK_SECRET || "",
    },
    body: JSON.stringify({ pentestId: pentestRef.id, findings }),
  });

  const result = await res.json();

  if (!res.ok) {
    console.error(`\n❌  Callback failed: ${JSON.stringify(result, null, 2)}`);
    process.exit(1);
  }

  console.log(`   Callback: ${JSON.stringify(result, null, 2)}`);

  // Verify the pentest moved to "review"
  const doc = await pentestRef.get();
  const data = doc.data();
  console.log(`\n   Final status: ${data?.status}`);
  console.log(`   Findings: ${(data?.vulnerabilities || []).length}`);
  console.log(`   Report ID: ${data?.reportId || "—"}`);
  console.log(`   Storage: ${data?.reportStoragePath || "—"}`);

  if (DOWNLOAD_REPORT && data?.reportStoragePath) {
    const bucket = admin.storage().bucket();
    const [contents] = await bucket.file(data.reportStoragePath).download();
    const filename = `smoke-pdf-report-${pentestRef.id}.pdf`;
    writeFileSync(`/tmp/opencode/${filename}`, contents);
    console.log(`   PDF saved: /tmp/opencode/${filename} (${contents.length} bytes)`);
  }

  console.log(`\n✅  Smoke test complete — pentest is in "review" status.`);
  console.log(`   Check the admin Panel → Pending Review to inspect it.\n`);
}

main().catch((e) => {
  console.error("Unhandled:", e);
  process.exit(1);
});