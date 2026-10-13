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
  const file = await download.path();
  const extension = download.suggestedFilename().split(".").pop() ?? "png";
  const base64 = (await readFile(file)).toString("base64");
  if (!(await page.evaluate(() => "jsQR" in window))) await page.addScriptTag({ path: JSQR });

  return page.evaluate(
    async ({ base64, mime }) => {
      const image = new Image();
      image.src = `data:${mime};base64,${base64}`;
      await image.decode();
      const width = image.naturalWidth || 1024;
      const height = image.naturalHeight || 1024;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d")!;
      // Transparent codes are scanned on white, as they would be printed.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height);
      type JsQR = (data: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
      const jsQR = (window as unknown as { jsQR: JsQR }).jsQR;
      return jsQR(pixels.data, width, height)?.data ?? null;
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
