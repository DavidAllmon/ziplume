import { MAX_CODE_NAME } from "@/features/generator/state/defaults";
import { sanitizeContent, sanitizeDesign } from "@/features/generator/state/sanitize";
import type { GeneratorState } from "@/features/generator/state/types";
import { sanitizePage } from "@/lib/pages/sanitize";
import type { PageContentMap } from "@/lib/pages/types";
import {
  isPageType,
  isStaticType,
  PAGE_TYPE_IDS,
  QR_TYPE_IDS,
  type ContentValues,
  type ErrorCorrection,
} from "@/lib/qr/types";
import { removeKey, saveJSON } from "@/lib/storage";

import {
  initialCreateState,
  type CreateDefaults,
  type CreateSettings,
  type CreateState,
} from "./state";

const EC_LEVELS: readonly ErrorCorrection[] = ["L", "M", "Q", "H"];

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.slice(0, max) : "";

/** One unfinished code per person per browser. */
export const draftKey = (userId: string) => `ziplume:draft:v2:${userId}`;

export interface StoredDraft {
  /** When it was last saved (ISO). */
  savedAt: string;
  /** The page as it was, with the password empty. */
  state: CreateState;
}

/** The parts of the page a draft keeps, picked one by one so a password can never slip in. */
function draftBody(state: CreateState) {
  const { activeType, content, pages, design, ecBeforeLogo, name } = state.code;
  const { trackable, startsAt, endsAt, slug, utm } = state.settings;
  return {
    code: { activeType, content, pages, design, ecBeforeLogo, name },
    settings: { trackable, startsAt, endsAt, slug, utm },
    folderId: state.folderId,
    styleDesign: state.styleDesign,
  };
}

export function saveDraft(userId: string, state: CreateState, now = new Date()): void {
  saveJSON(draftKey(userId), { v: 2, savedAt: now.toISOString(), ...draftBody(state) });
}

export const clearDraft = (userId: string) => removeKey(draftKey(userId));

/** True while the page holds nothing a draft would keep: it matches a fresh page. */
export function isBlank(state: CreateState, defaults: CreateDefaults): boolean {
  return (
    JSON.stringify(draftBody(state)) === JSON.stringify(draftBody(initialCreateState(defaults)))
  );
}

/** The saved draft as stored (a string, so renders can compare it cheaply), or null. */
export function rawDraft(userId: string): string | null {
  try {
    return window.localStorage.getItem(draftKey(userId));
  } catch {
    return null;
  }
}

/** A saved draft as a full page state, with anything missing or invalid set to its default. */
export function parseDraft(raw: string | null): StoredDraft | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const draft = record(value);
  if (draft.v !== 2 || typeof draft.savedAt !== "string") return null;
  const savedAt = new Date(draft.savedAt);
  if (Number.isNaN(savedAt.getTime())) return null;

  const fresh = initialCreateState({ type: "url", folderId: null });
  const code = record(draft.code);
  const content = record(code.content);
  const pages = record(code.pages);
  const settings = record(draft.settings);
  const utm = record(settings.utm);
  const activeType =
    typeof code.activeType === "string" &&
    (isStaticType(code.activeType) || isPageType(code.activeType))
      ? code.activeType
      : "url";

  const restored: GeneratorState = {
    ...fresh.code,
    activeType,
    content: Object.fromEntries(
      QR_TYPE_IDS.map((id) => [
        id,
        content[id] === undefined ? fresh.code.content[id] : sanitizeContent(id, content[id]),
      ]),
    ) as unknown as ContentValues,
    pages: Object.fromEntries(
      PAGE_TYPE_IDS.map((id) => [
        id,
        pages[id] === undefined ? fresh.code.pages[id] : sanitizePage(id, pages[id]),
      ]),
    ) as unknown as PageContentMap,
    design: sanitizeDesign(code.design),
    ecBeforeLogo: EC_LEVELS.includes(code.ecBeforeLogo as ErrorCorrection)
      ? (code.ecBeforeLogo as ErrorCorrection)
      : null,
    name: text(code.name, MAX_CODE_NAME),
  };
  const restoredSettings: CreateSettings = {
    trackable: settings.trackable !== false,
    password: "",
    startsAt: text(settings.startsAt, 19),
    endsAt: text(settings.endsAt, 19),
    slug: text(settings.slug, 40),
    utm: {
      source: text(utm.source, 200),
      medium: text(utm.medium, 200),
      campaign: text(utm.campaign, 200),
    },
  };
  return {
    savedAt: savedAt.toISOString(),
    state: {
      code: restored,
      settings: restoredSettings,
      folderId: typeof draft.folderId === "string" ? draft.folderId : null,
      styleDesign: sanitizeDesign(draft.styleDesign),
    },
  };
}
