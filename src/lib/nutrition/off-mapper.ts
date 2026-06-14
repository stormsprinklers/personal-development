import type { FoodItem, NutrientMap } from "@/lib/models";
import { CURATED_NUTRIENTS } from "@/lib/nutrition/nutrients";
import { formatOzFromGrams, formatServingDisplay, ozToGrams } from "@/lib/nutrition/serving-format";

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

function parseGramsFromServingSize(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const gMatch = text.match(/([\d.]+)\s*g(?:rams?)?\b/i);
  if (gMatch) return Number(gMatch[1]);
  const ozMatch = text.match(/([\d.]+)\s*oz\b/i);
  if (ozMatch) return ozToGrams(Number(ozMatch[1]));
  return undefined;
}

export function mapOffProduct(product: OffProduct, barcode: string): Omit<FoodItem, "id" | "createdAt"> | null {
  const name = product.product_name?.trim();
  if (!name) return null;

  const nutriments = product.nutriments as Record<string, unknown> | undefined;
  const parsedGrams = parseGramsFromServingSize(product.serving_size);
  const servingGrams =
    (typeof product.serving_quantity === "number" && product.serving_quantity > 0 ? product.serving_quantity : undefined) ??
    parsedGrams ??
    100;

  const hasServingNutrients = offNumber(nutriments, "energy-kcal_serving") !== undefined;

  const per100Cal = offNumber(nutriments, "energy-kcal_100g") ?? offNumber(nutriments, "energy-kcal");
  const per100Protein = offNumber(nutriments, "proteins_100g") ?? offNumber(nutriments, "proteins");
  const per100Carbs = offNumber(nutriments, "carbohydrates_100g") ?? offNumber(nutriments, "carbohydrates");
  const per100Fat = offNumber(nutriments, "fat_100g") ?? offNumber(nutriments, "fat");

  const factor = hasServingNutrients ? 1 : servingGrams / 100;

  const calories =
    offNumber(nutriments, "energy-kcal_serving") ?? (per100Cal !== undefined ? per100Cal * factor : 0);
  const proteinG =
    offNumber(nutriments, "proteins_serving") ?? (per100Protein !== undefined ? per100Protein * factor : 0);
  const carbsG =
    offNumber(nutriments, "carbohydrates_serving") ?? (per100Carbs !== undefined ? per100Carbs * factor : 0);
  const fatG = offNumber(nutriments, "fat_serving") ?? (per100Fat !== undefined ? per100Fat * factor : 0);

  const rawLabel = product.serving_size?.trim() || formatOzFromGrams(servingGrams);
  const servingLabel = formatServingDisplay(rawLabel, servingGrams);

  const micronutrients: NutrientMap = {};
  for (const meta of CURATED_NUTRIENTS) {
    const perServing = offNumber(nutriments, `${meta.offField}_serving`);
    const per100 =
      offNumber(nutriments, `${meta.offField}_100g`) ?? offNumber(nutriments, meta.offField);
    const val = perServing ?? (per100 !== undefined ? per100 * factor : undefined);
    if (typeof val === "number") micronutrients[meta.id] = val;
  }

  return {
    name,
    brand: product.brands?.trim() || undefined,
    source: "openfoodfacts",
    externalId: barcode,
    servingLabel,
    servingGrams,
    calories: Math.round(calories),
    proteinG: Math.round(proteinG * 10) / 10,
    carbsG: Math.round(carbsG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
    micronutrients: Object.keys(micronutrients).length ? micronutrients : undefined,
  };
}

export const OFF_USER_AGENT = "PersonalDevelopment/1.0 (food-tracking@personal-development.app)";
