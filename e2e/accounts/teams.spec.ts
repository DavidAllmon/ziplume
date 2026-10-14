import { expect, test } from "@playwright/test";

import { OWNER, PAT, RAY, SKY, VIEWER, seed } from "./fixtures";

test.describe("an owner", () => {
  test.use({ storageState: OWNER.state });

  test("sees a member's codes", async ({ page }) => {
    await page.goto(`codes?workspace=${seed().viewerId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Victor Viewer’s codes" }),
    ).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Victor note" })).toBeVisible();
  });
});

test.describe("a viewer", () => {
  test.use({ storageState: VIEWER.state });

  test("looks at a teammate's code but edits their own", async ({ page }) => {
    await page.goto(`codes/${seed().menuId}`);
    await expect(page.getByText(/view-only access/)).toBeVisible();
    await page.goto(`codes/${seed().viewerCodeId}`);
    await expect(page.getByRole("heading", { level: 1, name: "Victor note" })).toBeVisible();
    await expect(page.getByText(/view-only access/)).toHaveCount(0);
  });
});

test.describe("leaving a team", () => {
  test.use({ storageState: SKY.state });

  test("ends the sharing both ways, and you keep your codes", async ({ page, browser }) => {
    const { rayId, skyId } = seed();
    await page.goto(`codes?workspace=${rayId}`);
    await expect(page.getByRole("listitem", { name: "Ray sign" })).toBeVisible();

    await page.goto("team");
    await page.getByRole("button", { name: "Leave team" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Leave" }).click();
    await expect(page.getByText(/You left .*’s team/)).toBeVisible();

    await page.goto(`codes?workspace=${rayId}`);
    await expect(page.getByRole("heading", { level: 1, name: "All codes" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Ray sign" })).toHaveCount(0);
    await expect(page.getByRole("listitem", { name: "Sky flyer" })).toBeVisible();

    const ray = await browser.newContext({
      storageState: RAY.state,
      baseURL: test.info().project.use.baseURL,
    });
    const rayPage = await ray.newPage();
    await rayPage.goto(`codes?workspace=${skyId}`);
    await expect(rayPage.getByRole("listitem", { name: "Sky flyer" })).toHaveCount(0);
    await ray.close();
  });
});

test.describe("removing someone", () => {
  test.use({ storageState: PAT.state });

  test("and keeping their codes moves them to you", async ({ page }) => {
    await page.goto("codes");
    await expect(page.getByRole("listitem", { name: "Quinn poster" })).toHaveCount(0);
    await page.goto("team");
    await page.getByRole("button", { name: /^Remove Quinn/ }).click();
    await expect(page.getByRole("radio", { name: /Keep their codes/ })).toBeChecked();
    await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(/Removed Quinn.* moved to your codes/)).toBeVisible();
    await page.goto("codes");
    await expect(page.getByRole("listitem", { name: "Quinn poster" })).toBeVisible();
  });
});
