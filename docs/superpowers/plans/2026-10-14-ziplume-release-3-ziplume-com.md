# Ziplume Release 3: the Move to ziplume.com Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ziplume moves from `qr.techitdave.com` to **ziplume.com** behind Cloudflare's proxy, with
nothing breaking:
- every printed `HTTPS://QR.TECHITDAVE.COM/R/<SLUG>` keeps scanning and counting
- hosted pages and API keys keep working on the old address
- Google's sign-in screen says ziplume.com
- mail comes from `no-reply@ziplume.com`
- afterwards the repo becomes `DavidAllmon/ziplume`

**Architecture:**
- **One address rule.** `lib/hosts.ts` holds pure functions for the rule. `proxy.ts` applies it
  to every request:
  - an old address (`LEGACY_HOSTS`, a runtime setting) serves short links, hosted pages, the
    API and their files itself, and 308-forwards everything else to `NEXT_PUBLIC_SITE_URL`
  - `www` forwards everything
  - the session refresh now runs only on app pages
- **Pass-through.** Three paths on the site are external rewrites in `next.config.ts` to the
  Supabase project:
  - `/auth/v1/authorize` and `/auth/v1/callback`, for Google sign-in
  - `/storage/v1/object/public/*`, for public files
  - The Google button asks supabase-js for the sign-in address without leaving the page, moves
    it onto the site's address, then goes there.
  - Public file links are built from the site address.
- **Outside services** (Cloudflare, Brevo, Coolify, the Supabase panel, Google Cloud, GitHub)
  are configured in three stages:
  - preparation, which changes nothing for users
  - a short switch: settings, merge, settings
  - after-switch steps, one at a time

**Tech Stack:** Next.js 16 (`proxy.ts`, external rewrites), React 19, supabase-js
(`skipBrowserRedirect`), Vitest (jsdom and node environments, `node:vm` for the service worker),
Playwright (public and signed-in suites, with `Host` header overrides), Cloudflare, Brevo,
Coolify 4, the self-hosted Supabase panel, Google Cloud, GitHub (`gh`).

**Spec:** `docs/superpowers/specs/2026-10-14-ziplume-rebrand-design.md`, section 5 (Release 3).
Read sections 1, 2, 5 and 7.

**Where this plan departs from the spec, and why.** Each was checked against the live app on
2026-10-15:
1. **Feedback origin check.** Spec 5.1 says hosted-page feedback "also accepts the request's own
   origin". Behind Coolify, a route handler's `request.nextUrl.origin` is not the public
   address: a POST to the app's sslip.io address with its own `Origin` got 403. So the check
   compares the `Origin` host with the request's `Host` header instead (Task 3).
2. **Scans on the old address keep hosted pages there.** Otherwise, for a password-protected page:
   - the unlock cookie lands on qr.techitdave.com
   - the visitor is sent on to ziplume.com/p/…, which has no cookie
   - so they type the password twice

   Scan targets now use the old address when the scan came in on it (Task 3). `/p/*` is served
   there directly anyway.
3. **The offline helper caches the home page separately.** On the old address `/` forwards, and
   a worker that precaches `/` would fail to install, so it wouldn't "update in place" as 5.1
   intends (Task 7).
4. **`www` forwarding.** It is also in the app's rule, as a backstop to Coolify's redirect (Task 1).

## Global Constraints

- **Addresses:**
  - `NEXT_PUBLIC_SITE_URL` is the one true address: `https://ziplume.com`.
  - `LEGACY_HOSTS=qr.techitdave.com` is a runtime setting.
  - `www.ziplume.com` forwards to `https://ziplume.com`.
  - Short links are `ziplume.com/r/<slug>`.
- **Old address:**
  - **Served directly:** `/r/*`, `/R/*`, `/p/*`, `/api/*`, `/_next/*`, `/email-templates/*`,
    `/brand/*`, `/icons/*`, `/sw.js`, `/favicon.ico`, `/icon.svg`, `/apple-icon.png`,
    `/manifest.webmanifest`, `/opengraph-image.png`, `/twitter-image.png`.
  - **Everything else:** a 308 to `https://ziplume.com` + the same path and query.
  - `127.0.0.1`, `localhost` and unknown hosts are never forwarded.
- **Pass-through to Supabase:** `/auth/v1/authorize`, `/auth/v1/callback`,
  `/storage/v1/object/public/*`. Uploads, the database API and realtime keep talking to Supabase
  directly.
- **Mail:**
  - Sender: `Ziplume <no-reply@ziplume.com>`, verified in Brevo.
  - `support@ziplume.com` and `dmarc@ziplume.com` forward to `dallmon@techitdave.com`.
  - One SPF record: `v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all`.
  - DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@ziplume.com`.
- **DNS** (spec section 2, verbatim):
  - Only the records named in this spec are added, all in the ziplume.com zone.
  - The one exception in `techitdave.com` is turning on the proxy for the `qr` record (5.6).
  - That happens only after David sees and approves the exact settings involved.
  - No other techitdave.com record or setting changes.
- **Shared server:** the Supabase Multitenant resource is left untouched. Project-level auth
  settings change only through the panel's project environment, as at go-live. Then restart only
  this project's auth service.
- **Secrets and sign-ins:**
  - David enters every password, key and secret, and signs in to Cloudflare, Google Cloud,
    Brevo and the Supabase panel himself.
  - Claude never types them, and never writes them into git, docs, screenshots or messages.
  - If a site asks to sign in, stop and ask David.
- **David's data:**
  - Live checks don't create or delete data in his account unless he says yes.
  - No email is sent on his behalf without his OK.
  - No purchases.
- **No migration** in this release.
- **Unchanged names:**
  - `quickqreate:v1`, which the generator only deletes
  - the iCal UID suffix `@quickqreate`
  - `quickqreate.invalid`
  - the Supabase project's own address and slug
  - the local folder `~/Repos/QuickQReate`
- **Commits** end with:
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
- **Test commands:**
  - unit: `npm test -- <path>`
  - `npm run lint`, `npm run typecheck`, `npm run format:check`
  - public browser: `NEXT_PUBLIC_SITE_URL=http://localhost:4173 npm run build && npm run test:e2e`
  - signed-in browser: `npm run test:e2e:accounts`. It builds its own copy and needs the local
    Supabase running with every migration applied: `npm run db:start`, then
    `npx --yes supabase@2.120.0 migration up --local`, then
    `docker exec supabase_db_quickqreate psql -U postgres -c "notify pgrst, 'reload schema';"`.
- **Branch:** `feat/ziplume-domain`, from `main` at `97f500d`.

## Review Focus

These are the inputs and states most likely to bite, each pinned by a test in the task named:

1. **A password-protected hosted page scanned from an old printed code.** The visitor should type
   the password once. The scan must send them to the page on the address it came in on. Task 3:
   signed-in test "a scan on the old address keeps the visitor there".
2. **Feedback sent from a hosted page opened on the old address.** It must be accepted, while
   other sites' posts are refused. Task 3: public test "takes feedback from its own hosted pages".
3. **A rollback, or a typo, that leaves `LEGACY_HOSTS` naming the canonical host.** The site must
   keep working, with no redirect loop. Task 1: unit test "never loops when the legacy list names
   the canonical host".
4. **Seeking in audio or video on a hosted page.** Browsers ask for byte ranges, and the
   pass-through must answer 206 with just those bytes. Task 4: signed-in test "public files load
   through the site, whole or in part".
5. **The offline helper on the old address**, where `/` forwards. It must still install and
   update, and clear both old cache names. Task 7: unit tests "still installs where the home page
   forwards" and "removes old caches under both names".

---

### Task 1: The address rules

**Files:**
- Create: `lib/hosts.ts`
- Test: `lib/hosts.test.ts`

**Interfaces:**
- Consumes: `SITE_URL` from `lib/env.ts`.
- Produces (all in `lib/hosts.ts`):
  - `normalizeHost(host: string | null | undefined): string`: lowercase, no port, no trailing dot.
    Returns `""` when there is no host.
  - `parseLegacyHosts(value: string | undefined): string[]`
  - `legacyHosts(): string[]`: reads `process.env.LEGACY_HOSTS` on every call.
  - `legacyHostAction(host: string | null, pathname: string, search: string, config: { siteUrl: string; legacyHosts: readonly string[] }): string | null`:
    the 308 target, or `null` to handle the request here.
  - `siteFor(host: string | null, siteUrl?: string, hosts?: readonly string[]): string`: the
    address scan targets use. Defaults to `SITE_URL` and `legacyHosts()`.
  - `isOwnOrigin(origin: string, host: string | null, siteUrl?: string): boolean`. Defaults to
    `SITE_URL`.

- [ ] **Step 1: Write the failing tests** in `lib/hosts.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isOwnOrigin,
  legacyHostAction,
  legacyHosts,
  normalizeHost,
  parseLegacyHosts,
  siteFor,
} from "./hosts";

const SITE = "https://ziplume.com";
const OLD = ["qr.techitdave.com"];
const act = (host: string | null, path: string, search = "", legacy: readonly string[] = OLD) =>
  legacyHostAction(host, path, search, { siteUrl: SITE, legacyHosts: legacy });

afterEach(() => vi.unstubAllEnvs());

describe("host names", () => {
  it("compare without case, port or a trailing dot", () => {
    expect(normalizeHost("QR.TechitDave.com:443")).toBe("qr.techitdave.com");
    expect(normalizeHost("qr.techitdave.com.")).toBe("qr.techitdave.com");
    expect(normalizeHost("[::1]:3000")).toBe("[::1]");
    expect(normalizeHost(null)).toBe("");
  });

  it("are read from LEGACY_HOSTS, separated by commas or spaces, ignoring schemes and paths", () => {
    expect(parseLegacyHosts(undefined)).toEqual([]);
    expect(parseLegacyHosts("")).toEqual([]);
    expect(parseLegacyHosts(" qr.techitdave.com, https://Old.Example/path  old2.example:8443 ")).toEqual(
      ["qr.techitdave.com", "old.example", "old2.example"],
    );
  });

  it("come from the environment when a request is handled", () => {
    vi.stubEnv("LEGACY_HOSTS", "qr.techitdave.com");
    expect(legacyHosts()).toEqual(["qr.techitdave.com"]);
    vi.stubEnv("LEGACY_HOSTS", "");
    expect(legacyHosts()).toEqual([]);
  });
});

describe("the old address", () => {
  it.each([
    "/r/AB3X9Q",
    "/R/AB3X9Q",
    "/r",
    "/p/MENU12",
    "/p/MENU12/feedback",
    "/p/MENU12/contact.vcf",
    "/api/health",
    "/api/v1/codes/abc",
    "/_next/static/chunks/app.js",
    "/email-templates/recovery.html",
    "/brand/email-header.png",
    "/icons/icon-192.png",
    "/sw.js",
    "/favicon.ico",
    "/icon.svg",
    "/apple-icon.png",
    "/manifest.webmanifest",
    "/opengraph-image.png",
    "/twitter-image.png",
  ])("serves %s itself", (path) => {
    expect(act("qr.techitdave.com", path)).toBeNull();
  });

  it.each([
    ["/", "", "https://ziplume.com/"],
    ["/codes", "?folder=f1&workspace=w", "https://ziplume.com/codes?folder=f1&workspace=w"],
    ["/login", "?next=%2Fcodes", "https://ziplume.com/login?next=%2Fcodes"],
    [
      "/auth/confirm",
      "?token_hash=abc&type=recovery",
      "https://ziplume.com/auth/confirm?token_hash=abc&type=recovery",
    ],
    ["/auth/v1/callback", "?code=x&state=y", "https://ziplume.com/auth/v1/callback?code=x&state=y"],
    [
      "/storage/v1/object/public/avatars/u/a.png",
      "",
      "https://ziplume.com/storage/v1/object/public/avatars/u/a.png",
    ],
    ["/rx", "", "https://ziplume.com/rx"],
    ["/pricing", "", "https://ziplume.com/pricing"],
    ["/sw.js.map", "", "https://ziplume.com/sw.js.map"],
  ])("forwards %s%s", (path, search, location) => {
    expect(act("qr.techitdave.com", path, search)).toBe(location);
  });

  it("is matched in any case and with a port", () => {
    expect(act("QR.TECHITDAVE.COM", "/codes")).toBe("https://ziplume.com/codes");
    expect(act("qr.techitdave.com:443", "/codes")).toBe("https://ziplume.com/codes");
    expect(act("QR.TECHITDAVE.COM", "/R/AB3X9Q")).toBeNull();
  });
});

describe("other hosts", () => {
  it("leave the canonical address alone", () => {
    expect(act("ziplume.com", "/codes")).toBeNull();
    expect(act("ZIPLUME.COM:443", "/")).toBeNull();
  });

  it("send www to the canonical address, every path", () => {
    expect(act("www.ziplume.com", "/r/AB3X9Q", "?x=1")).toBe("https://ziplume.com/r/AB3X9Q?x=1");
  });

  it("never forward the health check, localhost or unknown hosts", () => {
    for (const host of ["127.0.0.1:3000", "localhost:3000", "4gko.152.44.42.29.sslip.io", null, ""])
      expect(act(host, "/codes")).toBeNull();
  });

  it("do nothing without a legacy setting", () => {
    expect(act("qr.techitdave.com", "/codes", "", [])).toBeNull();
  });

  it("never loops when the legacy list names the canonical host", () => {
    expect(act("ziplume.com", "/codes", "", ["ziplume.com"])).toBeNull();
  });
});

describe("scan targets", () => {
  it("stay on the old address when the scan came in there", () => {
    expect(siteFor("qr.techitdave.com", SITE, OLD)).toBe("https://qr.techitdave.com");
    expect(siteFor("QR.TECHITDAVE.COM:443", SITE, OLD)).toBe("https://qr.techitdave.com");
  });

  it("use the site address everywhere else", () => {
    expect(siteFor("ziplume.com", SITE, OLD)).toBe(SITE);
    expect(siteFor("127.0.0.1:3000", SITE, OLD)).toBe(SITE);
    expect(siteFor(null, SITE, OLD)).toBe(SITE);
  });
});

describe("our own pages", () => {
  it("are the site address or the host the request came to", () => {
    expect(isOwnOrigin("https://ziplume.com", "ziplume.com", SITE)).toBe(true);
    expect(isOwnOrigin("https://qr.techitdave.com", "qr.techitdave.com", SITE)).toBe(true);
    expect(isOwnOrigin("http://localhost:4173", "localhost:4173", "http://localhost:4173")).toBe(true);
    expect(isOwnOrigin("https://ziplume.com", "127.0.0.1:3000", SITE)).toBe(true);
  });

  it("are nothing else", () => {
    expect(isOwnOrigin("https://evil.example", "qr.techitdave.com", SITE)).toBe(false);
    expect(isOwnOrigin("https://qr.techitdave.com.evil.example", "qr.techitdave.com", SITE)).toBe(
      false,
    );
    expect(isOwnOrigin("null", "qr.techitdave.com", SITE)).toBe(false);
    expect(isOwnOrigin("https://qr.techitdave.com", null, SITE)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail.**

Run: `npm test -- lib/hosts.test.ts`
Expected: FAIL. The module `./hosts` can't be found.

- [ ] **Step 3: Write `lib/hosts.ts`:**

```ts
import { SITE_URL } from "@/lib/env";

// The address rules for the move to ziplume.com (spec 5.1). SITE_URL is the one true address.
// LEGACY_HOSTS, a runtime setting, lists old addresses that keep answering printed codes.

/** What an old address still serves itself: short links, hosted pages, the API and their files. */
const SERVED_DIRECTLY =
  /^\/(?:(?:r|R|p|api|_next|email-templates|brand|icons)(?:\/|$)|(?:sw\.js|favicon\.ico|icon\.svg|apple-icon\.png|manifest\.webmanifest|opengraph-image\.png|twitter-image\.png)$)/;

/** "QR.Example.com:443" → "qr.example.com"; "" when there is no host. */
export function normalizeHost(host: string | null | undefined): string {
  const value = (host ?? "").trim().toLowerCase();
  const name = value.startsWith("[")
    ? value.replace(/^(\[[^\]]*\]).*$/, "$1")
    : value.replace(/:\d*$/, "");
  return name.replace(/\.$/, "");
}

/** LEGACY_HOSTS: host names separated by commas or spaces. Schemes, ports and paths are ignored. */
export function parseLegacyHosts(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\s,]+/)
    .map((entry) => normalizeHost(entry.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split("/")[0]))
    .filter(Boolean);
}

/** Read for each request, so changing the setting needs no rebuild. */
export function legacyHosts(): string[] {
  return parseLegacyHosts(process.env.LEGACY_HOSTS);
}

/**
 * Where a request should go instead, or null to handle it here. An old address serves short
 * links, hosted pages, the API and their files itself, and forwards everything else with its path
 * and query; www forwards everything. The canonical host is never forwarded, so a legacy list
 * that names it can't loop.
 */
export function legacyHostAction(
  host: string | null,
  pathname: string,
  search: string,
  config: { siteUrl: string; legacyHosts: readonly string[] },
): string | null {
  const name = normalizeHost(host);
  let site: URL;
  try {
    site = new URL(config.siteUrl);
  } catch {
    return null;
  }
  if (!name || name === site.hostname) return null;
  const forward = `${site.origin}${pathname}${search}`;
  if (name === `www.${site.hostname}`) return forward;
  if (!config.legacyHosts.includes(name) || SERVED_DIRECTLY.test(pathname)) return null;
  return forward;
}

/**
 * The address a scan sends visitors on to: the old address when the scan came in there, so a
 * password unlock and the hosted page share one host. The site address everywhere else.
 */
export function siteFor(
  host: string | null,
  siteUrl: string = SITE_URL,
  hosts: readonly string[] = legacyHosts(),
): string {
  const name = normalizeHost(host);
  return name && hosts.includes(name) ? `https://${name}` : siteUrl;
}

/**
 * Whether a browser's Origin is one of our own pages: the site address, or the host the request
 * came to (Next's own idea of the request's origin is the container's, not the public address).
 */
export function isOwnOrigin(origin: string, host: string | null, siteUrl: string = SITE_URL): boolean {
  let from: URL;
  try {
    from = new URL(origin);
  } catch {
    return false;
  }
  try {
    if (from.origin === new URL(siteUrl).origin) return true;
  } catch {
    // No site address: only the request's own host counts.
  }
  const own = normalizeHost(host);
  return own !== "" && normalizeHost(from.host) === own;
}
```

- [ ] **Step 4: Run the tests to see them pass.**

Run: `npm test -- lib/hosts.test.ts`
Expected: PASS, every test.

- [ ] **Step 5: Commit.**

```bash
git add lib/hosts.ts lib/hosts.test.ts
git commit -m "Address rules for the move to ziplume.com: what an old address serves and what it forwards

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: proxy.ts applies the rules to every request

**Files:**
- Modify: `proxy.ts`
- Modify: `playwright.config.ts` (webServer env)
- Test: `proxy.test.ts` (new), `e2e/hosts.spec.ts` (new)

**Interfaces:**
- Consumes: `legacyHostAction`, `legacyHosts` (Task 1); `SITE_URL`, `accountsEnabled` from
  `lib/env.ts`; `editRedirect` from `lib/redirects.ts`; `refreshSession` from
  `lib/supabase/proxy.ts`.
- Produces: `proxy(request)` behavior:
  1. the legacy rule (308)
  2. `/R/` rewrite
  3. `/?edit=` 308
  4. session refresh only for `/`, `/codes*`, `/team*`, `/settings*`, `/account*`

  `config.matcher` = `["/((?!_next/static|_next/image).*)"]`.

- [ ] **Step 1: Write the failing unit tests** in `proxy.test.ts`:

```ts
// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

const refreshSession = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/proxy", () => ({ refreshSession }));
vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/env")>()),
  SITE_URL: "https://ziplume.com",
  accountsEnabled: true,
}));

const request = (url: string, host: string) => new NextRequest(url, { headers: { host } });

beforeEach(() => {
  vi.stubEnv("LEGACY_HOSTS", "qr.techitdave.com");
  refreshSession.mockReset().mockResolvedValue(new Response(null, { status: 200 }));
});
afterEach(() => vi.unstubAllEnvs());

describe("on the old address", () => {
  it("forwards app pages to the site address with a 308, keeping the query", async () => {
    const response = await proxy(request("http://localhost:3000/codes?folder=f1", "qr.techitdave.com"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://ziplume.com/codes?folder=f1");
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("still routes uppercase short links to the scan handler", async () => {
    const response = await proxy(request("http://localhost:3000/R/AB3X9Q", "qr.techitdave.com"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/r/AB3X9Q");
  });

  it("serves hosted pages itself", async () => {
    const response = await proxy(request("http://localhost:3000/p/MENU12", "qr.techitdave.com"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("on the site address", () => {
  it("refreshes the session on app pages", async () => {
    for (const path of ["/", "/codes", "/codes/abc/edit", "/team", "/settings/security"]) {
      await proxy(request(`https://ziplume.com${path}`, "ziplume.com"));
    }
    expect(refreshSession).toHaveBeenCalledTimes(5);
  });

  it("skips the session for short links, hosted pages, files and the pass-through", async () => {
    for (const path of [
      "/r/AB3X9Q",
      "/p/MENU12",
      "/storage/v1/object/public/avatars/u/a.png",
      "/auth/v1/callback",
      "/api/health",
      "/brand/email-header.png",
      "/codesx",
    ]) {
      const response = await proxy(request(`https://ziplume.com${path}`, "ziplume.com"));
      expect(response.headers.get("x-middleware-next"), path).toBe("1");
    }
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("keeps sending old edit links to the editor", async () => {
    const response = await proxy(request("https://ziplume.com/?edit=abc", "ziplume.com"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://ziplume.com/codes/abc/edit");
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npm test -- proxy.test.ts`
Expected: FAIL.
- "forwards app pages…" fails: the status isn't 308, because nothing forwards yet.
- "skips the session…" fails: today's `proxy()` refreshes the session on every path it's given
  once accounts are on. Only the matcher kept `/r/…` and `/p/…` away, and a direct call skips
  the matcher.

- [ ] **Step 3: Rewrite `proxy.ts`:**

```ts
import { NextResponse, type NextRequest } from "next/server";

import { accountsEnabled, SITE_URL } from "@/lib/env";
import { legacyHostAction, legacyHosts } from "@/lib/hosts";
import { editRedirect } from "@/lib/redirects";
import { refreshSession } from "@/lib/supabase/proxy";

/** The pages that read the signed-in session; only these refresh it. */
const SESSION_PATHS = /^\/(?:$|(?:codes|team|settings|account)(?:\/|$))/;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // An old address (LEGACY_HOSTS) keeps answering printed codes and forwards everything else.
  const forward = legacyHostAction(request.headers.get("host"), pathname, search, {
    siteUrl: SITE_URL,
    legacyHosts: legacyHosts(),
  });
  if (forward) return NextResponse.redirect(forward, 308);

  // Dynamic codes are encoded in uppercase (HTTPS://QR.EXAMPLE/R/AB3X9Q) so the QR can use its
  // compact alphanumeric mode; route those to the lowercase /r/ handler.
  if (pathname.startsWith("/R/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/r/${pathname.slice(3)}`;
    return NextResponse.rewrite(url);
  }

  // Old bookmarks and links to the home page's edit mode open the code in the editor.
  const edit = editRedirect(request.nextUrl);
  if (edit) return NextResponse.redirect(edit, 308);

  if (!accountsEnabled || !SESSION_PATHS.test(pathname)) return NextResponse.next();
  return refreshSession(request);
}

export const config = {
  // Every request, so the old-address rule sees them all; Next's own build files skip it.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
```

- [ ] **Step 4: Run the unit tests to see them pass.**

Run: `npm test -- proxy.test.ts lib/redirects.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the browser test** `e2e/hosts.spec.ts`. These requests say they're for
  the old host, like a scan of a printed code:

```ts
import { expect, test } from "@playwright/test";

// playwright.config.ts starts the server with LEGACY_HOSTS=qr.techitdave.com. These requests say
// they're for that host, like a scan of a printed code.
const OLD = { host: "qr.techitdave.com" };

test.describe("the old address", () => {
  test("serves short links and hosted pages itself", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "host rules don't depend on the viewport");
    for (const path of ["/r/AB3X9Q", "/R/AB3X9Q", "/p/MENU12", "/api/health", "/sw.js"]) {
      const response = await request.get(path, { headers: OLD, maxRedirects: 0 });
      expect(response.status(), path).not.toBe(308);
    }
  });

  test("forwards everything else with its path and query", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "host rules don't depend on the viewport");
    for (const path of ["/", "/codes?folder=f1&x=%20y", "/login?next=%2Fcodes"]) {
      const response = await request.get(path, { headers: OLD, maxRedirects: 0 });
      expect(response.status(), path).toBe(308);
      // The site address (CI builds with http://localhost:4173), never the old host again.
      const location = new URL(response.headers()["location"]!, "http://localhost:4173");
      expect(location.hostname).not.toBe("qr.techitdave.com");
      expect(location.pathname + location.search).toBe(path);
    }
  });
});

test("the site address and the health check are never forwarded", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "host rules don't depend on the viewport");
  expect((await request.get("/", { maxRedirects: 0 })).status()).toBe(200);
  expect((await request.get("http://127.0.0.1:4173/", { maxRedirects: 0 })).status()).toBe(200);
  expect((await request.get("http://127.0.0.1:4173/api/health", { maxRedirects: 0 })).status()).toBe(
    200,
  );
});
```

- [ ] **Step 6: Give the test server the legacy setting** in `playwright.config.ts`. This is a
  runtime setting, not a build setting, so the test also proves it's read at runtime:

```ts
  webServer: {
    command: "node scripts/start.mjs",
    env: { PORT: String(PORT), LEGACY_HOSTS: "qr.techitdave.com" },
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
  },
```

- [ ] **Step 7: Run the browser test.**

Run: `NEXT_PUBLIC_SITE_URL=http://localhost:4173 npm run build && npx playwright test e2e/hosts.spec.ts`
Expected: PASS (3 run on desktop, the rest skipped).

To see it fail first, run it on a build made before Step 3, or temporarily remove
`LEGACY_HOSTS` from the webServer env: "forwards everything else" then gets 200 instead of 308.

- [ ] **Step 8: Commit.**

```bash
git add proxy.ts proxy.test.ts e2e/hosts.spec.ts playwright.config.ts
git commit -m "The old address serves printed codes and forwards the rest; session refresh only on app pages

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Scans and feedback on the old address

**Files:**
- Modify: `app/r/[slug]/route.ts` (the GET and POST `scanTarget` calls)
- Modify: `app/p/[slug]/feedback/route.ts` (the origin check)
- Modify: `playwright.accounts.config.ts` (webServer env)
- Test: `e2e/hosts.spec.ts` (add one test), `e2e/accounts/old-address.spec.ts` (new)

**Interfaces:**
- Consumes: `siteFor`, `isOwnOrigin` (Task 1).
- Produces: a scan of a hosted-page code on an old address redirects to
  `https://<old host>/p/<slug>`. A feedback POST whose `Origin` host equals its `Host` header is
  accepted.

- [ ] **Step 1: Write the failing feedback test.** Add it to `e2e/hosts.spec.ts`, inside
  `test.describe("the old address", …)`:

```ts
  test("takes feedback from its own hosted pages", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "host rules don't depend on the viewport");
    const send = (origin: string) =>
      request.post("/p/MENU12/feedback", { headers: { ...OLD, origin }, data: { rating: 5 } });
    // The public suite has no database, so an accepted post ends at "unavailable" (503).
    expect((await send("https://qr.techitdave.com")).status()).not.toBe(403);
    expect((await send("https://evil.example")).status()).toBe(403);
  });
```

- [ ] **Step 2: Write the failing scan test** `e2e/accounts/old-address.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { seed } from "./fixtures";

// playwright.accounts.config.ts starts the app with LEGACY_HOSTS=qr.techitdave.com.
test("a scan on the old address keeps the visitor there for the hosted page", async ({
  request,
}) => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const slug = `OLD${Date.now().toString(36).toUpperCase()}`;
  const { error } = await admin.from("qr_codes").insert({
    user_id: seed().ownerId,
    name: "Old address page",
    qr_type: "links",
    is_dynamic: true,
    slug,
    content: { title: "Old address page", links: [] },
  });
  expect(error).toBeNull();

  // An old printed code: the page opens on the old address, so a password unlock (a cookie on
  // that host) and the page agree.
  const old = await request.get(`/r/${slug}`, {
    headers: { host: "qr.techitdave.com" },
    maxRedirects: 0,
  });
  expect(old.status()).toBe(302);
  expect(old.headers()["location"]).toBe(`https://qr.techitdave.com/p/${slug}`);

  // A new code: the site address.
  const site = await request.get(`/r/${slug}`, { maxRedirects: 0 });
  expect(site.headers()["location"]).toBe(`http://localhost:4174/p/${slug}`);
});
```

- [ ] **Step 3: Give the signed-in test server the legacy setting** in
  `playwright.accounts.config.ts`:

```ts
  webServer: {
    command: "node scripts/start.mjs",
    env: { PORT: String(PORT), LEGACY_HOSTS: "qr.techitdave.com" },
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
  },
```

- [ ] **Step 4: Run both tests to see them fail.**

Run: `NEXT_PUBLIC_SITE_URL=http://localhost:4173 npm run build && npx playwright test e2e/hosts.spec.ts -g "feedback"`
Expected: FAIL. The own-page post gets 403: the build's site address is localhost:4173, and
`request.nextUrl.origin` isn't the old host.

Run: `npm run test:e2e:accounts -- old-address.spec.ts`
Expected: FAIL. The old-address location is `http://localhost:4174/p/<slug>`.

- [ ] **Step 5: Fix the scan route.** In `app/r/[slug]/route.ts`, import `siteFor` and use it in
  both handlers:

```ts
import { siteFor } from "@/lib/hosts";
```

In `GET`, replace `const target = scanTarget(code, slug, scan.os, SITE_URL);` with:

```ts
  // On an old address, hosted pages open there too, so an unlock cookie and the page agree.
  const target = scanTarget(code, slug, scan.os, siteFor(request.headers.get("host")));
```

In `POST`, make the same replacement:

```ts
  const target = scanTarget(code, slug, scan.os, siteFor(request.headers.get("host")));
```

Keep the `SITE_URL` import: the unlock cookie's `secure` flag still uses it.

- [ ] **Step 6: Fix the feedback check.** In `app/p/[slug]/feedback/route.ts`, replace the
  `SITE_URL` import with `import { isOwnOrigin } from "@/lib/hosts";`, and replace the check
  with:

```ts
  // Only accept posts from our own pages: the site address, or the address this page was opened
  // on (an old printed code opens hosted pages on the old address).
  const origin = request.headers.get("origin");
  if (origin && !isOwnOrigin(origin, request.headers.get("host"))) {
    return json({ error: "forbidden" }, 403);
  }
```

- [ ] **Step 7: Run the tests to see them pass.**

Run: `NEXT_PUBLIC_SITE_URL=http://localhost:4173 npm run build && npx playwright test e2e/hosts.spec.ts`
Expected: PASS.

Run: `npm run test:e2e:accounts -- old-address.spec.ts`
Expected: PASS.

Run: `npm test -- lib/dynamic`
Expected: PASS. `scanTarget` itself is unchanged.

- [ ] **Step 8: Commit.**

```bash
git add "app/r/[slug]/route.ts" "app/p/[slug]/feedback/route.ts" e2e/hosts.spec.ts e2e/accounts/old-address.spec.ts playwright.accounts.config.ts
git commit -m "Old printed codes open hosted pages on the old address; feedback trusts the page's own host

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: The Supabase pass-through

**Files:**
- Modify: `next.config.ts` (add `rewrites`)
- Test: `next.config.test.ts` (new), `e2e/accounts/pass-through.spec.ts` (new)

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, read when the config is built.
- Produces: on the site, `/auth/v1/authorize`, `/auth/v1/callback` and
  `/storage/v1/object/public/:path*` return the Supabase project's own response.

- [ ] **Step 1: Write the failing unit test** `next.config.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import nextConfig from "./next.config";

afterEach(() => vi.unstubAllEnvs());

const rewrites = async () => (await nextConfig.rewrites!()) as { source: string; destination: string }[];

describe("the Supabase pass-through", () => {
  it("proxies Google sign-in and public files to the project", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.example/");
    expect(await rewrites()).toEqual([
      {
        source: "/auth/v1/authorize",
        destination: "https://project.supabase.example/auth/v1/authorize",
      },
      {
        source: "/auth/v1/callback",
        destination: "https://project.supabase.example/auth/v1/callback",
      },
      {
        source: "/storage/v1/object/public/:path*",
        destination: "https://project.supabase.example/storage/v1/object/public/:path*",
      },
    ]);
  });

  it("is off without a Supabase project", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await rewrites()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm test -- next.config.test.ts`
Expected: FAIL. `nextConfig.rewrites` is undefined.

- [ ] **Step 3: Add the rewrites** to `next.config.ts`, after `redirects()`. They are inline
  because next.config.ts can't reliably import app modules:

```ts
  // Google sign-in and public files go through the site's own address, so people only ever see
  // it (spec 5.1). Uploads, the database API and realtime still talk to Supabase directly.
  async rewrites() {
    const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
    if (!supabase) return [];
    return ["/auth/v1/authorize", "/auth/v1/callback", "/storage/v1/object/public/:path*"].map(
      (source) => ({ source, destination: `${supabase}${source}` }),
    );
  },
```

- [ ] **Step 4: Run it to see it pass.**

Run: `npm test -- next.config.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the signed-in test** `e2e/accounts/pass-through.spec.ts`. It compares the
  app's answer with the local Supabase project's own:

```ts
import { expect, test, type APIResponse } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { seed } from "./fixtures";

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Same status; same redirect (ignoring the per-request state); otherwise the same body. */
async function expectSameAnswer(direct: APIResponse, through: APIResponse) {
  expect(through.status()).toBe(direct.status());
  const where = (value: string | undefined) => {
    if (!value) return value;
    const url = new URL(value, SUPABASE);
    url.searchParams.delete("state");
    return url.toString();
  };
  const [a, b] = [direct.headers()["location"], through.headers()["location"]];
  if (a || b) expect(where(b)).toBe(where(a));
  else expect(await through.text()).toBe(await direct.text());
}

test("Google sign-in's first and last stops answer as Supabase does", async ({ request }) => {
  for (const path of [
    "/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A4174%2Fauth%2Fcallback",
    "/auth/v1/callback?error=access_denied&error_description=Cancelled",
  ]) {
    const direct = await request.get(`${SUPABASE}${path}`, { maxRedirects: 0 });
    const through = await request.get(path, { maxRedirects: 0 });
    await expectSameAnswer(direct, through);
  }
});

test("public files load through the site, whole or in part", async ({ request }) => {
  const admin = createClient(SUPABASE, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // A 1×1 PNG: the avatars bucket accepts PNG, JPEG and WebP only.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
  const path = `${seed().ownerId}/pass-through.png`;
  const { error } = await admin.storage
    .from("avatars")
    .upload(path, png, { contentType: "image/png", upsert: true });
  expect(error).toBeNull();

  const whole = await request.get(`/storage/v1/object/public/avatars/${path}`);
  expect(whole.status()).toBe(200);
  expect(whole.headers()["content-type"]).toBe("image/png");
  expect(Buffer.compare(await whole.body(), png)).toBe(0);

  // Audio and video seek with byte ranges.
  const part = await request.get(`/storage/v1/object/public/avatars/${path}`, {
    headers: { range: "bytes=0-7" },
  });
  expect(part.status()).toBe(206);
  expect(Buffer.compare(await part.body(), png.subarray(0, 8))).toBe(0);
});
```

- [ ] **Step 6: Run it.**

Run: `npm run test:e2e:accounts -- pass-through.spec.ts`
Expected: PASS.

To watch it fail first, run it with `--no-build` on a build made before Step 3: the app answers
404 for these paths.

- [ ] **Step 7: Commit.**

```bash
git add next.config.ts next.config.test.ts e2e/accounts/pass-through.spec.ts
git commit -m "Google sign-in and public files pass through the site's own address to Supabase

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Google sign-in starts on the site's address

**Files:**
- Modify: `lib/hosts.ts` (add `throughSite`)
- Create: `lib/navigate.ts`
- Modify: `features/auth/GoogleButton.tsx`
- Test: `lib/hosts.test.ts` (add), `features/auth/GoogleButton.test.tsx` (new)

**Interfaces:**
- Consumes: the `/auth/v1/authorize` pass-through (Task 4); `SITE_URL` and `SUPABASE_URL` from
  `lib/env.ts`.
- Produces:
  - `throughSite(url: string, siteUrl?: string, supabaseUrl?: string): string` in
    `lib/hosts.ts`. Defaults to `SITE_URL` and `SUPABASE_URL`.
  - `goTo(url: string): void` in `lib/navigate.ts`.

- [ ] **Step 1: Write the failing unit tests.** Add to `lib/hosts.test.ts`, with `throughSite`
  added to the import:

```ts
describe("Google sign-in", () => {
  const PROJECT = "https://project.supabase.example";

  it("starts on the site address with the query exactly as supabase-js made it", () => {
    const query =
      "?provider=google&redirect_to=https%3A%2F%2Fziplume.com%2Fauth%2Fcallback%3Fnext%3D%252Fcodes&code_challenge=Ab-_9z&code_challenge_method=s256";
    expect(throughSite(`${PROJECT}/auth/v1/authorize${query}`, SITE, PROJECT)).toBe(
      `${SITE}/auth/v1/authorize${query}`,
    );
  });

  it("leaves every other address alone", () => {
    expect(throughSite("https://accounts.google.com/o/oauth2/auth?x=1", SITE, PROJECT)).toBe(
      "https://accounts.google.com/o/oauth2/auth?x=1",
    );
    expect(throughSite(`${PROJECT}/auth/v1/token?x=1`, SITE, PROJECT)).toBe(
      `${PROJECT}/auth/v1/token?x=1`,
    );
    expect(throughSite(`${PROJECT}/auth/v1/authorize?x=1`, SITE, "")).toBe(
      `${PROJECT}/auth/v1/authorize?x=1`,
    );
  });
});
```

- [ ] **Step 2: Write the failing component test** `features/auth/GoogleButton.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleButton } from "./GoogleButton";

const signInWithOAuth = vi.hoisted(() => vi.fn());
const goTo = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({ auth: { signInWithOAuth } }),
}));
vi.mock("@/lib/navigate", () => ({ goTo }));
vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/env")>()),
  SITE_URL: "https://ziplume.example",
  SUPABASE_URL: "https://project.example",
}));

beforeEach(() => {
  signInWithOAuth.mockReset();
  goTo.mockReset();
});

describe("Continue with Google", () => {
  it("starts sign-in on the site's own address", async () => {
    signInWithOAuth.mockResolvedValue({
      data: {
        provider: "google",
        url: "https://project.example/auth/v1/authorize?provider=google&code_challenge=abc",
      },
      error: null,
    });
    render(<GoogleButton next="/codes" onError={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        options: expect.objectContaining({ skipBrowserRedirect: true }),
      }),
    );
    expect(goTo).toHaveBeenCalledWith(
      "https://ziplume.example/auth/v1/authorize?provider=google&code_challenge=abc",
    );
  });

  it("shows the problem and stays put when sign-in can't start", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: null },
      error: { name: "AuthApiError", message: "Unsupported provider", status: 400 },
    });
    const onError = vi.fn();
    render(<GoogleButton next="/codes" onError={onError} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(onError).toHaveBeenCalledOnce();
    expect(goTo).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });
});
```

- [ ] **Step 3: Run them to see them fail.**

Run: `npm test -- lib/hosts.test.ts features/auth/GoogleButton.test.tsx`
Expected: FAIL.
- `throughSite` isn't exported.
- `@/lib/navigate` doesn't exist.

- [ ] **Step 4: Add `throughSite`** to `lib/hosts.ts`, and change the env import to
  `import { SITE_URL, SUPABASE_URL } from "@/lib/env";`:

```ts
/**
 * The Google sign-in address supabase-js made, moved onto the site's own address (which passes
 * it to Supabase), so Google's account chooser says "continue to <site>". Any other address is
 * returned as it is.
 */
export function throughSite(
  url: string,
  siteUrl: string = SITE_URL,
  supabaseUrl: string = SUPABASE_URL,
): string {
  try {
    const from = new URL(supabaseUrl).origin;
    const to = new URL(siteUrl).origin;
    const start = `${from}/auth/v1/authorize`;
    return url === start || url.startsWith(`${start}?`) ? to + url.slice(from.length) : url;
  } catch {
    return url;
  }
}
```

- [ ] **Step 5: Create `lib/navigate.ts`:**

```ts
/** Leaves the app for another address. Its own module, so tests can watch it. */
export function goTo(url: string): void {
  window.location.assign(url);
}
```

- [ ] **Step 6: Change `signIn` in `features/auth/GoogleButton.tsx`.** Add the imports
  `import { throughSite } from "@/lib/hosts";` and `import { goTo } from "@/lib/navigate";`:

```tsx
  async function signIn() {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setPending(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        // Get the address instead of leaving, so sign-in can start on the site's own address.
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      setPending(false);
      onError(error ? authErrorMessage(error) : "Google sign-in couldn’t start. Please try again.");
      return;
    }
    goTo(throughSite(data.url));
  }
```

- [ ] **Step 7: Run the tests to see them pass.**

Run: `npm test -- lib/hosts.test.ts features/auth`
Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add lib/hosts.ts lib/hosts.test.ts lib/navigate.ts features/auth/GoogleButton.tsx features/auth/GoogleButton.test.tsx
git commit -m "Google sign-in starts on the site's own address, so Google's screen names it

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Public file links from the site address

**Files:**
- Modify: `lib/env.ts` (add `publicFileUrl`)
- Modify: `lib/pages/urls.ts` (`mediaUrl`)
- Modify: `features/profile/api.ts` (`uploadAvatar`)
- Modify: `lib/avatar.ts` (`trustedAvatarUrl`)
- Modify: `emails/invite.ts`, `features/teams/actions.ts`
- Test: `lib/env.test.ts` (new), `features/profile/api.test.ts` (new), `lib/avatar.test.ts`,
  `emails/invite.test.ts`

**Interfaces:**
- Consumes: the `/storage/v1/object/public/*` pass-through (Task 4).
- Produces:
  - `publicFileUrl(bucket: string, path: string): string` in `lib/env.ts`.
  - `trustedAvatarUrl(url: string | null | undefined, origins?: readonly (string | undefined)[]): string | null`.
    Defaults to `[SUPABASE_URL, SITE_URL]`.
  - `InviteEmailInput.photoOrigins?: readonly string[]`, which replaces `supabaseUrl?: string`.

- [ ] **Step 1: Write the failing tests.**

`lib/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { publicFileUrl, SITE_URL } from "./env";
import { mediaUrl } from "./pages/urls";

describe("public file links", () => {
  it("use the site's own address, encoding each part of the path", () => {
    expect(publicFileUrl("avatars", "u1/a b.png")).toBe(
      `${SITE_URL}/storage/v1/object/public/avatars/u1/a%20b.png`,
    );
    expect(mediaUrl("u1/menu.pdf")).toBe(`${SITE_URL}/storage/v1/object/public/page-media/u1/menu.pdf`);
  });
});
```

`features/profile/api.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { SITE_URL } from "@/lib/env";

import { uploadAvatar } from "./api";

const saved = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        list: async () => ({ data: [] }),
        remove: async () => ({ error: null }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://project.example/storage/v1/object/public/avatars/${path}` },
        }),
      }),
    },
    from: () => ({
      update: (row: unknown) => ({ eq: async () => (saved(row), { error: null }) }),
    }),
  }),
}));
vi.mock("./avatarImage", () => ({
  validateAvatarFile: () => null,
  prepareAvatar: async () => ({ blob: new Blob(["x"]), type: "image/webp" }),
}));

describe("uploaded profile photos", () => {
  it("are saved with the site's own address", async () => {
    const result = await uploadAvatar("u1", new File(["x"], "me.png", { type: "image/png" }));
    if (!result.ok) throw new Error(result.error);
    expect(result.url?.startsWith(`${SITE_URL}/storage/v1/object/public/avatars/u1/`)).toBe(true);
    expect(saved).toHaveBeenCalledWith({ avatar_url: result.url });
  });
});
```

In `lib/avatar.test.ts`, change every `trustedAvatarUrl(…, PROJECT)` second argument to
`[PROJECT]`, and add:

```ts
  it("trusts photos uploaded through the site's own address", () => {
    const site = "https://ziplume.example";
    const url = `${site}/storage/v1/object/public/avatars/u1/a.webp`;
    expect(trustedAvatarUrl(url, [PROJECT, site])).toBe(url);
    expect(
      trustedAvatarUrl(`${site}/storage/v1/object/public/page-media/u1/a.webp`, [PROJECT, site]),
    ).toBeNull();
    expect(trustedAvatarUrl(url, [PROJECT])).toBeNull();
  });
```

In `emails/invite.test.ts`, inside "shows only trusted photos, and initials otherwise", add:

```ts
    const uploaded = "https://ziplume.example/storage/v1/object/public/avatars/u1/a.webp";
    expect(
      inviteEmail({
        ...withInviter({ avatarUrl: uploaded }),
        photoOrigins: ["https://project.example", "https://ziplume.example"],
      }).html,
    ).toContain(`<img src="${uploaded}"`);
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npm test -- lib/env.test.ts features/profile/api.test.ts lib/avatar.test.ts emails/invite.test.ts`
Expected: FAIL.
- `publicFileUrl` isn't exported.
- The upload saves the project address.
- `trustedAvatarUrl` takes a single string.
- `photoOrigins` isn't an input.

- [ ] **Step 3: Add `publicFileUrl`** to `lib/env.ts`, after `shortLinkLabel`:

```ts
/** A public Storage file at the site's own address, which passes it on to Supabase. */
export function publicFileUrl(bucket: string, path: string): string {
  return `${SITE_URL}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
```

- [ ] **Step 4: Use it in `lib/pages/urls.ts`.** Replace the `SUPABASE_URL` import with
  `import { publicFileUrl } from "@/lib/env";`:

```ts
/** Public URL of a file in the page-media bucket. */
export function mediaUrl(path: string): string {
  return publicFileUrl(MEDIA_BUCKET, path);
}
```

- [ ] **Step 5: Use it in `features/profile/api.ts`.** Add
  `import { publicFileUrl } from "@/lib/env";` and replace
  `const url = bucket.getPublicUrl(path).data.publicUrl;` with:

```ts
  const url = publicFileUrl(AVATAR_BUCKET, path);
```

- [ ] **Step 6: Trust both addresses in `lib/avatar.ts`.** Change the import to
  `import { SITE_URL, SUPABASE_URL } from "@/lib/env";` and replace the function:

```ts
/**
 * A profile photo URL that is safe to show: an upload in this project's avatars bucket (at the
 * Supabase address or the site's own), or a Google account photo. Anything else (another host,
 * http, a broken value) gives null, so a teammate can't make your browser or inbox load an image
 * from a server they control.
 */
export function trustedAvatarUrl(
  url: string | null | undefined,
  origins: readonly (string | undefined)[] = [SUPABASE_URL, SITE_URL],
): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (GOOGLE_PHOTO_HOST.test(parsed.hostname)) return parsed.href;
  if (!parsed.pathname.startsWith(`/storage/v1/object/public/${AVATAR_BUCKET}/`)) return null;
  const ours = origins.some((origin) => {
    if (!origin) return false;
    try {
      return new URL(origin).host === parsed.host;
    } catch {
      return false;
    }
  });
  return ours ? parsed.href : null;
}
```

- [ ] **Step 7: Pass both addresses to the invite email.**
  - In `emails/invite.ts`, replace the `supabaseUrl` field:

    ```ts
      /** Where uploaded photos may come from: the Supabase project and the site. */
      photoOrigins?: readonly string[];
    ```

    The photo line becomes
    `const photo = trustedAvatarUrl(input.inviter.avatarUrl, input.photoOrigins);`.
  - In `features/teams/actions.ts`, replace `supabaseUrl: SUPABASE_URL,` with
    `photoOrigins: [SUPABASE_URL, SITE_URL],`.

- [ ] **Step 8: Run the tests to see them pass**, plus everything that shows photos and files.

Run: `npm test -- lib emails features/profile features/teams features/pages components`
Expected: PASS.

- [ ] **Step 9: Commit.**

```bash
git add lib/env.ts lib/env.test.ts lib/pages/urls.ts features/profile/api.ts features/profile/api.test.ts lib/avatar.ts lib/avatar.test.ts emails/invite.ts emails/invite.test.ts features/teams/actions.ts
git commit -m "Hosted-page files and profile photos load from the site's own address

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Storage keys and the offline helper get the new name

**Files:**
- Modify: `features/create/draft.ts`, `features/codes/list/useListView.ts`
- Create: `scripts/sw-template.mjs`, `scripts/sw-template.d.mts`
- Modify: `scripts/generate-sw.mjs`
- Modify: `app/brand-name.test.ts` (drop two allowlist entries)
- Test:
  - `features/create/draft.test.ts`
  - `features/create/CreatePage.test.tsx` (line 191)
  - `features/codes/list/useListView.test.ts` (new)
  - `scripts/sw-template.test.ts` (new)
  - `e2e/accounts/create.spec.ts` (line 15)

**Interfaces:**
- Produces:
  - `draftKey(userId)` = `ziplume:draft:v2:<userId>`
  - `listViewKey(userId: string): string` = `ziplume:codes-view:<userId>`, exported from
    `useListView.ts`
  - `serviceWorkerSource(input: { version: string; urls: string[] }): string` in
    `scripts/sw-template.mjs`

- [ ] **Step 1: Write the failing tests.**
  - In `features/create/draft.test.ts`, change the expectation to
    `expect(draftKey(USER)).toBe("ziplume:draft:v2:user-1");`.
  - In `features/create/CreatePage.test.tsx` line 191, use `"ziplume:draft:v2:user-1"`.

`features/codes/list/useListView.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { listViewKey, useListView } from "./useListView";

beforeEach(() => window.localStorage.clear());

describe("the list or grid choice", () => {
  it("is remembered per person under the Ziplume key", () => {
    expect(listViewKey("u1")).toBe("ziplume:codes-view:u1");
    const { result } = renderHook(() => useListView("u1"));
    act(() => result.current[1]("grid"));
    expect(window.localStorage.getItem("ziplume:codes-view:u1")).toBe("grid");
    expect(result.current[0]).toBe("grid");
  });
});
```

`scripts/sw-template.test.ts`:

```ts
// @vitest-environment node
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

import { serviceWorkerSource } from "./sw-template.mjs";

type WorkerEvent = { waitUntil(promise: Promise<unknown>): void };

/** Runs the worker against fake caches. `home` is how the server answers "/". */
async function run(
  name: "install" | "activate",
  home: { ok: boolean } | Error,
  existing: string[] = [],
) {
  const listeners: Record<string, (event: WorkerEvent) => void> = {};
  const added: string[] = [];
  const put: string[] = [];
  const deleted: string[] = [];
  let skipped = false;
  const cache = {
    addAll: async (urls: string[]) => void added.push(...urls),
    put: async (key: string) => void put.push(key),
  };
  runInNewContext(serviceWorkerSource({ version: "abc123", urls: ["/icon.svg", "/_next/static/a.js"] }), {
    self: {
      addEventListener: (event: string, listener: (event: WorkerEvent) => void) =>
        (listeners[event] = listener),
      skipWaiting: async () => void (skipped = true),
      clients: { claim: async () => undefined },
      location: { origin: "https://qr.techitdave.com" },
    },
    caches: {
      open: async () => cache,
      keys: async () => existing,
      delete: async (key: string) => void deleted.push(key),
      match: async () => undefined,
    },
    fetch: async () => {
      if (home instanceof Error) throw home;
      return home;
    },
    URL,
  });
  const work: Promise<unknown>[] = [];
  listeners[name]!({ waitUntil: (promise) => void work.push(promise) });
  await Promise.all(work);
  return { added, put, deleted, skipped };
}

describe("the offline helper", () => {
  it("precaches the build files and the home page", async () => {
    const result = await run("install", { ok: true });
    expect(result.added).toEqual(["/icon.svg", "/_next/static/a.js"]);
    expect(result.put).toEqual(["/"]);
    expect(result.skipped).toBe(true);
  });

  it("still installs where the home page forwards (the old address)", async () => {
    const result = await run("install", { ok: false });
    expect(result.put).toEqual([]);
    expect(result.skipped).toBe(true);
  });

  it("still installs when the home page can't be fetched", async () => {
    expect((await run("install", new TypeError("offline"))).skipped).toBe(true);
  });

  it("removes old caches under both names and keeps its own", async () => {
    const result = await run("activate", { ok: true }, [
      "quickqreate-111",
      "ziplume-222",
      "ziplume-abc123",
      "other-cache",
    ]);
    expect(result.deleted).toEqual(["quickqreate-111", "ziplume-222"]);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npm test -- features/create features/codes/list scripts`
Expected: FAIL.
- The old key values.
- `listViewKey` isn't exported.
- `./sw-template.mjs` doesn't exist.

- [ ] **Step 3: Rename the keys.**
  - In `features/create/draft.ts`:
    `export const draftKey = (userId: string) => \`ziplume:draft:v2:${userId}\`;`
  - In `features/codes/list/useListView.ts`, replace the `keyFor` line with an exported
    function, and use `listViewKey` in place of `keyFor` (two places):

```ts
/** Where the choice is kept on this device, per person. */
export const listViewKey = (userId: string) => `ziplume:codes-view:${userId}`;
```

  - In `e2e/accounts/create.spec.ts` line 15:
    `const draftKey = () => \`ziplume:draft:v2:${seed().makerId}\`;`

- [ ] **Step 4: Move the worker source into `scripts/sw-template.mjs`.** Keep the fetch handler
  byte-for-byte the same as today's.

```js
// The offline helper's source; scripts/generate-sw.mjs writes it to public/sw.js after a build.
// Signed-in pages, short links, sign-in, files and the API always go to the network.
export function serviceWorkerSource({ version, urls }) {
  return `// Generated by scripts/generate-sw.mjs. Do not edit.
const CACHE = "ziplume-${version}";
const PRECACHE = ${JSON.stringify(urls)};
const OLD_CACHES = /^(ziplume|quickqreate)-/;
const NETWORK_ONLY = /^\\/(r|R|p|api|auth|storage|dashboard|account|invite|login|signup|forgot-password)(\\/|$)/;

// The home page is cached only where it's served: on an old address it forwards to the new one,
// and the worker must still install there so it updates in place.
async function cacheHome(cache) {
  try {
    const home = await fetch("/", { redirect: "manual" });
    if (home.ok) await cache.put("/", home);
  } catch {
    // Offline or blocked: the next visit caches it.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).then(() => cacheHome(cache)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => OLD_CACHES.test(k) && k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || NETWORK_ONLY.test(url.pathname)) return;

  // Pages: network first so updates and sign-in state show immediately; the cached
  // generator page when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.pathname === "/") {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Build assets are content-hashed, so cache first is safe.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok && url.pathname.startsWith("/_next/static/")) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
`;
}
```

`scripts/sw-template.d.mts`:

```ts
/** The offline helper's source, given its version and the files to precache. */
export function serviceWorkerSource(input: { version: string; urls: string[] }): string;
```

- [ ] **Step 5: Use it in `scripts/generate-sw.mjs`.**
  - Import `import { serviceWorkerSource } from "./sw-template.mjs";`.
  - Drop `"/"` from `pages`, because the worker caches the home page itself:
    `const pages = ["/manifest.webmanifest", "/icon.svg", "/favicon.ico", "/apple-icon.png"];`
  - Delete the inline `worker` template.
  - Write `writeFileSync("public/sw.js", serviceWorkerSource({ version, urls }));`.
  - Change the log line to say `cache ziplume-${version}`.
  - Update the header comment: "It precaches the hashed build assets and the app icons, and the
    worker caches the home page itself."

- [ ] **Step 6: Drop the two storage-key entries** from `ALLOWED` in `app/brand-name.test.ts`:
  - the line with `/quickqreate:draft:v2:/`
  - the line with `/quickqreate:codes-view:\$\{userId\}/`

- [ ] **Step 7: Run everything touched.**

Run: `npm test -- features/create features/codes/list scripts app/brand-name.test.ts`
Expected: PASS.

Run: `NEXT_PUBLIC_SITE_URL=http://localhost:4173 npm run build && grep -c 'ziplume-' public/sw.js && npx playwright test e2e/experience.spec.ts -g "offline"`
Expected:
- `npm run build` prints `Service worker: … files precached (cache ziplume-…)`.
- The `grep` count is at least 1.
- The offline test PASSES.

- [ ] **Step 8: Commit.**

```bash
git add features/create/draft.ts features/create/draft.test.ts features/create/CreatePage.test.tsx features/codes/list/useListView.ts features/codes/list/useListView.test.ts scripts/sw-template.mjs scripts/sw-template.d.mts scripts/sw-template.test.ts scripts/generate-sw.mjs app/brand-name.test.ts e2e/accounts/create.spec.ts
git commit -m "Ziplume storage keys and offline cache; the offline helper installs on the old address too

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: The old address leaves user-facing source, with a guard

**Files:**
- Modify: `app/brand-name.test.ts` (new test)
- Modify: `features/generator/preview/QrView.tsx:9`, `lib/env.ts` (two comments),
  `scripts/build-brand-assets.mjs:14`, `Dockerfile:1`
- Regenerate: `app/opengraph-image.png`, `app/twitter-image.png` (their QR code opens the site)
- Modify: `README.md` (lines 15, 49, 53, 63, 145)

**Interfaces:**
- Produces: a guard test that fails if `qr.techitdave.com` appears in user-facing source.

- [ ] **Step 1: Write the failing guard.** In `app/brand-name.test.ts`:
  - Add `"scripts"` to the folders scanned for the old *address* only. The old *name* check
    stays as it is.
  - Add this test after the existing `describe`:

```ts
describe("the old address", () => {
  it("appears nowhere people can see it (it lives on only in LEGACY_HOSTS)", () => {
    const leftovers = [...FOLDERS, "scripts"]
      .flatMap((folder) => files(resolve(ROOT, folder)))
      .flatMap((path) =>
        readFileSync(path, "utf8")
          .split("\n")
          .map((line, i) => ({ line, at: `${relative(ROOT, path)}:${i + 1}` }))
          .filter(({ line }) => /qr\.techitdave\.com/i.test(line))
          .map(({ at, line }) => `${at}  ${line.trim()}`),
      );
    expect(leftovers).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to see it fail.**

Run: `npm test -- app/brand-name.test.ts`
Expected: FAIL, listing:
- `features/generator/preview/QrView.tsx:9`
- `lib/env.ts:16`
- `lib/env.ts:21`
- `scripts/build-brand-assets.mjs:14`

- [ ] **Step 3: Fix each one.**
  - `QrView.tsx:9`: `const PLACEHOLDER = "https://ziplume.com";`
  - `lib/env.ts:16`: `/** Short link a dynamic code encodes, e.g. https://ziplume.com/r/AB3X9Q */`
  - `lib/env.ts:21`: `/** Display form without the scheme, e.g. ziplume.com/r/AB3X9Q */`
  - `scripts/build-brand-assets.mjs:14`:
    `const SITE = process.env.BRAND_SITE_URL ?? "https://ziplume.com";`
  - `Dockerfile:1`: `# Ziplume production image for Coolify.`

- [ ] **Step 4: Regenerate the brand images** so the social image's QR code opens ziplume.com.

Run: `npm run brand`
Expected: `app/opengraph-image.png` and `app/twitter-image.png` change. The icons are unchanged,
because the mark didn't change. Check with `git status --short app public`. Open the social
image and confirm it looks the same apart from the QR pattern.

- [ ] **Step 5: Update `README.md`:**
  - line 15: `<a href="https://ziplume.com"><strong>Open Ziplume →</strong></a>`
  - line 49: ``Files get readable names like `ziplume-wifi-cafe-guest.png`.``
  - line 53: ``(`ziplume.com/r/…`)``
  - line 63: `[privacy policy](https://ziplume.com/privacy)`
  - line 145:

    > Production is a Coolify application at `https://ziplume.com` that redeploys on every push
    > to `main`. The old address, `https://qr.techitdave.com`, still answers printed codes,
    > hosted pages and the API, and forwards everything else.

  - Clone URLs and the repo link stay until the rename (Task 13).

- [ ] **Step 6: Run the guard and the brand tests.**

Run: `npm test -- app/brand-name.test.ts app/brand-assets.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add app/brand-name.test.ts features/generator/preview/QrView.tsx lib/env.ts scripts/build-brand-assets.mjs Dockerfile app/opengraph-image.png app/twitter-image.png README.md
git commit -m "ziplume.com in user-facing source and the social image, with a guard against the old address

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: The setup doc, and every check

**Files:**
- Modify: `docs/accounts-setup.md`

- [ ] **Step 1: Update `docs/accounts-setup.md`** to describe the setup after the move.
  - **Decisions table:**
    - App URL `https://ziplume.com` (`www` forwards)
    - Dynamic short links `https://ziplume.com/r/<slug>`
    - Old address: `https://qr.techitdave.com` stays forever, through `LEGACY_HOSTS`
    - Email: Brevo, sending as `Ziplume <no-reply@ziplume.com>`
  - **Live deployment table:**
    - Coolify domains `https://ziplume.com`, `https://www.ziplume.com` (redirect to non-www) and
      `https://qr.techitdave.com`
    - DNS: ziplume.com A and www CNAME, proxied, SSL Full (strict), Always Use HTTPS off,
      visitor-location headers on; `qr` A unchanged
    - Email Routing: `support@` and `dmarc@` → `dallmon@techitdave.com`
    - Brevo domain ziplume.com authenticated
  - **App environment:** add a short section:

```
NEXT_PUBLIC_SITE_URL=https://ziplume.com        (build and runtime)
LEGACY_HOSTS=qr.techitdave.com                  (runtime: old addresses that keep serving
                                                 /r, /R, /p, /api and their files)
INVITE_FROM_EMAIL=no-reply@ziplume.com          (runtime)
```

  - **Section 4 (Google):**
    - JavaScript origins `https://ziplume.com` and `https://qr.techitdave.com`
    - Redirect URIs `https://ziplume.com/auth/v1/callback` and `<API URL>/auth/v1/callback`
    - Authorized domains `ziplume.com` and `techitdave.com`
    - Home, privacy and terms at `https://ziplume.com/…`
  - **Section 5 (Auth env):**
    - `SITE_URL=https://ziplume.com`
    - `ADDITIONAL_REDIRECT_URLS` lists both addresses' `/auth/callback` and `/auth/confirm`
    - `SMTP_ADMIN_EMAIL=no-reply@ziplume.com`
    - `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://ziplume.com/auth/v1/callback`
    - The four template URLs on `https://ziplume.com/email-templates/…`
    - A note that `/auth/v1/authorize`, `/auth/v1/callback` and `/storage/v1/object/public/*`
      on the site pass through to the project
  - **Section 6 (DNS):** replace it with the ziplume.com records from this plan's Task 11, plus
    the note that the `qr` record stays DNS-only unless David approves 5.6's change.
  - Keep the repository URL as it is until Task 13.

- [ ] **Step 2: Run every check.** Send long output to the plan workspace and read the tails.

```bash
npm run lint && npm run typecheck && npm run format:check && npm test
NEXT_PUBLIC_SITE_URL=http://localhost:4173 npm run build && npm run test:e2e
npm run test:e2e:accounts
```

Expected:
- lint, typecheck and format clean
- unit: all pass (about 700)
- public browser: all pass
- signed-in browser: all pass

If `format:check` fails on new files, run `npx prettier --write <files>` and re-run.

- [ ] **Step 3: Look at it.** Run the built app with `LEGACY_HOSTS=qr.techitdave.com PORT=4173 node scripts/start.mjs`:
  - In Chrome, open `http://localhost:4173/`: the generator still works, and the social image
    and sign-in page look as before.
  - `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' -H 'host: qr.techitdave.com' http://localhost:4173/codes`
    prints `308 http://localhost:4173/codes`.

- [ ] **Step 4: Commit.**

```bash
git add docs/accounts-setup.md
git commit -m "Setup doc for ziplume.com: addresses, the old-address rule, Auth, Google, DNS and mail

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Final review

- [ ] **Step 1: Final review.** Follow executing-plans "Final Review":
  - a fresh reviewer on the most capable model, given the review package, this plan, the spec
    and the Review Focus list
  - one fix pass for Critical and Important findings, each fixed RED→GREEN, with the whole
    suite green afterwards
- [ ] **Step 2: Push the branch and open the PR** "Ziplume Release 3: the move to ziplume.com".
  - The body lists the switch steps and says it merges only at switch time (Task 12).
  - Wait for both CI jobs to pass. **Do not merge yet.**

---

### Task 11: Preparation (nothing changes for users)

These steps happen in the browser. Each one lists what to check afterwards. If a site asks for a
sign-in, stop and ask David. Claude never types passwords, keys or verification codes.

- [ ] **Step 1: Release 2 leftovers** (the same sign-ins, done first):
  - **Supabase panel** (`https://studio.techitdave.com` → project QuickQReate → Manage →
    environment):
    - Set `SMTP_SENDER_NAME=Ziplume` and the four subjects:
      - `GOTRUE_MAILER_SUBJECTS_CONFIRMATION=Confirm your Ziplume account`
      - `GOTRUE_MAILER_SUBJECTS_RECOVERY=Reset your Ziplume password`
      - `GOTRUE_MAILER_SUBJECTS_EMAIL_CHANGE=Confirm your new email for Ziplume`
      - `GOTRUE_MAILER_SUBJECTS_MAGIC_LINK=Your Ziplume sign-in link`
    - Rename the project's display name to "Ziplume" if the panel allows it.
  - **Google Cloud project `quickqreate`:** rename the consent screen's app name to "Ziplume",
    with no logo, and the project's display name to "Ziplume".
  - Record both in the runbook.

- [ ] **Step 2: Cloudflare, ziplume.com zone** (David signs in):
  - DNS: add `ziplume.com` A `152.44.42.29` and `www` CNAME `ziplume.com`, both **DNS only**
    for now.
  - SSL/TLS → Overview: **Full (strict)**.
  - SSL/TLS → Edge Certificates: **Always Use HTTPS off**.
  - Rules → Managed Transforms: **Add visitor location headers** on.
  - Leave caching at the default.

  Check: `dig +short ziplume.com` → `152.44.42.29`; `dig +short www.ziplume.com` → a CNAME to
  ziplume.com, then the IP.

- [ ] **Step 3: Cloudflare Email Routing** (ziplume.com):
  - Turn it on; it adds MX records and an SPF TXT.
  - Add the destination `dallmon@techitdave.com`. Ask David to click the verification link
    Cloudflare emails him.
  - Add the routes `support@ziplume.com` and `dmarc@ziplume.com` → that destination.
  - Edit the SPF TXT so the zone has exactly one:
    `v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all`.

  Check: `dig +short TXT ziplume.com` shows exactly one `v=spf1` record, and the destination
  shows Verified.

- [ ] **Step 4: Brevo** (signed in as HopeLinx):
  - Senders, Domains & Dedicated IPs → Domains → add `ziplume.com`.
  - Add the records Brevo shows to the ziplume.com zone **by hand**. Don't use Brevo's automatic
    Cloudflare connection, which would grant it access:
    - the `brevo-code` TXT
    - the two DKIM CNAMEs, **DNS only**
    - `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:dmarc@ziplume.com`
  - Wait until Brevo shows the domain authenticated.
  - Add the sender **Ziplume <no-reply@ziplume.com>**. Keep the techitdave.com sender.

  Check: Brevo shows ziplume.com "Authenticated", and `dig +short TXT _dmarc.ziplume.com` shows
  the DMARC record.

- [ ] **Step 5: Coolify** (app `4gko88co580xlr70qkda3jhx`):
  - Domains: `https://qr.techitdave.com,https://ziplume.com,https://www.ziplume.com`
  - Direction: **Redirect to non-www**
  - Save, then Redeploy, which builds the current main again.
  - Wait for the Let's Encrypt certificates.

  Check:
  - `curl -sI https://ziplume.com/api/health` → 200 with a valid certificate
  - `curl -sI https://www.ziplume.com/codes` → a redirect to `https://ziplume.com/codes`
  - `https://qr.techitdave.com` still loads

- [ ] **Step 6: Cloudflare proxy:** turn the orange cloud on for `ziplume.com` and `www`.

  Check:
  - `curl -sI https://ziplume.com/` shows `server: cloudflare` and a 200.
  - `curl -s -o /dev/null -w '%{http_code}\n' http://ziplume.com/.well-known/acme-challenge/zl-check-$RANDOM`
    gives 404, and `curl -s http://ziplume.com/.well-known/acme-challenge/zl-check-x` prints
    Traefik's plain `404 page not found`, not the app's page and not a redirect.
  - Write the first renewal date (issue date + 60 days, from
    `echo | openssl s_client -connect 152.44.42.29:443 -servername ziplume.com 2>/dev/null | openssl x509 -noout -dates`)
    in the runbook.

- [ ] **Step 7: Supabase project env:** set `ADDITIONAL_REDIRECT_URLS` to
  `https://qr.techitdave.com/auth/callback,https://qr.techitdave.com/auth/confirm,https://ziplume.com/auth/callback,https://ziplume.com/auth/confirm`.
  Restart only this project's auth service.

  Check: email sign-in on qr.techitdave.com still works. David signs in, or the page simply loads
  signed in.

- [ ] **Step 8: Google Cloud** (project `quickqreate`, the web client):
  - JavaScript origins: add `https://ziplume.com`, keeping the old one.
  - Redirect URIs: add `https://ziplume.com/auth/v1/callback`, keeping the Supabase one.
  - Consent screen: add `ziplume.com` to the authorized domains, and set the home, privacy and
    terms links to `https://ziplume.com`, `https://ziplume.com/privacy` and
    `https://ziplume.com/terms`.
  - Change nothing else.

- [ ] **Step 9: Read-only database check** through the bridge (project
  `db12f7ce-3e77-4461-a686-c8cd6de6f764`):

```sql
select
  (select count(*) from public.qr_codes where destination ilike '%qr.techitdave.com%') as destinations_old_address,
  (select count(*) from public.qr_codes where content::text ilike '%qr.techitdave.com%') as contents_old_address,
  (select count(*) from public.qr_codes where content::text ilike '%supabase.techitdave.com%' or design::text ilike '%supabase.techitdave.com%') as codes_supabase_host,
  (select count(*) from public.design_templates where design::text ilike '%supabase.techitdave.com%') as templates_supabase_host,
  (select count(*) from public.profiles where avatar_url ilike '%supabase.techitdave.com%') as photos_supabase_host,
  (select count(*) from public.profiles where avatar_url ilike '%qr.techitdave.com%') as photos_old_address;
```

  Report both kinds to David. Old-address links keep working through the old-address rules, and
  Supabase-host images keep working because Supabase still serves them.

---

### Task 12: The switch, the live checks, and the records

- [ ] **Step 1: Coolify env, before the merge:**
  - `NEXT_PUBLIC_SITE_URL=https://ziplume.com` (build and runtime)
  - `LEGACY_HOSTS=qr.techitdave.com` (runtime)
  - `INVITE_FROM_EMAIL=no-reply@ziplume.com` (runtime)

  Save without deploying.
- [ ] **Step 2: Merge Release 3.** `gh pr merge <n> --merge`, then watch for the new build ID:
  `curl -s https://ziplume.com/login | grep -oE '\\"b\\":\\"[A-Za-z0-9_-]{6,}'` changes.

  Then:
  - `curl -sI https://qr.techitdave.com/codes` → `308`, `location: https://ziplume.com/codes`
  - `curl -s -o /dev/null -w '%{http_code}\n' https://qr.techitdave.com/r/doesnotexist` → `404`,
    with no redirect
- [ ] **Step 3: Supabase project env:**
  - `SITE_URL=https://ziplume.com`
  - the four `GOTRUE_MAILER_TEMPLATES_*` set to `https://ziplume.com/email-templates/{confirm,recovery,email-change,magic-link}.html`
  - `SMTP_ADMIN_EMAIL=no-reply@ziplume.com`
  - `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://ziplume.com/auth/v1/callback`

  Restart only this project's auth service.
- [ ] **Step 4: GitHub Pages:** run the workflow with `redirect_to=https://ziplume.com`:
  `gh workflow run ci.yml -f redirect_to=https://ziplume.com`.

  Check: `curl -s https://davidallmon.github.io/QuickQReate/ | grep -c ziplume.com` ≥ 1.
- [ ] **Step 5: Live checks** (spec 5.4). These are read-only unless marked:
  - **Addresses:** `https://ziplume.com` and `https://www.ziplume.com` load, `www` forwards, the
    certificates are valid, and `https://qr.techitdave.com/codes` forwards.
  - **Old printed codes:** `curl -sI https://qr.techitdave.com/R/<an existing slug>` and the `/r/`
    form both 302 to the code's destination. Curl counts as a bot, so no scan is recorded.
  - **Old hosted page:** `https://qr.techitdave.com/p/<slug>` loads fully in Chrome, with no
    console errors and its images loading.
  - **Scan counts and places (adds a scan, so ask David):** David scans one of his printed codes
    with his phone camera, then one ziplume.com short link. Each code's count rises by exactly
    one, and the ziplume.com scan shows a country and city.
  - **Sign-in:**
    - Google sign-in on ziplume.com. David does it: the account chooser says "continue to
      ziplume.com", and the address bar never shows the Supabase host.
    - Email sign-in works.
  - **Files:** a hosted-page image and a profile photo load from
    `https://ziplume.com/storage/v1/object/public/…`. Check the network panel.
  - **Mail (David's OK first; he runs them with `dvdallmon+qrtest@gmail.com`):**
    - A sign-up confirmation, a password reset and a team invite arrive from
      `no-reply@ziplume.com`, pass DKIM, show the new look, and link to ziplume.com.
    - A message David sends to `support@ziplume.com` arrives at `dallmon@techitdave.com`.
  - **API keys:** David runs these with his own key. Claude never handles it. Both print `200`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $ZIPLUME_KEY" https://ziplume.com/api/v1/codes
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $ZIPLUME_KEY" https://qr.techitdave.com/api/v1/codes
```

  - **Cloudflare challenges:**
    - `curl -s -o /dev/null -w '%{http_code}\n' https://ziplume.com/r/<slug>` → 302 (not 403 or
      503).
    - `curl -sI https://ziplume.com/api/health` has no `cf-mitigated` header.
    - If either is challenged, turn off Browser Integrity Check for the ziplume.com zone.
- [ ] **Step 6: If a check fails, roll back** (spec 5.5):
  - **Before Step 3:** set `NEXT_PUBLIC_SITE_URL=https://qr.techitdave.com`, empty
    `LEGACY_HOSTS`, and redeploy.
  - **After Step 3:** also put back `SITE_URL`, the template addresses, `SMTP_ADMIN_EMAIL` and
    `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=<API URL>/auth/v1/callback`, then restart auth.
  - Google keeps both redirect URIs, so either setting works.
  - `qr.techitdave.com` serves short links throughout.
- [ ] **Step 7: Records:**
  - **Runbook (`~/.codex/memories/supabase-coolify.md`):** the switch time, the env changes, the
    certificate renewal date, the DNS records, and that Brevo has no key-rename control.
  - **Memories:** `quickqreate-go-live-status.md` and `ziplume-rebrand.md`. Release 3 is live;
    next is Task 13.
  - **`docs/accounts-setup.md`:** the "verified" date and the renewal date. This goes in Task
    13's PR.

---

### Task 13: After the switch: the repo, the old Pages address, and old-code scan locations

Do these one at a time, each with its own check, and only after Task 12's live checks pass.

- [ ] **Step 1: Save the old Pages redirect files**, before anything deletes them:

`$SCRATCH` is this session's scratchpad directory:

```bash
K="$SCRATCH/zl-keeper" && mkdir -p "$K" && for f in index.html 404.html; do sed -e 's#__TARGET_LABEL__#ziplume.com#g' -e 's#__TARGET__#https://ziplume.com#g' "pages-redirect/$f" > "$K/$f"; done && cp pages-redirect/sw.js "$K/sw.js" && grep -c 'https://ziplume.com' "$K/index.html"
```

- [ ] **Step 2: Rename the repo.**
  - `gh repo rename ziplume --repo DavidAllmon/QuickQReate --yes`
  - `gh repo edit DavidAllmon/ziplume --description "Make it. Link it. Share it." --homepage https://ziplume.com`
  - `git remote set-url origin https://github.com/DavidAllmon/ziplume.git`
  - In Coolify, set the app's repository to `https://github.com/DavidAllmon/ziplume`, keeping
    branch `main`.
  - Turn off Pages on the renamed repo: `gh api -X DELETE repos/DavidAllmon/ziplume/pages`.

  Check: `git fetch` works.
- [ ] **Step 3: The follow-up PR** (branch `chore/ziplume-repo`, TDD on the guard):
  - RED: remove from `ALLOWED` in `app/brand-name.test.ts` the `REPO_URL` entry and the
    `^\/QuickQReate\/` entry, and remove `"pages-redirect"` from `FOLDERS`. Run
    `npm test -- app/brand-name.test.ts` → FAIL on `lib/env.ts` `REPO_URL`.
  - GREEN:
    - `REPO_URL = "https://github.com/DavidAllmon/ziplume"`
    - README clone URL `https://github.com/DavidAllmon/ziplume.git` and the folder name
      `cd ziplume`
    - `docs/accounts-setup.md` repository line, plus the verified and renewal dates from Task 12
    - delete `pages-redirect/`
    - in `.github/workflows/ci.yml`, delete the `workflow_dispatch.inputs.redirect_to` input and
      the `redirect-pages` and `deploy-pages` jobs. Keep `workflow_dispatch:` with no inputs.
  - Run every check (Task 9 Step 2).
  - Push, open the PR, wait for both CI jobs to pass, and merge.

  Check: Coolify deploys it (the build ID changes). That proves a push still triggers a deploy
  under the new name.
- [ ] **Step 4: The keeper repo**, only now:
```bash
gh repo create DavidAllmon/QuickQReate --public --description "Ziplume moved to https://ziplume.com" --homepage https://ziplume.com
K="$SCRATCH/zl-keeper"
printf '# QuickQReate is now Ziplume\n\nIt lives at https://ziplume.com. This repo only keeps the old GitHub Pages address forwarding.\n' > "$K/README.md"
git -C "$K" init -b main && git -C "$K" add . && git -C "$K" commit -m "Forward the old GitHub Pages address to ziplume.com"
git -C "$K" remote add origin https://github.com/DavidAllmon/QuickQReate.git && git -C "$K" push -u origin main
gh api -X POST repos/DavidAllmon/QuickQReate/pages -f "source[branch]=main" -f "source[path]=/"
```

  Check, after a few minutes: `curl -s https://davidallmon.github.io/QuickQReate/codes | grep -c 'https://ziplume.com'` ≥ 1.
- [ ] **Step 5: Scan locations for old printed codes. Stop for David's approval.**
  - Read the techitdave.com zone without changing anything:
    - SSL/TLS mode
    - Always Use HTTPS
    - Managed Transforms
    - existing Configuration Rules
    - Bot Fight Mode and Browser Integrity Check
  - Write David a short list of exactly what would change:
    1. the proxy on for the `qr` record only
    2. a Configuration Rule for `qr.techitdave.com` alone setting SSL Full (strict), only if the
       zone isn't already Full (strict)
    3. visitor-location headers on (zone-wide, adds request headers only)
  - Drop any step that would change another techitdave.com site's behavior.
  - Act only on his yes.
  - Then run the ziplume.com checks for `qr`:
    - a valid certificate
    - the ACME path reaches Traefik
    - a phone scan, with David's OK, records a place
    - curl isn't challenged
  - If he says no, record that old-code scans stay without places.
- [ ] **Step 6: Records.**
  - Runbook: the repo rename, the keeper repo, and the qr decision.
  - Memories: `ziplume-rebrand.md` (Release 3 done, next Phase 3b) and
    `quickqreate-go-live-status.md`.
  - `MEMORY.md` lines.
