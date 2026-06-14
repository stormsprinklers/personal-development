"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Sheet } from "@/components/ui/sheet";
import { CompleteExitRow, COMPLETE_EXIT_MS } from "@/components/complete-exit-row";
import { runBikeDistanceUnitAbbr, weightUnitAbbr, defaultMeasurementPreferences } from "@/lib/units";
import { computeGoalProgressPercent, latestBodyWeightInYear, manualGoalProgressPercent } from "@/lib/goal-progress";
import { todoItemsForGoal } from "@/lib/todo-helpers";
import { yearInAppTimezone } from "@/lib/timezone";
import { useAppData } from "@/lib/storage";

export default function GoalsPage() {
  const { data, ready, setData } = useAppData();
  const goalYear = yearInAppTimezone();
  const [sectionName, setSectionName] = useState("");
  const [goalDraftsBySection, setGoalDraftsBySection] = useState<Record<string, string>>({});
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [goalTitleDraft, setGoalTitleDraft] = useState("");
  const [goalTaskDraft, setGoalTaskDraft] = useState("");
  const [goalListNameDraft, setGoalListNameDraft] = useState("");
  const [linkedHabitDrafts, setLinkedHabitDrafts] = useState<string[]>([]);
  const [habitTargetDraft, setHabitTargetDraft] = useState<string>("30");
  const [linkedExerciseDraft, setLinkedExerciseDraft] = useState<string>("");
  const [exerciseStartDraft, setExerciseStartDraft] = useState<string>("");
  const [exerciseTargetDraft, setExerciseTargetDraft] = useState<string>("");
  const [bodyWeightStartDraft, setBodyWeightStartDraft] = useState<string>("");
  const [bodyWeightTargetDraft, setBodyWeightTargetDraft] = useState<string>("");
  const [manualProgressStartDraft, setManualProgressStartDraft] = useState<string>("");
  const [manualProgressCurrentDraft, setManualProgressCurrentDraft] = useState<string>("");
  const [manualProgressTargetDraft, setManualProgressTargetDraft] = useState<string>("");
  const [fadingGoalTaskIds, setFadingGoalTaskIds] = useState<string[]>([]);
  const exitingGoalTaskIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    if (openGoalId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow;
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openGoalId]);

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

  function openGoalEditor(goalId: string) {
    const goal = data.goals.find((g) => g.id === goalId);
    if (!goal) return;
    setOpenGoalId(goalId);
    setGoalTitleDraft(goal.title);
    const linked = data.todoLists.find((l) => l.goalId === goalId);
    setGoalListNameDraft(linked?.name ?? "");
    setLinkedHabitDrafts(goal.linkedHabitIds ?? []);
    setHabitTargetDraft(String(goal.habitTargetDays ?? 30));
    setLinkedExerciseDraft(goal.linkedExerciseId ?? "");
    setExerciseStartDraft(
      typeof goal.exerciseStartValue === "number" ? String(goal.exerciseStartValue) : "",
    );
    setExerciseTargetDraft(
      typeof goal.exerciseTargetValue === "number" ? String(goal.exerciseTargetValue) : "",
    );
    setBodyWeightStartDraft(
      typeof goal.bodyWeightStart === "number" ? String(goal.bodyWeightStart) : "",
    );
    setBodyWeightTargetDraft(
      typeof goal.bodyWeightTarget === "number" ? String(goal.bodyWeightTarget) : "",
    );
    setManualProgressStartDraft(
      typeof goal.manualProgressStart === "number" ? String(goal.manualProgressStart) : "",
    );
    setManualProgressCurrentDraft(
      typeof goal.manualProgressCurrent === "number" ? String(goal.manualProgressCurrent) : "",
    );
    setManualProgressTargetDraft(
      typeof goal.manualProgressTarget === "number" ? String(goal.manualProgressTarget) : "",
    );
    setGoalTaskDraft("");
  }

  function saveGoalTaskListName(goalId: string) {
    const name = goalListNameDraft.trim();
    if (!name) return;
    setData((prev) => ({
      ...prev,
      todoLists: prev.todoLists.map((l) => (l.goalId === goalId ? { ...l, name } : l)),
    }));
  }

  function createEmptyGoalTaskList(goalId: string) {
    setData((prev) => {
      if (prev.todoLists.some((l) => l.goalId === goalId)) return prev;
      const goal = prev.goals.find((g) => g.id === goalId);
      if (!goal) return prev;
      const listId = crypto.randomUUID();
      const name = goalListNameDraft.trim() || `${goal.title} tasks`;
      return {
        ...prev,
        todoLists: [
          {
            id: listId,
            name,
            area: "",
            goalId,
            isMain: false,
            createdAt: new Date().toISOString(),
          },
          ...prev.todoLists,
        ],
      };
    });
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
    setBodyWeightStartDraft("");
    setBodyWeightTargetDraft("");
    setManualProgressStartDraft("");
    setManualProgressCurrentDraft("");
    setManualProgressTargetDraft("");
    setGoalListNameDraft("");
    setFadingGoalTaskIds([]);
    exitingGoalTaskIdsRef.current.clear();
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
    const bwStart = Number(bodyWeightStartDraft);
    const bwTarget = Number(bodyWeightTargetDraft);
    const canSaveBodyWeightGoal =
      Number.isFinite(bwStart) &&
      Number.isFinite(bwTarget) &&
      bwTarget !== bwStart &&
      bwStart > 0 &&
      bwTarget > 0;
    const manualStartRaw = manualProgressStartDraft.trim();
    const manualStart = manualStartRaw ? Number(manualStartRaw) : 0;
    const manualCurrent = Number(manualProgressCurrentDraft);
    const manualTarget = Number(manualProgressTargetDraft);
    const hasManualNumbers =
      manualProgressCurrentDraft.trim() !== "" &&
      manualProgressTargetDraft.trim() !== "" &&
      Number.isFinite(manualCurrent) &&
      Number.isFinite(manualTarget) &&
      manualTarget !== manualStart &&
      (manualStartRaw === "" || Number.isFinite(manualStart));
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
              bodyWeightStart: canSaveBodyWeightGoal ? bwStart : undefined,
              bodyWeightTarget: canSaveBodyWeightGoal ? bwTarget : undefined,
              manualProgressCurrent: hasManualNumbers ? manualCurrent : undefined,
              manualProgressTarget: hasManualNumbers ? manualTarget : undefined,
              manualProgressStart: hasManualNumbers && manualStartRaw ? manualStart : undefined,
              completed: goal.completed === true,
            }
          : goal,
      ),
    }));
    closeGoalEditor();
  }

  function deleteGoal(goalId: string) {
    setData((prev) => {
      const removedListIds = prev.todoLists.filter((l) => l.goalId === goalId).map((l) => l.id);
      return {
      ...prev,
      goals: prev.goals.filter((goal) => goal.id !== goalId),
      goalNotes: prev.goalNotes.filter((note) => note.goalId !== goalId),
      todoLists: prev.todoLists.filter((l) => l.goalId !== goalId),
      todoSections: prev.todoSections.filter((s) => !removedListIds.includes(s.listId)),
      dashboardTodoListIds: prev.dashboardTodoListIds?.filter((id) => !removedListIds.includes(id)),
      todoItems: prev.todoItems.filter((item) => {
        const list = prev.todoLists.find((l) => l.id === item.listId);
        if (list?.goalId === goalId) return false;
        return item.goalId !== goalId;
      }),
      todoCompletions: prev.todoCompletions.filter((completion) => {
        const item = prev.todoItems.find((todo) => todo.id === completion.todoItemId);
        if (!item) return true;
        const list = prev.todoLists.find((l) => l.id === item.listId);
        if (list?.goalId === goalId) return false;
        return item.goalId !== goalId;
      }),
    };
    });
    if (openGoalId === goalId) closeGoalEditor();
  }

  function markGoalComplete(goalId: string) {
    if (!window.confirm("Do you really want to mark this goal as complete?")) return;
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((goal) => (goal.id === goalId ? { ...goal, completed: true } : goal)),
    }));
    closeGoalEditor();
  }

  function addGoalTask(goalId: string) {
    const title = goalTaskDraft.trim();
    if (!title) return;

    setData((prev) => {
      const goal = prev.goals.find((g) => g.id === goalId);
      if (!goal) return prev;
      let listId = prev.todoLists.find((l) => l.goalId === goalId)?.id;
      const nextLists = [...prev.todoLists];
      if (!listId) {
        listId = crypto.randomUUID();
        const listName = goalListNameDraft.trim() || `${goal.title} tasks`;
        nextLists.unshift({
          id: listId,
          name: listName,
          area: "",
          goalId,
          isMain: false,
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
    const listId = data.todoLists.find((l) => l.goalId === goalId)?.id;
    const task = data.todoItems.find((item) =>
      item.id === taskId && (listId ? item.listId === listId : item.goalId === goalId),
    );
    if (!task) return;

    if (!task.active) {
      setData((prev) => {
        const lid = prev.todoLists.find((l) => l.goalId === goalId)?.id;
        return {
          ...prev,
          todoItems: prev.todoItems.map((item) => {
            const matches = item.id === taskId && (lid ? item.listId === lid : item.goalId === goalId);
            return matches ? { ...item, active: true } : item;
          }),
        };
      });
      return;
    }

    if (exitingGoalTaskIdsRef.current.has(taskId)) return;
    exitingGoalTaskIdsRef.current.add(taskId);
    setFadingGoalTaskIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));
    window.setTimeout(() => {
      exitingGoalTaskIdsRef.current.delete(taskId);
      setFadingGoalTaskIds((prev) => prev.filter((id) => id !== taskId));
      setData((prev) => {
        const lid = prev.todoLists.find((l) => l.goalId === goalId)?.id;
        return {
          ...prev,
          todoItems: prev.todoItems.map((item) => {
            const matches = item.id === taskId && (lid ? item.listId === lid : item.goalId === goalId);
            return matches ? { ...item, active: false } : item;
          }),
        };
      });
    }, COMPLETE_EXIT_MS);
  }

  function toggleLinkedHabit(habitId: string) {
    setLinkedHabitDrafts((prev) =>
      prev.includes(habitId) ? prev.filter((id) => id !== habitId) : [...prev, habitId],
    );
  }

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

      <Sheet
        open={Boolean(openGoalId)}
        onClose={closeGoalEditor}
        title={data.goals.find((g) => g.id === openGoalId)?.title ?? "Goal"}
      >
        {openGoalId
          ? (() => {
              const goal = data.goals.find((g) => g.id === openGoalId);
              if (!goal) return null;
              const goalTasks = todoItemsForGoal(data, goal.id);
              const hasGoalList = data.todoLists.some((l) => l.goalId === goal.id);
              const progress = computeGoalProgress(goal.id);
              const linkedExercise = allExercises.find((exercise) => exercise.id === linkedExerciseDraft);
              const exerciseMetricLabel =
                linkedExercise?.category === "strength"
                  ? `Weight (${weightAbbr})`
                  : linkedExercise?.category === "swim"
                    ? "Laps"
                    : linkedExercise
                      ? `Distance (${distanceAbbr})`
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
                  return bestWeight > 0 ? `${bestWeight} ${weightAbbr}` : null;
                }
                if (linkedExercise.category === "run" || linkedExercise.category === "bike") {
                  const bestDistance = data.workoutSessions
                    .filter((session) => session.date.startsWith(yearPrefix))
                    .flatMap((session) => session.cardioEntries)
                    .filter((entry) => entry.type === linkedExercise.category)
                    .reduce((max, entry) => Math.max(max, entry.distance ?? 0), 0);
                  return bestDistance > 0 ? `${bestDistance} ${distanceAbbr}` : null;
                }
                const bestLaps = data.workoutSessions
                  .filter((session) => session.date.startsWith(yearPrefix))
                  .flatMap((session) => session.cardioEntries)
                  .filter((entry) => entry.type === "swim")
                  .reduce((max, entry) => Math.max(max, entry.laps ?? 0), 0);
                return bestLaps > 0 ? `${bestLaps} laps` : null;
              })();

              const latestBwThisYear = latestBodyWeightInYear(data, goalYear);

              const habitCompletionsRequired = (() => {
                const fromDraft = Number(habitTargetDraft);
                if (Number.isFinite(fromDraft) && fromDraft > 0) return fromDraft;
                if (goal.habitTargetDays && goal.habitTargetDays > 0) return goal.habitTargetDays;
                return null;
              })();

              return (
                <div className="grid min-w-0 gap-3 overflow-x-hidden">
                  <h3 className="text-base font-semibold text-charcoal">Goal Details</h3>
                  <input
                    value={goalTitleDraft}
                    onChange={(event) => setGoalTitleDraft(event.target.value)}
                    className="w-full ios-field px-3 py-2 text-sm"
                  />

                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate/95">Goal task list</p>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <input
                        value={goalListNameDraft}
                        onChange={(event) => setGoalListNameDraft(event.target.value)}
                        placeholder="List name"
                        className="min-w-0 flex-1 ios-field px-3 py-2 text-sm"
                      />
                      {hasGoalList ? (
                        <button
                          type="button"
                          onClick={() => saveGoalTaskListName(goal.id)}
                          className="glass-button glass-button-compact rounded-lg px-3 py-2 text-xs font-medium text-ios-secondary"
                        >
                          Save name
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => createEmptyGoalTaskList(goal.id)}
                          className="glass-button-tint glass-button-compact rounded-lg px-3 py-2 text-xs font-medium"
                        >
                          Create list
                        </button>
                      )}
                    </div>
                    <div className="grid gap-1">
                      {goalTasks.map((task) => (
                        <CompleteExitRow key={task.id} exiting={fadingGoalTaskIds.includes(task.id)}>
                          <label className="flex items-center gap-2 text-sm text-slate">
                            <input
                              type="checkbox"
                              checked={!task.active || fadingGoalTaskIds.includes(task.id)}
                              onChange={() => toggleGoalTask(goal.id, task.id)}
                            />
                            <span>{task.title}</span>
                          </label>
                        </CompleteExitRow>
                      ))}
                      {!goalTasks.length ? <p className="text-sm text-slate">No tasks yet.</p> : null}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={goalTaskDraft}
                        onChange={(event) => setGoalTaskDraft(event.target.value)}
                        placeholder="Add task"
                        className="w-full ios-field px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => addGoalTask(goal.id)}
                        className="glass-button-tint glass-button-compact rounded-lg px-3 py-2 text-sm font-medium"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate/95">
                      Habit association
                    </p>
                    <div className="grid gap-2">
                      <div className="ios-card-muted max-h-40 overflow-y-auto p-2">
                        <div className="grid gap-1">
                          {allHabits.map((habit) => (
                            <label key={habit.id} className="flex w-full items-center gap-2 text-sm text-slate">
                              <input
                                type="checkbox"
                                className="shrink-0"
                                checked={linkedHabitDrafts.includes(habit.id)}
                                onChange={() => toggleLinkedHabit(habit.id)}
                              />
                              <span className="min-w-0 flex-1">{habit.name}</span>
                              {linkedHabitDrafts.includes(habit.id) && habitCompletionsRequired != null ? (
                                <span className="shrink-0 text-xs font-medium tabular-nums text-slate/95">
                                  {habitCompletionsRequired} completions required
                                </span>
                              ) : null}
                            </label>
                          ))}
                          {!allHabits.length ? <p className="text-sm text-slate">No habits available.</p> : null}
                        </div>
                      </div>
                      <label className="grid gap-1 text-xs text-slate">
                        <span>Required successful days per linked habit (this year)</span>
                        <input
                          type="number"
                          min={1}
                          value={habitTargetDraft}
                          onChange={(event) => setHabitTargetDraft(event.target.value)}
                          className="ios-field w-28 px-3 py-2 text-sm text-ios-label"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate/95">
                      Exercise association
                    </p>
                    <div className="grid gap-2">
                      <select
                        value={linkedExerciseDraft}
                        onChange={(event) => setLinkedExerciseDraft(event.target.value)}
                        className="ios-field px-3 py-2 text-sm"
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
                          className="ios-field px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          value={exerciseTargetDraft}
                          onChange={(event) => setExerciseTargetDraft(event.target.value)}
                          placeholder={`Goal ${exerciseMetricLabel}`}
                          className="ios-field px-3 py-2 text-sm"
                        />
                      </div>
                      {linkedExercise ? (
                        <p className="text-xs text-slate">
                          This year&apos;s best: {currentExerciseBest ?? "No entries yet"}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate/95">Manual progress</p>
                    <p className="mb-2 text-xs text-slate">
                      Track any numeric goal without linking habits or workouts (e.g. books read, dollars saved).
                    </p>
                    <div className="grid min-w-0 grid-cols-3 gap-1.5">
                      <label className="grid min-w-0 gap-1 text-xs text-slate">
                        <span className="truncate" title="Start (optional)">
                          Start
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={manualProgressStartDraft}
                          onChange={(event) => setManualProgressStartDraft(event.target.value)}
                          placeholder="0"
                          aria-label="Start (optional)"
                          className="ios-field min-w-0 w-full px-1.5 py-2 text-center text-sm tabular-nums"
                        />
                      </label>
                      <label className="grid min-w-0 gap-1 text-xs text-slate">
                        <span className="truncate">Current</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={manualProgressCurrentDraft}
                          onChange={(event) => setManualProgressCurrentDraft(event.target.value)}
                          placeholder="Now"
                          className="ios-field min-w-0 w-full px-1.5 py-2 text-center text-sm tabular-nums"
                        />
                      </label>
                      <label className="grid min-w-0 gap-1 text-xs text-slate">
                        <span className="truncate">Goal</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={manualProgressTargetDraft}
                          onChange={(event) => setManualProgressTargetDraft(event.target.value)}
                          placeholder="Target"
                          className="ios-field min-w-0 w-full px-1.5 py-2 text-center text-sm tabular-nums"
                        />
                      </label>
                    </div>
                    {(() => {
                      const preview = manualGoalProgressPercent(
                        Number(manualProgressCurrentDraft),
                        Number(manualProgressTargetDraft),
                        manualProgressStartDraft.trim() ? Number(manualProgressStartDraft) : 0,
                      );
                      if (
                        manualProgressCurrentDraft.trim() === "" ||
                        manualProgressTargetDraft.trim() === "" ||
                        preview === undefined
                      ) {
                        return null;
                      }
                      return (
                        <p className="mt-1 min-w-0 break-words text-xs text-slate">
                          Manual tracker: {manualProgressCurrentDraft || "—"} / {manualProgressTargetDraft} (
                          {preview.toFixed(0)}%)
                        </p>
                      );
                    })()}
                  </div>

                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate/95">Body weight goal</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        value={bodyWeightStartDraft}
                        onChange={(event) => setBodyWeightStartDraft(event.target.value)}
                        placeholder={`Start (${weightAbbr})`}
                        className="ios-field px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        value={bodyWeightTargetDraft}
                        onChange={(event) => setBodyWeightTargetDraft(event.target.value)}
                        placeholder={`Goal (${weightAbbr})`}
                        className="ios-field px-3 py-2 text-sm"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate">
                      Progress uses your most recent body weight logged this year on Workouts. Latest:{" "}
                      {latestBwThisYear != null ? `${latestBwThisYear} ${weightAbbr}` : "—"}
                    </p>
                  </div>

                  <div>
                    <div className="h-2 rounded bg-steel/10">
                      <div className="h-2 rounded bg-steel/100" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate">{progress.toFixed(1)}%</p>
                  </div>

                  <div className="flex flex-wrap justify-between gap-2">
                    <GlassButton type="button" variant="destructive" onClick={() => deleteGoal(goal.id)}>
                      Delete Goal
                    </GlassButton>
                    <div className="flex gap-2">
                      <GlassButton type="button" variant="secondary" onClick={closeGoalEditor}>
                        Close
                      </GlassButton>
                      <GlassButton type="button" variant="primary" onClick={saveGoalEdits}>
                        Save
                      </GlassButton>
                    </div>
                  </div>

                  <GlassButton type="button" variant="primary" className="w-full" onClick={() => markGoalComplete(goal.id)}>
                    Mark Goal Complete
                  </GlassButton>
                </div>
              );
            })()
          : null}
      </Sheet>
    </AppShell>
  );
}
