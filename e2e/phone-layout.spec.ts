import { expect, test } from "@playwright/test";

import { expectFitsPhone, expectNoScroll, expectNoSidewaysScroll, overscrollY } from "./phone-fit";

// Signed-out pages on phone sizes. The signed-in app and hosted pages are checked in
// e2e/accounts/phone-layout.spec.ts.
for (const path of ["bulk", "privacy"]) {
  test(`/${path} ends where its content ends`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    await expectNoSidewaysScroll(page);
    // The site footer keeps 2rem under its last line.
    await expectFitsPhone(page, "body", 40);
  });
}

test("the public site keeps pull-to-refresh", async ({ page }) => {
  await page.goto("privacy");
  expect(await overscrollY(page)).toBe("auto");
});

test("the home page's footer clears the preview bar", async ({ page }) => {
  await page.goto("");
  await expect(page.locator("main h1").first()).toBeVisible();
  await expectNoSidewaysScroll(page);
  // The site footer keeps 2rem under its last line.
  await expectFitsPhone(page, "body", 40);
});

test("a short link's status page fits on the screen", async ({ page }) => {
  // Without accounts, every short link answers with the "temporarily unavailable" page.
  const response = await page.goto("r/ABC234");
  expect(response?.status()).toBe(503);
  await expect(page.getByRole("heading", { name: "Temporarily unavailable" })).toBeVisible();
  await expectNoScroll(page);
});
