import type { Metadata } from "next";

const domain = "https://ai.affordablepentesting.com";

export const metadata: Metadata = {
  title: "Support - Affordable Pentesting",
  description:
    "Need help with credits, launching a pentest, or interpreting a report? Contact the Affordable Pentesting support team and get answers fast.",
  metadataBase: new URL(domain),
  alternates: { canonical: `${domain}/support` },
  openGraph: {
    title: "Support - Affordable Pentesting",
    description:
      "Contact the Affordable Pentesting support team for help with credits, pentest launches, and reports.",
    url: `${domain}/support`,
    siteName: "Affordable Pentesting",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Support - Affordable Pentesting",
    description:
      "Contact the Affordable Pentesting support team for help with credits, pentest launches, and reports.",
  },
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
