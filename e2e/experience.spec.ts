import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { chooseType } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
});

test("download waits for valid content", async ({ page }) => {
  const download = page.getByRole("button", { name: /^Download/ }).first();
  await expect(download).toBeDisabled();
  await page.getByLabel("Website address").fill("not a url");
  await expect(download).toBeDisabled();
  await page.getByLabel("Website address").fill("example.com");
  await expect(download).toBeEnabled();
});

test("switching types keeps what you typed", async ({ page }) => {
  await chooseType(page, "Wi-Fi");
  await page.getByLabel("Network name (SSID)").fill("HomeNet");
  await chooseType(page, "Link");
  await chooseType(page, "Wi-Fi");
  await expect(page.getByLabel("Network name (SSID)")).toHaveValue("HomeNet");
});

test("design and theme are remembered, content is not", async ({ page }) => {
  await page.getByRole("radio", { name: "Dark theme" }).click();
  await page.getByRole("button", { name: "Forest preset" }).click();
  await page.getByLabel("Website address").fill("example.com/private");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Forest preset" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Website address")).toHaveValue("");
});

test("layout never scrolls sideways", async ({ page }) => {
  await page.getByLabel("Website address").fill("example.com");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("phones get a bottom bar and a preview sheet", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile only");
  await page.getByLabel("Website address").fill("example.com");
  const bar = page.getByRole("button", { name: "Open preview and download options" });
  await expect(bar).toBeVisible();
  await bar.click();
  const sheet = page.getByRole("dialog", { name: "Your QR code" });
  // The dialog root is a zero-size wrapper around fixed-position content, so check its title.
  await expect(sheet.getByRole("heading", { name: "Your QR code" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Download PNG" })).toBeEnabled();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();
});

for (const theme of ["light", "dark"] as const) {
  test(`no serious accessibility violations (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.reload();
    await page.getByLabel("Website address").fill("example.com");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });
}

test("the scan check verifies the rendered code with a real decoder", async ({ page }) => {
  await page.getByLabel("Website address").fill("example.com/verify");
  await expect(
    page.getByText("Verified scannable").filter({ visible: true }).first(),
  ).toBeVisible();

  // Nearly invisible colors fail the real decode, not just the contrast rule.
  await page.getByLabel("Code color", { exact: true }).fill("#F4F4F4");
  await page.getByLabel("Code color", { exact: true }).blur();
  await expect(page.getByText("May not scan").filter({ visible: true }).first()).toBeVisible();
});

test("works offline after the first visit", async ({ page, context }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "service worker behaviour is viewport-independent",
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Reload once so the page is controlled by the worker, then go offline.
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByLabel("Website address").fill("example.com/offline");
  await expect(
    page.getByText("Verified scannable").filter({ visible: true }).first(),
  ).toBeVisible();
  await context.setOffline(false);
});
