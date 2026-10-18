import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { expectNoSidewaysScroll } from "../phone-fit";
import { DESIGNER } from "./fixtures";

test.use({ storageState: DESIGNER.state });
// One account's templates, used in order.
test.describe.configure({ mode: "serial", retries: 0 });

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("Templates", () => {
  test("a new template becomes the default, and new codes start from it", async ({ page }) => {
    await page.goto("templates");
    await expect(page.getByText(/No templates yet/)).toBeVisible();
    await page.getByRole("link", { name: "New template" }).click();
    await expect(page).toHaveURL(/\/templates\/new$/);

    await page.getByRole("button", { name: /^Colors/ }).click();
    const color = page.getByRole("textbox", { name: "Code color", exact: true });
    await color.fill("#BE123C");
    await color.press("Tab");
    await page.getByRole("textbox", { name: /^Name/ }).fill("Brand");
    await page.getByRole("switch", { name: "Use for new codes" }).click();
    await page.getByRole("button", { name: "Save template" }).click();

    await expect(page).toHaveURL(/\/templates$/);
    const brand = page.getByRole("listitem", { name: "Brand", exact: true });
    await expect(brand.getByText("Default")).toBeVisible();

    await page.goto("codes/new?type=text");
    // The editor keeps the design on its QR code tab.
    await page.getByRole("tab", { name: "QR code" }).click();
    await page.getByRole("button", { name: /^Colors/ }).click();
    await expect(page.getByRole("textbox", { name: "Code color", exact: true })).toHaveValue(
      "#BE123C",
    );
  });

  test("templates are renamed, duplicated, made default and deleted", async ({ page }) => {
    await page.goto("templates");
    await page.getByRole("button", { name: "Actions for Brand" }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("Brand 2");
    await page.getByRole("button", { name: "Rename" }).click();
    await expect(page.getByRole("listitem", { name: "Brand 2", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Actions for Brand 2" }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    const copy = page.getByRole("listitem", { name: "Copy of Brand 2" });
    await expect(copy).toBeVisible();
    await expect(copy.getByText("Default")).toHaveCount(0);

    await copy.getByRole("button", { name: "Actions for Copy of Brand 2" }).click();
    await page.getByRole("menuitem", { name: "Set as default" }).click();
    await expect(copy.getByText("Default")).toBeVisible();
    await expect(
      page.getByRole("listitem", { name: "Brand 2", exact: true }).getByText("Default"),
    ).toHaveCount(0);

    await copy.getByRole("button", { name: "Actions for Copy of Brand 2" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete template" }).click();
    await expect(page.getByRole("listitem", { name: "Copy of Brand 2" })).toHaveCount(0);
    // A reload shows what the database kept.
    await page.reload();
    await expect(page.getByRole("listitem", { name: "Brand 2", exact: true })).toBeVisible();
    await expect(page.getByText("Default", { exact: true })).toHaveCount(0);
  });

  test("the grid, its menu and the rename dialog fit a small phone and pass axe", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("templates");
    const card = page.getByRole("listitem", { name: "Brand 2", exact: true });
    const actions = card.getByRole("button", { name: "Actions for Brand 2" });
    await actions.click();
    await page.getByRole("menuitem", { name: "Set as default" }).click();
    await expect(card.getByText("Default", { exact: true })).toBeVisible();
    await expectNoSidewaysScroll(page);
    // The Default badge leaves the ⋯ button whole and inside its card.
    const button = (await actions.boundingBox())!;
    const box = (await card.boundingBox())!;
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.x + button.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    await expectAxeClean(page);

    await actions.click();
    await expect(page.getByRole("menuitem", { name: "Rename" })).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectAxeClean(page);
    await page.getByRole("menuitem", { name: "Rename" }).click();
    // The dialog's root is a zero-size wrapper; its heading is what shows.
    await expect(page.getByRole("heading", { name: "Rename template" })).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectAxeClean(page);
  });

  test("a template's design is edited in place, and new codes use the change", async ({ page }) => {
    await page.goto("templates");
    await page.getByRole("button", { name: "Actions for Brand 2" }).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit template" })).toBeVisible();
    await page.getByRole("button", { name: /^Colors/ }).click();
    const color = page.getByRole("textbox", { name: "Code color", exact: true });
    await color.fill("#0B6E8C");
    await color.press("Tab");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/templates$/);

    await page.goto("codes/new?type=text");
    await page.getByRole("tab", { name: "QR code" }).click();
    await page.getByRole("button", { name: /^Colors/ }).click();
    await expect(page.getByRole("textbox", { name: "Code color", exact: true })).toHaveValue(
      "#0B6E8C",
    );
  });
});
