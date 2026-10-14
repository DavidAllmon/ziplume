import { codePayload, codeRenderOptions } from "@/features/dashboard/codeRender";
import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import { csvField } from "@/lib/analytics/shape";
import type { BulkRow } from "@/lib/bulk/rows";
import { saveBlob } from "@/lib/download";
import { shortLink } from "@/lib/env";
import type { RenderOptions } from "@/lib/qr/renderer";
import type { ExportFormat } from "@/lib/qr/types";
import type { QrCodeRow } from "@/types/supabase";

/** Image formats offered for a bulk ZIP. */
export const ZIP_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "svg", label: "SVG (vector)" },
  { value: "pdf", label: "PDF (vector)" },
  { value: "eps", label: "EPS (vector)" },
  { value: "jpeg", label: "JPG" },
];

const ZIP_SIZE = 1024;

/** One code in a bulk ZIP, plus its line in index.csv. */
export interface ZipItem {
  label: string;
  options: RenderOptions;
  /** What the code opens. */
  content: string;
  /** The short link of a trackable code, or "". */
  shortLink: string;
}

/** Codes straight from a list (nothing saved): the classic design and the row's content. */
export function itemsFromRows(rows: BulkRow[]): ZipItem[] {
  return rows.map((row) => ({
    label: row.name,
    options: { ...DEFAULT_DESIGN, data: row.payload, size: ZIP_SIZE },
    content: row.payload,
    shortLink: "",
  }));
}

/** Saved codes: their own design, and the short link for trackable ones. */
export function itemsFromCodes(codes: QrCodeRow[]): ZipItem[] {
  return codes.map((code) => ({
    label: code.name,
    options: codeRenderOptions(code, ZIP_SIZE),
    content: code.is_dynamic ? (code.destination ?? "") : codePayload(code),
    shortLink: code.is_dynamic && code.slug ? shortLink(code.slug) : "",
  }));
}

/** index.csv, which travels with the images: which file is which code. */
export function indexCsv(items: ZipItem[], names: string[]): string {
  return [
    ["file", "name", "content", "short_link"],
    ...items.map((item, i) => [names[i]!, item.label, item.content, item.shortLink]),
  ]
    .map((row) => row.map((cell) => csvField(cell)).join(","))
    .join("\r\n");
}

/** Renders every code into one ZIP with index.csv and downloads it. Throws if it can't. */
export async function downloadZip(
  items: ZipItem[],
  format: ExportFormat,
  filename: string,
  onProgress?: (done: number) => void,
): Promise<void> {
  const { uniqueFilenames, zipCodes } = await import("@/lib/qr/zip");
  const names = uniqueFilenames(
    items.map((item) => item.label),
    format,
  );
  const blob = await zipCodes(
    items.map(({ label, options }) => ({ label, options })),
    format,
    onProgress,
    { "index.csv": indexCsv(items, names) },
  );
  saveBlob(blob, filename);
}
