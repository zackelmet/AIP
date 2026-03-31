import { Timestamp } from "firebase-admin/firestore";

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "none";
export interface UserDocument {
  // Basic Info
  uid: string;
  email: string;
  name: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // Role
  isAdmin?: boolean;

  // Stripe Integration
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodStart?: Timestamp;
  currentPeriodEnd?: Timestamp;

  // Scan Limits & Usage
  monthlyScansLimit: number; // aggregate (sum of per-scanner limits) kept for backwards compat
  // Per-scanner limits and usage counters
  scannerLimits?: {
    nmap: number;
    openvas: number;
    zap: number;
  };
  scannersUsedThisMonth?: {
    nmap: number;
    openvas: number;
    zap: number;
  };
  // Credits for pentests
  credits?: {
    web_app: number;
    external_ip: number;
    pentest_plus: number;
  };
  scansThisMonth: number; // legacy counter (kept for compatibility) that resets monthly
  totalScansAllTime: number; // Lifetime counter
  lastScanDate?: Timestamp;
  lastMonthlyReset?: Timestamp; // Track when we last reset the counter
  savedTargets?: SavedTarget[];

  // Feature Access Flags (for future use)
  features?: {
    nmapEnabled: boolean;
    openvasEnabled: boolean;
    apiAccess: boolean;
    customReports: boolean;
    prioritySupport: boolean;
  };

  // Scan Results (last 30 days, metadata only)
  completedScans?: ScanMetadata[];

  // Optional Metadata
  lastLoginAt?: Timestamp;
  profileImageUrl?: string;
  companyName?: string;
}

export interface SavedTarget {
  id: string;
  name: string;
  addresses: string[]; // Changed from 'address' to support multiple targets
  address?: string; // Legacy field for backward compatibility
  type: "ip" | "domain" | "url" | "group";
  tags?: string[];
  createdAt?: Timestamp;
}
export interface ScanMetadata {
  scanId: string;
  type: "nmap" | "openvas" | "zap";
  target: string;
  status: "queued" | "running" | "completed" | "failed";
  batchId?: string; // Groups scans from the same multi-target job
  startTime: Timestamp;
  endTime?: Timestamp;
  resultsSummary?: {
    portsFound?: number;
    vulnerabilities?: number;
    severity?: "low" | "medium" | "high" | "critical";
  };
  gcpStorageUrl?: string; // Signed URL to full scan results in Cloud Storage
  errorMessage?: string;
}

// Helper to check if monthly reset is needed
export function needsMonthlyReset(lastReset: Timestamp | undefined): boolean {
  if (!lastReset) return true;

  const now = new Date();
  const lastResetDate = lastReset.toDate();

  // Check if we're in a different month
  return (
    now.getMonth() !== lastResetDate.getMonth() ||
    now.getFullYear() !== lastResetDate.getFullYear()
  );
}
