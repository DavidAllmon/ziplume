// How pdf.js is told where its helper files are, and how a drawn first page is judged and cut
// (spec item 40). Kept apart from pdfFirstPage so it can be tested against pdf.js itself.

/**
 * Where pdf.js fetches what some PDFs need: the decoders for scanned images (CCITT, JBIG2,
 * JPEG 2000), character maps for Chinese, Japanese and Korean text, the standard fonts, and
 * colour profiles. Each is fetched only when a PDF needs it. Without them a scan draws white.
 */
export const pdfOptions = (base: string) => ({
  wasmUrl: `${base}/wasm/`,
  cMapUrl: `${base}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${base}/standard_fonts/`,
  iccUrl: `${base}/iccs/`,
});

/** Every pixel white or see-through: nothing was drawn, so the PDF icon is better (ruling 8). */
export function isBlank(pixels: Uint8ClampedArray): boolean {
  for (let i = 0; i < pixels.length; i += 4) {
    const seen = pixels[i + 3]! > 8;
    if (seen && (pixels[i]! < 245 || pixels[i + 1]! < 245 || pixels[i + 2]! < 245)) return false;
  }
  return true;
}

/** A preview keeps the page's top, at most 1½ times as tall as it's wide (a receipt is cut). */
export const previewHeight = (width: number, height: number) =>
  Math.min(height, Math.round(width * 1.5));
