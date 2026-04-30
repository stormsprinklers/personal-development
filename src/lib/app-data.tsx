"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppData, WorkoutSession } from "@/lib/models";
import { MAIN_TODO_LIST_ID, normalizeTodoListsAndItems } from "@/lib/todo-helpers";
import { sanitizeWorkoutRoutines } from "@/lib/workout-routines";
import { normalizeMeasurementPreferences } from "@/lib/units";

const STORAGE_KEY = "self-improvement-app-data-v1";

const nowIso = () => new Date().toISOString();

export const todayKey = () => new Date().toISOString().slice(0, 10);

function createDefaultData(): AppData {
  const exercises = [
    { id: "seed-ex-back-squat", name: "Back Squat", category: "strength" as const, archived: false, createdAt: nowIso() },
    { id: "seed-ex-bench", name: "Bench Press", category: "strength" as const, archived: false, createdAt: nowIso() },
    { id: "seed-ex-deadlift", name: "Deadlift", category: "strength" as const, archived: false, createdAt: nowIso() },
    { id: "seed-ex-run", name: "Running", category: "run" as const, archived: false, createdAt: nowIso() },
    { id: "seed-ex-bike", name: "Cycling", category: "bike" as const, archived: false, createdAt: nowIso() },
    { id: "seed-ex-swim", name: "Swimming", category: "swim" as const, archived: false, createdAt: nowIso() },
  ];
  return {
    userProfile: { name: "Austin", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    measurementPreferences: normalizeMeasurementPreferences(),
    exercises,
    workoutRoutines: sanitizeWorkoutRoutines(undefined, exercises),
    workoutSessions: [],
    habits: [],
    habitLogs: [],
    todoLists: [
      {
        id: MAIN_TODO_LIST_ID,
        name: "Main",
        area: "",
        isMain: true,
        createdAt: nowIso(),
      },
    ],
    todoItems: [],
    todoSections: [],
    todoCompletions: [],
    goalSections: [
      { id: "seed-sec-fitness", name: "Health" },
      { id: "seed-sec-career", name: "Meaning" },
      { id: "seed-sec-personal", name: "Wealth" },
    ],
    goals: [],
    goalNotes: [],
    journalEntries: [],
    aiInsights: [],
  };
}

function parseStoredData(raw: string | null): AppData {
  if (!raw) return createDefaultData();

  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const base = createDefaultData();
    const goalsRaw = parsed.goals ?? [];
    const goals = goalsRaw.map((g) => ({
      ...g,
      year: typeof g.year === "number" ? g.year : new Date().getFullYear(),
      completed: g.completed === true,
      linkedHabitIds:
        Array.isArray((g as { linkedHabitIds?: string[] }).linkedHabitIds)
          ? (g as { linkedHabitIds?: string[] }).linkedHabitIds
          : (g as { linkedHabitId?: string }).linkedHabitId
            ? [(g as { linkedHabitId?: string }).linkedHabitId as string]
            : undefined,
    }));
    const sections = (parsed.goalSections ?? base.goalSections).map((section) => {
      if (section.id === "seed-sec-fitness") return { ...section, name: "Health" };
      if (section.id === "seed-sec-career") return { ...section, name: "Meaning" };
      if (section.id === "seed-sec-personal") return { ...section, name: "Wealth" };
      return section;
    });
    const merged: AppData = {
      ...base,
      ...parsed,
      userProfile: { ...base.userProfile, ...parsed.userProfile },
      measurementPreferences: normalizeMeasurementPreferences(parsed.measurementPreferences),
      goalSections: sections,
      goals,
      todoLists: parsed.todoLists ?? base.todoLists,
      todoItems: parsed.todoItems ?? base.todoItems,
      todoSections: parsed.todoSections ?? base.todoSections,
      dashboardTodoListIds: parsed.dashboardTodoListIds,
    };
    const { todoLists, todoItems } = normalizeTodoListsAndItems(
      merged.todoLists,
      merged.todoItems,
      merged.goals,
      nowIso,
    );
    let dashboardTodoListIds = merged.dashboardTodoListIds?.filter((id) => todoLists.some((l) => l.id === id));
    if (dashboardTodoListIds?.length === 0) dashboardTodoListIds = undefined;
    if (dashboardTodoListIds?.length) dashboardTodoListIds = [...new Set(dashboardTodoListIds)];
    const todoSections = (merged.todoSections ?? []).filter((s) => todoLists.some((l) => l.id === s.listId));
    const workoutRoutines = sanitizeWorkoutRoutines(merged.workoutRoutines, merged.exercises);
    return { ...merged, todoLists, todoItems, todoSections, dashboardTodoListIds, workoutRoutines };
  } catch {
    return createDefaultData();
  }
}

type AppDataContextValue = {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addWorkoutSession: (session: WorkoutSession) => void;
  upsertWorkoutForDate: (date: string, updater: (existing: WorkoutSession | undefined) => WorkoutSession) => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() =>
    parseStoredData(typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY)),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const api = useMemo<AppDataContextValue>(
    () => ({
      data,
      setData,
      addWorkoutSession(session) {
        setData((prev) => ({
          ...prev,
          workoutSessions: [session, ...prev.workoutSessions].sort((a, b) => (a.date < b.date ? 1 : -1)),
        }));
      },
      upsertWorkoutForDate(date, updater) {
        setData((prev) => {
          const existing = prev.workoutSessions.find((s) => s.date === date);
          const next = updater(existing);
          const rest = prev.workoutSessions.filter((s) => s.date !== date);
          return { ...prev, workoutSessions: [next, ...rest].sort((a, b) => (a.date < b.date ? 1 : -1)) };
        });
      },
    }),
    [data],
  );

  return <AppDataContext.Provider value={api}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return { ...ctx, ready: true as const };
}
