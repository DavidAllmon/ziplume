import { BUY_ME_A_COFFEE_URL, SITE_URL } from "@/lib/env";

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** A tiny branded page for short links that can't redirect (unknown, paused, unavailable). */
export function statusPage(
  status: number,
  title: string,
  message: string,
  /** Extra trusted markup under the message (e.g. a form). */
  extra = "",
): Response {
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
  form { display:flex; flex-direction:column; gap:10px; margin:0 0 16px; text-align:left; }
  label { font-weight:600; font-size:.9rem; }
  input { font:inherit; padding:12px 14px; border-radius:12px; border:1px solid var(--muted); background:var(--card); color:var(--fg); }
  button { font:inherit; font-weight:600; padding:12px 14px; border:0; border-radius:12px; background:#4f46e5; color:#fff; cursor:pointer; }
  .error { color:#b91c1c; font-weight:600; margin:0; }
  @media (prefers-color-scheme: dark) { .error { color:#fca5a5; } }
</style>
</head>
<body>
<main>
  <img src="${SITE_URL}/icons/icon-192.png" alt="">
  <h1>${escape(title)}</h1>
  <p>${escape(message)}</p>
  ${extra}
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

/** Asks for a protected code's password; posts back to /r/<slug>. */
export function passwordPage(slug: string, error?: string, status = 200): Response {
  const form = `<form method="post" action="/r/${encodeURIComponent(slug)}">
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required maxlength="128" autofocus>
    ${error ? `<p class="error" role="alert">${escape(error)}</p>` : ""}
    <button type="submit">Open</button>
  </form>`;
  return statusPage(
    status,
    "This QR code is protected",
    "Enter the password you were given to open it.",
    form,
  );
}
