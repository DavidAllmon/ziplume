import { describe, expect, it } from "vitest";

import { MAX_BYTES, measure } from "./capacity";
import { toUtf8BinaryString, utf8ByteLength } from "./utf8";

describe("utf8", () => {
  it("counts bytes, not characters", () => {
    expect(utf8ByteLength("abc")).toBe(3);
    expect(utf8ByteLength("é")).toBe(2);
    expect(utf8ByteLength("🎉")).toBe(4);
  });

  it("produces one char per byte", () => {
    const binary = toUtf8BinaryString("é🎉");
    expect(binary).toHaveLength(6);
    expect([...binary].every((c) => c.charCodeAt(0) < 256)).toBe(true);
  });
});

describe("measure", () => {
  it("reports module count for short content", () => {
    const result = measure("https://example.com", "M");
    expect(result.fits).toBe(true);
    expect(result.modules).toBeGreaterThanOrEqual(21);
  });

  it("grows with error correction", () => {
    const data = "https://example.com/some/long/path?with=parameters&and=more";
    expect(measure(data, "H").modules!).toBeGreaterThan(measure(data, "L").modules!);
  });

  it("detects overflow per level", () => {
    const data = "x".repeat(MAX_BYTES.H + 10);
    expect(measure(data, "H").fits).toBe(false);
    expect(measure(data, "L").fits).toBe(true);
  });

  it("treats empty data as fitting with no modules", () => {
    expect(measure("", "M")).toMatchObject({ fits: true, modules: null, bytes: 0 });
  });
});
