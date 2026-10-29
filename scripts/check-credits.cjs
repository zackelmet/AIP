const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });
const tsConfigPaths = require("tsconfig-paths");
const tsConfig = require("../tsconfig.json");
tsConfigPaths.register({
  baseUrl: path.resolve(__dirname, "..", tsConfig.compilerOptions.baseUrl || "."),
  paths: tsConfig.compilerOptions.paths || {},
});
const { adminDb } = require("@/lib/firebase/firebaseAdmin");
const Stripe = require("stripe");

const email = "thawes@castatus.com";

async function main() {
  // 1) Find the user
  const usersSnap = await adminDb.collection("users").get();
  const user = usersSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .find((u) => (u.email || "").toLowerCase() === email.toLowerCase());

  console.log("=== USER ===");
  if (!user) {
    console.log("User not found by email");
  } else {
    console.log("uid:", user.id, "| email:", user.email, "| created:", user.createdAt?.toDate?.().toISOString?.());
    console.log("credits:", JSON.stringify(user.credits || {}));
  }

  // 2) Stripe checkout sessions in the last 3 days matching this email
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const since = Math.floor(Date.now() / 1000) - 3 * 24 * 3600;
  console.log("\n=== STRIPE SESSIONS (paid, last 3 days, email match) ===");
  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
    created: { gte: since },
  });
  let found = false;
  for (const s of sessions.data) {
    const sessionEmail = (s.customer_email || "").toLowerCase();
    const cust = s.customer_details?.email || "";
    if (sessionEmail === email.toLowerCase() || cust.toLowerCase() === email.toLowerCase() ||
        (s.metadata || {}).userEmail?.toLowerCase() === email.toLowerCase()) {
      found = true;
      console.log(`session ${s.id}`);
      console.log(`  created: ${new Date((s.created || 0) * 1000).toISOString()}`);
      console.log(`  payment_status: ${s.payment_status} | amount_total: ${(s.amount_total || 0) / 100}`);
      console.log(`  metadata: ${JSON.stringify(s.metadata || {})}`);
      console.log(`  line_items (qty = credits): `);
      try {
        const ex = await stripe.checkout.sessions.retrieve(s.id, { expand: ["line_items"] });
        for (const li of ex.line_items?.data || []) {
          console.log(`    ${li.description} x${li.quantity} @ $${(li.amount_total || 0) / 100 / (li.quantity || 1)}`);
        }
      } catch (e) {}
    }
  }
  if (!found) console.log("No sessions matched that email in the last 3 days.");

  // 3) also match by customer id on the user doc (if set)
  if (user?.stripeCustomerId || user?.customerId) {
    const cid = user.stripeCustomerId || user.customerId;
    console.log("\n=== SESSIONS for stripe customer", cid, "===");
    const cs = await stripe.checkout.sessions.list({ limit: 20, customer: cid });
    for (const s of cs.data) {
      console.log(`  ${s.id} created=${new Date(s.created*1000).toISOString()} status=${s.payment_status} amt=${(s.amount_total||0)/100}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});