/**
 * Smoke test for the mspp AI portal reporting engine (no token burn).
 *
 * 1. Mints a custom token → ID token for zack@msppentesting.com
 * 2. Sets user-level white-label branding on that user
 * 3. Creates a Firestore pentest doc in status=running
 * 4. POSTs 4 mock findings to the AI portal callback
 * 5. Verifies status → review + report storage path written
 *
 * Usage:
 *   node scripts/mspp-smoke-callback.mjs
 */

import admin from "firebase-admin";
import { readFileSync } from "fs";

const env = readFileSync(new URL("../../mspp-ai-pentesting/.env.local", import.meta.url), "utf-8");
for (const line of env.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  v = v.replace(/^"(.*)"\s*$/, "$1").replace(/\\n/g, "\n");
  process.env[k] = v;
}

const BASE_URL = "https://dashboard.msppentesting.com";
const SMOKE_EMAIL = "zack@msppentesting.com";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PENTEST_WEBHOOK_SECRET = (process.env.PENTEST_WEBHOOK_SECRET || "").trim();

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
    cwe: "CWE-89",
    endpoint: "/rest/user/login",
    references: ["https://cwe.mitre.org/data/definitions/89.html"],
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
    cwe: "CWE-639",
    endpoint: "/rest/basket/{basketId}",
    references: ["https://cwe.mitre.org/data/definitions/639.html"],
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
    cwe: "CWE-79",
    endpoint: "/rest/products/{id}/reviews",
    references: ["https://cwe.mitre.org/data/definitions/79.html"],
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
    cwe: "CWE-862",
    endpoint: "/api/Users",
    references: ["https://cwe.mitre.org/data/definitions/862.html"],
  },
];

async function getIdToken(uid) {
  const customToken = await admin.auth().createCustomToken(uid);
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok || !data.idToken) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  return data.idToken;
}

async function main() {
  console.log("\n🚀 MSPP AI PORTAL REPORTING SMOKE TEST (no scan)");
  console.log(`   Endpoint : ${BASE_URL}/api/pentests/callback`);

  const user = await admin.auth().getUserByEmail(SMOKE_EMAIL);
  const uid = user.uid;
  const idToken = await getIdToken(uid);
  console.log(`   User     : ${SMOKE_EMAIL} (${uid})`);

  // 1. Set white-label branding on the user
  console.log("\n1️⃣  Set white-label branding…");
  await db.collection("users").doc(uid).update({
    branding: {
      companyName: "Zack Consulting",
      logoUrl: "https://cdn.prod.website-files.com/679955125defbec984e494f9/67a8f5854bf28c588cac454e_logo-blue-transparent%20(2).avif",
      primaryColor: "#16a34a",
      emailSender: "zack@msppentesting.com",
      footerText: "Confidential — prepared by Zack Consulting",
      whiteLabelEnabled: true,
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("   Branding saved ✓");

  // 2. Create pentest doc in running state
  console.log("\n2️⃣  Create pentest doc (status=running)…");
  const pentestRef = db.collection("pentests").doc();
  await pentestRef.set({
    id: pentestRef.id,
    userId: uid,
    type: "ai_pentest",
    targetUrl: "http://172.17.0.1:3000",
    targets: ["http://172.17.0.1:3000"],
    status: "running",
    billingMode: "credits",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    vulnerabilities: [],
    results: null,
    completedAt: null,
  });
  console.log(`   Pentest created: ${pentestRef.id}`);

  // 3. POST to callback
  console.log("\n3️⃣  POST findings to callback…");
  const res = await fetch(`${BASE_URL}/api/pentests/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": PENTEST_WEBHOOK_SECRET,
    },
    body: JSON.stringify({ pentestId: pentestRef.id, findings }),
  });
  const result = await res.json();
  console.log("   Callback:", JSON.stringify(result, null, 2));

  if (!res.ok) {
    console.error("\n❌ CALLBACK FAILED");
    process.exit(1);
  }

  // 4. Verify doc state
  console.log("\n4️⃣  Verify pentest doc…");
  const doc = await pentestRef.get();
  const data = doc.data();
  const ok = data.status === "review" && data.reportStoragePath && data.reportId;
  console.log(`   status: ${data.status}`);
  console.log(`   findings: ${(data.vulnerabilities || []).length}`);
  console.log(`   reportId: ${data.reportId || "—"}`);
  console.log(`   reportStoragePath: ${data.reportStoragePath || "—"}`);

  if (ok) {
    console.log("\n=== SUCCESS ===");
    console.log(`Report stored at gs://${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/${data.reportStoragePath}`);
    console.log(`Check admin /admin?tab=pentests at ${BASE_URL}`);
  } else {
    console.error("\n❌ Report not generated correctly");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Unhandled:", e);
  process.exit(1);
});
