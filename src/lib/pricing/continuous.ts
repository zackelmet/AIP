// Shared definition of the "Continuous Testing" bundles, used by both the
// public landing page and the in-app dashboard so prices never drift.
//
// Continuous testing = a one-time bundle of pentest credits at 20% off, bought
// at the discounted per-test price times the number of tests for the cadence
// (quarterly = 4/yr, monthly = 12/yr). Credits land immediately; the Stripe
// webhook grants `quantity` credits of `pentestType` per checkout.

export type Cadence = "quarterly" | "monthly";

// How many pentest credits a year's bundle contains for each testing cadence.
export const CADENCE_TESTS: Record<Cadence, number> = {
  quarterly: 4,
  monthly: 12,
};

export interface ContinuousPlan {
  id: "external_ip" | "web_app";
  name: string;
  description: string;
  oneTimePrice: number; // standard one-time per-test price
  perTestPrice: number; // discounted per-test price (20% off)
  priceId: string; // Stripe one-time price for the discounted per-test amount
  features: string[];
}

export const CONTINUOUS_PLANS: ContinuousPlan[] = [
  {
    id: "external_ip",
    name: "External IP — Continuous",
    description: "A year of recurring testing for your public-facing IPs",
    oneTimePrice: 199,
    perTestPrice: 159,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_EXTERNAL_IP_CONTINUOUS || "",
    features: [
      "20% off the standard $199 per-test price",
      "Credits land immediately — launch on your own schedule",
      "Compliance-ready reports (SOC 2, HIPAA, PCI DSS, ISO 27001, NIST)",
      "Powered by Anthropic Claude agents",
      "Results within 48 hours of each launch",
    ],
  },
  {
    id: "web_app",
    name: "Web App — Continuous",
    description: "A year of recurring testing for your web apps & APIs",
    oneTimePrice: 500,
    perTestPrice: 400,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_WEB_APP_CONTINUOUS || "",
    features: [
      "20% off the standard $500 per-test price",
      "Credits land immediately — launch on your own schedule",
      "Up to 3 user roles, 20 pages & 10 API endpoints per test",
      "Compliance-ready reports (SOC 2, HIPAA, PCI DSS, ISO 27001, NIST)",
      "Powered by Anthropic Claude agents",
    ],
  },
];
