// Copies pdf.js's browser files into public/vendor/pdfjs, where the editor loads them from when
// a PDF is uploaded (to draw its first-page preview). They're served as plain files: not bundled,
// and not in the service worker's precache (which takes only .next/static and the icons), so
// visitors never download them.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const VENDOR_FILES = ["pdf.min.mjs", "pdf.worker.min.mjs"];

export function copyVendor(out = join(root, "public", "vendor")) {
  const dir = join(out, "pdfjs");
  mkdirSync(dir, { recursive: true });
  for (const name of VENDOR_FILES) {
    // The legacy build: the modern one needs JavaScript newer than many phones and browsers have.
    copyFileSync(
      join(root, "node_modules", "pdfjs-dist", "legacy", "build", name),
      join(dir, name),
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) copyVendor();
