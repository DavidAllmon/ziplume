# Page enhancements, Release 4a: Images, Video, App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- **Images:** captions, four layouts (2 or 3 columns, one column, carousel), the full-screen viewer, and a link per image.
- **Video:**
  - TikTok, Instagram, Facebook and Loom videos, which load after a tap;
  - up to 10 videos per page;
  - a start time.
- **App:**
  - a switch for sending phones straight to their store;
  - up to 5 screenshots in a swipeable row;
  - up to 6 feature bullets.

**Architecture:**
- **Content:** everything is optional page content with defaults, read through `SCHEMAS` in `lib/pages/sanitize.ts`.
  - Two `UPGRADES` steps bring old pages forward:
    - an old Images page's `images: Media[]` becomes items with a caption and a link;
    - an old Video page's single `url` becomes its first video.
  - A `required` option on the `list` schema kind drops items without an image.
- **Viewer:** the Release 2b–3 viewer gains an "Open link" button.
- **Shared pieces:**
  - **Images:** a new client `Carousel`.
  - **Video:** `videoEmbed` learns four more sites and a start time, and a client `TapToPlay` holds those sites back until tapped.
  - **App:** reuses `Gallery` with a tall shape.
  - **Store switch:** `scanTarget` honours it.

**Tech Stack:**
- Next.js 16, React 19, Headless UI 2.2, Tailwind 4.
- Vitest with jsdom.
- Playwright 1.56, with `page.route` blocking outside video sites in tests.
- No new dependencies and no database migration.

**Spec:** `docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md`, section 7 (items 41–47 and 51–53) and section 3. Feedback (35–37) and PDF (39–40) are Release 4c and 4b; Audio (48–50) is 4b. Release 3 is live: `ViewerGroup`/`ViewerThumb`, `MoreOptions`, `SortableList` row updates by row id, and `useMinute` exist.

## Global Constraints

- **Images** (spec 41–44):
  - **Captions:** up to 200 characters per image. A caption is also the image's description for screen readers; images without one say "Image 2 of 9".
  - **Layouts:** a grid with 2 or 3 columns, one column, or a swipeable carousel with dots.
  - **Viewer:** tapping an image opens the viewer from item 18, instead of the raw file in a new tab.
  - **A link per image:** the viewer shows an "Open link" button for an image that has one.
- **Video** (spec 45–47):
  - **More sites:** TikTok, Instagram, Facebook and Loom, as well as YouTube and Vimeo. These four load only after a tap ("Tap to play from TikTok"), so the page stays fast and their trackers stay off until then. YouTube keeps its privacy-friendly player.
  - **Several videos:** up to 10, each with a title, one below the other.
  - **Start time:** each video can start at a time, such as 1:23.
- **App** (spec 51–53):
  - **Straight to the store:** with "Send phones straight to their store" on, a scan from an iPhone or iPad goes to the App Store link, and Android goes to Google Play. Computers, and phones without their store's link, see the page. Scans are still counted.
  - **Screenshots:** up to 5 (resized to 1200 px), shown as a row you can swipe, which opens in the viewer.
  - **Features:** up to 6 short bullets, each up to 80 characters.
- **Section 3 rules apply:**
  - old pages keep working; the API accepts the new fields and its docs list them;
  - new images are resized;
  - previews show each new part but stay inert;
  - visible labels and 44 px targets on phones, and no sideways scroll from 320 px;
  - axe clean in light and dark;
  - every new text box shows its limit;
  - every new field gets sanitize, validation (where it has rules), editor and renderer tests;
  - browser tests cover the main flows, and the new pages join the axe and phone sweep.

## Rulings made in this plan (for David's review)

1. **Release 4 is in three parts:**
   - **4a:** Images, Video and App. No database change or new library.
   - **4b:** Audio and PDF. Their brand icons and PDF preview need downloads you'll be asked to approve.
   - **4c:** Feedback, which needs the database change.
2. **Captions show under the images in the one-column layout and the carousel.** In the 2- and 3-column grids, the squares are too small for text, so there the caption is the image's description for screen readers and shows in the viewer.
3. **The carousel shows dots for up to 6 images,** each a 44 px target. With 7 or more, it shows "3 of 9" with Previous and Next buttons, since that many dots won't fit on a phone.
4. **An old Images page keeps its look.** That's "Grid, 2 columns", with the first image wide when the count is odd, as today.
5. **TikTok, Instagram, Facebook and Loom load after a tap; YouTube and Vimeo play as before.** Short links (vm.tiktok.com, fb.watch) can't be read without visiting them first, so they show a "Watch video" button instead.
6. **The start time works for YouTube, Vimeo and Loom.** The other sites' players don't take one, and the editor says so.
7. **With one video, the page looks as it does today:** the description sits under the player. With several, the description moves under the page title, and each video gets its own card headed by its title.
8. **"Send phones straight to their store" starts on,** because every App code already does that today.
9. **Screenshots are tall cards in a swipeable row,** like the Business gallery but phone-shaped, and open in the viewer.
10. **Features show as a checklist card under the store buttons.**

## Review Focus

1. **Old pages:**
   - an Images page with `images` as plain files, in any order, with 0, 1 or an odd number of images;
   - a Video page with an empty, a YouTube, or a non-video `url`;
   - an App page with no switch, whose phones must still go to the store.

   Each reads and shows as before, and keeps working after its first edit and save. *Tasks 1, 4 and 6 tests.*
2. **Video links:**
   - links with tracking parameters, `m.` and `www.` hosts, TikTok short links, Instagram `/reels/`, Facebook `/watch?v=` and `/reel/`, and Loom `/embed/`;
   - a start time of "0", "61:00", "1:2" or "1m23s";
   - an evil host that only looks like one of these sites.

   *Task 4 test.*
3. **The carousel:**
   - 1 image (no dots), 6 images (dots), and 7 images (counter);
   - keyboard use of the dots and buttons;
   - swiping updates the dots;
   - the preview stays inert.

   *Task 2 test.*
4. **Images editor:**
   - reordering or removing in the grid keeps each image's caption with its own image;
   - an upload finishing while captions are typed keeps them.

   *Task 3 test.*
5. **Phones at 320 px:**
   - 24 images in each layout;
   - 10 videos, some tall;
   - 5 tall screenshots.

   There must be no sideways page scroll, and every control must be 44 px. *Task 7 phone sweep.*

---

### Task 1: Images data: items with captions and links, and a layout

**Files:**
- Modify:
  - `lib/pages/types.ts` (`ImageItem`, `ImagesLayout`, `ImagesPage`, defaults)
  - `lib/pages/sanitize.ts` (the `list` kind's `required`; the images schema; the images upgrade)
  - `lib/pages/validate.ts` (images)
  - `features/pages/editor/editors/ImagesEditor.tsx` (still compiles; Task 3 finishes it)
  - `features/pages/PageView.tsx` (`ImagesView` reads items; Task 2 finishes it)
- Test: `lib/pages/pages.test.ts`

**Interfaces:**
- Produces:
  - `ImageItem = { image: Media; caption: string; link: string }`;
  - `ImagesLayout = "grid2" | "grid3" | "single" | "carousel"`;
  - `ImagesPage.images: ImageItem[]` and `ImagesPage.layout: ImagesLayout` (default `"grid2"`);
  - the `list` spec option `required?: string`.

- [ ] **Step 1: Create the branch and commit this plan.**

```bash
git checkout -b feat/page-enhancements-r4a main
git add docs/superpowers/plans/2026-10-17-page-enhancements-release-4a-images-video-app.md
git commit -m "Plan: page enhancements release 4a, Images, Video and App"
```

- [ ] **Step 2: Write the failing tests.** In `lib/pages/pages.test.ts`:

```ts
describe("Images page items", () => {
  const item = (name: string, patch: object = {}) => ({
    image: media(name),
    caption: "",
    link: "",
    ...patch,
  });

  it("reads an old page's images as items with no caption or link, in a 2-column grid", () => {
    const page = sanitizePage("images", { title: "G", images: [media("a.png"), media("b.png")] });
    expect(page.layout).toBe("grid2");
    expect(page.images).toEqual([item("a.png"), item("b.png")]);
    // Read again, it's the same.
    expect(sanitizePage("images", page)).toEqual(page);
  });

  it("drops an item without an image, and keeps captions, links and the layout", () => {
    const page = sanitizePage("images", {
      images: [
        { image: null, caption: "x" },
        item("a.png", { caption: "Sunset", link: "example.com" }),
      ],
      layout: "carousel",
    });
    expect(page.images).toEqual([item("a.png", { caption: "Sunset", link: "example.com" })]);
    expect(page.layout).toBe("carousel");
    expect(sanitizePage("images", { layout: "mosaic" }).layout).toBe("grid2");
  });

  it("checks each image's link", () => {
    const page = { ...PAGE_DEFAULTS.images(), images: [item("a.png", { link: "not a link" })] };
    expect(validatePage("images", page)).toEqual({
      "images.0.link": "Enter a web address, like example.com",
    });
  });
});
```

- [ ] **Step 3: Run them and watch them fail.**

Run: `npx vitest run lib/pages/pages.test.ts -t "Images page items"`
Expected: FAIL. The items have no caption, link or layout yet.

- [ ] **Step 4: Implement.**

`lib/pages/types.ts`:

```ts
export interface ImageItem {
  image: Media;
  /** Shown in the viewer and one-column layouts; also the image's description (spec item 41). */
  caption: string;
  /** An "Open link" button in the viewer (spec item 44). */
  link: string;
}

/** spec item 42; an old page is "grid2" (2 columns, the first wide when the count is odd). */
export type ImagesLayout = "grid2" | "grid3" | "single" | "carousel";

export interface ImagesPage extends Themed {
  title: string;
  description: string;
  images: ImageItem[];
  layout: ImagesLayout;
}
```

Defaults: `images: [], layout: "grid2"`.

`lib/pages/sanitize.ts`:
- The `list` spec gains `required?: string` (an item whose `required` field cleans to null is dropped):

```ts
  | { kind: "list"; max: number; item: Record<string, Spec>; required?: string }
```

```ts
    case "list": {
      if (!Array.isArray(raw)) return fallback;
      return raw
        .slice(0, spec.max)
        .map((item) => cleanObject(spec.item, item, {}, options))
        .filter((item) => !spec.required || item[spec.required] !== null);
    }
```

- The images schema becomes:

```ts
  images: {
    title: str(),
    description: str(LIMITS.text),
    images: {
      kind: "list",
      max: LIMITS.images,
      required: "image",
      item: { image: media, caption: str(200), link: str(2048) },
    },
    layout: { kind: "enum", values: ["grid2", "grid3", "single", "carousel"] },
  },
```

- Add an `images` entry to `UPGRADES`:

```ts
  // An Images page's images were plain files before they had captions and links (spec item 41).
  images: (raw) =>
    Array.isArray(raw.images)
      ? {
          ...raw,
          images: raw.images.map((m) =>
            isObject(m) && "path" in m && !("image" in m) ? { image: m } : m,
          ),
        }
      : raw,
```

`lib/pages/validate.ts`:

```ts
  images: (p) => {
    const errors: PageErrors = {};
    if (!p.images.length) errors.images = "Add at least one image";
    p.images.forEach((item, i) => checkUrl(errors, `images.${i}.link`, item.link));
    return errors;
  },
```

Make the rest compile:
- **`ImagesView`:** read `page.images.map((item) => item.image)` where it used `page.images`. Task 2 rewrites it.
- **`ImagesEditor`:**
  - `value={page.images.map((item) => item.image)}`;
  - `onChange={(files) => set((latest) => ({ images: files.map((f) => latest.images.find((it) => it.image.path === f.path) ?? { image: f, caption: "", link: "" }) }))}`;
  - `onAdd={(media) => set((latest) => ({ images: [...latest.images, { image: media, caption: "", link: "" }].slice(0, LIMITS.images) }))}`.
- Fix any test literal TypeScript flags.

- [ ] **Step 5: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages features/pages && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add lib/pages features/pages
git commit -m "Images pages: items with a caption and a link, and a layout; old pages read as before"
```

---

### Task 2: The Images page: layouts, a carousel, and the viewer with links

**Files:**
- Create: `features/pages/Carousel.tsx`
- Modify:
  - `features/pages/Viewer.tsx` (`ViewerImage.link`; "Open link")
  - `features/pages/PageView.tsx` (`ImagesView`)
- Test:
  - `features/pages/Viewer.test.tsx`
  - `features/pages/PageView.test.tsx`

**Interfaces:**
- Consumes: Task 1's `ImageItem` and `ImagesLayout`.
- Produces:
  - `ViewerImage.link?: string | null`;
  - `<Carousel items={{ media; alt; caption? }[]} preview? />`, which must sit inside a `ViewerGroup` to open the viewer.

- [ ] **Step 1: Write the failing tests.**

In `features/pages/Viewer.test.tsx`:

```tsx
  it("offers an image's link", async () => {
    const user = userEvent.setup();
    render(
      <Gallery
        images={[{ ...photo(1), link: "https://example.com/1" }, photo(3)]}
        label="Photos"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open photo 1 of 2" }));
    expect(screen.getByRole("link", { name: "Open link" })).toHaveAttribute(
      "href",
      "https://example.com/1",
    );
    await user.keyboard("{ArrowRight}");
    expect(screen.queryByRole("link", { name: "Open link" })).toBeNull();
  });
```

In `features/pages/PageView.test.tsx`:

```tsx
describe("Images extras", () => {
  const item = (n: number, patch: object = {}) => ({
    image: media(`${n}.jpg`, "image/jpeg"),
    caption: "",
    link: "",
    ...patch,
  });
  const images = (list: object[], layout = "grid2") => ({
    ...PAGE_DEFAULTS.images(),
    title: "Trip",
    images: list,
    layout,
  });

  it("names each image by its caption or its place, and opens it in the viewer with its link", async () => {
    const user = userEvent.setup();
    view("images", images([item(1, { caption: "Sunset", link: "example.com/sunset" }), item(2)]), false);
    expect(screen.getByRole("button", { name: "Image 2 of 2" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sunset" }));
    const dialog = screen.getByRole("dialog", { name: "Photo 1 of 2" });
    expect(within(dialog).getByText("Sunset")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Open link" })).toHaveAttribute(
      "href",
      "https://example.com/sunset",
    );
  });

  it("lays images out in 2 or 3 columns, or one column with captions", () => {
    const list = [item(1, { caption: "Sunset" }), item(2), item(3)];
    const { container, unmount } = view("images", images(list, "grid3"), false);
    expect(container.querySelector("[data-layout=grid3]")).not.toBeNull();
    expect(screen.queryByText("Sunset")).toBeNull();
    unmount();
    const one = view("images", images(list, "single"), false);
    expect(one.container.querySelector("[data-layout=single]")).not.toBeNull();
    expect(screen.getByText("Sunset")).toBeInTheDocument();
  });

  it("shows a carousel with dots for a few images, and a counter for more", async () => {
    const user = userEvent.setup();
    const { unmount } = view("images", images([item(1), item(2), item(3)], "carousel"), false);
    expect(screen.getByRole("button", { name: "Go to image 2 of 3" })).toBeInTheDocument();
    unmount();
    view("images", images([1, 2, 3, 4, 5, 6, 7].map((n) => item(n)), "carousel"), false);
    expect(screen.queryByRole("button", { name: /^Go to image/ })).toBeNull();
    expect(screen.getByText("1 of 7")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous image" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getByText("2 of 7")).toBeInTheDocument();
  });

  it("keeps images still in the editor's preview", () => {
    view("images", images([item(1, { caption: "Sunset" })], "carousel"), true);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img", { name: "Sunset" })).toBeInTheDocument();
  });
});
```

jsdom doesn't scroll, so the counter there follows the buttons; following a real swipe is checked in the browser (Task 7).

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/Viewer.test.tsx features/pages/PageView.test.tsx -t "Images extras|offers an image"`
Expected: FAIL.

- [ ] **Step 3: Implement.**

`features/pages/Viewer.tsx`:
- `ViewerImage` gains `/** An "Open link" button in the viewer (spec item 44). */ link?: string | null;`.
- In the bottom bar, the middle column becomes:

```tsx
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            {image?.caption && <p className="text-sm text-white/90">{image.caption}</p>}
            {image?.link && (
              <a
                href={image.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ExternalLink aria-hidden className="size-4" /> Open link
              </a>
            )}
          </div>
```

This replaces the caption `<p>` that sat there.

Create `features/pages/Carousel.tsx`:

```tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { Media } from "@/lib/pages/types";

import { MediaImage } from "./parts";
import { ViewerThumb } from "./Viewer";

// Up to this many, dots; more won't fit a phone as 44px targets, so a counter instead (ruling 3).
const MAX_DOTS = 6;
const step =
  "grid size-11 place-items-center rounded-full text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring) aria-disabled:opacity-30";

/** A row of images to swipe through, one at a time (spec item 42). */
export function Carousel({
  items,
  preview = false,
}: {
  items: { media: Media; alt: string; caption?: string }[];
  preview?: boolean;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [at, setAt] = useState(0);
  const go = (to: number) => {
    const slide = track.current?.children[to] as HTMLElement | undefined;
    if (!slide) return;
    slide.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setAt(to);
  };
  return (
    <div data-layout="carousel" className="flex flex-col gap-2">
      <ul
        ref={track}
        aria-label="Images"
        onScroll={(event) => {
          const el = event.currentTarget;
          if (el.clientWidth) setAt(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-(--pg-radius) [scrollbar-width:none]"
      >
        {items.map((item, i) => (
          <li key={item.media.path} className="w-full shrink-0 snap-start">
            <ViewerThumb index={i} label={item.alt} className="block w-full bg-surface-2">
              <MediaImage
                media={item.media}
                alt={preview ? item.alt : ""}
                eager={i === 0}
                className="aspect-[4/3] w-full object-cover"
              />
            </ViewerThumb>
            {item.caption && <p className="mt-2 text-sm text-fg-muted">{item.caption}</p>}
          </li>
        ))}
      </ul>
      {items.length > 1 && !preview && (
        items.length <= MAX_DOTS ? (
          <div className="flex justify-center" role="group" aria-label="Choose an image">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to image ${i + 1} of ${items.length}`}
                aria-current={i === at ? "true" : undefined}
                onClick={() => go(i)}
                className="grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-(--ring)"
              >
                <span
                  aria-hidden
                  className={cn("size-2.5 rounded-full", i === at ? "bg-(--page-accent)" : "bg-fg-muted/40")}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <button type="button" aria-label="Previous image" aria-disabled={at === 0} onClick={() => at > 0 && go(at - 1)} className={step}>
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <p aria-live="polite" className="min-w-16 text-center text-sm font-medium text-fg tabular-nums">
              {at + 1} of {items.length}
            </p>
            <button type="button" aria-label="Next image" aria-disabled={at === items.length - 1} onClick={() => at < items.length - 1 && go(at + 1)} className={step}>
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>
        )
      )}
    </div>
  );
}
```

`scrollIntoView` doesn't exist in jsdom, so guard the call with `slide.scrollIntoView?.(…)`.

`features/pages/PageView.tsx` `ImagesView`:

```tsx
function ImagesView({ page, preview }: ViewProps<ImagesPage>) {
  const look = page.look;
  const items = page.images ?? [];
  const n = items.length;
  // A caption is also the image's description; without one, its place (spec item 41).
  const alt = (item: ImageItem, i: number) => item.caption?.trim() || `Image ${i + 1} of ${n}`;
  const viewer: ViewerImage[] = items.map((item, i) => ({
    media: item.image,
    alt: alt(item, i),
    caption: item.caption?.trim() || undefined,
    link: safeHref(item.link ?? ""),
  }));
  const layout = page.layout ?? "grid2";
  const tile = (item: ImageItem, i: number, className: string) => (
    <ViewerThumb index={i} label={alt(item, i)} className="block w-full overflow-hidden rounded-(--pg-radius) bg-surface-2">
      <MediaImage media={item.image} alt={preview ? alt(item, i) : ""} eager={i < 2} className={className} />
    </ViewerThumb>
  );
  const body = !n ? (
    <EmptyNote>Images you add appear here.</EmptyNote>
  ) : layout === "carousel" ? (
    <Carousel
      items={items.map((item, i) => ({ media: item.image, alt: alt(item, i), caption: item.caption?.trim() || undefined }))}
      preview={preview}
    />
  ) : layout === "single" ? (
    <ul data-layout="single" className="flex flex-col gap-5">
      {items.map((item, i) => (
        <li key={item.image.path} className="flex flex-col gap-2">
          {tile(item, i, "h-auto w-full")}
          {item.caption?.trim() && <p className="text-sm text-fg-muted">{item.caption}</p>}
        </li>
      ))}
    </ul>
  ) : (
    <ul data-layout={layout} className={layout === "grid3" ? "grid grid-cols-3 gap-1.5" : "grid grid-cols-2 gap-2"}>
      {items.map((item, i) => (
        <li
          key={item.image.path}
          className={layout === "grid2" && n % 2 === 1 && i === 0 ? "col-span-2" : undefined}
        >
          {tile(item, i, "aspect-square w-full object-cover")}
        </li>
      ))}
    </ul>
  );
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader look={look} layout="classic" image={null} imageAlt="" title={page.title || "Gallery"} sub={page.description || undefined} />
      {!preview && n ? <ViewerGroup images={viewer}>{body}</ViewerGroup> : body}
    </PageFrame>
  );
}
```

Imports: `Carousel` from `./Carousel`, and `type ImageItem`. Old pages passed in as given (not sanitized) still have plain files in `images`. The `?.` reads above cover missing captions and links, but a plain file has no `image`. Treat a list item with a `path` as the image itself:

```ts
const items = (page.images ?? []).map((it) =>
  "image" in it ? it : { image: it as unknown as Media, caption: "", link: "" },
);
```

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npx eslint features/pages`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add features/pages
git commit -m "The Images page: 2 or 3 columns, one column, or a carousel; images open in the viewer with their link"
```

---

### Task 3: The Images editor: layout, captions and links

**Files:**
- Modify:
  - `features/pages/editor/editors/ImagesEditor.tsx`
  - `features/pages/editor/PageEditor.test.tsx` (seed images in the limit test)
- Test: `features/pages/editor/PageEditor.test.tsx`

**Interfaces:**
- Consumes:
  - Task 1's fields;
  - `ImagesField`, `TextField`, `Field` and `Select` (`@/components/ui/inputs`).

- [ ] **Step 1: Write the failing tests.** In `features/pages/editor/PageEditor.test.tsx`:

```tsx
describe("Images editor extras", () => {
  const img = (n: number) => ({
    image: { path: `${UID}/${n}.png`, name: `${n}.png`, type: "image/png", size: 1 },
    caption: "",
    link: "",
  });
  function Gallery() {
    const [page, setPage] = useState({ ...PAGE_DEFAULTS.images(), images: [img(1), img(2)] });
    return (
      <>
        <PageEditor type="images" page={page} errors={{}} onUpdate={(update) => setPage((p) => update(p))} />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);

  it("chooses a layout, and gives each image a caption and a link", async () => {
    const user = userEvent.setup();
    render(<Gallery />);
    await user.selectOptions(screen.getByRole("combobox", { name: /^Layout/ }), "carousel");
    await user.type(screen.getByRole("textbox", { name: /^Image 2 caption/ }), "Sunset");
    await user.type(screen.getByRole("textbox", { name: /^Image 2 link/ }), "example.com");
    expect(saved().layout).toBe("carousel");
    expect(saved().images[1]).toMatchObject({ caption: "Sunset", link: "example.com" });
  });

  it("keeps each caption with its own image when the images move", async () => {
    const user = userEvent.setup();
    render(<Gallery />);
    await user.type(screen.getByRole("textbox", { name: /^Image 1 caption/ }), "First");
    await user.click(screen.getByRole("button", { name: "Actions for image 1" }));
    await user.click(screen.getByRole("menuitem", { name: "Move later" }));
    expect(saved().images.map((i: { caption: string }) => i.caption)).toEqual(["", "First"]);
    expect(screen.getByRole("textbox", { name: /^Image 2 caption/ })).toHaveValue("First");
  });
});
```

In the every-box-has-a-limit test, seed `if (type === "images") page.images = [{ image: { path: \`${UID}/a.png\`, name: "a.png", type: "image/png", size: 1 }, caption: "", link: "" }];`.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx -t "Images editor extras"`
Expected: FAIL. There's no layout picker, captions or links yet.

- [ ] **Step 3: Implement.** In `features/pages/editor/editors/ImagesEditor.tsx`, keep Task 1's `ImagesField` wiring, then add:
1. **In the Images card,** before `ImagesField`:

```tsx
        <Field label="Layout">
          {(control) => (
            <Select
              {...control}
              data-field="layout"
              value={page.layout}
              onChange={(event) => set({ layout: event.target.value as ImagesLayout })}
            >
              <option value="grid2">Grid, 2 columns</option>
              <option value="grid3">Grid, 3 columns</option>
              <option value="single">One column</option>
              <option value="carousel">Carousel</option>
            </Select>
          )}
        </Field>
```

2. **A "Captions and links" card** after it, when there are images:

```tsx
      {page.images.length > 0 && (
        <FormCard
          title="Captions and links"
          note="A caption describes the image for screen readers too. A link adds an Open link button."
        >
          <ol className="flex flex-col gap-4">
            {page.images.map((item, i) => (
              <li key={item.image.path} className="grid grid-cols-[3rem_1fr] gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- user uploads served from storage */}
                <img src={mediaUrl(item.image.path)} alt="" className="size-12 rounded-md object-cover" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    path={`images.${i}.caption`}
                    errors={errors}
                    label={`Image ${i + 1} caption`}
                    optional
                    value={item.caption}
                    onChange={(caption) =>
                      set((latest) => ({
                        images: latest.images.map((it) =>
                          it.image.path === item.image.path ? { ...it, caption } : it,
                        ),
                      }))
                    }
                  />
                  <TextField
                    path={`images.${i}.link`}
                    errors={errors}
                    label={`Image ${i + 1} link`}
                    optional
                    type="url"
                    inputMode="url"
                    placeholder="example.com"
                    value={item.link}
                    onChange={(link) =>
                      set((latest) => ({
                        images: latest.images.map((it) =>
                          it.image.path === item.image.path ? { ...it, link } : it,
                        ),
                      }))
                    }
                  />
                </div>
              </li>
            ))}
          </ol>
        </FormCard>
      )}
```

   Captions and links are found by the image's path, so a reorder or an upload finishing meanwhile can't move them to another image.

Imports: `Field` (`@/components/ui/Field`), `Select` (`@/components/ui/inputs`), `mediaUrl` and `type ImagesLayout`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS, including the every-box-has-a-limit test (`images.N.caption/link`).

- [ ] **Step 5: Commit.**

```bash
git add features/pages/editor
git commit -m "The Images editor: a layout, and a caption and link per image"
```

---

### Task 4: Video data: more sites, several videos, a start time

**Files:**
- Modify:
  - `lib/pages/urls.ts` (`videoEmbed`, `startSeconds`)
  - `lib/pages/types.ts` (`VideoItem`, `VideoPage`, `LIMITS.videos`, defaults)
  - `lib/pages/sanitize.ts` (the video schema; the video upgrade)
  - `lib/pages/validate.ts` (video)
  - `features/pages/PageView.tsx` and `features/pages/editor/editors/VideoEditor.tsx` (still compile; Task 5 finishes them)
- Test: `lib/pages/pages.test.ts`

**Interfaces:**
- Produces:
  - `VideoEmbed = { provider: "youtube" | "vimeo" | "tiktok" | "instagram" | "facebook" | "loom"; id: string; src: string; name: string; vertical: boolean; tap: boolean }`;
  - `videoEmbed(input, start?: string): VideoEmbed | null`;
  - `startSeconds(text): number | null`;
  - `VideoItem = { title: string; url: string; start: string }`;
  - `VideoPage.videos: VideoItem[]`, which replaces `url`.

- [ ] **Step 1: Write the failing tests.** In `lib/pages/pages.test.ts`, add `startSeconds` to the urls import:

```ts
describe("video links", () => {
  it("holds TikTok, Instagram, Facebook and Loom back until a tap", () => {
    expect(videoEmbed("https://www.tiktok.com/@cafe/video/7234567890123456789?lang=en")).toMatchObject({
      provider: "tiktok",
      src: "https://www.tiktok.com/embed/v2/7234567890123456789",
      name: "TikTok",
      vertical: true,
      tap: true,
    });
    expect(videoEmbed("https://www.instagram.com/reels/Cx1AbC2dE3f/")).toMatchObject({
      provider: "instagram",
      src: "https://www.instagram.com/reel/Cx1AbC2dE3f/embed",
      tap: true,
    });
    expect(videoEmbed("https://m.facebook.com/watch/?v=1234567890")?.src).toBe(
      "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D1234567890&show_text=false",
    );
    expect(videoEmbed("https://www.loom.com/share/0123456789abcdef0123456789abcdef")).toMatchObject({
      provider: "loom",
      src: "https://www.loom.com/embed/0123456789abcdef0123456789abcdef",
      vertical: false,
      tap: true,
    });
    expect(videoEmbed("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({ tap: false, name: "YouTube" });
    // Short links and look-alikes aren't embedded.
    expect(videoEmbed("https://vm.tiktok.com/ZMabc123/")).toBeNull();
    expect(videoEmbed("https://fb.watch/abc123/")).toBeNull();
    expect(videoEmbed("https://tiktok.com.evil.example/@a/video/7234567890123456789")).toBeNull();
  });

  it("starts YouTube, Vimeo and Loom at a time like 1:23", () => {
    expect(startSeconds("1:23")).toBe(83);
    expect(startSeconds("1:02:03")).toBe(3723);
    expect(startSeconds("45")).toBe(45);
    expect(startSeconds("1:2")).toBeNull();
    expect(startSeconds("1:75")).toBeNull();
    expect(startSeconds("1m23s")).toBeNull();
    expect(startSeconds("")).toBeNull();
    expect(videoEmbed("https://youtu.be/dQw4w9WgXcQ", "1:23")?.src).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=83",
    );
    expect(videoEmbed("https://vimeo.com/76979871", "1:23")?.src).toBe(
      "https://player.vimeo.com/video/76979871?dnt=1#t=83s",
    );
    expect(videoEmbed("https://www.loom.com/share/0123456789abcdef0123456789abcdef", "0:10")?.src).toBe(
      "https://www.loom.com/embed/0123456789abcdef0123456789abcdef?t=10",
    );
    expect(videoEmbed("https://youtu.be/dQw4w9WgXcQ", "0")?.src).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  it("reads an old video page's link as its first video", () => {
    expect(sanitizePage("video", { title: "T", url: "https://youtu.be/dQw4w9WgXcQ" }).videos).toEqual([
      { title: "", url: "https://youtu.be/dQw4w9WgXcQ", start: "" },
    ]);
    expect(sanitizePage("video", { title: "T", url: "" }).videos).toEqual([
      { title: "", url: "", start: "" },
    ]);
    expect(sanitizePage("video", { title: "T", url: "" })).not.toHaveProperty("url");
  });

  it("needs one video, checks each link, and each start time", () => {
    const page = (videos: object[]) => ({ ...PAGE_DEFAULTS.video(), videos });
    expect(validatePage("video", page([{ title: "", url: "", start: "" }]))).toEqual({
      "videos.0.url": "Paste a video link",
    });
    expect(
      validatePage(
        "video",
        page([
          { title: "", url: "https://youtu.be/dQw4w9WgXcQ", start: "1:75" },
          { title: "", url: "not a link", start: "" },
        ]),
      ),
    ).toEqual({
      "videos.0.start": "Use minutes and seconds, like 1:23",
      "videos.1.url": "Enter a web address, like example.com",
    });
  });
});
```

Update the existing "embed YouTube and Vimeo without tracking" expectations only where they read `src`: they're unchanged without a start.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages/pages.test.ts -t "video links"`
Expected: FAIL.

- [ ] **Step 3: Implement.** `lib/pages/urls.ts`:

```ts
export type VideoEmbed = {
  provider: "youtube" | "vimeo" | "tiktok" | "instagram" | "facebook" | "loom";
  id: string;
  src: string;
  /** For "Tap to play from TikTok". */
  name: string;
  /** Phone-shaped (TikTok, Instagram, Facebook reels). */
  vertical: boolean;
  /** Loads only after a tap, keeping the site's trackers off until then (spec item 45). */
  tap: boolean;
};

/** Seconds from "1:23", "1:02:03" or "83"; null when it isn't a time. */
export function startSeconds(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,3}(:\d{2}){0,2}$/.test(t)) return null;
  const parts = t.split(":").map(Number);
  if (parts.slice(1).some((p) => p > 59)) return null;
  return parts.reduce((total, p) => total * 60 + p, 0);
}

/**
 * A video link as a privacy-friendly embed: YouTube and Vimeo play in place; TikTok, Instagram,
 * Facebook and Loom load after a tap. `start` ("1:23") applies where the player takes one.
 */
export function videoEmbed(input: string, start = ""): VideoEmbed | null {
  const href = safeHref(input);
  if (!href) return null;
  const url = new URL(href);
  const host = url.hostname.replace(/^(www\.|m\.|web\.)/, "");
  const at = startSeconds(start) || 0;
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") ?? /^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(url.pathname)?.[1] ?? null;
  }
  if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
    const src = `https://www.youtube-nocookie.com/embed/${id}${at ? `?start=${at}` : ""}`;
    return { provider: "youtube", id, src, name: "YouTube", vertical: false, tap: false };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const vimeo = /\/(?:video\/)?(\d{6,12})(?:$|[/?#])/.exec(url.pathname)?.[1];
    if (vimeo) {
      const src = `https://player.vimeo.com/video/${vimeo}?dnt=1${at ? `#t=${at}s` : ""}`;
      return { provider: "vimeo", id: vimeo, src, name: "Vimeo", vertical: false, tap: false };
    }
  }
  if (host === "tiktok.com") {
    const tiktok = /^\/@[^/]+\/video\/(\d{15,21})/.exec(url.pathname)?.[1];
    if (tiktok) {
      return {
        provider: "tiktok",
        id: tiktok,
        src: `https://www.tiktok.com/embed/v2/${tiktok}`,
        name: "TikTok",
        vertical: true,
        tap: true,
      };
    }
  }
  if (host === "instagram.com") {
    const match = /^\/(p|reels?|tv)\/([A-Za-z0-9_-]{5,40})/.exec(url.pathname);
    if (match) {
      const kind = match[1] === "reels" ? "reel" : match[1]!;
      return {
        provider: "instagram",
        id: match[2]!,
        src: `https://www.instagram.com/${kind}/${match[2]}/embed`,
        name: "Instagram",
        vertical: true,
        tap: true,
      };
    }
  }
  if (host === "facebook.com") {
    const video =
      /\/(?:videos|reel)\/(\d{5,25})/.exec(url.pathname)?.[1] ??
      (url.pathname.startsWith("/watch") ? url.searchParams.get("v") : null);
    if (video && /^\d{5,25}$/.test(video)) {
      const canonical = url.pathname.startsWith("/watch")
        ? `https://www.facebook.com/watch/?v=${video}`
        : `https://www.facebook.com${url.pathname}`;
      return {
        provider: "facebook",
        id: video,
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(canonical)}&show_text=false`,
        name: "Facebook",
        vertical: url.pathname.includes("/reel/"),
        tap: true,
      };
    }
  }
  if (host === "loom.com") {
    const loom = /^\/(?:share|embed)\/([a-f0-9]{32})/.exec(url.pathname)?.[1];
    if (loom) {
      return {
        provider: "loom",
        id: loom,
        src: `https://www.loom.com/embed/${loom}${at ? `?t=${at}` : ""}`,
        name: "Loom",
        vertical: false,
        tap: true,
      };
    }
  }
  return null;
}
```

`lib/pages/types.ts`:

```ts
export interface VideoItem {
  /** Heads its card when the page has several videos (spec item 46). */
  title: string;
  url: string;
  /** "1:23", or "" to start at the beginning (spec item 47). */
  start: string;
}
```

- `VideoPage` becomes `{ title; description; /** Up to 10, one below the other. */ videos: VideoItem[] }`; `url` is removed.
- `LIMITS.videos = 10`.
- The defaults are `videos: [{ title: "", url: "", start: "" }]`.

`lib/pages/sanitize.ts`:
- The video schema becomes:

```ts
  video: {
    title: str(),
    description: str(LIMITS.text),
    videos: {
      kind: "list",
      max: LIMITS.videos,
      item: { title: str(), url: str(2048), start: str(8) },
    },
  },
```

- Add a `video` entry to `UPGRADES`:

```ts
  // Video pages had one link before they had several (spec item 46).
  video: (raw) =>
    !("videos" in raw) && typeof raw.url === "string"
      ? { ...raw, videos: [{ title: "", url: raw.url, start: "" }] }
      : raw,
```

`lib/pages/validate.ts`:

```ts
  video: (p) => {
    const errors: PageErrors = {};
    if (!p.videos.some((v) => v.url.trim())) {
      errors[p.videos.length ? "videos.0.url" : "videos"] = "Paste a video link";
    }
    p.videos.forEach((v, i) => {
      if (v.url.trim() && !videoEmbed(v.url) && !safeHref(v.url)) errors[`videos.${i}.url`] = URL_MESSAGE;
      if (v.start.trim() && startSeconds(v.start) === null) {
        errors[`videos.${i}.start`] = "Use minutes and seconds, like 1:23";
      }
    });
    return errors;
  },
```

Import `startSeconds`. Make `VideoView` and `VideoEditor` compile by reading `page.videos[0]` for now; Task 5 replaces both.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages && npx tsc --noEmit`
Expected: PASS. Update the e2e fixture `PHONE-VIDEO` only if TypeScript asks; it's untyped JSON and reads through the upgrade.

- [ ] **Step 5: Commit.**

```bash
git add lib/pages features/pages
git commit -m "Video data: TikTok, Instagram, Facebook and Loom links, a start time, and several videos; an old link becomes the first"
```

---

### Task 5: The Video page and editor: tap to play, several videos

**Files:**
- Create: `features/pages/TapToPlay.tsx`
- Modify:
  - `features/pages/PageView.tsx` (`VideoView`)
  - `features/pages/editor/editors/VideoEditor.tsx`
- Test:
  - `features/pages/PageView.test.tsx`
  - `features/pages/editor/PageEditor.test.tsx`

**Interfaces:**
- Consumes: Task 4's `videoEmbed`, `VideoItem` and `startSeconds`.
- Produces: `<TapToPlay embed title />`.

- [ ] **Step 1: Write the failing tests.** In `features/pages/PageView.test.tsx`:

```tsx
describe("Video extras", () => {
  const video = (videos: object[], description = "About these") => ({
    ...PAGE_DEFAULTS.video(),
    title: "Clips",
    description,
    videos,
  });
  const v = (url: string, patch: object = {}) => ({ title: "", url, start: "", ...patch });

  it("holds a TikTok back until it's tapped", async () => {
    const user = userEvent.setup();
    const { container } = view("video", video([v("https://www.tiktok.com/@cafe/video/7234567890123456789")]), false);
    expect(container.querySelector("iframe")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Tap to play from TikTok" }));
    expect(container.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://www.tiktok.com/embed/v2/7234567890123456789",
    );
  });

  it("plays YouTube in place from its start time", () => {
    const { container } = view("video", video([v("https://youtu.be/dQw4w9WgXcQ", { start: "1:23" })]), false);
    expect(container.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=83",
    );
  });

  it("gives each of several videos its own card and title, with the description at the top", () => {
    view(
      "video",
      video([
        v("https://youtu.be/dQw4w9WgXcQ", { title: "Trailer" }),
        v("https://www.loom.com/share/0123456789abcdef0123456789abcdef", { title: "Behind the scenes" }),
      ]),
      false,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Trailer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Behind the scenes" })).toBeInTheDocument();
    // Under the page title, before the first video.
    const description = screen.getByText("About these");
    const first = screen.getByRole("heading", { level: 2, name: "Trailer" });
    expect(description.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps players still in the editor's preview", () => {
    const { container } = view("video", video([v("https://www.tiktok.com/@cafe/video/7234567890123456789")]), true);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.queryByRole("button", { name: /Tap to play/ })).toBeNull();
  });
});
```

In `features/pages/editor/PageEditor.test.tsx`:

```tsx
describe("Video editor extras", () => {
  function Video() {
    const [page, setPage] = useState(PAGE_DEFAULTS.video());
    return (
      <>
        <PageEditor type="video" page={page} errors={{}} onUpdate={(update) => setPage((p) => update(p))} />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);

  it("adds a second video with a title and a start time", async () => {
    const user = userEvent.setup();
    render(<Video />);
    await user.type(screen.getByRole("textbox", { name: /^Video link/ }), "youtu.be/dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "Add video" }));
    const links = screen.getAllByRole("textbox", { name: /^Video link/ });
    await user.type(links[1]!, "loom.com/share/0123456789abcdef0123456789abcdef");
    await user.type(screen.getAllByRole("textbox", { name: /^Start at/ })[1]!, "0:10");
    expect(saved().videos).toHaveLength(2);
    expect(saved().videos[1]).toMatchObject({ start: "0:10" });
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages -t "Video extras|Video editor extras"`
Expected: FAIL.

- [ ] **Step 3: Implement.**

Create `features/pages/TapToPlay.tsx`:

```tsx
"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";
import type { VideoEmbed } from "@/lib/pages/urls";

/** A video from a site with trackers, loaded only once it's tapped (spec item 45). */
export function TapToPlay({ embed, title }: { embed: VideoEmbed; title: string }) {
  const [on, setOn] = useState(false);
  const shape = embed.vertical ? "mx-auto aspect-[9/16] w-full max-w-[22rem]" : "aspect-video w-full";
  if (on) {
    return (
      <iframe
        src={embed.src}
        title={title}
        className={shape}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOn(true)}
      className={cn(
        shape,
        "grid place-items-center bg-black text-white focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white",
      )}
    >
      <span className="flex flex-col items-center gap-2 text-sm font-semibold">
        <Play aria-hidden className="size-12" />
        Tap to play from {embed.name}
      </span>
    </button>
  );
}
```

`features/pages/PageView.tsx` `VideoView`:

```tsx
function VideoPlayer({ video, title, preview }: { video: VideoItem; title: string; preview?: boolean }) {
  const embed = videoEmbed(video.url, video.start);
  const link = !embed ? safeHref(video.url) : null;
  return (
    <>
      {/* The player sits inside the card's padding: no overhang on phones. */}
      <div className="overflow-hidden rounded-(--pg-radius) bg-black">
        {preview && embed ? (
          <StillMedia icon={<Play aria-hidden className="size-12" />} />
        ) : embed?.tap ? (
          <TapToPlay embed={embed} title={title} />
        ) : embed ? (
          <iframe
            src={embed.src}
            title={title}
            className="aspect-video w-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="grid aspect-video place-items-center text-white/80">
            <Play aria-hidden className="size-14" />
          </div>
        )}
      </div>
      {link && (
        <PageLink href={link} preview={preview}>
          <Play aria-hidden /> Watch video
        </PageLink>
      )}
    </>
  );
}

function VideoView({ page, preview }: ViewProps<VideoPage>) {
  const look = page.look;
  // Drawn as given: an old page with only a link shows it as its one video.
  const all = page.videos ?? [{ title: "", url: (page as unknown as { url?: string }).url ?? "", start: "" }];
  const videos = all.filter((v) => v.url.trim());
  const many = videos.length > 1;
  const description = page.description.trim() && <Prose text={page.description} />;
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader look={look} layout="classic" image={null} imageAlt="" title={page.title || "Video"} />
      {many && description && <div className="px-1">{description}</div>}
      {(videos.length ? videos : [{ title: "", url: "", start: "" }]).map((video, i) => (
        <PageCard key={i} className="flex flex-col gap-4">
          {video.title.trim() && (
            <h2 className="font-page-heading text-lg font-bold text-fg">{video.title}</h2>
          )}
          <VideoPlayer video={video} title={video.title.trim() || page.title || "Video"} preview={preview} />
          {!many && description}
        </PageCard>
      ))}
    </PageFrame>
  );
}
```

Imports: `TapToPlay` from `./TapToPlay`, and `type VideoItem`.

`features/pages/editor/editors/VideoEditor.tsx`: the Video card becomes a "Videos" card with:

```tsx
        <SortableList
          label="Videos"
          showLabel={false}
          items={page.videos}
          onChange={(videos) => set({ videos })}
          max={LIMITS.videos}
          addLabel="Add video"
          addAt="end"
          newRowFocus="input[type='url']"
          path="videos"
          errors={errors}
          itemLabel={(item, i) => rowName("video", item.title || item.url, i)}
          newItem={() => ({ title: "", url: "", start: "" })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <TextField
                label="Video link"
                type="url"
                inputMode="url"
                value={item.url}
                onChange={(url) => update({ url })}
                path={`videos.${i}.url`}
                errors={errors}
                placeholder="https://youtu.be/…"
                hint="YouTube, Vimeo, TikTok, Instagram, Facebook or Loom. The last four load when tapped."
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <TextField
                  path={`videos.${i}.title`}
                  errors={errors}
                  label="Video title"
                  optional
                  value={item.title}
                  onChange={(title) => update({ title })}
                />
                <TextField
                  path={`videos.${i}.start`}
                  errors={errors}
                  label="Start at"
                  optional
                  placeholder="1:23"
                  hint="YouTube, Vimeo and Loom"
                  value={item.start}
                  onChange={(start) => update({ start })}
                />
              </div>
            </div>
          )}
        />
```

Imports: `LIMITS`, `rowName` and `SortableList`. The Details card (Title, Description) stays.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS, including "video shows all of its fields" (`Video link`) and the every-box-has-a-limit test (`videos.N.url/title/start`).

- [ ] **Step 5: Commit.**

```bash
git add features/pages
git commit -m "The Video page and editor: several videos with titles and start times; TikTok, Instagram, Facebook and Loom play after a tap"
```

---

### Task 6: App: the store switch, screenshots and features

**Files:**
- Modify:
  - `lib/pages/types.ts` (`AppPage`, `LIMITS.screenshots/features`, defaults)
  - `lib/pages/sanitize.ts`
  - `lib/dynamic/target.ts` (`storeRedirect`)
  - `features/pages/Viewer.tsx` (`Gallery`'s `portrait`)
  - `features/pages/editor/fields.tsx` (`ImagesField`'s `maxSide`)
  - `features/pages/PageView.tsx` (`AppView`)
  - `features/pages/editor/editors/AppEditor.tsx`
- Test:
  - `lib/dynamic/dynamic.test.ts`
  - `lib/pages/pages.test.ts`
  - `features/pages/PageView.test.tsx`
  - `features/pages/editor/PageEditor.test.tsx`

**Interfaces:**
- Produces:
  - `AppPage.storeRedirect: boolean` (default true), `screenshots: Media[]` and `features: { text: string }[]`;
  - `Gallery`'s `portrait?: boolean`;
  - `ImagesField`'s `maxSide?: number`.

- [ ] **Step 1: Write the failing tests.** In `lib/dynamic/dynamic.test.ts`, next to the app cases:

```ts
  it("sends phones to their store only while the App page's switch is on", () => {
    const content = {
      name: "A",
      iosUrl: "https://apps.apple.com/app/id1",
      androidUrl: "https://play.google.com/store/apps/details?id=a",
    };
    const app = (extra: object) => ({ destination: null, qr_type: "app", content: { ...content, ...extra } });
    // Old pages have no switch: they go to the store, as before.
    expect(scanTarget(app({}), "APP1", "iOS", site)).toBe("https://apps.apple.com/app/id1");
    expect(scanTarget(app({ storeRedirect: false }), "APP1", "iOS", site)).toBe(`${site}/p/APP1`);
    expect(scanTarget(app({ storeRedirect: false }), "APP1", "Android", site)).toBe(`${site}/p/APP1`);
  });
```

Use the `site` constant the nearby tests use.

In `lib/pages/pages.test.ts`:

```ts
describe("App store switch, screenshots and features", () => {
  it("reads an old app page with the switch on and no screenshots or features", () => {
    expect(sanitizePage("app", { name: "A" })).toMatchObject({
      storeRedirect: true,
      screenshots: [],
      features: [],
    });
    expect(sanitizePage("app", { name: "A", features: [{ text: "Offline" }, { text: 3 }] }).features).toEqual([
      { text: "Offline" },
      { text: "" },
    ]);
  });
});
```

In `features/pages/PageView.test.tsx`:

```tsx
describe("App extras", () => {
  it("shows tall screenshots that open in the viewer, and the features", () => {
    view(
      "app",
      {
        ...PAGE_DEFAULTS.app(),
        name: "Tasks",
        iosUrl: "https://apps.apple.com/app/id1",
        screenshots: [media("s1.png", "image/png"), media("s2.png", "image/png")],
        features: [{ text: "Works offline" }, { text: "" }, { text: "Syncs everywhere" }],
      },
      false,
    );
    expect(screen.getByRole("button", { name: "Open photo 1 of 2" })).toBeInTheDocument();
    const features = within(screen.getByRole("region", { name: "Features" }));
    expect(features.getAllByRole("listitem")).toHaveLength(2);
    expect(features.getByText("Works offline")).toBeInTheDocument();
  });
});
```

In `features/pages/editor/PageEditor.test.tsx`:

```tsx
describe("App editor extras", () => {
  function App() {
    const [page, setPage] = useState(PAGE_DEFAULTS.app());
    return (
      <>
        <PageEditor type="app" page={page} errors={{}} onUpdate={(update) => setPage((p) => update(p))} />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);

  it("turns the store switch off, and adds a feature", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("switch", { name: /^Send phones straight to their store/ }));
    await user.click(screen.getByRole("button", { name: "Add feature" }));
    await user.type(screen.getByRole("textbox", { name: /^Feature/ }), "Works offline");
    expect(saved()).toMatchObject({ storeRedirect: false, features: [{ text: "Works offline" }] });
    expect(screen.getByText("Screenshots")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/dynamic lib/pages features/pages -t "store|App extras|App editor extras|App store switch"`
Expected: FAIL.

- [ ] **Step 3: Implement.**

`lib/pages/types.ts`:
- `AppPage` gains:

  ```ts
  /** iPhones/iPads to the App Store and Android to Google Play, from the scan (spec item 51). */
  storeRedirect: boolean;
  /** Up to 5, resized to 1200 px (spec item 52). */
  screenshots: Media[];
  /** Up to 6, each up to 80 characters (spec item 53). */
  features: { text: string }[];
  ```

- `LIMITS` gains `screenshots: 5, features: 6`.
- The defaults add `storeRedirect: true, screenshots: [], features: []`.

`lib/pages/sanitize.ts` app schema gains:

```ts
    // Every App code sent phones to their store before this could be switched off.
    storeRedirect: { kind: "bool", fallback: true },
    screenshots: { kind: "mediaList", max: LIMITS.screenshots },
    features: { kind: "list", max: LIMITS.features, item: { text: str(80) } },
```

`lib/dynamic/target.ts`: wrap the store checks in `if (page.storeRedirect) { … }`.

`features/pages/Viewer.tsx` `Gallery`:
- Add `portrait = false`.
- The list item becomes `className={portrait ? "w-[45%] max-w-48 shrink-0 snap-start" : "w-[70%] max-w-64 shrink-0 snap-start"}`.
- Each image's class uses `portrait ? "aspect-[9/16]" : "aspect-[4/3]"`.

`features/pages/editor/fields.tsx` `ImagesField`: add `maxSide?: number` and pass it in `uploadMedia(file, "image", { ownerId, maxSide })`.

`features/pages/PageView.tsx` `AppView`, after the store buttons card:

```tsx
      <Gallery
        images={(page.screenshots ?? []).map((media, i, all) => ({
          media,
          alt: `Screenshot ${i + 1} of ${all.length}`,
        }))}
        label="Screenshots"
        preview={preview}
        portrait
      />
      {features.length > 0 && (
        <PageCard>
          <section aria-label="Features">
            <h2 className="mb-3 font-page-heading text-lg font-bold text-fg">Features</h2>
            <ul className="flex flex-col gap-2.5">
              {features.map((f, i) => (
                <li key={i} className="flex gap-3 text-[15px] text-fg">
                  <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--page-accent)]" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{f.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </PageCard>
      )}
```

`features` is `(page.features ?? []).filter((f) => f.text.trim())`. Import `Check` from lucide.

`features/pages/editor/editors/AppEditor.tsx`:
1. **The Store links card:** the fixed paragraph becomes:

```tsx
        <ToggleField
          label="Send phones straight to their store"
          description="iPhones and iPads go to the App Store, Android phones to Google Play. Computers, and phones without their store’s link, see this page."
          checked={page.storeRedirect}
          onChange={(storeRedirect) => set({ storeRedirect })}
        />
```

2. **A "Screenshots" card:**

```tsx
      <FormCard title="Screenshots" note="Tall phone screenshots, shown as a row to swipe">
        <ImagesField
          value={page.screenshots}
          onChange={(screenshots) => set({ screenshots })}
          onAdd={(media) =>
            set((latest) => ({ screenshots: [...latest.screenshots, media].slice(0, LIMITS.screenshots) }))
          }
          max={LIMITS.screenshots}
          maxSide={1200}
          field="screenshots"
        />
      </FormCard>
```

3. **A "Features" card:**

```tsx
      <FormCard title="Features" note="Short points, shown as a checklist">
        <SortableList
          label="Features"
          showLabel={false}
          items={page.features}
          onChange={(features) => set({ features })}
          max={LIMITS.features}
          addLabel="Add feature"
          addAt="end"
          path="features"
          errors={errors}
          itemLabel={(item, i) => rowName("feature", item.text, i)}
          newItem={() => ({ text: "" })}
          render={(item, update, i) => (
            <TextField
              path={`features.${i}.text`}
              errors={errors}
              label="Feature"
              placeholder="Works offline"
              value={item.text}
              onChange={(text) => update({ text })}
            />
          )}
        />
      </FormCard>
```

Imports: `LIMITS`, `ImagesField`, `rowName`, `ToggleField` and `SortableList`. In the every-box-has-a-limit test, seed `if (type === "app") page.features = [{ text: "" }];`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib features && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib features
git commit -m "App pages: a switch for sending phones to their store, screenshots, and features"
```

---

### Task 7: Browser tests

**Files:**
- Modify: `e2e/accounts/fixtures.ts`
- Create: `e2e/accounts/images-video-app.spec.ts`

- [ ] **Step 1: Add the fixture pages to `PHONE_PAGES`,** so the phone and axe sweeps cover them. Photos use the `photo()` placeholder helper from Release 3. The video fixture uses only tap-to-play sites and a plain link, so no outside player loads during the sweeps.

```ts
  {
    type: "images",
    slug: "PHONE-IMAGES-GRID3",
    content: {
      title: "Phone grid",
      layout: "grid3",
      images: Array.from({ length: 7 }, (_, i) => ({
        image: photo(`grid-${i}`),
        caption: i === 0 ? "A long caption that describes the first picture in detail" : "",
        link: i === 0 ? "https://example.com/first" : "",
      })),
    },
  },
  {
    type: "images",
    slug: "PHONE-IMAGES-CAROUSEL",
    content: {
      title: "Phone carousel",
      layout: "carousel",
      images: Array.from({ length: 4 }, (_, i) => ({
        image: photo(`slide-${i}`),
        caption: `Slide ${i + 1}`,
        link: "",
      })),
    },
  },
  {
    type: "video",
    slug: "PHONE-VIDEO-PLUS",
    content: {
      title: "Phone clips",
      description: "Three ways to watch.",
      videos: [
        { title: "On TikTok", url: "https://www.tiktok.com/@cafe/video/7234567890123456789", start: "" },
        { title: "On Loom", url: "https://www.loom.com/share/0123456789abcdef0123456789abcdef", start: "0:10" },
        { title: "Elsewhere", url: "https://example.com/video", start: "" },
      ],
    },
  },
  {
    type: "app",
    slug: "PHONE-APP-PLUS",
    content: {
      name: "Phone app plus",
      iosUrl: "https://apps.apple.com/app/id1",
      androidUrl: "https://play.google.com/store/apps/details?id=com.example",
      storeRedirect: false,
      screenshots: Array.from({ length: 5 }, (_, i) => photo(`shot-${i}`)),
      features: [
        { text: "Works offline" },
        { text: "Syncs across every device you own, even very old ones" },
      ],
    },
  },
```

- [ ] **Step 2: Write the tests.** Create `e2e/accounts/images-video-app.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { MAKER } from "./fixtures";

test.describe("Images, Video and App extras", () => {
  test.use({ storageState: MAKER.state });
  // No outside players or trackers in tests.
  test.beforeEach(async ({ page }) => {
    await page.route(/tiktok\.com|loom\.com|instagram\.com|facebook\.com/, (route) => route.abort());
  });

  test("a grid image opens in the viewer with its caption and link", async ({ page }) => {
    await page.goto("p/PHONE-IMAGES-GRID3");
    await page
      .getByRole("button", { name: "A long caption that describes the first picture in detail" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Photo 1 of 7" });
    await expect(dialog.getByRole("link", { name: "Open link" })).toHaveAttribute(
      "href",
      "https://example.com/first",
    );
  });

  test("the carousel's dots follow a swipe", async ({ page }) => {
    await page.goto("p/PHONE-IMAGES-CAROUSEL");
    await page.getByRole("button", { name: "Go to image 3 of 4" }).click();
    await expect(page.getByRole("button", { name: "Go to image 3 of 4" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.getByText("Slide 3")).toBeInViewport();
  });

  test("TikTok loads only after a tap, and several videos each have a title", async ({ page }) => {
    await page.goto("p/PHONE-VIDEO-PLUS");
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: "On Loom" })).toBeVisible();
    await page.getByRole("button", { name: "Tap to play from TikTok" }).click();
    await expect(page.locator("iframe")).toHaveAttribute(
      "src",
      "https://www.tiktok.com/embed/v2/7234567890123456789",
    );
    await expect(page.getByRole("link", { name: /Watch video/ })).toHaveAttribute(
      "href",
      "https://example.com/video",
    );
  });

  test("an app page shows its screenshots and features", async ({ page }) => {
    await page.goto("p/PHONE-APP-PLUS");
    await page.getByRole("button", { name: "Open photo 2 of 5" }).click();
    await expect(page.getByRole("dialog", { name: "Photo 2 of 5" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("region", { name: "Features" }).getByText("Works offline")).toBeVisible();
  });

  test("the editors set a layout, add a video and turn the store switch off", async ({ page }) => {
    await page.goto("codes/new?type=images");
    await page.getByRole("combobox", { name: /^Layout/ }).selectOption("single");
    await page.goto("codes/new?type=video");
    await page.getByRole("button", { name: "Add video" }).click();
    await expect(page.getByRole("textbox", { name: /^Video link/ })).toHaveCount(2);
    await page.goto("codes/new?type=app");
    const toggle = page.getByRole("switch", { name: /^Send phones straight to their store/ });
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
  });
});
```

- [ ] **Step 3: Run the signed-in suite.**

Run: `npm run test:e2e:accounts`
Expected: all PASS, including the phone and look sweeps for the new pages. If a phone profile shows sideways scroll or axe flags a color, fix the code, not the test.

- [ ] **Step 4: Commit.**

```bash
git add e2e/accounts
git commit -m "Browser tests: image layouts, captions, links and carousel; videos tapped to play; app screenshots, features and store switch"
```

---

### Task 8: Ship Release 4a

There's no migration in this release; it's all page content.

- [ ] **Step 1: Update the API docs.** In `app/(docs)/developers/page.tsx`, after the Menu, Coupon and Event paragraph:

> Images pages take `images` (up to 24, each an uploaded `image`, a `caption` of up to 200 characters, and a `link`); a plain list of files still works. They also take a `layout`: `grid2`, `grid3`, `single` or `carousel`. Video pages take `videos` (up to 10, each a `title`, a `url` from YouTube, Vimeo, TikTok, Instagram, Facebook or Loom, and a `start` like `1:23`). A single `url` still works, as the first video. App pages take `storeRedirect` (true sends phones to their store), `screenshots` (up to 5 images) and `features` (up to 6, each a `text`).

Commit it.

- [ ] **Step 2: Run the full local check.**

Run: `npm run format:check && npm run lint && npx tsc --noEmit && npm test && npm run test:e2e:accounts && npm run build && npm run test:e2e`
Expected: all PASS. `format:check` may list only git-ignored files under `.superpowers/`.

- [ ] **Step 3: Run the final whole-branch review.** Follow the "Final Review" section of superpowers:executing-plans, with this plan's Review Focus and the ledger's rulings. Do one fix pass.

- [ ] **Step 4: Push, open the PR, wait for CI, and merge.**

```bash
git push -u origin feat/page-enhancements-r4a
gh pr create --base main --head feat/page-enhancements-r4a --title "Page enhancements 4a: Images captions, layouts and viewer; several videos from six sites; App store switch, screenshots and features" --body "<items 41–47 and 51–53, no migration, rulings, and the test counts from Step 2>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
gh pr merge --merge
```

- [ ] **Step 5: Check the live site.**
1. Wait for the version in `https://ziplume.com/sw.js` to change.
2. Find client chunks containing "Captions and links", "Tap to play from" and "Send phones straight to their store".
3. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307.
4. Create nothing and change no data in David's account.
