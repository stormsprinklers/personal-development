"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import type { CardioType, Exercise, ExerciseCategory, WorkoutRoutine } from "@/lib/models";
import { useAppData } from "@/lib/storage";

const CARDIO_TYPES: CardioType[] = ["run", "bike", "swim"];

export default function EditWorkoutRoutinePage() {
  const params = useParams();
  const routineId = typeof params.routineId === "string" ? params.routineId : "";
  const router = useRouter();
  const { ready, data, setData } = useAppData();
  const [addExistingExerciseId, setAddExistingExerciseId] = useState("");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory>("strength");

  const routines = data.workoutRoutines;
  const currentRoutine = routines.find((r) => r.id === routineId);

  const activeExercises = useMemo(() => data.exercises.filter((e) => !e.archived), [data.exercises]);
  const strengthExercises = useMemo(
    () => activeExercises.filter((exercise) => exercise.category === "strength"),
    [activeExercises],
  );

  useEffect(() => {
    if (!ready || !routineId) return;
    if (!currentRoutine) router.replace("/workouts");
  }, [ready, routineId, currentRoutine, router]);

  const exercisesNotInRoutine = useMemo(() => {
    if (!currentRoutine) return strengthExercises;
    const set = new Set(currentRoutine.strengthExerciseIds);
    return strengthExercises.filter((e) => !set.has(e.id));
  }, [currentRoutine, strengthExercises]);

  function updateRoutine(updater: (r: WorkoutRoutine) => WorkoutRoutine) {
    if (!currentRoutine) return;
    setData((prev) => ({
      ...prev,
      workoutRoutines: prev.workoutRoutines.map((r) => (r.id === currentRoutine.id ? updater(r) : r)),
    }));
  }

  function setRoutineName(name: string) {
    if (!currentRoutine) return;
    updateRoutine((r) => ({ ...r, name: name.trim() || r.name }));
  }

  function deleteRoutine() {
    if (!currentRoutine || data.workoutRoutines.length <= 1) return;
    setData((prev) => ({
      ...prev,
      workoutRoutines: prev.workoutRoutines.filter((r) => r.id !== currentRoutine.id),
    }));
    router.push("/workouts");
  }

  function addExistingExerciseToRoutine() {
    if (!currentRoutine || !addExistingExerciseId) return;
    if (currentRoutine.strengthExerciseIds.includes(addExistingExerciseId)) return;
    updateRoutine((r) => ({
      ...r,
      strengthExerciseIds: [...r.strengthExerciseIds, addExistingExerciseId],
    }));
    setAddExistingExerciseId("");
  }

  function createExerciseAndAddToRoutine() {
    const name = newExerciseName.trim();
    if (!currentRoutine || !name) return;
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
        newExerciseCategory === "strength"
          ? prev.workoutRoutines.map((r) =>
              r.id === currentRoutine.id ? { ...r, strengthExerciseIds: [...r.strengthExerciseIds, id] } : r,
            )
          : prev.workoutRoutines;
      return { ...prev, exercises: nextExercises, workoutRoutines: nextRoutines };
    });
    setNewExerciseName("");
    setNewExerciseCategory("strength");
  }

  function removeExerciseFromRoutine(exerciseId: string) {
    if (!currentRoutine) return;
    updateRoutine((r) => ({
      ...r,
      strengthExerciseIds: r.strengthExerciseIds.filter((id) => id !== exerciseId),
    }));
  }

  function toggleRoutineCardio(type: CardioType) {
    if (!currentRoutine) return;
    updateRoutine((r) => {
      const has = r.cardioTypes.includes(type);
      const nextTypes = has ? r.cardioTypes.filter((t) => t !== type) : [...r.cardioTypes, type];
      if (nextTypes.length === 0) return r;
      return { ...r, cardioTypes: nextTypes };
    });
  }

  if (!ready) return <div className="p-6">Loading...</div>;
  if (!currentRoutine) return <div className="p-6">Redirecting…</div>;

  return (
    <AppShell title="Edit routine" description="">
      <SectionCard title="Routine">
        <div className="mb-4 grid gap-2">
          <label className="grid gap-1 text-xs font-medium text-slate/80">
            Name
            <input
              value={currentRoutine.name}
              onChange={(e) => setRoutineName(e.target.value)}
              className="rounded-lg border border-slate/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
            />
          </label>
          {routines.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete routine “${currentRoutine.name}”?`)) deleteRoutine();
              }}
              className="w-fit rounded-lg border border-copper/30 bg-white px-3 py-2 text-sm text-copper hover:bg-copper/10"
            >
              Delete routine
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-lg border border-slate/30/80 bg-white/80 p-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate/80">Strength exercises</p>
            {currentRoutine.strengthExerciseIds.length ? (
              <ul className="flex flex-wrap gap-2">
                {currentRoutine.strengthExerciseIds.map((id) => {
                  const ex = activeExercises.find((e) => e.id === id);
                  return (
                    <li key={id} className="flex items-center gap-1 rounded-full border border-slate/30 bg-steel/5 px-2 py-1 text-xs text-charcoal">
                      <span>{ex?.name ?? id}</span>
                      <button type="button" onClick={() => removeExerciseFromRoutine(id)} className="text-slate/80 hover:text-copper" aria-label={`Remove ${ex?.name ?? "exercise"}`}>
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-slate/80">No exercises yet.</p>
            )}
          </div>

          <div className="rounded-lg border border-slate/30/80 bg-steel/5 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate/80">Create new exercise</p>
            <div className="flex min-w-0 flex-wrap items-end gap-2">
              <input
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="Exercise name"
                className="min-w-0 flex-1 rounded-lg border border-slate/30 bg-white px-3 py-2 text-sm focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
              />
              <select
                value={newExerciseCategory}
                onChange={(e) => setNewExerciseCategory(e.target.value as ExerciseCategory)}
                className="rounded-lg border border-slate/30 bg-white px-3 py-2 text-sm text-charcoal"
              >
                <option value="strength">Strength</option>
                <option value="run">Run</option>
                <option value="bike">Bike</option>
                <option value="swim">Swim</option>
              </select>
              <button
                type="button"
                onClick={createExerciseAndAddToRoutine}
                disabled={!newExerciseName.trim()}
                className="rounded-lg bg-charcoal px-3 py-2 text-sm font-medium text-white hover:bg-charcoal/90 disabled:opacity-40"
              >
                Create and add
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-slate/80">
              Strength exercises are added to this routine automatically. Other types are saved to your library only (this routine&apos;s strength list is separate).
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs font-medium text-slate/80">
              Add strength exercise to routine
              <select
                value={addExistingExerciseId}
                onChange={(e) => setAddExistingExerciseId(e.target.value)}
                className="min-w-[12rem] rounded-lg border border-slate/30 bg-white px-3 py-2 text-sm text-charcoal"
              >
                <option value="">Select strength exercise…</option>
                {exercisesNotInRoutine.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={addExistingExerciseToRoutine}
              disabled={!addExistingExerciseId}
              className="rounded-lg bg-steel px-3 py-2 text-sm font-medium text-white hover:bg-steel/90 disabled:opacity-40"
            >
              Add to routine
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate/80">Cardio blocks for this routine</p>
            <div className="flex flex-wrap gap-3">
              {CARDIO_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-slate">
                  <input type="checkbox" checked={currentRoutine.cardioTypes.includes(type)} onChange={() => toggleRoutineCardio(type)} />
                  {type === "run" ? "Run" : type === "bike" ? "Bike" : "Swim"}
                </label>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate/80">
          Manage the exercise library under{" "}
          <Link href="/workouts/settings" className="font-medium text-steel underline hover:text-charcoal">
            Workout settings
          </Link>
          .
        </p>
      </SectionCard>
    </AppShell>
  );
}
