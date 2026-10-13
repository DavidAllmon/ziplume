import { normalizeHex } from "@/lib/color/contrast";
import { isLogoIcon } from "@/lib/qr/logo-icons";
import { QR_TYPES } from "@/lib/qr/qr-types";
import {
  CORNER_DOT_STYLE_IDS,
  CORNER_STYLE_IDS,
  DOT_STYLE_IDS,
  FRAME_STYLE_IDS,
  GRADIENT_TYPE_IDS,
  type ContentValues,
  type QrTypeId,
} from "@/lib/qr/types";

import { DEFAULT_DESIGN, MAX_FRAME_TEXT, MAX_LOGO_SIZE, MIN_LOGO_SIZE } from "./defaults";
import type { DesignState } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pick = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

const color = (value: unknown, fallback: string): string =>
  (typeof value === "string" && normalizeHex(value)) || fallback;

const optionalColor = (value: unknown): string | null =>
  typeof value === "string" ? normalizeHex(value) : null;

/**
 * Turns a stored design (database, template or older saved settings) into a valid
 * DesignState, field by field, so a missing or malformed value falls back to the default
 * instead of breaking the renderer.
 */
export function sanitizeDesign(raw: unknown): DesignState {
  const d = isObject(raw) ? raw : {};
  const D = DEFAULT_DESIGN;
  const logoSize = typeof d.logoSize === "number" ? d.logoSize : D.logoSize;
  const angle =
    typeof d.gradientAngle === "number" && Number.isFinite(d.gradientAngle)
      ? d.gradientAngle
      : D.gradientAngle;
  return {
    fgColor: color(d.fgColor, D.fgColor),
    bgColor: color(d.bgColor, D.bgColor),
    transparent: typeof d.transparent === "boolean" ? d.transparent : D.transparent,
    gradientType: pick(d.gradientType, GRADIENT_TYPE_IDS, D.gradientType),
    gradientColor: color(d.gradientColor, D.gradientColor),
    gradientAngle: ((Math.round(angle) % 360) + 360) % 360,
    cornerColor: optionalColor(d.cornerColor),
    cornerDotColor: optionalColor(d.cornerDotColor),
    dotStyle: pick(d.dotStyle, DOT_STYLE_IDS, D.dotStyle),
    cornerStyle: pick(d.cornerStyle, CORNER_STYLE_IDS, D.cornerStyle),
    cornerDotStyle: pick(d.cornerDotStyle, CORNER_DOT_STYLE_IDS, D.cornerDotStyle),
    errorCorrection: pick(d.errorCorrection, ["L", "M", "Q", "H"] as const, D.errorCorrection),
    logo: typeof d.logo === "string" && d.logo.startsWith("data:image/") ? d.logo : null,
    logoIcon: typeof d.logoIcon === "string" && isLogoIcon(d.logoIcon) ? d.logoIcon : null,
    logoSize: Math.min(MAX_LOGO_SIZE, Math.max(MIN_LOGO_SIZE, logoSize)),
    logoClearSpace: typeof d.logoClearSpace === "boolean" ? d.logoClearSpace : D.logoClearSpace,
    frame: pick(d.frame, FRAME_STYLE_IDS, D.frame),
    frameText: typeof d.frameText === "string" ? cleanFrameText(d.frameText) : D.frameText,
    frameColor: color(d.frameColor, D.frameColor),
  };
}

/** One line of printable text, trimmed to the frame's limit. */
export function cleanFrameText(text: string): string {
  return text.replace(/\p{Cc}/gu, " ").slice(0, MAX_FRAME_TEXT);
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
