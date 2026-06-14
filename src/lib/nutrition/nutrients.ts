import type { CuratedNutrientId } from "@/lib/models";

export type NutrientMeta = {
  id: CuratedNutrientId;
  label: string;
  unit: string;
  usdaNutrientId: number;
  offField: string;
};

export const CURATED_NUTRIENTS: NutrientMeta[] = [
  { id: "fiber_g", label: "Fiber", unit: "g", usdaNutrientId: 1079, offField: "fiber" },
  { id: "sodium_mg", label: "Sodium", unit: "mg", usdaNutrientId: 1093, offField: "sodium" },
  { id: "sugar_g", label: "Sugar", unit: "g", usdaNutrientId: 2000, offField: "sugars" },
  { id: "saturated_fat_g", label: "Saturated fat", unit: "g", usdaNutrientId: 1258, offField: "saturated-fat" },
  { id: "cholesterol_mg", label: "Cholesterol", unit: "mg", usdaNutrientId: 1253, offField: "cholesterol" },
  { id: "calcium_mg", label: "Calcium", unit: "mg", usdaNutrientId: 1087, offField: "calcium" },
  { id: "iron_mg", label: "Iron", unit: "mg", usdaNutrientId: 1089, offField: "iron" },
  { id: "potassium_mg", label: "Potassium", unit: "mg", usdaNutrientId: 1092, offField: "potassium" },
  { id: "vitamin_a_mcg", label: "Vitamin A", unit: "mcg", usdaNutrientId: 1106, offField: "vitamin-a" },
  { id: "vitamin_c_mg", label: "Vitamin C", unit: "mg", usdaNutrientId: 1162, offField: "vitamin-c" },
  { id: "vitamin_d_mcg", label: "Vitamin D", unit: "mcg", usdaNutrientId: 1114, offField: "vitamin-d" },
];

export const USDA_MACRO_IDS = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
} as const;

export function nutrientMetaById(id: CuratedNutrientId): NutrientMeta | undefined {
  return CURATED_NUTRIENTS.find((n) => n.id === id);
}

export function nutrientMetaByUsdaId(usdaId: number): NutrientMeta | undefined {
  return CURATED_NUTRIENTS.find((n) => n.usdaNutrientId === usdaId);
}
