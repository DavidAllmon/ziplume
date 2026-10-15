# Pages release 2d: phones and tablets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On phones the code editor takes the whole screen (its own top bar and tabs pinned at the top, the Create bar at the bottom, Preview full screen); on tablets the app sidebar stays a narrow icon rail on editor pages so the form keeps its room.

**Architecture:** `AppShell` learns whether it's on an editor page (`isEditorPage`) and marks its root `data-editor`. Two custom Tailwind variants read that mark: `phone:` (the app's phone layout: below 640px, or below 768px in the editor) and `rail:` (the sidebar is an icon rail: below 1024px, or below 1280px in the editor). Every sidebar piece that today says `max-lg:` says `rail:` instead. On editor pages the app's phone top bar and bottom tabs aren't rendered; the editor's own top bar and tab list become sticky, and the Preview sheet opens full screen.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4 (`@custom-variant`), Headless UI 2.2 (Dialog), Vitest + Testing Library, Playwright (desktop project + six phone projects).

**Spec:** `docs/superpowers/specs/2026-10-15-ziplume-pages-redesign-design.md` — section 5.9 (Phones and tablets) and the release 2 checks in section 7 that remain (the phone-layout suite on the editor routes; axe in light and dark at 390, 820 and 1280px). Releases 2a, 2b and 2c are live.

## Global Constraints

- "**Phones (below 768px):** the editor takes the whole screen. The app's top bar and bottom tabs hide on `/codes/new?type=…` and `/codes/<id>/edit`."
- "a top bar with back, the type icon and the name; the tabs, sticky under it and scrollable sideways; a bottom bar with a small QR, **Preview**, the first missing thing, and Create or Save. Preview opens a full-screen sheet with the same view and device switches."
- "**Tablets (768–1279px):** two columns, with the app sidebar shown as its narrow icon rail on editor pages so the form keeps room."
- "**Desktop (1280px and up):** two columns with the full sidebar."
- Release 1's phone rules still hold on every phone profile: no sideways scroll, pages end where their content ends, no bounce past the end, bars clear of the iPhone home indicator.
- Axe (wcag2a, wcag2aa) clean in light and dark at 390, 820 and 1280px on the editor routes.
- `next build` type-checks test files: every test file must compile.

## Rulings made in this plan

1. **What counts as an editor page:** `/codes/new` with a real type (static or page type), and `/codes/<id>/edit`. The type gallery (`/codes/new` with no type or an unknown one) keeps the app's bars. *Cost if wrong:* one function.
2. **The phone top bar is one line:** back, the type icon (its name stays for screen readers), the name field, and Discard when editing with changes. "Unsaved changes" is read out but not shown (Save is greyed until something changes). Save errors stay announced but show in the bottom bar, which already shows them. *Cost if wrong:* class changes in `EditorTopBar`.
3. **From 640 to 767px the editor is the phone editor too**, so the sidebar hides there on editor pages (the spec's phone width is "below 768px"); other app pages keep the sidebar from 640px as today.
4. **No Show me on phones yet:** the spec's bottom bar names the first missing thing (it already does); Show me stays a desktop-and-tablet control. *Cost if wrong:* a small follow-up.

## Review Focus

1. **The gallery and unknown types are not the editor:** `/codes/new` without a type, or with `type=nope`, must keep the phone top bar and bottom tabs. — Tests in Task 1 (`isEditorPage`, `AppShell`).
2. **Getting out of the full-screen editor on a phone:** the back arrow is the only way out; it must return to the gallery, where the app's bars are back. — e2e in Task 1.
3. **Landscape phones and small tablets (640–767px, e.g. 700×390):** the editor is full screen there too (no sidebar), and the Create bar is still cleared at the end. — e2e in Task 1 (extends the existing 700×390 test).
4. **The iPhone home indicator:** with no tab bar under it, the Create bar must pad itself above the home indicator at every phone width. — CSS pin tests in Task 1.
5. **A field the keyboard moves to** (Tab, Show me on a tablet, a phone's Next key) must not hide under the pinned top bar and tabs. — e2e in Task 1.

---

## File structure

| File | Responsibility |
|---|---|
| `components/app/nav.ts` | `isEditorPage(pathname, params)` |
| `app/globals.css` | `rail:` and `phone:` variants; Create bar height with the safe area at every phone width; phone scroll padding for the editor |
| `components/app/AppShell.tsx` | `data-editor`; no phone bars on editor pages; `phone:`/`rail:` layout |
| `components/app/CreateButton.tsx`, `FolderNav.tsx`, `UserMenu.tsx`, `WorkspaceSwitcher.tsx` | `max-lg:` → `rail:` |
| `features/create/EditorTopBar.tsx` | sticky, one line on phones |
| `features/create/EditorLayout.tsx` | the tab list pinned under the top bar on phones |
| `features/create/CreateMobileBar.tsx` | on the bottom edge with the safe area; full-screen Preview |
| `components/ui/Sheet.tsx` | `fullScreen` |
| `app/phone-layout.test.ts` | CSS and class pins |
| `e2e/accounts/phone-layout.spec.ts`, `e2e/accounts/app.spec.ts` | phones, tablets, axe |

---

### Task 1: On phones the editor takes the whole screen

**Files:**
- Modify: `components/app/nav.ts`, `components/app/nav.test.ts`
- Modify: `components/app/AppShell.tsx`, `components/app/AppShell.test.tsx`
- Modify: `app/globals.css`, `app/phone-layout.test.ts`
- Modify: `features/create/EditorTopBar.tsx`, `features/create/EditorLayout.tsx`, `features/create/CreateMobileBar.tsx`
- Test: `e2e/accounts/phone-layout.spec.ts`

**Interfaces:**
- Produces: `isEditorPage(pathname: string, params: URLSearchParams): boolean`; `[data-app-shell][data-editor]` on editor pages; the `phone:` variant.

- [ ] **Step 1: Write the failing unit tests**

`components/app/nav.test.ts` (add `isEditorPage` to the import):

```ts
describe("isEditorPage", () => {
  const params = (query = "") => new URLSearchParams(query);

  it("is a new code of a real type, or a saved code's edit page", () => {
    expect(isEditorPage("/codes/new", params("type=links"))).toBe(true);
    expect(isEditorPage("/codes/new", params("type=url&folder=f1"))).toBe(true);
    expect(isEditorPage("/codes/abc/edit", params("workspace=t1"))).toBe(true);
  });

  it("isn't the type gallery, an unknown type, or any other page", () => {
    expect(isEditorPage("/codes/new", params())).toBe(false);
    expect(isEditorPage("/codes/new", params("type=nope"))).toBe(false);
    expect(isEditorPage("/codes/abc", params())).toBe(false);
    expect(isEditorPage("/codes", params("type=links"))).toBe(false);
  });
});
```

`components/app/AppShell.test.tsx`:

```tsx
  it("gives the editor the whole phone screen: no top bar or bottom tabs", () => {
    pathname = "/codes/new";
    search = new URLSearchParams("type=links");
    const { container } = renderShell();
    expect(container.querySelector("[data-tabbar]")).toBeNull();
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("[data-app-shell]")).toHaveAttribute("data-editor");
  });

  it("keeps the phone bars on the type gallery and on every other page", () => {
    pathname = "/codes/new";
    const { container } = renderShell();
    expect(container.querySelector("[data-tabbar]")).not.toBeNull();
    expect(container.querySelector("header")).not.toBeNull();
    expect(container.querySelector("[data-app-shell]")).not.toHaveAttribute("data-editor");
  });
```

`app/phone-layout.test.ts` — replace "count it into the Create bar on small tablets…" with:

```ts
  it("count it into the Create bar at every phone width, now that the bar sits on the bottom edge", () => {
    expect(css).toMatch(
      /@media \(width < 48rem\) \{\s*:root:has\(\[data-actionbar="create"\]\) \{\s*--actionbar-h: calc\(4\.25rem \+ 1px \+ env\(safe-area-inset-bottom\)\);/,
    );
    expect(css).not.toContain("--actionbar-h: calc(4.25rem + 1px);");
    const bar = readFileSync(
      new URL("../features/create/CreateMobileBar.tsx", import.meta.url),
      "utf8",
    );
    expect(bar).toMatch(/[" ]pb-\[env\(safe-area-inset-bottom\)\]/);
  });
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run components/app app/phone-layout.test.ts`
Expected: FAIL — `isEditorPage` is not exported; the editor page still has `[data-tabbar]`; the CSS still has the bar without the safe area below 640px.

- [ ] **Step 3: Write `isEditorPage`**

`components/app/nav.ts`:

```ts
import { isPageType, isStaticType } from "@/lib/qr/types";

/**
 * The code editor: a new code of a known type, or a saved code's edit page. On phones it takes
 * the whole screen, and on tablets the sidebar stays a rail beside it.
 */
export function isEditorPage(pathname: string, params: URLSearchParams): boolean {
  if (/^\/codes\/[^/]+\/edit$/.test(pathname)) return true;
  const type = params.get("type") ?? "";
  return pathname === "/codes/new" && (isStaticType(type) || isPageType(type));
}
```

- [ ] **Step 4: Add the `phone:` variant and the phone editor's CSS**

`app/globals.css`, after the `dark` custom variant:

```css
/* "phone:": the app's phone layout (top bar and bottom tabs, no sidebar): below 640px, or below
   768px in the code editor, which then takes the whole screen. */
@custom-variant phone {
  [data-app-shell]:not([data-editor]) & {
    @media (width < 40rem) {
      @slot;
    }
  }
  [data-app-shell][data-editor] & {
    @media (width < 48rem) {
      @slot;
    }
  }
}
```

Replace the two Create-bar rules (`(width < 40rem)` without the safe area, and `(40rem <= width < 48rem)`) with one, and update the comment above `:root` ("the Create bar 4.25rem plus the safe area: it sits on the bottom edge"):

```css
@media (width < 40rem) {
  :root:has([data-tabbar]) {
    --tabbar-h: calc(3.5rem + 1px + env(safe-area-inset-bottom));
  }
}

/* The editor's Create bar sits on the bottom edge (editor pages have no tab bar). */
@media (width < 48rem) {
  :root:has([data-actionbar="create"]) {
    --actionbar-h: calc(4.25rem + 1px + env(safe-area-inset-bottom));
  }
}
```

Replace the phone scroll padding (`(width < 40rem)`, `4.5rem`) with the pinned top bar plus the tabs:

```css
/* The editor: keyboard focus scrolls fields clear of the pinned top bar (its height is measured
 * into --editor-bar-h), and on phones of the tabs pinned under it. */
@media (width < 48rem) {
  :root:has([data-editor-bar]) {
    scroll-padding-top: calc(var(--editor-bar-h, 3.5rem) + 3.25rem);
  }
}
```

(the `(width >= 48rem)` rule stays).

- [ ] **Step 5: Leave the phone bars off editor pages**

`components/app/AppShell.tsx` (import `isEditorPage` from `./nav`):

```tsx
  const editor = isEditorPage(pathname, searchParams);
```

- root: `<div data-app-shell data-editor={editor || undefined} className="bg-bg text-sm text-fg">`
- the sidebar `<aside>`: `"fixed inset-y-0 left-0 z-40 hidden flex-col … sm:flex"` becomes `"fixed inset-y-0 left-0 z-40 flex flex-col … phone:hidden"`.
- the phone `<header>` and the `data-tabbar` `<nav>`: render only when `!editor`.
- `<main>`: `className={cn("px-4 pt-5 pb-(--app-end) sm:px-6 lg:px-10 lg:pt-8", "ml-16 lg:ml-64 phone:ml-0", editor && "max-md:pt-0")}` — on editor phones the editor's own top bar is the first thing on the screen.

- [ ] **Step 6: Pin the editor's top bar and tabs on phones**

`features/create/EditorTopBar.tsx`:
- the bar: `className="sticky top-0 z-20 flex flex-col gap-2 border-b border-border bg-bg/95 py-1.5 backdrop-blur-md max-sm:-mx-4 max-sm:px-4 sm:max-md:-mx-6 sm:max-md:px-6 md:py-3"` (the comment above it becomes "Pinned to the top: on phones it's the screen's only top bar, with the tabs under it.").
- the type's name in the `h1`: wrap the visible part so phones show only the icon: `<span className="max-md:sr-only"><span className="sr-only">{editing ? "Edit" : "New"}</span> {galleryLabel(type)}</span>`.
- the name field: `className="min-w-0 flex-1 basis-0 md:basis-48"` (one line on phones).
- the Discard group: `<span className="text-sm text-fg-muted max-md:sr-only">Unsaved changes</span>` and
  ```tsx
  <Button variant="ghost" onClick={onDiscard} aria-label="Discard changes">
    <span className="md:hidden">Discard</span>
    <span className="max-md:hidden">Discard changes</span>
  </Button>
  ```
- the save error: `className="text-sm text-danger max-md:sr-only md:text-right"` (announced; the bottom bar shows it on phones).

`features/create/EditorLayout.tsx`, the `TabList`:

```tsx
      <TabList
        aria-label="Editor sections"
        // Phones: pinned under the top bar, full width, and scrollable sideways.
        className="z-10 flex scrollbar-none gap-1 overflow-x-auto border-b border-border bg-bg/95 backdrop-blur-md max-md:sticky max-md:top-[var(--editor-bar-h,3.5rem)] max-sm:-mx-4 max-sm:px-4 sm:max-md:-mx-6 sm:max-md:px-6"
      >
```

`features/create/CreateMobileBar.tsx`: the bar's classes `bottom-(--tabbar-h)` → `bottom-0` and `sm:pb-[env(safe-area-inset-bottom)]` → `pb-[env(safe-area-inset-bottom)]`.

- [ ] **Step 7: Run the unit tests**

Run: `npx vitest run components/app app/phone-layout.test.ts features/create`
Expected: PASS. (The `EditorTopBar` tests that look for "Discard changes" by role still find it by its `aria-label`.)

- [ ] **Step 8: Write the phone e2e**

In `e2e/accounts/phone-layout.spec.ts`, replace the test "the editor's top bar scrolls away on phones, leaving room for the form" with:

```ts
  test("the editor takes the whole phone screen, with its bar and tabs pinned at the top", async ({
    page,
  }) => {
    await page.goto("codes/new?type=links");
    await settled(page);
    await expect(page.locator("[data-tabbar]")).toHaveCount(0);
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Sidebar" })).toBeHidden();
    const { height } = page.viewportSize()!;
    const barBottom = await page
      .locator('[data-actionbar="create"]')
      .evaluate((el) => el.getBoundingClientRect().bottom);
    expect(Math.round(barBottom)).toBe(height);

    // Scrolled down, the top bar and the tabs stay at the top.
    await page.evaluate(() => window.scrollTo(0, 400));
    const top = (await page.getByRole("region", { name: "Code" }).boundingBox())!;
    const tabs = (await page.getByRole("tablist", { name: "Editor sections" }).boundingBox())!;
    expect(Math.round(top.y)).toBe(0);
    expect(Math.abs(tabs.y - (top.y + top.height))).toBeLessThanOrEqual(1);

    // A field the keyboard moves to isn't hidden under them.
    await page.getByLabel("Title").focus();
    const title = (await page.getByLabel("Title").boundingBox())!;
    expect(title.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
  });

  test("the editor's back arrow returns to the gallery, where the app's bars are back", async ({
    page,
  }) => {
    await page.goto("codes/new?type=links");
    await settled(page);
    await page.getByRole("link", { name: "Change type" }).click();
    await expect(page.getByRole("heading", { name: "What do you want to make?" })).toBeVisible();
    await expect(page.locator("[data-tabbar]")).toBeVisible();
  });
```

and in "small tablets and landscape phones clear the Create bar", after `settled(page)`:

```ts
    // The editor is the phone editor up to 768px: no sidebar beside it.
    await expect(page.getByRole("complementary", { name: "Sidebar" })).toBeHidden();
```

- [ ] **Step 9: Run the phone e2e**

Run: `npm run test:e2e:accounts -- -g "whole phone screen|back arrow returns|landscape phones|ends where its content ends|toasts appear|list rows keep"`
Expected: PASS on all six phone profiles.

- [ ] **Step 10: Commit**

```bash
git add components/app app/globals.css app/phone-layout.test.ts features/create e2e/accounts/phone-layout.spec.ts
git commit -m "On phones the editor takes the whole screen: its own bar and tabs pinned at the top, the Create bar on the bottom edge"
```

---

### Task 2: On tablets the sidebar stays a rail beside the editor

**Files:**
- Modify: `app/globals.css` (the `rail:` variant, registered before `phone:`)
- Modify: `components/app/AppShell.tsx`, `CreateButton.tsx`, `FolderNav.tsx`, `UserMenu.tsx`, `WorkspaceSwitcher.tsx`
- Test: `e2e/accounts/app.spec.ts`

**Interfaces:**
- Consumes: `data-editor`, `phone:` (Task 1).
- Produces: the `rail:` variant.

- [ ] **Step 1: Write the failing e2e**

In `e2e/accounts/app.spec.ts`, inside `test.describe("signed in as an owner", …)`:

```ts
  test("the editor keeps the sidebar a rail up to 1280px, so the form keeps its room", async ({
    page,
  }) => {
    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    const width = async () => Math.round((await sidebar.boundingBox())!.width);
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto("codes");
    expect(await width()).toBe(256);

    await page.goto("codes/new?type=links");
    const bar = page.getByRole("region", { name: "Code" });
    await expect(bar).toBeVisible();
    expect(await width()).toBe(64);
    // Opened, it lays over the editor instead of pushing it aside.
    const left = (await bar.boundingBox())!.x;
    await page.getByRole("button", { name: "Expand menu" }).click();
    expect(await width()).toBe(256);
    expect((await bar.boundingBox())!.x).toBe(left);
    await page.keyboard.press("Escape");

    await page.setViewportSize({ width: 1280, height: 900 });
    expect(await width()).toBe(256);
    await expect(page.getByRole("button", { name: "Expand menu" })).toBeHidden();
  });
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm run test:e2e:accounts -- -g "keeps the sidebar a rail"`
Expected: FAIL — on the editor at 1100px the sidebar is 256 wide.

- [ ] **Step 3: Add the `rail:` variant**

`app/globals.css`, between the `dark` variant and `phone:` (registered first, so `phone:` wins where both match, e.g. `ml-64 rail:ml-16 phone:ml-0`):

```css
/* "rail:": the sidebar shows as a narrow icon rail (expand it for labels): below 1024px, or below
   1280px in the code editor, so the form keeps its room. */
@custom-variant rail {
  [data-app-shell]:not([data-editor]) & {
    @media (width < 64rem) {
      @slot;
    }
  }
  [data-app-shell][data-editor] & {
    @media (width < 80rem) {
      @slot;
    }
  }
}
```

- [ ] **Step 4: Say `rail:` wherever the sidebar said `max-lg:`**

- `CreateButton.tsx`, `FolderNav.tsx`, `UserMenu.tsx`, `WorkspaceSwitcher.tsx`: every `max-lg:` becomes `rail:` (10 places; e.g. `collapsed && "rail:w-11 rail:flex-none rail:rounded-control rail:px-0"`).
- `AppShell.tsx`:
  - `SideLink`: `!expanded && "rail:justify-center rail:px-0"` and `!expanded && "rail:sr-only"`.
  - the expanded rail's backdrop: `"fixed inset-0 z-30 hidden bg-black/30 rail:block"`.
  - the sidebar width: `expanded ? "w-64 shadow-pop" : "w-64 rail:w-16"`.
  - the logo row: `!expanded && "rail:flex-col"`; the wordmark: `!expanded && "rail:hidden"`.
  - the Expand/Collapse button: `"hidden size-10 place-items-center … rail:grid"` (was `grid … lg:hidden`).
  - the Theme row: `!expanded && "rail:hidden"`.
  - `<main>`: `"ml-64 rail:ml-16 phone:ml-0"` (was `ml-16 lg:ml-64 phone:ml-0`).

Then check the variant order in the built CSS:

Run: `npm run build >/dev/null && grep -o '@media (width<64rem){\[data-app-shell\]:not(\[data-editor\]) .rail\\:ml-16\|@media (width<40rem){\[data-app-shell\]:not(\[data-editor\]) .phone\\:ml-0' .next/static/chunks/*.css | head -2`
Expected: the `rail:` rule is printed before the `phone:` rule. (If not, swap the two `@custom-variant` blocks.)

- [ ] **Step 5: Run the tests**

Run: `npx vitest run components/app` then `npm run test:e2e:accounts -- -g "keeps the sidebar a rail|rail|Sidebar|fits 820px|fits 1280px"`
Expected: PASS. The existing `AppShell` rail tests (Expand/Collapse, Escape) still pass: the toggle is in the DOM at every width.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components/app e2e/accounts/app.spec.ts
git commit -m "On tablets the sidebar stays a rail beside the editor, up to 1280px"
```

---

### Task 3: Preview opens full screen on phones

**Files:**
- Modify: `components/ui/Sheet.tsx` (`fullScreen`)
- Modify: `features/create/CreateMobileBar.tsx`
- Test: `e2e/accounts/phone-layout.spec.ts`

**Interfaces:**
- Produces: `Sheet({ open, onClose, title, fullScreen?, children })`.

- [ ] **Step 1: Write the failing e2e**

`e2e/accounts/phone-layout.spec.ts`, in "signed in":

```ts
  test("Preview opens full screen, with the whole device in view", async ({ page }) => {
    await page.goto("codes/new?type=links");
    await settled(page);
    await page
      .locator('[data-actionbar="create"]')
      .getByRole("button", { name: /^Preview/ })
      .click();
    const sheet = page.getByRole("dialog", { name: "Preview" });
    await expect(sheet.getByRole("radio", { name: "Phone" })).toBeVisible();
    await settled(page);
    const { height } = page.viewportSize()!;
    const title = (await sheet.getByRole("heading", { name: "Preview" }).boundingBox())!;
    expect(title.y).toBeLessThan(64);
    const frame = (await sheet
      .getByRole("region", { name: "Page preview" })
      .locator("..")
      .boundingBox())!;
    expect(frame.y + frame.height).toBeLessThanOrEqual(height);
  });
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm run test:e2e:accounts -- -g "Preview opens full screen"`
Expected: FAIL — the bottom sheet starts lower than 64px (it's at most 92dvh tall and sized to its content), or the frame runs past the bottom on short phones.

- [ ] **Step 3: Add `fullScreen` to `Sheet`**

`components/ui/Sheet.tsx` (import `cn`):

```tsx
interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Covers the whole screen (the editor's Preview on phones) instead of rising from the bottom. */
  fullScreen?: boolean;
  children: ReactNode;
}

/** A bottom sheet on small screens, used for the mobile preview and export options. */
export function Sheet({ open, onClose, title, fullScreen = false, children }: SheetProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-200 data-closed:opacity-0"
      />
      <div className={cn("fixed inset-x-0 bottom-0 flex", fullScreen ? "top-0" : "max-h-[92dvh]")}>
        <DialogPanel
          transition
          className={cn(
            "flex w-full flex-col bg-surface shadow-pop transition duration-250 ease-out data-closed:translate-y-full",
            fullScreen
              ? "pt-[env(safe-area-inset-top)]"
              : "rounded-t-[1.5rem] border-t border-border",
          )}
        >
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            {!fullScreen && (
              <span
                aria-hidden
                className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-border"
              />
            )}
            <DialogTitle className="mt-2 font-display text-lg font-bold">{title}</DialogTitle>
            <IconButton label="Close" onClick={onClose} className="-mr-2">
              <X aria-hidden />
            </IconButton>
          </div>
          <div
            className={cn(
              "overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
              fullScreen && "flex-1",
            )}
          >
            {children}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

`features/create/CreateMobileBar.tsx`: `<Sheet fullScreen open={open} onClose={() => setOpen(false)} title="Preview">`, and the frame's height:

```tsx
            // Full screen: the frame takes what's left under the switches, keeping the live-page
            // link and the scan badge in view.
            frameHeight="clamp(240px, 100dvh - 17rem, 760px)"
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run components/ui features/create` then `npm run test:e2e:accounts -- -g "Preview opens full screen|phones get full-size controls"`
Expected: PASS on all six phone profiles.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Sheet.tsx features/create/CreateMobileBar.tsx e2e/accounts/phone-layout.spec.ts
git commit -m "Preview opens full screen on phones, with the whole device in view"
```

---

### Task 4: The release 2 checks on every editor

**Files:**
- Modify: `e2e/accounts/phone-layout.spec.ts` (`APP_PAGES`)
- Modify: `e2e/accounts/app.spec.ts` (dark axe at three widths)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Add the editors to the phone suite and dark axe at three widths**

`e2e/accounts/phone-layout.spec.ts`, `APP_PAGES`, after `"codes/new?type=links"`:

```ts
  "codes/new?type=vcard",
  "codes/new?type=business",
  "codes/new?type=menu",
  "codes/new?type=event",
```

`e2e/accounts/app.spec.ts`: drop `"codes/new?type=links"` from the dark-mode list, and add:

```ts
  // The editor in dark mode at a phone, tablet and desktop width (spec 7).
  for (const path of [
    "codes/new?type=links",
    "codes/new?type=business",
    "codes/new?type=event",
    "codes/{menu}/edit",
  ]) {
    for (const width of WIDTHS) {
      test(`/${path} passes axe in dark mode at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: "dark" });
        await page.goto(resolve(path));
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
        await expect(page.locator("main h1").first()).toBeVisible();
        await expectNoSidewaysScroll(page);
        await expectNoAxeViolations(page);
      });
    }
  }
```

- [ ] **Step 2: Run them**

Run: `npm run test:e2e:accounts -- -g "type=vcard|type=business|type=menu|type=event|dark mode"`
Expected: PASS. A failure here is a real finding in the editor (fix the markup or colors, not the test).

- [ ] **Step 3: Run every suite**

Run, in order:
- `npm run lint && npx tsc --noEmit && npx prettier --check .` (the git-ignored `.superpowers/` is the only allowed noise)
- `npm test`
- `npm run test:e2e:accounts -- --no-build`
- `npm run build && npm run test:e2e`

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add e2e/accounts/phone-layout.spec.ts e2e/accounts/app.spec.ts
git commit -m "Browser tests: every editor on six phones, and in dark mode at 390, 820 and 1280px"
```
