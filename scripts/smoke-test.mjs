import admin from "firebase-admin";
import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Load env vars from .env.vercel + .env.local manually
const envLocal = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const envVercel = readFileSync(new URL("../.env.vercel", import.meta.url), "utf-8");
const allEnv = envLocal + "\n" + envVercel;
for (const line of allEnv.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  val = val.replace(/^"(.*)"$/, "$1");
  val = val.replace(/\\n/g, "\n");
  process.env[key] = val;
}

const PENTEST_WEBHOOK_SECRET = process.env.PENTEST_WEBHOOK_SECRET;
const VPS_JOB_RUNNER_URL = process.env.VPS_JOB_RUNNER_URL;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://affordable-pentesting.vercel.app";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.replace(/^["']|["']$/g, ""),
  });
}
const db = admin.firestore();
const auth = admin.auth();

async function main() {
  // 1. Find Zack's UID
  console.log("Looking up zack@msppentesting.com...");
  let zackUid;
  try {
    const user = await auth.getUserByEmail("zack@msppentesting.com");
    zackUid = user.uid;
    console.log(`Found Zack: uid=${zackUid}`);
  } catch {
    // Maybe it's stored in Firestore users collection but not in Auth lookup
    const usersSnap = await db.collection("users").where("email", "==", "zack@msppentesting.com").get();
    if (!usersSnap.empty) {
      zackUid = usersSnap.docs[0].id;
      console.log(`Found Zack in Firestore: uid=${zackUid}`);
    } else {
      console.error("Could not find Zack's user. Creating a lookup...");
      // List some users
      const allUsers = await db.collection("users").limit(10).get();
      for (const doc of allUsers.docs) {
        const d = doc.data();
        console.log(`  User: ${doc.id} email=${d.email} isAdmin=${d.isAdmin}`);
      }
      process.exit(1);
    }
  }

  // Check if Zack is admin
  const userDoc = await db.collection("users").doc(zackUid).get();
  const userData = userDoc.data();
  console.log(`Zack's user data:`, {
    email: userData?.email,
    isAdmin: userData?.isAdmin,
    credits: userData?.credits,
  });

  // 2. Create a pentest doc for Juice Shop
  const targetUrl = "http://172.17.0.1:3000";
  const pentestRef = db.collection("pentests").doc();
  const pentestData = {
    id: pentestRef.id,
    userId: zackUid,
    type: "web_app",
    targetUrl: targetUrl,
    targets: [targetUrl],
    userRoles: ["admin", "user"],
    status: "running",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    results: null,
    vulnerabilities: [],
    completedAt: null,
  };

  console.log(`\nCreating pentest doc: ${pentestRef.id}`);
  await pentestRef.set(pentestData);
  console.log(`Pentest created: ${pentestRef.id}`);

  // 3. Dispatch to VPS job-runner
  const payload = {
    pentestId: pentestRef.id,
    target: targetUrl,
    type: "web_app",
    callbackUrl: `${SITE_URL}/api/pentests/callback`,
    webhookSecret: PENTEST_WEBHOOK_SECRET,
    budget: 3,
  };

  console.log(`\nDispatching to VPS job-runner at ${VPS_JOB_RUNNER_URL}/jobs...`);
  console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

  const response = await fetch(`${VPS_JOB_RUNNER_URL}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  console.log(`\nVPS response (${response.status}):`, JSON.stringify(result, null, 2));

  if (response.ok) {
    console.log(`\n=== SMOKE TEST LAUNCHED ===`);
    console.log(`Pentest ID: ${pentestRef.id}`);
    console.log(`Job ID: ${result.jobId}`);
    console.log(`Target: ${targetUrl}`);
    console.log(`\nTo check job status:`);
    console.log(`  curl ${VPS_JOB_RUNNER_URL}/jobs/${result.jobId}`);
    console.log(`\nTo check pentest status:`);
    console.log(`  npx firebase firestore:get pentests/${pentestRef.id}  (or check Firebase console)`);
    console.log(`\nWhen completed, check /admin/review on ${SITE_URL}`);
  } else {
    console.error("Dispatch failed!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
