"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import {
  GoalEditorSheet,
  type GoalEditorSurface,
} from "@/components/goals/goal-editor-sheet";
import { runBikeDistanceUnitAbbr, weightUnitAbbr, defaultMeasurementPreferences } from "@/lib/units";
import { computeGoalProgressPercent } from "@/lib/goal-progress";
import { yearInAppTimezone } from "@/lib/timezone";
import { useAppData } from "@/lib/storage";

export default function GoalsPage() {
  const { data, ready, setData } = useAppData();
  const goalYear = yearInAppTimezone();
  const [sectionName, setSectionName] = useState("");
  const [goalDraftsBySection, setGoalDraftsBySection] = useState<Record<string, string>>({});
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [editorSurface, setEditorSurface] = useState<GoalEditorSurface>("edit");

  const goalsForYear = useMemo(
    () => data.goals.filter((goal) => goal.year === goalYear),
    [data.goals, goalYear],
  );
  const allHabits = useMemo(() => data.habits.filter((habit) => habit.active), [data.habits]);
  const allExercises = useMemo(
    () => data.exercises.filter((exercise) => !exercise.archived),
    [data.exercises],
  );
  const measurementPrefs = useMemo(() => defaultMeasurementPreferences(), []);
  const weightAbbr = weightUnitAbbr(measurementPrefs.weightUnit);
  const distanceAbbr = runBikeDistanceUnitAbbr(measurementPrefs.runBikeDistanceUnit);

  function addSection() {
    if (!sectionName.trim()) return;
    const id = crypto.randomUUID();
    setData((prev) => ({
      ...prev,
      goalSections: [{ id, name: sectionName.trim() }, ...prev.goalSections],
    }));
    setSectionName("");
  }

  function addGoal(sectionId: string) {
    const title = goalDraftsBySection[sectionId]?.trim();
    if (!title) return;
    const id = crypto.randomUUID();
    setData((prev) => ({
      ...prev,
      goals: [
        {
          id,
          sectionId,
          title,
          year: goalYear,
          completed: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.goals,
      ],
    }));
    setGoalDraftsBySection((prev) => ({ ...prev, [sectionId]: "" }));
    setEditorSurface("wizard");
    setOpenGoalId(id);
  }

  function openGoalEditor(goalId: string) {
    setEditorSurface("edit");
    setOpenGoalId(goalId);
  }

  function closeGoalEditor() {
    setOpenGoalId(null);
  }

  function computeGoalProgress(goalId: string) {
    return computeGoalProgressPercent(data, goalId, goalYear);
  }

  const goalsBySection = data.goalSections.map((section) => {
    const goals = goalsForYear
      .filter((goal) => goal.sectionId === section.id)
      .sort((a, b) => Number(a.completed) - Number(b.completed));

    const sectionProgress = goals.length
      ? goals.reduce((sum, goal) => sum + computeGoalProgress(goal.id), 0) / goals.length
      : 0;

    return { section, goals, sectionProgress };
  });

  const overallProgress = goalsForYear.length
    ? goalsForYear.reduce((sum, goal) => sum + computeGoalProgress(goal.id), 0) / goalsForYear.length
    : 0;

  if (!ready) return <div className="p-6">Loading goals...</div>;

  return (
    <AppShell title="Goals" description="">
      <SectionCard title={`Progress: ${overallProgress.toFixed(1)}%`} inset={false}>
        <div className="ios-card-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-ios-tint transition-all"
            style={{ width: `${Math.min(100, Math.max(0, overallProgress))}%` }}
          />
        </div>
      </SectionCard>

      <SectionCard title="Annual Goals" inset={false}>
        <div className="grid gap-6">
          {goalsBySection.map(({ section, goals, sectionProgress }) => (
            <div key={section.id}>
              <h3 className="mb-2 text-base font-semibold text-charcoal">
                {section.name}: ({sectionProgress.toFixed(1)}%)
              </h3>
              <div className="grid gap-2">
                {goals.map((goal) => {
                  const progress = computeGoalProgress(goal.id);
                  return (
                    <div
                      key={goal.id}
                      className={`ios-card-muted px-3 py-2 ${
                        goal.completed === true ? "ring-1 ring-emerald/30" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-charcoal">
                          {goal.title}
                          {goal.completed === true ? (
                            <span className="ml-2 text-xs font-medium text-emerald">Done</span>
                          ) : null}
                        </p>
                        <button
                          type="button"
                          onClick={() => openGoalEditor(goal.id)}
                          className="glass-button glass-button-compact rounded-md px-2 py-1 text-xs text-ios-secondary"
                          aria-label="Edit goal"
                        >
                          ✎
                        </button>
                      </div>
                      <div className="mt-1 h-2 rounded bg-steel/10">
                        <div className="h-2 rounded bg-steel/100" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-slate">{progress.toFixed(1)}%</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  value={goalDraftsBySection[section.id] ?? ""}
                  onChange={(event) =>
                    setGoalDraftsBySection((prev) => ({ ...prev, [section.id]: event.target.value }))
                  }
                  placeholder="Goal"
                  className="w-full ios-field px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => addGoal(section.id)}
                  className="glass-button-tint glass-button-compact rounded-lg px-3 py-2 text-sm font-medium"
                >
                  + Add Goal
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="+ Add Section" inset={false}>
        <div className="ios-card flex gap-2 p-4">
          <input
            value={sectionName}
            onChange={(event) => setSectionName(event.target.value)}
            placeholder="Section"
            className="ios-field min-w-0 flex-1 px-3 py-2 text-sm"
          />
          <GlassButton type="button" variant="primary" className="glass-button-compact min-h-0 px-4" onClick={addSection}>
            +
          </GlassButton>
        </div>
      </SectionCard>

      <GoalEditorSheet
        open={Boolean(openGoalId)}
        goalId={openGoalId}
        surface={editorSurface}
        data={data}
        setData={setData}
        goalYear={goalYear}
        weightAbbr={weightAbbr}
        distanceAbbr={distanceAbbr}
        allHabits={allHabits}
        allExercises={allExercises}
        onClose={closeGoalEditor}
      />
    </AppShell>
  );
}
