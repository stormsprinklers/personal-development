import type { Habit, HabitLog } from "@/lib/models";
import { addDaysToDateKey } from "@/lib/timezone";

function previousDay(dateStr: string) {
  return addDaysToDateKey(dateStr, -1);
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
