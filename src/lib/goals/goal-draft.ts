import type { AppData, Goal, GoalTrackingMode } from "@/lib/models";
import { applyTrackingModesToGoal } from "@/lib/goals/tracking-modes";
import { computeGoalProgressPercent } from "@/lib/goal-progress";

export type GoalEditorDraft = {
  title: string;
  trackingModes: GoalTrackingMode[];
  goalListName: string;
  linkedHabitIds: string[];
  habitTargetDays: string;
  linkedExerciseId: string;
  exerciseStart: string;
  exerciseTarget: string;
  bodyWeightStart: string;
  bodyWeightTarget: string;
  manualProgressStart: string;
  manualProgressCurrent: string;
  manualProgressTarget: string;
};

export function createEmptyGoalDraft(title = ""): GoalEditorDraft {
  return {
    title,
    trackingModes: [],
    goalListName: "",
    linkedHabitIds: [],
    habitTargetDays: "30",
    linkedExerciseId: "",
    exerciseStart: "",
    exerciseTarget: "",
    bodyWeightStart: "",
    bodyWeightTarget: "",
    manualProgressStart: "",
    manualProgressCurrent: "",
    manualProgressTarget: "",
  };
}

export function goalToEditorDraft(
  goal: Goal,
  data: AppData,
  trackingModes: GoalTrackingMode[],
): GoalEditorDraft {
  const linked = data.todoLists.find((list) => list.goalId === goal.id);
  return {
    title: goal.title,
    trackingModes: [...trackingModes],
    goalListName: linked?.name ?? "",
    linkedHabitIds: goal.linkedHabitIds ?? [],
    habitTargetDays: String(goal.habitTargetDays ?? 30),
    linkedExerciseId: goal.linkedExerciseId ?? "",
    exerciseStart: typeof goal.exerciseStartValue === "number" ? String(goal.exerciseStartValue) : "",
    exerciseTarget: typeof goal.exerciseTargetValue === "number" ? String(goal.exerciseTargetValue) : "",
    bodyWeightStart: typeof goal.bodyWeightStart === "number" ? String(goal.bodyWeightStart) : "",
    bodyWeightTarget: typeof goal.bodyWeightTarget === "number" ? String(goal.bodyWeightTarget) : "",
    manualProgressStart:
      typeof goal.manualProgressStart === "number" ? String(goal.manualProgressStart) : "",
    manualProgressCurrent:
      typeof goal.manualProgressCurrent === "number" ? String(goal.manualProgressCurrent) : "",
    manualProgressTarget:
      typeof goal.manualProgressTarget === "number" ? String(goal.manualProgressTarget) : "",
  };
}

export function draftToGoalPatch(goal: Goal, draft: GoalEditorDraft): Goal {
  const habitTarget = Number(draft.habitTargetDays);
  const exerciseStart = Number(draft.exerciseStart);
  const exerciseTarget = Number(draft.exerciseTarget);
  const hasExercise = draft.trackingModes.includes("exercise") && Boolean(draft.linkedExerciseId);
  const canSaveExercise =
    hasExercise &&
    Number.isFinite(exerciseStart) &&
    Number.isFinite(exerciseTarget) &&
    exerciseTarget > exerciseStart;

  const bwStart = Number(draft.bodyWeightStart);
  const bwTarget = Number(draft.bodyWeightTarget);
  const canSaveBodyWeight =
    draft.trackingModes.includes("body_weight") &&
    Number.isFinite(bwStart) &&
    Number.isFinite(bwTarget) &&
    bwTarget !== bwStart &&
    bwStart > 0 &&
    bwTarget > 0;

  const manualStartRaw = draft.manualProgressStart.trim();
  const manualStart = manualStartRaw ? Number(manualStartRaw) : 0;
  const manualCurrent = Number(draft.manualProgressCurrent);
  const manualTarget = Number(draft.manualProgressTarget);
  const canSaveManual =
    draft.trackingModes.includes("manual") &&
    draft.manualProgressCurrent.trim() !== "" &&
    draft.manualProgressTarget.trim() !== "" &&
    Number.isFinite(manualCurrent) &&
    Number.isFinite(manualTarget) &&
    manualTarget !== manualStart &&
    (manualStartRaw === "" || Number.isFinite(manualStart));

  let patched: Goal = {
    ...goal,
    title: draft.title.trim(),
    linkedHabitIds:
      draft.trackingModes.includes("habits") && draft.linkedHabitIds.length
        ? draft.linkedHabitIds
        : undefined,
    habitTargetDays:
      draft.trackingModes.includes("habits") &&
      draft.linkedHabitIds.length &&
      Number.isFinite(habitTarget) &&
      habitTarget > 0
        ? habitTarget
        : undefined,
    linkedExerciseId: hasExercise ? draft.linkedExerciseId : undefined,
    exerciseStartValue: canSaveExercise ? exerciseStart : undefined,
    exerciseTargetValue: canSaveExercise ? exerciseTarget : undefined,
    bodyWeightStart: canSaveBodyWeight ? bwStart : undefined,
    bodyWeightTarget: canSaveBodyWeight ? bwTarget : undefined,
    manualProgressCurrent: canSaveManual ? manualCurrent : undefined,
    manualProgressTarget: canSaveManual ? manualTarget : undefined,
    manualProgressStart: canSaveManual && manualStartRaw ? manualStart : undefined,
    completed: goal.completed === true,
  };

  patched = applyTrackingModesToGoal(patched, draft.trackingModes);
  return patched;
}

export function draftProgressPreview(data: AppData, goal: Goal, draft: GoalEditorDraft, year: number) {
  const patched = draftToGoalPatch(goal, draft);
  const merged = {
    ...data,
    goals: data.goals.map((row) => (row.id === goal.id ? patched : row)),
  };
  return computeGoalProgressPercent(merged, goal.id, year);
}
