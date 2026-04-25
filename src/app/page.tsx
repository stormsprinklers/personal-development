"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { MiniBars } from "@/components/charts/mini-bars";
import { Sparkline } from "@/components/charts/sparkline";
import { buildAiContext } from "@/lib/ai/contextBuilder";
import { dailySummaryPrompt } from "@/lib/ai/prompts";
import {
  bodyWeightTrend,
  cardioMinutesLastDays,
  goalsProgressForYear,
  habitAdherenceByDay,
  todoCompletionsByDay,
} from "@/lib/metrics/dashboardMetrics";
import { strengthBest1rmDailySeries, strengthSummaryByExercise } from "@/lib/metrics/workoutMetrics";
import { todayKey, useAppData } from "@/lib/storage";

const CHART_DAYS = 14;

export default function Home() {
  const { data, setData } = useAppData();
  const today = todayKey();
  const year = new Date().getFullYear();

  const totals = useMemo(
    () => ({
      workouts: data.workoutSessions.length,
      habitsLogged: data.habitLogs.length,
      completedTodos: data.todoCompletions.length,
      goalsDone: data.goals.filter((goal) => goal.completed && goal.year === year).length,
    }),
    [data.goals, data.habitLogs, data.todoCompletions, data.workoutSessions, year],
  );

  const strengthTop = useMemo(
    () => strengthSummaryByExercise(data.workoutSessions, data.exercises).slice(0, 3),
    [data.exercises, data.workoutSessions],
  );

  const topExerciseSeries = useMemo(() => {
    const first = strengthTop[0];
    if (!first) return [];
    return strengthBest1rmDailySeries(data.workoutSessions, first.exerciseId, CHART_DAYS).map((p) => p.best1rm);
  }, [data.workoutSessions, strengthTop]);

  const todoBars = useMemo(() => todoCompletionsByDay(data, CHART_DAYS), [data]);
  const habitBars = useMemo(() => habitAdherenceByDay(data, CHART_DAYS), [data]);
  const weightSeries = useMemo(() => bodyWeightTrend(data), [data]);
  const weightValues = useMemo(() => weightSeries.map((w) => w.weight), [weightSeries]);
  const cardioTotals = useMemo(() => cardioMinutesLastDays(data, CHART_DAYS), [data]);
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

  const dayLabels = todoBars.map((b) => b.date.slice(5));

  return (
    <AppShell
      title="Dashboard"
      description="Track trends across workouts, habits, tasks, goals, and journals."
    >
      <SectionCard
        title="Daily AI Summary"
        subtitle="One paragraph recap based on your full tracked context."
      >
        <div className="grid gap-3">
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            {latestSummary?.output ??
              "No summary yet for today. Generate one to see accomplishments and improvement advice."}
          </p>
          <div>
            <button
              onClick={generateDailySummary}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Generate Today&apos;s Summary
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Totals" subtitle="Snapshot of your progress data across modules.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Workouts Logged</p>
            <p className="mt-1 text-2xl font-semibold">{totals.workouts}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Habit Check-ins</p>
            <p className="mt-1 text-2xl font-semibold">{totals.habitsLogged}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">To-dos Completed</p>
            <p className="mt-1 text-2xl font-semibold">{totals.completedTodos}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Goals Done ({year})</p>
            <p className="mt-1 text-2xl font-semibold">{totals.goalsDone}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="To-do completions" subtitle={`Tasks checked off per day (last ${CHART_DAYS} days).`}>
        <MiniBars values={todoBars.map((b) => b.count)} labels={dayLabels} />
      </SectionCard>

      <SectionCard title="Habit adherence" subtitle="Share of active habits completed each day.">
        <MiniBars values={habitBars.map((b) => b.percent)} labels={dayLabels} barClassName="bg-emerald-700" />
      </SectionCard>

      <SectionCard title="Body weight" subtitle="From workout-day body weight entries.">
        {weightValues.length ? (
          <div className="flex flex-wrap items-end gap-4">
            <Sparkline values={weightValues} width={220} height={48} />
            <p className="text-sm text-zinc-600">
              Latest: <span className="font-semibold text-zinc-900">{weightValues[weightValues.length - 1]}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Log body weight on the Workouts page to see a trend.</p>
        )}
      </SectionCard>

      <SectionCard title="Cardio volume" subtitle={`Run / bike / swim minutes logged in the last ${CHART_DAYS} days.`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase text-zinc-500">Run</p>
            <p className="text-2xl font-semibold">{cardioTotals.run} min</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase text-zinc-500">Bike</p>
            <p className="text-2xl font-semibold">{cardioTotals.bike} min</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase text-zinc-500">Swim</p>
            <p className="text-2xl font-semibold">{cardioTotals.swim} min</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={`Goals (${year})`} subtitle="Completion rate for goals tagged to this year.">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-3xl font-semibold">{goalProgress.percent}%</p>
          <p className="text-sm text-zinc-600">
            {goalProgress.done} of {goalProgress.total} goals completed
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Profile" subtitle="Name shown in the welcome line across the app.">
        <div className="flex max-w-md flex-wrap items-center gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-600">
            Display name
            <input
              value={data.userProfile.name}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  userProfile: { ...prev.userProfile, name: e.target.value },
                }))
              }
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Strength highlights" subtitle="Best estimated 1RM, tonnage, and reps by lift.">
        <div className="grid gap-4 md:grid-cols-2">
          {strengthTop.length ? (
            strengthTop.map((exercise) => (
              <div key={exercise.exerciseId} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="font-semibold">{exercise.exerciseName}</p>
                <p className="mt-1 text-sm text-zinc-600">Best 1RM: {exercise.bestOneRepMax}</p>
                <p className="text-sm text-zinc-600">Total reps: {exercise.totalReps}</p>
                <p className="text-sm text-zinc-600">Total tonnage: {exercise.totalTonnage}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-600">Log strength sets to populate trend cards.</p>
          )}
        </div>
        {strengthTop[0] ? (
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
              {strengthTop[0].exerciseName} — estimated 1RM trend
            </p>
            {topExerciseSeries.length ? (
              <Sparkline values={topExerciseSeries} width={260} height={44} />
            ) : (
              <p className="text-sm text-zinc-600">Add more logged days to see a line.</p>
            )}
          </div>
        ) : null}
      </SectionCard>
    </AppShell>
  );
}
