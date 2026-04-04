"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";

export interface Schedule {
  id: string;
  type: "web_app" | "external_ip";
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
  pentestId: string;
  status: "pending" | "completed" | "failed" | "skipped_no_credits";
  ranAt: any;
  creditDeducted: boolean;
}

export function useUserSchedules(uid?: string | null) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "schedules"), where("userId", "==", uid));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items: Schedule[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Schedule[];
        items.sort((left, right) => {
          const leftMs = left.createdAt?.toMillis?.() ?? 0;
          const rightMs = right.createdAt?.toMillis?.() ?? 0;
          return rightMs - leftMs;
        });
        setSchedules(items);
        setLoading(false);
      },
      (err) => {
        console.error("useUserSchedules: snapshot error", err);
        setSchedules([]);
        setLoading(false);
      },
    );

    return () => unsubscribe();
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
