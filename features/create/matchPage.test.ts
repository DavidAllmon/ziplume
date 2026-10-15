import { describe, expect, it } from "vitest";

import { initialState } from "@/features/generator/state/defaults";

import { matchPagePatch } from "./matchPage";

describe("matchPagePatch", () => {
  const design = initialState().design;

  it("uses the page's color for the code and frame when it scans well", () => {
    expect(matchPagePatch("#be123c", design)).toEqual({
      fgColor: "#BE123C",
      frameColor: "#BE123C",
      bgColor: "#FFFFFF",
      gradientType: "none",
      cornerColor: null,
      cornerDotColor: null,
    });
  });

  it("falls back to ink when the page's color is too light for the code's background", () => {
    expect(matchPagePatch("#7FE9FF", design).fgColor).toBe("#0F172A");
  });

  it("puts a dark background back to white, so the code never ends up light on dark", () => {
    const patch = matchPagePatch("#FFFFFF", { ...design, bgColor: "#0A1330" });
    expect(patch.bgColor).toBe("#FFFFFF");
    expect(patch.fgColor).toBe("#0F172A");
  });
});
