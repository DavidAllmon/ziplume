import { describe, expect, it } from "vitest";

import { uniqueFilenames } from "./zip";

describe("uniqueFilenames", () => {
  it("makes safe, unique names with the format's extension", () => {
    expect(uniqueFilenames(["Menu", "menu", "Café Ünïcode!", "", "Menu"], "jpeg")).toEqual([
      "menu.jpg",
      "menu-2.jpg",
      "cafe-unicode.jpg",
      "qr-code-4.jpg",
      "menu-3.jpg",
    ]);
  });
});
