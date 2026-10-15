import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

import {
  encodeContact,
  encodeEmail,
  encodeLocation,
  encodeSms,
  encodeWhatsApp,
  encodeWifi,
} from "../lib/qr/encoders";
import { chooseType, decodeDownload, downloadCode } from "./helpers";

// Downloads are decoded with jsQR, so these tests prove the files actually scan.
test.describe("generated codes scan back to the right content", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Decoding is viewport-independent");
    await page.goto("./");
  });

  test("link", async ({ page }) => {
    await page.getByLabel("Website address").fill("example.com/menu?table=12");
    const download = await downloadCode(page);
    expect(download.suggestedFilename()).toBe("ziplume-url-example-com.png");
    expect(await decodeDownload(page, download)).toBe("https://example.com/menu?table=12");
  });

  test("text with emoji and accents", async ({ page }) => {
    await chooseType(page, "Text");
    const text = "Café ☕ Zoë 東京 🎉";
    await page.getByLabel("Text").fill(text);
    expect(await decodeDownload(page, await downloadCode(page))).toBe(text);
  });

  test("Wi-Fi with special characters", async ({ page }) => {
    await chooseType(page, "Wi-Fi");
    await page.getByLabel("Network name (SSID)").fill('Café;"Guest"');
    await page.getByLabel("Password", { exact: true }).fill("p@ss:word,123");
    await page.getByText("Hidden network").click();
    const expected = encodeWifi({
      ssid: 'Café;"Guest"',
      password: "p@ss:word,123",
      security: "WPA",
      hidden: true,
    });
    expect(await decodeDownload(page, await downloadCode(page))).toBe(expected);
  });

  test("contact card", async ({ page }) => {
    await chooseType(page, "Contact");
    await page.getByLabel("First name").fill("Zoë");
    await page.getByLabel("Last name").fill("Ångström");
    await page.getByLabel("Phone").fill("+1 555 010 9999");
    await page.getByLabel("Company").fill("Smith, Jones; Co");
    const expected = encodeContact({
      firstName: "Zoë",
      lastName: "Ångström",
      phone: "+1 555 010 9999",
      email: "",
      company: "Smith, Jones; Co",
      title: "",
      website: "",
    });
    expect(await decodeDownload(page, await downloadCode(page))).toBe(expected);
  });

  test("email, phone and SMS", async ({ page }) => {
    await chooseType(page, "Email");
    await page.getByLabel("Send to").fill("hello@example.com");
    await page.getByLabel("Subject").fill("Order #42 & more");
    expect(await decodeDownload(page, await downloadCode(page))).toBe(
      encodeEmail({ to: "hello@example.com", subject: "Order #42 & more", body: "" }),
    );

    await chooseType(page, "Phone");
    await page.getByLabel("Phone number").fill("+44 20 7946 0958");
    expect(await decodeDownload(page, await downloadCode(page))).toBe("tel:+442079460958");

    await chooseType(page, "SMS");
    await page.getByLabel("Phone number").fill("555-0100");
    await page.getByLabel("Message").fill("Count me in");
    expect(await decodeDownload(page, await downloadCode(page))).toBe(
      encodeSms({ phone: "555-0100", message: "Count me in" }),
    );
  });

  test("WhatsApp, location and payment", async ({ page }) => {
    await chooseType(page, "WhatsApp");
    await page.getByLabel("WhatsApp number").fill("+1 555 010 9999");
    await page.getByLabel("Message").fill("Table for two?");
    expect(await decodeDownload(page, await downloadCode(page))).toBe(
      encodeWhatsApp({ phone: "+1 555 010 9999", message: "Table for two?" }),
    );

    await chooseType(page, "Location");
    await page.getByLabel("Address or place name").fill("Eiffel Tower, Paris");
    expect(await decodeDownload(page, await downloadCode(page))).toBe(
      encodeLocation({
        mode: "address",
        query: "Eiffel Tower, Paris",
        latitude: "",
        longitude: "",
      }),
    );

    await chooseType(page, "Payment");
    await page.getByLabel("Pay with").selectOption("bitcoin");
    await page.getByLabel("Bitcoin address").fill("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq");
    await page.getByLabel(/Amount in BTC/).fill("0.0005");
    expect(await decodeDownload(page, await downloadCode(page))).toBe(
      "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.0005",
    );
  });

  test("every pattern, corner and center style", async ({ page }) => {
    await page.getByLabel("Website address").fill("https://example.com/styles");
    await page.getByRole("button", { name: "Shape" }).click();
    const patterns = ["Square", "Rounded", "Fluid", "Dots", "Classy", "Leaf"];
    const corners = ["Square", "Rounded", "Circle", "Classy", "Leaf"];
    const centers = ["Match", "Square", "Rounded", "Circle", "Classy"];
    // Each pattern once, cycling through corner and center styles so every option is covered.
    for (const [i, pattern] of patterns.entries()) {
      const corner = corners[i % corners.length]!;
      const center = centers[(i + 2) % centers.length]!;
      await page
        .getByRole("radiogroup", { name: "Pattern" })
        .getByRole("radio", { name: pattern })
        .click();
      await page
        .getByRole("radiogroup", { name: "Corners", exact: true })
        .getByRole("radio", { name: corner })
        .click();
      await page
        .getByRole("radiogroup", { name: "Corner centers" })
        .getByRole("radio", { name: center })
        .click();
      const payload = await decodeDownload(page, await downloadCode(page));
      expect(payload, `${pattern} + ${corner} + ${center}`).toBe("https://example.com/styles");
    }
  });

  test("frames, gradients, corner colors and icons still scan", async ({ page }) => {
    await page.getByLabel("Website address").fill("https://example.com/framed");
    // Colors is open by default.
    await page
      .getByRole("radiogroup", { name: "Fill" })
      .getByRole("radio", { name: "Linear" })
      .click();
    await page.getByText("Custom corner colors").click();
    await page.getByRole("button", { name: /^Frame/ }).click();
    await page.getByRole("button", { name: /^Logo/ }).click();
    await page.getByRole("radio", { name: "Icon" }).click();
    await page.getByRole("button", { name: "Wi-Fi icon" }).click();
    for (const frame of ["Label below", "Label above", "Badge", "Bubble"]) {
      await page
        .getByRole("radiogroup", { name: "Frame" })
        .getByRole("radio", { name: frame })
        .click();
      const download = await downloadCode(page);
      expect(await decodeDownload(page, download), frame).toBe("https://example.com/framed");
    }
    await expect(page.getByText("Verified scannable").first()).toBeVisible();
  });

  test("quick styles apply a whole look", async ({ page }) => {
    await page.getByLabel("Website address").fill("https://example.com/quick");
    await page.getByRole("button", { name: "Styles" }).click();
    await page.getByRole("button", { name: "Sunset", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Frame/ })).toContainText("Bubble");
    expect(await decodeDownload(page, await downloadCode(page))).toBe("https://example.com/quick");
  });

  test("vector PDF and EPS downloads", async ({ page }) => {
    await page.getByLabel("Website address").fill("example.com/print");
    for (const [label, ext, signature] of [
      ["PDF", "pdf", "%PDF-"],
      ["EPS", "eps", "%!PS-Adobe-3.0 EPSF-3.0"],
    ] as const) {
      await page
        .getByRole("radiogroup", { name: "Format" })
        .getByRole("radio", { name: label })
        .click();
      const download = await downloadCode(page);
      expect(download.suggestedFilename()).toBe(`ziplume-url-example-com.${ext}`);
      const content = await readFile(await download.path());
      expect(content.subarray(0, signature.length).toString("latin1"), label).toBe(signature);
      expect(content.length, label).toBeGreaterThan(2000);
    }
  });

  test("logo raises error correction and still scans", async ({ page }) => {
    await page.getByLabel("Website address").fill("example.com/logo");
    await page.getByRole("button", { name: "Logo" }).click();
    await page.locator('input[type="file"]').setInputFiles("public/icons/icon-192.png");
    await expect(page.getByAltText("Your logo")).toBeVisible();
    await page.getByRole("button", { name: "Error correction" }).click();
    await expect(page.getByRole("radio", { name: "High", exact: true })).toBeChecked();
    expect(await decodeDownload(page, await downloadCode(page))).toBe("https://example.com/logo");

    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("radio", { name: "Medium", exact: true })).toBeChecked();
  });

  test("other formats", async ({ page }) => {
    await page.getByLabel("Website address").fill("example.com/formats");
    for (const [label, ext] of [
      ["SVG", "svg"],
      ["JPG", "jpg"],
      ["WebP", "webp"],
    ] as const) {
      await page
        .getByRole("radiogroup", { name: "Format" })
        .getByRole("radio", { name: label })
        .click();
      const download = await downloadCode(page);
      expect(download.suggestedFilename()).toBe(`ziplume-url-example-com.${ext}`);
      expect(await decodeDownload(page, download), label).toBe("https://example.com/formats");
    }
  });

  test("transparent background", async ({ page }) => {
    await page.getByLabel("Website address").fill("example.com/clear");
    await page.getByText("Transparent background").click();
    expect(await decodeDownload(page, await downloadCode(page))).toBe("https://example.com/clear");
  });
});
