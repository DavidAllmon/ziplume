import { expect, test } from "@playwright/test";

import { OWNER } from "./fixtures";

test.use({ storageState: OWNER.state });

test("the owner sees their saved codes", async ({ page }) => {
  await page.goto("codes");
  await expect(page.getByText("Spring menu")).toBeVisible();
});
