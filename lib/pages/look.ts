import { normalizeHex } from "@/lib/color/contrast";
import type { PageTypeId } from "@/lib/qr/types";

import { sanitizeMedia } from "./media";
import type { Media } from "./types";

// How a hosted page looks: its theme, wallpaper, header, font and buttons (spec 6.6).

export const THEME_IDS = [
  "ziplume",
  "paper",
  "midnight",
  "ocean",
  "sunset",
  "grape",
  "forest",
  "blush",
  "sand",
] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const FONT_IDS = ["clean", "bold", "elegant", "friendly", "modern", "typewriter"] as const;
export type FontId = (typeof FONT_IDS)[number];

export type Wallpaper =
  | { kind: "solid"; color: string }
  | { kind: "gradient"; from: string; to: string; direction: "down" | "diagonal" | "across" }
  | { kind: "image"; image: Media; dim: number; color: string };

export interface PageLook {
  theme: ThemeId;
  wallpaper: Wallpaper;
  header: "classic" | "hero";
  shape: "circle" | "rounded";
  font: FontId;
  /** "auto" or a hex color. */
  text: string;
  button: {
    shape: "square" | "rounded" | "pill";
    style: "solid" | "outline" | "soft";
    shadow: "none" | "soft" | "hard";
    color: string;
    /** "auto" or a hex color. */
    text: string;
  };
  socials: "top" | "bottom";
}

type ThemeLook = Pick<PageLook, "wallpaper" | "font" | "text" | "button">;

const solid = (color: string): Wallpaper => ({ kind: "solid", color });
const gradient = (
  from: string,
  to: string,
  direction: "down" | "diagonal" | "across",
): Wallpaper => ({ kind: "gradient", from, to, direction });
const button = (
  shape: PageLook["button"]["shape"],
  style: PageLook["button"]["style"],
  color: string,
  shadow: PageLook["button"]["shadow"] = "none",
): PageLook["button"] => ({ shape, style, shadow, color, text: "auto" });

/** Spec 6.2. */
export const THEMES: Record<ThemeId, { label: string; look: ThemeLook }> = {
  ziplume: {
    label: "Ziplume",
    look: {
      wallpaper: gradient("#0A1330", "#16245A", "down"),
      font: "bold",
      text: "auto",
      button: button("pill", "solid", "#7FE9FF"),
    },
  },
  paper: {
    label: "Paper",
    look: {
      wallpaper: solid("#F6F5F1"),
      font: "clean",
      text: "auto",
      button: button("rounded", "solid", "#0F172A"),
    },
  },
  midnight: {
    label: "Midnight",
    look: {
      wallpaper: solid("#070B1A"),
      font: "clean",
      text: "auto",
      button: button("rounded", "outline", "#E6EEFA"),
    },
  },
  ocean: {
    label: "Ocean",
    look: {
      wallpaper: gradient("#095E77", "#0A1330", "diagonal"),
      font: "clean",
      text: "auto",
      button: button("pill", "soft", "#FFFFFF"),
    },
  },
  sunset: {
    label: "Sunset",
    look: {
      wallpaper: gradient("#C2410C", "#881337", "diagonal"),
      font: "bold",
      text: "auto",
      button: button("pill", "solid", "#FFFFFF"),
    },
  },
  grape: {
    label: "Grape",
    look: {
      wallpaper: gradient("#7C3AED", "#3B0764", "down"),
      font: "friendly",
      text: "auto",
      button: button("rounded", "solid", "#F5F3FF"),
    },
  },
  forest: {
    label: "Forest",
    look: {
      wallpaper: solid("#14532D"),
      font: "elegant",
      text: "auto",
      button: button("rounded", "solid", "#F5F0E1"),
    },
  },
  blush: {
    label: "Blush",
    look: {
      wallpaper: solid("#FCE7F3"),
      font: "friendly",
      text: "auto",
      button: button("pill", "solid", "#831843"),
    },
  },
  sand: {
    label: "Sand",
    look: {
      wallpaper: solid("#F3E8D8"),
      font: "elegant",
      text: "auto",
      button: button("square", "outline", "#7C2D12", "hard"),
    },
  },
};

/** The theme a new page of each type starts on (spec 6.2). */
export const TYPE_THEME: Record<PageTypeId, ThemeId> = {
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
};

/** Where a type's social icons sit by default: Link list under the header, the others at the end. */
const socialsFor = (type: PageTypeId): PageLook["socials"] => (type === "links" ? "top" : "bottom");

/** A theme's whole look for a type: Classic header, round image, the type's social position. */
export function themeLook(theme: ThemeId, type: PageTypeId): PageLook {
  return {
    theme,
    ...structuredClone(THEMES[theme].look),
    header: "classic",
    shape: "circle",
    socials: socialsFor(type),
  };
}

/** A page saved before looks existed: Paper, with its own color on the buttons (spec 6.9). */
export function legacyLook(type: PageTypeId, raw: Record<string, unknown>): PageLook {
  const look = themeLook("paper", type);
  const color = typeof raw.color === "string" ? normalizeHex(raw.color) : null;
  if (color) look.button.color = color;
  // Classic shows only a Business's logo; keep its cover photo by drawing it as the Hero.
  if (type === "business" && sanitizeMedia(raw.cover)) look.header = "hero";
  return look;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const oneOf = <T extends string>(values: readonly T[], value: unknown, fallback: T): T =>
  typeof value === "string" && (values as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
const hex = (value: unknown, fallback: string) =>
  (typeof value === "string" && normalizeHex(value)) || fallback;
const hexOrAuto = (value: unknown) =>
  value === "auto" ? "auto" : (typeof value === "string" && normalizeHex(value)) || "auto";

function sanitizeWallpaper(raw: unknown, fallback: Wallpaper): Wallpaper {
  if (!isObject(raw)) return fallback;
  if (raw.kind === "solid") {
    const color = typeof raw.color === "string" ? normalizeHex(raw.color) : null;
    return color ? { kind: "solid", color } : fallback;
  }
  if (raw.kind === "gradient") {
    const from = typeof raw.from === "string" ? normalizeHex(raw.from) : null;
    const to = typeof raw.to === "string" ? normalizeHex(raw.to) : null;
    if (!from || !to) return fallback;
    const directions = ["down", "diagonal", "across"] as const;
    return { kind: "gradient", from, to, direction: oneOf(directions, raw.direction, "down") };
  }
  if (raw.kind === "image") {
    const image = sanitizeMedia(raw.image);
    if (!image) return fallback;
    const dim = typeof raw.dim === "number" && Number.isFinite(raw.dim) ? Math.round(raw.dim) : 30;
    return {
      kind: "image",
      image,
      dim: Math.min(80, Math.max(0, dim)),
      color: hex(raw.color, "#0F172A"),
    };
  }
  return fallback;
}

/** A valid look from stored or edited JSON: each bad field falls back to the look's own theme. */
export function sanitizeLook(raw: unknown, fallback: PageLook): PageLook {
  if (!isObject(raw) || !(THEME_IDS as readonly string[]).includes(raw.theme as string)) {
    return fallback;
  }
  const theme = raw.theme as ThemeId;
  const base = THEMES[theme].look;
  const b = isObject(raw.button) ? raw.button : {};
  return {
    theme,
    wallpaper: sanitizeWallpaper(raw.wallpaper, structuredClone(base.wallpaper)),
    header: oneOf(["classic", "hero"] as const, raw.header, "classic"),
    shape: oneOf(["circle", "rounded"] as const, raw.shape, fallback.shape),
    font: oneOf(FONT_IDS, raw.font, base.font),
    text: hexOrAuto(raw.text),
    button: {
      shape: oneOf(["square", "rounded", "pill"] as const, b.shape, base.button.shape),
      style: oneOf(["solid", "outline", "soft"] as const, b.style, base.button.style),
      shadow: oneOf(["none", "soft", "hard"] as const, b.shadow, base.button.shadow),
      color: hex(b.color, base.button.color),
      text: hexOrAuto(b.text),
    },
    socials: oneOf(["top", "bottom"] as const, raw.socials, fallback.socials),
  };
}

/** Sets the page's button color, keeping `color` (read by API users) the same. */
export function withButtonColor<T extends { color: string; look: PageLook }>(
  page: T,
  color: string,
): T {
  return { ...page, color, look: { ...page.look, button: { ...page.look.button, color } } };
}
