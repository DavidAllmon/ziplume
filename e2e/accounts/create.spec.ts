import { expect, test, type Page } from "@playwright/test";

import { MAKER, seed } from "./fixtures";

/** A datetime-local value at 09:00, some days from now, in the browser's time zone. */
function localDateTime(daysFromNow: number) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
}

const createButton = (page: Page) =>
  page.getByRole("region", { name: "Code" }).getByRole("button", { name: "Create code" });
const openTab = (page: Page, name: string) => page.getByRole("tab", { name }).click();

const draftKey = () => `ziplume:draft:v2:${seed().makerId}`;
const storedDraft = (page: Page) =>
  page.evaluate((key) => window.localStorage.getItem(key), draftKey());

test.describe("creating codes", () => {
  test.use({ storageState: MAKER.state });

  test("creates a trackable, password-protected, scheduled code in one pass", async ({ page }) => {
    await page.goto("codes/new?type=url");
    await page.getByLabel("Website address").fill("https://example.com/launch");
    await openTab(page, "Settings");
    await page.getByLabel(/Code password/).fill("launch-2026");
    await page.getByLabel("Starts (optional)").fill(localDateTime(1));
    await page.getByLabel("Ends").fill(localDateTime(30));
    await page.getByLabel("Code name").fill("Launch poster");
    await createButton(page).click();

    await expect(page).toHaveURL(/\/codes\/[0-9a-f-]+#download$/);
    await expect(page.getByRole("heading", { level: 1, name: "Launch poster" })).toBeVisible();
    await expect(page.getByText("Password protected")).toBeVisible();
    await page.goto("codes");
    const row = page.getByRole("listitem", { name: "Launch poster" });
    await expect(row.getByText("Scheduled").filter({ visible: true }).first()).toBeVisible();
  });

  test("starts clean, and an unfinished code comes back from the gallery or on Resume", async ({
    page,
  }) => {
    await page.goto("codes/new?type=url");
    await page.getByLabel("Website address").fill("https://example.com/draft");
    await openTab(page, "Settings");
    await page.getByLabel(/Code password/).fill("draft-secret");
    await page.getByLabel("Code name").fill("Draft poster");
    // Drafts are saved half a second after the last change, without the password.
    // Wait for the save after the last change: a slow machine can save after the link alone.
    await expect.poll(() => storedDraft(page)).toContain("Draft poster");
    expect(await storedDraft(page)).toContain("example.com/draft");
    expect(await storedDraft(page)).not.toContain("draft-secret");

    // The gallery offers it, and Continue opens it straight away.
    await page.goto("codes/new");
    await page.getByRole("link", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/codes\/new\?type=url&resume=1$/);
    await expect(page.getByLabel("Website address")).toHaveValue("https://example.com/draft");
    await expect(page.getByLabel("Code name")).toHaveValue("Draft poster");

    // Opening the editor directly offers it too, and restores it only on Resume.
    await page.goto("codes");
    await page.goto("codes/new?type=url");
    await expect(page.getByText(/You have an unfinished code from/)).toBeVisible();
    await expect(page.getByLabel("Website address")).toHaveValue("");
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByLabel("Website address")).toHaveValue("https://example.com/draft");
    await expect(page.getByLabel("Code name")).toHaveValue("Draft poster");
    await openTab(page, "Settings");
    await expect(page.getByLabel(/Code password/)).toHaveValue("");

    await page.goto("codes/new?type=url");
    await page.getByRole("button", { name: "Discard" }).click();
    await expect.poll(() => storedDraft(page)).toBeNull();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/You have an unfinished code/)).toHaveCount(0);
  });

  test("Show me takes you to what's missing", async ({ page }) => {
    await page.goto("codes/new?type=links");
    const bar = page.getByRole("region", { name: "Code" });
    await expect(bar.getByText("Add a title")).toBeVisible();
    await openTab(page, "QR code");
    await bar.getByRole("button", { name: "Show me" }).click();
    await expect(page.getByRole("tab", { name: "Content" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByLabel("Title", { exact: true })).toBeFocused();
    await expect(page).toHaveURL(/#content$/);
  });

  test("phones get full-size controls on the Create page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("codes/new?type=url");
    const controls = [
      ...(await page.getByRole("tab").all()),
      page.getByRole("button", { name: "Create", exact: true }),
    ];
    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await openTab(page, "QR code");
    const reset = await page.getByRole("button", { name: "Reset to style" }).boundingBox();
    expect(reset?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("a code started from a folder goes through the gallery into that folder", async ({
    page,
  }) => {
    const { makerFolderId } = seed();
    await page.goto(`codes?folder=${makerFolderId}`);
    await page.getByRole("main").getByRole("link", { name: "Create code" }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/new\\?folder=${makerFolderId}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "What do you want to make?" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /^Text/ }).click();
    await expect(page).toHaveURL(new RegExp(`type=text&folder=${makerFolderId}$`));
    await page.getByLabel("Text", { exact: true }).fill("Doors open at 6");
    await page.getByLabel("Code name").fill("Door note");
    await openTab(page, "Settings");
    await expect(page.getByLabel("Folder", { exact: true })).toHaveValue(makerFolderId);
    await createButton(page).click();

    await expect(page).toHaveURL(/#download$/);
    await page.goto(`codes?folder=${makerFolderId}`);
    await expect(page.getByRole("listitem", { name: "Door note" })).toBeVisible();
  });

  test("the page preview lays out at each device's real width", async ({ page }) => {
    await page.goto("codes/new?type=links");
    const preview = page.getByRole("complementary", { name: "Preview" });
    const column = preview
      .getByRole("region", { name: "Page preview" })
      .locator("[data-page-column]");
    // The column's top padding follows the page's own width (32px, or 56px from 640px up);
    // computed styles ignore the frame's scale.
    const top = () => column.evaluate((el) => getComputedStyle(el).paddingTop);
    expect(await top()).toBe("32px");
    await preview.getByRole("radio", { name: "Tablet" }).click();
    expect(await top()).toBe("56px");
    await preview.getByRole("radio", { name: "Desktop" }).click();
    expect(await top()).toBe("56px");
    await preview.getByRole("radio", { name: "Phone" }).click();
    expect(await top()).toBe("32px");
  });

  test("the whole preview stays on a laptop screen while you scroll a long form", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("codes/new?type=links");
    const addLink = page.getByRole("button", { name: "Add link", exact: true });
    while ((await page.getByLabel("Button text", { exact: true }).count()) < 12)
      await addLink.click();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const preview = page.getByRole("complementary", { name: "Preview" });
    const frame = preview.getByRole("region", { name: "Page preview" }).locator("..");
    for (const device of ["Phone", "Tablet", "Desktop"]) {
      await preview.getByRole("radio", { name: device }).click();
      await expect
        .poll(async () => {
          const box = (await frame.boundingBox())!;
          return box.y + box.height;
        }, `${device} frame bottom`)
        .toBeLessThanOrEqual(800);
    }
  });

  test("drags links into order by keyboard and by mouse, and Escape puts one back", async ({
    page,
  }) => {
    // Tall enough that the rows stay clear of the window's top and bottom fifths, where
    // dragging scrolls it.
    await page.setViewportSize({ width: 1280, height: 1800 });
    await page.goto("codes/new?type=links");
    const addLink = page.getByRole("button", { name: "Add link", exact: true });
    while ((await page.getByLabel("Button text", { exact: true }).count()) < 3)
      await addLink.click();
    for (const [i, name] of ["A", "B", "C"].entries()) {
      await page.getByLabel("Button text", { exact: true }).nth(i).fill(name);
      await page
        .getByLabel("Link", { exact: true })
        .nth(i)
        .fill(`${name.toLowerCase()}.example.com`);
    }
    const order = () =>
      page
        .getByLabel("Button text", { exact: true })
        .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
    expect(await order()).toEqual(["A", "B", "C"]);

    // Keyboard: focus the handle, Space, arrow keys, Space. Each step is announced; wait for it
    // as a person would, since the list scrolls smoothly between moves.
    const said = page.locator('[id^="DndLiveRegion"]');
    // A drag starts listening for arrow keys on the page's next timer tick.
    const listening = () => page.evaluate(() => new Promise((done) => setTimeout(done, 0)));
    await page.getByRole("button", { name: "Drag link “A”" }).focus();
    await page.keyboard.press("Space");
    await expect(said).toHaveText(/link “A” is at position 1 of 3/);
    await listening();
    await page.keyboard.press("ArrowDown");
    await expect(said).toHaveText(/position 2 of 3/);
    await page.keyboard.press("ArrowDown");
    await expect(said).toHaveText(/position 3 of 3/);
    await page.keyboard.press("Space");
    await expect(said).toHaveText(/Dropped link “A” at position 3 of 3/);
    await expect.poll(order).toEqual(["B", "C", "A"]);

    // Escape cancels a move.
    await page.getByRole("button", { name: "Drag link “C”" }).focus();
    await page.keyboard.press("Space");
    await expect(said).toHaveText(/link “C” is at position 2 of 3/);
    await listening();
    await page.keyboard.press("ArrowUp");
    await expect(said).toHaveText(/position 1 of 3/);
    await page.keyboard.press("Escape");
    await expect(said).toHaveText(/Cancelled/);
    await expect.poll(order).toEqual(["B", "C", "A"]);

    // Mouse: drag A's handle onto B, from a still page once the rows have settled back from
    // the cancelled move.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState !== "running"),
    );
    const from = (await page.getByRole("button", { name: "Drag link “A”" }).boundingBox())!;
    const to = (await page.getByRole("button", { name: "Drag link “B”" }).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + 10, { steps: 12 });
    // Let go once the row has moved into place, as a person would.
    await expect(said).toHaveText(/link “A” is at position 1 of 3/);
    await page.mouse.up();
    await expect.poll(order).toEqual(["A", "B", "C"]);

    // The preview follows.
    const links = page
      .getByRole("complementary", { name: "Preview" })
      .getByRole("navigation", { name: "Links" });
    await expect(links.getByText(/^[ABC]$/)).toHaveText(["A", "B", "C"]);
  });

  /** From the code page, the address of its live page. */
  async function livePage(page: Page) {
    await expect(page).toHaveURL(/\/codes\/[0-9a-f-]+#download$/);
    return (await page.getByRole("link", { name: /View page/ }).getAttribute("href"))!;
  }

  test("makes a Link list from the gallery; a link switched off stays off the page", async ({
    page,
  }) => {
    await page.goto("codes/new");
    await page.getByRole("link", { name: /^Link list/ }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Header" })).toBeVisible();
    await page.getByLabel("Title").fill("Gallery links");
    await page.getByLabel("Button text", { exact: true }).first().fill("Old offer");
    await page.getByLabel("Link", { exact: true }).first().fill("example.com/old");
    await page.getByRole("button", { name: "Add link", exact: true }).click();
    // The new link goes on top, with the cursor in it.
    await expect(page.getByLabel("Button text", { exact: true }).first()).toBeFocused();
    await page.keyboard.type("Shop");
    await page.getByLabel("Link", { exact: true }).first().fill("example.com/shop");
    await page.getByRole("switch", { name: "Show link “Old offer” on the page" }).click();
    await expect(page.getByText("Hidden from your page")).toBeVisible();
    await page.getByLabel("Code name").fill("Gallery links");
    await createButton(page).click();

    await page.goto(await livePage(page));
    await expect(page.getByRole("link", { name: "Shop" })).toBeVisible();
    await expect(page.getByText("Old offer")).toHaveCount(0);
  });

  test("makes a Business page from the gallery on a phone, with a button switched off", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("codes/new");
    await page.getByRole("link", { name: /^Business/ }).click();
    await page.getByLabel("Business name").fill("Corner Cafe");
    await page.getByRole("button", { name: "Add button" }).click();
    await page.keyboard.type("Order");
    await page.getByLabel("Link", { exact: true }).first().fill("example.com/order");
    await page.getByRole("button", { name: "Add button" }).click();
    await page.keyboard.type("Catering");
    await page.getByLabel("Link", { exact: true }).first().fill("example.com/catering");
    await page.getByRole("switch", { name: "Show button “Catering” on the page" }).click();
    await page.locator('[data-actionbar="create"]').getByRole("button", { name: "Create" }).click();

    await page.goto(await livePage(page));
    await expect(page.getByRole("link", { name: "Order" })).toBeVisible();
    await expect(page.getByText("Catering")).toHaveCount(0);
  });

  test("makes an Event from the gallery, card by card", async ({ page }) => {
    await page.goto("codes/new");
    await page.getByRole("link", { name: /^Event/ }).click();
    for (const name of ["Header", "When", "Where", "Details", "Tickets"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await page.getByLabel("Event name").fill("Spring fair");
    await page.getByLabel("Starts", { exact: true }).fill(localDateTime(10));
    await page.getByLabel("Location").fill("Town hall");
    await page.getByLabel("Code name").fill("Spring fair");
    await createButton(page).click();

    await page.goto(await livePage(page));
    await expect(page.getByRole("heading", { level: 1, name: "Spring fair" })).toBeVisible();
    await expect(page.getByText("Town hall")).toBeVisible();
  });

  test("picks a theme in the editor, and the page shows its wallpaper and font", async ({
    page,
  }) => {
    await page.goto("codes/new?type=links");
    await page.getByLabel("Title").fill("Forest page");
    await page.getByLabel("Button text", { exact: true }).first().fill("Shop");
    await page.getByLabel("Link", { exact: true }).first().fill("example.com/shop");
    await openTab(page, "Look");
    await page.getByRole("radio", { name: "Forest" }).click();
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
    await page.getByLabel("Code name").fill("Forest page");
    await createButton(page).click();
    await expect(page).toHaveURL(/\/codes\/[0-9a-f-]+#download$/);
    const live = (await page.getByRole("link", { name: /View page/ }).getAttribute("href"))!;
    await page.goto(live);
    const frame = page.locator("[data-page-frame]");
    expect(await frame.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      "rgb(20, 83, 45)",
    );
    const font = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain("playfair");
  });

  test("a photo wallpaper uploads, darkens, and shows in the preview", async ({ page }) => {
    await page.goto("codes/new?type=links");
    await openTab(page, "Look");
    await page.getByRole("radio", { name: "Photo" }).click();
    await page
      .locator('[data-editor-panel="look"] input[type=file]')
      .setInputFiles("public/icons/icon-512.png");
    await expect(page.getByLabel("Darken")).toBeVisible();
    const preview = page
      .getByRole("complementary", { name: "Preview" })
      .locator("[data-page-frame]");
    await expect
      .poll(() => preview.evaluate((el) => getComputedStyle(el).backgroundImage))
      .toContain("url(");
  });

  test("warns about hard-to-read text and fixes it in one click", async ({ page }) => {
    await page.goto("codes/new?type=links");
    await openTab(page, "Look");
    await page.getByRole("radio", { name: "Custom text color" }).click();
    await page.getByRole("textbox", { name: "Text color", exact: true }).fill("#0B1430");
    await expect(page.getByText(/Text is hard to read on this wallpaper/)).toBeVisible();
    await page.getByRole("button", { name: "Use Auto" }).click();
    await expect(page.getByText(/Text is hard to read/)).toHaveCount(0);
  });

  test("the preview's menu chips don't change the editor's address", async ({ page }) => {
    await page.goto("codes/new?type=menu#content");
    await page.getByLabel("Restaurant name").fill("Diner");
    await page.getByLabel("Section name").first().fill("Starters");
    await page.getByLabel("Name", { exact: true }).first().fill("Soup");
    await page.getByRole("button", { name: /Add section/ }).click();
    await page.getByLabel("Section name").nth(1).fill("Mains");
    await page.getByLabel("Name", { exact: true }).nth(1).fill("Pie");
    const preview = page.getByRole("complementary", { name: "Preview" });
    await preview.getByText("Mains", { exact: true }).first().click();
    await expect(page).toHaveURL(/#content$/);
  });
});
