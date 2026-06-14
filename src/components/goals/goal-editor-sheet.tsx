"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { Sheet } from "@/components/ui/sheet";
import { COMPLETE_EXIT_MS } from "@/components/complete-exit-row";
import { GoalTrackingFields } from "@/components/goals/goal-tracking-fields";
import {
  GoalAddMetricPicker,
  GoalWizard,
  createGoalEditorDraftFromGoal,
  createEmptyGoalDraft,
} from "@/components/goals/goal-wizard";
import {
  draftProgressPreview,
  draftToGoalPatch,
  type GoalEditorDraft,
} from "@/lib/goals/goal-draft";
import { resolveGoalTrackingModes } from "@/lib/goals/tracking-modes";
import type { AppData, GoalTrackingMode } from "@/lib/models";

export type GoalEditorSurface = "edit" | "wizard";

type Props = {
  open: boolean;
  goalId: string | null;
  surface: GoalEditorSurface;
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  goalYear: number;
  weightAbbr: string;
  distanceAbbr: string;
  allHabits: AppData["habits"];
  allExercises: AppData["exercises"];
  onClose: () => void;
};

type InnerMode = GoalEditorSurface | "add-metric";

export function GoalEditorSheet({
  open,
  goalId,
  surface,
  data,
  setData,
  goalYear,
  weightAbbr,
  distanceAbbr,
  allHabits,
  allExercises,
  onClose,
}: Props) {
  const [innerMode, setInnerMode] = useState<InnerMode>(surface);
  const [returnToEditAfterWizard, setReturnToEditAfterWizard] = useState(false);
  const [draft, setDraft] = useState<GoalEditorDraft>(createEmptyGoalDraft());
  const [newMetricModes, setNewMetricModes] = useState<GoalTrackingMode[]>([]);
  const [goalTaskDraft, setGoalTaskDraft] = useState("");
  const [fadingGoalTaskIds, setFadingGoalTaskIds] = useState<string[]>([]);
  const exitingGoalTaskIdsRef = useRef(new Set<string>());

  const goal = useMemo(
    () => (goalId ? data.goals.find((row) => row.id === goalId) : undefined),
    [data.goals, goalId],
  );

  useEffect(() => {
    if (!open || !goalId) return;
    const row = data.goals.find((g) => g.id === goalId);
    if (!row) return;
    setInnerMode(surface);
    setReturnToEditAfterWizard(false);
    setNewMetricModes([]);
    setDraft(createGoalEditorDraftFromGoal(row, data));
    setGoalTaskDraft("");
    setFadingGoalTaskIds([]);
    exitingGoalTaskIdsRef.current.clear();
  }, [open, goalId, surface]);

  function patchDraft(patch: Partial<GoalEditorDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function saveDraft(andClose = true) {
    if (!goalId || !goal || !draft.title.trim()) return;
    const patched = draftToGoalPatch(goal, draft);
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((row) => (row.id === goalId ? patched : row)),
    }));
    if (andClose) onClose();
  }

  function saveGoalListName() {
    if (!goalId) return;
    const name = draft.goalListName.trim();
    if (!name) return;
    setData((prev) => ({
      ...prev,
      todoLists: prev.todoLists.map((list) => (list.goalId === goalId ? { ...list, name } : list)),
    }));
  }

  function createGoalTaskList() {
    if (!goalId) return;
    setData((prev) => {
      if (prev.todoLists.some((list) => list.goalId === goalId)) return prev;
      const row = prev.goals.find((g) => g.id === goalId);
      if (!row) return prev;
      const listId = crypto.randomUUID();
      const name = draft.goalListName.trim() || `${row.title} tasks`;
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

  function addGoalTask() {
    if (!goalId) return;
    const title = goalTaskDraft.trim();
    if (!title) return;
    setData((prev) => {
      const row = prev.goals.find((g) => g.id === goalId);
      if (!row) return prev;
      let listId = prev.todoLists.find((list) => list.goalId === goalId)?.id;
      const nextLists = [...prev.todoLists];
      if (!listId) {
        listId = crypto.randomUUID();
        const listName = draft.goalListName.trim() || `${row.title} tasks`;
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

  function toggleGoalTask(taskId: string) {
    if (!goalId) return;
    const listId = data.todoLists.find((list) => list.goalId === goalId)?.id;
    const task = data.todoItems.find(
      (item) => item.id === taskId && (listId ? item.listId === listId : item.goalId === goalId),
    );
    if (!task) return;

    if (!task.active) {
      setData((prev) => {
        const lid = prev.todoLists.find((list) => list.goalId === goalId)?.id;
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
        const lid = prev.todoLists.find((list) => list.goalId === goalId)?.id;
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

  function deleteGoal() {
    if (!goalId) return;
    setData((prev) => {
      const removedListIds = prev.todoLists.filter((list) => list.goalId === goalId).map((list) => list.id);
      return {
        ...prev,
        goals: prev.goals.filter((row) => row.id !== goalId),
        goalNotes: prev.goalNotes.filter((note) => note.goalId !== goalId),
        todoLists: prev.todoLists.filter((list) => list.goalId !== goalId),
        todoSections: prev.todoSections.filter((section) => !removedListIds.includes(section.listId)),
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
    onClose();
  }

  function markComplete() {
    if (!goalId || !window.confirm("Do you really want to mark this goal as complete?")) return;
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((row) => (row.id === goalId ? { ...row, completed: true } : row)),
    }));
    onClose();
  }

  const sharedFieldProps = {
    draft,
    onDraftChange: patchDraft,
    data,
    goalId: goalId ?? "",
    goalYear,
    weightAbbr,
    distanceAbbr,
    allHabits,
    allExercises,
    goalTaskDraft,
    onGoalTaskDraftChange: setGoalTaskDraft,
    fadingGoalTaskIds,
    onToggleGoalTask: toggleGoalTask,
    onAddGoalTask: addGoalTask,
    onSaveGoalListName: saveGoalListName,
    onCreateGoalTaskList: createGoalTaskList,
  };

  const editModes =
    innerMode === "add-metric"
      ? newMetricModes
      : draft.trackingModes.length
        ? draft.trackingModes
        : goal
          ? resolveGoalTrackingModes(goal, data)
          : [];

  const progress =
    goal && goalId ? draftProgressPreview(data, goal, { ...draft, trackingModes: editModes }, goalYear) : 0;

  const sheetTitle =
    innerMode === "wizard"
      ? "Set up goal"
      : innerMode === "add-metric"
        ? "Add tracking"
        : draft.title || goal?.title || "Goal";

  if (!goal || !goalId) return null;

  return (
    <Sheet open={open} onClose={onClose} title={sheetTitle}>
      {innerMode === "wizard" ? (
        <GoalWizard
          {...sharedFieldProps}
          onComplete={() => {
            saveDraft(false);
            if (returnToEditAfterWizard) {
              setInnerMode("edit");
              setReturnToEditAfterWizard(false);
            } else {
              onClose();
            }
          }}
          onCancel={() => {
            if (returnToEditAfterWizard) {
              setInnerMode("edit");
              setReturnToEditAfterWizard(false);
            } else {
              onClose();
            }
          }}
        />
      ) : innerMode === "add-metric" ? (
        <>
          <GoalAddMetricPicker
            existingModes={draft.trackingModes}
            onAdd={(modes) => {
              setNewMetricModes(modes);
              patchDraft({ trackingModes: [...new Set([...draft.trackingModes, ...modes])] });
              setInnerMode("edit");
            }}
            onCancel={() => setInnerMode("edit")}
          />
        </>
      ) : (
        <div className="grid min-w-0 gap-3">
          <input
            value={draft.title}
            onChange={(event) => patchDraft({ title: event.target.value })}
            className="w-full ios-field px-3 py-2 text-sm"
            placeholder="Goal title"
          />

          {editModes.length ? (
            <GoalTrackingFields modes={editModes} {...sharedFieldProps} />
          ) : (
            <p className="text-sm text-ios-secondary">
              No tracking metrics configured yet. Run setup or add metrics below.
            </p>
          )}

          <div>
            <div className="h-2 rounded bg-steel/10">
              <div className="h-2 rounded bg-steel/100" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate">{progress.toFixed(1)}%</p>
          </div>

          <GlassButton type="button" variant="secondary" className="w-full" onClick={() => setInnerMode("add-metric")}>
            Add additional tracking metrics
          </GlassButton>
          <GlassButton
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setReturnToEditAfterWizard(true);
              setInnerMode("wizard");
            }}
          >
            Redo setup wizard
          </GlassButton>

          <div className="flex flex-wrap justify-between gap-2">
            <GlassButton type="button" variant="destructive" onClick={deleteGoal}>
              Delete Goal
            </GlassButton>
            <div className="flex gap-2">
              <GlassButton type="button" variant="secondary" onClick={onClose}>
                Close
              </GlassButton>
              <GlassButton type="button" variant="primary" onClick={() => saveDraft(true)}>
                Save
              </GlassButton>
            </div>
          </div>

          <GlassButton type="button" variant="primary" className="w-full" onClick={markComplete}>
            Mark Goal Complete
          </GlassButton>
        </div>
      )}
    </Sheet>
  );
}
