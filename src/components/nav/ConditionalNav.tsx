"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ConditionalNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Hide public navbar/footer on dashboard and admin routes.
  // Default to true (hidden) so SSR never flashes the nav on protected pages.
  const isDashboard = !pathname || pathname.startsWith("/app/") || pathname.startsWith("/admin");

  return (
    <>
      {!isDashboard && <Navbar />}
      {children}
      {!isDashboard && <Footer />}
    </>
  );
}
