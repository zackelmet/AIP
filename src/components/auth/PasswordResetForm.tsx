"use client";

import { auth } from "@/lib/firebase/firebaseClient";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const showToast = (type: "error" | "success", message: string) => {
  import("react-hot-toast")
    .then((mod) => {
      const t = mod as any;
      if (type === "error") t.toast.error(message);
      else t.toast.success(message);
    })
    .catch(() => {});
};

export default function PasswordResetForm() {
  const [newPassword, setNewPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const handlePasswordReset = async () => {
    if (!oobCode) {
      showToast("error", "Error resetting password: invalid code.");
      return;
    }

    try {
      // Verify the password reset code is valid
      await verifyPasswordResetCode(auth, oobCode as string);
      // If valid, update the password
      await confirmPasswordReset(auth, oobCode as string, newPassword);
      showToast("success", "Password has been reset successfully!");
      router.push("/"); // Redirect to login page
    } catch (error) {
      showToast("error", "Failed to reset password. Please try again.");
    }
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen text-[--text] overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(52,211,153,0.06) 0%, transparent 50%), #0a141f",
      }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute inset-6 neon-grid" />
      </div>
      <div className="relative w-full max-w-md px-6">
        <div className="neon-card p-8 space-y-5">
          <h1 className="text-2xl font-medium text-center">
            Reset your password
          </h1>
          <input
            type="password"
            className="neon-input w-full py-3 px-4"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            onClick={handlePasswordReset}
            className="neon-primary-btn w-full py-3 font-normal"
          >
            Reset Password
          </button>
        </div>
      </div>
    </div>
  );
}
