import type { CodeSettingsInput, CodeUpdate, NewCode, PasswordChange } from "@/features/codes/api";
import { withUtm, type UtmParams } from "@/lib/dynamic/utm";
import { normalizeUrl } from "@/lib/qr/normalize";
import { isPageType } from "@/lib/qr/types";

import { isTrackable, type CreateState } from "./state";
import { localToIso } from "@/lib/time/local";

/** A Link's address with campaign tags added (when any are filled in). */
export function taggedDestination(url: string, utm: UtmParams): string {
  const address = normalizeUrl(url);
  if (!Object.values(utm).some((value) => value?.trim())) return address;
  try {
    return withUtm(address, utm);
  } catch {
    return address;
  }
}

export { localToIso };

/**
 * What to send to createCodeWithSettings. Settings only apply to trackable codes: a static code
 * ignores a password or dates typed before Trackable was switched off or the type changed.
 */
export function toNewCode(
  state: CreateState,
  ownerId: string | null,
  name: string,
  { canBePrivate = false }: { canBePrivate?: boolean } = {},
): { input: NewCode; settings: CodeSettingsInput } {
  const { code, settings, folderId } = state;
  const type = code.activeType;
  const trackable = isTrackable(state);
  const input: NewCode = {
    ...(ownerId && { ownerId }),
    folderId,
    name,
    qrType: type,
    content: isPageType(type) ? code.pages[type] : code.content[type],
    design: code.design,
    // Only in a team; a draft from before leaving one can't make a code private.
    ...(canBePrivate && settings.isPrivate && { isPrivate: true }),
    ...(trackable && {
      dynamic: {
        destination: type === "url" ? taggedDestination(code.content.url.url, settings.utm) : null,
        ...(settings.slug && { slug: settings.slug }),
      },
    }),
  };
  if (!trackable) return { input, settings: {} };
  return {
    input,
    settings: {
      ...(settings.password && { password: settings.password }),
      activeFrom: localToIso(settings.startsAt),
      activeUntil: localToIso(settings.endsAt),
    },
  };
}

/** What saving a saved code will send: the changed fields, and what happens to its password. */
export interface CodeChanges {
  patch: CodeUpdate;
  password: PasswordChange;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * What the editor changed since it opened a saved code. Only fields whose part of the form
 * changed are included, so saving one thing never rewrites the rest (an untouched date can't
 * shift between time zones, and an untouched address keeps its exact text). `name` is the name
 * to save: the typed one, or the suggestion when the box was cleared.
 */
export function toCodePatch(
  initial: CreateState,
  current: CreateState,
  { name, removePassword }: { name: string; removePassword: boolean },
): CodeChanges {
  const type = initial.code.activeType;
  const trackable = isTrackable(initial);
  const patch: CodeUpdate = {};
  if (name !== initial.code.name) patch.name = name;

  if (isPageType(type)) {
    if (!same(current.code.pages[type], initial.code.pages[type])) {
      patch.content = current.code.pages[type];
    }
  } else if (trackable && type === "url") {
    const before = { url: initial.code.content.url.url, utm: initial.settings.utm };
    const now = { url: current.code.content.url.url, utm: current.settings.utm };
    if (!same(now, before)) {
      const destination = taggedDestination(now.url, now.utm);
      patch.destination = destination;
      patch.content = { url: destination };
    }
  } else if (!same(current.code.content[type], initial.code.content[type])) {
    patch.content = current.code.content[type];
  }

  if (!same(current.code.design, initial.code.design)) patch.design = current.code.design;
  if (current.folderId !== initial.folderId) patch.folderId = current.folderId;
  if (current.settings.isPrivate !== initial.settings.isPrivate) {
    patch.isPrivate = current.settings.isPrivate;
  }
  if (trackable) {
    if (current.settings.slug !== initial.settings.slug) patch.slug = current.settings.slug;
    if (current.settings.startsAt !== initial.settings.startsAt)
      patch.activeFrom = localToIso(current.settings.startsAt);
    if (current.settings.endsAt !== initial.settings.endsAt)
      patch.activeUntil = localToIso(current.settings.endsAt);
  }

  const password: PasswordChange = !trackable
    ? { action: "keep" }
    : removePassword
      ? { action: "clear" }
      : current.settings.password
        ? { action: "set", password: current.settings.password }
        : { action: "keep" };
  return { patch, password };
}

/** Whether saving would change anything. */
export const hasChanges = ({ patch, password }: CodeChanges) =>
  Object.keys(patch).length > 0 || password.action !== "keep";
