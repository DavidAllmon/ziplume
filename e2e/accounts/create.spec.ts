import { expect, test, type Page } from "@playwright/test";

import { MAKER, seed } from "./fixtures";

/** A datetime-local value at 09:00, some days from now, in the browser's time zone. */
function localDateTime(daysFromNow: number) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
}

const createButton = (page: Page) =>
  page.getByRole("region", { name: "Code" }).getByRole("button", { name: "Create code" });
const openTab = (page: Page, name: string) => page.getByRole("tab", { name }).click();

const draftKey = () => `ziplume:draft:v2:${seed().makerId}`;
const storedDraft = (page: Page) =>
  page.evaluate((key) => window.localStorage.getItem(key), draftKey());

test.describe("creating codes", () => {
  test.use({ storageState: MAKER.state });

  test("creates a trackable, password-protected, scheduled code in one pass", async ({ page }) => {
    await page.goto("codes/new?type=url");
    await page.getByLabel("Website address").fill("https://example.com/launch");
    await openTab(page, "Settings");
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

  test("starts clean, and an unfinished code comes back from the gallery or on Resume", async ({
    page,
  }) => {
    await page.goto("codes/new?type=url");
    await page.getByLabel("Website address").fill("https://example.com/draft");
    await openTab(page, "Settings");
    await page.getByLabel(/Code password/).fill("draft-secret");
    await page.getByLabel("Code name").fill("Draft poster");
    // Drafts are saved half a second after the last change, without the password.
    // Wait for the save after the last change: a slow machine can save after the link alone.
    await expect.poll(() => storedDraft(page)).toContain("Draft poster");
    expect(await storedDraft(page)).toContain("example.com/draft");
    expect(await storedDraft(page)).not.toContain("draft-secret");

    // The gallery offers it, and Continue opens it straight away.
    await page.goto("codes/new");
    await page.getByRole("link", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/codes\/new\?type=url&resume=1$/);
    await expect(page.getByLabel("Website address")).toHaveValue("https://example.com/draft");
    await expect(page.getByLabel("Code name")).toHaveValue("Draft poster");

    // Opening the editor directly offers it too, and restores it only on Resume.
    await page.goto("codes");
    await page.goto("codes/new?type=url");
    await expect(page.getByText(/You have an unfinished code from/)).toBeVisible();
    await expect(page.getByLabel("Website address")).toHaveValue("");
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByLabel("Website address")).toHaveValue("https://example.com/draft");
    await expect(page.getByLabel("Code name")).toHaveValue("Draft poster");
    await openTab(page, "Settings");
    await expect(page.getByLabel(/Code password/)).toHaveValue("");

    await page.goto("codes/new?type=url");
    await page.getByRole("button", { name: "Discard" }).click();
    await expect.poll(() => storedDraft(page)).toBeNull();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/You have an unfinished code/)).toHaveCount(0);
  });

  test("Show me takes you to what's missing", async ({ page }) => {
    await page.goto("codes/new?type=links");
    const bar = page.getByRole("region", { name: "Code" });
    await expect(bar.getByText("Add a title")).toBeVisible();
    await openTab(page, "QR code");
    await bar.getByRole("button", { name: "Show me" }).click();
    await expect(page.getByRole("tab", { name: "Content" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByLabel("Title", { exact: true })).toBeFocused();
    await expect(page).toHaveURL(/#content$/);
  });

  test("phones get full-size controls on the Create page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("codes/new?type=url");
    const controls = [
      ...(await page.getByRole("tab").all()),
      page.getByRole("button", { name: "Create", exact: true }),
    ];
    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await openTab(page, "QR code");
    const reset = await page.getByRole("button", { name: "Reset to style" }).boundingBox();
    expect(reset?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("a code started from a folder goes through the gallery into that folder", async ({
    page,
  }) => {
    const { makerFolderId } = seed();
    await page.goto(`codes?folder=${makerFolderId}`);
    await page.getByRole("main").getByRole("link", { name: "Create code" }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/new\\?folder=${makerFolderId}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "What do you want to make?" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /^Text/ }).click();
    await expect(page).toHaveURL(new RegExp(`type=text&folder=${makerFolderId}$`));
    await page.getByLabel("Text", { exact: true }).fill("Doors open at 6");
    await page.getByLabel("Code name").fill("Door note");
    await openTab(page, "Settings");
    await expect(page.getByLabel("Folder", { exact: true })).toHaveValue(makerFolderId);
    await createButton(page).click();

    await expect(page).toHaveURL(/#download$/);
    await page.goto(`codes?folder=${makerFolderId}`);
    await expect(page.getByRole("listitem", { name: "Door note" })).toBeVisible();
  });

  test("the page preview lays out at each device's real width", async ({ page }) => {
    await page.goto("codes/new?type=links");
    const preview = page.getByRole("complementary", { name: "Preview" });
    const band = preview.getByRole("region", { name: "Page preview" }).locator(".h-36").first();
    // offsetHeight ignores the frame's scale: it's the page's own layout.
    const height = () => band.evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(await height()).toBe(144);
    await preview.getByRole("radio", { name: "Tablet" }).click();
    expect(await height()).toBe(176);
    await preview.getByRole("radio", { name: "Desktop" }).click();
    expect(await height()).toBe(176);
    await preview.getByRole("radio", { name: "Phone" }).click();
    expect(await height()).toBe(144);
  });

  test("the preview's menu chips don't change the editor's address", async ({ page }) => {
    await page.goto("codes/new?type=menu#content");
    await page.getByLabel("Restaurant name").fill("Diner");
    await page.getByLabel("Section name").first().fill("Starters");
    await page.getByLabel("Name", { exact: true }).first().fill("Soup");
    await page.getByRole("button", { name: /Add section/ }).click();
    await page.getByLabel("Section name").nth(1).fill("Mains");
    await page.getByLabel("Name", { exact: true }).nth(1).fill("Pie");
    const preview = page.getByRole("complementary", { name: "Preview" });
    await preview.getByText("Mains", { exact: true }).first().click();
    await expect(page).toHaveURL(/#content$/);
  });
});
