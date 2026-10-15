// Post-build step: writes public/sw.js, a small service worker that keeps the generator
// working offline. It precaches the hashed build assets and the app icons, and the worker
// caches the home page itself.
// Signed-in pages, short links and the API always go to the network.
//
// The cache name is a hash of everything precached, so each deploy installs a fresh cache
// and removes the old one.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { serviceWorkerSource } from "./sw-template.mjs";

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const toUrl = (root, prefix) => (file) => `${prefix}/${relative(root, file).split(sep).join("/")}`;

const assets = walk(".next/static").map(toUrl(".next/static", "/_next/static"));
const icons = walk("public/icons").map(toUrl("public", ""));
// The worker caches the home page itself (it forwards on an old address).
const pages = ["/manifest.webmanifest", "/icon.svg", "/favicon.ico", "/apple-icon.png"];
const urls = [...pages, ...icons, ...assets];

const hash = createHash("sha256");
hash.update(readFileSync(".next/BUILD_ID"));
for (const file of [...walk(".next/static"), ...walk("public/icons")].sort())
  hash.update(readFileSync(file));
const version = hash.digest("hex").slice(0, 12);

writeFileSync("public/sw.js", serviceWorkerSource({ version, urls }));
console.log(`Service worker: ${urls.length} files precached (cache ziplume-${version})`);
