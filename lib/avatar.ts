import { SITE_URL, SUPABASE_URL } from "@/lib/env";

/** Storage bucket for uploaded profile photos (see the avatar storage migration). */
export const AVATAR_BUCKET = "avatars";

const GOOGLE_PHOTO_HOST = /(^|\.)googleusercontent\.com$/;

/**
 * A profile photo URL that is safe to show: an upload in this project's avatars bucket (at the
 * Supabase address or the site's own), or a Google account photo. Anything else (another host,
 * http, a broken value) gives null, so a teammate can't make your browser or inbox load an image
 * from a server they control.
 */
export function trustedAvatarUrl(
  url: string | null | undefined,
  origins: readonly (string | undefined)[] = [SUPABASE_URL, SITE_URL],
): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (GOOGLE_PHOTO_HOST.test(parsed.hostname)) return parsed.href;
  if (!parsed.pathname.startsWith(`/storage/v1/object/public/${AVATAR_BUCKET}/`)) return null;
  const ours = origins.some((origin) => {
    if (!origin) return false;
    try {
      return new URL(origin).host === parsed.host;
    } catch {
      return false;
    }
  });
  return ours ? parsed.href : null;
}

/** Up to two initials: "David Allmon" → "DA", "sam@cafe.com" → "S", "jo.rivera@x.com" → "JR". */
export function initialsOf(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "";
  const words = source.split(/[\s._-]+/).filter(Boolean);
  const first = words[0];
  if (!first) return "?";
  const last = words.length > 1 ? words[words.length - 1]! : "";
  return (Array.from(first)[0]! + (last ? Array.from(last)[0]! : "")).toUpperCase();
}

/** Background and text colors for initials; every pair has at least 7:1 contrast. */
export const AVATAR_COLORS = [
  { bg: "#c7d2fe", fg: "#1e1b4b" },
  { bg: "#fde68a", fg: "#451a03" },
  { bg: "#bbf7d0", fg: "#052e16" },
  { bg: "#fecdd3", fg: "#4c0519" },
  { bg: "#bae6fd", fg: "#082f49" },
  { bg: "#e9d5ff", fg: "#3b0764" },
] as const;

/** A stable color pair for an id, so a person's initials keep their color everywhere. */
export function avatarColors(id: string): (typeof AVATAR_COLORS)[number] {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}
