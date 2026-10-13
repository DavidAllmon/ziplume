import { DEFAULT_EXPORT } from "@/features/generator/state/defaults";
import { sanitizeContent, sanitizeDesign } from "@/features/generator/state/sanitize";
import { dynamicPayload } from "@/lib/dynamic/slug";
import { encodeContent, QR_TYPES, summarizeContent } from "@/lib/qr/qr-types";
import type { RenderOptions } from "@/lib/qr/renderer";
import { QR_TYPE_IDS, type QrTypeId } from "@/lib/qr/types";
import type { QrCodeRow } from "@/types/supabase";

export function codeType(code: Pick<QrCodeRow, "qr_type">): QrTypeId {
  return (QR_TYPE_IDS as readonly string[]).includes(code.qr_type)
    ? (code.qr_type as QrTypeId)
    : "text";
}

/** What the saved code encodes: the short link for dynamic codes, the content otherwise. */
export function codePayload(code: QrCodeRow): string {
  if (code.is_dynamic && code.slug) return dynamicPayload(code.slug);
  const type = codeType(code);
  return encodeContent(type, sanitizeContent(type, code.content));
}

export function codeRenderOptions(code: QrCodeRow, size = DEFAULT_EXPORT.size): RenderOptions {
  return { ...sanitizeDesign(code.design), data: codePayload(code), size };
}

export function codeSummary(code: QrCodeRow): string {
  if (code.is_dynamic) return code.destination?.replace(/^https?:\/\//, "") ?? "";
  const type = codeType(code);
  return summarizeContent(type, sanitizeContent(type, code.content));
}

export const codeTypeLabel = (code: QrCodeRow) => QR_TYPES[codeType(code)].label;
