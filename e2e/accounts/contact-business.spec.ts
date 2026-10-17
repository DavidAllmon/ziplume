import { expect, test } from "@playwright/test";

import { MAKER } from "./fixtures";

test.describe("Contact and Business extras", () => {
  test.use({ storageState: MAKER.state });

  test("the Contact page has quick buttons, pronouns, the department and every website", async ({
    page,
  }) => {
    await page.goto("p/PHONE-CONTACT-PLUS");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("(she/her)");
    await expect(page.getByText("Designer · Brand · Acme")).toBeVisible();
    const actions = page.getByRole("navigation", { name: "Quick actions" });
    for (const name of ["Call", "Text", "Email", "WhatsApp", "Directions"]) {
      await expect(actions.getByRole("link", { name })).toBeVisible();
    }
    await expect(actions.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/15550102030",
    );
    await expect(page.getByText("Portfolio", { exact: true })).toBeVisible();
    await expect(page.getByText("Studio", { exact: true })).toBeVisible();
    const card = await page.request.get("p/PHONE-CONTACT-PLUS/contact.vcf");
    const text = await card.text();
    expect(text).toContain("ORG:Acme;Brand");
    expect(text).toContain("Pronouns: she/her");
    expect(text).toContain("URL:https://example.com/studio");
  });

  test("an old Contact page's single website still shows", async ({ page }) => {
    await page.goto("p/PHONE-VCARD");
    await expect(page.locator("a[href='https://example.com/']")).toContainText("Website");
  });

  test("the Business page says whether it's open, and lists its services and review button", async ({
    page,
  }) => {
    await page.goto("p/PHONE-BIZ-PLUS");
    // The status line, not a day that's simply "Closed".
    await expect(page.getByText(/^(Open now ·|Closes soon ·|Closed ·|Closed today)/)).toBeVisible();
    await expect(page.getByText("9:00 AM – 12:00 PM, 1:00 PM – 5:00 PM")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Services" }).getByText("Catering package 12"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Leave a Google review/ })).toBeVisible();
  });

  test("the gallery opens full screen, moves with the arrow keys and closes on Escape", async ({
    page,
  }) => {
    await page.goto("p/PHONE-BIZ-PLUS");
    const thumb = page.getByRole("button", { name: "Open photo 2 of 6" });
    await thumb.click();
    await expect(page.getByRole("dialog", { name: "Photo 2 of 6" })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("dialog", { name: "Photo 3 of 6" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(thumb).toBeFocused();
  });

  test("the Business editor adds a Google review button and a closure", async ({ page }) => {
    await page.goto("codes/new?type=business");
    await page.getByRole("button", { name: "Add Google review" }).click();
    await expect(page.getByRole("textbox", { name: /^Button text/ }).first()).toHaveValue(
      "Leave a Google review",
    );
    await expect(page.locator("[data-field='buttons.0.url']")).toBeFocused();
    await page.getByRole("button", { name: "Add closure" }).click();
    await expect(page.locator("[data-field='closures.0.date']")).toBeFocused();
  });
});
