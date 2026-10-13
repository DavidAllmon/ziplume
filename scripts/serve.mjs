// Minimal static file server for the exported site in ./out.
// Usage: node scripts/serve.mjs [--port 3000]
// Honors NEXT_PUBLIC_BASE_PATH so the export can be served exactly as GitHub Pages does.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

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
  res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`Serving ./out at http://localhost:${port}${basePath}/`);
});
