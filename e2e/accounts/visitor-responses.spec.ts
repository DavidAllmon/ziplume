import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { expectNoSidewaysScroll } from "../phone-fit";
import { MAKER, seed } from "./fixtures";

/** A signed-out visitor on a phone of their own. */
async function visitor(browser: Browser) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    storageState: { cookies: [], origins: [] },
  });
  return { page: await context.newPage(), close: () => context.close() };
}

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
}

async function expectTargets(page: Page, names: string[]) {
  for (const name of names) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box?.height, name).toBeGreaterThanOrEqual(44);
  }
}

// These fill pages' places and limits, so a retry would start from a different state.
test.describe.configure({ retries: 0 });

test.describe("Things visitors send back", () => {
  test.use({ storageState: MAKER.state });

  test("a visitor shares their details, and the owner sees them", async ({ page, browser }) => {
    const v = await visitor(browser);
    await v.page.goto("p/MAKER-CARD");
    await v.page.getByRole("button", { name: "Share your details" }).click();
    await v.page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(v.page.getByText("Add your name")).toBeVisible();
    await expect(v.page.getByRole("textbox", { name: /^Name/ })).toBeFocused();
    await v.page.getByRole("textbox", { name: /^Name/ }).fill("Vera Visitor");
    await v.page.getByRole("textbox", { name: /^Email/ }).fill("vera@example.com");
    await v.page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(v.page.getByText("Thanks! Max has your details.")).toBeVisible();
    await v.close();

    await page.goto(`codes/${seed().makerCardId}`);
    await expect(page.getByText("Vera Visitor")).toBeVisible();
    await expect(page.getByRole("link", { name: "vera@example.com" })).toHaveAttribute(
      "href",
      "mailto:vera@example.com",
    );
    await expect(page.getByRole("link", { name: /CSV/ })).toHaveAttribute(
      "download",
      "shared-details.csv",
    );
  });

  test("a coupon is marked used once on a phone, and the owner sees the count", async ({
    page,
    browser,
  }) => {
    const v = await visitor(browser);
    await v.page.goto("p/MAKER-COUPON");
    await v.page.getByRole("button", { name: "Mark as used" }).click();
    await v.page.getByRole("button", { name: "Not yet" }).click();
    await v.page.getByRole("button", { name: "Mark as used" }).click();
    await v.page.getByRole("button", { name: "Yes, mark it used" }).click();
    await expect(v.page.getByText("Used on this phone")).toBeVisible();
    await v.page.reload();
    await expect(v.page.getByText("Used on this phone")).toBeVisible();
    await expect(v.page.getByRole("button", { name: "Mark as used" })).toHaveCount(0);
    await v.close();

    await page.goto(`codes/${seed().makerCouponId}`);
    await expect(page.getByText("1 used")).toBeVisible();
  });

  test("RSVPs take the event's places until it's full", async ({ page, browser }) => {
    const first = await visitor(browser);
    await first.page.goto("p/MAKER-DINNER");
    await first.page.getByRole("textbox", { name: /^Name/ }).fill("Ana Guest");
    await first.page.getByRole("textbox", { name: /^Email/ }).fill("ana@example.com");
    await first.page.getByRole("combobox", { name: /Guests/ }).selectOption("3");
    await first.page.getByRole("button", { name: "Send RSVP" }).click();
    await expect(first.page.getByText("You’re on the list")).toBeVisible();
    await first.close();

    const second = await visitor(browser);
    await second.page.goto("p/MAKER-DINNER");
    // One place is left, so one guest is all it offers.
    await expect(
      second.page.getByRole("combobox", { name: /Guests/ }).locator("option"),
    ).toHaveCount(1);
    await second.page.getByRole("textbox", { name: /^Name/ }).fill("Ben Guest");
    await second.page.getByRole("textbox", { name: /^Email/ }).fill("ben@example.com");
    await second.page.getByRole("button", { name: "Send RSVP" }).click();
    await expect(second.page.getByText("You’re on the list")).toBeVisible();
    await second.page.reload();
    await expect(second.page.getByText("You’re on the list")).toBeVisible();
    await second.close();

    const third = await visitor(browser);
    await third.page.goto("p/MAKER-DINNER");
    await expect(third.page.getByText("This event is full.")).toBeVisible();
    await third.close();

    await page.goto(`codes/${seed().makerDinnerId}`);
    await expect(page.getByText("4 of 4 places taken")).toBeVisible();
    await expect(page.getByText("Ana Guest")).toBeVisible();
    await expect(page.getByText("Ben Guest")).toBeVisible();
  });
});

test.describe("Visitor forms on a small phone", () => {
  for (const look of ["PHONE", "TYPE"]) {
    test(`fit at 320px with their errors showing, and pass axe (${look})`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(`p/${look}-CONTACT-SHARE`);
      await page.getByRole("button", { name: "Share your details" }).click();
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await expect(page.getByText("Add your name")).toBeVisible();
      await expectNoSidewaysScroll(page);
      await expectTargets(page, ["Share your details", "Send"]);
      await expectAxeClean(page);

      await page.goto(`p/${look}-COUPON-USE`);
      await page.getByRole("button", { name: "Mark as used" }).click();
      await expectNoSidewaysScroll(page);
      await expectTargets(page, ["Not yet", "Yes, mark it used"]);
      await expectAxeClean(page);

      await page.goto(`p/${look}-EVENT-RSVP`);
      await page.getByRole("button", { name: "Send RSVP" }).click();
      await expect(page.getByText("Add your email")).toBeVisible();
      await expectNoSidewaysScroll(page);
      await expectTargets(page, ["Send RSVP"]);
      await expectAxeClean(page);
    });
  }
});
