const path = require("path");
const dotenv = require("dotenv");
const envFile = process.argv[2];
dotenv.config({ path: path.resolve(envFile) });
const Stripe = require("stripe");
const KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY || "";
const stripe = new Stripe(KEY, { apiVersion: "2023-10-16" });
const EMAIL = "thawes@castatus.com";

async function main() {
  const acct = await stripe.account.retrieve();
  console.log("=====", acct.id, "|", acct.business_profile?.name || "", "| key live:", KEY.startsWith("sk_live"));

  // customers by email
  let custs = [];
  try { custs = (await stripe.customers.list({ email: EMAIL, limit: 20 })).data; } catch (e) { console.log("  customers.list err:", e.message?.slice(0,80)); }
  console.log("customers by email:", custs.length);
  for (const c of custs) console.log("   customer:", c.id, "| created:", new Date(c.created*1000).toISOString());

  // sessions all time by email (paginate last 20)
  const sessions = (await stripe.checkout.sessions.list({ limit: 100 })).data;
  const hits = sessions.filter((s) => {
    const em = ((s.customer_email||"")+(s.customer_details?.email||"")+((s.metadata||{}).userEmail||"")).toLowerCase();
    return em.includes(EMAIL) || (custs.some(c => c.id === s.customer));
  });
  console.log("sessions total checked:", sessions.length, "| email/cust matches:", hits.length);
  for (const s of hits) {
    let qty=1; try { qty=(await stripe.checkout.sessions.retrieve(s.id,{expand:["line_items"]})).line_items?.data?.[0]?.quantity??1;}catch{}
    console.log("   ", s.id, new Date(s.created*1000).toISOString(), "|", s.payment_status, "| $", (s.amount_total||0)/100, "| qty", qty, "| mode", s.mode, "| meta", JSON.stringify(s.metadata||{}));
  }

  // charges by receipt email
  let charges = [];
  try { charges = (await stripe.charges.list({ limit: 100 })).data.filter(c => (c.receipt_email||"").toLowerCase().includes(EMAIL)); } catch { }
  console.log("charges by receipt_email:", charges.length);
  for (const ch of charges) console.log("   charge:", ch.id, ch.created ? new Date(ch.created*1000).toISOString() : "", "$", (ch.amount||0)/100, ch.status);
}

main().catch((e) => console.error("[ERR]", e.type, e.statusCode, e.message?.slice(0,160)));