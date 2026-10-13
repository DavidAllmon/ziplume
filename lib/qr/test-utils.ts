import jsQR from "jsqr";
import qrcode from "qrcode-generator";

import type { ErrorCorrection } from "./types";
import { detectMode, toUtf8BinaryString } from "./utf8";

/** Renders `data` the same way the app does (UTF-8 bytes) and decodes it back with jsQR. */
export function roundTrip(data: string, errorCorrection: ErrorCorrection = "M"): string | null {
  const encoded = toUtf8BinaryString(data);
  const code = qrcode(0, errorCorrection);
  code.addData(encoded, detectMode(encoded));
  code.make();

  const modules = code.getModuleCount();
  const scale = 4;
  const margin = 4;
  const size = (modules + margin * 2) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (!code.isDark(row, col)) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = (col + margin) * scale + dx;
          const y = (row + margin) * scale + dy;
          const i = (y * size + x) * 4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        }
      }
    }
  }
  return jsQR(pixels, size, size)?.data ?? null;
}
