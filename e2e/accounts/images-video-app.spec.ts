import { expect, test } from "@playwright/test";

import { MAKER } from "./fixtures";

test.describe("Images, Video and App extras", () => {
  test.use({ storageState: MAKER.state });
  // No outside players or trackers in tests.
  test.beforeEach(async ({ page }) => {
    await page.route(/tiktok\.com|loom\.com|instagram\.com|facebook\.com/, (route) =>
      route.abort(),
    );
  });

  test("a grid image opens in the viewer with its caption and link", async ({ page }) => {
    await page.goto("p/PHONE-IMAGES-GRID3");
    await page
      .getByRole("button", { name: "A long caption that describes the first picture in detail" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Photo 1 of 7" });
    await expect(dialog.getByRole("link", { name: "Open link" })).toHaveAttribute(
      "href",
      "https://example.com/first",
    );
  });

  test("the carousel's dots follow a swipe", async ({ page }) => {
    await page.goto("p/PHONE-IMAGES-CAROUSEL");
    await page.getByRole("button", { name: "Go to image 3 of 4" }).click();
    await expect(page.getByRole("button", { name: "Go to image 3 of 4" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.getByText("Slide 3")).toBeInViewport();
  });

  test("TikTok loads only after a tap, and several videos each have a title", async ({ page }) => {
    await page.goto("p/PHONE-VIDEO-PLUS");
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: "On Loom" })).toBeVisible();
    await page.getByRole("button", { name: "Tap to play from TikTok" }).click();
    await expect(page.locator("iframe")).toHaveAttribute(
      "src",
      "https://www.tiktok.com/embed/v2/7234567890123456789",
    );
    await expect(page.getByRole("link", { name: /Watch video/ })).toHaveAttribute(
      "href",
      "https://example.com/video",
    );
  });

  test("an app page shows its screenshots and features", async ({ page }) => {
    await page.goto("p/PHONE-APP-PLUS");
    await page.getByRole("button", { name: "Open photo 2 of 5" }).click();
    await expect(page.getByRole("dialog", { name: "Photo 2 of 5" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("region", { name: "Features" }).getByText("Works offline"),
    ).toBeVisible();
  });

  test("the editors set a layout, add a video and turn the store switch off", async ({ page }) => {
    await page.goto("codes/new?type=images");
    await page.getByRole("combobox", { name: /^Layout/ }).selectOption("single");
    await page.goto("codes/new?type=video");
    await page.getByRole("button", { name: "Add video" }).click();
    await expect(page.getByRole("textbox", { name: /^Video link/ })).toHaveCount(2);
    await page.goto("codes/new?type=app");
    const toggle = page.getByRole("switch", { name: /^Send phones straight to their store/ });
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
  });
});
