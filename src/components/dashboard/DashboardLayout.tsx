"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons/faHome";
import { faLifeRing } from "@fortawesome/free-solid-svg-icons/faLifeRing";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons/faShieldHalved";
import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons/faQuestionCircle";
import { faBars } from "@fortawesome/free-solid-svg-icons/faBars";
import { faRocket } from "@fortawesome/free-solid-svg-icons/faRocket";
import { faSignOutAlt } from "@fortawesome/free-solid-svg-icons/faSignOutAlt";
import { faCog } from "@fortawesome/free-solid-svg-icons/faCog";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faUser } from "@fortawesome/free-solid-svg-icons/faUser";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faList } from "@fortawesome/free-solid-svg-icons/faList";
import { faUserShield } from "@fortawesome/free-solid-svg-icons/faUserShield";
import { faCalendarCheck } from "@fortawesome/free-solid-svg-icons/faCalendarCheck";
import { useAuth } from "@/lib/context/AuthContext";
import { useUserData } from "@/lib/hooks/useUserData";
import { useTheme } from "@/lib/context/ThemeContext";
import signout from "@/lib/firebase/signout";
import Image from "next/image";
import dynamic from "next/dynamic";

const OnboardingTour = dynamic(
  () => import("@/components/onboarding/OnboardingTour"),
  { ssr: false },
);
export const START_TOUR_EVENT = "start-tour";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoadingAuth } = useAuth();
  const { userData } = useUserData();
  const { theme, toggle } = useTheme();
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const getInitials = (email: string | null | undefined) => {
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    signout(async () => {
      router.push("/login");
    });
  };

  // Close account menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { href: "/app/dashboard", label: "Dashboard", icon: faHome },
    { href: "/app/pentests", label: "Recent Tests", icon: faList },
    { href: "/app/new-pentest", label: "Launch a Pentest", icon: faRocket },
    {
      href: "/app/scheduling",
      label: "Test Scheduling",
      icon: faCalendarCheck,
    },
    {
      href: "/app/manual-pentest",
      label: "Request a Manual Pentest",
      icon: faUser,
    },
    ...(userData?.isAdmin
      ? [{ href: "/admin", label: "Admin", icon: faUserShield }]
      : []),
  ];

  const bottomItems = [
    { href: "/support", label: "Support", icon: faLifeRing },
    { href: "/trust-safety", label: "Trust + Safety", icon: faQuestionCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      {/* First-run product tour (auto-starts once on the dashboard) */}
      <OnboardingTour />

      <div className="flex flex-1 lg:overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } flex flex-col`}
          style={{ backgroundColor: "var(--sidebar-bg, #0a141f)", color: "var(--sidebar-text, #ffffff)" }}
        >
          {/* Logo */}
          <div className="p-6 border-b border-[#34D399] flex-shrink-0">
            <Link
              href="https://ai.affordablepentesting.com/"
              className="flex items-center gap-3"
            >
              <Image
                src="/affordablepentestinglogo.svg"
                alt="Affordable Pentesting"
                width={44}
                height={44}
                className="w-11 h-11 flex-shrink-0"
              />
              <span
                className="text-white font-semibold text-base tracking-wide leading-tight"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                Affordable Pentesting
              </span>
            </Link>
          </div>

          {/* Scrollable nav area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <nav className="px-4 py-6 space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" &&
                    pathname?.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={`nav-${item.href.split("/").pop()}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-[#34D399]/20 text-[#34D399] font-semibold border border-[#34D399]/30"
                        : "hover:bg-[var(--sidebar-hover)]"
                    }`}
                    style={{ color: isActive ? undefined : "var(--sidebar-text-muted)" }}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom section — pinned to sidebar bottom, no scroll */}
          <div className="flex-shrink-0 px-4 pb-6 space-y-4">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors"
              style={{ color: "var(--sidebar-text-muted)" }}
            >
              {theme === "dark" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-sm">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>

            {/* Account */}
            <div
              className="relative pt-4"
              style={{ borderTop: "1px solid var(--sidebar-border, #374151)" }}
              ref={accountMenuRef}
            >
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#34D399] text-[#041018] font-bold flex items-center justify-center text-sm">
                  {getInitials(currentUser?.email)}
                </div>
                <div className="flex-1 overflow-hidden text-left">
                  <div className="text-sm font-medium truncate">
                    {currentUser?.email || "User"}
                  </div>
                </div>
                <FontAwesomeIcon
                  icon={faChevronUp}
                  className={`text-gray-400 text-sm transition-transform ${accountMenuOpen ? "" : "rotate-180"}`}
                />
              </button>

              {/* Account Dropdown Menu */}
              {accountMenuOpen && (
                <div className="absolute bottom-full left-4 right-4 mb-2 shadow-xl overflow-hidden rounded-lg"
                    style={{ backgroundColor: "var(--sidebar-bg, #1f2937)", border: "1px solid var(--sidebar-border, #374151)" }}
                  >
                  <div className="py-1">
                    <Link
                      href="/app/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                      style={{ color: "var(--sidebar-text-muted)" }}
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                    >
                      <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setSidebarOpen(false);
                        window.dispatchEvent(new Event(START_TOUR_EVENT));
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <FontAwesomeIcon icon={faQuestionCircle} className="w-4 h-4" />
                      Take a tour
                    </button>
                    <Link
                      href="/support"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                      style={{ color: "var(--sidebar-text-muted)" }}
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                    >
                      <FontAwesomeIcon icon={faLifeRing} className="w-4 h-4" />
                      Support
                    </Link>
                    <Link
                      href="/trust-safety"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                      style={{ color: "var(--sidebar-text-muted)" }}
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                    >
                      <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4" />
                      Trust + Safety
                    </Link>
                    <div className="my-1" style={{ borderTop: "1px solid var(--sidebar-border)" }} />
                    <button
                      onClick={() => {
                        handleLogout();
                        setAccountMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                    >
                      <FontAwesomeIcon
                        icon={faSignOutAlt}
                        className="w-4 h-4"
                      />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Buy Credits button */}
            <Link
              href="/app/dashboard?purchase=web_app"
              data-tour="buy-credits"
              className="block w-full px-4 py-3 bg-[#34D399] text-[#041018] font-semibold rounded-lg text-center hover:bg-[#10b981] transition-colors"
            >
              Buy Credits
              <FontAwesomeIcon icon={faPlus} className="ml-2" />
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile header with hamburger - hidden on admin page */}
          {!pathname?.startsWith("/admin") && (
            <header className="lg:hidden px-4 py-3 flex items-center justify-between sticky top-0 z-30"
              style={{ backgroundColor: "var(--sidebar-bg, #0a141f)", borderBottom: "1px solid var(--sidebar-border, #34D399)" }}
            >
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2"
                style={{ color: "var(--sidebar-text-muted)" }}
              >
                <FontAwesomeIcon icon={faBars} className="w-6 h-6" />
              </button>
              <Link
                href="https://ai.affordablepentesting.com/"
                className="flex items-center gap-2"
              >
                <Image
                  src="/affordablepentestinglogo.svg"
                  alt="Affordable Pentesting"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <span
                  className="font-semibold text-sm"
                  style={{ color: "var(--sidebar-text, #ffffff)", fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  Affordable Pentesting
                </span>
              </Link>
              <div className="w-10" /> {/* Spacer for centering */}
            </header>
          )}

          {/* Page content */}
          {!isLoadingAuth && !currentUser && (
            <div className="border-b px-4 py-2 text-sm flex items-center justify-between gap-3"
              style={{ backgroundColor: "color-mix(in srgb, var(--primary) 60%, transparent)", borderColor: "var(--sidebar-border)", color: "var(--sidebar-text)" }}
            >
              <span>Your session has expired. Please sign in again.</span>
              <Link
                href={`/login?redirect=${encodeURIComponent(pathname || "/app/dashboard")}`}
                className="underline underline-offset-2 transition-colors font-medium"
                  style={{ color: "var(--sidebar-text)" }}
              >
                Sign in
              </Link>
            </div>
          )}
          <main className="flex-1 overflow-x-hidden overflow-y-auto" style={{ fontWeight: 300 }}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
