"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons/faGlobe";
import { faServer } from "@fortawesome/free-solid-svg-icons/faServer";
import { faJetFighter } from "@fortawesome/free-solid-svg-icons/faJetFighter";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";

type PentestType = "web_app" | "external_ip" | "pentest_plus";

const PLANS: Array<{
  type: PentestType;
  label: string;
  price: number;
  icon: any;
  desc: string;
}> = [
  { type: "external_ip", label: "External IP", price: 199, icon: faServer, desc: "Gateways, firewalls, network devices" },
  { type: "web_app", label: "Web Application", price: 500, icon: faGlobe, desc: "Up to 3 roles, 10 endpoints" },
  { type: "pentest_plus", label: "Pentest+", price: 1500, icon: faJetFighter, desc: "5 domains, 50 IPs, 100 endpoints, 10 roles" },
];

export default function PurchaseModal({ onClose }: { onClose: () => void }) {
  const { currentUser } = useAuth();
  const [selectedType, setSelectedType] = useState<PentestType>("web_app");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = PLANS.find((p) => p.type === selectedType)!;
  const total = plan.price * quantity;

  const checkout = async () => {
    setLoading(true);
    setError(null);
    try {
      const priceId =
        selectedType === "web_app"
          ? process.env.NEXT_PUBLIC_STRIPE_PRICE_WEB_APP
          : selectedType === "pentest_plus"
            ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PENTEST_PLUS
            : process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_SINGLE;

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          mode: "payment",
          quantity,
          userId: currentUser?.uid,
          email: currentUser?.email,
          metadata: { pentestType: selectedType },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: Record<string, string> = {
    web_app: "Web Application",
    external_ip: "External IP",
    pentest_plus: "Pentest+",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--card-bg,#0a141f)] border border-[var(--card-border,#ffffff20)] rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-y-auto max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--card-border,#ffffff20)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">
              Buy Credits
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Select a pentest type and quantity
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <FontAwesomeIcon
              icon={faXmark}
              className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl"
            />
          </button>
        </div>

        {/* Type selection — all 3 side by side */}
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {PLANS.map((p) => (
              <button
                key={p.type}
                type="button"
                onClick={() => { setSelectedType(p.type); setQuantity(1); }}
                className={`p-4 rounded-xl text-left transition-all ${
                  selectedType === p.type
                    ? "bg-[#34D399]/15 border-2 border-[#34D399]"
                    : "bg-[var(--card-bg,#ffffff08)] border border-[var(--card-border,#ffffff20)] hover:border-[#34D399]/50"
                }`}
              >
                <div className="p-2 rounded-lg bg-[#34D399]/20 border border-[#34D399]/40 mx-auto mb-2" style={{ width: 44, height: 44 }}>
                  <FontAwesomeIcon icon={p.icon} className="text-green-theme text-lg block mx-auto" />
                </div>
                <p className="text-xs font-semibold text-[var(--text)] text-center">
                  {p.label}
                </p>
                <p className="text-xs text-[var(--text-muted)] text-center mt-0.5">
                  ${p.price}
                </p>
              </button>
            ))}
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between gap-4 bg-[var(--card-bg,#ffffff08)] border border-[var(--card-border,#ffffff20)] rounded-lg px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">
                {typeLabels[selectedType]}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {plan.desc}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg border border-[var(--card-border,#ffffff20)] bg-[var(--card-bg,#ffffff08)] text-[var(--text)] text-sm font-semibold hover:bg-[#34D399]/20 transition-colors"
              >
                −
              </button>
              <span className="w-10 text-center text-lg font-bold text-[var(--text)]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                className="w-8 h-8 rounded-lg border border-[var(--card-border,#ffffff20)] bg-[var(--card-bg,#ffffff08)] text-[var(--text)] text-sm font-semibold hover:bg-[#34D399]/20 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Total & Checkout */}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={checkout}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#34D399] hover:bg-[#10b981] disabled:opacity-50 disabled:cursor-not-allowed text-[#041018] font-bold text-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                Redirecting to checkout…
              </>
            ) : (
              <>
                Buy ${total.toLocaleString()} —
                {quantity} credit{quantity === 1 ? "" : "s"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}