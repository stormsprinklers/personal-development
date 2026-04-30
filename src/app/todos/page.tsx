"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CompleteExitRow, COMPLETE_EXIT_MS } from "@/components/complete-exit-row";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { mainTodoListId } from "@/lib/todo-helpers";
import { todayKey, useAppData } from "@/lib/storage";

export default function TodosPage() {
  const { data, ready, setData } = useAppData();
  const today = todayKey();
  const [newListName, setNewListName] = useState("");
  const [todoTitle, setTodoTitle] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [renameListId, setRenameListId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [fadingTaskIds, setFadingTaskIds] = useState<string[]>([]);
  const [fadingHabitIds, setFadingHabitIds] = useState<string[]>([]);
  const [newSectionName, setNewSectionName] = useState("");
  const [newTaskSectionId, setNewTaskSectionId] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState("");
  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const exitingTodoIdsRef = useRef(new Set<string>());
  const exitingHabitIdsRef = useRef(new Set<string>());

  const defaultListId = useMemo(() => mainTodoListId(data.todoLists), [data.todoLists]);

  const activeListId = useMemo(() => {
    if (selectedListId && data.todoLists.some((list) => list.id === selectedListId)) return selectedListId;
    return defaultListId;
  }, [selectedListId, data.todoLists, defaultListId]);

  useEffect(() => {
    setEditingTodoId(null);
    setEditingTodoTitle("");
  }, [activeListId]);

  const goalsForListLink = useMemo(
    () => data.goals.filter((g) => g.year === new Date().getFullYear()),
    [data.goals],
  );

  const sortedTodoLists = useMemo(() => {
    return [...data.todoLists].sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [data.todoLists]);

  const isMainListActive = activeListId === defaultListId;
  const mainSectionsOrdered = useMemo(() => {
    if (!isMainListActive) return [];
    return [...data.todoSections]
      .filter((s) => s.listId === defaultListId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data.todoSections, defaultListId, isMainListActive]);

  const activeList = data.todoLists.find((list) => list.id === activeListId);
  const activeItems = useMemo(
    () => data.todoItems.filter((item) => item.listId === activeListId && item.active),
    [data.todoItems, activeListId],
  );
  const totalTodosOnList = useMemo(
    () => data.todoItems.filter((item) => item.listId === activeListId).length,
    [data.todoItems, activeListId],
  );
  const completedItems = useMemo(() => {
    const completed = data.todoCompletions
      .filter((completion) => {
        const todo = data.todoItems.find((item) => item.id === completion.todoItemId);
        return todo?.listId === activeListId;
      })
      .map((completion) => {
        const todo = data.todoItems.find((item) => item.id === completion.todoItemId);
        return { completion, todo };
      });
    return completed;
  }, [data.todoCompletions, data.todoItems, activeListId]);
  const incompleteHabitsToday = useMemo(
    () =>
      data.habits
        .filter((habit) => habit.active)
        .filter((habit) => !data.habitLogs.some((log) => log.habitId === habit.id && log.date === today))
        .map((habit) => ({ habit })),
    [data.habits, data.habitLogs, today],
  );

  const mainTaskBlocks = useMemo(() => {
    if (!isMainListActive) return null;
    const blocks: { key: string; title: string; items: typeof activeItems }[] = [];
    blocks.push({
      key: "_uncat",
      title: "No section",
      items: activeItems.filter((i) => !i.sectionId),
    });
    for (const sec of mainSectionsOrdered) {
      blocks.push({
        key: sec.id,
        title: sec.name,
        items: activeItems.filter((i) => i.sectionId === sec.id),
      });
    }
    return blocks;
  }, [isMainListActive, activeItems, mainSectionsOrdered]);

  function addList() {
    if (!newListName.trim()) return;
    const id = crypto.randomUUID();
    setData((prev) => ({
      ...prev,
      todoLists: [
        {
          id,
          name: newListName.trim(),
          area: "",
          isMain: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.todoLists,
      ],
    }));
    setSelectedListId(id);
    setNewListName("");
    setListMenuOpen(false);
  }

  function setListGoalLink(listId: string, goalIdOrEmpty: string) {
    setData((prev) => {
      const main = mainTodoListId(prev.todoLists);
      if (listId === main) return prev;
      let lists = prev.todoLists.map((l) => {
        if (goalIdOrEmpty && l.goalId === goalIdOrEmpty && l.id !== listId) {
          return { ...l, goalId: undefined };
        }
        return l;
      });
      lists = lists.map((l) =>
        l.id === listId ? { ...l, goalId: goalIdOrEmpty ? goalIdOrEmpty : undefined } : l,
      );
      return { ...prev, todoLists: lists };
    });
  }

  function addTodo() {
    if (!todoTitle.trim() || !activeListId) return;
    setData((prev) => {
      const main = mainTodoListId(prev.todoLists);
      const sec =
        activeListId === main &&
        newTaskSectionId &&
        prev.todoSections.some((s) => s.id === newTaskSectionId && s.listId === main)
          ? newTaskSectionId
          : undefined;
      return {
        ...prev,
        todoItems: [
          {
            id: crypto.randomUUID(),
            listId: activeListId,
            title: todoTitle.trim(),
            active: true,
            createdAt: new Date().toISOString(),
            sectionId: sec,
          },
          ...prev.todoItems,
        ],
      };
    });
    setTodoTitle("");
  }

  function addTodoSection() {
    const name = newSectionName.trim();
    if (!name || activeListId !== defaultListId) return;
    setData((prev) => {
      const main = mainTodoListId(prev.todoLists);
      const orders = prev.todoSections.filter((s) => s.listId === main).map((s) => s.sortOrder);
      const order = orders.length ? Math.max(...orders) : 0;
      return {
        ...prev,
        todoSections: [
          {
            id: crypto.randomUUID(),
            listId: main,
            name,
            sortOrder: order + 1,
            createdAt: new Date().toISOString(),
          },
          ...prev.todoSections,
        ],
      };
    });
    setNewSectionName("");
  }

  function deleteTodoSection(sectionId: string) {
    setData((prev) => ({
      ...prev,
      todoSections: prev.todoSections.filter((s) => s.id !== sectionId),
      todoItems: prev.todoItems.map((it) =>
        it.sectionId === sectionId ? { ...it, sectionId: undefined } : it,
      ),
    }));
  }

  function setTodoItemSection(todoId: string, sectionIdOrEmpty: string) {
    setData((prev) => {
      const item = prev.todoItems.find((i) => i.id === todoId);
      if (!item) return prev;
      const main = mainTodoListId(prev.todoLists);
      if (item.listId !== main) return prev;
      if (
        sectionIdOrEmpty &&
        !prev.todoSections.some((s) => s.id === sectionIdOrEmpty && s.listId === main)
      ) {
        return prev;
      }
      return {
        ...prev,
        todoItems: prev.todoItems.map((i) =>
          i.id === todoId ? { ...i, sectionId: sectionIdOrEmpty || undefined } : i,
        ),
      };
    });
  }

  function startDraggingTodo(todoId: string) {
    setDraggingTodoId(todoId);
  }

  function endDraggingTodo() {
    setDraggingTodoId(null);
    setDragOverSectionId(null);
  }

  function dropTodoOnSection(sectionIdOrEmpty: string) {
    if (!draggingTodoId) return;
    setTodoItemSection(draggingTodoId, sectionIdOrEmpty);
    setDraggingTodoId(null);
    setDragOverSectionId(null);
  }

  function completeTodo(todoId: string) {
    if (exitingTodoIdsRef.current.has(todoId)) return;
    exitingTodoIdsRef.current.add(todoId);
    setFadingTaskIds((prev) => [...prev, todoId]);
    window.setTimeout(() => {
      exitingTodoIdsRef.current.delete(todoId);
      setFadingTaskIds((prev) => prev.filter((id) => id !== todoId));
      setData((prev) => ({
        ...prev,
        todoItems: prev.todoItems.map((item) => (item.id === todoId ? { ...item, active: false } : item)),
        todoCompletions: [{ id: crypto.randomUUID(), todoItemId: todoId, completedAt: new Date().toISOString() }, ...prev.todoCompletions],
      }));
    }, COMPLETE_EXIT_MS);
  }

  function startEditTodo(todoId: string, title: string) {
    setEditingTodoId(todoId);
    setEditingTodoTitle(title);
  }

  function cancelEditTodo() {
    setEditingTodoId(null);
    setEditingTodoTitle("");
  }

  function saveTodoEdits() {
    if (!editingTodoId || !editingTodoTitle.trim()) return;
    setData((prev) => ({
      ...prev,
      todoItems: prev.todoItems.map((item) =>
        item.id === editingTodoId ? { ...item, title: editingTodoTitle.trim() } : item,
      ),
    }));
    setEditingTodoId(null);
    setEditingTodoTitle("");
  }

  function deleteTodoItem(todoId: string) {
    exitingTodoIdsRef.current.delete(todoId);
    setFadingTaskIds((prev) => prev.filter((id) => id !== todoId));
    setData((prev) => ({
      ...prev,
      todoItems: prev.todoItems.filter((item) => item.id !== todoId),
      todoCompletions: prev.todoCompletions.filter((c) => c.todoItemId !== todoId),
    }));
    if (editingTodoId === todoId) cancelEditTodo();
  }

  function startRenameList(listId: string, currentName: string) {
    setRenameListId(listId);
    setRenameValue(currentName);
  }

  function saveRenameList() {
    if (!renameListId || !renameValue.trim()) return;
    setData((prev) => ({
      ...prev,
      todoLists: prev.todoLists.map((list) =>
        list.id === renameListId ? { ...list, name: renameValue.trim() } : list,
      ),
    }));
    setRenameListId(null);
    setRenameValue("");
  }

  function deleteTodoList(listId: string) {
    setData((prev) => {
      const main = mainTodoListId(prev.todoLists);
      if (listId === main) return prev;
      const removedTodoIds = prev.todoItems.filter((item) => item.listId === listId).map((item) => item.id);
      return {
        ...prev,
        todoLists: prev.todoLists.filter((list) => list.id !== listId),
        todoSections: prev.todoSections.filter((section) => section.listId !== listId),
        todoItems: prev.todoItems.filter((item) => item.listId !== listId),
        todoCompletions: prev.todoCompletions.filter((completion) => !removedTodoIds.includes(completion.todoItemId)),
        dashboardTodoListIds: prev.dashboardTodoListIds?.filter((id) => id !== listId),
      };
    });
    if (selectedListId === listId) setSelectedListId("");
    if (renameListId === listId) {
      setRenameListId(null);
      setRenameValue("");
    }
  }

  function logHabitTodayWithExit(habitId: string, completed: boolean) {
    if (exitingHabitIdsRef.current.has(habitId)) return;
    exitingHabitIdsRef.current.add(habitId);
    setFadingHabitIds((prev) => [...prev, habitId]);
    window.setTimeout(() => {
      exitingHabitIdsRef.current.delete(habitId);
      setFadingHabitIds((prev) => prev.filter((id) => id !== habitId));
      setData((prev) => {
        const existing = prev.habitLogs.find((log) => log.habitId === habitId && log.date === today);
        const nextLogs = existing
          ? prev.habitLogs.map((log) => (log.id === existing.id ? { ...log, completed } : log))
          : [{ id: crypto.randomUUID(), habitId, date: today, completed }, ...prev.habitLogs];
        return { ...prev, habitLogs: nextLogs };
      });
    }, COMPLETE_EXIT_MS);
  }

  if (!ready) return <div className="p-6">Loading to-do lists...</div>;

  return (
    <AppShell
      title="To-Do"
      description="Simple editable task list."
    >
      <SectionCard title={activeList?.name ?? "My To-Do List"}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => setListMenuOpen((prev) => !prev)}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-sky-50"
            aria-label="Open list menu"
          >
            ☰
          </button>
          <div className="text-sm text-zinc-600 tabular-nums" aria-label={`${activeItems.length} open of ${totalTodosOnList} tasks`}>
            {activeItems.length}/{totalTodosOnList}
          </div>
        </div>

        {listMenuOpen ? (
          <div className="mb-4 grid min-w-0 gap-2 rounded-lg border border-sky-200/80 bg-sky-50/40 p-3">
            <div className="grid min-w-0 gap-3">
              {sortedTodoLists.map((list) => (
                <div key={list.id} className="grid min-w-0 gap-2 rounded-lg border border-sky-200/60 bg-white/80 p-2">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    {renameListId === list.id ? (
                      <>
                        <input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                        />
                        <button
                          onClick={saveRenameList}
                          className="w-full rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700 sm:w-auto"
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setSelectedListId(list.id);
                            setListMenuOpen(false);
                          }}
                          className={`min-w-0 flex-1 break-words rounded-lg px-3 py-2 text-left text-sm ${
                            activeListId === list.id ? "bg-sky-600 text-white" : "bg-white text-zinc-700 hover:bg-sky-50"
                          }`}
                        >
                          {list.isMain ? `${list.name} (main)` : list.name}
                          {list.goalId ? (
                            <span className="mt-0.5 block text-xs font-normal opacity-90">
                              Goal: {data.goals.find((g) => g.id === list.goalId)?.title ?? "?"}
                            </span>
                          ) : null}
                        </button>
                        <button
                          onClick={() => startRenameList(list.id, list.name)}
                          className="shrink-0 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-zinc-700 hover:bg-sky-50"
                        >
                          Edit
                        </button>
                        {!list.isMain ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete list "${list.name}" and all its tasks?`)) {
                                deleteTodoList(list.id);
                              }
                            }}
                            className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                  {!list.isMain ? (
                    <label className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                      <span className="shrink-0">Link to goal</span>
                      <select
                        value={list.goalId ?? ""}
                        onChange={(event) => setListGoalLink(list.id, event.target.value)}
                        className="min-w-0 flex-1 rounded border border-sky-200 bg-white px-2 py-1 text-xs text-zinc-800"
                      >
                        <option value="">None</option>
                        {goalsForListLink.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              <input
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="New list name"
                className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
              />
              <button
                onClick={addList}
                className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 sm:w-auto"
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        {isMainListActive ? (
          <div className="mb-3 rounded-lg border border-sky-200/80 bg-sky-50/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-800/70">Sections (main list)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={newSectionName}
                onChange={(event) => setNewSectionName(event.target.value)}
                placeholder="Section name"
                className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
              />
              <button
                type="button"
                onClick={addTodoSection}
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                + Section
              </button>
            </div>
            {mainSectionsOrdered.length ? (
              <ul className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-700">
                {mainSectionsOrdered.map((sec) => (
                  <li
                    key={sec.id}
                    className="flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-1"
                  >
                    <span>{sec.name}</span>
                    <button
                      type="button"
                      onClick={() => deleteTodoSection(sec.id)}
                      className="text-sky-800/80 hover:text-red-700"
                      aria-label={`Remove section ${sec.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap gap-2">
          <select
            value={activeListId}
            onChange={(event) => setSelectedListId(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          >
            {!data.todoLists.length ? <option value="">No lists yet</option> : null}
            {sortedTodoLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.isMain ? `${list.name} (main)` : list.name}
                {list.goalId ? ` — ${data.goals.find((g) => g.id === list.goalId)?.title ?? "goal"}` : ""}
              </option>
            ))}
          </select>
          {isMainListActive ? (
            <select
              value={newTaskSectionId}
              onChange={(event) => setNewTaskSectionId(event.target.value)}
              className="min-w-0 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80 sm:w-40"
            >
              <option value="">No section</option>
              {mainSectionsOrdered.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          ) : null}
          <input
            value={todoTitle}
            onChange={(event) => setTodoTitle(event.target.value)}
            placeholder="Add task"
            className="min-w-0 flex-[2] rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <button onClick={addTodo} className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700 sm:w-auto">
            +
          </button>
        </div>

        <div className="grid gap-2">
          {incompleteHabitsToday.map(({ habit }) => (
            <CompleteExitRow key={`habit-${habit.id}`} exiting={fadingHabitIds.includes(habit.id)}>
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2">
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    title="Done today"
                    aria-label="Log habit as done today"
                    onClick={() => logHabitTodayWithExit(habit.id, true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-white text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    title="Missed today"
                    aria-label="Log habit as missed today"
                    onClick={() => logHabitTodayWithExit(habit.id, false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-white text-sm font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-50"
                  >
                    ✗
                  </button>
                </div>
                <span className="min-w-0 flex-1 break-words text-sm">{habit.name} (habit)</span>
              </div>
            </CompleteExitRow>
          ))}
          {mainTaskBlocks
            ? mainTaskBlocks.map((block) => (
                <div
                  key={block.key}
                  className={`grid gap-2 rounded-lg border border-dashed p-2 transition-colors ${
                    dragOverSectionId === block.key ? "border-sky-400 bg-sky-100/50" : "border-transparent"
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverSectionId(block.key);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragOverSectionId(block.key);
                  }}
                  onDragLeave={() => {
                    if (dragOverSectionId === block.key) setDragOverSectionId(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    dropTodoOnSection(block.key === "_uncat" ? "" : block.key);
                  }}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-800/80">{block.title}</h4>
                  {block.items.length === 0 ? (
                    <p className="pl-1 text-xs text-zinc-500">No tasks in this section.</p>
                  ) : (
                    block.items.map((item) => (
                      <CompleteExitRow key={item.id} exiting={fadingTaskIds.includes(item.id)}>
                        <div
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2"
                          draggable={editingTodoId !== item.id}
                          onDragStart={() => startDraggingTodo(item.id)}
                          onDragEnd={endDraggingTodo}
                        >
                        {editingTodoId === item.id ? (
                          <div className="flex min-w-0 w-full flex-wrap items-center gap-2">
                            <input
                              value={editingTodoTitle}
                              onChange={(event) => setEditingTodoTitle(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") saveTodoEdits();
                                if (event.key === "Escape") cancelEditTodo();
                              }}
                              className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={saveTodoEdits}
                              className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditTodo}
                              className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-sky-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <label className="flex min-w-0 flex-1 items-center gap-3">
                              <input
                                type="checkbox"
                                checked={fadingTaskIds.includes(item.id)}
                                onChange={() => completeTodo(item.id)}
                              />
                              <span className="break-words text-sm">{item.title}</span>
                            </label>
                            <span className="rounded border border-sky-200 bg-white px-2 py-1 text-xs text-zinc-600">
                              Drag to move
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditTodo(item.id, item.title)}
                              className="shrink-0 rounded-md border border-sky-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-sky-50"
                              aria-label="Edit task"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTodoItem(item.id)}
                              className="shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                              aria-label="Delete task"
                            >
                              🗑
                            </button>
                          </>
                        )}
                        </div>
                      </CompleteExitRow>
                    ))
                  )}
                </div>
              ))
            : activeItems.map((item) => (
                <CompleteExitRow key={item.id} exiting={fadingTaskIds.includes(item.id)}>
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2">
                  {editingTodoId === item.id ? (
                    <div className="flex min-w-0 w-full flex-wrap items-center gap-2">
                      <input
                        value={editingTodoTitle}
                        onChange={(event) => setEditingTodoTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveTodoEdits();
                          if (event.key === "Escape") cancelEditTodo();
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={saveTodoEdits}
                        className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditTodo}
                        className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-sky-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="flex min-w-0 flex-1 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={fadingTaskIds.includes(item.id)}
                          onChange={() => completeTodo(item.id)}
                        />
                        <span className="break-words text-sm">{item.title}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => startEditTodo(item.id, item.title)}
                        className="shrink-0 rounded-md border border-sky-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-sky-50"
                        aria-label="Edit task"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTodoItem(item.id)}
                        className="shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        aria-label="Delete task"
                      >
                        🗑
                      </button>
                    </>
                  )}
                  </div>
                </CompleteExitRow>
              ))}
          {!activeItems.length && !incompleteHabitsToday.length ? (
            <p className="text-sm text-zinc-600">No active tasks.</p>
          ) : null}
        </div>

        <div className="mt-3">
          <button
            onClick={() => setShowCompleted((prev) => !prev)}
            className="text-sm font-medium text-sky-800/80 underline"
          >
            {showCompleted ? "Hide completed" : `Show completed (${completedItems.length})`}
          </button>
          {showCompleted ? (
            <div className="mt-2 grid gap-2">
              {completedItems.map(({ completion, todo }) => (
                <div
                  key={completion.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200/80 bg-sky-50/30 px-3 py-2 text-sm text-zinc-600"
                >
                  {todo && editingTodoId === todo.id ? (
                    <div className="flex min-w-0 w-full flex-wrap items-center gap-2">
                      <input
                        value={editingTodoTitle}
                        onChange={(event) => setEditingTodoTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveTodoEdits();
                          if (event.key === "Escape") cancelEditTodo();
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={saveTodoEdits}
                        className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditTodo}
                        className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-sky-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 break-words">{todo?.title ?? "Task"}</span>
                      {todo ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditTodo(todo.id, todo.title)}
                            className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-sky-50"
                            aria-label="Edit completed task"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTodoItem(todo.id)}
                            className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                            aria-label="Remove task"
                          >
                            🗑
                          </button>
                        </>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
              {!completedItems.length ? <p className="text-sm text-zinc-600">No completed tasks.</p> : null}
            </div>
          ) : null}
        </div>
      </SectionCard>
    </AppShell>
  );
}
