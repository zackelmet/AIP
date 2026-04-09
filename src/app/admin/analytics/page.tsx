import AdminAnalytics from "@/components/admin/AdminAnalytics";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";

export default async function AdminAnalyticsPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("__session")?.value ?? "";

  if (!sessionToken) {
    redirect("/login");
  }

  const admin = initializeAdmin();
  let isAdmin = false;
  try {
    const decoded = await admin.auth().verifyIdToken(sessionToken);
    if (decoded.isAdmin === true) {
      isAdmin = true;
    } else {
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(decoded.uid)
        .get();
      if (userDoc.data()?.isAdmin === true) {
        isAdmin = true;
      }
    }
  } catch {}

  if (!isAdmin) {
    redirect("/app/dashboard");
  }

  return (
    <DashboardLayout>
      <AdminAnalytics />
    </DashboardLayout>
  );
}
