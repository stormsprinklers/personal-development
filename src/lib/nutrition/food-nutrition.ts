import type { AppData, FoodItem, NutrientMap, Recipe } from "@/lib/models";

export type MacroTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  micronutrients: NutrientMap;
};

export function emptyMacroTotals(): MacroTotals {
  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, micronutrients: {} };
}

export function scaleFoodNutrition(food: FoodItem, servings: number): MacroTotals {
  const factor = servings;
  const micronutrients: NutrientMap = {};
  if (food.micronutrients) {
    for (const [key, value] of Object.entries(food.micronutrients)) {
      if (typeof value === "number") micronutrients[key as keyof NutrientMap] = value * factor;
    }
  }
  return {
    calories: food.calories * factor,
    proteinG: food.proteinG * factor,
    carbsG: food.carbsG * factor,
    fatG: food.fatG * factor,
    micronutrients,
  };
}

export function addMacroTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  const micronutrients: NutrientMap = { ...a.micronutrients };
  for (const [key, value] of Object.entries(b.micronutrients)) {
    if (typeof value !== "number") continue;
    const id = key as keyof NutrientMap;
    micronutrients[id] = (micronutrients[id] ?? 0) + value;
  }
  return {
    calories: a.calories + b.calories,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
    micronutrients,
  };
}

export function recipeNutritionPerServing(data: AppData, recipe: Recipe): MacroTotals | null {
  if (!recipe.ingredients.length || recipe.servings <= 0) return null;
  let total = emptyMacroTotals();
  for (const ing of recipe.ingredients) {
    const food = data.foods.find((f) => f.id === ing.foodId && !f.archived);
    if (!food) continue;
    total = addMacroTotals(total, scaleFoodNutrition(food, ing.servings));
  }
  const factor = 1 / recipe.servings;
  const micronutrients: NutrientMap = {};
  for (const [key, value] of Object.entries(total.micronutrients)) {
    if (typeof value === "number") micronutrients[key as keyof NutrientMap] = value * factor;
  }
  return {
    calories: total.calories * factor,
    proteinG: total.proteinG * factor,
    carbsG: total.carbsG * factor,
    fatG: total.fatG * factor,
    micronutrients,
  };
}

export function foodItemFromRecipePerServing(data: AppData, recipe: Recipe): FoodItem | null {
  const perServing = recipeNutritionPerServing(data, recipe);
  if (!perServing) return null;
  return {
    id: recipe.id,
    name: recipe.name,
    source: "custom",
    servingLabel: "1 serving",
    servingGrams: 100,
    calories: perServing.calories,
    proteinG: perServing.proteinG,
    carbsG: perServing.carbsG,
    fatG: perServing.fatG,
    micronutrients: perServing.micronutrients,
    createdAt: recipe.createdAt,
  };
}

export function resolveLogEntryNutrition(data: AppData, entry: { foodId?: string; recipeId?: string; servings: number }): MacroTotals | null {
  if (entry.foodId) {
    const food = data.foods.find((f) => f.id === entry.foodId && !f.archived);
    if (!food) return null;
    return scaleFoodNutrition(food, entry.servings);
  }
  if (entry.recipeId) {
    const recipe = data.recipes.find((r) => r.id === entry.recipeId);
    if (!recipe) return null;
    const perServing = recipeNutritionPerServing(data, recipe);
    if (!perServing) return null;
    const factor = entry.servings;
    const micronutrients: NutrientMap = {};
    for (const [key, value] of Object.entries(perServing.micronutrients)) {
      if (typeof value === "number") micronutrients[key as keyof NutrientMap] = value * factor;
    }
    return {
      calories: perServing.calories * factor,
      proteinG: perServing.proteinG * factor,
      carbsG: perServing.carbsG * factor,
      fatG: perServing.fatG * factor,
      micronutrients,
    };
  }
  return null;
}

export function logEntryLabel(data: AppData, entry: { foodId?: string; recipeId?: string }): string {
  if (entry.foodId) {
    return data.foods.find((f) => f.id === entry.foodId)?.name ?? "Unknown food";
  }
  if (entry.recipeId) {
    return data.recipes.find((r) => r.id === entry.recipeId)?.name ?? "Unknown recipe";
  }
  return "Unknown";
}
