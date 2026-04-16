"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import toast from "react-hot-toast";

interface Product {
  id: "external_ip" | "web_app" | "pentest_plus";
  name: string;
  price: number;
  priceId: string;
  description: string;
  features: string[];
  popular?: boolean;
}

const PRODUCTS: Product[] = [
  {
    id: "external_ip",
    name: "External IP Pentest",
    price: 199,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_SINGLE || "",
    description:
      "AI-driven automated penetration test for external-facing IPs and services",
    features: [
      "AI-powered vulnerability scanning",
      "Nmap network discovery",
      "OpenVAS vulnerability assessment",
      "Automated findings report",
      "Up to 5 targets per scan",
      "Export results (PDF/JSON)",
      "Credits never expire",
    ],
  },
  {
    id: "web_app",
    name: "Web App Pentest",
    price: 500,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_WEB_APP || "",
    description: "AI-driven automated penetration test for web applications",
    popular: true,
    features: [
      "AI-powered vulnerability scanning",
      "OWASP ZAP web application testing",
      "OWASP Top 10 coverage",
      "Authenticated scan support",
      "Detailed findings report",
      "Export results (PDF/JSON)",
      "Credits never expire",
    ],
  },
  {
    id: "pentest_plus",
    name: "Pentest+",
    price: 1500,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PENTEST_PLUS || "",
    description: "Up to 50 external IPs or webapp with 100 API endpoints",
    features: [
      "1 Pentest+ credit",
      "AI pentest: up to 50 external IPs",
      "Or webapp with up to 100 API endpoints",
      "Up to 10 user roles tested",
      "Compliance ready reports",
      "Authentication & authorization testing",
      "GRC platform integration (Drata, Vanta)",
      "Results within 48 hours",
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
    if (searchParams.get("canceled")) {
      toast.error("Checkout canceled");
    }
  }, [searchParams]);

  const handleCheckout = async (id: string, priceId: string) => {
    if (!user) {
      router.push("/login?redirect=/pricing");
      return;
    }
    setLoading(id);
    try {
      const qty = quantities[id] || 1;
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
          email: user.email,
          productType: "one-time",
          quantity: qty,
          metadata: { pentestType: id },
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to create checkout session");
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
      setLoading(null);
    }
  };

  const renderProductCard = (p: Product) => (
    <div
      key={p.id}
      className={`relative rounded-xl border ${p.popular ? "border-emerald-500 shadow-xl scale-105" : "border-white/10"} bg-white/5 p-8 flex flex-col`}
    >
      {p.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
          Most Popular
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">{p.name}</h3>
        <p className="text-gray-400 text-sm mb-4">{p.description}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold text-white">
            ${p.price.toLocaleString()}
          </span>
          <span className="text-gray-400 text-sm">/ credit</span>
        </div>
      </div>
      <ul className="space-y-3 mb-8 flex-grow">
        {p.features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-300 text-sm">{f}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-gray-400 text-sm">Qty:</label>
        <input
          type="number"
          min={1}
          max={50}
          value={quantities[p.id] || 1}
          onChange={(e) =>
            setQuantities((q) => ({
              ...q,
              [p.id]: Math.max(1, parseInt(e.target.value) || 1),
            }))
          }
          className="w-16 px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-sm text-center"
        />
      </div>
      <button
        onClick={() => handleCheckout(p.id, p.priceId)}
        disabled={loading === p.id}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${p.popular ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-white/10 hover:bg-white/20 text-white"} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading === p.id ? "Loading…" : "Buy Credits"}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a141f] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-white mb-4">Pricing</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Buy pentest credits — no subscriptions, no surprises. Credits never
            expire.
          </p>
        </div>

        {/* AI Pentest Credits */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">
              AI-Driven Automated Pentests
            </h2>
            <p className="text-gray-400">
              Lightning-fast vulnerability scanning powered by AI
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {PRODUCTS.map((p) => renderProductCard(p))}
          </div>
        </div>

        {/* FAQ */}
        <div id="faq" className="max-w-3xl mx-auto mt-20 scroll-mt-20">
          <h2 className="text-3xl font-bold text-white text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "What does each credit type include?",
                a: "External IP covers gateways, firewalls, and external infrastructure. Web App covers up to 3 user roles, 20 pages, and 10 API endpoints. Pentest+ covers up to 50 external IPs or a webapp with up to 100 API endpoints and up to 10 user roles.",
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
              {
                q: "How fast do I get results?",
                a: "Most scans complete within 48 hours. You'll receive a compliance-ready report with detailed findings and remediation guidance.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
              >
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
