import { publicFileUrl } from "@/lib/env";
import { normalizeUrl } from "@/lib/qr/normalize";
import { isValidUrl } from "@/lib/qr/validators";

import type { SocialNetwork } from "./types";

export const MEDIA_BUCKET = "page-media";

/** Public URL of a file in the page-media bucket. */
export function mediaUrl(path: string): string {
  return publicFileUrl(MEDIA_BUCKET, path);
}

/**
 * A link that is safe to put in an href on a public page: http(s) only (plus mailto/tel when
 * allowed), so owner-entered content can never become a javascript: URL. Null otherwise.
 */
export function safeHref(input: string, { allowContact = false } = {}): string | null {
  const value = normalizeUrl(input);
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return isValidUrl(value) ? url.toString() : null;
    }
    if (allowContact && (url.protocol === "mailto:" || url.protocol === "tel:"))
      return url.toString();
    return null;
  } catch {
    return null;
  }
}

export const telHref = (number: string) => {
  const cleaned = number.trim().replace(/[^\d+]/g, "");
  return cleaned.replace(/\D/g, "").length >= 3 ? `tel:${cleaned}` : null;
};

export const mailHref = (address: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim()) ? `mailto:${address.trim()}` : null;

const PROFILE: Partial<Record<SocialNetwork, (handle: string) => string>> = {
  instagram: (h) => `https://instagram.com/${h}`,
  facebook: (h) => `https://facebook.com/${h}`,
  x: (h) => `https://x.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  github: (h) => `https://github.com/${h}`,
  threads: (h) => `https://www.threads.net/@${h}`,
  pinterest: (h) => `https://pinterest.com/${h}`,
  snapchat: (h) => `https://www.snapchat.com/add/${h}`,
  telegram: (h) => `https://t.me/${h}`,
  twitch: (h) => `https://www.twitch.tv/${h}`,
  reddit: (h) => `https://www.reddit.com/user/${h}`,
  bluesky: (h) => `https://bsky.app/profile/${h}`,
  linkedin: (h) => `https://www.linkedin.com/in/${h}`,
  soundcloud: (h) => `https://soundcloud.com/${h}`,
};

/** A profile link from a pasted URL, an @handle, or a bare name without dots or slashes. */
export function socialHref(network: SocialNetwork, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (network === "whatsapp" && /^\+?[\d\s()-]{7,}$/.test(v)) {
    return `https://wa.me/${v.replace(/\D/g, "")}`;
  }
  const isHandle = v.startsWith("@") || !/[./]/.test(v);
  const handle = /^@?([A-Za-z0-9._-]{1,60})$/.exec(v)?.[1];
  const profile = PROFILE[network];
  if (isHandle && handle && profile) return profile(handle);
  return safeHref(v);
}

export type VideoEmbed = { provider: "youtube" | "vimeo"; id: string; src: string };

/** Turns a YouTube or Vimeo link into a privacy-friendly embed, or null. */
export function videoEmbed(input: string): VideoEmbed | null {
  const href = safeHref(input);
  if (!href) return null;
  const url = new URL(href);
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      url.searchParams.get("v") ??
      /^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(url.pathname)?.[1] ??
      null;
  }
  if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
    return { provider: "youtube", id, src: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const vimeo = /\/(?:video\/)?(\d{6,12})(?:$|[/?#])/.exec(url.pathname)?.[1];
    if (vimeo)
      return { provider: "vimeo", id: vimeo, src: `https://player.vimeo.com/video/${vimeo}?dnt=1` };
  }
  return null;
}
