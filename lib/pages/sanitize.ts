import { normalizeHex } from "@/lib/color/contrast";
import type { PageTypeId } from "@/lib/qr/types";

import { legacyLook, sanitizeLook, themeLook, TYPE_THEME, type PageLook } from "./look";
import { sanitizeMedia } from "./media";
import {
  LIMITS,
  PAGE_DEFAULTS,
  SOCIAL_NETWORKS,
  type DayHours,
  type Media,
  type PageContentMap,
} from "./types";

// Page content comes back from the database (and from the editor) as untyped JSON. These
// schemas coerce it field by field: unknown keys are dropped, strings are trimmed to their
// limits and anything malformed falls back to the default.

type Spec =
  | { kind: "string"; max: number }
  | { kind: "bool"; fallback?: boolean }
  | { kind: "color" }
  | { kind: "media" }
  | { kind: "mediaList"; max: number }
  | { kind: "hours" }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "list"; max: number; item: Record<string, Spec> };

const str = (max: number = LIMITS.short): Spec => ({ kind: "string", max });
const bool: Spec = { kind: "bool" };
const media: Spec = { kind: "media" };
const link: Record<string, Spec> = {
  label: str(80),
  url: str(2048),
  // Pages saved before links could be switched off show every link.
  on: { kind: "bool", fallback: true },
};
const social: Spec = {
  kind: "list",
  max: LIMITS.socials,
  item: { network: { kind: "enum", values: SOCIAL_NETWORKS }, url: str(2048) },
};

const SCHEMAS: Record<PageTypeId, Record<string, Spec>> = {
  links: {
    title: str(),
    bio: str(LIMITS.medium),
    avatar: media,
    links: { kind: "list", max: LIMITS.links, item: link },
    socials: social,
  },
  vcard: {
    firstName: str(60),
    lastName: str(60),
    jobTitle: str(),
    company: str(),
    bio: str(LIMITS.medium),
    photo: media,
    phones: { kind: "list", max: LIMITS.phones, item: { label: str(30), number: str(40) } },
    emails: { kind: "list", max: LIMITS.emails, item: { label: str(30), address: str(254) } },
    website: str(2048),
    address: str(LIMITS.medium),
    socials: social,
  },
  business: {
    name: str(),
    tagline: str(),
    about: str(LIMITS.long),
    logo: media,
    cover: media,
    phone: str(40),
    email: str(254),
    website: str(2048),
    address: str(LIMITS.medium),
    hours: { kind: "hours" },
    showHours: bool,
    buttons: { kind: "list", max: LIMITS.buttons, item: link },
    socials: social,
  },
  menu: {
    name: str(),
    description: str(LIMITS.medium),
    logo: media,
    currency: str(4),
    sections: {
      kind: "list",
      max: LIMITS.sections,
      item: {
        name: str(80),
        items: {
          kind: "list",
          max: LIMITS.items,
          item: { name: str(), description: str(LIMITS.medium), price: str(20), tags: str(80) },
        },
      },
    },
    note: str(LIMITS.medium),
  },
  coupon: {
    business: str(),
    headline: str(),
    offer: str(40),
    description: str(LIMITS.medium),
    code: str(40),
    validUntil: str(10),
    terms: str(LIMITS.long),
    buttonLabel: str(40),
    buttonUrl: str(2048),
    image: media,
  },
  event: {
    title: str(),
    start: str(16),
    end: str(16),
    timeZone: str(64),
    allDay: bool,
    location: str(LIMITS.medium),
    description: str(LIMITS.long),
    organizer: str(),
    ticketUrl: str(2048),
    ticketLabel: str(40),
    image: media,
  },
  feedback: {
    business: str(),
    logo: media,
    question: str(),
    allowComment: bool,
    askContact: bool,
    thanks: str(LIMITS.medium),
  },
  pdf: { title: str(), description: str(LIMITS.medium), file: media, direct: bool },
  images: {
    title: str(),
    description: str(LIMITS.medium),
    images: { kind: "mediaList", max: LIMITS.images },
  },
  video: {
    title: str(),
    description: str(LIMITS.medium),
    source: { kind: "enum", values: ["link", "upload"] },
    url: str(2048),
    file: media,
  },
  audio: {
    title: str(),
    artist: str(),
    description: str(LIMITS.medium),
    cover: media,
    file: media,
    link: str(2048),
  },
  app: {
    name: str(),
    description: str(LIMITS.medium),
    icon: media,
    iosUrl: str(2048),
    androidUrl: str(2048),
    webUrl: str(2048),
  },
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export { MEDIA_PATH, sanitizeMedia } from "./media";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function sanitizeHours(raw: unknown, fallback: DayHours[]): DayHours[] {
  const list = Array.isArray(raw) ? raw : [];
  return fallback.map((def, i) => {
    const d = isObject(list[i]) ? (list[i] as Record<string, unknown>) : {};
    return {
      open: typeof d.open === "boolean" ? d.open : def.open,
      from: typeof d.from === "string" && TIME.test(d.from) ? d.from : def.from,
      to: typeof d.to === "string" && TIME.test(d.to) ? d.to : def.to,
    };
  });
}

function clean(spec: Spec, raw: unknown, fallback: unknown): unknown {
  switch (spec.kind) {
    case "string":
      return typeof raw === "string" ? raw.replaceAll("\u0000", "").slice(0, spec.max) : fallback;
    case "bool":
      return typeof raw === "boolean" ? raw : fallback;
    case "color":
      return (typeof raw === "string" && normalizeHex(raw)) || fallback;
    case "enum":
      return typeof raw === "string" && spec.values.includes(raw) ? raw : fallback;
    case "media":
      return sanitizeMedia(raw);
    case "mediaList":
      return (Array.isArray(raw) ? raw : [])
        .map(sanitizeMedia)
        .filter((m): m is Media => m !== null)
        .slice(0, spec.max);
    case "hours":
      return sanitizeHours(raw, fallback as DayHours[]);
    case "list": {
      if (!Array.isArray(raw)) return fallback;
      return raw.slice(0, spec.max).map((item) => cleanObject(spec.item, item, {}));
    }
  }
}

function emptyFor(spec: Spec): unknown {
  switch (spec.kind) {
    case "string":
      return "";
    case "bool":
      return spec.fallback ?? false;
    case "list":
    case "mediaList":
      return [];
    case "media":
      return null;
    case "enum":
      return spec.values[0];
    default:
      return "";
  }
}

function cleanObject(
  schema: Record<string, Spec>,
  raw: unknown,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  const source = isObject(raw) ? raw : {};
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema)) {
    out[key] = clean(spec, source[key], key in defaults ? defaults[key] : emptyFor(spec));
  }
  return out;
}

/**
 * A valid page of the given type from any stored or edited JSON. It always has a look: a saved
 * page without one keeps how it looked (spec 6.9), garbage gets the type's defaults, and an API
 * request without one gets the type's theme (`missingLook: "theme"`, spec 6.10). `color` always
 * equals the look's button color.
 */
export function sanitizePage<K extends PageTypeId>(
  type: K,
  raw: unknown,
  { missingLook = "legacy" }: { missingLook?: "legacy" | "theme" } = {},
): PageContentMap[K] {
  const defaults = PAGE_DEFAULTS[type]() as unknown as Record<string, unknown>;
  const page = cleanObject(SCHEMAS[type], raw, defaults);
  const source = isObject(raw) ? raw : null;
  const fallback = !source
    ? (defaults.look as PageLook)
    : missingLook === "theme" || "look" in source
      ? themeLook(TYPE_THEME[type], type)
      : legacyLook(type, source);
  const look = source && "look" in source ? sanitizeLook(source.look, fallback) : fallback;
  return { ...page, look, color: look.button.color } as unknown as PageContentMap[K];
}

/** Every storage path a page refers to (to clean up files that are no longer used). */
export function mediaPaths(content: unknown): string[] {
  const paths = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (isObject(value)) {
      const media = sanitizeMedia(value);
      if (media) paths.add(media.path);
      else Object.values(value).forEach(visit);
    }
  };
  visit(content);
  return [...paths];
}
