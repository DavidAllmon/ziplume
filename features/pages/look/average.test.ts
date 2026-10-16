import { describe, expect, it } from "vitest";

import { averagePixels } from "./average";

describe("averagePixels", () => {
  it("averages RGBA pixels into a hex color, ignoring see-through ones", () => {
    const red = [255, 0, 0, 255];
    const blue = [0, 0, 255, 255];
    const clear = [0, 255, 0, 0];
    expect(averagePixels([...red, ...blue, ...clear])).toBe("#800080");
  });
});
