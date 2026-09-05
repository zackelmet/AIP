import { SubscriptionModalProvider } from "@/lib/context/SubscriptionModalContext";
import ClientProviders from "@/lib/context/ClientProviders";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affordable Pentesting - Dashboard",
  description:
    "Vulnerability Scanning: Zero Install. Maximum Impact. Hosted Nmap and OpenVAS services on fast, optimized servers.",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClientProviders>
      <SubscriptionModalProvider>{children}</SubscriptionModalProvider>
    </ClientProviders>
  );
}