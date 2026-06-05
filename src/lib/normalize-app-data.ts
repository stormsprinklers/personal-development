import type { AppData } from "@/lib/models";
import { MAIN_TODO_LIST_ID, normalizeTodoListsAndItems } from "@/lib/todo-helpers";
import { sanitizeWorkoutRoutines } from "@/lib/workout-routines";
import { normalizeMeasurementPreferences } from "@/lib/units";
import { APP_TIMEZONE, yearInAppTimezone } from "@/lib/timezone";

const nowIso = () => new Date().toISOString();

export function createDefaultAppData(): AppData {
  const exercises = [
    { id: "seed-ex-back-squat", name: "Back Squat", category: "strength" as const, archived: false, createdAt: nowIso() },
    { id: "seed-ex-bench", name: "Bench Press", category: "strength" as const, archived: false, createdAt: nowIso() },
    { id: "seed-ex-deadlift", name: "Deadlift", category: "strength" as const, archived: false, createdAt: nowIso() },
    { id: "seed-ex-run", name: "Running", category: "run" as const, archived: false, createdAt: nowIso() },
    { id: "seed-ex-bike", name: "Cycling", category: "bike" as const, archived: false, createdAt: nowIso() },
    { id: "seed-ex-swim", name: "Swimming", category: "swim" as const, archived: false, createdAt: nowIso() },
  ];
  return {
    userProfile: { name: "Austin", timezone: APP_TIMEZONE },
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

/** Merge partial JSON (local file, API, or localStorage) into a valid AppData object. */
export function normalizeAppData(input: unknown): AppData {
  if (!input || typeof input !== "object") return createDefaultAppData();

  try {
    const parsed = input as Partial<AppData>;
    const base = createDefaultAppData();
    const goalsRaw = parsed.goals ?? [];
    const goals = goalsRaw.map((g) => ({
      ...g,
      year: typeof g.year === "number" ? g.year : yearInAppTimezone(),
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
      userProfile: { ...base.userProfile, ...parsed.userProfile, timezone: APP_TIMEZONE },
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
    return createDefaultAppData();
  }
}

export function parseStoredJson(raw: string | null): AppData {
  if (!raw) return createDefaultAppData();
  try {
    return normalizeAppData(JSON.parse(raw));
  } catch {
    return createDefaultAppData();
  }
}
