import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ClientProviders from "@/lib/context/ClientProviders";
import ConditionalNav from "@/components/nav/ConditionalNav";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Affordable Pentesting - Penetration Testing as a Service",
  description:
    "AI-powered and expert-led penetration testing. Get comprehensive security assessments from certified professionals.",
  metadataBase: new URL("https://ai.affordablepentesting.com"),
  alternates: {
    canonical: "https://ai.affordablepentesting.com",
  },
  openGraph: {
    title: "Affordable Pentesting - Penetration Testing as a Service",
    description:
      "AI-powered automated pentests and expert-led manual penetration testing.",
    url: "https://ai.affordablepentesting.com",
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
    title: "Affordable Pentesting - Penetration Testing as a Service",
    description:
      "AI-powered automated pentests and expert-led manual penetration testing.",
    images: ["/og-logo.png"],
  },
  icons: {
    icon: [
      { url: "/affordablepentestinglogo.svg" },
      { url: "/affordablepentestinglogo.svg", sizes: "32x32" },
      { url: "/affordablepentestinglogo.svg", sizes: "16x16" },
    ],
    shortcut: "/affordablepentestinglogo.svg",
    apple: "/affordablepentestinglogo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={ibmPlexSans.variable}>
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-M5G1ZEH7SX"
        strategy="lazyOnload"
      />
      <Script id="gtag-init" strategy="lazyOnload">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-M5G1ZEH7SX');
        gtag('config', 'G-W7KR3XVQTY');
        gtag('config', 'AW-18028367660');
      `}</Script>
      {/* Ahrefs Analytics */}
      <Script
        src="https://analytics.ahrefs.com/analytics.js"
        data-key="N4Mnpu+8JEJfzzJ4k33EyQ"
        strategy="lazyOnload"
      />
      {/* Change your theme HERE */}
      <body data-theme="cupcake" className={ibmPlexSans.className}>
        <ClientProviders>
          <ConditionalNav>{children}</ConditionalNav>
        </ClientProviders>
      </body>
    </html>
  );
}
