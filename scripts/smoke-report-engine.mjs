/**
 * Smoke test for the reporting engine — replays stored pentest findings
 * through the report generator WITHOUT re-running Strix.
 *
 * Usage:
 *   node scripts/smoke-report-engine.mjs --id <pentestId> [--local]
 *   node scripts/smoke-report-engine.mjs --recent          # list last 10 with findings
 *
 * Flags:
 *   --id       Pentest document ID to replay
 *   --recent   List recent pentests with findings for interactive pick
 *   --local    Run against localhost:3000
 *   --pdf      Also download the generated PDF
 */
import admin from "firebase-admin";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createInterface } from "readline";

function loadEnv() {
  const paths = [
    ".env.local",
    ".env",
  ];
  for (const p of paths) {
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
const DOWNLOAD_PDF = process.argv.includes("--pdf");
const LIST_RECENT = process.argv.includes("--recent");
const PENTEST_ID = process.argv.includes("--id")
  ? process.argv[process.argv.indexOf("--id") + 1]
  : null;
const BASE_URL = IS_LOCAL ? "http://localhost:3000" : "https://ai.affordablepentesting.com";

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

const rl = createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise((r) => rl.question(q, r));
}

async function listRecent() {
  console.log("\n🔍  Recent pentests with findings:\n");
  const snap = await db
    .collection("pentests")
    .where("status", "in", ["review", "completed"])
    .orderBy("updatedAt", "desc")
    .limit(20)
    .get();

  const rows = [];
  snap.forEach((doc) => {
    const d = doc.data();
    const findings = d.vulnerabilities || d.results?.findings || [];
    if (findings.length === 0) return;
    rows.push({
      id: doc.id,
      target: d.targetUrl || d.targets?.[0] || "(no target)",
      findings: findings.length,
      status: d.status,
      date: d.updatedAt?.toDate?.()?.toISOString()?.slice(0, 10) || "—",
    });
  });

  if (rows.length === 0) {
    console.log("   No pentests with findings found.\n");
    return null;
  }

  rows.forEach((r, i) => {
    console.log(`   [${i + 1}] ${r.id.slice(0, 20)}.. | ${r.date} | ${r.findings} findings | ${r.target}`);
  });

  const choice = await ask("\n   Pick a number (or q to quit): ");
  if (choice.toLowerCase() === "q") return null;
  const idx = parseInt(choice, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= rows.length) {
    console.log("   Invalid choice.");
    return null;
  }
  return rows[idx].id;
}

async function fetchPentest(id) {
  const doc = await db.collection("pentests").doc(id).get();
  if (!doc.exists) {
    console.error(`\n❌  Pentest not found: ${id}`);
    return null;
  }
  return { id: doc.id, ...doc.data() };
}

async function main() {
  console.log(`\n🧪  REPORT ENGINE SMOKE TEST (no Strix tokens)`);

  let pentestId = PENTEST_ID;
  if (!pentestId && LIST_RECENT) {
    pentestId = await listRecent();
  }
  if (!pentestId) {
    console.log("\nUsage: node scripts/smoke-report-engine.mjs --id <pentestId> [--local] [--pdf]");
    console.log("       node scripts/smoke-report-engine.mjs --recent [--local] [--pdf]");
    rl.close();
    return;
  }

  const pentest = await fetchPentest(pentestId);
  if (!pentest) { rl.close(); return; }

  const findings = pentest.vulnerabilities || pentest.results?.findings || [];
  if (findings.length === 0) {
    console.error(`\n❌  Pentest ${pentestId} has no findings stored.`);
    rl.close();
    return;
  }

  console.log(`\n   Pentest : ${pentestId}`);
  console.log(`   Target  : ${pentest.targetUrl || pentest.targets?.[0] || "—"}`);
  console.log(`   Findings: ${findings.length}`);
  console.log(`   Status  : ${pentest.status}`);

  // Summarize severity breakdown
  const severityCounts = {};
  findings.forEach((f) => {
    const s = f.severity || "Unknown";
    severityCounts[s] = (severityCounts[s] || 0) + 1;
  });
  console.log(`   Severity: ${JSON.stringify(severityCounts)}`);

  // Replay findings through the report engine endpoint
  console.log(`\n📨  POSTING to ${BASE_URL}/api/pentests/callback ...`);

  const payload = {
    pentestId,
    findings: findings.map((f) => ({
      title: f.title || f.name || "",
      description: f.description || "",
      poc: f.poc || f.proofOfConcept || "",
      impact: f.impact || "",
      remediation: f.remediation || f.remediation_steps || "",
      cvss: f.cvss ?? f.cvssScore ?? 0,
      cvssValue: f.cvssValue ?? String(f.cvss ?? f.cvssScore ?? 0),
      severity: f.severity || undefined,
      references: f.references || f.cwe ? [`${f.cwe}`] : [],
    })),
  };

  // Create a new pentest doc for the re-generated report to avoid overwriting
  const newPentestRef = db.collection("pentests").doc();
  await newPentestRef.set({
    id: newPentestRef.id,
    userId: pentest.userId || "smoke-test",
    type: pentest.type || "ai_pentest",
    targetUrl: pentest.targetUrl || pentest.targets?.[0] || "",
    targets: pentest.targets || [pentest.targetUrl || ""].filter(Boolean),
    status: "running",
    billingMode: "credits",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    vulnerabilities: [],
    results: null,
    completedAt: null,
  });
  payload.pentestId = newPentestRef.id;

  console.log(`   New pentest: ${newPentestRef.id}`);

  const res = await fetch(`${BASE_URL}/api/pentests/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": process.env.PENTEST_WEBHOOK_SECRET || "",
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();

  if (!res.ok) {
    console.error(`\n❌  Callback failed: ${JSON.stringify(result)}`);
    rl.close();
    process.exit(1);
  }

  console.log(`\n✅  Report generated:`);
  console.log(`   Status      : ${result.status}`);
  console.log(`   Findings    : ${result.findingsCount}`);
  console.log(`   Report ID   : ${result.reportId}`);
  console.log(`   Pentest ID  : ${newPentestRef.id}`);

  const updatedDoc = await newPentestRef.get();
  const updated = updatedDoc.data();
  console.log(`   Storage     : ${updated?.reportStoragePath || "—"}`);

  if (DOWNLOAD_PDF && updated?.reportStoragePath) {
    try {
      const bucket = admin.storage().bucket();
      const [contents] = await bucket.file(updated.reportStoragePath).download();
      const filename = `smoke-report-${newPentestRef.id}.pdf`;
      writeFileSync(`/tmp/opencode/${filename}`, contents);
      console.log(`   PDF saved   : /tmp/opencode/${filename} (${contents.length} bytes)`);
    } catch (e) {
      console.log(`   PDF download: ${e.message}`);
    }
  }

  rl.close();
}

main().catch((e) => {
  console.error("Unhandled:", e);
  rl.close();
  process.exit(1);
});