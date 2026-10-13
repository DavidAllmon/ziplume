import { PAGE_TYPES } from "@/lib/pages/types";

import { QR_TYPES } from "./qr-types";
import { isPageType, type CodeTypeId } from "./types";

export interface CodeTypeInfo {
  label: string;
  emptyHint: string;
  /** True for hosted pages (they need a free account and are always dynamic). */
  hosted: boolean;
}

/** Label and empty-state hint for any code type, static or hosted. */
export function codeTypeInfo(id: CodeTypeId): CodeTypeInfo {
  if (isPageType(id))
    return { label: PAGE_TYPES[id].label, emptyHint: PAGE_TYPES[id].emptyHint, hosted: true };
  return { label: QR_TYPES[id].label, emptyHint: QR_TYPES[id].emptyHint, hosted: false };
}
