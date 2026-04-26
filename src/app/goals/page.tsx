"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { useAppData } from "@/lib/storage";

const GOAL_TASKS_LIST_NAME = "Goal Tasks";

export default function GoalsPage() {
  const { data, ready, setData } = useAppData();
  const goalYear = new Date().getFullYear();
  const [sectionName, setSectionName] = useState("");
  const [goalDraftsBySection, setGoalDraftsBySection] = useState<Record<string, string>>({});
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [goalTitleDraft, setGoalTitleDraft] = useState("");
  const [goalTaskDraft, setGoalTaskDraft] = useState("");
  const [linkedHabitDrafts, setLinkedHabitDrafts] = useState<string[]>([]);
  const [habitTargetDraft, setHabitTargetDraft] = useState<string>("30");
  const [newLinkedHabitName, setNewLinkedHabitName] = useState<string>("");
  const [newLinkedHabitType, setNewLinkedHabitType] = useState<"build" | "break">("build");
  const [linkedExerciseDraft, setLinkedExerciseDraft] = useState<string>("");
  const [exerciseStartDraft, setExerciseStartDraft] = useState<string>("");
  const [exerciseTargetDraft, setExerciseTargetDraft] = useState<string>("");

  const goalsForYear = useMemo(
    () => data.goals.filter((goal) => goal.year === goalYear),
    [data.goals, goalYear],
  );
  const allHabits = useMemo(() => data.habits.filter((habit) => habit.active), [data.habits]);
  const allExercises = useMemo(
    () => data.exercises.filter((exercise) => !exercise.archived),
    [data.exercises],
  );

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
    setData((prev) => ({
      ...prev,
      goals: [
        {
          id: crypto.randomUUID(),
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
  }

  function computeGoalProgress(goalId: string) {
    const goal = data.goals.find((item) => item.id === goalId);
    if (!goal) return 0;

    const tasks = data.todoItems.filter((item) => item.goalId === goalId);
    const doneTasks = tasks.filter((item) => !item.active).length;
    const taskProgress = tasks.length ? (doneTasks / tasks.length) * 100 : 0;

    const hasHabitTarget = Boolean(goal.habitTargetDays && goal.habitTargetDays > 0);
    const linkedHabitIds = goal.linkedHabitIds ?? [];
    const hasLinkedHabits = linkedHabitIds.length > 0;

    let habitProgress = 0;
    if (hasHabitTarget && hasLinkedHabits) {
      const perHabitProgress = linkedHabitIds.map((habitId) => {
        const completedDays = data.habitLogs.filter(
          (log) => log.habitId === habitId && log.completed && log.date.startsWith(`${goalYear}-`),
        ).length;
        return Math.min(100, (completedDays / (goal.habitTargetDays as number)) * 100);
      });
      habitProgress =
        perHabitProgress.reduce((sum, value) => sum + value, 0) / Math.max(1, perHabitProgress.length);
    }

    const progressParts = [taskProgress];
    if (hasHabitTarget && hasLinkedHabits) progressParts.push(habitProgress);
    const hasExerciseProgress =
      goal.linkedExerciseId &&
      typeof goal.exerciseStartValue === "number" &&
      typeof goal.exerciseTargetValue === "number";
    if (hasExerciseProgress) {
      const exercise = data.exercises.find((item) => item.id === goal.linkedExerciseId);
      if (exercise) {
        const yearPrefix = `${goalYear}-`;
        let achieved = goal.exerciseStartValue as number;

        if (exercise.category === "strength") {
          achieved = data.workoutSessions
            .filter((session) => session.date.startsWith(yearPrefix))
            .flatMap((session) => session.strengthSets)
            .filter((set) => set.exerciseId === exercise.id)
            .reduce((max, set) => Math.max(max, set.weight), achieved);
        } else if (exercise.category === "run" || exercise.category === "bike") {
          achieved = data.workoutSessions
            .filter((session) => session.date.startsWith(yearPrefix))
            .flatMap((session) => session.cardioEntries)
            .filter((entry) => entry.type === exercise.category)
            .reduce((max, entry) => Math.max(max, entry.distance ?? 0), achieved);
        } else if (exercise.category === "swim") {
          achieved = data.workoutSessions
            .filter((session) => session.date.startsWith(yearPrefix))
            .flatMap((session) => session.cardioEntries)
            .filter((entry) => entry.type === "swim")
            .reduce((max, entry) => Math.max(max, entry.laps ?? 0), achieved);
        }

        const start = goal.exerciseStartValue as number;
        const target = goal.exerciseTargetValue as number;
        const range = target - start;
        const exerciseProgress =
          range === 0
            ? achieved >= target
              ? 100
              : 0
            : Math.min(100, Math.max(0, ((achieved - start) / range) * 100));
        progressParts.push(exerciseProgress);
      }
    }
    return Math.min(100, progressParts.reduce((sum, value) => sum + value, 0) / progressParts.length);
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

  function openGoalEditor(goalId: string) {
    const goal = data.goals.find((g) => g.id === goalId);
    if (!goal) return;
    setOpenGoalId(goalId);
    setGoalTitleDraft(goal.title);
    setLinkedHabitDrafts(goal.linkedHabitIds ?? []);
    setHabitTargetDraft(String(goal.habitTargetDays ?? 30));
    setLinkedExerciseDraft(goal.linkedExerciseId ?? "");
    setExerciseStartDraft(
      typeof goal.exerciseStartValue === "number" ? String(goal.exerciseStartValue) : "",
    );
    setExerciseTargetDraft(
      typeof goal.exerciseTargetValue === "number" ? String(goal.exerciseTargetValue) : "",
    );
    setGoalTaskDraft("");
  }

  function closeGoalEditor() {
    setOpenGoalId(null);
    setGoalTitleDraft("");
    setGoalTaskDraft("");
    setLinkedHabitDrafts([]);
    setHabitTargetDraft("30");
    setLinkedExerciseDraft("");
    setExerciseStartDraft("");
    setExerciseTargetDraft("");
  }

  function saveGoalEdits() {
    if (!openGoalId || !goalTitleDraft.trim()) return;
    const target = Number(habitTargetDraft);
    const exerciseStart = Number(exerciseStartDraft);
    const exerciseTarget = Number(exerciseTargetDraft);
    const hasExerciseLink = Boolean(linkedExerciseDraft);
    const canSaveExerciseNumbers =
      hasExerciseLink &&
      Number.isFinite(exerciseStart) &&
      Number.isFinite(exerciseTarget) &&
      exerciseTarget > exerciseStart;
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((goal) =>
        goal.id === openGoalId
          ? {
              ...goal,
              title: goalTitleDraft.trim(),
              linkedHabitIds: linkedHabitDrafts.length ? linkedHabitDrafts : undefined,
              habitTargetDays:
                linkedHabitDrafts.length && Number.isFinite(target) && target > 0 ? target : undefined,
              linkedExerciseId: hasExerciseLink ? linkedExerciseDraft : undefined,
              exerciseStartValue: canSaveExerciseNumbers ? exerciseStart : undefined,
              exerciseTargetValue: canSaveExerciseNumbers ? exerciseTarget : undefined,
            }
          : goal,
      ),
    }));
  }

  function deleteGoal(goalId: string) {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.filter((goal) => goal.id !== goalId),
      goalNotes: prev.goalNotes.filter((note) => note.goalId !== goalId),
      todoItems: prev.todoItems.filter((item) => item.goalId !== goalId),
      todoCompletions: prev.todoCompletions.filter((completion) => {
        const item = prev.todoItems.find((todo) => todo.id === completion.todoItemId);
        return item?.goalId !== goalId;
      }),
    }));
    if (openGoalId === goalId) closeGoalEditor();
  }

  function markGoalComplete(goalId: string) {
    if (!window.confirm("Do you really want to mark this goal as complete?")) return;
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((goal) => (goal.id === goalId ? { ...goal, completed: true } : goal)),
    }));
  }

  function addGoalTask(goalId: string) {
    const title = goalTaskDraft.trim();
    if (!title) return;

    setData((prev) => {
      let listId = prev.todoLists.find((list) => list.name === GOAL_TASKS_LIST_NAME)?.id;
      const nextLists = [...prev.todoLists];
      if (!listId) {
        listId = crypto.randomUUID();
        nextLists.unshift({
          id: listId,
          name: GOAL_TASKS_LIST_NAME,
          area: "",
          createdAt: new Date().toISOString(),
        });
      }

      return {
        ...prev,
        todoLists: nextLists,
        todoItems: [
          {
            id: crypto.randomUUID(),
            listId,
            goalId,
            title,
            active: true,
            createdAt: new Date().toISOString(),
          },
          ...prev.todoItems,
        ],
      };
    });
    setGoalTaskDraft("");
  }

  function toggleGoalTask(goalId: string, taskId: string) {
    setData((prev) => ({
      ...prev,
      todoItems: prev.todoItems.map((item) =>
        item.id === taskId && item.goalId === goalId ? { ...item, active: !item.active } : item,
      ),
    }));
  }

  function toggleLinkedHabit(habitId: string) {
    setLinkedHabitDrafts((prev) =>
      prev.includes(habitId) ? prev.filter((id) => id !== habitId) : [...prev, habitId],
    );
  }

  function addLinkedHabit() {
    const name = newLinkedHabitName.trim();
    if (!name) return;
    const newHabitId = crypto.randomUUID();
    setData((prev) => ({
      ...prev,
      habits: [
        {
          id: newHabitId,
          name,
          type: newLinkedHabitType,
          active: true,
          createdAt: new Date().toISOString(),
        },
        ...prev.habits,
      ],
    }));
    setLinkedHabitDrafts((prev) => (prev.includes(newHabitId) ? prev : [...prev, newHabitId]));
    setNewLinkedHabitName("");
  }

  if (!ready) return <div className="p-6">Loading goals...</div>;

  return (
    <AppShell title="Goals" description="">
      <SectionCard title={`Progress: ${overallProgress.toFixed(1)}%`}>
        <div />
      </SectionCard>

      <SectionCard title="Annual Goals">
        <div className="grid gap-6">
          {goalsBySection.map(({ section, goals, sectionProgress }) => (
            <div key={section.id}>
              <h3 className="mb-2 text-base font-semibold text-zinc-900">
                {section.name}: ({sectionProgress.toFixed(1)}%)
              </h3>
              <div className="grid gap-2">
                {goals.map((goal) => {
                  const progress = computeGoalProgress(goal.id);
                  return (
                    <div key={goal.id} className="rounded-lg border border-sky-200/80 bg-sky-50/30 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-zinc-900">{goal.title}</p>
                        <button
                          onClick={() => openGoalEditor(goal.id)}
                          className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-sky-50"
                          aria-label="Edit goal"
                        >
                          ✎
                        </button>
                      </div>
                      <div className="mt-1 h-2 rounded bg-sky-100">
                        <div className="h-2 rounded bg-sky-500" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-zinc-600">{progress.toFixed(1)}%</p>
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
                  className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                />
                <button
                  onClick={() => addGoal(section.id)}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
                >
                  + Add Goal
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="+ Add Section">
        <div className="flex gap-2">
          <input
            value={sectionName}
            onChange={(event) => setSectionName(event.target.value)}
            placeholder="Section"
            className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <button
            onClick={addSection}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            +
          </button>
        </div>
      </SectionCard>

      {openGoalId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-sky-200 bg-white p-4 shadow-xl">
            {(() => {
              const goal = data.goals.find((g) => g.id === openGoalId);
              if (!goal) return null;
              const goalTasks = data.todoItems.filter((item) => item.goalId === goal.id);
              const progress = computeGoalProgress(goal.id);
              const linkedExercise = allExercises.find((exercise) => exercise.id === linkedExerciseDraft);
              const exerciseMetricLabel =
                linkedExercise?.category === "strength"
                  ? "Weight"
                  : linkedExercise?.category === "swim"
                    ? "Laps"
                    : linkedExercise
                      ? "Distance"
                      : "Metric";

              const currentExerciseBest = (() => {
                if (!linkedExercise) return null;
                const yearPrefix = `${goalYear}-`;
                if (linkedExercise.category === "strength") {
                  const bestWeight = data.workoutSessions
                    .filter((session) => session.date.startsWith(yearPrefix))
                    .flatMap((session) => session.strengthSets)
                    .filter((set) => set.exerciseId === linkedExercise.id)
                    .reduce((max, set) => Math.max(max, set.weight), 0);
                  return bestWeight > 0 ? `${bestWeight}` : null;
                }
                if (linkedExercise.category === "run" || linkedExercise.category === "bike") {
                  const bestDistance = data.workoutSessions
                    .filter((session) => session.date.startsWith(yearPrefix))
                    .flatMap((session) => session.cardioEntries)
                    .filter((entry) => entry.type === linkedExercise.category)
                    .reduce((max, entry) => Math.max(max, entry.distance ?? 0), 0);
                  return bestDistance > 0 ? `${bestDistance}` : null;
                }
                const bestLaps = data.workoutSessions
                  .filter((session) => session.date.startsWith(yearPrefix))
                  .flatMap((session) => session.cardioEntries)
                  .filter((entry) => entry.type === "swim")
                  .reduce((max, entry) => Math.max(max, entry.laps ?? 0), 0);
                return bestLaps > 0 ? `${bestLaps}` : null;
              })();

              return (
                <div className="grid gap-3">
                  <h3 className="text-base font-semibold text-zinc-900">Goal Details</h3>
                  <input
                    value={goalTitleDraft}
                    onChange={(event) => setGoalTitleDraft(event.target.value)}
                    className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                  />

                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-sky-800/70">
                      Goal tasks
                    </p>
                    <div className="grid gap-1">
                      {goalTasks.map((task) => (
                        <label key={task.id} className="flex items-center gap-2 text-sm text-zinc-700">
                          <input
                            type="checkbox"
                            checked={!task.active}
                            onChange={() => toggleGoalTask(goal.id, task.id)}
                          />
                          <span>{task.title}</span>
                        </label>
                      ))}
                      {!goalTasks.length ? <p className="text-sm text-zinc-600">No tasks yet.</p> : null}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={goalTaskDraft}
                        onChange={(event) => setGoalTaskDraft(event.target.value)}
                        placeholder="Add task"
                        className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                      />
                      <button
                        onClick={() => addGoalTask(goal.id)}
                        className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-sky-800/70">
                      Habit association
                    </p>
                    <div className="grid gap-2">
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-sky-200 bg-white p-2">
                        <div className="grid gap-1">
                          {allHabits.map((habit) => (
                            <label key={habit.id} className="flex items-center gap-2 text-sm text-zinc-700">
                              <input
                                type="checkbox"
                                checked={linkedHabitDrafts.includes(habit.id)}
                                onChange={() => toggleLinkedHabit(habit.id)}
                              />
                              <span>{habit.name}</span>
                            </label>
                          ))}
                          {!allHabits.length ? <p className="text-sm text-zinc-600">No habits available.</p> : null}
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                        <input
                          value={newLinkedHabitName}
                          onChange={(event) => setNewLinkedHabitName(event.target.value)}
                          placeholder="New habit"
                          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                        />
                        <select
                          value={newLinkedHabitType}
                          onChange={(event) => setNewLinkedHabitType(event.target.value as "build" | "break")}
                          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                        >
                          <option value="build">Build</option>
                          <option value="break">Break</option>
                        </select>
                        <button
                          onClick={addLinkedHabit}
                          className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
                        >
                          + Add Habit
                        </button>
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={habitTargetDraft}
                        onChange={(event) => setHabitTargetDraft(event.target.value)}
                        className="w-24 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                        placeholder="Days"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-sky-800/70">
                      Exercise association
                    </p>
                    <div className="grid gap-2">
                      <select
                        value={linkedExerciseDraft}
                        onChange={(event) => setLinkedExerciseDraft(event.target.value)}
                        className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                      >
                        <option value="">No linked exercise</option>
                        {allExercises.map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.name}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={exerciseStartDraft}
                          onChange={(event) => setExerciseStartDraft(event.target.value)}
                          placeholder={`Start ${exerciseMetricLabel}`}
                          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                        />
                        <input
                          type="number"
                          value={exerciseTargetDraft}
                          onChange={(event) => setExerciseTargetDraft(event.target.value)}
                          placeholder={`Goal ${exerciseMetricLabel}`}
                          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                        />
                      </div>
                      {linkedExercise ? (
                        <p className="text-xs text-zinc-600">
                          This year&apos;s best {exerciseMetricLabel.toLowerCase()}: {currentExerciseBest ?? "No entries yet"}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="h-2 rounded bg-sky-100">
                      <div className="h-2 rounded bg-sky-500" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-600">{progress.toFixed(1)}%</p>
                  </div>

                  <div className="flex flex-wrap justify-between gap-2">
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      Delete Goal
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={closeGoalEditor}
                        className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-sky-50"
                      >
                        Close
                      </button>
                      <button
                        onClick={saveGoalEdits}
                        className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => markGoalComplete(goal.id)}
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700"
                  >
                    Mark Goal Complete
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
