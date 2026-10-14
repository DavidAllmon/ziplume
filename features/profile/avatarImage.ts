export const AVATAR_ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
/** Uploaded photos are at most this many pixels square (smaller photos aren't enlarged). */
const AVATAR_SIZE = 512;

export function validateAvatarFile(file: Pick<File, "type" | "size">): string | null {
  if (!AVATAR_ACCEPT.includes(file.type)) return "Use a JPG, PNG or WebP photo.";
  if (file.size > MAX_INPUT_BYTES) return "That photo is over 10 MB. Try a smaller one.";
  return null;
}

/** The largest centered square in a width × height image. */
export function squareCrop(width: number, height: number) {
  const side = Math.min(width, height);
  return { sx: Math.floor((width - side) / 2), sy: Math.floor((height - side) / 2), side };
}

/**
 * Crops a photo to a centered square, shrinks it to 512×512 and encodes it as WebP, or as PNG in
 * browsers that can't encode WebP (Safari). Either way it stays well under the 2 MB bucket limit.
 */
export async function prepareAvatar(
  file: File,
): Promise<{ blob: Blob; type: "image/webp" | "image/png" }> {
  const bitmap = await createImageBitmap(file);
  const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
  const size = Math.min(AVATAR_SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Canvas is unavailable");
  }
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86),
  );
  if (webp?.type === "image/webp") return { blob: webp, type: "image/webp" };
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!png) throw new Error("The photo couldn't be encoded");
  return { blob: png, type: "image/png" };
}
