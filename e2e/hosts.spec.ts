import { expect, test } from "@playwright/test";

// playwright.config.ts starts the server with LEGACY_HOSTS=qr.techitdave.com. These requests say
// they're for that host, like a scan of a printed code.
const OLD = { host: "qr.techitdave.com" };

test.describe("the old address", () => {
  test("serves short links and hosted pages itself", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "host rules don't depend on the viewport");
    for (const path of ["/r/AB3X9Q", "/R/AB3X9Q", "/p/MENU12", "/api/health", "/sw.js"]) {
      const response = await request.get(path, { headers: OLD, maxRedirects: 0 });
      expect(response.status(), path).not.toBe(308);
    }
  });

  test("forwards everything else with its path and query", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "host rules don't depend on the viewport");
    for (const path of ["/", "/codes?folder=f1&x=%20y", "/login?next=%2Fcodes"]) {
      const response = await request.get(path, { headers: OLD, maxRedirects: 0 });
      expect(response.status(), path).toBe(308);
      // The site address (CI builds with http://localhost:4173), never the old host again.
      const location = new URL(response.headers()["location"]!, "http://localhost:4173");
      expect(location.hostname).not.toBe("qr.techitdave.com");
      // Next re-encodes the query before proxy.ts sees it (a space becomes "+"), so compare the
      // values every reader decodes, not the bytes.
      const sent = new URL(path, "http://localhost:4173");
      expect(location.pathname).toBe(sent.pathname);
      expect([...location.searchParams]).toEqual([...sent.searchParams]);
    }
  });

  test("takes feedback from its own hosted pages", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "host rules don't depend on the viewport");
    const send = (origin: string) =>
      request.post("/p/MENU12/feedback", { headers: { ...OLD, origin }, data: { rating: 5 } });
    // The public suite has no database, so an accepted post ends at "unavailable" (503).
    expect((await send("https://qr.techitdave.com")).status()).not.toBe(403);
    expect((await send("https://evil.example")).status()).toBe(403);
  });
});

test("the site address and the health check are never forwarded", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "host rules don't depend on the viewport");
  expect((await request.get("/", { maxRedirects: 0 })).status()).toBe(200);
  expect((await request.get("http://127.0.0.1:4173/", { maxRedirects: 0 })).status()).toBe(200);
  expect(
    (await request.get("http://127.0.0.1:4173/api/health", { maxRedirects: 0 })).status(),
  ).toBe(200);
});
