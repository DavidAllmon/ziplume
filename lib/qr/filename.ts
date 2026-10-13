import type { CodeTypeId } from "./types";

export function slugify(value: string, maxLength = 40): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

export function buildFilename(type: CodeTypeId, label: string, extension: string): string {
  const slug = slugify(label);
  return `quickqreate-${type}${slug ? `-${slug}` : ""}.${extension}`;
}
