"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { GlassButton } from "@/components/ui/glass-button";
import type { AppData, Recipe } from "@/lib/models";
import { recipeNutritionPerServing } from "@/lib/nutrition/food-nutrition";
import { roundNutrition } from "@/lib/nutrition/daily-totals";

type Props = {
  open: boolean;
  onClose: () => void;
  data: AppData;
  initial?: Recipe;
  onSave: (recipe: Omit<Recipe, "id" | "createdAt">) => void;
};

export function RecipeEditorSheet({ open, onClose, data, initial, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [servings, setServings] = useState(String(initial?.servings ?? 1));
  const [ingredients, setIngredients] = useState(initial?.ingredients ?? []);
  const [pickFoodId, setPickFoodId] = useState("");
  const [pickServings, setPickServings] = useState("1");

  const draftRecipe = useMemo(
    (): Recipe => ({
      id: initial?.id ?? "draft",
      name: name.trim() || "Recipe",
      servings: Math.max(1, Number(servings) || 1),
      ingredients,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }),
    [initial, name, servings, ingredients],
  );

  const perServing = recipeNutritionPerServing(data, draftRecipe);

  const libraryFoods = data.foods.filter((f) => !f.archived);

  function addIngredient() {
    if (!pickFoodId) return;
    const s = Math.max(0.25, Number(pickServings) || 1);
    setIngredients((prev) => [...prev, { foodId: pickFoodId, servings: s }]);
    setPickFoodId("");
    setPickServings("1");
  }

  function handleSave() {
    if (!name.trim() || !ingredients.length) return;
    onSave({
      name: name.trim(),
      servings: Math.max(1, Number(servings) || 1),
      ingredients,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "Edit recipe" : "New recipe"}>
      <div className="grid gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe name" className="ios-field px-3 py-2 text-sm" />
        <input value={servings} onChange={(e) => setServings(e.target.value)} placeholder="Servings" type="number" min={1} className="ios-field px-3 py-2 text-sm" />

        <div className="ios-card-muted grid gap-2 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ios-secondary">Ingredients</p>
          {ingredients.map((ing, idx) => {
            const food = libraryFoods.find((f) => f.id === ing.foodId);
            return (
              <div key={`${ing.foodId}-${idx}`} className="flex items-center justify-between text-sm">
                <span>{food?.name ?? ing.foodId} · {ing.servings} srv</span>
                <button type="button" onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== idx))} className="text-copper">
                  Remove
                </button>
              </div>
            );
          })}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <select value={pickFoodId} onChange={(e) => setPickFoodId(e.target.value)} className="ios-field px-3 py-2 text-sm">
              <option value="">Select food…</option>
              {libraryFoods.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <input value={pickServings} onChange={(e) => setPickServings(e.target.value)} type="number" min={0.25} step={0.25} className="ios-field w-20 px-2 py-2 text-sm" />
            <GlassButton variant="secondary" onClick={addIngredient} disabled={!pickFoodId}>Add</GlassButton>
          </div>
        </div>

        {perServing ? (
          <p className="text-xs text-ios-secondary">
            Per serving: {roundNutrition(perServing.calories, 0)} cal · P {roundNutrition(perServing.proteinG, 0)}g · C {roundNutrition(perServing.carbsG, 0)}g · F {roundNutrition(perServing.fatG, 0)}g
          </p>
        ) : null}

        <GlassButton variant="primary" onClick={handleSave} disabled={!name.trim() || !ingredients.length}>
          Save recipe
        </GlassButton>
      </div>
    </Sheet>
  );
}
