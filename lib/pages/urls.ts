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

/**
 * A WhatsApp chat link for a phone number, or null without the country code: wa.me needs the
 * full international number (a leading + or 00), and an extension ("ext 12", "x4") isn't part of it.
 */
export const whatsappHref = (number: string) => {
  const main = number.trim().replace(/\s*(?:ext\.?|x|#)\s*\d+$/i, "");
  const international = /^\+/.test(main) ? main : /^00/.test(main) ? main.slice(2) : null;
  const digits = international?.replace(/\D/g, "") ?? "";
  return digits.length >= 7 ? `https://wa.me/${digits}` : null;
};

/** A text-message link: the number's digits (and a leading +). */
export const smsHref = (number: string) => telHref(number)?.replace(/^tel:/, "sms:") ?? null;

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

export type VideoEmbed = {
  provider: "youtube" | "vimeo" | "tiktok" | "instagram" | "facebook" | "loom";
  id: string;
  src: string;
  /** For "Tap to play from TikTok". */
  name: string;
  /** Phone-shaped (TikTok, Instagram, Facebook reels). */
  vertical: boolean;
  /** Loads only after a tap, keeping the site's trackers off until then (spec item 45). */
  tap: boolean;
};

/** Seconds from "1:23", "1:02:03" or "83"; null when it isn't a time. */
export function startSeconds(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,3}(:\d{2}){0,2}$/.test(t)) return null;
  const parts = t.split(":").map(Number);
  if (parts.slice(1).some((p) => p > 59)) return null;
  return parts.reduce((total, p) => total * 60 + p, 0);
}

/**
 * A video link as a privacy-friendly embed: YouTube and Vimeo play in place; TikTok, Instagram,
 * Facebook and Loom load after a tap. `start` ("1:23") applies where the player takes one.
 */
export function videoEmbed(input: string, start = ""): VideoEmbed | null {
  const href = safeHref(input);
  if (!href) return null;
  const url = new URL(href);
  const host = url.hostname.replace(/^(www\.|m\.|web\.)/, "");
  const at = startSeconds(start) || 0;
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      url.searchParams.get("v") ??
      /^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(url.pathname)?.[1] ??
      null;
  }
  if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
    const src = `https://www.youtube-nocookie.com/embed/${id}${at ? `?start=${at}` : ""}`;
    return { provider: "youtube", id, src, name: "YouTube", vertical: false, tap: false };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const vimeo = /\/(?:video\/)?(\d{6,12})(?:$|[/?#])/.exec(url.pathname)?.[1];
    if (vimeo) {
      const src = `https://player.vimeo.com/video/${vimeo}?dnt=1${at ? `#t=${at}s` : ""}`;
      return { provider: "vimeo", id: vimeo, src, name: "Vimeo", vertical: false, tap: false };
    }
  }
  if (host === "tiktok.com") {
    const tiktok = /^\/@[^/]+\/video\/(\d{15,21})/.exec(url.pathname)?.[1];
    if (tiktok) {
      return {
        provider: "tiktok",
        id: tiktok,
        src: `https://www.tiktok.com/embed/v2/${tiktok}`,
        name: "TikTok",
        vertical: true,
        tap: true,
      };
    }
  }
  if (host === "instagram.com") {
    const match = /^\/(p|reels?|tv)\/([A-Za-z0-9_-]{5,40})/.exec(url.pathname);
    if (match) {
      const kind = match[1] === "reels" ? "reel" : match[1]!;
      return {
        provider: "instagram",
        id: match[2]!,
        src: `https://www.instagram.com/${kind}/${match[2]}/embed`,
        name: "Instagram",
        vertical: true,
        tap: true,
      };
    }
  }
  if (host === "facebook.com") {
    const video =
      /\/(?:videos|reel)\/(\d{5,25})/.exec(url.pathname)?.[1] ??
      (url.pathname.startsWith("/watch") ? url.searchParams.get("v") : null);
    if (video && /^\d{5,25}$/.test(video)) {
      const canonical = url.pathname.startsWith("/watch")
        ? `https://www.facebook.com/watch/?v=${video}`
        : `https://www.facebook.com${url.pathname}`;
      return {
        provider: "facebook",
        id: video,
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(canonical)}&show_text=false`,
        name: "Facebook",
        vertical: url.pathname.includes("/reel/"),
        tap: true,
      };
    }
  }
  if (host === "loom.com") {
    const loom = /^\/(?:share|embed)\/([a-f0-9]{32})/.exec(url.pathname)?.[1];
    if (loom) {
      return {
        provider: "loom",
        id: loom,
        src: `https://www.loom.com/embed/${loom}${at ? `?t=${at}` : ""}`,
        name: "Loom",
        vertical: false,
        tap: true,
      };
    }
  }
  return null;
}
