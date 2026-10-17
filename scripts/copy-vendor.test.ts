import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { copyVendor, VENDOR_FILES } from "./copy-vendor.mjs";

describe("copy-vendor", () => {
  it("copies pdf.js's browser build and worker into public/vendor/pdfjs", () => {
    const out = mkdtempSync(join(tmpdir(), "vendor-"));
    copyVendor(out);
    for (const name of VENDOR_FILES) {
      const copied = join(out, "pdfjs", name);
      expect(existsSync(copied), name).toBe(true);
      expect(readFileSync(copied).length).toBeGreaterThan(10_000);
    }
  });
});
