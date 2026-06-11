"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
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
    <div className="bg-gradient-to-br from-[#0a141f] to-[#0a141f]/80 border border-[#34D399]/30 rounded-xl p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faArrowsRotate} className="text-[#34D399]" />
          <h2 className="text-lg font-semibold text-white">
            Continuous Testing
          </h2>
          <span className="text-gray-400 text-sm hidden sm:inline">
            · buy a year up front, save 20%
          </span>
        </div>

        {/* Cadence toggle */}
        <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-0.5">
          {(["quarterly", "monthly"] as Cadence[]).map((c) => (
            <button
              key={c}
              onClick={() => setCadence(c)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
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

      <div className="grid sm:grid-cols-2 gap-4">
        {CONTINUOUS_PLANS.map((plan) => {
          const tests = CADENCE_TESTS[cadence];
          const total = plan.perTestPrice * tests;
          const checkoutId = `${plan.id}_${cadence}`;
          const available = Boolean(plan.priceId);
          return (
            <div
              key={plan.id}
              className="flex items-center gap-4 bg-white/5 rounded-lg p-4 border border-white/10 hover:border-[#34D399]/40 transition-all"
            >
              <div className="p-2.5 rounded-lg bg-[#34D399]/20 border border-[#34D399]/40 flex-shrink-0">
                <FontAwesomeIcon
                  icon={plan.id === "web_app" ? faGlobe : faServer}
                  className="text-lg text-[#34D399]"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {plan.id === "web_app" ? "Web App" : "External IP"}
                </p>
                <p className="text-[#34D399] text-xs">
                  ${total.toLocaleString()} / {tests} tests · 20% off
                </p>
              </div>
              <button
                onClick={() => handleBuyBundle(plan)}
                disabled={!available || loadingCheckout === checkoutId}
                className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#34D399] hover:bg-[#10b981] text-[#041018] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCheckout === checkoutId
                  ? "…"
                  : !available
                    ? "Soon"
                    : "Buy"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
