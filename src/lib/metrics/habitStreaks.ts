import type { Habit, HabitLog } from "@/lib/models";

function padDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function previousDay(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return padDate(d);
}

/** Current streak: consecutive days ending at `endDate` where the habit is logged and completed (good day). */
export function currentHabitStreak(habit: Habit, logs: HabitLog[], endDate: string) {
  let streak = 0;
  let cursor = endDate;
  const maxIterations = 730;

  for (let i = 0; i < maxIterations; i++) {
    const log = logs.find((l) => l.habitId === habit.id && l.date === cursor);
    if (!log || !log.completed) break;
    streak += 1;
    cursor = previousDay(cursor);
  }

  return streak;
}
