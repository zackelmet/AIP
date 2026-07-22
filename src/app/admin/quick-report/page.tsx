import { redirect } from "next/navigation";

export default function AdminQuickReportRedirect() {
  redirect("/admin?tab=quick-report");
}
