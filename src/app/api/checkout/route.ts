import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyAuth } from '@/lib/auth/verifyAuth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const token = await verifyAuth(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { priceId, email, productType, mode, quantity, metadata } = await request.json();
    const userId = token.uid;
    const verifiedEmail = token.email || email;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity || 1,
        },
      ],
      mode: mode || (productType === 'subscription' ? 'subscription' : 'payment'),
      success_url: `${siteUrl}/app/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/app/dashboard?canceled=true`,
      customer_email: verifiedEmail,
      metadata: {
        userId: userId || '',
        productType: productType || 'one-time',
        ...(metadata || {}),
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
