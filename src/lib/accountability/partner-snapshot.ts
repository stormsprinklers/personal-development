import type { AppData } from "@/lib/models";
import { computeGoalProgressPercent } from "@/lib/goal-progress";
import { goalsProgressForYear } from "@/lib/metrics/dashboardMetrics";
import { strengthSummaryByExercise } from "@/lib/metrics/workoutMetrics";
import { normalizeAppData } from "@/lib/normalize-app-data";
import { addDaysToDateKey, startOfWeekDateKey, yearInAppTimezone, instantNoonForDateKey } from "@/lib/timezone";

export type PartnerDashboardSnapshot = {
  userId: string;
  displayName: string;
  date: string;
  goalYear: number;
  goalProgress: { done: number; total: number; percent: number };
  goals: Array<{
    id: string;
    title: string;
    completed: boolean;
    sectionName: string;
    progressPercent: number;
  }>;
  habits: Array<{
    id: string;
    name: string;
    active: boolean;
    todayCompleted: boolean | null;
    streakApprox: number;
  }>;
  habitLogsRecent: Array<{ date: string; habitId: string; completed: boolean }>;
  weeklyWorkoutCount: number;
  weeklyStrengthTop: Array<{ exerciseName: string; totalSets: number; topWeight: number }>;
  dailyAiSummary: string | null;
};

export function buildPartnerSnapshot(
  data: AppData,
  displayName: string,
  userId: string,
  date: string,
): PartnerDashboardSnapshot {
  const normalized = normalizeAppData(data);
  const goalYear = yearInAppTimezone(instantNoonForDateKey(date));
  const goalProgress = goalsProgressForYear(normalized, goalYear);
  const weekStart = startOfWeekDateKey(date);
  const weekEnd = addDaysToDateKey(weekStart, 6);

  const sectionNameById = new Map(normalized.goalSections.map((s) => [s.id, s.name]));
  const goals = normalized.goals
    .filter((g) => g.year === goalYear)
    .map((g) => ({
      id: g.id,
      title: g.title,
      completed: g.completed,
      sectionName: sectionNameById.get(g.sectionId) ?? "Goals",
      progressPercent: Math.round(computeGoalProgressPercent(normalized, g.id, goalYear)),
    }));

  const activeHabits = normalized.habits.filter((h) => h.active);
  const habits = activeHabits.map((habit) => {
    const log = normalized.habitLogs.find((l) => l.habitId === habit.id && l.date === date);
    const streakApprox = countRecentStreak(habit.id, normalized, date);
    return {
      id: habit.id,
      name: habit.name,
      active: habit.active,
      todayCompleted: log ? log.completed : null,
      streakApprox,
    };
  });

  const habitLogsRecent = normalized.habitLogs
    .filter((l) => l.date >= addDaysToDateKey(date, -29))
    .slice(0, 120)
    .map((l) => ({ date: l.date, habitId: l.habitId, completed: l.completed }));

  const weeklyWorkouts = normalized.workoutSessions.filter(
    (s) => s.date >= weekStart && s.date <= weekEnd,
  );
  const weeklyStrengthTop = strengthSummaryByExercise(weeklyWorkouts, normalized.exercises)
    .slice(0, 3)
    .map((row) => ({
      exerciseName: row.exerciseName,
      totalSets: row.totalSets,
      topWeight: row.bestWeight,
    }));

  const dailyInsight = normalized.aiInsights.find(
    (i) => i.type === "daily_summary" && i.date === date,
  );

  return {
    userId,
    displayName,
    date,
    goalYear,
    goalProgress,
    goals,
    habits,
    habitLogsRecent,
    weeklyWorkoutCount: weeklyWorkouts.length,
    weeklyStrengthTop,
    dailyAiSummary: dailyInsight?.output?.trim() ?? null,
  };
}

function countRecentStreak(habitId: string, data: AppData, fromDate: string): number {
  let streak = 0;
  let cursor = fromDate;
  for (let i = 0; i < 60; i++) {
    const log = data.habitLogs.find((l) => l.habitId === habitId && l.date === cursor);
    if (!log?.completed) break;
    streak += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }
  return streak;
}
