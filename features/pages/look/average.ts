/** The average of RGBA pixel data as a hex color; see-through pixels don't count. */
export function averagePixels(data: ArrayLike<number>): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    r += data[i]!;
    g += data[i + 1]!;
    b += data[i + 2]!;
    n++;
  }
  if (!n) return "#808080";
  const hex = (sum: number) =>
    Math.round(sum / n)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

/** A photo's average color, read in the browser before upload; null where that can't be done. */
export async function averageColor(file: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file, { resizeWidth: 16, resizeHeight: 16 });
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0);
    return averagePixels(context.getImageData(0, 0, 16, 16).data);
  } catch {
    return null;
  }
}
