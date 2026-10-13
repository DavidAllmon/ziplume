import { describe, expect, it } from "vitest";

import {
  apply,
  parseColor,
  parsePath,
  parseTransform,
  rectPath,
  type Segment,
} from "./svg-geometry";

const end = (segments: Segment[]) => {
  const last = segments.findLast((s) => s.op !== "Z");
  if (!last) return null;
  return [Math.round(last.x * 1000) / 1000, Math.round(last.y * 1000) / 1000];
};

describe("svg geometry", () => {
  it("parses transforms", () => {
    const [x, y] = apply(parseTransform("rotate(90,10,10)"), 20, 10);
    expect(x).toBeCloseTo(10);
    expect(y).toBeCloseTo(20);
    expect(apply(parseTransform("translate(5 6) scale(2)"), 1, 1)).toEqual([7, 8]);
    expect(parseTransform(null)).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("parses relative commands like qr-code-styling writes them", () => {
    const segs = parsePath("M 115 25v 5a 5 5, 0, 0, 0, 5 5h 5v -5a 5 5, 0, 0, 0, -5 -5");
    expect(segs[0]).toEqual({ op: "M", x: 115, y: 25 });
    expect(end(segs)).toEqual([120, 25]);
    expect(segs.some((s) => s.op === "C")).toBe(true);
  });

  it("turns arcs into curves that end where the arc does", () => {
    const quarter = parsePath("M10 0A10 10 0 0 1 0 10");
    const curve = quarter[1]!;
    expect(curve.op).toBe("C");
    expect(end(quarter)).toEqual([0, 10]);
    // A half circle needs two quarter segments.
    expect(parsePath("M10 0A10 10 0 0 1 -10 0").filter((s) => s.op === "C")).toHaveLength(2);
    // Compact arc flags ("0 01") are read one digit at a time.
    expect(end(parsePath("M0 0a5 5 0 015 5"))).toEqual([5, 5]);
  });

  it("handles smooth and quadratic curves, implicit lines and closepath", () => {
    expect(end(parsePath("M0 0 10 0 10 10"))).toEqual([10, 10]);
    expect(end(parsePath("M0 0Q5 5 10 0T20 0"))).toEqual([20, 0]);
    expect(end(parsePath("M0 0C1 1 2 2 3 3S5 5 6 6"))).toEqual([6, 6]);
    expect(parsePath("M0 0L1 1Z").at(-1)).toEqual({ op: "Z" });
    expect(parsePath("M0 0 L")).toEqual([{ op: "M", x: 0, y: 0 }]);
  });

  it("draws rounded rectangles", () => {
    expect(rectPath(0, 0, 10, 10)).toHaveLength(5);
    expect(rectPath(0, 0, 10, 10, 2).filter((s) => s.op === "C")).toHaveLength(4);
  });

  it("parses colors", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor("#4F46E5")).toEqual({ r: 79, g: 70, b: 229 });
    expect(parseColor("rgba(0,0,0,0)")).toBeNull();
    expect(parseColor("rgb(1, 2, 3)")).toEqual({ r: 1, g: 2, b: 3 });
    expect(parseColor("none")).toBeNull();
  });
});
