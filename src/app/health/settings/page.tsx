"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { NutritionCalculatorCard } from "@/components/health/nutrition-calculator-card";
import { CURATED_NUTRIENTS } from "@/lib/nutrition/nutrients";
import type { CuratedNutrientId, NutritionGoals } from "@/lib/models";
import { useAppData } from "@/lib/storage";

export default function HealthSettingsPage() {
  const { data, ready, setData } = useAppData();
  const goals = data.nutritionGoals ?? {};
  const [calories, setCalories] = useState(String(goals.calories ?? ""));
  const [proteinG, setProteinG] = useState(String(goals.proteinG ?? ""));
  const [carbsG, setCarbsG] = useState(String(goals.carbsG ?? ""));
  const [fatG, setFatG] = useState(String(goals.fatG ?? ""));
  const [enabledMicros, setEnabledMicros] = useState<CuratedNutrientId[]>(goals.enabledMicronutrients ?? []);
  const [microGoals, setMicroGoals] = useState<Partial<Record<CuratedNutrientId, string>>>(() => {
    const init: Partial<Record<CuratedNutrientId, string>> = {};
    for (const meta of CURATED_NUTRIENTS) {
      const val = goals.micronutrients?.[meta.id];
      if (typeof val === "number") init[meta.id] = String(val);
    }
    return init;
  });

  const enabledSet = useMemo(() => new Set(enabledMicros), [enabledMicros]);

  function toggleMicro(id: CuratedNutrientId) {
    setEnabledMicros((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function saveManualGoals() {
    const nextGoals: NutritionGoals = {
      calories: Number(calories) > 0 ? Number(calories) : undefined,
      proteinG: Number(proteinG) > 0 ? Number(proteinG) : undefined,
      carbsG: Number(carbsG) > 0 ? Number(carbsG) : undefined,
      fatG: Number(fatG) > 0 ? Number(fatG) : undefined,
      enabledMicronutrients: enabledMicros.length ? enabledMicros : undefined,
      micronutrients: {},
    };
    for (const id of enabledMicros) {
      const val = Number(microGoals[id]);
      if (val > 0) nextGoals.micronutrients![id] = val;
    }
    if (!Object.keys(nextGoals.micronutrients!).length) delete nextGoals.micronutrients;
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

      <SectionCard title="Daily goals" subtitle="Manual overrides for calories and macros." inset={false}>
        <div className="ios-card grid gap-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Calories" type="number" className="ios-field px-3 py-2 text-sm" />
            <input value={proteinG} onChange={(e) => setProteinG(e.target.value)} placeholder="Protein (g)" type="number" className="ios-field px-3 py-2 text-sm" />
            <input value={carbsG} onChange={(e) => setCarbsG(e.target.value)} placeholder="Carbs (g)" type="number" className="ios-field px-3 py-2 text-sm" />
            <input value={fatG} onChange={(e) => setFatG(e.target.value)} placeholder="Fat (g)" type="number" className="ios-field px-3 py-2 text-sm" />
          </div>
          <GlassButton variant="primary" onClick={saveManualGoals}>
            Save goals
          </GlassButton>
        </div>
      </SectionCard>

      <SectionCard title="Micronutrients" subtitle="Choose which nutrients to track and set daily targets." inset={false}>
        <div className="ios-card grid gap-3 p-4">
          {CURATED_NUTRIENTS.map((meta) => (
            <div key={meta.id} className="grid gap-2 border-b border-ios-separator/40 pb-3 last:border-b-0 last:pb-0">
              <label className="flex items-center gap-2 text-sm text-ios-label">
                <input type="checkbox" checked={enabledSet.has(meta.id)} onChange={() => toggleMicro(meta.id)} />
                {meta.label}
              </label>
              {enabledSet.has(meta.id) ? (
                <input
                  value={microGoals[meta.id] ?? ""}
                  onChange={(e) => setMicroGoals((prev) => ({ ...prev, [meta.id]: e.target.value }))}
                  placeholder={`Daily ${meta.unit}`}
                  type="number"
                  className="ios-field px-3 py-2 text-sm"
                />
              ) : null}
            </div>
          ))}
          <GlassButton variant="primary" onClick={saveManualGoals}>
            Save micronutrient goals
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
