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

  test("a long folder name doesn't push the page sideways on phones", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("codes/bulk");
    await page
      .getByLabel("CSV", { exact: true })
      .fill("name,url\nLong folder code,https://example.com/long");
    await page.getByLabel("Folder", { exact: true }).selectOption({ label: "New folder…" });
    await page
      .getByLabel("New folder name")
      .fill("Spring flyers for the downtown cafe, summer 2026");
    await page.getByRole("button", { name: "Create 1 code" }).click();
    await expect(page.getByText(/Created 1 code in Spring flyers/)).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("team viewers", () => {
  test.use({ storageState: VIEWER.state });

  test("bulk create in their own codes from anywhere", async ({ page }) => {
    const { ownerId } = seed();
    await page.goto(`codes/bulk?workspace=${ownerId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Create codes in bulk" }),
    ).toBeVisible();
    await expect(page.getByText(/Saving to/)).toHaveCount(0);
  });
});
