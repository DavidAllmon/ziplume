import { sanitizeMedia } from "./sanitize";

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
