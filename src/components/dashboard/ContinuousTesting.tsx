"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faGlobe,
  faServer,
  faArrowsRotate,
} from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Cadence,
  CADENCE_TESTS,
  CONTINUOUS_PLANS,
  ContinuousPlan,
} from "@/lib/pricing/continuous";

export default function ContinuousTesting() {
  const { currentUser } = useAuth();
  const [cadence, setCadence] = useState<Cadence>("quarterly");
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

  const handleBuyBundle = async (plan: ContinuousPlan) => {
    if (!plan.priceId) {
      toast.error("This plan isn't available yet — please check back soon.");
      return;
    }
    if (!currentUser) {
      window.location.href = `/login?returnUrl=${encodeURIComponent("/app/dashboard")}`;
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
          userId: currentUser.uid,
          email: currentUser.email,
          // Webhook grants `quantity` credits of this type on completion.
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
    <div className="bg-gradient-to-br from-[#0a141f] to-[#0a141f]/80 border border-[#34D399]/30 rounded-xl p-6 lg:p-8 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon
              icon={faArrowsRotate}
              className="text-[#34D399] text-sm"
            />
            <span className="text-[#34D399] text-xs font-normal uppercase tracking-widest">
              Stay Secure Year-Round
            </span>
          </div>
          <h2 className="text-2xl font-light text-white mb-1">
            Continuous <span className="text-[#34D399]">Testing</span>
          </h2>
          <p className="text-gray-400 text-sm max-w-xl">
            Buy a year of pentests up front and save 20%. Credits land instantly
            — launch a fresh test each month or quarter.
          </p>
        </div>

        {/* Cadence toggle */}
        <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-1 flex-shrink-0">
          {(["quarterly", "monthly"] as Cadence[]).map((c) => (
            <button
              key={c}
              onClick={() => setCadence(c)}
              className={`px-4 py-2 rounded-md text-sm font-normal transition-colors ${
                cadence === c
                  ? "bg-[#34D399] text-[#041018]"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {c === "quarterly" ? "Quarterly · 4/yr" : "Monthly · 12/yr"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {CONTINUOUS_PLANS.map((plan) => {
          const tests = CADENCE_TESTS[cadence];
          const total = plan.perTestPrice * tests;
          const checkoutId = `${plan.id}_${cadence}`;
          const available = Boolean(plan.priceId);
          return (
            <div
              key={plan.id}
              className="relative flex flex-col h-full bg-white/5 rounded-xl p-6 border border-white/10 hover:border-[#34D399]/40 transition-all"
            >
              <div className="mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-[#34D399]/20 border border-[#34D399]/40">
                    <FontAwesomeIcon
                      icon={plan.id === "web_app" ? faGlobe : faServer}
                      className="text-xl text-[#34D399]"
                    />
                  </div>
                  <h3 className="text-xl font-light text-white">{plan.name}</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-light text-white">
                    ${total.toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-sm">/ {tests} tests</span>
                </div>
                <p className="text-[#34D399] text-xs mt-2">
                  ${plan.perTestPrice}/test · 20% off the ${plan.oneTimePrice}{" "}
                  standard price
                </p>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-gray-300 text-sm"
                  >
                    <FontAwesomeIcon
                      icon={faCircleCheck}
                      className="text-[#34D399] mt-0.5 flex-shrink-0"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleBuyBundle(plan)}
                disabled={!available || loadingCheckout === checkoutId}
                className="mt-auto w-full py-3.5 rounded-lg font-medium text-base transition-colors bg-[#34D399] hover:bg-[#10b981] text-[#041018] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCheckout === checkoutId
                  ? "Processing..."
                  : !available
                    ? "Coming Soon"
                    : `Buy ${tests} tests`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-gray-500 text-xs mt-6">
        One-time purchase — {CADENCE_TESTS[cadence]} pentest credits added to
        your account immediately. Launch each test whenever you like.
      </p>
    </div>
  );
}
