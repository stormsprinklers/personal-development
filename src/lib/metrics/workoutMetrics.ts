import type { Exercise, StrengthSet, WorkoutSession } from "@/lib/models";

export function estimateOneRepMax(weight: number, reps: number) {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function totalTonnage(sets: StrengthSet[]) {
  return sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
}

export function strengthSummaryByExercise(workouts: WorkoutSession[], exercises: Exercise[]) {
  const strengthExercises = exercises.filter((exercise) => exercise.category === "strength");

  type StrengthSummary = {
    exerciseId: string;
    exerciseName: string;
    totalSets: number;
    totalReps: number;
    totalTonnage: number;
    bestOneRepMax: number;
    bestWeight: number;
  };

  return strengthExercises
    .map((exercise) => {
      const allSets = workouts.flatMap((session) => session.strengthSets.filter((set) => set.exerciseId === exercise.id));
      if (!allSets.length) return null;

      const bestSet = allSets.reduce((best, set) => {
        const oneRepMax = estimateOneRepMax(set.weight, set.reps);
        if (!best || oneRepMax > best.oneRepMax) {
          return { oneRepMax, set };
        }
        return best;
      }, null as null | { oneRepMax: number; set: StrengthSet });

      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        totalSets: allSets.length,
        totalReps: allSets.reduce((sum, set) => sum + set.reps, 0),
        totalTonnage: totalTonnage(allSets),
        bestOneRepMax: bestSet?.oneRepMax ?? 0,
        bestWeight: bestSet?.set.weight ?? 0,
      };
    })
    .filter((item): item is StrengthSummary => Boolean(item));
}
