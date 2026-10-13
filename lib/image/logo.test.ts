import { describe, expect, it } from "vitest";

import { LOGO_MAX_BYTES, validateLogoFile } from "./logo";

describe("validateLogoFile", () => {
  it("accepts common image types under the size limit", () => {
    expect(validateLogoFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateLogoFile({ type: "image/svg+xml", size: 1000 })).toBeNull();
  });

  it("rejects other types and large files", () => {
    expect(validateLogoFile({ type: "application/pdf", size: 1000 })).toMatch(/PNG/);
    expect(validateLogoFile({ type: "image/png", size: LOGO_MAX_BYTES + 1 })).toMatch(/5 MB/);
  });
});
