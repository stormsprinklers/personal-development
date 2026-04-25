import type { AppData } from "@/lib/models";
import { strengthSummaryByExercise } from "@/lib/metrics/workoutMetrics";

export function buildAiContext(data: AppData, targetDate: string) {
  const recentWorkouts = data.workoutSessions.slice(0, 7);
  const recentHabits = data.habitLogs.filter((log) => log.date >= targetDate).slice(0, 20);
  const recentCompletions = data.todoCompletions
    .filter((completion) => completion.completedAt.slice(0, 10) >= targetDate)
    .slice(0, 20);
  const recentJournal = data.journalEntries.slice(0, 10);
  const activeGoals = data.goals.filter((goal) => !goal.completed);

  const strengthSummary = strengthSummaryByExercise(recentWorkouts, data.exercises);

  return {
    user: data.userProfile,
    targetDate,
    activeGoals: activeGoals.map((goal) => ({
      title: goal.title,
      sectionId: goal.sectionId,
    })),
    recentWorkouts,
    recentHabits,
    recentCompletions,
    recentJournal,
    strengthSummary,
  };
}
