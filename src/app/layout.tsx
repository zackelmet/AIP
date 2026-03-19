import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
// ClientProviders and Navbar were temporarily disabled during prerender
// diagnostics; restore them now.
import ClientProviders from "@/lib/context/ClientProviders";
import ConditionalNav from "@/components/nav/ConditionalNav";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Affordable Pentesting - Penetration Testing as a Service",
  description:
    "AI-powered automated pentests and expert-led manual penetration testing. Get comprehensive security assessments from certified professionals.",
  metadataBase: new URL("https://ai.affordablepentesting.com"),
  openGraph: {
    title: "Affordable Pentesting - Penetration Testing as a Service",
    description:
      "AI-powered automated pentests and expert-led manual penetration testing.",
    url: "https://ai.affordablepentesting.com",
    siteName: "Affordable Pentesting",
  },
  twitter: {
    card: "summary_large_image",
    title: "Affordable Pentesting - Penetration Testing as a Service",
    description:
      "AI-powered automated pentests and expert-led manual penetration testing.",
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
      {/* Change your theme HERE */}
      <body data-theme="cupcake">
        <ClientProviders>
          <ConditionalNav>{children}</ConditionalNav>
        </ClientProviders>
      </body>
    </html>
  );
}
