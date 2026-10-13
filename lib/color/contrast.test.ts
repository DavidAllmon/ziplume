import { describe, expect, it } from "vitest";

import { contrastRatio, isValidHex, normalizeHex, relativeLuminance } from "./contrast";

describe("contrast", () => {
  it("validates and normalizes hex colors", () => {
    expect(isValidHex("#fff")).toBe(true);
    expect(isValidHex("#12345")).toBe(false);
    expect(isValidHex("red")).toBe(false);
    expect(normalizeHex("#abc")).toBe("#AABBCC");
    expect(normalizeHex(" #0f172a ")).toBe("#0F172A");
    expect(normalizeHex("nope")).toBeNull();
  });

  it("computes WCAG luminance and ratios", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBe(1);
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777", "#777")).toBe(1);
    // Known reference value: #4F46E5 on white is ~6.3:1.
    expect(contrastRatio("#4F46E5", "#FFFFFF")).toBeGreaterThan(6.2);
  });
});
