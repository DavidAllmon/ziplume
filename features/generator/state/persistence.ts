import { loadJSON, saveJSON } from "@/lib/storage";
import { QR_TYPE_IDS } from "@/lib/qr/types";

import { MAX_LOGO_SIZE, MIN_LOGO_SIZE } from "./defaults";
import type { GeneratorState, PersistedSettings } from "./types";

export const STORAGE_KEY = "quickqreate:v1";
/** Logos larger than this are not remembered, to stay well inside localStorage quotas. */
export const MAX_PERSISTED_LOGO_CHARS = 200_000;

const oneOf = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === "string" && (options as readonly string[]).includes(value);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function isPersistedSettings(value: unknown): value is PersistedSettings {
  if (!isObject(value) || value.version !== 1) return false;
  const { design, exportSettings, activeType } = value;
  if (!oneOf(activeType, QR_TYPE_IDS) || !isObject(design) || !isObject(exportSettings)) {
    return false;
  }
  return (
    typeof design.fgColor === "string" &&
    typeof design.bgColor === "string" &&
    typeof design.transparent === "boolean" &&
    oneOf(design.dotStyle, ["square", "rounded", "dots", "classy"] as const) &&
    oneOf(design.cornerStyle, ["square", "rounded", "dot"] as const) &&
    oneOf(design.errorCorrection, ["L", "M", "Q", "H"] as const) &&
    (design.logo === null || typeof design.logo === "string") &&
    typeof design.logoSize === "number" &&
    design.logoSize >= MIN_LOGO_SIZE &&
    design.logoSize <= MAX_LOGO_SIZE &&
    typeof design.logoClearSpace === "boolean" &&
    oneOf(exportSettings.format, ["png", "svg", "jpeg", "webp"] as const) &&
    typeof exportSettings.size === "number"
  );
}

/** Only design and export preferences are saved. Content (e.g. Wi-Fi passwords) never is. */
export function toPersisted(state: GeneratorState): PersistedSettings {
  const { logo } = state.design;
  return {
    version: 1,
    activeType: state.activeType,
    design: {
      ...state.design,
      logo: logo && logo.length <= MAX_PERSISTED_LOGO_CHARS ? logo : null,
    },
    exportSettings: state.exportSettings,
  };
}

export const loadSettings = () => loadJSON(STORAGE_KEY, isPersistedSettings);
export const saveSettings = (state: GeneratorState) => saveJSON(STORAGE_KEY, toPersisted(state));
