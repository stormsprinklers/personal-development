"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import type { WorkoutSession } from "@/lib/models";
import { todayKey, useAppData } from "@/lib/storage";

export default function WorkoutsPage() {
  const { data, ready, setData, upsertWorkoutForDate } = useAppData();
  const today = todayKey();
  const [workoutDate, setWorkoutDate] = useState(today);

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

  const strengthExercises = useMemo(
    () => data.exercises.filter((exercise) => exercise.category === "strength" && !exercise.archived),
    [data.exercises],
  );

  const sessionForDate = data.workoutSessions.find((s) => s.date === workoutDate);

  function emptySession(): WorkoutSession {
    return { id: crypto.randomUUID(), date: workoutDate, strengthSets: [], cardioEntries: [] };
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

  function toggleArchiveExercise(exerciseId: string) {
    setData((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, archived: !ex.archived } : ex,
      ),
    }));
  }

  function addStrengthSet() {
    if (!strengthExerciseId) return;
    upsertWorkoutForDate(workoutDate, (existing) => {
      const base = existing ?? emptySession();
      return {
        ...base,
        strengthSets: [
          ...base.strengthSets,
          { id: crypto.randomUUID(), exerciseId: strengthExerciseId, reps: Number(reps), weight: Number(weight) },
        ],
      };
    });
  }

  function removeStrengthSet(setId: string) {
    upsertWorkoutForDate(workoutDate, (existing) => {
      if (!existing) {
        return { id: crypto.randomUUID(), date: workoutDate, strengthSets: [], cardioEntries: [] };
      }
      return { ...existing, strengthSets: existing.strengthSets.filter((s) => s.id !== setId) };
    });
  }

  function addCardioEntry() {
    upsertWorkoutForDate(workoutDate, (existing) => {
      const base = existing ?? emptySession();
      return {
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
    });
  }

  function removeCardioEntry(entryId: string) {
    upsertWorkoutForDate(workoutDate, (existing) => {
      if (!existing) {
        return { id: crypto.randomUUID(), date: workoutDate, strengthSets: [], cardioEntries: [] };
      }
      return { ...existing, cardioEntries: existing.cardioEntries.filter((e) => e.id !== entryId) };
    });
  }

  if (!ready) return <div className="p-6">Loading workouts...</div>;

  return (
    <AppShell
      title="Workouts"
      description="Track strength and cardio by day, including body weight and session notes."
    >
      <SectionCard title="Workout day" subtitle="Pick any date to log or review that day&apos;s session.">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-zinc-600">
            Date{" "}
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              className="ml-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
            />
          </label>
          <button
            type="button"
            onClick={() => setWorkoutDate(today)}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-sky-50"
          >
            Today
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Exercise library" subtitle="Add exercises for your strength dropdown; archive to hide from the list.">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <input
            value={exerciseName}
            onChange={(event) => setExerciseName(event.target.value)}
            placeholder="Exercise name"
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          />
          <select
            value={exerciseCategory}
            onChange={(event) => setExerciseCategory(event.target.value as "strength" | "run" | "bike" | "swim")}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          >
            <option value="strength">Strength</option>
            <option value="run">Run</option>
            <option value="bike">Bike</option>
            <option value="swim">Swim</option>
          </select>
          <button onClick={addExercise} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700">
            Add exercise
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-sky-200/80">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-sky-50 text-xs uppercase text-sky-800/70">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.exercises.map((exercise) => (
                <tr key={exercise.id} className="border-t border-sky-100">
                  <td className="px-3 py-2">{exercise.name}</td>
                  <td className="px-3 py-2 text-zinc-600">{exercise.category}</td>
                  <td className="px-3 py-2 text-zinc-600">{exercise.archived ? "Archived" : "Active"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleArchiveExercise(exercise.id)}
                      className="text-xs font-medium text-sky-800/80 underline hover:text-sky-950"
                    >
                      {exercise.archived ? "Unarchive" : "Archive"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Session notes" subtitle="Optional notes for this workout day (saved as you type).">
        <textarea
          value={sessionForDate?.notes ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            upsertWorkoutForDate(workoutDate, (existing) => {
              const base = existing ?? emptySession();
              return { ...base, notes: v === "" ? undefined : v };
            });
          }}
          rows={3}
          placeholder="Recovery, sleep, pain, programming notes..."
          className="min-h-[72px] w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
        />
      </SectionCard>

      <SectionCard title="Strength log" subtitle="Sets, reps, and weight for the selected day.">
        <div className="grid gap-3 md:grid-cols-5">
          <select
            value={strengthExerciseId}
            onChange={(event) => setStrengthExerciseId(event.target.value)}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
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
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
            placeholder="Weight"
          />
          <input
            type="number"
            value={reps}
            onChange={(event) => setReps(Number(event.target.value))}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
            placeholder="Reps"
          />
          <button onClick={addStrengthSet} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700">
            Add set
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Cardio log" subtitle="Run (time, distance, incline), bike (time, distance), swim (laps, time).">
        <div className="grid gap-3 md:grid-cols-6">
          <select
            value={cardioType}
            onChange={(event) => setCardioType(event.target.value as "run" | "bike" | "swim")}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          >
            <option value="run">Run</option>
            <option value="bike">Bike</option>
            <option value="swim">Swim</option>
          </select>
          <input
            type="number"
            value={timeMinutes}
            onChange={(event) => setTimeMinutes(Number(event.target.value))}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
            placeholder="Time (min)"
          />
          {(cardioType === "run" || cardioType === "bike") && (
            <input
              type="number"
              step="0.1"
              value={distance}
              onChange={(event) => setDistance(Number(event.target.value))}
              className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
              placeholder="Distance"
            />
          )}
          {cardioType === "run" && (
            <input
              type="number"
              step="0.1"
              value={incline}
              onChange={(event) => setIncline(Number(event.target.value))}
              className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
              placeholder="Incline"
            />
          )}
          {cardioType === "swim" && (
            <input
              type="number"
              value={laps}
              onChange={(event) => setLaps(Number(event.target.value))}
              className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
              placeholder="Laps"
            />
          )}
          <button onClick={addCardioEntry} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white shadow-sm shadow-sky-200/50 hover:bg-sky-700">
            Add cardio
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Body weight" subtitle="Log your weight for the selected day (trends on the dashboard).">
        <input
          type="number"
          value={sessionForDate?.bodyWeight != null ? sessionForDate.bodyWeight : ""}
          onChange={(e) => {
            const raw = e.target.value;
            upsertWorkoutForDate(workoutDate, (existing) => {
              const base = existing ?? emptySession();
              if (raw === "") return { ...base, bodyWeight: undefined };
              const n = Number(raw);
              return { ...base, bodyWeight: Number.isFinite(n) ? n : base.bodyWeight };
            });
          }}
          className="max-w-xs rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          placeholder="Body weight"
        />
      </SectionCard>

      <SectionCard title="Entries for this day" subtitle="Strength sets and cardio blocks logged on the selected date.">
        <div className="grid gap-2 text-sm text-zinc-700">
          {sessionForDate?.strengthSets.map((set) => {
            const name = data.exercises.find((exercise) => exercise.id === set.exerciseId)?.name ?? "Exercise";
            return (
              <div key={set.id} className="flex items-center justify-between rounded-lg border border-sky-200/80 px-3 py-2">
                <span>
                  {name}: {set.weight} × {set.reps}
                </span>
                <button
                  type="button"
                  onClick={() => removeStrengthSet(set.id)}
                  className="text-xs text-sky-800/70 underline hover:text-sky-950"
                >
                  Remove
                </button>
              </div>
            );
          })}
          {sessionForDate?.cardioEntries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-lg border border-sky-200/80 px-3 py-2">
              <span>
                {entry.type.toUpperCase()} — {entry.timeMinutes} min
                {entry.distance != null ? `, ${entry.distance} distance` : ""}
                {entry.incline != null ? `, incline ${entry.incline}` : ""}
                {entry.laps != null ? `, ${entry.laps} laps` : ""}
              </span>
              <button
                type="button"
                onClick={() => removeCardioEntry(entry.id)}
                className="text-xs text-sky-800/70 underline hover:text-sky-950"
              >
                Remove
              </button>
            </div>
          ))}
          {!sessionForDate && <p className="text-zinc-600">No workout entries for this day yet.</p>}
          {sessionForDate && !sessionForDate.strengthSets.length && !sessionForDate.cardioEntries.length ? (
            <p className="text-zinc-600">No sets or cardio yet for this day.</p>
          ) : null}
        </div>
      </SectionCard>
    </AppShell>
  );
}
