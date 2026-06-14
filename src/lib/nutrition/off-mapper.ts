import type { FoodItem, NutrientMap } from "@/lib/models";
import { CURATED_NUTRIENTS } from "@/lib/nutrition/nutrients";

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: Record<string, number | string | undefined>;
};

function offNumber(nutriments: Record<string, unknown> | undefined, key: string): number | undefined {
  if (!nutriments) return undefined;
  const val = nutriments[key];
  const n = typeof val === "number" ? val : typeof val === "string" ? Number(val) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function mapOffProduct(product: OffProduct, barcode: string): Omit<FoodItem, "id" | "createdAt"> | null {
  const name = product.product_name?.trim();
  if (!name) return null;

  const nutriments = product.nutriments as Record<string, unknown> | undefined;
  const calories =
    offNumber(nutriments, "energy-kcal_serving") ??
    offNumber(nutriments, "energy-kcal_100g") ??
    offNumber(nutriments, "energy-kcal") ??
    0;
  const proteinG =
    offNumber(nutriments, "proteins_serving") ?? offNumber(nutriments, "proteins_100g") ?? offNumber(nutriments, "proteins") ?? 0;
  const carbsG =
    offNumber(nutriments, "carbohydrates_serving") ??
    offNumber(nutriments, "carbohydrates_100g") ??
    offNumber(nutriments, "carbohydrates") ??
    0;
  const fatG = offNumber(nutriments, "fat_serving") ?? offNumber(nutriments, "fat_100g") ?? offNumber(nutriments, "fat") ?? 0;

  const servingQuantity = typeof product.serving_quantity === "number" && product.serving_quantity > 0 ? product.serving_quantity : 100;
  const servingLabel = product.serving_size?.trim() || `${servingQuantity} g`;

  const micronutrients: NutrientMap = {};
  for (const meta of CURATED_NUTRIENTS) {
    const val =
      offNumber(nutriments, `${meta.offField}_serving`) ??
      offNumber(nutriments, `${meta.offField}_100g`) ??
      offNumber(nutriments, meta.offField);
    if (typeof val === "number") micronutrients[meta.id] = val;
  }

  return {
    name,
    brand: product.brands?.trim() || undefined,
    source: "openfoodfacts",
    externalId: barcode,
    servingLabel,
    servingGrams: servingQuantity,
    calories: Math.round(calories),
    proteinG: Math.round(proteinG * 10) / 10,
    carbsG: Math.round(carbsG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
    micronutrients: Object.keys(micronutrients).length ? micronutrients : undefined,
  };
}

export const OFF_USER_AGENT = "PersonalDevelopment/1.0 (food-tracking@personal-development.app)";
