import { expect, test } from "@playwright/test";

import { expectNoSidewaysScroll } from "../phone-fit";

// Phone layout with accounts on: the signed-out site (its header has a Sign in button), the
// signed-in app and hosted pages, on every phone profile in e2e/phones.ts.

test.describe("signed out", () => {
  for (const path of ["", "login", "signup", "privacy"]) {
    test(`/${path} fits the screen's width`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expectNoSidewaysScroll(page);
    });
  }
});
