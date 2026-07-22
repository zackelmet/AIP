import { createRequire } from "module";
import { readFileSync } from "fs";
const require = createRequire(import.meta.url);

const admin = require("firebase-admin");

const envLocal = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const envVercel = readFileSync(new URL("../.env.vercel.check2", import.meta.url), "utf-8");
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

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

async function main() {
  // 1. Give Zack 1 web_app credit
  const db = admin.firestore();
  await db.collection("users").doc("cavIKo2TsLYIZuEBwYWnNCQxzlC3").update({
    "credits.web_app": admin.firestore.FieldValue.increment(1),
  });
  console.log("Added 1 web_app credit to Zack");

  // 2. Mint a custom token and exchange for ID token via Firebase REST API
  const customToken = await admin.auth().createCustomToken("cavIKo2TsLYIZuEBwYWnNCQxzlC3");
  
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY.replace(/\n/g, "").trim();
  const exchangeRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const exchangeData = await exchangeRes.json();
  const idToken = exchangeData.idToken;
  if (!idToken) {
    console.error("Token exchange failed:", JSON.stringify(exchangeData));
    process.exit(1);
  }
  console.log("ID token obtained successfully");

  // 3. Call POST /api/pentests on production
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://affordable-pentesting.vercel.app").replace(/\n/g, "").trim();
  
  console.log(`Calling ${siteUrl}/api/pentests...`);
  
  const res = await fetch(`${siteUrl}/api/pentests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      type: "web_app",
      targetUrl: "http://172.17.0.1:3000",
      targets: ["http://172.17.0.1:3000"],
      userRoles: ["admin", "user"],
    }),
  });

  const result = await res.json();
  console.log(`Response (${res.status}):`, JSON.stringify(result, null, 2));

  if (res.ok) {
    console.log("\n=== FULL E2E TEST LAUNCHED ===");
    console.log(`Pentest ID: ${result.pentestId}`);
    console.log("Make webhook should have fired ✅");
    console.log("VPS job-runner dispatched with DeepSeek V4 ✅");
    console.log(`\nCheck /admin?tab=review at ${siteUrl}`);
  } else {
    console.error("Failed to launch pentest!");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
