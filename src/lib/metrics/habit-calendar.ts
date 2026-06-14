import { addDaysToDateKey, dayOfMonthInAppTimezone } from "@/lib/timezone";

export type HabitCalendarDay = {
  key: string;
  dayOfMonth: number;
  status: "good" | "bad" | "none";
};

export type HabitCalendarData = {
  days: HabitCalendarDay[];
  firstDate: string;
  lastDate: string;
  goodDays: number;
};

export function buildHabitCalendarData(
  habitId: string,
  logs: Array<{ habitId: string; date: string; completed: boolean }>,
  anchorDate: string,
  dayCount = 30,
): HabitCalendarData {
  const days = Array.from({ length: dayCount }, (_, idx) => {
    const key = addDaysToDateKey(anchorDate, -(dayCount - 1 - idx));
    const log = logs.find((entry) => entry.habitId === habitId && entry.date === key);
    const status: HabitCalendarDay["status"] = !log ? "none" : log.completed ? "good" : "bad";
    return {
      key,
      dayOfMonth: dayOfMonthInAppTimezone(key),
      status,
    };
  });

  return {
    days,
    firstDate: days[0]?.key ?? anchorDate,
    lastDate: days[days.length - 1]?.key ?? anchorDate,
    goodDays: days.filter((d) => d.status === "good").length,
  };
}
