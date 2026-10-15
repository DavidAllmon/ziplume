import { expect, test, type Page } from "@playwright/test";

import {
  expectEndsWith,
  expectFitsPhone,
  expectNoScroll,
  expectNoSidewaysScroll,
  overscrollY,
} from "../phone-fit";
import { OWNER, PAUSED_PAGE_SLUG, PHONE_PAGES, seed } from "./fixtures";

// Phone layout with accounts on: the signed-out site (its header has a Sign in button), the
// signed-in app and hosted pages, on every phone profile in e2e/phones.ts.

test.describe("signed out", () => {
  for (const path of ["", "login", "signup", "privacy"]) {
    test(`/${path} fits the screen and ends where its content ends`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expectNoSidewaysScroll(page);
      // The site footer keeps 2rem under its last line.
      await expectFitsPhone(page, "body", 40);
    });
  }
});

const APP_PAGES = [
  "codes",
  "codes?folder={folder}",
  "codes/new",
  "codes/new?type=url",
  "codes/new?type=links",
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
  // Sections that load in the browser (two-step verification, the editors) show a placeholder
  // first and then grow; measure after they've swapped in.
  await expect(
    page.getByText(/^(Loading…|Opening the editor…|Checking your account…)$/),
  ).toHaveCount(0);
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
      if (path.startsWith("codes/new?") || path.endsWith("/edit")) {
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
    await page.goto("codes/new?type=url");
    await settled(page);
    await expect(page.locator("[data-actionbar]")).toBeVisible();
    await expectFitsPhone(page, "#main", 40);
  });

  test("list rows keep their fields wide, and only the grip drags", async ({ page }) => {
    const half = page.viewportSize()!.width / 2;
    for (const type of ["links", "menu"]) {
      await page.goto(`codes/new?type=${type}`);
      await settled(page);
      const rows = page.locator('[data-editor-panel="content"] li');
      await expect(rows.first()).toBeVisible();
      // Every field in a row (a menu's dishes too) gets at least half the screen.
      const fields = await rows
        .locator("input[type=text], input[type=url], input[type=tel], input[type=email]")
        .evaluateAll((inputs) =>
          inputs.map((input) => ({
            name: input.closest("div")?.querySelector("label")?.textContent ?? input.id,
            width: Math.round(input.getBoundingClientRect().width),
          })),
        );
      expect(fields.length).toBeGreaterThan(0);
      for (const field of fields) {
        expect(field.width, `${type}: ${field.name}`).toBeGreaterThanOrEqual(half);
      }
      // A drag starts only from the grip, so a swipe anywhere else in a row scrolls the page.
      const handles = await rows
        .locator('[aria-roledescription="sortable"]')
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
      expect(handles.length).toBeGreaterThan(0);
      for (const handle of handles) {
        expect(handle.width).toBeGreaterThanOrEqual(44);
        expect(handle.height).toBeLessThanOrEqual(48);
      }
    }
  });

  test("the editor's top bar scrolls away on phones, leaving room for the form", async ({
    page,
  }) => {
    await page.goto("codes/new?type=links");
    await settled(page);
    const position = await page
      .getByRole("region", { name: "Code" })
      .evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe("static");
  });

  test("toasts appear above the Create bar and the tab bar", async ({ page }) => {
    await page.goto("codes/new?type=url");
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

test.describe("hosted pages", () => {
  for (const { type, slug } of PHONE_PAGES) {
    test(`a ${type} page ends with its footer`, async ({ page }) => {
      await page.goto(`p/${slug}`);
      // Not every type has a main heading yet (Feedback gets one in release 3), so wait for the
      // page's footer.
      const footer = page.getByRole("link", { name: /Made with Ziplume/ });
      await expect(footer).toBeVisible();
      await expectNoSidewaysScroll(page);
      // The footer has 2rem below it; nothing else may add space after it.
      await expectEndsWith(page, footer, 40);
    });
  }

  test("a paused page's notice fits on the screen", async ({ page }) => {
    await page.goto(`p/${PAUSED_PAGE_SLUG}`);
    await expect(page.getByRole("heading", { name: "This page is paused" })).toBeVisible();
    await expectNoScroll(page);
  });

  test("the public page still switches layout at 640px of its own width", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto(`p/${PHONE_PAGES[0]!.slug}`);
    const band = page.locator(".h-36").first();
    expect(await band.evaluate((el) => (el as HTMLElement).offsetHeight)).toBe(176);
  });

  test("hosted pages keep pull-to-refresh", async ({ page }) => {
    await page.goto(`p/${PHONE_PAGES[0]!.slug}`);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await overscrollY(page)).toBe("auto");
  });
});
