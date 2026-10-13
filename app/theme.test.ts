import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/color/contrast";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,6})\s*;/gi)].map((m) => [m[1], m[2]]),
  ) as Record<string, string>;
}

const themes = { light: tokens(":root"), dark: tokens('[data-theme="dark"]') };

// [foreground, background, minimum ratio]
const TEXT_PAIRS: [string, string, number][] = [
  ["fg", "bg", 4.5],
  ["fg", "surface", 4.5],
  ["fg", "surface-2", 4.5],
  ["fg-muted", "bg", 4.5],
  ["fg-muted", "surface", 4.5],
  ["fg-muted", "surface-2", 4.5],
  ["fg-subtle", "surface", 4.5],
  ["primary-fg", "primary", 4.5],
  ["primary-fg", "primary-hover", 4.5],
  ["primary-soft-fg", "primary-soft", 4.5],
  ["link", "surface", 4.5],
  ["link", "bg", 4.5],
  ["accent-fg", "accent", 4.5],
  ["success", "surface", 4.5],
  ["success", "success-soft", 4.5],
  ["warning", "surface", 4.5],
  ["warning", "warning-soft", 4.5],
  ["danger", "surface", 4.5],
  ["danger", "danger-soft", 4.5],
  // Non-text UI boundaries (WCAG 1.4.11).
  ["field-border", "surface", 3],
  ["ring", "bg", 3],
  ["ring", "surface", 3],
];

describe.each(Object.entries(themes))("%s theme tokens", (_name, palette) => {
  it("defines every token used in contrast pairs", () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      expect(palette[fg], fg).toBeDefined();
      expect(palette[bg], bg).toBeDefined();
    }
  });

  it.each(TEXT_PAIRS)("%s on %s meets %s:1", (fg, bg, min) => {
    expect(contrastRatio(palette[fg]!, palette[bg]!)).toBeGreaterThanOrEqual(min);
  });
});
