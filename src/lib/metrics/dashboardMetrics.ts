import type { AppData } from "@/lib/models";

function padDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function dateKeysLastNDays(n: number, end = new Date()) {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(end);
    x.setDate(x.getDate() - i);
    keys.push(padDate(x));
  }
  return keys;
}

export function todoCompletionsByDay(data: AppData, days = 14) {
  const keys = dateKeysLastNDays(days);
  const map = new Map(keys.map((k) => [k, 0]));
  for (const c of data.todoCompletions) {
    const d = c.completedAt.slice(0, 10);
    if (map.has(d)) map.set(d, (map.get(d) ?? 0) + 1);
  }
  return keys.map((date) => ({ date, count: map.get(date) ?? 0 }));
}

export function habitAdherenceByDay(data: AppData, days = 14) {
  const keys = dateKeysLastNDays(days);
  const active = data.habits.filter((h) => h.active);
  return keys.map((date) => {
    if (!active.length) return { date, percent: 0 };
    const done = active.filter((h) =>
      data.habitLogs.some((log) => log.habitId === h.id && log.date === date && log.completed),
    ).length;
    return { date, percent: Math.round((done / active.length) * 100) };
  });
}

export function bodyWeightTrend(data: AppData) {
  return [...data.workoutSessions]
    .filter((s) => typeof s.bodyWeight === "number" && !Number.isNaN(s.bodyWeight))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ date: s.date, weight: s.bodyWeight as number }));
}

export function cardioMinutesLastDays(data: AppData, days = 14) {
  const keys = dateKeysLastNDays(days);
  const from = keys[0];
  const totals = { run: 0, bike: 0, swim: 0 };
  for (const session of data.workoutSessions) {
    if (session.date < from) continue;
    for (const entry of session.cardioEntries) {
      if (entry.type === "run") totals.run += entry.timeMinutes;
      if (entry.type === "bike") totals.bike += entry.timeMinutes;
      if (entry.type === "swim") totals.swim += entry.timeMinutes;
    }
  }
  return totals;
}

export function goalsProgressForYear(data: AppData, year: number) {
  const list = data.goals.filter((g) => g.year === year);
  if (!list.length) return { done: 0, total: 0, percent: 0 };
  const done = list.filter((g) => g.completed).length;
  return { done, total: list.length, percent: Math.round((done / list.length) * 100) };
}
