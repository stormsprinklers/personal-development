"use client";

import { useMemo, useState } from "react";
import { MeasurementUnitsCard } from "@/components/measurement-units-card";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
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
      workoutSessions: prev.workoutSessions.map((session) => {
        const nextNotes = session.strengthExerciseNotes?.filter((n) => n.exerciseId !== exerciseId);
        return {
          ...session,
          strengthSets: session.strengthSets.filter((set) => set.exerciseId !== exerciseId),
          strengthExerciseNotes: nextNotes?.length ? nextNotes : undefined,
        };
      }),
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
      <SectionCard title="About" inset={false}>
        <p className="ios-card-muted p-4 text-sm text-ios-secondary">
          Configure units and your exercise library here. To change which exercises and cardio blocks belong to a routine, open{" "}
          <strong>Workouts</strong>, pick the routine, and use the edit (pencil) control next to the routine menu.
        </p>
      </SectionCard>

      <MeasurementUnitsCard />

      <SectionCard title="Exercises" inset={false}>
        <div className="ios-card flex flex-wrap items-end gap-2 p-4">
          <input
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            placeholder="New exercise name"
            className="ios-field min-w-0 flex-1 px-3 py-2.5 text-sm"
          />
          <select
            value={newExerciseCategory}
            onChange={(e) => setNewExerciseCategory(e.target.value as ExerciseCategory)}
            className="ios-field px-3 py-2.5 text-sm"
          >
            <option value="strength">Strength</option>
            <option value="run">Run</option>
            <option value="bike">Bike</option>
            <option value="swim">Swim</option>
          </select>
          <GlassButton variant="primary" onClick={createExercise} disabled={!newExerciseName.trim()}>
            Add exercise
          </GlassButton>
        </div>

        <div className="ios-card overflow-hidden">
          {activeExercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className={`px-4 py-3 ${index < activeExercises.length - 1 ? "ios-hairline" : ""}`}
            >
              {editingExerciseId === exercise.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={editingExerciseName}
                    onChange={(e) => setEditingExerciseName(e.target.value)}
                    className="ios-field min-w-0 flex-1 px-3 py-2 text-sm"
                  />
                  <select
                    value={editingExerciseCategory}
                    onChange={(e) => setEditingExerciseCategory(e.target.value as ExerciseCategory)}
                    className="ios-field px-3 py-2 text-sm"
                  >
                    <option value="strength">Strength</option>
                    <option value="run">Run</option>
                    <option value="bike">Bike</option>
                    <option value="swim">Swim</option>
                  </select>
                  <button type="button" onClick={saveExerciseEdits} className="rounded-lg bg-steel px-3 py-2 text-xs font-medium text-white hover:bg-steel/90">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingExerciseId(null)} className="glass-button glass-button-compact rounded-lg px-3 py-2 text-xs font-medium text-ios-secondary">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-ios-label">
                    {exercise.name} <span className="text-xs text-ios-secondary">({exercise.category})</span>
                  </p>
                  <div className="flex gap-2">
                    <GlassButton variant="secondary" className="min-h-9 px-2 py-1 text-xs" onClick={() => startEditExercise(exercise.id)}>
                      Edit
                    </GlassButton>
                    <GlassButton
                      variant="destructive"
                      className="min-h-9 px-2 py-1 text-xs"
                      onClick={() => {
                        if (window.confirm(`Remove exercise "${exercise.name}"?`)) removeExercise(exercise.id);
                      }}
                    >
                      Remove
                    </GlassButton>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!activeExercises.length ? <p className="px-4 py-3 text-sm text-ios-secondary">No exercises yet.</p> : null}
        </div>
      </SectionCard>
    </AppShell>
  );
}
