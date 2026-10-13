import { loadJSON, saveJSON } from "@/lib/storage";
import { EXPORT_FORMAT_IDS, PAGE_TYPE_IDS, QR_TYPE_IDS } from "@/lib/qr/types";

import type { GeneratorState, PersistedSettings } from "./types";

export const STORAGE_KEY = "quickqreate:v1";
/** Logos larger than this are not remembered, to stay well inside localStorage quotas. */
export const MAX_PERSISTED_LOGO_CHARS = 200_000;

const oneOf = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === "string" && (options as readonly string[]).includes(value);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Accepts saved settings from this or an older version. The design is only checked to be an
 * object here; hydrating runs it through sanitizeDesign, so fields added later get defaults.
 */
export function isPersistedSettings(value: unknown): value is PersistedSettings {
  if (!isObject(value) || value.version !== 1) return false;
  const { design, exportSettings, activeType } = value;
  return (
    oneOf(activeType, [...QR_TYPE_IDS, ...PAGE_TYPE_IDS]) &&
    isObject(design) &&
    isObject(exportSettings) &&
    oneOf(exportSettings.format, EXPORT_FORMAT_IDS) &&
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
