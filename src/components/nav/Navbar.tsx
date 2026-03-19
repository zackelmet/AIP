"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";

export default function Navbar() {
  const { currentUser, isLoadingAuth } = useAuth();

  return (
    <header className="w-full border-b border-[#34D399] bg-[#0a141f] text-white relative z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-5 py-4">
        <Link
          href="https://ai.affordablepentesting.com/"
          className="flex items-center gap-3 hover:opacity-90 transition"
        >
          <Image
            src="/affordablepentestinglogo.svg"
            alt="Affordable Pentesting Logo"
            width={40}
            height={40}
            className="h-10 w-auto"
            priority
          />
          <span
            className="text-white font-semibold text-lg tracking-wide leading-tight hidden sm:block"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            Affordable Pentesting
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {!isLoadingAuth && !currentUser && (
            <>
              <Link
                href="/#pricing"
                className="text-sm font-medium hover:text-[#34D399] transition"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold bg-[#34D399] hover:bg-[#10b981] text-[#041018] rounded-lg transition"
              >
                Sign In
              </Link>
            </>
          )}

          {!isLoadingAuth && currentUser && (
            <Link
              href="/app/dashboard"
              className="px-4 py-2 text-sm font-semibold bg-[#34D399] hover:bg-[#10b981] text-[#041018] rounded-lg transition"
            >
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
