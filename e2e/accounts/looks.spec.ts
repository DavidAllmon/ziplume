import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { LOOK_PAGES } from "./fixtures";

// Page looks (spec 6): every theme, and every type on its own theme, read well on a phone; a
// page shows its wallpaper and font, colors the browser, and ignores the visitor's dark mode.

const frame = (page: Page) => page.locator("[data-page-frame]");
const background = (page: Page) =>
  frame(page).evaluate(
    (el) => `${getComputedStyle(el).backgroundImage} ${getComputedStyle(el).backgroundColor}`,
  );

test.describe("page looks", () => {
  for (const { slug } of LOOK_PAGES) {
    test(`/p/${slug} reads well on a phone`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`p/${slug}`);
      await expect(page.locator("h1")).toHaveCount(1);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      // The wallpaper fills the screen, however short the page.
      const box = (await frame(page).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(844);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
      // On a solid wallpaper axe can judge every color; it can't over gradients, which the
      // look's unit tests cover instead.
      if (await frame(page).evaluate((el) => getComputedStyle(el).backgroundImage === "none")) {
        const unsure = results.incomplete.filter((check) => check.id === "color-contrast");
        expect(unsure.map((check) => check.nodes.map((n) => n.target).join(", "))).toEqual([]);
      }
    });
  }

  test("a page looks the same to a visitor in dark mode", async ({ page }) => {
    await page.goto("p/LOOK-PAPER");
    const behind = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await behind()).toBe("rgb(246, 245, 241)");
    const light = await background(page);
    const lightText = await page.locator("h1").evaluate((el) => getComputedStyle(el).color);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await expect(page.locator("h1")).toBeVisible();
    expect(await background(page)).toBe(light);
    expect(await page.locator("h1").evaluate((el) => getComputedStyle(el).color)).toBe(lightText);
    // Behind the page (the bounce past its ends) is its own color, not the visitor's dark one.
    expect(await behind()).toBe("rgb(246, 245, 241)");
  });

  test("a page shows its theme's wallpaper and font, and colors the browser", async ({ page }) => {
    await page.goto("p/LOOK-OCEAN");
    expect(await background(page)).toContain("linear-gradient");
    expect(await page.locator('meta[name="theme-color"]').getAttribute("content")).toBe("#095E77");
    await page.goto("p/LOOK-FOREST");
    const family = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family.toLowerCase()).toContain("playfair");
  });
});
