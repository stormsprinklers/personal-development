"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { currentHabitStreak } from "@/lib/metrics/habitStreaks";
import { todayKey, useAppData } from "@/lib/storage";

export default function HabitsPage() {
  const { data, ready, setData } = useAppData();
  const [activeSubTab, setActiveSubTab] = useState<"tracking" | "manage">("tracking");
  const [habitName, setHabitName] = useState("");
  const [habitType, setHabitType] = useState<"build" | "break">("build");
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingHabitName, setEditingHabitName] = useState("");
  const [editingHabitType, setEditingHabitType] = useState<"build" | "break">("build");
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
      <SectionCard title="Habit Views" subtitle="Track habits on the main tab and manage your list in Manage Habits.">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("tracking")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeSubTab === "tracking"
                ? "bg-sky-600 text-white shadow-sm shadow-sky-200/50"
                : "border border-sky-200 bg-white text-zinc-700 hover:bg-sky-50"
            }`}
          >
            Main Tracking
          </button>
          <button
            onClick={() => setActiveSubTab("manage")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeSubTab === "manage"
                ? "bg-sky-600 text-white shadow-sm shadow-sky-200/50"
                : "border border-sky-200 bg-white text-zinc-700 hover:bg-sky-50"
            }`}
          >
            Manage Habits
          </button>
        </div>
      </SectionCard>

      {activeSubTab === "tracking" ? (
        <>
          <SectionCard title="Today's Habit Check-In" subtitle="Mark each habit complete/incomplete for today.">
            <div className="grid gap-2">
              {data.habits.filter((habit) => habit.active).map((habit) => {
                const log = todayLogs.find((entry) => entry.habitId === habit.id);
                const streak = currentHabitStreak(habit, data.habitLogs, today);
                return (
                  <label
                    key={habit.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={log?.completed ?? false}
                        onChange={(event) => toggleHabit(habit.id, event.target.checked)}
                      />
                      <span className="text-sm">
                        {habit.name} <span className="text-sky-800/60">({habit.type})</span>
                      </span>
                    </div>
                    <span className="text-xs font-medium text-sky-800/60">Streak: {streak}d</span>
                  </label>
                );
              })}
              {!data.habits.length && <p className="text-sm text-zinc-600">Create habits in Manage Habits first.</p>}
            </div>
          </SectionCard>

          <SectionCard title="Habit History" subtitle="Recent completion history for all tracked habits.">
            <div className="grid gap-2">
              {data.habitLogs.slice(0, 30).map((log) => {
                const habit = data.habits.find((h) => h.id === log.habitId);
                return (
                  <div key={log.id} className="rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2 text-sm">
                    {log.date}: {habit?.name ?? "Habit"} - {log.completed ? "Complete" : "Incomplete"}
                  </div>
                );
              })}
              {!data.habitLogs.length && <p className="text-sm text-zinc-600">No history yet.</p>}
            </div>
          </SectionCard>
        </>
      ) : (
        <>
          <SectionCard title="Create Habit" subtitle="Add a new build or break habit to track.">
            <div className="grid gap-3 sm:grid-cols-3">
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
                onClick={addHabit}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700"
              >
                Add Habit
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Edit / Delete Habits" subtitle="Maintain your tracked habits list.">
            <div className="grid gap-2">
              {data.habits.map((habit) => (
                <div
                  key={habit.id}
                  className="rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-3 text-sm"
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
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        {habit.name} <span className="text-sky-800/60">({habit.type})</span>
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditHabit(habit.id)}
                          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-sky-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!data.habits.length && <p className="text-sm text-zinc-600">No habits yet.</p>}
            </div>
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}
