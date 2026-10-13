const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidHex(value: string): boolean {
  return HEX.test(value.trim());
}

/** Expands "#abc" to "#AABBCC". Returns null for invalid input. */
export function normalizeHex(value: string): string | null {
  const hex = value.trim();
  if (!HEX.test(hex)) return null;
  const digits =
    hex.length === 4
      ? hex
          .slice(1)
          .split("")
          .map((d) => d + d)
          .join("")
      : hex.slice(1);
  return `#${digits.toUpperCase()}`;
}

function channels(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error(`Invalid hex color: ${hex}`);
  const n = Number.parseInt(normalized.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 2.x relative luminance (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}
