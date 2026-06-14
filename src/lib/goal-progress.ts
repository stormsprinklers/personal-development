import type { AppData, Goal, GoalTrackingMode } from "@/lib/models";
import { resolveGoalTrackingModes } from "@/lib/goals/tracking-modes";
import { todoItemsForGoal } from "@/lib/todo-helpers";

/** Progress from `start` → `target` given `current` (supports increase or decrease). */
export function progressBetweenValues(start: number, target: number, current: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(target) || !Number.isFinite(current)) return 0;
  if (target === start) return Math.abs(current - target) < 1e-6 ? 100 : 0;
  if (target > start) {
    return Math.min(100, Math.max(0, ((current - start) / (target - start)) * 100));
  }
  return Math.min(100, Math.max(0, ((start - current) / (start - target)) * 100));
}

export function manualGoalProgressPercent(
  current: number,
  target: number,
  start?: number,
): number | undefined {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return undefined;
  const baseline = typeof start === "number" && Number.isFinite(start) ? start : 0;
  return progressBetweenValues(baseline, target, current);
}

export function latestBodyWeightInYear(data: AppData, year: number) {
  const prefix = `${year}-`;
  const sessions = data.workoutSessions
    .filter(
      (s) =>
        s.date.startsWith(prefix) &&
        typeof s.bodyWeight === "number" &&
        !Number.isNaN(s.bodyWeight) &&
        s.bodyWeight > 0,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return sessions[0]?.bodyWeight;
}

/** Combined progress for one goal (tasks, habits, exercise, body weight, manual). */
export function computeGoalProgressPercent(data: AppData, goalId: string, year: number): number {
  const goal = data.goals.find((item) => item.id === goalId);
  if (!goal) return 0;
  if (goal.completed === true) return 100;

  const enabledModes = new Set(resolveGoalTrackingModes(goal, data));
  const modeEnabled = (mode: GoalTrackingMode) =>
    enabledModes.size === 0 || enabledModes.has(mode);

  const progressParts: number[] = [];

  if (modeEnabled("tasks")) {
    const tasks = todoItemsForGoal(data, goalId);
    const doneTasks = tasks.filter((item) => !item.active).length;
    if (tasks.length) {
      progressParts.push((doneTasks / tasks.length) * 100);
    }
  }

  const hasHabitTarget = Boolean(goal.habitTargetDays && goal.habitTargetDays > 0);
  const linkedHabitIds = goal.linkedHabitIds ?? [];
  const hasLinkedHabits = linkedHabitIds.length > 0;

  if (modeEnabled("habits") && hasHabitTarget && hasLinkedHabits) {
    const perHabitProgress = linkedHabitIds.map((habitId) => {
      const completedDays = data.habitLogs.filter(
        (log) => log.habitId === habitId && log.completed && log.date.startsWith(`${year}-`),
      ).length;
      return Math.min(100, (completedDays / (goal.habitTargetDays as number)) * 100);
    });
    const habitProgress =
      perHabitProgress.reduce((sum, value) => sum + value, 0) / Math.max(1, perHabitProgress.length);
    progressParts.push(habitProgress);
  }

  const hasExerciseProgress =
    modeEnabled("exercise") &&
    goal.linkedExerciseId &&
    typeof goal.exerciseStartValue === "number" &&
    typeof goal.exerciseTargetValue === "number";
  if (hasExerciseProgress) {
    const exercise = data.exercises.find((item) => item.id === goal.linkedExerciseId);
    if (exercise) {
      const yearPrefix = `${year}-`;
      let achieved = goal.exerciseStartValue as number;

      if (exercise.category === "strength") {
        achieved = data.workoutSessions
          .filter((session) => session.date.startsWith(yearPrefix))
          .flatMap((session) => session.strengthSets)
          .filter((set) => set.exerciseId === exercise.id)
          .reduce((max, set) => Math.max(max, set.weight), achieved);
      } else if (exercise.category === "run" || exercise.category === "bike") {
        achieved = data.workoutSessions
          .filter((session) => session.date.startsWith(yearPrefix))
          .flatMap((session) => session.cardioEntries)
          .filter((entry) => entry.type === exercise.category)
          .reduce((max, entry) => Math.max(max, entry.distance ?? 0), achieved);
      } else if (exercise.category === "swim") {
        achieved = data.workoutSessions
          .filter((session) => session.date.startsWith(yearPrefix))
          .flatMap((session) => session.cardioEntries)
          .filter((entry) => entry.type === "swim")
          .reduce((max, entry) => Math.max(max, entry.laps ?? 0), achieved);
      }

      progressParts.push(
        progressBetweenValues(
          goal.exerciseStartValue as number,
          goal.exerciseTargetValue as number,
          achieved,
        ),
      );
    }
  }

  const bwStart = goal.bodyWeightStart;
  const bwTarget = goal.bodyWeightTarget;
  if (
    modeEnabled("body_weight") &&
    typeof bwStart === "number" &&
    typeof bwTarget === "number" &&
    bwTarget !== bwStart
  ) {
    const latest = latestBodyWeightInYear(data, year);
    progressParts.push(progressBetweenValues(bwStart, bwTarget, latest ?? bwStart));
  }

  const manualPercent = manualGoalProgressPercent(
    goal.manualProgressCurrent as number,
    goal.manualProgressTarget as number,
    goal.manualProgressStart,
  );
  if (modeEnabled("manual") && manualPercent !== undefined) {
    progressParts.push(manualPercent);
  }

  if (!progressParts.length) return 0;
  return Math.min(100, progressParts.reduce((sum, value) => sum + value, 0) / progressParts.length);
}

export type YearGoalsProgress = {
  /** Average combined progress across all goals for the year. */
  percent: number;
  total: number;
  done: number;
};

/** Average total goal progress for a calendar year (not merely % of goals marked complete). */
export function averageGoalsProgressForYear(data: AppData, year: number): YearGoalsProgress {
  const list = data.goals.filter((g) => g.year === year);
  if (!list.length) return { done: 0, total: 0, percent: 0 };

  const done = list.filter((g) => g.completed).length;
  const percent = Math.round(
    list.reduce((sum, goal) => sum + computeGoalProgressPercent(data, goal.id, year), 0) / list.length,
  );

  return { done, total: list.length, percent };
}
