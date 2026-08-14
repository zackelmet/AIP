import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Sign In - Affordable Pentesting",
  description:
    "Sign in to your Affordable Pentesting account to launch pentests, view reports, and manage your credits.",
  openGraph: {
    title: "Sign In - Affordable Pentesting",
    description:
      "Sign in to your Affordable Pentesting account.",
  },
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[--text]">
      <LoginForm />
    </main>
  );
}
