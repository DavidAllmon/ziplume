"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useId, type ReactNode } from "react";

const INSTRUCTIONS =
  "To move it, press Space. Use the arrow keys to move it, then Space to drop it, or Escape to cancel.";

/**
 * Lets the rows inside be dragged into a new order by mouse, touch (from the handle) or keyboard
 * (focus the handle, Space, arrow keys, Space). `names` say each row's name in announcements.
 */
export function SortableArea({
  ids,
  names,
  grid = false,
  onMove,
  children,
}: {
  ids: string[];
  names: string[];
  /** Rows wrap in a grid (images) rather than stack. */
  grid?: boolean;
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}) {
  const id = useId();
  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a tap on the handle stays a tap.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const index = (rowId: UniqueIdentifier) => ids.indexOf(String(rowId));
  const name = (rowId: UniqueIdentifier) => names[index(rowId)] ?? "the item";
  const of = ` of ${ids.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${name(active.id)}, position ${index(active.id) + 1}${of}.`,
    onDragOver: ({ active, over }) =>
      over ? `${name(active.id)} is at position ${index(over.id) + 1}${of}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${name(active.id)} at position ${index(over.id) + 1}${of}.`
        : `Dropped ${name(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Cancelled. ${name(active.id)} is back at position ${index(active.id) + 1}${of}.`,
  };
  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) onMove(index(active.id), index(over.id));
      }}
    >
      <SortableContext
        items={ids}
        strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}
