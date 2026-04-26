"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import type { CardioType, WorkoutSession } from "@/lib/models";
import { todayKey, useAppData } from "@/lib/storage";

type WorkoutTemplate = {
  name: string;
  strengthKeywords: string[];
  cardioTypes: CardioType[];
};

const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  { name: "Leg Day", strengthKeywords: ["squat", "deadlift", "lunge"], cardioTypes: ["swim"] },
  { name: "Push Day", strengthKeywords: ["bench", "press", "dip"], cardioTypes: ["run"] },
  { name: "Pull Day", strengthKeywords: ["row", "pull", "deadlift"], cardioTypes: ["bike"] },
  { name: "Cardio Day", strengthKeywords: [], cardioTypes: ["run", "bike", "swim"] },
];

export default function WorkoutsPage() {
  const { data, ready, upsertWorkoutForDate } = useAppData();
  const today = todayKey();
  const [workoutDate, setWorkoutDate] = useState(today);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("Leg Day");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");

  const [setDrafts, setSetDrafts] = useState<Record<string, { weight: string; reps: string }>>({});
  const [cardioDrafts, setCardioDrafts] = useState<
    Record<CardioType, { label: string; time: string; distance: string; laps: string; incline: string }>
  >({
    run: { label: "Run", time: "", distance: "", laps: "", incline: "" },
    bike: { label: "Bike", time: "", distance: "", laps: "", incline: "" },
    swim: { label: "Freestyle", time: "", distance: "", laps: "", incline: "" },
  });

  const strengthExercises = useMemo(
    () => data.exercises.filter((exercise) => exercise.category === "strength" && !exercise.archived),
    [data.exercises],
  );

  const sessionForDate = data.workoutSessions.find((s) => s.date === workoutDate);
  const selectedTemplateConfig =
    WORKOUT_TEMPLATES.find((template) => template.name === selectedTemplate) ?? WORKOUT_TEMPLATES[0];
  const templateStrengthExercises = useMemo(
    () =>
      strengthExercises.filter((exercise) =>
        selectedTemplateConfig.strengthKeywords.some((keyword) =>
          exercise.name.toLowerCase().includes(keyword),
        ),
      ),
    [selectedTemplateConfig, strengthExercises],
  );
  const strengthBlocks = templateStrengthExercises.length ? templateStrengthExercises : strengthExercises.slice(0, 2);
  const formattedDate = new Date(`${workoutDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
        strengthSets: [
          ...base.strengthSets,
          { id: crypto.randomUUID(), exerciseId, reps, weight },
        ],
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

  if (!ready) return <div className="p-6">Loading workouts...</div>;

  return (
    <AppShell
      title="Workouts"
      description=""
    >
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
        </div>
      </SectionCard>

      <SectionCard title={`${selectedTemplate} [change workout]`}>
        <div className="mb-4">
          <select
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value)}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          >
            {WORKOUT_TEMPLATES.map((template) => (
              <option key={template.name} value={template.name}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

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
                        <th className="px-2 py-2 text-left">Weight</th>
                        <th className="px-2 py-2 text-left">Reps</th>
                        <th className="px-2 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sets.map((set, index) => (
                        <tr key={set.id} className="border-b border-sky-100/80">
                          <td className="px-2 py-2">Set {index + 1}</td>
                          <td className="px-2 py-2">{set.weight}</td>
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
                            placeholder="Weight"
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
          {selectedTemplateConfig.cardioTypes.map((cardioType) => {
            const entries = (sessionForDate?.cardioEntries ?? []).filter((entry) => entry.type === cardioType);
            const draft = cardioDrafts[cardioType];
            const nameHeader = cardioType === "swim" ? "Stroke" : "Type";
            const metricHeader = cardioType === "swim" ? "Laps" : "Distance";
            const title = cardioType === "swim" ? "Swim" : cardioType === "run" ? "Run" : "Bike";

            return (
              <div key={cardioType} className="overflow-hidden rounded-lg border border-sky-200/80">
                <div className="border-b border-sky-200/80 bg-sky-50/70 px-3 py-2 font-medium text-zinc-900">
                  {title}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] table-fixed text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-sky-100 text-sky-800/80">
                        <th className="px-2 py-2 text-left">{nameHeader}</th>
                        <th className="px-2 py-2 text-left">{metricHeader}</th>
                        <th className="px-2 py-2 text-left">Time</th>
                        <th className="px-2 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-b border-sky-100/80">
                          <td className="px-2 py-2">{cardioType === "swim" ? draft.label : cardioType.toUpperCase()}</td>
                          <td className="px-2 py-2">{cardioType === "swim" ? entry.laps ?? "-" : entry.distance ?? "-"}</td>
                          <td className="px-2 py-2">{entry.timeMinutes}</td>
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
                            placeholder="Time"
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

          <div className="mt-2">
            <select
              value={selectedExerciseId}
              onChange={(event) => setSelectedExerciseId(event.target.value)}
              className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">[Select Exercise]</option>
              {strengthExercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
