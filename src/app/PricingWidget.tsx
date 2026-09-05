"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons/faCircleCheck";
import {
  Cadence,
  CADENCE_TESTS,
  CONTINUOUS_PLANS,
  ContinuousPlan,
} from "@/lib/pricing/continuous";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface PricingTier {
  id: string;
  name: string;
  price: number;
  priceId: string;
  description: string;
  features: string[];
  popular?: boolean;
  type: "one-time" | "subscription";
  cta: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "external_ip",
    name: "External IP Pentest",
    price: 199,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_SINGLE || "",
    description: "Gateways, firewalls, and external infrastructure",
    type: "one-time",
    cta: "Purchase Credit",
    features: [
      "1 External IP pentest credit",
      "Compliance ready reports",
      "Powered by Anthropic Claude agents",
      "Network vulnerability assessment",
      "Firewall & gateway testing",
      "GRC platform integration (Drata, Vanta)",
      "Remediation guidance",
      "Results within 48 hours",
    ],
  },
  {
    id: "web_app",
    name: "Web Application Pentest",
    price: 500,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_WEB_APP || "",
    description: "Up to 3 user roles, 20 pages & 10 API endpoints",
    type: "one-time",
    cta: "Purchase Credit",
    popular: true,
    features: [
      "1 Web Application pentest credit",
      "Compliance ready reports",
      "Powered by Anthropic Claude agents",
      "Up to 3 user roles tested",
      "Up to 20 pages covered",
      "Up to 10 API endpoints",
      "Authentication & authorization testing",
      "GRC platform integration (Drata, Vanta)",
      "Results within 48 hours",
    ],
  },
  {
    id: "pentest_plus",
    name: "Pentest+",
    price: 1500,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PENTEST_PLUS || "",
    description: "Web app pentest — up to 5 domains/URLs & 50 IPs",
    type: "one-time",
    cta: "Purchase Credit",
    features: [
      "1 Pentest+ credit",
      "Web application pentest",
      "Up to 5 domains/URLs covered",
      "Up to 50 external IPs included",
      "Up to 100 API endpoints",
      "Up to 10 user roles tested",
      "Compliance ready reports",
      "Powered by Anthropic Claude agents",
      "Authentication & authorization testing",
      "GRC platform integration (Drata, Vanta)",
      "Results within 48 hours",
    ],
  },
];

interface PricingCardProps {
  tier: PricingTier;
  onSelect: () => void;
  loading: boolean;
  currentUser: any;
}

function PricingCard({
  tier,
  onSelect,
  loading,
  currentUser,
}: PricingCardProps) {
  return (
    <div
      className={`relative flex flex-col h-full bg-white/5 rounded-xl p-8 border-2 transition-all hover:scale-[1.02] ${
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
          {tier.type === "subscription" && (
            <span className="text-gray-400">/month</span>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {tier.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-gray-300">
            <FontAwesomeIcon
              icon={faCircleCheck}
              className="text-[#34D399] mt-1 flex-shrink-0"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect()}
        disabled={loading}
        className={`mt-auto w-full py-4 rounded-lg font-bold text-lg transition-colors ${
          tier.popular
            ? "bg-[#34D399] hover:bg-[#10b981] text-[#041018]"
            : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
        } disabled:opacity-50 disabled:cursor-not-allowed font-normal`}
      >
        {loading
          ? "Processing..."
          : currentUser
            ? tier.cta
            : "Sign In to Purchase"}
      </button>
    </div>
  );
}

export default function PricingWidget({
  currentUser,
}: {
  currentUser: any;
}) {
  const { currentUser: authUser } = useAuth();
  const user = currentUser || authUser;
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [cadence, setCadence] = useState<Cadence>("quarterly");

  const handleStartPentest = () => {
    if (!user) {
      window.location.href = `/login?returnUrl=${encodeURIComponent("/app/new-pentest")}`;
      return;
    }
    window.location.href = "/app/new-pentest";
  };

  const handleCheckout = async (tier: PricingTier) => {
    if (!user) {
      window.location.href = `/login?returnUrl=${encodeURIComponent("/#pricing")}`;
      return;
    }

    setLoadingCheckout(tier.id);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: tier.priceId,
          mode: "payment",
          quantity: 1,
          userId: user.uid,
          email: user.email,
          metadata: { pentestType: tier.id },
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to create checkout session");

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      const { default: toast } = await import("react-hot-toast");
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setLoadingCheckout(null);
    }
  };

  const handleBuyBundle = async (plan: ContinuousPlan) => {
    if (!plan.priceId) {
      toast.error("This plan isn't available yet — please check back soon.");
      return;
    }
    if (!user) {
      window.location.href = `/login?returnUrl=${encodeURIComponent("/#continuous")}`;
      return;
    }

    const quantity = CADENCE_TESTS[cadence];
    const checkoutId = `${plan.id}_${cadence}`;
    setLoadingCheckout(checkoutId);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: plan.priceId,
          mode: "payment",
          quantity,
          userId: user.uid,
          email: user.email,
          metadata: { pentestType: plan.id, continuousCadence: cadence },
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to create checkout session");

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Bundle checkout error:", error);
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setLoadingCheckout(null);
    }
  };

  return (
    <>
      {/* Pricing Section */}
      <section id="pricing" className="py-20 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-light mb-4">
              Simple <span className="text-[#34D399]">Pricing</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Purchase credits for the pentests you need
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <PricingCard
                key={tier.id}
                tier={tier}
                onSelect={() => handleCheckout(tier)}
                loading={loadingCheckout === tier.id}
                currentUser={user}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Continuous Testing Section */}
      <section id="continuous" className="py-20 bg-[#060e16] scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#34D399] text-xs font-normal uppercase tracking-widest mb-3">
              Stay Secure Year-Round
            </p>
            <h2 className="text-4xl lg:text-5xl font-light mb-4">
              Continuous <span className="text-[#34D399]">Testing</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Buy a year of pentests up front and save 20%. Credits land
              instantly &mdash; launch a fresh test each month or quarter as
              your attack surface changes.
            </p>
          </div>

          {/* Cadence toggle */}
          <div className="flex items-center justify-center mb-10">
            <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-1">
              {(["quarterly", "monthly"] as Cadence[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCadence(c)}
                  className={`px-6 py-2 rounded-md text-sm font-normal transition-colors ${
                    cadence === c
                      ? "bg-[#34D399] text-[#041018]"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {c === "quarterly"
                    ? "Quarterly · 4 tests/yr"
                    : "Monthly · 12 tests/yr"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {CONTINUOUS_PLANS.map((plan) => {
              const tests = CADENCE_TESTS[cadence];
              const total = plan.perTestPrice * tests;
              const checkoutId = `${plan.id}_${cadence}`;
              const available = Boolean(plan.priceId);
              return (
                <div
                  key={plan.id}
                  className="relative flex flex-col h-full bg-white/5 rounded-xl p-8 border-2 border-white/10 hover:border-[#34D399]/40 transition-all"
                >
                  <div className="mb-6">
                    <h3 className="text-2xl font-light mb-2">{plan.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-light text-white">
                        ${total.toLocaleString()}
                      </span>
                      <span className="text-gray-400">/ {tests} tests</span>
                    </div>
                    <p className="text-[#34D399] text-xs mt-2">
                      ${plan.perTestPrice}/test · 20% off the $
                      {plan.oneTimePrice} standard price
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-gray-300"
                      >
                        <FontAwesomeIcon
                          icon={faCircleCheck}
                          className="text-[#34D399] mt-1 flex-shrink-0"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleBuyBundle(plan)}
                    disabled={!available || loadingCheckout === checkoutId}
                    className="mt-auto w-full py-4 rounded-lg font-normal text-lg transition-colors bg-[#34D399] hover:bg-[#10b981] text-[#041018] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingCheckout === checkoutId
                      ? "Processing..."
                      : !available
                        ? "Coming Soon"
                        : user
                          ? `Buy ${tests} tests`
                          : "Sign In to Buy"}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-center text-gray-500 text-xs mt-8 max-w-2xl mx-auto">
            One-time purchase &mdash; {CADENCE_TESTS[cadence]} pentest credits
            added to your account immediately. Launch each test whenever you
            like.
          </p>
        </div>
      </section>
    </>
  );
}