import { describe, expect, it } from "vitest";

import { COLOR_PRESETS, DEFAULT_DESIGN, GRADIENT_PRESETS } from "./defaults";

describe("new codes", () => {
  it("start in Ziplume navy", () => {
    expect(DEFAULT_DESIGN.fgColor).toBe("#0A1330");
    expect(DEFAULT_DESIGN.frameColor).toBe("#0A1330");
    expect(DEFAULT_DESIGN.gradientColor).toBe("#0B6E8C");
    expect(COLOR_PRESETS[0]).toEqual({ name: "Navy", fg: "#0A1330", bg: "#FFFFFF" });
    expect(GRADIENT_PRESETS.some((p) => p.from === "#0A1330" && p.to === "#0B6E8C")).toBe(true);
  });
});
