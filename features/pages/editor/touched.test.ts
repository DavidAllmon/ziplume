import { describe, expect, it } from "vitest";

import { remapTouched } from "./touched";

const sorted = (set: ReadonlySet<string>) => [...set].sort();

describe("remapTouched", () => {
  it("moves a row's marks with it, and drops a removed row's", () => {
    const touched = new Set(["title", "links.0.url", "links.2.url"]);
    // Row 0 moves to the end: the new order is the old rows 1, 2, 0.
    expect(sorted(remapTouched(touched, "links", [1, 2, 0]))).toEqual([
      "links.1.url",
      "links.2.url",
      "title",
    ]);
    expect(sorted(remapTouched(touched, "links", [0, 1]))).toEqual(["links.0.url", "title"]);
    // A new row on top pushes the others down.
    expect(sorted(remapTouched(touched, "links", [-1, 0, 1, 2]))).toEqual([
      "links.1.url",
      "links.3.url",
      "title",
    ]);
  });

  it("moves dishes with their section, and leaves other lists alone", () => {
    const touched = new Set([
      "sections.0.items.1.name",
      "sections.1.items.0.name",
      "socials.0.url",
    ]);
    expect(sorted(remapTouched(touched, "sections", [1, 0]))).toEqual([
      "sections.0.items.0.name",
      "sections.1.items.1.name",
      "socials.0.url",
    ]);
    expect(sorted(remapTouched(touched, "sections.0.items", [1, 0]))).toEqual([
      "sections.0.items.0.name",
      "sections.1.items.0.name",
      "socials.0.url",
    ]);
  });

  it("returns the same set when nothing in the list was touched", () => {
    const touched = new Set(["title"]);
    expect(remapTouched(touched, "links", [1, 0])).toBe(touched);
  });
});
