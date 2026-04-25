"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { useAppData } from "@/lib/storage";

const GOAL_TASKS_LIST_NAME = "Goal Tasks";

export default function GoalsPage() {
  const { data, ready, setData } = useAppData();
  const goalYear = new Date().getFullYear();
  const [sectionName, setSectionName] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTaskDrafts, setGoalTaskDrafts] = useState<Record<string, string>>({});

  const goalsForYear = useMemo(
    () => data.goals.filter((goal) => goal.year === goalYear),
    [data.goals, goalYear],
  );

  const goalIdsForYear = useMemo(() => new Set(goalsForYear.map((g) => g.id)), [goalsForYear]);

  const goalNotesForYear = useMemo(
    () => data.goalNotes.filter((note) => goalIdsForYear.has(note.goalId)),
    [data.goalNotes, goalIdsForYear],
  );
  const goalsBySection = useMemo(
    () =>
      data.goalSections.map((section) => ({
        section,
        goals: goalsForYear.filter((goal) => goal.sectionId === section.id),
      })),
    [data.goalSections, goalsForYear],
  );

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
          year: goalYear,
          completed: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.goals,
      ],
    }));
    setGoalTitle("");
  }

  function addGoalTask(goalId: string) {
    const title = goalTaskDrafts[goalId]?.trim();
    if (!title) return;

    setData((prev) => {
      let listId = prev.todoLists.find((list) => list.name === GOAL_TASKS_LIST_NAME)?.id;
      const nextLists = [...prev.todoLists];
      if (!listId) {
        listId = crypto.randomUUID();
        nextLists.unshift({
          id: listId,
          name: GOAL_TASKS_LIST_NAME,
          area: "",
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
            goalId,
            title,
            active: true,
            createdAt: new Date().toISOString(),
          },
          ...prev.todoItems,
        ],
      };
    });

    setGoalTaskDrafts((prev) => ({ ...prev, [goalId]: "" }));
  }

  function toggleGoal(goalId: string) {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((goal) => (goal.id === goalId ? { ...goal, completed: !goal.completed } : goal)),
    }));
  }

  if (!ready) return <div className="p-6">Loading goals...</div>;

  return (
    <AppShell
      title="Goals"
      description="Simple goals with section headings and task breakdowns."
    >
      <SectionCard title={`Goals ${goalYear}`}>
        <p className="text-sm text-zinc-600">Current year goals only.</p>
      </SectionCard>

      <SectionCard title="New Section">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={sectionName}
            onChange={(event) => setSectionName(event.target.value)}
            placeholder="Section name"
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <button onClick={addSection} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700">
            Add Section
          </button>
        </div>
      </SectionCard>

      <SectionCard title="New Goal">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={selectedSectionId}
            onChange={(event) => setSelectedSectionId(event.target.value)}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
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
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <button onClick={addGoal} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700">
            Add Goal
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Goal List">
        <div className="grid gap-5">
          {goalsBySection.map(({ section, goals }) => (
            <div key={section.id}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-800/70">{section.name}</h3>
              {goals.length ? (
                <div className="grid gap-2">
                  {goals.map((goal) => {
                    const goalTasks = data.todoItems.filter((item) => item.goalId === goal.id);
                    const doneGoalTasks = goalTasks.filter((item) => !item.active).length;
                    const progressPercent = goalTasks.length
                      ? Math.round((doneGoalTasks / goalTasks.length) * 100)
                      : 0;
                    const linkedNotes = goalNotesForYear.filter((note) => note.goalId === goal.id);

                    return (
                      <div key={goal.id} className="rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-3">
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={goal.completed}
                            onChange={() => toggleGoal(goal.id)}
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-900">{goal.title}</p>
                            <p className="text-xs text-zinc-600">
                              Task progress: {progressPercent}% ({doneGoalTasks}/{goalTasks.length || 0})
                            </p>
                          </div>
                        </label>

                        <div className="mt-2 flex gap-2">
                          <input
                            value={goalTaskDrafts[goal.id] ?? ""}
                            onChange={(event) =>
                              setGoalTaskDrafts((prev) => ({ ...prev, [goal.id]: event.target.value }))
                            }
                            placeholder="Add task for this goal"
                            className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
                          />
                          <button
                            onClick={() => addGoalTask(goal.id)}
                            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
                          >
                            +
                          </button>
                        </div>

                        {goalTasks.length ? (
                          <div className="mt-2 grid gap-1">
                            {goalTasks.map((task) => (
                              <div key={task.id} className="text-xs text-zinc-600">
                                {task.active ? "☐" : "☑"} {task.title}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {linkedNotes.length ? (
                          <div className="mt-2 grid gap-1">
                            {linkedNotes.map((note) => (
                              <p key={note.id} className="text-xs text-zinc-600">
                                {note.content}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-600">No goals in this section.</p>
              )}
            </div>
          ))}

          {!goalsForYear.length ? (
            <p className="text-sm text-zinc-600">No goals for this year yet.</p>
          ) : null}
        </div>
      </SectionCard>
    </AppShell>
  );
}
