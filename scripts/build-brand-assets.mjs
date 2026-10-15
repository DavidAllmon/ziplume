// Renders every brand asset (favicons, app icons, social images, logo lockups and the email
// header) from the shared mark in components/brand/mark.ts. Run with: npm run brand
// BRAND_SITE_URL sets the address the social image's QR code opens (default: the live site).
//
// Uses Playwright's Chromium so text renders with the app's own fonts.
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { BRAND, markSvg } from "../components/brand/mark.ts";

const root = resolve(import.meta.dirname, "..");
const out = (path) => resolve(root, path);
const SITE = process.env.BRAND_SITE_URL ?? "https://qr.techitdave.com";

async function fontFace(family, file, weight, extra = "") {
  const data = await readFile(out(`node_modules/${file}`));
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2");font-weight:${weight};${extra}}`;
}

const fonts = [
  await fontFace(
    "Archivo",
    "@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2",
    "100 900",
    "font-stretch:62% 125%;",
  ),
  await fontFace(
    "IBM Plex Sans",
    "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
    "100 700",
  ),
].join("");

/** "ZIPLUME" in wide capitals; corners in `frame` color when given. */
const wordmark = (size, color, frame) =>
  `<span class="wm${frame ? " framed" : ""}" style="font-size:${size}px;color:${color};${frame ? `--frame:${frame}` : ""}">${frame ? "<i></i><i></i><i></i><i></i>" : ""}ZIPLUME</span>`;

const WORDMARK_CSS = `.wm{position:relative;display:inline-block;font-family:Archivo;font-weight:700;font-variation-settings:"wdth" 125;letter-spacing:.14em;line-height:1}
.wm.framed{padding:.3em .36em .3em .5em}
.wm i{position:absolute;width:.36em;height:.36em;border:0 solid var(--frame)}
.wm i:nth-child(1){left:0;top:0;border-top-width:.06em;border-left-width:.06em}
.wm i:nth-child(2){right:0;top:0;border-top-width:.06em;border-right-width:.06em}
.wm i:nth-child(3){left:0;bottom:0;border-bottom-width:.06em;border-left-width:.06em}
.wm i:nth-child(4){right:0;bottom:0;border-bottom-width:.06em;border-right-width:.06em}`;

const page = (body, css = "") => `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
*{box-sizing:border-box;margin:0}
html,body{background:transparent}
${WORDMARK_CSS}
${css}
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 1 });

async function render(html, { width, height, path, transparent = true, beforeShot }) {
  const tab = await context.newPage();
  await tab.setViewportSize({ width, height });
  await tab.setContent(html, { waitUntil: "load" });
  if (beforeShot) await beforeShot(tab);
  await tab.evaluate(() => document.fonts.ready);
  const buffer = await tab.screenshot({
    omitBackground: transparent,
    clip: { x: 0, y: 0, width, height },
  });
  await tab.close();
  if (path) {
    await mkdir(dirname(out(path)), { recursive: true });
    await writeFile(out(path), buffer);
    console.log(`  ${path}`);
  }
  return buffer;
}

const sized = (svg, size) => svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
const svgPage = (svg, size) =>
  page(`<div style="width:${size}px;height:${size}px">${sized(svg, size)}</div>`);

/** Packs PNG images into a .ico container (PNG-compressed entries, supported everywhere). */
function buildIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

console.log("Rendering brand assets…");

// Vector files
await mkdir(out("public/brand"), { recursive: true });
await writeFile(out("app/icon.svg"), markSvg("tile"));
await writeFile(out("public/brand/logo-mark.svg"), markSvg("light"));
await writeFile(out("public/brand/logo-mark-dark.svg"), markSvg("dark"));
await writeFile(out("public/brand/logo-tile.svg"), markSvg("tile"));
console.log("  app/icon.svg, public/brand/logo-mark{,-dark}.svg, public/brand/logo-tile.svg");

// Favicon: the small mark at 16 px, the tile at 32 and 48.
const icoImages = [];
for (const size of [16, 32, 48]) {
  const svg = markSvg(size <= 24 ? "small" : "tile");
  icoImages.push({ size, data: await render(svgPage(svg, size), { width: size, height: size }) });
}
await writeFile(out("app/favicon.ico"), buildIco(icoImages));
console.log("  app/favicon.ico");

await render(svgPage(markSvg("bleed"), 180), {
  width: 180,
  height: 180,
  path: "app/apple-icon.png",
  transparent: false,
});
await render(svgPage(markSvg("tile"), 192), {
  width: 192,
  height: 192,
  path: "public/icons/icon-192.png",
});
await render(svgPage(markSvg("tile"), 512), {
  width: 512,
  height: 512,
  path: "public/icons/icon-512.png",
});
await render(svgPage(markSvg("bleed"), 512), {
  width: 512,
  height: 512,
  path: "public/icons/icon-maskable-512.png",
  transparent: false,
});

// README and press lockups (mark plus wordmark), light and dark.
const lockup = (dark) =>
  page(
    `<div class="lockup">${sized(markSvg(dark ? "dark" : "light"), 80)}${wordmark(52, dark ? "#E6EEFA" : BRAND.navy)}</div>`,
    `.lockup{display:flex;align-items:center;gap:22px;padding:20px 12px}`,
  );
await render(lockup(false), { width: 640, height: 120, path: "public/brand/logo-lockup.png" });
await render(lockup(true), { width: 640, height: 120, path: "public/brand/logo-lockup-dark.png" });

// Email header: a navy band with the mark and the framed wordmark (shown at 520×80).
await render(
  page(
    `<div class="band">${sized(markSvg("dark"), 72)}${wordmark(44, "#FFFFFF", BRAND.scan)}</div>`,
    `.band{display:flex;align-items:center;gap:24px;width:1040px;height:160px;padding:0 56px;background:${BRAND.navy}}`,
  ),
  { width: 1040, height: 160, path: "public/brand/email-header.png", transparent: false },
);

// Social preview image (1200×630): film background, framed wordmark, tagline and a live QR.
const og = page(
  `<main>
    <section class="copy">
      ${wordmark(40, "#E6EEFA", BRAND.scan)}
      <h1>Make it. Link it.<br/><em>Share it.</em></h1>
      <p>QR codes, short links, and simple sharing tools.</p>
    </section>
    <section class="card"><div id="qr"></div></section>
    <div class="beam"></div>
  </main>`,
  `body{width:1200px;height:630px;background:${BRAND.film};font-family:"IBM Plex Sans";color:#E6EEFA;overflow:hidden}
   main{position:relative;display:flex;align-items:center;justify-content:space-between;height:100%;padding:0 88px;
     background-image:repeating-linear-gradient(0deg,rgba(92,225,255,.06) 0 1px,transparent 1px 48px),repeating-linear-gradient(90deg,rgba(92,225,255,.06) 0 1px,transparent 1px 48px)}
   h1{margin-top:44px;font:600 68px/1.08 Archivo;font-variation-settings:"wdth" 112;letter-spacing:-.01em}
   h1 em{font-style:normal;color:${BRAND.scan}}
   p{margin-top:22px;font-size:28px;line-height:1.4;color:#A9B6CC}
   .card{position:relative;z-index:1;padding:26px;border-radius:24px;background:#fff;box-shadow:0 30px 80px -20px rgba(0,0,0,.6)}
   #qr canvas{display:block;width:320px;height:320px}
   .beam{position:absolute;left:0;right:0;top:330px;height:2px;background:${BRAND.scan};opacity:.55;box-shadow:0 0 18px 2px rgba(92,225,255,.45)}`,
);
const ogImage = await render(og, {
  width: 1200,
  height: 630,
  path: "app/opengraph-image.png",
  transparent: false,
  beforeShot: async (tab) => {
    await tab.addScriptTag({ path: out("node_modules/qr-code-styling/lib/qr-code-styling.js") });
    await tab.evaluate(async (data) => {
      const qr = new window.QRCodeStyling({
        width: 320,
        height: 320,
        type: "canvas",
        margin: 0,
        data,
        qrOptions: { errorCorrectionLevel: "M" },
        dotsOptions: { type: "rounded", color: "#0A1330" },
        cornersSquareOptions: { type: "extra-rounded", color: "#0B6E8C" },
        cornersDotOptions: { type: "dot", color: "#0B6E8C" },
        backgroundOptions: { color: "#FFFFFF" },
      });
      qr.append(document.getElementById("qr"));
      await new Promise((r) => setTimeout(r, 300));
    }, SITE);
  },
});
await writeFile(out("app/twitter-image.png"), ogImage);
console.log("  app/twitter-image.png");

await browser.close();
console.log("Done.");
