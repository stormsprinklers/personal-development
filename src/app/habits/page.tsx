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
      const status: "good" | "bad" | "none" = !log ? "none" : log.completed === true ? "good" : "bad";
      return {
        key,
        dayOfMonth: d.getDate(),
        status,
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
            className="rounded-lg border border-slate/30 bg-white px-3 py-2 text-sm focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
          />
          <select
            value={habitType}
            onChange={(event) => setHabitType(event.target.value as "build" | "break")}
            className="rounded-lg border border-slate/30 bg-white px-3 py-2 text-sm focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
          >
            <option value="build">Build</option>
            <option value="break">Break</option>
          </select>
          <button
            type="button"
            onClick={addHabit}
            className="rounded-lg bg-steel px-4 py-2 text-sm text-white shadow-sm shadow-steel/15 hover:bg-steel/90"
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
                className="rounded-lg border border-slate/25 bg-steel/5 px-3 py-2"
              >
                {editingHabitId === habit.id ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={editingHabitName}
                      onChange={(event) => setEditingHabitName(event.target.value)}
                      className="rounded-lg border border-slate/30 bg-white px-3 py-2 text-sm focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
                    />
                    <select
                      value={editingHabitType}
                      onChange={(event) => setEditingHabitType(event.target.value as "build" | "break")}
                      className="rounded-lg border border-slate/30 bg-white px-3 py-2 text-sm focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
                    >
                      <option value="build">Build</option>
                      <option value="break">Break</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={saveHabitEdits}
                        className="rounded-lg bg-steel px-3 py-2 text-xs font-medium text-white hover:bg-steel/90"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingHabitId(null)}
                        className="rounded-lg border border-slate/30 bg-white px-3 py-2 text-xs font-medium text-slate hover:bg-steel/5"
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
                              ? "border-emerald bg-emerald text-white shadow-sm"
                              : "border-slate/30 bg-white text-emerald hover:border-emerald/50 hover:bg-emerald/10"
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
                              ? "border-copper bg-copper text-white shadow-sm"
                              : "border-slate/30 bg-white text-copper hover:border-copper/40 hover:bg-copper/10"
                          }`}
                        >
                          ✗
                        </button>
                      </div>
                      <span className="min-w-0 text-sm">
                        {habit.name} <span className="text-slate/70">({habit.type})</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate/70">Streak: {streak}d</span>
                      <button
                        type="button"
                        onClick={() => setCalendarHabitId(habit.id)}
                        className="rounded-md border border-slate/30 bg-white px-2 py-1 text-xs text-slate hover:bg-steel/5"
                        aria-label="Open 30-day habit calendar"
                        title="Open 30-day habit calendar"
                      >
                        📅
                      </button>
                      <button
                        onClick={() => startEditHabit(habit.id)}
                        className="rounded-md border border-slate/30 bg-white px-2 py-1 text-xs text-slate hover:bg-steel/5"
                        aria-label="Edit habit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="rounded-md border border-copper/30 bg-white px-2 py-1 text-xs text-copper hover:bg-copper/10"
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
          {!data.habits.length && <p className="text-sm text-slate">No habits yet.</p>}
        </div>
      </SectionCard>

      {habitCalendarData ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/35 p-3 sm:items-center">
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-slate/30 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-charcoal">{habitCalendarData.habit.name}</h3>
                <p className="text-xs text-slate">Last 30 days calendar</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-charcoal">{habitCalendarData.goodDays}/30</p>
                <p className="text-xs text-slate/80">days accomplished</p>
              </div>
            </div>

            <div className="mb-3 rounded-lg border border-slate/25 bg-steel/5 p-2 text-xs text-slate">
              <p className="font-medium text-charcoal">Date range</p>
              <p>
                {habitCalendarData.firstDate} to {habitCalendarData.lastDate}
              </p>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate/80">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
                <div key={name} className="py-1">
                  {name}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 rounded-lg border border-slate/25 bg-white p-2">
              {habitCalendarData.days.map((day) => {
                const cellClass =
                  day.status === "good"
                    ? "bg-emerald/15 text-emerald"
                    : day.status === "bad"
                      ? "bg-copper/15 text-copper"
                      : "bg-slate/10 text-slate ring-1 ring-inset ring-slate/20";
                const label =
                  day.status === "good" ? "Accomplished" : day.status === "bad" ? "Missed (marked ✗)" : "Unmarked";
                return (
                  <div
                    key={day.key}
                    className={`rounded-md px-1 py-2 text-center text-xs font-medium ${cellClass}`}
                    title={`${day.key}: ${label}`}
                  >
                    <div>{day.dayOfMonth}</div>
                    <div className="text-[10px] opacity-80">{day.key.slice(5)}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setCalendarHabitId(null)}
                className="rounded-lg border border-slate/30 bg-white px-3 py-2 text-sm text-slate hover:bg-steel/5"
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
