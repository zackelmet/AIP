"use client";

import { useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faFilter,
  faSearch,
  faUser,
  faSatelliteDish,
  faBug,
  faFileAlt,
  faBullseye,
  faPlay,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useActivityLog } from "@/lib/hooks/useActivityLog";
import { ActivityType } from "@/lib/types/pentest";

const activityIcons: Record<ActivityType, any> = {
  manual_test: faUser,
  ai_scan: null,
  nmap_scan: faSatelliteDish,
  openvas_scan: faSatelliteDish,
  zap_scan: faSatelliteDish,
  finding_added: faBug,
  report_generated: faFileAlt,
  target_added: faBullseye,
  engagement_started: faPlay,
  engagement_completed: faCheckCircle,
};

const activityColors: Record<ActivityType, string> = {
  manual_test: "bg-emerald-500/20 text-emerald-400",
  ai_scan: "bg-purple-500/20 text-purple-400",
  nmap_scan: "bg-cyan-500/20 text-cyan-400",
  openvas_scan: "bg-orange-500/20 text-orange-400",
  zap_scan: "bg-green-500/20 text-green-400",
  finding_added: "bg-red-500/20 text-red-400",
  report_generated: "bg-gray-500/20 text-gray-400",
  target_added: "bg-yellow-500/20 text-yellow-400",
  engagement_started: "bg-emerald-500/20 text-emerald-400",
  engagement_completed: "bg-teal-500/20 text-teal-400",
};

export default function ActivityPage() {
  const { activities, loading } = useActivityLog(100);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<ActivityType | "all">("all");

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.target?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === "all" || activity.type === filterType;

    return matchesSearch && matchesFilter;
  });

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Activity Log</h1>
            <p className="text-gray-400 mt-1">
              Track all pentest activities - manual and automated
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4"
              />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] focus:border-transparent bg-white/5 text-white"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <FontAwesomeIcon
                icon={faFilter}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
              />
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as ActivityType | "all")
                }
                className="pl-10 pr-8 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D399] focus:border-transparent appearance-none bg-white/5 text-white min-w-[180px]"
              >
                <option value="all">All Activities</option>
                <option value="manual_test">Manual Tests</option>
                <option value="ai_scan">AI Scans</option>
                <option value="finding_added">Findings</option>
                <option value="engagement_started">Engagements</option>
                <option value="nmap_scan">Nmap Scans</option>
                <option value="openvas_scan">OpenVAS Scans</option>
                <option value="zap_scan">ZAP Scans</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity List */}
        <div className="bg-white/5 rounded-xl border border-white/10">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading activities...
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-8 text-center">
              <FontAwesomeIcon
                icon={faClipboardList}
                className="w-12 h-12 text-gray-600 mb-4"
              />
              <h3 className="text-lg font-medium text-white">
                No activities yet
              </h3>
              <p className="text-gray-400 mt-1">
                Start a manual test or run an AI scan to see activities here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${activityColors[activity.type] || "bg-gray-500/20 text-gray-400"}`}
                    >
                      {activityIcons[activity.type] ? (
                        <FontAwesomeIcon
                          icon={activityIcons[activity.type]}
                          className="w-4 h-4"
                        />
                      ) : (
                        <Image
                          src="/brain.png"
                          alt="AI"
                          width={16}
                          height={16}
                          className="w-4 h-4"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-white truncate">
                          {activity.title}
                        </h4>
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-gray-400 mt-1">
                          {activity.description}
                        </p>
                      )}
                      {activity.target && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-white/10 text-gray-300 text-xs font-mono">
                            {activity.target}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
