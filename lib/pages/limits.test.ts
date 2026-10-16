import { describe, expect, it } from "vitest";

import { limitAt, overLimit, sanitizePage, shortenBy } from "./sanitize";
import { LIMITS, PAGE_DEFAULTS } from "./types";
import { validatePage } from "./validate";

const long = (n: number) => "x".repeat(n);

describe("text limits", () => {
  it("finds a field's limit by its path, in lists too", () => {
    expect(limitAt("video", "description")).toBe(1000);
    expect(limitAt("links", "bio")).toBe(300);
    expect(limitAt("links", "links.3.label")).toBe(80);
    expect(limitAt("menu", "sections.0.items.2.description")).toBe(300);
    expect(limitAt("business", "about")).toBe(2000);
    expect(limitAt("video", "nope")).toBeNull();
    expect(limitAt("links", "links.label")).toBeNull();
    expect(limitAt("links", "avatar")).toBeNull();
  });

  it("gives descriptions room for 1,000 characters, and keeps short ones short", () => {
    for (const [type, path] of [
      ["video", "description"],
      ["pdf", "description"],
      ["images", "description"],
      ["audio", "description"],
      ["app", "description"],
      ["menu", "description"],
      ["menu", "note"],
      ["coupon", "description"],
      ["vcard", "bio"],
      ["feedback", "thanks"],
    ] as const) {
      expect(limitAt(type, path), `${type}.${path}`).toBe(LIMITS.text);
    }
    expect(limitAt("event", "description")).toBe(2000);
    expect(limitAt("coupon", "terms")).toBe(2000);
  });

  it("says how much to shorten", () => {
    expect(shortenBy(1)).toBe("Shorten by 1 character");
    expect(shortenBy(1200)).toBe("Shorten by 1,200 characters");
  });

  it("names every field over its limit, nested ones included", () => {
    const menu = PAGE_DEFAULTS.menu();
    menu.description = long(1005);
    menu.sections = [
      {
        name: "Mains",
        items: [{ name: "Pie", description: long(301), price: "9", tags: "" }],
      },
    ];
    expect(overLimit("menu", menu)).toEqual({
      description: "Shorten by 5 characters",
      "sections.0.items.0.description": "Shorten by 1 character",
    });
  });

  it("keeps long text in the editor, and trims it everywhere else", () => {
    const raw = { ...PAGE_DEFAULTS.video(), description: long(1500) };
    expect(sanitizePage("video", raw).description).toHaveLength(1000);
    expect(sanitizePage("video", raw, { keepLongText: true }).description).toHaveLength(1500);
    const huge = { ...raw, description: long(25000) };
    expect(sanitizePage("video", huge, { keepLongText: true }).description).toHaveLength(
      LIMITS.paste,
    );
  });

  it("blocks saving a page with text over its limit, after its other problems", () => {
    const page = { ...PAGE_DEFAULTS.links(), bio: long(310) };
    const errors = validatePage("links", page);
    expect(Object.keys(errors)[0]).toBe("title");
    expect(errors.bio).toBe("Shorten by 10 characters");
  });
});
