import qrcode from "qrcode-generator";

import type { ErrorCorrection } from "./types";
import { detectMode, toUtf8BinaryString, utf8ByteLength } from "./utf8";

/** Maximum bytes a version-40 code holds in byte mode, per error-correction level. */
export const MAX_BYTES: Record<ErrorCorrection, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 };

export interface Measurement {
  bytes: number;
  maxBytes: number;
  /** Modules per side (21 for version 1 … 177 for version 40), or null if it doesn't fit. */
  modules: number | null;
  fits: boolean;
}

export function measure(data: string, errorCorrection: ErrorCorrection): Measurement {
  const bytes = utf8ByteLength(data);
  const maxBytes = MAX_BYTES[errorCorrection];
  if (!data) return { bytes, maxBytes, modules: null, fits: true };
  try {
    const encoded = toUtf8BinaryString(data);
    const code = qrcode(0, errorCorrection);
    code.addData(encoded, detectMode(encoded));
    code.make();
    return { bytes, maxBytes, modules: code.getModuleCount(), fits: true };
  } catch {
    return { bytes, maxBytes, modules: null, fits: false };
  }
}
