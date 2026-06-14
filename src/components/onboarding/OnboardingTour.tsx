"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { useAuth } from "@/lib/context/AuthContext";
import { useUserData } from "@/lib/hooks/useUserData";
import { tourSteps } from "@/lib/onboarding/tourSteps";
import "@/lib/onboarding/tour-theme.css";

// Custom event other components dispatch to (re)start the tour on demand.
export const START_TOUR_EVENT = "aip:start-tour";
// Local guard so the first-run tour doesn't flash again before the Firestore
// write propagates (the Firestore flag remains the cross-device source of truth).
const SEEN_KEY = "aip_tour_seen_v1";

export default function OnboardingTour() {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { userData, loading } = useUserData();
  const autoStartedRef = useRef(false);

  // Build a driver instance limited to steps whose anchor is present AND
  // actually on-screen — this drops the sidebar steps on mobile, where the
  // nav is translated off-canvas (still in the DOM but not visible).
  const runTour = (markComplete: boolean) => {
    const isVisible = (selector: string) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.right > 0 &&
        rect.left < window.innerWidth
      );
    };
    const steps = tourSteps.filter(
      (s) => !s.element || isVisible(s.element as string),
    );
    if (steps.length === 0) return;

    const persist = async () => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SEEN_KEY, "1");
      }
      if (markComplete && currentUser?.uid) {
        try {
          await updateDoc(doc(db, "users", currentUser.uid), {
            onboardingCompleted: true,
            onboardingCompletedAt: serverTimestamp(),
          });
        } catch (err) {
          // Non-fatal: localStorage still prevents an immediate re-show.
          console.error("Failed to persist onboarding completion:", err);
        }
      }
    };

    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      overlayColor: "#020a12",
      overlayOpacity: 0.72,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: "aip-tour",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Finish",
      steps,
      onDestroyed: () => {
        void persist();
      },
    });
    driverObj.drive();
  };

  // Auto-start once for first-time users, on the dashboard where every
  // anchor is present.
  useEffect(() => {
    if (loading || !userData || autoStartedRef.current) return;
    if (pathname !== "/app/dashboard") return;
    if (userData.onboardingCompleted) return;
    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(SEEN_KEY) === "1"
    ) {
      return;
    }
    autoStartedRef.current = true;
    // Let the dashboard content mount before measuring anchor positions.
    const t = window.setTimeout(() => runTour(true), 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userData, pathname]);

  // Allow manual replay from anywhere (e.g. the "Take a tour" button).
  useEffect(() => {
    const handler = () => runTour(true);
    window.addEventListener(START_TOUR_EVENT, handler);
    return () => window.removeEventListener(START_TOUR_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  return null;
}
