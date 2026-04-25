import type { AppData } from "@/lib/models";
import { strengthSummaryByExercise } from "@/lib/metrics/workoutMetrics";

export function buildAiContext(data: AppData, targetDate: string) {
  const sortedWorkouts = [...data.workoutSessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 21);
  const recentHabits = [...data.habitLogs]
    .filter((log) => log.date <= targetDate)
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .slice(0, 40);
  const recentCompletions = [...data.todoCompletions]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 30)
    .map((completion) => {
      const item = data.todoItems.find((todo) => todo.id === completion.todoItemId);
      const list = item ? data.todoLists.find((l) => l.id === item.listId) : undefined;
      return {
        completedAt: completion.completedAt,
        title: item?.title,
        area: list?.area,
      };
    });
  const recentJournal = [...data.journalEntries]
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .slice(0, 12)
    .map((entry) => ({
      date: entry.date,
      excerpt: entry.content.slice(0, 400),
      linkedGoalTitles: entry.goalIds
        .map((id) => data.goals.find((g) => g.id === id)?.title)
        .filter(Boolean),
    }));

  const currentYear = new Date().getFullYear();
  const activeGoals = data.goals.filter((goal) => !goal.completed && goal.year === currentYear);
  const completedGoals = data.goals.filter((goal) => goal.completed && goal.year === currentYear);

  const strengthSummary = strengthSummaryByExercise(sortedWorkouts, data.exercises);

  return {
    user: data.userProfile,
    targetDate,
    activeGoals: activeGoals.map((goal) => ({
      title: goal.title,
      sectionId: goal.sectionId,
      year: goal.year,
    })),
    completedGoalsThisYear: completedGoals.map((g) => g.title),
    recentWorkouts: sortedWorkouts,
    recentHabits,
    recentCompletions,
    recentJournal,
    strengthSummary,
  };
}
