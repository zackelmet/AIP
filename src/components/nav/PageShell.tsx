"use client";

import { usePathname } from "next/navigation";
import PublicNav from "./PublicNav";
import Footer from "./Footer";

export default function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard =
    pathname?.startsWith("/app/") || pathname?.startsWith("/admin");

  if (isDashboard) return <>{children}</>;

  return (
    <>
      <PublicNav />
      {children}
      <Footer />
    </>
  );
}