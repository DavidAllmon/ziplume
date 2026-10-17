import { expect, test, type Page } from "@playwright/test";

import { MAKER, OWNER, VIEWER, seed } from "./fixtures";

const switchRow = (page: Page) => page.getByRole("navigation", { name: "Whose codes" });
const openTab = (page: Page, name: string) => page.getByRole("tab", { name }).click();
const createButton = (page: Page) =>
  page.getByRole("region", { name: "Code" }).getByRole("button", { name: "Create code" });

test.describe("an owner in a team", () => {
  test.use({ storageState: OWNER.state });

  test("switches to a teammate's codes from the switch row", async ({ page }) => {
    await page.goto("codes");
    await switchRow(page).getByRole("link", { name: "Victor" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Victor Viewer’s codes" }),
    ).toBeVisible();
    await expect(page.getByText(/You can edit these/)).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Victor note" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Victor diary" })).toHaveCount(0);
  });

  test("sees everyone's shared codes with who made them, and no folders", async ({ page }) => {
    await page.goto("codes");
    await switchRow(page).getByRole("link", { name: "Everyone" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Everyone’s codes" })).toBeVisible();
    await expect(
      page.getByRole("listitem", { name: "Spring menu" }).getByText("Created by you"),
    ).toBeVisible();
    await expect(
      page.getByRole("listitem", { name: "Victor note" }).getByText("Created by Victor"),
    ).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Victor diary" })).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /Flyers/ }),
    ).toHaveCount(0);
  });

  test("gets the Private switch on their own codes only", async ({ page }) => {
    await page.goto(`codes/${seed().menuId}/edit`);
    await openTab(page, "Settings");
    await expect(page.getByRole("switch", { name: /Private/ })).toBeVisible();
    // A teammate's code can't be made private by anyone but its maker.
    await page.goto(`codes/${seed().viewerCodeId}/edit`);
    await openTab(page, "Settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("switch", { name: /Private/ })).toHaveCount(0);
  });
});

test.describe("a viewer in a team", () => {
  test.use({ storageState: VIEWER.state });

  test("sees their private code labelled, and can view the owner's codes", async ({ page }) => {
    await page.goto("codes");
    await expect(
      page.getByRole("listitem", { name: "Victor diary" }).getByText("Private"),
    ).toBeVisible();
    await switchRow(page).getByRole("link", { name: "Olivia" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Olivia Owner’s codes" }),
    ).toBeVisible();
    await expect(page.getByText(/You can view these/)).toBeVisible();
  });

  test("makes a code Private while creating it, and teammates never see it", async ({
    page,
    browser,
  }) => {
    await page.goto("codes/new?type=text");
    await page.getByLabel("Text", { exact: true }).fill("Only for me");
    await openTab(page, "Settings");
    await page.getByRole("switch", { name: /Private/ }).click();
    await page.getByLabel("Code name").fill("Victor secret plan");
    await createButton(page).click();
    await expect(page).toHaveURL(/#download$/);
    await page.goto("codes");
    await expect(
      page.getByRole("listitem", { name: "Victor secret plan" }).getByText("Private"),
    ).toBeVisible();

    const owner = await browser.newContext({
      storageState: OWNER.state,
      baseURL: test.info().project.use.baseURL,
    });
    const ownerPage = await owner.newPage();
    await ownerPage.goto("codes?view=everyone");
    await expect(ownerPage.getByRole("listitem", { name: "Victor note" })).toBeVisible();
    await expect(ownerPage.getByRole("listitem", { name: "Victor secret plan" })).toHaveCount(0);
    await owner.close();
  });

  test("gets the one-time tip after joining", async ({ page }) => {
    await page.goto("codes?joined=1");
    await expect(
      page.getByText("You’re in Olivia Owner’s team now. Switch between people here."),
    ).toBeVisible();
    // The tip drops ?joined once the page is running in the browser; reload only after that,
    // as a person would (a reload before it would rightly show the tip again).
    await expect(page).not.toHaveURL(/joined=1/);
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Whose codes" })).toBeVisible();
    await expect(page.getByText(/You’re in Olivia Owner’s team now/)).toHaveCount(0);
  });
});

test.describe("someone on their own", () => {
  test.use({ storageState: MAKER.state });

  test("sees no team parts: no switch row, no Everyone, no Private switch", async ({ page }) => {
    await page.goto("codes?view=everyone");
    await expect(page.getByRole("heading", { level: 1, name: "All codes" })).toBeVisible();
    await expect(switchRow(page)).toHaveCount(0);
    await page.goto("codes/new?type=text");
    await openTab(page, "Settings");
    await expect(page.getByRole("switch", { name: /Private/ })).toHaveCount(0);
  });
});
