import type { Media } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Storage paths are "<user uuid>/<file name>" with a safe file name. */
export const MEDIA_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]{1,120}$/;

export function sanitizeMedia(raw: unknown): Media | null {
  if (!isObject(raw) || typeof raw.path !== "string" || !MEDIA_PATH.test(raw.path)) return null;
  const media: Media = {
    path: raw.path,
    name: typeof raw.name === "string" ? raw.name.slice(0, 120) : raw.path.split("/")[1]!,
    type: typeof raw.type === "string" ? raw.type.slice(0, 80) : "",
    size: typeof raw.size === "number" && raw.size >= 0 ? Math.round(raw.size) : 0,
  };
  if (typeof raw.width === "number" && raw.width > 0) media.width = Math.round(raw.width);
  if (typeof raw.height === "number" && raw.height > 0) media.height = Math.round(raw.height);
  return media;
}

/** A copy of page content with media paths swapped by `renamed`; everything else is untouched. */
export function replaceMediaPaths(content: unknown, renamed: ReadonlyMap<string, string>): unknown {
  if (Array.isArray(content)) return content.map((item) => replaceMediaPaths(item, renamed));
  if (content !== null && typeof content === "object") {
    const record = content as Record<string, unknown>;
    const media = sanitizeMedia(record);
    if (media && renamed.has(media.path)) return { ...record, path: renamed.get(media.path) };
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, replaceMediaPaths(value, renamed)]),
    );
  }
  return content;
}
