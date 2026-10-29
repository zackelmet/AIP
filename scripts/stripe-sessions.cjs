const path = require("path");
const dotenv = require("dotenv");
const envFile = process.argv[2];
dotenv.config({ path: path.resolve(envFile) });
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY, { apiVersion: "2023-10-16" });

async function main() {
  const acct = await stripe.account.retrieve();
  console.log("=====", acct.id, "|", acct.business_profile?.name || "");

  const sessions = (await stripe.checkout.sessions.list({ limit: 30 })).data;
  console.log("--- recent", sessions.length, "sessions ---");
  for (const s of sessions) {
    let qty = 1;
    try { qty = (await stripe.checkout.sessions.retrieve(s.id, { expand: ["line_items"] })).line_items?.data?.[0]?.quantity ?? 1; } catch {}
    console.log(
      s.id, "|", new Date((s.created||0)*1000).toISOString(), "|", s.payment_status,
      "| $", (s.amount_total||0)/100, "| qty", qty, "| cust", s.customer, "| email", s.customer_email || (s.customer_details?.email||"-"),
      "| meta", JSON.stringify(s.metadata||{}),
    );
  }
}

main().catch((e) => console.error("[ERR]", e.type, e.statusCode, e.message?.slice(0,160)));