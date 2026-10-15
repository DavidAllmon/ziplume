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

  test("toasts appear above the Create bar and the tab bar", async ({ page }) => {
    await page.goto("codes/new");
    await settled(page);
    // The stack is empty and zero-height until a toast shows; its bottom edge is where they
    // stack from.
    const stackBottom = await page
      .locator("[data-toasts]")
      .evaluate((el) => el.getBoundingClientRect().bottom);
    const barTop = await page
      .locator("[data-actionbar]")
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(stackBottom).toBeLessThanOrEqual(barTop);
  });

  for (const wide of [false, true]) {
    test(`the selection bar holds its place at the end of the list${wide ? " (700px)" : ""}`, async ({
      page,
    }, testInfo) => {
      test.skip(wide && testInfo.project.name !== "Pixel 7", "one width from 640px up is enough");
      // Short enough that the two seeded codes scroll.
      await page.setViewportSize({ width: wide ? 700 : page.viewportSize()!.width, height: 420 });
      await page.goto("codes");
      await settled(page);
      await page
        .getByRole("checkbox", { name: "Select Spring menu" })
        .filter({ visible: true })
        .check();
      const bar = page.getByRole("region", { name: "Selected codes" });
      await expect(bar).toBeVisible();
      const scrollTo = async (fromEnd: number) => {
        await page.evaluate(
          (offset) =>
            window.scrollTo(0, document.documentElement.scrollHeight - innerHeight - offset),
          fromEnd,
        );
        await page.evaluate(
          () =>
            new Promise<void>((done) =>
              requestAnimationFrame(() => requestAnimationFrame(() => done())),
            ),
        );
      };
      // Just before the end it's stuck to the bottom; at the end it's back in the list. The two
      // must match, or the bar jumps as the list ends.
      await scrollTo(60);
      const stuck = (await bar.boundingBox())!;
      await scrollTo(0);
      const atEnd = (await bar.boundingBox())!;
      expect(atEnd.y).toBeCloseTo(stuck.y, 0);
    });
  }

  test("jumping to the download card keeps it clear of the phone header", async ({ page }) => {
    await page.goto(`codes/${seed().menuId}#download`);
    await settled(page);
    // scrollIntoView honours scroll-margin-top, like the browser's jump to #download after a
    // code is created, without depending on when hydration finishes.
    await page.evaluate(() => document.getElementById("download")!.scrollIntoView());
    const header = await page
      .locator("[data-app-shell] > header")
      .evaluate((el) => el.getBoundingClientRect().bottom);
    const card = await page.locator("#download").evaluate((el) => el.getBoundingClientRect().top);
    expect(card).toBeGreaterThanOrEqual(header);
  });
});
