import type { WorkoutSession } from "@/lib/models";

/**
 * Most recent session strictly before `beforeDate` for this routine: prefers `routineId`,
 * otherwise the latest day that logged any of the routine’s strength exercises (legacy data).
 */
export function findLastSessionForRoutine(
  sessions: WorkoutSession[],
  routineId: string,
  routineStrengthExerciseIds: string[],
  beforeDate: string,
): WorkoutSession | undefined {
  const prior = sessions
    .filter((s) => s.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  const explicit = prior.find((s) => s.routineId === routineId);
  if (explicit) return explicit;
  const exSet = new Set(routineStrengthExerciseIds);
  if (exSet.size === 0) return undefined;
  return prior.find((s) => s.strengthSets.some((set) => exSet.has(set.exerciseId)));
}

export function formatShortWorkoutDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
