import { expect, test, type Page } from "@playwright/test";

import { MAKER, seed } from "./fixtures";

/** A datetime-local value at 09:00, some days from now, in the browser's time zone. */
function localDateTime(daysFromNow: number) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
}

const createButton = (page: Page) =>
  page.getByRole("complementary", { name: "Preview" }).getByRole("button", { name: "Create code" });

const draftKey = () => `quickqreate:draft:v2:${seed().makerId}`;
const storedDraft = (page: Page) =>
  page.evaluate((key) => window.localStorage.getItem(key), draftKey());

test.describe("creating codes", () => {
  test.use({ storageState: MAKER.state });

  test("creates a trackable, password-protected, scheduled code in one pass", async ({ page }) => {
    await page.goto("codes/new");
    await page.getByLabel("Website address").fill("https://example.com/launch");
    await page.getByLabel(/Code password/).fill("launch-2026");
    await page.getByLabel("Starts").fill(localDateTime(1));
    await page.getByLabel("Ends").fill(localDateTime(30));
    await page.getByLabel("Code name").fill("Launch poster");
    await createButton(page).click();

    await expect(page).toHaveURL(/\/codes\/[0-9a-f-]+#download$/);
    await expect(page.getByRole("heading", { level: 1, name: "Launch poster" })).toBeVisible();
    await expect(page.getByText("Password protected")).toBeVisible();
    await page.goto("codes");
    const row = page.getByRole("listitem", { name: "Launch poster" });
    await expect(row.getByText("Scheduled").filter({ visible: true }).first()).toBeVisible();
  });

  test("starts clean, and an unfinished code comes back only on Resume", async ({ page }) => {
    await page.goto("codes/new");
    await page.getByLabel("Website address").fill("https://example.com/draft");
    await page.getByLabel(/Code password/).fill("draft-secret");
    await page.getByLabel("Code name").fill("Draft poster");
    // Drafts are saved half a second after the last change, without the password.
    // Wait for the save after the last change: a slow machine can save after the link alone.
    await expect.poll(() => storedDraft(page)).toContain("Draft poster");
    expect(await storedDraft(page)).toContain("example.com/draft");
    expect(await storedDraft(page)).not.toContain("draft-secret");

    await page.goto("codes");
    await page.goto("codes/new");
    await expect(page.getByText(/You have an unfinished code from/)).toBeVisible();
    await expect(page.getByLabel("Website address")).toHaveValue("");
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByLabel("Website address")).toHaveValue("https://example.com/draft");
    await expect(page.getByLabel("Code name")).toHaveValue("Draft poster");
    await expect(page.getByLabel(/Code password/)).toHaveValue("");

    await page.reload();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect.poll(() => storedDraft(page)).toBeNull();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/You have an unfinished code/)).toHaveCount(0);
  });

  test("phones get full-size controls on the Create page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("codes/new");
    for (const control of [
      page.getByRole("button", { name: "Reset to style" }),
      page.getByRole("button", { name: "More types" }),
      page.getByRole("button", { name: "Create", exact: true }),
    ]) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test("a code started from a folder is created in that folder", async ({ page }) => {
    const { makerFolderId } = seed();
    await page.goto(`codes?folder=${makerFolderId}`);
    await page.getByRole("main").getByRole("link", { name: "Create code" }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/new\\?folder=${makerFolderId}$`));
    await expect(page.getByLabel("Folder", { exact: true })).toHaveValue(makerFolderId);
    await page.getByRole("radio", { name: /Show a short note/ }).click();
    await page.getByLabel("Text", { exact: true }).fill("Doors open at 6");
    await page.getByLabel("Code name").fill("Door note");
    await createButton(page).click();

    await expect(page).toHaveURL(/#download$/);
    await page.goto(`codes?folder=${makerFolderId}`);
    await expect(page.getByRole("listitem", { name: "Door note" })).toBeVisible();
  });
});
