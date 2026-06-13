"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GroupedRow } from "@/components/ui/grouped-row";
import { Sheet } from "@/components/ui/sheet";
import { currentHabitStreak } from "@/lib/metrics/habitStreaks";
import { addDaysToDateKey, dayOfMonthInAppTimezone } from "@/lib/timezone";
import { useAppData, useTodayKey } from "@/lib/storage";

export default function HabitsPage() {
  const { data, ready, setData } = useAppData();
  const [habitName, setHabitName] = useState("");
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingHabitName, setEditingHabitName] = useState("");
  const [calendarHabitId, setCalendarHabitId] = useState<string | null>(null);
  const [calendarDayPicker, setCalendarDayPicker] = useState<string | null>(null);
  const today = useTodayKey();

  const todayLogs = useMemo(() => data.habitLogs.filter((log) => log.date === today), [data.habitLogs, today]);

  const habitCalendarData = useMemo(() => {
    if (!calendarHabitId || !today) return null;
    const habit = data.habits.find((h) => h.id === calendarHabitId);
    if (!habit) return null;

    const days = Array.from({ length: 30 }, (_, idx) => {
      const key = addDaysToDateKey(today, -(29 - idx));
      const log = data.habitLogs.find((entry) => entry.habitId === habit.id && entry.date === key);
      const status: "good" | "bad" | "none" = !log ? "none" : log.completed === true ? "good" : "bad";
      return {
        key,
        dayOfMonth: dayOfMonthInAppTimezone(key),
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
  }

  function saveHabitEdits() {
    if (!editingHabitId || !editingHabitName.trim()) return;
    setData((prev) => ({
      ...prev,
      habits: prev.habits.map((habit) =>
        habit.id === editingHabitId ? { ...habit, name: editingHabitName.trim() } : habit,
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

  function setHabitLog(habitId: string, date: string, completed: boolean) {
    setData((prev) => {
      const existing = prev.habitLogs.find((log) => log.habitId === habitId && log.date === date);
      const nextLogs = existing
        ? prev.habitLogs.map((log) => (log.id === existing.id ? { ...log, completed } : log))
        : [{ id: crypto.randomUUID(), habitId, date, completed }, ...prev.habitLogs];

      return { ...prev, habitLogs: nextLogs };
    });
    setCalendarDayPicker(null);
  }

  function setTodayHabitLog(habitId: string, completed: boolean) {
    if (!today) return;
    setHabitLog(habitId, today, completed);
  }

  function openCalendar(habitId: string) {
    setCalendarHabitId(habitId);
    setCalendarDayPicker(null);
  }

  if (!ready || !today) return <div className="p-6">Loading habits...</div>;

  return (
    <AppShell
      title="Habits"
      description="Track daily habits with check-ins and history."
    >
      <SectionCard title="Habits">
        <GroupedRow hairline>
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            <input
              value={habitName}
              onChange={(event) => setHabitName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addHabit();
                }
              }}
              placeholder="Habit name"
              className="ios-field min-w-0 flex-1 px-3 py-2.5 text-sm"
            />
            <GlassButton variant="primary" onClick={addHabit}>
              Add Habit
            </GlassButton>
          </div>
        </GroupedRow>
        <div className="min-w-0">
          {data.habits.filter((habit) => habit.active).map((habit, index, arr) => {
            const log = todayLogs.find((entry) => entry.habitId === habit.id);
            const streak = currentHabitStreak(habit, data.habitLogs, today);
            return (
              <div
                key={habit.id}
                className={`bg-ios-surface px-5 py-4 ${index < arr.length - 1 ? "ios-hairline" : ""}`}
              >
                {editingHabitId === habit.id ? (
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <input
                      value={editingHabitName}
                      onChange={(event) => setEditingHabitName(event.target.value)}
                      className="ios-field min-w-0 flex-1 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveHabitEdits}
                        className="glass-button-tint glass-button-compact rounded-lg px-3 py-2 text-xs font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingHabitId(null)}
                        className="glass-button glass-button-compact rounded-lg px-3 py-2 text-xs font-medium text-ios-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-3">
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
                            : "glass-button ios-elevated flex h-9 w-9 min-h-0 items-center justify-center rounded-full text-emerald"
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
                            : "glass-button ios-elevated flex h-9 w-9 min-h-0 items-center justify-center rounded-full text-copper"
                        }`}
                      >
                        ✗
                      </button>
                    </div>
                    <span className="min-w-0 flex-1 text-sm leading-snug">{habit.name}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="shrink-0 text-xs font-medium text-slate/90">Streak: {streak}d</span>
                      <button
                        type="button"
                        onClick={() => openCalendar(habit.id)}
                        className="glass-button glass-button-compact rounded-md px-2 py-1 text-xs text-ios-secondary"
                        aria-label="Open 30-day habit calendar"
                        title="Open 30-day habit calendar"
                      >
                        📅
                      </button>
                      <button
                        onClick={() => startEditHabit(habit.id)}
                        className="glass-button glass-button-compact rounded-md px-2 py-1 text-xs text-ios-secondary"
                        aria-label="Edit habit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="glass-button glass-button-compact rounded-md border border-copper/30 bg-copper/10 px-2 py-1 text-xs text-copper"
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
          {!data.habits.length ? <p className="px-5 py-4 text-sm text-ios-secondary">No habits yet.</p> : null}
        </div>
      </SectionCard>

      <Sheet
        open={Boolean(habitCalendarData)}
        onClose={() => {
          setCalendarHabitId(null);
          setCalendarDayPicker(null);
        }}
        title={habitCalendarData?.habit.name}
      >
        {habitCalendarData ? (
          <>
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="ios-footnote">Last 30 days calendar</p>
              <div className="text-right">
                <p className="text-sm font-semibold text-ios-label">{habitCalendarData.goodDays}/30</p>
                <p className="ios-footnote">days accomplished</p>
              </div>
            </div>

            <div className="mb-3 rounded-xl bg-ios-fill p-3 text-xs text-ios-secondary">
              <p className="font-medium text-ios-label">Date range</p>
              <p>
                {habitCalendarData.firstDate} to {habitCalendarData.lastDate}
              </p>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ios-secondary">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
                <div key={name} className="py-1">
                  {name}
                </div>
              ))}
            </div>

            <p className="mb-2 text-[11px] text-ios-secondary">Tap a day to mark success or failure.</p>

            <div className="grid grid-cols-7 gap-1 rounded-xl bg-ios-surface p-2">
              {habitCalendarData.days.map((day, dayIndex) => {
                const cellClass =
                  day.status === "good"
                    ? "bg-emerald/15 text-emerald"
                    : day.status === "bad"
                      ? "bg-copper/15 text-copper"
                      : "bg-ios-fill text-ios-secondary";
                const label =
                  day.status === "good" ? "Accomplished" : day.status === "bad" ? "Missed (marked ✗)" : "Unmarked";
                const pickerOpen = calendarDayPicker === day.key;
                const bubbleAbove = dayIndex >= 7;

                return (
                  <div key={day.key} className="relative">
                    {pickerOpen ? (
                      <div
                        className={`absolute left-1/2 z-20 -translate-x-1/2 ${
                          bubbleAbove ? "bottom-full mb-1.5" : "top-full mt-1.5"
                        }`}
                      >
                        <div
                          className="glass-surface flex items-center gap-1 rounded-lg p-1 shadow-lg"
                          role="menu"
                          aria-label={`Log ${day.key}`}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            aria-label="Mark as success"
                            onClick={() => setHabitLog(habitCalendarData.habit.id, day.key, true)}
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald/15 text-sm font-semibold text-emerald"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            aria-label="Mark as failure"
                            onClick={() => setHabitLog(habitCalendarData.habit.id, day.key, false)}
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-copper/15 text-sm font-semibold text-copper"
                          >
                            ✗
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setCalendarDayPicker((current) => (current === day.key ? null : day.key))}
                      className={`w-full rounded-lg px-1 py-2 text-center text-xs font-medium transition-shadow ${cellClass} ${
                        pickerOpen ? "ring-2 ring-ios-tint/40" : "hover:ring-2 hover:ring-ios-tint/20"
                      }`}
                      title={`${day.key}: ${label}. Tap to log.`}
                      aria-expanded={pickerOpen}
                      aria-haspopup="menu"
                    >
                      <div>{day.dayOfMonth}</div>
                      <div className="text-[10px] opacity-80">{day.key.slice(5)}</div>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end">
              <GlassButton
                variant="secondary"
                onClick={() => {
                  setCalendarHabitId(null);
                  setCalendarDayPicker(null);
                }}
              >
                Close
              </GlassButton>
            </div>
          </>
        ) : null}
      </Sheet>
    </AppShell>
  );
}
