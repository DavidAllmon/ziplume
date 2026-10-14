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
    for (const path of [
      "/login",
      "/signup",
      "/forgot-password",
      "/codes",
      "/team",
      "/settings",
      "/settings/security",
      `/invite/${"ab".repeat(24)}`,
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
    }
  });

  test("old account addresses move to the new ones, keeping their query", async ({ request }) => {
    for (const [from, to] of [
      ["/dashboard", "/codes"],
      ["/dashboard?workspace=abc", "/codes?workspace=abc"],
      ["/dashboard/team", "/team"],
      ["/dashboard/codes/abc", "/codes/abc"],
      ["/dashboard/codes/abc/analytics?range=30d", "/codes/abc/analytics?range=30d"],
      ["/account", "/settings"],
    ] as const) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBe(308);
      expect(response.headers().location, from).toBe(to);
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

  test("hosted pages are not served", async ({ request }) => {
    expect((await request.get("/p/ABC234")).status()).toBe(404);
    expect((await request.get("/p/ABC234/event.ics")).status()).toBe(404);
    expect((await request.get("/p/ABC234/contact.vcf")).status()).toBe(404);
    const feedback = await request.post("/p/ABC234/feedback", { data: { rating: 5 } });
    expect(feedback.status()).toBe(503);
  });

  test("hosted page types explain they need accounts", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Menu", exact: true }).click();
    await expect(page.getByText("Hosted pages aren’t available on this server yet.")).toBeVisible();
  });

  test("the API answers with JSON errors and CORS headers", async ({ request }) => {
    const key = `qq_${"a".repeat(48)}`;
    for (const path of ["/api/v1/codes", "/api/v1/qr?data=hi"]) {
      const response = await request.get(path, { headers: { authorization: `Bearer ${key}` } });
      expect(response.status(), path).toBe(503);
      expect(response.headers()["access-control-allow-origin"]).toBe("*");
      expect((await response.json()).error.code).toBe("unavailable");
    }
    const preflight = await request.fetch("/api/v1/codes", { method: "OPTIONS" });
    expect(preflight.status()).toBe(204);
    expect(preflight.headers()["access-control-allow-methods"]).toContain("PATCH");
  });

  test("the developer docs explain the API isn't on this copy", async ({ page }) => {
    await page.goto("/developers");
    await expect(page.getByRole("heading", { name: "Developers", level: 1 })).toBeVisible();
    await expect(page.getByText("isn’t available on this copy of the site")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Endpoints" })).toBeVisible();
  });
});
