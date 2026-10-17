import { expect, test } from "@playwright/test";

import { MAKER, seed } from "./fixtures";

test.describe("Feedback with several questions", () => {
  test("a visitor answers each question, then is offered the review link", async ({ page }) => {
    await page.goto("p/PHONE-FEEDBACK-PLUS");
    const send = page.getByRole("button", { name: "Send feedback" });
    await page
      .getByRole("group", { name: /How was the food/ })
      .getByRole("radio", { name: "5: Excellent" })
      .check({ force: true });
    await expect(send).toBeDisabled();
    await page
      .getByRole("group", { name: "Would you come back?" })
      .getByRole("radio", { name: "Thumbs up" })
      .check({ force: true });
    await page
      .getByRole("group", { name: /recommend us/ })
      .getByRole("radio", { name: "10 out of 10" })
      .check({ force: true });
    await send.click();
    await expect(page.getByText("Thank you!")).toBeVisible();
    await expect(page.getByRole("link", { name: /Share it on Google/ })).toHaveAttribute(
      "href",
      "https://g.page/r/abc/review",
    );
  });

  test.describe("the owner", () => {
    test.use({ storageState: MAKER.state });

    test("sees each question summarised in its style", async ({ page, browser }) => {
      // A visitor (signed out) answers first.
      const visitor = await browser.newContext({
        baseURL: test.info().project.use.baseURL,
        storageState: { cookies: [], origins: [] },
      });
      const v = await visitor.newPage();
      await v.goto("p/MAKER-FEEDBACK");
      await v.getByRole("radio", { name: /^4 stars/ }).check({ force: true });
      await v.getByRole("radio", { name: "Thumbs down" }).check({ force: true });
      await v.getByRole("radio", { name: "9 out of 10" }).check({ force: true });
      await v.getByRole("button", { name: "Send feedback" }).click();
      await expect(v.getByText("Thank you!")).toBeVisible();
      await visitor.close();

      await page.goto(`codes/${seed().makerFeedbackId}`);
      await expect(page.getByText("4.0 out of 5")).toBeVisible();
      await expect(page.getByText("0% thumbs up")).toBeVisible();
      await expect(page.getByText("NPS 100")).toBeVisible();
      await expect(page.getByRole("link", { name: /CSV/ })).toHaveAttribute(
        "download",
        "feedback.csv",
      );
    });
  });
});
