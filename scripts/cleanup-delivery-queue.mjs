/**
 * Deletes test pentests from the delivery queue (pending_dispatch).
 *
 * Usage:
 *   node scripts/cleanup-delivery-queue.mjs            # list pending_dispatch pentests
 *   node scripts/cleanup-delivery-queue.mjs --destroy   # actually delete them
 *   node scripts/cleanup-delivery-queue.mjs --destroy --id <specificId>
 */
import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";

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

const DO_DESTROY = process.argv.includes("--destroy");
const SPECIFIC_ID = process.argv.includes("--id")
  ? process.argv[process.argv.indexOf("--id") + 1]
  : null;

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
  console.log(`\n🧹  Delivery Queue Cleanup\n`);

  let snap;
  if (SPECIFIC_ID) {
    const doc = await db.collection("pentests").doc(SPECIFIC_ID).get();
    snap = doc.exists ? { docs: [doc], size: 1, empty: false } : { docs: [], size: 0, empty: true };
  } else {
    snap = await db
      .collection("pentests")
      .limit(50)
      .get();
  }

  if (snap.empty) {
    console.log("   No pentests found.\n");
    return;
  }

  console.log(`   Found ${snap.size} pentest(s):\n`);

  const docs = [];
  snap.forEach((doc) => {
    const d = doc.data();
    docs.push({ ref: doc.ref, id: doc.id, data: d });
    const target = d.targetUrl || d.targets?.[0] || "(no target)";
    const created = d.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 16)?.replace("T", " ") || "—";
    console.log(`   [${docs.length}] ${doc.id.slice(0, 24)}..`);
    console.log(`       target: ${target}`);
    console.log(`       created: ${created}`);
    console.log(`       user: ${d.userId?.slice(0, 24) || "—"}`);
    console.log();
  });

  if (!DO_DESTROY) {
    console.log("   ⚠️  Dry run — re-run with --destroy to actually delete.\n");
    return;
  }

  const batch = db.batch();
  for (const doc of docs) {
    // Delete associated report from storage if it exists
    if (doc.data.reportStoragePath) {
      try {
        const bucket = admin.storage().bucket();
        await bucket.file(doc.data.reportStoragePath).delete();
        console.log(`   🗑  Deleted report: ${doc.data.reportStoragePath}`);
      } catch (e) {
        if (!e.message?.includes?.("does not have storage")) {
          console.log(`   ⚠️  Could not delete report: ${e.message}`);
        }
      }
    }
    // Delete associated report document from Firestore
    if (doc.data.reportId) {
      try {
        await db.collection("reports").doc(doc.data.reportId).delete();
        console.log(`   🗑  Deleted report doc: ${doc.data.reportId}`);
      } catch (e) {
        console.log(`   ⚠️  Could not delete report doc: ${e.message}`);
      }
    }
    batch.delete(doc.ref);
  }

  await batch.commit();
  console.log(`\n   ✅  Deleted ${docs.length} pentest(s).\n`);
}

main().catch((e) => {
  console.error("Unhandled:", e);
  process.exit(1);
});