"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Sheet } from "@/components/ui/sheet";
import type { PartnerDashboardSnapshot } from "@/lib/accountability/partner-snapshot";
import { buildHabitCalendarData } from "@/lib/metrics/habit-calendar";

type PartnerListItem = {
  linkId: string;
  userId: string;
  displayName: string;
};

type Props = {
  date: string;
  actions?: React.ReactNode;
};

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PartnerSectionBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ios-card-muted rounded-2xl p-4">
      <h3 className="text-base font-bold tracking-tight text-ios-label">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function GoalProgressRow({
  title,
  sectionName,
  completed,
  progressPercent,
}: {
  title: string;
  sectionName: string;
  completed: boolean;
  progressPercent: number;
}) {
  const progress = completed ? 100 : progressPercent;
  return (
    <div className="rounded-xl bg-ios-surface px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ios-label">
            {completed ? "✓ " : ""}
            {title}
          </p>
          <p className="text-xs text-ios-secondary">{sectionName}</p>
        </div>
        <span className="shrink-0 text-sm font-bold text-ios-label">{progress}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ios-fill">
        <div className="h-full rounded-full bg-steel transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function PartnerHabitCalendarSheet({
  open,
  habitName,
  anchorDate,
  habitId,
  logs,
  onClose,
}: {
  open: boolean;
  habitName: string;
  anchorDate: string;
  habitId: string;
  logs: PartnerDashboardSnapshot["habitLogsRecent"];
  onClose: () => void;
}) {
  const calendar = useMemo(
    () => (open ? buildHabitCalendarData(habitId, logs, anchorDate) : null),
    [open, habitId, logs, anchorDate],
  );

  return (
    <Sheet open={open} onClose={onClose} title={habitName}>
      {calendar ? (
        <>
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="ios-footnote">Last 30 days</p>
            <div className="text-right">
              <p className="text-sm font-semibold text-ios-label">{calendar.goodDays}/30</p>
              <p className="ios-footnote">days accomplished</p>
            </div>
          </div>

          <div className="mb-3 rounded-xl bg-ios-fill p-3 text-xs text-ios-secondary">
            <p className="font-medium text-ios-label">Date range</p>
            <p>
              {calendar.firstDate} to {calendar.lastDate}
            </p>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ios-secondary">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
              <div key={name} className="py-1">
                {name}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 rounded-xl bg-ios-surface p-2">
            {calendar.days.map((day) => {
              const cellClass =
                day.status === "good"
                  ? "bg-emerald/15 text-emerald"
                  : day.status === "bad"
                    ? "bg-copper/15 text-copper"
                    : "bg-ios-fill text-ios-secondary";
              const label =
                day.status === "good" ? "Accomplished" : day.status === "bad" ? "Missed" : "Unmarked";

              return (
                <div
                  key={day.key}
                  title={`${day.key}: ${label}`}
                  className={`rounded-lg px-1 py-2 text-center text-xs font-medium ${cellClass}`}
                >
                  <div>{day.dayOfMonth}</div>
                  <div className="text-[10px] opacity-80">{day.key.slice(5)}</div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-center text-[11px] text-ios-secondary">
            Gray = unmarked · Green = done · Red = missed
          </p>

          <div className="mt-4 flex justify-end">
            <GlassButton variant="secondary" onClick={onClose}>
              Close
            </GlassButton>
          </div>
        </>
      ) : null}
    </Sheet>
  );
}

export function DashboardAccountabilitySection({ date, actions }: Props) {
  const [partners, setPartners] = useState<PartnerListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<PartnerDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goalsExpanded, setGoalsExpanded] = useState(true);
  const [calendarHabit, setCalendarHabit] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/accountability/partners", { cache: "no-store" });
        const text = await res.text();
        const payload = (text ? JSON.parse(text) : {}) as {
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
        const text = await res.text();
        const payload = (text ? JSON.parse(text) : {}) as {
          snapshot?: PartnerDashboardSnapshot;
          error?: string;
        };
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

  const selectedPartner = partners.find((p) => p.userId === selectedId);

  if (loading) {
    return (
      <SectionCard title="Accountability" inset={false} actions={actions}>
        <p className="text-sm text-ios-secondary">Loading partners…</p>
      </SectionCard>
    );
  }

  if (!partners.length) {
    return (
      <SectionCard title="Accountability" inset={false} actions={actions}>
        <p className="ios-card-muted rounded-2xl p-4 text-sm text-ios-secondary">
          No partners are sharing with you yet. Add someone by code in Settings → Accountability.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Accountability" inset={false} actions={actions}>
      <div className="grid gap-4">
        <div className="ios-card rounded-2xl p-4">
          <p className="text-sm font-bold text-ios-label">Partner</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {partners.map((p) => (
              <button
                key={p.userId}
                type="button"
                onClick={() => setSelectedId(p.userId)}
                className={`glass-button rounded-full px-4 py-2.5 text-sm font-bold ${
                  selectedId === p.userId ? "glass-button-tint text-white" : "text-ios-label"
                }`}
              >
                {p.displayName}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-copper">{error}</p> : null}

        {snapshot ? (
          <div className="grid gap-4">
            <PartnerSectionBox title={`Goals (${snapshot.goalYear})`}>
              <p className="text-3xl font-bold text-ios-label">{snapshot.goalProgress.percent}%</p>
              <p className="mt-1 text-sm text-ios-secondary">
                {snapshot.goalProgress.total
                  ? `Average progress across ${snapshot.goalProgress.total} goal${snapshot.goalProgress.total === 1 ? "" : "s"}`
                  : "No goals for this year"}
                {snapshot.goalProgress.total ? ` · ${snapshot.goalProgress.done} completed` : ""}
              </p>

              {snapshot.goals.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => setGoalsExpanded((prev) => !prev)}
                    className="mt-3 flex w-full items-center justify-between rounded-xl bg-ios-surface px-3 py-2.5 text-left text-sm font-semibold text-ios-label"
                  >
                    <span>{goalsExpanded ? "Hide goal breakdown" : "Show goal breakdown"}</span>
                    <span aria-hidden>{goalsExpanded ? "▴" : "▾"}</span>
                  </button>

                  {goalsExpanded ? (
                    <div className="mt-3 grid gap-2">
                      {snapshot.goals.map((goal) => (
                        <GoalProgressRow
                          key={goal.id}
                          title={goal.title}
                          sectionName={goal.sectionName}
                          completed={goal.completed}
                          progressPercent={goal.progressPercent}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 text-sm text-ios-secondary">No goals listed for this year.</p>
              )}
            </PartnerSectionBox>

            <PartnerSectionBox title="Habits">
              {snapshot.habits.length ? (
                <div className="grid gap-2">
                  {snapshot.habits.map((habit) => (
                    <div
                      key={habit.id}
                      className="flex items-center gap-3 rounded-xl bg-ios-surface px-3 py-3"
                    >
                      <span className="w-5 shrink-0 text-center text-sm font-bold text-ios-label">
                        {habit.todayCompleted === true ? "✓" : habit.todayCompleted === false ? "✗" : "—"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ios-label">{habit.name}</p>
                        {habit.streakApprox > 0 ? (
                          <p className="text-xs text-ios-secondary">{habit.streakApprox} day streak</p>
                        ) : (
                          <p className="text-xs text-ios-secondary">Today</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCalendarHabit({ id: habit.id, name: habit.name })}
                        className="glass-button flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ios-secondary"
                        aria-label={`Open 30-day calendar for ${habit.name}`}
                        title="30-day habit calendar"
                      >
                        <CalendarIcon />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ios-secondary">No active habits.</p>
              )}
            </PartnerSectionBox>

            <PartnerSectionBox title="Workouts this week">
              <p className="text-2xl font-bold text-ios-label">{snapshot.weeklyWorkoutCount}</p>
              <p className="text-sm text-ios-secondary">session{snapshot.weeklyWorkoutCount === 1 ? "" : "s"}</p>
              {snapshot.weeklyStrengthTop.length ? (
                <ul className="mt-3 grid gap-2">
                  {snapshot.weeklyStrengthTop.map((row) => (
                    <li
                      key={row.exerciseName}
                      className="rounded-xl bg-ios-surface px-3 py-2 text-sm text-ios-label"
                    >
                      <span className="font-semibold">{row.exerciseName}</span>
                      <span className="text-ios-secondary">
                        {" "}
                        · {row.totalSets} sets · top {row.topWeight}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </PartnerSectionBox>

            <PartnerSectionBox title="Daily summary">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ios-label">
                {snapshot.dailyAiSummary ?? "No summary for this day."}
              </p>
            </PartnerSectionBox>
          </div>
        ) : (
          <p className="text-sm text-ios-secondary">
            {selectedPartner ? `Loading ${selectedPartner.displayName}'s progress…` : "Select a partner to view their progress."}
          </p>
        )}
      </div>

      <PartnerHabitCalendarSheet
        open={Boolean(calendarHabit)}
        habitName={calendarHabit?.name ?? ""}
        habitId={calendarHabit?.id ?? ""}
        anchorDate={date}
        logs={snapshot?.habitLogsRecent ?? []}
        onClose={() => setCalendarHabit(null)}
      />
    </SectionCard>
  );
}
