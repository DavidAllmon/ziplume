import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { expectNoSidewaysScroll } from "../phone-fit";
import { OWNER, VIEWER, seed } from "./fixtures";

async function expectAxeClean(page: Page) {
  // Loading dims the tiles (aria-busy) and fades them back in; check the settled page.
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("Analytics as the owner", () => {
  test.use({ storageState: OWNER.state });

  test("shows the workspace's scans and top codes, and downloads them", async ({ page }) => {
    await page.goto("analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    const menu = page.getByRole("link", { name: "Spring menu" });
    await expect(menu).toHaveAttribute("href", `/codes/${seed().menuId}/analytics`);
    await expect(page.getByText("Scans", { exact: true }).locator("..")).toContainText("3");

    const href = await page.getByRole("link", { name: /CSV/ }).getAttribute("href");
    const csv = await (await page.request.get(href!)).text();
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toContain("code,short_link");
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain("Spring menu");
  });

  test("fits a small phone with Custom open, and passes axe", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("analytics");
    const menu = page.getByRole("link", { name: "Spring menu" });
    await expect(menu).toBeVisible();
    // Every range is a 44 px target with its whole label inside it.
    for (const radio of await page.getByRole("radio").all()) {
      const box = (await radio.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(await radio.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    await page.getByRole("radio", { name: "Custom dates" }).check();
    await expect(page.getByLabel("From")).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectAxeClean(page);

    // A top code's whole row opens it, not just its name.
    const row = page.locator("li", { has: menu });
    const box = (await row.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    // Its far corner, away from the name; scrolled into view first.
    await row.click({ position: { x: box.width - 4, y: box.height - 4 } });
    await expect(page).toHaveURL(new RegExp(`/codes/${seed().menuId}/analytics$`));
  });
});

test.describe("Analytics as a teammate", () => {
  test.use({ storageState: VIEWER.state });

  test("shows the owner's shared codes inside their workspace", async ({ page }) => {
    await page.goto(`analytics?workspace=${seed().ownerId}`);
    await expect(page.getByText(/Scans across .*’s codes/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Spring menu" })).toHaveAttribute(
      "href",
      `/codes/${seed().menuId}/analytics?workspace=${seed().ownerId}`,
    );
  });
});
