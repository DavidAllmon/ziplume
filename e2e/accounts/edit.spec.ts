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

/** Creates a link list longer than a phone screen as the signed-in person and returns its id. */
async function createLongPage(page: Page, name: string) {
  await page.goto("codes/new?type=links");
  await page.getByLabel("Title").fill("A long list");
  const addLink = page.getByRole("button", { name: "Add link", exact: true });
  while ((await page.getByLabel("Button text").count()) < 12) await addLink.click();
  for (let i = 0; i < 12; i++) {
    await page
      .getByLabel("Button text")
      .nth(i)
      .fill(`Link ${i + 1}`);
    await page
      .getByLabel("Link", { exact: true })
      .nth(i)
      .fill(`https://example.com/${i + 1}`);
  }
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

test.describe("a hosted page's code page", () => {
  test.use({ storageState: MAKER.state });

  test("keeps the short link readable beside the page's thumbnail at every width", async ({
    page,
  }) => {
    const id = await createLongPage(page, "Thumbnail layout");
    await page.goto(`codes/${id}`);
    const row = page.getByText("Short link", { exact: true }).locator("..");
    const thumbnail = page.locator('[aria-label="Page preview"]');
    for (const width of [768, 820, 1024, 1180, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const a = (await row.boundingBox())!;
      const b = (await thumbnail.boundingBox())!;
      expect(a.width, `short link width at ${width}px`).toBeGreaterThanOrEqual(220);
      const overlaps =
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlaps, `short link overlaps the thumbnail at ${width}px`).toBe(false);
    }
  });

  test("scrolling over the page's thumbnail scrolls the code page", async ({ page }) => {
    const id = await createLongPage(page, "Thumbnail scroll");
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`codes/${id}`);
    const thumbnail = page.locator('[aria-label="Page preview"]');
    // The thumbnail's page is longer than its screen, so it could swallow the wheel.
    expect(await thumbnail.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const box = (await thumbnail.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const before = await page.evaluate(() => window.scrollY);
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 200);
  });
});
