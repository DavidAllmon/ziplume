// Shared geometry for the QuickQReate "Q-eye" mark (64×64 viewBox).
// Kept dependency-free so scripts/build-brand-assets.mjs can import it with Node's type stripping.

/**
 * The finder ring as a filled shape, open at the bottom right where the tail breaks out.
 * The cut edges run parallel to the tail so the gap reads as one clean diagonal channel.
 */
export const RING_PATH =
  "M60.62 49.3A20 20 0 0 0 62 42V22A20 20 0 0 0 42 2H22A20 20 0 0 0 2 22v20a20 20 0 0 0 20 20h20a20 20 0 0 0 7.3-1.38L42.67 53.98A12 12 0 0 1 42 54H22a12 12 0 0 1-12-12V22a12 12 0 0 1 12-12h20a12 12 0 0 1 12 12v20a12 12 0 0 1-.02.67Z";
export const TAIL_PATH = "M41 41 56.5 56.5";
export const EYE = { x: 21, y: 21, size: 22, radius: 6.5 } as const;

export const BRAND = {
  indigo: "#4F46E5",
  lime: "#A3E635",
  ink: "#0F172A",
  paper: "#F8FAFC",
} as const;

interface MarkSvgOptions {
  /** "tile" = white mark on a rounded indigo tile; "bleed" = full-bleed square (maskable/apple). */
  background?: "none" | "tile" | "bleed";
  /** Ring/eye color when there is no background. */
  ink?: string;
  /** Mark scale inside a background (1 = edge to edge). */
  scale?: number;
}

export function markSvg({
  background = "none",
  ink = BRAND.indigo,
  scale = 0.72,
}: MarkSvgOptions = {}) {
  const color = background === "none" ? ink : "#FFFFFF";
  const shapes = [
    `<path d="${RING_PATH}" fill="${color}"/>`,
    `<rect x="${EYE.x}" y="${EYE.y}" width="${EYE.size}" height="${EYE.size}" rx="${EYE.radius}" fill="${color}"/>`,
    `<path d="${TAIL_PATH}" stroke="${BRAND.lime}" stroke-width="8" stroke-linecap="round"/>`,
  ].join("");
  if (background === "none") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${shapes}</svg>`;
  }
  const offset = (64 - 64 * scale) / 2;
  const rx = background === "tile" ? 16 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${rx}" fill="${BRAND.indigo}"/><g transform="translate(${offset} ${offset}) scale(${scale})">${shapes}</g></svg>`;
}
