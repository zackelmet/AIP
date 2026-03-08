"use client";

import { faUsers, faUpload, faFilePdf, faCheckCircle, faShieldHalved, faSearch } from "@fortawesome/free-solid-svg-icons";
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

export default function AdminDashboard() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Upload state
  const [userEmail, setUserEmail] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [reportUploadSuccess, setReportUploadSuccess] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ pentestId: string; target?: string } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setTotalUsers(d.totalUsers ?? 0); })
      .catch(() => setTotalUsers(0))
      .finally(() => setLoadingUsers(false));
  }, []);

  const lookupPentest = async () => {
    if (!userEmail.trim() || !launchDate) {
      showToast("error", "Enter user email and launch date");
      return;
    }
    setIsLookingUp(true);
    setLookupResult(null);
    try {
      const params = new URLSearchParams({ userEmail: userEmail.trim(), launchDate });
      const res = await fetch(`/api/admin/lookup-pentest?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setLookupResult(data);
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setIsLookingUp(false);
    }
  };

  const uploadReport = async () => {
    if (!lookupResult?.pentestId || !reportFile) {
      showToast("error", "Look up a pentest and select a file first");
      return;
    }
    setIsUploadingReport(true);
    setReportUploadSuccess(false);
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
      setReportUploadSuccess(true);
      setLookupResult(null);
      setUserEmail("");
      setLaunchDate("");
      setReportFile(null);
    } catch (err: any) {
      showToast("error", err.message || "Upload failed");
    } finally {
      setIsUploadingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <FontAwesomeIcon icon={faShieldHalved} className="text-[#34D399] text-2xl" />
        <div>
          <h1 className="text-2xl font-black">Admin Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">Affordable Pentesting — internal tools</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="neon-card p-5 flex items-center gap-4">
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
      </div>

      {/* Upload Pentest Report */}
      <div className="neon-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faFilePdf} className="text-[#34D399] text-lg" />
          <h2 className="text-lg font-bold">Upload Pentest Report</h2>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Look up the engagement by the client&apos;s email and pentest launch date, then attach and upload the report. The pentest will be marked <span className="text-[#34D399] font-semibold">completed</span> and the client will see a download button.
        </p>

        {/* Step 1: Lookup */}
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3">Step 1 — Identify Engagement</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Client email (e.g. client@company.com)"
              value={userEmail}
              onChange={(e) => { setUserEmail(e.target.value); setLookupResult(null); setReportUploadSuccess(false); }}
              className="neon-input flex-1 py-3"
            />
            <input
              type="date"
              value={launchDate}
              onChange={(e) => { setLaunchDate(e.target.value); setLookupResult(null); setReportUploadSuccess(false); }}
              className="neon-input py-3 w-full sm:w-auto"
            />
            <button
              onClick={lookupPentest}
              disabled={isLookingUp || !userEmail || !launchDate}
              className="neon-outline-btn px-5 py-3 font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faSearch} />
              {isLookingUp ? "Searching..." : "Look Up"}
            </button>
          </div>

          {lookupResult && (
            <div className="mt-3 flex items-center gap-2 text-sm text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/30 rounded-lg px-4 py-2">
              <FontAwesomeIcon icon={faCheckCircle} />
              <span>
                Found: <strong>{lookupResult.target || "Pentest"}</strong>
                <span className="text-[var(--text-muted)] ml-2">ID: {lookupResult.pentestId}</span>
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Upload */}
        <div className={lookupResult ? "" : "opacity-40 pointer-events-none"}>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3">Step 2 — Attach &amp; Upload Report</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="neon-outline-btn flex-1 py-3 font-semibold flex items-center justify-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={faUpload} />
              {reportFile ? reportFile.name : "Choose PDF or DOCX"}
              <input
                type="file"
                accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => { setReportFile(e.target.files?.[0] || null); setReportUploadSuccess(false); }}
              />
            </label>
            <button
              onClick={uploadReport}
              disabled={isUploadingReport || !reportFile || !lookupResult}
              className="neon-primary-btn px-6 py-3 font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {isUploadingReport ? (
                "Uploading..."
              ) : reportUploadSuccess ? (
                <><FontAwesomeIcon icon={faCheckCircle} />Uploaded!</>
              ) : (
                "Upload Report"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Section from "../shared/Section";
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
import useSWR from "swr";

interface DashboardData {
  totalCustomers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  mrr: number;
  churnRate: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminDashboard() {
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [amount, setAmount] = useState<number | "">("");
  const [dueDate, setDueDate] = useState("");

  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  // Report upload state
  const [reportPentestId, setReportPentestId] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [reportUploadSuccess, setReportUploadSuccess] = useState(false);

  const uploadReport = async () => {
    if (!reportPentestId.trim() || !reportFile) {
      showToast("error", "Enter a pentest ID and select a PDF");
      return;
    }
    setIsUploadingReport(true);
    setReportUploadSuccess(false);
    try {
      const form = new FormData();
      form.append("pentestId", reportPentestId.trim());
      form.append("file", reportFile);
      const res = await fetch("/api/admin/upload-report", { method: "POST", body: form });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Upload failed");
      }
      showToast("success", "Report uploaded — pentest marked completed");
      setReportUploadSuccess(true);
      setReportPentestId("");
      setReportFile(null);
    } catch (err: any) {
      showToast("error", err.message || "Upload failed");
    } finally {
      setIsUploadingReport(false);
    }
  };

  // Fetch stripe dashboard data
  const {
    data: dashboardData,
    error: dashboardError,
    mutate: mutateDashboard,
  } = useSWR<DashboardData>("/api/stripe/admin", fetcher);

  const {
    data: customers,
    error: customersError,
    mutate: mutateCustomers,
  } = useSWR<{ customers: Array<{ id: string; email: string }> }>(
    "/api/stripe/customers",
    fetcher,
  );

  if (dashboardError) {
    showToast("error", "Failed to fetch dashboard data");
  }

  if (customersError) {
    showToast("error", "Failed to fetch customers");
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US", { notation: "compact" }).format(num);
  };

  const handleGenerateInvoice = () => {
    setIsInvoiceModalOpen(true);
  };

  const generateInvoice = async () => {
    if (!selectedCustomerId) {
      showToast("error", "Please select a customer");
      return;
    }
    if (!amount || amount <= 0) {
      showToast("error", "Please enter a valid amount");
      return;
    }
    if (!dueDate) {
      showToast("error", "Please select a due date");
      return;
    }

    setIsGeneratingInvoice(true);
    try {
      const response = await fetch("/api/stripe/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          amount: parseFloat(amount.toString()),
          dueDate,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate invoice");
      }
      const { invoiceUrl } = await response.json();
      window.open(invoiceUrl, "_blank");
      setIsInvoiceModalOpen(false);
      setAmount("");
      setDueDate("");
    } catch (error) {
      console.error("Error generating invoice:", error);
      showToast("error", "Failed to generate invoice. Please try again.");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleAddCustomer = () => {
    setIsAddCustomerModalOpen(true);
  };

  const addCustomer = async () => {
    if (!newCustomerEmail) {
      showToast("error", "Please enter a valid email");
      return;
    }

    setIsAddingCustomer(true);
    try {
      const response = await fetch("/api/stripe/addCustomer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: newCustomerEmail }),
      });
      if (!response.ok) {
        throw new Error("Failed to add customer");
      }
      const { customerId } = await response.json();
      showToast("success", "Customer added successfully");
      setIsAddCustomerModalOpen(false);
      setNewCustomerEmail("");
      mutateCustomers();
    } catch (error) {
      console.error("Error adding customer:", error);
      showToast("error", "Failed to add customer. Please try again.");
    } finally {
      setIsAddingCustomer(false);
    }
  };

  return (
    <Section
      title="FireSaaS Dashboard"
      subtitle="Welcome to your all-in-one SaaS management platform!"
      icon={faRocket}
      mockup={true}
    >
      <div className="flex flex-col gap-6 w-full">
        <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-primary">
              <FontAwesomeIcon icon={faUsers} size="2x" />
            </div>
            <div className="stat-title">Total Users</div>
            <div className="stat-value text-primary">
              {formatNumber(dashboardData?.totalCustomers || 0)}
            </div>
          </div>

          <div className="stat">
            <div className="stat-figure text-secondary">
              <FontAwesomeIcon icon={faChartLine} size="2x" />
            </div>
            <div className="stat-title">Total Revenue</div>
            <div className="stat-value text-secondary">
              ${formatNumber(dashboardData?.totalRevenue || 0)}
            </div>
          </div>

          <div className="stat">
            <div className="stat-figure text-accent">
              <FontAwesomeIcon icon={faCreditCard} size="2x" />
            </div>
            <div className="stat-title">Active Subscriptions</div>
            <div className="stat-value text-accent">
              {formatNumber(dashboardData?.activeSubscriptions || 0)}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="card bg-base-100 shadow-xl flex-1">
            <div className="card-body">
              <h2 className="card-title">
                <FontAwesomeIcon icon={faChartBar} className="text-primary" />
                Key Metrics
              </h2>
              <ul className="list-none space-y-2">
                <li>
                  <span className="font-semibold">MRR:</span> $
                  {formatNumber(dashboardData?.mrr || 0)}
                </li>
                <li>
                  <span className="font-semibold">Churn Rate:</span>{" "}
                  {formatNumber(dashboardData?.churnRate || 0)}%
                </li>
                <li>
                  <span className="font-semibold">ARPU:</span> $
                  {(
                    (dashboardData?.mrr || 0) /
                    (dashboardData?.activeSubscriptions || 1)
                  ).toFixed(2)}
                </li>
              </ul>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl flex-1">
            <div className="card-body">
              <h2 className="card-title">
                <FontAwesomeIcon icon={faCog} className="text-secondary" />
                Quick Actions
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleAddCustomer}
                >
                  <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                  Add Customer
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={handleGenerateInvoice}
                >
                  <FontAwesomeIcon
                    icon={faFileInvoiceDollar}
                    className="mr-2"
                  />
                  Generate Invoice
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Pentest Report */}
        <div className="card bg-base-100 shadow-xl w-full">
          <div className="card-body">
            <h2 className="card-title">
              <FontAwesomeIcon icon={faFilePdf} className="text-error" />
              Upload Pentest Report
            </h2>
            <p className="text-sm text-base-content/60 mb-4">
              Upload a completed PDF report to a pentest. The pentest status will be set to <strong>completed</strong> and the user will see a Download button.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Pentest ID"
                value={reportPentestId}
                onChange={(e) => { setReportPentestId(e.target.value); setReportUploadSuccess(false); }}
                className="input input-bordered flex-1"
              />
              <label className="btn btn-outline flex-1 cursor-pointer">
                <FontAwesomeIcon icon={faUpload} className="mr-2" />
                {reportFile ? reportFile.name : "Choose PDF or DOCX"}
                <input
                  type="file"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => { setReportFile(e.target.files?.[0] || null); setReportUploadSuccess(false); }}
                />
              </label>
              <button
                className="btn btn-primary"
                onClick={uploadReport}
                disabled={isUploadingReport || !reportPentestId || !reportFile}
              >
                {isUploadingReport ? "Uploading..." : reportUploadSuccess ? (
                  <><FontAwesomeIcon icon={faCheckCircle} className="mr-2" />Uploaded!</>
                ) : "Upload Report"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <dialog
        id="invoice_modal"
        className={`modal ${isInvoiceModalOpen ? "modal-open" : ""}`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Generate Invoice</h3>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Select Customer</span>
            </label>
            <select
              value={selectedCustomerId || ""}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="">Select a customer</option>
              {customers?.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.email}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control w-full mt-4">
            <label className="label">
              <span className="label-text">Invoice Amount (USD)</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Enter amount"
              className="input input-bordered w-full"
            />
          </div>
          <div className="form-control w-full mt-4">
            <label className="label">
              <span className="label-text">Due Date</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>
          <div className="modal-action mt-6">
            <button
              className="btn btn-primary"
              onClick={generateInvoice}
              disabled={isGeneratingInvoice}
            >
              {isGeneratingInvoice ? "Generating..." : "Generate Invoice"}
            </button>
            <button
              className="btn"
              onClick={() => setIsInvoiceModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        id="add_customer_modal"
        className={`modal ${isAddCustomerModalOpen ? "modal-open" : ""}`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Add New Customer</h3>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Customer Email</span>
            </label>
            <input
              type="email"
              value={newCustomerEmail}
              onChange={(e) => setNewCustomerEmail(e.target.value)}
              placeholder="Enter customer email"
              className="input input-bordered w-full"
            />
          </div>
          <div className="modal-action mt-6">
            <button
              className="btn btn-primary"
              onClick={addCustomer}
              disabled={isAddingCustomer}
            >
              {isAddingCustomer ? "Adding..." : "Add Customer"}
            </button>
            <button
              className="btn"
              onClick={() => setIsAddCustomerModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </Section>
  );
}
