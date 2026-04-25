"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppData, WorkoutSession } from "@/lib/models";

const STORAGE_KEY = "self-improvement-app-data-v1";

const nowIso = () => new Date().toISOString();

export const todayKey = () => new Date().toISOString().slice(0, 10);

const defaultData: AppData = {
  userProfile: { name: "Austin", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  exercises: [
    { id: crypto.randomUUID(), name: "Back Squat", category: "strength", archived: false, createdAt: nowIso() },
    { id: crypto.randomUUID(), name: "Bench Press", category: "strength", archived: false, createdAt: nowIso() },
    { id: crypto.randomUUID(), name: "Deadlift", category: "strength", archived: false, createdAt: nowIso() },
    { id: crypto.randomUUID(), name: "Running", category: "run", archived: false, createdAt: nowIso() },
    { id: crypto.randomUUID(), name: "Cycling", category: "bike", archived: false, createdAt: nowIso() },
    { id: crypto.randomUUID(), name: "Swimming", category: "swim", archived: false, createdAt: nowIso() },
  ],
  workoutSessions: [],
  habits: [],
  habitLogs: [],
  todoLists: [],
  todoItems: [],
  todoCompletions: [],
  goalSections: [
    { id: crypto.randomUUID(), name: "Fitness" },
    { id: crypto.randomUUID(), name: "Career" },
    { id: crypto.randomUUID(), name: "Personal" },
  ],
  goals: [],
  goalNotes: [],
  journalEntries: [],
  aiInsights: [],
};

function parseStoredData(raw: string | null): AppData {
  if (!raw) return defaultData;

  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      ...defaultData,
      ...parsed,
      userProfile: { ...defaultData.userProfile, ...parsed.userProfile },
    };
  } catch {
    return defaultData;
  }
}

export function useAppData() {
  const [data, setData] = useState<AppData>(() =>
    parseStoredData(typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY)),
  );
  const ready = true;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  const api = useMemo(
    () => ({
      setData,
      addWorkoutSession(session: WorkoutSession) {
        setData((prev) => ({
          ...prev,
          workoutSessions: [session, ...prev.workoutSessions].sort((a, b) => (a.date < b.date ? 1 : -1)),
        }));
      },
      upsertTodayWorkout(date: string, updater: (existing: WorkoutSession | undefined) => WorkoutSession) {
        setData((prev) => {
          const existing = prev.workoutSessions.find((session) => session.date === date);
          const next = updater(existing);
          const withoutToday = prev.workoutSessions.filter((session) => session.date !== date);
          return { ...prev, workoutSessions: [next, ...withoutToday].sort((a, b) => (a.date < b.date ? 1 : -1)) };
        });
      },
    }),
    [],
  );

  return { data, ready, ...api };
}
