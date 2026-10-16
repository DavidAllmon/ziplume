import { expect, test } from "@playwright/test";

import { MAKER } from "./fixtures";

test.describe("Link list extras", () => {
  test.use({ storageState: MAKER.state });

  test("the page draws its header, icons, featured link and email link, and hides what's scheduled later", async ({
    page,
  }) => {
    await page.goto("p/PHONE-EXTRAS");
    await expect(page.getByRole("heading", { level: 2, name: "Shop" })).toBeVisible();
    // The social icons have an Instagram link too; this is the one in the list of links.
    const featured = page
      .getByRole("navigation", { name: "Links" })
      .getByRole("link", { name: /Instagram/ });
    await expect(featured).toHaveAttribute("data-featured", "true");
    // Taller, and marked in the accent color (spec item 8).
    await expect(featured).toHaveCSS("outline-style", "solid");
    await expect(page.getByRole("link", { name: /Email us/ })).toHaveAttribute(
      "href",
      "mailto:hi@example.com",
    );
    await expect(page.getByRole("link", { name: /Later/ })).toHaveCount(0);
    const snapchat = page.locator("[data-socials] a[aria-label=Snapchat] [data-social-mark]");
    await expect(snapchat).toHaveCSS("background-color", "rgb(255, 252, 0)");
  });

  test("the editor adds a header and a scheduled email link", async ({ page }) => {
    await page.goto("codes/new?type=links");
    await page.getByRole("button", { name: "Add header" }).click();
    await page
      .getByRole("textbox", { name: /^Header text/ })
      .first()
      .fill("Contact");
    await page
      .getByRole("combobox", { name: "Link type" })
      .first()
      .selectOption({ label: "Email" });
    await page
      .getByRole("textbox", { name: /^Email address/ })
      .first()
      .fill("hi@example.com");
    const preview = page.getByRole("complementary", { name: "Preview" });
    await expect(preview.getByRole("heading", { level: 2, name: "Contact" })).toBeVisible();
  });
});
