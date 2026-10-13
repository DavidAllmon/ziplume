// Minimal static file server for the exported site in ./out.
// Usage: node scripts/serve.mjs [--port 3000]
// Honors NEXT_PUBLIC_BASE_PATH and gzips text, so the export is served much as GitHub Pages does.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { createGzip } from "node:zlib";

const root = resolve("out");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const portFlag = process.argv.indexOf("--port");
const port = Number(portFlag > -1 ? process.argv[portFlag + 1] : (process.env.PORT ?? 3000));

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function resolveFile(urlPath) {
  const candidate = normalize(join(root, urlPath));
  if (!candidate.startsWith(root)) return null;
  for (const file of [candidate, join(candidate, "index.html"), `${candidate}.html`]) {
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  if (basePath) {
    if (path === "/") {
      res.writeHead(302, { Location: `${basePath}/` }).end();
      return;
    }
    if (!path.startsWith(basePath)) {
      res.writeHead(404).end("Not found");
      return;
    }
    path = path.slice(basePath.length) || "/";
  }
  const file = await resolveFile(path);
  if (!file) {
    res.writeHead(404).end("Not found");
    return;
  }
  const type = types[extname(file)] ?? "application/octet-stream";
  const headers = {
    "Content-Type": type,
    // Hashed build assets never change; everything else is revalidated.
    "Cache-Control": path.startsWith("/_next/static/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate",
  };
  const compressible = /^(text\/|application\/(json|manifest\+json)|image\/svg)/.test(type);
  if (compressible && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "")) {
    res.writeHead(200, { ...headers, "Content-Encoding": "gzip", Vary: "Accept-Encoding" });
    createReadStream(file).pipe(createGzip()).pipe(res);
    return;
  }
  res.writeHead(200, headers);
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`Serving ./out at http://localhost:${port}${basePath}/`);
});
