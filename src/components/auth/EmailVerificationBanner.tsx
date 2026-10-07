"use client";

import { useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase/firebaseClient";
import { sendEmailVerification } from "firebase/auth";

export default function EmailVerificationBanner() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    setSending(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in");

      // Try server-side Resend email first
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (res.ok) {
        setSent(true);
      } else {
        // Fallback: client-side Firebase sendEmailVerification
        await sendEmailVerification(user);
        setSent(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send verification email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 flex items-center gap-3 flex-wrap">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5 shrink-0"
      >
        <path d="M12 2a2 2 0 04 4 0 01-4 0 0 0 4 4 0 018 10 0 010 10 0 01-10 10 0 018 18 0 016 16 0 01-16 16z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-yellow-400">
          Email not verified
        </p>
        <p className="text-xs text-yellow-400/70">
          Please verify your email to launch pentests. Check your inbox (including spam).
        </p>
      </div>
      {sent ? (
        <span className="text-xs text-green-theme font-semibold shrink-0">
          Verification email sent
        </span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          className="neon-outline-btn px-4 py-2 text-sm font-semibold disabled:opacity-50 shrink-0"
        >
          {sending ? "Sending…" : "Resend verification"}
        </button>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}