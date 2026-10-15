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
<meta name="robots" content="noindex"><title>${escape(title)} · Ziplume</title>
<style>
  :root { color-scheme: light dark; --bg:#f4f7fb; --card:#fff; --fg:#0a1330; --muted:#45506a; --link:#0b6e8c; --line:#dce3ed; }
  @media (prefers-color-scheme: dark) { :root { --bg:#070b1a; --card:#0d1428; --fg:#e6eefa; --muted:#a9b6cc; --link:#7fe9ff; --line:#232e4d; } }
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
  button { font:inherit; font-weight:600; padding:12px 14px; border:0; border-radius:12px; background:#0a1330; color:#fff; cursor:pointer; }
  @media (prefers-color-scheme: dark) { button { background:#5ce1ff; color:#04101f; } }
  .error { color:#912018; font-weight:600; margin:0; }
  @media (prefers-color-scheme: dark) { .error { color:#f97066; } }
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
