import type { AppData } from "@/lib/models";
import { MAIN_TODO_LIST_ID, normalizeTodoListsAndItems, sanitizeDashboardDailyOrder, sanitizeDashboardTodoOrder, migrateDashboardDailyOrder, dashboardTodoOrderFromDailyOrder } from "@/lib/todo-helpers";
import { sanitizeWorkoutRoutines } from "@/lib/workout-routines";
import { normalizeMeasurementPreferences } from "@/lib/units";
import { APP_TIMEZONE, yearInAppTimezone } from "@/lib/timezone";

const nowIso = () => new Date().toISOString();

function normalizeHabits(raw: unknown): AppData["habits"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const h = entry as { id?: string; name?: string; active?: boolean; createdAt?: string };
      const name = typeof h.name === "string" ? h.name.trim() : "";
      if (!name) return null;
      return {
        id: typeof h.id === "string" && h.id ? h.id : crypto.randomUUID(),
        name,
        active: h.active !== false,
        createdAt: typeof h.createdAt === "string" ? h.createdAt : nowIso(),
      };
    })
    .filter((h): h is AppData["habits"][number] => h !== null);
}

function normalizeAccountabilityPartners(raw: unknown): AppData["accountabilityPartners"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const p = entry as { id?: string; name?: string; email?: string; phone?: string; createdAt?: string };
      const name = typeof p.name === "string" ? p.name.trim() : "";
      const email = typeof p.email === "string" ? p.email.trim() : "";
      const phone = typeof p.phone === "string" ? p.phone.trim() : "";
      if (!name || !email) return null;
      return {
        id: typeof p.id === "string" && p.id ? p.id : crypto.randomUUID(),
        name,
        email,
        phone,
        createdAt: typeof p.createdAt === "string" ? p.createdAt : nowIso(),
      };
    })
    .filter((p): p is NonNullable<AppData["accountabilityPartners"]>[number] => p !== null);
}

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
    accountabilityPartners: [],
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
      dashboardTodoOrder: parsed.dashboardTodoOrder,
      dashboardDailyOrder: parsed.dashboardDailyOrder,
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
    const dashboardTodoOrder = sanitizeDashboardTodoOrder(merged.dashboardTodoOrder, todoItems);
    const activeHabitIds = (merged.habits ?? []).filter((h) => h.active !== false).map((h) => h.id);
    const todoItemIds = todoItems.map((item) => item.id);
    const dashboardDailyOrder = sanitizeDashboardDailyOrder(
      migrateDashboardDailyOrder(merged.dashboardDailyOrder, dashboardTodoOrder, activeHabitIds, todoItemIds),
      merged.habits ?? [],
      todoItems,
    );
    const syncedTodoOrder = dashboardTodoOrderFromDailyOrder(dashboardDailyOrder) ?? dashboardTodoOrder;
    const todoSections = (merged.todoSections ?? []).filter((s) => todoLists.some((l) => l.id === s.listId));
    const workoutRoutines = sanitizeWorkoutRoutines(merged.workoutRoutines, merged.exercises);
    const habits = normalizeHabits(merged.habits);
    const accountabilityPartners = normalizeAccountabilityPartners(merged.accountabilityPartners);
    return {
      ...merged,
      todoLists,
      todoItems,
      todoSections,
      dashboardTodoListIds,
      dashboardTodoOrder: syncedTodoOrder,
      dashboardDailyOrder,
      workoutRoutines,
      habits,
      accountabilityPartners,
    };
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
