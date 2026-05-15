"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import type { CardioType, WorkoutRoutine } from "@/lib/models";
import { useAppData } from "@/lib/storage";

const CARDIO_TYPES: CardioType[] = ["run", "bike", "swim"];

export default function EditWorkoutRoutinePage() {
  const params = useParams();
  const routineId = typeof params.routineId === "string" ? params.routineId : "";
  const router = useRouter();
  const { ready, data, setData } = useAppData();
  const [addExistingExerciseId, setAddExistingExerciseId] = useState("");

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
          <label className="grid gap-1 text-xs font-medium text-sky-800/80">
            Name
            <input
              value={currentRoutine.name}
              onChange={(e) => setRoutineName(e.target.value)}
              className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
            />
          </label>
          {routines.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete routine “${currentRoutine.name}”?`)) deleteRoutine();
              }}
              className="w-fit rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              Delete routine
            </button>
          ) : null}
        </div>

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
                      <button type="button" onClick={() => removeExerciseFromRoutine(id)} className="text-sky-800/80 hover:text-red-700" aria-label={`Remove ${ex?.name ?? "exercise"}`}>
                        ×
                      </button>
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
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
            >
              Add to routine
            </button>
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

        <p className="mt-4 text-xs text-zinc-500">
          Manage the exercise library under{" "}
          <Link href="/workouts/settings" className="font-medium text-sky-800 underline hover:text-sky-950">
            Workout settings
          </Link>
          .
        </p>
      </SectionCard>
    </AppShell>
  );
}
