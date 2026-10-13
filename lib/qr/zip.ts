import { zipSync, type Zippable } from "fflate";

import { slugify } from "./filename";
import type { RenderOptions } from "./renderer";
import type { ExportFormat } from "./types";

/** Already-compressed formats are stored as they are; text formats are deflated. */
const STORED: readonly ExportFormat[] = ["png", "jpeg", "webp", "pdf"];

const EXTENSION: Record<ExportFormat, string> = {
  png: "png",
  svg: "svg",
  jpeg: "jpg",
  webp: "webp",
  pdf: "pdf",
  eps: "eps",
};

/** File names for each label, made safe and unique ("menu.png", "menu-2.png", …). */
export function uniqueFilenames(labels: string[], format: ExportFormat): string[] {
  const used = new Set<string>();
  return labels.map((label, index) => {
    const base = slugify(label, 60) || `qr-code-${index + 1}`;
    let name = `${base}.${EXTENSION[format]}`;
    for (let n = 2; used.has(name); n++) name = `${base}-${n}.${EXTENSION[format]}`;
    used.add(name);
    return name;
  });
}

export interface ZipEntry {
  label: string;
  options: RenderOptions;
}

/**
 * Renders every code in the chosen format and packs them into one ZIP file. Codes are drawn
 * one at a time to keep memory steady; `onProgress` reports how many are done.
 */
export async function zipCodes(
  entries: ZipEntry[],
  format: ExportFormat,
  onProgress?: (done: number) => void,
  extras: Record<string, string> = {},
): Promise<Blob> {
  // Loaded on demand: the renderer pulls in the browser-only drawing code.
  const { renderBlob } = await import("./renderer");
  const names = uniqueFilenames(
    entries.map((entry) => entry.label),
    format,
  );
  const files: Zippable = {};
  const level = STORED.includes(format) ? 0 : 6;
  for (const [index, entry] of entries.entries()) {
    const blob = await renderBlob(entry.options, format);
    files[names[index]!] = [new Uint8Array(await blob.arrayBuffer()), { level }];
    onProgress?.(index + 1);
  }
  const encoder = new TextEncoder();
  for (const [name, text] of Object.entries(extras)) files[name] = encoder.encode(text);
  const zipped = zipSync(files);
  return new Blob([zipped as Uint8Array<ArrayBuffer>], { type: "application/zip" });
}
