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

describe("logo icons and templates", () => {
  it("preset icons raise error correction like uploads, and replace an upload", () => {
    let state = reduce(initialState(), {
      type: "setLogo",
      logo: "data:image/png;base64,AAA",
    });
    state = reduce(state, { type: "setLogoIcon", icon: "wifi" });
    expect(state.design.logo).toBeNull();
    expect(state.design.logoIcon).toBe("wifi");
    expect(state.design.errorCorrection).toBe("H");
    state = reduce(state, { type: "setLogoIcon", icon: null });
    expect(state.design.errorCorrection).toBe("M");
  });

  it("applying a template keeps the user's logo and its error correction", () => {
    let state = reduce(initialState(), {
      type: "setLogo",
      logo: "data:image/png;base64,AAA",
    });
    state = reduce(state, {
      type: "applyDesign",
      design: { fgColor: "#831843", frame: "badge", errorCorrection: "M", logo: null },
    });
    expect(state.design).toMatchObject({
      fgColor: "#831843",
      frame: "badge",
      logo: "data:image/png;base64,AAA",
      errorCorrection: "H",
    });
    state = reduce(state, { type: "setLogo", logo: null });
    expect(state.design.errorCorrection).toBe("M");
  });

  it("templates are sanitized", () => {
    const state = reduce(initialState(), {
      type: "applyDesign",
      design: {
        dotStyle: "hearts",
        frame: "neon",
        gradientType: "conic",
        frameText: "a\nb",
        logoIcon: "nope",
      },
    });
    expect(state.design).toMatchObject({
      dotStyle: "rounded",
      frame: "none",
      gradientType: "none",
      frameText: "a b",
      logoIcon: null,
    });
  });
});

describe("reset", () => {
  it("returns every setting to its default", () => {
    let state = initialState();
    state = reduce(state, { type: "setActiveType", activeType: "wifi" });
    state = reduce(state, { type: "setField", qrType: "wifi", field: "ssid", value: "Home" });
    state = reduce(state, { type: "setDesign", patch: { fgColor: "#123456", dotStyle: "dots" } });
    state = reduce(state, { type: "setLogo", logo: "data:image/png;base64,AAA" });
    state = reduce(state, { type: "setExport", patch: { format: "svg", size: 2048 } });
    state = reduce(state, { type: "setName", name: "Front desk" });
    expect(reduce(state, { type: "reset" })).toEqual(initialState());
  });
});

describe("name", () => {
  it("is stored and capped at 120 characters", () => {
    let state = reduce(initialState(), { type: "setName", name: "Spring menu" });
    expect(state.name).toBe("Spring menu");
    state = reduce(state, { type: "setName", name: "x".repeat(200) });
    expect(state.name).toHaveLength(120);
  });

  it("is cleared when a saved code is loaded", () => {
    let state = reduce(initialState(), { type: "setName", name: "Typed name" });
    state = reduce(state, {
      type: "loadCode",
      qrType: "url",
      content: { url: "https://example.com" },
      design: DEFAULT_DESIGN,
    });
    expect(state.name).toBe("");
  });
});
