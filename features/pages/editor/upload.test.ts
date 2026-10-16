import { describe, expect, it } from "vitest";

import { checkFile } from "./upload";

const MB = 1024 * 1024;
const file = (type: string, size: number, name = "f") => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("checkFile", () => {
  it("caps PDFs at 10 MB, audio at 15 MB and images at 15 MB", () => {
    expect(checkFile(file("application/pdf", 10 * MB), "pdf")).toBeNull();
    expect(checkFile(file("application/pdf", 10 * MB + 1), "pdf")).toBe("PDFs can be up to 10 MB.");
    expect(checkFile(file("audio/mpeg", 15 * MB), "audio")).toBeNull();
    expect(checkFile(file("audio/mpeg", 15 * MB + 1), "audio")).toBe(
      "Audio files can be up to 15 MB.",
    );
    expect(checkFile(file("image/jpeg", 15 * MB + 1), "image")).toBe("Images can be up to 15 MB.");
  });
});
