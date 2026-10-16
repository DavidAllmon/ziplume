import type { PageLook, Wallpaper } from "@/lib/pages/look";

import { INK, lookChecks, mix, resolveLook, WHITE, type LookCheck } from "./resolve";

/** Where a warning shows: under the control whose choice causes it (spec 6.1). */
export type FixPlace = "wallpaper" | "text" | "buttonColor" | "buttonText";

/** A readability warning's one-click fix. */
export interface LookFix {
  id: LookCheck["id"];
  at: FixPlace;
  label: string;
  look: PageLook;
}

interface Option {
  at: FixPlace;
  label: string;
  looks: PageLook[];
}

// 5% at a time, so the fix changes the person's color as little as it can.
const STEPS = Array.from({ length: 20 }, (_, i) => (i + 1) / 20);

/** The wallpaper moved toward ink or white; a photo can only be darkened. */
function shiftWallpaper(w: Wallpaper, toward: string, t: number): Wallpaper | null {
  if (w.kind === "solid") return { ...w, color: mix(w.color, toward, t) };
  if (w.kind === "gradient") {
    return { ...w, from: mix(w.from, toward, t), to: mix(w.to, toward, t) };
  }
  if (toward !== INK || w.dim >= 80) return null;
  return { ...w, dim: Math.min(80, Math.ceil((w.dim + (80 - w.dim) * t) / 5) * 5) };
}

function wallpaperOption(look: PageLook): Option {
  const looks = STEPS.flatMap((t) =>
    [INK, WHITE].flatMap((toward) => {
      const wallpaper = shiftWallpaper(look.wallpaper, toward, t);
      return wallpaper ? [{ ...look, wallpaper }] : [];
    }),
  );
  return { at: "wallpaper", label: "Adjust the wallpaper", looks };
}

function buttonColorOption(look: PageLook, label: string, toward: string[]): Option {
  const looks = STEPS.flatMap((t) =>
    toward.map((color) => ({
      ...look,
      button: { ...look.button, color: mix(look.button.color, color, t) },
    })),
  );
  return { at: "buttonColor", label, looks };
}

/** The ways to fix a check, the most direct first. */
function options(look: PageLook, id: LookCheck["id"]): Option[] {
  const b = look.button;
  if (id === "text") {
    const auto = { ...look, text: "auto" };
    return [
      ...(look.text === "auto" ? [] : [{ at: "text" as const, label: "Use Auto", looks: [auto] }]),
      wallpaperOption(auto),
    ];
  }
  if (id === "buttonText") {
    const auto = { ...look, button: { ...b, text: "auto" } };
    return [
      ...(b.text === "auto"
        ? []
        : [{ at: "buttonText" as const, label: "Use Auto", looks: [auto] }]),
      buttonColorOption(auto, "Adjust the button color", [INK, WHITE]),
      wallpaperOption(auto),
    ];
  }
  // Buttons that don't stand out: toward the page's text color first, as the theme would.
  const text = resolveLook({ ...look, text: "auto" }).text;
  return [
    buttonColorOption(look, "Make buttons stand out", [text, text === WHITE ? INK : WHITE]),
    wallpaperOption(look),
  ];
}

/** The smallest change that clears the check, preferring one that raises no new warning. */
function fixFor(look: PageLook, id: LookCheck["id"]): LookFix | null {
  const before = new Set(lookChecks(look).map((check) => check.id));
  let fallback: LookFix | null = null;
  for (const option of options(look, id)) {
    for (const next of option.looks) {
      const after = lookChecks(next).map((check) => check.id);
      if (after.includes(id)) continue;
      const fix = { id, at: option.at, label: option.label, look: next };
      if (after.every((other) => before.has(other))) return fix;
      fallback ??= fix;
    }
  }
  return fallback;
}

// The Look tab draws a look's warnings in several cards; work them out once per look.
let last: { key: string; fixes: LookFix[] } | null = null;

/** Each failing readability check with the fix to offer, and where (spec 6.1). */
export function lookFixes(look: PageLook): LookFix[] {
  const key = JSON.stringify(look);
  if (last?.key === key) return last.fixes;
  const fixes = lookChecks(look).flatMap(({ id }) => fixFor(look, id) ?? []);
  last = { key, fixes };
  return fixes;
}
