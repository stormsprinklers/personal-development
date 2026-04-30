"use client";

import { useEffect, useMemo, useState } from "react";
import { MeasurementUnitsCard } from "@/components/measurement-units-card";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import type { CardioType, Exercise, ExerciseCategory, WorkoutRoutine } from "@/lib/models";
import { useAppData } from "@/lib/storage";

const CARDIO_TYPES: CardioType[] = ["run", "bike", "swim"];

export default function WorkoutSettingsPage() {
  const { ready, data, setData } = useAppData();
  const [selectedRoutineId, setSelectedRoutineId] = useState("");
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory>("strength");
  const [addExistingExerciseId, setAddExistingExerciseId] = useState("");
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingExerciseName, setEditingExerciseName] = useState("");
  const [editingExerciseCategory, setEditingExerciseCategory] = useState<ExerciseCategory>("strength");

  const routines = data.workoutRoutines;
  const activeExercises = useMemo(() => data.exercises.filter((e) => !e.archived), [data.exercises]);
  const strengthExercises = useMemo(
    () => activeExercises.filter((exercise) => exercise.category === "strength"),
    [activeExercises],
  );

  useEffect(() => {
    if (!routines.length) return;
    if (!selectedRoutineId || !routines.some((r) => r.id === selectedRoutineId)) {
      setSelectedRoutineId(routines[0].id);
    }
  }, [routines, selectedRoutineId]);

  const currentRoutine = routines.find((r) => r.id === selectedRoutineId) ?? routines[0];

  const exercisesNotInRoutine = useMemo(() => {
    if (!currentRoutine) return strengthExercises;
    const set = new Set(currentRoutine.strengthExerciseIds);
    return strengthExercises.filter((e) => !set.has(e.id));
  }, [currentRoutine, strengthExercises]);

  function updateRoutine(routineId: string, updater: (r: WorkoutRoutine) => WorkoutRoutine) {
    setData((prev) => ({
      ...prev,
      workoutRoutines: prev.workoutRoutines.map((r) => (r.id === routineId ? updater(r) : r)),
    }));
  }

  function addRoutine() {
    const name = newRoutineName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    setData((prev) => {
      const order = prev.workoutRoutines.length
        ? Math.max(...prev.workoutRoutines.map((r) => r.sortOrder), 0) + 1
        : 0;
      const next: WorkoutRoutine = {
        id,
        name,
        strengthExerciseIds: [],
        cardioTypes: ["run"],
        sortOrder: order,
        createdAt: new Date().toISOString(),
      };
      return { ...prev, workoutRoutines: [...prev.workoutRoutines, next] };
    });
    setSelectedRoutineId(id);
    setNewRoutineName("");
  }

  function deleteRoutine(routineId: string) {
    if (data.workoutRoutines.length <= 1) return;
    setData((prev) => ({
      ...prev,
      workoutRoutines: prev.workoutRoutines.filter((r) => r.id !== routineId),
    }));
    if (selectedRoutineId === routineId) setSelectedRoutineId("");
  }

  function addExistingExerciseToRoutine() {
    if (!currentRoutine || !addExistingExerciseId) return;
    if (currentRoutine.strengthExerciseIds.includes(addExistingExerciseId)) return;
    updateRoutine(currentRoutine.id, (r) => ({
      ...r,
      strengthExerciseIds: [...r.strengthExerciseIds, addExistingExerciseId],
    }));
    setAddExistingExerciseId("");
  }

  function removeExerciseFromRoutine(exerciseId: string) {
    if (!currentRoutine) return;
    updateRoutine(currentRoutine.id, (r) => ({
      ...r,
      strengthExerciseIds: r.strengthExerciseIds.filter((id) => id !== exerciseId),
    }));
  }

  function createExerciseAndMaybeAddToRoutine() {
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
    setData((prev) => {
      const nextExercises = [exercise, ...prev.exercises];
      const nextRoutines =
        currentRoutine && exercise.category === "strength"
          ? prev.workoutRoutines.map((r) =>
              r.id === currentRoutine.id ? { ...r, strengthExerciseIds: [...r.strengthExerciseIds, id] } : r,
            )
          : prev.workoutRoutines;
      return { ...prev, exercises: nextExercises, workoutRoutines: nextRoutines };
    });
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

  function toggleRoutineCardio(type: CardioType) {
    if (!currentRoutine) return;
    updateRoutine(currentRoutine.id, (r) => {
      const has = r.cardioTypes.includes(type);
      const nextTypes = has ? r.cardioTypes.filter((t) => t !== type) : [...r.cardioTypes, type];
      if (nextTypes.length === 0) return r;
      return { ...r, cardioTypes: nextTypes };
    });
  }

  if (!ready) return <div className="p-6">Loading...</div>;

  return (
    <AppShell title="Workout settings" description="Units, exercises, and routine configuration.">
      <SectionCard title="About">
        <p className="text-sm text-zinc-600">
          Configure units, exercises, and workout routines here. Your Workouts page is focused on daily logging.
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
            onClick={createExerciseAndMaybeAddToRoutine}
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
                  <button type="button" onClick={saveExerciseEdits} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700">Save</button>
                  <button type="button" onClick={() => setEditingExerciseId(null)} className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-sky-50">Cancel</button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-zinc-900">
                    {exercise.name} <span className="text-xs text-sky-800/70">({exercise.category})</span>
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEditExercise(exercise.id)} className="rounded-md border border-sky-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-sky-50">Edit</button>
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

      <SectionCard title="Workout routines">
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs font-medium text-sky-800/80">
            Active routine
            <select
              value={selectedRoutineId}
              onChange={(e) => setSelectedRoutineId(e.target.value)}
              className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-800"
            >
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {routines.length > 1 ? (
            <button type="button" onClick={() => currentRoutine && deleteRoutine(currentRoutine.id)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50">
              Delete routine
            </button>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-sky-200/80 bg-sky-50/40 p-3">
          <input
            value={newRoutineName}
            onChange={(e) => setNewRoutineName(e.target.value)}
            placeholder="New routine name"
            className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm"
          />
          <button type="button" onClick={addRoutine} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">Add routine</button>
        </div>

        {currentRoutine ? (
          <div className="grid gap-3 rounded-lg border border-sky-200/80 bg-white/80 p-3">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-sky-800/70">Strength exercises</p>
              {currentRoutine.strengthExerciseIds.length ? (
                <ul className="flex flex-wrap gap-2">
                  {currentRoutine.strengthExerciseIds.map((id) => {
                    const ex = activeExercises.find((e) => e.id === id);
                    return (
                      <li key={id} className="flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50/80 px-2 py-1 text-xs text-zinc-800">
                        <span>{ex?.name ?? id}</span>
                        <button type="button" onClick={() => removeExerciseFromRoutine(id)} className="text-sky-800/80 hover:text-red-700">×</button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">No exercises yet.</p>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs font-medium text-sky-800/80">
                Add strength exercise to routine
                <select
                  value={addExistingExerciseId}
                  onChange={(e) => setAddExistingExerciseId(e.target.value)}
                  className="min-w-[12rem] rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-800"
                >
                  <option value="">Select strength exercise?</option>
                  {exercisesNotInRoutine.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={addExistingExerciseToRoutine} disabled={!addExistingExerciseId} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40">Add to routine</button>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-sky-800/70">Cardio blocks for this routine</p>
              <div className="flex flex-wrap gap-3">
                {CARDIO_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" checked={currentRoutine.cardioTypes.includes(type)} onChange={() => toggleRoutineCardio(type)} />
                    {type === "run" ? "Run" : type === "bike" ? "Bike" : "Swim"}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </AppShell>
  );
}
