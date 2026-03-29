import AdminDashboard from "@/components/admin/AdminDashboard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdmin } from "@/lib/auth/verifyAuth";
import { NextRequest } from "next/server";

export default async function AdminDashboardPage() {
  // Build a minimal NextRequest-shaped object from the cookie store so we can
  // reuse the shared verifyAdmin helper (which reads the __session cookie).
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("__session")?.value ?? "";
  const mockReq = new NextRequest("http://localhost/admin", {
    headers: { cookie: `__session=${sessionToken}` },
  });

  const token = await verifyAdmin(mockReq);
  if (!token) {
    redirect("/app/dashboard");
  }

  return (
    <DashboardLayout>
      <AdminDashboard />
    </DashboardLayout>
  );
}
