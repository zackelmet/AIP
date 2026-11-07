"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faUsers,
  faShieldHalved,
  faFileWord,
} from "@fortawesome/free-solid-svg-icons";
import AdminDashboard from "@/components/admin/AdminDashboard";
import ReviewPentests from "@/components/admin/ReviewPentests";
import ReportEngine from "@/components/admin/ReportEngine";
import UsersSection from "@/components/admin/sections/UsersSection";

const TABS = [
  { id: "overview", label: "Overview", icon: faGaugeHigh },
  { id: "review", label: "Pending", icon: faShieldHalved },
  { id: "users", label: "Users", icon: faUsers },
  { id: "report-engine", label: "Docx Reporting", icon: faFileWord },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AdminConsoleInner() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const active: TabId = TABS.some((t) => t.id === raw)
    ? (raw as TabId)
    : "overview";

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-1">Admin</h1>
        <p className="text-[var(--text-muted)] text-sm">
          Pentest review, user management, and report generation.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border)] mb-8 overflow-x-auto">
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <Link
              key={t.id}
              href={`/admin?tab=${t.id}`}
              scroll={false}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-p transition-colors ${
                isActive
                  ? "border-[#34D399] text-[#34D399]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              <FontAwesomeIcon icon={t.icon} className="w-4 h-4" />
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Active section */}
      {active === "overview" && <AdminDashboard />}
      {active === "review" && <ReviewPentests />}
      {active === "users" && <UsersSection />}
      {active === "report-engine" && <ReportEngine />}
    </div>
  );
}

export default function AdminConsole() {
  return (
    <Suspense
      fallback={<div className="p-8 text-[var(--text-muted)]">Loading…</div>}
    >
      <AdminConsoleInner />
    </Suspense>
  );
}
