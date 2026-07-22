"use client";

import { useState } from "react";
import AdminDashboard from "@/components/admin/AdminDashboard";
import ReviewPentests from "@/components/admin/ReviewPentests";
import ReportEngine from "@/components/admin/ReportEngine";
import QuickReport from "@/components/admin/QuickReport";
import {
  faGaugeHigh,
  faShieldHalved,
  faFilePdf,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: faGaugeHigh },
  { id: "review", label: "Review", icon: faShieldHalved },
  { id: "report-engine", label: "Report Engine", icon: faFilePdf },
  { id: "quick-report", label: "Quick Report", icon: faBolt },
];

export default function AdminTabs({ defaultTab }: { defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(
    TABS.some((t) => t.id === defaultTab) ? defaultTab : "dashboard",
  );

  return (
    <>
      {/* Tab Navigation */}
      <div className="bg-[#041018] border-b border-white/10">
        <div className="flex overflow-x-auto gap-1 px-4 sm:px-6 pt-6 sm:pt-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#34D399] text-[#34D399]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} className="text-sm" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && <AdminDashboard />}
      {activeTab === "review" && <ReviewPentests />}
      {activeTab === "report-engine" && <ReportEngine />}
      {activeTab === "quick-report" && <QuickReport />}
    </>
  );
}
