// @vitest-environment node
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

import { serviceWorkerSource } from "./sw-template.mjs";

type WorkerEvent = { waitUntil(promise: Promise<unknown>): void };

/** Runs the worker against fake caches. `home` is how the server answers "/". */
async function run(
  name: "install" | "activate",
  home: { ok: boolean } | Error,
  existing: string[] = [],
) {
  const listeners: Record<string, (event: WorkerEvent) => void> = {};
  const added: string[] = [];
  const put: string[] = [];
  const deleted: string[] = [];
  let skipped = false;
  const cache = {
    addAll: async (urls: string[]) => void added.push(...urls),
    put: async (key: string) => void put.push(key),
  };
  runInNewContext(
    serviceWorkerSource({ version: "abc123", urls: ["/icon.svg", "/_next/static/a.js"] }),
    {
      self: {
        addEventListener: (event: string, listener: (event: WorkerEvent) => void) =>
          (listeners[event] = listener),
        skipWaiting: async () => void (skipped = true),
        clients: { claim: async () => undefined },
        location: { origin: "https://qr.techitdave.com" },
      },
      caches: {
        open: async () => cache,
        keys: async () => existing,
        delete: async (key: string) => void deleted.push(key),
        match: async () => undefined,
      },
      fetch: async () => {
        if (home instanceof Error) throw home;
        return home;
      },
      URL,
    },
  );
  const work: Promise<unknown>[] = [];
  listeners[name]!({ waitUntil: (promise) => void work.push(promise) });
  await Promise.all(work);
  return { added, put, deleted, skipped };
}

describe("the offline helper", () => {
  it("precaches the build files and the home page", async () => {
    const result = await run("install", { ok: true });
    expect(result.added).toEqual(["/icon.svg", "/_next/static/a.js"]);
    expect(result.put).toEqual(["/"]);
    expect(result.skipped).toBe(true);
  });

  it("still installs where the home page forwards (the old address)", async () => {
    const result = await run("install", { ok: false });
    expect(result.put).toEqual([]);
    expect(result.skipped).toBe(true);
  });

  it("still installs when the home page can't be fetched", async () => {
    expect((await run("install", new TypeError("offline"))).skipped).toBe(true);
  });

  it("removes old caches under both names and keeps its own", async () => {
    const result = await run("activate", { ok: true }, [
      "quickqreate-111",
      "ziplume-222",
      "ziplume-abc123",
      "other-cache",
    ]);
    expect(result.deleted).toEqual(["quickqreate-111", "ziplume-222"]);
  });
});
