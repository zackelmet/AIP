"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";

export interface Schedule {
  id: string;
  type: "web_app" | "external_ip" | "pentest_plus";
  targetUrl: string;
  userRoles: string | null;
  endpoints: string | null;
  additionalContext: string | null;
  intervalDays: number;
  intervalLabel: string;
  nextRunAt: any; // Firestore Timestamp
  lastRunAt: any | null;
  status: "active" | "paused" | "cancelled";
  totalRuns: number;
  createdAt: any;
}

export interface ScheduleRun {
  id: string;
  scheduleId: string;
  pentestId: string | null;
  pentestIds?: string[];
  status: "pending" | "completed" | "failed" | "skipped_no_credits";
  ranAt: any;
  creditDeducted: boolean;
  creditsUsed?: number;
  targetCount?: number;
}

function normalizeTimestamp(value: any) {
  if (!value) return value;
  if (typeof value?.toDate === "function") return value;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }
  if (typeof value?._seconds === "number") {
    const nanoseconds =
      typeof value?._nanoseconds === "number" ? value._nanoseconds : 0;
    return new Date(
      value._seconds * 1000 + Math.floor(nanoseconds / 1_000_000),
    );
  }
  return value;
}

export function useUserSchedules(uid?: string | null) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!uid) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    const fetchSchedules = async () => {
      try {
        const response = await fetch("/api/schedules", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load schedules");
        }

        const items: Schedule[] = (data?.schedules || []).map(
          (schedule: any) => ({
            ...schedule,
            createdAt: normalizeTimestamp(schedule.createdAt),
            updatedAt: normalizeTimestamp(schedule.updatedAt),
            nextRunAt: normalizeTimestamp(schedule.nextRunAt),
            lastRunAt: normalizeTimestamp(schedule.lastRunAt),
          }),
        );

        items.sort((left, right) => {
          const leftMs =
            left.createdAt?.toMillis?.() ?? left.createdAt?.getTime?.() ?? 0;
          const rightMs =
            right.createdAt?.toMillis?.() ?? right.createdAt?.getTime?.() ?? 0;
          return rightMs - leftMs;
        });

        if (isMounted) {
          setSchedules(items);
          setLoading(false);
        }
      } catch (err) {
        console.error("useUserSchedules: fetch error", err);
        if (isMounted) {
          setSchedules([]);
          setLoading(false);
        }
      }
    };

    fetchSchedules();
    const intervalId = window.setInterval(fetchSchedules, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [uid]);

  return { schedules, loading };
}

export function useScheduleRuns(scheduleId?: string | null) {
  const [runs, setRuns] = useState<ScheduleRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scheduleId) {
      setRuns([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "schedules", scheduleId, "runs"),
      orderBy("ranAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items: ScheduleRun[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ScheduleRun[];
        setRuns(items);
        setLoading(false);
      },
      (err) => {
        console.error("useScheduleRuns: snapshot error", err);
        setRuns([]);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [scheduleId]);

  return { runs, loading };
}
