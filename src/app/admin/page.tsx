import AdminDashboard from "@/components/admin/AdminDashboard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("__session")?.value ?? "";

  if (!sessionToken) {
    redirect("/login");
  }

  const admin = initializeAdmin();
  let isAdmin = false;
  try {
    let decoded: any;
    try {
      decoded = await admin.auth().verifySessionCookie(sessionToken, false);
    } catch {
      decoded = await admin.auth().verifyIdToken(sessionToken);
    }
    // Fast path: custom claim
    if (decoded.isAdmin === true) {
      isAdmin = true;
    } else {
      // Fallback: Firestore isAdmin field
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(decoded.uid)
        .get();
      if (userDoc.data()?.isAdmin === true) {
        isAdmin = true;
      }
    }
  } catch {
    // Invalid or expired token
  }

  if (!isAdmin) {
    redirect("/app/dashboard");
  }

  return (
    <DashboardLayout>
      <AdminDashboard />
    </DashboardLayout>
  );
}
