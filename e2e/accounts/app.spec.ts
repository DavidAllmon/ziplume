import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { OWNER, VIEWER, seed } from "./fixtures";

const WIDTHS = [390, 820, 1280];
// {menu} is the seeded "Spring menu" code.
const PAGES = [
  "codes",
  "codes?folder={folder}",
  "codes/{menu}",
  "codes/{menu}/analytics",
  "team",
  "settings",
  "settings/security",
  "settings/api-keys",
  "settings/account",
];

const resolve = (path: string) =>
  path.replace("{menu}", seed().menuId).replace("{folder}", seed().folderId);

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("signed in as an owner", () => {
  test.use({ storageState: OWNER.state });

  for (const path of PAGES) {
    for (const width of WIDTHS) {
      test(`/${path} fits ${width}px and passes axe`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(resolve(path));
        await expect(page.locator("main h1").first()).toBeVisible();
        await expectNoSidewaysScroll(page);
        await expectNoAxeViolations(page);
      });
    }
  }

  test("the list shows one status and recent scans per code", async ({ page }) => {
    await page.goto("codes");
    const menu = page.getByRole("listitem", { name: "Spring menu" });
    // The phone line comes first in the DOM and is hidden at this width; check the visible copy.
    await expect(menu.getByText("Active").filter({ visible: true }).first()).toBeVisible();
    await expect(
      menu
        .getByText(/^3 scans in the last 30 days$/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("listitem", { name: "Front desk Wi-Fi" })
        .getByText("Static")
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });

  test("grid view is remembered after a reload", async ({ page }) => {
    await page.goto("codes");
    await page.getByRole("radio", { name: "Grid view" }).click();
    await page.reload();
    await expect(page.getByRole("list", { name: "Codes" })).toHaveAttribute("data-view", "grid");
  });

  test("folders in the sidebar filter the list", async ({ page }) => {
    await page.goto("codes");
    await page
      .getByRole("list", { name: "Folders" })
      .getByRole("link", { name: /Flyers/ })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Flyers" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Front desk Wi-Fi" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Spring menu" })).toHaveCount(0);
  });

  test("an unknown folder shows all codes", async ({ page }) => {
    await page.goto(`codes?folder=${"0".repeat(8)}-0000-4000-8000-${"0".repeat(12)}`);
    await expect(page.getByRole("heading", { level: 1, name: "All codes" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Spring menu" })).toBeVisible();
  });

  test("filters that match nothing offer to clear them", async ({ page }) => {
    await page.goto("codes");
    await page.getByLabel("Status").selectOption("expired");
    await expect(page.getByRole("heading", { name: "No codes match" })).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByRole("listitem", { name: "Spring menu" })).toBeVisible();
  });

  test("/codes passes axe in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("codes");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expectNoAxeViolations(page);
  });

  test("old addresses land on the new pages", async ({ page }) => {
    await page.goto("dashboard");
    await expect(page).toHaveURL(/\/codes$/);
    await page.goto(`dashboard/codes/${seed().menuId}/analytics`);
    await expect(page).toHaveURL(new RegExp(`/codes/${seed().menuId}/analytics$`));
    await page.goto("account");
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("the sidebar reaches every section on desktop", async ({ page }) => {
    await page.goto("codes");
    const nav = page.getByRole("navigation", { name: "Main" });
    await nav.getByRole("link", { name: "Team" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Team" })).toBeVisible();
    await nav.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Settings" })
      .getByRole("link", { name: "Security" })
      .click();
    await expect(page).toHaveURL(/\/settings\/security$/);
  });

  test("phones get bottom tabs instead of the sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("codes");
    const tabs = page.getByRole("navigation", { name: "Main" });
    for (const name of ["Codes", "Create", "Team"]) {
      await expect(tabs.getByRole("link", { name })).toBeVisible();
    }
    await expect(tabs.getByRole("button", { name: "More" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Sidebar" })).toBeHidden();
    const logo = page.getByRole("banner").getByRole("link", { name: "QuickQReate codes" });
    expect((await logo.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await tabs.getByRole("button", { name: "More" }).click();
    for (const link of await page.getByRole("dialog", { name: "More" }).getByRole("link").all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("signed in as a viewer", () => {
  test.use({ storageState: VIEWER.state });

  test("sees the owner's codes with no create controls", async ({ page }) => {
    await page.goto(`codes?workspace=${seed().ownerId}`);
    await expect(page.getByText("Spring menu")).toBeVisible();
    await expect(page.getByRole("link", { name: /Create( code)?$/ })).toHaveCount(0);
    await page.goto("codes");
    await expect(page.getByRole("link", { name: "Create code" }).first()).toBeVisible();
  });
});

test.describe("a team code's pages", () => {
  test.use({ storageState: VIEWER.state });

  test("stay in that team, without create controls", async ({ page }) => {
    const { menuId, ownerId } = seed();
    for (const path of [`codes/${menuId}`, `codes/${menuId}/analytics`]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/${path}\\?workspace=${ownerId}$`));
      await expect(page.getByRole("link", { name: /Create( code)?$/ })).toHaveCount(0);
    }
  });
});

test.describe("signed out", () => {
  test("signed-out visitors sign in, then come back", async ({ page }) => {
    await page.goto("settings/security");
    await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Fsecurity$/);
    await page.getByLabel("Email", { exact: true }).fill(OWNER.email);
    await page.getByLabel("Password", { exact: true }).fill(OWNER.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/security$/);
  });
});
