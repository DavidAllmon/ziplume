import type { PageLook } from "@/lib/pages/look";

import { lookChecks, mix, resolveLook, type LookCheck } from "./resolve";

/** The one-click fix for a failing readability check (spec 6.1). */
export function fixLook(look: PageLook, id: LookCheck["id"]): PageLook {
  if (!lookChecks(look).some((check) => check.id === id)) return look;
  if (id === "text") return { ...look, text: "auto" };
  if (id === "buttonText") return { ...look, button: { ...look.button, text: "auto" } };
  // Buttons that don't stand out: move the color toward the page's text color until they do.
  const target = resolveLook({ ...look, text: "auto" }).text;
  for (let step = 1; step <= 10; step++) {
    const color = mix(look.button.color, target, step / 10);
    const next = { ...look, button: { ...look.button, color } };
    if (!lookChecks(next).some((check) => check.id === "button")) return next;
  }
  return { ...look, button: { ...look.button, color: target } };
}
