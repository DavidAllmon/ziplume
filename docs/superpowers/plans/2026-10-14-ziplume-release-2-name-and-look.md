# Ziplume Release 2: the New Name and Look Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** QuickQReate becomes **Ziplume**, still served at qr.techitdave.com, with kit C ("X-ray")
applied throughout:
- navy, cyan and violet colors, with a navy sidebar
- the IBM Plex Sans, Archivo and IBM Plex Mono fonts
- the scan-beam logo and the "ZIPLUME" wordmark
- regenerated icons and images, and restyled emails
- every visible name changed

Layout and features stay as they are.

**Architecture:**
- **Colors:** the existing CSS color settings keep their names and get new values. The sidebar
  becomes a scope (`data-surface="sidebar"`) that redefines the same settings, so every
  component inside it turns navy without being touched.
- **Logo:** one shared file (`components/brand/mark.ts`) drives the React logo and the script
  that renders every icon and image.
- **Emails:** they share one layout module. The four sign-in templates are generated from it and
  checked by a test, so they can't drift.
- **Database:** a small migration renames the one database message that shows the name, and
  makes new API keys start with `zl_`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4 (`@theme inline`), next/font/local with
Fontsource packages, Playwright Chromium (brand script), Supabase (plpgsql), Vitest + PGlite,
Playwright.

**Spec:** `docs/superpowers/specs/2026-10-14-ziplume-rebrand-design.md`, section 4 (Release 2).
Read sections 1, 2 and 4.

## Global Constraints

- **Name:** "Ziplume" everywhere a person can see it.
  - Tagline: "Make it. Link it. Share it."
  - Sub-tagline: "QR codes, short links, and simple sharing tools."
  - Wordmark: "ZIPLUME" in wide capitals.
- **Unchanged in this release:**
  - **Addresses:** the site stays at `qr.techitdave.com`, and the GitHub repo name and links stay
    as they are. Release 3 changes both.
  - **Internal names:**
    - storage keys `quickqreate:draft:v2:*` and `quickqreate:codes-view:*`
    - the legacy key `quickqreate:v1`
    - the service-worker cache prefix
    - the unlock cookie, the SVG id `qq-frame-inner`, the iCal UID suffix `@quickqreate`, and
      `quickqreate.invalid`
    - applied migration file names, `supabase/config.toml`'s `project_id`
  - **Sender address:** `no-reply@techitdave.com` stays until Release 3. The sender *name*
    becomes "Ziplume".
- **Colors:** exactly the values in spec 4.1 (this plan's Task 1). Contrast rules:
  - 7:1 for main text, 4.5:1 for secondary and colored text, 3:1 for borders and controls
  - checked in both themes and inside the sidebar
  - scan cyan `#5CE1FF` is never text on a light background
- **Fonts:** self-hosted from npm, Latin subset only, no requests to font servers. Form labels
  stay in IBM Plex Sans, sentence case.
- **Migrations:** no backslashes. Applied live only after a verified backup and before merging,
  then recorded in `~/.codex/memories/supabase-coolify.md`. Use the exact Supabase project UUID
  `db12f7ce-3e77-4461-a686-c8cd6de6f764` with the bridge, and leave the Supabase Multitenant
  resource untouched.
- **Secrets and outside services:** David signs in to Google Cloud and Brevo; Claude never
  types secrets. No email is sent on David's behalf without his OK.
- **Commits** end with:
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
- **Test commands:**
  - unit: `npm test -- <path>`
  - `npm run lint`, `npm run typecheck`, `npm run format:check`
  - public browser: `npm run build && npm run test:e2e`
  - signed-in browser: `npm run test:e2e:accounts`. It builds its own copy and needs the local
    Supabase running with every migration applied: `npx --yes supabase@2.120.0 migration up --local`,
    then `notify pgrst, 'reload schema'`.

## Review Focus

These are the inputs and states most likely to bite, each pinned by a test in the task named:

1. **Menus and dialogs opened from the navy sidebar** (workspace switcher, user menu) render
   outside it and must be readable in both themes. Task 10 adds dark-mode accessibility sweeps
   for `/codes/new` and `/team`.
2. **An email client that blocks images** still shows a readable "Ziplume" in the navy header
   band (Task 7, "keeps the header readable when images are blocked").
3. **Hosted pages saved before this release** keep their indigo color; only new pages start navy
   (Task 8, "keeps a saved page's color").
4. **API keys issued before this release** (`qq_…`) keep working, at the database and in the API
   (Task 9, "old qq_ keys still resolve" and "accepts qq_ and zl_ keys").
5. **Screen readers** read the wordmark as the word "Ziplume", not spelled out, even though it's
   drawn in capitals (Task 3, "is read as Ziplume").

---

## File map

| Area | Files |
| --- | --- |
| Colors | `app/globals.css`, `app/theme.test.ts`, `app/layout.tsx` (viewport), `components/app/AppShell.tsx` (+ test) |
| Fonts | `package.json`, `package-lock.json`, `app/fonts.ts`, `app/globals.css`, `app/layout.tsx`, `features/dashboard/CodeOverview.tsx` |
| Logo | `components/brand/mark.ts`, `components/brand/Logo.tsx`, `components/brand/Logo.test.tsx` (new), `components/app/AppShell.tsx`, `components/layout/Header.tsx`, `features/auth/AuthCard.tsx`, `app/p/layout.tsx` |
| Images | `scripts/build-brand-assets.mjs`, generated `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `app/opengraph-image.png`, `app/twitter-image.png`, `public/icons/*`, `public/brand/*` (plus the new `email-header.png`, `logo-mark-dark.svg`), `app/manifest.ts`, `app/*-image.alt.txt`, `app/brand-assets.test.ts` (new) |
| Download names | `lib/qr/filename.ts`, the bulk, list and analytics download names, `lib/qr/eps.ts`, `lib/qr/renderer.ts`, `lib/pages/files.ts`, `features/generator/style/TemplatesSection.tsx`, window events, `package.json` name, their tests, `e2e/generator.spec.ts`, `e2e/bulk.spec.ts` |
| Name in the app | `app/brand-name.test.ts` (new); `app/layout.tsx`; 20 page titles; `app/page.tsx`; copy in pages and components; `lib/dynamic/status-page.ts`; `pages-redirect/*.html`; tests |
| Emails | `emails/layout.ts` (new), `emails/auth-templates.ts` (+ test, new), `emails/invite.ts` (+ test), `public/email-templates/*.html` (generated), `lib/email/brevo.ts` (+ test), `features/teams/actions.test.ts` |
| Defaults | `features/generator/state/defaults.ts`, `lib/pages/types.ts`, `features/pages/editor/fields.tsx`, `app/(docs)/developers/page.tsx`, `lib/pages/pages.test.ts` |
| Database | `supabase/migrations/20261014190000_ziplume_names.sql` (new), `supabase/test/migration.test.ts`, `lib/api/v1.ts` (+ test) |
| Docs | `README.md`, `docs/accounts-setup.md` |

---

### Task 1: Kit C colors and the navy sidebar

**Files:**
- Modify: `app/globals.css` (the `:root` block, the `[data-theme="dark"]` block, plus new sidebar
  blocks after them)
- Modify: `app/theme.test.ts`
- Modify: `app/layout.tsx` (`viewport.themeColor`)
- Modify: `components/app/AppShell.tsx` (the `<aside aria-label="Sidebar">`), and its test
  `components/app/AppShell.test.tsx`

**How this realizes spec 4.1's new tokens:**
- `sidebar*`: the spec's sidebar colors (`#0A1330` background, `#E6EEFA` and `#A9B6CC` text,
  `#16224A` current item with `#7FE9FF` text, `#232E4D` dividers) become the sidebar scope's
  values for the normal tokens, so components need no sidebar-specific classes.
- `scan`: the cyan Create button is the scope's `--primary`.
- `ion-soft` / `ion-soft-fg` (team badges): not added. No team badge exists yet; Phase 3b adds
  them along with the badge.

**Interfaces:**
- Produces:
  - CSS variables `--logo-corners`, `--logo-bars`, `--logo-beam` and `--logo-glow` in every
    palette (Task 3 uses them)
  - the scope attribute `data-surface="sidebar"`
  - `--logo-ring` is removed

- [ ] **Step 1: Write the failing tests.** In `app/theme.test.ts`, replace the
  `const themes = …` line with:

```ts
const sidebar = tokens('[data-surface="sidebar"]');
const themes = {
  light: tokens(":root"),
  dark: tokens('[data-theme="dark"]'),
  // The navy sidebar redefines the palette inside it, in both themes.
  "light sidebar": sidebar,
  "dark sidebar": { ...sidebar, ...tokens('[data-theme="dark"] [data-surface="sidebar"]') },
};
```

  Then append:

```ts
describe("kit C", () => {
  it("is navy and white in light mode, film-dark in dark mode, with a navy sidebar", () => {
    expect(themes.light.fg).toBe("#0a1330");
    expect(themes.light.primary).toBe("#0a1330");
    expect(themes.dark.bg).toBe("#070b1a");
    expect(themes.dark.primary).toBe("#5ce1ff");
    expect(themes["light sidebar"].surface).toBe("#0a1330");
    expect(themes["dark sidebar"].surface).toBe("#0d1428");
  });

  it("colors the logo in every palette and drops the old logo ring", () => {
    for (const palette of Object.values(themes)) {
      for (const token of ["logo-corners", "logo-bars", "logo-beam", "logo-glow"]) {
        expect(palette[token], token).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
    expect(css).not.toMatch(/--logo-ring/);
  });
});
```

  In `components/app/AppShell.test.tsx`, add this test inside the main `describe`:

```ts
  it("draws the sidebar in the navy sidebar palette", () => {
    renderShell();
    expect(screen.getByRole("complementary", { name: "Sidebar" })).toHaveAttribute(
      "data-surface",
      "sidebar",
    );
  });
```

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- app/theme.test.ts components/app/AppShell.test.tsx`
  Expected: FAIL. The sidebar palettes are empty (undefined tokens), the kit C values differ,
  `--logo-ring` still exists, and the aside has no `data-surface`.

- [ ] **Step 3: Replace the palettes.** In `app/globals.css`, replace the whole `:root { … }`
  block and the whole `[data-theme="dark"] { … }` block with the following. Keep everything
  else in the file.

```css
:root {
  color-scheme: light;
  --bg: #ffffff;
  --surface: #f7f9fc;
  --surface-2: #edf1f7;
  --border: #dce3ed;
  --field-border: #7a8699;
  --fg: #0a1330;
  --fg-muted: #45506a;
  --fg-subtle: #5d6880;
  --primary: #0a1330;
  --primary-hover: #1e2a55;
  --primary-fg: #ffffff;
  --primary-soft: #e0f7ff;
  --primary-soft-fg: #075a73;
  --link: #0b6e8c;
  --ring: #0b6e8c;
  --success: #05603a;
  --success-soft: #dcfae6;
  --warning: #93370d;
  --warning-soft: #fef0c7;
  --danger: #912018;
  --danger-soft: #fee4e2;
  --neutral: #45506a;
  --neutral-soft: #e9eef5;
  --selection: #cdeffa;
  /* The logo: viewfinder corners, the Z's bars and its scan beam (with a soft glow). */
  --logo-corners: #45506a;
  --logo-bars: #0a1330;
  --logo-beam: #0b9cc4;
  --logo-glow: #5ce1ff;
  /* Chart series, validated for color-blind separation against the surface. */
  --chart-1: #5b45e0;
  --shadow-color: 226 66% 11%;
}

[data-theme="dark"] {
  color-scheme: dark;
  --bg: #070b1a;
  --surface: #0d1428;
  --surface-2: #141d36;
  --border: #232e4d;
  --field-border: #66728c;
  --fg: #e6eefa;
  --fg-muted: #a9b6cc;
  --fg-subtle: #8592ab;
  --primary: #5ce1ff;
  --primary-hover: #8aebff;
  --primary-fg: #04101f;
  --primary-soft: #0b2b3a;
  --primary-soft-fg: #9fefff;
  --link: #7fe9ff;
  --ring: #7fe9ff;
  --success: #47cd89;
  --success-soft: #053321;
  --warning: #fdb022;
  --warning-soft: #4e1d09;
  --danger: #f97066;
  --danger-soft: #55160c;
  --neutral: #c3ccdb;
  --neutral-soft: #232e4d;
  --selection: #12406b;
  --logo-corners: #a9b6cc;
  --logo-bars: #e6eefa;
  --logo-beam: #5ce1ff;
  --logo-glow: #5ce1ff;
  --chart-1: #a99bff;
  --shadow-color: 228 60% 2%;
}

/* The navy sidebar: everything inside it reads these instead of the page's palette, so its
   links, switcher, Create button and menus need no colors of their own. */
[data-surface="sidebar"] {
  color-scheme: dark;
  --bg: #0a1330;
  --surface: #0a1330;
  --surface-2: #16224a;
  --border: #232e4d;
  --field-border: #7c8aa8;
  --fg: #e6eefa;
  --fg-muted: #a9b6cc;
  --fg-subtle: #8592ab;
  --primary: #5ce1ff;
  --primary-hover: #8aebff;
  --primary-fg: #04101f;
  --primary-soft: #0b2b3a;
  --primary-soft-fg: #9fefff;
  --link: #7fe9ff;
  --ring: #7fe9ff;
  --success: #47cd89;
  --success-soft: #053321;
  --warning: #fdb022;
  --warning-soft: #4e1d09;
  --danger: #f97066;
  --danger-soft: #55160c;
  --neutral: #c3ccdb;
  --neutral-soft: #232e4d;
  --selection: #12406b;
  --logo-corners: #a9b6cc;
  --logo-bars: #e6eefa;
  --logo-beam: #5ce1ff;
  --logo-glow: #5ce1ff;
}

/* In dark mode the sidebar matches the panels instead of navy. */
[data-theme="dark"] [data-surface="sidebar"] {
  --bg: #0d1428;
  --surface: #0d1428;
  --surface-2: #141d36;
}
```

  The `[data-surface="sidebar"] {` block must come **before** the
  `[data-theme="dark"] [data-surface="sidebar"] {` block. The test reads the first match of each
  selector.

- [ ] **Step 4: Mark the sidebar and set the browser colors.**
  - In `components/app/AppShell.tsx`, add `data-surface="sidebar"` to the
    `<aside aria-label="Sidebar" …>` element. Its existing `bg-surface border-border` classes
    now resolve to navy.
  - In `app/layout.tsx`, set `viewport.themeColor` to `#FFFFFF` (light) and `#070B1A` (dark).

- [ ] **Step 5: Run them and watch them pass.**
  Run: `npm test -- app/theme.test.ts components/app/AppShell.test.tsx && npm run lint`
  Expected:
  - every contrast pair passes in all four palettes
  - the kit C tests pass
  - the AppShell test passes
  - lint exits 0

  If a pair fails, re-check the value against the table above. A value may be nudged only to
  pass and must look the same; log a ruling for it.

- [ ] **Step 6: Commit.**

```bash
git add app/globals.css app/theme.test.ts app/layout.tsx components/app/AppShell.tsx components/app/AppShell.test.tsx
git commit -m "Ziplume colors: navy and scan cyan, film-dark mode, and a navy sidebar

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Fonts: IBM Plex Sans, Archivo (wide), IBM Plex Mono

**Files:**
- Modify: `package.json` and `package-lock.json` (through npm)
- Rewrite: `app/fonts.ts`
- Modify: `app/globals.css` (the font entries in `@theme inline`, plus a new `eyebrow` utility)
- Modify: `app/layout.tsx` (`<html className>`)
- Modify: `app/theme.test.ts` (the "uses Inter only" test)
- Modify: `features/dashboard/CodeOverview.tsx` (the "Short link" label)

**Interfaces:**
- Produces:
  - CSS variables `--font-plex-sans`, `--font-archivo`, `--font-plex-mono`
  - Tailwind fonts `font-sans`, `font-display` (Archivo at width 112) and `font-mono`
  - the utility class `eyebrow`
  - the exports `plexSans`, `archivo`, `plexMono` from `app/fonts.ts`

- [ ] **Step 1: Write the failing test.** In `app/theme.test.ts`, replace the
  `it("uses Inter only", …)` test with:

```ts
  it("uses the Ziplume fonts, self-hosted, and nothing else", () => {
    const fonts = readFileSync(resolve(process.cwd(), "app/fonts.ts"), "utf8");
    const pkg = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    for (const family of ["ibm-plex-sans", "archivo", "ibm-plex-mono"]) {
      expect(fonts).toContain(family);
    }
    expect(fonts).not.toMatch(/fontsource-variable\/inter|grotesk/i);
    expect(pkg).not.toMatch(/@fontsource-variable\/inter/);
    expect(css).not.toMatch(/--font-inter|space-grotesk/i);
    expect(css).toMatch(/--font-display--font-variation-settings:\s*"wdth" 112/);
  });
```

- [ ] **Step 2: Run it and watch it fail.**
  Run: `npm test -- app/theme.test.ts`
  Expected: FAIL. `fonts.ts` has no `ibm-plex-sans`.

- [ ] **Step 3: Swap the font packages.**
  Run:
  `npm uninstall @fontsource-variable/inter && npm install @fontsource-variable/archivo@^5.3.0 @fontsource-variable/ibm-plex-sans@^5.3.0 @fontsource/ibm-plex-mono@^5.3.0`
  Expected: `package.json` lists the three new packages and no longer lists Inter.

- [ ] **Step 4: Load the fonts.** Replace `app/fonts.ts` with:

```ts
import localFont from "next/font/local";

// Self-hosted fonts: no requests to third-party font servers at runtime or build time.

/** Body text, buttons and forms. */
export const plexSans = localFont({
  src: "../node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
  variable: "--font-plex-sans",
  weight: "100 700",
  display: "swap",
});

/** Headings and the wordmark. Its width axis gives Ziplume's wide letters. */
export const archivo = localFont({
  src: "../node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

/** Short links, API keys and code. */
export const plexMono = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});
```

  In `app/layout.tsx`:
  - change `import { inter } from "./fonts";` to
    `import { archivo, plexMono, plexSans } from "./fonts";`
  - change `className={inter.variable}` to
    ``className={`${plexSans.variable} ${archivo.variable} ${plexMono.variable}`}``

- [ ] **Step 5: Wire them into the theme.** In `app/globals.css`, inside `@theme inline`, replace
  the two Inter lines and their comment with:

```css
  /* IBM Plex Sans for text, Archivo (a little wide) for headings, IBM Plex Mono for links and keys. */
  --font-sans: var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-archivo), ui-sans-serif, system-ui, sans-serif;
  --font-display--font-variation-settings: "wdth" 112;
  --font-mono: var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
```

  After the `focus-ring` utility, add:

```css
/* Small wide capitals for labels, in the wordmark's style. */
@utility eyebrow {
  font-family: var(--font-archivo), ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: "wdth" 125;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
```

  In `features/dashboard/CodeOverview.tsx`'s `shortLinkRow`, change
  `<span className="text-fg-muted">Short link</span>` to
  `<span className="eyebrow text-fg-muted">Short link</span>`.

- [ ] **Step 6: Run the test and the build.**
  Run: `npm test -- app/theme.test.ts && npm run typecheck && npm run build`
  Expected: the test passes, typecheck exits 0, and the build succeeds, which shows next/font
  found all four font files.

- [ ] **Step 7: Commit.**

```bash
git add package.json package-lock.json app/fonts.ts app/globals.css app/layout.tsx app/theme.test.ts features/dashboard/CodeOverview.tsx
git commit -m "Ziplume fonts: IBM Plex Sans, wide Archivo headings and IBM Plex Mono

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: The scan-beam mark and the ZIPLUME wordmark

**Files:**
- Rewrite: `components/brand/mark.ts`
- Rewrite: `components/brand/Logo.tsx`
- Create: `components/brand/Logo.test.tsx`
- Modify: `components/app/AppShell.tsx` (the sidebar logo link), `components/layout/Header.tsx`
  (unchanged import, new look), `features/auth/AuthCard.tsx`, `app/p/layout.tsx`

**Interfaces:**
- Consumes: the `--logo-*` CSS variables (Task 1) and `font-display` (Task 2).
- Produces, in `mark.ts`:
  - `MARK`, `TILE_MARK`, `SMALL_MARK` (SVG path data)
  - `BRAND` (colors)
  - `type MarkVariant = "light" | "dark" | "tile" | "small" | "bleed"`
  - `markSvg(variant?: MarkVariant): string`
- Produces, in `Logo.tsx`:
  - `LogoMark({ className?, variant?: "plain" | "tile" | "small", title? })`
  - `Wordmark({ className?, framed? })`
  - `Logo({ className? })`

- [ ] **Step 1: Write the failing tests.** Create `components/brand/Logo.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo, LogoMark, Wordmark } from "./Logo";
import { markSvg } from "./mark";

describe("LogoMark", () => {
  it("follows the theme when plain", () => {
    const { container } = render(<LogoMark />);
    const strokes = [...container.querySelectorAll("path")].map((p) => p.getAttribute("stroke"));
    expect(strokes).toEqual([
      "var(--logo-corners)",
      "var(--logo-bars)",
      "var(--logo-glow)",
      "var(--logo-beam)",
    ]);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("sits on its navy tile as the app icon, and drops the corners when small", () => {
    const tile = render(<LogoMark variant="tile" />).container;
    expect(tile.querySelector("rect")).toHaveAttribute("fill", "#0A1330");
    expect(tile.querySelectorAll("path")).toHaveLength(3);
    const small = render(<LogoMark variant="small" />).container;
    expect(small.querySelectorAll("path")).toHaveLength(2);
  });

  it("can be named for screen readers", () => {
    render(<LogoMark title="Ziplume" />);
    expect(screen.getByRole("img", { name: "Ziplume" })).toBeInTheDocument();
  });
});

describe("Wordmark", () => {
  it("is read as Ziplume, though drawn in capitals", () => {
    render(<Wordmark />);
    expect(screen.getByText("Ziplume")).toHaveClass("uppercase");
  });

  it("adds viewfinder corners only when framed", () => {
    const plain = render(<Wordmark />).container;
    expect(plain.querySelectorAll("[aria-hidden]")).toHaveLength(0);
    const framed = render(<Wordmark framed />).container;
    expect(framed.querySelectorAll("[aria-hidden]")).toHaveLength(4);
  });
});

describe("Logo", () => {
  it("puts the mark beside the text logo", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Ziplume")).toBeInTheDocument();
  });
});

describe("markSvg", () => {
  it("draws each variant for the brand script", () => {
    expect(markSvg("light")).toContain('stroke="#0A1330"');
    expect(markSvg("dark")).toContain('stroke="#E6EEFA"');
    expect(markSvg("tile")).toContain('rx="14" fill="#0A1330"');
    expect(markSvg("small")).not.toContain("M12 22v-6");
    expect(markSvg("bleed")).toContain('<rect width="64" height="64" fill="#0A1330"/>');
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- components/brand/Logo.test.tsx`
  Expected: FAIL. `Wordmark` and the new `markSvg` variants don't exist.

- [ ] **Step 3: The geometry.** Replace `components/brand/mark.ts` with:

```ts
// Shared geometry for the Ziplume mark (64×64 viewBox): viewfinder corners around a "Z" whose
// diagonal is a scan beam. Kept dependency-free so scripts/build-brand-assets.mjs can import it
// with Node's type stripping.

/** Full size: the corners, the Z's two bars, and its diagonal (the beam). */
export const MARK = {
  corners:
    "M8 20V12a4 4 0 0 1 4-4h8M44 8h8a4 4 0 0 1 4 4v8M8 44v8a4 4 0 0 0 4 4h8M56 44v8a4 4 0 0 1-4 4h-8",
  bars: "M21 22H43M21 42H43",
  beam: "M43 22 21 42",
} as const;

/** On the app-icon tile the mark sits a little smaller, inside the tile's padding. */
export const TILE_MARK = {
  corners:
    "M12 22v-6a4 4 0 0 1 4-4h6M42 12h6a4 4 0 0 1 4 4v6M12 42v6a4 4 0 0 0 4 4h6M52 42v6a4 4 0 0 1-4 4h-6",
  bars: "M23 24H41M23 40H41",
  beam: "M41 24 23 40",
} as const;

/** 24 px and under: no corners and thicker strokes, so it stays legible. */
export const SMALL_MARK = { bars: "M18 20H46M18 44H46", beam: "M46 20 18 44" } as const;

export const BRAND = {
  navy: "#0A1330",
  film: "#070B1A",
  scan: "#5CE1FF",
  white: "#FFFFFF",
  light: { corners: "#45506A", bars: "#0A1330", beam: "#0B9CC4", glow: "#5CE1FF" },
  dark: { corners: "#A9B6CC", bars: "#E6EEFA", beam: "#5CE1FF", glow: "#5CE1FF" },
  tile: { corners: "#7C8AA8", bars: "#FFFFFF", beam: "#5CE1FF" },
} as const;

export type MarkVariant = "light" | "dark" | "tile" | "small" | "bleed";

const line = (d: string, color: string, width: number, extra = "") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${extra}/>`;

/** The mark as a standalone SVG: plain on light or dark, on its navy tile, small, or full-bleed. */
export function markSvg(variant: MarkVariant = "light"): string {
  const open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">';
  if (variant === "light" || variant === "dark") {
    const c = BRAND[variant];
    const glow = variant === "light" ? 0.4 : 0.25;
    return `${open}${line(MARK.corners, c.corners, 4)}${line(MARK.bars, c.bars, 5.5)}${line(MARK.beam, c.glow, 12, ` opacity="${glow}"`)}${line(MARK.beam, c.beam, 5.5)}</svg>`;
  }
  if (variant === "small") {
    return `${open}<rect width="64" height="64" rx="14" fill="${BRAND.navy}"/>${line(SMALL_MARK.bars, BRAND.white, 8)}${line(SMALL_MARK.beam, BRAND.scan, 8)}</svg>`;
  }
  const t = BRAND.tile;
  const mark = `${line(TILE_MARK.corners, t.corners, 3.5)}${line(TILE_MARK.bars, t.bars, 5)}${line(TILE_MARK.beam, t.beam, 10, ' opacity="0.25"')}${line(TILE_MARK.beam, t.beam, 5)}`;
  // "bleed" fills the whole square (maskable and Apple icons); the mark stays in the safe zone.
  return variant === "tile"
    ? `${open}<rect width="64" height="64" rx="14" fill="${BRAND.navy}"/>${mark}</svg>`
    : `${open}<rect width="64" height="64" fill="${BRAND.navy}"/><g transform="translate(6.4 6.4) scale(0.8)">${mark}</g></svg>`;
}
```

- [ ] **Step 4: The React logo.** Replace `components/brand/Logo.tsx` with:

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { BRAND, MARK, SMALL_MARK, TILE_MARK } from "./mark";

interface LogoMarkProps {
  className?: string;
  /** "plain" follows the theme (and the navy sidebar); "tile" is the app icon; "small" is for 24 px and under. */
  variant?: "plain" | "tile" | "small";
  /** Names the mark for screen readers; without it the mark is decoration. */
  title?: string;
}

const round = { fill: "none", strokeLinecap: "round" } as const;

/** The scan-beam mark: viewfinder corners around a Z whose diagonal is a beam of light. */
export function LogoMark({ className, variant = "plain", title }: LogoMarkProps) {
  const svg = (children: ReactNode) => (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {children}
    </svg>
  );
  if (variant === "small") {
    return svg(
      <>
        <rect width={64} height={64} rx={14} fill={BRAND.navy} />
        <path d={SMALL_MARK.bars} stroke={BRAND.white} strokeWidth={8} {...round} />
        <path d={SMALL_MARK.beam} stroke={BRAND.scan} strokeWidth={8} {...round} />
      </>,
    );
  }
  if (variant === "tile") {
    return svg(
      <>
        <rect width={64} height={64} rx={14} fill={BRAND.navy} />
        <path d={TILE_MARK.corners} stroke={BRAND.tile.corners} strokeWidth={3.5} {...round} />
        <path d={TILE_MARK.bars} stroke={BRAND.tile.bars} strokeWidth={5} {...round} />
        <path d={TILE_MARK.beam} stroke={BRAND.tile.beam} strokeWidth={5} {...round} />
      </>,
    );
  }
  return svg(
    <>
      <path d={MARK.corners} stroke="var(--logo-corners)" strokeWidth={4} {...round} />
      <path d={MARK.bars} stroke="var(--logo-bars)" strokeWidth={5.5} {...round} />
      <path d={MARK.beam} stroke="var(--logo-glow)" strokeWidth={12} opacity={0.3} {...round} />
      <path d={MARK.beam} stroke="var(--logo-beam)" strokeWidth={5.5} {...round} />
    </>,
  );
}

const corner = "absolute size-[0.36em] border-[var(--logo-beam)]";

/** The text logo: "ZIPLUME" in wide capitals. `framed` adds viewfinder corners for big moments. */
export function Wordmark({ className, framed = false }: { className?: string; framed?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-block font-display leading-none font-bold tracking-[0.14em] text-fg uppercase",
        framed && "py-[0.3em] pr-[0.36em] pl-[0.5em]",
        className,
      )}
      style={{ fontVariationSettings: "'wdth' 125" }}
    >
      Ziplume
      {framed && (
        <>
          <span aria-hidden className={cn(corner, "top-0 left-0 border-t-[0.06em] border-l-[0.06em]")} />
          <span aria-hidden className={cn(corner, "top-0 right-0 border-t-[0.06em] border-r-[0.06em]")} />
          <span aria-hidden className={cn(corner, "bottom-0 left-0 border-b-[0.06em] border-l-[0.06em]")} />
          <span aria-hidden className={cn(corner, "right-0 bottom-0 border-r-[0.06em] border-b-[0.06em]")} />
        </>
      )}
    </span>
  );
}

/** The mark beside the text logo, for the public header. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-8" />
      <Wordmark className="text-[17px]" />
    </span>
  );
}
```

- [ ] **Step 5: Put it in place.**
  - **`components/app/AppShell.tsx`**, sidebar logo link: change the link's `className` to
    `"flex items-center gap-2.5 rounded-control focus-ring"` and its children to:

```tsx
            <LogoMark className="size-8" />
            <Wordmark className={cn("text-[15px]", !expanded && "max-lg:hidden")} />
```

    Import `Wordmark` alongside `LogoMark`. The phone top bar keeps `<LogoMark className="size-7" />`.
  - **`features/auth/AuthCard.tsx`:** replace `<LogoMark className="size-12" />` with
    `<Wordmark framed className="text-[28px]" />`, and import `Wordmark` instead of `LogoMark`.
  - **`app/p/layout.tsx`:** `<LogoMark className="size-5" />` becomes
    `<LogoMark variant="small" className="size-5" />`.
  - **`components/layout/Header.tsx`:** no change. It renders `<Logo />`, which is now the new
    lockup.

- [ ] **Step 6: Run the tests.**
  Run: `npm test -- components features/auth app && npm run typecheck && npm run lint`
  Expected: the new Logo tests and all existing tests pass; typecheck and lint exit 0.

- [ ] **Step 7: Commit.**

```bash
git add components/brand components/app/AppShell.tsx features/auth/AuthCard.tsx app/p/layout.tsx
git commit -m "The Ziplume scan-beam mark and the ZIPLUME wordmark

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Regenerated icons, social images, lockups and the email header

**Files:**
- Rewrite: `scripts/build-brand-assets.mjs`
- Regenerate (by running it): `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`,
  `app/opengraph-image.png`, `app/twitter-image.png`, `public/icons/icon-192.png`,
  `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, and
  `public/brand/{logo-mark.svg, logo-mark-dark.svg, logo-tile.svg, logo-lockup.png, logo-lockup-dark.png, email-header.png}`
- Modify: `app/manifest.ts`, `app/opengraph-image.alt.txt`, `app/twitter-image.alt.txt`
- Create: `app/brand-assets.test.ts`

**Interfaces:**
- Consumes: `markSvg`, `BRAND` (Task 3).
- Produces: `public/brand/email-header.png` (1040×160, navy band with the framed wordmark),
  which Task 7's emails load.

- [ ] **Step 1: Write the failing test.** Create `app/brand-assets.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { markSvg } from "@/components/brand/mark";

import manifest from "./manifest";

const file = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("brand assets", () => {
  it("are drawn from the current mark (run npm run brand after changing it)", () => {
    expect(file("app/icon.svg")).toBe(markSvg("tile"));
    expect(file("public/brand/logo-mark.svg")).toBe(markSvg("light"));
    expect(file("public/brand/logo-mark-dark.svg")).toBe(markSvg("dark"));
  });

  it("name Ziplume in the web app manifest and image descriptions", () => {
    const m = manifest();
    expect(m.name).toBe("Ziplume");
    expect(m.short_name).toBe("Ziplume");
    expect(m.theme_color).toBe("#0A1330");
    expect(m.background_color).toBe("#FFFFFF");
    for (const alt of ["app/opengraph-image.alt.txt", "app/twitter-image.alt.txt"]) {
      expect(file(alt)).toMatch(/^Ziplume: Make it\. Link it\. Share it\./);
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**
  Run: `npm test -- app/brand-assets.test.ts`
  Expected: FAIL. `icon.svg` still holds the old mark, `logo-mark-dark.svg` doesn't exist, and
  the manifest says QuickQReate.

- [ ] **Step 3: The manifest and descriptions.** In `app/manifest.ts`, set:
  - `name: "Ziplume"`, `short_name: "Ziplume"`
  - `description: "QR codes, short links, and simple sharing tools."`
  - `background_color: "#FFFFFF"`, `theme_color: "#0A1330"`

  Write both alt-text files as the single line:

  > Ziplume: Make it. Link it. Share it. QR codes, short links, and simple sharing tools.

- [ ] **Step 4: Rewrite the brand script.** Replace `scripts/build-brand-assets.mjs` with:

```js
// Renders every brand asset (favicons, app icons, social images, logo lockups and the email
// header) from the shared mark in components/brand/mark.ts. Run with: npm run brand
// BRAND_SITE_URL sets the address the social image's QR code opens (default: the live site).
//
// Uses Playwright's Chromium so text renders with the app's own fonts.
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { BRAND, markSvg } from "../components/brand/mark.ts";

const root = resolve(import.meta.dirname, "..");
const out = (path) => resolve(root, path);
const SITE = process.env.BRAND_SITE_URL ?? "https://qr.techitdave.com";

async function fontFace(family, file, weight, extra = "") {
  const data = await readFile(out(`node_modules/${file}`));
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2");font-weight:${weight};${extra}}`;
}

const fonts = [
  await fontFace(
    "Archivo",
    "@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2",
    "100 900",
    "font-stretch:62% 125%;",
  ),
  await fontFace(
    "IBM Plex Sans",
    "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
    "100 700",
  ),
].join("");

/** "ZIPLUME" in wide capitals; corners in `frame` color when given. */
const wordmark = (size, color, frame) =>
  `<span class="wm${frame ? " framed" : ""}" style="font-size:${size}px;color:${color};${frame ? `--frame:${frame}` : ""}">${frame ? "<i></i><i></i><i></i><i></i>" : ""}ZIPLUME</span>`;

const WORDMARK_CSS = `.wm{position:relative;display:inline-block;font-family:Archivo;font-weight:700;font-variation-settings:"wdth" 125;letter-spacing:.14em;line-height:1}
.wm.framed{padding:.3em .36em .3em .5em}
.wm i{position:absolute;width:.36em;height:.36em;border:0 solid var(--frame)}
.wm i:nth-child(1){left:0;top:0;border-top-width:.06em;border-left-width:.06em}
.wm i:nth-child(2){right:0;top:0;border-top-width:.06em;border-right-width:.06em}
.wm i:nth-child(3){left:0;bottom:0;border-bottom-width:.06em;border-left-width:.06em}
.wm i:nth-child(4){right:0;bottom:0;border-bottom-width:.06em;border-right-width:.06em}`;

const page = (body, css = "") => `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
*{box-sizing:border-box;margin:0}
html,body{background:transparent}
${WORDMARK_CSS}
${css}
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 1 });

async function render(html, { width, height, path, transparent = true, beforeShot }) {
  const tab = await context.newPage();
  await tab.setViewportSize({ width, height });
  await tab.setContent(html, { waitUntil: "load" });
  if (beforeShot) await beforeShot(tab);
  await tab.evaluate(() => document.fonts.ready);
  const buffer = await tab.screenshot({
    omitBackground: transparent,
    clip: { x: 0, y: 0, width, height },
  });
  await tab.close();
  if (path) {
    await mkdir(dirname(out(path)), { recursive: true });
    await writeFile(out(path), buffer);
    console.log(`  ${path}`);
  }
  return buffer;
}

const sized = (svg, size) => svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
const svgPage = (svg, size) => page(`<div style="width:${size}px;height:${size}px">${sized(svg, size)}</div>`);

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

// Vector files
await mkdir(out("public/brand"), { recursive: true });
await writeFile(out("app/icon.svg"), markSvg("tile"));
await writeFile(out("public/brand/logo-mark.svg"), markSvg("light"));
await writeFile(out("public/brand/logo-mark-dark.svg"), markSvg("dark"));
await writeFile(out("public/brand/logo-tile.svg"), markSvg("tile"));
console.log("  app/icon.svg, public/brand/logo-mark{,-dark}.svg, public/brand/logo-tile.svg");

// Favicon: the small mark at 16 px, the tile at 32 and 48.
const icoImages = [];
for (const size of [16, 32, 48]) {
  const svg = markSvg(size <= 24 ? "small" : "tile");
  icoImages.push({ size, data: await render(svgPage(svg, size), { width: size, height: size }) });
}
await writeFile(out("app/favicon.ico"), buildIco(icoImages));
console.log("  app/favicon.ico");

await render(svgPage(markSvg("bleed"), 180), { width: 180, height: 180, path: "app/apple-icon.png", transparent: false });
await render(svgPage(markSvg("tile"), 192), { width: 192, height: 192, path: "public/icons/icon-192.png" });
await render(svgPage(markSvg("tile"), 512), { width: 512, height: 512, path: "public/icons/icon-512.png" });
await render(svgPage(markSvg("bleed"), 512), {
  width: 512,
  height: 512,
  path: "public/icons/icon-maskable-512.png",
  transparent: false,
});

// README and press lockups (mark plus wordmark), light and dark.
const lockup = (dark) =>
  page(
    `<div class="lockup">${sized(markSvg(dark ? "dark" : "light"), 80)}${wordmark(52, dark ? "#E6EEFA" : BRAND.navy)}</div>`,
    `.lockup{display:flex;align-items:center;gap:22px;padding:20px 12px}`,
  );
await render(lockup(false), { width: 640, height: 120, path: "public/brand/logo-lockup.png" });
await render(lockup(true), { width: 640, height: 120, path: "public/brand/logo-lockup-dark.png" });

// Email header: a navy band with the mark and the framed wordmark (shown at 520×80).
await render(
  page(
    `<div class="band">${sized(markSvg("dark"), 72)}${wordmark(44, "#FFFFFF", BRAND.scan)}</div>`,
    `.band{display:flex;align-items:center;gap:24px;width:1040px;height:160px;padding:0 56px;background:${BRAND.navy}}`,
  ),
  { width: 1040, height: 160, path: "public/brand/email-header.png", transparent: false },
);

// Social preview image (1200×630): film background, framed wordmark, tagline and a live QR.
const og = page(
  `<main>
    <section class="copy">
      ${wordmark(40, "#E6EEFA", BRAND.scan)}
      <h1>Make it. Link it.<br/><em>Share it.</em></h1>
      <p>QR codes, short links, and simple sharing tools.</p>
    </section>
    <section class="card"><div id="qr"></div></section>
    <div class="beam"></div>
  </main>`,
  `body{width:1200px;height:630px;background:${BRAND.film};font-family:"IBM Plex Sans";color:#E6EEFA;overflow:hidden}
   main{position:relative;display:flex;align-items:center;justify-content:space-between;height:100%;padding:0 88px;
     background-image:repeating-linear-gradient(0deg,rgba(92,225,255,.06) 0 1px,transparent 1px 48px),repeating-linear-gradient(90deg,rgba(92,225,255,.06) 0 1px,transparent 1px 48px)}
   h1{margin-top:44px;font:600 68px/1.08 Archivo;font-variation-settings:"wdth" 112;letter-spacing:-.01em}
   h1 em{font-style:normal;color:${BRAND.scan}}
   p{margin-top:22px;font-size:28px;line-height:1.4;color:#A9B6CC}
   .card{position:relative;z-index:1;padding:26px;border-radius:24px;background:#fff;box-shadow:0 30px 80px -20px rgba(0,0,0,.6)}
   #qr canvas{display:block;width:320px;height:320px}
   .beam{position:absolute;left:0;right:0;top:330px;height:2px;background:${BRAND.scan};opacity:.55;box-shadow:0 0 18px 2px rgba(92,225,255,.45)}`,
);
const ogImage = await render(og, {
  width: 1200,
  height: 630,
  path: "app/opengraph-image.png",
  transparent: false,
  beforeShot: async (tab) => {
    await tab.addScriptTag({ path: out("node_modules/qr-code-styling/lib/qr-code-styling.js") });
    await tab.evaluate(async (data) => {
      const qr = new window.QRCodeStyling({
        width: 320,
        height: 320,
        type: "canvas",
        margin: 0,
        data,
        qrOptions: { errorCorrectionLevel: "M" },
        dotsOptions: { type: "rounded", color: "#0A1330" },
        cornersSquareOptions: { type: "extra-rounded", color: "#0B6E8C" },
        cornersDotOptions: { type: "dot", color: "#0B6E8C" },
        backgroundOptions: { color: "#FFFFFF" },
      });
      qr.append(document.getElementById("qr"));
      await new Promise((r) => setTimeout(r, 300));
    }, SITE);
  },
});
await writeFile(out("app/twitter-image.png"), ogImage);
console.log("  app/twitter-image.png");

await browser.close();
console.log("Done.");
```

- [ ] **Step 5: Render everything and look at it.**
  - Run: `npm run brand`
    Expected: it prints every file above and "Done.".
  - Run: `git status --short app public`
    Expected: the regenerated files are modified, and `public/brand/email-header.png` and
    `public/brand/logo-mark-dark.svg` are new.
  - Open these with the Read tool and check them by eye:
    - `app/opengraph-image.png`: the wordmark, tagline and QR are readable, and nothing is
      clipped
    - `public/brand/email-header.png`
    - `public/brand/logo-lockup.png`: if the wordmark is clipped, widen the 640 px canvas and
      log a ruling
    - `public/icons/icon-512.png`

- [ ] **Step 6: Run the tests.**
  Run: `npm test -- app/brand-assets.test.ts && npm run lint && npm run format:check`
  Expected: PASS; lint and format exit 0.

- [ ] **Step 7: Commit.**

```bash
git add scripts/build-brand-assets.mjs app/icon.svg app/favicon.ico app/apple-icon.png app/opengraph-image.png app/twitter-image.png app/*.alt.txt app/manifest.ts app/brand-assets.test.ts public/icons public/brand
git commit -m "Regenerate icons, social images, lockups and an email header in the Ziplume look

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Download names, file metadata and in-page event names

**Files:**
- Modify:
  - `lib/qr/filename.ts:16`
  - `features/bulk/BulkCreatePage.tsx:148`, `features/bulk/BulkGenerator.tsx:45`,
    `features/bulk/BulkListCard.tsx:38`
  - `features/codes/list/SelectionBar.tsx:57`
  - `app/(app)/codes/[id]/analytics/export/route.ts:128`
  - `lib/qr/eps.ts:517` and its comment at `:17`, `lib/qr/renderer.ts:311`
  - `lib/pages/files.ts:86`
  - `features/generator/style/TemplatesSection.tsx:21`
  - `features/codes/list/events.ts:2`, `features/codes/list/useListView.ts:7` (the event only),
    `features/profile/useProfile.ts:12`
  - `package.json` (`name`) and `package-lock.json`
- Tests:
  - `lib/qr/filename.test.ts`, `features/bulk/BulkCreatePage.test.tsx:244`,
    `features/bulk/BulkGenerator.test.tsx:47`, `features/profile/ProfilePhoto.test.tsx:55`
  - `e2e/generator.spec.ts:24,184,216`, `e2e/bulk.spec.ts:23`
  - plus any test that `npm test` shows asserting one of the old strings

**Interfaces:**
- Produces: download names starting `ziplume-`; window events `ziplume:codes-changed`,
  `ziplume:codes-view`, `ziplume:profile`.

| Old | New |
| --- | --- |
| `` `quickqreate-${type}${…}` `` (filename.ts) | `` `ziplume-${type}${…}` `` |
| `` `quickqreate-${type}-codes.zip` `` (×2) | `` `ziplume-${type}-codes.zip` `` |
| `` `quickqreate-${type}-template.csv` `` | `` `ziplume-${type}-template.csv` `` |
| `` `quickqreate-codes-${…}.zip` `` | `` `ziplume-codes-${…}.zip` `` |
| `` `quickqreate-scans-${…}.csv` `` | `` `ziplume-scans-${…}.csv` `` |
| `"%%Creator: QuickQReate"` | `"%%Creator: Ziplume"` |
| `creator: "QuickQReate"` (PDF) | `creator: "Ziplume"` |
| `"PRODID:-//QuickQReate//Event//EN"` | `"PRODID:-//Ziplume//Event//EN"` |
| `SAMPLE = "QuickQReate"` | `SAMPLE = "Ziplume"` |
| `"quickqreate:codes-changed"` | `"ziplume:codes-changed"` |
| `EVENT = "quickqreate:codes-view"` | `EVENT = "ziplume:codes-view"` (`keyFor` stays `quickqreate:codes-view:` until Release 3) |
| `EVENT = "quickqreate:profile"` | `EVENT = "ziplume:profile"` |
| `"name": "quickqreate"` (package.json) | `"name": "ziplume"` |

The iCal `UID:${uid}@quickqreate` stays, so calendars don't duplicate events.

- [ ] **Step 1: Update the tests first.** In each test file listed, change the expected old
  string to its new value from the table:
  - `filename.test.ts` expects `ziplume-wifi-homenet.png` and `ziplume-text.svg`
  - the bulk tests expect `ziplume-url-codes.zip`
  - `ProfilePhoto.test.tsx` listens for `"ziplume:profile"`
  - `e2e/generator.spec.ts` expects `ziplume-url-example-com.png` and
    `` `ziplume-url-example-com.${ext}` ``
  - `e2e/bulk.spec.ts` expects `ziplume-url-codes.zip`

  Then run `git grep -n -i "quickqreate" -- '*.test.*'`. Any remaining hit for a download name,
  creator, PRODID or event name gets the same treatment.

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- lib/qr features/bulk features/profile`
  Expected: FAIL, with the new names expected and the old ones received.

- [ ] **Step 3: Rename.** Make every change in the table. For `package.json`, run
  `npm pkg set name=ziplume && npm install --package-lock-only`.

- [ ] **Step 4: Run them and watch them pass.**
  Run: `npm test && npm run typecheck && npm run lint`
  Expected: the whole unit suite passes; typecheck and lint exit 0.

- [ ] **Step 5: Commit.**

```bash
git add -A lib features "app/(app)/codes/[id]/analytics/export/route.ts" package.json package-lock.json e2e/generator.spec.ts e2e/bulk.spec.ts
git commit -m "Ziplume download names, file metadata and in-page events

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: The name everywhere in the app, and a guard so it can't come back

**Files:**
- Create: `app/brand-name.test.ts`
- Modify:
  - `app/layout.tsx` (metadata)
  - the 20 page files whose metadata title ends `· QuickQReate`
  - `app/p/[slug]/page.tsx`
  - `app/page.tsx` (headline)
  - copy in:
    - pages: `app/(app)/codes/[id]/analytics/page.tsx:35`, `app/(auth)/invite/[token]/page.tsx:87`,
      `app/(auth)/login/page.tsx:21`, `app/(docs)/developers/page.tsx:8,10,78,83`,
      `app/(docs)/privacy/page.tsx`, `app/(docs)/terms/page.tsx`, `app/p/layout.tsx:17`
    - components: `components/app/AppShell.tsx:135,175,225`, `components/layout/Header.tsx:13`,
      `components/support/BuyMeACoffee.tsx:11,45`, `features/auth/MfaChallengeForm.tsx:52`,
      `features/developer/ApiKeys.tsx:81`
  - `lib/dynamic/status-page.ts` (title and colors)
  - `pages-redirect/index.html` and `pages-redirect/404.html` (title, copy and colors)
  - code comments naming the product: `app/auth/confirm/route.ts:18`, `lib/qr/eps.ts:17`,
    `lib/qr/types.ts:16`, `lib/env.ts:2`, `features/generator/content/HostedPageForm.tsx:22`
- Tests: `components/app/AppShell.test.tsx:77,148`, `e2e/accounts/app.spec.ts:162`

**Interfaces:**
- Produces: the root metadata title template `"%s · Ziplume"`; page titles without a suffix.

- [ ] **Step 1: Write the guard test.** Create `app/brand-name.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
/** Everything people can see comes from these folders. */
const FOLDERS = ["app", "components", "features", "lib", "pages-redirect"];
const TEXT = new Set([".ts", ".tsx", ".html", ".css", ".txt", ".mjs"]);
const OLD_NAME = /quick\s?q\s?r?eate/i;
/** Internal names that keep the old spelling on purpose (spec 4.7 and 5.7). */
const ALLOWED = [
  /quickqreate\.invalid/, // sentinel base URL for parsing redirect paths
  /UID:\$\{uid\}@quickqreate/, // calendar event ids: changing them duplicates events
  /quickqreate:draft:v2:/, // storage key, renamed with the move to ziplume.com
  /quickqreate:codes-view:\$\{userId\}/, // storage key, renamed with the move to ziplume.com
  /quickqreate:v1/, // legacy key the generator only deletes
  /\^\\\/QuickQReate\//, // the old GitHub Pages path the redirect page strips
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return TEXT.has(extname(name)) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("the old name", () => {
  it("appears nowhere people can see it", () => {
    const leftovers = FOLDERS.flatMap((folder) => files(resolve(ROOT, folder))).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .map((line, i) => ({ line, at: `${relative(ROOT, path)}:${i + 1}` }))
        .filter(({ line }) => OLD_NAME.test(line) && !ALLOWED.some((ok) => ok.test(line)))
        .map(({ at, line }) => `${at}  ${line.trim()}`),
    );
    expect(leftovers).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**
  Run: `npm test -- app/brand-name.test.ts`
  Expected: FAIL, listing every remaining occurrence. It's the work list for this task. The
  emails are left out of `FOLDERS` until Task 7 restyles them, and Task 7 adds `emails` and
  `public/email-templates`.

- [ ] **Step 3: Titles and metadata.** In `app/layout.tsx`:
  - replace the `title` constant and the metadata name fields as follows:

```ts
const title = "Ziplume: Make it. Link it. Share it.";
const description = "QR codes, short links, and simple sharing tools.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s · Ziplume" },
  description,
  applicationName: "Ziplume",
```

  - keep the rest of the metadata, but set `openGraph.siteName: "Ziplume"`,
    `appleWebApp.title: "Ziplume"`, and `openGraph.title: title` / `twitter.title: title`
  - in each of the 20 page files, delete the ` · QuickQReate` suffix from the title string, for
    example `"Codes · QuickQReate"` becomes `"Codes"`. Command:
    ``git grep -l ' · QuickQReate' -- app | xargs sed -i '' 's/ · QuickQReate"/"/'``
    then check `git grep -n 'QuickQReate' -- app` for the rest
  - in `app/p/[slug]/page.tsx`, the fallback title becomes `"Ziplume"` and
    `siteName: "Ziplume"`

- [ ] **Step 4: Copy.** Make these replacements, keeping the surrounding sentence:
  - **Home page** (`app/page.tsx`):
    - the h1 text becomes `Make it. Link it. Share it.`
    - the first paragraph becomes `QR codes, short links, and simple sharing tools. Free forever,
      with no sign-up needed. Create a free account for editable codes and scan analytics.`
  - **Plain renames** from "QuickQReate" to "Ziplume" in every line listed under **Files**,
    including:
    - "Sign in to Ziplume"
    - "invited you to their Ziplume codes"
    - "enter the code for Ziplume."
    - "Ziplume API"
    - "Ziplume is free, with no limits."
    - "Made with Ziplume · free QR codes"
    - "Support Ziplume"
    - `aria-label="Ziplume codes"` (both), `aria-label="Ziplume home"`
    - the privacy, terms and developers sentences
    - "scans never pass through Ziplume"
  - **Comments** in the listed code files say Ziplume.

- [ ] **Step 5: The short-link status page.** In `lib/dynamic/status-page.ts`:
  - **Title:** `${escape(title)} · QuickQReate` becomes `${escape(title)} · Ziplume`.
  - **Light palette:** the `:root` variables become
    `--bg:#f4f7fb; --card:#fff; --fg:#0a1330; --muted:#45506a; --link:#0b6e8c; --line:#dce3ed;`
  - **Dark palette:** the dark `:root` becomes
    `--bg:#070b1a; --card:#0d1428; --fg:#e6eefa; --muted:#a9b6cc; --link:#7fe9ff; --line:#232e4d;`
  - **Button:** becomes `background:#0a1330; color:#fff;`. Add
    `@media (prefers-color-scheme: dark) { button { background:#5ce1ff; color:#04101f; } }`
  - **`.error` colors:** `#912018` light and `#f97066` dark.

- [ ] **Step 6: The GitHub Pages redirect page.** In both `pages-redirect/index.html` and
  `pages-redirect/404.html`:
  - The title becomes `Ziplume has moved`, and the body sentence becomes
    `Ziplume has moved to <a …>__TARGET_LABEL__</a>.`
  - Light colors: `background: #f4f7fb; color: #0a1330;` and links `#0b6e8c`.
  - Dark colors: `#070b1a`, `#e6eefa`, and links `#7fe9ff`.
  - Leave the `/^\/QuickQReate/` path regex alone.

- [ ] **Step 7: Update the tests that check the name.**
  - `components/app/AppShell.test.tsx`: "Support QuickQReate" becomes "Support Ziplume" in both
    places.
  - `e2e/accounts/app.spec.ts:162`: the link name becomes `"Ziplume codes"`.

- [ ] **Step 8: Run everything.**
  Run: `npm test && npm run typecheck && npm run lint && npm run format:check`
  Expected:
  - the guard test passes (emails still excluded)
  - the whole unit suite passes
  - typecheck, lint and format exit 0

- [ ] **Step 9: Commit.**

```bash
git add -A app components features lib pages-redirect e2e/accounts/app.spec.ts
git commit -m "Ziplume everywhere in the app: titles, copy, status page, and a guard against the old name

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Emails in the Ziplume look

**Files:**
- Create: `emails/layout.ts`, `emails/auth-templates.ts`, `emails/auth-templates.test.ts`
- Modify: `emails/invite.ts`, `emails/invite.test.ts`
- Regenerate: `public/email-templates/{confirm,recovery,email-change,magic-link}.html`
- Modify: `lib/email/brevo.ts:40`, `lib/email/brevo.test.ts:21,33`, `features/teams/actions.test.ts:152`
- Modify: `app/brand-name.test.ts` (add `emails` and `public/email-templates` back to `FOLDERS`)

**Interfaces:**
- Consumes: `public/brand/email-header.png` (Task 4).
- Produces:
  - `emailLayout(input: EmailLayoutInput): string`
  - `AUTH_TEMPLATES: Record<AuthTemplate, string>`
  - `type AuthTemplate = "confirm" | "recovery" | "email-change" | "magic-link"`

- [ ] **Step 1: Write the failing tests.** Create `emails/auth-templates.test.ts`:

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { AUTH_TEMPLATES, type AuthTemplate } from "./auth-templates";

const fileFor = (name: AuthTemplate) => resolve(process.cwd(), `public/email-templates/${name}.html`);
// The sign-in server fetches these files; regenerate them with
// UPDATE_EMAIL_TEMPLATES=1 npm test -- emails/auth-templates.test.ts
const update = process.env.UPDATE_EMAIL_TEMPLATES === "1";

describe.each(Object.keys(AUTH_TEMPLATES) as AuthTemplate[])("%s email", (name) => {
  const html = AUTH_TEMPLATES[name];

  it("matches the file the sign-in server sends", () => {
    if (update) writeFileSync(fileFor(name), html);
    expect(readFileSync(fileFor(name), "utf8")).toBe(html);
  });

  it("links back with a one-time token", () => {
    expect(html).toContain("{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}");
  });

  it("is branded Ziplume, in navy", () => {
    expect(html).toContain('src="{{ .SiteURL }}/brand/email-header.png"');
    expect(html).toContain("background:#0a1330");
    expect(html).toMatch(/Ziplume · Make it\. Link it\. Share it\./);
    expect(html).not.toMatch(/quickqreate/i);
  });

  it("keeps the header readable when images are blocked", () => {
    expect(html).toMatch(/<img [^>]*alt="Ziplume"[^>]*style="[^"]*color:#ffffff/);
  });
});

describe("each email's own link", () => {
  it("confirms, resets, changes the address or signs in", () => {
    expect(AUTH_TEMPLATES.confirm).toContain("type=email&amp;next=/codes");
    expect(AUTH_TEMPLATES.recovery).toContain("type=recovery&amp;next=/account/update-password");
    expect(AUTH_TEMPLATES["email-change"]).toContain("type=email_change&amp;next=/settings");
    expect(AUTH_TEMPLATES["magic-link"]).toContain("type=magiclink&amp;next=/codes");
  });
});
```

  In `emails/invite.test.ts`, change the three expected subjects to
  `"… invited you to their Ziplume codes"`, and add:

```ts
  it("uses the Ziplume layout, with its header from the site the invite links to", () => {
    const { html, text } = inviteEmail(base);
    expect(html).toContain(`src="${new URL(base.acceptUrl).origin}/brand/email-header.png"`);
    expect(html).toContain("background:#0a1330");
    expect(text).toContain("Ziplume · Make it. Link it. Share it.");
    expect(html + text).not.toMatch(/quickqreate/i);
  });
```

  In `lib/email/brevo.test.ts`:
  - rename the test to "posts the message from the Ziplume sender"
  - expect `sender: { name: "Ziplume", email: "no-reply@techitdave.com" }`

  In `features/teams/actions.test.ts:152`, expect the subject
  `"David invited you to their Ziplume codes"`.

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- emails lib/email features/teams/actions.test.ts`
  Expected: FAIL, because `./auth-templates` doesn't resolve and the subjects and sender still
  say QuickQReate.

- [ ] **Step 3: The shared layout.** Create `emails/layout.ts`:

```ts
export interface EmailLayoutInput {
  /** The <title>; also used as the heading unless `heading` is given. */
  title: string;
  /** Trusted HTML for the heading (callers escape anything a person typed). */
  heading?: string;
  /** Trusted HTML paragraphs under the heading. */
  body: string;
  button: { label: string; href: string };
  /** Shown under "If the button doesn't work…"; defaults to the button's link. */
  fallbackLink?: string;
  /** The small print under the button. */
  note: string;
  /** Where /brand/email-header.png lives (an origin, or "{{ .SiteURL }}" in sign-in emails). */
  siteUrl: string;
  /** Extra footer HTML after the tagline (for example a support link). */
  footerExtra?: string;
}

/** Every Ziplume email: a navy header band, a white card, one navy button. */
export function emailLayout(input: EmailLayoutInput): string {
  const fallback = input.fallbackLink ?? input.button.href;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${input.title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a1330;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #dce3ed;overflow:hidden;">
            <tr>
              <td style="background:#0a1330;padding:0;">
                <img src="${input.siteUrl}/brand/email-header.png" width="520" height="80" alt="Ziplume" style="display:block;width:100%;max-width:520px;height:auto;border:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:3px;line-height:80px;text-align:center;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0;">
                <h1 style="margin:0 0 12px;font-size:21px;line-height:1.35;color:#0a1330;">${input.heading ?? input.title}</h1>
                ${input.body}
                <a href="${input.button.href}" style="display:inline-block;background:#0a1330;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${input.button.label}</a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#45506a;">If the button doesn't work, copy this link into your browser:<br /><a href="${fallback}" style="color:#0b6e8c;word-break:break-all;">${fallback}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#45506a;">${input.note}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#45506a;">Ziplume · Make it. Link it. Share it.${input.footerExtra ?? ""}</p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

/** A body paragraph in the layout's style. */
export const paragraph = (html: string) =>
  `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#45506a;">${html}</p>`;
```

- [ ] **Step 4: The four sign-in emails.** Create `emails/auth-templates.ts`:

```ts
import { emailLayout, paragraph } from "./layout";

export type AuthTemplate = "confirm" | "recovery" | "email-change" | "magic-link";

const SITE = "{{ .SiteURL }}";
const confirmLink = (type: string, next: string) =>
  `${SITE}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${type}&amp;next=${next}`;
const COFFEE = ' · <a href="https://buymeacoffee.com/davidallmon" style="color:#0b6e8c;">Buy me a coffee</a>';

/** The sign-in server's emails (Go templates: it fills in {{ .SiteURL }}, {{ .Email }} and the token). */
export const AUTH_TEMPLATES: Record<AuthTemplate, string> = {
  confirm: emailLayout({
    title: "Confirm your Ziplume account",
    body: paragraph(
      "Thanks for signing up. Confirm that {{ .Email }} is your address to start saving codes and tracking scans.",
    ),
    button: { label: "Confirm my email", href: confirmLink("email", "/codes") },
    note: "Didn't create an account? You can ignore this email; nothing happens until the link is used.",
    siteUrl: SITE,
    footerExtra: COFFEE,
  }),
  recovery: emailLayout({
    title: "Reset your password",
    body: paragraph(
      "Someone asked to reset the password for {{ .Email }}. Use the button to choose a new one. The link works once and expires after an hour.",
    ),
    button: {
      label: "Choose a new password",
      href: confirmLink("recovery", "/account/update-password"),
    },
    note: "Didn't ask for this? Ignore this email and your password stays the same.",
    siteUrl: SITE,
    footerExtra: COFFEE,
  }),
  "email-change": emailLayout({
    title: "Confirm your new email",
    body: paragraph(
      "Confirm that you want to change your Ziplume sign-in email from {{ .Email }} to {{ .NewEmail }}.",
    ),
    button: { label: "Confirm new email", href: confirmLink("email_change", "/settings") },
    note: "Didn't request this change? Ignore this email and your account keeps its current address.",
    siteUrl: SITE,
    footerExtra: COFFEE,
  }),
  "magic-link": emailLayout({
    title: "Your sign-in link",
    body: paragraph(
      "Use this link to sign in to Ziplume as {{ .Email }}. It works once and expires soon.",
    ),
    button: { label: "Sign in", href: confirmLink("magiclink", "/codes") },
    note: "Didn't try to sign in? You can safely ignore this email.",
    siteUrl: SITE,
    footerExtra: COFFEE,
  }),
};
```

- [ ] **Step 5: The invite email.** In `emails/invite.ts`:
  - **Imports:** import `emailLayout` and `paragraph` from `./layout`.
  - **Subject:** `` `${inviter} invited you to their Ziplume codes` ``.
  - **HTML:** replace the whole `html` template literal with:

```ts
  const heading = `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:12px;vertical-align:middle;">${badge}</td><td style="vertical-align:middle;font-size:17px;font-weight:700;line-height:1.4;color:#0a1330;">${e(inviter)} invited you to their Ziplume codes</td></tr></table>`;
  const html = emailLayout({
    title: e(subject),
    heading,
    body: paragraph(`You’ll be ${e(role)}.`),
    button: { label: "Accept invite", href: e(input.acceptUrl) },
    note: `This invite is for ${e(input.to)} and expires ${e(expires)}. If you weren’t expecting it, you can ignore this email.`,
    siteUrl: new URL(input.acceptUrl).origin,
  });
```

  - **Plain text:** the first line becomes `` `${inviter} invited you to their Ziplume codes.` ``
    and the last becomes `"Ziplume · Make it. Link it. Share it."`.
  - **Sender name:** in `lib/email/brevo.ts:40`, `name: "QuickQReate"` becomes
    `name: "Ziplume"`.

- [ ] **Step 6: Generate the templates and re-enable the guard for emails.**
  - Run: `UPDATE_EMAIL_TEMPLATES=1 npm test -- emails/auth-templates.test.ts`
    Expected: PASS, and the four `public/email-templates/*.html` files are rewritten.
  - Then add `"emails"` and `"public/email-templates"` back to `FOLDERS` in
    `app/brand-name.test.ts`.
  - Run: `npm test -- emails lib/email features/teams app/brand-name.test.ts`
    Expected: PASS, with the files unchanged on this second run.

- [ ] **Step 7: Look at one rendered email.** Open `public/email-templates/recovery.html` in the
  Read tool and check that the structure is right: header image, heading, button, fallback link,
  note and footer. Then run `npm run lint && npm run format:check`.
  Expected: both exit 0. `public/` is prettier-ignored.

- [ ] **Step 8: Commit.**

```bash
git add emails lib/email features/teams/actions.test.ts public/email-templates app/brand-name.test.ts
git commit -m "Ziplume emails: one shared layout with a navy header, sign-in templates generated from it

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Navy defaults for new codes and hosted pages

**Files:**
- Modify: `features/generator/state/defaults.ts` (`DEFAULT_DESIGN`, `GRADIENT_PRESETS`,
  `COLOR_PRESETS`)
- Modify: `lib/pages/types.ts:228` (`DEFAULT_PAGE_COLOR`)
- Modify: `features/pages/editor/fields.tsx:131-140` (`ACCENTS`)
- Modify: `app/(docs)/developers/page.tsx:263` (sample JSON color)
- Test: `lib/pages/pages.test.ts`, `app/theme.test.ts` (the existing gradient presets test
  covers the new preset)

**Interfaces:**
- Produces: `DEFAULT_DESIGN.fgColor === "#0A1330"` and `DEFAULT_PAGE_COLOR === "#0A1330"`.

- [ ] **Step 1: Write the failing tests.** In `lib/pages/pages.test.ts`:
  - change `expect(page.color).toBe("#4F46E5")` to `.toBe("#0A1330")`
  - add:

```ts
  it("keeps a saved page's color", () => {
    const page = sanitizePage("links", { color: "#4F46E5", title: "Cafe" });
    expect(page.color).toBe("#4F46E5");
  });
```

  `sanitizePage` is already imported in this file; if not, import it from `./sanitize`. Then
  create `features/generator/state/defaults.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { COLOR_PRESETS, DEFAULT_DESIGN, GRADIENT_PRESETS } from "./defaults";

describe("new codes", () => {
  it("start in Ziplume navy", () => {
    expect(DEFAULT_DESIGN.fgColor).toBe("#0A1330");
    expect(DEFAULT_DESIGN.frameColor).toBe("#0A1330");
    expect(DEFAULT_DESIGN.gradientColor).toBe("#0B6E8C");
    expect(COLOR_PRESETS[0]).toEqual({ name: "Navy", fg: "#0A1330", bg: "#FFFFFF" });
    expect(GRADIENT_PRESETS.some((p) => p.from === "#0A1330" && p.to === "#0B6E8C")).toBe(true);
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- lib/pages/pages.test.ts features/generator/state/defaults.test.ts`
  Expected: FAIL, because the old colors are still in place.

- [ ] **Step 3: Change the defaults.**
  - **`DEFAULT_DESIGN`:** `fgColor: "#0A1330"`, `gradientColor: "#0B6E8C"`,
    `frameColor: "#0A1330"`.
  - **`GRADIENT_PRESETS`:** replace the "Midnight" entry with
    `{ name: "Ziplume", from: "#0A1330", to: "#0B6E8C" }`.
  - **`COLOR_PRESETS`:** replace the first "Ink" entry with
    `{ name: "Navy", fg: "#0A1330", bg: "#FFFFFF" }`.
  - **`DEFAULT_PAGE_COLOR`:** `"#0A1330"`.
  - **`ACCENTS`** in `fields.tsx` becomes
    `["#0A1330", "#0B6E8C", "#4F46E5", "#0F766E", "#B45309", "#BE123C", "#7C3AED", "#15803D"]`.
  - **Developers page sample:** `"color": "#0A1330"`.

- [ ] **Step 4: Run them and watch them pass.**
  Run: `npm test`
  Expected: the whole unit suite passes, including `app/theme.test.ts`'s check that every
  gradient preset stays readable on white.

- [ ] **Step 5: Commit.**

```bash
git add features/generator/state/defaults.ts features/generator/state/defaults.test.ts lib/pages/types.ts lib/pages/pages.test.ts features/pages/editor/fields.tsx "app/(docs)/developers/page.tsx"
git commit -m "New codes and hosted pages start in Ziplume navy

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: zl_ API keys and the database's one Ziplume message

**Files:**
- Create: `supabase/migrations/20261014190000_ziplume_names.sql`
- Modify: `supabase/test/migration.test.ts` (the API-key test around line 812, plus new tests)
- Modify: `lib/api/v1.ts` (`authenticate`; add `apiKeyFrom`), `lib/api/v1.test.ts`
- Modify: `app/(docs)/developers/page.tsx:94`

**Spec 4.8** asks for `e2e/server.spec.ts` to check both prefixes. The public suite runs without
accounts, so the API answers 503 before it reads a key. The prefix rule is therefore a pure
function, `apiKeyFrom`, and gets unit tests. `e2e/server.spec.ts` stays as it is.

**Interfaces:**
- Produces:
  - `apiKeyFrom(header: string | null): string | null`
  - `create_api_key` returns keys starting `zl_`
  - `record_invite_send`'s site-wide limit message says "Ziplume has sent all the invite emails
    it can today"

- [ ] **Step 1: Write the failing tests.** In `supabase/test/migration.test.ts`:
  - change `expect(created.key).toMatch(/^qq_[0-9a-f]{48}$/);` to `/^zl_[0-9a-f]{48}$/`
  - right after that test, add:

```ts
  it("old qq_ keys still resolve to their owner", async () => {
    const oldKey = `qq_${"b".repeat(48)}`;
    await asService(
      `insert into public.api_keys (user_id, name, prefix, key_hash)
       values ($1, 'Before Ziplume', left($2, 10), encode(extensions.digest($2, 'sha256'), 'hex'))`,
      [JAY, oldKey],
    );
    const [{ u }] = (await asService<{ u: string | null }>(
      "select public.api_key_user($1) as u",
      [oldKey],
    )) as [{ u: string | null }];
    expect(u).toBe(JAY);
    await asService("delete from public.api_keys where name = 'Before Ziplume'");
  });
```

  At the end of `describe("email invites", …)`, add:

```ts
  it("name Ziplume when the whole site has sent its daily invites", async () => {
    const VAL = "15151515-1515-4515-8515-151515151515";
    await db.query("insert into auth.users (id, email) values ($1, 'val@example.com')", [VAL]);
    const asVal = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", VAL, sql, params);
    await asService(
      "insert into public.invite_sends (owner_id) select $1 from generate_series(1, 200)",
      [UMA],
    );
    try {
      const [invite] = await asVal<{ id: string }>(
        "insert into public.team_invites (email, role) values ('wyn@example.com', 'viewer') returning id",
      );
      await expect(record(asVal, invite!.id)).rejects.toThrow(
        /Ziplume has sent all the invite emails it can today/,
      );
    } finally {
      await asService("delete from public.invite_sends where owner_id = $1", [UMA]);
    }
  });
```

  In `lib/api/v1.test.ts`, add `apiKeyFrom` to the import from `./v1`, then append:

```ts
describe("apiKeyFrom", () => {
  const key = (prefix: string) => `${prefix}_${"a1".repeat(24)}`;

  it("accepts qq_ and zl_ keys", () => {
    expect(apiKeyFrom(`Bearer ${key("zl")}`)).toBe(key("zl"));
    expect(apiKeyFrom(`Bearer ${key("qq")}`)).toBe(key("qq"));
  });

  it("refuses anything else", () => {
    expect(apiKeyFrom(`Bearer ${key("xx")}`)).toBeNull();
    expect(apiKeyFrom(key("zl"))).toBeNull();
    expect(apiKeyFrom(`Bearer zl_short`)).toBeNull();
    expect(apiKeyFrom(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- supabase/test/migration.test.ts lib/api/v1.test.ts`
  Expected: FAIL. The key still starts `qq_`, the message says QuickQReate, and `apiKeyFrom`
  isn't exported. "old qq_ keys still resolve" should already PASS, which is expected: it pins
  behavior that must not change.

- [ ] **Step 3: The migration.** Create
  `supabase/migrations/20261014190000_ziplume_names.sql`. The function bodies are copied from
  `20261013150000_power_tools.sql` and `20261014120200_email_invites.sql`, and only the marked
  lines change.

```sql
-- Ziplume Release 2: the product's new name where the database shows it.
--
-- New API keys start with zl_ (Ziplume). Keys issued before keep working, because
-- api_key_user() compares hashes, not prefixes. The site-wide invite limit names Ziplume.
-- Grants are unchanged (create or replace keeps them).

create or replace function public.create_api_key(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := 'zl_' || encode(extensions.gen_random_bytes(24), 'hex'); -- was qq_
  v_id uuid;
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.api_keys where user_id = auth.uid()) >= 10 then
    raise exception 'You can have up to 10 API keys' using errcode = '22023';
  end if;
  insert into public.api_keys (user_id, name, prefix, key_hash)
  values (auth.uid(), left(btrim(coalesce(p_name, '')), 60), left(v_key, 10), encode(extensions.digest(v_key, 'sha256'), 'hex'))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'key', v_key, 'prefix', left(v_key, 10));
end;
$$;

create or replace function public.record_invite_send(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.team_invites;
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Sign in to send invites' using errcode = '42501';
  end if;
  -- One owner's sends are counted one at a time, so two requests can't both slip under a limit.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select * into v_invite
    from public.team_invites
   where id = p_invite and owner_id = auth.uid()
     for update;
  if v_invite.id is null or v_invite.accepted_at is not null or v_invite.expires_at <= now() then
    raise exception 'This invite is no longer valid' using errcode = '22023';
  end if;
  if v_invite.send_count >= 5 then
    raise exception 'This invite has been emailed 5 times already' using errcode = '54000';
  end if;
  if (select count(*) from public.invite_sends s
       where s.owner_id = auth.uid() and s.sent_at > now() - interval '1 hour') >= 20 then
    raise exception 'You have sent 20 invites in the last hour' using errcode = '54000';
  end if;
  if (select count(*) from public.invite_sends s
       where s.owner_id = auth.uid() and s.sent_at > now() - interval '1 day') >= 50 then
    raise exception 'You have sent 50 invites today' using errcode = '54000';
  end if;
  if (select count(*) from public.invite_sends s where s.sent_at > now() - interval '1 day') >= 200 then
    raise exception 'Ziplume has sent all the invite emails it can today' using errcode = '54000'; -- was QuickQReate
  end if;
  insert into public.invite_sends (owner_id, invite_id) values (auth.uid(), v_invite.id);
  update public.team_invites
     set last_sent_at = now(), send_count = send_count + 1
   where id = v_invite.id;
end;
$$;
```

  Before writing, check that `20261014170000_teams.sql` and later files don't redefine either
  function: `git grep -n "function public.create_api_key\|function public.record_invite_send" supabase/migrations`.
  Expected: only their original files. If a later file redefines one, copy that later body
  instead, and log a ruling.

- [ ] **Step 4: The API.** In `lib/api/v1.ts`, above `authenticate`, add:

```ts
/** The API key in an Authorization header: zl_ keys, or qq_ keys issued before Ziplume. */
export function apiKeyFrom(header: string | null): string | null {
  return /^Bearer\s+((?:qq|zl)_[0-9a-f]{48})$/i.exec(header ?? "")?.[1] ?? null;
}
```

  Then in `authenticate`, replace the `match` lines with:

```ts
  const key = apiKeyFrom(request.headers.get("authorization"));
  if (!key)
    return apiError(401, "unauthorized", "Send your API key as: Authorization: Bearer zl_…");
```

  Delete the now-unused `const key = match[1]!;`. In `app/(docs)/developers/page.tsx:94`,
  `qq_your_key_here` becomes `zl_your_key_here`.

- [ ] **Step 5: Run them and watch them pass.**
  Run: `npm test -- supabase/test/migration.test.ts lib/api && grep -c '\\' supabase/migrations/20261014190000_ziplume_names.sql`
  Expected: PASS, and `0` backslashes.

- [ ] **Step 6: Commit.**

```bash
git add supabase/migrations/20261014190000_ziplume_names.sql supabase/test/migration.test.ts lib/api "app/(docs)/developers/page.tsx"
git commit -m "New API keys start with zl_ (old qq_ keys still work); the invite limit names Ziplume

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Docs, every check, and a look at the result

**Files:**
- Modify: `README.md`, `docs/accounts-setup.md`
- Modify: `e2e/accounts/app.spec.ts` (dark-mode accessibility sweeps)

- [ ] **Step 1: The docs.**
  - **`README.md`:** the product name becomes Ziplume, with the tagline under the title. Keep
    `https://github.com/DavidAllmon/QuickQReate` links and `qr.techitdave.com` until Release 3.
  - **`docs/accounts-setup.md`:** rename the product, and set the server sender settings to
    `SMTP_SENDER_NAME=Ziplume` and the four subjects:
    - "Confirm your Ziplume account"
    - "Reset your Ziplume password"
    - "Confirm your new email for Ziplume"
    - "Your Ziplume sign-in link"

    Keep infrastructure identifiers: the slug `quickqreate-1791927515091`, the Google project id
    `quickqreate`, and the Brevo key names until Task 11 renames what it can.

- [ ] **Step 2: Add dark-mode sweeps.** In `e2e/accounts/app.spec.ts`, replace the test
  `"/codes passes axe in dark mode"` with:

```ts
  for (const path of ["codes", "codes/new", "team"]) {
    test(`/${path} passes axe in dark mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expectNoAxeViolations(page);
    });
  }
```

- [ ] **Step 3: Every check.**
  - Run: `npm run lint && npm run typecheck && npm test && npm run format:check`
  - Run: `npm run build && npm run test:e2e`
  - Run: `npx --yes supabase@2.120.0 migration up --local`, then
    `docker exec supabase_db_quickqreate psql -U postgres -c "notify pgrst, 'reload schema';"`,
    then `npm run test:e2e:accounts`

  Expected: everything passes, including:
  - the axe sweeps of every app page at 390, 820 and 1280 px
  - dark `/codes`, `/codes/new` and `/team`
  - the home page, `/bulk` and `/developers` in light and dark
  - the scan test that uploads `public/icons/icon-192.png` as a logo

  If a contrast violation appears, fix it in the palette (Task 1's values) and log a ruling.

- [ ] **Step 4: Look at it.** Add a temporary screenshot test,
  `e2e/accounts/zz-look.spec.ts`. Don't commit it: delete it after this step.

```ts
import { test } from "@playwright/test";

import { OWNER, seed } from "./fixtures";

test.use({ storageState: OWNER.state });
for (const scheme of ["light", "dark"] as const) {
  for (const width of [1280, 390]) {
    for (const path of ["codes", "codes/new", "codes/{menu}", "team", "login", "", "r/doesnotexist"]) {
      test(`look ${scheme} ${width} /${path}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path.replace("{menu}", seed().menuId));
        await page.waitForLoadState("networkidle");
        await page.screenshot({
          path: `test-results/look/${scheme}-${width}-${path.replace(/\W+/g, "_") || "home"}.png`,
          fullPage: false,
        });
      });
    }
  }
}
```

  Run `npm run test:e2e:accounts -- --no-build --grep look`. Then read the screenshots under
  `test-results/look/`.

  Read each screenshot and check:
  - the navy sidebar and the cyan Create button
  - the wordmark and mark
  - fonts loaded (not a fallback)
  - no clipped text

  Write what you saw in the ledger. Fix anything broken, with a test where one can catch it.

- [ ] **Step 5: Commit.**

```bash
git add README.md docs/accounts-setup.md e2e/accounts/app.spec.ts
git commit -m "Ziplume in the README and setup docs; dark accessibility sweeps for Create and Team

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Review, the live migration, release and the outside services

- [ ] **Step 1: Final review.** Follow executing-plans "Final Review": a fresh reviewer on the
  most capable model, given the review package, this plan and the spec. Run one fix pass for
  Critical and Important findings, each fixed RED→GREEN.

- [ ] **Step 2: Back up, then apply the migration live.**
  - Use a verified backup, following the same rule and runbook practice as Release 1. Check the
    backup health and the local backup cap first, and log the decision as a ruling.
  - Through the bridge (project `db12f7ce-3e77-4461-a686-c8cd6de6f764`), run
    `20261014190000_ziplume_names.sql` exactly. Then run `notify pgrst, 'reload schema';`.
  - Verify with read-only queries:
    - `select prosrc like '%''zl_''%' from pg_proc where proname = 'create_api_key';` → t
    - `select prosrc like '%Ziplume has sent%' from pg_proc where proname = 'record_invite_send';` → t
    - `select has_function_privilege('anon','public.create_api_key(text)','execute');` → f
  - Append the runbook entry.

- [ ] **Step 3: Release.** Use finishing-a-development-branch:
  - push `feat/ziplume-look`
  - open a PR
  - after both CI jobs pass, merge
  - watch for the new build id on `https://qr.techitdave.com/login`

- [ ] **Step 4: Server email settings.** In the Supabase panel at `https://studio.techitdave.com`,
  open project QuickQReate, then Manage, then its environment (the same place as at go-live).
  If the panel asks for a sign-in, stop and ask David.
  - Set `SMTP_SENDER_NAME=Ziplume` and the four `GOTRUE_MAILER_SUBJECTS_*` values from Task 10.
  - Save, then redeploy only this project's auth service.
  - If the panel lets you rename the project's display name, rename it to "Ziplume". Its slug and
    address don't change.
  - Record what changed in the runbook.

- [ ] **Step 5: Google Cloud** (David signs in if asked). In project `quickqreate`:
  - Rename the OAuth consent screen's app name from "QuickQReate" to "Ziplume". Upload no logo.
  - Rename the project's display name to "Ziplume". Its id stays.
  - Change nothing else.

- [ ] **Step 6: Other admin-side names.**
  - In Coolify, rename the application `4gko88co580xlr70qkda3jhx` to "Ziplume". Keep its domains.
  - In Brevo (David signs in), rename the keys `quickqreate-auth` and `quickqreate-invites` if
    Brevo allows it. If it doesn't, note that in the runbook.

- [ ] **Step 7: Live check, read-only, in Chrome.**
  - Look at:
    - the home page headline and logo, the sign-in card's framed wordmark
    - the navy sidebar in light and dark
    - the favicon, and `/manifest.webmanifest` (name and colors)
    - a short-link status page (`/r/doesnotexist`)
    - the social image at `/opengraph-image.png`
  - Ask David whether to send a password-reset email to his test account
    (`dvdallmon+qrtest@gmail.com`) to check the new email look; send it only on his yes. Make no
    changes to his data.

- [ ] **Step 8: Record it.** Update the memories `quickqreate-go-live-status.md` and
  `ziplume-rebrand.md`: the shipped release, the deferred minors, and "next: Release 3 plan".
