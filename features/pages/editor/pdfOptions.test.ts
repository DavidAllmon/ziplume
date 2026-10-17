// @vitest-environment node
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import { isBlank, pdfOptions, previewHeight } from "./pdfOptions";

// pdf.js's legacy build, as the editor loads it, running here on its own Node canvas.
const PDFJS = join(process.cwd(), "node_modules", "pdfjs-dist");
const load = async () => {
  const pdfjs = await import(pathToFileURL(join(PDFJS, "legacy", "build", "pdf.mjs")).href);
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    join(PDFJS, "legacy", "build", "pdf.worker.mjs"),
  ).href;
  return pdfjs;
};

/** A one-page PDF filled by an 8×8 black image, encoded as an office scanner would (CCITT G4). */
function scannedPdf(): Uint8Array {
  const bits = ("001 00110101 000101" + "11".repeat(7) + "000000000001000000000001").replace(
    /\s/g,
    "",
  );
  const padded = bits.padEnd(Math.ceil(bits.length / 8) * 8, "0");
  const image = Buffer.from(padded.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const content = "q 300 0 0 400 0 0 cm /Im1 Do Q";
  const parts: Buffer[] = [Buffer.from("%PDF-1.5\n")];
  const offsets: number[] = [];
  let length = parts[0]!.length;
  const push = (b: Buffer) => {
    parts.push(b);
    length += b.length;
  };
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 400]/Resources<</XObject<</Im1 5 0 R>>>>/Contents 4 0 R>>",
  ];
  for (let i = 0; i < 5; i++) {
    offsets.push(length);
    if (i < 3) push(Buffer.from(`${i + 1} 0 obj${objects[i]}endobj\n`));
    else if (i === 3)
      push(
        Buffer.from(`4 0 obj<</Length ${content.length}>>stream\n${content}\nendstream endobj\n`),
      );
    else {
      push(
        Buffer.from(
          `5 0 obj<</Type/XObject/Subtype/Image/Width 8/Height 8/BitsPerComponent 1/ColorSpace/DeviceGray/Filter/CCITTFaxDecode/DecodeParms<</K -1/Columns 8/Rows 8>>/Length ${image.length}>>stream\n`,
        ),
      );
      push(image);
      push(Buffer.from("\nendstream endobj\n"));
    }
  }
  const xref = length;
  push(
    Buffer.from(
      "xref\n0 6\n0000000000 65535 f \n" +
        offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("") +
        `trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`,
    ),
  );
  return new Uint8Array(Buffer.concat(parts));
}

async function firstPagePixels(options: object): Promise<Uint8ClampedArray> {
  const pdfjs = await load();
  const task = pdfjs.getDocument({ data: scannedPdf(), verbosity: 0, ...options });
  try {
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const { canvas, context } = doc.canvasFactory.create(viewport.width, viewport.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return context.getImageData(0, 0, canvas.width, canvas.height).data;
  } finally {
    await task.destroy();
  }
}

describe("PDF first-page previews", () => {
  it("draws a scanned page, using pdf.js's image decoders", async () => {
    const base = pathToFileURL(PDFJS).href;
    expect(isBlank(await firstPagePixels(pdfOptions(base)))).toBe(false);
  });

  it("calls a page that came out all white blank, so the PDF icon shows instead", async () => {
    // Without the decoders, the scanned image is skipped and the page is drawn white.
    expect(isBlank(await firstPagePixels({}))).toBe(true);
    expect(isBlank(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 0]))).toBe(true);
    expect(isBlank(new Uint8ClampedArray([255, 255, 255, 255, 30, 30, 30, 255]))).toBe(false);
  });

  it("keeps a tall page's top, at most one and a half times as tall as wide", () => {
    expect(previewHeight(800, 1131)).toBe(1131);
    expect(previewHeight(800, 8000)).toBe(1200);
    expect(previewHeight(800, 600)).toBe(600);
  });
});
