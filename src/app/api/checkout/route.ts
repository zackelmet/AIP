import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyAuth } from "@/lib/auth/verifyAuth";
import { rateLimitDistributed } from "@/lib/security/distributedRateLimit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Server-side source of truth: every purchasable Stripe price maps to exactly
// one credit type. The client may choose a price, but it can never choose the
// product or the metadata that the webhook credits.
const PRICE_TO_PENTEST: Record<
  string,
  "external_ip" | "web_app" | "pentest_plus"
> = {};
function allowPrice(
  id: string | undefined,
  type: "external_ip" | "web_app" | "pentest_plus",
) {
  if (id) PRICE_TO_PENTEST[id] = type;
}
allowPrice(process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_SINGLE, "external_ip");
allowPrice(process.env.NEXT_PUBLIC_STRIPE_PRICE_WEB_APP, "web_app");
allowPrice(process.env.NEXT_PUBLIC_STRIPE_PRICE_PENTEST_PLUS, "pentest_plus");
allowPrice(
  process.env.NEXT_PUBLIC_STRIPE_PRICE_EXTERNAL_IP_CONTINUOUS,
  "external_ip",
);
allowPrice(process.env.NEXT_PUBLIC_STRIPE_PRICE_WEB_APP_CONTINUOUS, "web_app");

const MAX_QUANTITY = 24;

export async function POST(request: NextRequest) {
  try {
    const token = await verifyAuth(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = token.uid;

    const rl = await rateLimitDistributed(`checkout:${userId}`, 20, 3_600_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await request.json().catch(() => ({}));
    const priceId = typeof body.priceId === "string" ? body.priceId : "";
    const pentestType = PRICE_TO_PENTEST[priceId];
    if (!pentestType) {
      return NextResponse.json(
        { error: "Invalid or unsupported price" },
        { status: 400 },
      );
    }

    const requestedQuantity = Number(body.quantity ?? 1);
    const quantity =
      Number.isInteger(requestedQuantity) &&
      requestedQuantity >= 1 &&
      requestedQuantity <= MAX_QUANTITY
        ? requestedQuantity
        : NaN;
    if (!Number.isFinite(quantity)) {
      return NextResponse.json(
        { error: `Quantity must be between 1 and ${MAX_QUANTITY}` },
        { status: 400 },
      );
    }

    const verifiedEmail =
      token.email || (typeof body.email === "string" ? body.email : "");
    const cadence =
      body?.metadata?.continuousCadence === "quarterly" ||
      body?.metadata?.continuousCadence === "monthly"
        ? body.metadata.continuousCadence
        : null;

    const metadata: Record<string, string> = {
      userId,
      productType: "one-time",
      pentestType,
      ...(cadence ? { continuousCadence: cadence } : {}),
    };

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity }],
      mode: "payment",
      success_url: `${siteUrl}/app/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/app/dashboard?canceled=true`,
      ...(verifiedEmail ? { customer_email: verifiedEmail } : {}),
      invoice_creation: {
        enabled: true,
        invoice_data: { metadata: { ...metadata } },
      },
      metadata,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
