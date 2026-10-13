import { describe, expect, it } from "vitest";

import { detectDelimiter, parseCsv } from "./parse";

describe("parseCsv", () => {
  it("reads quoted fields with commas, quotes and line breaks", () => {
    const text = 'name,text\r\n"Hello, world","She said ""hi""\nthen left"\r\n';
    expect(parseCsv(text)).toEqual([
      ["name", "text"],
      ["Hello, world", 'She said "hi"\nthen left'],
    ]);
  });

  it("skips blank lines, keeps empty cells and ignores a byte order mark", () => {
    expect(parseCsv("﻿a,b,c\n\n1,,3\n,,\n")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });

  it("handles a last line without a line break", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("detects semicolons and tabs", () => {
    expect(detectDelimiter("name;url\nA;b")).toBe(";");
    expect(detectDelimiter("name\turl\nA\tb")).toBe("\t");
    expect(detectDelimiter('"a,b";c')).toBe(";");
    expect(detectDelimiter("url")).toBe(",");
    expect(parseCsv("name\turl\nMenu\thttps://example.com")).toEqual([
      ["name", "url"],
      ["Menu", "https://example.com"],
    ]);
  });
});
