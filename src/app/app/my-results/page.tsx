"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface PentestRequest {
  id: string;
  tier: string;
  companyName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  engagementId?: string;
  reportUrl?: string;
}

interface Pentest {
  id: string;
  type: string;
  targetUrl: string;
  status: string;
  createdAt: any;
  batchName?: string;
  reportUrl?: string;
}

interface Engagement {
  id: string;
  clientName: string;
  scope: string;
  status: string;
  startDate: string;
  completionDate?: string;
}

interface Finding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: string;
  description: string;
  evidence?: string;
  remediation?: string;
  cvss?: number;
  cve?: string;
  target?: string;
  foundAt: string;
}

const SEVERITY_COLORS = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  info: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400",
  reviewing: "bg-emerald-500/20 text-emerald-400",
  approved: "bg-green-500/20 text-green-400",
  in_progress: "bg-indigo-500/20 text-indigo-400",
  completed: "bg-gray-500/20 text-gray-400",
};

export default function MyResultsPage() {
  const { currentUser: user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<PentestRequest[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [pentests, setPentests] = useState<Pentest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "requests" | "engagements" | "findings" | "reports"
  >("requests");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/app/my-results");
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch requests
      const requestsRes = await fetch(
        `/api/pentest-requests?userId=${user.uid}`,
      );
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData.requests || []);
      }

      // Fetch engagements
      const engagementsRes = await fetch(`/api/engagements?userId=${user.uid}`);
      if (engagementsRes.ok) {
        const engagementsData = await engagementsRes.json();
        setEngagements(engagementsData.engagements || []);
      }

      // Fetch findings
      const findingsRes = await fetch(`/api/findings?userId=${user.uid}`);
      if (findingsRes.ok) {
        const findingsData = await findingsRes.json();
        setFindings(findingsData.findings || []);
      }

      // Fetch AI/automated pentests (for reports tab)
      const pentestsRes = await fetch(`/api/pentests?userId=${user.uid}`);
      if (pentestsRes.ok) {
        const pentestsData = await pentestsRes.json();
        setPentests(pentestsData.pentests || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (pentestId: string) => {
    setDownloadingId(pentestId);
    try {
      const res = await fetch(`/api/reports/download?pentestId=${pentestId}`);
      if (!res.ok) {
        const { error } = await res.json();
        alert(error || "Failed to get download link");
        return;
      }
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const getSeverityStats = () => {
    const stats = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    findings.forEach((finding) => {
      stats[finding.severity]++;
    });
    return stats;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading your results...</div>
      </div>
    );
  }

  const severityStats = getSeverityStats();

  return (
    <DashboardLayout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-light text-white mb-2">
              My Pentest Results
            </h1>
            <p className="text-gray-400 mt-2">
              View your pentest requests, engagements, and security findings
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <div className="text-3xl font-bold text-white">
                {requests.length}
              </div>
              <div className="text-sm text-gray-400">Total Requests</div>
            </div>
            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <div className="text-3xl font-bold text-white">
                {engagements.length}
              </div>
              <div className="text-sm text-gray-400">Active Engagements</div>
            </div>
            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <div className="text-3xl font-bold text-white">
                {findings.length}
              </div>
              <div className="text-sm text-gray-400">Total Findings</div>
            </div>
            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <div className="text-3xl font-bold text-[#34D399]">
                {pentests.filter((p) => p.reportUrl).length}
              </div>
              <div className="text-sm text-gray-400">Reports Ready</div>
            </div>
            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
              <div className="text-3xl font-bold text-red-400">
                {severityStats.critical + severityStats.high}
              </div>
              <div className="text-sm text-gray-400">
                Critical/High Severity
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white/5 rounded-lg border border-white/10">
            <div className="border-b border-white/10">
              <nav className="flex -mb-px">
                {[
                  { id: "requests", label: "Requests", count: requests.length },
                  {
                    id: "engagements",
                    label: "Engagements",
                    count: engagements.length,
                  },
                  { id: "findings", label: "Findings", count: findings.length },
                  {
                    id: "reports",
                    label: "Reports",
                    count: pentests.filter((p) => p.reportUrl).length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === tab.id
                        ? "border-[#34D399] text-[#34D399]"
                        : "border-transparent text-gray-500 hover:text-gray-300 hover:border-white/10"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Requests Tab */}
              {activeTab === "requests" && (
                <div>
                  {requests.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-4">
                        No pentest requests yet
                      </p>
                      <Link
                        href="/#pricing"
                        className="inline-block px-6 py-2 bg-[#34D399] text-white rounded-lg hover:bg-[#10b981]"
                      >
                        Request a Pentest
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((request) => (
                        <div
                          key={request.id}
                          className="border border-white/10 rounded-lg p-4 hover:border-[#34D399]/20 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-white">
                                {request.companyName}
                              </h3>
                              <p className="text-sm text-gray-400 mt-1">
                                Tier:{" "}
                                {request.tier
                                  .replace("manual_", "")
                                  .toUpperCase()}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                Submitted:{" "}
                                {new Date(
                                  request.createdAt,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                STATUS_COLORS[
                                  request.status as keyof typeof STATUS_COLORS
                                ] || "bg-gray-500/20 text-gray-400"
                              }`}
                            >
                              {request.status.replace("_", " ").toUpperCase()}
                            </span>
                          </div>
                          {request.engagementId && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <Link
                                href={`/app/engagements/${request.engagementId}`}
                                className="text-[#34D399] hover:text-[#10b981] text-sm font-medium"
                              >
                                View Engagement →
                              </Link>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Engagements Tab */}
              {activeTab === "engagements" && (
                <div>
                  {engagements.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No active engagements</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {engagements.map((engagement) => (
                        <div
                          key={engagement.id}
                          className="border border-white/10 rounded-lg p-4 hover:border-[#34D399]/20 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-white">
                                {engagement.clientName}
                              </h3>
                              <p className="text-sm text-gray-400 mt-1">
                                {engagement.scope}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                Started:{" "}
                                {new Date(
                                  engagement.startDate,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                STATUS_COLORS[
                                  engagement.status as keyof typeof STATUS_COLORS
                                ] || "bg-gray-500/20 text-gray-400"
                              }`}
                            >
                              {engagement.status
                                .replace("_", " ")
                                .toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Findings Tab */}
              {activeTab === "findings" && (
                <div>
                  {findings.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No findings yet</p>
                    </div>
                  ) : (
                    <div>
                      {/* Severity Filter/Stats */}
                      <div className="flex gap-2 mb-6 flex-wrap">
                        {Object.entries(severityStats).map(
                          ([severity, count]) => (
                            <div
                              key={severity}
                              className={`px-4 py-2 rounded-lg border ${
                                SEVERITY_COLORS[
                                  severity as keyof typeof SEVERITY_COLORS
                                ]
                              }`}
                            >
                              <span className="font-semibold capitalize">
                                {severity}:
                              </span>{" "}
                              <span>{count}</span>
                            </div>
                          ),
                        )}
                      </div>

                      {/* Findings List */}
                      <div className="space-y-4">
                        {findings
                          .sort((a, b) => {
                            const severityOrder = {
                              critical: 0,
                              high: 1,
                              medium: 2,
                              low: 3,
                              info: 4,
                            };
                            return (
                              severityOrder[a.severity] -
                              severityOrder[b.severity]
                            );
                          })
                          .map((finding) => (
                            <div
                              key={finding.id}
                              className="border border-white/10 rounded-lg p-4 hover:border-[#34D399]/20 transition-colors"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="font-semibold text-white">
                                  {finding.title}
                                </h3>
                                <span
                                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    SEVERITY_COLORS[finding.severity]
                                  }`}
                                >
                                  {finding.severity.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300 mb-3">
                                {finding.description}
                              </p>
                              {finding.target && (
                                <p className="text-sm text-gray-400 mb-2">
                                  <span className="font-medium">Target:</span>{" "}
                                  {finding.target}
                                </p>
                              )}
                              {finding.cvss && (
                                <p className="text-sm text-gray-400 mb-2">
                                  <span className="font-medium">
                                    CVSS Score:
                                  </span>{" "}
                                  {finding.cvss}
                                </p>
                              )}
                              {finding.cve && (
                                <p className="text-sm text-gray-400 mb-2">
                                  <span className="font-medium">CVE:</span>{" "}
                                  {finding.cve}
                                </p>
                              )}
                              {finding.remediation && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                  <p className="text-sm font-medium text-gray-300 mb-1">
                                    Remediation:
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    {finding.remediation}
                                  </p>
                                </div>
                              )}
                              <p className="text-xs text-gray-500 mt-3">
                                Found:{" "}
                                {new Date(finding.foundAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Reports Tab */}
              {activeTab === "reports" && (
                <div>
                  {pentests.filter((p) => p.reportUrl).length === 0 &&
                  pentests.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No pentests found</p>
                    </div>
                  ) : pentests.filter((p) => p.reportUrl).length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No completed reports yet.</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Reports will appear here once your pentest is completed.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pentests
                        .filter((p) => p.reportUrl)
                        .map((pentest) => (
                          <div
                            key={pentest.id}
                            className="border border-white/10 rounded-lg p-4 flex items-center justify-between hover:border-[#34D399]/20 transition-colors"
                          >
                            <div>
                              <h3 className="font-semibold text-white">
                                {pentest.batchName ||
                                  pentest.targetUrl ||
                                  "Pentest"}
                              </h3>
                              <p className="text-sm text-gray-400 mt-1 capitalize">
                                {pentest.type?.replace("_", " ")} &mdash;{" "}
                                {pentest.status}
                              </p>
                              {pentest.createdAt?.seconds && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(
                                    pentest.createdAt.seconds * 1000,
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => downloadReport(pentest.id)}
                              disabled={downloadingId === pentest.id}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-[#34D399] hover:bg-[#10b981] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                              {downloadingId === pentest.id
                                ? "Getting link..."
                                : "⬇ Download Report"}
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
