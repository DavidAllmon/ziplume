import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/color/contrast";

import { BRAND_COLORS, brandGlyph } from "./social-brands";

describe("brand colors", () => {
  it("draw each network's icon in white or black, whichever reads on its color", () => {
    for (const [network, color] of Object.entries(BRAND_COLORS)) {
      expect(contrastRatio(brandGlyph(color), color), network).toBeGreaterThanOrEqual(3);
    }
    expect(brandGlyph("#FFFC00")).toBe("#000000");
    expect(brandGlyph("#0866FF")).toBe("#FFFFFF");
  });
});
