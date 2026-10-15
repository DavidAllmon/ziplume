# Pages Release 2b: Live Device Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The editor's page preview shows the page as a phone, a tablet or a desktop at each device's real width, scaled to fit; links and media in it stay inert; editing a saved page links to the live page; the code page shows a small live preview of its page.

**Architecture:**
- **Container-sized renderer:** the page renderer sizes itself from its container (`@container` on `PageShell`, `@min-[40rem]:` variants), so a frame of any width lays it out like a real screen.
- **`DeviceFrame`:** renders children at a device's virtual size (390, 820 or 1280 CSS px wide) inside a phone bezel, a tablet bezel or a browser window, scaled with `transform` to fit its box. `fitScale` is pure and unit-tested.
- **State:** `PagePreview` gains a `device`; `PreviewColumn` gains the device switch and an "Open the live page" link. The view and device state live in `EditorLayout`, so the desktop column and the phone sheet share them.

**Tech Stack:** Next.js 16, React 19, Tailwind 4 container queries, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-ziplume-pages-redesign-design.md`, sections 5.3 and 5.10.

## Global Constraints

- Device switch labels: **Phone**, **Tablet**, **Desktop**. Virtual sizes 390 × 844, 820 × 1180, 1280 × 800 CSS px.
- The switch shows only for a hosted page's Page view. View switch stays **Page | QR code**, following the tab (Content and Look → Page; QR code → QR code; Settings keeps whichever was showing), now also when the page opens on a tab from the address.
- In the preview, links and buttons don't navigate and media doesn't play:
  - menu section chips aren't links;
  - videos show a still placeholder ("Plays on the live page");
  - audio shows the same note instead of a player.
- "Open the live page" appears under the page preview when editing a saved hosted page, opening `/p/<saved slug>` in a new tab.
- The code page's Hosted page card shows the page in a small phone frame, with **Edit page** for people who can edit.
- The public `/p/<slug>` page must look exactly as before at every screen width (the container is the page itself).

## Review Focus

1. A page opened from the address on the QR code tab (`#qr`): the preview shows the code from the first render after hydration, not the page. Task 2.
2. Very narrow preview boxes (the phone sheet at 320px, the code page card) and very wide ones: the frame never overflows its box and never scales above 1. Task 2 (`fitScale` tests).
3. Clicking anything inside the preview must not change the editor's address (menu chips used `#section-n`, which would overwrite the tab hash). Task 1.
4. A desktop window without `ResizeObserver` (jsdom, old browsers): the frame still renders at a sensible default size. Task 2.
5. The public page on a 1280px screen: the header band and card padding still switch at 640px, now by the page's own width. Task 1 (e2e).

---

### Task 1: The renderer sizes itself from its container, and the preview is inert

**Files:**
- Modify: `features/pages/parts.tsx` (`PageShell`, `PageCard`)
- Modify: `features/pages/PageView.tsx` (`MenuView`, `VideoView`, `AudioView`, the dispatcher)
- Create: `features/pages/PageView.test.tsx`

**Interfaces:**
- Produces: `PageShell`'s root element has the class `@container`; `MenuView` receives `preview`.

- [ ] **Step 1: Write the failing tests**

`features/pages/PageView.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PAGE_DEFAULTS } from "@/lib/pages/types";

import { PageView } from "./PageView";

const media = (path: string, type: string) => ({
  path: `00000000-0000-0000-0000-000000000000/${path}`,
  name: path,
  type,
  size: 1000,
});

const view = (type: Parameters<typeof PageView>[0]["type"], content: object, preview = true) =>
  render(
    <PageView
      type={type}
      content={content as never}
      slug="PREVIEW"
      pageUrl="https://ziplume.com/p/PREVIEW"
      preview={preview}
    />,
  );

describe("PageView", () => {
  it("sizes itself from its own width, not the screen's", () => {
    const { container } = view("links", { ...PAGE_DEFAULTS.links(), title: "Hi" }, false);
    expect(container.firstElementChild).toHaveClass("@container");
  });

  it("keeps menu section chips from navigating in the preview", () => {
    const menu = {
      ...PAGE_DEFAULTS.menu(),
      name: "Diner",
      sections: [
        { name: "Starters", items: [{ name: "Soup", description: "", price: "5", tags: "" }] },
        { name: "Mains", items: [{ name: "Pie", description: "", price: "9", tags: "" }] },
      ],
    };
    const { container, unmount } = view("menu", menu);
    expect(container.querySelector('a[href^="#section-"]')).toBeNull();
    unmount();
    // The live page keeps them as links.
    const live = view("menu", menu, false);
    expect(live.container.querySelector('a[href="#section-1"]')).not.toBeNull();
  });

  it("doesn't play video or audio in the preview", () => {
    const video = { ...PAGE_DEFAULTS.video(), title: "Clip", url: "https://youtu.be/dQw4w9WgXcQ" };
    const { container, getAllByText, unmount } = view("video", video);
    expect(container.querySelector("iframe, video")).toBeNull();
    expect(getAllByText("Plays on the live page").length).toBeGreaterThan(0);
    unmount();

    const audio = { ...PAGE_DEFAULTS.audio(), title: "Tune", file: media("a.mp3", "audio/mpeg") };
    const second = view("audio", audio);
    expect(second.container.querySelector("audio")).toBeNull();
    expect(second.getAllByText("Plays on the live page").length).toBeGreaterThan(0);
    second.unmount();

    // The live page still plays them.
    expect(view("video", video, false).container.querySelector("iframe")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run features/pages/PageView.test.tsx`
Expected: FAIL — no `@container` class, the chips are links in the preview, and the preview renders an `iframe` and an `audio` element.

- [ ] **Step 3: Size from the container in `parts.tsx`**

- `PageShell`'s outer `<div style={style} className="min-h-full bg-bg">` becomes `className="@container min-h-full bg-bg"`.
- The header band `className="h-36 bg-[var(--page-accent)] sm:h-44"` becomes `className="h-36 bg-[var(--page-accent)] @min-[40rem]:h-44"`.
- `PageCard`'s `"rounded-[1.5rem] border border-border bg-surface p-5 shadow-card sm:p-6"` becomes `"rounded-[1.5rem] border border-border bg-surface p-5 shadow-card @min-[40rem]:p-6"`.

- [ ] **Step 4: Make the preview inert in `PageView.tsx`**

- `function MenuView({ page }: ViewProps<MenuPage>)` becomes `function MenuView({ page, preview }: ViewProps<MenuPage>)`, and the chip `<a key={i} href={`#section-${i}`} className=…>` becomes:

```tsx
            preview ? (
              <span
                key={i}
                className="shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg"
              >
                {s.name || "Menu"}
              </span>
            ) : (
              <a
                key={i}
                href={`#section-${i}`}
                className="shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg"
              >
                {s.name || "Menu"}
              </a>
            ),
```

- add, above `VideoView`:

```tsx
/** In the editor's preview, media stays still: it plays on the live page. */
function StillMedia({ icon }: { icon: ReactNode }) {
  return (
    <div className="grid aspect-video w-full place-items-center gap-2 bg-black text-white/80">
      <span className="flex flex-col items-center gap-2 text-sm font-medium">
        {icon}
        Plays on the live page
      </span>
    </div>
  );
}
```

  (add `type ReactNode` to the React import, or `import type { ReactNode } from "react";`).
- `VideoView`: the first branch becomes `{preview && (embed || page.file) ? (<StillMedia icon={<Play aria-hidden className="size-12" />} />) : embed ? (<iframe …/>) : …` — the iframe, video and placeholder branches stay as they are after it.
- `AudioView`: `{page.file && (<audio … />)}` becomes:

```tsx
        {page.file &&
          (preview ? (
            <p className="flex items-center gap-2 text-sm font-medium text-fg-muted">
              <Music aria-hidden className="size-4" /> Plays on the live page
            </p>
          ) : (
            <audio src={mediaUrl(page.file.path)} controls preload="metadata" className="w-full" />
          ))}
```

  The test's `getAllByText("Plays on the live page")` matches the text node inside this `<p>` (the icon has no text).

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run features/pages`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add features/pages/parts.tsx features/pages/PageView.tsx features/pages/PageView.test.tsx
git commit -m "Pages size themselves from their own width; the editor's preview doesn't navigate or play"
```

---

### Task 2: The device frame and switch

**Files:**
- Create: `features/pages/preview/devices.ts`, `features/pages/preview/devices.test.ts`
- Create: `features/pages/preview/DeviceFrame.tsx`
- Modify: `features/generator/preview/PagePreview.tsx`
- Modify: `features/create/PreviewColumn.tsx`, `features/create/CreateMobileBar.tsx`, `features/create/EditorLayout.tsx`
- Test: `features/create/EditorLayout.test.tsx` (append)

**Interfaces:**
- Consumes: `@container` page renderer (Task 1).
- Produces:
  - `DEVICES: Record<DeviceId, { label: string; width: number; height: number; chrome: { x: number; top: number; bottom: number } }>`
  - `type DeviceId = "phone" | "tablet" | "desktop"`
  - `outerSize(device): { width: number; height: number }`
  - `fitScale(device: DeviceId, box: { width: number; height: number }): number`
  - `DeviceFrame({ device, address, maxHeight?, children })`
  - `PagePreview({ type, page, slug, device? })`
  - `PreviewColumn` props gain `device`, `onDeviceChange`, `liveHref?: string | null`
  - `CreateMobileBar` passes `device`/`onDeviceChange`/`liveHref` through

- [ ] **Step 1: Write the failing tests**

`features/pages/preview/devices.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { DEVICES, fitScale, outerSize } from "./devices";

describe("devices", () => {
  it("are the real widths of a phone, a tablet and a desktop", () => {
    expect([DEVICES.phone.width, DEVICES.tablet.width, DEVICES.desktop.width]).toEqual([
      390, 820, 1280,
    ]);
  });

  it("scale down to fit the box, by whichever side is tighter", () => {
    const phone = outerSize("phone");
    expect(fitScale("phone", { width: phone.width / 2, height: 10_000 })).toBeCloseTo(0.5);
    expect(fitScale("phone", { width: 10_000, height: phone.height / 4 })).toBeCloseTo(0.25);
  });

  it("never scale up, and never collapse to nothing", () => {
    expect(fitScale("phone", { width: 5000, height: 5000 })).toBe(1);
    expect(fitScale("desktop", { width: 0, height: 0 })).toBeGreaterThan(0);
  });
});
```

Append to `features/create/EditorLayout.test.tsx`, inside `describe("EditorLayout", …)`:

```tsx
  it("shows the code straight away when the page opens on the QR code tab", () => {
    window.history.replaceState(null, "", "/codes/new?type=links#qr");
    renderLayout({ type: "links" });
    expect(preview().getByText("QR tile")).toBeInTheDocument();
  });

  it("switches the page preview between phone, tablet and desktop", async () => {
    const user = userEvent.setup();
    renderLayout({ type: "links" });
    expect(preview().getByRole("radio", { name: "Phone" })).toBeChecked();
    await user.click(preview().getByRole("radio", { name: "Desktop" }));
    expect(preview().getByRole("radio", { name: "Desktop" })).toBeChecked();
    await user.click(screen.getByRole("tab", { name: "QR code" }));
    // The device switch is for the page only.
    expect(preview().queryByRole("radio", { name: "Desktop" })).toBeNull();
  });

  it("links to the live page when editing a saved hosted page", () => {
    renderLayout({ mode: "edit", type: "links", savedSlug: "MENU12" });
    expect(preview().getByRole("link", { name: /Open the live page/ })).toHaveAttribute(
      "href",
      "/p/MENU12",
    );
  });
```

For the last test, `renderLayout` gains a `savedSlug` option: when given, `initial` is `fromSavedCode(savedRow({ qr_type: "links", is_dynamic: true, slug: savedSlug, content: { title: "Menu", links: [] } }))` and the layout gets `saved={{ slug: savedSlug, hasPassword: false, removePassword: false, onRemovePassword: vi.fn() }}`. (Check `savedRow`'s override parameter in `features/create/fixtures.ts`; if it takes a partial row, this works as written.)

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run features/pages/preview features/create/EditorLayout.test.tsx`
Expected: FAIL — `devices` is missing; the `#qr` load shows the page preview; there's no device switch or live-page link.

- [ ] **Step 3: Write `features/pages/preview/devices.ts`**

```ts
export type DeviceId = "phone" | "tablet" | "desktop";

/** Each device's real screen width and height in CSS px, and the frame drawn around it. */
export const DEVICES: Record<
  DeviceId,
  { label: string; width: number; height: number; chrome: { x: number; top: number; bottom: number } }
> = {
  phone: { label: "Phone", width: 390, height: 844, chrome: { x: 12, top: 12, bottom: 12 } },
  tablet: { label: "Tablet", width: 820, height: 1180, chrome: { x: 16, top: 16, bottom: 16 } },
  // A browser window: a thin edge and an address bar on top.
  desktop: { label: "Desktop", width: 1280, height: 800, chrome: { x: 1, top: 37, bottom: 1 } },
};

export const DEVICE_IDS = Object.keys(DEVICES) as DeviceId[];

/** The frame's full size, screen plus chrome, before scaling. */
export function outerSize(device: DeviceId) {
  const { width, height, chrome } = DEVICES[device];
  return { width: width + chrome.x * 2, height: height + chrome.top + chrome.bottom };
}

/** How much to shrink the frame so it fits the box: never above 1, never zero. */
export function fitScale(device: DeviceId, box: { width: number; height: number }): number {
  const outer = outerSize(device);
  const scale = Math.min(1, box.width / outer.width, box.height / outer.height);
  return Math.max(scale, 0.05);
}
```

- [ ] **Step 4: Write `features/pages/preview/DeviceFrame.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { DEVICES, fitScale, outerSize, type DeviceId } from "./devices";

/** Until the box is measured (and where ResizeObserver doesn't exist), assume the editor's
 * preview column. */
const DEFAULT_WIDTH = 312;

/**
 * Shows `children` on a device's real-sized screen (so the page lays out as it would there),
 * inside a phone, a tablet or a browser frame, scaled down to fit the available width and
 * `maxHeight`. The screen scrolls on its own.
 */
export function DeviceFrame({
  device,
  address,
  maxHeight = 560,
  children,
}: {
  device: DeviceId;
  /** Shown in the desktop frame's address bar. */
  address: string;
  maxHeight?: number;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    const element = box.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width || DEFAULT_WIDTH);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const spec = DEVICES[device];
  const outer = outerSize(device);
  const scale = fitScale(device, { width, height: maxHeight });

  return (
    <div ref={box} className="w-full">
      <div
        className="relative mx-auto"
        style={{ width: outer.width * scale, height: outer.height * scale }}
      >
        <div
          className={cn(
            "absolute top-0 left-0 overflow-hidden bg-bg",
            device === "desktop"
              ? "rounded-xl border border-border shadow-pop"
              : "border-fg/85 shadow-pop",
          )}
          style={{
            width: outer.width,
            height: outer.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            borderWidth: device === "desktop" ? 1 : spec.chrome.x,
            borderRadius: device === "phone" ? 48 : device === "tablet" ? 32 : undefined,
          }}
        >
          {device === "desktop" && (
            <div className="flex h-9 items-center gap-2 border-b border-border bg-surface-2 px-3">
              <span aria-hidden className="size-3 rounded-full bg-border" />
              <span aria-hidden className="size-3 rounded-full bg-border" />
              <span aria-hidden className="size-3 rounded-full bg-border" />
              <span className="ml-3 truncate rounded-md bg-surface px-3 py-1 font-mono text-[13px] text-fg-muted">
                {address}
              </span>
            </div>
          )}
          <div
            role="region"
            aria-label="Page preview"
            className="overflow-x-hidden overflow-y-auto overscroll-contain"
            style={{ width: spec.width, height: spec.height }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Use it in `PagePreview`**

Replace `features/generator/preview/PagePreview.tsx` with:

```tsx
"use client";

import { PageView } from "@/features/pages/PageView";
import { DeviceFrame } from "@/features/pages/preview/DeviceFrame";
import type { DeviceId } from "@/features/pages/preview/devices";
import { SITE_URL } from "@/lib/env";
import type { PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

/** The hosted page as visitors will see it, on a device of the given size. Links don't
 * navigate and media doesn't play. */
export function PagePreview({
  type,
  page,
  slug,
  device = "phone",
  maxHeight,
}: {
  type: PageTypeId;
  page: PageContentMap[PageTypeId];
  slug: string;
  device?: DeviceId;
  maxHeight?: number;
}) {
  const pageUrl = `${SITE_URL}/p/${slug}`;
  return (
    <DeviceFrame
      device={device}
      address={pageUrl.replace(/^https?:\/\//, "")}
      maxHeight={maxHeight}
    >
      <PageView type={type} content={page} slug={slug} pageUrl={pageUrl} preview />
    </DeviceFrame>
  );
}
```

- [ ] **Step 6: The switch and the live-page link in `PreviewColumn`**

`features/create/PreviewColumn.tsx`:

- imports: add `import { ExternalLink } from "lucide-react";` (join the existing lucide import) and `import { DEVICE_IDS, DEVICES, type DeviceId } from "@/features/pages/preview/devices";`.
- props: add `device: DeviceId; onDeviceChange: (device: DeviceId) => void; liveHref?: string | null;` to the type and destructuring.
- under the existing Page/QR `SegmentedControl`, add:

```tsx
      {pageType && view === "page" && (
        <SegmentedControl
          aria-label="Device"
          size="touch"
          value={device}
          onChange={onDeviceChange}
          options={DEVICE_IDS.map((id) => ({ value: id, label: DEVICES[id].label }))}
        />
      )}
```

- the `PagePreview` gets `device={device}`.
- after the preview (before the scan badge block), add:

```tsx
      {pageType && view === "page" && liveHref && (
        <a
          href={liveHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 self-center text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          Open the live page <ExternalLink aria-hidden className="size-4" />
        </a>
      )}
```

`features/create/CreateMobileBar.tsx`: add `device`, `onDeviceChange`, `liveHref` to its own props (typed as in `PreviewColumn`) and pass them to the `PreviewColumn` in the sheet.

- [ ] **Step 7: Lift the device, follow the tab on load, pass the live link, in `EditorLayout`**

`features/create/EditorLayout.tsx`:

- import `type DeviceId` from `@/features/pages/preview/devices`.
- replace the `view` state and the two `setView` lines inside `changeTab` with:

```ts
  /** A hosted page's preview follows the tab: the page for Content and Look, the code for QR;
   * Settings keeps whichever was showing. Picking one by hand holds until the tab changes. */
  const [view, setView] = useState<PreviewView>("page");
  const [viewTab, setViewTab] = useState<EditorTab>("content");
  if (viewTab !== tab) {
    // The tab changed (a click, or the address after hydration): adjust while rendering.
    setViewTab(tab);
    if (tab === "qr") setView("code");
    else if (tab !== "settings") setView("page");
  }
  const [device, setDevice] = useState<DeviceId>("phone");
```

  and `changeTab` becomes just `selectTab(next)`, so `showMe` keeps calling `changeTab`.
- `const liveHref = editing && pageType && saved?.slug ? `/p/${encodeURIComponent(saved.slug)}` : null;`
- pass `device={device} onDeviceChange={setDevice} liveHref={liveHref}` to both `PreviewColumn` and `CreateMobileBar`.

If `npx eslint features/create` flags the render-time `setState` (React's documented "adjust state while rendering" pattern), keep the behaviour with a `useLayoutEffect` on `[tab]` instead, and record a ruling.

- [ ] **Step 8: Run the tests to see them pass**

Run: `npx vitest run features/pages features/create features/generator`
Expected: PASS. Then `npm run typecheck && npx eslint features` — no errors.

- [ ] **Step 9: Commit**

```bash
git add features/pages/preview features/generator/preview/PagePreview.tsx features/create
git commit -m "The page preview shows a phone, a tablet or a desktop at its real width, and links to the live page"
```

---

### Task 3: A small preview on the code page

**Files:**
- Modify: `features/dashboard/CodeOverview.tsx` (the Hosted page card)
- Test: `features/dashboard/CodeOverview.test.tsx` (append)

**Interfaces:**
- Consumes: `PagePreview({ type, page, slug, device, maxHeight })` (Task 2).

- [ ] **Step 1: Write the failing test**

Append to `features/dashboard/CodeOverview.test.tsx` (use the file's existing render helper and row fixture; the names below are the ones to look for — adapt to the helper's real signature and record it):

```tsx
  it("shows a hosted page's page in a small phone, with Edit page for editors", () => {
    renderOverview({
      code: row({
        qr_type: "links",
        is_dynamic: true,
        slug: "MENU12",
        content: { title: "Lunch links", links: [] },
      }),
      canEdit: true,
    });
    const preview = screen.getByRole("region", { name: "Page preview" });
    expect(preview).toHaveTextContent("Lunch links");
    expect(screen.getByRole("link", { name: "Edit page" })).toHaveAttribute(
      "href",
      expect.stringContaining("/edit"),
    );
  });

  it("leaves Edit page out for people who can only view", () => {
    renderOverview({
      code: row({ qr_type: "links", is_dynamic: true, slug: "MENU12", content: { title: "X", links: [] } }),
      canEdit: false,
    });
    expect(screen.getByRole("region", { name: "Page preview" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit page" })).toBeNull();
  });
```

Run: `npx vitest run features/dashboard/CodeOverview.test.tsx`
Expected: FAIL (no "Page preview" region).

- [ ] **Step 2: Add the preview to the Hosted page card**

`features/dashboard/CodeOverview.tsx`:

- imports: `import { PagePreview } from "@/features/generator/preview/PagePreview";`, `import { sanitizePage } from "@/lib/pages/sanitize";`, and `type PageTypeId` from `@/lib/qr/types` (join the `isPageType` import).
- near `const isPage = …`, add:

```ts
  // What the page shows today, for the small preview (content is checked the same way /p does).
  const page = isPage
    ? sanitizePage(initial.qr_type as PageTypeId, initial.content)
    : null;
```

- the Hosted page card's body `<div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">{shortLinkRow}{activeToggle}</div>` becomes:

```tsx
              <div className="grid gap-6 px-5 pt-4 pb-6 sm:grid-cols-[minmax(0,1fr)_12rem] sm:px-6">
                <div className="flex min-w-0 flex-col gap-5">
                  {shortLinkRow}
                  {activeToggle}
                </div>
                {page && code.slug && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-full max-w-48">
                      <PagePreview
                        type={initial.qr_type as PageTypeId}
                        page={page}
                        slug={code.slug}
                        maxHeight={360}
                      />
                    </div>
                    {canEdit && (
                      <Link href={`${editHref}#content`} className={buttonClasses("outline", "sm")}>
                        Edit page
                      </Link>
                    )}
                  </div>
                )}
              </div>
```

  (`code` here is the component's current row state; use whichever variable the card already reads `slug` from.)

- [ ] **Step 3: Run the tests to see them pass**

Run: `npx vitest run features/dashboard`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add features/dashboard/CodeOverview.tsx features/dashboard/CodeOverview.test.tsx
git commit -m "The code page shows its hosted page in a small phone, with Edit page"
```

---

### Task 4: Browser tests

**Files:**
- Modify: `e2e/accounts/create.spec.ts` (append), `e2e/accounts/phone-layout.spec.ts` (append to "hosted pages")

- [ ] **Step 1: Add the checks**

Append to `e2e/accounts/create.spec.ts`, inside the describe:

```ts
  test("the page preview lays out at each device's real width", async ({ page }) => {
    await page.goto("codes/new?type=links");
    const preview = page.getByRole("complementary", { name: "Preview" });
    const band = preview.getByRole("region", { name: "Page preview" }).locator(".h-36").first();
    // offsetHeight ignores the frame's scale: it's the page's own layout.
    const height = () => band.evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(await height()).toBe(144);
    await preview.getByRole("radio", { name: "Tablet" }).click();
    expect(await height()).toBe(176);
    await preview.getByRole("radio", { name: "Desktop" }).click();
    expect(await height()).toBe(176);
    await preview.getByRole("radio", { name: "Phone" }).click();
    expect(await height()).toBe(144);
  });

  test("the preview's menu chips don't change the editor's address", async ({ page }) => {
    await page.goto("codes/new?type=menu#content");
    await page.getByLabel("Restaurant name").fill("Diner");
    await page.getByLabel("Section name").first().fill("Starters");
    await page.getByLabel("Name", { exact: true }).first().fill("Soup");
    await page.getByRole("button", { name: /Add section/ }).click();
    await page.getByLabel("Section name").nth(1).fill("Mains");
    await page.getByLabel("Name", { exact: true }).nth(1).fill("Pie");
    const preview = page.getByRole("complementary", { name: "Preview" });
    await preview.getByText("Mains", { exact: true }).first().click();
    await expect(page).toHaveURL(/#content$/);
  });
```

(Adjust the menu field labels to `PageEditor.test.tsx`'s `LABELS.menu` if any differs; record it.)

Append inside `test.describe("hosted pages", …)` in `e2e/accounts/phone-layout.spec.ts`:

```ts
  test("the public page still switches layout at 640px of its own width", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto(`p/${PHONE_PAGES[0]!.slug}`);
    const band = page.locator(".h-36").first();
    expect(await band.evaluate((el) => (el as HTMLElement).offsetHeight)).toBe(176);
  });
```

- [ ] **Step 2: Run every check**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all pass.

Run: `npm run test:e2e:accounts`
Expected: all projects pass.

Run: `NEXT_PUBLIC_SITE_URL=http://localhost:4173 npm run build && npm run test:e2e`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add e2e
git commit -m "Browser tests: device widths in the preview, inert menu chips, the public page's own breakpoint"
```
