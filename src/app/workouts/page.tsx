"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import type { CardioType, Exercise, StrengthExerciseNote, WorkoutSession, WorkoutRoutine } from "@/lib/models";
import {
  findLastSessionForExercise,
  formatShortWorkoutDate,
  suggestRoutineIdForDate,
} from "@/lib/workout-session-helpers";
import { normalizeMeasurementPreferences, runBikeDistanceUnitAbbr, weightUnitAbbr } from "@/lib/units";
import { todayKey, useAppData } from "@/lib/storage";

const CARDIO_TYPES: CardioType[] = ["run", "bike", "swim"];
const ADD_ROUTINE_OPTION = "__add_routine__";

function mergeStrengthExerciseNotes(
  notes: StrengthExerciseNote[] | undefined,
  exerciseId: string,
  rawNote: string,
): StrengthExerciseNote[] | undefined {
  const others = (notes ?? []).filter((n) => n.exerciseId !== exerciseId);
  if (!rawNote.trim()) return others.length ? others : undefined;
  return [...others, { exerciseId, note: rawNote }];
}

function EditRoutineIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function DuplicateSetIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

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

  const sessionForDate = data.workoutSessions.find((s) => s.date === workoutDate);

  useEffect(() => {
    if (!routines.length) return;
    const saved = sessionForDate?.routineId;
    if (saved && routines.some((r) => r.id === saved)) {
      setSelectedRoutineId(saved);
      return;
    }
    const suggested = suggestRoutineIdForDate(data.workoutSessions, routines, workoutDate);
    setSelectedRoutineId(suggested ?? routines[0].id);
  }, [workoutDate, sessionForDate?.routineId, data.workoutSessions, routines]);

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
    persistRoutineForDate(id);
    router.push(`/workouts/routines/${id}`);
  }

  function persistRoutineForDate(routineId: string) {
    upsertWorkoutForDate(workoutDate, (existing) => {
      if (existing) return { ...existing, routineId };
      return {
        id: crypto.randomUUID(),
        date: workoutDate,
        strengthSets: [],
        cardioEntries: [],
        routineId,
      };
    });
  }

  function onRoutineSelectChange(value: string) {
    if (value === ADD_ROUTINE_OPTION) {
      addRoutineAndOpenEditor();
      return;
    }
    setSelectedRoutineId(value);
    persistRoutineForDate(value);
  }

  const currentRoutine = routines.find((r) => r.id === selectedRoutineId) ?? routines[0];
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

  const lastSessionByExerciseId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof findLastSessionForExercise>>();
    for (const exercise of strengthBlocks) {
      const session = findLastSessionForExercise(data.workoutSessions, exercise.id, workoutDate);
      if (session) map.set(exercise.id, session);
    }
    return map;
  }, [data.workoutSessions, strengthBlocks, workoutDate]);

  const anyPriorExerciseLog = lastSessionByExerciseId.size > 0;

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

  function setStrengthExerciseNote(exerciseId: string, rawNote: string) {
    upsertWorkoutForDate(workoutDate, (existing) => {
      const base = existing ?? emptySession();
      const strengthExerciseNotes = mergeStrengthExerciseNotes(base.strengthExerciseNotes, exerciseId, rawNote);
      return tagRoutine({ ...base, strengthExerciseNotes });
    });
  }

  function appendStrengthSet(exerciseId: string, weight: number, reps: number) {
    upsertWorkoutForDate(workoutDate, (existing) => {
      const base = existing ?? emptySession();
      return tagRoutine({
        ...base,
        strengthSets: [...base.strengthSets, { id: crypto.randomUUID(), exerciseId, reps, weight }],
      });
    });
  }

  function addStrengthSet(exerciseId: string) {
    const draft = setDrafts[exerciseId] ?? { weight: "", reps: "" };
    const weight = Number(draft.weight);
    const reps = Number(draft.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return;

    appendStrengthSet(exerciseId, weight, reps);
    setSetDrafts((prev) => ({ ...prev, [exerciseId]: { weight: "", reps: "" } }));
  }

  function duplicateStrengthSet(exerciseId: string, weight: number, reps: number) {
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return;
    appendStrengthSet(exerciseId, weight, reps);
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
          <label className="relative inline-flex cursor-pointer items-center rounded-lg border border-slate/50 bg-white px-3 py-2 text-sm text-slate hover:bg-steel/10">
            {formattedDate}
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              max={today}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-slate sm:flex-initial">
            <span className="shrink-0">Body weight ({weightAbbr})</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={bodyWeightDraft}
              onChange={(e) => setBodyWeightDraft(e.target.value)}
              onBlur={commitBodyWeight}
              placeholder="-"
              className="min-w-0 flex-1 rounded-lg border border-slate/50 bg-white px-3 py-2 text-sm focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25 sm:w-28 sm:flex-none"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title={currentRoutine ? `${currentRoutine.name} - log` : "Log workout"}>
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <label className="grid min-w-0 flex-1 gap-1 text-xs font-medium text-slate/95">
            Routine for today
            <select
              value={selectedRoutineId}
              onChange={(e) => onRoutineSelectChange(e.target.value)}
              className="w-full rounded-lg border border-slate/50 bg-white px-3 py-2 text-sm text-charcoal focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
            >
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
              <option value={ADD_ROUTINE_OPTION}>+ Add new routine...</option>
            </select>
          </label>
          {currentRoutine ? (
            <Link
              href={`/workouts/routines/${currentRoutine.id}`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate/50 bg-white text-base text-slate shadow-sm hover:border-steel/40 hover:bg-steel/10"
              aria-label="Edit exercises and cardio for this routine"
              title="Edit routine"
            >
              <EditRoutineIcon />
            </Link>
          ) : null}
        </div>

        <div className="grid gap-4 text-sm text-slate">
          {!anyPriorExerciseLog && strengthBlocks.length ? (
            <p className="text-xs text-slate/95">
              After you log an exercise once, your last sets and weights for that exercise will show here, even if it was on a different day or routine.
            </p>
          ) : null}
          {strengthBlocks.map((exercise) => {
            const sets = (sessionForDate?.strengthSets ?? []).filter((set) => set.exerciseId === exercise.id);
            const draft = setDrafts[exercise.id] ?? { weight: "", reps: "" };
            const lastExerciseSession = lastSessionByExerciseId.get(exercise.id);
            const lastSessionLabel = lastExerciseSession
              ? formatShortWorkoutDate(lastExerciseSession.date)
              : null;
            const lastSets = lastExerciseSession
              ? lastExerciseSession.strengthSets.filter((set) => set.exerciseId === exercise.id)
              : [];
            const lastNoteRaw =
              lastExerciseSession?.strengthExerciseNotes?.find((n) => n.exerciseId === exercise.id)?.note ?? "";
            const lastNoteTrim = lastNoteRaw.trim();
            const exerciseNote =
              sessionForDate?.strengthExerciseNotes?.find((n) => n.exerciseId === exercise.id)?.note ?? "";
            const lastTodaySet = sets[sets.length - 1];
            const lastPriorSet = lastSets[lastSets.length - 1];
            const draftWeight = Number(draft.weight);
            const draftReps = Number(draft.reps);
            const duplicateSource =
              lastTodaySet ??
              (Number.isFinite(draftWeight) && Number.isFinite(draftReps) && draftWeight > 0 && draftReps > 0
                ? { weight: draftWeight, reps: draftReps }
                : null) ??
              lastPriorSet;

            return (
              <div key={exercise.id} className="overflow-hidden rounded-lg border border-slate/45">
                <div className="border-b border-slate/45 bg-steel/10 px-3 py-2 font-medium text-charcoal">{exercise.name}</div>
                {lastExerciseSession && lastSessionLabel ? (
                  <p className="border-b border-slate/40 bg-white/70 px-3 py-2 text-xs leading-relaxed text-slate">
                    <span className="font-medium text-charcoal">Last time ({lastSessionLabel}):</span>{" "}
                    {lastSets.length ? (
                      <>
                        {lastSets.length} set{lastSets.length !== 1 ? "s" : ""}:{" "}
                        {lastSets.map((s) => `${s.weight} ${weightAbbr} x ${s.reps}`).join(", ")}
                      </>
                    ) : (
                      <span>No sets logged for this exercise.</span>
                    )}
                    {lastNoteTrim ? (
                      <span className="mt-1.5 block text-slate">
                        <span className="font-medium text-charcoal">Note:</span>{" "}
                        <span className="whitespace-pre-wrap">{lastNoteTrim}</span>
                      </span>
                    ) : null}
                  </p>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] table-fixed text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate/40 text-slate/95">
                        <th className="px-2 py-2 text-left">Set</th>
                        <th className="px-2 py-2 text-left">Weight ({weightAbbr})</th>
                        <th className="px-2 py-2 text-left">Reps</th>
                        <th className="px-2 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sets.map((set, index) => (
                        <tr key={set.id} className="border-b border-slate/40">
                          <td className="px-2 py-2">Set {index + 1}</td>
                          <td className="px-2 py-2">{set.weight} {weightAbbr}</td>
                          <td className="px-2 py-2">{set.reps}</td>
                          <td className="px-2 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => duplicateStrengthSet(exercise.id, set.weight, set.reps)}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate/50 bg-white text-slate hover:border-steel/40 hover:bg-steel/10"
                                aria-label={`Duplicate set ${index + 1}`}
                                title="Duplicate set"
                              >
                                <DuplicateSetIcon />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeStrengthSet(set.id)}
                                className="text-xs text-slate/95 underline hover:text-charcoal"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-2 py-2 text-slate/95">New</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={draft.weight}
                            onChange={(event) => setSetDrafts((prev) => ({ ...prev, [exercise.id]: { ...draft, weight: event.target.value } }))}
                            placeholder={`Weight (${weightAbbr})`}
                            className="w-full rounded border border-slate/50 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={draft.reps}
                            onChange={(event) => setSetDrafts((prev) => ({ ...prev, [exercise.id]: { ...draft, reps: event.target.value } }))}
                            placeholder="Reps"
                            className="w-full rounded border border-slate/50 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={!duplicateSource}
                              onClick={() => {
                                if (!duplicateSource) return;
                                duplicateStrengthSet(exercise.id, duplicateSource.weight, duplicateSource.reps);
                              }}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate/50 bg-white text-slate hover:border-steel/40 hover:bg-steel/10 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Duplicate last set"
                              title="Duplicate last set"
                            >
                              <DuplicateSetIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => addStrengthSet(exercise.id)}
                              className="rounded bg-steel px-2 py-1 text-[11px] font-medium text-white hover:bg-steel/90 sm:text-xs"
                            >
                              + Add set
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate/40 bg-steel/10 px-3 py-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate/95">Notes (optional)</span>
                    <textarea
                      value={exerciseNote}
                      onChange={(event) => setStrengthExerciseNote(exercise.id, event.target.value)}
                      placeholder="Form cues, how it felt, next target..."
                      rows={2}
                      className="w-full resize-y rounded-md border border-slate/50 bg-white px-2 py-1.5 text-xs text-charcoal placeholder:text-slate/60 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25 sm:text-sm"
                    />
                  </label>
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
              <div key={cardioType} className="overflow-hidden rounded-lg border border-slate/45">
                <div className="border-b border-slate/45 bg-steel/10 px-3 py-2 font-medium text-charcoal">{title}</div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] table-fixed text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate/40 text-slate/95">
                        <th className="px-2 py-2 text-left">{nameHeader}</th>
                        <th className="px-2 py-2 text-left">{metricHeader}</th>
                        <th className="px-2 py-2 text-left">Time (min)</th>
                        <th className="px-2 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-b border-slate/40">
                          <td className="px-2 py-2">{cardioType === "swim" ? draft.label : cardioType.toUpperCase()}</td>
                          <td className="px-2 py-2">{cardioType === "swim" ? entry.laps ?? "-" : entry.distance != null ? `${entry.distance} ${distanceAbbr}` : "-"}</td>
                          <td className="px-2 py-2">{entry.timeMinutes} min</td>
                          <td className="px-2 py-2 text-right">
                            <button type="button" onClick={() => removeCardioEntry(entry.id)} className="text-xs text-slate/95 underline hover:text-charcoal">Remove</button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-2 py-2">
                          <input
                            value={draft.label}
                            onChange={(event) => setCardioDrafts((prev) => ({ ...prev, [cardioType]: { ...prev[cardioType], label: event.target.value } }))}
                            placeholder={nameHeader}
                            className="w-full rounded border border-slate/50 bg-white px-2 py-1 text-xs sm:text-sm"
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
                            className="w-full rounded border border-slate/50 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={draft.time}
                            onChange={(event) => setCardioDrafts((prev) => ({ ...prev, [cardioType]: { ...prev[cardioType], time: event.target.value } }))}
                            placeholder="Time (min)"
                            className="w-full rounded border border-slate/50 bg-white px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button type="button" onClick={() => addCardioEntry(cardioType)} className="rounded bg-steel px-2 py-1 text-[11px] font-medium text-white hover:bg-steel/90 sm:text-xs">+ Add set</button>
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

