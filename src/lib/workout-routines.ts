import type { CardioType, Exercise, WorkoutRoutine } from "./models";

export const ROUTINE_BLUEPRINTS: { name: string; strengthKeywords: string[]; cardioTypes: CardioType[] }[] = [
  { name: "Leg Day", strengthKeywords: ["squat", "deadlift", "lunge"], cardioTypes: ["swim"] },
  { name: "Push Day", strengthKeywords: ["bench", "press", "dip"], cardioTypes: ["run"] },
  { name: "Pull Day", strengthKeywords: ["row", "pull", "deadlift"], cardioTypes: ["bike"] },
  { name: "Cardio Day", strengthKeywords: [], cardioTypes: ["run", "bike", "swim"] },
];

export function buildInitialWorkoutRoutines(exercises: Exercise[]): WorkoutRoutine[] {
  const now = new Date().toISOString();
  const strength = exercises.filter((e) => e.category === "strength" && !e.archived);
  return ROUTINE_BLUEPRINTS.map((bp, i) => {
    const matched =
      bp.strengthKeywords.length > 0
        ? strength.filter((ex) =>
            bp.strengthKeywords.some((keyword) => ex.name.toLowerCase().includes(keyword)),
          )
        : [];
    const strengthExerciseIds =
      matched.length > 0 ? matched.map((ex) => ex.id) : strength.slice(0, 2).map((ex) => ex.id);
    return {
      id: `seed-routine-${i}`,
      name: bp.name,
      strengthExerciseIds,
      cardioTypes: [...bp.cardioTypes],
      sortOrder: i,
      createdAt: now,
    };
  });
}

export function sanitizeWorkoutRoutines(
  raw: WorkoutRoutine[] | undefined,
  exercises: Exercise[],
): WorkoutRoutine[] {
  const strengthIds = new Set(
    exercises.filter((e) => e.category === "strength" && !e.archived).map((e) => e.id),
  );
  if (!raw?.length) return buildInitialWorkoutRoutines(exercises);
  return raw.map((r, i) => ({
    id: typeof r.id === "string" && r.id ? r.id : `routine-migrated-${i}`,
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : `Routine ${i + 1}`,
    strengthExerciseIds: [...new Set((r.strengthExerciseIds ?? []).filter((id) => strengthIds.has(id)))],
    cardioTypes: [
      ...new Set(
        (r.cardioTypes ?? []).filter((t): t is CardioType => t === "run" || t === "bike" || t === "swim"),
      ),
    ],
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : i,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
  }));
}
