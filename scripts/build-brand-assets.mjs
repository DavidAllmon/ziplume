// Renders every brand asset (favicons, app icons, social image, README logos) from the
// shared mark geometry in components/brand/mark.ts. Run with: npm run brand
//
// Uses Playwright's Chromium so text renders with the same fonts as the app.
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { BRAND, markSvg } from "../components/brand/mark.ts";

const root = resolve(import.meta.dirname, "..");
const out = (path) => resolve(root, path);

async function fontFace(family, file, weight) {
  const data = await readFile(out(`node_modules/@fontsource-variable/${file}`));
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2");font-weight:${weight};}`;
}

const fonts = [
  await fontFace("Inter", "inter/files/inter-latin-wght-normal.woff2", "100 900"),
].join("");

const page = (body, css = "") => `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
*{box-sizing:border-box;margin:0}
html,body{background:transparent}
${css}
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 1 });

async function render(html, { width, height, path, transparent = true, scale = 1, beforeShot }) {
  const tab = await context.newPage();
  await tab.setViewportSize({ width, height });
  await tab.setContent(html, { waitUntil: "load" });
  if (beforeShot) await beforeShot(tab);
  await tab.evaluate(() => document.fonts.ready);
  const buffer = await tab.screenshot({
    omitBackground: transparent,
    clip: { x: 0, y: 0, width, height },
    scale: scale === 1 ? "css" : "device",
  });
  await tab.close();
  if (path) {
    await mkdir(dirname(out(path)), { recursive: true });
    await writeFile(out(path), buffer);
    console.log(`  ${path}`);
  }
  return buffer;
}

const svgPage = (svg, size) =>
  page(
    `<div style="width:${size}px;height:${size}px">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</div>`,
  );

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

const tile = markSvg({ background: "tile" });
const bleed = markSvg({ background: "bleed", scale: 0.6 });

// Vector files
await mkdir(out("public/brand"), { recursive: true });
await writeFile(out("app/icon.svg"), tile);
await writeFile(out("public/brand/logo-mark.svg"), markSvg());
await writeFile(out("public/brand/logo-tile.svg"), tile);
console.log("  app/icon.svg, public/brand/logo-mark.svg, public/brand/logo-tile.svg");

// Favicon (16/32/48) and app icons
const icoImages = [];
for (const size of [16, 32, 48]) {
  icoImages.push({ size, data: await render(svgPage(tile, size), { width: size, height: size }) });
}
await writeFile(out("app/favicon.ico"), buildIco(icoImages));
console.log("  app/favicon.ico");

await render(svgPage(markSvg({ background: "bleed", scale: 0.66 }), 180), {
  width: 180,
  height: 180,
  path: "app/apple-icon.png",
  transparent: false,
});
await render(svgPage(tile, 192), { width: 192, height: 192, path: "public/icons/icon-192.png" });
await render(svgPage(tile, 512), { width: 512, height: 512, path: "public/icons/icon-512.png" });
await render(svgPage(bleed, 512), {
  width: 512,
  height: 512,
  path: "public/icons/icon-maskable-512.png",
  transparent: false,
});

// README / press lockups (2x)
const lockup = (dark) =>
  page(
    `<div class="lockup">${markSvg({ ink: dark ? "#818CF8" : BRAND.indigo }).replace("<svg ", '<svg width="88" height="88" ')}<span>Quick<b>QR</b>eate</span></div>`,
    `.lockup{display:flex;align-items:center;gap:20px;padding:16px 8px;font:700 72px/1 "Inter";letter-spacing:-0.025em;color:${dark ? "#E8ECF7" : BRAND.ink}}
     .lockup b{font-weight:700;color:${dark ? "#A5B4FC" : BRAND.indigo}}`,
  );
await render(lockup(false), { width: 560, height: 120, path: "public/brand/logo-lockup.png" });
await render(lockup(true), { width: 560, height: 120, path: "public/brand/logo-lockup-dark.png" });

// Social preview image (1200×630)
const og = page(
  `<main>
    <section class="copy">
      <div class="lockup">${markSvg({ ink: "#818CF8" }).replace("<svg ", '<svg width="64" height="64" ')}<span>Quick<b>QR</b>eate</span></div>
      <h1>Create a QR code<br/>in seconds.</h1>
      <p>Links, Wi-Fi, contacts, email &amp; SMS.<br/>Free, private, no sign-up.</p>
    </section>
    <section class="card">
      <div id="qr"></div>
      <div class="badge"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Ready to scan</div>
    </section>
  </main>`,
  `body{width:1200px;height:630px;background:#0B1020;font-family:Inter;color:#E8ECF7;overflow:hidden}
   main{position:relative;display:flex;align-items:center;justify-content:space-between;height:100%;padding:0 88px;
     background:radial-gradient(700px 500px at 85% 40%,rgba(91,91,240,.35),transparent 70%),radial-gradient(500px 400px at 0% 100%,rgba(163,230,53,.12),transparent 70%)}
   .lockup{display:flex;align-items:center;gap:14px;font:700 40px/1 "Inter";letter-spacing:-0.025em}
   .lockup b{font-weight:700;color:#A5B4FC}
   h1{margin-top:48px;font:700 68px/1.05 "Inter";letter-spacing:-0.03em}
   p{margin-top:24px;font-size:28px;line-height:1.4;color:#9AA4BF}
   .card{position:relative;padding:28px;border-radius:36px;background:#fff;box-shadow:0 30px 80px -20px rgba(0,0,0,.6);transform:rotate(3deg)}
   #qr canvas{display:block;width:340px;height:340px}
   .badge{position:absolute;left:50%;bottom:-26px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:12px 22px;border-radius:999px;background:#A3E635;color:#1A2E05;font:600 22px/1 Inter;white-space:nowrap;box-shadow:0 12px 30px -10px rgba(0,0,0,.5)}`,
);
const ogImage = await render(og, {
  width: 1200,
  height: 630,
  path: "app/opengraph-image.png",
  transparent: false,
  beforeShot: async (tab) => {
    await tab.addScriptTag({ path: out("node_modules/qr-code-styling/lib/qr-code-styling.js") });
    await tab.evaluate(async () => {
      const qr = new window.QRCodeStyling({
        width: 340,
        height: 340,
        type: "canvas",
        margin: 0,
        data: "https://davidallmon.github.io/QuickQReate/",
        qrOptions: { errorCorrectionLevel: "M" },
        dotsOptions: { type: "rounded", color: "#0F172A" },
        cornersSquareOptions: { type: "extra-rounded", color: "#4F46E5" },
        cornersDotOptions: { type: "dot", color: "#4F46E5" },
        backgroundOptions: { color: "#FFFFFF" },
      });
      qr.append(document.getElementById("qr"));
      await new Promise((r) => setTimeout(r, 300));
    });
  },
});
await writeFile(out("app/twitter-image.png"), ogImage);
console.log("  app/twitter-image.png");

await browser.close();
console.log("Done.");
