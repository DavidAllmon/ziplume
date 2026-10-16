import { contrastRatio } from "@/lib/color/contrast";
import type { PageLook } from "@/lib/pages/look";
import { mediaUrl } from "@/lib/pages/urls";

import { FONTS } from "./fonts";

// A look turned into the colors a page actually uses, with the readability guard (spec 6.1, 6.5).

export const WHITE = "#FFFFFF";
export const INK = "#0F172A";

const channels = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** `a` blended toward `b` by `t` (0 = a, 1 = b), as hex. */
export function mix(a: string, b: string, t: number): string {
  const A = channels(a);
  const B = channels(b);
  const parts = A.map((v, i) =>
    Math.round(v + (B[i]! - v) * t)
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${parts.join("")}`.toUpperCase();
}

const worst = (color: string, surfaces: string[]) =>
  Math.min(...surfaces.map((surface) => contrastRatio(color, surface)));

/** White or ink, whichever reads better on every one of the surfaces. */
const auto = (surfaces: string[]) => (worst(WHITE, surfaces) >= worst(INK, surfaces) ? WHITE : INK);

/** The colors the wallpaper shows: both gradient ends; an image darkened, read by its fallback. */
function wallpaperColors(look: PageLook): string[] {
  const w = look.wallpaper;
  if (w.kind === "solid") return [w.color];
  if (w.kind === "gradient") return [w.from, w.to];
  return [mix(w.color, "#000000", w.dim / 100)];
}

const DIRECTIONS = { down: "180deg", diagonal: "135deg", across: "90deg" };

function background(look: PageLook): string {
  const w = look.wallpaper;
  if (w.kind === "solid") return w.color;
  if (w.kind === "gradient")
    return `linear-gradient(${DIRECTIONS[w.direction]}, ${w.from}, ${w.to})`;
  const shade = `rgba(0, 0, 0, ${w.dim / 100})`;
  return `linear-gradient(${shade}, ${shade}), url("${mediaUrl(w.image.path)}") center / cover no-repeat, ${w.color}`;
}

const CARD_RADIUS = { square: "8px", rounded: "16px", pill: "24px" };
const BUTTON_RADIUS = { square: "8px", rounded: "16px", pill: "9999px" };

export interface ResolvedLook {
  /** CSS variables for the page's root. */
  vars: Record<string, string>;
  /** The wallpaper as a CSS background. */
  background: string;
  /** The wallpaper's main color, for the browser's theme color. */
  themeColor: string;
  colorScheme: "light" | "dark";
  text: string;
  muted: string;
  /** The card's color over each wallpaper color. */
  card: string[];
  /** The notes and chips' color over each card and each wallpaper color. */
  chip: string[];
  accent: string;
  /** What's behind a button's text: its color or tint, or (outline) the wallpaper and cards. */
  buttonBg: string[];
  buttonText: string;
  /** The highlight behind selected text. */
  selection: string;
  /** Form fields' outlines on cards. */
  fieldBorder: string;
}

export function resolveLook(look: PageLook): ResolvedLook {
  const walls = wallpaperColors(look);
  const text = look.text === "auto" ? auto(walls) : look.text;
  const light = auto(walls) === INK;
  // Cards: white at 92% on light wallpapers, white at 8% on dark ones.
  const card = walls.map((wall) => mix(wall, WHITE, light ? 0.92 : 0.08));
  // Notes, chips and icon circles (--surface-2): ink at 6% over light cards; over dark ones,
  // white at 12% while the text still reads on it, otherwise black at 15% (Sunset, Grape).
  // They sit on cards and, like the empty-page notes, straight on the wallpaper.
  const chipBase = [...card, ...walls];
  const lighterChip = chipBase.map((c) => mix(c, WHITE, 0.12));
  const chipTone = light ? "ink" : worst(text, lighterChip) >= 4.5 ? "white" : "black";
  const chip = chipBase.map((c) =>
    chipTone === "ink"
      ? mix(c, INK, 0.06)
      : chipTone === "white"
        ? mix(c, WHITE, 0.12)
        : mix(c, "#000000", 0.15),
  );
  const surfaces = [...walls, ...card, ...chip];
  // Muted text: as soft as it can be while still reading at 4.5:1 on every surface.
  let muted = text;
  for (let t = 0.6; t <= 0.96; t += 0.04) {
    const candidate = mix(walls[0]!, text, t);
    if (worst(candidate, surfaces) >= 4.5) {
      muted = candidate;
      break;
    }
  }
  const b = look.button;
  // What's behind a button's text. Buttons sit on the wallpaper and inside cards: a soft
  // button is one solid tint (the wallpaper's first color at 16% of the button color), so it
  // reads the same in both; an outline button shows whatever is behind it.
  const soft = mix(walls[0]!, b.color, 0.16);
  const buttonBg =
    b.style === "solid" ? [b.color] : b.style === "soft" ? [soft] : [...walls, ...card];
  // Outline text is the button color while that reads; otherwise white or ink.
  const buttonText =
    b.text !== "auto"
      ? b.text
      : b.style === "outline" && worst(b.color, buttonBg) >= 4.5
        ? b.color
        : auto(buttonBg);
  const accent = worst(b.color, card) >= 3 ? b.color : text;
  // Selected text: the page's text on a highlight that keeps 4.5:1.
  const selection =
    [
      mix(walls[0]!, accent, 0.3),
      mix(walls[0]!, light ? INK : WHITE, 0.2),
      mix(walls[0]!, light ? INK : "#000000", 0.35),
    ].find((color) => contrastRatio(text, color) >= 4.5) ?? walls[0]!;
  // Form fields' outlines on cards: the text color, softened while it keeps 3:1.
  let fieldBorder = text;
  for (let step = 35; step <= 100; step += 5) {
    const candidate = mix(card[0]!, text, step / 100);
    if (worst(candidate, card) >= 3) {
      fieldBorder = candidate;
      break;
    }
  }
  const font = FONTS[look.font];
  const shadow =
    b.shadow === "soft"
      ? "0 6px 18px rgb(0 0 0 / 0.18)"
      : b.shadow === "hard"
        ? `4px 4px 0 ${b.style === "solid" ? text : b.color}`
        : "none";
  const vars: Record<string, string> = {
    // The app's base variables, redefined for this page only (like the navy sidebar), so the
    // visitor's light or dark setting can't reach it.
    "--bg": walls[0]!,
    "--fg": text,
    "--fg-muted": muted,
    "--fg-subtle": muted,
    "--surface": light ? "rgb(255 255 255 / 0.92)" : "rgb(255 255 255 / 0.08)",
    "--surface-2":
      chipTone === "ink"
        ? "rgb(15 23 42 / 0.06)"
        : chipTone === "white"
          ? "rgb(255 255 255 / 0.12)"
          : "rgb(0 0 0 / 0.15)",
    "--border": light ? "rgb(15 23 42 / 0.1)" : "rgb(255 255 255 / 0.12)",
    "--field-border": fieldBorder,
    "--selection": selection,
    "--ring": text,
    "--danger": text,
    "--page-accent": accent,
    "--page-accent-fg": auto([accent]),
    "--pg-radius": CARD_RADIUS[b.shape],
    "--pg-btn-radius": BUTTON_RADIUS[b.shape],
    "--pg-btn-bg": b.style === "solid" ? b.color : b.style === "soft" ? soft : "transparent",
    "--pg-btn-fg": buttonText,
    "--pg-btn-border": b.style === "outline" ? b.color : "transparent",
    "--pg-btn-shadow": shadow,
    "--pg-heading": font.heading,
    "--pg-heading-settings": font.headingSettings,
    "--pg-body": font.body,
  };
  return {
    vars,
    background: background(look),
    themeColor: walls[0]!,
    colorScheme: light ? "light" : "dark",
    text,
    muted,
    card,
    chip,
    accent,
    buttonBg,
    buttonText,
    selection,
    fieldBorder,
  };
}

export interface LookCheck {
  id: "text" | "buttonText" | "button";
  ratio: number;
  needed: number;
}

/** The readability guard (spec 6.1): what fails, with its ratio. */
export function lookChecks(look: PageLook): LookCheck[] {
  const r = resolveLook(look);
  const walls = wallpaperColors(look);
  const checks: LookCheck[] = [
    { id: "text", ratio: worst(r.text, walls), needed: 4.5 },
    { id: "buttonText", ratio: worst(r.buttonText, r.buttonBg), needed: 4.5 },
  ];
  if (look.button.style !== "soft") {
    checks.push({ id: "button", ratio: worst(look.button.color, walls), needed: 3 });
  }
  return checks.filter((check) => check.ratio < check.needed);
}
