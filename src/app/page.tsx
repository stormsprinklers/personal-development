"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { CompleteExitRow, COMPLETE_EXIT_MS } from "@/components/complete-exit-row";
import { buildAiContext } from "@/lib/ai/contextBuilder";
import { DASHBOARD_COACH_SYSTEM_PROMPT, dailyCoachOpeningUserPrompt } from "@/lib/ai/prompts";
import { goalsProgressForYear } from "@/lib/metrics/dashboardMetrics";
import { strengthSummaryByExercise } from "@/lib/metrics/workoutMetrics";
import { normalizeMeasurementPreferences, weightUnitAbbr } from "@/lib/units";
import { effectiveDashboardTodoListIds, mainTodoListId } from "@/lib/todo-helpers";
import { todayKey, useAppData } from "@/lib/storage";
import {
  addDaysToDateKey,
  dateKeyFromIsoTimestamp,
  formatDateKey,
  instantNoonForDateKey,
  startOfWeekDateKey,
  yearInAppTimezone,
} from "@/lib/timezone";

function formatDashboardDayLabel(dateKey: string) {
  return formatDateKey(dateKey);
}

export default function Home() {
  const { data, setData } = useAppData();
  const weightAbbr = useMemo(
    () => weightUnitAbbr(normalizeMeasurementPreferences(data.measurementPreferences).weightUnit),
    [data.measurementPreferences],
  );
  const today = todayKey();
  const [dashboardDate, setDashboardDate] = useState(today);
  const [showAllDailyItems, setShowAllDailyItems] = useState(false);
  const [quickTodoTitle, setQuickTodoTitle] = useState("");
  const [quickAddListId, setQuickAddListId] = useState("");
  const [exitingDailyKeys, setExitingDailyKeys] = useState<string[]>([]);
  const exitingDailyRef = useRef(new Set<string>());
  const [journalQuickText, setJournalQuickText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [coachInput, setCoachInput] = useState("");
  const [coachSending, setCoachSending] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  const goalYear = useMemo(() => yearInAppTimezone(instantNoonForDateKey(dashboardDate)), [dashboardDate]);

  useEffect(() => {
    setCoachInput("");
    setCoachError(null);
  }, [dashboardDate]);

  const weekStartKey = useMemo(() => startOfWeekDateKey(dashboardDate), [dashboardDate]);
  const weekEndKey = useMemo(() => addDaysToDateKey(weekStartKey, 6), [weekStartKey]);

  const weeklyWorkouts = useMemo(
    () => data.workoutSessions.filter((session) => session.date >= weekStartKey && session.date <= weekEndKey),
    [data.workoutSessions, weekStartKey, weekEndKey],
  );

  const weeklyStrength = useMemo(
    () => strengthSummaryByExercise(weeklyWorkouts, data.exercises).slice(0, 3),
    [weeklyWorkouts, data.exercises],
  );

  const weeklyTodoCompletions = useMemo(
    () =>
      data.todoCompletions.filter((completion) => {
        const d = dateKeyFromIsoTimestamp(completion.completedAt);
        return d >= weekStartKey && d <= weekEndKey;
      }).length,
    [data.todoCompletions, weekStartKey, weekEndKey],
  );
  const activeHabits = useMemo(() => data.habits.filter((habit) => habit.active), [data.habits]);
  const habitChecksInWeek = useMemo(() => {
    if (!activeHabits.length) return 0;
    let checks = 0;
    for (const habit of activeHabits) {
      for (const log of data.habitLogs) {
        if (log.habitId === habit.id && log.completed && log.date >= weekStartKey && log.date <= weekEndKey) {
          checks += 1;
        }
      }
    }
    return checks;
  }, [activeHabits, data.habitLogs, weekStartKey, weekEndKey]);
  const habitTarget = activeHabits.length * 7;
  const weeklyHabitAdherence = habitTarget ? Math.round((habitChecksInWeek / habitTarget) * 100) : 0;

  const goalProgress = useMemo(() => goalsProgressForYear(data, goalYear), [data, goalYear]);
  const dashboardListIds = useMemo(() => effectiveDashboardTodoListIds(data), [data.todoLists, data.dashboardTodoListIds]);

  useEffect(() => {
    const fallback = dashboardListIds[0] ?? mainTodoListId(data.todoLists);
    if (!fallback) return;
    if (!quickAddListId || !dashboardListIds.includes(quickAddListId)) {
      setQuickAddListId(fallback);
    }
  }, [dashboardListIds, data.todoLists, quickAddListId]);

  const todaysTodos = useMemo(
    () => data.todoItems.filter((item) => dashboardListIds.includes(item.listId) && item.active),
    [data.todoItems, dashboardListIds],
  );

  function toggleDashboardList(listId: string, nextChecked: boolean) {
    setData((prev) => {
      const main = prev.todoLists.find((l) => l.isMain)?.id ?? prev.todoLists[0]?.id ?? "";
      let ids = effectiveDashboardTodoListIds(prev);
      if (nextChecked) ids = [...new Set([...ids, listId])];
      else ids = ids.filter((id) => id !== listId);
      if (!ids.length && main) ids = [main];
      return { ...prev, dashboardTodoListIds: ids };
    });
  }
  const todaysHabits = useMemo(
    () =>
      data.habits
        .filter((habit) => habit.active)
        .filter((habit) => !data.habitLogs.some((log) => log.habitId === habit.id && log.date === dashboardDate))
        .map((habit) => ({
          id: habit.id,
          label: habit.name,
        })),
    [data.habits, data.habitLogs, dashboardDate],
  );
  const showListSourceOnTodos = dashboardListIds.length > 1;
  const dailyItems = useMemo(
    () => [
      ...todaysHabits.map((habit) => ({ kind: "habit" as const, id: habit.id, label: habit.label })),
      ...todaysTodos.map((todo) => {
        const listName = data.todoLists.find((l) => l.id === todo.listId)?.name ?? "";
        return {
          kind: "todo" as const,
          id: todo.id,
          label: todo.title,
          listLabel: showListSourceOnTodos ? listName : undefined,
        };
      }),
    ],
    [todaysTodos, todaysHabits, data.todoLists, showListSourceOnTodos],
  );
  const dailyVisible = showAllDailyItems ? dailyItems : dailyItems.slice(0, 5);
  const hiddenDailyCount = Math.max(0, dailyItems.length - 5);

  const latestSummary = useMemo(
    () => data.aiInsights.find((insight) => insight.type === "daily_summary" && insight.date === dashboardDate),
    [data.aiInsights, dashboardDate],
  );

  async function runDailySummaryGeneration(targetDate: string, signal?: AbortSignal) {
    const context = buildAiContext(data, targetDate);
    const serialized = JSON.stringify(context, null, 2);
    const userContent = dailyCoachOpeningUserPrompt(serialized);
    const messages = [
      { role: "system" as const, content: DASHBOARD_COACH_SYSTEM_PROMPT },
      { role: "user" as const, content: userContent },
    ];
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, temperature: 0.55 }),
      ...(signal ? { signal } : {}),
    });
    const payload = (await response.json()) as { output?: string; error?: string };
    const text = payload.output ?? payload.error;
    if (!text?.trim()) throw new Error("No summary returned.");
    setData((prev) => ({
      ...prev,
      aiInsights: [
        {
          id: crypto.randomUUID(),
          type: "daily_summary",
          date: targetDate,
          prompt: userContent,
          output: text.trim(),
        },
        ...prev.aiInsights.filter((insight) => !(insight.type === "daily_summary" && insight.date === targetDate)),
      ],
    }));
  }

  async function sendCoachMessage() {
    const text = coachInput.trim();
    const insight = data.aiInsights.find((i) => i.type === "daily_summary" && i.date === dashboardDate);
    if (!text || !insight?.output?.trim() || coachSending) return;
    const openingUserPrompt =
      insight.prompt?.trim() ||
      dailyCoachOpeningUserPrompt(JSON.stringify(buildAiContext(data, dashboardDate), null, 2));
    setCoachSending(true);
    setCoachError(null);
    try {
      const prevChat = insight.coachChat ?? [];
      const historyOpenAi = prevChat.map((t) => ({ role: t.role, content: t.content }));
      const messages = [
        { role: "system" as const, content: DASHBOARD_COACH_SYSTEM_PROMPT },
        { role: "user" as const, content: openingUserPrompt },
        { role: "assistant" as const, content: insight.output },
        ...historyOpenAi,
        { role: "user" as const, content: text },
      ];
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, temperature: 0.55 }),
      });
      const payload = (await response.json()) as { output?: string; error?: string };
      const reply = payload.output ?? payload.error;
      if (!reply?.trim()) throw new Error("No reply from coach.");
      const now = new Date().toISOString();
      setData((prev) => ({
        ...prev,
        aiInsights: prev.aiInsights.map((row) => {
          if (row.type !== "daily_summary" || row.date !== dashboardDate) return row;
          return {
            ...row,
            coachChat: [
              ...(row.coachChat ?? []),
              { role: "user" as const, content: text, at: now },
              { role: "assistant" as const, content: reply.trim(), at: now },
            ],
          };
        }),
      }));
      setCoachInput("");
    } catch (e) {
      setCoachError(e instanceof Error ? e.message : "Chat failed.");
    } finally {
      setCoachSending(false);
    }
  }

  useEffect(() => {
    const insight = data.aiInsights.find((i) => i.type === "daily_summary" && i.date === dashboardDate);
    if (insight?.output?.trim()) {
      setAiLoading(false);
      setAiError(null);
      return;
    }

    const ac = new AbortController();
    let cancelled = false;

    (async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        await runDailySummaryGeneration(dashboardDate, ac.signal);
      } catch (e) {
        if (ac.signal.aborted || cancelled) return;
        setAiError(e instanceof Error ? e.message : "Could not generate summary.");
      } finally {
        if (!ac.signal.aborted && !cancelled) setAiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      setAiLoading(false);
    };
  }, [dashboardDate, data.aiInsights, data, setData]);

  function saveJournalQuick() {
    const text = journalQuickText.trim();
    if (!text) return;
    setData((prev) => ({
      ...prev,
      journalEntries: [{ id: crypto.randomUUID(), date: dashboardDate, content: text, goalIds: [] }, ...prev.journalEntries],
    }));
    setJournalQuickText("");
  }

  function dailyItemKey(item: { kind: "todo" | "habit"; id: string }) {
    return `${item.kind}-${item.id}`;
  }

  function addQuickTodo() {
    const title = quickTodoTitle.trim();
    const listId = quickAddListId || dashboardListIds[0] || mainTodoListId(data.todoLists);
    if (!title || !listId) return;
    setData((prev) => ({
      ...prev,
      todoItems: [
        {
          id: crypto.randomUUID(),
          listId,
          title,
          active: true,
          createdAt: new Date().toISOString(),
        },
        ...prev.todoItems,
      ],
    }));
    setQuickTodoTitle("");
  }

  function completeTodo(todoId: string) {
    const key = `todo-${todoId}`;
    if (exitingDailyRef.current.has(key)) return;
    exitingDailyRef.current.add(key);
    setExitingDailyKeys((prev) => [...prev, key]);
    window.setTimeout(() => {
      exitingDailyRef.current.delete(key);
      setExitingDailyKeys((prev) => prev.filter((k) => k !== key));
      setData((prev) => ({
        ...prev,
        todoItems: prev.todoItems.map((item) => (item.id === todoId ? { ...item, active: false } : item)),
        todoCompletions: [
          { id: crypto.randomUUID(), todoItemId: todoId, completedAt: new Date().toISOString() },
          ...prev.todoCompletions,
        ],
      }));
    }, COMPLETE_EXIT_MS);
  }

  function logHabitTodayWithExit(habitId: string, completed: boolean) {
    const key = `habit-${habitId}`;
    if (exitingDailyRef.current.has(key)) return;
    exitingDailyRef.current.add(key);
    setExitingDailyKeys((prev) => [...prev, key]);
    window.setTimeout(() => {
      exitingDailyRef.current.delete(key);
      setExitingDailyKeys((prev) => prev.filter((k) => k !== key));
      setData((prev) => {
        const existing = prev.habitLogs.find((log) => log.habitId === habitId && log.date === dashboardDate);
        const nextLogs = existing
          ? prev.habitLogs.map((log) => (log.id === existing.id ? { ...log, completed } : log))
          : [{ id: crypto.randomUUID(), habitId, date: dashboardDate, completed }, ...prev.habitLogs];
        return { ...prev, habitLogs: nextLogs };
      });
    }, COMPLETE_EXIT_MS);
  }

  return (
    <AppShell
      title="Dashboard"
      description="Your day, summary, and journal at a glance."
      header={
        <input
          type="date"
          value={dashboardDate}
          max={today}
          onChange={(e) => setDashboardDate(e.target.value)}
          aria-label={`Dashboard day, ${formatDashboardDayLabel(dashboardDate)}`}
          className="w-full max-w-[11rem] rounded-md border border-slate/50 bg-white px-2 py-1.5 text-sm font-medium text-charcoal focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
        />
      }
    >
      <SectionCard title="Tasks & habits">
        <div className="mb-3 grid gap-2 rounded-lg border border-slate/45 bg-steel/10 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate/95">Lists on dashboard</p>
          <div className="flex flex-wrap gap-3">
            {data.todoLists.map((list) => (
              <label key={list.id} className="flex items-center gap-2 text-sm text-slate">
                <input
                  type="checkbox"
                  checked={dashboardListIds.includes(list.id)}
                  onChange={(e) => toggleDashboardList(list.id, e.target.checked)}
                />
                <span>{list.isMain ? `${list.name} (main)` : list.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="mb-3 flex min-w-0 flex-wrap items-end gap-2 rounded-lg border border-slate/45 bg-white/80 p-3">
          {dashboardListIds.length > 1 ? (
            <label className="grid gap-1 text-xs font-medium text-slate/95">
              List
              <select
                value={quickAddListId}
                onChange={(e) => setQuickAddListId(e.target.value)}
                className="min-w-[8rem] rounded-lg border border-slate/50 bg-white px-3 py-2 text-sm text-charcoal"
              >
                {dashboardListIds.map((id) => {
                  const list = data.todoLists.find((l) => l.id === id);
                  return (
                    <option key={id} value={id}>
                      {list?.name ?? "List"}
                    </option>
                  );
                })}
              </select>
            </label>
          ) : null}
          <input
            value={quickTodoTitle}
            onChange={(e) => setQuickTodoTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addQuickTodo();
              }
            }}
            placeholder="Add a task…"
            className="min-w-0 flex-1 rounded-lg border border-slate/50 bg-white px-3 py-2 text-sm focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
          />
          <button
            type="button"
            onClick={addQuickTodo}
            disabled={!quickTodoTitle.trim() || !(quickAddListId || dashboardListIds[0])}
            className="rounded-lg bg-steel px-3 py-2 text-sm font-medium text-white hover:bg-steel/90 disabled:opacity-40"
          >
            Add task
          </button>
        </div>
        <div className="grid gap-2">
          {dailyVisible.map((item) => (
            <CompleteExitRow key={dailyItemKey(item)} exiting={exitingDailyKeys.includes(dailyItemKey(item))}>
              {item.kind === "todo" ? (
                <label className="flex items-center gap-3 rounded-lg border border-slate/45 bg-steel/10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={exitingDailyKeys.includes(dailyItemKey(item))}
                    onChange={() => completeTodo(item.id)}
                  />
                  <span className="text-sm">
                    {"listLabel" in item && item.listLabel ? (
                      <>
                        <span className="mr-1 text-xs text-slate/95">[{item.listLabel}]</span>
                        {item.label}
                      </>
                    ) : (
                      item.label
                    )}
                  </span>
                </label>
              ) : (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate/45 bg-steel/10 px-3 py-2">
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      title="Done today"
                      aria-label="Log habit as done today"
                      onClick={() => logHabitTodayWithExit(item.id, true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate/50 bg-white text-sm font-semibold text-emerald transition-colors hover:border-emerald/50 hover:bg-emerald/10"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      title="Missed today"
                      aria-label="Log habit as missed today"
                      onClick={() => logHabitTodayWithExit(item.id, false)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate/50 bg-white text-sm font-semibold text-copper transition-colors hover:border-copper/40 hover:bg-copper/10"
                    >
                      ✗
                    </button>
                  </div>
                  <span className="min-w-0 text-sm">{item.label}</span>
                </div>
              )}
            </CompleteExitRow>
          ))}
          {!dailyItems.length ? <p className="text-sm text-slate">No open tasks or habits to log for this day.</p> : null}
          {hiddenDailyCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllDailyItems((prev) => !prev)}
              className="mt-2 w-full rounded-lg border border-slate/50 bg-white px-4 py-2.5 text-sm font-medium text-slate shadow-sm hover:bg-steel/10"
            >
              {showAllDailyItems ? "Show less" : `Show more (${hiddenDailyCount})`}
            </button>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title={`Progress toward goals (${goalYear})`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate/45 bg-steel/10 p-4">
            <p className="text-xs uppercase tracking-wide text-slate/95">Annual goals</p>
            <p className="mt-1 text-2xl font-semibold text-slate">{goalProgress.percent}%</p>
            <p className="text-xs text-slate">
              {goalProgress.done} of {goalProgress.total} completed
            </p>
          </div>
          <div className="rounded-xl border border-slate/45 bg-steel/10 p-4">
            <p className="text-xs uppercase text-slate/95">Completed to-dos (week)</p>
            <p className="text-2xl font-semibold">{weeklyTodoCompletions}</p>
          </div>
          <div className="rounded-xl border border-slate/45 bg-steel/10 p-4">
            <p className="text-xs uppercase text-slate/95">Habit adherence (week)</p>
            <p className="text-2xl font-semibold">{weeklyHabitAdherence}%</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate/45 bg-steel/10 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate/95">Top strength lifts (week)</p>
          {weeklyStrength.length ? (
            <div className="grid gap-2">
              {weeklyStrength.map((exercise) => (
                <div key={exercise.exerciseId} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-charcoal">{exercise.exerciseName}</span>
                  <span className="text-slate">
                    1RM {exercise.bestOneRepMax} {weightAbbr}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate">No strength data in this week.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Daily summary">
        <div className="grid gap-3">
          {aiLoading ? <p className="text-sm text-slate/95">Summarizing your trends…</p> : null}
          {aiError ? <p className="rounded-lg border border-copper/30 bg-copper/10 p-3 text-sm text-copper">{aiError}</p> : null}
          <p className="rounded-xl border border-slate/45 bg-steel/10 p-4 text-sm leading-relaxed text-charcoal whitespace-pre-wrap">
            {latestSummary?.output?.trim() ?? (aiLoading ? "" : "Summary will load automatically.")}
          </p>
          {latestSummary?.output?.trim() && !aiLoading ? (
            <>
              {(latestSummary.coachChat?.length ?? 0) > 0 ? (
                <div className="grid max-h-52 gap-2 overflow-y-auto rounded-lg border border-slate/40 bg-white/70 p-2">
                  {(latestSummary.coachChat ?? []).map((turn, idx) => (
                    <div key={`${turn.at}-${idx}`} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[min(100%,22rem)] rounded-lg px-2.5 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                          turn.role === "user"
                            ? "bg-slate/15 text-charcoal"
                            : "border border-slate/45 bg-steel/10 text-charcoal"
                        }`}
                      >
                        {turn.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {coachError ? <p className="text-sm text-copper">{coachError}</p> : null}
              <div className="grid gap-2">
                <label className="grid gap-1 text-xs font-medium text-slate/95">
                  Follow-up question
                  <textarea
                    value={coachInput}
                    onChange={(e) => setCoachInput(e.target.value)}
                    placeholder="Ask for more detail on a trend or action…"
                    rows={2}
                    disabled={coachSending}
                    className="w-full resize-y rounded-lg border border-slate/50 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-slate/60 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25 disabled:opacity-50"
                  />
                </label>
                <button
                  type="button"
                  disabled={coachSending || !coachInput.trim()}
                  onClick={() => void sendCoachMessage()}
                  className="w-fit rounded-lg bg-steel px-4 py-2 text-sm font-medium text-white shadow-sm shadow-steel/25 hover:bg-steel/90 disabled:opacity-40"
                >
                  {coachSending ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Quick journal">
        <p className="mb-2 text-xs text-slate/95">Saved for {dashboardDate}. Link goals from the full Journal page.</p>
        <textarea
          value={journalQuickText}
          onChange={(e) => setJournalQuickText(e.target.value)}
          placeholder="A few lines about your day…"
          rows={4}
          className="mb-2 w-full resize-y rounded-lg border border-slate/50 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-slate/60 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/25"
        />
        <button
          type="button"
          onClick={saveJournalQuick}
          disabled={!journalQuickText.trim()}
          className="rounded-lg bg-steel px-4 py-2 text-sm font-medium text-white shadow-sm shadow-steel/25 hover:bg-steel/90 disabled:opacity-40"
        >
          Save entry
        </button>
      </SectionCard>
    </AppShell>
  );
}
