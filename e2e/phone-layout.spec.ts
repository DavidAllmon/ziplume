import { expect, test } from "@playwright/test";

import { expectFitsPhone, expectNoSidewaysScroll, overscrollY } from "./phone-fit";

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
