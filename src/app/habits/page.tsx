"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { currentHabitStreak } from "@/lib/metrics/habitStreaks";
import { todayKey, useAppData } from "@/lib/storage";

export default function HabitsPage() {
  const { data, ready, setData } = useAppData();
  const [habitName, setHabitName] = useState("");
  const [habitType, setHabitType] = useState<"build" | "break">("build");
  const today = todayKey();

  const todayLogs = useMemo(() => data.habitLogs.filter((log) => log.date === today), [data.habitLogs, today]);

  function addHabit() {
    if (!habitName.trim()) return;
    setData((prev) => ({
      ...prev,
      habits: [
        {
          id: crypto.randomUUID(),
          name: habitName.trim(),
          type: habitType,
          active: true,
          createdAt: new Date().toISOString(),
        },
        ...prev.habits,
      ],
    }));
    setHabitName("");
  }

  function toggleHabit(habitId: string, checked: boolean) {
    setData((prev) => {
      const existing = prev.habitLogs.find((log) => log.habitId === habitId && log.date === today);
      const nextLogs = existing
        ? prev.habitLogs.map((log) => (log.id === existing.id ? { ...log, completed: checked } : log))
        : [{ id: crypto.randomUUID(), habitId, date: today, completed: checked }, ...prev.habitLogs];

      return { ...prev, habitLogs: nextLogs };
    });
  }

  if (!ready) return <div className="p-6">Loading habits...</div>;

  return (
    <AppShell
      title="Habits"
      description="Track daily build/break habits with history."
    >
      <SectionCard title="Create Habit" subtitle="Choose if this habit is one to build or break.">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={habitName}
            onChange={(event) => setHabitName(event.target.value)}
            placeholder="Habit name"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <select
            value={habitType}
            onChange={(event) => setHabitType(event.target.value as "build" | "break")}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="build">Build</option>
            <option value="break">Break</option>
          </select>
          <button onClick={addHabit} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
            Add Habit
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Today's Habit Check-In" subtitle="Mark each habit complete/incomplete for today.">
        <div className="grid gap-2">
          {data.habits.filter((habit) => habit.active).map((habit) => {
            const log = todayLogs.find((entry) => entry.habitId === habit.id);
            const streak = currentHabitStreak(habit, data.habitLogs, today);
            return (
              <label
                key={habit.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={log?.completed ?? false}
                    onChange={(event) => toggleHabit(habit.id, event.target.checked)}
                  />
                  <span className="text-sm">
                    {habit.name} <span className="text-zinc-500">({habit.type})</span>
                  </span>
                </div>
                <span className="text-xs font-medium text-zinc-500">Streak: {streak}d</span>
              </label>
            );
          })}
          {!data.habits.length && <p className="text-sm text-zinc-600">Create habits to start tracking.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Habit History" subtitle="Recent completion history for all tracked habits.">
        <div className="grid gap-2">
          {data.habitLogs.slice(0, 30).map((log) => {
            const habit = data.habits.find((h) => h.id === log.habitId);
            return (
              <div key={log.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                {log.date}: {habit?.name ?? "Habit"} - {log.completed ? "Complete" : "Incomplete"}
              </div>
            );
          })}
          {!data.habitLogs.length && <p className="text-sm text-zinc-600">No history yet.</p>}
        </div>
      </SectionCard>
    </AppShell>
  );
}
