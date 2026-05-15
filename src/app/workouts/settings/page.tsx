"use client";

import { useMemo, useState } from "react";
import { MeasurementUnitsCard } from "@/components/measurement-units-card";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import type { Exercise, ExerciseCategory } from "@/lib/models";
import { useAppData } from "@/lib/storage";

export default function WorkoutSettingsPage() {
  const { ready, data, setData } = useAppData();
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory>("strength");
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState("");
  const [editingExerciseCategory, setEditingExerciseCategory] = useState<ExerciseCategory>("strength");

  const activeExercises = useMemo(() => data.exercises.filter((e) => !e.archived), [data.exercises]);

  function createExercise() {
    const name = newExerciseName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    const exercise: Exercise = {
      id,
      name,
      category: newExerciseCategory,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      exercises: [exercise, ...prev.exercises],
    }));
    setNewExerciseName("");
    setNewExerciseCategory("strength");
  }

  function startEditExercise(exerciseId: string) {
    const ex = activeExercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    setEditingExerciseId(ex.id);
    setEditingExerciseName(ex.name);
    setEditingExerciseCategory(ex.category);
  }

  function saveExerciseEdits() {
    if (!editingExerciseId || !editingExerciseName.trim()) return;
    setData((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id === editingExerciseId
          ? { ...exercise, name: editingExerciseName.trim(), category: editingExerciseCategory }
          : exercise,
      ),
    }));
    setEditingExerciseId(null);
    setEditingExerciseName("");
  }

  function removeExercise(exerciseId: string) {
    setData((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((exercise) => exercise.id !== exerciseId),
      workoutRoutines: prev.workoutRoutines.map((routine) => ({
        ...routine,
        strengthExerciseIds: routine.strengthExerciseIds.filter((id) => id !== exerciseId),
      })),
      workoutSessions: prev.workoutSessions.map((session) => ({
        ...session,
        strengthSets: session.strengthSets.filter((set) => set.exerciseId !== exerciseId),
      })),
      goals: prev.goals.map((goal) =>
        goal.linkedExerciseId === exerciseId
          ? {
              ...goal,
              linkedExerciseId: undefined,
              exerciseStartValue: undefined,
              exerciseTargetValue: undefined,
            }
          : goal,
      ),
    }));
    if (editingExerciseId === exerciseId) {
      setEditingExerciseId(null);
      setEditingExerciseName("");
    }
  }

  if (!ready) return <div className="p-6">Loading...</div>;

  return (
    <AppShell title="Workout settings" description="Units and exercise library.">
      <SectionCard title="About">
        <p className="text-sm text-zinc-600">
          Configure units and your exercise library here. To change which exercises and cardio blocks belong to a routine, open{" "}
          <strong>Workouts</strong>, pick the routine, and use the edit (✎) control next to the routine menu.
        </p>
      </SectionCard>

      <MeasurementUnitsCard />

      <SectionCard title="Exercises">
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-sky-200/80 bg-sky-50/40 p-3">
          <input
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            placeholder="New exercise name"
            className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <select
            value={newExerciseCategory}
            onChange={(e) => setNewExerciseCategory(e.target.value as ExerciseCategory)}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-800"
          >
            <option value="strength">Strength</option>
            <option value="run">Run</option>
            <option value="bike">Bike</option>
            <option value="swim">Swim</option>
          </select>
          <button
            type="button"
            onClick={createExercise}
            disabled={!newExerciseName.trim()}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            Add exercise
          </button>
        </div>

        <div className="grid gap-2">
          {activeExercises.map((exercise) => (
            <div key={exercise.id} className="rounded-lg border border-sky-200/80 bg-sky-50/30 px-3 py-2">
              {editingExerciseId === exercise.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={editingExerciseName}
                    onChange={(e) => setEditingExerciseName(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm"
                  />
                  <select
                    value={editingExerciseCategory}
                    onChange={(e) => setEditingExerciseCategory(e.target.value as ExerciseCategory)}
                    className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="strength">Strength</option>
                    <option value="run">Run</option>
                    <option value="bike">Bike</option>
                    <option value="swim">Swim</option>
                  </select>
                  <button type="button" onClick={saveExerciseEdits} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingExerciseId(null)} className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-sky-50">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-zinc-900">
                    {exercise.name} <span className="text-xs text-sky-800/70">({exercise.category})</span>
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEditExercise(exercise.id)} className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-sky-50">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove exercise "${exercise.name}"?`)) removeExercise(exercise.id);
                      }}
                      className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!activeExercises.length ? <p className="text-sm text-zinc-600">No exercises yet.</p> : null}
        </div>
      </SectionCard>
    </AppShell>
  );
}
