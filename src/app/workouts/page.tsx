"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import type { CardioType, Exercise, ExerciseCategory, WorkoutRoutine, WorkoutSession } from "@/lib/models";
import { normalizeMeasurementPreferences, runBikeDistanceUnitAbbr, weightUnitAbbr } from "@/lib/units";
import { todayKey, useAppData } from "@/lib/storage";

const CARDIO_TYPES: CardioType[] = ["run", "bike", "swim"];

export default function WorkoutsPage() {
  const { data, ready, upsertWorkoutForDate, setData } = useAppData();
  const prefs = useMemo(() => normalizeMeasurementPreferences(data.measurementPreferences), [data.measurementPreferences]);
  const weightAbbr = weightUnitAbbr(prefs.weightUnit);
  const distanceAbbr = runBikeDistanceUnitAbbr(prefs.runBikeDistanceUnit);
  const today = todayKey();
  const [workoutDate, setWorkoutDate] = useState(today);
  const [selectedRoutineId, setSelectedRoutineId] = useState("");
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory>("strength");
  const [addExistingExerciseId, setAddExistingExerciseId] = useState("");

  const [setDrafts, setSetDrafts] = useState<Record<string, { weight: string; reps: string }>>({});
  const [cardioDrafts, setCardioDrafts] = useState<
    Record<CardioType, { label: string; time: string; distance: string; laps: string; incline: string }>
  >({
    run: { label: "Run", time: "", distance: "", laps: "", incline: "" },
    bike: { label: "Bike", time: "", distance: "", laps: "", incline: "" },
    swim: { label: "Freestyle", time: "", distance: "", laps: "", incline: "" },
  });

  const routines = data.workoutRoutines;
  const strengthExercises = useMemo(
    () => data.exercises.filter((exercise) => exercise.category === "strength" && !exercise.archived),
    [data.exercises],
  );

  useEffect(() => {
    if (!routines.length) return;
    setSelectedRoutineId((prev) => (prev && routines.some((r) => r.id === prev) ? prev : routines[0].id));
  }, [routines]);

  const currentRoutine = routines.find((r) => r.id === selectedRoutineId) ?? routines[0];
  const sessionForDate = data.workoutSessions.find((s) => s.date === workoutDate);
  const [bodyWeightDraft, setBodyWeightDraft] = useState("");

  useEffect(() => {
    const w = sessionForDate?.bodyWeight;
    setBodyWeightDraft(w != null && !Number.isNaN(w) ? String(w) : "");
  }, [workoutDate, sessionForDate?.bodyWeight]);

  const strengthBlocks = useMemo(() => {
    if (!currentRoutine) return strengthExercises.slice(0, 2);
    const byId = new Map(strengthExercises.map((e) => [e.id, e]));
    const ordered = currentRoutine.strengthExerciseIds.map((id) => byId.get(id)).filter(Boolean) as Exercise[];
    return ordered.length ? ordered : strengthExercises.slice(0, 2);
  }, [currentRoutine, strengthExercises]);

  const routineCardioTypes = currentRoutine?.cardioTypes?.length ? currentRoutine.cardioTypes : CARDIO_TYPES;

  const formattedDate = new Date(`${workoutDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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

  function createExerciseAndAddToRoutine() {
    const name = newExerciseName.trim();
    if (!name || !currentRoutine) return;
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
      const nextRoutines = prev.workoutRoutines.map((r) =>
        r.id === currentRoutine.id && exercise.category === "strength"
          ? { ...r, strengthExerciseIds: [...r.strengthExerciseIds, id] }
          : r,
      );
      return { ...prev, exercises: nextExercises, workoutRoutines: nextRoutines };
    });
    setNewExerciseName("");
    setNewExerciseCategory("strength");
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

  function emptySession(): WorkoutSession {
    return { id: crypto.randomUUID(), date: workoutDate, strengthSets: [], cardioEntries: [] };
  }

  function addStrengthSet(exerciseId: string) {
    const draft = setDrafts[exerciseId] ?? { weight: "", reps: "" };
    const weight = Number(draft.weight);
    const reps = Number(draft.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return;

    upsertWorkoutForDate(workoutDate, (existing) => {
      const base = existing ?? emptySession();
      return {
        ...base,
        strengthSets: [...base.strengthSets, { id: crypto.randomUUID(), exerciseId, reps, weight }],
      };
    });
    setSetDrafts((prev) => ({ ...prev, [exerciseId]: { weight: "", reps: "" } }));
  }

  function removeStrengthSet(setId: string) {
    upsertWorkoutForDate(workoutDate, (existing) => {
      if (!existing) {
        return { id: crypto.randomUUID(), date: workoutDate, strengthSets: [], cardioEntries: [] };
      }
      return { ...existing, strengthSets: existing.strengthSets.filter((s) => s.id !== setId) };
    });
  }

  function addCardioEntry(type: CardioType) {
    const draft = cardioDrafts[type];
    const timeMinutes = Number(draft.time);
    if (!Number.isFinite(timeMinutes) || timeMinutes <= 0) return;

    upsertWorkoutForDate(workoutDate, (existing) => {
      const base = existing ?? emptySession();
      return {
        ...base,
        cardioEntries: [
          ...base.cardioEntries,
          {
            id: crypto.randomUUID(),
            type,
            timeMinutes,
            distance: type === "run" || type === "bike" ? Number(draft.distance) || undefined : undefined,
            incline: type === "run" ? Number(draft.incline) || undefined : undefined,
            laps: type === "swim" ? Number(draft.laps) || undefined : undefined,
          },
        ],
      };
    });
    setCardioDrafts((prev) => ({
      ...prev,
      [type]: { ...prev[type], time: "", distance: "", laps: "", incline: "" },
    }));
  }

  function removeCardioEntry(entryId: string) {
    upsertWorkoutForDate(workoutDate, (existing) => {
      if (!existing) {
        return { id: crypto.randomUUID(), date: workoutDate, strengthSets: [], cardioEntries: [] };
      }
      return { ...existing, cardioEntries: existing.cardioEntries.filter((e) => e.id !== entryId) };
    });
  }

  function commitBodyWeight() {
    const trimmed = bodyWeightDraft.trim();
    upsertWorkoutForDate(workoutDate, (existing) => {
      const base = existing ?? emptySession();
      if (!trimmed) {
        return { ...base, bodyWeight: undefined };
      }
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n <= 0) {
        return { ...base, bodyWeight: undefined };
      }
      return { ...base, bodyWeight: n };
    });
  }

  if (!ready) return <div className="p-6">Loading workouts...</div>;

  return (
    <AppShell title="Workouts" description="">
      <SectionCard title={formattedDate}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-sky-50">
            {formattedDate}
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              max={today}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-zinc-700 sm:flex-initial">
            <span className="shrink-0">Body weight ({weightAbbr})</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={bodyWeightDraft}
              onChange={(e) => setBodyWeightDraft(e.target.value)}
              onBlur={commitBodyWeight}
              placeholder="—"
              className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80 sm:w-28 sm:flex-none"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Workout routines">
        <p className="mb-3 text-sm text-zinc-600">
          Pick a routine for logging below, add exercises from the library or create new ones, and choose which cardio
          blocks appear.
        </p>
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs font-medium text-sky-800/80">
            Active routine
            <select
              value={selectedRoutineId}
              onChange={(e) => setSelectedRoutineId(e.target.value)}
              className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
            >
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {routines.length > 1 ? (
            <button
              type="button"
              onClick={() => currentRoutine && deleteRoutine(currentRoutine.id)}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              Delete routine
            </button>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-sky-200/80 bg-sky-50/40 p-3">
          <input
            value={newRoutineName}
            onChange={(e) => setNewRoutineName(e.target.value)}
            placeholder="New routine name"
            className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <button
            type="button"
            onClick={addRoutine}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Add routine
          </button>
        </div>

        {currentRoutine ? (
          <div className="mb-4 grid gap-3 rounded-lg border border-sky-200/80 bg-white/80 p-3">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-sky-800/70">Strength exercises</p>
              {currentRoutine.strengthExerciseIds.length ? (
                <ul className="flex flex-wrap gap-2">
                  {currentRoutine.strengthExerciseIds.map((id) => {
                    const ex = data.exercises.find((e) => e.id === id);
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50/80 px-2 py-1 text-xs text-zinc-800"
                      >
                        <span>{ex?.name ?? id}</span>
                        <button
                          type="button"
                          onClick={() => removeExerciseFromRoutine(id)}
                          className="text-sky-800/80 hover:text-red-700"
                          aria-label={`Remove ${ex?.name ?? "exercise"} from routine`}
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">No exercises yet — add from the library or create a new one.</p>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs font-medium text-sky-800/80">
                Add from library
                <select
                  value={addExistingExerciseId}
                  onChange={(e) => setAddExistingExerciseId(e.target.value)}
                  className="min-w-[12rem] rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
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

            <div className="flex flex-wrap items-end gap-2 border-t border-sky-100 pt-3">
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
                <option value="strength">Strength (sets & reps)</option>
                <option value="run">Run</option>
                <option value="bike">Bike</option>
                <option value="swim">Swim</option>
              </select>
              <button
                type="button"
                onClick={createExerciseAndAddToRoutine}
                disabled={!newExerciseName.trim()}
                className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
              >
                Create &amp; add
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Strength exercises appear in this routine&apos;s log blocks. Run/bike/swim entries use the cardio tables
              below; creating a cardio-type exercise saves it for goals and filters but add cardio via the tables.
            </p>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-sky-800/70">Cardio blocks for this routine</p>
              <div className="flex flex-wrap gap-3">
                {CARDIO_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={currentRoutine.cardioTypes.includes(type)}
                      onChange={() => toggleRoutineCardio(type)}
                    />
                    {type === "run" ? "Run" : type === "bike" ? "Bike" : "Swim"}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title={currentRoutine ? `${currentRoutine.name} — log` : "Log workout"}>
        <div className="grid gap-4 text-sm text-zinc-700">
          {strengthBlocks.map((exercise) => {
            const sets = (sessionForDate?.strengthSets ?? []).filter((set) => set.exerciseId === exercise.id);
            const draft = setDrafts[exercise.id] ?? { weight: "", reps: "" };

            return (
              <div key={exercise.id} className="overflow-hidden rounded-lg border border-sky-200/80">
                <div className="border-b border-sky-200/80 bg-sky-50/70 px-3 py-2 font-medium text-zinc-900">
                  {exercise.name}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] table-fixed text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-sky-100 text-sky-800/80">
                        <th className="px-2 py-2 text-left">Set</th>
                        <th className="px-2 py-2 text-left">Weight ({weightAbbr})</th>
                        <th className="px-2 py-2 text-left">Reps</th>
                        <th className="px-2 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sets.map((set, index) => (
                        <tr key={set.id} className="border-b border-sky-100/80">
                          <td className="px-2 py-2">Set {index + 1}</td>
                          <td className="px-2 py-2">
                            {set.weight} {weightAbbr}
                          </td>
                          <td className="px-2 py-2">{set.reps}</td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeStrengthSet(set.id)}
                              className="text-xs text-sky-800/70 underline hover:text-sky-950"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-2 py-2 text-zinc-500">New</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={draft.weight}
                            onChange={(event) =>
                              setSetDrafts((prev) => ({
                                ...prev,
                                [exercise.id]: { ...draft, weight: event.target.value },
                              }))
                            }
                            placeholder={`Weight (${weightAbbr})`}
                            className="w-full rounded border border-sky-200 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={draft.reps}
                            onChange={(event) =>
                              setSetDrafts((prev) => ({
                                ...prev,
                                [exercise.id]: { ...draft, reps: event.target.value },
                              }))
                            }
                            placeholder="Reps"
                            className="w-full rounded border border-sky-200 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => addStrengthSet(exercise.id)}
                            className="rounded bg-sky-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-700 sm:text-xs"
                          >
                            + Add set
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {routineCardioTypes.map((cardioType) => {
            const entries = (sessionForDate?.cardioEntries ?? []).filter((entry) => entry.type === cardioType);
            const draft = cardioDrafts[cardioType];
            const nameHeader = cardioType === "swim" ? "Stroke" : "Type";
            const metricHeader = cardioType === "swim" ? "Laps" : `Distance (${distanceAbbr})`;
            const title = cardioType === "swim" ? "Swim" : cardioType === "run" ? "Run" : "Bike";

            return (
              <div key={cardioType} className="overflow-hidden rounded-lg border border-sky-200/80">
                <div className="border-b border-sky-200/80 bg-sky-50/70 px-3 py-2 font-medium text-zinc-900">{title}</div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] table-fixed text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-sky-100 text-sky-800/80">
                        <th className="px-2 py-2 text-left">{nameHeader}</th>
                        <th className="px-2 py-2 text-left">{metricHeader}</th>
                        <th className="px-2 py-2 text-left">Time (min)</th>
                        <th className="px-2 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-b border-sky-100/80">
                          <td className="px-2 py-2">{cardioType === "swim" ? draft.label : cardioType.toUpperCase()}</td>
                          <td className="px-2 py-2">
                            {cardioType === "swim"
                              ? entry.laps ?? "-"
                              : entry.distance != null
                                ? `${entry.distance} ${distanceAbbr}`
                                : "-"}
                          </td>
                          <td className="px-2 py-2">{entry.timeMinutes} min</td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeCardioEntry(entry.id)}
                              className="text-xs text-sky-800/70 underline hover:text-sky-950"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-2 py-2">
                          <input
                            value={draft.label}
                            onChange={(event) =>
                              setCardioDrafts((prev) => ({
                                ...prev,
                                [cardioType]: { ...prev[cardioType], label: event.target.value },
                              }))
                            }
                            placeholder={nameHeader}
                            className="w-full rounded border border-sky-200 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={cardioType === "swim" ? draft.laps : draft.distance}
                            onChange={(event) =>
                              setCardioDrafts((prev) => ({
                                ...prev,
                                [cardioType]:
                                  cardioType === "swim"
                                    ? { ...prev[cardioType], laps: event.target.value }
                                    : { ...prev[cardioType], distance: event.target.value },
                              }))
                            }
                            placeholder={metricHeader}
                            className="w-full rounded border border-sky-200 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={draft.time}
                            onChange={(event) =>
                              setCardioDrafts((prev) => ({
                                ...prev,
                                [cardioType]: { ...prev[cardioType], time: event.target.value },
                              }))
                            }
                            placeholder="Time (min)"
                            className="w-full rounded border border-sky-200 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => addCardioEntry(cardioType)}
                            className="rounded bg-sky-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-700 sm:text-xs"
                          >
                            + Add set
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </AppShell>
  );
}
