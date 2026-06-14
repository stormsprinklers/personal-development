export type MacroSplitPct = { protein: number; carbs: number; fat: number };

export type MacroGrams = { proteinG: number; carbsG: number; fatG: number };

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export function normalizeMacroSplit(split: MacroSplitPct): MacroSplitPct {
  const protein = Math.max(0, split.protein);
  const carbs = Math.max(0, split.carbs);
  const fat = Math.max(0, split.fat);
  const total = protein + carbs + fat;
  if (total <= 0) return { protein: 30, carbs: 40, fat: 30 };
  return {
    protein: Math.round((protein / total) * 100),
    carbs: Math.round((carbs / total) * 100),
    fat: Math.round((fat / total) * 100),
  };
}

/** Adjust one macro % and redistribute the remainder proportionally. */
export function adjustMacroSplit(split: MacroSplitPct, macro: keyof MacroSplitPct, nextValue: number): MacroSplitPct {
  const clamped = Math.max(5, Math.min(80, Math.round(nextValue)));
  const others = (["protein", "carbs", "fat"] as const).filter((k) => k !== macro);
  const remaining = 100 - clamped;
  const otherTotal = others.reduce((sum, key) => sum + split[key], 0);
  const next: MacroSplitPct = { ...split, [macro]: clamped };
  if (otherTotal <= 0) {
    const half = Math.floor(remaining / 2);
    next[others[0]] = half;
    next[others[1]] = remaining - half;
    return next;
  }
  let assigned = 0;
  others.forEach((key, index) => {
    if (index === others.length - 1) {
      next[key] = remaining - assigned;
    } else {
      const portion = Math.round((split[key] / otherTotal) * remaining);
      next[key] = portion;
      assigned += portion;
    }
  });
  return normalizeMacroSplit(next);
}

export function macroGramsFromCalories(calories: number, split: MacroSplitPct): MacroGrams {
  const normalized = normalizeMacroSplit(split);
  const proteinG = Math.round((calories * (normalized.protein / 100)) / KCAL_PER_G.protein);
  const carbsG = Math.round((calories * (normalized.carbs / 100)) / KCAL_PER_G.carbs);
  const fatG = Math.round((calories * (normalized.fat / 100)) / KCAL_PER_G.fat);
  return { proteinG, carbsG, fatG };
}

export function macroCalorieShare(split: MacroSplitPct): MacroSplitPct {
  return normalizeMacroSplit(split);
}
