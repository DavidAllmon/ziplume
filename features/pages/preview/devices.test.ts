import { describe, expect, it } from "vitest";

import { DEVICES, fitScale, outerSize } from "./devices";

describe("devices", () => {
  it("are the real widths of a phone, a tablet and a desktop", () => {
    expect([DEVICES.phone.width, DEVICES.tablet.width, DEVICES.desktop.width]).toEqual([
      390, 820, 1280,
    ]);
  });

  it("scale down to fit the box, by whichever side is tighter", () => {
    const phone = outerSize("phone");
    expect(fitScale("phone", { width: phone.width / 2, height: 10_000 })).toBeCloseTo(0.5);
    expect(fitScale("phone", { width: 10_000, height: phone.height / 4 })).toBeCloseTo(0.25);
  });

  it("never scale up, and never collapse to nothing", () => {
    expect(fitScale("phone", { width: 5000, height: 5000 })).toBe(1);
    expect(fitScale("desktop", { width: 0, height: 0 })).toBeGreaterThan(0);
  });
});
