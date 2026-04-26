"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
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

  const activeListId = useMemo(() => {
    if (selectedListId && data.todoLists.some((list) => list.id === selectedListId)) return selectedListId;
    return data.todoLists[0]?.id ?? "";
  }, [selectedListId, data.todoLists]);

  const activeList = data.todoLists.find((list) => list.id === activeListId);
  const activeItems = useMemo(
    () => data.todoItems.filter((item) => item.listId === activeListId && item.active),
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
        .map((habit) => ({
          habit,
          completed: data.habitLogs.some(
            (log) => log.habitId === habit.id && log.date === today && log.completed,
          ),
        }))
        .filter((entry) => !entry.completed),
    [data.habits, data.habitLogs, today],
  );

  function addList() {
    if (!newListName.trim()) return;
    const id = crypto.randomUUID();
    setData((prev) => ({
      ...prev,
      todoLists: [{ id, name: newListName.trim(), area: "", createdAt: new Date().toISOString() }, ...prev.todoLists],
    }));
    setSelectedListId(id);
    setNewListName("");
    setListMenuOpen(false);
  }

  function addTodo() {
    if (!todoTitle.trim() || !activeListId) return;
    setData((prev) => ({
      ...prev,
      todoItems: [
        { id: crypto.randomUUID(), listId: activeListId, title: todoTitle.trim(), active: true, createdAt: new Date().toISOString() },
        ...prev.todoItems,
      ],
    }));
    setTodoTitle("");
  }

  function completeTodo(todoId: string) {
    setFadingTaskIds((prev) => [...prev, todoId]);
    window.setTimeout(() => {
      setFadingTaskIds((prev) => prev.filter((id) => id !== todoId));
      setData((prev) => ({
        ...prev,
        todoItems: prev.todoItems.map((item) => (item.id === todoId ? { ...item, active: false } : item)),
        todoCompletions: [{ id: crypto.randomUUID(), todoItemId: todoId, completedAt: new Date().toISOString() }, ...prev.todoCompletions],
      }));
    }, 260);
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

  function completeHabit(habitId: string) {
    setData((prev) => {
      const existing = prev.habitLogs.find((log) => log.habitId === habitId && log.date === today);
      const nextLogs = existing
        ? prev.habitLogs.map((log) => (log.id === existing.id ? { ...log, completed: true } : log))
        : [{ id: crypto.randomUUID(), habitId, date: today, completed: true }, ...prev.habitLogs];
      return { ...prev, habitLogs: nextLogs };
    });
  }

  if (!ready) return <div className="p-6">Loading to-do lists...</div>;

  return (
    <AppShell
      title="To-Do"
      description="Simple editable task list."
    >
      <SectionCard title={activeList?.name ?? "My To-Do List"}>
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setListMenuOpen((prev) => !prev)}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-sky-50"
            aria-label="Open list menu"
          >
            ☰
          </button>
          <div className="text-sm text-zinc-600">{activeItems.length} active</div>
        </div>

        {listMenuOpen ? (
          <div className="mb-4 grid gap-2 rounded-lg border border-sky-200/80 bg-sky-50/40 p-3">
            <div className="grid gap-2">
              {data.todoLists.map((list) => (
                <div key={list.id} className="flex items-center justify-between gap-2">
                  {renameListId === list.id ? (
                    <>
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                      />
                      <button
                        onClick={saveRenameList}
                        className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700"
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
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                          activeListId === list.id ? "bg-sky-600 text-white" : "bg-white text-zinc-700 hover:bg-sky-50"
                        }`}
                      >
                        {list.name}
                      </button>
                      <button
                        onClick={() => startRenameList(list.id, list.name)}
                        className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-zinc-700 hover:bg-sky-50"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="New list name"
                className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
              />
              <button
                onClick={addList}
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap gap-2">
          <select
            value={activeListId}
            onChange={(event) => setSelectedListId(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          >
            {!data.todoLists.length ? <option value="">No lists yet</option> : null}
            {data.todoLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          <input
            value={todoTitle}
            onChange={(event) => setTodoTitle(event.target.value)}
            placeholder="Add task"
            className="min-w-0 flex-[2] rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <button onClick={addTodo} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700">
            +
          </button>
        </div>

        <div className="grid gap-2">
          {incompleteHabitsToday.map(({ habit }) => (
            <label
              key={`habit-${habit.id}`}
              className="flex items-center gap-3 rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2"
            >
              <input type="checkbox" onChange={() => completeHabit(habit.id)} />
              <span className="text-sm">{habit.name} (habit)</span>
            </label>
          ))}
          {activeItems.map((item) => {
            return (
              <label
                key={item.id}
                className={`flex items-center gap-3 rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2 transition-all duration-300 ${
                  fadingTaskIds.includes(item.id) ? "translate-x-2 opacity-0" : "opacity-100"
                }`}
              >
                <input type="checkbox" onChange={() => completeTodo(item.id)} />
                <span className="text-sm">{item.title}</span>
              </label>
            );
          })}
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
                <div key={completion.id} className="rounded-lg border border-sky-200/80 bg-sky-50/30 px-3 py-2 text-sm text-zinc-600">
                  {todo?.title ?? "Task"}
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
