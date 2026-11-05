"use client";

import { useEffect, useState } from "react";
import AdminDashboard from "@/components/admin/AdminDashboard";
import ReviewPentests from "@/components/admin/ReviewPentests";
import ReportEngine from "@/components/admin/ReportEngine";
import { faGaugeHigh } from "@fortawesome/free-solid-svg-icons/faGaugeHigh";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons/faShieldHalved";
import { faFileWord } from "@fortawesome/free-solid-svg-icons/faFileWord";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: faGaugeHigh },
  { id: "review", label: "Review", icon: faShieldHalved },
  { id: "report-engine", label: "Docx Reporting", icon: faFileWord },
];

export default function AdminTabs({ defaultTab }: { defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(
    TABS.some((t) => t.id === defaultTab) ? defaultTab : "dashboard",
  );
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const [reviewRes, pendingRes] = await Promise.all([
          fetch("/api/admin/active-pentests?status=review"),
          fetch("/api/admin/active-pentests?status=pending_dispatch"),
        ]);
        const reviewData = await reviewRes.json();
        const pendingData = await pendingRes.json();
        const count =
          (reviewData.pentests?.length || 0) +
          (pendingData.pentests?.length || 0);
        setPendingCount(count);
      } catch {}
    };
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* Tab Navigation */}
      <div className="bg-theme-panel border-b border-theme">
        <div className="flex overflow-x-auto gap-1 px-4 sm:px-6 pt-6 sm:pt-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-green-theme text-green-theme"
                  : "border-transparent text-theme-muted hover:text-[var(--text)]"
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} className="text-sm" />
              {tab.label}
              {tab.id === "review" && pendingCount > 0 && (
                <span className="ml-1 text-xs bg-[#34D399]/20 text-[#34D399] rounded-full px-1.5 py-0.5 font-semibold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && <AdminDashboard />}
      {activeTab === "review" && <ReviewPentests />}
      {activeTab === "report-engine" && <ReportEngine />}
    </>
  );
}
