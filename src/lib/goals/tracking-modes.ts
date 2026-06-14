import type { AppData, Goal, GoalTrackingMode } from "@/lib/models";
import { todoItemsForGoal } from "@/lib/todo-helpers";

export const GOAL_TRACKING_MODES: GoalTrackingMode[] = [
  "tasks",
  "habits",
  "exercise",
  "body_weight",
  "manual",
];

export const GOAL_TRACKING_MODE_LABELS: Record<GoalTrackingMode, string> = {
  tasks: "Tasks",
  habits: "Habits",
  exercise: "Exercise PR",
  body_weight: "Body weight",
  manual: "Custom numbers",
};

export const GOAL_TRACKING_MODE_DESCRIPTIONS: Record<GoalTrackingMode, string> = {
  tasks: "Milestone checklist tied to this goal",
  habits: "Track habit completions toward a yearly target",
  exercise: "Track a lift, run, bike, or swim PR from workouts",
  body_weight: "Track start and target weight from workout logs",
  manual: "Financial or other numeric goals (start, current, target)",
};

function isGoalTrackingMode(value: string): value is GoalTrackingMode {
  return (GOAL_TRACKING_MODES as string[]).includes(value);
}

export function inferGoalTrackingModesFromFields(goal: Goal, data: AppData): GoalTrackingMode[] {
  const modes: GoalTrackingMode[] = [];

  if (typeof goal.manualProgressTarget === "number") modes.push("manual");
  if (
    typeof goal.bodyWeightStart === "number" &&
    typeof goal.bodyWeightTarget === "number"
  ) {
    modes.push("body_weight");
  }
  if (goal.linkedExerciseId) modes.push("exercise");
  if (goal.linkedHabitIds?.length) modes.push("habits");
  if (data.todoLists.some((list) => list.goalId === goal.id) || todoItemsForGoal(data, goal.id).length) {
    modes.push("tasks");
  }

  return modes;
}

export function resolveGoalTrackingModes(goal: Goal, data: AppData): GoalTrackingMode[] {
  const explicit = (goal.trackingModes ?? []).filter(isGoalTrackingMode);
  if (explicit.length) return [...new Set(explicit)];
  return inferGoalTrackingModesFromFields(goal, data);
}

export function sanitizeGoalTrackingModes(
  modes: string[] | undefined,
  goal: Goal,
  data: AppData,
): GoalTrackingMode[] | undefined {
  const picked = (modes ?? []).filter(isGoalTrackingMode);
  if (picked.length) return [...new Set(picked)];
  const inferred = inferGoalTrackingModesFromFields(goal, data);
  return inferred.length ? inferred : undefined;
}

export function clearTrackingModeFields(goal: Goal, mode: GoalTrackingMode): Goal {
  switch (mode) {
    case "tasks":
      return goal;
    case "habits":
      return { ...goal, linkedHabitIds: undefined, habitTargetDays: undefined };
    case "exercise":
      return {
        ...goal,
        linkedExerciseId: undefined,
        exerciseStartValue: undefined,
        exerciseTargetValue: undefined,
      };
    case "body_weight":
      return { ...goal, bodyWeightStart: undefined, bodyWeightTarget: undefined };
    case "manual":
      return {
        ...goal,
        manualProgressStart: undefined,
        manualProgressCurrent: undefined,
        manualProgressTarget: undefined,
      };
    default:
      return goal;
  }
}

export function applyTrackingModesToGoal(goal: Goal, enabledModes: GoalTrackingMode[]): Goal {
  let next: Goal = { ...goal, trackingModes: enabledModes.length ? enabledModes : undefined };
  for (const mode of GOAL_TRACKING_MODES) {
    if (!enabledModes.includes(mode)) {
      next = clearTrackingModeFields(next, mode);
    }
  }
  return next;
}
