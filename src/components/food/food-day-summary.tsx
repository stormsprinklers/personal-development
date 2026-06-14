import type { AppData, NutritionGoals } from "@/lib/models";
import { dailyNutritionTotals, roundNutrition } from "@/lib/nutrition/daily-totals";
import { nutrientMetaById } from "@/lib/nutrition/nutrients";

type Props = {
  data: AppData;
  date: string;
  expandedMicros?: boolean;
  onToggleMicros?: () => void;
};

function formatCal(n: number): string {
  return Math.round(n).toLocaleString();
}

export function FoodDaySummary({ data, date, expandedMicros, onToggleMicros }: Props) {
  const goals: NutritionGoals = data.nutritionGoals ?? {};
  const totals = dailyNutritionTotals(data, date);

  const goalCal = goals.calories ?? 0;
  const eatenCal = totals.calories;
  const remainingCal = goalCal > 0 ? goalCal - eatenCal : 0;

  const proteinGoal = goals.proteinG ?? 0;
  const carbsGoal = goals.carbsG ?? 0;
  const fatGoal = goals.fatG ?? 0;

  const proteinPct = proteinGoal > 0 ? Math.min(1, totals.proteinG / proteinGoal) : 0;
  const carbsPct = carbsGoal > 0 ? Math.min(1, totals.carbsG / carbsGoal) : 0;
  const fatPct = fatGoal > 0 ? Math.min(1, totals.fatG / fatGoal) : 0;

  const macroSum = proteinPct + carbsPct + fatPct;
  const proteinWidth = macroSum > 0 ? (proteinPct / macroSum) * 100 : 0;
  const carbsWidth = macroSum > 0 ? (carbsPct / macroSum) * 100 : 0;
  const fatWidth = macroSum > 0 ? (fatPct / macroSum) * 100 : 0;

  const enabledMicros = goals.enabledMicronutrients ?? [];

  return (
    <div className="ios-card grid gap-3 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        {goalCal > 0 ? (
          <>
            <span className="font-semibold text-ios-label">{formatCal(goalCal)} goal</span>
            <span className="text-ios-secondary">·</span>
            <span className="text-ios-label">{formatCal(eatenCal)} eaten</span>
            <span className="text-ios-secondary">·</span>
            <span className={remainingCal < 0 ? "text-copper" : "text-emerald"}>
              {formatCal(Math.abs(remainingCal))} {remainingCal < 0 ? "over" : "left"}
            </span>
          </>
        ) : (
          <span className="text-ios-secondary">{formatCal(eatenCal)} cal eaten · Set goals in Health settings</span>
        )}
      </div>

      {(proteinGoal > 0 || carbsGoal > 0 || fatGoal > 0) && (
        <>
          <div className="h-2.5 overflow-hidden rounded-full bg-ios-fill">
            <div className="flex h-full w-full">
              {proteinWidth > 0 ? (
                <div className="h-full bg-steel transition-all" style={{ width: `${proteinWidth}%` }} />
              ) : null}
              {carbsWidth > 0 ? (
                <div className="h-full bg-ios-tint/80 transition-all" style={{ width: `${carbsWidth}%` }} />
              ) : null}
              {fatWidth > 0 ? (
                <div className="h-full bg-copper/70 transition-all" style={{ width: `${fatWidth}%` }} />
              ) : null}
            </div>
          </div>
          <div className="grid gap-1 text-xs text-ios-secondary sm:grid-cols-3">
            <span>
              {roundNutrition(totals.proteinG, 0)}/{proteinGoal || "—"}g Protein
            </span>
            <span>
              {roundNutrition(totals.carbsG, 0)}/{carbsGoal || "—"}g Carbs
            </span>
            <span>
              {roundNutrition(totals.fatG, 0)}/{fatGoal || "—"}g Fat
            </span>
          </div>
        </>
      )}

      {enabledMicros.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={onToggleMicros}
            className="text-xs font-medium text-ios-tint"
          >
            {expandedMicros ? "Hide micronutrients" : "Show micronutrients"}
          </button>
          {expandedMicros ? (
            <div className="mt-2 grid gap-2">
              {enabledMicros.map((id) => {
                const meta = nutrientMetaById(id);
                if (!meta) return null;
                const current = totals.micronutrients[id] ?? 0;
                const target = goals.micronutrients?.[id] ?? 0;
                return (
                  <div key={id} className="flex items-center justify-between text-xs">
                    <span className="text-ios-label">{meta.label}</span>
                    <span className="text-ios-secondary">
                      {roundNutrition(current, 1)}/{target > 0 ? roundNutrition(target, 1) : "—"} {meta.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
