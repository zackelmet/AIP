import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { getStripeServerSide } from "@/lib/stripe/getStripeServerSide";
import { verifyAuth } from "@/lib/auth/verifyAuth";

const admin = initializeAdmin();

export async function POST(req: NextRequest) {
  // Require a valid authenticated session
  const token = await verifyAuth(req, { allowUnverified: true });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { uid, name, email } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    // The UID in the body must match the authenticated user — prevents creating
    // or overwriting another user's document.
    if (uid !== token.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if the user document already exists
    const userDoc = await admin.firestore().collection("users").doc(uid).get();

    if (!userDoc.exists) {
      // Create Stripe customer
      const stripe = await getStripeServerSide();
      let stripeCustomerId = null;

      if (stripe && email) {
        try {
          const customer = await stripe.customers.create({
            email: email,
            name: name || "",
            metadata: {
              firebaseUID: uid,
            },
          });
          stripeCustomerId = customer.id;
        } catch (stripeError) {
          console.error("Error creating Stripe customer:", stripeError);
        }
      }

      // Create a new user document
      const newUser = {
        uid,
        name: name || "",
        email: email || "",
        stripeCustomerId: stripeCustomerId,
        stripeSubscriptionId: null,
        subscriptionStatus: "none",
        // Pentest credits
        credits: { web_app: 0, external_ip: 0 },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .set(newUser, { merge: true });

      return NextResponse.json({
        message: "User document created successfully",
        stripeCustomerId,
        plan: "free",
      });
    } else {
      return NextResponse.json({ message: "User document already exists" });
    }
  } catch (error: any) {
    console.error("Error creating user document:", error);
    return NextResponse.json(
      { error: "Failed to create user document" },
      { status: 500 },
    );
  }
}
