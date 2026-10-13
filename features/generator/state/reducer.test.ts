import { describe, expect, it } from "vitest";

import { DEFAULT_DESIGN, initialState } from "./defaults";
import { generatorReducer as reduce } from "./reducer";

describe("generatorReducer", () => {
  it("keeps each type's content when switching types", () => {
    let state = initialState();
    state = reduce(state, { type: "setField", qrType: "wifi", field: "ssid", value: "Home" });
    state = reduce(state, { type: "setActiveType", activeType: "url" });
    state = reduce(state, { type: "setActiveType", activeType: "wifi" });
    expect(state.content.wifi.ssid).toBe("Home");
  });

  it("ignores unknown fields", () => {
    const state = initialState();
    expect(reduce(state, { type: "setField", qrType: "url", field: "nope", value: "x" })).toBe(
      state,
    );
  });

  it("raises error correction to High for a logo and restores it on removal", () => {
    let state = reduce(initialState(), { type: "setDesign", patch: { errorCorrection: "Q" } });
    state = reduce(state, { type: "setLogo", logo: "data:image/png;base64,AAA" });
    expect(state.design.errorCorrection).toBe("H");
    state = reduce(state, { type: "setLogo", logo: "data:image/png;base64,BBB" });
    expect(state.design.errorCorrection).toBe("H");
    state = reduce(state, { type: "setLogo", logo: null });
    expect(state.design.errorCorrection).toBe("Q");
  });

  it("keeps a manual error-correction choice made while a logo is present", () => {
    let state = reduce(initialState(), { type: "setLogo", logo: "data:x" });
    state = reduce(state, { type: "setDesign", patch: { errorCorrection: "Q" } });
    state = reduce(state, { type: "setLogo", logo: null });
    expect(state.design.errorCorrection).toBe("Q");
  });

  it("swaps colors, clamps export size and resets design", () => {
    let state = reduce(initialState(), { type: "swapColors" });
    expect(state.design.fgColor).toBe(DEFAULT_DESIGN.bgColor);
    state = reduce(state, { type: "setExport", patch: { size: 99_999 } });
    expect(state.exportSettings.size).toBe(4096);
    state = reduce(state, { type: "setExport", patch: { size: 10 } });
    expect(state.exportSettings.size).toBe(256);
    state = reduce(state, { type: "resetDesign" });
    expect(state.design).toEqual(DEFAULT_DESIGN);
  });
});

describe("hydrate", () => {
  it("normalizes colors and clamps sizes from storage", () => {
    const state = reduce(initialState(), {
      type: "hydrate",
      saved: {
        version: 1,
        activeType: "wifi",
        design: { ...DEFAULT_DESIGN, fgColor: "#abc", bgColor: "nope" },
        exportSettings: { format: "svg", size: 100_000 },
      },
    });
    expect(state.activeType).toBe("wifi");
    expect(state.design.fgColor).toBe("#AABBCC");
    expect(state.design.bgColor).toBe(DEFAULT_DESIGN.bgColor);
    expect(state.exportSettings).toEqual({ format: "svg", size: 4096 });
  });
});
