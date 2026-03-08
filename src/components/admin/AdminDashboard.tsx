"use client";

import { faUsers, faUpload, faFilePdf, faCheckCircle, faShieldHalved, faSearch, faArrowRight, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";

const showToast = (type: "error" | "success", message: string) => {
  import("react-hot-toast")
    .then((mod) => {
      const { toast } = mod as any;
      if (type === "error") toast.error(message);
      else toast.success(message);
    })
    .catch(() => {});
};

type Step = 1 | 2 | 3 | 4;

export default function AdminDashboard() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [userEmail, setUserEmail] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ pentestId: string; target?: string; createdAt?: string } | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isUploadingReport, setIsUploadingReport] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setTotalUsers(d.totalUsers ?? 0); })
      .catch(() => setTotalUsers(0))
      .finally(() => setLoadingUsers(false));
  }, []);

  const resetWizard = () => {
    setStep(1);
    setUserEmail("");
    setLaunchDate("");
    setLookupResult(null);
    setReportFile(null);
  };

  const confirmEmail = () => {
    if (!userEmail.trim()) { showToast("error", "Enter the client email"); return; }
    setStep(2);
  };

  const lookupPentest = async () => {
    if (!launchDate) { showToast("error", "Select the pentest launch date"); return; }
    setIsLookingUp(true);
    setLookupResult(null);
    try {
      const params = new URLSearchParams({ userEmail: userEmail.trim(), launchDate });
      const res = await fetch(`/api/admin/lookup-pentest?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setLookupResult(data);
      setStep(3);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setIsLookingUp(false);
    }
  };

  const uploadReport = async () => {
    if (!lookupResult?.pentestId || !reportFile) {
      showToast("error", "Select a file first");
      return;
    }
    setIsUploadingReport(true);
    try {
      const form = new FormData();
      form.append("pentestId", lookupResult.pentestId);
      form.append("file", reportFile);
      const res = await fetch("/api/admin/upload-report", { method: "POST", body: form });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Upload failed");
      }
      showToast("success", "Report uploaded — pentest marked completed ✓");
      setStep(4);
    } catch (err: any) {
      showToast("error", err.message || "Upload failed");
    } finally {
      setIsUploadingReport(false);
    }
  };

  const steps = [
    { n: 1, label: "Client Email" },
    { n: 2, label: "Launch Date" },
    { n: 3, label: "Upload Report" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faShieldHalved} className="text-[#34D399] text-2xl" />
        <div>
          <h1 className="text-2xl font-black">Admin Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">Affordable Pentesting — internal tools</p>
        </div>
      </div>

      {/* Stats */}
      <div className="neon-card p-5 flex items-center gap-4 w-fit">
        <div className="w-12 h-12 rounded-xl bg-[#34D399]/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faUsers} className="text-[#34D399] text-xl" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Total Users</p>
          <p className="text-3xl font-black">
            {loadingUsers ? <span className="opacity-40">—</span> : totalUsers}
          </p>
        </div>
      </div>

      {/* Upload Wizard */}
      <div className="neon-card p-6 space-y-6 max-w-2xl">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faFilePdf} className="text-[#34D399] text-lg" />
          <h2 className="text-lg font-bold">Upload Pentest Report</h2>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                  step === s.n
                    ? "bg-[#34D399] text-[#041018]"
                    : step > s.n
                    ? "bg-[#34D399]/20 text-[#34D399]"
                    : "bg-white/5 text-[var(--text-muted)]"
                }`}>
                  {step > s.n ? <FontAwesomeIcon icon={faCheckCircle} /> : <span>{s.n}</span>}
                  {s.label}
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px w-6 ${step > s.n ? "bg-[#34D399]/40" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Email */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-[var(--text-muted)] block mb-2">Client email address</label>
              <input
                type="email"
                placeholder="client@company.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmEmail()}
                className="neon-input w-full py-3"
                autoFocus
              />
            </div>
            <button
              onClick={confirmEmail}
              disabled={!userEmail.trim()}
              className="neon-primary-btn px-6 py-3 font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              Next <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
        )}

        {/* Step 2: Date */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
              <span>Client:</span>
              <span className="text-[var(--text)] font-semibold">{userEmail}</span>
              <button onClick={() => setStep(1)} className="ml-auto text-xs underline opacity-60 hover:opacity-100">
                Change
              </button>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--text-muted)] block mb-2">Pentest launch date</label>
              <input
                type="date"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                className="neon-input w-full py-3"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="neon-outline-btn px-4 py-3 font-semibold flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faArrowLeft} /> Back
              </button>
              <button
                onClick={lookupPentest}
                disabled={isLookingUp || !launchDate}
                className="neon-primary-btn px-6 py-3 font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faSearch} />
                {isLookingUp ? "Searching..." : "Find Pentest"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload */}
        {step === 3 && lookupResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm bg-[#34D399]/10 border border-[#34D399]/30 rounded-lg px-4 py-3">
              <FontAwesomeIcon icon={faCheckCircle} className="text-[#34D399]" />
              <div>
                <p className="text-[#34D399] font-semibold">{lookupResult.target || "Pentest found"}</p>
                <p className="text-[var(--text-muted)] text-xs">{userEmail} · {launchDate} · ID: {lookupResult.pentestId}</p>
              </div>
              <button onClick={() => setStep(2)} className="ml-auto text-xs underline opacity-60 hover:opacity-100">
                Change
              </button>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--text-muted)] block mb-2">Attach report (PDF or DOCX)</label>
              <label className="neon-outline-btn w-full py-3 font-semibold flex items-center justify-center gap-2 cursor-pointer">
                <FontAwesomeIcon icon={faUpload} />
                {reportFile ? reportFile.name : "Choose file…"}
                <input
                  type="file"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="neon-outline-btn px-4 py-3 font-semibold flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faArrowLeft} /> Back
              </button>
              <button
                onClick={uploadReport}
                disabled={isUploadingReport || !reportFile}
                className="neon-primary-btn px-6 py-3 font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {isUploadingReport ? "Uploading..." : "Upload Report"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[#34D399]/10 flex items-center justify-center mx-auto">
              <FontAwesomeIcon icon={faCheckCircle} className="text-[#34D399] text-3xl" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#34D399]">Report uploaded successfully</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                The pentest for <strong>{userEmail}</strong> has been marked <strong>completed</strong>.<br />
                The client can now download their report from the dashboard.
              </p>
            </div>
            <button onClick={resetWizard} className="neon-outline-btn px-6 py-3 font-semibold">
              Upload Another Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
