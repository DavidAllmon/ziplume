import { createHmac } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { expectNoSidewaysScroll } from "../phone-fit";
import { MAKER, seed } from "./fixtures";

// The test server's own secret (scripts/accounts-e2e.mjs), so the test can sign an off link.
const SECRET = "accounts-e2e-only-scan-hash-secret-0123456789";
const offLink = (code: string, owner: string) =>
  `email/responses-off?c=${code}&t=${createHmac("sha256", SECRET)
    .update(`response-emails-off:${code}:${owner}`)
    .digest("base64url")}`;

// The switch is shared state, so these run in order, and a retry would start from a different place.
test.describe.configure({ mode: "serial", retries: 0 });

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("Email me new responses", () => {
  test.use({ storageState: MAKER.state });

  test("the maker switches it on, and an email's off link turns it off", async ({
    page,
    browser,
  }) => {
    const { makerFeedbackId, makerId } = seed();
    await page.goto(`codes/${makerFeedbackId}`);
    const toggle = page.getByRole("switch", { name: "Email me new responses" });
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked();
    await page.reload();
    await expect(page.getByRole("switch", { name: "Email me new responses" })).toBeChecked();

    // Signed out, as from the email.
    const context = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const visitor = await context.newPage();
    await visitor.goto(offLink(makerFeedbackId, makerId));
    await expect(
      visitor.getByRole("heading", { name: "Stop emails for “Maker feedback”?" }),
    ).toBeVisible();
    await visitor.getByRole("button", { name: "Turn off emails" }).click();
    await expect(visitor.getByRole("heading", { name: "Emails are off" })).toBeVisible();
    await visitor.goto(offLink(makerFeedbackId, "00000000-0000-4000-8000-000000000000"));
    await expect(visitor.getByRole("heading", { name: "This link doesn’t work" })).toBeVisible();
    await context.close();

    await page.reload();
    await expect(page.getByRole("switch", { name: "Email me new responses" })).not.toBeChecked();
  });

  test("the off page and the switch fit a small phone and pass axe", async ({ page }) => {
    const { makerFeedbackId, makerId } = seed();
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`codes/${makerFeedbackId}`);
    await expect(page.getByRole("switch", { name: "Email me new responses" })).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectAxeClean(page);
    for (const owner of [makerId, "00000000-0000-4000-8000-000000000000"]) {
      await page.goto(offLink(makerFeedbackId, owner));
      await expect(page.locator("main h1")).toBeVisible();
      await expectNoSidewaysScroll(page);
      await expectAxeClean(page);
    }
  });
});
