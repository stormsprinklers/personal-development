"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardAccountabilitySection } from "@/components/dashboard/accountability-section";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { COMPLETE_EXIT_MS } from "@/components/complete-exit-row";
import { DashboardSortableTodos } from "@/components/dashboard-sortable-todos";
import { GlassButton } from "@/components/ui/glass-button";
import { GroupedRow } from "@/components/ui/grouped-row";
import { goalsProgressForYear } from "@/lib/metrics/dashboardMetrics";
import {
  resolveDashboardSectionOrder,
  type DashboardSectionId,
} from "@/lib/dashboard-sections";
import { strengthSummaryByExercise } from "@/lib/metrics/workoutMetrics";
import { normalizeMeasurementPreferences, weightUnitAbbr } from "@/lib/units";
import {
  dashboardDailyItemKey,
  dashboardTodoOrderFromDailyOrder,
  effectiveDashboardTodoListIds,
  mainTodoListId,
  normalizeDashboardDailyOrder,
  sortDailyDashboardItems,
  sortTodosByDashboardOrder,
} from "@/lib/todo-helpers";
import { useAppData, useTodayKey } from "@/lib/storage";
import {
  addDaysToDateKey,
  dateKeyFromIsoTimestamp,
  formatDateKey,
  formatNowInAppTimezone,
  instantNoonForDateKey,
  startOfWeekDateKey,
  yearInAppTimezone,
} from "@/lib/timezone";

function formatDashboardDayLabel(dateKey: string) {
  return formatDateKey(dateKey);
}

export default function Home() {
  const { data, setData, ready } = useAppData();
  const weightAbbr = useMemo(
    () => weightUnitAbbr(normalizeMeasurementPreferences(data.measurementPreferences).weightUnit),
    [data.measurementPreferences],
  );
  const today = useTodayKey();
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const selectedDate = pickedDate ?? today;
  const lastTodayRef = useRef<string | null>(null);
  const [nowLabel, setNowLabel] = useState("");

  useEffect(() => {
    if (!today) return;
    if (pickedDate === null) {
      setPickedDate(today);
    } else if (lastTodayRef.current && lastTodayRef.current !== today && pickedDate === lastTodayRef.current) {
      setPickedDate(today);
    }
    lastTodayRef.current = today;
  }, [today, pickedDate]);

  useEffect(() => {
    const refresh = () => setNowLabel(formatNowInAppTimezone());
    refresh();
    const id = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(id);
  }, []);
  const [showAllDailyItems, setShowAllDailyItems] = useState(false);
  const [quickTodoTitle, setQuickTodoTitle] = useState("");
  const [quickAddListId, setQuickAddListId] = useState("");
  const [exitingDailyKeys, setExitingDailyKeys] = useState<string[]>([]);
  const exitingDailyRef = useRef(new Set<string>());
  const [journalQuickText, setJournalQuickText] = useState("");

  const goalYear = useMemo(
    () => (selectedDate ? yearInAppTimezone(instantNoonForDateKey(selectedDate)) : yearInAppTimezone()),
    [selectedDate],
  );

  const weekStartKey = useMemo(() => (selectedDate ? startOfWeekDateKey(selectedDate) : ""), [selectedDate]);
  const weekEndKey = useMemo(
    () => (weekStartKey ? addDaysToDateKey(weekStartKey, 6) : ""),
    [weekStartKey],
  );

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
  const dashboardSectionOrder = useMemo(
    () => resolveDashboardSectionOrder(data.dashboardSectionOrder),
    [data.dashboardSectionOrder],
  );
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

  const todaysHabits = useMemo(() => {
    if (!today || selectedDate !== today) return [];
    return data.habits
      .filter((habit) => habit.active)
      .filter((habit) => !data.habitLogs.some((log) => log.habitId === habit.id && log.date === today))
      .map((habit) => ({
        id: habit.id,
        label: habit.name,
      }));
  }, [data.habits, data.habitLogs, selectedDate, today]);
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
  const todoCreatedAtById = useMemo(() => new Map(data.todoItems.map((item) => [item.id, item.createdAt])), [data.todoItems]);

  const dailyItems = useMemo(() => {
    const raw = [...habitDailyItems, ...todoDailyItems];
    return sortDailyDashboardItems(raw, data.dashboardDailyOrder, (id) => todoCreatedAtById.get(id) ?? "");
  }, [habitDailyItems, todoDailyItems, data.dashboardDailyOrder, todoCreatedAtById]);

  const dailyVisible = showAllDailyItems ? dailyItems : dailyItems.slice(0, 5);
  const visibleDailyItems = useMemo(
    () =>
      dailyVisible.map((item) => ({
        key: dashboardDailyItemKey(item.kind, item.id),
        kind: item.kind,
        id: item.id,
        label: item.label,
        listLabel: "listLabel" in item ? item.listLabel : undefined,
      })),
    [dailyVisible],
  );
  const allDashboardDailyKeys = useMemo(
    () => dailyItems.map((item) => dashboardDailyItemKey(item.kind, item.id)),
    [dailyItems],
  );
  const hiddenDailyCount = Math.max(0, dailyItems.length - 5);

  function saveJournalQuick() {
    const text = journalQuickText.trim();
    if (!text) return;
    setData((prev) => ({
      ...prev,
      journalEntries: [{ id: crypto.randomUUID(), date: selectedDate, content: text, goalIds: [] }, ...prev.journalEntries],
    }));
    setJournalQuickText("");
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
      dashboardDailyOrder: normalizeDashboardDailyOrder([
        ...(prev.dashboardDailyOrder ?? []).filter((key) => key.startsWith("habit-")),
        dashboardDailyItemKey("todo", id),
        ...(prev.dashboardDailyOrder ?? []).filter((key) => key.startsWith("todo-")),
      ]),
    }));
    setQuickTodoTitle("");
  }

  function reorderDashboardDailyItems(orderedKeys: string[]) {
    const normalized = normalizeDashboardDailyOrder(orderedKeys);
    setData((prev) => ({
      ...prev,
      dashboardDailyOrder: normalized,
      dashboardTodoOrder: dashboardTodoOrderFromDailyOrder(normalized) ?? prev.dashboardTodoOrder,
    }));
  }

  function completeTodo(todoId: string) {
    const key = dashboardDailyItemKey("todo", todoId);
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
    if (!today) return;
    const key = dashboardDailyItemKey("habit", habitId);
    if (exitingDailyRef.current.has(key)) return;
    exitingDailyRef.current.add(key);
    setExitingDailyKeys((prev) => [...prev, key]);
    window.setTimeout(() => {
      exitingDailyRef.current.delete(key);
      setExitingDailyKeys((prev) => prev.filter((k) => k !== key));
      setData((prev) => {
        const existing = prev.habitLogs.find((log) => log.habitId === habitId && log.date === today);
        const nextLogs = existing
          ? prev.habitLogs.map((log) => (log.id === existing.id ? { ...log, completed } : log))
          : [{ id: crypto.randomUUID(), habitId, date: today, completed }, ...prev.habitLogs];
        return { ...prev, habitLogs: nextLogs };
      });
    }, COMPLETE_EXIT_MS);
  }

  function renderDashboardSection(sectionId: DashboardSectionId) {
    switch (sectionId) {
      case "tasks":
        return (
          <SectionCard key="tasks" title="Tasks & habits" clipInset={false}>
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
            <div className="min-w-0">
              <DashboardSortableTodos
                items={visibleDailyItems}
                allItemKeys={allDashboardDailyKeys}
                exitingKeys={exitingDailyKeys}
                onCompleteTodo={completeTodo}
                onLogHabit={logHabitTodayWithExit}
                onReorder={reorderDashboardDailyItems}
              />
              {!dailyItems.length ? (
                <p className="px-4 py-3 text-sm text-ios-secondary">No open tasks or habits to log for this day.</p>
              ) : null}
              {hiddenDailyCount > 0 ? (
                <div className="px-4 pt-2">
                  <GlassButton variant="secondary" className="w-full" onClick={() => setShowAllDailyItems((prev) => !prev)}>
                    {showAllDailyItems ? "Show less" : `Show more (${hiddenDailyCount})`}
                  </GlassButton>
                </div>
              ) : null}
            </div>
          </SectionCard>
        );
      case "goals":
        return (
          <SectionCard key="goals" title={`Progress toward goals (${goalYear})`} inset={false}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="ios-card p-4">
                <p className="ios-footnote font-medium uppercase tracking-wide">Annual goals</p>
                <p className="mt-1 text-2xl font-semibold text-ios-label">{goalProgress.percent}%</p>
                <p className="ios-footnote">
                  {goalProgress.total
                    ? `Average progress across ${goalProgress.total} goal${goalProgress.total === 1 ? "" : "s"}`
                    : "No goals for this year"}
                  {goalProgress.total ? ` · ${goalProgress.done} completed` : ""}
                </p>
              </div>
              <div className="ios-card p-4">
                <p className="ios-footnote font-medium uppercase tracking-wide">Completed to-dos (week)</p>
                <p className="text-2xl font-semibold text-ios-label">{weeklyTodoCompletions}</p>
              </div>
              <div className="ios-card p-4">
                <p className="ios-footnote font-medium uppercase tracking-wide">Habit adherence (week)</p>
                <p className="text-2xl font-semibold text-ios-label">{weeklyHabitAdherence}%</p>
              </div>
            </div>

            <div className="ios-card p-4">
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
        );
      case "journal":
        return (
          <SectionCard key="journal" title="Quick journal" inset={false}>
            <div className="ios-card grid gap-3 p-4">
              <p className="ios-footnote">Saved for {selectedDate}.</p>
              <textarea
                value={journalQuickText}
                onChange={(e) => setJournalQuickText(e.target.value)}
                placeholder="A few lines about your day…"
                rows={4}
                className="ios-field w-full resize-y px-3 py-2.5 text-sm"
              />
              <GlassButton variant="primary" onClick={saveJournalQuick} disabled={!journalQuickText.trim()}>
                Save entry
              </GlassButton>
            </div>
          </SectionCard>
        );
      case "accountability":
        return <DashboardAccountabilitySection key="accountability" date={selectedDate} />;
    }
  }

  if (!selectedDate || !ready) {
    return (
      <AppShell title="Dashboard" description="Your day, goals, and journal at a glance.">
        <div className="p-6 text-sm text-ios-secondary">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Dashboard"
      description="Your day, goals, and journal at a glance."
      header={
        <div className="grid gap-2">
          {nowLabel ? <p className="ios-footnote text-ios-secondary">{nowLabel}</p> : null}
          <input
            type="date"
            value={selectedDate}
            max={today || undefined}
            onChange={(e) => setPickedDate(e.target.value)}
            aria-label={`Dashboard day, ${formatDashboardDayLabel(selectedDate)}`}
            className="ios-field w-full max-w-[11rem] px-3 py-2.5 text-sm font-medium"
          />
        </div>
      }
    >
      {dashboardSectionOrder.map(renderDashboardSection)}
    </AppShell>
  );
}
