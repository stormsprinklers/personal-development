"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import type { CardioType, Exercise, WorkoutSession, WorkoutRoutine } from "@/lib/models";
import { findLastSessionForRoutine, formatShortWorkoutDate } from "@/lib/workout-session-helpers";
import { normalizeMeasurementPreferences, runBikeDistanceUnitAbbr, weightUnitAbbr } from "@/lib/units";
import { todayKey, useAppData } from "@/lib/storage";

const CARDIO_TYPES: CardioType[] = ["run", "bike", "swim"];
const ADD_ROUTINE_OPTION = "__add_routine__";

export default function WorkoutsPage() {
  const { data, ready, upsertWorkoutForDate, setData } = useAppData();
  const router = useRouter();
  const prefs = useMemo(() => normalizeMeasurementPreferences(data.measurementPreferences), [data.measurementPreferences]);
  const weightAbbr = weightUnitAbbr(prefs.weightUnit);
  const distanceAbbr = runBikeDistanceUnitAbbr(prefs.runBikeDistanceUnit);
  const today = todayKey();
  const [workoutDate, setWorkoutDate] = useState(today);
  const [selectedRoutineId, setSelectedRoutineId] = useState("");

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

  function addRoutineAndOpenEditor() {
    const id = crypto.randomUUID();
    setData((prev) => {
      const order = prev.workoutRoutines.length
        ? Math.max(...prev.workoutRoutines.map((r) => r.sortOrder), 0) + 1
        : 0;
      const next: WorkoutRoutine = {
        id,
        name: "New routine",
        strengthExerciseIds: [],
        cardioTypes: ["run"],
        sortOrder: order,
        createdAt: new Date().toISOString(),
      };
      return { ...prev, workoutRoutines: [...prev.workoutRoutines, next] };
    });
    setSelectedRoutineId(id);
    router.push(`/workouts/routines/${id}`);
  }

  function onRoutineSelectChange(value: string) {
    if (value === ADD_ROUTINE_OPTION) {
      addRoutineAndOpenEditor();
      return;
    }
    setSelectedRoutineId(value);
  }

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

  const lastRoutineSession = useMemo(() => {
    if (!currentRoutine) return undefined;
    return findLastSessionForRoutine(
      data.workoutSessions,
      currentRoutine.id,
      currentRoutine.strengthExerciseIds,
      workoutDate,
    );
  }, [data.workoutSessions, currentRoutine, workoutDate]);

  const lastSessionLabel = lastRoutineSession ? formatShortWorkoutDate(lastRoutineSession.date) : null;

  function tagRoutine(s: WorkoutSession): WorkoutSession {
    return currentRoutine ? { ...s, routineId: currentRoutine.id } : s;
  }

  function emptySession(): WorkoutSession {
    return tagRoutine({
      id: crypto.randomUUID(),
      date: workoutDate,
      strengthSets: [],
      cardioEntries: [],
    });
  }

  function addStrengthSet(exerciseId: string) {
    const draft = setDrafts[exerciseId] ?? { weight: "", reps: "" };
    const weight = Number(draft.weight);
    const reps = Number(draft.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return;

    upsertWorkoutForDate(workoutDate, (existing) => {
      const base = existing ?? emptySession();
      return tagRoutine({
        ...base,
        strengthSets: [...base.strengthSets, { id: crypto.randomUUID(), exerciseId, reps, weight }],
      });
    });
    setSetDrafts((prev) => ({ ...prev, [exerciseId]: { weight: "", reps: "" } }));
  }

  function removeStrengthSet(setId: string) {
    upsertWorkoutForDate(workoutDate, (existing) => {
      if (!existing) {
        return tagRoutine({
          id: crypto.randomUUID(),
          date: workoutDate,
          strengthSets: [],
          cardioEntries: [],
        });
      }
      return tagRoutine({ ...existing, strengthSets: existing.strengthSets.filter((s) => s.id !== setId) });
    });
  }

  function addCardioEntry(type: CardioType) {
    const draft = cardioDrafts[type];
    const timeMinutes = Number(draft.time);
    if (!Number.isFinite(timeMinutes) || timeMinutes <= 0) return;

    upsertWorkoutForDate(workoutDate, (existing) => {
      const base = existing ?? emptySession();
      return tagRoutine({
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
      });
    });
    setCardioDrafts((prev) => ({
      ...prev,
      [type]: { ...prev[type], time: "", distance: "", laps: "", incline: "" },
    }));
  }

  function removeCardioEntry(entryId: string) {
    upsertWorkoutForDate(workoutDate, (existing) => {
      if (!existing) {
        return tagRoutine({
          id: crypto.randomUUID(),
          date: workoutDate,
          strengthSets: [],
          cardioEntries: [],
        });
      }
      return tagRoutine({ ...existing, cardioEntries: existing.cardioEntries.filter((e) => e.id !== entryId) });
    });
  }

  function commitBodyWeight() {
    const trimmed = bodyWeightDraft.trim();
    upsertWorkoutForDate(workoutDate, (existing) => {
      const base = existing ?? emptySession();
      if (!trimmed) {
        return tagRoutine({ ...base, bodyWeight: undefined });
      }
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n <= 0) {
        return tagRoutine({ ...base, bodyWeight: undefined });
      }
      return tagRoutine({ ...base, bodyWeight: n });
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

      <SectionCard title={currentRoutine ? `${currentRoutine.name} — log` : "Log workout"}>
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <label className="grid min-w-0 flex-1 gap-1 text-xs font-medium text-sky-800/80">
            Routine for today
            <select
              value={selectedRoutineId}
              onChange={(e) => onRoutineSelectChange(e.target.value)}
              className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
            >
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
              <option value={ADD_ROUTINE_OPTION}>+ Add new routine…</option>
            </select>
          </label>
          {currentRoutine ? (
            <Link
              href={`/workouts/routines/${currentRoutine.id}`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-white text-base text-zinc-700 shadow-sm hover:border-sky-300 hover:bg-sky-50/80"
              aria-label="Edit exercises and cardio for this routine"
              title="Edit routine"
            >
              ✎
            </Link>
          ) : null}
        </div>

        <div className="grid gap-4 text-sm text-zinc-700">
          {!lastRoutineSession && strengthBlocks.length ? (
            <p className="text-xs text-zinc-500">
              After you log this routine once, the previous workout’s sets and weights will show under each exercise.
            </p>
          ) : null}
          {strengthBlocks.map((exercise) => {
            const sets = (sessionForDate?.strengthSets ?? []).filter((set) => set.exerciseId === exercise.id);
            const draft = setDrafts[exercise.id] ?? { weight: "", reps: "" };
            const lastSets = lastRoutineSession
              ? lastRoutineSession.strengthSets.filter((set) => set.exerciseId === exercise.id)
              : [];

            return (
              <div key={exercise.id} className="overflow-hidden rounded-lg border border-sky-200/80">
                <div className="border-b border-sky-200/80 bg-sky-50/70 px-3 py-2 font-medium text-zinc-900">{exercise.name}</div>
                {lastRoutineSession && lastSessionLabel ? (
                  <p className="border-b border-sky-100/80 bg-white/70 px-3 py-2 text-xs leading-relaxed text-zinc-600">
                    {lastSets.length ? (
                      <>
                        <span className="font-medium text-zinc-800">Last time ({lastSessionLabel}):</span>{" "}
                        {lastSets.length} set{lastSets.length !== 1 ? "s" : ""} —{" "}
                        {lastSets.map((s) => `${s.weight} ${weightAbbr} × ${s.reps}`).join(", ")}
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-zinc-800">Last time ({lastSessionLabel}):</span> no sets logged
                        for this exercise.
                      </>
                    )}
                  </p>
                ) : null}
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
                          <td className="px-2 py-2">{set.weight} {weightAbbr}</td>
                          <td className="px-2 py-2">{set.reps}</td>
                          <td className="px-2 py-2 text-right">
                            <button type="button" onClick={() => removeStrengthSet(set.id)} className="text-xs text-sky-800/70 underline hover:text-sky-950">Remove</button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-2 py-2 text-zinc-500">New</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={draft.weight}
                            onChange={(event) => setSetDrafts((prev) => ({ ...prev, [exercise.id]: { ...draft, weight: event.target.value } }))}
                            placeholder={`Weight (${weightAbbr})`}
                            className="w-full rounded border border-sky-200 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={draft.reps}
                            onChange={(event) => setSetDrafts((prev) => ({ ...prev, [exercise.id]: { ...draft, reps: event.target.value } }))}
                            placeholder="Reps"
                            className="w-full rounded border border-sky-200 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button type="button" onClick={() => addStrengthSet(exercise.id)} className="rounded bg-sky-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-700 sm:text-xs">+ Add set</button>
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
                          <td className="px-2 py-2">{cardioType === "swim" ? entry.laps ?? "-" : entry.distance != null ? `${entry.distance} ${distanceAbbr}` : "-"}</td>
                          <td className="px-2 py-2">{entry.timeMinutes} min</td>
                          <td className="px-2 py-2 text-right">
                            <button type="button" onClick={() => removeCardioEntry(entry.id)} className="text-xs text-sky-800/70 underline hover:text-sky-950">Remove</button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-2 py-2">
                          <input
                            value={draft.label}
                            onChange={(event) => setCardioDrafts((prev) => ({ ...prev, [cardioType]: { ...prev[cardioType], label: event.target.value } }))}
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
                                [cardioType]: cardioType === "swim" ? { ...prev[cardioType], laps: event.target.value } : { ...prev[cardioType], distance: event.target.value },
                              }))
                            }
                            placeholder={metricHeader}
                            className="w-full rounded border border-sky-200 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={draft.time}
                            onChange={(event) => setCardioDrafts((prev) => ({ ...prev, [cardioType]: { ...prev[cardioType], time: event.target.value } }))}
                            placeholder="Time (min)"
                            className="w-full rounded border border-sky-200 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button type="button" onClick={() => addCardioEntry(cardioType)} className="rounded bg-sky-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-700 sm:text-xs">+ Add set</button>
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

