import { expect, test } from "@playwright/test";

import { MAKER, seed, VIEWER } from "./fixtures";

test.describe("bulk creation in the app", () => {
  test.use({ storageState: MAKER.state });

  test("turns a list into trackable codes in the folder it was opened from", async ({ page }) => {
    const { makerFolderId } = seed();
    await page.goto(`codes?folder=${makerFolderId}`);
    await page.getByRole("main").getByRole("link", { name: "Bulk create" }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/bulk\\?folder=${makerFolderId}$`));
    await page
      .getByLabel("CSV", { exact: true })
      .fill("name,url\nBulk one,https://example.com/1\nBulk two,https://example.com/2");
    await expect(page.getByText("2 ready.")).toBeVisible();
    await page.getByRole("button", { name: "Create 2 codes" }).click();
    await expect(page.getByText("Created 2 codes in Posters.")).toBeVisible();

    await page.getByRole("link", { name: "Open Posters" }).click();
    for (const name of ["Bulk one", "Bulk two"]) {
      const row = page.getByRole("listitem", { name });
      await expect(row).toBeVisible();
      await expect(row.getByText("Active").filter({ visible: true }).first()).toBeVisible();
    }
  });
});

test.describe("team viewers", () => {
  test.use({ storageState: VIEWER.state });

  test("can't open bulk creation in a team they only view", async ({ page }) => {
    const { ownerId } = seed();
    await page.goto(`codes/bulk?workspace=${ownerId}`);
    await expect(page).toHaveURL(new RegExp(`/codes\\?workspace=${ownerId}$`));
  });
});
