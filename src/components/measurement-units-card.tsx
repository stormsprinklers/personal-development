"use client";

import { SectionCard } from "@/components/layout/section-card";
import type { MeasurementPreferences, RunBikeDistanceUnit, WeightUnit } from "@/lib/models";
import { normalizeMeasurementPreferences } from "@/lib/units";
import { useAppData } from "@/lib/storage";

export function MeasurementUnitsCard() {
  const { data, setData } = useAppData();
  const prefs = normalizeMeasurementPreferences(data.measurementPreferences);

  function patch(next: Partial<MeasurementPreferences>) {
    setData((prev) => ({
      ...prev,
      measurementPreferences: normalizeMeasurementPreferences({
        ...normalizeMeasurementPreferences(prev.measurementPreferences),
        ...next,
      }),
    }));
  }

  return (
    <SectionCard title="Units">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-zinc-700">
          <span className="text-xs font-medium uppercase tracking-wide text-sky-800/70">Strength & body weight</span>
          <select
            value={prefs.weightUnit}
            onChange={(e) => patch({ weightUnit: e.target.value as WeightUnit })}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          >
            <option value="lb">Pounds (lb)</option>
            <option value="kg">Kilograms (kg)</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm text-zinc-700">
          <span className="text-xs font-medium uppercase tracking-wide text-sky-800/70">Run & bike distance</span>
          <select
            value={prefs.runBikeDistanceUnit}
            onChange={(e) => patch({ runBikeDistanceUnit: e.target.value as RunBikeDistanceUnit })}
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/80"
          >
            <option value="mi">Miles (mi)</option>
            <option value="km">Kilometers (km)</option>
            <option value="yd">Yards (yd)</option>
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Swim uses laps (count) and time in minutes. Run incline is treated as percent grade.
      </p>
    </SectionCard>
  );
}
