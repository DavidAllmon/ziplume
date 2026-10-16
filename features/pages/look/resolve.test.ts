import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/color/contrast";
import { THEME_IDS, themeLook, type PageLook } from "@/lib/pages/look";

import { INK, lookChecks, mix, resolveLook, WHITE } from "./resolve";

const UID = "11111111-1111-4111-8111-111111111111";
const wallpaperEnds = (look: PageLook) =>
  look.wallpaper.kind === "solid"
    ? [look.wallpaper.color]
    : look.wallpaper.kind === "gradient"
      ? [look.wallpaper.from, look.wallpaper.to]
      : [mix(look.wallpaper.color, "#000000", look.wallpaper.dim / 100)];

describe("resolveLook", () => {
  it.each(THEME_IDS)("%s passes the readability guard everywhere", (theme) => {
    const look = themeLook(theme, "links");
    const r = resolveLook(look);
    expect(lookChecks(look)).toEqual([]);
    const surfaces = [...wallpaperEnds(look), ...r.card];
    for (const surface of surfaces) {
      expect(contrastRatio(r.text, surface), `text on ${surface}`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(r.muted, surface), `muted on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
    // Notes, chips and icon circles sit on a slightly stronger tone over the cards.
    for (const chip of r.chip) {
      expect(contrastRatio(r.text, chip), `text on chip ${chip}`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(r.muted, chip), `muted on chip ${chip}`).toBeGreaterThanOrEqual(4.5);
    }
    // Buttons sit on the wallpaper and inside cards.
    for (const bg of r.buttonBg) {
      expect(contrastRatio(r.buttonText, bg)).toBeGreaterThanOrEqual(4.5);
    }
    if (look.button.style === "outline") {
      // An outline button's text is checked on every wallpaper color and card.
      expect(r.buttonBg.length).toBe(surfaces.length);
    }
    // Selected text, and the outlines of form fields on cards.
    expect(contrastRatio(r.text, r.selection), "selection").toBeGreaterThanOrEqual(4.5);
    for (const card of r.card) {
      expect(contrastRatio(r.fieldBorder, card), "field border").toBeGreaterThanOrEqual(3);
    }
    for (const card of r.card) {
      expect(contrastRatio(r.accent, card)).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps muted text readable on a note placed straight on the wallpaper", () => {
    const r = resolveLook(themeLook("sand", "menu"));
    const noteOnWallpaper = mix("#F3E8D8", INK, 0.06);
    expect(contrastRatio(r.muted, noteOnWallpaper)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps an outline button's text readable when its color doesn't read on the page", () => {
    const look = themeLook("midnight", "video");
    look.button.color = "#0A1330";
    const r = resolveLook(look);
    for (const bg of r.buttonBg) {
      expect(contrastRatio(r.buttonText, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("draws soft buttons in one solid tint, so they read the same inside cards", () => {
    const r = resolveLook(themeLook("ocean", "audio"));
    expect(r.vars["--pg-btn-bg"]).toMatch(/^#[0-9A-F]{6}$/);
    expect(r.buttonBg).toEqual([r.vars["--pg-btn-bg"]]);
  });

  it("picks white or ink text by the wallpaper, worst end first", () => {
    expect(resolveLook(themeLook("paper", "links")).text).toBe(INK);
    expect(resolveLook(themeLook("ocean", "links")).text).toBe(WHITE);
    expect(resolveLook(themeLook("ocean", "links")).colorScheme).toBe("dark");
  });

  it("darkens an image wallpaper, and reads by its fallback color while it loads", () => {
    const image = { path: `${UID}/w.jpg`, name: "w.jpg", type: "image/jpeg", size: 1 };
    const look: PageLook = {
      ...themeLook("paper", "links"),
      wallpaper: { kind: "image", image, dim: 60, color: "#F3E8D8" },
    };
    const r = resolveLook(look);
    expect(r.background).toContain("rgba(0, 0, 0, 0.6)");
    expect(r.background).toContain("#F3E8D8");
    expect(r.text).toBe(WHITE);
  });

  it("uses the text color as the accent when the button color is too faint on cards", () => {
    const look = themeLook("paper", "links");
    look.button.color = "#F6F5F1";
    expect(resolveLook(look).accent).toBe(resolveLook(look).text);
  });

  it("flags custom colors that are hard to read", () => {
    const look = themeLook("paper", "links");
    look.text = "#DDDDDD";
    look.button.color = "#EEEEEE";
    look.button.text = "#FFFFFF";
    expect(
      lookChecks(look)
        .map((c) => c.id)
        .sort(),
    ).toEqual(["button", "buttonText", "text"]);
  });
});
