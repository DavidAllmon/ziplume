import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
/** Everything people can see comes from these folders. */
const FOLDERS = ["app", "components", "features", "lib", "emails", "public/email-templates"];
const TEXT = new Set([".ts", ".tsx", ".html", ".css", ".txt", ".mjs"]);
const OLD_NAME = /quick\s?q\s?r?eate/i;
/** Internal names that keep the old spelling on purpose (spec 4.7 and 5.7). */
const ALLOWED = [
  /quickqreate\.invalid/, // sentinel base URL for parsing redirect paths
  /UID:\$\{uid\}@quickqreate/, // calendar event ids: changing them duplicates events
  /quickqreate:v1/, // legacy key the generator only deletes
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return TEXT.has(extname(name)) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("the old name", () => {
  it("appears nowhere people can see it", () => {
    const leftovers = FOLDERS.flatMap((folder) => files(resolve(ROOT, folder))).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .map((line, i) => ({ line, at: `${relative(ROOT, path)}:${i + 1}` }))
        .filter(({ line }) => OLD_NAME.test(line) && !ALLOWED.some((ok) => ok.test(line)))
        .map(({ at, line }) => `${at}  ${line.trim()}`),
    );
    expect(leftovers).toEqual([]);
  });
});

describe("the old address", () => {
  it("appears nowhere people can see it (it lives on only in LEGACY_HOSTS)", () => {
    const leftovers = [...FOLDERS, "scripts"]
      .flatMap((folder) => files(resolve(ROOT, folder)))
      .flatMap((path) =>
        readFileSync(path, "utf8")
          .split("\n")
          .map((line, i) => ({ line, at: `${relative(ROOT, path)}:${i + 1}` }))
          .filter(({ line }) => /qr\.techitdave\.com/i.test(line))
          .map(({ at, line }) => `${at}  ${line.trim()}`),
      );
    expect(leftovers).toEqual([]);
  });
});
