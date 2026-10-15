"use client";

import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, Plus } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

import type { ErrorsApi } from "../fields";
import { RowMenu } from "./RowMenu";
import { newRowId, useRowIds } from "./rowIds";
import { SortableArea } from "./SortableArea";

/** Where the cursor goes in a new row: its first field (not a file picker). */
const FIRST_FIELD =
  "input:not([type='hidden']):not([type='file']):not(:disabled), textarea:not(:disabled), select:not(:disabled)";

type Update<T> = (patch: Partial<T>) => void;

interface AdderActions<T> {
  add: (item: T) => void;
  focus: (index: number) => void;
}

export interface SortableListProps<T> {
  /** Names the list, e.g. "Links". Read by screen readers; shown unless `showLabel` is false. */
  label: string;
  showLabel?: boolean;
  items: T[];
  onChange: (items: T[]) => void;
  max: number;
  newItem: () => T;
  addLabel: string;
  /** Where Add puts the new row, and where the Add button sits. */
  addAt?: "start" | "end";
  /** A row's name in its controls and announcements: link “Shop”, or link 2. */
  itemLabel: (item: T, index: number) => string;
  /** The rows' error path ("links", "sections.0.items"), so errors move with their rows. */
  path?: string;
  errors?: ErrorsApi;
  /** A row that's switched off: shown dashed, with a note. */
  off?: (item: T) => boolean;
  /** Controls before a row's ⋯ menu, e.g. the on/off switch. */
  rowActions?: (item: T, update: Update<T>, index: number) => ReactNode;
  /** Replaces the Add button (the social icon grid): `add` adds a row, `focus` goes to one. */
  adder?: (actions: AdderActions<T>) => ReactNode;
  render: (item: T, update: Update<T>, index: number) => ReactNode;
}

/** A list of small forms (links, phone numbers, dishes…): Add, drag to reorder, and a ⋯ menu. */
export function SortableList<T>({
  label,
  showLabel = true,
  items,
  onChange,
  max,
  newItem,
  addLabel,
  addAt = "start",
  itemLabel,
  path,
  errors,
  off,
  rowActions,
  adder,
  render,
}: SortableListProps<T>) {
  const [ids, setIds] = useRowIds(items.length);
  const rows = useRef(new Map<string, HTMLElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  // Where focus goes once the list has re-rendered: a row's first field or its ⋯ button, or
  // (id null) the Add button.
  const pending = useRef<{ id: string | null; target: "field" | "menu" } | null>(null);

  useLayoutEffect(() => {
    const want = pending.current;
    if (!want) return;
    pending.current = null;
    if (!want.id) {
      addButton.current?.focus();
      return;
    }
    const row = rows.current.get(want.id);
    row
      ?.querySelector<HTMLElement>(want.target === "menu" ? "[data-row-menu]" : FIRST_FIELD)
      ?.focus();
  });

  const register = useCallback((id: string, element: HTMLElement | null) => {
    if (element) rows.current.set(id, element);
    else rows.current.delete(id);
  }, []);

  function commit(order: number[], added?: { id: string; item: T }) {
    setIds(order.map((old) => (old === -1 ? added!.id : ids[old]!)));
    if (path) errors?.reorder?.(path, order);
    onChange(order.map((old) => (old === -1 ? added!.item : items[old]!)));
  }
  const indexes = () => items.map((_, i) => i);

  function add(item: T) {
    const id = newRowId();
    pending.current = { id, target: "field" };
    commit(addAt === "start" ? [-1, ...indexes()] : [...indexes(), -1], { id, item });
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const order = indexes();
    order.splice(to, 0, ...order.splice(from, 1));
    commit(order);
  }
  function remove(index: number) {
    pending.current = { id: ids[index + 1] ?? ids[index - 1] ?? null, target: "menu" };
    commit(indexes().filter((i) => i !== index));
  }
  const update =
    (index: number): Update<T> =>
    (patch) =>
      onChange(items.map((item, j) => (j === index ? { ...item, ...patch } : item)));
  const focus = (index: number) => {
    const id = ids[index];
    (id ? rows.current.get(id) : undefined)?.querySelector<HTMLElement>(FIRST_FIELD)?.focus();
  };

  const names = items.map(itemLabel);
  const addControl =
    !adder && items.length < max ? (
      <Button
        ref={addButton}
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => add(newItem())}
      >
        <Plus aria-hidden /> {addLabel}
      </Button>
    ) : null;

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className={cn("mb-2 text-sm font-medium text-fg", !showLabel && "sr-only")}>
        {label}
      </legend>
      {adder && <Adder render={adder} add={add} focus={focus} />}
      {addAt === "start" && addControl}
      {items.length > 0 && (
        <SortableArea ids={ids} names={names} onMove={move}>
          <ul className="flex flex-col gap-3">
            {items.map((item, i) => (
              <SortableRow
                key={ids[i]}
                id={ids[i]!}
                name={names[i]!}
                off={off?.(item) ?? false}
                register={register}
                actions={rowActions?.(item, update(i), i)}
                menu={
                  <RowMenu
                    name={names[i]!}
                    first={i === 0}
                    last={i === items.length - 1}
                    onMove={(by) => {
                      pending.current = { id: ids[i]!, target: "menu" };
                      move(i, i + by);
                    }}
                    onRemove={() => remove(i)}
                  />
                }
              >
                {render(item, update(i), i)}
              </SortableRow>
            ))}
          </ul>
        </SortableArea>
      )}
      {addAt === "end" && addControl}
    </fieldset>
  );
}

function SortableRow({
  id,
  name,
  off,
  register,
  actions,
  menu,
  children,
}: {
  id: string;
  name: string;
  off: boolean;
  register: (id: string, element: HTMLElement | null) => void;
  actions: ReactNode;
  menu: ReactNode;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const ref = useCallback(
    (element: HTMLLIElement | null) => {
      setNodeRef(element);
      register(id, element);
    },
    [setNodeRef, register, id],
  );
  return (
    <li
      ref={ref}
      style={{
        transform: transform
          ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
          : undefined,
        transition,
      }}
      className={cn(
        "flex gap-2 rounded-control border border-border bg-surface p-3",
        off && "border-dashed bg-surface-2",
        isDragging && "relative z-10 shadow-pop",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${name}`}
        className="-my-1 -ml-1 flex w-8 shrink-0 cursor-grab touch-none justify-center rounded-control pt-2.5 text-fg-muted focus-ring hover:text-fg active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-5" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {children}
        {off && <p className="text-[13px] text-fg-muted">Hidden from your page</p>}
      </div>
      <div className="flex shrink-0 items-start gap-1">
        {actions}
        {menu}
      </div>
    </li>
  );
}

/** Draws the list's own Add control; `add` and `focus` only run from its click handlers. */
function Adder<T>({
  render,
  ...actions
}: AdderActions<T> & { render: (actions: AdderActions<T>) => ReactNode }) {
  return render(actions);
}
