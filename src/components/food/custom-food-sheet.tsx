"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { GlassButton } from "@/components/ui/glass-button";
import type { FoodItem } from "@/lib/models";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (food: Omit<FoodItem, "id" | "createdAt">) => void;
  initial?: Partial<FoodItem>;
};

export function CustomFoodSheet({ open, onClose, onSave, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [servingLabel, setServingLabel] = useState(initial?.servingLabel ?? "1 serving");
  const [servingGrams, setServingGrams] = useState(String(initial?.servingGrams ?? 100));
  const [calories, setCalories] = useState(String(initial?.calories ?? ""));
  const [proteinG, setProteinG] = useState(String(initial?.proteinG ?? ""));
  const [carbsG, setCarbsG] = useState(String(initial?.carbsG ?? ""));
  const [fatG, setFatG] = useState(String(initial?.fatG ?? ""));

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      brand: brand.trim() || undefined,
      source: "custom",
      servingLabel: servingLabel.trim() || "1 serving",
      servingGrams: Math.max(1, Number(servingGrams) || 100),
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
          <input value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} placeholder="Serving label" className="ios-field px-3 py-2 text-sm" />
          <input value={servingGrams} onChange={(e) => setServingGrams(e.target.value)} placeholder="Serving grams" type="number" min={1} className="ios-field px-3 py-2 text-sm" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Calories" type="number" className="ios-field px-3 py-2 text-sm" />
          <input value={proteinG} onChange={(e) => setProteinG(e.target.value)} placeholder="Protein (g)" type="number" className="ios-field px-3 py-2 text-sm" />
          <input value={carbsG} onChange={(e) => setCarbsG(e.target.value)} placeholder="Carbs (g)" type="number" className="ios-field px-3 py-2 text-sm" />
          <input value={fatG} onChange={(e) => setFatG(e.target.value)} placeholder="Fat (g)" type="number" className="ios-field px-3 py-2 text-sm" />
        </div>
        <GlassButton variant="primary" onClick={handleSave} disabled={!name.trim()}>
          Save food
        </GlassButton>
      </div>
    </Sheet>
  );
}
