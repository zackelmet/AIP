"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/lib/context/ThemeContext";

export default function PublicNav() {
  const { theme, toggle } = useTheme();

  return (
    <header
      className="w-full border-b relative z-40"
      style={{
        backgroundColor: "var(--nav-bg)",
        borderColor: "var(--nav-border)",
        color: "var(--nav-text)",
      }}
    >
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
            className="font-semibold text-lg tracking-wide leading-tight hidden sm:block"
            style={{
              color: "var(--nav-text)",
              fontFamily: "var(--font-ibm-plex-sans)",
            }}
          >
            Affordable Pentesting
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/blog"
            className="px-3 py-1.5 text-sm transition rounded-lg"
            style={{ color: "var(--text-muted)" }}
          >
            Blog
          </Link>
          <Link
            href="/#pricing"
            className="px-3 py-1.5 text-sm transition rounded-lg"
            style={{ color: "var(--text-muted)" }}
          >
            Pricing
          </Link>

          <button
            onClick={toggle}
            className="px-3 py-1.5 text-sm transition rounded-lg hover:bg-white/10"
            style={{ color: "var(--text-muted)" }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
            style={{
              backgroundColor: "var(--primary)",
              color: "#041018",
            }}
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}
