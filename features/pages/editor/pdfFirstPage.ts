"use client";

import type * as PdfJsModule from "pdfjs-dist";

import { isBlank, pdfOptions, previewHeight } from "./pdfOptions";

// Draws a PDF's first page as an image, in the browser, when it's uploaded (spec item 40).
// pdf.js comes from the site's own files (scripts/copy-vendor.mjs), loaded only now, and runs
// in a worker. It isn't bundled or precached, so visitors never download it (ruling 7).

type PdfJs = typeof PdfJsModule;
const BASE = "/vendor/pdfjs";
let loading: Promise<PdfJs> | null = null;

function load(): Promise<PdfJs> {
  loading ??= (
    import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ `${BASE}/pdf.min.mjs`
    ) as Promise<PdfJs>
  ).then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.mjs`;
    return pdfjs;
  });
  return loading;
}

/**
 * Page 1 as a WebP `width` pixels wide (its top, for a very tall page), or null when the file
 * can't be drawn or came out blank.
 */
export async function pdfFirstPage(file: File, width = 800): Promise<Blob | null> {
  try {
    const pdfjs = await load();
    const task = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      ...pdfOptions(new URL(BASE, window.location.origin).href),
    });
    try {
      const doc = await task.promise;
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
      const drawn = document.createElement("canvas");
      drawn.width = Math.round(viewport.width);
      drawn.height = Math.round(viewport.height);
      const context = drawn.getContext("2d");
      if (!context) return null;
      await page.render({ canvas: drawn, canvasContext: context, viewport }).promise;
      // Its top only, for a receipt-shaped page, so the preview stays page-shaped.
      const canvas = document.createElement("canvas");
      canvas.width = drawn.width;
      canvas.height = previewHeight(drawn.width, drawn.height);
      const top = canvas.getContext("2d");
      if (!top) return null;
      top.drawImage(drawn, 0, 0);
      if (isBlank(top.getImageData(0, 0, canvas.width, canvas.height).data)) return null;
      return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.85),
      );
    } finally {
      // Frees the worker's copy of the document.
      await task.destroy();
    }
  } catch {
    // An unusual or protected PDF: it still uploads, just without a preview (ruling 8).
    return null;
  }
}
