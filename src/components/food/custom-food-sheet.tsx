"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { GlassButton } from "@/components/ui/glass-button";
import type { FoodItem } from "@/lib/models";
import { formatOzFromGrams, formatServingDisplay, gramsToOz, ozToGrams } from "@/lib/nutrition/serving-format";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (food: Omit<FoodItem, "id" | "createdAt">) => void;
  initial?: Partial<FoodItem>;
};

export function CustomFoodSheet({ open, onClose, onSave, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [servingLabel, setServingLabel] = useState(initial?.servingLabel ?? "");
  const [servingOz, setServingOz] = useState(
    String(initial?.servingGrams ? Math.round(gramsToOz(initial.servingGrams) * 10) / 10 : 1),
  );
  const [calories, setCalories] = useState(String(initial?.calories ?? ""));
  const [proteinG, setProteinG] = useState(String(initial?.proteinG ?? ""));
  const [carbsG, setCarbsG] = useState(String(initial?.carbsG ?? ""));
  const [fatG, setFatG] = useState(String(initial?.fatG ?? ""));

  const servingGrams = useMemo(() => {
    const oz = Number(servingOz);
    return oz > 0 ? ozToGrams(oz) : ozToGrams(1);
  }, [servingOz]);

  const servingPreview = useMemo(
    () => formatServingDisplay(servingLabel.trim() || formatOzFromGrams(servingGrams), servingGrams),
    [servingLabel, servingGrams],
  );

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const oz = Math.max(0.1, Number(servingOz) || 1);
    const grams = ozToGrams(oz);
    onSave({
      name: trimmed,
      brand: brand.trim() || undefined,
      source: "custom",
      servingLabel: formatServingDisplay(servingLabel.trim() || formatOzFromGrams(grams), grams),
      servingGrams: grams,
      calories: Number(calories) || 0,
      proteinG: Number(proteinG) || 0,
      carbsG: Number(carbsG) || 0,
      fatG: Number(fatG) || 0,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Custom food">
      <div className="grid gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Food name" className="ios-field px-3 py-2 text-sm" />
        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand (optional)" className="ios-field px-3 py-2 text-sm" />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-ios-secondary">
            Serving size (oz)
            <input value={servingOz} onChange={(e) => setServingOz(e.target.value)} type="number" min={0.1} step={0.1} className="ios-field px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs text-ios-secondary">
            Serving name (optional)
            <input value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} placeholder="e.g. 1 slice" className="ios-field px-3 py-2 text-sm" />
          </label>
        </div>
        <p className="text-xs text-ios-secondary">Per serving: {servingPreview}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Calories per serving" type="number" className="ios-field px-3 py-2 text-sm" />
          <input value={proteinG} onChange={(e) => setProteinG(e.target.value)} placeholder="Protein (g) per serving" type="number" className="ios-field px-3 py-2 text-sm" />
          <input value={carbsG} onChange={(e) => setCarbsG(e.target.value)} placeholder="Carbs (g) per serving" type="number" className="ios-field px-3 py-2 text-sm" />
          <input value={fatG} onChange={(e) => setFatG(e.target.value)} placeholder="Fat (g) per serving" type="number" className="ios-field px-3 py-2 text-sm" />
        </div>
        <GlassButton variant="primary" onClick={handleSave} disabled={!name.trim()}>
          Save food
        </GlassButton>
      </div>
    </Sheet>
  );
}
