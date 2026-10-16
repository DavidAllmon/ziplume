import { expect, test, type Page } from "@playwright/test";

import { MAKER } from "./fixtures";

const openTab = (page: Page, name: string) => page.getByRole("tab", { name }).click();

test.describe("page text and files", () => {
  test.use({ storageState: MAKER.state });

  test("a video page takes a link, and a long description stays with a note to shorten it", async ({
    page,
  }) => {
    await page.goto("codes/new?type=video");
    await expect(page.getByRole("radiogroup", { name: "Video source" })).toHaveCount(0);
    await page.getByRole("textbox", { name: /^Video link/ }).fill("https://youtu.be/dQw4w9WgXcQ");
    const description = page.getByRole("textbox", { name: /^Description/ });
    await description.fill("x".repeat(1200));
    await expect(description).toHaveValue("x".repeat(1200));
    await expect(page.getByText("Shorten by 200 characters").first()).toBeVisible();
    await expect(page.getByText("1,200 / 1,000").first()).toBeVisible();
    // Create can't go ahead: it says what to fix, and Show me goes to the box.
    const bar = page.getByRole("region", { name: "Code" });
    await expect(bar.getByText(/Shorten by 200 characters/)).toBeVisible();
    await page.getByRole("textbox", { name: /^Title/ }).focus();
    await bar.getByRole("button", { name: "Show me" }).click();
    await expect(description).toBeFocused();
  });

  test("a public page has a Share button that copies its link", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    // The phone fixtures are published at /p/<slug>.
    await page.goto("p/PHONE-LINKS");
    await page.evaluate(() => Object.defineProperty(navigator, "share", { value: undefined }));
    await page.getByRole("button", { name: "Share this page" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Link copied" })).toBeVisible();
  });
});
