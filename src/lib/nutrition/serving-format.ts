const GRAMS_PER_OZ = 28.349523125;

export function gramsToOz(grams: number): number {
  if (!Number.isFinite(grams) || grams <= 0) return 0;
  return grams / GRAMS_PER_OZ;
}

export function ozToGrams(oz: number): number {
  if (!Number.isFinite(oz) || oz <= 0) return 0;
  return oz * GRAMS_PER_OZ;
}

export function formatOzFromGrams(grams: number, decimals = 1): string {
  const oz = gramsToOz(grams);
  if (oz <= 0) return "0 oz";
  const factor = 10 ** decimals;
  const rounded = Math.round(oz * factor) / factor;
  return `${rounded} oz`;
}

/** Convert USDA-style serving units to grams for scaling. */
export function servingSizeToGrams(size: number, unit?: string): number {
  if (!Number.isFinite(size) || size <= 0) return 0;
  const u = (unit ?? "g").toLowerCase().trim();
  if (u === "g" || u === "grm" || u === "gram" || u === "grams") return size;
  if (u === "oz" || u === "onz" || u === "ounce" || u === "ounces") return ozToGrams(size);
  if (u === "ml" || u === "mlt") return size;
  return size;
}

/** Prefer oz in display; replace gram-only labels with oz. */
export function formatServingDisplay(servingLabel: string, servingGrams: number): string {
  const trimmed = servingLabel.trim();
  if (!trimmed) return formatOzFromGrams(servingGrams);

  const gramOnly = /^[\d.]+\s*g(?:rams?)?$/i.test(trimmed);
  if (gramOnly) {
    const match = trimmed.match(/([\d.]+)/);
    const g = match ? Number(match[1]) : servingGrams;
    return formatOzFromGrams(g > 0 ? g : servingGrams);
  }

  const replaced = trimmed.replace(/([\d.]+)\s*g(?:rams?)?\b/gi, (_, gStr: string) => formatOzFromGrams(Number(gStr)));
  if (replaced !== trimmed) return replaced;

  if (servingGrams > 0 && !/\b(oz|cup|tbsp|tsp|slice|piece|serving|fl)\b/i.test(trimmed)) {
    return formatOzFromGrams(servingGrams);
  }

  return trimmed;
}

export function formatServingCaloriesSummary(calories: number, servingLabel: string, servingGrams: number): string {
  return `${Math.round(calories)} cal per ${formatServingDisplay(servingLabel, servingGrams)}`;
}

export { GRAMS_PER_OZ };
