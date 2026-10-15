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
  accent: string;
  /** What's behind a button's text: its color, or the wallpaper for outline buttons. */
  buttonBg: string[];
  buttonText: string;
}

export function resolveLook(look: PageLook): ResolvedLook {
  const walls = wallpaperColors(look);
  const text = look.text === "auto" ? auto(walls) : look.text;
  const light = auto(walls) === INK;
  // Cards: white at 92% on light wallpapers, white at 8% on dark ones.
  const card = walls.map((wall) => mix(wall, WHITE, light ? 0.92 : 0.08));
  const surfaces = [...walls, ...card];
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
  const buttonBg =
    b.style === "solid"
      ? [b.color]
      : b.style === "soft"
        ? walls.map((wall) => mix(wall, b.color, 0.16))
        : walls;
  const buttonText = b.text !== "auto" ? b.text : b.style === "outline" ? b.color : auto(buttonBg);
  const accent = worst(b.color, card) >= 3 ? b.color : text;
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
    "--surface-2": light ? "rgb(15 23 42 / 0.06)" : "rgb(255 255 255 / 0.12)",
    "--border": light ? "rgb(15 23 42 / 0.1)" : "rgb(255 255 255 / 0.12)",
    "--field-border": light ? "rgb(15 23 42 / 0.45)" : "rgb(255 255 255 / 0.45)",
    "--ring": text,
    "--danger": text,
    "--page-accent": accent,
    "--page-accent-fg": auto([accent]),
    "--pg-radius": CARD_RADIUS[b.shape],
    "--pg-btn-radius": BUTTON_RADIUS[b.shape],
    "--pg-btn-bg":
      b.style === "solid"
        ? b.color
        : b.style === "soft"
          ? `color-mix(in srgb, ${b.color} 16%, transparent)`
          : "transparent",
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
    accent,
    buttonBg,
    buttonText,
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
