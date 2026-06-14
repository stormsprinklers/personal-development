"use client";

import { CompleteExitRow } from "@/components/complete-exit-row";
import type { GoalEditorDraft } from "@/lib/goals/goal-draft";
import {
  GOAL_TRACKING_MODE_DESCRIPTIONS,
  GOAL_TRACKING_MODE_LABELS,
  GOAL_TRACKING_MODES,
} from "@/lib/goals/tracking-modes";
import { latestBodyWeightInYear, manualGoalProgressPercent } from "@/lib/goal-progress";
import type { AppData, GoalTrackingMode } from "@/lib/models";
import { todoItemsForGoal } from "@/lib/todo-helpers";

type TrackingFieldsProps = {
  modes: GoalTrackingMode[];
  draft: GoalEditorDraft;
  onDraftChange: (patch: Partial<GoalEditorDraft>) => void;
  data: AppData;
  goalId: string;
  goalYear: number;
  weightAbbr: string;
  distanceAbbr: string;
  allHabits: AppData["habits"];
  allExercises: AppData["exercises"];
  goalTaskDraft: string;
  onGoalTaskDraftChange: (value: string) => void;
  fadingGoalTaskIds: string[];
  onToggleGoalTask: (taskId: string) => void;
  onAddGoalTask: () => void;
  onSaveGoalListName: () => void;
  onCreateGoalTaskList: () => void;
};

export function GoalTrackingModePicker({
  selected,
  onChange,
  exclude = [],
}: {
  selected: GoalTrackingMode[];
  onChange: (modes: GoalTrackingMode[]) => void;
  exclude?: GoalTrackingMode[];
}) {
  const options = GOAL_TRACKING_MODES.filter((mode) => !exclude.includes(mode));

  function toggle(mode: GoalTrackingMode) {
    onChange(
      selected.includes(mode) ? selected.filter((item) => item !== mode) : [...selected, mode],
    );
  }

  return (
    <div className="grid gap-2">
      {options.map((mode) => {
        const checked = selected.includes(mode);
        return (
          <button
            key={mode}
            type="button"
            onClick={() => toggle(mode)}
            className={`ios-card-muted rounded-xl px-3 py-3 text-left transition ${
              checked ? "ring-2 ring-ios-tint" : ""
            }`}
          >
            <p className="text-sm font-semibold text-ios-label">{GOAL_TRACKING_MODE_LABELS[mode]}</p>
            <p className="mt-0.5 text-xs text-ios-secondary">{GOAL_TRACKING_MODE_DESCRIPTIONS[mode]}</p>
          </button>
        );
      })}
    </div>
  );
}

export function GoalTrackingFields({
  modes,
  draft,
  onDraftChange,
  data,
  goalId,
  goalYear,
  weightAbbr,
  distanceAbbr,
  allHabits,
  allExercises,
  goalTaskDraft,
  onGoalTaskDraftChange,
  fadingGoalTaskIds,
  onToggleGoalTask,
  onAddGoalTask,
  onSaveGoalListName,
  onCreateGoalTaskList,
}: TrackingFieldsProps) {
  const goalTasks = todoItemsForGoal(data, goalId);
  const hasGoalList = data.todoLists.some((list) => list.goalId === goalId);
  const linkedExercise = allExercises.find((exercise) => exercise.id === draft.linkedExerciseId);
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
  const habitTarget = Number(draft.habitTargetDays);
  const habitCompletionsRequired =
    Number.isFinite(habitTarget) && habitTarget > 0 ? habitTarget : null;

  function toggleHabit(habitId: string) {
    const next = draft.linkedHabitIds.includes(habitId)
      ? draft.linkedHabitIds.filter((id) => id !== habitId)
      : [...draft.linkedHabitIds, habitId];
    onDraftChange({ linkedHabitIds: next });
  }

  return (
    <div className="grid min-w-0 gap-4">
      {modes.includes("tasks") ? (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate/95">Goal task list</p>
          <div className="mb-2 flex flex-wrap gap-2">
            <input
              value={draft.goalListName}
              onChange={(event) => onDraftChange({ goalListName: event.target.value })}
              placeholder="List name"
              className="min-w-0 flex-1 ios-field px-3 py-2 text-sm"
            />
            {hasGoalList ? (
              <button
                type="button"
                onClick={onSaveGoalListName}
                className="glass-button glass-button-compact rounded-lg px-3 py-2 text-xs font-medium text-ios-secondary"
              >
                Save name
              </button>
            ) : (
              <button
                type="button"
                onClick={onCreateGoalTaskList}
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
                    onChange={() => onToggleGoalTask(task.id)}
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
              onChange={(event) => onGoalTaskDraftChange(event.target.value)}
              placeholder="Add task"
              className="w-full ios-field px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={onAddGoalTask}
              className="glass-button-tint glass-button-compact rounded-lg px-3 py-2 text-sm font-medium"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      {modes.includes("habits") ? (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate/95">Habit association</p>
          <div className="grid gap-2">
            <div className="ios-card-muted max-h-40 overflow-y-auto p-2">
              <div className="grid gap-1">
                {allHabits.map((habit) => (
                  <label key={habit.id} className="flex w-full items-center gap-2 text-sm text-slate">
                    <input
                      type="checkbox"
                      className="shrink-0"
                      checked={draft.linkedHabitIds.includes(habit.id)}
                      onChange={() => toggleHabit(habit.id)}
                    />
                    <span className="min-w-0 flex-1">{habit.name}</span>
                    {draft.linkedHabitIds.includes(habit.id) && habitCompletionsRequired != null ? (
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
                value={draft.habitTargetDays}
                onChange={(event) => onDraftChange({ habitTargetDays: event.target.value })}
                className="ios-field w-28 px-3 py-2 text-sm text-ios-label"
              />
            </label>
          </div>
        </div>
      ) : null}

      {modes.includes("exercise") ? (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate/95">Exercise association</p>
          <div className="grid gap-2">
            <select
              value={draft.linkedExerciseId}
              onChange={(event) => onDraftChange({ linkedExerciseId: event.target.value })}
              className="ios-field px-3 py-2 text-sm"
            >
              <option value="">Select exercise</option>
              {allExercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={draft.exerciseStart}
                onChange={(event) => onDraftChange({ exerciseStart: event.target.value })}
                placeholder={`Start ${exerciseMetricLabel}`}
                className="ios-field px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={draft.exerciseTarget}
                onChange={(event) => onDraftChange({ exerciseTarget: event.target.value })}
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
      ) : null}

      {modes.includes("manual") ? (
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate/95">Custom numbers</p>
          <p className="mb-2 text-xs text-slate">
            Financial or other numeric goals (e.g. dollars saved, books read).
          </p>
          <div className="grid min-w-0 grid-cols-3 gap-1.5">
            <label className="grid min-w-0 gap-1 text-xs text-slate">
              <span className="truncate">Start of year</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={draft.manualProgressStart}
                onChange={(event) => onDraftChange({ manualProgressStart: event.target.value })}
                placeholder="0"
                className="ios-field min-w-0 w-full px-1.5 py-2 text-center text-sm tabular-nums"
              />
            </label>
            <label className="grid min-w-0 gap-1 text-xs text-slate">
              <span className="truncate">Current</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={draft.manualProgressCurrent}
                onChange={(event) => onDraftChange({ manualProgressCurrent: event.target.value })}
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
                value={draft.manualProgressTarget}
                onChange={(event) => onDraftChange({ manualProgressTarget: event.target.value })}
                placeholder="Target"
                className="ios-field min-w-0 w-full px-1.5 py-2 text-center text-sm tabular-nums"
              />
            </label>
          </div>
          {(() => {
            const preview = manualGoalProgressPercent(
              Number(draft.manualProgressCurrent),
              Number(draft.manualProgressTarget),
              draft.manualProgressStart.trim() ? Number(draft.manualProgressStart) : 0,
            );
            if (
              draft.manualProgressCurrent.trim() === "" ||
              draft.manualProgressTarget.trim() === "" ||
              preview === undefined
            ) {
              return null;
            }
            return (
              <p className="mt-1 text-xs text-slate">
                Progress: {draft.manualProgressCurrent || "—"} / {draft.manualProgressTarget} ({preview.toFixed(0)}%)
              </p>
            );
          })()}
        </div>
      ) : null}

      {modes.includes("body_weight") ? (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate/95">Body weight goal</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.1"
              min={0}
              value={draft.bodyWeightStart}
              onChange={(event) => onDraftChange({ bodyWeightStart: event.target.value })}
              placeholder={`Start (${weightAbbr})`}
              className="ios-field px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.1"
              min={0}
              value={draft.bodyWeightTarget}
              onChange={(event) => onDraftChange({ bodyWeightTarget: event.target.value })}
              placeholder={`Goal (${weightAbbr})`}
              className="ios-field px-3 py-2 text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-slate">
            Progress uses your most recent body weight logged this year on Workouts. Latest:{" "}
            {latestBwThisYear != null ? `${latestBwThisYear} ${weightAbbr}` : "—"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
