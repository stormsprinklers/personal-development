import type { AppData } from "@/lib/models";
import { normalizeAppData } from "@/lib/normalize-app-data";
import { prisma } from "@/lib/prisma";

/** Resolve initial payload for a new user (preserve local + legacy cloud data). */
export async function resolveInitialUserPayload(options: {
  localPayload?: unknown;
  legacySyncKey?: string;
  displayName: string;
}): Promise<AppData> {
  const local = options.localPayload ? normalizeAppData(options.localPayload) : null;
  let legacy: AppData | null = null;

  const key = options.legacySyncKey?.trim();
  if (key) {
    const row = await prisma.legacyAppDataStore.findUnique({ where: { syncKey: key } });
    if (row) {
      legacy = normalizeAppData(row.payload);
    }
  }

  if (local && legacy) {
    return mergeAppDataPreferLocal(local, legacy, options.displayName);
  }
  if (local) {
    local.userProfile = { ...local.userProfile, name: options.displayName };
    return local;
  }
  if (legacy) {
    legacy.userProfile = { ...legacy.userProfile, name: options.displayName };
    return legacy;
  }

  const base = normalizeAppData(null);
  base.userProfile = { ...base.userProfile, name: options.displayName };
  return base;
}

function mergeAppDataPreferLocal(local: AppData, legacy: AppData, displayName: string): AppData {
  const merged = normalizeAppData({
    ...legacy,
    ...local,
    userProfile: { ...legacy.userProfile, ...local.userProfile, name: displayName },
    habits: local.habits.length ? local.habits : legacy.habits,
    habitLogs: local.habitLogs.length ? local.habitLogs : legacy.habitLogs,
    workoutSessions: local.workoutSessions.length ? local.workoutSessions : legacy.workoutSessions,
    goals: local.goals.length ? local.goals : legacy.goals,
    todoItems: local.todoItems.length ? local.todoItems : legacy.todoItems,
    journalEntries: local.journalEntries.length ? local.journalEntries : legacy.journalEntries,
    aiInsights: local.aiInsights.length ? local.aiInsights : legacy.aiInsights,
  });
  return merged;
}

export async function createUniqueAccountabilityCode(): Promise<string> {
  const { generateAccountabilityCode } = await import("@/lib/auth/accountability-code");
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateAccountabilityCode();
    const existing = await prisma.user.findUnique({ where: { accountabilityCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique accountability code.");
}
