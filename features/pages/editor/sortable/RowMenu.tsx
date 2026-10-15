"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MoreHorizontal, Trash2 } from "lucide-react";

import { menuItemClass, menuPanelClass } from "@/components/app/nav";
import { cn } from "@/lib/cn";

const WORDS = {
  list: { earlier: "Move up", later: "Move down", Earlier: ArrowUp, Later: ArrowDown },
  grid: { earlier: "Move earlier", later: "Move later", Earlier: ArrowLeft, Later: ArrowRight },
};

const itemClass = cn(menuItemClass, "data-disabled:cursor-not-allowed data-disabled:opacity-50");

/** A row's ⋯ menu: move it one place either way, or remove it. */
export function RowMenu({
  name,
  first,
  last,
  onMove,
  onRemove,
  layout = "list",
}: {
  /** e.g. link “Shop” */
  name: string;
  first: boolean;
  last: boolean;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  layout?: "list" | "grid";
}) {
  const { earlier, later, Earlier, Later } = WORDS[layout];
  return (
    <Menu as="div" className="relative">
      <MenuButton
        data-row-menu
        aria-label={`Actions for ${name}`}
        className="grid size-11 place-items-center rounded-control text-fg-muted hover:bg-surface-2 hover:text-fg data-focus:outline-2 data-focus:outline-ring sm:size-9"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </MenuButton>
      <MenuItems anchor={{ to: "bottom end", gap: 4 }} transition className={menuPanelClass}>
        <MenuItem disabled={first}>
          <button type="button" className={itemClass} onClick={() => onMove(-1)}>
            <Earlier aria-hidden /> {earlier}
          </button>
        </MenuItem>
        <MenuItem disabled={last}>
          <button type="button" className={itemClass} onClick={() => onMove(1)}>
            <Later aria-hidden /> {later}
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={itemClass} onClick={onRemove}>
            <Trash2 aria-hidden /> Remove
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
