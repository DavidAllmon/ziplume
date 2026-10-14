import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = resolve(process.cwd(), "public/email-templates");

describe("email templates", () => {
  it("link only to current app addresses", () => {
    for (const file of readdirSync(DIR).filter((name) => name.endsWith(".html"))) {
      const html = readFileSync(resolve(DIR, file), "utf8");
      expect(html, file).not.toMatch(/next=\/dashboard|next=\/account(?!\/update-password)/);
    }
  });
});
