// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as Env from "@/lib/env";

import { GET, HEAD } from "./route";

vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof Env>()),
  SUPABASE_URL: "https://project.example",
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
afterEach(() => fetchMock.mockReset());

const call = (handler: typeof GET, path: string[], headers: Record<string, string> = {}) =>
  handler(
    new Request(`https://ziplume.com/storage/v1/object/public/${path.join("/")}`, {
      method: handler === HEAD ? "HEAD" : "GET",
      headers,
    }),
    { params: Promise.resolve({ path }) },
  );

describe("public files through the site", () => {
  it("come from the Supabase project, byte ranges and all", async () => {
    fetchMock.mockResolvedValue(
      new Response("abcd", {
        status: 206,
        headers: {
          "content-type": "audio/mpeg",
          "content-range": "bytes 0-3/100",
          "cache-control": "max-age=31536000",
          "set-cookie": "x=1",
        },
      }),
    );
    const response = await call(GET, ["page-media", "u1", "a b.mp3"], { range: "bytes=0-3" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://project.example/storage/v1/object/public/page-media/u1/a%20b.mp3");
    expect(new Headers(init.headers).get("range")).toBe("bytes=0-3");
    expect(response.status).toBe(206);
    expect(await response.text()).toBe("abcd");
    expect(response.headers.get("content-range")).toBe("bytes 0-3/100");
    expect(response.headers.get("cache-control")).toBe("max-age=31536000");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("stay at Cloudflare's edge only ten minutes, so removed files stop being served soon after", async () => {
    fetchMock.mockResolvedValue(new Response("png", { headers: { "content-type": "image/png" } }));
    const response = await call(GET, ["avatars", "u1", "a.png"]);
    expect(response.headers.get("cloudflare-cdn-cache-control")).toBe("max-age=600");
  });

  it("answer HEAD without a body, and pass on not-found", async () => {
    fetchMock.mockResolvedValue(new Response("gone", { status: 404 }));
    const response = await call(HEAD, ["avatars", "u1", "missing.png"]);
    expect(fetchMock.mock.calls[0]![1].method).toBe("HEAD");
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
});
