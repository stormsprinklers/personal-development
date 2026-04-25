"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { Sparkline } from "@/components/charts/sparkline";
import { buildAiContext } from "@/lib/ai/contextBuilder";
import { dailySummaryPrompt } from "@/lib/ai/prompts";
import { bodyWeightTrend, goalsProgressForYear } from "@/lib/metrics/dashboardMetrics";
import { strengthSummaryByExercise } from "@/lib/metrics/workoutMetrics";
import { todayKey, useAppData } from "@/lib/storage";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function Home() {
  const { data, setData } = useAppData();
  const today = todayKey();
  const [weekOffset, setWeekOffset] = useState(0);
  const year = new Date().getFullYear();
  const weekStart = useMemo(() => new Date(startOfWeek(new Date()).getTime() + weekOffset * WEEK_MS), [weekOffset]);
  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000), [weekStart]);
  const weekStartKey = toDateKey(weekStart);
  const weekEndKey = toDateKey(weekEnd);
  const weekLabel = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;

  const weeklyWorkouts = useMemo(
    () => data.workoutSessions.filter((session) => session.date >= weekStartKey && session.date <= weekEndKey),
    [data.workoutSessions, weekStartKey, weekEndKey],
  );

  const weeklyStrength = useMemo(
    () => strengthSummaryByExercise(weeklyWorkouts, data.exercises).slice(0, 3),
    [weeklyWorkouts, data.exercises],
  );

  const estimatedOneRm = weeklyStrength[0]?.bestOneRepMax ?? 0;
  const cardioTotals = useMemo(() => {
    const totals = { run: 0, bike: 0, swim: 0 };
    for (const session of weeklyWorkouts) {
      for (const entry of session.cardioEntries) {
        if (entry.type === "run") totals.run += entry.timeMinutes;
        if (entry.type === "bike") totals.bike += entry.timeMinutes;
        if (entry.type === "swim") totals.swim += entry.timeMinutes;
      }
    }
    return totals;
  }, [weeklyWorkouts]);
  const cardioMinutes = cardioTotals.run + cardioTotals.bike + cardioTotals.swim;
  const cardioModalities = (cardioTotals.run > 0 ? 1 : 0) + (cardioTotals.bike > 0 ? 1 : 0) + (cardioTotals.swim > 0 ? 1 : 0);
  const cardioHealthScore = Math.min(100, Math.round((cardioMinutes / 150) * 80 + cardioModalities * 10));

  const weightSeries = useMemo(
    () => bodyWeightTrend(data).filter((point) => point.date >= weekStartKey && point.date <= weekEndKey),
    [data, weekStartKey, weekEndKey],
  );
  const weightValues = useMemo(() => weightSeries.map((w) => w.weight), [weightSeries]);

  const weeklyTodoCompletions = useMemo(
    () => data.todoCompletions.filter((completion) => completion.completedAt.slice(0, 10) >= weekStartKey && completion.completedAt.slice(0, 10) <= weekEndKey).length,
    [data.todoCompletions, weekStartKey, weekEndKey],
  );
  const activeHabits = useMemo(() => data.habits.filter((habit) => habit.active), [data.habits]);
  const habitChecksInWeek = useMemo(() => {
    if (!activeHabits.length) return 0;
    let checks = 0;
    for (const habit of activeHabits) {
      for (const log of data.habitLogs) {
        if (log.habitId === habit.id && log.completed && log.date >= weekStartKey && log.date <= weekEndKey) {
          checks += 1;
        }
      }
    }
    return checks;
  }, [activeHabits, data.habitLogs, weekStartKey, weekEndKey]);
  const habitTarget = activeHabits.length * 7;
  const weeklyHabitAdherence = habitTarget ? Math.round((habitChecksInWeek / habitTarget) * 100) : 0;

  const goalProgress = useMemo(() => goalsProgressForYear(data, year), [data, year]);

  const latestSummary = data.aiInsights.find((insight) => insight.type === "daily_summary" && insight.date === today);

  async function generateDailySummary() {
    const context = buildAiContext(data, today);
    const prompt = dailySummaryPrompt(JSON.stringify(context, null, 2));
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, temperature: 0.4 }),
    });
    const payload = (await response.json()) as { output?: string; error?: string };
    const text = payload.output ?? payload.error;
    if (!text) return;

    setData((prev) => ({
      ...prev,
      aiInsights: [
        {
          id: crypto.randomUUID(),
          type: "daily_summary",
          date: today,
          prompt,
          output: text,
        },
        ...prev.aiInsights.filter((insight) => !(insight.type === "daily_summary" && insight.date === today)),
      ],
    }));
  }

  return (
    <AppShell
      title="Dashboard"
      description="Weekly view of your health and progress toward goals."
    >
      <SectionCard title="Week" subtitle="Dashboard metrics are grouped by week.">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-sky-50"
          >
            Previous Week
          </button>
          <p className="text-sm font-medium text-sky-800/80">{weekLabel}</p>
          <button
            onClick={() => setWeekOffset((prev) => Math.min(prev + 1, 0))}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-sky-50 disabled:opacity-40"
            disabled={weekOffset === 0}
          >
            Next Week
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Daily AI Summary"
        subtitle="One paragraph recap based on your full tracked context."
      >
        <div className="grid gap-3">
          <p className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-4 text-sm text-zinc-700">
            {latestSummary?.output ??
              "No summary yet for today. Generate one to see accomplishments and improvement advice."}
          </p>
          <div>
            <button
              onClick={generateDailySummary}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700"
            >
              Generate Today&apos;s Summary
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Health" subtitle={`Health metrics for ${weekLabel}.`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-sky-800/70">Estimated 1RM</p>
            <p className="mt-1 text-2xl font-semibold">{estimatedOneRm || "-"}</p>
          </div>
          <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-sky-800/70">Cardio Health Score</p>
            <p className="mt-1 text-2xl font-semibold">{cardioHealthScore}</p>
            <p className="text-xs text-zinc-600">{cardioMinutes} min total cardio</p>
          </div>
          <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-sky-800/70">Workout Sessions</p>
            <p className="mt-1 text-2xl font-semibold">{weeklyWorkouts.length}</p>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-sky-200/80 bg-sky-50/50 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-sky-800/70">Weight Trend (This Week)</p>
          {weightValues.length ? (
            <div className="flex flex-wrap items-end gap-4">
              <Sparkline values={weightValues} width={220} height={48} />
              <p className="text-sm text-zinc-600">
                Latest: <span className="font-semibold text-sky-900">{weightValues[weightValues.length - 1]}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">No body-weight entries for this week.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Progress Towards Goals" subtitle={`Weekly execution + annual goal status (${year}).`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-sky-800/70">Annual Goals</p>
            <p className="mt-1 text-2xl font-semibold text-sky-800">{goalProgress.percent}%</p>
            <p className="text-xs text-zinc-600">
              {goalProgress.done} of {goalProgress.total} completed
            </p>
          </div>
          <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-4">
            <p className="text-xs uppercase text-sky-800/70">Completed To-dos (Week)</p>
            <p className="text-2xl font-semibold">{weeklyTodoCompletions}</p>
          </div>
          <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-4">
            <p className="text-xs uppercase text-sky-800/70">Habit Adherence (Week)</p>
            <p className="text-2xl font-semibold">{weeklyHabitAdherence}%</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-sky-200/80 bg-sky-50/50 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-sky-800/70">Top Strength Lifts (Week)</p>
          {weeklyStrength.length ? (
            <div className="grid gap-2">
              {weeklyStrength.map((exercise) => (
                <div key={exercise.exerciseId} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-800">{exercise.exerciseName}</span>
                  <span className="text-zinc-600">1RM {exercise.bestOneRepMax}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600">No strength data in this week.</p>
          )}
        </div>
      </SectionCard>
    </AppShell>
  );
}
