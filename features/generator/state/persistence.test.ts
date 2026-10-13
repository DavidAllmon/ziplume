import { afterEach, describe, expect, it } from "vitest";

import { initialState } from "./defaults";
import {
  isPersistedSettings,
  loadSettings,
  MAX_PERSISTED_LOGO_CHARS,
  saveSettings,
  STORAGE_KEY,
  toPersisted,
} from "./persistence";
import { generatorReducer } from "./reducer";

afterEach(() => window.localStorage.clear());

describe("persistence", () => {
  it("never stores content", () => {
    let state = initialState();
    state = generatorReducer(state, {
      type: "setField",
      qrType: "wifi",
      field: "password",
      value: "secret-password",
    });
    saveSettings(state);
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? "";
    expect(raw).not.toContain("secret-password");
    expect(JSON.parse(raw)).not.toHaveProperty("content");
  });

  it("round-trips design and export settings", () => {
    const state = generatorReducer(initialState(), {
      type: "setDesign",
      patch: { dotStyle: "dots", fgColor: "#123456" },
    });
    saveSettings(state);
    expect(loadSettings()).toEqual(toPersisted(state));
  });

  it("drops logos that are too large to remember", () => {
    const state = generatorReducer(initialState(), {
      type: "setLogo",
      logo: "x".repeat(MAX_PERSISTED_LOGO_CHARS + 1),
    });
    expect(toPersisted(state).design.logo).toBeNull();
  });

  it("rejects malformed or outdated data", () => {
    const valid = toPersisted(initialState());
    expect(isPersistedSettings(valid)).toBe(true);
    expect(isPersistedSettings({ ...valid, version: 0 })).toBe(false);
    expect(isPersistedSettings({ ...valid, activeType: "fax" })).toBe(false);
    expect(isPersistedSettings({ ...valid, design: "nope" })).toBe(false);
    expect(isPersistedSettings({ ...valid, exportSettings: { format: "gif", size: 1 } })).toBe(
      false,
    );
    expect(isPersistedSettings(null)).toBe(false);
  });

  it("upgrades settings saved by an older version and repairs bad values", () => {
    const older = {
      version: 1,
      activeType: "wifi",
      design: {
        fgColor: "#123456",
        bgColor: "#ffffff",
        transparent: false,
        dotStyle: "dots",
        cornerStyle: "dot",
        errorCorrection: "Q",
        logo: null,
        logoSize: 2,
        logoClearSpace: true,
      },
      exportSettings: { format: "png", size: 1024 },
    };
    expect(isPersistedSettings(older)).toBe(true);
    const state = generatorReducer(initialState(), { type: "hydrate", saved: older as never });
    expect(state.activeType).toBe("wifi");
    expect(state.design).toMatchObject({
      fgColor: "#123456",
      dotStyle: "dots",
      cornerStyle: "dot",
      errorCorrection: "Q",
      logoSize: 0.3,
      gradientType: "none",
      frame: "none",
      cornerColor: null,
    });
  });
});
