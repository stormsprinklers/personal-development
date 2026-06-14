"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { GlassButton } from "@/components/ui/glass-button";
import type { AppData, SavedMeal } from "@/lib/models";

type Props = {
  open: boolean;
  onClose: () => void;
  data: AppData;
  initial?: SavedMeal;
  onSave: (meal: Omit<SavedMeal, "id" | "createdAt">) => void;
};

export function SavedMealEditorSheet({ open, onClose, data, initial, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [items, setItems] = useState(initial?.items ?? []);
  const [pickType, setPickType] = useState<"food" | "recipe">("food");
  const [pickId, setPickId] = useState("");
  const [pickServings, setPickServings] = useState("1");

  const libraryFoods = data.foods.filter((f) => !f.archived);
  const recipes = data.recipes;

  function addItem() {
    if (!pickId) return;
    const servings = Math.max(0.25, Number(pickServings) || 1);
    setItems((prev) => [
      ...prev,
      pickType === "food" ? { foodId: pickId, servings } : { recipeId: pickId, servings },
    ]);
    setPickId("");
    setPickServings("1");
  }

  function handleSave() {
    if (!name.trim() || !items.length) return;
    onSave({ name: name.trim(), items });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "Edit saved meal" : "New saved meal"}>
      <div className="grid gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name" className="ios-field px-3 py-2 text-sm" />

        <div className="ios-card-muted grid gap-2 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ios-secondary">Items</p>
          {items.map((item, idx) => {
            const label = item.foodId
              ? libraryFoods.find((f) => f.id === item.foodId)?.name
              : recipes.find((r) => r.id === item.recipeId)?.name;
            return (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span>{label ?? "Unknown"} · {item.servings} srv</span>
                <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="text-copper">
                  Remove
                </button>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <select value={pickType} onChange={(e) => { setPickType(e.target.value as "food" | "recipe"); setPickId(""); }} className="ios-field px-2 py-2 text-sm">
              <option value="food">Food</option>
              <option value="recipe">Recipe</option>
            </select>
            <select value={pickId} onChange={(e) => setPickId(e.target.value)} className="ios-field min-w-0 flex-1 px-2 py-2 text-sm">
              <option value="">Select…</option>
              {pickType === "food"
                ? libraryFoods.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)
                : recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input value={pickServings} onChange={(e) => setPickServings(e.target.value)} type="number" min={0.25} step={0.25} className="ios-field w-20 px-2 py-2 text-sm" />
            <GlassButton variant="secondary" onClick={addItem} disabled={!pickId}>Add</GlassButton>
          </div>
        </div>

        <GlassButton variant="primary" onClick={handleSave} disabled={!name.trim() || !items.length}>
          Save meal
        </GlassButton>
      </div>
    </Sheet>
  );
}
