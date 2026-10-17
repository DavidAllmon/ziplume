import { expect, test } from "@playwright/test";

import { MAKER } from "./fixtures";

// A one-page PDF, small enough to write here. pdf.js rebuilds its missing cross-reference table.
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 400]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

test.describe("Audio and PDF extras", () => {
  test.use({ storageState: MAKER.state });
  test.beforeEach(async ({ page }) => {
    await page.route(/spotify\.com|soundcloud\.com|apple\.com/, (route) => route.abort());
  });

  test("uploading a PDF draws its first page as the preview", async ({ page }) => {
    await page.goto("codes/new?type=pdf");
    await page.locator("input[type=file][data-field='files.0.file']").setInputFiles({
      name: "menu.pdf",
      mimeType: "application/pdf",
      buffer: PDF,
    });
    await expect(page.getByRole("img", { name: "First page preview" })).toBeVisible({
      timeout: 20_000,
    });
    const preview = page.getByRole("complementary", { name: "Preview" });
    await expect(preview.getByRole("img", { name: /^First page of/ })).toBeVisible();
  });

  test("several PDFs show as a list with View and Download", async ({ page }) => {
    await page.goto("p/PHONE-PDF-LIST");
    const list = page.getByRole("list", { name: "PDFs" });
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await expect(list.getByRole("link", { name: /^Download wine\.pdf/ })).toBeVisible();
  });

  test("the Spotify player waits for a tap; Listen on buttons show each service", async ({
    page,
  }) => {
    await page.goto("p/PHONE-AUDIO-PLUS");
    await expect(page.locator("iframe")).toHaveCount(0);
    for (const name of [
      "Apple Music",
      "YouTube Music",
      "Amazon Music",
      "Deezer",
      "Tidal",
      "SoundCloud",
      "Bandcamp",
      "Apple Podcasts",
    ]) {
      await expect(page.getByRole("link", { name: `Listen on ${name}` })).toBeVisible();
    }
    await page.getByRole("button", { name: "Tap to play from Spotify" }).click();
    await expect(page.locator("iframe")).toHaveAttribute(
      "src",
      "https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3",
    );
    await expect(page.getByRole("region", { name: "Tracks" }).locator("audio")).toHaveCount(1);
  });
});
