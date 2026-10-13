import { DEFAULT_EXPORT } from "@/features/generator/state/defaults";
import { sanitizeContent, sanitizeDesign } from "@/features/generator/state/sanitize";
import { dynamicPayload } from "@/lib/dynamic/slug";
import { sanitizePage } from "@/lib/pages/sanitize";
import { pageSummary } from "@/lib/pages/validate";
import { codeTypeInfo } from "@/lib/qr/code-types";
import { encodeContent, summarizeContent } from "@/lib/qr/qr-types";
import type { RenderOptions } from "@/lib/qr/renderer";
import { isPageType, isStaticType, type CodeTypeId } from "@/lib/qr/types";
import type { QrCodeRow } from "@/types/supabase";

export function codeType(code: Pick<QrCodeRow, "qr_type">): CodeTypeId {
  return isStaticType(code.qr_type) || isPageType(code.qr_type) ? code.qr_type : "text";
}

/** What the saved code encodes: the short link for dynamic codes, the content otherwise. */
export function codePayload(code: QrCodeRow): string {
  if (code.is_dynamic && code.slug) return dynamicPayload(code.slug);
  const type = codeType(code);
  if (isPageType(type)) return "";
  return encodeContent(type, sanitizeContent(type, code.content));
}

export function codeRenderOptions(code: QrCodeRow, size = DEFAULT_EXPORT.size): RenderOptions {
  return { ...sanitizeDesign(code.design), data: codePayload(code), size };
}

export function codeSummary(code: QrCodeRow): string {
  const type = codeType(code);
  if (isPageType(type)) return pageSummary(type, sanitizePage(type, code.content));
  if (code.is_dynamic) return code.destination?.replace(/^https?:\/\//, "") ?? "";
  return summarizeContent(type, sanitizeContent(type, code.content));
}

export const codeTypeLabel = (code: QrCodeRow) => codeTypeInfo(codeType(code)).label;

export const isHostedPage = (code: Pick<QrCodeRow, "qr_type">) => isPageType(code.qr_type);
