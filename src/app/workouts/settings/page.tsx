"use client";

import { MeasurementUnitsCard } from "@/components/measurement-units-card";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { useAppData } from "@/lib/storage";

export default function WorkoutSettingsPage() {
  const { ready } = useAppData();

  if (!ready) return <div className="p-6">Loading...</div>;

  return (
    <AppShell title="Workout settings" description="Units used when logging strength, body weight, and run or bike distance.">
      <SectionCard title="About">
        <p className="text-sm text-zinc-600">
          These preferences apply across the app wherever workouts and related goals use weight or run/bike distance
          (including the Goals tab). Change them here anytime.
        </p>
      </SectionCard>
      <MeasurementUnitsCard />
    </AppShell>
  );
}
