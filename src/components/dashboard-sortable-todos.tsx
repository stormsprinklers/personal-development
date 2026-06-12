"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CompleteExitRow } from "@/components/complete-exit-row";

export type DashboardTodoItem = {
  id: string;
  label: string;
  listLabel?: string;
};

type Props = {
  items: DashboardTodoItem[];
  allTodoIds: string[];
  exitingKeys: string[];
  itemKey: (todoId: string) => string;
  onComplete: (todoId: string) => void;
  onReorder: (orderedIds: string[]) => void;
};

function DragHandleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 text-slate/70" fill="currentColor">
      <circle cx="5" cy="4" r="1.2" />
      <circle cx="11" cy="4" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="11" cy="12" r="1.2" />
    </svg>
  );
}

function SortableTodoRow({
  item,
  exiting,
  onComplete,
}: {
  item: DashboardTodoItem;
  exiting: boolean;
  onComplete: (todoId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : `${transition}, box-shadow 200ms ease`,
  };

  return (
    <CompleteExitRow exiting={exiting}>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 rounded-lg border border-slate/45 bg-steel/10 px-2 py-2 ${
          isDragging
            ? "z-10 scale-[1.02] border-steel/50 bg-white shadow-lg shadow-charcoal/15 ring-2 ring-steel/20"
            : "shadow-sm shadow-transparent"
        }`}
      >
        <button
          type="button"
          className="flex shrink-0 touch-none cursor-grab items-center justify-center rounded-md p-1 text-slate hover:bg-steel/15 active:cursor-grabbing"
          aria-label={`Drag to reorder ${item.label}`}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon />
        </button>
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-0.5">
          <input
            type="checkbox"
            checked={exiting}
            onChange={() => onComplete(item.id)}
            className="shrink-0"
          />
          <span className="text-sm">
            {item.listLabel ? (
              <>
                <span className="mr-1 text-xs text-slate/95">[{item.listLabel}]</span>
                {item.label}
              </>
            ) : (
              item.label
            )}
          </span>
        </label>
      </div>
    </CompleteExitRow>
  );
}

export function DashboardSortableTodos({ items, allTodoIds, exitingKeys, itemKey, onComplete, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const exitingSet = new Set(exitingKeys);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const oldIndex = allTodoIds.indexOf(activeId);
    const newIndex = allTodoIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(allTodoIds, oldIndex, newIndex));
  }

  if (!items.length) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="grid gap-2">
          {items.map((item) => (
            <SortableTodoRow
              key={item.id}
              item={item}
              exiting={exitingSet.has(itemKey(item.id))}
              onComplete={onComplete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
