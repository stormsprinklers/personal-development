import type { MeasurementPreferences, RunBikeDistanceUnit, WeightUnit } from "@/lib/models";

export function defaultMeasurementPreferences(): MeasurementPreferences {
  return { weightUnit: "lb", runBikeDistanceUnit: "mi" };
}

export function normalizeMeasurementPreferences(
  partial?: Partial<MeasurementPreferences> | null,
): MeasurementPreferences {
  return {
    ...defaultMeasurementPreferences(),
    ...partial,
    weightUnit: partial?.weightUnit === "kg" ? "kg" : "lb",
    runBikeDistanceUnit:
      partial?.runBikeDistanceUnit === "km" || partial?.runBikeDistanceUnit === "yd"
        ? partial.runBikeDistanceUnit
        : "mi",
  };
}

export function weightUnitAbbr(unit: WeightUnit): string {
  return unit === "kg" ? "kg" : "lb";
}

export function runBikeDistanceUnitAbbr(unit: RunBikeDistanceUnit): string {
  if (unit === "km") return "km";
  if (unit === "yd") return "yd";
  return "mi";
}
