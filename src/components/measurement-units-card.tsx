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
        <label className="grid gap-1 text-sm text-ios-secondary">
          <span className="text-xs font-medium uppercase tracking-wide">Strength & body weight</span>
          <select
            value={prefs.weightUnit}
            onChange={(e) => patch({ weightUnit: e.target.value as WeightUnit })}
            className="ios-field px-3 py-2.5 text-sm"
          >
            <option value="lb">Pounds (lb)</option>
            <option value="kg">Kilograms (kg)</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm text-ios-secondary">
          <span className="text-xs font-medium uppercase tracking-wide">Run & bike distance</span>
          <select
            value={prefs.runBikeDistanceUnit}
            onChange={(e) => patch({ runBikeDistanceUnit: e.target.value as RunBikeDistanceUnit })}
            className="ios-field px-3 py-2.5 text-sm"
          >
            <option value="mi">Miles (mi)</option>
            <option value="km">Kilometers (km)</option>
            <option value="yd">Yards (yd)</option>
          </select>
        </label>
      </div>
      <p className="ios-footnote mt-2">
        Swim uses laps (count) and time in minutes. Run incline is treated as percent grade.
      </p>
    </SectionCard>
  );
}
