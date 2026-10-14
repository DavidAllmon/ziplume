# Phase 1b: App Shell, New Look and Signed-in Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in pages get a real app around them, with the "Calm & professional" look applied everywhere and an automatic check that every signed-in page fits phones, tablets and desktops:
- a sidebar on desktop, a collapsible icon rail on tablets and bottom tabs on phones
- new addresses (`/codes`, `/team`, `/settings`), with the old ones redirecting

**Architecture:**
- **Tokens:** new values in `app/globals.css` (same names), Inter as the only font, and the lime accent removed. `app/theme.test.ts` checks every pair against the spec's contrast rules.
- **Shell:** one client `AppShell` (in `components/app/`) is rendered by a new `app/(app)` route-group layout that loads the user, their photo and their teams on the server. The shell reads `?workspace=` itself, so team context follows every link.
- **Routes:** the old routes become 308 redirects in `next.config.ts`.
- **Signed-in tests:** a new Playwright suite (`e2e/accounts`) runs against a disposable local Supabase started with the Supabase CLI. It runs in CI, and locally when Docker has room.

**Tech Stack:** Next.js 16.4 App Router, React 19.3, Tailwind 4.3, Headless UI, lucide-react, Supabase, Vitest 5 with Testing Library, Playwright 1.56 with `@axe-core/playwright`, Supabase CLI 2.120.0 (through `npx`, not a dependency).

**Spec:** `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md`. This plan covers:
- §3.1 the app shell
- §3.2 routes and redirects
- §4.6 Settings tabs and the Team page in the shell
- §5 the visual tokens, contrast, type and the support prompt
- §7 the accounts suite and responsive checks

## Scope: what is in 1b and what waits for 1c

The spec's Phase 1 also redesigns the Codes list (§4.1) and puts folders under Codes in the sidebar. That is **Phase 1c**, the next plan, because the two go together.

In 1b, `/codes` shows today's list (with its folder chips) inside the new shell, under a new page header. Two sidebar items come later:
- **Analytics** arrives with its page in Phase 3.
- **Templates** arrives with its page in Phase 3.

They are left out of the sidebar until their pages exist. Nothing in 1b changes the database.

## Global Constraints

- **Contrast:**
  - Primary text is at least 7:1 against its background.
  - Secondary text is at least 4.5:1.
  - Field borders, focus rings and state borders are at least 3:1.
  - All of these are enforced by `app/theme.test.ts` in both themes.
- **Type:**
  - Inter is the only font.
  - App pages use a 14px base (`text-sm`) and nothing smaller than 13px.
  - Inputs keep 16px so iOS doesn't zoom.
- **Shape:**
  - 8px control radius and 12px card radius.
  - 1px borders.
  - Shadows only on popovers.
  - No gradients or glows.
- **Wording:**
  - Copy is in sentence case.
  - Buttons start with a verb.
  - Use curly apostrophes (’).
  - New copy says "team" and "codes", never "workspace".
- **Responsive:**
  - Phone is under 640px, tablet is 640–1023px, and desktop is 1024px and up.
  - No horizontal scrolling from 320px up.
  - Touch targets are at least 44×44px on phones.
- **Routes:**
  - Old routes redirect with 308 and keep their query string.
  - `/account/update-password` stays where it is, because reset emails link to it.
- **Support prompt:** the coffee link appears only in the sidebar's bottom group and the public footer. It is removed from app pages. (The public header keeps it until Phase 4 redesigns the public site.)
- **Dependencies:**
  - No new runtime dependencies.
  - `@fontsource-variable/space-grotesk` is removed.
  - The Supabase CLI is run as `npx --yes supabase@2.120.0`, never installed as a dependency, so the Coolify Docker build doesn't download it.
- **Test credentials** exist only for the disposable local Supabase. They live in `e2e/accounts/fixtures.ts` and are never used against a real project.
- **Database:** no migrations in this phase.

## Review Focus

1. **Tablet rail (640–1023px):**
   - Expanding shows labels over the page, and choosing a link collapses it again.
   - Keyboard users can reach every item, and collapsed icons still have accessible names.
   - Test: Task 3 "expands and collapses the tablet rail", plus Task 5's axe runs at 820px.
2. **Old bookmarks and email links:**
   - `/dashboard?workspace=<id>`, `/dashboard/codes/<id>/analytics?range=30d` and `/account` land on the matching new page with the query kept.
   - Test: Task 4's `server.spec` redirect test, plus Task 5 "old addresses land on the new pages".
3. **Team viewers:**
   - No Create control appears anywhere (sidebar, bottom tabs, page header), and switching back to your own codes brings it back.
   - Test: Task 3 "viewers can't create", plus Task 5's viewer test.
4. **Signed-out visits to app pages:**
   - They go to sign-in, then back to the page.
   - Two-step accounts still go through verification on the new routes (the proxy refreshes their session).
   - Test: Task 5 "signed-out visitors sign in, then come back".
5. **Dark mode:**
   - The new tokens and shell stay readable.
   - Test: Task 2's contrast tests for both themes, plus Task 5's dark-mode axe run on `/codes`.

---

### Task 1: Signed-in browser tests against a local Supabase

**Files:**
- Create:
  - `supabase/config.toml` (generated by `supabase init`, then edited)
  - `playwright.accounts.config.ts`
  - `scripts/accounts-e2e.mjs`
  - `e2e/accounts/fixtures.ts`
  - `e2e/accounts/global-setup.ts`
  - `e2e/accounts/sign-in.spec.ts`
- Modify:
  - `playwright.config.ts`, to ignore `accounts/**`
  - `package.json` scripts
  - `.gitignore`
  - `.github/workflows/ci.yml`, with a new `accounts` job

**Interfaces:**
- Produces:
  - `npm run db:start`, `npm run db:stop` and `npm run test:e2e:accounts`
  - From `e2e/accounts/fixtures.ts`: `OWNER`, `VIEWER` (`{ email, password, name, state }`), `seed(): { ownerId, viewerId, menuId }` and `AUTH_DIR`
  - Signed-in browser states at `OWNER.state` and `VIEWER.state`
  - The CI job "Signed-in browser tests"

- [ ] **Step 1: Write the failing test.** Create `e2e/accounts/sign-in.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { OWNER } from "./fixtures";

test.use({ storageState: OWNER.state });

test("the owner sees their saved codes", async ({ page }) => {
  await page.goto("dashboard");
  await expect(page.getByText("Spring menu")).toBeVisible();
});
```

- [ ] **Step 2: Run it and confirm it fails.**

Run: `npm run test:e2e:accounts -- --list`
Expected: FAIL, with `npm error Missing script: "test:e2e:accounts"`.

- [ ] **Step 3: Create the local Supabase config.**

Run: `npx --yes supabase@2.120.0 init --force` from the repo root.
- This writes `supabase/config.toml` and `supabase/.gitignore`.
- It leaves `supabase/migrations` and `supabase/test` alone. Check that with `git status --short supabase`.

Then edit `supabase/config.toml` so these keys hold these values. Keep every other generated line.

```toml
project_id = "quickqreate"

[auth]
site_url = "http://localhost:4174"
additional_redirect_urls = ["http://localhost:4174/**"]

[auth.email]
enable_confirmations = false

[storage.image_transformation]
enabled = false
```

Prepend this comment to the file:

```toml
# Local Supabase for the signed-in browser tests (npm run db:start). Disposable: the tests
# create their own users and data. Never point it at a real project.
```

- [ ] **Step 4: Add the scripts, the Playwright config, fixtures and global setup.**

In `package.json` `scripts`, after `"test:e2e": "playwright test",`, add:

```json
    "db:start": "npx --yes supabase@2.120.0 start -x realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor",
    "db:stop": "npx --yes supabase@2.120.0 stop",
    "test:e2e:accounts": "node scripts/accounts-e2e.mjs",
```

Create `scripts/accounts-e2e.mjs`:

```js
// Runs the signed-in browser tests against the local Supabase (start it with `npm run db:start`;
// Docker required). Builds the app with that project's URL and keys, then runs Playwright with
// playwright.accounts.config.ts. Pass --no-build to reuse the last build; other arguments go to
// Playwright.
import { execFileSync, spawnSync } from "node:child_process";

const status = JSON.parse(
  execFileSync("npx", ["--yes", "supabase@2.120.0", "status", "-o", "json"], { encoding: "utf8" }),
);
for (const key of ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY"]) {
  if (!status[key]) {
    console.error(`supabase status has no ${key}. Keys: ${Object.keys(status).join(", ")}`);
    process.exit(1);
  }
}

const env = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: "http://localhost:4174",
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  SCAN_HASH_SECRET: "accounts-e2e-only-scan-hash-secret-0123456789",
};

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const args = process.argv.slice(2);
if (!args.includes("--no-build")) run("npm", ["run", "build"]);
run("npx", [
  "playwright",
  "test",
  "--config",
  "playwright.accounts.config.ts",
  ...args.filter((arg) => arg !== "--no-build"),
]);
```

Create `playwright.accounts.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

// Signed-in browser tests against a local Supabase. Run them with `npm run test:e2e:accounts`,
// which sets the project's URL and keys and builds the app first.
const PORT = 4174;

export default defineConfig({
  testDir: "./e2e/accounts",
  globalSetup: "./e2e/accounts/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}/`, trace: "retain-on-failure" },
  projects: [
    {
      name: "accounts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: "node scripts/start.mjs",
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
  },
});
```

In `playwright.config.ts`, add `testIgnore: ["accounts/**"],` after `testDir: "./e2e",`.

Create `e2e/accounts/fixtures.ts`:

```ts
import { readFileSync } from "node:fs";

// Test-only accounts for the disposable local Supabase; never used anywhere else.
export const AUTH_DIR = "e2e/accounts/.auth";
export const SEED_FILE = `${AUTH_DIR}/seed.json`;

export const OWNER = {
  email: "owner@example.com",
  password: "owner-e2e-pass-2026",
  name: "Olivia Owner",
  state: `${AUTH_DIR}/owner.json`,
};

export const VIEWER = {
  email: "viewer@example.com",
  password: "viewer-e2e-pass-2026",
  name: "Victor Viewer",
  state: `${AUTH_DIR}/viewer.json`,
};

export interface Seed {
  ownerId: string;
  viewerId: string;
  /** The owner's "Spring menu" trackable code. */
  menuId: string;
}

/** Ids created by the global setup. Read it inside tests, not at import time. */
export function seed(): Seed {
  return JSON.parse(readFileSync(SEED_FILE, "utf8")) as Seed;
}
```

Create `e2e/accounts/global-setup.ts`:

```ts
import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

import { AUTH_DIR, OWNER, SEED_FILE, VIEWER, type Seed } from "./fixtures";

type Person = typeof OWNER;

/** Fresh owner and viewer accounts, two codes, and a signed-in browser state for each. */
export default async function globalSetup(config: FullConfig) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Run these tests with `npm run test:e2e:accounts` so the local keys are set.");
  }
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const person of [OWNER, VIEWER]) {
    const old = existing?.users.find((user) => user.email === person.email);
    if (old) await admin.auth.admin.deleteUser(old.id);
  }

  async function create(person: Person) {
    const { data, error } = await admin.auth.admin.createUser({
      email: person.email,
      password: person.password,
      email_confirm: true,
      user_metadata: { full_name: person.name },
    });
    if (error || !data.user) throw error ?? new Error(`Couldn't create ${person.email}`);
    return data.user.id;
  }
  const ownerId = await create(OWNER);
  const viewerId = await create(VIEWER);

  const { data: codes, error: codesError } = await admin
    .from("qr_codes")
    .insert([
      {
        user_id: ownerId,
        name: "Spring menu",
        qr_type: "url",
        is_dynamic: true,
        slug: "SPRING1",
        destination: "https://example.com/menu",
        content: { url: "https://example.com/menu" },
      },
      {
        user_id: ownerId,
        name: "Front desk Wi-Fi",
        qr_type: "wifi",
        content: { ssid: "Guest", password: "welcome123", security: "WPA", hidden: false },
      },
    ])
    .select("id, name");
  if (codesError || !codes) throw codesError ?? new Error("Couldn't create codes");
  const { error: teamError } = await admin
    .from("team_members")
    .insert({ owner_id: ownerId, member_id: viewerId, role: "viewer" });
  if (teamError) throw teamError;

  const menu = codes.find((code) => code.name === "Spring menu");
  const seeded: Seed = { ownerId, viewerId, menuId: menu!.id };
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(SEED_FILE, JSON.stringify(seeded));

  const baseURL = config.projects[0]!.use.baseURL!;
  const browser = await chromium.launch();
  for (const person of [OWNER, VIEWER]) {
    const page = await browser.newPage({ baseURL });
    await page.goto("login");
    await page.getByLabel("Email", { exact: true }).fill(person.email);
    await page.getByLabel("Password", { exact: true }).fill(person.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/(dashboard|codes)/);
    await page.context().storageState({ path: person.state });
    await page.close();
  }
  await browser.close();
}
```

In `.gitignore`, add a line `e2e/accounts/.auth/`.

In `.github/workflows/ci.yml`, add this job after the `verify` job, at the same indentation:

```yaml
  accounts:
    name: Signed-in browser tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci

      - name: Start a local Supabase
        run: npm run db:start

      - name: Install Playwright browser
        run: npx playwright install --with-deps chromium

      - name: Signed-in browser tests
        run: npm run test:e2e:accounts

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-accounts-report
          path: playwright-report
          retention-days: 7
```

- [ ] **Step 5: Run the checks you can run locally, and confirm they pass.**

Run: `npm run lint && npm run typecheck && npm test && npx playwright test --list | tail -1`
Expected:
- Lint and typecheck pass.
- Unit tests pass.
- The public Playwright list doesn't include `accounts/`.

Locally, run `docker system df` and check the free disk space. If more than 10 GB is free, also run `npm run db:start && npm run test:e2e:accounts`. Otherwise skip it: the local Supabase images are about 4 GB.

- [ ] **Step 6: Commit, push and confirm the new CI job passes.**

```bash
npx prettier --write playwright.config.ts playwright.accounts.config.ts e2e/accounts scripts/accounts-e2e.mjs .github/workflows/ci.yml
git add supabase/config.toml supabase/.gitignore playwright.config.ts playwright.accounts.config.ts scripts/accounts-e2e.mjs e2e/accounts package.json .gitignore .github/workflows/ci.yml
git commit -m "Run signed-in browser tests against a local Supabase

The CLI starts a disposable Supabase with this repo's migrations; the
global setup creates an owner and a viewer, two codes and signed-in
browser states. The new CI job runs the suite on every push.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push -u origin feat/app-shell
```

Run: `gh run watch "$(gh run list --branch feat/app-shell --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status`
Expected: both jobs pass. "Signed-in browser tests" reports `1 passed`.
- If `supabase status -o json` names its keys differently, `scripts/accounts-e2e.mjs` prints the keys it found. Map them and record a ruling.

---

### Task 2: The new look: tokens, Inter only, no lime

**Files:**
- Modify:
  - `app/globals.css` (the `:root` and dark token blocks, `@theme inline` and `::selection`)
  - `app/theme.test.ts`
  - `app/fonts.ts`
  - `app/layout.tsx`
  - `features/generator/preview/ScanCheck.tsx`
  - `features/generator/content/TypePicker.tsx`
  - `package.json` (remove `@fontsource-variable/space-grotesk`)

**Interfaces:**
- Produces:
  - The same token names as today, plus `--neutral`, `--neutral-soft` and `--selection`, and the Tailwind colors `neutral` and `neutral-soft`.
  - The `accent` tokens no longer exist.
  - `font-display` now resolves to Inter.

- [ ] **Step 1: Write the failing tests.** In `app/theme.test.ts`, replace the `TEXT_PAIRS` constant with:

```ts
// [foreground, background, minimum ratio]
const TEXT_PAIRS: [string, string, number][] = [
  // Primary text: 7:1 (spec §5).
  ["fg", "bg", 7],
  ["fg", "surface", 7],
  ["fg", "surface-2", 7],
  ["primary-fg", "primary", 7],
  // Secondary text and colored text: 4.5:1.
  ["fg-muted", "bg", 4.5],
  ["fg-muted", "surface", 4.5],
  ["fg-muted", "surface-2", 4.5],
  ["fg-subtle", "surface", 4.5],
  ["primary-fg", "primary-hover", 4.5],
  ["primary-soft-fg", "primary-soft", 4.5],
  ["link", "bg", 4.5],
  ["link", "surface", 4.5],
  ["link", "surface-2", 4.5],
  ["success", "surface", 4.5],
  ["success", "success-soft", 4.5],
  ["warning", "surface", 4.5],
  ["warning", "warning-soft", 4.5],
  ["danger", "surface", 4.5],
  ["danger", "danger-soft", 4.5],
  ["neutral", "neutral-soft", 4.5],
  // Non-text UI boundaries (WCAG 1.4.11): 3:1.
  ["field-border", "bg", 3],
  ["field-border", "surface", 3],
  ["ring", "bg", 3],
  ["ring", "surface", 3],
];
```

and add after the `describe.each` block:

```ts
describe("type and accents", () => {
  it("uses Inter only", () => {
    expect(css).not.toMatch(/space-grotesk/i);
    expect(readFileSync(resolve(process.cwd(), "app/fonts.ts"), "utf8")).not.toMatch(/Grotesk/);
  });

  it("has no lime accent left", () => {
    expect(css).not.toMatch(/#a3e635|--accent\b/i);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run app/theme.test.ts`
Expected: FAIL. `fg on bg meets 7:1` fails, `neutral` is undefined, and the type and accent tests fail.

- [ ] **Step 3: Implement.** In `app/globals.css`, replace everything from `:root {` through the closing `}` of `@theme inline { … }` with:

```css
:root {
  color-scheme: light;
  --bg: #ffffff;
  --surface: #fcfcfd;
  --surface-2: #f2f4f7;
  --border: #eaecf0;
  --field-border: #848d9c;
  --fg: #101828;
  --fg-muted: #475467;
  --fg-subtle: #667085;
  --primary: #101828;
  --primary-hover: #344054;
  --primary-fg: #ffffff;
  --primary-soft: #eff4ff;
  --primary-soft-fg: #1d4ed8;
  --link: #1d4ed8;
  --ring: #1d4ed8;
  --success: #05603a;
  --success-soft: #dcfae6;
  --warning: #93370d;
  --warning-soft: #fef0c7;
  --danger: #912018;
  --danger-soft: #fee4e2;
  --neutral: #344054;
  --neutral-soft: #eaecf0;
  --selection: #d1e0ff;
  --logo-ring: #4f46e5;
  /* Chart series, validated for color-blind separation against the surface. */
  --chart-1: #1d4ed8;
  --shadow-color: 220 43% 11%;
}

[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0c0d0f;
  --surface: #131417;
  --surface-2: #1b1d21;
  --border: #2a2d33;
  --field-border: #6b7280;
  --fg: #f5f6f7;
  --fg-muted: #c3c7cf;
  --fg-subtle: #9aa0aa;
  --primary: #f5f6f7;
  --primary-hover: #d0d5dd;
  --primary-fg: #101828;
  --primary-soft: #172554;
  --primary-soft-fg: #bfdbfe;
  --link: #60a5fa;
  --ring: #60a5fa;
  --success: #47cd89;
  --success-soft: #053321;
  --warning: #fdb022;
  --warning-soft: #4e1d09;
  --danger: #f97066;
  --danger-soft: #55160c;
  --neutral: #d0d5dd;
  --neutral-soft: #2a2d33;
  --selection: #1e3a8a;
  --logo-ring: #818cf8;
  --chart-1: #60a5fa;
  --shadow-color: 228 30% 2%;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-border: var(--border);
  --color-field-border: var(--field-border);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-fg-subtle: var(--fg-subtle);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-fg: var(--primary-fg);
  --color-primary-soft: var(--primary-soft);
  --color-primary-soft-fg: var(--primary-soft-fg);
  --color-link: var(--link);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-neutral: var(--neutral);
  --color-neutral-soft: var(--neutral-soft);
  --color-chart-1: var(--chart-1);

  /* Inter only (spec §5); "display" keeps working for headings. */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-inter), ui-sans-serif, system-ui, sans-serif;

  --radius-field: 0.5rem;
  --radius-control: 0.5rem;
  --radius-card: 0.75rem;

  /* Flat cards; only popovers lift off the page. */
  --shadow-card: 0 0 #0000;
  --shadow-pop: 0 12px 32px -12px hsl(var(--shadow-color) / 0.28);
}
```

In the same file, replace the `::selection` rule's two declarations with:

```css
    background: var(--selection);
    color: var(--fg);
```

Replace `app/fonts.ts` with:

```ts
import localFont from "next/font/local";

// Self-hosted variable font: no requests to third-party font servers at runtime or build time.
export const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
```

In `app/layout.tsx`:
- Change `import { inter, spaceGrotesk } from "./fonts";` to `import { inter } from "./fonts";`.
- Change `className={`${inter.variable} ${spaceGrotesk.variable}`}` to `className={inter.variable}`.
- Change the two `themeColor` colors to `#FFFFFF` (light) and `#0C0D0F` (dark).

Remove the lime accent from the generator:
- In `features/generator/preview/ScanCheck.tsx`, change `className: "bg-accent text-accent-fg"` to `className: "bg-success-soft text-success"`.
- In `features/generator/content/TypePicker.tsx`, replace `data-checked:border-accent data-checked:bg-accent data-checked:text-accent-fg` with `data-checked:border-primary data-checked:bg-primary data-checked:text-primary-fg`.

Remove the font package: run `npm uninstall @fontsource-variable/space-grotesk`.

- [ ] **Step 4: Run the tests and checks, and confirm they pass.**

Run: `npx vitest run app/theme.test.ts && grep -rn "accent-fg\|bg-accent\|border-accent\|text-accent" app features components; npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`
Expected:
- The theme tests PASS.
- The grep prints nothing.
- All other checks PASS, including the public axe runs in light and dark.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write app/globals.css app/theme.test.ts app/fonts.ts app/layout.tsx features/generator/preview/ScanCheck.tsx features/generator/content/TypePicker.tsx
git add app/globals.css app/theme.test.ts app/fonts.ts app/layout.tsx features/generator/preview/ScanCheck.tsx features/generator/content/TypePicker.tsx package.json package-lock.json
git commit -m "Switch to the calm, professional look

Neutral grays, a near-black primary and one blue for links; Inter only;
no lime accent; flat cards with shadows only on popovers. The theme test
now holds primary text to 7:1, secondary text to 4.5:1 and borders to
3:1 in both themes.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: The app shell

**Files:**
- Create:
  - `components/app/nav.ts` and `components/app/nav.test.ts`
  - `components/app/AppShell.tsx` and `components/app/AppShell.test.tsx`
  - `components/app/WorkspaceSwitcher.tsx`
  - `components/app/CreateButton.tsx`
  - `components/app/UserMenu.tsx`
  - `components/app/PageHeader.tsx`
  - `components/app/SettingsSection.tsx`

**Interfaces:**
- Consumes:
  - `Avatar` (Phase 1a)
  - `useProfile` (Phase 1a)
  - `ThemeToggle`, `Sheet`, `LogoMark`, `buttonClasses`
  - `ROLE_LABELS`
- Produces:
  - Types:
    - `ShellUser { id: string; email: string; name: string | null; avatarUrl: string | null }`
    - `ShellTeam { ownerId: string; label: string; role: TeamRole; avatarUrl: string | null }`
  - Helpers and constants:
    - `withWorkspace(href, ownerId | null)`
    - `isCurrent(pathname, href)`
    - `menuItemClass`
  - Components:
    - `<AppShell user teams>{children}</AppShell>`
    - `<PageHeader title description? actions? />`
    - `<SettingsSection title description? danger? id?>`

- [ ] **Step 1: Write the failing tests.** Create `components/app/nav.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { isCurrent, withWorkspace } from "./nav";

describe("withWorkspace", () => {
  it("adds the team to a link, keeping its other parameters", () => {
    expect(withWorkspace("/codes", "t1")).toBe("/codes?workspace=t1");
    expect(withWorkspace("/codes?folder=f1", "t1")).toBe("/codes?folder=f1&workspace=t1");
  });

  it("leaves links to your own codes alone", () => {
    expect(withWorkspace("/codes", null)).toBe("/codes");
  });
});

describe("isCurrent", () => {
  it("matches the page and pages under it, not look-alikes", () => {
    expect(isCurrent("/codes", "/codes?workspace=t1")).toBe(true);
    expect(isCurrent("/codes/abc/analytics", "/codes")).toBe(true);
    expect(isCurrent("/codesx", "/codes")).toBe(false);
    expect(isCurrent("/settings/security", "/settings")).toBe(true);
  });
});
```

Create `components/app/AppShell.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./AppShell";
import type { ShellTeam } from "./nav";

let pathname = "/codes";
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => search,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const USER = { id: "u1", email: "david@example.com", name: "David Allmon", avatarUrl: null };
const EDITOR: ShellTeam = { ownerId: "t1", label: "Cafe", role: "editor", avatarUrl: null };
const VIEWER: ShellTeam = { ownerId: "t2", label: "Bakery", role: "viewer", avatarUrl: null };

function renderShell() {
  return render(
    <AppShell user={USER} teams={[EDITOR, VIEWER]}>
      <h1>Page</h1>
    </AppShell>,
  );
}

const hrefs = (name: string | RegExp) =>
  screen.getAllByRole("link", { name }).map((link) => link.getAttribute("href"));

beforeEach(() => {
  pathname = "/codes";
  search = new URLSearchParams();
});

describe("AppShell", () => {
  it("links every section, keeping the team you're looking at", () => {
    search = new URLSearchParams("workspace=t1");
    renderShell();
    expect(new Set(hrefs("Codes"))).toEqual(new Set(["/codes?workspace=t1"]));
    expect(new Set(hrefs(/^Create( code)?$/))).toEqual(new Set(["/?workspace=t1"]));
    expect(new Set(hrefs("Team"))).toEqual(new Set(["/team"]));
    expect(hrefs("Settings")).toContain("/settings");
    expect(hrefs("Help & API docs")).toEqual(["/developers"]);
    expect(screen.getByRole("link", { name: "Support QuickQReate" })).toHaveAttribute(
      "href",
      "https://buymeacoffee.com/davidallmon",
    );
  });

  it("marks the current page", () => {
    pathname = "/team";
    renderShell();
    for (const link of screen.getAllByRole("link", { name: "Team" })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    for (const link of screen.getAllByRole("link", { name: "Codes" })) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("viewers can't create", () => {
    search = new URLSearchParams("workspace=t2");
    renderShell();
    expect(screen.queryAllByRole("link", { name: /^Create( code)?$/ })).toEqual([]);
  });

  it("switches between your codes and your teams' codes", async () => {
    renderShell();
    await userEvent.click(screen.getAllByRole("button", { name: /Switch team/ })[0]!);
    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /My codes/ })).toHaveAttribute("href", "/codes");
    expect(within(menu).getByRole("menuitem", { name: /Cafe’s codes/ })).toHaveAttribute(
      "href",
      "/codes?workspace=t1",
    );
  });

  it("expands and collapses the tablet rail", async () => {
    renderShell();
    const toggle = screen.getByRole("button", { name: "Expand menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Collapse menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("puts settings, help, support and sign out under More on phones", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    const sheet = screen.getByRole("dialog", { name: "More" });
    for (const name of ["Settings", "Help & API docs", "Support QuickQReate"]) {
      expect(within(sheet).getByRole("link", { name })).toBeInTheDocument();
    }
    expect(within(sheet).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run components/app`
Expected: FAIL with "Failed to resolve import" for `./nav` and `./AppShell`.

- [ ] **Step 3: Implement.** Create `components/app/nav.ts`:

```ts
import type { TeamRole } from "@/types/supabase";

/** The signed-in person, as the shell shows them. */
export interface ShellUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

/** A team (another person's codes) the signed-in person belongs to. */
export interface ShellTeam {
  ownerId: string;
  /** The owner's name, or their email. */
  label: string;
  role: TeamRole;
  avatarUrl: string | null;
}

/** Adds ?workspace=<owner> for a team's codes; links to your own codes need no parameter. */
export function withWorkspace(href: string, ownerId: string | null): string {
  if (!ownerId) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("workspace", ownerId);
  return `${path}?${params.toString()}`;
}

/** Whether a nav link points at the current page or a page under it. */
export function isCurrent(pathname: string, href: string): boolean {
  const path = href.split("?")[0]!;
  return pathname === path || pathname.startsWith(`${path}/`);
}

export const menuItemClass =
  "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg data-focus:bg-surface-2 [&_svg]:size-4 [&_svg]:shrink-0";

export const menuPanelClass =
  "z-50 w-64 rounded-control border border-border bg-surface p-1.5 shadow-pop transition duration-150 data-closed:-translate-y-1 data-closed:opacity-0";
```

Create `components/app/WorkspaceSwitcher.tsx`:

```tsx
"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Check, ChevronsUpDown } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABELS } from "@/features/teams/roles";
import { cn } from "@/lib/cn";

import { menuItemClass, menuPanelClass, withWorkspace, type ShellTeam, type ShellUser } from "./nav";

interface WorkspaceSwitcherProps {
  user: ShellUser;
  teams: ShellTeam[];
  /** The team whose codes are shown, or null for your own. */
  current: ShellTeam | null;
  /** Icon-only on tablets until the rail is expanded. */
  collapsed?: boolean;
}

/** Choose whose codes you're working in: yours, or a team you belong to. */
export function WorkspaceSwitcher({ user, teams, current, collapsed = false }: WorkspaceSwitcherProps) {
  const label = current ? `${current.label}’s codes` : "My codes";
  return (
    <Menu as="div" className="relative min-w-0">
      <MenuButton
        aria-label={`Switch team (showing ${label})`}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-control border border-border bg-surface px-2 text-left text-sm font-medium text-fg hover:bg-surface-2 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring",
          collapsed && "max-lg:justify-center max-lg:border-transparent max-lg:px-0",
        )}
      >
        <Avatar
          id={current?.ownerId ?? user.id}
          name={current ? current.label : user.name}
          email={current ? null : user.email}
          src={current ? current.avatarUrl : user.avatarUrl}
          size="sm"
        />
        <span className={cn("min-w-0 flex-1 truncate", collapsed && "max-lg:sr-only")}>{label}</span>
        <ChevronsUpDown
          aria-hidden
          className={cn("size-4 shrink-0 text-fg-muted", collapsed && "max-lg:hidden")}
        />
      </MenuButton>
      <MenuItems anchor={{ to: "bottom start", gap: 6 }} transition className={menuPanelClass}>
        <MenuItem>
          <Link href="/codes" className={menuItemClass}>
            <Avatar id={user.id} name={user.name} email={user.email} src={user.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1 truncate">My codes</span>
            {!current && <Check aria-hidden className="text-fg-muted" />}
          </Link>
        </MenuItem>
        {teams.map((team) => (
          <MenuItem key={team.ownerId}>
            <Link href={withWorkspace("/codes", team.ownerId)} className={menuItemClass}>
              <Avatar id={team.ownerId} name={team.label} src={team.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate">{team.label}’s codes</span>
              <span className="text-fg-muted">{ROLE_LABELS[team.role]}</span>
            </Link>
          </MenuItem>
        ))}
        {teams.length === 0 && (
          <p className="px-3 py-2 text-sm text-fg-muted">Teams you join show up here.</p>
        )}
      </MenuItems>
    </Menu>
  );
}
```

Create `components/app/CreateButton.tsx`:

```tsx
"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown, Plus, Rows3 } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

import { menuItemClass, menuPanelClass, withWorkspace } from "./nav";

/** "+ Create code", with bulk creation one click away. */
export function CreateButton({
  ownerId,
  collapsed = false,
  onNavigate,
}: {
  ownerId: string | null;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn("flex", collapsed && "max-lg:justify-center")}>
      <Link
        href={withWorkspace("/", ownerId)}
        onClick={onNavigate}
        className={cn(
          buttonClasses("primary", "md"),
          "flex-1 rounded-r-none",
          collapsed && "max-lg:w-11 max-lg:flex-none max-lg:rounded-control max-lg:px-0",
        )}
      >
        <Plus aria-hidden />
        <span className={cn(collapsed && "max-lg:sr-only")}>Create code</span>
      </Link>
      <Menu as="div" className={cn("relative", collapsed && "max-lg:hidden")}>
        <MenuButton
          aria-label="More ways to create"
          className={cn(
            buttonClasses("primary", "md"),
            "rounded-l-none border-l border-primary-fg/25 px-2.5",
          )}
        >
          <ChevronDown aria-hidden />
        </MenuButton>
        <MenuItems anchor={{ to: "bottom end", gap: 6 }} transition className={menuPanelClass}>
          <MenuItem>
            <Link href={withWorkspace("/bulk", ownerId)} onClick={onNavigate} className={menuItemClass}>
              <Rows3 aria-hidden /> Bulk create from a spreadsheet
            </Link>
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );
}
```

Create `components/app/UserMenu.tsx`:

```tsx
"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

import { menuItemClass, menuPanelClass, type ShellUser } from "./nav";

/** Your photo and name at the bottom of the sidebar, with Settings, Theme and Sign out. */
export function UserMenu({ user, collapsed = false }: { user: ShellUser; collapsed?: boolean }) {
  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label="Account menu"
        className={cn(
          "flex min-h-11 w-full items-center gap-2.5 rounded-control p-2 text-left hover:bg-surface-2 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring",
          collapsed && "max-lg:justify-center max-lg:p-1",
        )}
      >
        <Avatar id={user.id} name={user.name} email={user.email} src={user.avatarUrl} size="sm" />
        <span className={cn("min-w-0 flex-1", collapsed && "max-lg:sr-only")}>
          <span className="block truncate text-sm font-medium text-fg">{user.name ?? user.email}</span>
          {user.name && <span className="block truncate text-sm text-fg-muted">{user.email}</span>}
        </span>
      </MenuButton>
      <MenuItems anchor={{ to: "top start", gap: 8 }} transition className={menuPanelClass}>
        <MenuItem>
          <Link href="/settings" className={menuItemClass}>
            <Settings aria-hidden /> Settings
          </Link>
        </MenuItem>
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-fg">
          Theme <ThemeToggle />
        </div>
        <MenuItem>
          <form action="/auth/signout" method="post">
            <button type="submit" className={menuItemClass}>
              <LogOut aria-hidden /> Sign out
            </button>
          </form>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
```

Create `components/app/PageHeader.tsx`:

```tsx
import type { ReactNode } from "react";

/** The title row of an app page, with optional actions on the right (stacked on phones). */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
```

Create `components/app/SettingsSection.tsx`:

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** One block of a settings page: what it is on the left (on top on phones), controls beside it. */
export function SettingsSection({
  id,
  title,
  description,
  danger,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "grid scroll-mt-20 gap-4 rounded-card border bg-surface p-5 sm:p-6 md:grid-cols-[14rem_1fr] md:gap-8",
        danger ? "border-danger/40" : "border-border",
      )}
    >
      <div>
        <h2 className={cn("text-base font-semibold", danger ? "text-danger" : "text-fg")}>{title}</h2>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
```

Create `components/app/AppShell.tsx`:

```tsx
"use client";

import {
  BookOpen,
  Coffee,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  QrCode,
  Settings,
  Users,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { LogoMark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Sheet } from "@/components/ui/Sheet";
import { useProfile } from "@/features/profile/useProfile";
import { cn } from "@/lib/cn";
import { BUY_ME_A_COFFEE_URL } from "@/lib/env";

import { CreateButton } from "./CreateButton";
import { isCurrent, withWorkspace, type ShellTeam, type ShellUser } from "./nav";
import { UserMenu } from "./UserMenu";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
}

const sideLinkClass =
  "flex min-h-10 items-center gap-3 rounded-control px-2.5 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg aria-[current=page]:bg-surface-2 aria-[current=page]:font-semibold aria-[current=page]:text-fg focus-ring [&_svg]:size-5 [&_svg]:shrink-0";

const tabClass =
  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[13px] font-medium text-fg-muted aria-[current=page]:text-fg focus-ring [&_svg]:size-5";

/** One sidebar link; on a collapsed tablet rail only its icon shows (the label stays for screen readers). */
function SideLink({
  item,
  current,
  expanded,
  onNavigate,
}: {
  item: NavItem;
  current: boolean;
  expanded: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const className = cn(sideLinkClass, !expanded && "max-lg:justify-center max-lg:px-0");
  const content = (
    <>
      <Icon aria-hidden />
      <span className={cn("truncate", !expanded && "max-lg:sr-only")}>{item.label}</span>
    </>
  );
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener" className={className}>
      {content}
    </a>
  ) : (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      className={className}
    >
      {content}
    </Link>
  );
}

/**
 * The signed-in app around every page: a sidebar on desktops, an icon rail on tablets (expand
 * it for labels), and a top bar plus bottom tabs on phones. Whose codes you're looking at comes
 * from ?workspace= and follows every link.
 */
export function AppShell({
  user,
  teams,
  children,
}: {
  user: ShellUser;
  teams: ShellTeam[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // A rename or new photo on the settings page shows here straight away.
  const profile = useProfile(user.id);
  const me: ShellUser = profile
    ? { ...user, name: profile.display_name?.trim() || null, avatarUrl: profile.avatar_url }
    : user;
  const team = teams.find((t) => t.ownerId === searchParams.get("workspace")) ?? null;
  const ownerId = team?.ownerId ?? null;
  const canCreate = !team || team.role === "editor";
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const collapse = () => setExpanded(false);

  const codesHref = withWorkspace("/codes", ownerId);
  const main: NavItem[] = [
    { href: codesHref, label: "Codes", icon: QrCode },
    { href: "/team", label: "Team", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  const help: NavItem[] = [
    { href: "/developers", label: "Help & API docs", icon: BookOpen },
    { href: BUY_ME_A_COFFEE_URL, label: "Support QuickQReate", icon: Coffee, external: true },
  ];

  const more: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }, ...help];
  const sideLink = (item: NavItem) => (
    <SideLink
      key={item.label}
      item={item}
      current={!item.external && isCurrent(pathname, item.href)}
      expanded={expanded}
      onNavigate={collapse}
    />
  );

  return (
    <div className="min-h-dvh bg-bg text-sm text-fg">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-primary px-4 py-2 font-semibold text-primary-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {expanded && (
        <div
          aria-hidden
          onClick={collapse}
          className="fixed inset-0 z-30 hidden bg-black/30 sm:block lg:hidden"
        />
      )}

      <aside
        aria-label="Sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col gap-3 overflow-y-auto border-r border-border bg-surface px-3 py-4 sm:flex",
          expanded ? "w-64 shadow-pop" : "w-16 lg:w-64",
        )}
      >
        <div className={cn("flex items-center gap-2 px-1", !expanded && "max-lg:flex-col")}>
          <Link
            href={codesHref}
            aria-label="QuickQReate codes"
            onClick={collapse}
            className="rounded-control focus-ring"
          >
            <LogoMark className="size-8" />
          </Link>
          <button
            type="button"
            aria-label={expanded ? "Collapse menu" : "Expand menu"}
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
            className="grid size-10 place-items-center rounded-control text-fg-muted hover:bg-surface-2 hover:text-fg focus-ring lg:hidden [&_svg]:size-5"
          >
            {expanded ? <PanelLeftClose aria-hidden /> : <PanelLeftOpen aria-hidden />}
          </button>
        </div>

        <WorkspaceSwitcher user={me} teams={teams} current={team} collapsed={!expanded} />
        {canCreate && <CreateButton ownerId={ownerId} collapsed={!expanded} onNavigate={collapse} />}

        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {main.map(sideLink)}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
          {help.map(sideLink)}
          <UserMenu user={me} collapsed={!expanded} />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 sm:hidden">
        <Link href={codesHref} aria-label="QuickQReate codes" className="rounded-control focus-ring">
          <LogoMark className="size-7" />
        </Link>
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher user={me} teams={teams} current={team} />
        </div>
      </header>

      <main id="main" className="px-4 pt-5 pb-28 sm:ml-16 sm:px-6 sm:pb-10 lg:ml-64 lg:px-10 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <nav
        aria-label="Main"
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden",
          canCreate ? "grid-cols-4" : "grid-cols-3",
        )}
      >
        <Link
          href={codesHref}
          aria-current={isCurrent(pathname, codesHref) ? "page" : undefined}
          className={tabClass}
        >
          <QrCode aria-hidden /> Codes
        </Link>
        {canCreate && (
          <Link href={withWorkspace("/", ownerId)} className={tabClass}>
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-fg [&_svg]:size-5">
              <Plus aria-hidden />
            </span>
            Create
          </Link>
        )}
        <Link
          href="/team"
          aria-current={isCurrent(pathname, "/team") ? "page" : undefined}
          className={tabClass}
        >
          <Users aria-hidden /> Team
        </Link>
        <button type="button" onClick={() => setMoreOpen(true)} className={tabClass}>
          <MoreHorizontal aria-hidden /> More
        </button>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <ul className="flex flex-col gap-1 pb-2">
          {more.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
                  className={sideLinkClass}
                >
                  <Icon aria-hidden /> {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex min-h-11 items-center justify-between gap-2 px-2.5 text-sm font-medium text-fg">
            Theme <ThemeToggle />
          </li>
          <li>
            <form action="/auth/signout" method="post">
              <button type="submit" className={cn(sideLinkClass, "w-full")}>
                <LogOut aria-hidden /> Sign out
              </button>
            </form>
          </li>
        </ul>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and checks, and confirm they pass.**

Run: `npx vitest run components/app && npm run lint && npm run typecheck`
Expected: PASS, with 0 lint and type errors.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write components/app
git add components/app
git commit -m "Add the app shell: sidebar, tablet rail and phone tabs

The sidebar holds the team switcher, Create code (with bulk create),
Codes, Team and Settings, then Help & API docs, Support QuickQReate and
your account. Tablets get an icon rail that expands for labels; phones
get a top bar and bottom tabs with a More sheet. Team context follows
every link, and viewers see no create controls.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: New addresses, redirects and settings tabs

**Files:**
- Create:
  - `app/(app)/layout.tsx`
  - `app/(app)/codes/page.tsx`
  - `app/(app)/codes/[id]/page.tsx`
  - `app/(app)/codes/[id]/analytics/page.tsx`
  - `app/(app)/codes/[id]/analytics/export/route.ts`
  - `app/(app)/team/page.tsx`
  - `app/(app)/settings/layout.tsx`
  - `app/(app)/settings/SettingsTabs.tsx`
  - `app/(app)/settings/page.tsx`
  - `app/(app)/settings/security/page.tsx`
  - `app/(app)/settings/api-keys/page.tsx`
  - `app/(app)/settings/account/page.tsx`
  - `app/(app)/settings/account/actions.ts`
- Delete:
  - `app/dashboard/**`
  - `app/account/page.tsx`
  - `app/account/actions.ts`
  - Keep `app/account/layout.tsx` and `app/account/update-password/page.tsx`.
- Modify, for the redirects, proxy and auth defaults:
  - `next.config.ts`
  - `proxy.ts`
  - `lib/teams/server.ts`
  - `features/auth/redirects.ts`, `features/auth/redirects.test.ts`
  - `app/auth/confirm/route.ts`
  - `public/email-templates/confirm.html`
  - `features/auth/LoginForm.tsx`
  - `app/account/update-password/page.tsx`
  - `features/auth/DeleteAccountForm.tsx`
- Modify, for links to the new routes:
  - `app/(auth)/invite/[token]/actions.ts`
  - `app/(auth)/invite/[token]/page.tsx`
  - `app/(docs)/developers/page.tsx`
  - `features/bulk/BulkGenerator.tsx`
  - `features/dashboard/CodeCard.tsx`
  - `features/dashboard/CodeEditor.tsx`
  - `features/generator/SavePanel.tsx`
  - `features/teams/TeamManager.tsx`
  - `features/analytics/AnalyticsView.tsx`
  - `features/auth/AccountMenu.tsx`
- Modify tests: `e2e/server.spec.ts` and `e2e/accounts/sign-in.spec.ts`.

**Interfaces:**
- Consumes:
  - `AppShell`, `PageHeader`, `SettingsSection`, `withWorkspace` and `ShellTeam` (Task 3)
  - the `my_workspaces` columns `owner_avatar_url` (Phase 1a)
- Produces:
  - Routes: `/codes`, `/codes/<id>`, `/codes/<id>/analytics`, `/codes/<id>/analytics/export`, `/team`, `/settings`, `/settings/security`, `/settings/api-keys` and `/settings/account`
  - `codesHref(ownerId, userId)`, which replaces `dashboardHref`
  - `safeNext`'s default is now `/codes`

- [ ] **Step 1: Write the failing tests.**

In `e2e/server.spec.ts`, replace the `"account pages are not reachable"` test with:

```ts
  test("account pages are not reachable", async ({ request }) => {
    for (const path of [
      "/login",
      "/signup",
      "/forgot-password",
      "/codes",
      "/team",
      "/settings",
      "/settings/security",
      `/invite/${"ab".repeat(24)}`,
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
    }
  });

  test("old account addresses move to the new ones, keeping their query", async ({ request }) => {
    for (const [from, to] of [
      ["/dashboard", "/codes"],
      ["/dashboard?workspace=abc", "/codes?workspace=abc"],
      ["/dashboard/team", "/team"],
      ["/dashboard/codes/abc", "/codes/abc"],
      ["/dashboard/codes/abc/analytics?range=30d", "/codes/abc/analytics?range=30d"],
      ["/account", "/settings"],
    ] as const) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBe(308);
      expect(response.headers().location, from).toBe(to);
    }
  });
```

In `features/auth/redirects.test.ts`:
- Replace every `"/dashboard"` expected fallback in the `safeNext` tests with `"/codes"`. The kept-path test `safeNext("/dashboard/codes/1?tab=stats")` changes to `safeNext("/codes/1?tab=stats")` with the same expected value.
- In the `confirmDestination` tests:
  - Change `confirmDestination("/dashboard", "email", TOKEN)` and `("/dashboard", "signup", TOKEN)` to use `"/codes"`.
  - Change `("/dashboard", "email", null)` → `"/dashboard"` to `("/codes", "email", null)` → `"/codes"`.
  - Change `("/dashboard", "email", "../../evil")` → `"/dashboard"` to `("/codes", "email", "../../evil")` → `"/codes"`.
  - Add this test inside the `describe`:

```ts
  it("still opens a waiting invite from confirmation emails sent before the move", () => {
    expect(confirmDestination("/dashboard", "email", TOKEN)).toBe(`/invite/${TOKEN}`);
  });
```

In `e2e/accounts/sign-in.spec.ts`, change `await page.goto("dashboard");` to `await page.goto("codes");`.

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run features/auth/redirects.test.ts; npm run build && npx playwright test e2e/server.spec.ts --project=desktop`
Expected: FAIL.
- `safeNext` still falls back to `/dashboard`.
- `/codes` returns 404 for the wrong reason (no route), and `/dashboard` is a 404 rather than a 308.

- [ ] **Step 3: Implement the redirects, proxy and auth defaults.**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained Node server for the Docker image Coolify runs.
  output: "standalone",
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // The app moved in the 2026 redesign; old bookmarks and email links keep working (308s keep
  // the query string, e.g. ?workspace=).
  async redirects() {
    return [
      { source: "/dashboard", destination: "/codes", permanent: true },
      { source: "/dashboard/team", destination: "/team", permanent: true },
      { source: "/dashboard/codes/:id", destination: "/codes/:id", permanent: true },
      { source: "/dashboard/codes/:id/:rest*", destination: "/codes/:id/:rest*", permanent: true },
      { source: "/account", destination: "/settings", permanent: true },
    ];
  },
};

export default nextConfig;
```

In `proxy.ts`, change the matcher to:

```ts
  matcher: ["/R/:path*", "/codes/:path*", "/team/:path*", "/settings/:path*", "/account/:path*"],
```

In `lib/teams/server.ts`, replace the `dashboardHref` export with:

```ts
/** The codes list for a workspace: your own, or a team owner's. */
export const codesHref = (ownerId: string, userId: string) =>
  ownerId === userId ? "/codes" : `/codes?workspace=${ownerId}`;
```

In `features/auth/redirects.ts`:
- Change `fallback = "/dashboard"` to `fallback = "/codes"`.
- In `confirmDestination`, change `next === "/dashboard"` to `(next === "/codes" || next === "/dashboard")`.

In `app/auth/confirm/route.ts`, change `"/dashboard",` (the non-recovery default) to `"/codes",`.

In `public/email-templates/confirm.html`, replace all three `next=/dashboard` with `next=/codes`.

In `features/auth/LoginForm.tsx`, change `next=/dashboard` in `emailRedirectTo` to `next=/codes`.

In `app/account/update-password/page.tsx`, change `redirectTo="/dashboard"` to `redirectTo="/codes"`.

- [ ] **Step 4: Create the app routes.**

Create `app/(app)/layout.tsx`:

```tsx
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/app/AppShell";
import { workspaceLabel } from "@/features/teams/roles";
import { getAuthState } from "@/lib/auth/server";
import { accountsEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

/** The signed-in app. Each page still checks sign-in itself (and redirects if needed). */
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!accountsEnabled) notFound();
  const { supabase, user } = await getAuthState();
  if (!user) return <>{children}</>;
  const [{ data: profile }, { data: workspaces }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
    supabase.rpc("my_workspaces"),
  ]);
  return (
    <Suspense>
      <AppShell
        user={{
          id: user.id,
          email: user.email ?? "",
          name: profile?.display_name?.trim() || null,
          avatarUrl: profile?.avatar_url ?? null,
        }}
        teams={(workspaces ?? []).map((w) => ({
          ownerId: w.owner_id,
          label: workspaceLabel(w),
          role: w.role,
          avatarUrl: w.owner_avatar_url,
        }))}
      >
        {children}
      </AppShell>
    </Suspense>
  );
}
```

Create `app/(app)/codes/page.tsx`:

```tsx
import { Eye, Plus, Rows3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/PageHeader";
import { withWorkspace } from "@/components/app/nav";
import { buttonClasses } from "@/components/ui/Button";
import { CodeList } from "@/features/dashboard/CodeList";
import { formatCount } from "@/features/dashboard/format";
import { ROLE_LABELS, workspaceLabel } from "@/features/teams/roles";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Codes · QuickQReate" };

export default async function CodesPage({ searchParams }: PageProps<"/codes">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const { supabase, user } = await requireUser(
    requested ? `/codes?workspace=${requested}` : "/codes",
  );
  const { data: workspaces } = await supabase.rpc("my_workspaces");
  const membership = workspaces?.find((w) => w.owner_id === requested) ?? null;
  // Members can read their teams' codes too, so always filter to the workspace shown.
  const ownerId = membership?.owner_id ?? user.id;
  const teamId = membership?.owner_id ?? null;
  const canEdit = !membership || membership.role === "editor";

  const [{ data: codes }, { data: folders }] = await Promise.all([
    supabase
      .from("qr_codes")
      .select("*")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false }),
    supabase.from("folders").select("*").eq("user_id", ownerId).order("name"),
  ]);
  const list = codes ?? [];
  const totalScans = list.reduce((sum, c) => sum + c.scan_count, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={membership ? `${workspaceLabel(membership)}’s codes` : "All codes"}
        description={
          <>
            {membership && <>{ROLE_LABELS[membership.role]} · </>}
            {formatCount(list.length)} {list.length === 1 ? "code" : "codes"} ·{" "}
            {formatCount(totalScans)} {totalScans === 1 ? "scan" : "scans"}
          </>
        }
        actions={
          canEdit && (
            <>
              <Link href={withWorkspace("/bulk", teamId)} className={buttonClasses("outline", "md")}>
                <Rows3 aria-hidden /> Bulk create
              </Link>
              <Link href={withWorkspace("/", teamId)} className={buttonClasses("primary", "md")}>
                <Plus aria-hidden /> Create code
              </Link>
            </>
          )
        }
      />

      {!canEdit && (
        <p className="flex items-center gap-2 rounded-control bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          <Eye aria-hidden className="size-4 shrink-0" />
          You can view these codes and their analytics. Ask the owner to make you an editor to
          change them.
        </p>
      )}

      <CodeList
        key={ownerId}
        codes={list}
        folders={folders ?? []}
        ownerId={ownerId}
        canEdit={canEdit}
        newHref={withWorkspace("/", teamId)}
      />
    </div>
  );
}
```

Move the code pages: `git mv "app/dashboard/codes/[id]/page.tsx" "app/(app)/codes/[id]/page.tsx"` and `git mv "app/dashboard/codes/[id]/analytics" "app/(app)/codes/[id]/analytics"`. Then:
- In `app/(app)/codes/[id]/page.tsx`:
  - Change the import of `dashboardHref` to `codesHref`, and its use to `codesHref(code.user_id, user.id)`.
  - Change `PageProps<"/dashboard/codes/[id]">` to `PageProps<"/codes/[id]">`, and `requireUser(`/dashboard/codes/${id}`)` to `requireUser(`/codes/${id}`)`.
  - Change the back label `"My codes"` to `"All codes"`.
- In `app/(app)/codes/[id]/analytics/page.tsx`:
  - Change `PageProps<"/dashboard/codes/[id]/analytics">` to `PageProps<"/codes/[id]/analytics">`, and `requireUser(`/dashboard/codes/${id}/analytics`)` to `requireUser(`/codes/${id}/analytics`)`.
  - Change `href={`/dashboard/codes/${code.id}`}` to `href={`/codes/${code.id}`}`.
  - Change the static-code card text to: "“{code.name}” encodes its content directly, so scans never pass through QuickQReate. Create a trackable Link code to see scans and change where it points later." Change the button text "New dynamic code" to "Create a trackable code".
- In `app/(app)/codes/[id]/analytics/export/route.ts`, change `RouteContext<"/dashboard/codes/[id]/analytics/export">` to `RouteContext<"/codes/[id]/analytics/export">`.

Create `app/(app)/team/page.tsx`:

```tsx
import type { Metadata } from "next";

import { PageHeader } from "@/components/app/PageHeader";
import { TeamManager } from "@/features/teams/TeamManager";
import { requireUser } from "@/lib/auth/server";
import { emailConfigured } from "@/lib/email/brevo";

export const metadata: Metadata = { title: "Team · QuickQReate" };

export default async function TeamPage() {
  const { supabase, user } = await requireUser("/team");
  const [members, invites, workspaces] = await Promise.all([
    supabase.rpc("team_overview"),
    supabase
      .from("team_invites")
      .select("id, email, role, token, created_at, expires_at, last_sent_at, send_count")
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
    supabase.rpc("my_workspaces"),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Team"
        description="Invite people to your codes and choose who can change them."
      />
      <TeamManager
        userId={user.id}
        members={members.data ?? []}
        invites={invites.data ?? []}
        workspaces={workspaces.data ?? []}
        emailEnabled={emailConfigured()}
      />
    </div>
  );
}
```

Create `app/(app)/settings/SettingsTabs.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/api-keys", label: "API keys" },
  { href: "/settings/account", label: "Account" },
] as const;

/** Profile, Security, API keys and Account; scrolls sideways on narrow phones. */
export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {TABS.map((tab) => {
          const current = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className="-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm font-medium text-fg-muted hover:text-fg aria-[current=page]:border-fg aria-[current=page]:font-semibold aria-[current=page]:text-fg focus-ring"
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

Create `app/(app)/settings/layout.tsx`:

```tsx
import type { ReactNode } from "react";

import { PageHeader } from "@/components/app/PageHeader";

import { SettingsTabs } from "./SettingsTabs";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Settings" />
      <SettingsTabs />
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
```

Create `app/(app)/settings/page.tsx`:

```tsx
import type { Metadata } from "next";

import { SettingsSection } from "@/components/app/SettingsSection";
import { ProfileForm } from "@/features/auth/ProfileForm";
import { googlePhotoOf } from "@/features/profile/googlePhoto";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Profile · Settings · QuickQReate" };

export default async function ProfileSettingsPage() {
  const { supabase, user } = await requireUser("/settings");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <SettingsSection
      title="Profile"
      description="Your photo and name show to your team and in invites you send."
    >
      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        initialName={profile?.display_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        googlePhoto={googlePhotoOf(user)}
      />
    </SettingsSection>
  );
}
```

Create `app/(app)/settings/security/page.tsx`:

```tsx
import type { Metadata } from "next";

import { SettingsSection } from "@/components/app/SettingsSection";
import { TotpSettings } from "@/features/auth/TotpSettings";
import { UpdatePasswordForm } from "@/features/auth/UpdatePasswordForm";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Security · Settings · QuickQReate" };

export default async function SecuritySettingsPage() {
  const { user } = await requireUser("/settings/security");
  const usesPassword = user.identities?.some((identity) => identity.provider === "email") ?? false;
  return (
    <>
      <SettingsSection
        title="Password"
        description={
          usesPassword
            ? "Change the password you sign in with."
            : "You sign in with Google. Add a password to also sign in with your email."
        }
      >
        <UpdatePasswordForm />
      </SettingsSection>
      <SettingsSection title="Two-step verification" description="Optional, and free like everything else.">
        <TotpSettings />
      </SettingsSection>
    </>
  );
}
```

Create `app/(app)/settings/api-keys/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";

import { SettingsSection } from "@/components/app/SettingsSection";
import { ApiKeys } from "@/features/developer/ApiKeys";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "API keys · Settings · QuickQReate" };

export default async function ApiKeySettingsPage() {
  const { supabase } = await requireUser("/settings/api-keys");
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, prefix, created_at, last_used_at")
    .order("created_at", { ascending: false });
  return (
    <SettingsSection
      id="api-keys"
      title="API keys"
      description="For developers. Up to 10 keys."
    >
      <div className="flex flex-col gap-4">
        <ApiKeys keys={keys ?? []} />
        <p className="text-sm text-fg-muted">
          See the{" "}
          <Link href="/developers" className="font-medium text-link underline-offset-4 hover:underline">
            API docs
          </Link>{" "}
          for what you can do with a key.
        </p>
      </div>
    </SettingsSection>
  );
}
```

Move the delete action: `git mv app/account/actions.ts "app/(app)/settings/account/actions.ts"`. In `features/auth/DeleteAccountForm.tsx`, change `@/app/account/actions` to `@/app/(app)/settings/account/actions`.

Create `app/(app)/settings/account/page.tsx`:

```tsx
import type { Metadata } from "next";

import { SettingsSection } from "@/components/app/SettingsSection";
import { DeleteAccountForm } from "@/features/auth/DeleteAccountForm";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Account · Settings · QuickQReate" };

export default async function AccountSettingsPage() {
  await requireUser("/settings/account");
  return (
    <SettingsSection
      title="Delete account"
      description="Deletes your codes, scans, pages and photos for good. Printed trackable codes stop working."
      danger
    >
      <DeleteAccountForm />
    </SettingsSection>
  );
}
```

Delete the old routes: `git rm -r app/dashboard app/account/page.tsx`. Keep `app/account/layout.tsx`, because `update-password` still uses it.

- [ ] **Step 5: Point every link at the new addresses, and drop the coffee prompts from app pages.**
  - `app/(auth)/invite/[token]/actions.ts`: change `redirect(`/dashboard?workspace=${ownerId}`)` to `redirect(`/codes?workspace=${ownerId}`)`.
  - `app/(auth)/invite/[token]/page.tsx`: change `href="/dashboard"` to `href="/codes"`.
  - `app/(docs)/developers/page.tsx`: change `<Link href="/account#api-keys">Account → API keys</Link>` to `<Link href="/settings/api-keys">Settings → API keys</Link>`.
  - `features/bulk/BulkGenerator.tsx`: change `` workspace ? `/dashboard?workspace=${workspace.ownerId}` : "/dashboard" `` to `` workspace ? `/codes?workspace=${workspace.ownerId}` : "/codes" ``.
  - `features/dashboard/CodeCard.tsx`: replace every `` `/dashboard/codes/ `` with `` `/codes/ `` (5 places).
  - `features/dashboard/CodeEditor.tsx`: change `` `/dashboard/codes/${code.id}/analytics` `` to `` `/codes/${code.id}/analytics` ``.
  - `features/generator/SavePanel.tsx`: change `` href={`/dashboard/codes/${saved.id}`} `` to `` href={`/codes/${saved.id}`} ``, and the label "Open in My codes" to "Open code page".
  - `features/teams/TeamManager.tsx`: change `` href={`/dashboard?workspace=${workspace.owner_id}`} `` to `` href={`/codes?workspace=${workspace.owner_id}`} ``.
  - `features/analytics/AnalyticsView.tsx`:
    - Change both `` `/dashboard/codes/${code.id}`…`` hrefs to `` `/codes/${code.id}`… ``.
    - Delete `<BuyMeACoffee variant="card" />` and its import.
  - `features/auth/AccountMenu.tsx`: change `href="/dashboard"` (2 places) to `href="/codes"`, `href="/dashboard/team"` to `href="/team"`, and `href="/account"` with label "Account" to `href="/settings"` with label "Settings" (use the `Settings` lucide icon in place of `UserRound`).

Then check that no old link remains: `grep -rn '/dashboard\|"/account"\|/account#' app features components lib proxy.ts | grep -v "next.config\|redirects.ts\|\.test\."` should print nothing.

- [ ] **Step 6: Run the tests and checks, and confirm they pass.**

Run: `npx vitest run features/auth/redirects.test.ts && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`
Expected:
- All PASS.
- The build lists `ƒ /codes`, `ƒ /codes/[id]`, `ƒ /team` and `ƒ /settings…`, and no `/dashboard`.
- The redirect test passes.

- [ ] **Step 7: Commit, push and check the signed-in suite in CI.**

```bash
npx prettier --write "app/(app)" app/account next.config.ts proxy.ts lib/teams/server.ts features e2e
git add -A app next.config.ts proxy.ts lib/teams/server.ts features public/email-templates/confirm.html e2e
git commit -m "Move the app to /codes, /team and /settings

Signed-in pages live in the new shell. Settings has Profile, Security,
API keys and Account tabs; the Team page and code pages moved too.
Old addresses redirect (308, keeping their query), sign-in lands on
/codes, and app pages no longer show the coffee prompt.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push
```

Run `gh run watch` on the new run. Expected: both CI jobs pass. "Signed-in browser tests" passes `the owner sees their saved codes` on `/codes`.

---

### Task 5: Every signed-in page fits every screen

**Files:**
- Create: `e2e/accounts/app.spec.ts`
- Modify: whichever components the new checks show failing. Each fix is its own small commit with the failing check as its RED.

**Interfaces:**
- Consumes: `OWNER`, `VIEWER` and `seed()` (Task 1), and the routes (Task 4).

- [ ] **Step 1: Write the tests.** Create `e2e/accounts/app.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { OWNER, VIEWER, seed } from "./fixtures";

const WIDTHS = [390, 820, 1280];
// {menu} is the seeded "Spring menu" code.
const PAGES = [
  "codes",
  "codes/{menu}",
  "codes/{menu}/analytics",
  "team",
  "settings",
  "settings/security",
  "settings/api-keys",
  "settings/account",
];

const resolve = (path: string) => path.replace("{menu}", seed().menuId);

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("signed in as an owner", () => {
  test.use({ storageState: OWNER.state });

  for (const path of PAGES) {
    for (const width of WIDTHS) {
      test(`/${path} fits ${width}px and passes axe`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(resolve(path));
        await expect(page.locator("main h1").first()).toBeVisible();
        await expectNoSidewaysScroll(page);
        await expectNoAxeViolations(page);
      });
    }
  }

  test("/codes passes axe in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("codes");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expectNoAxeViolations(page);
  });

  test("old addresses land on the new pages", async ({ page }) => {
    await page.goto("dashboard");
    await expect(page).toHaveURL(/\/codes$/);
    await page.goto(`dashboard/codes/${seed().menuId}/analytics`);
    await expect(page).toHaveURL(new RegExp(`/codes/${seed().menuId}/analytics$`));
    await page.goto("account");
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("the sidebar reaches every section on desktop", async ({ page }) => {
    await page.goto("codes");
    const nav = page.getByRole("navigation", { name: "Main" });
    await nav.getByRole("link", { name: "Team" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Team" })).toBeVisible();
    await nav.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await page.getByRole("navigation", { name: "Settings" }).getByRole("link", { name: "Security" }).click();
    await expect(page).toHaveURL(/\/settings\/security$/);
  });

  test("phones get bottom tabs instead of the sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("codes");
    const tabs = page.getByRole("navigation", { name: "Main" });
    for (const name of ["Codes", "Create", "Team"]) {
      await expect(tabs.getByRole("link", { name })).toBeVisible();
    }
    await expect(tabs.getByRole("button", { name: "More" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Sidebar" })).toBeHidden();
  });
});

test.describe("signed in as a viewer", () => {
  test.use({ storageState: VIEWER.state });

  test("sees the owner's codes with no create controls", async ({ page }) => {
    await page.goto(`codes?workspace=${seed().ownerId}`);
    await expect(page.getByText("Spring menu")).toBeVisible();
    await expect(page.getByRole("link", { name: /Create( code)?$/ })).toHaveCount(0);
    await page.goto("codes");
    await expect(page.getByRole("link", { name: "Create code" }).first()).toBeVisible();
  });
});

test.describe("signed out", () => {
  test("signed-out visitors sign in, then come back", async ({ page }) => {
    await page.goto("settings/security");
    await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Fsecurity$/);
    await page.getByLabel("Email", { exact: true }).fill(OWNER.email);
    await page.getByLabel("Password", { exact: true }).fill(OWNER.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/security$/);
  });
});
```

- [ ] **Step 2: Run the new suite in CI and read every failure.** Commit the spec and push:

```bash
git add e2e/accounts/app.spec.ts
git commit -m "Check every signed-in page at phone, tablet and desktop widths

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push
```

Then run `gh run watch` on the new run. Download the report with `gh run download <run id> -n playwright-accounts-report` if it fails, and read each failing test.

Expected: the shell and new pages pass. Any failure on older components (CodeEditor, AnalyticsView, TeamManager, the settings forms) is a real overflow or accessibility bug. That failure is its own RED.

- [ ] **Step 3: Fix each failure at its source, one commit per fix.** For each failing test:
  1. Identify the element named in the axe output, or the element wider than the viewport. `page.evaluate` can find the widest child of `main`.
  2. Fix that component with responsive classes (`min-w-0`, `flex-wrap`, `break-words`, `overflow-x-auto` on tables) or an accessible name or label.
  3. Push, and confirm in CI that the test now passes.

  Ledger each fix as `Task 5: fixed <page> at <width>: <cause> — <change>`. If the same failure also exists in the public suite, keep that suite green too.

- [ ] **Step 4: Confirm the whole suite passes.**

Run: `gh run watch "$(gh run list --branch feat/app-shell --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status`
Expected: both jobs pass. "Signed-in browser tests" passes 30 tests:
- 24 page × width checks
- the dark-mode axe check
- the redirects
- sidebar navigation
- phone tabs
- the viewer test
- the signed-out test

---

### Task 6: Ship Phase 1b

**Files:** none new.

- [ ] **Step 1: Run the full local check.**

Run: `npx prettier --check . --ignore-path .prettierignore --ignore-path .git/info/exclude && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 2: Open the PR.**

```bash
gh pr create --base main --head feat/app-shell --title "App shell, new look and signed-in tests" --body "$(cat <<'EOF'
Phase 1b of the redesign (spec §3.1, §3.2, §4.6, §5, §7; plan docs/superpowers/plans/2026-10-14-phase-1b-app-shell.md).

- Calm & professional tokens (7:1 text, 4.5:1 secondary, 3:1 borders, both themes), Inter only, no lime.
- App shell: sidebar on desktop, icon rail on tablets, top bar + bottom tabs on phones; team switcher, Create (with bulk), Codes, Team, Settings, Help & API docs, Support, account menu.
- New addresses /codes, /codes/<id>, /team, /settings (Profile, Security, API keys, Account); old ones 308-redirect with their query.
- Signed-in browser tests against a local Supabase in CI, checking every signed-in page at 390/820/1280px for sideways scrolling and axe violations.
- No database changes. The Codes list redesign and sidebar folders come next (Phase 1c).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Run the final whole-branch review before merging.** Follow superpowers:executing-plans "Final Review": a fresh reviewer on the most capable model, this plan's Review Focus and the ledger's rulings. Then run one fix pass if needed. Both CI jobs must pass.

- [ ] **Step 4: Merge and check the live site.**
  1. Run `gh pr merge --merge --delete-branch`.
  2. Wait for the Coolify deploy (a new static chunk hash on `/`).
  3. Then check:
     - `curl -s https://qr.techitdave.com/api/health` returns `{"ok":true,"accounts":true}`.
     - `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" https://qr.techitdave.com/dashboard` returns `308 https://qr.techitdave.com/codes`.
     - In David's signed-in Chrome, `/codes` shows the sidebar with his photo and his codes. Team and Settings (all four tabs) load.
     - At 390px wide (Chrome's device toolbar, or `resize_window`), the bottom tabs show and nothing scrolls sideways.

---

## Owner verification (David)

1. Open https://qr.techitdave.com/codes on your phone. You should see bottom tabs: Codes, Create, Team and More. More has Settings, Help and Sign out.
2. On a laptop, the sidebar shows your photo. Switching to a team you're in (if any) keeps you on that team's codes as you move around.
3. An old bookmark to `/dashboard` or `/account` opens the new page.
