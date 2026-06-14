import type { ActivityLevel, HealthProfile } from "@/lib/models";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

export function calculateBmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0 || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export function bmiCategoryLabel(category: BmiCategory): string {
  switch (category) {
    case "underweight":
      return "Underweight";
    case "normal":
      return "Normal";
    case "overweight":
      return "Overweight";
    case "obese":
      return "Obese";
  }
}

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return Math.max(1, now.getFullYear() - birthYear);
}

/** Mifflin-St Jeor BMR (kcal/day). */
export function calculateBmr(profile: Pick<HealthProfile, "sex" | "weightKg" | "heightCm"> & { age: number }): number {
  const { sex, weightKg, heightCm, age } = profile;
  if (sex === "male") return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calculateTdee(profile: HealthProfile, age: number): number {
  const bmr = calculateBmr({ ...profile, age });
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel]);
}

export function calorieDeltaFromMaintenance(targetCalories: number, maintenanceCalories: number): number {
  return Math.round(targetCalories - maintenanceCalories);
}

export function latestBodyWeightKg(data: { workoutSessions: { date: string; bodyWeight?: number }[]; measurementPreferences?: { weightUnit: "lb" | "kg" } }, weightUnit: "lb" | "kg" = "lb"): number | undefined {
  const sessions = [...data.workoutSessions]
    .filter((s) => typeof s.bodyWeight === "number" && s.bodyWeight > 0)
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  const latest = sessions[0]?.bodyWeight;
  if (typeof latest !== "number") return undefined;
  return weightUnit === "kg" ? latest : latest * 0.45359237;
}
