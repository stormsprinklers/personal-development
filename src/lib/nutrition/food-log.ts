import type { AppData, FoodLogEntry, MealSlot } from "@/lib/models";

export function addFoodLogEntry(
  data: AppData,
  params: {
    date: string;
    meal: MealSlot;
    foodId?: string;
    servings: number;
  },
): AppData {
  const entry: FoodLogEntry = {
    id: crypto.randomUUID(),
    date: params.date,
    meal: params.meal,
    foodId: params.foodId,
    servings: params.servings,
    loggedAt: new Date().toISOString(),
  };
  return {
    ...data,
    foodLogEntries: [entry, ...data.foodLogEntries],
  };
}
