"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { useAppData } from "@/lib/storage";

export default function GoalsPage() {
  const { data, ready, setData } = useAppData();
  const [sectionName, setSectionName] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteGoalId, setNoteGoalId] = useState("");

  function addSection() {
    if (!sectionName.trim()) return;
    const id = crypto.randomUUID();
    setData((prev) => ({
      ...prev,
      goalSections: [{ id, name: sectionName.trim() }, ...prev.goalSections],
    }));
    setSelectedSectionId(id);
    setSectionName("");
  }

  function addGoal() {
    if (!goalTitle.trim() || !selectedSectionId) return;
    setData((prev) => ({
      ...prev,
      goals: [
        {
          id: crypto.randomUUID(),
          sectionId: selectedSectionId,
          title: goalTitle.trim(),
          completed: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.goals,
      ],
    }));
    setGoalTitle("");
  }

  function toggleGoal(goalId: string) {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((goal) => (goal.id === goalId ? { ...goal, completed: !goal.completed } : goal)),
    }));
  }

  function addNote() {
    if (!noteGoalId || !noteText.trim()) return;
    setData((prev) => ({
      ...prev,
      goalNotes: [
        { id: crypto.randomUUID(), goalId: noteGoalId, content: noteText.trim(), createdAt: new Date().toISOString() },
        ...prev.goalNotes,
      ],
    }));
    setNoteText("");
  }

  if (!ready) return <div className="p-6">Loading goals...</div>;

  return (
    <AppShell
      title="Goals"
      description="Create annual goals by section and attach notes."
    >
      <SectionCard title="Create Goal Section" subtitle="Organize goals by life area.">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={sectionName}
            onChange={(event) => setSectionName(event.target.value)}
            placeholder="Section name"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button onClick={addSection} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
            Add Section
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Create Goal" subtitle="Attach each goal to a section and track status.">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={selectedSectionId}
            onChange={(event) => setSelectedSectionId(event.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Select section</option>
            {data.goalSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
          <input
            value={goalTitle}
            onChange={(event) => setGoalTitle(event.target.value)}
            placeholder="Goal title"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button onClick={addGoal} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
            Add Goal
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Goal Checklist" subtitle="Check completed goals to track annual progress.">
        <div className="grid gap-2">
          {data.goals.map((goal) => {
            const section = data.goalSections.find((item) => item.id === goal.sectionId);
            return (
              <label key={goal.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2">
                <input type="checkbox" checked={goal.completed} onChange={() => toggleGoal(goal.id)} />
                <span className="text-sm">
                  {goal.title} <span className="text-zinc-500">({section?.name ?? "Unsectioned"})</span>
                </span>
              </label>
            );
          })}
          {!data.goals.length && <p className="text-sm text-zinc-600">No goals created yet.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Goal Notes" subtitle="Add notes linked to specific goals.">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={noteGoalId}
            onChange={(event) => setNoteGoalId(event.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Select goal</option>
            {data.goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
          <input
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="Goal note"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button onClick={addNote} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
            Add Note
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {data.goalNotes.map((note) => {
            const goal = data.goals.find((g) => g.id === note.goalId);
            return (
              <div key={note.id} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                {goal?.title ?? "Goal"}: {note.content}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </AppShell>
  );
}
