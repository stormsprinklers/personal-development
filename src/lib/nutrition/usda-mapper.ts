import type { FoodItem, NutrientMap } from "@/lib/models";
import { CURATED_NUTRIENTS, USDA_MACRO_IDS, nutrientMetaByUsdaId } from "@/lib/nutrition/nutrients";

type UsdaNutrient = { nutrientId?: number; nutrientNumber?: string; value?: number; amount?: number };

type UsdaFood = {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: UsdaNutrient[];
  labelNutrients?: Record<string, { value?: number }>;
};

function nutrientValue(nutrients: UsdaNutrient[] | undefined, id: number): number | undefined {
  if (!nutrients?.length) return undefined;
  const row = nutrients.find((n) => n.nutrientId === id);
  const value = row?.value ?? row?.amount;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function mapMicronutrients(nutrients: UsdaNutrient[] | undefined): NutrientMap {
  const out: NutrientMap = {};
  if (!nutrients) return out;
  for (const row of nutrients) {
    if (typeof row.nutrientId !== "number") continue;
    const meta = nutrientMetaByUsdaId(row.nutrientId);
    if (!meta) continue;
    const value = row.value ?? row.amount;
    if (typeof value === "number" && Number.isFinite(value)) out[meta.id] = value;
  }
  return out;
}

export type UsdaSearchItem = {
  fdcId: number;
  name: string;
  brand?: string;
  caloriesPer100g?: number;
};

export function mapUsdaSearchFood(food: UsdaFood): UsdaSearchItem | null {
  const fdcId = food.fdcId;
  const name = typeof food.description === "string" ? food.description.trim() : "";
  if (!fdcId || !name) return null;
  const brand = food.brandOwner?.trim() || food.brandName?.trim() || undefined;
  const caloriesPer100g = nutrientValue(food.foodNutrients, USDA_MACRO_IDS.calories);
  return { fdcId, name, brand, caloriesPer100g };
}

export function mapUsdaFoodDetail(food: UsdaFood): Omit<FoodItem, "id" | "createdAt"> | null {
  const fdcId = food.fdcId;
  const name = typeof food.description === "string" ? food.description.trim() : "";
  if (!fdcId || !name) return null;

  const nutrients = food.foodNutrients;
  let calories = nutrientValue(nutrients, USDA_MACRO_IDS.calories) ?? 0;
  let proteinG = nutrientValue(nutrients, USDA_MACRO_IDS.protein) ?? 0;
  let carbsG = nutrientValue(nutrients, USDA_MACRO_IDS.carbs) ?? 0;
  let fatG = nutrientValue(nutrients, USDA_MACRO_IDS.fat) ?? 0;

  let servingGrams = 100;
  let servingLabel = "100 g";
  if (typeof food.servingSize === "number" && food.servingSize > 0) {
    servingGrams = food.servingSizeUnit?.toLowerCase() === "g" ? food.servingSize : 100;
    servingLabel = `${food.servingSize}${food.servingSizeUnit ? ` ${food.servingSizeUnit}` : " g"}`;
    if (servingGrams !== 100) {
      const factor = servingGrams / 100;
      calories *= factor;
      proteinG *= factor;
      carbsG *= factor;
      fatG *= factor;
    }
  }

  const micronutrientsRaw = mapMicronutrients(nutrients);
  const micronutrients: NutrientMap = {};
  if (servingGrams !== 100) {
    const factor = servingGrams / 100;
    for (const meta of CURATED_NUTRIENTS) {
      const val = micronutrientsRaw[meta.id];
      if (typeof val === "number") micronutrients[meta.id] = val * factor;
    }
  } else {
    Object.assign(micronutrients, micronutrientsRaw);
  }

  return {
    name,
    brand: food.brandOwner?.trim() || food.brandName?.trim() || undefined,
    source: "usda",
    externalId: String(fdcId),
    servingLabel,
    servingGrams,
    calories: Math.round(calories),
    proteinG: Math.round(proteinG * 10) / 10,
    carbsG: Math.round(carbsG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
    micronutrients: Object.keys(micronutrients).length ? micronutrients : undefined,
  };
}
