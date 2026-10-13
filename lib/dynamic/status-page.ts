import { BUY_ME_A_COFFEE_URL, SITE_URL } from "@/lib/env";

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** A tiny branded page for short links that can't redirect (unknown, paused, unavailable). */
export function statusPage(status: number, title: string, message: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${escape(title)} · QuickQReate</title>
<style>
  :root { color-scheme: light dark; --bg:#f8fafc; --card:#fff; --fg:#0f172a; --muted:#475569; --link:#4338ca; --line:#e2e8f0; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0b1020; --card:#151b2e; --fg:#e8ecf7; --muted:#9aa4bf; --link:#a5b4fc; --line:#26304d; } }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:16px; background:var(--bg); color:var(--fg);
         font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif; }
  main { max-width:26rem; background:var(--card); border:1px solid var(--line); border-radius:20px; padding:32px; text-align:center; }
  img { width:48px; height:48px; border-radius:12px; }
  h1 { font-size:1.35rem; margin:16px 0 8px; }
  p { color:var(--muted); margin:0 0 16px; }
  a { color:var(--link); font-weight:600; }
</style>
</head>
<body>
<main>
  <img src="${SITE_URL}/icons/icon-192.png" alt="">
  <h1>${escape(title)}</h1>
  <p>${escape(message)}</p>
  <p><a href="${SITE_URL}/">Make your own free QR code</a> · <a href="${BUY_ME_A_COFFEE_URL}">Buy me a coffee</a></p>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
