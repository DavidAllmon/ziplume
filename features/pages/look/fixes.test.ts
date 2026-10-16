import { describe, expect, it } from "vitest";

import { THEME_IDS, themeLook, type PageLook } from "@/lib/pages/look";

import { lookFixes } from "./fixes";
import { lookChecks } from "./resolve";

const UID = "11111111-1111-4111-8111-111111111111";
const IMAGE = { path: `${UID}/w.jpg`, name: "w.jpg", type: "image/jpeg", size: 1 };

/** Looks with any colors at all, from a fixed seed so a failure repeats. */
function randomLooks(count: number): PageLook[] {
  let seed = 7;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const hex = () =>
    `#${Math.floor(next() * 0x1000000)
      .toString(16)
      .padStart(6, "0")
      .toUpperCase()}`;
  const one = <T>(values: readonly T[]) => values[Math.floor(next() * values.length)]!;
  return Array.from({ length: count }, () => {
    const base = themeLook(one(THEME_IDS), "links");
    const kind = one(["solid", "gradient", "image"] as const);
    const wallpaper: PageLook["wallpaper"] =
      kind === "solid"
        ? { kind, color: hex() }
        : kind === "gradient"
          ? { kind, from: hex(), to: hex(), direction: "down" }
          : { kind, image: IMAGE, dim: 5 * Math.floor(next() * 17), color: hex() };
    return {
      ...base,
      wallpaper,
      text: next() < 0.5 ? "auto" : hex(),
      button: {
        ...base.button,
        style: one(["solid", "outline", "soft"] as const),
        color: hex(),
        text: next() < 0.5 ? "auto" : hex(),
      },
    };
  });
}

const ids = (look: PageLook) => lookChecks(look).map((check) => check.id);

describe("lookFixes", () => {
  it("offers a fix for every warning that clears it, whatever the colors", () => {
    for (const look of randomLooks(300)) {
      const fixes = lookFixes(look);
      expect(fixes.map((fix) => fix.id)).toEqual(ids(look));
      for (const fix of fixes) {
        expect(ids(fix.look), `${fix.id} on ${JSON.stringify(look)}`).not.toContain(fix.id);
      }
    }
  });

  it("ends with no warnings when each one left is fixed in turn", () => {
    for (const look of randomLooks(300)) {
      let fixed = look;
      for (let round = 0; round < 3 && ids(fixed).length > 0; round++) {
        fixed = lookFixes(fixed)[0]!.look;
      }
      expect(ids(fixed), JSON.stringify(look)).toEqual([]);
    }
  });

  it("puts text that Auto can't make readable under the wallpaper, with a wallpaper fix", () => {
    const look = themeLook("paper", "links");
    look.wallpaper = { kind: "solid", color: "#8B5CF6" };
    const [fix] = lookFixes(look);
    expect(fix).toMatchObject({ id: "text", at: "wallpaper", label: "Adjust the wallpaper" });
    expect(ids(fix!.look)).toEqual([]);
    expect(fix!.look.text).toBe("auto");
  });

  it("darkens a photo that text can't be read on", () => {
    const look: PageLook = {
      ...themeLook("paper", "links"),
      wallpaper: { kind: "image", image: IMAGE, dim: 0, color: "#8B5CF6" },
    };
    const [fix] = lookFixes(look);
    expect(fix).toMatchObject({ id: "text", at: "wallpaper" });
    expect(fix!.look.wallpaper).toMatchObject({ kind: "image", image: IMAGE });
    expect((fix!.look.wallpaper as { dim: number }).dim).toBeGreaterThan(0);
  });

  it("uses Auto where that's enough, under the custom color", () => {
    const look = themeLook("paper", "links");
    look.text = "#DDDDDD";
    look.button.color = "#EEEEEE";
    look.button.text = "#F5F5F5";
    expect(lookFixes(look).map(({ id, at, label }) => ({ id, at, label }))).toEqual([
      { id: "text", at: "text", label: "Use Auto" },
      { id: "buttonText", at: "buttonText", label: "Use Auto" },
      { id: "button", at: "buttonColor", label: "Make buttons stand out" },
    ]);
  });

  it("moves a mid-tone button's color when Auto button text can't read on it", () => {
    const look = themeLook("paper", "links");
    look.button.color = "#6366F1";
    expect(ids(look)).toEqual(["buttonText"]);
    const [fix] = lookFixes(look);
    expect(fix).toMatchObject({ at: "buttonColor", label: "Adjust the button color" });
    expect(ids(fix!.look)).toEqual([]);
  });

  it("has nothing to fix on a look that reads", () => {
    expect(lookFixes(themeLook("ocean", "links"))).toEqual([]);
  });
});
