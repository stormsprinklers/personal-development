import type { AppData } from "@/lib/models";
import { emptyMacroTotals, addMacroTotals, resolveLogEntryNutrition, type MacroTotals } from "@/lib/nutrition/food-nutrition";

export function dailyNutritionTotals(data: AppData, date: string): MacroTotals {
  const entries = data.foodLogEntries.filter((e) => e.date === date);
  let total = emptyMacroTotals();
  for (const entry of entries) {
    const nutrition = resolveLogEntryNutrition(data, entry);
    if (nutrition) total = addMacroTotals(total, nutrition);
  }
  return total;
}

export function mealNutritionTotals(data: AppData, date: string, meal: AppData["foodLogEntries"][number]["meal"]): MacroTotals {
  const entries = data.foodLogEntries.filter((e) => e.date === date && e.meal === meal);
  let total = emptyMacroTotals();
  for (const entry of entries) {
    const nutrition = resolveLogEntryNutrition(data, entry);
    if (nutrition) total = addMacroTotals(total, nutrition);
  }
  return total;
}

export function roundNutrition(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
