import type { WorkoutRoutine, WorkoutSession } from "@/lib/models";
import { formatDateKey } from "@/lib/timezone";

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
  return prior.find((s) => sessionMatchesRoutine(s, routineId, routineStrengthExerciseIds));
}

/** Most recent session strictly before `beforeDate` that logged at least one set for this exercise. */
export function findLastSessionForExercise(
  sessions: WorkoutSession[],
  exerciseId: string,
  beforeDate: string,
): WorkoutSession | undefined {
  const prior = sessions
    .filter((s) => s.date < beforeDate && s.strengthSets.some((set) => set.exerciseId === exerciseId))
    .sort((a, b) => b.date.localeCompare(a.date));
  return prior[0];
}

/** Whether this session counts as having performed the given routine (explicit tag or legacy strength overlap). */
export function sessionMatchesRoutine(
  session: WorkoutSession,
  routineId: string,
  routineStrengthExerciseIds: string[],
): boolean {
  if (session.routineId === routineId) return true;
  const exSet = new Set(routineStrengthExerciseIds);
  return exSet.size > 0 && session.strengthSets.some((set) => exSet.has(set.exerciseId));
}

/** Most recent calendar day strictly before `beforeDate` when this routine was logged. */
export function lastDoneDateForRoutine(
  sessions: WorkoutSession[],
  routineId: string,
  routineStrengthExerciseIds: string[],
  beforeDate: string,
): string | undefined {
  const matching = sessions
    .filter((s) => s.date < beforeDate && sessionMatchesRoutine(s, routineId, routineStrengthExerciseIds))
    .sort((a, b) => b.date.localeCompare(a.date));
  return matching[0]?.date;
}

/**
 * Routine to pre-select when none is saved for `date`: never-logged routines first (by sortOrder),
 * otherwise the one done longest ago.
 */
export function suggestRoutineIdForDate(
  sessions: WorkoutSession[],
  routines: WorkoutRoutine[],
  date: string,
): string | undefined {
  const eligible = routines.filter((routine) => !routine.archived);
  if (!eligible.length) return undefined;
  const ordered = [...eligible].sort((a, b) => a.sortOrder - b.sortOrder);
  let oldestDone: { id: string; last: string } | undefined;

  for (const routine of ordered) {
    const last = lastDoneDateForRoutine(sessions, routine.id, routine.strengthExerciseIds, date);
    if (last === undefined) return routine.id;
    if (!oldestDone || last < oldestDone.last) {
      oldestDone = { id: routine.id, last };
    }
  }
  return oldestDone?.id ?? ordered[0].id;
}

export function formatShortWorkoutDate(dateKey: string) {
  return formatDateKey(dateKey, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
