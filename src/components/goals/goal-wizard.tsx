"use client";

import { useMemo, useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import {
  GoalTrackingFields,
  GoalTrackingModePicker,
} from "@/components/goals/goal-tracking-fields";
import {
  createEmptyGoalDraft,
  draftProgressPreview,
  draftToGoalPatch,
  goalToEditorDraft,
  type GoalEditorDraft,
} from "@/lib/goals/goal-draft";
import {
  GOAL_TRACKING_MODE_LABELS,
  resolveGoalTrackingModes,
} from "@/lib/goals/tracking-modes";
import type { AppData, GoalTrackingMode } from "@/lib/models";

type WizardStep = "name" | "pick" | "configure" | "review";

type Props = {
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
  onComplete: () => void;
  onCancel: () => void;
};

export function GoalWizard({
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
  onComplete,
  onCancel,
}: Props) {
  const [step, setStep] = useState<WizardStep>("name");
  const goal = data.goals.find((row) => row.id === goalId);

  const progress = useMemo(() => {
    if (!goal) return 0;
    return draftProgressPreview(data, goal, draft, goalYear);
  }, [data, goal, draft, goalYear]);

  if (!goal) return null;

  const canNextFromName = draft.title.trim().length > 0;
  const canNextFromPick = draft.trackingModes.length > 0;

  function goBack() {
    if (step === "pick") setStep("name");
    else if (step === "configure") setStep("pick");
    else if (step === "review") setStep("configure");
    else onCancel();
  }

  function goNext() {
    if (step === "name" && canNextFromName) setStep("pick");
    else if (step === "pick" && canNextFromPick) setStep("configure");
    else if (step === "configure") setStep("review");
    else if (step === "review") onComplete();
  }

  return (
    <>
      <p className="ios-footnote text-ios-secondary">
        Step {step === "name" ? 1 : step === "pick" ? 2 : step === "configure" ? 3 : 4} of 4
      </p>

      {step === "name" ? (
        <div className="grid gap-2">
          <label className="grid gap-1 text-xs font-medium text-ios-secondary">
            Goal name
            <input
              value={draft.title}
              onChange={(event) => onDraftChange({ title: event.target.value })}
              className="ios-field px-3 py-2 text-sm"
              placeholder="What do you want to achieve?"
            />
          </label>
        </div>
      ) : null}

      {step === "pick" ? (
        <div className="grid gap-2">
          <p className="text-sm text-ios-secondary">Select everything you want to track for this goal.</p>
          <GoalTrackingModePicker
            selected={draft.trackingModes}
            onChange={(modes) => onDraftChange({ trackingModes: modes })}
          />
        </div>
      ) : null}

      {step === "configure" ? (
        <GoalTrackingFields
          modes={draft.trackingModes}
          draft={draft}
          onDraftChange={onDraftChange}
          data={data}
          goalId={goalId}
          goalYear={goalYear}
          weightAbbr={weightAbbr}
          distanceAbbr={distanceAbbr}
          allHabits={allHabits}
          allExercises={allExercises}
          goalTaskDraft={goalTaskDraft}
          onGoalTaskDraftChange={onGoalTaskDraftChange}
          fadingGoalTaskIds={fadingGoalTaskIds}
          onToggleGoalTask={onToggleGoalTask}
          onAddGoalTask={onAddGoalTask}
          onSaveGoalListName={onSaveGoalListName}
          onCreateGoalTaskList={onCreateGoalTaskList}
        />
      ) : null}

      {step === "review" ? (
        <div className="grid gap-3">
          <div>
            <p className="text-sm font-semibold text-ios-label">{draft.title.trim()}</p>
            <ul className="mt-2 list-inside list-disc text-sm text-ios-secondary">
              {draft.trackingModes.map((mode) => (
                <li key={mode}>{GOAL_TRACKING_MODE_LABELS[mode]}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="h-2 rounded bg-steel/10">
              <div className="h-2 rounded bg-steel/100" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate">{progress.toFixed(1)}% estimated progress</p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <GlassButton type="button" variant="secondary" onClick={goBack}>
          {step === "name" ? "Cancel" : "Back"}
        </GlassButton>
        <GlassButton
          type="button"
          variant="primary"
          onClick={goNext}
          disabled={
            (step === "name" && !canNextFromName) ||
            (step === "pick" && !canNextFromPick)
          }
        >
          {step === "review" ? "Finish setup" : "Next"}
        </GlassButton>
      </div>
    </>
  );
}

export function GoalAddMetricPicker({
  existingModes,
  onAdd,
  onCancel,
}: {
  existingModes: GoalTrackingMode[];
  onAdd: (modes: GoalTrackingMode[]) => void;
  onCancel: () => void;
}) {
  const [picked, setPicked] = useState<GoalTrackingMode[]>([]);

  return (
    <div className="grid gap-3">
      <p className="text-sm text-ios-secondary">Choose additional metrics to track.</p>
      <GoalTrackingModePicker selected={picked} onChange={setPicked} exclude={existingModes} />
      <div className="flex gap-2">
        <GlassButton type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </GlassButton>
        <GlassButton
          type="button"
          variant="primary"
          disabled={!picked.length}
          onClick={() => onAdd(picked)}
        >
          Add selected
        </GlassButton>
      </div>
    </div>
  );
}

export function createGoalEditorDraftFromGoal(
  goal: AppData["goals"][number],
  data: AppData,
): GoalEditorDraft {
  const modes = resolveGoalTrackingModes(goal, data);
  return goalToEditorDraft(goal, data, modes);
}

export { createEmptyGoalDraft };
