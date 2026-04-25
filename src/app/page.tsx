"use client";

import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { buildAiContext } from "@/lib/ai/contextBuilder";
import { dailySummaryPrompt } from "@/lib/ai/prompts";
import { strengthSummaryByExercise } from "@/lib/metrics/workoutMetrics";
import { todayKey, useAppData } from "@/lib/storage";

export default function Home() {
  const { data, ready, setData } = useAppData();

  const totals = {
    workouts: data.workoutSessions.length,
    habitsLogged: data.habitLogs.length,
    completedTodos: data.todoCompletions.length,
    goalsDone: data.goals.filter((goal) => goal.completed).length,
  };

  const strengthTrend = strengthSummaryByExercise(data.workoutSessions, data.exercises).slice(0, 4);
  const today = todayKey();
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
    if (!payload.output) return;

    setData((prev) => ({
      ...prev,
      aiInsights: [
        {
          id: crypto.randomUUID(),
          type: "daily_summary",
          date: today,
          prompt,
          output: payload.output ?? payload.error ?? "",
        },
        ...prev.aiInsights.filter((insight) => !(insight.type === "daily_summary" && insight.date === today)),
      ],
    }));
  }

  if (!ready) {
    return <div className="p-6">Loading dashboard...</div>;
  }

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
        <div className="grid gap-3 md:grid-cols-3">
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
            <p className="text-xs uppercase tracking-wide text-zinc-500">Goals Completed</p>
            <p className="mt-1 text-2xl font-semibold">{totals.goalsDone}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Strength Trends" subtitle="Estimated 1RM and tonnage progression by exercise.">
        <div className="grid gap-3 md:grid-cols-2">
          {strengthTrend.length ? (
            strengthTrend.map((exercise) => (
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
      </SectionCard>
    </AppShell>
  );
}
