import { redirect } from "next/navigation";

export default function AdminReportEngineRedirect() {
  redirect("/admin?tab=report-engine");
}
