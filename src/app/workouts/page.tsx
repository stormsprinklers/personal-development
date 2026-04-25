"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { todayKey, useAppData } from "@/lib/storage";

export default function WorkoutsPage() {
  const { data, ready, setData } = useAppData();
  const today = todayKey();
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseCategory, setExerciseCategory] = useState<"strength" | "run" | "bike" | "swim">("strength");
  const [strengthExerciseId, setStrengthExerciseId] = useState("");
  const [reps, setReps] = useState(5);
  const [weight, setWeight] = useState(135);
  const [cardioType, setCardioType] = useState<"run" | "bike" | "swim">("run");
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [distance, setDistance] = useState(3);
  const [incline, setIncline] = useState(1);
  const [laps, setLaps] = useState(20);
  const [bodyWeight, setBodyWeight] = useState(180);

  const strengthExercises = useMemo(
    () => data.exercises.filter((exercise) => exercise.category === "strength" && !exercise.archived),
    [data.exercises],
  );

  const todaySession = data.workoutSessions.find((session) => session.date === today);

  function ensureTodaySession() {
    return todaySession ?? { id: crypto.randomUUID(), date: today, strengthSets: [], cardioEntries: [] };
  }

  function saveTodaySession(nextSession: ReturnType<typeof ensureTodaySession>) {
    setData((prev) => {
      const remaining = prev.workoutSessions.filter((session) => session.date !== today);
      return { ...prev, workoutSessions: [nextSession, ...remaining] };
    });
  }

  function addExercise() {
    if (!exerciseName.trim()) return;
    setData((prev) => ({
      ...prev,
      exercises: [
        {
          id: crypto.randomUUID(),
          name: exerciseName.trim(),
          category: exerciseCategory,
          archived: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.exercises,
      ],
    }));
    setExerciseName("");
  }

  function addStrengthSet() {
    if (!strengthExerciseId) return;
    const base = ensureTodaySession();
    const next = {
      ...base,
      strengthSets: [
        ...base.strengthSets,
        { id: crypto.randomUUID(), exerciseId: strengthExerciseId, reps: Number(reps), weight: Number(weight) },
      ],
    };
    saveTodaySession(next);
  }

  function addCardioEntry() {
    const base = ensureTodaySession();
    const next = {
      ...base,
      cardioEntries: [
        ...base.cardioEntries,
        {
          id: crypto.randomUUID(),
          type: cardioType,
          timeMinutes: Number(timeMinutes),
          distance: cardioType === "run" || cardioType === "bike" ? Number(distance) : undefined,
          incline: cardioType === "run" ? Number(incline) : undefined,
          laps: cardioType === "swim" ? Number(laps) : undefined,
        },
      ],
    };
    saveTodaySession(next);
  }

  function saveBodyWeight() {
    const base = ensureTodaySession();
    saveTodaySession({ ...base, bodyWeight: Number(bodyWeight) });
  }

  if (!ready) return <div className="p-6">Loading workouts...</div>;

  return (
    <AppShell
      title="Workouts"
      description="Track strength and cardio sessions with daily body weight."
    >
      <SectionCard title="Exercise Library" subtitle="Manage your personal exercise dropdown options.">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={exerciseName}
            onChange={(event) => setExerciseName(event.target.value)}
            placeholder="Exercise name"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <select
            value={exerciseCategory}
            onChange={(event) => setExerciseCategory(event.target.value as "strength" | "run" | "bike" | "swim")}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="strength">Strength</option>
            <option value="run">Run</option>
            <option value="bike">Bike</option>
            <option value="swim">Swim</option>
          </select>
          <button onClick={addExercise} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
            Add Exercise
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Today's Strength Log" subtitle="Add sets, reps, and weight for lifting exercises.">
        <div className="grid gap-3 md:grid-cols-5">
          <select
            value={strengthExerciseId}
            onChange={(event) => setStrengthExerciseId(event.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Select exercise</option>
            {strengthExercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={weight}
            onChange={(event) => setWeight(Number(event.target.value))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Weight"
          />
          <input
            type="number"
            value={reps}
            onChange={(event) => setReps(Number(event.target.value))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Reps"
          />
          <button onClick={addStrengthSet} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
            Add Set
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Today's Cardio Log" subtitle="Track run, bike, or swim sessions.">
        <div className="grid gap-3 md:grid-cols-6">
          <select
            value={cardioType}
            onChange={(event) => setCardioType(event.target.value as "run" | "bike" | "swim")}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="run">Run</option>
            <option value="bike">Bike</option>
            <option value="swim">Swim</option>
          </select>
          <input
            type="number"
            value={timeMinutes}
            onChange={(event) => setTimeMinutes(Number(event.target.value))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Time (min)"
          />
          {(cardioType === "run" || cardioType === "bike") && (
            <input
              type="number"
              step="0.1"
              value={distance}
              onChange={(event) => setDistance(Number(event.target.value))}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Distance"
            />
          )}
          {cardioType === "run" && (
            <input
              type="number"
              step="0.1"
              value={incline}
              onChange={(event) => setIncline(Number(event.target.value))}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Incline"
            />
          )}
          {cardioType === "swim" && (
            <input
              type="number"
              value={laps}
              onChange={(event) => setLaps(Number(event.target.value))}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Laps"
            />
          )}
          <button onClick={addCardioEntry} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
            Add Cardio
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Today's Body Weight" subtitle="Save your current body weight for trend tracking.">
        <div className="flex max-w-sm gap-3">
          <input
            type="number"
            value={bodyWeight}
            onChange={(event) => setBodyWeight(Number(event.target.value))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Body weight"
          />
          <button onClick={saveBodyWeight} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
            Save
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Today's Entries" subtitle="Recent set and cardio rows for the selected date.">
        <div className="grid gap-2 text-sm text-zinc-700">
          {todaySession?.strengthSets.map((set) => {
            const exerciseName = data.exercises.find((exercise) => exercise.id === set.exerciseId)?.name ?? "Exercise";
            return (
              <div key={set.id} className="rounded-lg border border-zinc-200 px-3 py-2">
                {exerciseName}: {set.weight} x {set.reps}
              </div>
            );
          })}
          {todaySession?.cardioEntries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-zinc-200 px-3 py-2">
              {entry.type.toUpperCase()} - {entry.timeMinutes} min
              {entry.distance ? `, ${entry.distance} distance` : ""}
              {entry.incline ? `, incline ${entry.incline}` : ""}
              {entry.laps ? `, ${entry.laps} laps` : ""}
            </div>
          ))}
          {!todaySession && <p className="text-zinc-600">No workout entries for today yet.</p>}
        </div>
      </SectionCard>
    </AppShell>
  );
}
