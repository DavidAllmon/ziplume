import { describe, expect, it } from "vitest";

import { buildFilename, slugify } from "./filename";

describe("filenames", () => {
  it("slugifies labels", () => {
    expect(slugify("Café Wi-Fi 🎉 (5G)")).toBe("cafe-wi-fi-5g");
    expect(slugify("   ")).toBe("");
    expect(slugify("a".repeat(60))).toHaveLength(40);
  });

  it("builds readable names", () => {
    expect(buildFilename("wifi", "HomeNet", "png")).toBe("quickqreate-wifi-homenet.png");
    expect(buildFilename("text", "", "svg")).toBe("quickqreate-text.svg");
  });
});
