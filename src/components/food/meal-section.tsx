import type { AppData, FoodLogEntry, MealSlot } from "@/lib/models";
import { logEntryLabel, resolveLogEntryNutrition } from "@/lib/nutrition/food-nutrition";
import { roundNutrition } from "@/lib/nutrition/daily-totals";

type Props = {
  data: AppData;
  date: string;
  meal: MealSlot;
  onEditEntry: (entry: FoodLogEntry) => void;
  onDeleteEntry: (entryId: string) => void;
};

function entryPortion(data: AppData, entry: FoodLogEntry): string | null {
  if (!entry.foodId) return null;
  return data.foods.find((f) => f.id === entry.foodId)?.servingLabel ?? null;
}

export function MealSection({ data, date, meal, onEditEntry, onDeleteEntry }: Props) {
  const entries = data.foodLogEntries.filter((e) => e.date === date && e.meal === meal);

  return (
    <div className="ios-card overflow-hidden">
      {entries.length ? (
        <ul>
          {entries.map((entry) => {
            const nutrition = resolveLogEntryNutrition(data, entry);
            const label = logEntryLabel(data, entry);
            const portion = entryPortion(data, entry);
            return (
              <li key={entry.id} className="flex items-center gap-2 border-b border-ios-separator/40 px-4 py-3 last:border-b-0">
                <button type="button" onClick={() => onEditEntry(entry)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-ios-label">{label}</p>
                  <p className="text-xs text-ios-secondary">
                    {portion ?? "—"}
                    {nutrition
                      ? ` · ${roundNutrition(nutrition.calories, 0)} cal · ${roundNutrition(nutrition.proteinG, 0)}g protein`
                      : ""}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEntry(entry.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-copper"
                  aria-label={`Remove ${label}`}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-ios-secondary">No foods logged.</p>
      )}
    </div>
  );
}
