"use client";

import { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faChartBar,
  faShield,
  faLock,
  faCheckCircle,
  faSpinner,
  faClock,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { useAuth } from "@/lib/context/AuthContext";
import { useUserData } from "@/lib/hooks/useUserData";
import { useUserScans } from "@/lib/hooks/useUserScans";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const { userData, loading } = useUserData();
  const { scans } = useUserScans(currentUser?.uid ?? null);

  // Profile form state
  const [displayName, setDisplayName] = useState(
    currentUser?.displayName || ""
  );
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Derive activity stats from scans
  const stats = useMemo(() => {
    const completed = scans.filter((s) => s.status === "completed").length;
    const running = scans.filter(
      (s) => s.status === "running" || s.status === "in_progress"
    ).length;
    const pending = scans.filter(
      (s) => s.status === "pending" || s.status === "queued"
    ).length;
    const creditsLeft =
      (userData?.credits?.web_app ?? 0) +
      (userData?.credits?.external_ip ?? 0);
    return { total: scans.length, completed, running, pending, creditsLeft };
  }, [scans, userData]);

  const isOAuthUser =
    currentUser?.providerData?.some((p) => p.providerId !== "password") &&
    !currentUser?.providerData?.some((p) => p.providerId === "password");

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      await updateProfile(currentUser, { displayName: displayName.trim() });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser || !currentUser.email) return;
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      const cred = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, cred);
      await updatePassword(currentUser, newPassword);
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Current password is incorrect");
      } else {
        toast.error("Failed to change password");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const statCards = [
    {
      icon: faChartBar,
      label: "Total Pentests",
      value: loading ? "—" : stats.total,
      color: "text-[var(--neon)]",
    },
    {
      icon: faCheckCircle,
      label: "Completed",
      value: loading ? "—" : stats.completed,
      color: "text-emerald-400",
    },
    {
      icon: faSpinner,
      label: "In Progress",
      value: loading ? "—" : stats.running,
      color: "text-sky-400",
    },
    {
      icon: faCoins,
      label: "Credits Left",
      value: loading ? "—" : stats.creditsLeft,
      color: "text-amber-400",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
            Settings
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Manage your account, view activity, and update security settings
          </p>
        </div>

        {/* Activity Stats */}
        <div className="neon-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <FontAwesomeIcon
              icon={faChartBar}
              className="text-xl text-[var(--neon)]"
            />
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                Activity
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Your pentest activity at a glance
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl p-4 text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <FontAwesomeIcon
                  icon={card.icon}
                  className={`text-2xl mb-2 ${card.color}`}
                />
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--text)" }}
                >
                  {card.value}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile */}
        <div className="neon-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <FontAwesomeIcon
              icon={faUser}
              className="text-xl text-[var(--neon)]"
            />
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                Profile
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Update your display name
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="neon-input w-full"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={currentUser?.email || ""}
                disabled
                className="neon-input w-full opacity-50 cursor-not-allowed"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Account ID
              </label>
              <input
                type="text"
                value={currentUser?.uid || ""}
                disabled
                className="neon-input w-full opacity-50 cursor-not-allowed font-mono text-xs"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="neon-primary-btn px-5 py-2 text-sm disabled:opacity-50"
            >
              {savingProfile ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </div>

        {/* Change Password — hidden for pure OAuth users */}
        {!isOAuthUser && (
          <div className="neon-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <FontAwesomeIcon
                icon={faLock}
                className="text-xl text-[var(--neon)]"
              />
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                  Change Password
                </h2>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Update your password
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="neon-input w-full"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="neon-input w-full"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="neon-input w-full"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={
                  savingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className="neon-primary-btn px-5 py-2 text-sm disabled:opacity-50"
              >
                {savingPassword ? "Updating…" : "Change Password"}
              </button>
            </div>
          </div>
        )}

        {/* Security Info */}
        <div className="neon-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <FontAwesomeIcon
              icon={faShield}
              className="text-xl text-[var(--neon)]"
            />
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                Security
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Sign-in method and account details
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Sign-in method
              </span>
              <span
                className="text-sm font-medium capitalize"
                style={{ color: "var(--text)" }}
              >
                {currentUser?.providerData?.[0]?.providerId === "google.com"
                  ? "Google"
                  : currentUser?.providerData?.[0]?.providerId === "github.com"
                  ? "GitHub"
                  : "Email / Password"}
              </span>
            </div>
            <div
              className="border-t"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Account created
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {currentUser?.metadata?.creationTime
                  ? new Date(
                      currentUser.metadata.creationTime
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </span>
            </div>
            <div
              className="border-t"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Last sign-in
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {currentUser?.metadata?.lastSignInTime
                  ? new Date(
                      currentUser.metadata.lastSignInTime
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
