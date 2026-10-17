import { normalizeHex } from "@/lib/color/contrast";
import type { PageTypeId } from "@/lib/qr/types";

import { legacyLook, sanitizeLook, themeLook, TYPE_THEME, type PageLook } from "./look";
import { sanitizeMedia } from "./media";
import { DIET_LABEL_IDS, tagsToLabels } from "./menu";
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
  | { kind: "list"; max: number; item: Record<string, Spec> }
  | { kind: "enumList"; values: readonly string[]; max: number };

const str = (max: number = LIMITS.short): Spec => ({ kind: "string", max });
const bool: Spec = { kind: "bool" };
const media: Spec = { kind: "media" };
const link: Record<string, Spec> = {
  label: str(80),
  url: str(2048),
  // Pages saved before links could be switched off show every link.
  on: { kind: "bool", fallback: true },
  kind: { kind: "enum", values: ["link", "header"] },
  type: { kind: "enum", values: ["web", "email", "phone", "sms"] },
  icon: { kind: "enum", values: ["auto", "none", "image", "review", "book", "order"] },
  image: media,
  featured: bool,
  showFrom: str(30),
  showUntil: str(30),
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
    pronouns: str(60),
    jobTitle: str(),
    department: str(60),
    company: str(),
    bio: str(LIMITS.text),
    photo: media,
    cover: media,
    phones: {
      kind: "list",
      max: LIMITS.phones,
      item: { label: str(30), number: str(40), whatsapp: bool },
    },
    emails: { kind: "list", max: LIMITS.emails, item: { label: str(30), address: str(254) } },
    websites: { kind: "list", max: LIMITS.websites, item: { label: str(30), url: str(2048) } },
    address: str(LIMITS.medium),
    socials: social,
    showCall: { kind: "bool", fallback: true },
    showText: { kind: "bool", fallback: true },
    showEmail: { kind: "bool", fallback: true },
    showWhatsapp: { kind: "bool", fallback: true },
    showDirections: { kind: "bool", fallback: true },
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
    timeZone: str(64),
    closures: { kind: "list", max: LIMITS.closures, item: { date: str(10), note: str(60) } },
    gallery: { kind: "mediaList", max: LIMITS.gallery },
    services: {
      kind: "list",
      max: LIMITS.services,
      item: { name: str(80), price: str(20), description: str(LIMITS.medium) },
    },
    buttons: { kind: "list", max: LIMITS.buttons, item: link },
    socials: social,
  },
  menu: {
    name: str(),
    description: str(LIMITS.text),
    logo: media,
    currency: str(4),
    sections: {
      kind: "list",
      max: LIMITS.sections,
      item: {
        name: str(80),
        description: str(LIMITS.medium),
        items: {
          kind: "list",
          max: LIMITS.items,
          item: {
            name: str(),
            description: str(LIMITS.medium),
            price: str(20),
            tags: str(80),
            photo: media,
            labels: { kind: "enumList", values: DIET_LABEL_IDS, max: DIET_LABEL_IDS.length },
            // Dishes saved before they could be hidden all show.
            on: { kind: "bool", fallback: true },
            soldOut: bool,
            popular: bool,
            options: {
              kind: "list",
              max: LIMITS.options,
              item: { label: str(30), price: str(20) },
            },
          },
        },
      },
    },
    note: str(LIMITS.text),
  },
  coupon: {
    business: str(),
    headline: str(),
    offer: str(40),
    description: str(LIMITS.text),
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
    thanks: str(LIMITS.text),
  },
  pdf: { title: str(), description: str(LIMITS.text), file: media, direct: bool },
  images: {
    title: str(),
    description: str(LIMITS.text),
    images: { kind: "mediaList", max: LIMITS.images },
  },
  video: { title: str(), description: str(LIMITS.text), url: str(2048) },
  audio: {
    title: str(),
    artist: str(),
    description: str(LIMITS.text),
    cover: media,
    file: media,
    link: str(2048),
  },
  app: {
    name: str(),
    description: str(LIMITS.text),
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
      from2: typeof d.from2 === "string" && TIME.test(d.from2) ? d.from2 : "",
      to2: typeof d.to2 === "string" && TIME.test(d.to2) ? d.to2 : "",
    };
  });
}

type CleanOptions = { keepLongText: boolean };

function clean(spec: Spec, raw: unknown, fallback: unknown, options: CleanOptions): unknown {
  switch (spec.kind) {
    case "string":
      return typeof raw === "string"
        ? raw.replaceAll("\u0000", "").slice(0, options.keepLongText ? LIMITS.paste : spec.max)
        : fallback;
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
      return raw.slice(0, spec.max).map((item) => cleanObject(spec.item, item, {}, options));
    }
    case "enumList":
      return Array.isArray(raw)
        ? [
            ...new Set(
              raw.filter((v): v is string => typeof v === "string" && spec.values.includes(v)),
            ),
          ].slice(0, spec.max)
        : fallback;
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
    case "enumList":
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
  options: CleanOptions,
): Record<string, unknown> {
  const source = isObject(raw) ? raw : {};
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema)) {
    out[key] = clean(spec, source[key], key in defaults ? defaults[key] : emptyFor(spec), options);
  }
  return out;
}

const upgradeDish = (dish: unknown) => {
  if (!isObject(dish) || "labels" in dish || typeof dish.tags !== "string") return dish;
  const { labels, rest } = tagsToLabels(dish.tags);
  return { ...dish, labels, tags: rest };
};

/** Older content shapes, brought up to date before the schema reads them. */
const UPGRADES: Partial<
  Record<PageTypeId, (raw: Record<string, unknown>) => Record<string, unknown>>
> = {
  // Contact pages had one website before they had several (spec item 13).
  // Dishes had free-text tags before they had dietary labels (spec item 22, ruling 8).
  menu: (raw) =>
    Array.isArray(raw.sections)
      ? {
          ...raw,
          sections: raw.sections.map((section) =>
            isObject(section) && Array.isArray(section.items)
              ? { ...section, items: section.items.map(upgradeDish) }
              : section,
          ),
        }
      : raw,
  vcard: (raw) =>
    !("websites" in raw) && typeof raw.website === "string" && raw.website.trim()
      ? { ...raw, websites: [{ label: "", url: raw.website }] }
      : raw,
};

/**
 * A valid page of the given type from any stored or edited JSON. It always has a look: a saved
 * page without one keeps how it looked (spec 6.9), garbage gets the type's defaults, and an API
 * request without one gets the type's theme (`missingLook: "theme"`, spec 6.10). `color` always
 * equals the look's button color. The editor passes `keepLongText`, so text over a limit stays (up
 * to `LIMITS.paste`) and validation asks to shorten it.
 */
export function sanitizePage<K extends PageTypeId>(
  type: K,
  raw: unknown,
  {
    missingLook = "legacy",
    keepLongText = false,
  }: { missingLook?: "legacy" | "theme"; keepLongText?: boolean } = {},
): PageContentMap[K] {
  const defaults = PAGE_DEFAULTS[type]() as unknown as Record<string, unknown>;
  const upgrade = UPGRADES[type];
  const upgraded = upgrade && isObject(raw) ? upgrade(raw) : raw;
  const page = cleanObject(SCHEMAS[type], upgraded, defaults, { keepLongText });
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

/** "Shorten by 120 characters". */
export const shortenBy = (n: number) =>
  `Shorten by ${n.toLocaleString("en-US")} ${n === 1 ? "character" : "characters"}`;

/** A text field's limit by its path ("bio", "links.3.label"), or null when it isn't text. */
export function limitAt(type: PageTypeId, path: string): number | null {
  let schema: Record<string, Spec> | undefined = SCHEMAS[type];
  const parts = path.split(".");
  for (let i = 0; i < parts.length; i++) {
    const spec: Spec | undefined = schema?.[parts[i]!];
    if (!spec) return null;
    if (i === parts.length - 1) return spec.kind === "string" ? spec.max : null;
    // Only a list goes deeper, and only through an item's index.
    if (spec.kind !== "list" || !/^\d+$/.test(parts[i + 1] ?? "")) return null;
    i++;
    if (i === parts.length - 1) return null;
    schema = spec.item;
  }
  return null;
}

/** Every text field over its limit, by path, with how much to shorten it. */
export function overLimit<K extends PageTypeId>(
  type: K,
  page: PageContentMap[K],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const walk = (schema: Record<string, Spec>, value: unknown, prefix: string) => {
    if (!isObject(value)) return;
    for (const [key, spec] of Object.entries(schema)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const field = value[key];
      if (spec.kind === "string" && typeof field === "string" && field.length > spec.max) {
        errors[path] = shortenBy(field.length - spec.max);
      }
      if (spec.kind === "list" && Array.isArray(field)) {
        field.forEach((item, i) => walk(spec.item, item, `${path}.${i}`));
      }
    }
  };
  walk(SCHEMAS[type], page, "");
  return errors;
}
