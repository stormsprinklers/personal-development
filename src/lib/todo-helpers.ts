import type { AppData, Goal, TodoItem, TodoList } from "@/lib/models";

const LEGACY_GOAL_TASKS_LIST_NAME = "Goal Tasks";

export const MAIN_TODO_LIST_ID = "seed-list-main";

export function mainTodoListId(lists: TodoList[]): string {
  const main = lists.find((l) => l.isMain);
  if (main) return main.id;
  return lists[0]?.id ?? "";
}

/** Lists whose active tasks appear on the dashboard; falls back to the main list. */
export function effectiveDashboardTodoListIds(data: { todoLists: TodoList[]; dashboardTodoListIds?: string[] }): string[] {
  const main = mainTodoListId(data.todoLists);
  const picked = data.dashboardTodoListIds?.filter((id) => data.todoLists.some((l) => l.id === id));
  if (picked?.length) return [...new Set(picked)];
  return main ? [main] : [];
}

/** Tasks that count toward a goal: items on the list linked to that goal, or legacy items with goalId. */
export function todoItemsForGoal(data: AppData, goalId: string): TodoItem[] {
  const listId = data.todoLists.find((l) => l.goalId === goalId)?.id;
  if (listId) return data.todoItems.filter((t) => t.listId === listId);
  return data.todoItems.filter((t) => t.goalId === goalId);
}

export function normalizeTodoListsAndItems(
  lists: TodoList[],
  items: TodoItem[],
  goals: Goal[],
  nowCreated: () => string,
): { todoLists: TodoList[]; todoItems: TodoItem[] } {
  const goalById = new Map(goals.map((g) => [g.id, g]));

  let nextLists: TodoList[] = lists.map((l) => ({
    ...l,
    isMain: l.isMain === true,
    goalId: l.goalId && goalById.has(l.goalId) ? l.goalId : undefined,
  }));

  let nextItems = items.map((it) => ({ ...it }));

  if (nextLists.length === 0) {
    nextLists = [
      {
        id: MAIN_TODO_LIST_ID,
        name: "Main",
        area: "",
        isMain: true,
        createdAt: nowCreated(),
      },
    ];
  } else {
    const mainCount = nextLists.filter((l) => l.isMain).length;
    if (mainCount === 0) {
      const seedIdx = nextLists.findIndex((l) => l.id === MAIN_TODO_LIST_ID);
      const nameMainIdx = nextLists.findIndex((l) => l.name.trim().toLowerCase() === "main" && !l.goalId);
      const prefer = nextLists.findIndex((l) => !l.goalId);
      const i =
        seedIdx >= 0 ? seedIdx : nameMainIdx >= 0 ? nameMainIdx : prefer >= 0 ? prefer : 0;
      nextLists = nextLists.map((l, j) => ({ ...l, isMain: j === i }));
    } else if (mainCount > 1) {
      let keepFirst = true;
      nextLists = nextLists.map((l) => {
        if (!l.isMain) return l;
        if (keepFirst) {
          keepFirst = false;
          return l;
        }
        return { ...l, isMain: false };
      });
    }
  }

  const mainId = mainTodoListId(nextLists);
  const bucket = nextLists.find((l) => l.name === LEGACY_GOAL_TASKS_LIST_NAME && !l.goalId);
  if (bucket) {
    const onBucket = nextItems.filter((it) => it.listId === bucket.id);
    const goalIdsOnBucket = new Set(
      onBucket.map((it) => it.goalId).filter((id): id is string => Boolean(id)),
    );

    for (const gid of goalIdsOnBucket) {
      const goal = goalById.get(gid);
      let targetListId = nextLists.find((l) => l.goalId === gid)?.id;
      if (!targetListId) {
        targetListId = crypto.randomUUID();
        nextLists.push({
          id: targetListId,
          name: goal ? `${goal.title} tasks` : "Goal tasks",
          area: "",
          goalId: gid,
          isMain: false,
          createdAt: nowCreated(),
        });
      }
      nextItems = nextItems.map((it) =>
        it.listId === bucket.id && it.goalId === gid ? { ...it, listId: targetListId!, goalId: undefined } : it,
      );
    }

    nextItems = nextItems.map((it) =>
      it.listId === bucket.id ? { ...it, listId: mainId, goalId: undefined } : it,
    );
    nextLists = nextLists.filter((l) => l.id !== bucket.id);
  }

  nextItems = nextItems.map((it) => {
    const list = nextLists.find((l) => l.id === it.listId);
    if (list?.goalId && it.goalId === list.goalId) return { ...it, goalId: undefined };
    return it;
  });

  return { todoLists: nextLists, todoItems: nextItems };
}
