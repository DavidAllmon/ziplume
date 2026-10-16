// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FONT_IDS } from "@/lib/pages/look";

import { FONTS } from "./fonts";

const fontsFile = readFileSync(new URL("../../../app/fonts.ts", import.meta.url), "utf8");

describe("page fonts", () => {
  it("cover the spec's six, each from a self-hosted family", () => {
    expect(Object.keys(FONTS)).toEqual([...FONT_IDS]);
    expect(FONTS.elegant.heading).toContain("var(--font-playfair)");
    expect(FONTS.friendly.body).toContain("var(--font-nunito)");
    expect(FONTS.modern.heading).toContain("var(--font-bricolage)");
    expect(FONTS.bold.headingSettings).toBe('"wdth" 125');
    expect(FONTS.typewriter.body).toContain("var(--font-plex-mono)");
  });

  it("aren't preloaded: a visitor downloads only the faces the page uses", () => {
    for (const name of ["playfair", "nunito", "bricolage"]) {
      const at = fontsFile.indexOf(`--font-${name}`);
      expect(at, name).toBeGreaterThan(-1);
      expect(fontsFile.slice(at, at + 200), name).toContain("preload: false");
    }
  });
});
