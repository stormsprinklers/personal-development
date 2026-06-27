"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { GlassButton } from "@/components/ui/glass-button";
import type { AppData, FoodLogEntry, MealSlot } from "@/lib/models";
import { addFoodLogEntry } from "@/lib/nutrition/food-log";

type Props = {
  open: boolean;
  onClose: () => void;
  data: AppData;
  date: string;
  defaultMeal?: MealSlot;
  editEntry?: FoodLogEntry | null;
  setData: (updater: (prev: AppData) => AppData) => void;
};

const MEALS: { id: MealSlot; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
];

export function AddFoodSheet({
  open,
  onClose,
  data,
  date,
  defaultMeal = "breakfast",
  editEntry = null,
  setData,
}: Props) {
  const [name, setName] = useState("");
  const [portion, setPortion] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [meal, setMeal] = useState<MealSlot>(defaultMeal);

  useEffect(() => {
    if (!open) return;
    setMeal(editEntry?.meal ?? defaultMeal);
    if (editEntry?.foodId) {
      const food = data.foods.find((f) => f.id === editEntry.foodId);
      setName(food?.name ?? "");
      setPortion(food?.servingLabel ?? "");
      setCalories(food ? String(food.calories) : "");
      setProteinG(food ? String(food.proteinG) : "");
    } else {
      setName("");
      setPortion("");
      setCalories("");
      setProteinG("");
    }
  }, [open, defaultMeal, editEntry, data.foods]);

  function handleSave() {
    const trimmedName = name.trim();
    const trimmedPortion = portion.trim();
    if (!trimmedName || !trimmedPortion) return;

    const cal = Number(calories) || 0;
    const protein = Number(proteinG) || 0;

    if (editEntry?.foodId) {
      setData((prev) => ({
        ...prev,
        foods: prev.foods.map((f) =>
          f.id === editEntry.foodId
            ? {
                ...f,
                name: trimmedName,
                servingLabel: trimmedPortion,
                calories: cal,
                proteinG: protein,
                carbsG: 0,
                fatG: 0,
              }
            : f,
        ),
        foodLogEntries: prev.foodLogEntries.map((e) =>
          e.id === editEntry.id ? { ...e, meal } : e,
        ),
      }));
    } else {
      const foodId = crypto.randomUUID();
      setData((prev) => {
        const withFood = {
          ...prev,
          foods: [
            {
              id: foodId,
              name: trimmedName,
              source: "custom" as const,
              servingLabel: trimmedPortion,
              servingGrams: 100,
              calories: cal,
              proteinG: protein,
              carbsG: 0,
              fatG: 0,
              createdAt: new Date().toISOString(),
            },
            ...prev.foods,
          ],
        };
        return addFoodLogEntry(withFood, { date, meal, foodId, servings: 1 });
      });
    }

    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={editEntry ? "Edit food" : "Add food"}>
      <div className="grid gap-3">
        <label className="grid gap-1 text-xs font-medium text-ios-secondary">
          Food name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chicken breast"
            className="ios-field px-3 py-2.5 text-sm"
            autoFocus
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-ios-secondary">
          Portion size
          <input
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
            placeholder="e.g. 6 oz, 1 cup, 2 slices"
            className="ios-field px-3 py-2.5 text-sm"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-ios-secondary">
            Calories
            <input
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              type="number"
              min={0}
              placeholder="0"
              className="ios-field px-3 py-2.5 text-sm"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-ios-secondary">
            Protein (g)
            <input
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              type="number"
              min={0}
              step={0.1}
              placeholder="0"
              className="ios-field px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {MEALS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMeal(m.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${meal === m.id ? "bg-ios-tint text-white" : "glass-button text-ios-label"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <GlassButton
          variant="primary"
          onClick={handleSave}
          disabled={!name.trim() || !portion.trim()}
        >
          {editEntry ? "Save changes" : "Add to log"}
        </GlassButton>
      </div>
    </Sheet>
  );
}
