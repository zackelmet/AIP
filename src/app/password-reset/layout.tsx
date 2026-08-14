import type { Metadata } from "next";

const domain = "https://ai.affordablepentesting.com";

export const metadata: Metadata = {
  title: "Reset Password - Affordable Pentesting",
  description:
    "Reset your Affordable Pentesting account password securely.",
  metadataBase: new URL(domain),
  alternates: { canonical: `${domain}/password-reset` },
  openGraph: {
    title: "Reset Password - Affordable Pentesting",
    description: "Reset your Affordable Pentesting account password.",
    url: `${domain}/password-reset`,
    siteName: "Affordable Pentesting",
    type: "website",
  },
};

export default function PasswordResetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}