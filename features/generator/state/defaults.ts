import { QR_TYPES } from "@/lib/qr/qr-types";
import type { ContentValues } from "@/lib/qr/types";

import type { DesignState, ExportSettings, GeneratorState } from "./types";

export const DEFAULT_DESIGN: DesignState = {
  fgColor: "#0F172A",
  bgColor: "#FFFFFF",
  transparent: false,
  dotStyle: "rounded",
  cornerStyle: "rounded",
  errorCorrection: "M",
  logo: null,
  logoSize: 0.22,
  logoClearSpace: true,
};

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

export const COLOR_PRESETS = [
  { name: "Ink", fg: "#0F172A", bg: "#FFFFFF" },
  { name: "Indigo", fg: "#3730A3", bg: "#FFFFFF" },
  { name: "Forest", fg: "#14532D", bg: "#F0FDF4" },
  { name: "Ocean", fg: "#0C4A6E", bg: "#F0F9FF" },
  { name: "Berry", fg: "#831843", bg: "#FFF1F2" },
  { name: "Espresso", fg: "#422006", bg: "#FFFBEB" },
] as const;

export function defaultContent(): ContentValues {
  return {
    url: { ...QR_TYPES.url.defaults },
    text: { ...QR_TYPES.text.defaults },
    wifi: { ...QR_TYPES.wifi.defaults },
    contact: { ...QR_TYPES.contact.defaults },
    email: { ...QR_TYPES.email.defaults },
    phone: { ...QR_TYPES.phone.defaults },
    sms: { ...QR_TYPES.sms.defaults },
  };
}

export function initialState(): GeneratorState {
  return {
    activeType: "url",
    content: defaultContent(),
    design: { ...DEFAULT_DESIGN },
    exportSettings: { ...DEFAULT_EXPORT },
    ecBeforeLogo: null,
  };
}
