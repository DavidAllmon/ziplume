import { expect, test } from "@playwright/test";

// The test server runs without Supabase, the way a fresh checkout does: the generator works
// and every account surface stays out of the way.
test.describe("without accounts configured", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Server behaviour is viewport-independent");
  });

  test("health check reports accounts off", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({ ok: true, accounts: false });
  });

  test("account pages are not reachable", async ({ request }) => {
    for (const path of ["/login", "/signup", "/forgot-password", "/dashboard", "/account"]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
    }
  });

  test("the header offers no sign-in, but does offer support", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: /sign in/i })).toHaveCount(0);
    await expect(header.getByRole("link", { name: /buy me a coffee/i })).toBeVisible();
  });

  test("short links explain they're unavailable instead of failing", async ({ request }) => {
    const response = await request.get("/r/ABC234", { maxRedirects: 0 });
    expect(response.status()).toBe(503);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.text()).toContain("Temporarily unavailable");
  });

  test("uppercase short links (as encoded in QR codes) reach the same route", async ({
    request,
  }) => {
    const response = await request.get("/R/ABC234", { maxRedirects: 0 });
    expect(response.status()).toBe(503);
  });

  test("malformed short links are a plain 404", async ({ request }) => {
    const response = await request.get("/r/%3Cscript%3E", { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  });
});
