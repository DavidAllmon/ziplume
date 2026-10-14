import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { GRADIENT_PRESETS } from "@/features/generator/state/defaults";
import { contrastRatio, gradientSamples } from "@/lib/color/contrast";

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
  // Primary text: 7:1 (spec §5).
  ["fg", "bg", 7],
  ["fg", "surface", 7],
  ["fg", "surface-2", 7],
  ["primary-fg", "primary", 7],
  // Secondary text and colored text: 4.5:1.
  ["fg-muted", "bg", 4.5],
  ["fg-muted", "surface", 4.5],
  ["fg-muted", "surface-2", 4.5],
  ["fg-subtle", "surface", 4.5],
  ["primary-fg", "primary-hover", 4.5],
  ["primary-soft-fg", "primary-soft", 4.5],
  ["link", "bg", 4.5],
  ["link", "surface", 4.5],
  ["link", "surface-2", 4.5],
  ["success", "surface", 4.5],
  ["success", "success-soft", 4.5],
  ["warning", "surface", 4.5],
  ["warning", "warning-soft", 4.5],
  ["danger", "surface", 4.5],
  ["danger", "danger-soft", 4.5],
  ["neutral", "neutral-soft", 4.5],
  // Non-text UI boundaries (WCAG 1.4.11): 3:1.
  ["field-border", "bg", 3],
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

describe("type and accents", () => {
  it("uses Inter only", () => {
    expect(css).not.toMatch(/space-grotesk/i);
    expect(readFileSync(resolve(process.cwd(), "app/fonts.ts"), "utf8")).not.toMatch(/Grotesk/);
  });

  it("has no lime accent left", () => {
    expect(css).not.toMatch(/#a3e635|--accent\b/i);
  });
});

describe("gradient presets", () => {
  it("keep both ends readable on white", () => {
    for (const preset of GRADIENT_PRESETS) {
      for (const color of [preset.from, preset.to, ...gradientSamples(preset.from, preset.to)]) {
        expect(contrastRatio(color, "#FFFFFF"), `${preset.name} ${color}`).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });
});
