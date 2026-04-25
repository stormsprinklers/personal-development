"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { useAppData } from "@/lib/storage";

export default function TodosPage() {
  const { data, ready, setData } = useAppData();
  const [listName, setListName] = useState("");
  const [listArea, setListArea] = useState("personal");
  const [selectedListId, setSelectedListId] = useState("");
  const [todoTitle, setTodoTitle] = useState("");

  const activeItems = useMemo(() => data.todoItems.filter((item) => item.active), [data.todoItems]);

  function addList() {
    if (!listName.trim()) return;
    const id = crypto.randomUUID();
    setData((prev) => ({
      ...prev,
      todoLists: [{ id, name: listName.trim(), area: listArea.trim(), createdAt: new Date().toISOString() }, ...prev.todoLists],
    }));
    setSelectedListId(id);
    setListName("");
  }

  function addTodo() {
    if (!todoTitle.trim() || !selectedListId) return;
    setData((prev) => ({
      ...prev,
      todoItems: [
        { id: crypto.randomUUID(), listId: selectedListId, title: todoTitle.trim(), active: true, createdAt: new Date().toISOString() },
        ...prev.todoItems,
      ],
    }));
    setTodoTitle("");
  }

  function completeTodo(todoId: string) {
    setData((prev) => ({
      ...prev,
      todoItems: prev.todoItems.map((item) => (item.id === todoId ? { ...item, active: false } : item)),
      todoCompletions: [{ id: crypto.randomUUID(), todoItemId: todoId, completedAt: new Date().toISOString() }, ...prev.todoCompletions],
    }));
  }

  if (!ready) return <div className="p-6">Loading to-do lists...</div>;

  return (
    <AppShell
      title="To-Do Lists"
      description="Create area-based lists and keep completion history."
    >
      <SectionCard title="Create List" subtitle="Segment to-dos into life areas such as personal or work.">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={listName}
            onChange={(event) => setListName(event.target.value)}
            placeholder="List name"
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <input
            value={listArea}
            onChange={(event) => setListArea(event.target.value)}
            placeholder="Area"
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <button onClick={addList} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700">
            Add List
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Add To-Do" subtitle="Completed items are hidden from active lists and moved to history.">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={selectedListId}
            onChange={(event) => setSelectedListId(event.target.value)}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          >
            <option value="">Select list</option>
            {data.todoLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.area})
              </option>
            ))}
          </select>
          <input
            value={todoTitle}
            onChange={(event) => setTodoTitle(event.target.value)}
            placeholder="Task title"
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <button onClick={addTodo} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700">
            Add Task
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Active Tasks" subtitle="Check off tasks as you complete them.">
        <div className="grid gap-2">
          {activeItems.map((item) => {
            const list = data.todoLists.find((todoList) => todoList.id === item.listId);
            return (
              <label key={item.id} className="flex items-center gap-3 rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2">
                <input type="checkbox" onChange={() => completeTodo(item.id)} />
                <span className="text-sm">
                  {item.title} <span className="text-sky-800/60">({list?.area ?? "Unknown"})</span>
                </span>
              </label>
            );
          })}
          {!activeItems.length && <p className="text-sm text-zinc-600">No active tasks yet.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Completion History" subtitle="Completed tasks and completion dates.">
        <div className="grid gap-2">
          {data.todoCompletions.map((completion) => {
            const item = data.todoItems.find((todo) => todo.id === completion.todoItemId);
            return (
              <div key={completion.id} className="rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2 text-sm">
                {completion.completedAt.slice(0, 10)} - {item?.title ?? "Task"}
              </div>
            );
          })}
          {!data.todoCompletions.length && <p className="text-sm text-zinc-600">No completed tasks yet.</p>}
        </div>
      </SectionCard>
    </AppShell>
  );
}
