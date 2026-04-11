export interface ReportFinding {
  title: string;
  description: string;
  poc: string;
  impact: string;
  remediation: string;
  cvss: number;
  cvssValue: string;
  severity?: "Critical" | "High" | "Medium" | "Low" | "Informational";
  references?: string[];
}

export interface ReportPayload {
  clientName: string;
  projectTitle: string;
  target?: string;
  completedDate?: string;
  tester?: string;
  version?: string;
  notes?: string;
  executiveSummary?: string;
  purpose?: string;
  scopeTargets?: string[];
  sharedWithUserIds?: string[];
  findings: ReportFinding[];
}
