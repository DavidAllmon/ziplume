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

  it("use a white icon, as the spec says, unless white wouldn't read on that color", () => {
    for (const network of ["instagram", "youtube", "soundcloud", "reddit", "mastodon", "bluesky"]) {
      expect(brandGlyph(BRAND_COLORS[network as keyof typeof BRAND_COLORS]!), network).toBe(
        "#FFFFFF",
      );
    }
    for (const network of ["snapchat", "whatsapp", "telegram", "spotify"]) {
      expect(brandGlyph(BRAND_COLORS[network as keyof typeof BRAND_COLORS]!), network).toBe(
        "#000000",
      );
    }
  });
});
