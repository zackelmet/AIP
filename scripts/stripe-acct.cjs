const path = require("path");
const dotenv = require("dotenv");
const envFile = process.argv[2];
dotenv.config({ path: path.resolve(envFile) });
const Stripe = require("stripe");

const KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY || "";
if (!KEY) {
  console.error("[", envFile, "] no stripe key");
  process.exit(1);
}
const stripe = new Stripe(KEY, { apiVersion: "2023-10-16" });
const since = Math.floor(Date.now() / 1000) - 5 * 24 * 3600;

async function main() {
  const acct = await stripe.account.retrieve();
  console.log("\n===== " + envFile.split("/").slice(-1)[0] + " =====");
  console.log("ACCOUNT:", acct.id, "|", acct.business_profile?.name || acct.email || "");
  console.log("key:", KEY.slice(0,9) + "..." + KEY.slice(-4), "live:", KEY.startsWith("sk_live"));

  const sessions = await stripe.checkout.sessions.list({ created: { gte: since }, limit: 100 });
  const hits = sessions.data.filter((s) => {
    const em = ((s.customer_email||"") + (s.customer_details?.email||"") + ((s.metadata||{}).userEmail||"")).toLowerCase();
    return em.includes("thawes") || em.includes("castatus") || (s.customer||"") === "cus_UIxn2C7dMVnyo4";
  });
  console.log("SESSIONS last 5d total:", sessions.data.length, "| thawes/castatus matches:", hits.length);
  for (const s of hits) {
    let qty = 1;
    try { const ex = await stripe.checkout.sessions.retrieve(s.id, { expand: ["line_items"] }); qty = ex.line_items?.data?.[0]?.quantity ?? 1; } catch {}
    console.log("  ", s.id, "| ", new Date(s.created*1000).toISOString(), "| status:", s.payment_status, "| amt:", (s.amount_total||0)/100, "| mode:", s.mode, "| qty:", qty, "| meta:", JSON.stringify(s.metadata||{}));
  }

  const evs = await stripe.events.list({ created: { gte: since }, limit: 100 });
  const evMatch = evs.data.filter((e) => {
    const o = e.data?.object || {};
    const em = ((o.customer_email||"") + ((o.metadata||{}).userEmail||"")).toLowerCase();
    return (o.type === "checkout.session.completed") && (em.includes("thawes") || em.includes("castatus") || (o.customer||"") === "cus_UIxn2C7dMVnyo4");
  });
  console.log("checkout.session.completed events matching thawes/castatus:", evMatch.length);
  for (const e of evMatch) console.log("  ", e.id, new Date(e.created*1000).toISOString(), "req:", e.request?.id || "no-request");

  const wbs = await stripe.webhookEndpoints.list({ limit: 100 });
  console.log("webhook endpoints:");
  for (const wb of wbs.data) console.log("  ", wb.id, wb.url, "|", wb.status, "|", wb.enabled_events.includes("*") ? "ALL" : JSON.stringify(wb.enabled_events.slice(0,6)));
}

main().catch((e) => console.error("[ERR]", envFile.split("/").slice(-1)[0], e.type, e.statusCode, e.message?.slice(0,160)));