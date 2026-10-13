export const LOGO_ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 512;

export function validateLogoFile(file: Pick<File, "type" | "size">): string | null {
  if (!LOGO_ACCEPT.includes(file.type)) return "Use a PNG, JPG, WebP, GIF or SVG image.";
  if (file.size > LOGO_MAX_BYTES) return "That image is over 5 MB. Try a smaller file.";
  return null;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Reads a logo and shrinks raster images to at most 512px so the preview stays fast
 * and the data URL is small enough to remember between visits. SVGs stay vector.
 */
export async function loadLogo(file: File): Promise<string> {
  if (file.type === "image/svg+xml") return readAsDataUrl(file);

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return readAsDataUrl(file);
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/png");
}
