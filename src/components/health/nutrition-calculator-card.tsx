"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import type { AppData, HealthProfile, NutritionGoals } from "@/lib/models";
import { adjustMacroSplit, macroGramsFromCalories, normalizeMacroSplit } from "@/lib/nutrition/macro-calculator";
import {
  ageFromBirthYear,
  bmiCategory,
  bmiCategoryLabel,
  calculateBmi,
  calculateTdee,
  calorieDeltaFromMaintenance,
  latestBodyWeightKg,
} from "@/lib/nutrition/tdee-calculator";
import { normalizeMeasurementPreferences } from "@/lib/units";

type Props = {
  data: AppData;
  setData: (updater: (prev: AppData) => AppData) => void;
};

export function NutritionCalculatorCard({ data, setData }: Props) {
  const weightUnit = normalizeMeasurementPreferences(data.measurementPreferences).weightUnit;
  const prefilledWeight = latestBodyWeightKg(data, weightUnit);

  const existing = data.healthProfile;
  const [sex, setSex] = useState<HealthProfile["sex"]>(existing?.sex ?? "male");
  const [birthYear, setBirthYear] = useState(String(existing?.birthYear ?? ""));
  const [heightCm, setHeightCm] = useState(String(existing?.heightCm ?? 170));
  const [weightKg, setWeightKg] = useState(String(existing?.weightKg ?? prefilledWeight?.toFixed(1) ?? ""));
  const [activityLevel, setActivityLevel] = useState<HealthProfile["activityLevel"]>(existing?.activityLevel ?? "moderate");
  const [macroSplit, setMacroSplit] = useState(existing?.macroSplitPct ?? { protein: 30, carbs: 40, fat: 30 });
  const [targetCalories, setTargetCalories] = useState(String(data.nutritionGoals?.calories ?? ""));

  const age = birthYear ? ageFromBirthYear(Number(birthYear)) : 30;
  const height = Number(heightCm) || 0;
  const weight = Number(weightKg) || 0;

  const profile = useMemo(
    (): HealthProfile | null =>
      height > 0 && weight > 0
        ? { sex, birthYear: birthYear ? Number(birthYear) : undefined, heightCm: height, weightKg: weight, activityLevel, macroSplitPct: macroSplit }
        : null,
    [sex, birthYear, height, weight, activityLevel, macroSplit],
  );

  const bmi = profile ? calculateBmi(profile.weightKg, profile.heightCm) : 0;
  const maintenance = profile ? calculateTdee(profile, age) : 0;
  const targetCal = Number(targetCalories) || 0;
  const calDelta = targetCal > 0 && maintenance > 0 ? calorieDeltaFromMaintenance(targetCal, maintenance) : 0;
  const macroGrams = targetCal > 0 ? macroGramsFromCalories(targetCal, macroSplit) : null;

  function applyToGoals() {
    if (!profile || !targetCal) return;
    const goals: NutritionGoals = {
      calories: Math.round(targetCal),
      proteinG: macroGrams?.proteinG,
    };
    setData((prev) => ({
      ...prev,
      healthProfile: { ...profile, macroSplitPct: normalizeMacroSplit(macroSplit) },
      nutritionGoals: goals,
    }));
  }

  return (
    <SectionCard title="Goal calculator" subtitle="Estimate maintenance calories, BMI, and macro targets." inset={false}>
      <div className="ios-card grid gap-3 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-ios-secondary">
            Sex
            <select value={sex} onChange={(e) => setSex(e.target.value as HealthProfile["sex"])} className="ios-field px-3 py-2 text-sm">
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-ios-secondary">
            Birth year
            <input value={birthYear} onChange={(e) => setBirthYear(e.target.value)} type="number" className="ios-field px-3 py-2 text-sm" placeholder="1990" />
          </label>
          <label className="grid gap-1 text-xs text-ios-secondary">
            Height (cm)
            <input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} type="number" className="ios-field px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs text-ios-secondary">
            Weight (kg)
            <input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} type="number" className="ios-field px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs text-ios-secondary sm:col-span-2">
            Activity level
            <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as HealthProfile["activityLevel"])} className="ios-field px-3 py-2 text-sm">
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very active</option>
            </select>
          </label>
        </div>

        {bmi > 0 ? (
          <p className="text-sm text-ios-label">
            BMI: <span className="font-semibold">{bmi.toFixed(1)}</span> ({bmiCategoryLabel(bmiCategory(bmi))})
          </p>
        ) : null}
        {maintenance > 0 ? (
          <p className="text-sm text-ios-label">
            Estimated maintenance: <span className="font-semibold">{maintenance.toLocaleString()} cal/day</span>
          </p>
        ) : null}

        <label className="grid gap-1 text-xs text-ios-secondary">
          Target calories
          <input value={targetCalories} onChange={(e) => setTargetCalories(e.target.value)} type="number" className="ios-field px-3 py-2 text-sm" placeholder={maintenance ? String(maintenance) : "2000"} />
        </label>
        {targetCal > 0 && maintenance > 0 ? (
          <p className={`text-sm ${calDelta > 0 ? "text-emerald" : calDelta < 0 ? "text-copper" : "text-ios-secondary"}`}>
            {calDelta === 0
              ? "At maintenance"
              : `${Math.abs(calDelta).toLocaleString()} cal ${calDelta > 0 ? "above" : "below"} maintenance`}
          </p>
        ) : null}

        <div className="grid gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ios-secondary">Macro split (% of calories)</p>
          {(["protein", "carbs", "fat"] as const).map((macro) => (
            <label key={macro} className="grid gap-1 text-xs text-ios-secondary capitalize">
              {macro} ({macroSplit[macro]}%)
              <input
                type="range"
                min={5}
                max={80}
                value={macroSplit[macro]}
                onChange={(e) => setMacroSplit((prev) => adjustMacroSplit(prev, macro, Number(e.target.value)))}
              />
            </label>
          ))}
        </div>

        {macroGrams ? (
          <p className="text-xs text-ios-secondary">
            Macros at target: {macroGrams.proteinG}g protein · {macroGrams.carbsG}g carbs · {macroGrams.fatG}g fat
          </p>
        ) : null}

        <GlassButton variant="primary" onClick={applyToGoals} disabled={!profile || !targetCal}>
          Apply to goals
        </GlassButton>
      </div>
    </SectionCard>
  );
}
