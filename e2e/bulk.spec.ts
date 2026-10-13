import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { readFile } from "node:fs/promises";

import { decodeImage } from "./helpers";

test.describe("bulk creation", () => {
  test("turns a spreadsheet into a ZIP of scannable codes", async ({ page }) => {
    await page.goto("/bulk");
    await page
      .getByLabel("CSV", { exact: true })
      .fill(
        "name,url\nSpring flyer,example.com/spring\nBroken,not a link\nMenu,https://example.com/menu\n",
      );
    await expect(page.getByText("2 ready, 1 need fixing.")).toBeVisible();
    await expect(page.getByText("Enter a web address, like example.com")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download 2 codes" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("quickqreate-url-codes.zip");
    const files = unzipSync(await readFile(await download.path()));
    expect(Object.keys(files).sort()).toEqual(["index.csv", "menu.png", "spring-flyer.png"]);
    expect(strFromU8(files["index.csv"]!)).toContain(
      "spring-flyer.png,Spring flyer,https://example.com/spring",
    );
    expect(await decodeImage(page, files["menu.png"]!, "png")).toBe("https://example.com/menu");
  });

  test("reads Wi-Fi rows pasted from a spreadsheet (tabs)", async ({ page }) => {
    await page.goto("/bulk");
    await page.getByLabel("Type of code").selectOption("wifi");
    await page
      .getByLabel("CSV", { exact: true })
      .fill("name\tssid\tpassword\tsecurity\nLobby\tCafe Guest\tcoffee-time-42\tWPA2\n");
    await expect(page.getByText("1 ready.")).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download 1 code" }).click(),
    ]);
    const files = unzipSync(await readFile(await download.path()));
    expect(await decodeImage(page, files["lobby.png"]!, "png")).toBe(
      "WIFI:T:WPA;S:Cafe Guest;P:coffee-time-42;;",
    );
  });

  for (const path of ["/bulk", "/developers"]) {
    for (const theme of ["light", "dark"] as const) {
      test(`${path} has no serious accessibility violations (${theme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(path);
        if (path === "/bulk") {
          await page.getByLabel("CSV", { exact: true }).fill("name,url\nA,example.com\nB,nope\n");
          await expect(page.getByText("1 ready, 1 need fixing.")).toBeVisible();
        }
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        const serious = results.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        );
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual(
          [],
        );
      });
    }
  }
});
