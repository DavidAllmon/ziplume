import { expect, type Download, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const JSQR = resolve("node_modules/jsqr/dist/jsQR.js");

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/** Decodes a downloaded QR image in the browser with jsQR and returns its payload. */
export async function decodeDownload(page: Page, download: Download): Promise<string | null> {
  const extension = download.suggestedFilename().split(".").pop() ?? "png";
  return decodeImage(page, await readFile(await download.path()), extension);
}

/** Decodes QR image bytes (PNG, JPG, WebP or SVG) in the browser with jsQR. */
export async function decodeImage(
  page: Page,
  bytes: Uint8Array,
  extension: string,
): Promise<string | null> {
  const base64 = Buffer.from(bytes).toString("base64");
  if (!(await page.evaluate(() => "jsQR" in window))) await page.addScriptTag({ path: JSQR });

  return page.evaluate(
    async ({ base64, mime }) => {
      const image = new Image();
      image.src = `data:${mime};base64,${base64}`;
      await image.decode();
      type JsQR = (data: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
      const jsQR = (window as unknown as { jsQR: JsQR }).jsQR;
      // Like a phone camera, try the code at a few sizes: jsQR misses some styles at one
      // scale and reads them at another.
      for (const scale of [1, 0.6, 0.4]) {
        const width = Math.round((image.naturalWidth || 1024) * scale);
        const height = Math.round((image.naturalHeight || 1024) * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d")!;
        // Transparent codes are scanned on white, as they would be printed.
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height);
        const result = jsQR(pixels.data, width, height)?.data;
        if (result) return result;
      }
      return null;
    },
    { base64, mime: MIME[extension] ?? "image/png" },
  );
}

/** Clicks the visible download button (sidebar on desktop, bottom bar on phones). */
export async function downloadCode(page: Page): Promise<Download> {
  const button = page.getByRole("button", { name: /^Download/ }).first();
  await expect(button).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
  return download;
}

export async function chooseType(page: Page, label: string) {
  await page.getByRole("radio", { name: label, exact: true }).click();
}
