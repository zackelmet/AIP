import type { Metadata } from "next";

const domain = "https://ai.affordablepentesting.com";

export const metadata: Metadata = {
  title: "Pricing - Penetration Testing as a Service",
  description:
    "See penetration testing pricing for external IP, web application, and Pentest+ plans. Buy credits instantly and launch a test in minutes.",
  metadataBase: new URL(domain),
  alternates: { canonical: `${domain}/pricing` },
  openGraph: {
    title: "Pricing - Penetration Testing as a Service",
    description:
      "External IP, web application, and Pentest+ plans. Buy credits instantly and launch a test in minutes.",
    url: `${domain}/pricing`,
    siteName: "Affordable Pentesting",
    images: [
      {
        url: "/og-logo.png",
        width: 871,
        height: 526,
        alt: "Affordable Pentesting",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing - Penetration Testing as a Service",
    description:
      "External IP, web application, and Pentest+ plans. Buy credits instantly.",
    images: ["/og-logo.png"],
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
