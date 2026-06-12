"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { CompleteExitRow, COMPLETE_EXIT_MS } from "@/components/complete-exit-row";
import { DashboardSortableTodos } from "@/components/dashboard-sortable-todos";
import { GlassButton } from "@/components/ui/glass-button";
import { GroupedRow } from "@/components/ui/grouped-row";
import { buildAiContext } from "@/lib/ai/contextBuilder";
import { DASHBOARD_COACH_SYSTEM_PROMPT, dailyCoachOpeningUserPrompt } from "@/lib/ai/prompts";
import { goalsProgressForYear } from "@/lib/metrics/dashboardMetrics";
import { strengthSummaryByExercise } from "@/lib/metrics/workoutMetrics";
import { normalizeMeasurementPreferences, weightUnitAbbr } from "@/lib/units";
import { effectiveDashboardTodoListIds, mainTodoListId, sortTodosByDashboardOrder } from "@/lib/todo-helpers";
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
    () =>
      sortTodosByDashboardOrder(
        data.todoItems.filter((item) => dashboardListIds.includes(item.listId) && item.active),
        data.dashboardTodoOrder,
      ),
    [data.todoItems, data.dashboardTodoOrder, dashboardListIds],
  );
  const allDashboardTodoIds = useMemo(() => todaysTodos.map((todo) => todo.id), [todaysTodos]);

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
  const habitDailyItems = useMemo(
    () =>
      todaysHabits.map((habit) => ({
        kind: "habit" as const,
        id: habit.id,
        label: habit.label,
      })),
    [todaysHabits],
  );
  const todoDailyItems = useMemo(
    () =>
      todaysTodos.map((todo) => {
        const listName = data.todoLists.find((l) => l.id === todo.listId)?.name ?? "";
        return {
          kind: "todo" as const,
          id: todo.id,
          label: todo.title,
          listLabel: showListSourceOnTodos ? listName : undefined,
        };
      }),
    [todaysTodos, data.todoLists, showListSourceOnTodos],
  );
  const dailyItems = useMemo(
    () => [...habitDailyItems, ...todoDailyItems],
    [habitDailyItems, todoDailyItems],
  );
  const dailyVisible = showAllDailyItems ? dailyItems : dailyItems.slice(0, 5);
  const visibleHabitItems = useMemo(
    () => dailyVisible.filter((item) => item.kind === "habit"),
    [dailyVisible],
  );
  const visibleTodoItems = useMemo(
    () =>
      dailyVisible
        .filter((item) => item.kind === "todo")
        .map((item) => ({
          id: item.id,
          label: item.label,
          listLabel: "listLabel" in item ? item.listLabel : undefined,
        })),
    [dailyVisible],
  );
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
    const id = crypto.randomUUID();
    setData((prev) => ({
      ...prev,
      todoItems: [
        {
          id,
          listId,
          title,
          active: true,
          createdAt: new Date().toISOString(),
        },
        ...prev.todoItems,
      ],
      dashboardTodoOrder: [id, ...(prev.dashboardTodoOrder ?? [])],
    }));
    setQuickTodoTitle("");
  }

  function reorderDashboardTodos(orderedIds: string[]) {
    setData((prev) => ({ ...prev, dashboardTodoOrder: orderedIds }));
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
          className="ios-field w-full max-w-[11rem] px-3 py-2 text-sm font-medium"
        />
      }
    >
      <SectionCard title="Tasks & habits">
        <GroupedRow hairline>
          <p className="ios-footnote mb-2 font-medium uppercase tracking-wide">Lists on dashboard</p>
          <div className="flex flex-wrap gap-3">
            {data.todoLists.map((list) => (
              <label key={list.id} className="flex items-center gap-2 text-sm text-ios-secondary">
                <input
                  type="checkbox"
                  checked={dashboardListIds.includes(list.id)}
                  onChange={(e) => toggleDashboardList(list.id, e.target.checked)}
                />
                <span>{list.isMain ? `${list.name} (main)` : list.name}</span>
              </label>
            ))}
          </div>
        </GroupedRow>
        <GroupedRow hairline={false}>
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            {dashboardListIds.length > 1 ? (
              <label className="grid gap-1 text-xs font-medium text-ios-secondary">
                List
                <select
                  value={quickAddListId}
                  onChange={(e) => setQuickAddListId(e.target.value)}
                  className="ios-field min-w-[8rem] px-3 py-2.5 text-sm"
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
              className="ios-field min-w-0 flex-1 px-3 py-2.5 text-sm"
            />
            <GlassButton
              variant="primary"
              onClick={addQuickTodo}
              disabled={!quickTodoTitle.trim() || !(quickAddListId || dashboardListIds[0])}
            >
              Add task
            </GlassButton>
          </div>
        </GroupedRow>
        <div className="-mx-4">
          {visibleHabitItems.map((item, index) => (
            <CompleteExitRow key={dailyItemKey(item)} exiting={exitingDailyKeys.includes(dailyItemKey(item))}>
              <div
                className={`flex flex-wrap items-center gap-3 bg-ios-surface px-4 py-3 ${
                  index < visibleHabitItems.length - 1 || visibleTodoItems.length ? "ios-hairline" : ""
                }`}
              >
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    title="Done today"
                    aria-label="Log habit as done today"
                    onClick={() => logHabitTodayWithExit(item.id, true)}
                    className="glass-button flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-emerald"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    title="Missed today"
                    aria-label="Log habit as missed today"
                    onClick={() => logHabitTodayWithExit(item.id, false)}
                    className="glass-button flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-copper"
                  >
                    ✗
                  </button>
                </div>
                <span className="min-w-0 text-[17px] text-ios-label">{item.label}</span>
              </div>
            </CompleteExitRow>
          ))}
          <DashboardSortableTodos
            items={visibleTodoItems}
            allTodoIds={allDashboardTodoIds}
            exitingKeys={exitingDailyKeys}
            itemKey={(todoId) => dailyItemKey({ kind: "todo", id: todoId })}
            onComplete={completeTodo}
            onReorder={reorderDashboardTodos}
          />
          {!dailyItems.length ? <p className="px-4 py-3 text-sm text-ios-secondary">No open tasks or habits to log for this day.</p> : null}
          {hiddenDailyCount > 0 ? (
            <div className="px-4 pt-2">
              <GlassButton variant="secondary" className="w-full" onClick={() => setShowAllDailyItems((prev) => !prev)}>
                {showAllDailyItems ? "Show less" : `Show more (${hiddenDailyCount})`}
              </GlassButton>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title={`Progress toward goals (${goalYear})`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-ios-fill p-4">
            <p className="ios-footnote font-medium uppercase tracking-wide">Annual goals</p>
            <p className="mt-1 text-2xl font-semibold text-ios-label">{goalProgress.percent}%</p>
            <p className="ios-footnote">
              {goalProgress.done} of {goalProgress.total} completed
            </p>
          </div>
          <div className="rounded-xl bg-ios-fill p-4">
            <p className="ios-footnote font-medium uppercase tracking-wide">Completed to-dos (week)</p>
            <p className="text-2xl font-semibold text-ios-label">{weeklyTodoCompletions}</p>
          </div>
          <div className="rounded-xl bg-ios-fill p-4">
            <p className="ios-footnote font-medium uppercase tracking-wide">Habit adherence (week)</p>
            <p className="text-2xl font-semibold text-ios-label">{weeklyHabitAdherence}%</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-ios-fill p-4">
          <p className="ios-footnote mb-2 font-medium uppercase tracking-wide">Top strength lifts (week)</p>
          {weeklyStrength.length ? (
            <div className="grid gap-2">
              {weeklyStrength.map((exercise) => (
                <div key={exercise.exerciseId} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ios-label">{exercise.exerciseName}</span>
                  <span className="text-ios-secondary">
                    1RM {exercise.bestOneRepMax} {weightAbbr}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ios-secondary">No strength data in this week.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Daily summary">
        <div className="grid gap-3">
          {aiLoading ? <p className="text-sm text-ios-secondary">Summarizing your trends…</p> : null}
          {aiError ? <p className="rounded-xl bg-copper/10 p-3 text-sm text-copper">{aiError}</p> : null}
          <p className="rounded-xl bg-ios-fill p-4 text-sm leading-relaxed whitespace-pre-wrap text-ios-label">
            {latestSummary?.output?.trim() ?? (aiLoading ? "" : "Summary will load automatically.")}
          </p>
          {latestSummary?.output?.trim() && !aiLoading ? (
            <>
              {(latestSummary.coachChat?.length ?? 0) > 0 ? (
                <div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl bg-ios-fill p-2">
                  {(latestSummary.coachChat ?? []).map((turn, idx) => (
                    <div key={`${turn.at}-${idx}`} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[min(100%,22rem)] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                          turn.role === "user" ? "bg-ios-tint/15 text-ios-label" : "glass-surface text-ios-label"
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
                <label className="grid gap-1 text-xs font-medium text-ios-secondary">
                  Follow-up question
                  <textarea
                    value={coachInput}
                    onChange={(e) => setCoachInput(e.target.value)}
                    placeholder="Ask for more detail on a trend or action…"
                    rows={2}
                    disabled={coachSending}
                    className="ios-field w-full resize-y px-3 py-2.5 text-sm disabled:opacity-50"
                  />
                </label>
                <GlassButton
                  variant="primary"
                  disabled={coachSending || !coachInput.trim()}
                  onClick={() => void sendCoachMessage()}
                >
                  {coachSending ? "Sending…" : "Send"}
                </GlassButton>
              </div>
            </>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Quick journal">
        <p className="mb-2 ios-footnote">Saved for {dashboardDate}. Link goals from the full Journal page.</p>
        <textarea
          value={journalQuickText}
          onChange={(e) => setJournalQuickText(e.target.value)}
          placeholder="A few lines about your day…"
          rows={4}
          className="ios-field mb-3 w-full resize-y px-3 py-2.5 text-sm"
        />
        <GlassButton variant="primary" onClick={saveJournalQuick} disabled={!journalQuickText.trim()}>
          Save entry
        </GlassButton>
      </SectionCard>
    </AppShell>
  );
}
