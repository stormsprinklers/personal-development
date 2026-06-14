import type { AppData, CuratedNutrientId, FoodItem, FoodLogEntry, FoodSource, MealSlot, NutrientMap, Recipe, SavedMeal, HealthProfile, NutritionGoals } from "@/lib/models";
import { formatOzFromGrams } from "@/lib/nutrition/serving-format";

const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];
const FOOD_SOURCES: FoodSource[] = ["custom", "usda", "openfoodfacts"];
const CURATED_NUTRIENTS: CuratedNutrientId[] = [
  "fiber_g",
  "sodium_mg",
  "sugar_g",
  "saturated_fat_g",
  "cholesterol_mg",
  "calcium_mg",
  "iron_mg",
  "potassium_mg",
  "vitamin_a_mcg",
  "vitamin_c_mg",
  "vitamin_d_mcg",
];

function isCuratedNutrientId(value: string): value is CuratedNutrientId {
  return (CURATED_NUTRIENTS as string[]).includes(value);
}

function normalizeNutrientMap(raw: unknown): NutrientMap | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: NutrientMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isCuratedNutrientId(key)) continue;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) continue;
    out[key] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

export function normalizeFoods(raw: unknown): FoodItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FoodItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<FoodItem>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const source = FOOD_SOURCES.includes(row.source as FoodSource) ? (row.source as FoodSource) : "custom";
    const servingGrams = typeof row.servingGrams === "number" && row.servingGrams > 0 ? row.servingGrams : 100;
    out.push({
      id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
      name,
      brand: typeof row.brand === "string" && row.brand.trim() ? row.brand.trim() : undefined,
      source,
      externalId: typeof row.externalId === "string" && row.externalId ? row.externalId : undefined,
      servingLabel: typeof row.servingLabel === "string" && row.servingLabel.trim() ? row.servingLabel.trim() : formatOzFromGrams(100),
      servingGrams,
      calories: typeof row.calories === "number" && Number.isFinite(row.calories) ? row.calories : 0,
      proteinG: typeof row.proteinG === "number" && Number.isFinite(row.proteinG) ? row.proteinG : 0,
      carbsG: typeof row.carbsG === "number" && Number.isFinite(row.carbsG) ? row.carbsG : 0,
      fatG: typeof row.fatG === "number" && Number.isFinite(row.fatG) ? row.fatG : 0,
      micronutrients: normalizeNutrientMap(row.micronutrients),
      createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
      archived: row.archived === true,
    });
  }
  return out;
}

export function normalizeRecipes(raw: unknown): Recipe[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Partial<Recipe>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name) return null;
      const ingredients = Array.isArray(row.ingredients)
        ? row.ingredients
            .map((ing) => {
              if (!ing || typeof ing !== "object") return null;
              const foodId = typeof (ing as { foodId?: string }).foodId === "string" ? (ing as { foodId: string }).foodId : "";
              const servings = typeof (ing as { servings?: number }).servings === "number" ? (ing as { servings: number }).servings : 0;
              if (!foodId || servings <= 0) return null;
              return { foodId, servings };
            })
            .filter((ing): ing is { foodId: string; servings: number } => ing !== null)
        : [];
      const servings = typeof row.servings === "number" && row.servings > 0 ? row.servings : 1;
      return {
        id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
        name,
        servings,
        ingredients,
        createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
      };
    })
    .filter((item): item is Recipe => item !== null);
}

export function normalizeSavedMeals(raw: unknown): SavedMeal[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedMeal[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<SavedMeal>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const items: SavedMeal["items"] = [];
    if (Array.isArray(row.items)) {
      for (const item of row.items) {
        if (!item || typeof item !== "object") continue;
        const foodId = typeof (item as { foodId?: string }).foodId === "string" ? (item as { foodId: string }).foodId : undefined;
        const recipeId = typeof (item as { recipeId?: string }).recipeId === "string" ? (item as { recipeId: string }).recipeId : undefined;
        const servings = typeof (item as { servings?: number }).servings === "number" ? (item as { servings: number }).servings : 0;
        if ((!foodId && !recipeId) || servings <= 0) continue;
        items.push({ foodId, recipeId, servings });
      }
    }
    out.push({
      id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
      name,
      items,
      createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    });
  }
  return out;
}

export function normalizeFoodLogEntries(raw: unknown): FoodLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: FoodLogEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<FoodLogEntry>;
    const date = typeof row.date === "string" ? row.date : "";
    if (!date) continue;
    const meal = MEAL_SLOTS.includes(row.meal as MealSlot) ? (row.meal as MealSlot) : "breakfast";
    const foodId = typeof row.foodId === "string" && row.foodId ? row.foodId : undefined;
    const recipeId = typeof row.recipeId === "string" && row.recipeId ? row.recipeId : undefined;
    if (!foodId && !recipeId) continue;
    const servings = typeof row.servings === "number" && row.servings > 0 ? row.servings : 1;
    out.push({
      id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
      date,
      meal,
      foodId,
      recipeId,
      servings,
      loggedAt: typeof row.loggedAt === "string" ? row.loggedAt : new Date().toISOString(),
    });
  }
  return out;
}

export function normalizeNutritionGoals(raw: unknown): NutritionGoals | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Partial<NutritionGoals>;
  const enabledMicronutrients = Array.isArray(row.enabledMicronutrients)
    ? row.enabledMicronutrients.filter((id): id is CuratedNutrientId => typeof id === "string" && isCuratedNutrientId(id))
    : undefined;
  const micronutrients = normalizeNutrientMap(row.micronutrients) as NutritionGoals["micronutrients"];
  const goals: NutritionGoals = {
    calories: typeof row.calories === "number" && row.calories > 0 ? row.calories : undefined,
    proteinG: typeof row.proteinG === "number" && row.proteinG > 0 ? row.proteinG : undefined,
    carbsG: typeof row.carbsG === "number" && row.carbsG > 0 ? row.carbsG : undefined,
    fatG: typeof row.fatG === "number" && row.fatG > 0 ? row.fatG : undefined,
    micronutrients,
    enabledMicronutrients,
  };
  if (!goals.calories && !goals.proteinG && !goals.carbsG && !goals.fatG && !goals.micronutrients && !goals.enabledMicronutrients?.length) {
    return undefined;
  }
  return goals;
}

export function normalizeHealthProfile(raw: unknown): HealthProfile | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Partial<HealthProfile>;
  const heightCm = typeof row.heightCm === "number" && row.heightCm > 0 ? row.heightCm : undefined;
  const weightKg = typeof row.weightKg === "number" && row.weightKg > 0 ? row.weightKg : undefined;
  if (!heightCm || !weightKg) return undefined;
  const sex = row.sex === "female" ? "female" : "male";
  const activityLevel =
    row.activityLevel === "light" ||
    row.activityLevel === "moderate" ||
    row.activityLevel === "active" ||
    row.activityLevel === "very_active"
      ? row.activityLevel
      : "sedentary";
  const split = row.macroSplitPct;
  const protein = typeof split?.protein === "number" ? split.protein : 30;
  const carbs = typeof split?.carbs === "number" ? split.carbs : 40;
  const fat = typeof split?.fat === "number" ? split.fat : 30;
  return {
    sex,
    birthYear: typeof row.birthYear === "number" ? row.birthYear : undefined,
    heightCm,
    weightKg,
    activityLevel,
    macroSplitPct: { protein, carbs, fat },
  };
}

export function normalizeRecentFoodIds(raw: unknown, foods: FoodItem[]): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(foods.map((f) => f.id));
  return raw.filter((id): id is string => typeof id === "string" && valid.has(id)).slice(0, 12);
}

export function bumpRecentFoodIds(current: string[] | undefined, foodId: string): string[] {
  const next = [foodId, ...(current ?? []).filter((id) => id !== foodId)];
  return next.slice(0, 12);
}
