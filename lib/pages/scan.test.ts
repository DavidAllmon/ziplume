import jsQR from "jsqr";
import { describe, expect, it } from "vitest";

import { barcodeProblem, CODE128, code128Widths, qrModules } from "./scan";

/** Draws the modules 4 px each, with a quiet zone, and reads them back with jsQR. */
function decode(modules: boolean[][]): string | null {
  const n = modules.length;
  const scale = 4;
  const size = (n + 8) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  modules.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (!dark) return;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const i = (((r + 4) * scale + dy) * size + (c + 4) * scale + dx) * 4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        }
    }),
  );
  return jsQR(pixels, size, size)?.data ?? null;
}

describe("a coupon's QR code", () => {
  it("decodes back to the code, accents included", () => {
    expect(decode(qrModules("SPRING20"))).toBe("SPRING20");
    expect(decode(qrModules("CAFÉ-10"))).toBe("CAFÉ-10");
  });
});

describe("a coupon's Code 128 barcode", () => {
  it("has the standard 107 patterns, each 11 modules wide (Stop 13), all different", () => {
    expect(CODE128).toHaveLength(107);
    CODE128.forEach((pattern, i) => {
      const width = [...pattern].reduce((sum, d) => sum + Number(d), 0);
      expect(width, `pattern ${i}`).toBe(i === 106 ? 13 : 11);
    });
    expect(new Set(CODE128).size).toBe(107);
    // Spot checks against the published table: space, "0", "A", Start B and Stop.
    expect(CODE128[0]).toBe("212222");
    expect(CODE128[16]).toBe("123122");
    expect(CODE128[33]).toBe("111323");
    expect(CODE128[104]).toBe("211214");
    expect(CODE128[106]).toBe("2331112");
  });

  it("encodes Start B, the characters, the check value and Stop", () => {
    // "PJJ123C": check = (104 + 1·48 + 2·42 + 3·42 + 4·17 + 5·18 + 6·19 + 7·35) mod 103 = 55.
    const widths = code128Widths("PJJ123C")!;
    const chunk = (from: number, n: number) => widths.slice(from, from + n).join("");
    expect(widths).toHaveLength(9 * 6 + 7);
    expect(chunk(0, 6)).toBe(CODE128[104]);
    expect(chunk(6, 6)).toBe(CODE128[48]);
    expect(chunk(48, 6)).toBe(CODE128[55]);
    expect(chunk(54, 7)).toBe(CODE128[106]);
  });

  it("holds up to 20 plain characters, and asks for a QR code for anything else", () => {
    expect(barcodeProblem("SAVE-20 NOW")).toBeNull();
    expect(barcodeProblem("A".repeat(21))).toMatch(/up to 20/);
    expect(barcodeProblem("CAFÉ")).toMatch(/QR code/);
    expect(code128Widths("CAFÉ")).toBeNull();
    expect(code128Widths("")).toBeNull();
  });
});
