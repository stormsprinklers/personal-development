"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { NutritionCalculatorCard } from "@/components/health/nutrition-calculator-card";
import type { NutritionGoals } from "@/lib/models";
import { useAppData } from "@/lib/storage";

export default function HealthSettingsPage() {
  const { data, ready, setData } = useAppData();
  const goals = data.nutritionGoals ?? {};
  const [calories, setCalories] = useState(String(goals.calories ?? ""));
  const [proteinG, setProteinG] = useState(String(goals.proteinG ?? ""));

  function saveGoals() {
    const nextGoals: NutritionGoals = {
      calories: Number(calories) > 0 ? Number(calories) : undefined,
      proteinG: Number(proteinG) > 0 ? Number(proteinG) : undefined,
    };
    setData((prev) => ({ ...prev, nutritionGoals: nextGoals }));
  }

  if (!ready) {
    return (
      <AppShell title="Health settings" description="">
        <p className="text-sm text-ios-secondary">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Health settings" description="">
      <NutritionCalculatorCard data={data} setData={setData} />

      <SectionCard title="Daily goals" subtitle="Calorie and protein targets for the Food tab." inset={false}>
        <div className="ios-card grid gap-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="Calories"
              type="number"
              className="ios-field px-3 py-2 text-sm"
            />
            <input
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              placeholder="Protein (g)"
              type="number"
              className="ios-field px-3 py-2 text-sm"
            />
          </div>
          <GlassButton variant="primary" onClick={saveGoals}>
            Save goals
          </GlassButton>
        </div>
      </SectionCard>

      <SectionCard title="Workout settings" inset={false}>
        <div className="ios-card p-4">
          <Link href="/health/workouts/settings" className="text-sm font-medium text-ios-tint underline">
            Units and exercise library
          </Link>
        </div>
      </SectionCard>
    </AppShell>
  );
}
