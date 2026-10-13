import { afterEach, describe, expect, it, vi } from "vitest";

import { loadJSON, removeKey, saveJSON } from "./storage";

const isNumberBox = (v: unknown): v is { n: number } =>
  typeof v === "object" && v !== null && typeof (v as { n: unknown }).n === "number";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("storage", () => {
  it("round-trips valid values", () => {
    expect(saveJSON("k", { n: 1 })).toBe(true);
    expect(loadJSON("k", isNumberBox)).toEqual({ n: 1 });
    removeKey("k");
    expect(loadJSON("k", isNumberBox)).toBeNull();
  });

  it("ignores corrupt or invalid data", () => {
    window.localStorage.setItem("k", "{not json");
    expect(loadJSON("k", isNumberBox)).toBeNull();
    window.localStorage.setItem("k", JSON.stringify({ n: "1" }));
    expect(loadJSON("k", isNumberBox)).toBeNull();
  });

  it("survives storage that throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(saveJSON("k", { n: 1 })).toBe(false);
    expect(loadJSON("k", isNumberBox)).toBeNull();
  });
});
