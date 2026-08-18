"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HealthShell } from "@/components/health/health-shell";
import { RemoveExerciseDialog } from "@/components/health/remove-exercise-dialog";
import { SectionCard } from "@/components/layout/section-card";
import type { CardioType, Exercise, StrengthExerciseNote, WorkoutSession, WorkoutRoutine } from "@/lib/models";
import {
  findLastSessionForExercise,
  formatShortWorkoutDate,
  suggestRoutineIdForDate,
  visibleRoutineStrengthExerciseIds,
  withHiddenStrengthExercise,
  withoutHiddenStrengthExercise,
} from "@/lib/workout-session-helpers";
import { normalizeMeasurementPreferences, runBikeDistanceUnitAbbr, weightUnitAbbr } from "@/lib/units";
import { activeWorkoutRoutines } from "@/lib/workout-routines";
import { useAppData, useTodayKey } from "@/lib/storage";

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

function MinusIcon({ className }: { className?: string }) {
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
      <path d="M5 12h14" />
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

function ChevronUpIcon({ className }: { className?: string }) {
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
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function WorkoutsPage() {
  const { data, ready, upsertWorkoutForDate, setData } = useAppData();
  const router = useRouter();
  const prefs = useMemo(() => normalizeMeasurementPreferences(data.measurementPreferences), [data.measurementPreferences]);
  const weightAbbr = weightUnitAbbr(prefs.weightUnit);
  const distanceAbbr = runBikeDistanceUnitAbbr(prefs.runBikeDistanceUnit);
  const today = useTodayKey();
  const workoutDate = today;
  const [selectedRoutineId, setSelectedRoutineId] = useState("");
  const [addExerciseId, setAddExerciseId] = useState("");
  const [removeExerciseId, setRemoveExerciseId] = useState<string | null>(null);

  const [setDrafts, setSetDrafts] = useState<Record<string, { weight: string; reps: string }>>({});
  const [cardioDrafts, setCardioDrafts] = useState<
    Record<CardioType, { label: string; time: string; distance: string; laps: string; incline: string }>
  >({
    run: { label: "Run", time: "", distance: "", laps: "", incline: "" },
    bike: { label: "Bike", time: "", distance: "", laps: "", incline: "" },
    swim: { label: "Freestyle", time: "", distance: "", laps: "", incline: "" },
  });

  const routines = data.workoutRoutines;
  const activeRoutines = useMemo(() => activeWorkoutRoutines(routines), [routines]);
  const archivedRoutines = useMemo(() => routines.filter((routine) => routine.archived), [routines]);
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
    const suggested = suggestRoutineIdForDate(data.workoutSessions, activeRoutines, workoutDate);
    setSelectedRoutineId(suggested ?? activeRoutines[0]?.id ?? routines[0]?.id ?? "");
  }, [workoutDate, sessionForDate?.routineId, data.workoutSessions, routines, activeRoutines]);

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
        archived: false,
      };
      return { ...prev, workoutRoutines: [...prev.workoutRoutines, next] };
    });
    setSelectedRoutineId(id);
    persistRoutineForDate(id);
    router.push(`/health/workouts/routines/${id}`);
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

  const currentRoutine = routines.find((r) => r.id === selectedRoutineId) ?? activeRoutines[0] ?? routines[0];
  const [bodyWeightDraft, setBodyWeightDraft] = useState("");

  useEffect(() => {
    const w = sessionForDate?.bodyWeight;
    setBodyWeightDraft(w != null && !Number.isNaN(w) ? String(w) : "");
  }, [workoutDate, sessionForDate?.bodyWeight]);

  const strengthBlocks = useMemo(() => {
    if (!currentRoutine) return strengthExercises.slice(0, 2);
    const byId = new Map(strengthExercises.map((e) => [e.id, e]));
    const visibleIds = visibleRoutineStrengthExerciseIds(
      currentRoutine.strengthExerciseIds,
      sessionForDate?.hiddenStrengthExerciseIds,
    );
    return visibleIds.map((id) => byId.get(id)).filter(Boolean) as Exercise[];
  }, [currentRoutine, strengthExercises, sessionForDate?.hiddenStrengthExerciseIds]);

  const exercisesAvailableToAdd = useMemo(() => {
    const shown = new Set(strengthBlocks.map((exercise) => exercise.id));
    return strengthExercises.filter((exercise) => !shown.has(exercise.id));
  }, [strengthBlocks, strengthExercises]);

  const routineCardioTypes = currentRoutine?.cardioTypes?.length ? currentRoutine.cardioTypes : CARDIO_TYPES;

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

  function moveExerciseInRoutine(exerciseId: string, direction: "up" | "down") {
    if (!currentRoutine) return;
    const hidden = new Set(sessionForDate?.hiddenStrengthExerciseIds ?? []);
    setData((prev) => ({
      ...prev,
      workoutRoutines: prev.workoutRoutines.map((routine) => {
        if (routine.id !== currentRoutine.id) return routine;
        const ids = [...routine.strengthExerciseIds];
        const visible = ids.filter((id) => !hidden.has(id));
        const visIndex = visible.indexOf(exerciseId);
        const swapWith = direction === "up" ? visIndex - 1 : visIndex + 1;
        if (visIndex === -1 || swapWith < 0 || swapWith >= visible.length) return routine;
        [visible[visIndex], visible[swapWith]] = [visible[swapWith], visible[visIndex]];
        let cursor = 0;
        const next = ids.map((id) => (hidden.has(id) ? id : visible[cursor++]));
        return { ...routine, strengthExerciseIds: next };
      }),
    }));
  }

  function addExerciseToWorkout(exerciseId: string) {
    if (!currentRoutine || !exerciseId) return;
    setData((prev) => {
      const nextRoutines = prev.workoutRoutines.map((routine) => {
        if (routine.id !== currentRoutine.id) return routine;
        if (routine.strengthExerciseIds.includes(exerciseId)) return routine;
        return { ...routine, strengthExerciseIds: [...routine.strengthExerciseIds, exerciseId] };
      });
      const existing = prev.workoutSessions.find((session) => session.date === workoutDate);
      const hidden = existing?.hiddenStrengthExerciseIds;
      if (!hidden?.includes(exerciseId)) {
        return { ...prev, workoutRoutines: nextRoutines };
      }
      const nextSession = tagRoutine({
        ...(existing ?? emptySession()),
        hiddenStrengthExerciseIds: withoutHiddenStrengthExercise(existing?.hiddenStrengthExerciseIds, exerciseId),
      });
      const rest = prev.workoutSessions.filter((session) => session.date !== workoutDate);
      return {
        ...prev,
        workoutRoutines: nextRoutines,
        workoutSessions: [nextSession, ...rest].sort((a, b) => (a.date < b.date ? 1 : -1)),
      };
    });
    setAddExerciseId("");
  }

  function hideExerciseFromThisWorkout(exerciseId: string) {
    upsertWorkoutForDate(workoutDate, (existing) => {
      const base = existing ?? emptySession();
      return tagRoutine({
        ...base,
        hiddenStrengthExerciseIds: withHiddenStrengthExercise(base.hiddenStrengthExerciseIds, exerciseId),
      });
    });
  }

  function removeExerciseFromFutureWorkouts(exerciseId: string) {
    if (!currentRoutine) {
      hideExerciseFromThisWorkout(exerciseId);
      return;
    }
    setData((prev) => ({
      ...prev,
      workoutRoutines: prev.workoutRoutines.map((routine) =>
        routine.id === currentRoutine.id
          ? { ...routine, strengthExerciseIds: routine.strengthExerciseIds.filter((id) => id !== exerciseId) }
          : routine,
      ),
    }));
  }

  const removeExerciseTarget = strengthExercises.find((exercise) => exercise.id === removeExerciseId);

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

  if (!ready || !workoutDate) {
    return (
      <HealthShell title="Workouts" description="">
        <div className="p-6 text-sm text-ios-secondary">Loading…</div>
      </HealthShell>
    );
  }

  return (
    <HealthShell title="Workouts" description="">
      <SectionCard inset={false}>
        <div className="ios-card p-4">
          <div className="ios-field flex min-w-0 items-center gap-2 py-1 pl-3 pr-2">
            <select
              value={selectedRoutineId}
              onChange={(e) => onRoutineSelectChange(e.target.value)}
              aria-label="Workout routine"
              className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent py-2.5 text-sm font-medium text-ios-label focus:outline-none"
            >
              {activeRoutines.map((routine) => (
                <option key={routine.id} value={routine.id}>
                  {routine.name}
                </option>
              ))}
              {archivedRoutines.length ? (
                <optgroup label="Archived">
                  {archivedRoutines.map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <option value={ADD_ROUTINE_OPTION}>+ Add new routine...</option>
            </select>
          </div>
          <label className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate">
            <span className="shrink-0">Body weight ({weightAbbr})</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={bodyWeightDraft}
              onChange={(e) => setBodyWeightDraft(e.target.value)}
              onBlur={commitBodyWeight}
              placeholder="-"
              className="ios-field min-w-0 flex-1 px-3 py-2.5 text-sm sm:w-28 sm:flex-none"
            />
          </label>
        </div>

        {currentRoutine?.archived ? (
          <p className="mb-4 text-xs text-slate/95">
            This routine is archived. Past workouts are kept. Unarchive it from the routine editor to use it in your active rotation again.
          </p>
        ) : null}

        <div className="grid gap-3 text-sm text-slate">
          {!anyPriorExerciseLog && strengthBlocks.length ? (
            <p className="text-xs text-slate/95">
              After you log an exercise once, your last sets and weights for that exercise will show here, even if it was on a different day or routine.
            </p>
          ) : null}
          {strengthBlocks.map((exercise, blockIndex) => {
            const sets = (sessionForDate?.strengthSets ?? []).filter((set) => set.exerciseId === exercise.id);
            const canReorder =
              Boolean(currentRoutine) &&
              currentRoutine.strengthExerciseIds.length > 0 &&
              currentRoutine.strengthExerciseIds.includes(exercise.id);
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
              <div key={exercise.id} className="ios-card overflow-hidden">
                <div className="flex items-center justify-between gap-2 ios-hairline bg-ios-fill/50 px-3 py-2.5">
                  <span className="min-w-0 text-base font-bold text-ios-label">{exercise.name}</span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setRemoveExerciseId(exercise.id)}
                      className="glass-button glass-button-compact inline-flex h-7 w-7 items-center justify-center rounded-md text-ios-secondary"
                      aria-label={`Remove ${exercise.name} from workout`}
                      title="Remove exercise"
                    >
                      <MinusIcon />
                    </button>
                    {canReorder ? (
                      <>
                        <button
                          type="button"
                          disabled={blockIndex === 0}
                          onClick={() => moveExerciseInRoutine(exercise.id, "up")}
                          className="glass-button glass-button-compact inline-flex h-7 w-7 items-center justify-center rounded-md text-ios-secondary disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Move ${exercise.name} up`}
                          title="Move up"
                        >
                          <ChevronUpIcon />
                        </button>
                        <button
                          type="button"
                          disabled={blockIndex === strengthBlocks.length - 1}
                          onClick={() => moveExerciseInRoutine(exercise.id, "down")}
                          className="glass-button glass-button-compact inline-flex h-7 w-7 items-center justify-center rounded-md text-ios-secondary disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Move ${exercise.name} down`}
                          title="Move down"
                        >
                          <ChevronDownIcon />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                {lastExerciseSession && lastSessionLabel ? (
                  <p className="ios-hairline bg-ios-fill/40 px-3 py-2 text-xs leading-relaxed text-slate">
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
                                className="glass-button glass-button-compact inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ios-secondary"
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
                            className="w-full ios-field px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={draft.reps}
                            onChange={(event) => setSetDrafts((prev) => ({ ...prev, [exercise.id]: { ...draft, reps: event.target.value } }))}
                            placeholder="Reps"
                            className="w-full ios-field px-2 py-1 text-xs sm:text-sm"
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
                              className="glass-button glass-button-compact inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ios-secondary disabled:cursor-not-allowed disabled:opacity-40"
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
                <div className="ios-hairline bg-ios-fill/40 px-3 py-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate/95">Notes (optional)</span>
                    <textarea
                      value={exerciseNote}
                      onChange={(event) => setStrengthExerciseNote(exercise.id, event.target.value)}
                      placeholder="Form cues, how it felt, next target..."
                      rows={2}
                      className="ios-field w-full resize-y px-2 py-1.5 text-xs placeholder:text-slate/60 sm:text-sm"
                    />
                  </label>
                </div>
              </div>
            );
          })}

          {currentRoutine && exercisesAvailableToAdd.length ? (
            <div className="ios-card p-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <select
                  value={addExerciseId}
                  onChange={(event) => setAddExerciseId(event.target.value)}
                  aria-label="Add exercise from list"
                  className="ios-field min-w-0 flex-1 px-3 py-2.5 text-sm text-ios-label"
                >
                  <option value="">Select exercise…</option>
                  {exercisesAvailableToAdd.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => addExerciseToWorkout(addExerciseId)}
                  disabled={!addExerciseId}
                  className="rounded bg-steel px-3 py-2.5 text-sm font-medium text-white hover:bg-steel/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Add exercise
                </button>
              </div>
            </div>
          ) : null}

          {routineCardioTypes.map((cardioType) => {
            const entries = (sessionForDate?.cardioEntries ?? []).filter((entry) => entry.type === cardioType);
            const draft = cardioDrafts[cardioType];
            const nameHeader = cardioType === "swim" ? "Stroke" : "Type";
            const metricHeader = cardioType === "swim" ? "Laps" : `Distance (${distanceAbbr})`;
            const title = cardioType === "swim" ? "Swim" : cardioType === "run" ? "Run" : "Bike";

            return (
              <div key={cardioType} className="ios-card overflow-hidden">
                <div className="ios-hairline bg-ios-fill/50 px-3 py-2.5 text-base font-bold text-ios-label">{title}</div>
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
                            className="w-full ios-field px-2 py-1 text-xs sm:text-sm"
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
                            className="w-full ios-field px-2 py-1 text-xs sm:text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={draft.time}
                            onChange={(event) => setCardioDrafts((prev) => ({ ...prev, [cardioType]: { ...prev[cardioType], time: event.target.value } }))}
                            placeholder="Time (min)"
                            className="w-full ios-field px-2 py-1 text-xs sm:text-sm"
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
      <RemoveExerciseDialog
        open={Boolean(removeExerciseTarget)}
        exerciseName={removeExerciseTarget?.name ?? "this exercise"}
        onClose={() => setRemoveExerciseId(null)}
        onThisWorkout={() => {
          if (!removeExerciseId) return;
          hideExerciseFromThisWorkout(removeExerciseId);
          setRemoveExerciseId(null);
        }}
        onThisAndFuture={() => {
          if (!removeExerciseId) return;
          removeExerciseFromFutureWorkouts(removeExerciseId);
          setRemoveExerciseId(null);
        }}
      />
    </HealthShell>
  );
}

