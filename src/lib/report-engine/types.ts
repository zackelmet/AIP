export interface ReportFinding {
  title: string;
  description: string;
  poc: string;
  impact: string;
  remediation: string;
  cvss: number;
  cvssValue: string;
  /** CVSS 3.1 base score as a display string (e.g. "4.3"). */
  cvss31Score?: string;
  /** CVSS 3.1 vector string (e.g. "CVSS:3.1/AV:A/AC:H/..."). */
  cvss31Vector?: string;
  /** CVSS 4.0 base score as a display string (e.g. "2.3"). */
  cvss40Score?: string;
  /** CVSS 4.0 vector string (e.g. "CVSS:4.0/AV:N/AC:H/AT:P/..."). */
  cvss40Vector?: string;
  severity?: "Critical" | "High" | "Medium" | "Low" | "Informational";
  references?: string[];
}

export interface ReportPayload {
  reportType?: "external" | "webapp" | "msp";
  /** Cover branding — which company's logo/identity to render. */
  brand?: "msp" | "aip";
  clientName: string;
  projectTitle: string;
  target?: string;
  completedDate?: string;
  tester?: string;
  version?: string;
  notes?: string;
  executiveSummary?: string;
  purpose?: string;
  detailedAnalysis?: string;
  scopeTargets?: string[];
  sharedWithUserIds?: string[];
  findings: ReportFinding[];
}
