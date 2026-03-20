"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/context/AuthContext";
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faChartLine,
  faLock,
  faBullseye,
  faShield,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PricingTier {
  id: string;
  name: string;
  price: number;
  priceId: string;
  description: string;
  features: string[];
  popular?: boolean;
  type: 'one-time' | 'subscription';
  cta: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'external_ip',
    name: 'External IP Pentest',
    price: 199,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_SINGLE || '',
    description: 'Gateways, firewalls, and external infrastructure',
    type: 'one-time',
    cta: 'Purchase Credit',
    features: [
      '1 External IP pentest credit',
      'Autonomous AI penetration testing',
      'Powered by Anthropic Claude agents',
      'Network vulnerability assessment',
      'Firewall & gateway testing',
      'Detailed findings report',
      'Remediation guidance',
      'Results within 24 hours',
    ],
  },
  {
    id: 'web_app',
    name: 'Web Application Pentest',
    price: 500,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_WEB_APP || '',
    description: 'Up to 3 user roles, 20 pages & 10 API endpoints',
    type: 'one-time',
    cta: 'Purchase Credit',
    popular: true,
    features: [
      '1 Web Application pentest credit',
      'Autonomous AI penetration testing',
      'Powered by Anthropic Claude agents',
      'Up to 3 user roles tested',
      'Up to 20 pages covered',
      'Up to 10 API endpoints',
      'Authentication & authorization testing',
      'Detailed findings report',
      'Results within 48 hours',
    ],
  },
];

export default function Home() {
  const { currentUser } = useAuth();
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

  const handleStartPentest = () => {
    if (!currentUser) {
      window.location.href = `/login?returnUrl=${encodeURIComponent('/app/new-pentest')}`;
      return;
    }
    window.location.href = '/app/new-pentest';
  };

  const handleCheckout = async (tier: PricingTier) => {
    if (!currentUser) {
      window.location.href = `/login?returnUrl=${encodeURIComponent('/#pricing')}`;
      return;
    }

    setLoadingCheckout(tier.id);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: tier.priceId,
          mode: 'payment',
          quantity: 1,
          userId: currentUser.uid,
          email: currentUser.email,
          metadata: { pentestType: tier.id }, // 'web_app' or 'external_ip'
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create checkout session');

      // Redirect directly to Stripe-hosted checkout URL
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      const { default: toast } = await import('react-hot-toast');
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setLoadingCheckout(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a141f] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#34D399]/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl lg:text-7xl font-light tracking-tight">
              <span className="block text-white">Penetration Testing</span>
              <span className="block text-[#34D399] mt-2">Made Simple</span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              AI-powered penetration testing driven by Anthropic Claude agentic systems.
              Flexible, transparent pricing &mdash; no subscriptions, no surprises.
            </p>
            <div className="flex justify-center pt-4">
              <button
                onClick={handleStartPentest}
                className="px-12 py-5 bg-[#34D399] hover:bg-[#10b981] text-[#041018] font-normal rounded-lg transition-colors text-xl"
              >
                Start Your Pentest
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Ready Reports Section */}
      <section className="py-14 bg-gradient-to-r from-[#34D399]/20 to-[#34D399]/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 space-y-4">
              <p className="text-[#34D399] text-xs font-normal uppercase tracking-widest">Audit-Ready Output</p>
              <h2 className="text-3xl lg:text-4xl font-light text-white">
                Compliance Ready Reports
              </h2>
              <p className="text-gray-400 leading-relaxed">
                Every pentest generates a structured report designed to satisfy auditors — not just developers.
                Findings are mapped to common control frameworks so your evidence package is ready the moment the scan completes.
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                {[
                  "Supports SOC 2 Type I & II audits as penetration testing evidence",
                  "Maps findings to HIPAA, PCI DSS, ISO 27001, and NIST controls",
                  "Plugs directly into compliance platforms like Vanta and Drata",
                  "Upload the PDF to your auditor portal or trust centre in one step",
                  "Includes risk ratings, remediation guidance, and retest notes",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#34D399] mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-1 gap-3 text-sm">
              {[
                { label: "Vanta", delay: "0ms" },
                { label: "Drata", delay: "120ms" },
                { label: "SOC 2", delay: "240ms" },
                { label: "HIPAA", delay: "360ms" },
                { label: "PCI DSS", delay: "480ms" },
                { label: "ISO 27001", delay: "600ms" },
                { label: "NIST", delay: "720ms" },
              ].map(({ label, delay }) => (
                <div
                  key={label}
                  className="relative overflow-hidden px-5 py-2.5 rounded-lg border border-[#34D399]/30 text-[#34D399] text-center font-normal tracking-wide"
                  style={{ animationDelay: delay }}
                >
                  {/* shimmer sweep */}
                  <span
                    className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#34D399]/15 to-transparent"
                    style={{ animationDelay: delay }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section — hidden
      <section className="py-20 bg-[#0a141f]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Why Choose <span className="text-[#34D399]">Affordable Pentesting</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Professional security testing without the complexity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white/5 border border-[#34D399]/20 rounded-lg p-8 hover:border-[#34D399]/40 transition-colors"
              >
                <div className="text-[#34D399] mb-4">
                  {feature.icon ? (
                    <FontAwesomeIcon icon={feature.icon} className="text-4xl" />
                  ) : (
                    <Image src="/brain.png" alt="AI" width={40} height={40} className="w-10 h-10" />
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* Pricing Section */}
      <section id="pricing" className="py-20 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-light mb-4">
              Simple, Transparent <span className="text-[#34D399]">Pricing</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Purchase credits for the pentests you need
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <PricingCard
                key={tier.id}
                tier={tier}
                onSelect={() => handleCheckout(tier)}
                loading={loadingCheckout === tier.id}
                currentUser={currentUser}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#34D399]/20 to-[#34D399]/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-light mb-6">
            Ready to Secure Your Systems?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Get started with AI-powered penetration testing. Purchase credits and run your first test in minutes.
          </p>
          <button
            onClick={handleStartPentest}
            className="inline-block px-10 py-5 bg-[#34D399] hover:bg-[#10b981] text-[#041018] font-normal rounded-lg transition-colors text-xl"
          >
            {currentUser ? "Start Your Pentest" : "Get Started"}
          </button>
        </div>
      </section>

      {/* Affordable Pentesting.com Section */}
      <section className="py-24 bg-[#060e16] border-t border-[#34D399]/20">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-14">
            <p className="text-[#34D399] text-sm font-normal uppercase tracking-widest mb-3">Powered by</p>
            <a
              href="https://www.affordablepentesting.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 hover:opacity-80 transition mb-6"
            >
              <Image
                src="/affordablepentestinglogo.svg"
                alt="Affordable Pentesting"
                width={36}
                height={36}
                className="h-9 w-9"
              />
              <span
                className="text-white font-light text-3xl tracking-wide"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                Affordable Pentesting
              </span>
            </a>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Human-led penetration testing for SOC 2, HIPAA, PCI DSS, ISO 27001, and NIST — at prices built for startups, SMBs, and growing companies.
            </p>
          </div>

          {/* Service pillars */}
          <div className="grid sm:grid-cols-3 gap-5 mb-14">
            {[
              { label: "Manual Pentesting", desc: "OSCP-certified hackers simulate real-world attacks — external, internal, web app, and cloud. Audit-ready reports for SOC 2, HIPAA, PCI DSS, and more." },
              { label: "AI-Powered Pentesting", desc: "Fast, automated assessments that go beyond a vulnerability scan. Results delivered within a day, no scheduling required." },
              { label: "Compliance & Risk Coverage", desc: "Every engagement maps findings to SOC 2, HIPAA, PCI DSS, ISO 27001, NIST, and GDPR controls — ready for your auditor." },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/5 border border-white/10 hover:border-[#34D399]/40 rounded-xl p-6 transition-colors"
              >
                <h3 className="text-white font-normal text-base mb-2">{item.label}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Why AP */}
          <div className="grid sm:grid-cols-4 gap-5 mb-14">
            {[
              { title: "Certified Ethical Hackers", desc: "OSCP, CEH, and CISSP certified experts — not automated scanners." },
              { title: "Enterprise Quality, SMB Pricing", desc: "The most affordable pentests on the market, with zero sacrifice on quality." },
              { title: "Fast Turnaround", desc: "Pentests start within days. No long lead times, no hidden fees." },
              { title: "Clear, Actionable Reports", desc: "Jargon-free findings with step-by-step remediation guidance." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="text-[#34D399] font-normal text-2xl leading-none mt-0.5">✓</span>
                <div>
                  <h3 className="text-white font-normal mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://www.affordablepentesting.com/get-a-quote"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-[#34D399] hover:bg-[#10b981] text-[#041018] font-normal rounded-lg transition-colors"
            >
              Get a Pentest Quote
            </a>
            <a
              href="https://www.affordablepentesting.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-normal rounded-lg border border-white/20 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

const features = [
  {
    icon: null,
    title: "AI-Powered Pentests",
    description:
      "Advanced Anthropic Claude agentic systems autonomously conduct penetration tests, identifying vulnerabilities and security weaknesses across your infrastructure.",
  },
  {
    icon: faBolt,
    title: "Fast Results",
    description:
      "Complete comprehensive security assessments delivered within 24 hours of target submission.",
  },
  {
    icon: faChartLine,
    title: "Actionable Reports",
    description:
      "Get detailed findings with severity ratings, exploitation steps, and clear remediation guidance you can act on immediately.",
  },
  {
    icon: faLock,
    title: "Compliance Ready",
    description:
      "Meet PCI-DSS, HIPAA, SOC 2, and other compliance requirements with our comprehensive testing methodology.",
  },
  {
    icon: faBullseye,
    title: "Transparent Pricing",
    description:
      "$199 per External IP pentest or $500 per Web Application pentest. No subscriptions, no hidden fees, no surprises.",
  },
  {
    icon: faShield,
    title: "Complete Coverage",
    description:
      "Comprehensive AI-powered penetration testing performed by advanced Anthropic Claude agentic systems that autonomously identify and exploit vulnerabilities.",
  },
];

interface PricingCardProps {
  tier: PricingTier;
  onSelect: () => void;
  loading: boolean;
  currentUser: any;
}

function PricingCard({ tier, onSelect, loading, currentUser }: PricingCardProps) {
  return (
    <div
      className={`relative bg-white/5 rounded-xl p-8 border-2 transition-all hover:scale-[1.02] ${
        tier.popular
          ? "border-[#34D399] shadow-lg shadow-[#34D399]/20"
          : "border-white/10"
      }`}
    >
      {tier.popular && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#34D399] text-[#041018] px-4 py-1 rounded-full text-sm font-normal">
          MOST POPULAR
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-light mb-2">{tier.name}</h3>
        <p className="text-gray-400 text-sm mb-4">{tier.description}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-light text-white">
            ${tier.price.toLocaleString()}
          </span>
          {tier.type === 'subscription' && (
            <span className="text-gray-400">/month</span>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {tier.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-gray-300">
            <FontAwesomeIcon icon={faCircleCheck} className="text-[#34D399] mt-1 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect()}
        disabled={loading}
        className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
          tier.popular
            ? "bg-[#34D399] hover:bg-[#10b981] text-[#041018]"
            : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
        } disabled:opacity-50 disabled:cursor-not-allowed font-normal`}
      >
        {loading ? "Processing..." : currentUser ? tier.cta : "Sign In to Purchase"}
      </button>
    </div>
  );
}
