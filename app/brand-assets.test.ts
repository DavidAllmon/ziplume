import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { markSvg } from "@/components/brand/mark";

import manifest from "./manifest";

const file = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("brand assets", () => {
  it("are drawn from the current mark (run npm run brand after changing it)", () => {
    expect(file("app/icon.svg")).toBe(markSvg("tile"));
    expect(file("public/brand/logo-mark.svg")).toBe(markSvg("light"));
    expect(file("public/brand/logo-mark-dark.svg")).toBe(markSvg("dark"));
  });

  it("name Ziplume in the web app manifest and image descriptions", () => {
    const m = manifest();
    expect(m.name).toBe("Ziplume");
    expect(m.short_name).toBe("Ziplume");
    expect(m.theme_color).toBe("#0A1330");
    expect(m.background_color).toBe("#FFFFFF");
    for (const alt of ["app/opengraph-image.alt.txt", "app/twitter-image.alt.txt"]) {
      expect(file(alt)).toMatch(/^Ziplume: Make it\. Link it\. Share it\./);
    }
  });
});
