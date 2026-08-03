"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { useAppData } from "@/lib/storage";

export default function HealthSettingsPage() {
  const { ready } = useAppData();

  if (!ready) {
    return (
      <AppShell title="Health settings" description="">
        <p className="text-sm text-ios-secondary">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Health settings" description="">
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
