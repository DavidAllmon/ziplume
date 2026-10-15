import { describe, expect, it } from "vitest";

import { PAGE_TYPE_IDS } from "@/lib/qr/types";

import { legacyLook, sanitizeLook, themeLook, THEME_IDS, THEMES, TYPE_THEME } from "./look";
import { mediaPaths, sanitizePage } from "./sanitize";
import { PAGE_DEFAULTS } from "./types";

const UID = "11111111-1111-4111-8111-111111111111";

describe("themes", () => {
  it("are the spec's nine, and each type starts on its own", () => {
    expect(THEME_IDS).toEqual([
      "ziplume",
      "paper",
      "midnight",
      "ocean",
      "sunset",
      "grape",
      "forest",
      "blush",
      "sand",
    ]);
    expect(THEMES.ocean.look.wallpaper).toEqual({
      kind: "gradient",
      from: "#095E77",
      to: "#0A1330",
      direction: "diagonal",
    });
    expect(THEMES.sand.look.button).toEqual({
      shape: "square",
      style: "outline",
      shadow: "hard",
      color: "#7C2D12",
      text: "auto",
    });
    expect(TYPE_THEME).toMatchObject({
      links: "ziplume",
      app: "ziplume",
      vcard: "paper",
      business: "paper",
      feedback: "paper",
      pdf: "paper",
      menu: "sand",
      coupon: "sunset",
      event: "grape",
      images: "midnight",
      video: "midnight",
      audio: "ocean",
    });
    for (const type of PAGE_TYPE_IDS) {
      const page = PAGE_DEFAULTS[type]();
      expect(page.look.theme, type).toBe(TYPE_THEME[type]);
      expect(page.color, type).toBe(page.look.button.color);
    }
  });
});

describe("sanitizeLook", () => {
  const fallback = themeLook("paper", "links");

  it("keeps a valid look", () => {
    const look = {
      ...themeLook("ocean", "links"),
      header: "hero" as const,
      font: "elegant" as const,
    };
    expect(sanitizeLook(look, fallback)).toEqual(look);
  });

  it("falls back field by field, starting from the look's own theme", () => {
    const look = sanitizeLook(
      {
        theme: "grape",
        wallpaper: { kind: "image", image: { path: "../../etc/passwd" }, dim: 300, color: "nope" },
        header: "sideways",
        font: "comic",
        text: "#12",
        button: { shape: "blob", style: "solid", shadow: "hard", color: "#abc", text: "auto" },
        socials: "bottom",
      },
      fallback,
    );
    expect(look.theme).toBe("grape");
    expect(look.wallpaper).toEqual(THEMES.grape.look.wallpaper);
    expect(look.header).toBe("classic");
    expect(look.font).toBe(THEMES.grape.look.font);
    expect(look.text).toBe("auto");
    expect(look.button).toEqual({
      shape: THEMES.grape.look.button.shape,
      style: "solid",
      shadow: "hard",
      color: "#AABBCC",
      text: "auto",
    });
    expect(look.socials).toBe("bottom");
  });

  it("keeps an image wallpaper from the owner's folder, with dim clamped to 0–80", () => {
    const image = { path: `${UID}/wall.jpg`, name: "wall.jpg", type: "image/jpeg", size: 9 };
    const look = sanitizeLook(
      { ...fallback, wallpaper: { kind: "image", image, dim: 95, color: "#334455" } },
      fallback,
    );
    expect(look.wallpaper).toEqual({ kind: "image", image, dim: 80, color: "#334455" });
  });

  it("uses the fallback for an unknown theme or garbage", () => {
    expect(sanitizeLook({ theme: "neon" }, fallback)).toEqual(fallback);
    expect(sanitizeLook("pink", fallback)).toEqual(fallback);
  });
});

describe("pages saved before looks", () => {
  it("are Paper, with their own color on the buttons and socials where they were", () => {
    const links = sanitizePage("links", { title: "Old", color: "#4F46E5" });
    expect(links.look).toMatchObject({
      theme: "paper",
      header: "classic",
      socials: "top",
      button: { color: "#4F46E5" },
    });
    expect(links.color).toBe("#4F46E5");
    expect(sanitizePage("vcard", { firstName: "Pat" }).look.socials).toBe("bottom");
    expect(sanitizePage("business", { name: "Cafe" }).look.socials).toBe("bottom");
  });

  it("keep a Business cover photo by drawing it as the Hero", () => {
    const cover = { path: `${UID}/cover.jpg`, name: "cover.jpg", type: "image/jpeg", size: 9 };
    expect(legacyLook("business", { cover }).header).toBe("hero");
    expect(legacyLook("business", {}).header).toBe("classic");
  });

  it("get the type's theme instead when an API request leaves look out", () => {
    const page = sanitizePage("coupon", { offer: "20%" }, { missingLook: "theme" });
    expect(page.look.theme).toBe("sunset");
    expect(page.color).toBe(page.look.button.color);
  });

  it("keep color equal to the button color", () => {
    const paper = themeLook("paper", "links");
    const page = sanitizePage("links", {
      color: "#000000",
      look: { ...paper, button: { ...paper.button, color: "#BE123C" } },
    });
    expect(page.color).toBe("#BE123C");
  });

  it("carry the wallpaper image in the page's files", () => {
    const image = { path: `${UID}/wall.jpg`, name: "wall.jpg", type: "image/jpeg", size: 9 };
    const page = sanitizePage("links", {
      look: {
        ...themeLook("paper", "links"),
        wallpaper: { kind: "image", image, dim: 20, color: "#334455" },
      },
    });
    expect(mediaPaths(page)).toContain(`${UID}/wall.jpg`);
  });
});
