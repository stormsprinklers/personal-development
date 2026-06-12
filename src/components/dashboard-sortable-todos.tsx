"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CompleteExitRow } from "@/components/complete-exit-row";

export type DashboardDailyItem = {
  key: string;
  kind: "todo" | "habit";
  id: string;
  label: string;
  listLabel?: string;
};

type Props = {
  items: DashboardDailyItem[];
  allItemKeys: string[];
  exitingKeys: string[];
  onCompleteTodo: (todoId: string) => void;
  onLogHabit: (habitId: string, completed: boolean) => void;
  onReorder: (orderedKeys: string[]) => void;
};

function DragHandleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 text-ios-tertiary" fill="currentColor">
      <circle cx="5" cy="4" r="1.2" />
      <circle cx="11" cy="4" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="11" cy="12" r="1.2" />
    </svg>
  );
}

function ItemLabel({ item }: { item: DashboardDailyItem }) {
  return (
    <span className="min-w-0 flex-1 break-words text-[17px] leading-snug text-ios-label [overflow-wrap:anywhere]">
      {item.listLabel ? (
        <>
          <span className="mr-1 text-xs text-ios-secondary">[{item.listLabel}]</span>
          {item.label}
        </>
      ) : (
        item.label
      )}
    </span>
  );
}

function DailyRowSurface({
  item,
  exiting,
  onCompleteTodo,
  onLogHabit,
  hairline,
  dragHandleProps,
  elevated = false,
}: {
  item: DashboardDailyItem;
  exiting: boolean;
  onCompleteTodo: (todoId: string) => void;
  onLogHabit: (habitId: string, completed: boolean) => void;
  hairline: boolean;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
  elevated?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 bg-ios-surface px-4 py-3 ${hairline ? "ios-hairline" : ""} ${
        elevated ? "shadow-lg shadow-black/10 ring-2 ring-ios-tint/25" : ""
      }`}
    >
      <button
        type="button"
        className="flex shrink-0 touch-none cursor-grab items-center justify-center rounded-lg p-1.5 text-ios-secondary active:cursor-grabbing"
        aria-label={`Drag to reorder ${item.label}`}
        {...(dragHandleProps?.attributes ?? {})}
        {...(dragHandleProps?.listeners ?? {})}
      >
        <DragHandleIcon />
      </button>
      {item.kind === "todo" ? (
        <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={exiting} onChange={() => onCompleteTodo(item.id)} className="shrink-0" />
          <ItemLabel item={item} />
        </label>
      ) : (
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3">
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title="Done today"
              aria-label="Log habit as done today"
              onClick={() => onLogHabit(item.id, true)}
              className="glass-button flex h-[1.375rem] w-[1.375rem] min-h-0 items-center justify-center rounded-full text-[10px] font-semibold leading-none text-emerald"
            >
              ✓
            </button>
            <button
              type="button"
              title="Missed today"
              aria-label="Log habit as missed today"
              onClick={() => onLogHabit(item.id, false)}
              className="glass-button flex h-[1.375rem] w-[1.375rem] min-h-0 items-center justify-center rounded-full text-[10px] font-semibold leading-none text-copper"
            >
              ✗
            </button>
          </div>
          <ItemLabel item={item} />
        </div>
      )}
    </div>
  );
}

function SortableDailyRow({
  item,
  exiting,
  onCompleteTodo,
  onLogHabit,
  hairline,
}: {
  item: DashboardDailyItem;
  exiting: boolean;
  onCompleteTodo: (todoId: string) => void;
  onLogHabit: (habitId: string, completed: boolean) => void;
  hairline: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
    disabled: exiting,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: "relative" as const,
    zIndex: isDragging ? 2 : undefined,
  };

  const row = (
    <div ref={setNodeRef} style={style}>
      <DailyRowSurface
        item={item}
        exiting={exiting}
        onCompleteTodo={onCompleteTodo}
        onLogHabit={onLogHabit}
        hairline={hairline}
        dragHandleProps={{ attributes, listeners }}
        elevated={isDragging}
      />
    </div>
  );

  if (exiting) {
    return <CompleteExitRow exiting>{row}</CompleteExitRow>;
  }

  return row;
}

export function DashboardSortableTodos({
  items,
  allItemKeys,
  exitingKeys,
  onCompleteTodo,
  onLogHabit,
  onReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const exitingSet = new Set(exitingKeys);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeKey = String(active.id);
    const overKey = String(over.id);
    const oldIndex = allItemKeys.indexOf(activeKey);
    const newIndex = allItemKeys.indexOf(overKey);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(allItemKeys, oldIndex, newIndex));
  }

  if (!items.length) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.key)} strategy={verticalListSortingStrategy}>
        <div className="overflow-visible">
          {items.map((item, index) => (
            <SortableDailyRow
              key={item.key}
              item={item}
              exiting={exitingSet.has(item.key)}
              onCompleteTodo={onCompleteTodo}
              onLogHabit={onLogHabit}
              hairline={index < items.length - 1}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
