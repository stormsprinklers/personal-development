"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
import type { PartnerDashboardSnapshot } from "@/lib/accountability/partner-snapshot";

type PartnerListItem = {
  linkId: string;
  userId: string;
  displayName: string;
};

type Props = {
  date: string;
};

export function DashboardAccountabilitySection({ date }: Props) {
  const [partners, setPartners] = useState<PartnerListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<PartnerDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/accountability/partners", { cache: "no-store" });
        const payload = (await res.json()) as {
          partners?: Array<{ linkId: string; userId: string; displayName: string; theyShareWithMe: boolean }>;
          error?: string;
        };
        if (!res.ok) throw new Error(payload.error ?? "Could not load partners.");
        const list = (payload.partners ?? []).filter((p) => p.theyShareWithMe);
        if (!cancelled) {
          setPartners(list);
          setSelectedId(list[0]?.userId ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load partners.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId || !date) {
      setSnapshot(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/accountability/partner/${selectedId}/snapshot?date=${encodeURIComponent(date)}`,
          { cache: "no-store" },
        );
        const payload = (await res.json()) as { snapshot?: PartnerDashboardSnapshot; error?: string };
        if (!res.ok) throw new Error(payload.error ?? "Could not load partner data.");
        if (!cancelled) setSnapshot(payload.snapshot ?? null);
      } catch (e) {
        if (!cancelled) {
          setSnapshot(null);
          setError(e instanceof Error ? e.message : "Failed to load partner snapshot.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, date]);

  if (loading) {
    return (
      <SectionCard title="Accountability" inset={false}>
        <p className="text-sm text-ios-secondary">Loading partners…</p>
      </SectionCard>
    );
  }

  if (!partners.length) {
    return (
      <SectionCard title="Accountability" inset={false}>
        <p className="ios-card-muted p-4 text-sm text-ios-secondary">
          No partners are sharing with you yet. Add someone by code in Settings → Accountability.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Accountability" inset={false}>
      <div className="ios-card grid gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {partners.map((p) => (
            <button
              key={p.userId}
              type="button"
              onClick={() => setSelectedId(p.userId)}
              className={`glass-button rounded-full px-4 py-2 text-sm font-semibold ${
                selectedId === p.userId ? "glass-button-tint text-white" : "text-ios-label"
              }`}
            >
              {p.displayName}
            </button>
          ))}
        </div>

        {error ? <p className="text-sm text-copper">{error}</p> : null}

        {snapshot ? (
          <div className="grid gap-4">
            <div>
              <p className="ios-footnote font-medium uppercase tracking-wide text-ios-secondary">Goals ({snapshot.goalYear})</p>
              <p className="mt-1 text-2xl font-semibold text-ios-label">{snapshot.goalProgress.percent}%</p>
              <p className="text-sm text-ios-secondary">
                {snapshot.goalProgress.done} of {snapshot.goalProgress.total} completed
              </p>
              <ul className="mt-2 grid gap-1">
                {snapshot.goals.slice(0, 5).map((g) => (
                  <li key={g.id} className="text-sm text-ios-label">
                    {g.completed ? "✓" : "○"} {g.title}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="ios-footnote font-medium uppercase tracking-wide text-ios-secondary">Habits today</p>
              <ul className="mt-2 grid gap-1">
                {snapshot.habits.map((h) => (
                  <li key={h.id} className="text-sm text-ios-label">
                    {h.todayCompleted === true ? "✓" : h.todayCompleted === false ? "✗" : "—"} {h.name}
                    {h.streakApprox > 0 ? (
                      <span className="text-ios-secondary"> · {h.streakApprox}d streak</span>
                    ) : null}
                  </li>
                ))}
                {!snapshot.habits.length ? (
                  <li className="text-sm text-ios-secondary">No active habits</li>
                ) : null}
              </ul>
            </div>

            <div>
              <p className="ios-footnote font-medium uppercase tracking-wide text-ios-secondary">Workouts this week</p>
              <p className="mt-1 text-sm text-ios-label">{snapshot.weeklyWorkoutCount} session(s)</p>
              {snapshot.weeklyStrengthTop.length ? (
                <ul className="mt-1 grid gap-1">
                  {snapshot.weeklyStrengthTop.map((row) => (
                    <li key={row.exerciseName} className="text-sm text-ios-secondary">
                      {row.exerciseName}: {row.totalSets} sets, top {row.topWeight}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div>
              <p className="ios-footnote font-medium uppercase tracking-wide text-ios-secondary">Daily summary</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ios-label">
                {snapshot.dailyAiSummary ?? "No summary for this day."}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ios-secondary">Select a partner to view their progress.</p>
        )}
      </div>
    </SectionCard>
  );
}
