// Shared geometry for the Ziplume mark (64×64 viewBox): viewfinder corners around a "Z" whose
// diagonal is a scan beam. Kept dependency-free so scripts/build-brand-assets.mjs can import it
// with Node's type stripping.

/** Full size: the corners, the Z's two bars, and its diagonal (the beam). */
export const MARK = {
  corners:
    "M8 20V12a4 4 0 0 1 4-4h8M44 8h8a4 4 0 0 1 4 4v8M8 44v8a4 4 0 0 0 4 4h8M56 44v8a4 4 0 0 1-4 4h-8",
  bars: "M21 22H43M21 42H43",
  beam: "M43 22 21 42",
} as const;

/** On the app-icon tile the mark sits a little smaller, inside the tile's padding. */
export const TILE_MARK = {
  corners:
    "M12 22v-6a4 4 0 0 1 4-4h6M42 12h6a4 4 0 0 1 4 4v6M12 42v6a4 4 0 0 0 4 4h6M52 42v6a4 4 0 0 1-4 4h-6",
  bars: "M23 24H41M23 40H41",
  beam: "M41 24 23 40",
} as const;

/** 24 px and under: no corners and thicker strokes, so it stays legible. */
export const SMALL_MARK = { bars: "M18 20H46M18 44H46", beam: "M46 20 18 44" } as const;

export const BRAND = {
  navy: "#0A1330",
  film: "#070B1A",
  scan: "#5CE1FF",
  white: "#FFFFFF",
  light: { corners: "#45506A", bars: "#0A1330", beam: "#0B9CC4", glow: "#5CE1FF" },
  dark: { corners: "#A9B6CC", bars: "#E6EEFA", beam: "#5CE1FF", glow: "#5CE1FF" },
  tile: { corners: "#7C8AA8", bars: "#FFFFFF", beam: "#5CE1FF" },
} as const;

export type MarkVariant = "light" | "dark" | "tile" | "small" | "bleed";

const line = (d: string, color: string, width: number, extra = "") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${extra}/>`;

/** The mark as a standalone SVG: plain on light or dark, on its navy tile, small, or full-bleed. */
export function markSvg(variant: MarkVariant = "light"): string {
  const open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">';
  if (variant === "light" || variant === "dark") {
    const c = BRAND[variant];
    const glow = variant === "light" ? 0.4 : 0.25;
    return `${open}${line(MARK.corners, c.corners, 4)}${line(MARK.bars, c.bars, 5.5)}${line(MARK.beam, c.glow, 12, ` opacity="${glow}"`)}${line(MARK.beam, c.beam, 5.5)}</svg>`;
  }
  if (variant === "small") {
    return `${open}<rect width="64" height="64" rx="14" fill="${BRAND.navy}"/>${line(SMALL_MARK.bars, BRAND.white, 8)}${line(SMALL_MARK.beam, BRAND.scan, 8)}</svg>`;
  }
  const t = BRAND.tile;
  const mark = `${line(TILE_MARK.corners, t.corners, 3.5)}${line(TILE_MARK.bars, t.bars, 5)}${line(TILE_MARK.beam, t.beam, 10, ' opacity="0.25"')}${line(TILE_MARK.beam, t.beam, 5)}`;
  // "bleed" fills the whole square (maskable and Apple icons); the mark stays in the safe zone.
  return variant === "tile"
    ? `${open}<rect width="64" height="64" rx="14" fill="${BRAND.navy}"/>${mark}</svg>`
    : `${open}<rect width="64" height="64" fill="${BRAND.navy}"/><g transform="translate(6.4 6.4) scale(0.8)">${mark}</g></svg>`;
}
