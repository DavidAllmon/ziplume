"use client";

import { TriangleAlert } from "lucide-react";

import { fixLook } from "@/features/pages/look/fixes";
import { lookChecks, type LookCheck } from "@/features/pages/look/resolve";
import type { LookChange, PageLook } from "@/lib/pages/look";

const MESSAGES: Record<LookCheck["id"], string> = {
  text: "Text is hard to read on this wallpaper.",
  buttonText: "Button text is hard to read on this color.",
  button: "Buttons are hard to see on this wallpaper.",
};

/** A readability warning under a control, with its one-click fix (spec 6.1). */
export function Warning({
  look,
  id,
  onLook,
  fixLabel,
}: {
  look: PageLook;
  id: LookCheck["id"];
  onLook: (change: LookChange) => void;
  fixLabel: string;
}) {
  if (!lookChecks(look).some((check) => check.id === id)) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control bg-warning-soft px-3 py-2 text-sm text-fg">
      <TriangleAlert aria-hidden className="size-4 shrink-0 text-warning" />
      {MESSAGES[id]}
      <button
        type="button"
        onClick={() => onLook(fixLook(look, id))}
        className="min-h-11 rounded-control px-1 font-semibold text-link underline underline-offset-4 focus-ring sm:min-h-0"
      >
        {fixLabel}
      </button>
    </p>
  );
}
