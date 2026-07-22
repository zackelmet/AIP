import { createRequire } from "module";
import { readFileSync } from "fs";
const require = createRequire(import.meta.url);

const envLocal = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const envVercel = readFileSync(new URL("../.env.vercel", import.meta.url), "utf-8");
for (const line of (envLocal + "\n" + envVercel).split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  v = v.replace(/\\n/g, "\n");
  process.env[k] = v;
}

// 4 findings from the successful Gemini run on Juice Shop
const findings = [
  {
    title: "SQL Injection in User Login (/rest/user/login) leading to Auth Bypass",
    description: "The **`email`** parameter in the **`/rest/user/login`** endpoint is vulnerable to SQL injection due to improper input sanitization and string concatenation in SQL database query construction. An unauthenticated attacker can supply a SQL injection payload to bypass authentication completely and log in as the administrative user `admin@juice-sh.op`.",
    poc: "Send a POST request to `/rest/user/login` with `{\"email\": \"' OR 1=1--\", \"password\": \"arbitrary\"}`. Observe HTTP 200 containing an admin JWT token for `admin@juice-sh.op`.",
    impact: "Complete authentication bypass allowing an unauthenticated external attacker to obtain full administrative privileges, issue privileged API requests, and access sensitive customer and system data.",
    remediation: "Use parameterized queries (prepared statements) or an ORM with built-in parameter binding when querying the user database during authentication. Never concatenate user-supplied input directly into SQL statement strings.",
    cvss: 9.8,
    cvssValue: "9.8",
    severity: "Critical",
    cwe: "CWE-89",
    endpoint: "/rest/user/login",
    references: ["https://cwe.mitre.org/data/definitions/89.html"]
  },
  {
    title: "Insecure Direct Object Reference (IDOR) in Shopping Basket Endpoint (/rest/basket)",
    description: "The `/rest/basket/{basketId}` endpoint contains an IDOR vulnerability. The application fails to verify whether the authenticated user making the request is the owner of the requested basket ID, allowing any logged-in user to view the shopping cart contents and order items of any other user.",
    poc: "Authenticate as a standard non-admin user (User ID 2), then GET `/rest/basket/1` with the user 2 JWT token. Observe HTTP 200 returning basket items of User ID 1 (admin).",
    impact: "Unauthorized disclosure of other users' shopping carts, purchase history, and personal order data across user accounts.",
    remediation: "Enforce authorization checks on `/rest/basket/{basketId}` to verify that the `UserId` associated with the requested `basketId` matches the `id` in the authenticated user's JWT session token before returning data.",
    cvss: 6.5,
    cvssValue: "6.5",
    severity: "Medium",
    cwe: "CWE-639",
    endpoint: "/rest/basket/{basketId}",
    references: ["https://cwe.mitre.org/data/definitions/639.html"]
  },
  {
    title: "Stored Cross-Site Scripting (XSS) in Product Reviews (/rest/products/{id}/reviews)",
    description: "The product review endpoint `/rest/products/{id}/reviews` is vulnerable to Stored XSS. User-supplied content in the `message` field is saved without sanitization or HTML encoding and subsequently rendered in the victim's browser when reviewing product details.",
    poc: "PUT `/rest/products/1/reviews` with `{\"message\": \"<iframe src=\\\"javascript:alert(1)\\\">\", \"author\": \"user\"}`. Then GET `/rest/products/1/reviews` and observe the HTML payload returned unencoded in the `message` property.",
    impact: "Execution of arbitrary JavaScript in the context of victim users' browser sessions when viewing product pages, enabling session hijacking, DOM manipulation, credential theft, and unauthorized actions.",
    remediation: "Sanitize user input before storing in the database or enforce context-aware HTML entity encoding in the web frontend prior to rendering user-supplied review messages.",
    cvss: 8.7,
    cvssValue: "8.7",
    severity: "High",
    cwe: "CWE-79",
    endpoint: "/rest/products/{id}/reviews",
    references: ["https://cwe.mitre.org/data/definitions/79.html"]
  },
  {
    title: "Broken Function Level Authorization (BFLA) on User Listing Endpoint (/api/Users)",
    description: "The `/api/Users` REST endpoint fails to enforce role-based access controls. Any authenticated user holding a standard customer role (`role: \"customer\"`) can GET `/api/Users` and retrieve the full list of registered user accounts.",
    poc: "Authenticate as a standard customer account (e.g. `jim@juice-sh.op`), then GET `/api/Users` with the customer JWT token. Observe HTTP 200 returning data for all user accounts.",
    impact: "Systemic information disclosure and user enumeration across all registered accounts, enabling targeted account takeover attempts, social engineering, and intelligence gathering for administrative account targets.",
    remediation: "Implement role-based authorization middleware (RBAC) on the `/api/Users` endpoint to ensure that only authenticated requests with `role === \"admin\"` are permitted to access user management resources.",
    cvss: 6.5,
    cvssValue: "6.5",
    severity: "Medium",
    cwe: "CWE-862",
    endpoint: "/api/Users",
    references: ["https://cwe.mitre.org/data/definitions/862.html"]
  }
];

const PENTEST_WEBHOOK_SECRET = (process.env.PENTEST_WEBHOOK_SECRET || "").replace(/\n/g, "").trim();
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://affordable-pentesting.vercel.app").replace(/\n/g, "").trim();

async function main() {
  // Init Firebase
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      storageBucket: (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").replace(/^["']|["']$/g, ""),
    });
  }
  const db = admin.firestore();

  // Create pentest doc
  const pentestRef = db.collection("pentests").doc();
  await pentestRef.set({
    id: pentestRef.id,
    userId: "cavIKo2TsLYIZuEBwYWnNCQxzlC3",
    type: "web_app",
    targetUrl: "http://172.17.0.1:3000",
    targets: ["http://172.17.0.1:3000"],
    status: "running",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    vulnerabilities: [],
    results: null,
    completedAt: null,
  });
  console.log("Pentest created:", pentestRef.id);

  // POST to callback
  const callbackUrl = `${SITE_URL}/api/pentests/callback`;
  console.log("POST to callback:", callbackUrl);

  const res = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": PENTEST_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      pentestId: pentestRef.id,
      findings,
    }),
  });

  const result = await res.json();
  console.log("Callback response:", JSON.stringify(result, null, 2));

  if (res.ok) {
    console.log("\n=== SUCCESS ===");
    console.log(`Check /admin/review at ${SITE_URL}`);
    console.log(`Pentest ID: ${pentestRef.id}`);
  }
}

main().catch(console.error);
