"use client";

import { useEffect, useRef, useState } from "react";
import { HealthShell } from "@/components/health/health-shell";
import { AddFoodSheet } from "@/components/food/add-food-sheet";
import { FoodDaySummary } from "@/components/food/food-day-summary";
import { MealSection } from "@/components/food/meal-section";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Sheet } from "@/components/ui/sheet";
import type { FoodLogEntry, MealSlot } from "@/lib/models";
import { useAppData, useTodayKey } from "@/lib/storage";

export default function FoodPage() {
  const { data, ready, setData } = useAppData();
  const today = useTodayKey();
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const lastTodayRef = useRef<string | null>(null);
  const foodDate = pickedDate ?? today ?? "";

  const [addOpen, setAddOpen] = useState(false);
  const [addMeal, setAddMeal] = useState<MealSlot>("breakfast");
  const [expandedMicros, setExpandedMicros] = useState(false);
  const [editEntry, setEditEntry] = useState<FoodLogEntry | null>(null);
  const [editServings, setEditServings] = useState("1");

  useEffect(() => {
    if (!today) return;
    if (pickedDate === null) setPickedDate(today);
    else if (lastTodayRef.current && lastTodayRef.current !== today && pickedDate === lastTodayRef.current) {
      setPickedDate(today);
    }
    lastTodayRef.current = today;
  }, [today, pickedDate]);

  function openAdd(meal: MealSlot) {
    setAddMeal(meal);
    setAddOpen(true);
  }

  function deleteEntry(entryId: string) {
    setData((prev) => ({
      ...prev,
      foodLogEntries: prev.foodLogEntries.filter((e) => e.id !== entryId),
    }));
  }

  function startEdit(entry: FoodLogEntry) {
    setEditEntry(entry);
    setEditServings(String(entry.servings));
  }

  function saveEdit() {
    if (!editEntry) return;
    const servings = Math.max(0.25, Number(editServings) || 1);
    setData((prev) => ({
      ...prev,
      foodLogEntries: prev.foodLogEntries.map((e) => (e.id === editEntry.id ? { ...e, servings } : e)),
    }));
    setEditEntry(null);
  }

  if (!ready || !foodDate) {
    return (
      <HealthShell title="Food" description="">
        <p className="text-sm text-ios-secondary">Loading…</p>
      </HealthShell>
    );
  }

  return (
    <HealthShell
      title="Food"
      description=""
      header={
        <input
          type="date"
          value={foodDate}
          max={today || undefined}
          onChange={(e) => setPickedDate(e.target.value)}
          className="ios-field w-full max-w-[11rem] px-3 py-2.5 text-sm font-medium"
        />
      }
    >
      <GlassButton variant="primary" onClick={() => openAdd("breakfast")}>
        + Add Food
      </GlassButton>

      <FoodDaySummary
        data={data}
        date={foodDate}
        expandedMicros={expandedMicros}
        onToggleMicros={() => setExpandedMicros((v) => !v)}
      />

      <SectionCard title="Breakfast" inset={false}>
        <MealSection
          data={data}
          date={foodDate}
          meal="breakfast"
          onEditEntry={startEdit}
          onDeleteEntry={deleteEntry}
        />
        <div className="mt-2 px-1">
          <button type="button" onClick={() => openAdd("breakfast")} className="text-xs font-medium text-ios-tint">
            + Add to breakfast
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Lunch" inset={false}>
        <MealSection data={data} date={foodDate} meal="lunch" onEditEntry={startEdit} onDeleteEntry={deleteEntry} />
        <div className="mt-2 px-1">
          <button type="button" onClick={() => openAdd("lunch")} className="text-xs font-medium text-ios-tint">
            + Add to lunch
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Dinner" inset={false}>
        <MealSection data={data} date={foodDate} meal="dinner" onEditEntry={startEdit} onDeleteEntry={deleteEntry} />
        <div className="mt-2 px-1">
          <button type="button" onClick={() => openAdd("dinner")} className="text-xs font-medium text-ios-tint">
            + Add to dinner
          </button>
        </div>
      </SectionCard>

      <AddFoodSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        data={data}
        date={foodDate}
        defaultMeal={addMeal}
        setData={setData}
      />

      <Sheet open={Boolean(editEntry)} onClose={() => setEditEntry(null)} title="Edit servings">
        <div className="grid gap-3">
          <input
            value={editServings}
            onChange={(e) => setEditServings(e.target.value)}
            type="number"
            min={0.25}
            step={0.25}
            className="ios-field px-3 py-2 text-sm"
          />
          <GlassButton variant="primary" onClick={saveEdit}>
            Save
          </GlassButton>
        </div>
      </Sheet>
    </HealthShell>
  );
}
