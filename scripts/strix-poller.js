const admin = require("firebase-admin");
const { randomUUID } = require("crypto");

const SA_PATH = __dirname + "/service-account.json";
const POLL_INTERVAL_MS = 15000;
const JOB_RUNNER_URL = "http://localhost:18992";
const CALLBACK_URL =
  "https://ai.affordablepentesting.com/api/pentests/callback";
const WEBHOOK_SECRET =
  "9e33b83b7ae6aeda980df8152927aba5551ecd5e718b6bd475bde3902ad6ecd3";

const sa = require(SA_PATH);
const app = admin.initializeApp({
  credential: admin.credential.cert(sa),
});

const db = app.firestore();

function log(msg) {
  console.log(`[strix-poller ${new Date().toISOString()}] ${msg}`);
}

async function poll() {
  try {
    const snap = await db
      .collection("pentests")
      .where("status", "==", "running")
      .where("strixClaimedAt", "==", null)
      .orderBy("createdAt", "asc")
      .limit(5)
      .get();

    if (snap.empty) return;

    for (const doc of snap.docs) {
      const pentest = doc.data();
      const pentestId = doc.id;
      const target = pentest.targetUrl || pentest.target || "";

      if (!target) {
        log(`Skipping ${pentestId}: no target`);
        continue;
      }

      log(`Claiming pentest ${pentestId} target=${target}`);

      const jobId = randomUUID().slice(0, 8);

      // Claim atomically
      await doc.ref.update({
        strixClaimedAt: admin.firestore.FieldValue.serverTimestamp(),
        strixJobId: jobId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Dispatch to local job-runner
      const payload = {
        pentestId,
        target,
        type: pentest.type || "web_app",
        callbackUrl: CALLBACK_URL,
        webhookSecret: WEBHOOK_SECRET,
        budget: 3,
      };

      try {
        const res = await fetch(`${JOB_RUNNER_URL}/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (res.ok) {
          log(`Dispatched ${pentestId} → job ${result.jobId}`);
        } else {
          log(`Dispatch failed for ${pentestId}: ${JSON.stringify(result)}`);
          // Unclaim
          await doc.ref.update({
            strixClaimedAt: admin.firestore.FieldValue.delete(),
            strixJobId: admin.firestore.FieldValue.delete(),
          });
        }
      } catch (err) {
        log(`Dispatch error for ${pentestId}: ${err.message}`);
        await doc.ref.update({
          strixClaimedAt: admin.firestore.FieldValue.delete(),
          strixJobId: admin.firestore.FieldValue.delete(),
        });
      }
    }
  } catch (err) {
    log(`Poll error: ${err.message}`);
  }
}

log("Poller started, polling every " + POLL_INTERVAL_MS / 1000 + "s");
setInterval(poll, POLL_INTERVAL_MS);
poll(); // immediate first poll
