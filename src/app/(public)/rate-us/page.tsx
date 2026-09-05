import { Suspense } from "react";
import RateUsForm from "@/components/RateUsForm";

export const metadata = {
  title: "Rate Your Experience · Affordable Pentesting",
  robots: { index: false, follow: false },
};

export default function RateUsPage() {
  return (
    <main className="min-h-screen bg-[#0a141f] text-white flex flex-col items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <RateUsForm />
      </Suspense>
    </main>
  );
}
