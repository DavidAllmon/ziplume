import { describe, expect, it } from "vitest";

import { limitNote } from "./limits";

describe("limitNote", () => {
  it("counts text of several lines all the time", () => {
    expect(limitNote(0, 1000, true)).toEqual({ counter: "0 / 1,000", error: null });
  });

  it("shows a one-line box's count within 20 characters of its limit", () => {
    expect(limitNote(99, 120, false).counter).toBeNull();
    expect(limitNote(100, 120, false).counter).toBe("100 / 120");
  });

  it("keeps small boxes, like a price or a currency, quiet until they're too long", () => {
    expect(limitNote(0, 4, false)).toEqual({ counter: null, error: null });
    expect(limitNote(19, 20, false)).toEqual({ counter: null, error: null });
    expect(limitNote(21, 20, false)).toEqual({
      counter: "21 / 20",
      error: "Shorten by 1 character",
    });
  });
});
