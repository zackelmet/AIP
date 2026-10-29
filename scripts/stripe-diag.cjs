const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "..", ".env.vercel.prod") });
const Stripe = require("stripe");

const KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_URL_STRIPE_SECRET || "";
if (!KEY) {
  console.error("no stripe key loaded");
  process.exit(1);
}
console.log("key loaded:", KEY.slice(0, 9) + "..." + KEY.slice(-4), "| live:", KEY.startsWith("sk_live"));

const stripe = new Stripe(KEY, { apiVersion: "2023-10-16" });
const cust = "cus_UIxn2C7dMVnyo4";
const since = Math.floor(Date.now() / 1000) - 4 * 24 * 3600;

async function main() {
  const sections = [];

  // 1) Checkout sessions for this customer
  const sessions = await stripe.checkout.sessions.list({ customer: cust, created: { gte: since }, limit: 20 });
  sections.push("CHECKOUT SESSIONS (customer):");
  for (const s of sessions.data) {
    let qty = 1;
    try { const ex = await stripe.checkout.sessions.retrieve(s.id, { expand: ["line_items"] }); qty = ex.line_items?.data?.[0]?.quantity ?? 1; } catch {}
    console.log(s.id, "| created:", new Date(s.created*1000).toISOString(), "| status:", s.payment_status, "| amt:", (s.amount_total||0)/100, "| mode:", s.mode, "| qty:", qty);
    console.log("   metadata:", JSON.stringify(s.metadata || {}));
  }

  // 2) checkout.session.completed events (all, for this app) — confirm they exist & delivery
  const evs = await stripe.events.list({ type: "checkout.session.completed", created: { gte: since }, limit: 50 });
  sections.push("\nCHECKOUT.SESSION.COMPLETED EVENTS (last 4d):");
  let match = 0;
  for (const e of evs.data) {
    const obj = e.data?.object || {};
    const email = obj.customer_email || (obj.metadata||{}).userEmail || "";
    const custId = obj.customer || "";
    if (!custId) continue;
    const isMatch = custId === cust || (email||"").toLowerCase() === "thawes@castatus.com";
    console.log(e.id, "| created:", new Date(e.created*1000).toISOString(), "| api:", e.api_version, "| req:", e.request?.id || "n/a");
    console.log("   obj customer:", custId, "| email:", email, "| metadata:", JSON.stringify(obj.metadata||{}));
    console.log("   whEndpoint:", e.data?.object?.updatedAt ? "" : (obj.id||""));
    if (isMatch) match++;
  }
  console.log("matched events for thawes:", match);

  // 3) Webhook endpoints configured
  sections.push("\nWEBHOOK ENDPOINTS:");
  const wbs = await stripe.webhookEndpoints.list({ limit: 100 });
  for (const wb of wbs.data) {
    console.log(wb.id, "| url:", wb.url, "| status:", wb.status, "| enabled_events:", JSON.stringify(wb.enabled_events.slice(0,20)), (wb.enabled_events.includes("*")?"(ALL)":""));
  }
}

main().catch((e) => {
  console.error("STRIPE ERROR:", e.type, e.statusCode, e.message?.slice(0,200));
  process.exit(1);
});