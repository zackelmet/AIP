'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import toast from 'react-hot-toast';

interface Product {
  id: 'external_ip' | 'web_app';
  name: string;
  price: number;
  priceId: string;
  description: string;
  features: string[];
  popular?: boolean;
}

const PRODUCTS: Product[] = [
  {
    id: 'external_ip',
    name: 'External IP Pentest',
    price: 199,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_SINGLE || '',
    description: 'AI-driven automated penetration test for external-facing IPs and services',
    features: [
      'AI-powered vulnerability scanning',
      'Nmap network discovery',
      'OpenVAS vulnerability assessment',
      'Automated findings report',
      'Up to 5 targets per scan',
      'Export results (PDF/JSON)',
      'Credits never expire',
    ],
  },
  {
    id: 'web_app',
    name: 'Web App Pentest',
    price: 500,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_WEB_APP || '',
    description: 'AI-driven automated penetration test for web applications',
    popular: true,
    features: [
      'AI-powered vulnerability scanning',
      'OWASP ZAP web application testing',
      'OWASP Top 10 coverage',
      'Authenticated scan support',
      'Detailed findings report',
      'Export results (PDF/JSON)',
      'Credits never expire',
    ],
  },
];

const MANUAL_PRODUCTS = [
  {
    id: 'manual_basic',
    name: 'Basic Manual Pentest',
    price: 2000,
    description: 'Professional manual testing by certified experts',
    features: [
      'Certified pentesting team',
      'Up to 3 targets/applications',
      'OWASP Top 10 coverage',
      '40 hours of testing',
      'Executive summary report',
      'Detailed technical findings',
      'Remediation recommendations',
      '2 weeks engagement timeline',
    ],
  },
  {
    id: 'manual_advanced',
    name: 'Advanced Manual Pentest',
    price: 5000,
    popular: true,
    description: 'Comprehensive testing for complex infrastructure',
    features: [
      'Senior pentesting specialists',
      'Unlimited targets',
      'Full-scope testing (web, network, API)',
      '120 hours of testing',
      'Executive and board-level reports',
      'Remediation support and retesting',
      'Compliance mapping (PCI-DSS, SOC2)',
      '4–6 weeks engagement timeline',
      'Dedicated project manager',
    ],
  },
];

function PricingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser: user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (searchParams.get('canceled')) {
      toast.error('Checkout canceled');
    }
  }, [searchParams]);

  const handleCheckout = async (id: string, priceId: string) => {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }
    if (id.startsWith('manual_')) {
      router.push(`/app/request-pentest?tier=${id}`);
      return;
    }
    setLoading(id);
    try {
      const qty = quantities[id] || 1;
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
          email: user.email,
          productType: 'one-time',
          quantity: qty,
          metadata: { pentestType: id },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create checkout session');
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || 'Failed to start checkout');
      setLoading(null);
    }
  };

  const renderProductCard = (p: Product | typeof MANUAL_PRODUCTS[0], isManual = false) => (
    <div
      key={p.id}
      className={`relative rounded-xl border ${'popular' in p && p.popular ? 'border-emerald-500 shadow-xl scale-105' : 'border-white/10'} bg-white/5 p-8 flex flex-col`}
    >
      {'popular' in p && p.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
          Most Popular
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">{p.name}</h3>
        <p className="text-gray-400 text-sm mb-4">{p.description}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold text-white">${p.price.toLocaleString()}</span>
          <span className="text-gray-400 text-sm">/ credit</span>
        </div>
      </div>
      <ul className="space-y-3 mb-8 flex-grow">
        {p.features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-300 text-sm">{f}</span>
          </li>
        ))}
      </ul>
      {!isManual && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-gray-400 text-sm">Qty:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={quantities[p.id] || 1}
            onChange={(e) => setQuantities(q => ({ ...q, [p.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
            className="w-16 px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-sm text-center"
          />
        </div>
      )}
      <button
        onClick={() => handleCheckout(p.id, 'priceId' in p ? p.priceId : '')}
        disabled={loading === p.id}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${'popular' in p && p.popular ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-white/10 hover:bg-white/20 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading === p.id ? 'Loading…' : isManual ? 'Request Service' : 'Buy Credits'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a141f] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-white mb-4">Pricing</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Buy pentest credits — no subscriptions, no surprises. Credits never expire.
          </p>
        </div>

        {/* AI Pentest Credits */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">AI-Driven Automated Pentests</h2>
            <p className="text-gray-400">Lightning-fast vulnerability scanning powered by AI</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {PRODUCTS.map(p => renderProductCard(p, false))}
          </div>
        </div>

        {/* Manual Pentests */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Manual Penetration Testing</h2>
            <p className="text-gray-400">Expert-led security assessments by certified professionals</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {MANUAL_PRODUCTS.map(p => renderProductCard(p, true))}
          </div>
        </div>

        {/* FAQ */}
        <div id="faq" className="max-w-3xl mx-auto mt-20 scroll-mt-20">
          <h2 className="text-3xl font-bold text-white text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "What's the difference between AI and manual pentests?",
                a: "AI pentests use automated scanning tools to quickly identify common vulnerabilities. Manual pentests involve human experts who perform deep analysis, test business logic, and find complex security issues that automated tools might miss.",
              },
              {
                q: "How long does a manual pentest take?",
                a: "Basic engagements typically take 2 weeks, while advanced pentests require 4–6 weeks depending on scope and complexity. We'll provide a detailed timeline during consultation.",
              },
              {
                q: "Do pentest credits expire?",
                a: "No — purchased credits never expire. Use them whenever you're ready.",
              },
              {
                q: "Can I get a refund?",
                a: "Unused credits may be refunded within 14 days of purchase. Once a pentest has been dispatched to our systems, credits are non-refundable. Submit a support ticket if you have a billing question.",
              },
              {
                q: "Do I need to install anything?",
                a: "No — everything runs in the cloud. Just submit your target and we handle the rest.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{q}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a141f]" />}>
      <PricingPageInner />
    </Suspense>
  );
}


const AI_PENTEST_TIERS: PricingTier[] = [
  {
    id: 'ai_single',
    name: 'Single AI Pentest',
    price: 199,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_SINGLE || '',
    description: 'One-time AI-driven automated penetration test',
    type: 'one-time',
    cta: 'Purchase Scan',
    features: [
      'AI-powered vulnerability scanning',
      'Nmap network discovery',
      'OpenVAS vulnerability assessment',
      'OWASP ZAP web application testing',
      'Automated findings report',
      'Up to 5 targets per scan',
      'Export results (PDF/JSON)',
    ],
  },
  {
    id: 'ai_monthly',
    name: 'Unlimited AI Pentests',
    price: 499,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_MONTHLY || '',
    description: 'Unlimited AI-driven pentests, run anytime',
    type: 'subscription',
    cta: 'Subscribe Now',
    popular: true,
    features: [
      'Unlimited AI-powered scans',
      'Priority scan queue',
      'Advanced scan configurations',
      'Automated scheduling',
      'Historical trend analysis',
      'Unlimited targets',
      'API access',
      'Email alerts',
    ],
  },
];

const MANUAL_PENTEST_TIERS: PricingTier[] = [
  {
    id: 'manual_basic',
    name: 'Basic Manual Pentest',
    price: 2000,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MANUAL_BASIC || '',
    description: 'Professional manual testing by certified experts',
    type: 'one-time',
    cta: 'Request Service',
    features: [
      'Certified pentesting team',
      'Up to 3 targets/applications',
      'OWASP Top 10 coverage',
      '40 hours of testing',
      'Executive summary report',
      'Detailed technical findings',
      'Remediation recommendations',
      '2 weeks engagement timeline',
    ],
  },
  {
    id: 'manual_advanced',
    name: 'Advanced Manual Pentest',
    price: 5000,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MANUAL_ADVANCED || '',
    description: 'Comprehensive testing for complex infrastructure',
    type: 'one-time',
    cta: 'Request Service',
    popular: true,
    features: [
      'Senior pentesting specialists',
      'Unlimited targets',
      'Full-scope testing (web, network, API, mobile)',
      '120 hours of testing',
      'Executive and board-level reports',
      'Detailed technical documentation',
      'Remediation support and retesting',
      'Compliance mapping (PCI-DSS, SOC2)',
      '4-6 weeks engagement timeline',
      'Dedicated project manager',
    ],
  },
];

function PricingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser: user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    // Check for canceled checkout
    if (searchParams.get('canceled')) {
      toast.error('Checkout canceled');
    }
  }, [searchParams]);

  const handleCheckout = async (tier: PricingTier) => {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    // For manual pentests, redirect to request form instead of immediate checkout
    if (tier.id.startsWith('manual_')) {
      router.push(`/app/request-pentest?tier=${tier.id}`);
      return;
    }

    setLoading(tier.id);

    try {
      // Only one-time credit purchases carry a pentestType — subscriptions are
      // handled separately by the webhook's subscription path.
      const creditTypeMap: Record<string, string> = {
        'ai_single': 'external_ip',
        'web_app':   'web_app',
      };
      const pentestType = tier.type === 'one-time' ? (creditTypeMap[tier.id] || null) : null;
      const qty = quantities[tier.id] || 1;

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: tier.priceId,
          userId: user.uid,
          email: user.email,
          productType: tier.type,
          quantity: qty,
          metadata: pentestType ? { pentestType } : {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to start checkout');
      setLoading(null);
    }
  };

  const renderTierCard = (tier: PricingTier) => (
    <div
      key={tier.id}
      className={`relative rounded-lg border ${
        tier.popular
          ? 'border-emerald-500 shadow-xl scale-105'
          : 'border-gray-200 shadow-lg'
      } bg-white p-8 flex flex-col`}
    >
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{tier.description}</p>
        <div className="flex items-baseline">
          <span className="text-5xl font-extrabold text-gray-900">
            ${tier.price.toLocaleString()}
          </span>
          {tier.type === 'subscription' && (
            <span className="ml-2 text-gray-600">/month</span>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-8 flex-grow">
        {tier.features.map((feature, idx) => (
          <li key={idx} className="flex items-start">
            <svg
              className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-700 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => handleCheckout(tier)}
        disabled={loading === tier.id}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
          tier.popular
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-gray-800 hover:bg-gray-900 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading === tier.id ? 'Loading...' : tier.cta}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a141f] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-white mb-4">
            Pricing Plans
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Choose the right penetration testing solution for your needs.
            From AI-driven automated scans to comprehensive manual testing.
          </p>
        </div>

        {/* AI Pentests Section */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">
              AI-Driven Automated Pentests
            </h2>
            <p className="text-gray-400">
              Lightning-fast vulnerability scanning powered by AI
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {AI_PENTEST_TIERS.map(renderTierCard)}
          </div>
        </div>

        {/* Manual Pentests Section */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">
              Manual Penetration Testing
            </h2>
            <p className="text-gray-400">
              Expert-led security assessments by certified professionals
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {MANUAL_PENTEST_TIERS.map(renderTierCard)}
          </div>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="max-w-3xl mx-auto mt-20 scroll-mt-20">
          <h2 className="text-3xl font-bold text-white text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                What&apos;s the difference between AI and manual pentests?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI pentests use automated scanning tools to quickly identify common vulnerabilities.
                Manual pentests involve human experts who perform deep analysis, test business logic,
                and find complex security issues that automated tools might miss.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                How long does a manual pentest take?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Basic engagements typically take 2 weeks, while advanced pentests require 4&ndash;6 weeks
                depending on scope and complexity. We&apos;ll provide a detailed timeline during consultation.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                Do pentest credits expire?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                No &mdash; purchased credits never expire. Use them whenever you&apos;re ready.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                Can I get a refund?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Unused credits may be refunded within 14 days of purchase. Once a pentest has been
                dispatched to our systems, credits are non-refundable. Submit a support ticket if you
                have a billing question.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                Do I need to install anything?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                No &mdash; everything runs in the cloud. Just submit your target and we handle the rest.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a141f]" />}>
      <PricingPageInner />
    </Suspense>
  );
}
