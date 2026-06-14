import type { FoodItem, NutrientMap } from "@/lib/models";
import { CURATED_NUTRIENTS, USDA_MACRO_IDS, nutrientMetaByUsdaId } from "@/lib/nutrition/nutrients";
import {
  formatOzFromGrams,
  formatServingDisplay,
  servingSizeToGrams,
} from "@/lib/nutrition/serving-format";

type UsdaNutrient = { nutrientId?: number; nutrientNumber?: string; value?: number; amount?: number };

type UsdaMeasureUnit = { name?: string; abbreviation?: string };

type UsdaFoodPortion = {
  gramWeight?: number;
  amount?: number;
  measureUnit?: UsdaMeasureUnit;
  modifier?: string;
  portionDescription?: string;
};

type UsdaFood = {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodPortions?: UsdaFoodPortion[];
  foodNutrients?: UsdaNutrient[];
  labelNutrients?: Record<string, { value?: number }>;
};

function nutrientValue(nutrients: UsdaNutrient[] | undefined, id: number): number | undefined {
  if (!nutrients?.length) return undefined;
  const row = nutrients.find((n) => n.nutrientId === id);
  const value = row?.value ?? row?.amount;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function labelNutrientValue(labelNutrients: UsdaFood["labelNutrients"], key: string): number | undefined {
  const val = labelNutrients?.[key]?.value;
  return typeof val === "number" && Number.isFinite(val) ? val : undefined;
}

function mapMicronutrients(nutrients: UsdaNutrient[] | undefined, factor = 1): NutrientMap {
  const out: NutrientMap = {};
  if (!nutrients) return out;
  for (const row of nutrients) {
    if (typeof row.nutrientId !== "number") continue;
    const meta = nutrientMetaByUsdaId(row.nutrientId);
    if (!meta) continue;
    const value = row.value ?? row.amount;
    if (typeof value === "number" && Number.isFinite(value)) out[meta.id] = value * factor;
  }
  return out;
}

function scalePer100gNutrients(
  nutrients: UsdaNutrient[] | undefined,
  servingGrams: number,
): { calories: number; proteinG: number; carbsG: number; fatG: number; micronutrients: NutrientMap } {
  const factor = servingGrams / 100;
  return {
    calories: (nutrientValue(nutrients, USDA_MACRO_IDS.calories) ?? 0) * factor,
    proteinG: (nutrientValue(nutrients, USDA_MACRO_IDS.protein) ?? 0) * factor,
    carbsG: (nutrientValue(nutrients, USDA_MACRO_IDS.carbs) ?? 0) * factor,
    fatG: (nutrientValue(nutrients, USDA_MACRO_IDS.fat) ?? 0) * factor,
    micronutrients: mapMicronutrients(nutrients, factor),
  };
}

function resolveUsdaServing(food: UsdaFood): { servingGrams: number; servingLabel: string } {
  if (typeof food.servingSize === "number" && food.servingSize > 0) {
    const servingGrams = servingSizeToGrams(food.servingSize, food.servingSizeUnit);
    const unit = food.servingSizeUnit?.trim() || "g";
    const rawLabel = food.householdServingFullText?.trim() || `${food.servingSize} ${unit}`;
    return {
      servingGrams: servingGrams > 0 ? servingGrams : 100,
      servingLabel: formatServingDisplay(rawLabel, servingGrams > 0 ? servingGrams : 100),
    };
  }

  const portion = food.foodPortions?.find((p) => typeof p.gramWeight === "number" && p.gramWeight > 0);
  if (portion?.gramWeight) {
    const servingGrams = portion.gramWeight;
    const unit = portion.measureUnit?.name ?? portion.measureUnit?.abbreviation ?? "";
    const rawLabel =
      portion.portionDescription?.trim() ||
      (portion.amount && unit
        ? `${portion.amount} ${unit}${portion.modifier ? ` ${portion.modifier}` : ""}`.trim()
        : formatOzFromGrams(servingGrams));
    return { servingGrams, servingLabel: formatServingDisplay(rawLabel, servingGrams) };
  }

  const servingGrams = 100;
  return { servingGrams, servingLabel: formatOzFromGrams(servingGrams) };
}

export type UsdaSearchItem = {
  fdcId: number;
  name: string;
  brand?: string;
  caloriesPerServing?: number;
  servingLabel?: string;
};

export function mapUsdaSearchFood(food: UsdaFood): UsdaSearchItem | null {
  const fdcId = food.fdcId;
  const name = typeof food.description === "string" ? food.description.trim() : "";
  if (!fdcId || !name) return null;
  const brand = food.brandOwner?.trim() || food.brandName?.trim() || undefined;

  const { servingGrams, servingLabel } = resolveUsdaServing(food);
  const per100Cal = nutrientValue(food.foodNutrients, USDA_MACRO_IDS.calories);
  const caloriesPerServing =
    per100Cal !== undefined ? Math.round(per100Cal * (servingGrams / 100)) : undefined;

  return { fdcId, name, brand, caloriesPerServing, servingLabel };
}

export function mapUsdaFoodDetail(food: UsdaFood): Omit<FoodItem, "id" | "createdAt"> | null {
  const fdcId = food.fdcId;
  const name = typeof food.description === "string" ? food.description.trim() : "";
  if (!fdcId || !name) return null;

  const { servingGrams, servingLabel } = resolveUsdaServing(food);
  const nutrients = food.foodNutrients;

  let calories: number;
  let proteinG: number;
  let carbsG: number;
  let fatG: number;
  let micronutrients: NutrientMap;

  const hasLabelServing =
    food.labelNutrients &&
    typeof food.servingSize === "number" &&
    food.servingSize > 0 &&
    labelNutrientValue(food.labelNutrients, "calories") !== undefined;

  if (hasLabelServing && food.labelNutrients) {
    calories = labelNutrientValue(food.labelNutrients, "calories") ?? 0;
    proteinG = labelNutrientValue(food.labelNutrients, "protein") ?? nutrientValue(nutrients, USDA_MACRO_IDS.protein) ?? 0;
    carbsG = labelNutrientValue(food.labelNutrients, "carbohydrates") ?? nutrientValue(nutrients, USDA_MACRO_IDS.carbs) ?? 0;
    fatG = labelNutrientValue(food.labelNutrients, "fat") ?? nutrientValue(nutrients, USDA_MACRO_IDS.fat) ?? 0;
    if (!labelNutrientValue(food.labelNutrients, "protein")) {
      const scaled = scalePer100gNutrients(nutrients, servingGrams);
      proteinG = scaled.proteinG;
      carbsG = scaled.carbsG;
      fatG = scaled.fatG;
    }
    micronutrients = scalePer100gNutrients(nutrients, servingGrams).micronutrients;
  } else {
    const scaled = scalePer100gNutrients(nutrients, servingGrams);
    calories = scaled.calories;
    proteinG = scaled.proteinG;
    carbsG = scaled.carbsG;
    fatG = scaled.fatG;
    micronutrients = scaled.micronutrients;
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
