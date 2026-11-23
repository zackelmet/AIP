import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendInvoiceEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session, event.id);
        break;
      }

      case "invoice.paid": {
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment succeeded:", paymentIntent.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment failed:", paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  console.log("Checkout session completed:", session.id);

  const userId = session.metadata?.userId;
  const pentestType = session.metadata?.pentestType;
  const validCreditTypes = ["web_app", "external_ip", "pentest_plus"];

  if (!userId) {
    console.error("No userId in session metadata");
    return;
  }
  if (!pentestType || !validCreditTypes.includes(pentestType)) {
    console.error("Invalid pentestType in session metadata");
    return;
  }
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    console.warn(
      `Skipping credit grant for ${session.id}: payment_status=${session.payment_status}`,
    );
    return;
  }

  // Quantity is always derived from Stripe line items, never from the client
  // body. Cap it to the largest legitimate bundle (monthly = 12) with headroom.
  let quantity = 1;
  try {
    const expandedSession = await stripe.checkout.sessions.retrieve(
      session.id,
      {
        expand: ["line_items"],
      },
    );
    const items = expandedSession.line_items?.data || [];
    const sum = items.reduce((acc, li) => acc + (li.quantity || 0), 0);
    if (sum > 0) quantity = sum;
  } catch (e) {
    console.warn("Could not retrieve line_items, defaulting to quantity 1:", e);
  }
  quantity = Math.min(Math.max(Math.floor(quantity), 1), 24);

  const eventRef = adminDb.collection("stripeEvents").doc(eventId);
  const userRef = adminDb.collection("users").doc(userId);

  try {
    await adminDb.runTransaction(async (tx) => {
      const existing = await tx.get(eventRef);
      if (existing.exists) return;

      const userSnap = await tx.get(userRef);
      if (userSnap.exists) {
        tx.update(userRef, {
          [`credits.${pentestType}`]: FieldValue.increment(quantity),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.set(
          userRef,
          {
            uid: userId,
            email:
              session.customer_details?.email || session.customer_email || null,
            credits: {
              web_app: pentestType === "web_app" ? quantity : 0,
              external_ip: pentestType === "external_ip" ? quantity : 0,
              pentest_plus: pentestType === "pentest_plus" ? quantity : 0,
            },
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
      tx.create(eventRef, {
        eventId,
        sessionId: session.id,
        userId,
        pentestType,
        quantity,
        processedAt: FieldValue.serverTimestamp(),
      });
    });

    console.log(
      `Added ${quantity} ${pentestType} credit(s) to user ${userId} (event ${eventId})`,
    );
  } catch (error) {
    console.error("Error adding credits:", error);
    throw error;
  }
}

const INVOICE_PRODUCT_LABELS: Record<string, string> = {
  web_app: "Web Application assessment",
  external_ip: "External IP assessment",
  pentest_plus: "Pentest+ assessment",
  ai_pentest: "AI pentest",
};

/** Persist a paid invoice and email the customer a branded receipt. */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    const invoiceId = invoice.id;
    if (!invoiceId) return;

    const invRef = adminDb.collection("invoices").doc(invoiceId);
    const existing = await invRef.get();
    if (existing.exists) return; // retry guard

    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id || null;

    let userId = (invoice.metadata?.userId as string) || "";
    if (!userId && customerId) {
      const q = await adminDb
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();
      if (!q.empty) userId = q.docs[0].id;
    }
    if (!userId) {
      console.warn("invoice.paid: could not resolve user for", invoiceId);
      return;
    }

    await invRef.set({
      id: invoiceId,
      userId,
      stripeCustomerId: customerId,
      number: invoice.number || null,
      amountPaid: invoice.amount_paid ?? 0,
      currency: invoice.currency || "usd",
      status: invoice.status || null,
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
      invoicePdf: invoice.invoice_pdf || null,
      created: invoice.created ? new Date(invoice.created * 1000) : new Date(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // Historical backfills are stored for billing history but never emailed.
    const metadata = (invoice.metadata as Record<string, string> | null) || {};
    if (metadata.backfill === "true") return;

    const userSnap = await adminDb.collection("users").doc(userId).get();
    const to = userSnap.data()?.email as string | undefined;
    if (!to) return;

    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (invoice.currency || "usd").toUpperCase(),
    }).format((invoice.amount_paid ?? 0) / 100);

    await sendInvoiceEmail({
      userEmail: to,
      amount,
      invoiceNumber: invoice.number || invoiceId,
      invoiceUrl: invoice.hosted_invoice_url || invoice.invoice_pdf || null,
      productLabel: INVOICE_PRODUCT_LABELS[metadata.productType] || null,
    });
  } catch (err) {
    console.error("handleInvoicePaid error:", err);
  }
}
