"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { GlassButton } from "@/components/ui/glass-button";
import { BarcodeScanner } from "@/components/food/barcode-scanner";
import { CustomFoodSheet } from "@/components/food/custom-food-sheet";
import { RecipeEditorSheet } from "@/components/food/recipe-editor-sheet";
import { SavedMealEditorSheet } from "@/components/food/saved-meal-editor-sheet";
import type { AppData, FoodItem, MealSlot } from "@/lib/models";
import { addFoodLogEntry, addSavedMealEntries, foodDraftToItem, upsertFoodInLibrary } from "@/lib/nutrition/food-log";
import { roundNutrition } from "@/lib/nutrition/daily-totals";

type SearchItem = { fdcId: number; name: string; brand?: string; caloriesPer100g?: number };

type Props = {
  open: boolean;
  onClose: () => void;
  data: AppData;
  date: string;
  defaultMeal?: MealSlot;
  setData: (updater: (prev: AppData) => AppData) => void;
};

type Tab = "recent" | "search" | "scan" | "library";

const MEALS: { id: MealSlot; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
];

export function AddFoodSheet({ open, onClose, data, date, defaultMeal = "breakfast", setData }: Props) {
  const [tab, setTab] = useState<Tab>("recent");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<Omit<FoodItem, "id" | "createdAt"> | null>(null);
  const [meal, setMeal] = useState<MealSlot>(defaultMeal);
  const [servings, setServings] = useState("1");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);
  const [libraryView, setLibraryView] = useState<"foods" | "recipes" | "meals">("foods");

  useEffect(() => {
    if (open) {
      setMeal(defaultMeal);
      setSelectedFood(null);
      setQuery("");
      setSearchResults([]);
      setTab("recent");
    }
  }, [open, defaultMeal]);

  const recentFoods = useMemo(() => {
    const ids = data.recentFoodIds ?? [];
    return ids.map((id) => data.foods.find((f) => f.id === id && !f.archived)).filter((f): f is FoodItem => Boolean(f));
  }, [data.recentFoodIds, data.foods]);

  useEffect(() => {
    if (tab !== "search" || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const ac = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/food/search?q=${encodeURIComponent(query.trim())}`, { signal: ac.signal });
        const payload = (await res.json()) as { items?: SearchItem[]; error?: string };
        if (!res.ok) throw new Error(payload.error ?? "Search failed");
        setSearchResults(payload.items ?? []);
      } catch (e) {
        if (ac.signal.aborted) return;
        setSearchError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (!ac.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [query, tab]);

  const logFood = useCallback(
    (food: FoodItem, mealSlot: MealSlot, servingCount: number) => {
      setData((prev) => {
        let next = upsertFoodInLibrary(prev, food);
        next = addFoodLogEntry(next, { date, meal: mealSlot, foodId: food.id, servings: servingCount });
        return next;
      });
      onClose();
    },
    [date, onClose, setData],
  );

  function confirmAdd() {
    if (!selectedFood) return;
    const food = foodDraftToItem(selectedFood);
    logFood(food, meal, Math.max(0.25, Number(servings) || 1));
  }

  function selectRecent(food: FoodItem) {
    setSelectedFood(food);
    setServings("1");
  }

  async function selectSearchItem(item: SearchItem) {
    setLoadingDetail(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/food/usda/${item.fdcId}`);
      const payload = (await res.json()) as { food?: Omit<FoodItem, "id" | "createdAt">; error?: string };
      if (!res.ok || !payload.food) throw new Error(payload.error ?? "Could not load food");
      setSelectedFood(payload.food);
      setServings("1");
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Could not load food");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleBarcode(code: string) {
    setLoadingDetail(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/food/barcode/${encodeURIComponent(code)}`);
      const payload = (await res.json()) as { food?: Omit<FoodItem, "id" | "createdAt">; error?: string };
      if (!res.ok || !payload.food) throw new Error(payload.error ?? "Product not found");
      setSelectedFood(payload.food);
      setServings("1");
      setTab("recent");
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Barcode lookup failed");
    } finally {
      setLoadingDetail(false);
    }
  }

  function logExistingFood(foodId: string) {
    const servingCount = Math.max(0.25, Number(servings) || 1);
    setData((prev) => addFoodLogEntry(prev, { date, meal, foodId, servings: servingCount }));
    onClose();
  }

  function logRecipe(recipeId: string) {
    const servingCount = Math.max(0.25, Number(servings) || 1);
    setData((prev) => addFoodLogEntry(prev, { date, meal, recipeId, servings: servingCount }));
    onClose();
  }

  function logSavedMeal(savedMealId: string) {
    const saved = data.savedMeals.find((m) => m.id === savedMealId);
    if (!saved) return;
    setData((prev) => addSavedMealEntries(prev, { date, meal, items: saved.items }));
    onClose();
  }

  const confirmPanel = selectedFood ? (
    <div className="ios-card-muted grid gap-3 p-3">
      <div>
        <p className="font-medium text-ios-label">{selectedFood.name}</p>
        {selectedFood.brand ? <p className="text-xs text-ios-secondary">{selectedFood.brand}</p> : null}
        <p className="mt-1 text-xs text-ios-secondary">
          {roundNutrition(selectedFood.calories, 0)} cal per {selectedFood.servingLabel}
        </p>
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
      <label className="grid gap-1 text-xs text-ios-secondary">
        Servings
        <input value={servings} onChange={(e) => setServings(e.target.value)} type="number" min={0.25} step={0.25} className="ios-field px-3 py-2 text-sm" />
      </label>
      <div className="flex gap-2">
        <GlassButton variant="secondary" onClick={() => setSelectedFood(null)}>Back</GlassButton>
        <GlassButton variant="primary" onClick={confirmAdd}>Add to {meal}</GlassButton>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Add food">
        <div className="grid gap-3">
          {confirmPanel ? (
            confirmPanel
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {(["recent", "search", "scan", "library"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-ios-tint text-white" : "glass-button text-ios-label"}`}
                  >
                    {t === "scan" ? "Scan" : t}
                  </button>
                ))}
              </div>

              {tab === "recent" ? (
                <div className="grid gap-2">
                  {recentFoods.length ? (
                    recentFoods.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => selectRecent(food)}
                        className="ios-card-muted rounded-xl px-3 py-2.5 text-left text-sm"
                      >
                        <span className="font-medium text-ios-label">{food.name}</span>
                        <span className="ml-2 text-xs text-ios-secondary">{roundNutrition(food.calories, 0)} cal</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-ios-secondary">No recent foods yet.</p>
                  )}
                </div>
              ) : null}

              {tab === "search" ? (
                <div className="grid gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search USDA foods…"
                    className="ios-field px-3 py-2.5 text-sm"
                    autoFocus
                  />
                  {searching ? <p className="text-sm text-ios-secondary">Searching…</p> : null}
                  {searchError ? <p className="text-sm text-copper">{searchError}</p> : null}
                  {loadingDetail ? <p className="text-sm text-ios-secondary">Loading nutrition…</p> : null}
                  {searchResults.map((item) => (
                    <button
                      key={item.fdcId}
                      type="button"
                      onClick={() => void selectSearchItem(item)}
                      className="ios-card-muted rounded-xl px-3 py-2.5 text-left text-sm"
                    >
                      <span className="font-medium text-ios-label">{item.name}</span>
                      {item.brand ? <span className="ml-1 text-xs text-ios-secondary">· {item.brand}</span> : null}
                      {typeof item.caloriesPer100g === "number" ? (
                        <span className="ml-2 text-xs text-ios-secondary">{Math.round(item.caloriesPer100g)} cal/100g</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}

              {tab === "scan" ? (
                <div className="grid gap-2">
                  <BarcodeScanner onScan={(code) => void handleBarcode(code)} />
                  {searchError ? <p className="text-sm text-copper">{searchError}</p> : null}
                  {loadingDetail ? <p className="text-sm text-ios-secondary">Looking up product…</p> : null}
                </div>
              ) : null}

              {tab === "library" ? (
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    {(["foods", "recipes", "meals"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setLibraryView(v)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${libraryView === v ? "bg-steel text-white" : "glass-button text-ios-label"}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {libraryView === "foods" ? (
                      <GlassButton variant="secondary" onClick={() => setCustomOpen(true)}>+ Custom food</GlassButton>
                    ) : null}
                    {libraryView === "recipes" ? (
                      <GlassButton variant="secondary" onClick={() => setRecipeOpen(true)}>+ Recipe</GlassButton>
                    ) : null}
                    {libraryView === "meals" ? (
                      <GlassButton variant="secondary" onClick={() => setMealOpen(true)}>+ Saved meal</GlassButton>
                    ) : null}
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
                  <label className="grid gap-1 text-xs text-ios-secondary">
                    Servings (for single-item log)
                    <input value={servings} onChange={(e) => setServings(e.target.value)} type="number" min={0.25} step={0.25} className="ios-field px-3 py-2 text-sm" />
                  </label>
                  {libraryView === "foods"
                    ? data.foods.filter((f) => !f.archived).map((food) => (
                        <button key={food.id} type="button" onClick={() => logExistingFood(food.id)} className="ios-card-muted rounded-xl px-3 py-2.5 text-left text-sm">
                          {food.name}
                        </button>
                      ))
                    : null}
                  {libraryView === "recipes"
                    ? data.recipes.map((recipe) => (
                        <button key={recipe.id} type="button" onClick={() => logRecipe(recipe.id)} className="ios-card-muted rounded-xl px-3 py-2.5 text-left text-sm">
                          {recipe.name}
                        </button>
                      ))
                    : null}
                  {libraryView === "meals"
                    ? data.savedMeals.map((saved) => (
                        <button key={saved.id} type="button" onClick={() => logSavedMeal(saved.id)} className="ios-card-muted rounded-xl px-3 py-2.5 text-left text-sm">
                          {saved.name} · {saved.items.length} items
                        </button>
                      ))
                    : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </Sheet>

      <CustomFoodSheet
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onSave={(draft) => {
          const food = foodDraftToItem(draft);
          setData((prev) => ({ ...prev, foods: [food, ...prev.foods] }));
        }}
      />
      <RecipeEditorSheet
        open={recipeOpen}
        onClose={() => setRecipeOpen(false)}
        data={data}
        onSave={(draft) => {
          setData((prev) => ({
            ...prev,
            recipes: [{ ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...prev.recipes],
          }));
        }}
      />
      <SavedMealEditorSheet
        open={mealOpen}
        onClose={() => setMealOpen(false)}
        data={data}
        onSave={(draft) => {
          setData((prev) => ({
            ...prev,
            savedMeals: [{ ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...prev.savedMeals],
          }));
        }}
      />
    </>
  );
}
