export interface CoverageInput {
  scanMode?: string | null;
  openPorts?: number[];
  services?: {
    port: number;
    protocol: string;
    service: string;
    product: string;
  }[];
  notes?: string[];
  baselineFindingsCount?: number;
}

export function buildCoverageTable(coverage: CoverageInput | null): string {
  if (!coverage) return "";

  const lines: string[] = [];

  const tcpScope =
    coverage.scanMode === "deep"
      ? "TCP: full sweep of all 65,535 ports"
      : "TCP: 1,000 most common ports";
  lines.push("Scan scope:");
  lines.push(`  ${tcpScope}`);
  lines.push("  UDP: 100 most common ports (VPN, DNS, SNMP, NTP, etc.)");
  lines.push("  Service version detection + banner grabbing on all responses");
  lines.push(
    `  Baseline vulnerability templates run against discovered web services: ${
      coverage.baselineFindingsCount ?? 0
    } known-issue hit(s)`,
  );
  lines.push("");

  const services = coverage.services || [];
  if (services.length > 0) {
    lines.push("Discovered services:");
    for (const s of services) {
      lines.push(
        `  ${s.protocol.toUpperCase()}/${String(s.port).padEnd(5)}  ${(
          s.product ||
          s.service ||
          "unknown"
        ).slice(0, 60)}`,
      );
    }
  } else {
    lines.push(
      "Discovered services: none — every swept port was closed or filtered.",
    );
  }

  if (Array.isArray(coverage.notes) && coverage.notes.length > 0) {
    lines.push("");
    lines.push(`Scan notes: ${coverage.notes.join("; ")}`);
  }

  return lines.join("\n").trim();
}
