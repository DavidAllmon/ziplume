"use client";

import { cn } from "@/lib/cn";

/** A row of color swatches; `name` prefixes each one's label, e.g. "Wallpaper #F6F5F1". */
export function Swatches({
  name,
  colors,
  value,
  onPick,
}: {
  name: string;
  colors: string[];
  value: string;
  onPick: (color: string) => void;
}) {
  return (
    <div role="group" aria-label={`${name} colors`} className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`${name} ${color}`}
          aria-pressed={value === color}
          onClick={() => onPick(color)}
          className={cn(
            "size-11 rounded-full border-2 shadow-sm focus-ring sm:size-9",
            value === color ? "border-fg" : "border-border",
          )}
          style={{ background: color }}
        />
      ))}
    </div>
  );
}
