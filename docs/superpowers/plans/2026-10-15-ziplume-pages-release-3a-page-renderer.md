# Pages release 3a: looks and the new page renderer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every hosted page carries a `look` (theme, wallpaper, header, font, text and button styles, social icons position) and is drawn by a new renderer from it, on the public page and in the editor's preview; existing pages move to the Paper look with their own color.

**Architecture:** `lib/pages/look.ts` holds the `PageLook` type, the nine themes, each type's default theme, the look for pages saved before release 3, and `sanitizeLook`; `sanitizePage` always returns a look and keeps `color` equal to its button color. `features/pages/look/resolve.ts` turns a look into CSS variables (wallpaper, text and muted text, card surfaces, accent, button colors, corners, fonts) and runs the readability checks. `PageFrame` sets those variables on the page's own root — redefining the app's base color variables there, the way the navy sidebar does — so every view's existing markup takes the page's look and a visitor's light or dark setting no longer reaches it; `PageHeader` draws Classic, Hero and Banner headers.

**Tech Stack:** Next.js 16 App Router (`generateViewport`, `generateMetadata`), React 19, Tailwind 4 (`@theme inline`, `@utility`), `next/font/local`, `@fontsource-variable/*`, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-ziplume-pages-redesign-design.md` — section 6.2–6.10 and section 7's release 3 tests. The Look tab's controls (6.1) come in release 3b, with the gallery's page drawings.

## Global Constraints

- The nine themes are exactly spec 6.2's table (wallpaper, font, buttons, text), and new pages start on "a theme chosen for the type: Link list and App on Ziplume; Contact page, Business, Feedback and PDF on Paper; Menu on Sand; Coupon on Sunset; Event on Grape; Images and Video on Midnight; Audio on Ocean."
- Readability guard: "text against the wallpaper (both gradient ends; for an image, after darkening): at least 4.5:1; button text against the button: at least 4.5:1; a solid button, or an outline button's border, against the wallpaper: at least 3:1." Auto colors "always pick the more readable of near-white and near-black."
- Fonts are spec 6.3's table, "self-hosted from `@fontsource` packages (Latin subset); a visitor's browser downloads only the faces the page uses."
- Cards: "on light wallpapers, white at 92% with a faint border; on dark ones, white at 8% with a white 12% border. Card corners follow the button shape (8, 16 or 24px)." Accent: "the button color when it has at least 3:1 contrast on the card, otherwise the text color." Layout: "one column, at most 560px wide, centered." Footer "Made with Ziplume" in the page's muted text color, inside the page.
- `PageLook` is spec 6.6's interface, field for field. "`color` stays, and saving keeps it equal to `look.button.color`." "No database migration."
- "A page without `look` is drawn with the Paper theme, Classic header, its saved `color` as the button color, and social icons where that type shows them today (Link list under the header; Contact page and Business at the bottom)."
- "Headings become consistent: every type has one `h1`." "The renderer stops using the app's light/dark tokens, so a visitor's site theme no longer changes a page."
- 6.8: no app background on `/p`; `themeColor` and `color-scheme` follow the wallpaper; metadata gains a description and a share image; notices keep the Ziplume look.
- 6.10: `look` accepted and returned in `content`; "Requests without `look` get the type's default theme"; the docs get a "Page looks" section.
- `next build` type-checks test files.

## Rulings made in this plan

1. **Themes live in `lib/pages/look.ts`** (the spec names `features/pages/look/themes.ts`): sanitizing in `lib/` needs them, and `lib/` never imports from `features/`. Resolving and fonts stay in `features/pages/look/`.
2. **A Business page saved before release 3 with a cover photo gets Hero**, not Classic: Classic shows only the logo (6.4), and the spec's intent for existing pages is to keep what they show. Others get Classic as written. *Cost if wrong:* one line in `legacyLook`.
3. **Muted text** (descriptions, labels) is the text color softened as far as it can go while staying at 4.5:1 on the wallpaper and on cards; on Sunset and Grape that's the text color itself. The spec doesn't set muted text; a fixed 75% would fail there (3.2–3.5:1).
4. **Every link on a Link list (and every Business button) uses the theme's button style**, as on Linktree and in the approved mockup; secondary actions (Calendar, Download, Google) use a card-colored button.
5. **API: a `content` without `look` gets the type's default theme on create and on update** (spec 6.10 as written). The docs say to send `look` back to keep a page's look.
6. **The editor's preview renders the frame as a `div`, not `main`** (the public page keeps `main`), which also clears release 2b's deferred "second main landmark" minor.
7. **Release 3b** (next) adds the Look tab's controls. Until then the Look tab keeps its page color picker, which now sets the button color.

## Review Focus

1. **Pages saved before release 3** (no `look`) must show Paper, their saved color on the buttons, socials where they were, and the same in the editor's preview; a Business with a cover keeps it. — Test in Task 1 (`legacyLook`) and Task 4 (render).
2. **Garbage in `look`** from the API or an old draft (unknown theme, bad hex, dim 300, a wallpaper image outside the owner's folder) must fall back field by field to the theme, never break the page. — Test in Task 1.
3. **A visitor in dark mode** must see exactly the owner's look. — e2e in Task 6 (dark color scheme on `/p`, same wallpaper and text color as light).
4. **An image wallpaper** whose file is missing or still loading must still be readable: the fallback color and the darkening decide the text color. — Test in Task 2.
5. **Hero with no image** must fall back to Classic. — Test in Task 4.

---

## File structure

| File | Responsibility |
|---|---|
| `lib/pages/look.ts` (+ test) | `PageLook`, `THEMES`, `TYPE_THEME`, `themeLook`, `legacyLook`, `sanitizeLook`, `withButtonColor` |
| `lib/pages/types.ts` | `look` on every page type; defaults per type |
| `lib/pages/sanitize.ts` | look in, `color = look.button.color` out; `{ missingLook }` option |
| `lib/api/v1.ts`, `app/(docs)/developers/page.tsx` | `missingLook: "theme"`; "Page looks" docs |
| `features/create/sections/LookSection.tsx`, `features/generator/content/HostedPageForm.tsx` | the color picker sets the button color |
| `features/pages/look/resolve.ts` (+ test) | look → CSS variables, auto colors, muted, cards, accent, buttons; `lookChecks` |
| `features/pages/look/fonts.ts` (+ test), `app/fonts.ts`, `app/layout.tsx`, `app/globals.css` | six fonts, page font utilities |
| `features/pages/parts.tsx` | `PageFrame`, `PageHeader`, `PageButton`/`PageLink`, `PageCard`, `SocialRow` |
| `features/pages/PageView.tsx` (+ test) | every type on the new pieces, one `h1` each |
| `features/pages/FeedbackForm.tsx`, `CopyCode.tsx` | page fonts and buttons |
| `app/p/layout.tsx`, `app/p/[slug]/page.tsx` (+ test), `lib/pages/meta.ts` (+ test) | no app background; viewport and metadata from the page |
| `e2e/accounts/fixtures.ts`, `global-setup.ts`, `looks.spec.ts`, `create.spec.ts`, `phone-layout.spec.ts` | seeded looks; checks |

---

### Task 1: Pages carry a look

**Files:**
- Create: `lib/pages/look.ts`, `lib/pages/look.test.ts`
- Modify: `lib/pages/types.ts`, `lib/pages/sanitize.ts`, `lib/pages/media.ts`, `lib/pages/pages.test.ts`
- Modify: `lib/api/v1.ts`, `app/(docs)/developers/page.tsx`
- Modify: `features/create/sections/LookSection.tsx`, `features/generator/content/HostedPageForm.tsx`
- Test: `features/create/sections/sections.test.tsx`

**Interfaces:**
- Produces (`lib/pages/look.ts`):
  - `type ThemeId = "ziplume" | "paper" | "midnight" | "ocean" | "sunset" | "grape" | "forest" | "blush" | "sand"`; `type FontId = "clean" | "bold" | "elegant" | "friendly" | "modern" | "typewriter"`; `interface PageLook` (spec 6.6).
  - `THEME_IDS: ThemeId[]`, `THEMES: Record<ThemeId, { label: string; look: Omit<PageLook, "theme" | "header" | "shape" | "socials"> }>`, `TYPE_THEME: Record<PageTypeId, ThemeId>`.
  - `themeLook(theme: ThemeId, type: PageTypeId): PageLook` (Classic, Circle, the type's social position).
  - `legacyLook(type: PageTypeId, raw: Record<string, unknown>): PageLook`.
  - `sanitizeLook(raw: unknown, fallback: PageLook): PageLook`.
  - `withButtonColor<T extends { color: string; look: PageLook }>(page: T, color: string): T`.
  - `sanitizePage(type, raw, options?: { missingLook?: "legacy" | "theme" })`.

- [ ] **Step 1: Write the failing tests**

`lib/pages/look.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { PAGE_TYPE_IDS } from "@/lib/qr/types";

import { legacyLook, sanitizeLook, themeLook, THEME_IDS, THEMES, TYPE_THEME } from "./look";
import { sanitizePage } from "./sanitize";
import { PAGE_DEFAULTS } from "./types";

const UID = "11111111-1111-4111-8111-111111111111";

describe("themes", () => {
  it("are the spec's nine, and each type starts on its own", () => {
    expect(THEME_IDS).toEqual([
      "ziplume", "paper", "midnight", "ocean", "sunset", "grape", "forest", "blush", "sand",
    ]);
    expect(THEMES.ocean.look.wallpaper).toEqual({
      kind: "gradient", from: "#095E77", to: "#0A1330", direction: "diagonal",
    });
    expect(THEMES.sand.look.button).toEqual({
      shape: "square", style: "outline", shadow: "hard", color: "#7C2D12", text: "auto",
    });
    expect(TYPE_THEME).toMatchObject({
      links: "ziplume", app: "ziplume", vcard: "paper", business: "paper", feedback: "paper",
      pdf: "paper", menu: "sand", coupon: "sunset", event: "grape", images: "midnight",
      video: "midnight", audio: "ocean",
    });
    for (const type of PAGE_TYPE_IDS) {
      const page = PAGE_DEFAULTS[type]();
      expect(page.look.theme, type).toBe(TYPE_THEME[type]);
      expect(page.color, type).toBe(page.look.button.color);
    }
  });
});

describe("sanitizeLook", () => {
  const fallback = themeLook("paper", "links");

  it("keeps a valid look", () => {
    const look = { ...themeLook("ocean", "links"), header: "hero" as const, font: "elegant" as const };
    expect(sanitizeLook(look, fallback)).toEqual(look);
  });

  it("falls back field by field, starting from the look's own theme", () => {
    const look = sanitizeLook(
      {
        theme: "grape",
        wallpaper: { kind: "image", image: { path: "../../etc/passwd" }, dim: 300, color: "nope" },
        header: "sideways",
        font: "comic",
        text: "#12",
        button: { shape: "blob", style: "solid", shadow: "hard", color: "#abc", text: "auto" },
        socials: "bottom",
      },
      fallback,
    );
    expect(look.theme).toBe("grape");
    expect(look.wallpaper).toEqual(THEMES.grape.look.wallpaper); // a bad image falls back
    expect(look.header).toBe("classic");
    expect(look.font).toBe(THEMES.grape.look.font);
    expect(look.text).toBe("auto");
    expect(look.button).toEqual({
      shape: THEMES.grape.look.button.shape,
      style: "solid",
      shadow: "hard",
      color: "#AABBCC",
      text: "auto",
    });
    expect(look.socials).toBe("bottom");
  });

  it("keeps an image wallpaper from the owner's folder, with dim clamped to 0–80", () => {
    const image = { path: `${UID}/wall.jpg`, name: "wall.jpg", type: "image/jpeg", size: 9 };
    const look = sanitizeLook(
      { ...fallback, wallpaper: { kind: "image", image, dim: 95, color: "#334455" } },
      fallback,
    );
    expect(look.wallpaper).toEqual({ kind: "image", image, dim: 80, color: "#334455" });
  });

  it("uses the fallback for an unknown theme or garbage", () => {
    expect(sanitizeLook({ theme: "neon" }, fallback)).toEqual(fallback);
    expect(sanitizeLook("pink", fallback)).toEqual(fallback);
  });
});

describe("pages saved before looks", () => {
  it("are Paper, with their own color on the buttons and socials where they were", () => {
    const links = sanitizePage("links", { title: "Old", color: "#4F46E5" });
    expect(links.look).toMatchObject({
      theme: "paper", header: "classic", socials: "top", button: { color: "#4F46E5" },
    });
    expect(links.color).toBe("#4F46E5");
    expect(sanitizePage("vcard", { firstName: "Pat" }).look.socials).toBe("bottom");
    expect(sanitizePage("business", { name: "Cafe" }).look.socials).toBe("bottom");
  });

  it("keep a Business cover photo by drawing it as the Hero", () => {
    const cover = { path: `${UID}/cover.jpg`, name: "cover.jpg", type: "image/jpeg", size: 9 };
    expect(legacyLook("business", { cover }).header).toBe("hero");
    expect(legacyLook("business", {}).header).toBe("classic");
  });

  it("get the type's theme instead when an API request leaves look out", () => {
    const page = sanitizePage("coupon", { offer: "20%" }, { missingLook: "theme" });
    expect(page.look.theme).toBe("sunset");
    expect(page.color).toBe(page.look.button.color);
  });

  it("keep color equal to the button color", () => {
    const page = sanitizePage("links", {
      color: "#000000",
      look: { ...themeLook("paper", "links"), button: { ...themeLook("paper", "links").button, color: "#BE123C" } },
    });
    expect(page.color).toBe("#BE123C");
  });

  it("carry the wallpaper image in the page's files", async () => {
    const { mediaPaths } = await import("./sanitize");
    const image = { path: `${UID}/wall.jpg`, name: "wall.jpg", type: "image/jpeg", size: 9 };
    const page = sanitizePage("links", {
      look: { ...themeLook("paper", "links"), wallpaper: { kind: "image", image, dim: 20, color: "#334455" } },
    });
    expect(mediaPaths(page)).toContain(`${UID}/wall.jpg`);
  });
});
```

In `features/create/sections/sections.test.tsx`, a `LookSection` test:

```tsx
describe("LookSection", () => {
  it("sets the page's button color, and color with it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LookSection page={PAGE_DEFAULTS.links()} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Use #BE123C" }));
    const next = onChange.mock.lastCall![0];
    expect(next.look.button.color).toBe("#BE123C");
    expect(next.color).toBe("#BE123C");
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/pages features/create/sections`
Expected: FAIL — `./look` doesn't exist.

- [ ] **Step 3: Write `lib/pages/look.ts`**

First break the import cycle `types → look → sanitize → types` before it exists: move `MEDIA_PATH` and `sanitizeMedia` from `lib/pages/sanitize.ts` into `lib/pages/media.ts` (which imports only the `Media` type), and have `sanitize.ts` import them from there and re-export them (`export { MEDIA_PATH, sanitizeMedia } from "./media";`) so existing callers keep working. `look.ts` imports `sanitizeMedia` from `./media`.

```ts
import { normalizeHex } from "@/lib/color/contrast";
import type { PageTypeId } from "@/lib/qr/types";

import { sanitizeMedia } from "./media";
import type { Media } from "./types";

export const THEME_IDS = [
  "ziplume", "paper", "midnight", "ocean", "sunset", "grape", "forest", "blush", "sand",
] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const FONT_IDS = ["clean", "bold", "elegant", "friendly", "modern", "typewriter"] as const;
export type FontId = (typeof FONT_IDS)[number];

export type Wallpaper =
  | { kind: "solid"; color: string }
  | { kind: "gradient"; from: string; to: string; direction: "down" | "diagonal" | "across" }
  | { kind: "image"; image: Media; dim: number; color: string };

/** How a hosted page looks (spec 6.6). */
export interface PageLook {
  theme: ThemeId;
  wallpaper: Wallpaper;
  header: "classic" | "hero";
  shape: "circle" | "rounded";
  font: FontId;
  text: "auto" | string;
  button: {
    shape: "square" | "rounded" | "pill";
    style: "solid" | "outline" | "soft";
    shadow: "none" | "soft" | "hard";
    color: string;
    text: "auto" | string;
  };
  socials: "top" | "bottom";
}

type ThemeLook = Pick<PageLook, "wallpaper" | "font" | "text" | "button">;

const solid = (color: string): Wallpaper => ({ kind: "solid", color });
const gradient = (from: string, to: string, direction: "down" | "diagonal" | "across"): Wallpaper =>
  ({ kind: "gradient", from, to, direction });
const button = (
  shape: PageLook["button"]["shape"],
  style: PageLook["button"]["style"],
  color: string,
  shadow: PageLook["button"]["shadow"] = "none",
): PageLook["button"] => ({ shape, style, shadow, color, text: "auto" });

/** Spec 6.2. */
export const THEMES: Record<ThemeId, { label: string; look: ThemeLook }> = {
  ziplume: { label: "Ziplume", look: { wallpaper: gradient("#0A1330", "#16245A", "down"), font: "bold", text: "auto", button: button("pill", "solid", "#7FE9FF") } },
  paper: { label: "Paper", look: { wallpaper: solid("#F6F5F1"), font: "clean", text: "auto", button: button("rounded", "solid", "#0F172A") } },
  midnight: { label: "Midnight", look: { wallpaper: solid("#070B1A"), font: "clean", text: "auto", button: button("rounded", "outline", "#E6EEFA") } },
  ocean: { label: "Ocean", look: { wallpaper: gradient("#095E77", "#0A1330", "diagonal"), font: "clean", text: "auto", button: button("pill", "soft", "#FFFFFF") } },
  sunset: { label: "Sunset", look: { wallpaper: gradient("#C2410C", "#881337", "diagonal"), font: "bold", text: "auto", button: button("pill", "solid", "#FFFFFF") } },
  grape: { label: "Grape", look: { wallpaper: gradient("#7C3AED", "#3B0764", "down"), font: "friendly", text: "auto", button: button("rounded", "solid", "#F5F3FF") } },
  forest: { label: "Forest", look: { wallpaper: solid("#14532D"), font: "elegant", text: "auto", button: button("rounded", "solid", "#F5F0E1") } },
  blush: { label: "Blush", look: { wallpaper: solid("#FCE7F3"), font: "friendly", text: "auto", button: button("pill", "solid", "#831843") } },
  sand: { label: "Sand", look: { wallpaper: solid("#F3E8D8"), font: "elegant", text: "auto", button: button("square", "outline", "#7C2D12", "hard") } },
};

/** The theme a new page of each type starts on (spec 6.2). */
export const TYPE_THEME: Record<PageTypeId, ThemeId> = {
  links: "ziplume", app: "ziplume", vcard: "paper", business: "paper", feedback: "paper",
  pdf: "paper", menu: "sand", coupon: "sunset", event: "grape", images: "midnight",
  video: "midnight", audio: "ocean",
};

/** Where a type's social icons sit by default: Link list under the header, the others at the end. */
const socialsFor = (type: PageTypeId): PageLook["socials"] => (type === "links" ? "top" : "bottom");

export function themeLook(theme: ThemeId, type: PageTypeId): PageLook {
  const { look } = THEMES[theme];
  return {
    theme,
    ...structuredClone(look),
    header: "classic",
    shape: "circle",
    socials: socialsFor(type),
  };
}

/** A page saved before looks existed: Paper, its own color on the buttons (spec 6.9). */
export function legacyLook(type: PageTypeId, raw: Record<string, unknown>): PageLook {
  const look = themeLook("paper", type);
  const color = typeof raw.color === "string" ? normalizeHex(raw.color) : null;
  if (color) look.button.color = color;
  // Classic shows only a Business's logo; keep its cover photo by drawing it as the Hero.
  if (type === "business" && sanitizeMedia(raw.cover)) look.header = "hero";
  return look;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const oneOf = <T extends string>(values: readonly T[], value: unknown, fallback: T): T =>
  typeof value === "string" && (values as readonly string[]).includes(value) ? (value as T) : fallback;
const hex = (value: unknown, fallback: string) =>
  (typeof value === "string" && normalizeHex(value)) || fallback;
const hexOrAuto = (value: unknown, fallback: "auto" | string) =>
  value === "auto" ? "auto" : (typeof value === "string" && normalizeHex(value)) || fallback;

function sanitizeWallpaper(raw: unknown, fallback: Wallpaper): Wallpaper {
  if (!isObject(raw)) return fallback;
  if (raw.kind === "solid") return { kind: "solid", color: hex(raw.color, "#F6F5F1") };
  if (raw.kind === "gradient") {
    const from = typeof raw.from === "string" ? normalizeHex(raw.from) : null;
    const to = typeof raw.to === "string" ? normalizeHex(raw.to) : null;
    if (!from || !to) return fallback;
    return { kind: "gradient", from, to, direction: oneOf(["down", "diagonal", "across"] as const, raw.direction, "down") };
  }
  if (raw.kind === "image") {
    const image = sanitizeMedia(raw.image);
    if (!image) return fallback;
    const dim = typeof raw.dim === "number" && Number.isFinite(raw.dim) ? Math.round(raw.dim) : 30;
    return { kind: "image", image, dim: Math.min(80, Math.max(0, dim)), color: hex(raw.color, "#0F172A") };
  }
  return fallback;
}

/** A valid look from stored or edited JSON: each bad field falls back to the look's theme. */
export function sanitizeLook(raw: unknown, fallback: PageLook): PageLook {
  if (!isObject(raw) || !(THEME_IDS as readonly string[]).includes(raw.theme as string)) {
    return fallback;
  }
  const theme = raw.theme as ThemeId;
  const base = { ...themeLook(theme, "links"), header: fallback.header, shape: fallback.shape, socials: fallback.socials };
  const b = isObject(raw.button) ? raw.button : {};
  return {
    theme,
    wallpaper: sanitizeWallpaper(raw.wallpaper, base.wallpaper),
    header: oneOf(["classic", "hero"] as const, raw.header, "classic"),
    shape: oneOf(["circle", "rounded"] as const, raw.shape, base.shape),
    font: oneOf(FONT_IDS, raw.font, base.font),
    text: hexOrAuto(raw.text, "auto"),
    button: {
      shape: oneOf(["square", "rounded", "pill"] as const, b.shape, base.button.shape),
      style: oneOf(["solid", "outline", "soft"] as const, b.style, base.button.style),
      shadow: oneOf(["none", "soft", "hard"] as const, b.shadow, base.button.shadow),
      color: hex(b.color, base.button.color),
      text: hexOrAuto(b.text, "auto"),
    },
    socials: oneOf(["top", "bottom"] as const, raw.socials, base.socials),
  };
}

/** Sets the page's button color, keeping `color` (read by API users) the same. */
export function withButtonColor<T extends { color: string; look: PageLook }>(page: T, color: string): T {
  return { ...page, color, look: { ...page.look, button: { ...page.look.button, color } } };
}
```

(Prettier will reflow the long theme lines.)

- [ ] **Step 4: Give every page a look**

`lib/pages/types.ts`:
- `import type { PageLook } from "./look";` and in `interface Themed`: `color: string; /** How the page looks (release 3). */ look: PageLook;`.
- `PAGE_DEFAULTS`: wrap each type's defaults so each gets its theme, with `color` from it:

```ts
const withLook = <K extends PageTypeId>(type: K, page: Omit<PageContentMap[K], "look">) => {
  const look = themeLook(TYPE_THEME[type], type);
  return { ...page, color: look.button.color, look } as PageContentMap[K];
};
```

and each entry becomes e.g. `links: () => withLook("links", { color: "", title: "", … })` (import `themeLook`, `TYPE_THEME` from `./look`; `lib/pages/look.ts` imports only the `Media` type from `./types`, so there's no cycle at runtime).

`lib/pages/sanitize.ts`:

```ts
export function sanitizePage<K extends PageTypeId>(
  type: K,
  raw: unknown,
  { missingLook = "legacy" }: { missingLook?: "legacy" | "theme" } = {},
): PageContentMap[K] {
  const defaults = PAGE_DEFAULTS[type]() as unknown as Record<string, unknown>;
  const page = cleanObject(SCHEMAS[type], raw, defaults);
  const source = isObject(raw) ? raw : null;
  // A saved page without a look keeps how it looked (spec 6.9); garbage gets the defaults; an
  // API request without a look gets the type's theme (6.10).
  const fallback = !source
    ? (defaults.look as PageLook)
    : missingLook === "theme" || "look" in source
      ? themeLook(TYPE_THEME[type], type)
      : legacyLook(type, source);
  const look = source && "look" in source ? sanitizeLook(source.look, fallback) : fallback;
  return { ...page, look, color: look.button.color } as unknown as PageContentMap[K];
}
```

(drop `color` from `SCHEMAS` — it's derived now — and import `legacyLook`, `sanitizeLook`, `themeLook`, `TYPE_THEME`, `type PageLook` from `./look`).

`lib/api/v1.ts`, in `content()`: `const page = sanitizePage(type, raw, { missingLook: "theme" });`.

`app/(docs)/developers/page.tsx`, after the hosted-pages example, a "Page looks" section:

```tsx
      <h3>Page looks</h3>
      <p>
        A page&apos;s <code>content.look</code> sets how it looks. Send it back with every change to
        keep the look; without it, the page gets its type&apos;s default theme.{" "}
        <code>content.color</code> always equals <code>look.button.color</code>.
      </p>
      <ul>
        <li><code>theme</code>: <code>ziplume</code>, <code>paper</code>, <code>midnight</code>, <code>ocean</code>, <code>sunset</code>, <code>grape</code>, <code>forest</code>, <code>blush</code> or <code>sand</code>.</li>
        <li><code>wallpaper</code>: <code>{"{ kind: \"solid\", color }"}</code>, <code>{"{ kind: \"gradient\", from, to, direction }"}</code> (<code>down</code>, <code>diagonal</code>, <code>across</code>) or <code>{"{ kind: \"image\", image, dim, color }"}</code> (dim 0–80, an image uploaded in the app).</li>
        <li><code>header</code>: <code>classic</code> or <code>hero</code>; <code>shape</code>: <code>circle</code> or <code>rounded</code>.</li>
        <li><code>font</code>: <code>clean</code>, <code>bold</code>, <code>elegant</code>, <code>friendly</code>, <code>modern</code> or <code>typewriter</code>; <code>text</code>: <code>auto</code> or a hex color.</li>
        <li><code>button</code>: <code>shape</code> (<code>square</code>, <code>rounded</code>, <code>pill</code>), <code>style</code> (<code>solid</code>, <code>outline</code>, <code>soft</code>), <code>shadow</code> (<code>none</code>, <code>soft</code>, <code>hard</code>), <code>color</code> and <code>text</code> (<code>auto</code> or a hex color).</li>
        <li><code>socials</code>: <code>top</code> or <code>bottom</code>.</li>
      </ul>
```

`features/create/sections/LookSection.tsx` and `features/generator/content/HostedPageForm.tsx`: the `AccentField`'s `onChange` becomes `(color) => onChange(withButtonColor(page, color))` (and `generator.setPage(type, withButtonColor(page, color))`), with `value={page.look.button.color}`.

- [ ] **Step 5: Fix what the type change breaks**

Run: `npx tsc --noEmit`
Expected: errors where tests build pages without `look` from literals. Build them from `PAGE_DEFAULTS[type]()` (spread) instead, or add `look: themeLook(…)`. In `lib/pages/pages.test.ts` the "returns the defaults for garbage" and "keeps a saved page's color" tests still hold; "drops unknown keys…" now expects Paper's `#0F172A` for an invalid color (a saved page without a look gets Paper's button color). Re-run until clean.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run lib features/create features/generator features/pages`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib "app/(docs)/developers/page.tsx" features
git commit -m "Pages carry a look: nine themes, a theme per type, Paper for pages saved before looks"
```

---

### Task 2: From a look to colors that read

**Files:**
- Create: `features/pages/look/resolve.ts`, `features/pages/look/resolve.test.ts`

**Interfaces:**
- Consumes: `PageLook`, `THEMES`, `THEME_IDS` (Task 1); `contrastRatio`, `normalizeHex` (`lib/color/contrast.ts`).
- Produces:
  - `WHITE = "#FFFFFF"`, `INK = "#0F172A"`, `mix(a: string, b: string, t: number): string`.
  - `resolveLook(look: PageLook): ResolvedLook` where
    ```ts
    interface ResolvedLook {
      /** CSS variables for the page's root. */
      vars: Record<string, string>;
      /** The wallpaper as a CSS background. */
      background: string;
      /** The wallpaper's main color, for the browser's theme color. */
      themeColor: string;
      colorScheme: "light" | "dark";
      text: string; muted: string; card: string[]; accent: string;
      buttonBg: string[]; buttonText: string;
    }
    ```
  - `lookChecks(look: PageLook): LookCheck[]` with `interface LookCheck { id: "text" | "buttonText" | "button"; ratio: number; needed: number }` — only the failing ones.

- [ ] **Step 1: Write the failing tests**

`features/pages/look/resolve.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/color/contrast";
import { THEME_IDS, themeLook, type PageLook } from "@/lib/pages/look";

import { INK, lookChecks, mix, resolveLook, WHITE } from "./resolve";

const UID = "11111111-1111-4111-8111-111111111111";
const wallpaperEnds = (look: PageLook) =>
  look.wallpaper.kind === "solid"
    ? [look.wallpaper.color]
    : look.wallpaper.kind === "gradient"
      ? [look.wallpaper.from, look.wallpaper.to]
      : [mix(look.wallpaper.color, "#000000", look.wallpaper.dim / 100)];

describe("resolveLook", () => {
  it.each(THEME_IDS)("%s passes the readability guard everywhere", (theme) => {
    const look = themeLook(theme, "links");
    const r = resolveLook(look);
    expect(lookChecks(look)).toEqual([]);
    const surfaces = [...wallpaperEnds(look), ...r.card];
    for (const surface of surfaces) {
      expect(contrastRatio(r.text, surface), `text on ${surface}`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(r.muted, surface), `muted on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const bg of r.buttonBg) {
      expect(contrastRatio(r.buttonText, bg)).toBeGreaterThanOrEqual(4.5);
    }
    for (const card of r.card) {
      expect(contrastRatio(r.accent, card)).toBeGreaterThanOrEqual(3);
    }
  });

  it("picks white or ink text by the wallpaper, worst end first", () => {
    expect(resolveLook(themeLook("paper", "links")).text).toBe(INK);
    expect(resolveLook(themeLook("ocean", "links")).text).toBe(WHITE);
    expect(resolveLook(themeLook("ocean", "links")).colorScheme).toBe("dark");
  });

  it("darkens an image wallpaper, and reads by its fallback color while it loads", () => {
    const image = { path: `${UID}/w.jpg`, name: "w.jpg", type: "image/jpeg", size: 1 };
    const look: PageLook = {
      ...themeLook("paper", "links"),
      wallpaper: { kind: "image", image, dim: 60, color: "#F3E8D8" },
    };
    const r = resolveLook(look);
    expect(r.background).toContain("rgba(0, 0, 0, 0.6)");
    expect(r.background).toContain("#F3E8D8");
    expect(r.text).toBe(WHITE); // light photo, darkened 60%
  });

  it("uses the text color as the accent when the button color is too faint on cards", () => {
    const look = themeLook("paper", "links");
    look.button.color = "#F6F5F1";
    expect(resolveLook(look).accent).toBe(resolveLook(look).text);
  });

  it("flags custom colors that are hard to read", () => {
    const look = themeLook("paper", "links");
    look.text = "#DDDDDD";
    look.button.color = "#EEEEEE";
    look.button.text = "#FFFFFF";
    expect(lookChecks(look).map((c) => c.id).sort()).toEqual(["button", "buttonText", "text"]);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run features/pages/look`
Expected: FAIL — `./resolve` doesn't exist.

- [ ] **Step 3: Write `features/pages/look/resolve.ts`**

```ts
import { contrastRatio } from "@/lib/color/contrast";
import type { PageLook } from "@/lib/pages/look";
import { mediaUrl } from "@/lib/pages/urls";

import { FONTS } from "./fonts";

export const WHITE = "#FFFFFF";
export const INK = "#0F172A";

const channels = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** `a` blended toward `b` by `t` (0 = a, 1 = b), as hex. */
export function mix(a: string, b: string, t: number): string {
  const A = channels(a);
  const B = channels(b);
  return `#${A.map((v, i) => Math.round(v + (B[i]! - v) * t).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}
const worst = (color: string, surfaces: string[]) =>
  Math.min(...surfaces.map((surface) => contrastRatio(color, surface)));
/** White or ink, whichever reads better on every one of the surfaces. */
const auto = (surfaces: string[]) => (worst(WHITE, surfaces) >= worst(INK, surfaces) ? WHITE : INK);

/** The colors the wallpaper shows (both gradient ends; an image darkened, read by its fallback). */
function wallpaperColors(look: PageLook): string[] {
  const w = look.wallpaper;
  if (w.kind === "solid") return [w.color];
  if (w.kind === "gradient") return [w.from, w.to];
  return [mix(w.color, "#000000", w.dim / 100)];
}

const DIRECTIONS = { down: "180deg", diagonal: "135deg", across: "90deg" };
function background(look: PageLook): string {
  const w = look.wallpaper;
  if (w.kind === "solid") return w.color;
  if (w.kind === "gradient") return `linear-gradient(${DIRECTIONS[w.direction]}, ${w.from}, ${w.to})`;
  const shade = `rgba(0, 0, 0, ${w.dim / 100})`;
  return `linear-gradient(${shade}, ${shade}), url("${mediaUrl(w.image.path)}") center / cover no-repeat, ${w.color}`;
}

const CARD_RADIUS = { square: "8px", rounded: "16px", pill: "24px" };
const BUTTON_RADIUS = { square: "8px", rounded: "16px", pill: "9999px" };

export interface ResolvedLook {
  vars: Record<string, string>;
  background: string;
  themeColor: string;
  colorScheme: "light" | "dark";
  text: string;
  muted: string;
  card: string[];
  accent: string;
  buttonBg: string[];
  buttonText: string;
}

export function resolveLook(look: PageLook): ResolvedLook {
  const walls = wallpaperColors(look);
  const text = look.text === "auto" ? auto(walls) : look.text;
  const light = auto(walls) === INK;
  // Cards: white at 92% on light wallpapers, white at 8% on dark ones (spec 6.5).
  const card = walls.map((w) => mix(w, WHITE, light ? 0.92 : 0.08));
  const cardBorder = light ? "rgb(15 23 42 / 0.1)" : "rgb(255 255 255 / 0.12)";
  const surfaces = [...walls, ...card];
  // Muted text: as soft as it can be while still reading at 4.5:1 on every surface.
  let muted = text;
  for (let t = 0.6; t <= 0.96; t += 0.04) {
    const candidate = mix(walls[0]!, text, t);
    if (worst(candidate, surfaces) >= 4.5) {
      muted = candidate;
      break;
    }
  }
  const b = look.button;
  const buttonBg =
    b.style === "solid" ? [b.color] : b.style === "soft" ? walls.map((w) => mix(w, b.color, 0.16)) : walls;
  const buttonText =
    b.text !== "auto" ? b.text : b.style === "outline" ? b.color : auto(buttonBg);
  const accent = worst(b.color, card) >= 3 ? b.color : text;
  const font = FONTS[look.font];
  const shadow =
    b.shadow === "soft"
      ? "0 6px 18px rgb(0 0 0 / 0.18)"
      : b.shadow === "hard"
        ? `4px 4px 0 ${b.style === "solid" ? text : b.color}`
        : "none";
  const vars: Record<string, string> = {
    // The app's base variables, redefined for this page only (like the navy sidebar).
    "--bg": walls[0]!,
    "--fg": text,
    "--fg-muted": muted,
    "--fg-subtle": muted,
    "--surface": light ? "rgb(255 255 255 / 0.92)" : "rgb(255 255 255 / 0.08)",
    "--surface-2": light ? "rgb(15 23 42 / 0.06)" : "rgb(255 255 255 / 0.12)",
    "--border": cardBorder,
    "--field-border": light ? "rgb(15 23 42 / 0.45)" : "rgb(255 255 255 / 0.45)",
    "--ring": text,
    "--danger": text,
    "--page-accent": accent,
    "--page-accent-fg": auto([accent]),
    "--pg-radius": CARD_RADIUS[b.shape],
    "--pg-btn-radius": BUTTON_RADIUS[b.shape],
    "--pg-btn-bg": b.style === "solid" ? b.color : b.style === "soft" ? `color-mix(in srgb, ${b.color} 16%, transparent)` : "transparent",
    "--pg-btn-fg": buttonText,
    "--pg-btn-border": b.style === "outline" ? b.color : "transparent",
    "--pg-btn-shadow": shadow,
    "--pg-heading": font.heading,
    "--pg-heading-settings": font.headingSettings,
    "--pg-body": font.body,
  };
  return {
    vars,
    background: background(look),
    themeColor: walls[0]!,
    colorScheme: light ? "light" : "dark",
    text,
    muted,
    card,
    accent,
    buttonBg,
    buttonText,
  };
}

export interface LookCheck {
  id: "text" | "buttonText" | "button";
  ratio: number;
  needed: number;
}

/** The readability guard (spec 6.1): what fails, with its ratio. */
export function lookChecks(look: PageLook): LookCheck[] {
  const r = resolveLook(look);
  const walls = wallpaperColors(look);
  const checks: LookCheck[] = [
    { id: "text", ratio: worst(r.text, walls), needed: 4.5 },
    { id: "buttonText", ratio: worst(r.buttonText, r.buttonBg), needed: 4.5 },
  ];
  if (look.button.style !== "soft") {
    checks.push({ id: "button", ratio: worst(look.button.color, walls), needed: 3 });
  }
  return checks.filter((check) => check.ratio < check.needed);
}
```

(The `FONTS` import is Task 3's; until then create `features/pages/look/fonts.ts` with Task 3's exact contents so this compiles — Task 3 adds its tests and the font files.)

- [ ] **Step 4: Run the tests**

Run: `npx vitest run features/pages/look`
Expected: PASS (the nine themes, auto text, image wallpaper, accent fallback, checks).

- [ ] **Step 5: Commit**

```bash
git add features/pages/look
git commit -m "Looks resolve to readable colors: auto text, muted text, cards, accent, buttons, the readability guard"
```

---

### Task 3: Six fonts, self-hosted, downloaded only when used

**Files:**
- Modify: `package.json`, `package-lock.json` (`@fontsource-variable/playfair-display`, `@fontsource-variable/nunito`, `@fontsource-variable/bricolage-grotesque`)
- Modify: `app/fonts.ts`, `app/layout.tsx`, `app/globals.css`
- Create/finish: `features/pages/look/fonts.ts`, `features/pages/look/fonts.test.ts`

**Interfaces:**
- Produces: `FONTS: Record<FontId, { label: string; heading: string; body: string; headingSettings: string }>`; CSS utilities `font-page-heading` and `font-page-body`.

- [ ] **Step 1: Write the failing test**

`features/pages/look/fonts.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FONT_IDS } from "@/lib/pages/look";

import { FONTS } from "./fonts";

const fontsFile = readFileSync(new URL("../../../app/fonts.ts", import.meta.url), "utf8");

describe("page fonts", () => {
  it("cover the spec's six, each from a self-hosted family", () => {
    expect(Object.keys(FONTS)).toEqual([...FONT_IDS]);
    expect(FONTS.elegant.heading).toContain("var(--font-playfair)");
    expect(FONTS.friendly.body).toContain("var(--font-nunito)");
    expect(FONTS.modern.heading).toContain("var(--font-bricolage)");
    expect(FONTS.bold.headingSettings).toBe('"wdth" 125');
    expect(FONTS.typewriter.body).toContain("var(--font-plex-mono)");
  });

  it("aren't preloaded: a visitor downloads only the faces the page uses", () => {
    for (const name of ["playfair", "nunito", "bricolage"]) {
      const block = fontsFile.slice(fontsFile.indexOf(`--font-${name}`) - 400, fontsFile.indexOf(`--font-${name}`) + 200);
      expect(block, name).toContain("preload: false");
    }
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run features/pages/look/fonts.test.ts`
Expected: FAIL — no `--font-playfair` in `app/fonts.ts`.

- [ ] **Step 3: Add the fonts**

Run: `npm install @fontsource-variable/playfair-display @fontsource-variable/nunito @fontsource-variable/bricolage-grotesque`, then `ls node_modules/@fontsource-variable/{playfair-display,nunito,bricolage-grotesque}/files | grep latin-wght-normal` to get the exact file names.

`app/fonts.ts` (the file names from the `ls`):

```ts
/** Page font "Elegant": headings. Not preloaded — only pages that use it download it. */
export const playfair = localFont({
  src: "../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2",
  variable: "--font-playfair",
  weight: "400 900",
  display: "swap",
  preload: false,
});

/** Page font "Friendly": headings and text. */
export const nunito = localFont({
  src: "../node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2",
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
  preload: false,
});

/** Page font "Modern": headings. */
export const bricolage = localFont({
  src: "../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
  preload: false,
});
```

`app/layout.tsx`: add `${playfair.variable} ${nunito.variable} ${bricolage.variable}` to `<html className>`.

`features/pages/look/fonts.ts`:

```ts
import type { FontId } from "@/lib/pages/look";

const sans = "ui-sans-serif, system-ui, sans-serif";
const serif = "ui-serif, Georgia, serif";
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const plex = `var(--font-plex-sans), ${sans}`;

/** Spec 6.3: the family for the title, headings and buttons, and its reading partner. */
export const FONTS: Record<
  FontId,
  { label: string; heading: string; body: string; headingSettings: string }
> = {
  clean: { label: "Clean", heading: plex, body: plex, headingSettings: "normal" },
  bold: { label: "Bold", heading: `var(--font-archivo), ${sans}`, body: plex, headingSettings: '"wdth" 125' },
  elegant: { label: "Elegant", heading: `var(--font-playfair), ${serif}`, body: plex, headingSettings: "normal" },
  friendly: { label: "Friendly", heading: `var(--font-nunito), ${sans}`, body: `var(--font-nunito), ${sans}`, headingSettings: "normal" },
  modern: { label: "Modern", heading: `var(--font-bricolage), ${sans}`, body: plex, headingSettings: "normal" },
  typewriter: { label: "Typewriter", heading: `var(--font-plex-mono), ${mono}`, body: `var(--font-plex-mono), ${mono}`, headingSettings: "normal" },
};
```

`app/globals.css`, after the custom variants:

```css
/* A hosted page's fonts (set from its look on the page's root). */
@utility font-page-heading {
  font-family: var(--pg-heading);
  font-variation-settings: var(--pg-heading-settings);
}
@utility font-page-body {
  font-family: var(--pg-body);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run features/pages/look && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/fonts.ts app/layout.tsx app/globals.css features/pages/look
git commit -m "Six page fonts, self-hosted and loaded only by pages that use them"
```

---

### Task 4: The new renderer

**Files:**
- Modify: `features/pages/parts.tsx` (replace `PageShell`; new `PageFrame`, `PageHeader`, `SocialRow`; `PageCard`, `PageLink`/`pageButton` from the look)
- Modify: `features/pages/PageView.tsx`, `features/pages/FeedbackForm.tsx`, `features/pages/CopyCode.tsx`
- Test: `features/pages/PageView.test.tsx`

**Interfaces:**
- Consumes: `resolveLook` (Task 2), the `font-page-*` utilities (Task 3), `page.look` (Task 1).
- Produces:
  - `PageFrame({ look, preview, children })` — the wallpaper (`background`), the variables, `color-scheme`, `@container`, `font-page-body text-fg`, a centered column (`data-page-column`, `max-w-[560px]`, `px-4 pt-8 pb-6 @min-[40rem]:pt-14`), and the footer link "Made with Ziplume" (a `span` in preview). Root element: `main` on the public page, `div` in preview.
  - `PageHeader({ look, layout, image, imageAlt, art?, large?, title, sub?, eyebrow?, badge? })` with `layout: "classic" | "hero" | "banner"`: Hero without an image draws Classic; the title is the page's only `h1`.
  - `SocialRow({ socials, preview })` (today's `SocialLinks`, renamed).
  - `pageButton.primary` = the look's button (`bg-(--pg-btn-bg) text-(--pg-btn-fg) border-(--pg-btn-border) rounded-(--pg-btn-radius) shadow-(--pg-btn-shadow) font-page-heading`); `pageButton.secondary` = a card-colored button with the same radius.

- [ ] **Step 1: Write the failing render tests**

Append to `features/pages/PageView.test.tsx` (import `PAGE_TYPE_IDS`, `themeLook`):

```tsx
const UID = "00000000-0000-0000-0000-000000000000";
const photo = { path: `${UID}/photo.jpg`, name: "photo.jpg", type: "image/jpeg", size: 1 };

/** A page of every type with its header image filled, where it has one. */
function filled(type: PageTypeId) {
  const page = PAGE_DEFAULTS[type]() as Record<string, unknown>;
  for (const key of ["avatar", "photo", "logo", "cover", "image", "icon"]) {
    if (key in page) page[key] = photo;
  }
  return page;
}

describe("PageView looks", () => {
  for (const type of PAGE_TYPE_IDS) {
    for (const header of ["classic", "hero"] as const) {
      for (const theme of ["paper", "midnight"] as const) {
        it(`${type}: ${header} on ${theme} has one h1 and its page landmark`, () => {
          const page = { ...filled(type), look: { ...themeLook(theme, type), header } };
          const { container } = view(type, page, false);
          expect(container.querySelectorAll("h1")).toHaveLength(1);
          expect(container.querySelector("main")).not.toBeNull();
          expect(screen.getByRole("link", { name: /Made with Ziplume/ })).toBeInTheDocument();
        });
      }
    }
  }

  it("sets the look on the page's own root, so the visitor's theme can't reach it", () => {
    const { container } = view("links", { ...PAGE_DEFAULTS.links(), look: themeLook("midnight", "links") }, false);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--fg")).toBe("#FFFFFF");
    expect(root.style.background).toContain("rgb(7, 11, 26)");
  });

  it("draws Classic when Hero has no image", () => {
    const page = { ...PAGE_DEFAULTS.links(), title: "Me", look: { ...themeLook("paper", "links"), header: "hero" as const } };
    const { container } = view("links", page, false);
    expect(container.querySelector("[data-header='classic']")).not.toBeNull();
  });

  it("puts social icons under the header or at the end, as the look says", () => {
    const socials = [{ network: "instagram" as const, url: "@me" }];
    const top = view("links", { ...PAGE_DEFAULTS.links(), title: "Me", socials, look: { ...themeLook("paper", "links"), socials: "top" as const } }, false);
    const list = top.container.querySelector("[data-socials]")!;
    const nav = top.container.querySelector("nav[aria-label='Links']")!;
    expect(list.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    top.unmount();
    const bottom = view("links", { ...PAGE_DEFAULTS.links(), title: "Me", socials, look: { ...themeLook("paper", "links"), socials: "bottom" as const } }, false);
    const list2 = bottom.container.querySelector("[data-socials]")!;
    const nav2 = bottom.container.querySelector("nav[aria-label='Links']")!;
    expect(nav2.compareDocumentPosition(list2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the preview's frame out of the landmarks", () => {
    const { container } = view("links", PAGE_DEFAULTS.links(), true);
    expect(container.querySelector("main")).toBeNull();
  });
});
```

Update the first `PageView` test ("sizes itself from its own width"): the `@container` is on the frame's root, unchanged in meaning.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run features/pages/PageView.test.tsx`
Expected: FAIL — Feedback and Coupon have no `h1`, no footer link in the page, no `[data-header]`, no variables on the root.

- [ ] **Step 3: Write the frame, header and buttons**

In `features/pages/parts.tsx`, replace `PageShell` with:

```tsx
/** A hosted page's frame: its wallpaper and look, one centered column, and the footer. */
export function PageFrame({
  look,
  preview = false,
  children,
}: {
  look: PageLook;
  preview?: boolean;
  children: ReactNode;
}) {
  const resolved = resolveLook(look);
  const Root = preview ? "div" : "main";
  const style = {
    ...resolved.vars,
    background: resolved.background,
    colorScheme: resolved.colorScheme,
  } as CSSProperties;
  return (
    <Root
      style={style}
      data-page-frame
      className="@container flex min-h-full flex-col font-page-body text-fg"
    >
      <div
        data-page-column
        className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-4 px-4 pt-8 pb-6 @min-[40rem]:pt-14"
      >
        {children}
      </div>
      <footer className="flex justify-center px-4 pt-2 pb-8">
        {preview ? (
          <span className="inline-flex items-center gap-2 text-sm text-fg-muted">Made with Ziplume</span>
        ) : (
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-fg-muted underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-(--ring)"
          >
            Made with Ziplume · free QR codes
          </a>
        )}
      </footer>
    </Root>
  );
}

/**
 * The top of a page: Classic (the image centered above the title), Hero (the image across the
 * top, fading into the wallpaper; Classic when there's no image) or Banner (Coupon and Event).
 * The title is the page's one h1.
 */
export function PageHeader({
  look,
  layout,
  image,
  imageAlt,
  art = false,
  large = false,
  title,
  sub,
  eyebrow,
  badge,
}: {
  look: PageLook;
  layout: "classic" | "hero" | "banner";
  image: Media | null;
  imageAlt: string;
  /** Square art (Audio's cover, App's icon) instead of the look's circle or rounded shape. */
  art?: boolean;
  /** A larger Classic image (Audio's cover art). */
  large?: boolean;
  title: ReactNode;
  sub?: ReactNode;
  eyebrow?: ReactNode;
  /** Business Hero: the logo overlapping the cover. */
  badge?: Media | null;
}) {
  const drawn = layout === "hero" && !image ? "classic" : layout;
  const heading = (
    <div className="flex flex-col items-center gap-1 text-center">
      {eyebrow && <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{eyebrow}</p>}
      <h1 className="font-page-heading text-3xl font-bold tracking-tight text-balance text-fg">{title}</h1>
      {sub && <p className="text-[15px] text-balance text-fg-muted">{sub}</p>}
    </div>
  );
  if (drawn === "banner") {
    return (
      <div data-header="banner" className="flex flex-col gap-4">
        {image && (
          <MediaImage media={image} alt={imageAlt} eager className="aspect-[16/9] w-full rounded-(--pg-radius) object-cover" />
        )}
        {heading}
      </div>
    );
  }
  if (drawn === "hero") {
    return (
      <div data-header="hero" className="-mx-4 -mt-8 flex flex-col items-center gap-4 @min-[40rem]:-mt-14">
        <div className="relative aspect-[16/10] w-full overflow-hidden @min-[40rem]:aspect-[16/7]">
          <MediaImage media={image!} alt={imageAlt} eager className="size-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_55%,var(--bg))]" />
        </div>
        {badge && (
          <MediaImage media={badge} alt="" eager className="-mt-16 size-24 rounded-(--pg-radius) border-4 border-(--bg) bg-(--bg) object-contain" />
        )}
        <div className="px-4">{heading}</div>
      </div>
    );
  }
  return (
    <div data-header="classic" className="flex flex-col items-center gap-4">
      {image ? (
        <MediaImage
          media={image}
          alt={imageAlt}
          eager
          className={cn(
            large ? "size-56" : "size-28",
            "shrink-0 object-cover shadow-card",
            art ? "rounded-(--pg-radius)" : look.shape === "circle" ? "rounded-full" : "rounded-3xl",
          )}
        />
      ) : null}
      {heading}
    </div>
  );
}
```

`PageCard`: `rounded-(--pg-radius) border border-border bg-surface p-5 shadow-card backdrop-blur-sm @min-[40rem]:p-6`.

`pageButton`:

```ts
const buttonBase =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-(--pg-btn-radius) border-2 px-5 py-3 text-center font-page-heading text-[15px] font-semibold transition-[filter,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring) active:scale-[0.99] [&_svg]:size-5 [&_svg]:shrink-0";

export const pageButton = {
  /** The look's button: color, style, shape and shadow. */
  primary: cn(buttonBase, "border-(--pg-btn-border) bg-(--pg-btn-bg) text-(--pg-btn-fg) shadow-(--pg-btn-shadow) hover:brightness-110"),
  /** Quieter actions (Calendar, Download): the card's color. */
  secondary: cn(buttonBase, "border-border bg-surface text-fg hover:bg-surface-2"),
};
```

`Avatar`, `Heading` and `PageShell` go (their callers use `PageHeader`); `SocialLinks` becomes `SocialRow` with `data-socials` on its `ul`; `EmptyNote` and `Prose` stay. In `FeedbackForm.tsx` and `CopyCode.tsx` swap `font-display` for `font-page-heading` where present (CopyCode keeps `font-mono` for the code).

- [ ] **Step 4: Rebuild each type's view on them**

In `PageView.tsx`, every view starts from `const look = page.look;` and returns `<PageFrame look={look} preview={preview} header={/* Hero only */}>`. The headers, per spec 6.4 (everything below each header keeps today's markup; `PageLink` variants follow ruling 4):

- **Link list:** `PageHeader layout={look.header} image={page.avatar} imageAlt={page.title || "Profile picture"} title={page.title || "Your name"} sub={page.bio || undefined}`; `look.socials === "top"` → `SocialRow` right after the header, else after the links; every link `variant="primary"`.
- **Contact page:** image `page.photo`, title the name, sub the role; socials by `look.socials`.
- **Business:** Classic → image `page.logo`, `art` (logos keep the card's corners); Hero → image `page.cover`, `badge={page.logo}`; title name, sub tagline. The Call/Email/Directions grid stays in a `PageCard` under the header; every button `variant="primary"`; socials by `look.socials`.
- **Menu:** image `page.logo`, `art`; title name; sub description.
- **Feedback:** image `page.logo`, `art`; title `page.business || "Your business"` (now the `h1`); the form card follows.
- **Audio:** Classic → image `page.cover`, `art`, `large` (square art); Hero → cover across the top; title, sub artist. The player and Listen button follow in a `PageCard`.
- **App:** always Classic; image `page.icon`, `art`; title name; sub description; the store buttons follow.
- **Coupon:** `layout="banner"` image `page.image`, eyebrow `page.business`, title `page.headline || page.offer || "Your offer"` (the `h1`); the big offer line shows only when there's a headline.
- **Event:** `layout="banner"` image `page.image`, eyebrow organizer, title the event name; the When/Where list and buttons follow in a `PageCard`.
- **PDF, Images, Video:** no header setting: `PageHeader layout="classic" image={null}` with the title (`h1`) and description as sub; Video's player sits in a `PageCard` *below* the header (no negative margins: this also fixes the cover overhang on phones).

Every view renders `<PageHeader … />` as its column's first child; the Hero reaches the column's edges and top itself (`-mx-4 -mt-8 @min-[40rem]:-mt-14`, the column's own padding).

- [ ] **Step 5: Run the tests**

Run: `npx vitest run features/pages features/generator features/dashboard features/create`
Expected: PASS. Existing tests that looked for the band or `Heading` are updated to the header's `h1`.

- [ ] **Step 6: Commit**

```bash
git add features/pages
git commit -m "The new page renderer: each page drawn from its look, Classic, Hero and Banner headers, one h1 per page"
```

---

### Task 5: The public page takes its look

**Files:**
- Create: `lib/pages/meta.ts`, `lib/pages/meta.test.ts`
- Modify: `app/p/layout.tsx`, `app/p/[slug]/page.tsx`, `app/p/[slug]/page.test.tsx`

**Interfaces:**
- Consumes: `resolveLook` (Task 2) — imported by the route, not by `lib/`.
- Produces: `pageDescription(type, page): string | null`; `pageImage(type, page): Media | null`.

- [ ] **Step 1: Write the failing tests**

`lib/pages/meta.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { pageDescription, pageImage } from "./meta";
import { PAGE_DEFAULTS } from "./types";

const UID = "11111111-1111-4111-8111-111111111111";
const media = { path: `${UID}/a.jpg`, name: "a.jpg", type: "image/jpeg", size: 1 };

describe("page metadata", () => {
  it("describes a page by its bio, tagline or description", () => {
    expect(pageDescription("links", { ...PAGE_DEFAULTS.links(), bio: "Cafe in town" })).toBe("Cafe in town");
    expect(pageDescription("business", { ...PAGE_DEFAULTS.business(), tagline: "Fresh bread" })).toBe("Fresh bread");
    expect(pageDescription("event", { ...PAGE_DEFAULTS.event(), description: "A fair" })).toBe("A fair");
    expect(pageDescription("links", PAGE_DEFAULTS.links())).toBeNull();
  });

  it("shares the header image when the page has one", () => {
    expect(pageImage("links", { ...PAGE_DEFAULTS.links(), avatar: media })).toEqual(media);
    expect(pageImage("business", { ...PAGE_DEFAULTS.business(), logo: media })).toEqual(media);
    expect(pageImage("pdf", PAGE_DEFAULTS.pdf())).toBeNull();
  });
});
```

`app/p/[slug]/page.test.tsx` — add:

```ts
import { generateMetadata, generateViewport } from "./page";

  it("color the browser by the page's wallpaper, with its description and share image", async () => {
    vi.mocked(getPublicPage).mockResolvedValue({
      type: "links",
      content: sanitizePage("links", { title: "Diner", bio: "Breakfast all day", look: themeLook("midnight", "links") }),
      locked: false,
    } as never);
    const viewport = await generateViewport({ params: Promise.resolve({ slug: "DINER1" }) } as never);
    expect(viewport).toMatchObject({ themeColor: "#070B1A", colorScheme: "dark" });
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "DINER1" }) } as never);
    expect(meta.description).toBe("Breakfast all day");
  });
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/pages/meta.test.ts "app/p"`
Expected: FAIL — no `./meta`, no `generateViewport`.

- [ ] **Step 3: Write it**

`lib/pages/meta.ts`:

```ts
import type { PageTypeId } from "@/lib/qr/types";

import type { Media, PageContentMap } from "./types";

const DESCRIBED_BY = ["bio", "tagline", "description", "about"];
const IMAGE_FROM = ["avatar", "photo", "cover", "image", "logo", "icon"];

/** A short description for link previews: the page's bio, tagline or description. */
export function pageDescription<K extends PageTypeId>(_type: K, page: PageContentMap[K]): string | null {
  const p = page as unknown as Record<string, unknown>;
  const text = DESCRIBED_BY.map((key) => (typeof p[key] === "string" ? (p[key] as string).trim() : "")).find(Boolean);
  return text ? text.slice(0, 200) : null;
}

/** The page's header image, for link previews. */
export function pageImage<K extends PageTypeId>(_type: K, page: PageContentMap[K]): Media | null {
  const p = page as unknown as Record<string, unknown>;
  for (const key of IMAGE_FROM) {
    const value = p[key] as Media | null | undefined;
    if (value && typeof value === "object" && "path" in value) return value;
  }
  return null;
}
```

`app/p/[slug]/page.tsx`:
- `generateMetadata` adds `description` and `openGraph.images: [mediaUrl(image.path)]` when present.
- a new `generateViewport`:
  ```ts
  export async function generateViewport({ params }: PageProps<"/p/[slug]">): Promise<Viewport> {
    const { slug } = await params;
    const page = isValidSlug(slug) ? await getPublicPage(slug) : null;
    if (!page || page === "unavailable" || page.locked) return {};
    const look = resolveLook(page.content.look);
    return { themeColor: look.themeColor, colorScheme: look.colorScheme };
  }
  ```
- `Notice` paints the Ziplume look itself (the layout no longer does): wrap it in `<div className="flex min-h-dvh flex-col bg-bg">…</div>` and add the "Made with Ziplume" footer link under it.

`app/p/layout.tsx`: drop the app background and the footer (the page draws both):

```tsx
/** Hosted pages: no app chrome; each page paints its own wallpaper and footer. */
export default function HostedPageLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
```

`PageView`'s root on `/p` is the frame's `main` with `min-h-full`; give the route's wrapper `flex-1` (it already is a flex column) so the wallpaper fills the screen.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/pages "app/p" features/pages`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pages/meta.ts lib/pages/meta.test.ts app/p
git commit -m "The public page paints its own look: wallpaper, browser color, description and share image"
```

---

### Task 6: Looks in the browser

**Files:**
- Modify: `e2e/accounts/fixtures.ts`, `e2e/accounts/global-setup.ts`
- Create: `e2e/accounts/looks.spec.ts`
- Modify: `e2e/accounts/create.spec.ts`, `e2e/accounts/phone-layout.spec.ts`, `e2e/server.spec.ts` (only if it measured the old band)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Seed one page per theme and one per type on its default theme**

`e2e/accounts/fixtures.ts`:

```ts
/** A Link list in each theme, and each type on its own default theme (no `look` = its theme). */
export const LOOK_PAGES: { type: string; slug: string; content: Record<string, unknown> }[] = [
  ...["ziplume", "paper", "midnight", "ocean", "sunset", "grape", "forest", "blush", "sand"].map(
    (theme) => ({
      type: "links",
      slug: `LOOK-${theme.toUpperCase()}`,
      content: {
        title: `Theme ${theme}`,
        bio: "Every theme stays readable.",
        links: [{ label: "First link", url: "https://example.com/1" }, { label: "Second link", url: "https://example.com/2" }],
        socials: [{ network: "instagram", url: "@ziplume" }],
        look: { theme },
      },
    }),
  ),
  ...PHONE_PAGES.map((page) => ({
    ...page,
    slug: page.slug.replace("PHONE-", "TYPE-"),
    content: { ...page.content, look: { theme: TYPE_THEMES[page.type] } },
  })),
];
```

with `const TYPE_THEMES: Record<string, string> = { links: "ziplume", app: "ziplume", vcard: "paper", business: "paper", feedback: "paper", pdf: "paper", menu: "sand", coupon: "sunset", event: "grape", images: "midnight", video: "midnight", audio: "ocean" };` (a `look` with only a theme sanitizes to that whole theme). `global-setup.ts` inserts `LOOK_PAGES` for the PAGES user exactly like `PHONE_PAGES`.

- [ ] **Step 2: Write the e2e**

`e2e/accounts/looks.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { LOOK_PAGES } from "./fixtures";

async function background(page: Page) {
  return page.locator("[data-page-frame]").evaluate((el) => getComputedStyle(el).backgroundImage + getComputedStyle(el).backgroundColor);
}

test.describe("page looks", () => {
  for (const { slug } of LOOK_PAGES) {
    test(`/p/${slug} reads well on a phone`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`p/${slug}`);
      await expect(page.locator("h1")).toHaveCount(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    });
  }

  test("a page looks the same to a visitor in dark mode", async ({ page }) => {
    await page.goto("p/LOOK-PAPER");
    const light = await background(page);
    const lightText = await page.locator("h1").evaluate((el) => getComputedStyle(el).color);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    expect(await background(page)).toBe(light);
    expect(await page.locator("h1").evaluate((el) => getComputedStyle(el).color)).toBe(lightText);
  });

  test("a page shows its theme's wallpaper and font, and colors the browser", async ({ page }) => {
    await page.goto("p/LOOK-OCEAN");
    expect(await background(page)).toContain("linear-gradient");
    expect(await page.locator('meta[name="theme-color"]').getAttribute("content")).toBe("#095E77");
    await page.goto("p/LOOK-FOREST");
    const family = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family.toLowerCase()).toContain("playfair");
  });
});
```

`e2e/accounts/create.spec.ts` "the page preview lays out at each device's real width": measure the page column's top padding instead of the old band:

```ts
    const column = preview.getByRole("region", { name: "Page preview" }).locator("[data-page-column]");
    const top = () => column.evaluate((el) => getComputedStyle(el).paddingTop);
    expect(await top()).toBe("32px");
    // Tablet and Desktop: 56px; Phone again: 32px (the same steps as before).
```

`e2e/accounts/phone-layout.spec.ts`: the hosted-page tests wait for the footer link (unchanged name) — keep them; the public 700px check measures `[data-page-column]` padding-top `56px` instead of the band.

- [ ] **Step 3: Run the e2e**

Run: `npm run test:e2e:accounts -- -g "page looks|reads well|real width|hosted page|ends with its footer|700"`
Expected: PASS. An axe failure on a theme is a real finding: fix the colors in `resolve.ts` (and its unit test), not the test.

- [ ] **Step 4: Run every suite**

Run, in order:
- `npm run lint && npx tsc --noEmit && npx prettier --check .` (only `.superpowers/` noise)
- `npm test`
- `npm run test:e2e:accounts -- --no-build`
- `npm run build && npm run test:e2e`

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add e2e
git commit -m "Browser tests: every theme and every type's look on a phone, the same in dark mode, wallpaper, font and browser color"
```
