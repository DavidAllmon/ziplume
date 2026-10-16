import type { PageTypeId } from "@/lib/qr/types";

import type { Media, PageContentMap } from "./types";

// What a hosted page says about itself in link previews (spec 6.8).

const DESCRIBED_BY = ["bio", "tagline", "description", "about"];
const IMAGE_FROM = ["avatar", "photo", "cover", "image", "logo", "icon"];

/** A short description for link previews: the page's bio, tagline or description. */
export function pageDescription<K extends PageTypeId>(
  _type: K,
  page: PageContentMap[K],
): string | null {
  const fields = page as unknown as Record<string, unknown>;
  const text = DESCRIBED_BY.map((key) =>
    typeof fields[key] === "string" ? (fields[key] as string).trim() : "",
  ).find(Boolean);
  return text ? text.slice(0, 200) : null;
}

/** The page's header image, for link previews. */
export function pageImage<K extends PageTypeId>(_type: K, page: PageContentMap[K]): Media | null {
  const fields = page as unknown as Record<string, unknown>;
  for (const key of IMAGE_FROM) {
    const value = fields[key];
    if (value && typeof value === "object" && "path" in value) return value as Media;
  }
  return null;
}
