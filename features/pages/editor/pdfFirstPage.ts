"use client";

import type * as PdfJsModule from "pdfjs-dist";

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

/** Page 1 as a WebP `width` pixels wide, or null when the file can't be drawn. */
export async function pdfFirstPage(file: File, width = 800): Promise<Blob | null> {
  try {
    const pdfjs = await load();
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      const doc = await task.promise;
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) return null;
      await page.render({ canvas, canvasContext: context, viewport }).promise;
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
