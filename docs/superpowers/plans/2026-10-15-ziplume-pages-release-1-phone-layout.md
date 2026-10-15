# Pages Release 1: Phone Layout Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On every phone, the app and the public pages end where their content ends, the bottom menu stays put, and automated tests on iPhone (WebKit) and Android (Chromium) sizes prove it.

**Architecture:** One set of CSS variables in `app/globals.css` describes what's fixed to the bottom of the screen (`--tabbar-h`, `--actionbar-h`) and how much room to leave after content (`--page-end`); the app's `main`, the Create preview bar, toasts, the codes selection bar and the public footer all read those variables instead of their own guessed numbers. A shared Playwright helper scrolls each page to its end and measures content against the fixed bars; new phone projects run it on six device profiles.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Playwright 1.56.1 (Chromium + WebKit), Vitest, local Supabase for the signed-in suite.

**Spec:** `docs/superpowers/specs/2026-10-15-ziplume-pages-redesign-design.md`, sections 4.1–4.3.

## Global Constraints

- Layout from 768px up must look exactly as today; only spacing on phones and small tablets (below 768px) changes.
- Public hosted pages (`/p/…`) and the signed-out site keep pull-to-refresh; only signed-in app pages turn off overscroll.
- No new copy, no new dependencies.
- Every phone check runs on these profiles (Playwright `devices` presets; heights are the browser's visible area):

  | Project | Preset | Engine | Viewport |
  |---|---|---|---|
  | iPhone SE (1st gen) | `iPhone SE` | WebKit | 320 × 568 |
  | iPhone SE | `iPhone SE`, viewport overridden | WebKit | 375 × 667 |
  | iPhone 15 | `iPhone 15` | WebKit | 393 × 659 |
  | iPhone 15 Pro Max | `iPhone 15 Pro Max` | WebKit | 430 × 739 |
  | Pixel 7 | `Pixel 7` | Chromium | 412 × 839 |
  | Galaxy S8 | `Galaxy S8` | Chromium | 360 × 740 |

- "Ends where its content ends" means: after scrolling to the bottom, the last content sits above every bar fixed to the bottom, with at most **32px** of empty space before the first bar (40px from 640px up, where pages already leave 2.5rem, and on signed-out pages, whose footer keeps its own 2rem). A page shorter than the screen doesn't scroll at all.
- The phone tab bar's bottom edge is the screen's bottom edge, and its top edge doesn't move when you scroll to the end.

## Review Focus

1. The iPhone home-indicator safe area (`env(safe-area-inset-bottom)` > 0) can't be emulated in Playwright: the bars and the padding must both include it, or content hides under the bar on real iPhones. Task 2 pins the CSS text with a unit test.
2. Small tablets and landscape phones (640–767px wide): the tab bar is gone, the Create bar sits at the bottom with its own safe-area padding, and the page must still clear it. Task 2 adds a 700 × 390 check.
3. A codes-list selection on a phone: the selection bar must not ride up or down when you reach the end of the list. Task 3.
4. A toast while the Create bar is showing must sit above both bars. Task 3.
5. Pages with nothing to scroll (Team, Settings tabs, paused pages, the short-link status page) must not scroll at all. Tasks 2, 5 and 6.

---

### Task 1: The phone test harness

**Files:**
- Create: `e2e/phones.ts`
- Create: `e2e/phone-fit.ts`
- Create: `e2e/phone-layout.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `playwright.accounts.config.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/superpowers/specs/2026-10-15-ziplume-pages-redesign-design.md` (section 4.3 table)

**Interfaces:**
- Produces:
  - `PHONES: Project[]` from `e2e/phones.ts` (six projects, names as in Global Constraints)
  - `PHONE_SPEC = /phone-layout\.spec\.ts$/`
  - from `e2e/phone-fit.ts`:
    - `expectFitsPhone(page: Page, root?: string, maxGap?: number): Promise<void>` (root defaults to `"#main"`, maxGap to 32)
    - `expectNoScroll(page: Page): Promise<void>`
    - `expectNoSidewaysScroll(page: Page): Promise<void>`
    - `expectEndsWith(page: Page, last: Locator, maxGap: number): Promise<void>`
    - `overscrollY(page: Page): Promise<string>`

- [ ] **Step 1: Write the device list**

`e2e/phones.ts`:

```ts
import { devices, type Project } from "@playwright/test";

/** Only the phone layout suite runs on these. */
export const PHONE_SPEC = /phone-layout\.spec\.ts$/;

/** Phone sizes the layout must hold on: three iPhones and the smallest SE on WebKit (Safari and
 * Chrome on iPhone both use it), two Androids on Chromium. Heights are the visible area. */
export const PHONES: Project[] = [
  { name: "iPhone SE (1st gen)", use: { ...devices["iPhone SE"] } },
  { name: "iPhone SE", use: { ...devices["iPhone SE"], viewport: { width: 375, height: 667 } } },
  { name: "iPhone 15", use: { ...devices["iPhone 15"] } },
  { name: "iPhone 15 Pro Max", use: { ...devices["iPhone 15 Pro Max"] } },
  { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
  { name: "Galaxy S8", use: { ...devices["Galaxy S8"] } },
].map((project) => ({ ...project, testMatch: PHONE_SPEC }));
```

- [ ] **Step 2: Write the measuring helpers**

`e2e/phone-fit.ts`:

```ts
import { expect, type Locator, type Page } from "@playwright/test";

/** Empty space allowed between the end of the content and the first bar fixed to the bottom. */
export const MAX_END_GAP = 32;

interface Fit {
  scrolls: boolean;
  viewport: number;
  tabbarTopBefore: number | null;
  tabbarTopAfter: number | null;
  tabbarBottom: number | null;
  chromeTop: number;
  contentBottom: number;
}

/** Scrolls to the very end, then measures the content against the bars fixed to the bottom. */
function measureEnd(page: Page, root: string): Promise<Fit> {
  return page.evaluate(async (rootSelector) => {
    const settle = () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const shown = (el: Element | null): el is Element =>
      !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const doc = document.documentElement;
    const tabbar = document.querySelector("[data-tabbar]");
    const tabbarTopBefore = shown(tabbar) ? tabbar.getBoundingClientRect().top : null;
    window.scrollTo(0, doc.scrollHeight);
    await settle();
    const bars = [...document.querySelectorAll("[data-tabbar], [data-actionbar]")].filter(shown);
    const chromeTop = Math.min(
      window.innerHeight,
      ...bars.map((bar) => bar.getBoundingClientRect().top),
    );
    let contentBottom = 0;
    for (const el of document.querySelector(rootSelector)!.querySelectorAll("*")) {
      if (!shown(el)) continue;
      if (el.closest("[data-tabbar], [data-actionbar], [data-toasts], [role='dialog']")) continue;
      const style = getComputedStyle(el);
      if (style.position === "fixed" || style.position === "sticky") continue;
      // Count what a person sees: leaves, and boxes with a fill or a bottom edge. Wrappers' own
      // padding is spacing, not content.
      const painted =
        el.childElementCount === 0 ||
        style.backgroundColor !== "rgba(0, 0, 0, 0)" ||
        parseFloat(style.borderBottomWidth) > 0;
      if (!painted) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      contentBottom = Math.max(contentBottom, box.bottom);
    }
    return {
      scrolls: doc.scrollHeight > window.innerHeight + 1,
      viewport: window.innerHeight,
      tabbarTopBefore,
      tabbarTopAfter: shown(tabbar) ? tabbar.getBoundingClientRect().top : null,
      tabbarBottom: shown(tabbar) ? tabbar.getBoundingClientRect().bottom : null,
      chromeTop,
      contentBottom,
    };
  }, root);
}

/** The page ends where its content ends: nothing hidden under the bars, no empty space to scroll
 * into, and the tab bar on the bottom edge before and after scrolling. */
export async function expectFitsPhone(page: Page, root = "#main", maxGap = MAX_END_GAP) {
  const fit = await measureEnd(page, root);
  if (fit.tabbarTopBefore !== null) {
    expect(fit.tabbarBottom, "the tab bar sits on the bottom edge").toBeCloseTo(fit.viewport, 0);
    expect(fit.tabbarTopAfter, "the tab bar stays put").toBeCloseTo(fit.tabbarTopBefore, 0);
  }
  expect(fit.contentBottom, "content ends above the bars").toBeLessThanOrEqual(fit.chromeTop + 0.5);
  if (fit.scrolls) {
    expect(fit.chromeTop - fit.contentBottom, "no empty space to scroll into").toBeLessThanOrEqual(
      maxGap,
    );
  }
}

/** A page shorter than the screen doesn't scroll at all. */
export async function expectNoScroll(page: Page) {
  const extra = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  expect(extra, "the page doesn't scroll").toBeLessThanOrEqual(1);
}

export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "no sideways scroll").toBeLessThanOrEqual(0);
}

/** After scrolling to the end, `last` is fully on screen with at most `maxGap` px below it. */
export async function expectEndsWith(page: Page, last: Locator, maxGap: number) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.evaluate(
    () => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );
  const box = (await last.boundingBox())!;
  const viewport = await page.evaluate(() => window.innerHeight);
  expect(box.y + box.height, "the last item is on screen").toBeLessThanOrEqual(viewport + 0.5);
  expect(viewport - (box.y + box.height), "no empty space after it").toBeLessThanOrEqual(maxGap);
}

export function overscrollY(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY);
}
```

- [ ] **Step 3: Write the first public phone checks (pages already expected to pass)**

`e2e/phone-layout.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { expectFitsPhone, expectNoSidewaysScroll, overscrollY } from "./phone-fit";

// Signed-out pages on phone sizes. The signed-in app and hosted pages are checked in
// e2e/accounts/phone-layout.spec.ts.
for (const path of ["bulk", "privacy"]) {
  test(`/${path} ends where its content ends`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    await expectNoSidewaysScroll(page);
    // The site footer keeps 2rem under its last line.
    await expectFitsPhone(page, "body", 40);
  });
}

test("the public site keeps pull-to-refresh", async ({ page }) => {
  await page.goto("privacy");
  expect(await overscrollY(page)).toBe("auto");
});
```

- [ ] **Step 4: Add the phone projects to both Playwright configs**

`playwright.config.ts`: import the list, keep the phone spec out of the existing projects, add the phones:

```ts
import { defineConfig, devices } from "@playwright/test";

import { PHONE_SPEC, PHONES } from "./e2e/phones";
```

```ts
  projects: [
    {
      name: "desktop",
      testIgnore: PHONE_SPEC,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablet",
      testIgnore: PHONE_SPEC,
      use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    { name: "mobile", testIgnore: PHONE_SPEC, use: { ...devices["Pixel 7"] } },
    ...PHONES,
  ],
```

`playwright.accounts.config.ts` (keep `accounts` first; `global-setup.ts` reads `config.projects[0]`):

```ts
import { defineConfig, devices } from "@playwright/test";

import { PHONE_SPEC, PHONES } from "./e2e/phones";
```

```ts
  projects: [
    {
      name: "accounts",
      testIgnore: PHONE_SPEC,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    ...PHONES,
  ],
```

- [ ] **Step 5: Install WebKit and run the new checks**

Run: `npx playwright install webkit && npm run build && npx playwright test e2e/phone-layout.spec.ts`
Expected: 18 passed (3 tests × 6 phones). If WebKit can't launch on this Mac, record a ruling and rely on CI's Ubuntu run for the WebKit projects; Chromium phones must pass locally.

- [ ] **Step 6: Install WebKit in CI and give the signed-in job room**

`.github/workflows/ci.yml`: both "Install Playwright browser" steps become

```yaml
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium webkit
```

and the `accounts` job's `timeout-minutes: 20` becomes `timeout-minutes: 30`.

- [ ] **Step 7: Match the spec's device table to the presets**

In the spec, section 4.3, replace the table with the six-row table from this plan's Global Constraints, and the line above it with "New Playwright projects run a phone-layout suite on six device profiles (heights are the browser's visible area):". Ruling: the presets' visible-area heights are what a page actually gets, and a 320px iPhone SE covers the smallest phones still in use.

- [ ] **Step 8: Commit**

```bash
git add e2e/phones.ts e2e/phone-fit.ts e2e/phone-layout.spec.ts playwright.config.ts playwright.accounts.config.ts .github/workflows/ci.yml docs/superpowers/specs/2026-10-15-ziplume-pages-redesign-design.md
git commit -m "Phone layout tests: six iPhone and Android profiles, and a helper that measures where pages end"
```

---

### Task 2: The app shell ends where its content ends

**Files:**
- Create: `e2e/accounts/phone-layout.spec.ts`
- Create: `app/phone-layout.test.ts`
- Modify: `app/globals.css` (new variables after the `[data-theme="dark"]` block; base layer)
- Modify: `components/app/AppShell.tsx:149`, `:237-241`, `:244-250`
- Modify: `features/create/CreateMobileBar.tsx:21`
- Modify: `features/create/CreatePage.tsx:88`
- Modify: `features/create/EditCodePage.tsx:37`

**Interfaces:**
- Consumes: `expectFitsPhone`, `expectNoSidewaysScroll`, `overscrollY` (Task 1); `OWNER`, `seed()` from `e2e/accounts/fixtures.ts`.
- Produces:
  - CSS variables `--tabbar-h`, `--actionbar-h`, `--page-end`, `--app-end`
  - DOM hooks `data-app-shell` (shell root), `data-tabbar` (phone tab bar), `data-actionbar="create"` (Create/Edit bar)

- [ ] **Step 1: Write the failing signed-in phone checks**

`e2e/accounts/phone-layout.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

import { expectFitsPhone, expectNoSidewaysScroll, overscrollY } from "../phone-fit";
import { OWNER, seed } from "./fixtures";

// Every signed-in page, on every phone profile in e2e/phones.ts.
const APP_PAGES = [
  "codes",
  "codes?folder={folder}",
  "codes/new",
  "codes/bulk",
  "codes/{menu}",
  "codes/{menu}/edit",
  "codes/{menu}/analytics",
  "team",
  "settings",
  "settings/security",
  "settings/api-keys",
  "settings/account",
];

const resolve = (path: string) =>
  path.replace("{menu}", seed().menuId).replace("{folder}", seed().folderId);

async function settled(page: Page) {
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
}

test.describe("signed in", () => {
  test.use({ storageState: OWNER.state });

  for (const path of APP_PAGES) {
    test(`/${path} ends where its content ends`, async ({ page }) => {
      await page.goto(resolve(path));
      await settled(page);
      // The editors build their form in the browser; measure once the Create bar is up.
      if (path === "codes/new" || path.endsWith("/edit")) {
        await expect(page.locator("[data-actionbar]")).toBeVisible();
      }
      await expectNoSidewaysScroll(page);
      await expectFitsPhone(page);
    });
  }

  test("app pages don't bounce past their end", async ({ page }) => {
    await page.goto("codes");
    await settled(page);
    expect(await overscrollY(page)).toBe("none");
  });

  test("small tablets and landscape phones clear the Create bar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Pixel 7", "one width between 640 and 767px is enough");
    await page.setViewportSize({ width: 700, height: 390 });
    await page.goto("codes/new");
    await settled(page);
    await expectFitsPhone(page, "#main", 40);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:e2e:accounts -- --project="iPhone 15" phone-layout`
Expected: FAIL. `/codes/new` and `/codes/{menu}/edit` report "no empty space to scroll into" (about 82px > 32), pages that scroll report about 55px, and "app pages don't bounce" gets `"auto"`.

- [ ] **Step 3: Write the failing CSS pin (the safe area can't be emulated)**

`app/phone-layout.test.ts`:

```ts
// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("phone layout variables", () => {
  it("count the iPhone home-indicator area into the tab bar's height", () => {
    expect(css).toContain("--tabbar-h: calc(3.5rem + 1px + env(safe-area-inset-bottom))");
  });

  it("count it into the Create bar on small tablets, where the bar sits on the bottom edge", () => {
    expect(css).toContain("--actionbar-h: calc(4.25rem + 1px + env(safe-area-inset-bottom))");
  });

  it("turn off the end-of-page bounce on app pages only", () => {
    expect(css).toMatch(/html:has\(\[data-app-shell\]\)\s*\{\s*overscroll-behavior-y: none;/);
  });
});
```

Run: `npx vitest run app/phone-layout.test.ts`
Expected: FAIL, 3 tests (strings not found).

- [ ] **Step 4: Add the variables**

`app/globals.css`, directly after the closing `}` of the `[data-theme="dark"]` block:

```css
/* ---------------------------------------------------------------------------
 * What's fixed to the bottom of the screen, so pages can end right above it.
 * --tabbar-h: the app's phone tab bar. --actionbar-h: a preview bar (Create/Edit,
 * or the home page's). --page-end: room left after the content. Each bar's height
 * is its content's: tabs are 3.5rem, the Create bar 4.25rem, the home bar 5rem,
 * plus a 1px top border.
 * ------------------------------------------------------------------------- */
:root {
  --tabbar-h: 0px;
  --actionbar-h: 0px;
  --page-end: 1.5rem;
  --app-end: calc(var(--tabbar-h) + var(--actionbar-h) + var(--page-end));
}

@media (width >= 40rem) {
  :root {
    --page-end: 2.5rem;
  }
}

@media (width < 40rem) {
  :root:has([data-tabbar]) {
    --tabbar-h: calc(3.5rem + 1px + env(safe-area-inset-bottom));
  }
  /* Phones: the Create bar sits on the tab bar, which already covers the safe area. */
  :root:has([data-actionbar="create"]) {
    --actionbar-h: calc(4.25rem + 1px);
  }
}

@media (40rem <= width < 48rem) {
  :root:has([data-actionbar="create"]) {
    --actionbar-h: calc(4.25rem + 1px + env(safe-area-inset-bottom));
  }
}
```

In the `@layer base` block, after the `html { … }` rule:

```css
  /* The signed-in app doesn't bounce past its end, so the tab bar never moves. Public pages
   * keep the bounce and pull-to-refresh. */
  html:has([data-app-shell]) {
    overscroll-behavior-y: none;
  }
```

Note: `--app-end` is computed on `:root` from `:root`'s own `--tabbar-h`, `--actionbar-h` and
`--page-end`, and every override above is also on `:root`, so elements inherit the resolved sum.
Any future override must also target `:root`.

- [ ] **Step 5: Use them in the shell**

`components/app/AppShell.tsx`:

Line 149, the root:

```tsx
    <div data-app-shell className="bg-bg text-sm text-fg">
```

Lines 237-241, `main` (the bottom padding now comes from the variables at every width):

```tsx
      <main
        id="main"
        className="px-4 pt-5 pb-(--app-end) sm:ml-16 sm:px-6 lg:ml-64 lg:px-10 lg:pt-8"
      >
```

Lines 244-250, the phone tab bar gets the hook:

```tsx
      <nav
        aria-label="Main"
        data-tabbar
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden",
          "grid-cols-4",
        )}
      >
```

- [ ] **Step 6: Use them in the Create bar and drop the pages' extra padding**

`features/create/CreateMobileBar.tsx:21`:

```tsx
      <div
        data-actionbar="create"
        className="fixed inset-x-0 bottom-(--tabbar-h) z-20 border-t border-border bg-surface/95 shadow-pop backdrop-blur-md sm:pb-[env(safe-area-inset-bottom)] md:hidden"
      >
```

`features/create/CreatePage.tsx:88` and `features/create/EditCodePage.tsx:37`, both:

```tsx
    <div className="flex flex-col gap-6">
```

- [ ] **Step 7: Run the checks to see them pass**

Run: `npx vitest run app/phone-layout.test.ts`
Expected: PASS, 3 tests.

Run: `npm run test:e2e:accounts -- phone-layout`
Expected: PASS on all six phone projects (12 pages + 2 checks each, the landscape check on Pixel 7 only).

- [ ] **Step 8: Run the existing suites that cover these files**

Run: `npx vitest run components/app features/create && npm run test:e2e:accounts -- --no-build --project=accounts app.spec create.spec edit.spec`
Expected: PASS (desktop layout unchanged; the 390px tap-target and no-sideways-scroll checks still pass).

- [ ] **Step 9: Commit**

```bash
git add app/globals.css app/phone-layout.test.ts components/app/AppShell.tsx features/create/CreateMobileBar.tsx features/create/CreatePage.tsx features/create/EditCodePage.tsx e2e/accounts/phone-layout.spec.ts
git commit -m "Phones: app pages end right above the tab bar and Create bar, and don't bounce"
```

---

### Task 3: Toasts and the selection bar follow the bars

**Files:**
- Modify: `components/ui/Toast.tsx:35`
- Modify: `features/codes/list/SelectionBar.tsx:70`
- Modify: `e2e/accounts/phone-layout.spec.ts` (append)

**Interfaces:**
- Consumes: `--tabbar-h`, `--actionbar-h`, `--app-end`, `data-actionbar` (Task 2).
- Produces: DOM hook `data-toasts` on the toast stack.

- [ ] **Step 1: Write the failing checks**

Append inside the `test.describe("signed in", …)` block of `e2e/accounts/phone-layout.spec.ts`:

```ts
  test("toasts appear above the Create bar and the tab bar", async ({ page }) => {
    await page.goto("codes/new");
    await settled(page);
    // The stack is empty and zero-height until a toast shows; its bottom edge is where they
    // stack from.
    const stackBottom = await page.locator("[data-toasts]").evaluate((el) => el.getBoundingClientRect().bottom);
    const barTop = await page
      .locator("[data-actionbar]")
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(stackBottom).toBeLessThanOrEqual(barTop);
  });

  test("the selection bar holds its place at the end of the list", async ({ page }) => {
    // Short enough that the two seeded codes scroll.
    const width = page.viewportSize()!.width;
    await page.setViewportSize({ width, height: 420 });
    await page.goto("codes");
    await settled(page);
    await page.getByRole("checkbox", { name: "Select Spring menu" }).filter({ visible: true }).check();
    const bar = page.getByRole("region", { name: "Selected codes" });
    await expect(bar).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    const stuck = (await bar.boundingBox())!;
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.evaluate(
      () => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
    );
    const atEnd = (await bar.boundingBox())!;
    expect(atEnd.y).toBeCloseTo(stuck.y, 0);
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:e2e:accounts -- --project="iPhone 15" phone-layout -g "toasts|selection bar"`
Expected: FAIL. The toast test can't find `[data-toasts]`; after adding only the hook it would still fail (stack bottom at 112px from the edge, bars reach 126px). The selection bar test reports the bar 16px apart between the two positions.

- [ ] **Step 3: Move the toast stack**

`components/ui/Toast.tsx:32-36`:

```tsx
      <div
        role="status"
        aria-live="polite"
        data-toasts
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+var(--actionbar-h)+0.75rem)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
```

- [ ] **Step 4: Stick the selection bar where the list ends**

`features/codes/list/SelectionBar.tsx:70`:

```tsx
      className="sticky bottom-(--app-end) z-20 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3 shadow-pop"
```

Stuck, its bottom edge is `--app-end` above the screen's edge; at the end of the list, `main`'s
bottom padding (`--app-end`) puts it in the same place, so it no longer jumps.

- [ ] **Step 5: Run the checks to see them pass**

Run: `npm run test:e2e:accounts -- phone-layout`
Expected: PASS on all six phones.

Run: `npx vitest run components/ui features/codes && npm run test:e2e:accounts -- --no-build --project=accounts app.spec bulk.spec`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/ui/Toast.tsx features/codes/list/SelectionBar.tsx e2e/accounts/phone-layout.spec.ts
git commit -m "Phones: toasts and the selection bar sit right above the bottom bars"
```

---

### Task 4: The download card lands below the phone header

**Files:**
- Modify: `features/dashboard/CodeOverview.tsx:339`
- Modify: `e2e/accounts/phone-layout.spec.ts` (append)

**Interfaces:**
- Consumes: `OWNER`, `seed().menuId`.
- Produces: nothing new.

- [ ] **Step 1: Write the failing check**

Append inside `test.describe("signed in", …)`:

```ts
  test("jumping to the download card keeps it clear of the phone header", async ({ page }) => {
    await page.goto(`codes/${seed().menuId}#download`);
    await settled(page);
    await page.evaluate(() => document.getElementById("download")!.scrollIntoView());
    const header = await page
      .locator("[data-app-shell] > header")
      .evaluate((el) => el.getBoundingClientRect().bottom);
    const card = await page.locator("#download").evaluate((el) => el.getBoundingClientRect().top);
    expect(card).toBeGreaterThanOrEqual(header);
  });
```

(`scrollIntoView` honours `scroll-margin-top`, the same as the browser's jump to `#download` after creating a code, without depending on when hydration finishes.)

- [ ] **Step 2: Run it to see it fail**

Run: `npm run test:e2e:accounts -- --project="iPhone 15" phone-layout -g "download card"`
Expected: FAIL, card top 24 < header bottom 56.

- [ ] **Step 3: Clear the header**

`features/dashboard/CodeOverview.tsx:339`:

```tsx
          <Card id="download" className="scroll-mt-20 sm:scroll-mt-6">
```

(56px phone header + 24px gap = 5rem. From 640px up there's no sticky header.)

- [ ] **Step 4: Run it to see it pass**

Run: `npm run test:e2e:accounts -- phone-layout -g "download card"`
Expected: PASS on all six phones. Then `npx vitest run features/dashboard` — PASS.

- [ ] **Step 5: Commit**

```bash
git add features/dashboard/CodeOverview.tsx e2e/accounts/phone-layout.spec.ts
git commit -m "Phones: the download card lands below the header"
```

---

### Task 5: Hosted pages and their notices fit phones

**Files:**
- Modify: `e2e/accounts/fixtures.ts` (append `PAGES`, `PHONE_PAGES`, `PAUSED_PAGE_SLUG`)
- Modify: `e2e/accounts/global-setup.ts` (create the PAGES account and its pages)
- Modify: `e2e/accounts/phone-layout.spec.ts` (append)
- Modify: `app/p/layout.tsx:9-10`
- Modify: `app/p/[slug]/page.tsx:27-35` (`Notice`)

**Interfaces:**
- Consumes: `expectEndsWith`, `expectNoScroll`, `expectNoSidewaysScroll`, `overscrollY` (Task 1).
- Produces: `PAGES` person, `PHONE_PAGES: { type: string; slug: string; content: Record<string, unknown> }[]`, `PAUSED_PAGE_SLUG = "PHONE-PAUSED"` in `e2e/accounts/fixtures.ts`.

- [ ] **Step 1: Add the seeded pages**

Append to `e2e/accounts/fixtures.ts`:

```ts
/** Owns one hosted page of each type for the phone layout checks. Never signs in. */
export const PAGES = {
  email: "pages@example.com",
  password: "pages-e2e-pass-2026",
  name: "Paige Pages",
};

const links = Array.from({ length: 14 }, (_, i) => ({
  label: `Link number ${i + 1}`,
  url: `https://example.com/${i + 1}`,
}));
const dishes = (course: string) =>
  Array.from({ length: 6 }, (_, i) => ({
    name: `${course} ${i + 1}`,
    description: "Made fresh every morning.",
    price: `${8 + i}`,
    tags: "vegetarian",
  }));

/** One page per hosted type, long enough to scroll on a phone where the type allows it. */
export const PHONE_PAGES: { type: string; slug: string; content: Record<string, unknown> }[] = [
  { type: "links", slug: "PHONE-LINKS", content: { title: "Phone links", bio: "Every link on one page.", links, socials: [] } },
  {
    type: "vcard",
    slug: "PHONE-VCARD",
    content: {
      firstName: "Pat",
      lastName: "Phone",
      jobTitle: "Tester",
      company: "Ziplume",
      bio: "Checks pages on phones.",
      phones: [{ label: "Mobile", number: "+1 555 010 2026" }],
      emails: [{ label: "Work", address: "pat@example.com" }],
      website: "https://example.com",
      address: "100 Main Street, Springfield",
      socials: [],
    },
  },
  {
    type: "business",
    slug: "PHONE-BIZ",
    content: {
      name: "Phone Cafe",
      tagline: "Open late",
      about: "Coffee and cake.",
      phone: "+1 555 010 2026",
      email: "cafe@example.com",
      website: "https://example.com",
      address: "100 Main Street, Springfield",
      showHours: true,
      buttons: [{ label: "Order ahead", url: "https://example.com/order" }],
      socials: [],
    },
  },
  {
    type: "menu",
    slug: "PHONE-MENU",
    content: {
      name: "Phone Diner",
      description: "All day breakfast.",
      currency: "$",
      sections: [
        { name: "Starters", items: dishes("Starter") },
        { name: "Mains", items: dishes("Main") },
      ],
      note: "Prices include tax.",
    },
  },
  {
    type: "coupon",
    slug: "PHONE-COUPON",
    content: {
      business: "Phone Cafe",
      offer: "20% OFF",
      headline: "On your next visit",
      description: "Show this at the counter.",
      code: "PHONE20",
      validUntil: "2099-12-31",
      terms: "One per visit.",
      buttonLabel: "Visit us",
      buttonUrl: "https://example.com",
    },
  },
  {
    type: "event",
    slug: "PHONE-EVENT",
    content: {
      title: "Phone party",
      start: "2099-12-05T18:00",
      end: "2099-12-05T21:00",
      timeZone: "America/New_York",
      allDay: false,
      location: "100 Main Street, Springfield",
      description: "A test event.",
      organizer: "Ziplume",
      ticketUrl: "https://example.com/tickets",
      ticketLabel: "Get tickets",
    },
  },
  {
    type: "feedback",
    slug: "PHONE-FEEDBACK",
    content: { business: "Phone Cafe", question: "How was your visit?", allowComment: true, askContact: true, thanks: "Thank you!" },
  },
  { type: "pdf", slug: "PHONE-PDF", content: { title: "Phone brochure", description: "A test PDF page.", direct: false } },
  { type: "images", slug: "PHONE-IMAGES", content: { title: "Phone gallery", description: "No images yet.", images: [] } },
  // No video link, so the page shows its placeholder instead of loading a player.
  { type: "video", slug: "PHONE-VIDEO", content: { title: "Phone video", description: "A test video page.", source: "link", url: "" } },
  { type: "audio", slug: "PHONE-AUDIO", content: { title: "Phone tune", artist: "Ziplume", description: "A test audio page.", link: "https://example.com/listen" } },
  {
    type: "app",
    slug: "PHONE-APP",
    content: {
      name: "Phone app",
      description: "A test app page.",
      iosUrl: "https://apps.apple.com/app/id1",
      androidUrl: "https://play.google.com/store/apps/details?id=com.example",
      webUrl: "https://example.com",
    },
  },
];

/** A paused Link list: visitors get the "paused" notice. */
export const PAUSED_PAGE_SLUG = "PHONE-PAUSED";
```

(Run `npx prettier --write e2e/accounts/fixtures.ts` afterwards; the one-line entries above get wrapped.)

`e2e/accounts/global-setup.ts`:

- import `PAGES`, `PHONE_PAGES`, `PAUSED_PAGE_SLUG` from `./fixtures`;
- add `PAGES` to the list in the "delete old accounts" loop: `for (const person of [OWNER, VIEWER, MAKER, PAT, QUINN, RAY, SKY, PAGES])`;
- the `create` helper's parameter type becomes `{ email: string; password: string; name: string }`;
- after `const skyId = await create(SKY);`:

```ts
  const pagesId = await create(PAGES);
  const { error: pagesError } = await admin.from("qr_codes").insert(
    [
      ...PHONE_PAGES.map((page) => ({
        user_id: pagesId,
        name: page.slug,
        qr_type: page.type,
        is_dynamic: true,
        slug: page.slug,
        content: page.content,
      })),
      {
        user_id: pagesId,
        name: PAUSED_PAGE_SLUG,
        qr_type: "links",
        is_dynamic: true,
        slug: PAUSED_PAGE_SLUG,
        status: "paused",
        content: { title: "Paused page", links: [] },
      },
    ],
    { defaultToNull: false },
  );
  if (pagesError) throw pagesError;
```

`PAGES` is not added to the sign-in loop at the end.

- [ ] **Step 2: Write the failing checks**

Append to `e2e/accounts/phone-layout.spec.ts` (outside the signed-in block: visitors aren't signed in), and add `expectEndsWith`, `expectNoScroll` to the `../phone-fit` import and `PAUSED_PAGE_SLUG`, `PHONE_PAGES` to the `./fixtures` import:

```ts
test.describe("hosted pages", () => {
  for (const { type, slug } of PHONE_PAGES) {
    test(`a ${type} page ends with its footer`, async ({ page }) => {
      await page.goto(`p/${slug}`);
      await expect(page.locator("h1").first()).toBeVisible();
      await expectNoSidewaysScroll(page);
      // The footer has 2rem below it; nothing else may add space after it.
      await expectEndsWith(page, page.getByRole("link", { name: /Made with Ziplume/ }), 40);
    });
  }

  test("a paused page's notice fits on the screen", async ({ page }) => {
    await page.goto(`p/${PAUSED_PAGE_SLUG}`);
    await expect(page.getByRole("heading", { name: "This page is paused" })).toBeVisible();
    await expectNoScroll(page);
  });

  test("hosted pages keep pull-to-refresh", async ({ page }) => {
    await page.goto(`p/${PHONE_PAGES[0]!.slug}`);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await overscrollY(page)).toBe("auto");
  });
});
```

- [ ] **Step 3: Run them to see the notice fail**

Run: `npm run test:e2e:accounts -- --project="iPhone 15" phone-layout -g "hosted pages"`
Expected: the 12 type checks and the pull-to-refresh check PASS (they guard against regressions); "a paused page's notice fits on the screen" FAILS, scrolling about 72px (the notice is a full screen tall, plus the footer).

- [ ] **Step 4: Let the notice fill only the space above the footer**

`app/p/layout.tsx:9-10`:

```tsx
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="flex flex-1 flex-col">{children}</div>
```

`app/p/[slug]/page.tsx`, `Notice`:

```tsx
function Notice({ title, message }: { title: string; message: string }) {
  return (
    <main className="grid flex-1 place-items-center px-4 py-10">
```

(The rest of `Notice` is unchanged. `bg-bg` comes from the layout.)

- [ ] **Step 5: Run the checks to see them pass**

Run: `npm run test:e2e:accounts -- phone-layout -g "hosted pages"`
Expected: PASS on all six phones.

Run: `npx vitest run app/p && npm run test:e2e:accounts -- --no-build --project=accounts old-address.spec pass-through.spec`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e/accounts/fixtures.ts e2e/accounts/global-setup.ts e2e/accounts/phone-layout.spec.ts app/p/layout.tsx "app/p/[slug]/page.tsx"
git commit -m "Phones: every hosted page type ends with its footer, and notices fit the screen"
```

---

### Task 6: The signed-out site fits phones

**Files:**
- Modify: `e2e/phone-layout.spec.ts` (append)
- Modify: `lib/dynamic/status-page.ts:23-26`
- Modify: `app/globals.css` (one more `--actionbar-h` rule)
- Modify: `features/generator/preview/MobilePreviewBar.tsx:41`
- Modify: `components/layout/Footer.tsx:13`
- Modify: `app/page.tsx:9`

**Interfaces:**
- Consumes: `expectFitsPhone`, `expectNoScroll` (Task 1); `--actionbar-h` (Task 2).
- Produces: DOM hook `data-actionbar="generator"`.

- [ ] **Step 1: Write the failing checks**

Append to `e2e/phone-layout.spec.ts` (add `expectNoScroll` to the import):

```ts
test("the home page's footer clears the preview bar", async ({ page }) => {
  await page.goto("");
  await expect(page.locator("main h1").first()).toBeVisible();
  await expectNoSidewaysScroll(page);
  // The site footer keeps 2rem under its last line.
  await expectFitsPhone(page, "body", 40);
});

test("a short link's status page fits on the screen", async ({ page }) => {
  // Without accounts, every short link answers with the "temporarily unavailable" page.
  const response = await page.goto("r/ABC234");
  expect(response?.status()).toBe(503);
  await expect(page.getByRole("heading", { name: "Temporarily unavailable" })).toBeVisible();
  await expectNoScroll(page);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run build && npx playwright test e2e/phone-layout.spec.ts --project="iPhone 15"`
Expected: FAIL. The home page reports "content ends above the bars" (the footer's links sit under the 81px preview bar); the status page scrolls (`min-height: 100vh` plus 32px of padding).

- [ ] **Step 3: Size the status page to the screen**

`lib/dynamic/status-page.ts`, in the `<style>` block, replace the `body { … }` rule (lines 25-26) with:

```css
  *, *::before, *::after { box-sizing:border-box; }
  body { margin:0; min-height:100vh; min-height:100dvh; display:grid; place-items:center; padding:16px; background:var(--bg); color:var(--fg);
         font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif; }
```

- [ ] **Step 4: Make the home page's footer clear its preview bar**

`app/globals.css`, after the `@media (40rem <= width < 48rem)` block from Task 2:

```css
/* The home page's preview bar: a 3.5rem code, 0.75rem above and below, and the safe area. */
@media (width < 48rem) {
  :root:has([data-actionbar="generator"]) {
    --actionbar-h: calc(5rem + 1px + env(safe-area-inset-bottom));
  }
}
```

`features/generator/preview/MobilePreviewBar.tsx:41`:

```tsx
      <div
        data-actionbar="generator"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-pop backdrop-blur-md md:hidden"
      >
```

`components/layout/Footer.tsx:13`:

```tsx
    <footer className="border-t border-border pb-(--actionbar-h)">
```

`app/page.tsx:9` (the footer now makes the room, so `main` keeps the default padding):

```tsx
    <PageShell>
```

- [ ] **Step 5: Run the checks to see them pass**

Run: `npm run build && npx playwright test e2e/phone-layout.spec.ts`
Expected: PASS, all 5 tests on all six phones (30).

Run: `npx vitest run lib/dynamic components features/generator && npx playwright test --project=desktop --project=tablet --project=mobile`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e/phone-layout.spec.ts lib/dynamic/status-page.ts app/globals.css features/generator/preview/MobilePreviewBar.tsx components/layout/Footer.tsx app/page.tsx
git commit -m "Phones: the home page footer clears its preview bar, and short-link notices fit the screen"
```

---

### Task 7: Whole-project check

**Files:** none new.

- [ ] **Step 1: Run every check CI runs**

Run: `npm run lint && npm run format:check && npm run typecheck && npm test`
Expected: all pass.

Run: `npm run build && npm run test:e2e`
Expected: all projects pass (desktop, tablet, mobile and the six phones).

Run: `npm run test:e2e:accounts`
Expected: all projects pass (accounts and the six phones).

- [ ] **Step 2: Commit any formatting fixes**

```bash
git status --short
# only if Prettier or ESLint changed files:
git commit -am "Formatting"
```
