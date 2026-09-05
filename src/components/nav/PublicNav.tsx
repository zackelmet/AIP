import Link from "next/link";
import Image from "next/image";

export default function PublicNav() {
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

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/blog"
            className="px-3 py-1.5 text-sm text-gray-300 hover:text-white transition rounded-lg"
          >
            Blog
          </Link>
          <Link
            href="/#pricing"
            className="px-3 py-1.5 text-sm text-gray-300 hover:text-white transition rounded-lg"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-[#34D399] hover:bg-[#10b981] text-[#041018] font-semibold text-sm rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}