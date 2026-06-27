import type { AppData, NutritionGoals } from "@/lib/models";
import { dailyNutritionTotals, roundNutrition } from "@/lib/nutrition/daily-totals";

type Props = {
  data: AppData;
  date: string;
};

function formatCal(n: number): string {
  return Math.round(n).toLocaleString();
}

export function FoodDaySummary({ data, date }: Props) {
  const goals: NutritionGoals = data.nutritionGoals ?? {};
  const totals = dailyNutritionTotals(data, date);

  const goalCal = goals.calories ?? 0;
  const eatenCal = totals.calories;
  const remainingCal = goalCal > 0 ? goalCal - eatenCal : 0;

  const proteinGoal = goals.proteinG ?? 0;
  const proteinPct = proteinGoal > 0 ? Math.min(100, (totals.proteinG / proteinGoal) * 100) : 0;

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
          <span className="text-ios-secondary">
            {formatCal(eatenCal)} cal eaten · Set goals in Health settings
          </span>
        )}
      </div>

      {proteinGoal > 0 ? (
        <div>
          <div className="mb-1 flex justify-between text-xs text-ios-secondary">
            <span>Protein</span>
            <span>
              {roundNutrition(totals.proteinG, 0)}/{proteinGoal}g
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ios-fill">
            <div className="h-full rounded-full bg-steel transition-all" style={{ width: `${proteinPct}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-xs text-ios-secondary">{roundNutrition(totals.proteinG, 0)}g protein eaten</p>
      )}
    </div>
  );
}
