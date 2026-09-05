import ClientProviders from "@/lib/context/ClientProviders";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - Affordable Pentesting",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClientProviders>{children}</ClientProviders>;
}