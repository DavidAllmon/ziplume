import type { CodeSettingsInput, NewCode } from "@/features/codes/api";
import { withUtm, type UtmParams } from "@/lib/dynamic/utm";
import { normalizeUrl } from "@/lib/qr/normalize";
import { isPageType } from "@/lib/qr/types";

import { isTrackable, type CreateState } from "./state";

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

/** A datetime-local value (the viewer's time zone) as an ISO time, or null when empty. */
export const localToIso = (value: string): string | null =>
  value ? new Date(value).toISOString() : null;

/**
 * What to send to createCodeWithSettings. Settings only apply to trackable codes: a static code
 * ignores a password or dates typed before Trackable was switched off or the type changed.
 */
export function toNewCode(
  state: CreateState,
  ownerId: string | null,
  name: string,
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
