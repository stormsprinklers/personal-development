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

function SortableTodoRow({
  item,
  exiting,
  onComplete,
  hairline,
}: {
  item: DashboardTodoItem;
  exiting: boolean;
  onComplete: (todoId: string) => void;
  hairline: boolean;
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
        className={`flex items-center gap-2 bg-ios-surface px-4 py-3 ${hairline ? "ios-hairline" : ""} ${
          isDragging ? "z-10 scale-[1.01] shadow-lg shadow-black/10 ring-2 ring-ios-tint/25" : ""
        }`}
      >
        <button
          type="button"
          className="flex shrink-0 touch-none cursor-grab items-center justify-center rounded-lg p-1.5 text-ios-secondary active:cursor-grabbing"
          aria-label={`Drag to reorder ${item.label}`}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon />
        </button>
        <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={exiting} onChange={() => onComplete(item.id)} className="shrink-0" />
          <span className="text-[17px] text-ios-label">
            {item.listLabel ? (
              <>
                <span className="mr-1 text-xs text-ios-secondary">[{item.listLabel}]</span>
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
        <div>
          {items.map((item, index) => (
            <SortableTodoRow
              key={item.id}
              item={item}
              exiting={exitingSet.has(itemKey(item.id))}
              onComplete={onComplete}
              hairline={index < items.length - 1}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
