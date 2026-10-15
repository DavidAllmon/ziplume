import { PAGE_DEFAULTS, type PageContentMap } from "@/lib/pages/types";
import { QR_TYPES } from "@/lib/qr/qr-types";
import { PAGE_TYPE_IDS, QR_TYPE_IDS, type ContentValues } from "@/lib/qr/types";

import type { DesignState, ExportSettings, GeneratorState } from "./types";

export const DEFAULT_DESIGN: DesignState = {
  fgColor: "#0A1330",
  bgColor: "#FFFFFF",
  transparent: false,
  gradientType: "none",
  gradientColor: "#0B6E8C",
  gradientAngle: 45,
  cornerColor: null,
  cornerDotColor: null,
  dotStyle: "rounded",
  cornerStyle: "rounded",
  cornerDotStyle: "auto",
  errorCorrection: "M",
  logo: null,
  logoIcon: null,
  logoSize: 0.22,
  logoClearSpace: true,
  frame: "none",
  frameText: "SCAN ME",
  frameColor: "#0A1330",
};

export const MAX_FRAME_TEXT = 28;
/** Longest code name the account stores (matches the save field's maxLength). */
export const MAX_CODE_NAME = 120;
export const FRAME_TEXT_SUGGESTIONS = [
  "SCAN ME",
  "Scan for the menu",
  "Join our Wi-Fi",
  "Scan to pay",
  "Save my contact",
  "Leave a review",
] as const;

export const DEFAULT_EXPORT: ExportSettings = { format: "png", size: 1024 };

export const EXPORT_SIZES = [
  { value: 512, label: "Small", hint: "Web & chat" },
  { value: 1024, label: "Medium", hint: "Slides & docs" },
  { value: 2048, label: "Large", hint: "Posters" },
  { value: 4096, label: "Print", hint: "Large prints" },
] as const;

export const MIN_EXPORT_SIZE = 256;
export const MAX_EXPORT_SIZE = 4096;
export const MIN_LOGO_SIZE = 0.1;
export const MAX_LOGO_SIZE = 0.3;

/** Two-color fills that keep enough contrast on white at both ends. */
export const GRADIENT_PRESETS = [
  { name: "Indigo to berry", from: "#3730A3", to: "#9D174D" },
  { name: "Ocean", from: "#0C4A6E", to: "#0F766E" },
  { name: "Sunset", from: "#9A3412", to: "#86198F" },
  { name: "Forest", from: "#14532D", to: "#3F6212" },
  { name: "Ziplume", from: "#0A1330", to: "#0B6E8C" },
] as const;

export const COLOR_PRESETS = [
  { name: "Navy", fg: "#0A1330", bg: "#FFFFFF" },
  { name: "Indigo", fg: "#3730A3", bg: "#FFFFFF" },
  { name: "Forest", fg: "#14532D", bg: "#F0FDF4" },
  { name: "Ocean", fg: "#0C4A6E", bg: "#F0F9FF" },
  { name: "Berry", fg: "#831843", bg: "#FFF1F2" },
  { name: "Espresso", fg: "#422006", bg: "#FFFBEB" },
] as const;

export function defaultContent(): ContentValues {
  return Object.fromEntries(
    QR_TYPE_IDS.map((id) => [id, { ...QR_TYPES[id].defaults }]),
  ) as unknown as ContentValues;
}

export function defaultPages(): PageContentMap {
  const pages = Object.fromEntries(
    PAGE_TYPE_IDS.map((id) => [id, PAGE_DEFAULTS[id]()]),
  ) as unknown as PageContentMap;
  // Events default to the creator's own time zone (the browser's; UTC while prerendering).
  try {
    pages.event.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    pages.event.timeZone = "UTC";
  }
  return pages;
}

export function initialState(): GeneratorState {
  return {
    activeType: "url",
    content: defaultContent(),
    pages: defaultPages(),
    design: { ...DEFAULT_DESIGN },
    exportSettings: { ...DEFAULT_EXPORT },
    ecBeforeLogo: null,
    name: "",
  };
}
