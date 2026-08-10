/**
 * Production smoke test — VPS dispatch approval gate (2026-08-10)
 *
 * ⚠️ POLICY: This script NEVER sends jobs to the pentest server / burns
 *      OpenRouter tokens unless `--dispatch` is passed explicitly.
 *      Default mode is launch-only: create the pentest, verify it queues as
 *      pending_dispatch, and STOP. Approval is a manual human step.
 *
 * End-to-end against https://ai.affordablepentesting.com:
 *   1. Mints an ID token for the smoke user (custom token -> identitytoolkit)
 *   2. Launches a pentest via POST /api/pentests (deducts 1 credit!)
 *   3. Asserts the pentest doc lands in status=pending_dispatch (NOT dispatching itself)
 *   4. Confirms /api/admin/active-pentests?status=pending_dispatch surfaces it
 *   [--dispatch only] 5. Approves via POST /api/pentests/<id>/dispatch -> running
 *   [--dispatch only] 6. Waits (bounded) for the VPS callback to flip the doc to review
 *
 * Usage:
 *   node scripts/smokeTestDispatch.mjs            # launch-only (NO VPS job)
 *   node scripts/smokeTestDispatch.mjs --dispatch # launch + manual-approval equivalent
 *   node scripts/smokeTestDispatch.mjs --dispatch <minutes>
 *
 * Target defaults to https://ai.affordablepentesting.com (owned/authorized).
 */

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { createRequire } from "module";
import { setTimeout as sleep } from "timers/promises";

const require = createRequire(import.meta.url);

// Load .env.local + .env.vercel (same loader as smoke-test.mjs)
for (const f of [".env.local", ".env.vercel"]) {
  const text = readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    v = v.replace(/^"(.*)"\s*$/, "$1").replace(/\\n$/, "").replace(/\\n/g, "\n");
    process.env[k] = v;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ai.affordablepentesting.com";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const VPS_RUNNER_URL = process.env.VPS_JOB_RUNNER_URL;

if (!API_KEY) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_API_KEY in env");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}
const db = admin.firestore();

const SMOKE_EMAIL = "zack@msppentesting.com";
const ALLOW_DISPATCH = process.argv.includes("--dispatch");
const TARGET = process.argv[5] || "https://ai.affordablepentesting.com";
const PENTEST_TYPE = "web_app";
const WAIT_MINUTES = Number(process.argv[3] || 10);

if (!ALLOW_DISPATCH) {
  console.log("   POLICY: launch-only mode (no --dispatch). No job will be sent to the pentest server.");
}

let passed = 0, failed = 0;
const pass = (m) => { passed++; console.log(`   ✅ ${m}`); };
const fail = (m) => { failed++; console.error(`   ❌ ${m}`); };

async function findSmokeUid() {
  try {
    const u = await admin.auth().getUserByEmail(SMOKE_EMAIL);
    return u.uid;
  } catch {
    const snap = await db.collection("users").where("email", "==", SMOKE_EMAIL).get();
    if (!snap.empty) return snap.docs[0].id;
    throw new Error(`No user found for ${SMOKE_EMAIL}`);
  }
}

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

async function waitForStatus(id, expected, min, max) {
  const end = Date.now() + max * 60_000;
  while (Date.now() < end) {
    const doc = await db.collection("pentests").doc(id).get();
    const s = doc.exists ? doc.data()?.status : null;
    if (s === expected) return doc.data();
    process.stdout.write(`   …status=${s || "?"} (waiting for ${expected})\r`);
    await sleep(min * 1000);
  }
  return null;
}

async function run() {
  console.log("\n🚀  VPS DISPATCH GATE — PROD SMOKE TEST");
  console.log(`   Target : ${BASE_URL}`);
  console.log(`   Scan   : ${PENTEST_TYPE} -> ${TARGET}`);
  console.log("═══════════════════════════════════════\n");

  const uid = await findSmokeUid();
  const idToken = await getIdToken(uid);
  const authHeader = { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };

  // 1. Launch
  console.log("1️⃣  Launch pentest via POST /api/pentests…");
  let pentestId;
  try {
    const res = await fetch(`${BASE_URL}/api/pentests`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        type: PENTEST_TYPE,
        targetUrl: TARGET,
        targets: [TARGET],
        userRoles: null,
      }),
    });
    const data = await res.json();
    if (res.ok && data.pentestId) {
      pentestId = data.pentestId;
      pass(`created ${pentestId}`);
    } else {
      fail(`HTTP ${res.status}: ${JSON.stringify(data)}`);
      return;
    }
  } catch (e) {
    fail(`create failed: ${e.message}`);
    return;
  }

  // 2. Assert pending_dispatch (the gate)
  console.log("\n2️⃣  Assert doc status = pending_dispatch…");
  const created = await waitForStatus(pentestId, "pending_dispatch", 2, 1);
  if (!created) {
    const d = await db.collection("pentests").doc(pentestId).get();
    fail(`Did not reach pending_dispatch. Actual: ${JSON.stringify(d.data()?.status)}`);
    return;
  }
  pass(`status=pending_dispatch (dispatchedBy absent: ${!created.dispatchedBy})`);

  // 3. Admin queue visible
  console.log("\n3️⃣  Admin queue /api/admin/active-pentests?status=pending_dispatch…");
  const qRes = await fetch(`${BASE_URL}/api/admin/active-pentests?status=pending_dispatch`, { headers: authHeader });
  const qData = await qRes.json();
  if (qRes.ok && (qData.pentests || []).some((p) => p.pentestId === pentestId)) {
    pass("pentest appears in the admin Pending Dispatch window");
  } else {
    fail(`queue fetch: HTTP ${qRes.status} ${JSON.stringify(qData).slice(0, 200)}`);
  }

  // 4. Dispatch (admin approve) -> running
  console.log("\n4️⃣  Approve: POST /api/pentests/" + pentestId + "/dispatch…");
  const dRes = await fetch(`${BASE_URL}/api/pentests/${pentestId}/dispatch`, {
    method: "POST",
    headers: authHeader,
  });
  const dData = await dRes.json();
  if (dRes.ok && dData.status === "running") {
    pass(`dispatch accepted -> running (VPS: ${VPS_RUNNER_URL || "?"})`);
  } else {
    fail(`dispatch: HTTP ${dRes.status}: ${JSON.stringify(dData)}`);
    return;
  }

  const dispatched = await waitForStatus(pentestId, "running", 2, 1);
  if (dispatched?.dispatchedAt) pass("doc updated: status=running, dispatchedAt set");
  else fail(`doc missing dispatchedAt: ${JSON.stringify(dispatched)}`);

  // 4b. STOP unless --dispatch was explicitly passed
  if (!ALLOW_DISPATCH) {
    console.log("\n⏹  Stopping here by policy — pentest awaits manual approval in /admin (Pending Dispatch).");
    console.log("    To continue: run  node scripts/smokeTestDispatch.mjs --dispatch");
    console.log("    (or click Approve & Dispatch in the admin Review tab).");
    console.log(`    Pentest: ${pentestId}`);
    process.exit(failed > 0 ? 1 : 0);
  }

  // 5. Make webhook fired in parallel
  console.log("\n5️⃣  Make.com webhook (parallel path)…");
  try {
    const make = await fetch(String(process.env.MAKE_WEBHOOK_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pentestId, type: PENTEST_TYPE, targetUrl: TARGET }),
    });
    pass(`webhook endpoint responds HTTP ${make.status} (joined from local env)`);
  } catch (e) {
    fail(`webhook endpoint unreachable: ${e.message}`);
  }

  // 6. Wait for VPS callback -> review
  console.log(`\n6️⃣  Waiting up to ${WAIT_MINUTES} min for VPS callback (status -> review)…`);
  const final = await waitForStatus(pentestId, "review", 15, WAIT_MINUTES);
  if (final) {
    pass(`callback received: status=review, findings=${(final.vulnerabilities || []).length}`);
  } else {
    fail("timeout waiting for status=review (job may still be running — check VPS)");
  }

  console.log("\n═══════════════════════════════════════");
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Pentest: ${pentestId}`);
  console.log("═══════════════════════════════════════");
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error("Unhandled:", e);
  process.exit(1);
});