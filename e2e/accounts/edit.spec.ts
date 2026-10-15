import { expect, test, type Page } from "@playwright/test";

import { MAKER, VIEWER, seed } from "./fixtures";

const bar = (page: Page) => page.getByRole("region", { name: "Code" });
const openTab = (page: Page, name: string) => page.getByRole("tab", { name }).click();

/** Creates a trackable code as the signed-in person and returns its id. */
async function createCode(page: Page, name: string, address: string) {
  await page.goto("codes/new?type=url");
  await page.getByLabel("Website address").fill(address);
  await page.getByLabel("Code name").fill(name);
  await bar(page).getByRole("button", { name: "Create code" }).click();
  await expect(page).toHaveURL(/\/codes\/[0-9a-f-]+#download$/);
  return new URL(page.url()).pathname.split("/")[2]!;
}

test.describe("editing a saved code", () => {
  test.use({ storageState: MAKER.state });

  test("opens in the Create editor, and changes to content, design, dates and name stick", async ({
    page,
  }) => {
    const id = await createCode(page, "Edit me", "https://example.com/edit");
    await page.getByRole("link", { name: "Edit code" }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/${id}/edit$`));
    await expect(page.getByRole("navigation", { name: "Main" }).first()).toBeVisible();
    await expect(page.getByLabel("Website address")).toHaveValue("https://example.com/edit");
    await expect(bar(page).getByRole("button", { name: "Save changes" })).toBeDisabled();

    await page.getByLabel("Website address").fill("https://example.com/edited");
    await openTab(page, "QR code");
    await page.getByRole("button", { name: /^Colors/ }).click();
    await page.getByLabel("Background", { exact: true }).fill("#FFF7E6");
    await openTab(page, "Settings");
    await page.getByLabel("Ends").fill("2031-01-01T09:00");
    await page.getByLabel("Code name").fill("Edited poster");
    await bar(page).getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/codes/${id}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Edited poster" })).toBeVisible();
    await expect(page.getByText("https://example.com/edited")).toBeVisible();

    await page.goto(`codes/${id}/edit`);
    await expect(page.getByLabel("Website address")).toHaveValue("https://example.com/edited");
    await openTab(page, "Settings");
    await expect(page.getByLabel("Ends")).toHaveValue("2031-01-01T09:00");
    await openTab(page, "QR code");
    await page.getByRole("button", { name: /^Colors/ }).click();
    await expect(page.getByLabel("Background", { exact: true })).toHaveValue(/^#fff7e6$/i);
  });

  test("Back after saving shows the saved code, not the editor as it was", async ({ page }) => {
    const id = await createCode(page, "Back test", "https://example.com/back");
    await page.getByRole("link", { name: "Edit code" }).click();
    await page.getByLabel("Code name").fill("Back test saved");
    await bar(page).getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/${id}$`));
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/codes/${id}/edit$`));
    await expect(page.getByLabel("Code name")).toHaveValue("Back test saved");
  });

  test("after Discard, Back leaves in one press", async ({ page }) => {
    const id = await createCode(page, "Discard test", "https://example.com/discard");
    await page.getByRole("link", { name: "Edit code" }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/${id}/edit$`));
    await page.getByLabel("Code name").fill("Discard test 2");
    await bar(page).getByRole("button", { name: "Discard changes" }).click();
    await expect(page.getByLabel("Code name")).toHaveValue("Discard test");
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/codes/${id}(#download)?$`));
  });

  test("the old home-page edit address forwards to the editor", async ({ page }) => {
    const id = await createCode(page, "Old link", "https://example.com/old");
    await page.goto(`/?edit=${id}`);
    await expect(page).toHaveURL(new RegExp(`/codes/${id}/edit$`));
    await expect(page.getByRole("heading", { level: 1, name: /^Edit / })).toBeVisible();
  });

  test("asks before leaving unsaved changes", async ({ page }) => {
    const id = await createCode(page, "Unsaved", "https://example.com/unsaved");
    await page.goto(`codes/${id}/edit`);
    await page.getByLabel("Code name").fill("Unsaved 2");

    page.once("dialog", (dialog) => void dialog.dismiss());
    await page.getByRole("link", { name: /Back to Unsaved/ }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/${id}/edit$`));
    await expect(page.getByLabel("Code name")).toHaveValue("Unsaved 2");

    page.once("dialog", (dialog) => void dialog.dismiss());
    await page.evaluate(() => window.history.back());
    await expect(page).toHaveURL(new RegExp(`/codes/${id}/edit$`));
    await expect(page.getByLabel("Code name")).toHaveValue("Unsaved 2");

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("link", { name: /Back to Unsaved/ }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/${id}$`));
  });
});

test.describe("a viewer", () => {
  test.use({ storageState: VIEWER.state });

  test("can't open a teammate's code in the editor", async ({ page }) => {
    const { menuId, ownerId } = seed();
    await page.goto(`codes/${menuId}/edit?workspace=${ownerId}`);
    await expect(page).toHaveURL(new RegExp(`/codes/${menuId}\\?workspace=${ownerId}$`));
    await expect(page.getByText(/You can view this code but not change it/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit code" })).toHaveCount(0);
  });
});
