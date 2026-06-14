import type { AppData, FoodItem, FoodLogEntry, MealSlot } from "@/lib/models";
import { bumpRecentFoodIds } from "@/lib/nutrition/normalize-food-data";

export function upsertFoodInLibrary(data: AppData, food: FoodItem): AppData {
  const existing = data.foods.find(
    (f) =>
      !f.archived &&
      f.source === food.source &&
      f.externalId &&
      food.externalId &&
      f.externalId === food.externalId,
  );
  if (existing) {
    return {
      ...data,
      foods: data.foods.map((f) => (f.id === existing.id ? { ...existing, ...food, id: existing.id } : f)),
    };
  }
  return { ...data, foods: [food, ...data.foods] };
}

export function addFoodLogEntry(
  data: AppData,
  params: {
    date: string;
    meal: MealSlot;
    foodId?: string;
    recipeId?: string;
    servings: number;
  },
): AppData {
  const entry: FoodLogEntry = {
    id: crypto.randomUUID(),
    date: params.date,
    meal: params.meal,
    foodId: params.foodId,
    recipeId: params.recipeId,
    servings: params.servings,
    loggedAt: new Date().toISOString(),
  };
  const recentFoodIds = params.foodId ? bumpRecentFoodIds(data.recentFoodIds, params.foodId) : data.recentFoodIds;
  return {
    ...data,
    foodLogEntries: [entry, ...data.foodLogEntries],
    recentFoodIds,
  };
}

export function addSavedMealEntries(
  data: AppData,
  params: {
    date: string;
    meal: MealSlot;
    items: { foodId?: string; recipeId?: string; servings: number }[];
  },
): AppData {
  let next = data;
  for (const item of params.items) {
    next = addFoodLogEntry(next, {
      date: params.date,
      meal: params.meal,
      foodId: item.foodId,
      recipeId: item.recipeId,
      servings: item.servings,
    });
  }
  return next;
}

export function foodDraftToItem(draft: Omit<FoodItem, "id" | "createdAt">): FoodItem {
  return {
    ...draft,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}
