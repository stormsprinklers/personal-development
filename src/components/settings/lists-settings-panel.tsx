"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { createTodoList, linkTodoListToGoal, mainTodoListId } from "@/lib/todo-helpers";
import { yearInAppTimezone } from "@/lib/timezone";
import { useAppData } from "@/lib/storage";

export function ListsSettingsPanel() {
  const { data, setData } = useAppData();
  const [newListName, setNewListName] = useState("");
  const [newListGoalId, setNewListGoalId] = useState("");

  const goalYear = yearInAppTimezone();
  const yearGoals = useMemo(
    () =>
      data.goals
        .filter((g) => g.year === goalYear && !g.completed)
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title)),
    [data.goals, goalYear],
  );

  const sortedLists = useMemo(() => {
    return [...data.todoLists].sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [data.todoLists]);

  function createList() {
    const name = newListName.trim();
    if (!name) return;
    setData((prev) => createTodoList(prev, name, { goalId: newListGoalId || undefined }));
    setNewListName("");
    setNewListGoalId("");
  }

  function updateGoalLink(listId: string, goalIdOrEmpty: string) {
    setData((prev) => linkTodoListToGoal(prev, listId, goalIdOrEmpty));
  }

  function renameList(listId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) => ({
      ...prev,
      todoLists: prev.todoLists.map((list) => (list.id === listId ? { ...list, name: trimmed } : list)),
    }));
  }

  function deleteList(listId: string) {
    const main = mainTodoListId(data.todoLists);
    if (listId === main) return;
    const list = data.todoLists.find((l) => l.id === listId);
    if (!list) return;
    if (!window.confirm(`Delete list “${list.name}” and its tasks?`)) return;
    setData((prev) => ({
      ...prev,
      todoLists: prev.todoLists.filter((l) => l.id !== listId),
      todoItems: prev.todoItems.filter((item) => item.listId !== listId),
      todoSections: (prev.todoSections ?? []).filter((s) => s.listId !== listId),
      dashboardTodoListIds: prev.dashboardTodoListIds?.filter((id) => id !== listId),
    }));
  }

  return (
    <div className="grid gap-5">
      <SectionCard title="Create list" inset={false}>
        <p className="mb-3 text-sm text-ios-secondary">
          Lists can optionally link to a goal. Linked list tasks count toward that goal’s progress.
        </p>
        <div className="flex min-w-0 flex-wrap items-end gap-2">
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createList();
              }
            }}
            placeholder="List name…"
            className="ios-field min-w-0 flex-1 px-3 py-2.5 text-sm"
          />
          <label className="grid gap-1 text-xs font-medium text-ios-secondary">
            Link to goal
            <select
              value={newListGoalId}
              onChange={(e) => setNewListGoalId(e.target.value)}
              className="ios-field min-w-[10rem] px-3 py-2.5 text-sm"
            >
              <option value="">None</option>
              {yearGoals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </label>
          <GlassButton variant="primary" disabled={!newListName.trim()} onClick={createList}>
            Create
          </GlassButton>
        </div>
      </SectionCard>

      <SectionCard title="Your lists" inset={false}>
        <ul className="grid gap-3">
          {sortedLists.map((list) => {
            const linkedGoal = list.goalId
              ? data.goals.find((g) => g.id === list.goalId)
              : undefined;
            return (
              <li key={list.id} className="ios-card-muted grid gap-2 rounded-2xl p-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <input
                    defaultValue={list.name}
                    key={`${list.id}-${list.name}`}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== list.name) renameList(list.id, e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    className="ios-field min-w-0 flex-1 px-3 py-2 text-sm font-medium"
                    aria-label="List name"
                  />
                  {list.isMain ? (
                    <span className="text-xs text-ios-secondary">Main</span>
                  ) : (
                    <GlassButton variant="secondary" onClick={() => deleteList(list.id)}>
                      Delete
                    </GlassButton>
                  )}
                </div>
                {!list.isMain ? (
                  <label className="grid gap-1 text-xs font-medium text-ios-secondary">
                    Linked goal
                    <select
                      value={list.goalId ?? ""}
                      onChange={(e) => updateGoalLink(list.id, e.target.value)}
                      className="ios-field px-3 py-2.5 text-sm"
                    >
                      <option value="">No goal</option>
                      {yearGoals.map((goal) => (
                        <option key={goal.id} value={goal.id}>
                          {goal.title}
                        </option>
                      ))}
                      {list.goalId && !yearGoals.some((g) => g.id === list.goalId) && linkedGoal ? (
                        <option value={linkedGoal.id}>{linkedGoal.title}</option>
                      ) : null}
                    </select>
                  </label>
                ) : (
                  <p className="text-xs text-ios-secondary">The main list cannot be linked to a goal.</p>
                )}
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}
