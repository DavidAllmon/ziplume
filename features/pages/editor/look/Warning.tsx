"use client";

import { TriangleAlert } from "lucide-react";

import { lookFixes, type FixPlace, type LookFix } from "@/features/pages/look/fixes";
import type { LookChange, PageLook } from "@/lib/pages/look";

function message({ id, at }: LookFix) {
  if (id === "text") return "Text is hard to read on this wallpaper.";
  if (id === "button") return "Buttons are hard to see on this wallpaper.";
  // Outline buttons' text sits on the wallpaper; the others' on the button.
  return at === "wallpaper"
    ? "Button text is hard to read on this wallpaper."
    : "Button text is hard to read on this color.";
}

/** The readability warnings caused by the control above, each with its one-click fix (spec 6.1). */
export function Warnings({
  look,
  onLook,
  at,
}: {
  look: PageLook;
  onLook: (change: LookChange) => void;
  at: FixPlace;
}) {
  return lookFixes(look)
    .filter((fix) => fix.at === at)
    .map((fix) => (
      <p
        key={fix.id}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control bg-warning-soft px-3 py-2 text-sm text-fg"
      >
        <TriangleAlert aria-hidden className="size-4 shrink-0 text-warning" />
        {message(fix)}
        <button
          type="button"
          onClick={() => onLook(fix.look)}
          className="min-h-11 rounded-control px-1 font-semibold text-link underline underline-offset-4 focus-ring sm:min-h-0"
        >
          {fix.label}
        </button>
      </p>
    ));
}
