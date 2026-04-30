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
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingHabitName, setEditingHabitName] = useState("");
  const [editingHabitType, setEditingHabitType] = useState<"build" | "break">("build");
  const [calendarHabitId, setCalendarHabitId] = useState<string | null>(null);
  const today = todayKey();

  const todayLogs = useMemo(() => data.habitLogs.filter((log) => log.date === today), [data.habitLogs, today]);

  const habitCalendarData = useMemo(() => {
    if (!calendarHabitId) return null;
    const habit = data.habits.find((h) => h.id === calendarHabitId);
    if (!habit) return null;

    const days = Array.from({ length: 30 }, (_, idx) => {
      const d = new Date(`${today}T12:00:00`);
      d.setDate(d.getDate() - (29 - idx));
      const key = d.toISOString().slice(0, 10);
      const log = data.habitLogs.find((entry) => entry.habitId === habit.id && entry.date === key);
      return {
        key,
        dayOfMonth: d.getDate(),
        status: log?.completed === true ? "good" : "bad",
      };
    });

    const firstDate = days[0]?.key ?? today;
    const lastDate = days[days.length - 1]?.key ?? today;
    const goodDays = days.filter((d) => d.status === "good").length;

    return { habit, days, firstDate, lastDate, goodDays };
  }, [calendarHabitId, data.habits, data.habitLogs, today]);

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

  function startEditHabit(habitId: string) {
    const habit = data.habits.find((item) => item.id === habitId);
    if (!habit) return;
    setEditingHabitId(habit.id);
    setEditingHabitName(habit.name);
    setEditingHabitType(habit.type);
  }

  function saveHabitEdits() {
    if (!editingHabitId || !editingHabitName.trim()) return;
    setData((prev) => ({
      ...prev,
      habits: prev.habits.map((habit) =>
        habit.id === editingHabitId
          ? { ...habit, name: editingHabitName.trim(), type: editingHabitType }
          : habit,
      ),
    }));
    setEditingHabitId(null);
    setEditingHabitName("");
  }

  function deleteHabit(habitId: string) {
    setData((prev) => ({
      ...prev,
      habits: prev.habits.filter((habit) => habit.id !== habitId),
      habitLogs: prev.habitLogs.filter((log) => log.habitId !== habitId),
    }));
    if (editingHabitId === habitId) {
      setEditingHabitId(null);
      setEditingHabitName("");
    }
  }

  function setTodayHabitLog(habitId: string, completed: boolean) {
    setData((prev) => {
      const existing = prev.habitLogs.find((log) => log.habitId === habitId && log.date === today);
      const nextLogs = existing
        ? prev.habitLogs.map((log) => (log.id === existing.id ? { ...log, completed } : log))
        : [{ id: crypto.randomUUID(), habitId, date: today, completed }, ...prev.habitLogs];

      return { ...prev, habitLogs: nextLogs };
    });
  }

  if (!ready) return <div className="p-6">Loading habits...</div>;

  return (
    <AppShell
      title="Habits"
      description="Track daily build/break habits with history."
    >
      <SectionCard title="Habits">
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <input
            value={habitName}
            onChange={(event) => setHabitName(event.target.value)}
            placeholder="Habit name"
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <select
            value={habitType}
            onChange={(event) => setHabitType(event.target.value as "build" | "break")}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          >
            <option value="build">Build</option>
            <option value="break">Break</option>
          </select>
          <button
            type="button"
            onClick={addHabit}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700"
          >
            Add Habit
          </button>
        </div>

        <div className="grid gap-2">
          {data.habits.filter((habit) => habit.active).map((habit) => {
            const log = todayLogs.find((entry) => entry.habitId === habit.id);
            const streak = currentHabitStreak(habit, data.habitLogs, today);
            return (
              <div
                key={habit.id}
                className="rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2"
              >
                {editingHabitId === habit.id ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={editingHabitName}
                      onChange={(event) => setEditingHabitName(event.target.value)}
                      className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                    />
                    <select
                      value={editingHabitType}
                      onChange={(event) => setEditingHabitType(event.target.value as "build" | "break")}
                      className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                    >
                      <option value="build">Build</option>
                      <option value="break">Break</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={saveHabitEdits}
                        className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingHabitId(null)}
                        className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-sky-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          title="Done today"
                          aria-label="Log habit as done today"
                          aria-pressed={log?.completed === true}
                          onClick={() => setTodayHabitLog(habit.id, true)}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                            log?.completed === true
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                              : "border-sky-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                          }`}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          title="Missed today"
                          aria-label="Log habit as missed today"
                          aria-pressed={log?.completed === false}
                          onClick={() => setTodayHabitLog(habit.id, false)}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                            log && log.completed === false
                              ? "border-red-600 bg-red-600 text-white shadow-sm"
                              : "border-sky-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50"
                          }`}
                        >
                          ✗
                        </button>
                      </div>
                      <span className="min-w-0 text-sm">
                        {habit.name} <span className="text-sky-800/60">({habit.type})</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-sky-800/60">Streak: {streak}d</span>
                      <button
                        type="button"
                        onClick={() => setCalendarHabitId(habit.id)}
                        className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-sky-50"
                        aria-label="Open 30-day habit calendar"
                        title="Open 30-day habit calendar"
                      >
                        📅
                      </button>
                      <button
                        onClick={() => startEditHabit(habit.id)}
                        className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-sky-50"
                        aria-label="Edit habit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        aria-label="Delete habit"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!data.habits.length && <p className="text-sm text-zinc-600">No habits yet.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Habit History">
        <div className="grid gap-2">
          {data.habitLogs.slice(0, 30).map((log) => {
            const habit = data.habits.find((h) => h.id === log.habitId);
            return (
              <div key={log.id} className="rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2 text-sm">
                {log.date}: {habit?.name ?? "Habit"} — {log.completed ? "Done" : "Missed"}
              </div>
            );
          })}
          {!data.habitLogs.length && <p className="text-sm text-zinc-600">No history yet.</p>}
        </div>
      </SectionCard>

      {habitCalendarData ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/35 p-3 sm:items-center">
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-sky-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">{habitCalendarData.habit.name}</h3>
                <p className="text-xs text-zinc-600">Last 30 days calendar</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-sky-900">{habitCalendarData.goodDays}/30</p>
                <p className="text-xs text-zinc-500">days accomplished</p>
              </div>
            </div>

            <div className="mb-3 rounded-lg border border-sky-200/80 bg-sky-50/40 p-2 text-xs text-zinc-700">
              <p className="font-medium text-sky-900">Date range</p>
              <p>
                {habitCalendarData.firstDate} to {habitCalendarData.lastDate}
              </p>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-zinc-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
                <div key={name} className="py-1">
                  {name}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 rounded-lg border border-sky-200/80 bg-white p-2">
              {habitCalendarData.days.map((day) => (
                <div
                  key={day.key}
                  className={`rounded-md px-1 py-2 text-center text-xs font-medium ${
                    day.status === "good"
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-red-100 text-red-900"
                  }`}
                  title={`${day.key}: ${day.status === "good" ? "Accomplished" : "Missed"}`}
                >
                  <div>{day.dayOfMonth}</div>
                  <div className="text-[10px] opacity-80">{day.key.slice(5)}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setCalendarHabitId(null)}
                className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-sky-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
