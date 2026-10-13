import { describe, expect, it } from "vitest";

import { composeFrame, frameLayout, svgInner, textColorOn } from "./frame";
import { textWidthEm } from "./text-metrics";
import { FRAME_STYLE_IDS } from "./types";

const CODE = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><rect x="10" y="10" width="20" height="20" fill="#000"/></svg>`;

describe("frames", () => {
  it("keep the code square, whole-pixel and inside the artwork", () => {
    for (const style of FRAME_STYLE_IDS) {
      const layout = frameLayout(style, 1000);
      expect(layout.width, style).toBe(1000);
      expect(Number.isInteger(layout.qr.size), style).toBe(true);
      expect(layout.qr.x + layout.qr.size, style).toBeLessThanOrEqual(1000);
      expect(layout.qr.y + layout.qr.size, style).toBeLessThanOrEqual(layout.height);
      if (style === "none") expect(layout.height).toBe(1000);
      else expect(layout.height, style).toBeGreaterThan(1000);
    }
  });

  it("wrap the code and its call to action in one SVG", () => {
    const layout = frameLayout("bottom", 1000);
    const svg = composeFrame(CODE, layout, {
      style: "bottom",
      text: "Scan <me> & save",
      color: "#3730A3",
      background: "#FFFFFF",
    });
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.documentElement.getAttribute("height")).toBe(String(layout.height));
    const text = doc.querySelector("text")!;
    expect(text.textContent).toBe("Scan <me> & save");
    expect(text.getAttribute("fill")).toBe("#FFFFFF");
    // The code is clipped to the rounded inner panel and placed at the layout position.
    expect(doc.querySelector("clipPath#qq-frame-inner")).not.toBeNull();
    expect(svg).toContain(`translate(${layout.qr.x} ${layout.qr.y})`);
  });

  it("shrink long text to fit and leave empty text out", () => {
    const layout = frameLayout("badge", 1000);
    const long = composeFrame(CODE, layout, {
      style: "badge",
      text: "Scan for the full dinner menu",
      color: "#000",
      background: null,
    });
    const size = Number(/font-size="([\d.]+)"/.exec(long)![1]);
    expect(size * textWidthEm("Scan for the full dinner menu")).toBeLessThanOrEqual(1000 * 0.8);
    const empty = composeFrame(CODE, layout, {
      style: "badge",
      text: "   ",
      color: "#000",
      background: null,
    });
    expect(empty).not.toContain("<text");
  });

  it("pick readable label text", () => {
    expect(textColorOn("#0F172A")).toBe("#FFFFFF");
    expect(textColorOn("#FDE68A")).toBe("#0F172A");
  });

  it("extract the inside of an SVG document", () => {
    expect(svgInner(CODE)).toBe(
      '<rect width="100" height="100" fill="#fff"/><rect x="10" y="10" width="20" height="20" fill="#000"/>',
    );
    expect(() => svgInner("<div/>")).toThrow();
  });
});

describe("text metrics", () => {
  it("measure Helvetica Bold", () => {
    // S C A N space M E = 667 + 722 + 722 + 722 + 278 + 833 + 667
    expect(textWidthEm("SCAN ME")).toBeCloseTo(4.611, 3);
    expect(textWidthEm("Café")).toBeCloseTo(textWidthEm("Cafe"), 5);
  });
});
