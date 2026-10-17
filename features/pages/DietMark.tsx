import { Flame, Leaf, MilkOff, Nut, Vegan, WheatOff, type LucideIcon } from "lucide-react";

import { DIET, type DietLabel } from "@/lib/pages/menu";

// Halal and Kosher have no widely understood icon, so they're words alone.
const ICON: Partial<Record<DietLabel, LucideIcon>> = {
  vegan: Vegan,
  vegetarian: Leaf,
  "gluten-free": WheatOff,
  "dairy-free": MilkOff,
  spicy: Flame,
  nuts: Nut,
};

/** A dish's dietary label: its icon and its name (spec item 22). */
export function DietMark({ id }: { id: DietLabel }) {
  const Icon = ICON[id];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted">
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {DIET.find((d) => d.id === id)!.label}
    </span>
  );
}
