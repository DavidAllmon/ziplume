import { describe, expect, it } from "vitest";

import { DEFAULT_DESIGN, initialState } from "./defaults";
import { generatorReducer } from "./reducer";
import { sanitizeContent, sanitizeDesign } from "./sanitize";

describe("sanitizeDesign", () => {
  it("keeps valid fields and replaces invalid ones with defaults", () => {
    const design = sanitizeDesign({
      fgColor: "#abc",
      bgColor: "nope",
      dotStyle: "dots",
      cornerStyle: "triangle",
      errorCorrection: "Q",
      logo: "javascript:alert(1)",
      logoSize: 5,
      transparent: "yes",
    });
    expect(design).toEqual({
      ...DEFAULT_DESIGN,
      fgColor: "#AABBCC",
      dotStyle: "dots",
      errorCorrection: "Q",
      logoSize: 0.3,
    });
    expect(sanitizeDesign(null)).toEqual(DEFAULT_DESIGN);
    expect(sanitizeDesign({ logo: "data:image/png;base64,AAA" }).logo).toBe(
      "data:image/png;base64,AAA",
    );
  });
});

describe("sanitizeContent", () => {
  it("fills defaults and drops unknown or mistyped fields", () => {
    expect(sanitizeContent("wifi", { ssid: "Home", hidden: "true", extra: 1 })).toEqual({
      ssid: "Home",
      password: "",
      security: "WPA",
      hidden: false,
    });
  });
});

describe("loadCode", () => {
  it("switches to the code's type and loads its content and design", () => {
    const state = generatorReducer(initialState(), {
      type: "loadCode",
      qrType: "wifi",
      content: { ssid: "Cafe", password: "secret123", security: "WPA", hidden: false },
      design: { dotStyle: "classy", fgColor: "#123456" },
    });
    expect(state.activeType).toBe("wifi");
    expect(state.content.wifi.ssid).toBe("Cafe");
    expect(state.design.dotStyle).toBe("classy");
    expect(state.design.fgColor).toBe("#123456");
    expect(state.content.url).toEqual(initialState().content.url);
  });
});
