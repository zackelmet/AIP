import { redirect } from "next/navigation";

export default function AdminReviewRedirect() {
  redirect("/admin?tab=review");
}
