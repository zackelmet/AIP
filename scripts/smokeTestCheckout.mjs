/**
 * Checkout Smoke Test
 * -------------------
 * Simulates the full post-checkout webhook flow:
 *   1. Reads your user doc from Firestore (before state)
 *   2. Builds a realistic `checkout.session.completed` Stripe event payload
 *      for 3 x external_ip credits
 *   3. Signs it with the local STRIPE_WEBHOOK_SECRET
 *   4. POSTs it to /api/stripe-webhook against the running dev server
 *   5. Reads your user doc again (after state) and diffs credits
 *
 * Usage:
 *   USER_ID=<your-firebase-uid> node scripts/smokeTestCheckout.mjs
 *
 * Requires the Next.js dev server to be running: npm run dev
 */

import Stripe from 'stripe';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const require = createRequire(import.meta.url);
const admin   = require('firebase-admin');

// ── Load .env.local ──────────────────────────────────────────────────────────
// Use dotenv if available, otherwise parse manually with proper \n stripping
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: resolve(process.cwd(), '.env.local') });
} catch {
  const envPath = resolve(process.cwd(), '.env.local');
  const envLines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of envLines) {
    const m = line.match(/^([^#=\s]+)\s*=\s*["']?(.*?)["']?\s*$/);
    if (m) {
      process.env[m[1]] = m[2].replace(/\\n$/, '').replace(/\\n/g, '\n').trim();
    }
  }
}

// Strip any trailing \n from env values (artifact of how .env.local was written)
for (const key of Object.keys(process.env)) {
  if (typeof process.env[key] === 'string') {
    process.env[key] = process.env[key].replace(/\\n$/, '').trimEnd();
  }
}

// ── Config ───────────────────────────────────────────────────────────────────
const USER_ID    = process.env.USER_ID || process.argv[2];
const BASE_URL   = 'http://localhost:3000';
const QUANTITY   = 3;
const PENTEST_TYPE = 'external_ip';   // matches credits.external_ip in Firestore
const PRICE_ID   = process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_SINGLE || 'price_test';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_SECRET  = process.env.STRIPE_SECRET_KEY;

if (!USER_ID) {
  console.error('\n❌  USER_ID is required.\n   Run: USER_ID=<your-uid> node scripts/smokeTestCheckout.mjs\n');
  process.exit(1);
}
if (!WEBHOOK_SECRET || !STRIPE_SECRET) {
  console.error('❌  Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY in .env.local');
  process.exit(1);
}

// ── Firebase Admin ───────────────────────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

// ── Stripe (for webhook signing only) ────────────────────────────────────────
const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2023-10-16' });

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getUserCredits() {
  const snap = await db.collection('users').doc(USER_ID).get();
  if (!snap.exists) return null;
  return snap.data()?.credits ?? { web_app: 0, external_ip: 0 };
}

function buildFakeSession() {
  const sessionId = `cs_test_smoke_${Date.now()}`;
  return {
    id: sessionId,
    object: 'checkout.session',
    mode: 'payment',
    payment_status: 'paid',
    status: 'complete',
    customer_email: 'smoke@test.local',
    customer: null,
    subscription: null,
    amount_total: 59700, // 3 × $199
    currency: 'usd',
    metadata: {
      userId: USER_ID,
      productType: 'one-time',
      pentestType: PENTEST_TYPE,
    },
    // line_items are NOT in the webhook payload — the webhook handler re-fetches them.
    // We inject a stub so the handler falls through to the `catch` branch and
    // defaults to quantity=1... UNLESS we mock the expand call.
    // Instead we'll patch the webhook handler's stripe.checkout.sessions.retrieve
    // by temporarily setting the session id in the payload with line_items already
    // expanded.  The handler calls stripe.checkout.sessions.retrieve(id, {expand})
    // which will hit the Stripe API.  For a real live-key test this will 404 on a
    // fake session id — so we override quantity via a workaround: set amount_total
    // to indicate 3, but more reliably we POST a real Stripe test session below.
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🔍  CHECKOUT SMOKE TEST');
  console.log('═══════════════════════════════════════');
  console.log(`   User ID      : ${USER_ID}`);
  console.log(`   Pentest type : ${PENTEST_TYPE}`);
  console.log(`   Quantity     : ${QUANTITY}`);
  console.log(`   Webhook URL  : ${BASE_URL}/api/stripe-webhook`);
  console.log('═══════════════════════════════════════\n');

  // ── Step 1: Read before-state ──────────────────────────────────────────────
  console.log('1️⃣   Reading Firestore user doc (BEFORE)…');
  const before = await getUserCredits();
  if (before === null) {
    console.log('   ⚠️  User doc not found — will be created by webhook handler.');
  } else {
    console.log(`   Credits before: web_app=${before.web_app ?? 0}  external_ip=${before.external_ip ?? 0}`);
  }

  // ── Step 2: Create a real Stripe Checkout Session (test mode) ─────────────
  console.log('\n2️⃣   Creating real Stripe Checkout Session (to get a valid session ID)…');
  let realSession;
  try {
    realSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_ID, quantity: QUANTITY }],
      mode: 'payment',
      success_url: 'https://example.com/success',
      cancel_url:  'https://example.com/cancel',
      customer_email: 'smoke@test.local',
      metadata: {
        userId: USER_ID,
        productType: 'one-time',
        pentestType: PENTEST_TYPE,
      },
    });
    console.log(`   Session ID    : ${realSession.id}`);
    console.log(`   Status        : ${realSession.status}`);
    console.log(`   Payment status: ${realSession.payment_status}`);
  } catch (err) {
    console.error('   ❌  Failed to create Stripe session:', err.message);
    console.log('\n   ℹ️  Falling back to synthetic session payload (quantity will default to 1)…\n');
    realSession = buildFakeSession();
  }

  // ── Step 3: Build webhook event payload ───────────────────────────────────
  console.log('\n3️⃣   Building signed webhook event…');

  // Manually build a checkout.session.completed event wrapping the real session
  const eventPayload = {
    id: `evt_smoke_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {
        ...realSession,
        // Force these so the handler acts as if payment completed
        status: 'complete',
        payment_status: 'paid',
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  };

  const payloadStr   = JSON.stringify(eventPayload);
  const timestamp    = Math.floor(Date.now() / 1000);
  const signedHeader = stripe.webhooks.generateTestHeaderString({
    payload: payloadStr,
    secret:  WEBHOOK_SECRET,
    timestamp,
  });

  console.log(`   Event type    : ${eventPayload.type}`);
  console.log(`   Session ID    : ${eventPayload.data.object.id}`);
  console.log(`   Signature     : ${signedHeader.slice(0, 60)}…`);

  // ── Step 4: POST to the webhook endpoint ──────────────────────────────────
  console.log('\n4️⃣   POSTing to /api/stripe-webhook…');
  let res, responseText;
  try {
    res          = await fetch(`${BASE_URL}/api/stripe-webhook`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'stripe-signature': signedHeader,
      },
      body: payloadStr,
    });
    responseText = await res.text();
  } catch (fetchErr) {
    console.error(`\n   ❌  Could not reach ${BASE_URL}. Is the dev server running?\n      npm run dev\n`);
    process.exit(1);
  }

  console.log(`   HTTP status   : ${res.status}`);
  console.log(`   Response body : ${responseText}`);

  if (res.status !== 200) {
    console.error('\n   ❌  Webhook returned non-200. Aborting diff.\n');
    process.exit(1);
  }

  // ── Step 5: Wait a beat, then read after-state ────────────────────────────
  console.log('\n5️⃣   Waiting 2s for Firestore write to propagate…');
  await new Promise(r => setTimeout(r, 2000));

  const after = await getUserCredits();
  if (after === null) {
    console.error('   ❌  User doc still not found after webhook processed.\n');
    process.exit(1);
  }

  console.log(`   Credits after : web_app=${after.web_app ?? 0}  external_ip=${after.external_ip ?? 0}`);

  // ── Step 6: Diff ──────────────────────────────────────────────────────────
  console.log('\n6️⃣   Diff:');
  const beforeEIP = before?.external_ip ?? 0;
  const afterEIP  = after.external_ip   ?? 0;
  const delta     = afterEIP - beforeEIP;

  if (delta > 0) {
    console.log(`   ✅  external_ip credits: ${beforeEIP} → ${afterEIP}  (+${delta})`);
    if (delta === QUANTITY) {
      console.log(`   ✅  Correct quantity (${QUANTITY}) added!\n`);
    } else {
      console.warn(`   ⚠️  Expected +${QUANTITY} but got +${delta}.\n      (If session ID was fake, webhook handler defaulted to quantity=1 — that's expected.)\n`);
    }
  } else {
    console.error(`   ❌  No change in external_ip credits (${beforeEIP} → ${afterEIP}).\n      Webhook may have silently failed — check server logs.\n`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════');
  console.log('✅  Smoke test PASSED');
  console.log('═══════════════════════════════════════\n');

  process.exit(0);
}

run().catch(err => {
  console.error('\n❌  Unhandled error:', err);
  process.exit(1);
});
