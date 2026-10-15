import { expect, test, type Page } from "@playwright/test";

import { expectFitsPhone, expectNoSidewaysScroll, overscrollY } from "../phone-fit";
import { OWNER, seed } from "./fixtures";

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

const APP_PAGES = [
  "codes",
  "codes?folder={folder}",
  "codes/new",
  "codes/bulk",
  "codes/{menu}",
  "codes/{menu}/edit",
  "codes/{menu}/analytics",
  "team",
  "settings",
  "settings/security",
  "settings/api-keys",
  "settings/account",
];

const resolve = (path: string) =>
  path.replace("{menu}", seed().menuId).replace("{folder}", seed().folderId);

async function settled(page: Page) {
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
}

test.describe("signed in", () => {
  test.use({ storageState: OWNER.state });

  for (const path of APP_PAGES) {
    test(`/${path} ends where its content ends`, async ({ page }) => {
      await page.goto(resolve(path));
      await settled(page);
      // The editors build their form in the browser; measure once the Create bar is up.
      if (path === "codes/new" || path.endsWith("/edit")) {
        await expect(page.locator("[data-actionbar]")).toBeVisible();
      }
      await expectNoSidewaysScroll(page);
      await expectFitsPhone(page);
    });
  }

  test("app pages don't bounce past their end", async ({ page }) => {
    await page.goto("codes");
    await settled(page);
    expect(await overscrollY(page)).toBe("none");
  });

  test("small tablets and landscape phones clear the Create bar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Pixel 7", "one width between 640 and 767px is enough");
    await page.setViewportSize({ width: 700, height: 390 });
    await page.goto("codes/new");
    await settled(page);
    await expect(page.locator("[data-actionbar]")).toBeVisible();
    await expectFitsPhone(page, "#main", 40);
  });
});
