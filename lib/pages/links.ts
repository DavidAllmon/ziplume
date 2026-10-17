import type { LinkItem, Media, SocialNetwork } from "./types";
import { mailHref, safeHref, smsHref, telHref } from "./urls";

export const newLink = (): LinkItem => ({
  label: "",
  url: "",
  on: true,
  kind: "link",
  type: "web",
  icon: "auto",
  image: null,
  featured: false,
  showFrom: "",
  showUntil: "",
});

export const newHeader = (): LinkItem => ({ ...newLink(), kind: "header" });

// PageView draws content as given (the public page and the editor sanitize first), so a link
// saved before these fields existed may lack them: read each with its default.
const typeOf = (link: LinkItem) => link.type ?? "web";

/** An address without a scheme someone typed in front of it. */
const bare = (value: string) => value.trim().replace(/^(mailto|tel|sms):/i, "");

/** Where a link goes, by its type; null when the address isn't usable (or it's a header). */
export function linkHref(link: LinkItem): string | null {
  if (link.kind === "header") return null;
  const type = typeOf(link);
  if (type === "email") return mailHref(bare(link.url));
  if (type === "phone" || type === "sms") {
    const number = bare(link.url);
    // Letters can't be dialed (1-800-FLOWERS, "ext 12"): ask for the digits instead.
    if (/[a-z]/i.test(number)) return null;
    return type === "phone" ? telHref(number) : smsHref(number);
  }
  return safeHref(link.url);
}

const time = (iso: string) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : t;
};

/** Whether a link is on the page right now: switched on, and inside its schedule. */
export function isShown(link: LinkItem, now: Date): boolean {
  if (link.kind === "header" || !link.on) return false;
  const from = time(link.showFrom ?? "");
  const until = time(link.showUntil ?? "");
  const at = now.getTime();
  return (from === null || at >= from) && (until === null || at < until);
}

const HOSTS: [RegExp, SocialNetwork][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "facebook"],
  [/(^|\.)(x\.com|twitter\.com)$/, "x"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)github\.com$/, "github"],
  [/(^|\.)(threads\.net|threads\.com)$/, "threads"],
  [/(^|\.)(pinterest\.com|pin\.it)$/, "pinterest"],
  [/(^|\.)snapchat\.com$/, "snapchat"],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, "whatsapp"],
  [/(^|\.)(t\.me|telegram\.me|telegram\.org)$/, "telegram"],
  [/(^|\.)(discord\.gg|discord\.com)$/, "discord"],
  [/(^|\.)twitch\.tv$/, "twitch"],
  [/(^|\.)spotify\.com$/, "spotify"],
  [/(^|\.)soundcloud\.com$/, "soundcloud"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)bsky\.app$/, "bluesky"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
];

/** The known site a web address points at, for its icon. */
export function networkFromUrl(url: string): SocialNetwork | null {
  const href = safeHref(url);
  if (!href) return null;
  const host = new URL(href).hostname.toLowerCase();
  return HOSTS.find(([pattern]) => pattern.test(host))?.[1] ?? null;
}

export type LinkIcon =
  | { kind: "network"; network: SocialNetwork }
  | { kind: "type"; type: "email" | "phone" | "sms" }
  | { kind: "image"; image: Media }
  | { kind: "preset"; preset: "review" | "book" | "order" };

/** A link's icon: its uploaded image, or (Auto) its type's or a known site's; null for none. */
export function linkIcon(link: LinkItem): LinkIcon | null {
  if (link.icon === "none") return null;
  if (link.icon === "image" && link.image) return { kind: "image", image: link.image };
  if (link.icon === "review" || link.icon === "book" || link.icon === "order") {
    return { kind: "preset", preset: link.icon };
  }
  const type = typeOf(link);
  if (type !== "web") return { kind: "type", type };
  const network = networkFromUrl(link.url);
  return network ? { kind: "network", network } : null;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** What a scheduled link's row says: when it shows, or that it has ended; null when unscheduled. */
export function scheduleNote(link: LinkItem, now: Date): string | null {
  const from = time(link.showFrom ?? "");
  const until = time(link.showUntil ?? "");
  if (from === null && until === null) return null;
  const at = now.getTime();
  if (until !== null && at >= until) return "Ended";
  if (from !== null && at < from) {
    return until !== null
      ? `${when(link.showFrom)} – ${when(link.showUntil)}`
      : `From ${when(link.showFrom)}`;
  }
  if (until !== null) return `Until ${when(link.showUntil)}`;
  return `Since ${when(link.showFrom)}`;
}
