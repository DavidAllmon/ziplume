import { normalizeHex } from "@/lib/color/contrast";
import { QR_TYPES } from "@/lib/qr/qr-types";
import type { ContentValues, QrTypeId } from "@/lib/qr/types";

import { DEFAULT_DESIGN, MAX_LOGO_SIZE, MIN_LOGO_SIZE } from "./defaults";
import type { DesignState } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pick = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

/**
 * Turns a design read from the database into a valid DesignState, field by field, so a
 * missing or malformed value falls back to the default instead of breaking the renderer.
 */
export function sanitizeDesign(raw: unknown): DesignState {
  const d = isObject(raw) ? raw : {};
  const logoSize = typeof d.logoSize === "number" ? d.logoSize : DEFAULT_DESIGN.logoSize;
  return {
    fgColor: (typeof d.fgColor === "string" && normalizeHex(d.fgColor)) || DEFAULT_DESIGN.fgColor,
    bgColor: (typeof d.bgColor === "string" && normalizeHex(d.bgColor)) || DEFAULT_DESIGN.bgColor,
    transparent: typeof d.transparent === "boolean" ? d.transparent : DEFAULT_DESIGN.transparent,
    dotStyle: pick(
      d.dotStyle,
      ["square", "rounded", "dots", "classy"] as const,
      DEFAULT_DESIGN.dotStyle,
    ),
    cornerStyle: pick(
      d.cornerStyle,
      ["square", "rounded", "dot"] as const,
      DEFAULT_DESIGN.cornerStyle,
    ),
    errorCorrection: pick(
      d.errorCorrection,
      ["L", "M", "Q", "H"] as const,
      DEFAULT_DESIGN.errorCorrection,
    ),
    logo: typeof d.logo === "string" && d.logo.startsWith("data:image/") ? d.logo : null,
    logoSize: Math.min(MAX_LOGO_SIZE, Math.max(MIN_LOGO_SIZE, logoSize)),
    logoClearSpace:
      typeof d.logoClearSpace === "boolean" ? d.logoClearSpace : DEFAULT_DESIGN.logoClearSpace,
  };
}

/** Fills in any missing form fields for a type, keeping only fields the type defines. */
export function sanitizeContent<K extends QrTypeId>(type: K, raw: unknown): ContentValues[K] {
  const defaults = QR_TYPES[type].defaults as unknown as Record<string, string | boolean>;
  const source = isObject(raw) ? raw : {};
  const result: Record<string, string | boolean> = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = source[key];
    result[key] = typeof value === typeof fallback ? (value as string | boolean) : fallback;
  }
  return result as unknown as ContentValues[K];
}
