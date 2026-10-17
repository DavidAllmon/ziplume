import { expect, test } from "@playwright/test";

import { MAKER } from "./fixtures";

test.describe("Menu, Coupon and Event extras", () => {
  test.use({ storageState: MAKER.state });

  test("the menu shows labels, markers and options, hides a hidden dish, and upgrades old tags", async ({
    page,
  }) => {
    await page.goto("p/PHONE-MENU-PLUS");
    await expect(
      page.getByRole("navigation", { name: "Menu sections" }).getByRole("link"),
    ).toHaveCount(3);
    await expect(page.getByText("Starters are made to order.")).toBeVisible();
    await expect(page.getByText("Sold out").first()).toBeVisible();
    await expect(page.getByText("Popular").first()).toBeVisible();
    await expect(page.getByText("Starters 5")).toHaveCount(0);
    await expect(page.getByText("Large family size to share $14").first()).toBeVisible();
    const old = page.getByText("Starters 7").locator("xpath=ancestor::li[1]");
    await expect(old.getByText("Vegan")).toBeVisible();
    await expect(old.getByText("Gluten-free")).toBeVisible();
    await expect(old.getByText("house special")).toBeVisible();
  });

  test("an old menu's vegetarian tag is now a label", async ({ page }) => {
    await page.goto("p/PHONE-MENU");
    await expect(page.getByText("Vegetarian").first()).toBeVisible();
  });

  test("a dish photo opens the viewer with the dish's name", async ({ page }) => {
    await page.goto("p/PHONE-MENU-PLUS");
    await page.getByRole("button", { name: /^Photo of Starters 2/ }).click();
    const dialog = page.getByRole("dialog", { name: "Photo 2 of 6" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Starters 2")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("a coupon shows its badge, its QR code, and counts down its last days", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2099-12-29T12:00:00"));
    await page.goto("p/PHONE-COUPON-QR");
    await expect(page.getByText("NEW", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "QR code for SAVE20" })).toBeVisible();
    await expect(page.getByText("Ends in 2 days")).toBeVisible();
    await page.goto("p/PHONE-COUPON-BAR");
    await expect(page.getByRole("img", { name: "Barcode for BAR128" })).toBeVisible();
  });

  test("an online event counts down and opens its Join link 15 minutes early", async ({ page }) => {
    // 18:00 in New York is 23:00 UTC in December.
    await page.clock.setFixedTime(new Date("2099-12-05T22:40:00Z"));
    await page.goto("p/PHONE-EVENT-PLUS");
    await expect(page.getByText("Starts in 20 minutes")).toBeVisible();
    await expect(page.getByText("The link opens 15 minutes before the start")).toBeVisible();
    await expect(page.getByRole("link", { name: "Directions" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Agenda" }).getByText("Agenda item 8"),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Hosts" }).getByText("Host number 4"),
    ).toBeVisible();
    await page.clock.setFixedTime(new Date("2099-12-05T22:50:00Z"));
    await page.reload();
    await expect(page.getByRole("link", { name: /Join online/ })).toHaveAttribute(
      "href",
      "https://meet.example.com/launch",
    );
  });

  test("the editors add a dish label, a scan code and an agenda row", async ({ page }) => {
    await page.goto("codes/new?type=menu");
    await page.getByRole("button", { name: "More options for item 1" }).click();
    await page.getByRole("checkbox", { name: "Vegan" }).check();
    await page.goto("codes/new?type=coupon");
    await page.getByRole("textbox", { name: /^Coupon code/ }).fill("SAVE20");
    await page
      .getByRole("radiogroup", { name: "Show the code as" })
      .getByRole("radio", { name: "QR code" })
      .click();
    const preview = page.getByRole("complementary", { name: "Preview" });
    await expect(preview.getByRole("img", { name: "QR code for SAVE20" })).toBeVisible();
    await page.goto("codes/new?type=event");
    await page.getByRole("button", { name: "Add agenda item" }).click();
    await expect(page.locator("[data-field='agenda.0.title']")).toBeFocused();
  });
});
