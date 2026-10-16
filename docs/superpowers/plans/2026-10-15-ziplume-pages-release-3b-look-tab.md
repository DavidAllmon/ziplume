# Pages release 3b: the Look tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owners set their page's look in the editor's Look tab — theme, header, wallpaper (including a photo), text, buttons and social icons — with Undo, Reset to theme and readability warnings that fix themselves in one click; the type gallery shows each page type as a small drawing.

**Architecture:** Pure helpers (`applyTheme`, the per-type options, `fixLook`, `averagePixels`) sit beside the look data and its resolver. A `LookEditor` made of one card per spec 6.1 group replaces the Look tab's color picker; each control calls `onChange` with a whole new page, so the live preview, drafts and Save behave exactly as for content. A shared `LookSketch` draws a tiny page from a look, for the theme tiles and the gallery.

**Tech Stack:** React 19, Headless UI 2.2 (RadioGroup via `SegmentedControl`), Tailwind 4, the 3a look modules, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-ziplume-pages-redesign-design.md` — section 6.1 (and 6.4's header rules), section 7's release 3 e2e ("pick a theme in the editor, create, and check that `/p` shows its wallpaper and font"), and the gallery drawings deferred from release 2a (5.1). Release 3a is live.

## Global Constraints

- Order of the Look tab (6.1): "1. Theme … 2. Header … 3. Wallpaper … 4. Text … 5. Buttons … 6. Social icons (Link list, Contact page, Business)". "**Reset to theme** puts every field back to the current theme's values."
- Theme: "nine tiles (6.2). Picking one sets the wallpaper, font, buttons and text color in one go, with an Undo toast. The header layout and image shape stay as they were."
- Header: "layout, Classic or Hero (6.4), and the image shape for Classic, Circle or Rounded." 6.4: Link list, Contact page, Business, Menu, Feedback, Audio have Classic and Hero; Coupon and Event are always a banner; App is Classic only; PDF, Images and Video have no header setting. "With no image, the page shows Classic and the Look tab says "Add a photo to use Hero"."
- Wallpaper: "Solid (swatches plus a custom color), Gradient (two colors and a direction: down, diagonal or across), or Image (an upload, plus a Darken slider from 0 to 80%)."
- Text: "font (6.3) and text color, Auto (recommended) or custom." Buttons: "shape (Square, Rounded, Pill), style (Solid, Outline, Soft), shadow (None, Soft, Hard), button color, and button text color (Auto or custom)." Social icons: "under the header or at the bottom."
- Readability guard: "When a custom choice is hard to read, a warning appears under that control with a one-click fix" for text on the wallpaper (4.5:1), button text on the button (4.5:1), a solid button or an outline border on the wallpaper (3:1).
- Phone controls stay 44px tall (`SegmentedControl size="touch"`); axe clean in light and dark at 390, 820 and 1280px.

## Rulings made in this plan

1. **Reset to theme resets what themes set** (wallpaper, font, text color, buttons); header layout, image shape and social icons stay, the same fields Theme keeps. *Cost if wrong:* three more fields in `applyTheme`.
2. **The buttons warning's fix changes the color, not the style.** The mockup's "Use solid buttons" wouldn't help: a solid button is held to the same 3:1 on the wallpaper. The fix moves the button color toward the page's text color until it stands out ("Make buttons stand out").
3. **A photo wallpaper's fallback color is the photo's average color**, taken from the file before upload; it decides Auto text while the photo loads and on slow connections (the 3a review's concern).
4. **Choosing Photo keeps the current wallpaper until a photo is uploaded**; choosing Gradient starts from the current color and a darker step of it; choosing Color starts from the wallpaper's first color.
5. **The image shape option shows only where the look's shape is used** (Link list's profile picture, Contact page's photo); logos, cover art and app icons keep their own corners.
6. **The home page** keeps its color picker (Phase 5 owns its layout).

## Review Focus

1. **Undo after several changes:** Undo restores the look from just before that theme pick, not an older or newer one, and a second theme pick replaces the first Undo. — Test in Task 3.
2. **Switching wallpaper kinds back and forth** must never leave an invalid wallpaper (an image kind without an image, a gradient with one color). — Test in Task 4.
3. **A photo upload that fails or a file that isn't an image** must leave the wallpaper as it was, with the error shown. — Test in Task 4.
4. **Custom colors typed half-way** (`#12`) must not reach the page; only complete colors apply. — Test in Task 4 (the `ColorField` contract, through the Look tab).
5. **The Look tab on a type without a header setting** (PDF, Images, Video) or without socials must not show those cards. — Test in Task 3.

---

## File structure

| File | Responsibility |
|---|---|
| `lib/pages/look.ts` (+ test) | `applyTheme` |
| `features/pages/look/options.ts` (+ test) | `headerChoice`, `hasShape`, `hasSocials`, `heroImage` per type |
| `features/pages/look/fixes.ts` (+ test) | `fixLook(look, id)` |
| `features/pages/look/average.ts` (+ test) | `averagePixels`, `averageColor(file)` |
| `features/pages/look/LookSketch.tsx` | a tiny page drawn from a look |
| `components/ui/Toast.tsx` (+ test) | an optional action button (Undo) |
| `features/pages/editor/look/LookEditor.tsx` (+ test) | the Look tab: one card per 6.1 group |
| `features/pages/editor/look/ThemeCard.tsx`, `HeaderCard.tsx`, `WallpaperCard.tsx`, `TextCard.tsx`, `ButtonsCard.tsx`, `SocialsCard.tsx`, `Warning.tsx` | the cards and the per-control warning |
| `features/create/sections/LookSection.tsx`, `features/create/EditorLayout.tsx` | the Look tab renders `LookEditor` |
| `features/create/gallery/TypeGallery.tsx` (+ test) | page types show a `LookSketch` |
| `e2e/accounts/create.spec.ts`, `e2e/accounts/app.spec.ts` | theme to `/p`, photo wallpaper, a warning's fix, axe |

---

### Task 1: The look's helpers

**Files:**
- Modify: `lib/pages/look.ts`, `lib/pages/look.test.ts`
- Create: `features/pages/look/options.ts`, `features/pages/look/options.test.ts`
- Create: `features/pages/look/fixes.ts`, `features/pages/look/fixes.test.ts`
- Create: `features/pages/look/average.ts`, `features/pages/look/average.test.ts`

**Interfaces:**
- Produces:
  - `applyTheme(look: PageLook, theme: ThemeId): PageLook` — the theme's wallpaper, font, text and buttons; header, shape and socials kept.
  - `headerChoice(type: PageTypeId): boolean`, `hasShape(type): boolean`, `hasSocials(type): boolean`, `heroImage(type, page): Media | null`.
  - `fixLook(look: PageLook, id: LookCheck["id"]): PageLook`.
  - `averagePixels(data: ArrayLike<number>): string`; `averageColor(file: Blob): Promise<string | null>`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/pages/look.test.ts`:

```ts
describe("applyTheme", () => {
  it("sets the theme's wallpaper, font, text and buttons, keeping header, shape and socials", () => {
    const look = { ...themeLook("paper", "links"), header: "hero" as const, shape: "rounded" as const, socials: "bottom" as const, font: "typewriter" as const };
    const next = applyTheme(look, "ocean");
    expect(next).toEqual({ ...themeLook("ocean", "links"), header: "hero", shape: "rounded", socials: "bottom" });
  });
});
```

`features/pages/look/options.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { PAGE_DEFAULTS } from "@/lib/pages/types";

import { hasShape, hasSocials, headerChoice, heroImage } from "./options";

const UID = "11111111-1111-4111-8111-111111111111";
const media = { path: `${UID}/a.jpg`, name: "a.jpg", type: "image/jpeg", size: 1 };

describe("look options per type", () => {
  it("offer Classic or Hero where spec 6.4 does", () => {
    expect(["links", "vcard", "business", "menu", "feedback", "audio"].every((t) => headerChoice(t as never))).toBe(true);
    expect(["coupon", "event", "app", "pdf", "images", "video"].some((t) => headerChoice(t as never))).toBe(false);
  });

  it("offer the image shape and social icons only where the page uses them", () => {
    expect(hasShape("links") && hasShape("vcard")).toBe(true);
    expect(hasShape("business") || hasShape("audio")).toBe(false);
    expect(["links", "vcard", "business"].every((t) => hasSocials(t as never))).toBe(true);
    expect(hasSocials("menu")).toBe(false);
  });

  it("find the Hero's image: the profile picture, photo, cover, logo or cover art", () => {
    expect(heroImage("links", { ...PAGE_DEFAULTS.links(), avatar: media })).toEqual(media);
    expect(heroImage("business", { ...PAGE_DEFAULTS.business(), logo: media })).toBeNull();
    expect(heroImage("business", { ...PAGE_DEFAULTS.business(), cover: media })).toEqual(media);
    expect(heroImage("audio", PAGE_DEFAULTS.audio())).toBeNull();
  });
});
```

`features/pages/look/fixes.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { themeLook } from "@/lib/pages/look";

import { fixLook } from "./fixes";
import { lookChecks } from "./resolve";

describe("fixLook", () => {
  it("makes each failing check pass in one step", () => {
    const look = themeLook("paper", "links");
    look.text = "#DDDDDD";
    look.button.color = "#EEEEEE";
    look.button.text = "#F5F5F5";
    expect(lookChecks(look).map((c) => c.id).sort()).toEqual(["button", "buttonText", "text"]);
    let fixed = look;
    for (const id of ["text", "buttonText", "button"] as const) fixed = fixLook(fixed, id);
    expect(lookChecks(fixed)).toEqual([]);
    expect(fixed.text).toBe("auto");
    expect(fixed.button.text).toBe("auto");
    expect(fixed.button.color).not.toBe("#EEEEEE");
  });

  it("leaves a look that already passes alone", () => {
    const look = themeLook("ocean", "links");
    expect(fixLook(look, "button")).toEqual(look);
  });
});
```

`features/pages/look/average.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { averagePixels } from "./average";

describe("averagePixels", () => {
  it("averages RGBA pixels into a hex color, ignoring see-through ones", () => {
    const red = [255, 0, 0, 255];
    const blue = [0, 0, 255, 255];
    const clear = [0, 255, 0, 0];
    expect(averagePixels([...red, ...blue, ...clear])).toBe("#800080");
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/pages/look.test.ts features/pages/look`
Expected: FAIL — `applyTheme`, `./options`, `./fixes`, `./average` don't exist.

- [ ] **Step 3: Write the helpers**

`lib/pages/look.ts`:

```ts
/** A theme's wallpaper, font, text color and buttons on this look; header, shape and socials stay. */
export function applyTheme(look: PageLook, theme: ThemeId): PageLook {
  return { ...look, theme, ...structuredClone(THEMES[theme].look) };
}
```

`features/pages/look/options.ts`:

```ts
import type { Media, PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

// Which Look tab controls a page type has (spec 6.1, 6.4).

const HEADER_CHOICE: PageTypeId[] = ["links", "vcard", "business", "menu", "feedback", "audio"];

/** Classic or Hero: Coupon and Event are always a banner, App is Classic, PDF/Images/Video have none. */
export const headerChoice = (type: PageTypeId) => HEADER_CHOICE.includes(type);
/** Circle or Rounded: only where the image is a person (profile picture, contact photo). */
export const hasShape = (type: PageTypeId) => type === "links" || type === "vcard";
/** Under the header or at the bottom: the types with social icons. */
export const hasSocials = (type: PageTypeId) =>
  type === "links" || type === "vcard" || type === "business";

const HERO_IMAGE: Partial<Record<PageTypeId, string>> = {
  links: "avatar",
  vcard: "photo",
  business: "cover",
  menu: "logo",
  feedback: "logo",
  audio: "cover",
};

/** The image the Hero would show; without one, the page draws Classic. */
export function heroImage<K extends PageTypeId>(type: K, page: PageContentMap[K]): Media | null {
  const key = HERO_IMAGE[type];
  if (!key) return null;
  const value = (page as unknown as Record<string, unknown>)[key];
  return value && typeof value === "object" ? (value as Media) : null;
}
```

`features/pages/look/fixes.ts`:

```ts
import { contrastRatio } from "@/lib/color/contrast";
import type { PageLook } from "@/lib/pages/look";

import { lookChecks, mix, resolveLook, type LookCheck } from "./resolve";

/** The one-click fix for a failing readability check (spec 6.1). */
export function fixLook(look: PageLook, id: LookCheck["id"]): PageLook {
  if (!lookChecks(look).some((check) => check.id === id)) return look;
  if (id === "text") return { ...look, text: "auto" };
  if (id === "buttonText") return { ...look, button: { ...look.button, text: "auto" } };
  // Buttons that don't stand out: move the color toward the page's text color until they do.
  const target = resolveLook({ ...look, text: "auto" }).text;
  for (let step = 1; step <= 10; step++) {
    const color = mix(look.button.color, target, step / 10);
    const next = { ...look, button: { ...look.button, color } };
    if (!lookChecks(next).some((check) => check.id === "button")) return next;
  }
  return { ...look, button: { ...look.button, color: target } };
}
```

(`contrastRatio` isn't needed — drop the import if lint flags it.)

`features/pages/look/average.ts`:

```ts
/** The average of RGBA pixel data as a hex color; see-through pixels don't count. */
export function averagePixels(data: ArrayLike<number>): string {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    r += data[i]!; g += data[i + 1]!; b += data[i + 2]!; n++;
  }
  if (!n) return "#808080";
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

/** A photo's average color, read in the browser before upload; null where that can't be done. */
export async function averageColor(file: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file, { resizeWidth: 16, resizeHeight: 16 });
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0);
    return averagePixels(context.getImageData(0, 0, 16, 16).data);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run them**

Run: `npx vitest run lib/pages/look.test.ts features/pages/look`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pages/look.ts lib/pages/look.test.ts features/pages/look
git commit -m "Look helpers: apply a theme, each type's options, one-click readability fixes, a photo's average color"
```

---

### Task 2: Toasts can offer Undo

**Files:**
- Modify: `components/ui/Toast.tsx`, `components/ui/Toast.test.tsx`

**Interfaces:**
- Produces: `useToast()` returns `(message: string, tone?: "success" | "error", action?: { label: string; onAction: () => void }) => void`. A toast with an action stays 6 seconds; pressing it runs the action and closes the toast.

- [ ] **Step 1: Write the failing test**

Append to `components/ui/Toast.test.tsx`:

```tsx
  it("offers an action, such as Undo, and closes once it's used", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    function Show() {
      const toast = useToast();
      return (
        <button type="button" onClick={() => toast("Theme set to Ocean", "success", { label: "Undo", onAction })}>
          Show
        </button>
      );
    }
    render(<ToastProvider><Show /></ToastProvider>);
    await user.click(screen.getByRole("button", { name: "Show" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Theme set to Ocean")).toBeNull();
  });
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/ui/Toast.test.tsx`
Expected: FAIL — no "Undo" button.

- [ ] **Step 3: Add the action**

`components/ui/Toast.tsx`: `ToastMessage` gains `action?: { label: string; onAction: () => void }`; `show(message, tone = "success", action?)` keeps it, with a 6000ms lifetime when there's an action (3500ms otherwise); the toast renders, after the message:

```tsx
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.onAction();
                  setToasts((current) => current.filter((t) => t.id !== toast.id));
                }}
                className="-mr-1 ml-1 min-h-8 shrink-0 rounded-full px-2 font-semibold text-bg underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bg"
              >
                {toast.action.label}
              </button>
            )}
```

The context's type: `(message: string, tone?: Tone, action?: ToastAction) => void`.

- [ ] **Step 4: Run it**

Run: `npx vitest run components/ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Toast.tsx components/ui/Toast.test.tsx
git commit -m "Toasts can offer an action, such as Undo"
```

---

### Task 3: The Look tab: Theme, Header and Social icons

**Files:**
- Create: `features/pages/look/LookSketch.tsx`
- Create: `features/pages/editor/look/LookEditor.tsx`, `ThemeCard.tsx`, `HeaderCard.tsx`, `SocialsCard.tsx`, `LookEditor.test.tsx`
- Modify: `features/create/sections/LookSection.tsx`, `features/create/EditorLayout.tsx`

**Interfaces:**
- Consumes: `applyTheme`, `headerChoice`, `hasShape`, `hasSocials`, `heroImage` (Task 1); the toast action (Task 2); `resolveLook`, `THEMES`, `THEME_IDS`.
- Produces:
  - `LookSketch({ look, header?: "classic" | "hero" | "banner" | "none", className? })` — `aria-hidden` drawing.
  - `LookEditor({ type, page, onChange })` with `onChange(page)`; each card is a `Card` titled per 6.1.
  - `LookSection({ type, page, onChange })` renders `LookEditor` (the Look tab).

- [ ] **Step 1: Write the failing tests**

`features/pages/editor/look/LookEditor.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { themeLook } from "@/lib/pages/look";
import { PAGE_DEFAULTS, type PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

import { LookEditor } from "./LookEditor";

function Harness<K extends PageTypeId>({ type, initial }: { type: K; initial: PageContentMap[K] }) {
  const [page, setPage] = useState(initial);
  return (
    <ToastProvider>
      <LookEditor type={type} page={page} onChange={(next) => setPage(next as PageContentMap[K])} />
      <output aria-label="Look">{JSON.stringify(page.look)}</output>
    </ToastProvider>
  );
}
const look = () => JSON.parse(screen.getByRole("status", { name: "Look" }).textContent!);

describe("LookEditor", () => {
  it("shows the cards in the spec's order", () => {
    render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Theme", "Header", "Wallpaper", "Text", "Buttons", "Social icons",
    ]);
  });

  it("leaves out Header and Social icons where a type has neither", () => {
    render(<Harness type="pdf" initial={PAGE_DEFAULTS.pdf()} />);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).not.toContain("Header");
    expect(titles).not.toContain("Social icons");
  });

  it("picks a theme, keeps the header, and undoes the latest pick", async () => {
    const user = userEvent.setup();
    const start = { ...PAGE_DEFAULTS.links(), look: { ...themeLook("paper", "links"), header: "hero" as const } };
    render(<Harness type="links" initial={start} />);
    await user.click(screen.getByRole("radio", { name: "Ocean" }));
    expect(look()).toMatchObject({ theme: "ocean", header: "hero" });
    await user.click(screen.getByRole("radio", { name: "Forest" }));
    await user.click(screen.getAllByRole("button", { name: "Undo" }).at(-1)!);
    expect(look().theme).toBe("ocean");
  });

  it("resets to the theme", async () => {
    const user = userEvent.setup();
    const custom = { ...themeLook("paper", "links"), font: "typewriter" as const };
    render(<Harness type="links" initial={{ ...PAGE_DEFAULTS.links(), look: custom }} />);
    await user.click(screen.getByRole("button", { name: "Reset to theme" }));
    expect(look().font).toBe("clean");
  });

  it("says to add a photo to use Hero", () => {
    render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    expect(screen.getByText("Add a photo to use Hero")).toBeInTheDocument();
  });

  it("moves social icons under the header or to the bottom", async () => {
    const user = userEvent.setup();
    render(<Harness type="vcard" initial={PAGE_DEFAULTS.vcard()} />);
    await user.click(screen.getByRole("radio", { name: "Under the header" }));
    expect(look().socials).toBe("top");
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run features/pages/editor/look`
Expected: FAIL — `./LookEditor` doesn't exist.

- [ ] **Step 3: Write the sketch and the cards**

`features/pages/look/LookSketch.tsx`:

```tsx
import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";
import type { PageLook } from "@/lib/pages/look";

import { resolveLook } from "./resolve";

/** A tiny page drawn from a look: its wallpaper, header, two lines of text and three buttons. */
export function LookSketch({
  look,
  header = "classic",
  className,
}: {
  look: PageLook;
  header?: "classic" | "hero" | "banner" | "none";
  className?: string;
}) {
  const r = resolveLook(look);
  const style = { ...r.vars, background: r.background } as CSSProperties;
  return (
    <span
      aria-hidden
      data-sketch={look.theme}
      style={style}
      className={cn("flex flex-col items-center gap-1 overflow-hidden rounded-lg p-2", className)}
    >
      {header === "classic" && <span className="size-4 rounded-full bg-(--fg) opacity-70" />}
      {(header === "hero" || header === "banner") && <span className="-mx-2 -mt-2 h-5 w-[calc(100%+1rem)] bg-(--fg) opacity-25" />}
      <span className="h-1 w-1/2 rounded-full bg-(--fg)" />
      <span className="h-1 w-1/3 rounded-full bg-(--fg-muted)" />
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2.5 w-full rounded-(--pg-btn-radius) border border-(--pg-btn-border) bg-(--pg-btn-bg) shadow-(--pg-btn-shadow)" />
      ))}
    </span>
  );
}
```

`ThemeCard.tsx` — a `Card` titled "Theme" with `CardHeader action={<Button variant="outline" size="sm" onClick={reset}>Reset to theme</Button>}` and a Headless UI `RadioGroup` `aria-label="Theme"` of nine `Radio`s (`aria-label={THEMES[id].label}`), each a `LookSketch` of `applyTheme(look, id)` above its name, in a `grid grid-cols-3 gap-2` (each tile `min-h-11`, checked tile ringed). On change:

```tsx
  const toast = useToast();
  const pick = (theme: ThemeId) => {
    const before = look;
    onChange(applyTheme(look, theme));
    toast(`Theme set to ${THEMES[theme].label}`, "success", {
      label: "Undo",
      onAction: () => onChange(before),
    });
  };
  const reset = () => onChange(applyTheme(look, look.theme));
```

(`look` and `onChange` here are the look and a look setter: `LookEditor` passes `onLook = (next) => onChange({ ...page, look: next, color: next.button.color })`.)

`HeaderCard.tsx` — shown when `headerChoice(type)`: a `Card` "Header" with `SegmentedControl aria-label="Header layout" size="touch"` (Classic / Hero), a note `Add a photo to use Hero` when `!heroImage(type, page)`, and when `hasShape(type) && look.header === "classic"` a `SegmentedControl aria-label="Image shape"` (Circle / Rounded).

`SocialsCard.tsx` — shown when `hasSocials(type)`: a `Card` "Social icons" with `SegmentedControl aria-label="Social icons position" size="touch"` (Under the header → `top`, At the bottom → `bottom`).

`LookEditor.tsx`:

```tsx
/** The Look tab (spec 6.1): how the page looks to visitors, card by card. */
export function LookEditor<K extends PageTypeId>({
  type,
  page,
  onChange,
}: {
  type: K;
  page: PageContentMap[K];
  onChange: (page: PageContentMap[K]) => void;
}) {
  const look = page.look;
  const onLook = (next: PageLook) => onChange({ ...page, look: next, color: next.button.color });
  return (
    <div className="flex flex-col gap-6">
      <ThemeCard look={look} onLook={onLook} />
      {headerChoice(type) && <HeaderCard type={type} page={page} look={look} onLook={onLook} />}
      <WallpaperCard look={look} onLook={onLook} />
      <TextCard look={look} onLook={onLook} />
      <ButtonsCard look={look} onLook={onLook} />
      {hasSocials(type) && <SocialsCard look={look} onLook={onLook} />}
    </div>
  );
}
```

For this task, `WallpaperCard`, `TextCard` and `ButtonsCard` are minimal `Card`s with their titles only (Task 4 fills them), so the order test passes.

`LookSection.tsx` becomes `export function LookSection({ type, page, onChange }) { return <LookEditor type={type} page={page} onChange={onChange} />; }` (the old color picker and warnings go), and `EditorLayout.tsx` passes `type={pageType}` and wraps it in `<MediaOwnerContext value={mediaOwner}>` for photo uploads.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run features/pages features/create components/ui`
Expected: PASS. Update the two older `LookSection` tests in `sections.test.tsx` ("changes the page's color", "warns when the color is hard to see") to the new tab: picking the theme tile "Ocean" changes `look.theme`; the warning tests move to Task 4.

- [ ] **Step 5: Commit**

```bash
git add features/pages/look/LookSketch.tsx features/pages/editor/look features/create
git commit -m "The Look tab: theme tiles with Undo and Reset to theme, header layout and shape, social icons"
```

---

### Task 4: The Look tab: Wallpaper, Text and Buttons, with fixes for hard-to-read choices

**Files:**
- Modify: `features/pages/editor/look/WallpaperCard.tsx`, `TextCard.tsx`, `ButtonsCard.tsx`
- Create: `features/pages/editor/look/Warning.tsx`
- Test: `features/pages/editor/look/LookEditor.test.tsx`

**Interfaces:**
- Consumes: `fixLook`, `averageColor` (Task 1), `lookChecks`, `uploadMedia`, `MediaOwnerContext`, `ColorField`, `Slider`, `SegmentedControl`, `FONTS`.
- Produces: `Warning({ look, id, onLook, fixLabel })` — shows the message for a failing check and a button that applies `fixLook`.

- [ ] **Step 1: Write the failing tests**

Append to `LookEditor.test.tsx` (mock `@/features/pages/editor/upload` and `@/features/pages/look/average`):

```tsx
vi.mock("@/features/pages/editor/upload", async (original) => ({
  ...(await original<object>()),
  uploadMedia: vi.fn(),
}));
vi.mock("@/features/pages/look/average", () => ({ averageColor: vi.fn(async () => "#F3E8D8") }));

  it("switches wallpaper kinds without ever leaving a broken wallpaper", async () => {
    const user = userEvent.setup();
    render(<Harness type="links" initial={{ ...PAGE_DEFAULTS.links(), look: themeLook("paper", "links") }} />);
    await user.click(screen.getByRole("radio", { name: "Gradient" }));
    expect(look().wallpaper).toMatchObject({ kind: "gradient", from: "#F6F5F1" });
    await user.click(screen.getByRole("radio", { name: "Photo" }));
    // No photo yet: the gradient stays.
    expect(look().wallpaper.kind).toBe("gradient");
    await user.click(screen.getByRole("radio", { name: "Color" }));
    expect(look().wallpaper).toEqual({ kind: "solid", color: "#F6F5F1" });
  });

  it("uses an uploaded photo with its average color, and darkens it", async () => {
    const user = userEvent.setup();
    const image = { path: "11111111-1111-4111-8111-111111111111/w.jpg", name: "w.jpg", type: "image/jpeg", size: 1 };
    vi.mocked(uploadMedia).mockResolvedValue({ ok: true, media: image });
    const { container } = render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    await user.click(screen.getByRole("radio", { name: "Photo" }));
    await user.upload(container.querySelector<HTMLInputElement>("input[type=file]")!, new File(["x"], "w.jpg", { type: "image/jpeg" }));
    expect(look().wallpaper).toEqual({ kind: "image", image, dim: 30, color: "#F3E8D8" });
    fireEvent.change(screen.getByLabelText("Darken"), { target: { value: "60" } });
    expect(look().wallpaper.dim).toBe(60);
  });

  it("keeps the wallpaper when a photo can't be uploaded, and says why", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadMedia).mockResolvedValue({ ok: false, error: "That image couldn't be read." });
    const { container } = render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    const before = look().wallpaper;
    await user.click(screen.getByRole("radio", { name: "Photo" }));
    await user.upload(container.querySelector<HTMLInputElement>("input[type=file]")!, new File(["x"], "w.jpg", { type: "image/jpeg" }));
    expect(look().wallpaper).toEqual(before);
    expect(screen.getByText("That image couldn't be read.")).toBeInTheDocument();
  });

  it("only applies a custom color once it's complete", async () => {
    const user = userEvent.setup();
    render(<Harness type="links" initial={{ ...PAGE_DEFAULTS.links(), look: themeLook("paper", "links") }} />);
    await user.click(screen.getByRole("radio", { name: "Custom text color" }));
    const field = screen.getByLabelText("Text color");
    await user.clear(field);
    await user.type(field, "#12");
    expect(look().text).not.toBe("#12");
    await user.type(field, "3456");
    expect(look().text).toBe("#123456");
  });

  it("warns under a hard-to-read choice and fixes it in one click", async () => {
    const user = userEvent.setup();
    const pale = { ...themeLook("paper", "links"), text: "#DDDDDD" };
    render(<Harness type="links" initial={{ ...PAGE_DEFAULTS.links(), look: pale }} />);
    expect(screen.getByText(/Text is hard to read on this wallpaper/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use Auto" }));
    expect(look().text).toBe("auto");
    expect(screen.queryByText(/Text is hard to read/)).toBeNull();
  });

  it("sets the font and every button setting", async () => {
    const user = userEvent.setup();
    render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    await user.click(screen.getByRole("radio", { name: "Elegant" }));
    await user.click(screen.getByRole("radio", { name: "Square" }));
    await user.click(screen.getByRole("radio", { name: "Outline" }));
    await user.click(screen.getByRole("radio", { name: "Hard" }));
    expect(look()).toMatchObject({ font: "elegant", button: { shape: "square", style: "outline", shadow: "hard" } });
  });
```

(import `fireEvent`, `vi`, `uploadMedia` at the top.)

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run features/pages/editor/look`
Expected: FAIL — the cards are empty.

- [ ] **Step 3: Fill the cards**

`Warning.tsx`:

```tsx
const MESSAGES = {
  text: "Text is hard to read on this wallpaper.",
  buttonText: "Button text is hard to read on this color.",
  button: "Buttons are hard to see on this wallpaper.",
};

/** A readability warning under a control, with its one-click fix (spec 6.1). */
export function Warning({ look, id, onLook, fixLabel }: { look: PageLook; id: LookCheck["id"]; onLook: (look: PageLook) => void; fixLabel: string }) {
  if (!lookChecks(look).some((check) => check.id === id)) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control bg-warning-soft px-3 py-2 text-sm text-fg">
      <TriangleAlert aria-hidden className="size-4 shrink-0 text-warning" />
      {MESSAGES[id]}
      <button type="button" onClick={() => onLook(fixLook(look, id))} className="min-h-11 font-semibold text-link underline underline-offset-4 focus-ring sm:min-h-0">
        {fixLabel}
      </button>
    </p>
  );
}
```

`WallpaperCard.tsx` — a `Card` "Wallpaper" with `SegmentedControl aria-label="Wallpaper" size="touch"` (Color / Gradient / Photo) whose value is a local `kind` state starting at `look.wallpaper.kind`:
- **Color:** swatches (`#F6F5F1 #FFFFFF #F3E8D8 #FCE7F3 #E0F2FE #14532D #0A1330 #070B1A #7C2D12 #881337`, buttons `aria-label="Use #…"`) and `ColorField label="Wallpaper color"`; sets `{ kind: "solid", color }`. Switching to Color sets `{ kind: "solid", color: first wallpaper color }`.
- **Gradient:** `ColorField label="Top color"` and `"Bottom color"` and `SegmentedControl aria-label="Direction"` (Down / Diagonal / Across). Switching to Gradient from solid sets `{ kind: "gradient", from: color, to: mix(color, "#000000", 0.35), direction: "down" }`; from an image, `from: image.color`.
- **Photo:** an upload control (`label` + hidden `input type=file accept={ACCEPT.image}`, like `MediaField`) — on pick: `averageColor(file)` and `uploadMedia(file, "image", { maxSide: 2400, ownerId })`; success sets `{ kind: "image", image: media, dim: 30, color: average ?? first wallpaper color }`; failure shows the error (`role="alert"`) and changes nothing. Choosing Photo with no photo yet only switches the local `kind` (the wallpaper stays). With a photo: `Slider label="Darken" min={0} max={80} step={5} formatValue={(v) => `${v}%`}` sets `dim`.
- The wallpaper card shows no warning itself: a wallpaper that makes custom text or buttons hard to read shows the warning under Text or Buttons, where the fix is.

`TextCard.tsx` — a `Card` "Text": a `RadioGroup aria-label="Font"` of six tiles (each "Aa" in `FONTS[id].heading` with `font-variation-settings` and the label), then `SegmentedControl aria-label="Text color mode"` with options `{ value: "auto", label: "Auto", ariaLabel: "Auto text color" }`, `{ value: "custom", label: "Custom", ariaLabel: "Custom text color" }`; Custom shows `ColorField label="Text color"` (switching to Custom starts from the resolved text color); a note "Auto always picks the readable one."; `<Warning id="text" fixLabel="Use Auto" />`.

`ButtonsCard.tsx` — a `Card` "Buttons": `SegmentedControl`s `aria-label="Button shape"` (Square/Rounded/Pill), `"Button style"` (Solid/Outline/Soft), `"Button shadow"` (None/Soft/Hard); button color swatches (`#0F172A #FFFFFF #7FE9FF #0B6E8C #4F46E5 #0F766E #B45309 #BE123C #7C3AED #831843`) + `ColorField label="Button color"`; `<Warning id="button" fixLabel="Make buttons stand out" />`; `SegmentedControl aria-label="Button text color mode"` (Auto / Custom, `ariaLabel`s "Auto button text" / "Custom button text") with `ColorField label="Button text color"`; `<Warning id="buttonText" fixLabel="Use Auto" />`.

All `SegmentedControl`s use `size="touch"`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run features/pages features/create components/ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/pages/editor/look
git commit -m "The Look tab: wallpaper with photo and darken, fonts and text color, buttons, and one-click fixes"
```

---

### Task 5: The gallery draws each page type

**Files:**
- Modify: `features/create/gallery/TypeGallery.tsx`, `features/create/gallery/TypeGallery.test.tsx`

**Interfaces:**
- Consumes: `LookSketch` (Task 3), `themeLook`, `TYPE_THEME`.

- [ ] **Step 1: Write the failing test**

```tsx
  it("draws each page type on its own theme", () => {
    render(<TypeGallery userId="u1" folderId={null} />);
    const tile = screen.getByRole("link", { name: /Event/ });
    expect(tile.querySelector("[data-sketch]")).toHaveAttribute("data-sketch", "grape");
    expect(screen.getByRole("link", { name: /Wi-Fi/ }).querySelector("[data-sketch]")).toBeNull();
  });
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run features/create/gallery`
Expected: FAIL — no sketch in the tile.

- [ ] **Step 3: Add the drawings**

In the tile, for page types (`isPageType(id)`), above the label: `<LookSketch look={themeLook(TYPE_THEME[id], id)} header={id === "coupon" || id === "event" ? "banner" : ["pdf", "images", "video"].includes(id) ? "none" : "classic"} className="h-20 w-full" />`.

- [ ] **Step 4: Run it**

Run: `npx vitest run features/create`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/create/gallery
git commit -m "The type gallery draws each page type on its own theme"
```

---

### Task 6: The Look tab in the browser

**Files:**
- Modify: `e2e/accounts/create.spec.ts`, `e2e/accounts/app.spec.ts`

- [ ] **Step 1: Write the e2e**

`create.spec.ts`:

```ts
  test("picks a theme in the editor, and the page shows its wallpaper and font", async ({ page }) => {
    await page.goto("codes/new?type=links");
    await page.getByLabel("Title").fill("Forest page");
    await page.getByLabel("Button text").first().fill("Shop");
    await page.getByLabel("Link", { exact: true }).first().fill("example.com/shop");
    await openTab(page, "Look");
    await page.getByRole("radio", { name: "Forest" }).click();
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
    await page.getByLabel("Code name").fill("Forest page");
    await createButton(page).click();
    await expect(page).toHaveURL(/\/codes\/[0-9a-f-]+#download$/);
    const live = (await page.getByRole("link", { name: /View page/ }).getAttribute("href"))!;
    await page.goto(live);
    const frame = page.locator("[data-page-frame]");
    expect(await frame.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(20, 83, 45)");
    expect((await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily)).toLowerCase()).toContain("playfair");
  });

  test("a photo wallpaper uploads, darkens, and shows in the preview", async ({ page }) => {
    await page.goto("codes/new?type=links");
    await openTab(page, "Look");
    await page.getByRole("radio", { name: "Photo" }).click();
    await page.locator('[data-editor-panel="look"] input[type=file]').setInputFiles("public/icons/icon-512.png");
    await expect(page.getByLabel("Darken")).toBeVisible();
    const preview = page.getByRole("complementary", { name: "Preview" }).locator("[data-page-frame]");
    await expect.poll(() => preview.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("url(");
  });

  test("warns about hard-to-read text and fixes it", async ({ page }) => {
    await page.goto("codes/new?type=links");
    await openTab(page, "Look");
    await page.getByRole("radio", { name: "Custom text color" }).click();
    await page.getByLabel("Text color").fill("#0B1430");
    await expect(page.getByText(/Text is hard to read on this wallpaper/)).toBeVisible();
    await page.getByRole("button", { name: "Use Auto" }).click();
    await expect(page.getByText(/Text is hard to read/)).toHaveCount(0);
  });
```

(`public/icons/icon-512.png` exists; check with `ls public/icons` and use what's there.)

`app.spec.ts`: add `"codes/new?type=links#look"` to the dark-mode three-width list and to `PAGES` (light at three widths).

- [ ] **Step 2: Run the e2e**

Run: `npm run test:e2e:accounts -- -g "picks a theme|photo wallpaper|hard-to-read|#look"`
Expected: PASS.

- [ ] **Step 3: Run every suite**

Run, in order: `npm run lint && npx tsc --noEmit && npx prettier --check .`; `npm test`; `npm run test:e2e:accounts -- --no-build`; `npm run build && npm run test:e2e`.
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add e2e
git commit -m "Browser tests: a theme picked in the editor reaches the page; photo wallpaper; a readability fix; axe on the Look tab"
```
