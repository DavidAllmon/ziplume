// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The iPhone home-indicator area can't be emulated in the browser tests, so pin it here.
const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("phone layout variables", () => {
  it("count the iPhone home-indicator area into the tab bar's height", () => {
    expect(css).toContain("--tabbar-h: calc(3.5rem + 1px + env(safe-area-inset-bottom))");
  });

  it("count it into the Create bar on small tablets, where the bar sits on the bottom edge", () => {
    expect(css).toContain("--actionbar-h: calc(4.25rem + 1px + env(safe-area-inset-bottom))");
  });

  // Some WebKit versions read it from body rather than html.
  it("turn off the end-of-page bounce on app pages only, on html and body", () => {
    expect(css).toMatch(
      /html:has\(\[data-app-shell\]\),\s*html:has\(\[data-app-shell\]\) body\s*\{\s*overscroll-behavior-y: none;/,
    );
  });
});
