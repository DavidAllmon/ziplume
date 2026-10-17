# Page enhancements, Release 2b: the Contact page, Business, and the photo viewer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- **Contact pages** get:
  - a cover photo;
  - Call/Text/Email/WhatsApp/Directions buttons;
  - pronouns, a department, and up to 4 websites.
- **Business pages** get:
  - "Open now";
  - split hours and closure dates;
  - a photo gallery with a full-screen viewer;
  - ready-made review, booking and ordering buttons;
  - a services list.

**Architecture:**
- **Content:** every new field is optional page content with a default, read through the existing schemas in `lib/pages/sanitize.ts`. One upgrade step turns an old Contact page's single `website` into `websites[0]`.
- **Pure helpers** in `lib/pages/hours.ts` work out "Open now" from the hours, closures and a time zone.
- **A small client component** renders "Open now" after hydration and refreshes it each minute.
- **The viewer** is one client component (`features/pages/Viewer.tsx`) that the Business gallery uses now and later releases reuse.
- **Quick buttons:** Business's Call/Email/Directions row becomes a shared `QuickActions` part that both pages use.

**Tech Stack:**
- Next.js 16 and React 19 (`useSyncExternalStore` for time drawn only in the browser).
- Headless UI 2.2 Dialog, for the viewer.
- Tailwind 4.
- Vitest with jsdom.
- Playwright: the signed-in suite.

**Spec:** `docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md`, section 5 items 11–14 and 16–20, and section 3 (rules for every release). Release 2a (the Link list) is live. The shared `LinkItem`, `linkIcon`, `LinkIconMark`, `Labeled` and `lib/time/local.ts` exist.

## Global Constraints

- **Contact page:**
  - **Cover photo:** an optional wide image above the header (resized to 1600 px). With a cover, the header uses the Banner layout. (spec 11)
  - **Quick buttons** under the name: Call, Text, Email and WhatsApp. They use the first phone number and first email; WhatsApp uses the first number ticked "WhatsApp". Each button can be turned off. (spec 12)
  - **Details:** pronouns and department (up to 60 characters each), and up to 4 websites with labels, replacing the single website. An old page's website becomes the first one. All of these go into the saved contact card. (spec 13)
  - **Directions:** the address gets a Directions link that opens maps, as on Business pages. (spec 14)
- **Business:**
  - **Open now** (spec 16):
    - The page shows "Open now · closes 5:00 PM", "Closes soon", or "Closed · opens 9:00 AM tomorrow".
    - It's worked out on the visitor's phone from the opening hours, in the business's time zone.
    - The time zone is a new field, defaulting to the owner's when they first edit.
  - **Split hours and closures:** each day can have two time ranges. Up to 10 closure dates, each with an optional note; on a closure date the page says "Closed today" with the note. (spec 17)
  - **Gallery** (spec 18):
    - Up to 6 photos (resized to 1600 px), shown as a row you can swipe.
    - Tapping one opens a full-screen viewer: swipe or use the arrow keys, Escape closes it, and the caption shows.
    - Menu dishes, Images and App screenshots reuse the viewer in later releases.
  - **Ready-made buttons:** "Add button" offers Google review, Yelp, Book now and Order online. They fill in the label and icon; the owner adds the link. (spec 19)
  - **Services:** a list of up to 30, each with a name, price and short description, shown under About. (spec 20)
- Section 3 rules apply:
  - old pages read exactly as before;
  - new images are resized;
  - previews stay inert;
  - visible labels and 44 px targets on phones;
  - no sideways scroll from 320 px;
  - axe clean in light and dark;
  - limits are visible;
  - the API docs list every new field.

## Rulings made in this plan (for David's review)

1. **With a cover photo, the Contact page shows the cover across the top with the person's photo overlapping it.** The spec's "Banner layout" would otherwise drop the photo. The Look tab's Header card says so when a cover is set.
2. **When the business has no time zone yet, "Open now" uses each visitor's own clock.** QR codes are scanned at or near the business, so that's almost always right. A new page (no name yet) starts in the owner's own time zone, and the owner can change it. Opening an existing page never changes it; it gets a zone only when the owner picks one.
3. **"Open now" checks closure dates for today and the days ahead,** so "opens 9:00 AM tomorrow" skips a closed tomorrow. Hours past midnight (like 6 PM to 2 AM) aren't supported yet. Closing must still be after opening, as today.
4. **Business buttons get icons the same way Link list links do:** a known site's icon, or the ready-made button's own icon (a star for reviews, a calendar for booking, a bag for ordering).
5. **Directions is a quick button on the Contact page too,** and like the others it can be turned off. The address row still opens maps.
6. **Pronouns go into the saved contact card as a "Pronouns: they/them" line at the top of its note,** since contact cards have no pronouns field phones understand.

## Review Focus

1. **"Open now" edge cases:**
   - just before opening, at the exact opening and closing minute, between a split day's two ranges, and late at night;
   - a closure today, a closure tomorrow, and a business closed all week;
   - a time zone that isn't valid.

   It must never claim open when closed, and never throw. *Task 4 test.*
2. **An old Contact page with a single `website`** shows it, saves it in the contact card, and keeps it after the first edit, as `websites[0]`. *Task 2 test.*
3. **Quick buttons with missing details:** no phone, no email, no WhatsApp number, or no address. Only the buttons that can work are drawn, and a page with none draws no empty row. *Task 2 test.*
4. **The viewer:**
   - one photo (no previous or next);
   - the first and last photo;
   - keyboard only;
   - a screen reader (a dialog with a name, focus kept inside and returned to the photo you opened);
   - a swipe shorter than a tap.

   *Task 1 test.*
5. **A gallery of 6 photos and a long services list at 320 px.** The row scrolls inside itself, never the page, and every target is 44 px. *Task 6 phone sweep.*

---

### Task 1: The full-screen photo viewer and gallery row

**Files:**
- Create:
  - `features/pages/Viewer.tsx`
  - `features/pages/Viewer.test.tsx`

**Interfaces:**
- Produces:
  - `type ViewerImage = { media: Media; alt: string; caption?: string }`.
  - `<Viewer images={ViewerImage[]} index={number | null} onIndex={(i: number) => void} onClose={() => void} />`.
  - `<Gallery images={ViewerImage[]} label={string} preview?: boolean />`, a swipeable row of thumbnails that opens the viewer.

- [ ] **Step 1: Create the branch and commit this plan.**

```bash
git checkout -b feat/page-enhancements-r2b main
git add docs/superpowers/plans/2026-10-16-page-enhancements-release-2b-contact-business.md
git commit -m "Plan: page enhancements release 2b, Contact page, Business and the photo viewer"
```

- [ ] **Step 2: Write the failing tests.** Create `features/pages/Viewer.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Gallery } from "./Viewer";

const UID = "11111111-1111-4111-8111-111111111111";
const photo = (n: number) => ({
  media: { path: `${UID}/${n}.jpg`, name: `${n}.jpg`, type: "image/jpeg", size: 1 },
  alt: `Photo ${n}`,
  caption: n === 2 ? "The terrace" : undefined,
});
const three = [photo(1), photo(2), photo(3)];

describe("Gallery and Viewer", () => {
  it("opens the photo you tap, full screen, with its caption", async () => {
    const user = userEvent.setup();
    render(<Gallery images={three} label="Photos" />);
    await user.click(screen.getByRole("button", { name: "Open photo 2 of 3" }));
    const dialog = screen.getByRole("dialog", { name: "Photo 2 of 3" });
    expect(within(dialog).getByRole("img", { name: "Photo 2" })).toBeInTheDocument();
    expect(within(dialog).getByText("The terrace")).toBeInTheDocument();
  });

  it("goes back and forth with the arrow keys and buttons, and stops at the ends", async () => {
    const user = userEvent.setup();
    render(<Gallery images={three} label="Photos" />);
    await user.click(screen.getByRole("button", { name: "Open photo 1 of 3" }));
    expect(screen.getByRole("button", { name: "Previous photo" })).toBeDisabled();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("dialog", { name: "Photo 2 of 3" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByRole("dialog", { name: "Photo 3 of 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next photo" })).toBeDisabled();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("dialog", { name: "Photo 2 of 3" })).toBeInTheDocument();
  });

  it("closes on Escape and gives focus back to the photo you opened", async () => {
    const user = userEvent.setup();
    render(<Gallery images={three} label="Photos" />);
    const thumb = screen.getByRole("button", { name: "Open photo 3 of 3" });
    await user.click(thumb);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(thumb).toHaveFocus();
  });

  it("turns a sideways swipe into next or previous, and ignores a tap", async () => {
    const user = userEvent.setup();
    render(<Gallery images={three} label="Photos" />);
    await user.click(screen.getByRole("button", { name: "Open photo 2 of 3" }));
    const stage = screen.getByTestId("viewer-stage");
    fireEvent.pointerDown(stage, { clientX: 200, pointerType: "touch" });
    fireEvent.pointerUp(stage, { clientX: 190, pointerType: "touch" });
    expect(screen.getByRole("dialog", { name: "Photo 2 of 3" })).toBeInTheDocument();
    fireEvent.pointerDown(stage, { clientX: 200, pointerType: "touch" });
    fireEvent.pointerUp(stage, { clientX: 60, pointerType: "touch" });
    expect(screen.getByRole("dialog", { name: "Photo 3 of 3" })).toBeInTheDocument();
  });

  it("shows one photo with no previous or next", async () => {
    const user = userEvent.setup();
    render(<Gallery images={[photo(1)]} label="Photos" />);
    await user.click(screen.getByRole("button", { name: "Open photo 1 of 1" }));
    expect(screen.queryByRole("button", { name: "Previous photo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next photo" })).toBeNull();
  });

  it("is a still row in the editor's preview", () => {
    render(<Gallery images={three} label="Photos" preview />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("list", { name: "Photos" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run them and watch them fail.**

Run: `npx vitest run features/pages/Viewer.test.tsx`
Expected: FAIL. `./Viewer` doesn't exist.

- [ ] **Step 4: Implement.** Create `features/pages/Viewer.tsx`:

```tsx
"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRef, useState } from "react";

import type { Media } from "@/lib/pages/types";

import { MediaImage } from "./parts";

export interface ViewerImage {
  media: Media;
  alt: string;
  caption?: string;
}

const SWIPE = 50;
const control =
  "grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-30";

/** Full-screen photos: swipe or arrow keys to move, Escape to close (spec item 18). */
export function Viewer({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: ViewerImage[];
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const start = useRef<number | null>(null);
  const open = index !== null && images[index] !== undefined;
  const at = index ?? 0;
  const image = images[at];
  const many = images.length > 1;
  const go = (to: number) => {
    if (to >= 0 && to < images.length) onIndex(to);
  };
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/95" aria-hidden />
      <DialogPanel
        className="fixed inset-0 flex flex-col text-white"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") go(at + 1);
          if (event.key === "ArrowLeft") go(at - 1);
        }}
      >
        <div className="flex items-center justify-between gap-3 px-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <DialogTitle className="text-sm font-medium tabular-nums">
            Photo {at + 1} of {images.length}
          </DialogTitle>
          <button type="button" aria-label="Close" onClick={onClose} className={control}>
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div
          data-testid="viewer-stage"
          className="flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 py-3"
          onPointerDown={(event) => (start.current = event.clientX)}
          onPointerUp={(event) => {
            if (start.current === null) return;
            const moved = event.clientX - start.current;
            start.current = null;
            if (moved <= -SWIPE) go(at + 1);
            if (moved >= SWIPE) go(at - 1);
          }}
        >
          {image && (
            <MediaImage
              media={image.media}
              alt={image.alt}
              eager
              className="max-h-full max-w-full object-contain select-none"
            />
          )}
        </div>
        <div className="flex items-center gap-3 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          {many && (
            <button
              type="button"
              aria-label="Previous photo"
              disabled={at === 0}
              onClick={() => go(at - 1)}
              className={control}
            >
              <ChevronLeft aria-hidden className="size-6" />
            </button>
          )}
          <p className="min-w-0 flex-1 text-center text-sm text-white/90">{image?.caption}</p>
          {many && (
            <button
              type="button"
              aria-label="Next photo"
              disabled={at === images.length - 1}
              onClick={() => go(at + 1)}
              className={control}
            >
              <ChevronRight aria-hidden className="size-6" />
            </button>
          )}
        </div>
      </DialogPanel>
    </Dialog>
  );
}

/** A row of photos to swipe through; tapping one opens the viewer. Inert in the preview. */
export function Gallery({
  images,
  label,
  preview = false,
}: {
  images: ViewerImage[];
  label: string;
  preview?: boolean;
}) {
  const [index, setIndex] = useState<number | null>(null);
  if (!images.length) return null;
  return (
    <>
      <ul
        aria-label={label}
        className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1"
      >
        {images.map((image, i) => (
          <li key={image.media.path} className="w-[70%] max-w-64 shrink-0 snap-start">
            {preview ? (
              <MediaImage
                media={image.media}
                alt={image.alt}
                className="aspect-[4/3] w-full rounded-(--pg-radius) object-cover"
              />
            ) : (
              <button
                type="button"
                aria-label={`Open photo ${i + 1} of ${images.length}`}
                onClick={() => setIndex(i)}
                className="block w-full overflow-hidden rounded-(--pg-radius) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)"
              >
                <MediaImage
                  media={image.media}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!preview && (
        <Viewer images={images} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
      )}
    </>
  );
}
```

`MediaImage` is exported from `parts.tsx`.

The viewer's dialog name comes from `DialogTitle`, which Headless UI wires to `aria-labelledby`. Headless UI's Dialog traps focus and returns it to the button that opened it, which is what the Escape test checks. If the arrow-key handler on `DialogPanel` doesn't receive keys while focus is on a button inside it, move the handler to a `useEffect` that listens on `document` while `open`.

- [ ] **Step 5: Run the tests and watch them pass.**

Run: `npx vitest run features/pages/Viewer.test.tsx && npx tsc --noEmit && npx eslint features/pages`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add features/pages/Viewer.tsx features/pages/Viewer.test.tsx
git commit -m "A full-screen photo viewer and a swipeable gallery row"
```

---

### Task 2: The Contact page's cover, quick buttons, pronouns, department and websites (data and page)

**Files:**
- Modify:
  - `lib/pages/types.ts` (`VcardPage`, `PhoneItem`, defaults)
  - `lib/pages/sanitize.ts` (the vcard schema; the old-website upgrade)
  - `lib/pages/validate.ts` (websites)
  - `lib/pages/files.ts` (the contact card)
  - `features/pages/parts.tsx` (`QuickActions`; a Banner badge)
  - `features/pages/PageView.tsx` (`VcardView`; Business uses `QuickActions`)
- Test:
  - `lib/pages/pages.test.ts`
  - `features/pages/PageView.test.tsx`

**Interfaces:**
- Produces:
  - `VcardPage` gains `cover: Media | null`, `pronouns: string`, `department: string`, and `websites: { label: string; url: string }[]`, which replaces `website`.
  - It also gains `showCall`, `showText`, `showEmail`, `showWhatsapp` and `showDirections`, all `boolean` (default true).
  - `PhoneItem` gains `whatsapp: boolean`.
  - `QuickAction = { label: string; href: string; icon: ReactNode }`.
  - `<QuickActions actions={QuickAction[]} preview?: boolean />`.
  - `PageHeader`'s Banner takes `badge?: Media | null` and `badgeRound?: boolean`.

- [ ] **Step 1: Write the failing tests.**

In `lib/pages/pages.test.ts`:

```ts
describe("Contact page details", () => {
  it("turns an old single website into the first of the websites", () => {
    const page = sanitizePage("vcard", { firstName: "Ana", website: "ana.dev" });
    expect(page.websites).toEqual([{ label: "", url: "ana.dev" }]);
    expect(page).not.toHaveProperty("website");
    expect(page).toMatchObject({
      showCall: true,
      showText: true,
      showEmail: true,
      showWhatsapp: true,
      showDirections: true,
      pronouns: "",
      department: "",
      cover: null,
    });
    // A page that already has websites keeps them.
    const kept = sanitizePage("vcard", { websites: [{ label: "Blog", url: "b.dev" }], website: "x.dev" });
    expect(kept.websites).toEqual([{ label: "Blog", url: "b.dev" }]);
  });

  it("puts department, every website and pronouns in the saved contact card", () => {
    const card = contactVcard({
      ...PAGE_DEFAULTS.vcard(),
      firstName: "Ana",
      company: "Acme",
      department: "Design",
      pronouns: "she/her",
      bio: "Hi",
      websites: [
        { label: "Blog", url: "b.dev" },
        { label: "", url: "ana.dev" },
      ],
    });
    expect(card).toContain("ORG:Acme;Design");
    expect(card).toContain("URL:https://b.dev/");
    expect(card).toContain("URL:https://ana.dev/");
    expect(card).toContain("NOTE:Pronouns: she/her\\nHi");
  });

  it("checks each website", () => {
    const page = { ...PAGE_DEFAULTS.vcard(), firstName: "Ana", websites: [{ label: "", url: "not a url" }] };
    expect(validatePage("vcard", page)).toEqual({ "websites.0.url": "Enter a web address, like example.com" });
  });
});
```

`contactVcard` escapes newlines as `\n`, so the note check looks for `\\n` in the TypeScript source. Check `escapeVCard` in `lib/pages/files.ts` and match it.

In `features/pages/PageView.test.tsx`:

```tsx
describe("Contact page extras", () => {
  const ana = (patch: object = {}) => ({
    ...PAGE_DEFAULTS.vcard(),
    firstName: "Ana",
    jobTitle: "Designer",
    department: "Brand",
    company: "Acme",
    pronouns: "she/her",
    phones: [
      { label: "Mobile", number: "+1 555 010 2030", whatsapp: false },
      { label: "Work", number: "+1 555 010 4040", whatsapp: true },
    ],
    emails: [{ label: "Work", address: "ana@acme.com" }],
    address: "1 Main St",
    ...patch,
  });

  it("draws Call, Text, Email, WhatsApp and Directions from the first details", () => {
    view("vcard", ana(), false);
    const actions = within(screen.getByRole("navigation", { name: "Quick actions" }));
    expect(actions.getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:+15550102030");
    expect(actions.getByRole("link", { name: "Text" })).toHaveAttribute("href", "sms:+15550102030");
    expect(actions.getByRole("link", { name: "Email" })).toHaveAttribute("href", "mailto:ana@acme.com");
    expect(actions.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/15550104040");
    expect(actions.getByRole("link", { name: "Directions" })).toBeInTheDocument();
  });

  it("leaves out buttons that are off or can't work, and the whole row when none can", () => {
    const { unmount } = view("vcard", ana({ showText: false, phones: [{ label: "", number: "+1 555 010 2030", whatsapp: false }] }), false);
    const actions = within(screen.getByRole("navigation", { name: "Quick actions" }));
    expect(actions.queryByRole("link", { name: "Text" })).toBeNull();
    expect(actions.queryByRole("link", { name: "WhatsApp" })).toBeNull();
    unmount();
    view("vcard", ana({ phones: [], emails: [], address: "" }), false);
    expect(screen.queryByRole("navigation", { name: "Quick actions" })).toBeNull();
  });

  it("shows pronouns by the name, and the department in the role", () => {
    view("vcard", ana(), false);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ana (she/her)");
    expect(screen.getByText("Designer · Brand · Acme")).toBeInTheDocument();
  });

  it("draws the cover across the top with the photo over it", () => {
    const UID = "11111111-1111-4111-8111-111111111111";
    const img = (n: string) => ({ path: `${UID}/${n}.jpg`, name: `${n}.jpg`, type: "image/jpeg", size: 1 });
    const { container } = view("vcard", ana({ cover: img("cover"), photo: img("me") }), false);
    expect(container.querySelector("[data-header=banner]")).not.toBeNull();
    expect(container.querySelector("[data-header=banner] [data-badge]")).not.toBeNull();
  });

  it("lists each website with its label", () => {
    view("vcard", ana({ websites: [{ label: "Portfolio", url: "ana.dev" }, { label: "", url: "acme.com" }] }), false);
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ana\.dev/ })).toHaveAttribute("href", "https://ana.dev/");
  });
});
```

Import `within` if it isn't already.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages/pages.test.ts features/pages/PageView.test.tsx`
Expected: FAIL. There are no websites, quick actions, cover, pronouns or department yet.

- [ ] **Step 3: Implement.**

`lib/pages/types.ts`:
- `PhoneItem` gains `/** This number is on WhatsApp. */ whatsapp: boolean;`.
- `VcardPage` replaces `website: string` with:

```ts
  /** Up to 4; an old page's single website becomes the first. */
  websites: { label: string; url: string }[];
  /** A wide photo across the top (spec item 11). */
  cover: Media | null;
  pronouns: string;
  department: string;
  /** The quick buttons under the name (spec item 12); each can be turned off. */
  showCall: boolean;
  showText: boolean;
  showEmail: boolean;
  showWhatsapp: boolean;
  showDirections: boolean;
```

Add `websites: 4` to `LIMITS`. In `PAGE_DEFAULTS.vcard`:
- remove `website`;
- add `websites: [], cover: null, pronouns: "", department: ""` and the five `show…: true`;
- give the default phone `whatsapp: false`.

`lib/pages/sanitize.ts`, the vcard schema:

```ts
  vcard: {
    firstName: str(60),
    lastName: str(60),
    pronouns: str(60),
    jobTitle: str(),
    department: str(60),
    company: str(),
    bio: str(LIMITS.text),
    photo: media,
    cover: media,
    phones: {
      kind: "list",
      max: LIMITS.phones,
      item: { label: str(30), number: str(40), whatsapp: bool },
    },
    emails: { kind: "list", max: LIMITS.emails, item: { label: str(30), address: str(254) } },
    websites: { kind: "list", max: LIMITS.websites, item: { label: str(30), url: str(2048) } },
    address: str(LIMITS.medium),
    socials: social,
    showCall: { kind: "bool", fallback: true },
    showText: { kind: "bool", fallback: true },
    showEmail: { kind: "bool", fallback: true },
    showWhatsapp: { kind: "bool", fallback: true },
    showDirections: { kind: "bool", fallback: true },
  },
```

Add the upgrade step before `cleanObject` in `sanitizePage`:

```ts
/** Older content shapes, brought up to date before the schema reads them. */
const UPGRADES: Partial<Record<PageTypeId, (raw: Record<string, unknown>) => Record<string, unknown>>> = {
  // Contact pages had one website before they had several (spec item 13).
  vcard: (raw) =>
    !("websites" in raw) && typeof raw.website === "string" && raw.website.trim()
      ? { ...raw, websites: [{ label: "", url: raw.website }] }
      : raw,
};
```

In `sanitizePage`, before `cleanObject`:

```ts
  const upgraded = isObject(raw) && UPGRADES[type] ? UPGRADES[type]!(raw) : raw;
```

Then pass `upgraded` to `cleanObject`. Keep reading `source` (for the look) from `raw`.

`lib/pages/validate.ts` vcard: replace `checkUrl(errors, "website", p.website);` with `p.websites.forEach((w, i) => checkUrl(errors, \`websites.${i}.url\`, w.url));`.

`lib/pages/files.ts` `contactVcard`:
- `ORG:` becomes `ORG:${escapeVCard(company)}${department ? ";" + escapeVCard(department) : ""}`. Write it when either the company or the department is set.
- Replace the single `URL:` with one per website: `for (const w of card.websites) { const href = safeHref(w.url); if (href) lines.push(\`URL:${href}\`); }`.
- The note becomes `[card.pronouns.trim() && \`Pronouns: ${card.pronouns.trim()}\`, card.bio.trim()].filter(Boolean).join("\n")`. Write it when that isn't empty.

`features/pages/parts.tsx`:
- Export a `QuickActions` part, built from Business's current action grid:

```tsx
export interface QuickAction {
  label: string;
  href: string;
  icon: ReactNode;
}

/** The row of quick buttons (Call, Text, Email, WhatsApp, Directions) under a page's header. */
export function QuickActions({ actions, preview }: { actions: QuickAction[]; preview?: boolean }) {
  if (!actions.length) return null;
  return (
    <PageCard>
      <nav aria-label="Quick actions">
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(5rem,1fr))] gap-2">
          {actions.map(({ label, href, icon }) => (
            <li key={label}>
              <a
                href={preview ? undefined : href}
                {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex min-h-11 flex-col items-center gap-1 rounded-2xl bg-surface-2 px-2 py-3 text-sm font-semibold text-fg focus-visible:outline-2 focus-visible:outline-[var(--page-accent)] [&_svg]:size-5 [&_svg]:text-[var(--page-accent)]"
              >
                {icon}
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </PageCard>
  );
}
```

- `PageHeader`'s banner branch takes `badge` and a new `badgeRound?: boolean`. Under the banner image, when `badge` is set, render it overlapping the image's bottom edge. `MediaImage` takes no extra props, so wrap it: `<span data-badge className="relative mx-auto -mt-14 block w-fit"><MediaImage media={badge} alt="" eager className={cn("size-24 border-4 border-(--bg) bg-(--bg) object-cover", badgeRound ? "rounded-full" : "rounded-(--pg-radius)")} /></span>`.

`features/pages/PageView.tsx`:
- **`BusinessView`:** replace its action grid with `<QuickActions actions={…} preview={preview} />`, building the same three actions with icon nodes (`<Phone aria-hidden />` and so on). Its look stays the same.
- **`VcardView`:**

```tsx
  const role = [page.jobTitle, page.department, page.company]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");
  const first = page.phones.find((p) => telHref(p.number));
  const whatsapp = page.phones.find((p) => p.whatsapp && telHref(p.number));
  const email = page.emails.find((e) => mailHref(e.address));
  const actions = [
    page.showCall && first && { label: "Call", href: telHref(first.number)!, icon: <Phone aria-hidden /> },
    page.showText && first && { label: "Text", href: smsHref(first.number)!, icon: <MessageSquare aria-hidden /> },
    page.showEmail && email && { label: "Email", href: mailHref(email.address)!, icon: <Mail aria-hidden /> },
    page.showWhatsapp &&
      whatsapp && {
        label: "WhatsApp",
        href: `https://wa.me/${whatsapp.number.replace(/\D/g, "")}`,
        icon: <SocialIcon network="whatsapp" />,
      },
    page.showDirections &&
      page.address.trim() && { label: "Directions", href: mapsHref(page.address), icon: <MapPin aria-hidden /> },
  ].filter((a): a is QuickAction => Boolean(a));
```

- **The header:** with a cover, `layout="banner"`, `image={page.cover}`, `badge={page.photo}`, `badgeRound={look.shape === "circle"}`. Otherwise use `look.header` with the photo, as today.
- **The title:** `<>{name}{page.pronouns.trim() && <span className="ml-2 align-middle text-lg font-medium text-fg-muted">({page.pronouns.trim()})</span>}</>`. The test reads the heading's text content as "Ana (she/her)". If the space comes out doubled, use `{" "}` and no margin.
- **Websites:** one `ContactRow` per website with a `safeHref`, labeled `w.label.trim() || "Website"`, in place of the single website row.
- **Order:** put `<QuickActions …/>` after the Save contact button.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages features/pages && npx tsc --noEmit`
Expected: PASS. TypeScript finds every use of `page.website` for vcard (the editor in Task 3, fixtures and the API docs). In this task, fix the non-editor ones:
- `e2e/accounts/fixtures.ts` `PHONE-VCARD`: change `website` to `websites: [{ label: "", url: … }]`.
- The developers docs example, if it shows a vcard.
- Leave `VcardEditor` compiling: it still reads `page.website`. Give it a temporary `websites[0]` reading, which Task 3 replaces. Record that as a ruling only if it's still there after Task 3.

- [ ] **Step 5: Commit.**

```bash
git add lib/pages features/pages e2e/accounts/fixtures.ts "app/(docs)"
git commit -m "Contact pages: a cover, quick buttons, pronouns, department and several websites"
```

---

### Task 3: Editing the Contact page's new details

**Files:**
- Modify:
  - `features/pages/editor/editors/VcardEditor.tsx`
  - `features/pages/editor/look/HeaderCard.tsx` (the cover note)
- Test: `features/pages/editor/PageEditor.test.tsx`

**Interfaces:**
- Consumes: Task 2's fields.

- [ ] **Step 1: Write the failing tests.** In `features/pages/editor/PageEditor.test.tsx`:

```tsx
describe("Contact page editor extras", () => {
  function Contact() {
    const [page, setPage] = useState(PAGE_DEFAULTS.vcard());
    return (
      <>
        <PageEditor type="vcard" page={page} errors={{}} onUpdate={(u) => setPage((p) => u(p))} />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);

  it("edits pronouns, department and up to four websites", async () => {
    const user = userEvent.setup();
    render(<Contact />);
    await user.type(screen.getByRole("textbox", { name: /^Pronouns/ }), "she/her");
    await user.type(screen.getByRole("textbox", { name: /^Department/ }), "Design");
    await user.click(screen.getByRole("button", { name: "Add website" }));
    await user.type(screen.getByRole("textbox", { name: /^Website address/ }), "ana.dev");
    expect(saved()).toMatchObject({
      pronouns: "she/her",
      department: "Design",
      websites: [{ label: "", url: "ana.dev" }],
    });
  });

  it("ticks a number as WhatsApp, and turns quick buttons off", async () => {
    const user = userEvent.setup();
    render(<Contact />);
    await user.click(screen.getByRole("checkbox", { name: /WhatsApp/ }));
    await user.click(screen.getByRole("switch", { name: /^Text/ }));
    expect(saved().phones[0].whatsapp).toBe(true);
    expect(saved().showText).toBe(false);
  });

  it("offers a cover photo", () => {
    render(<Contact />);
    expect(screen.getByText("Cover photo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx -t "Contact page editor extras"`
Expected: FAIL. There are no Pronouns, Department, Add website, WhatsApp, quick-button switches or Cover photo yet.

- [ ] **Step 3: Implement.** In `features/pages/editor/editors/VcardEditor.tsx`:

1. **Header card:** add a `MediaField` with label "Cover photo", kind image, `maxSide={1600}`, `value={page.cover}` and the hint "A wide photo across the top."
   - Add `TextField`s for Pronouns (path `pronouns`, optional, placeholder "she/her") and Department (path `department`, optional) to the name grid.
   - Remove `autoComplete` from Pronouns.
2. **Each phone row:** add a checkbox under the number: `<label className="flex min-h-11 items-center gap-2 text-sm text-fg sm:min-h-0"><input type="checkbox" className="size-5 accent-primary" checked={item.whatsapp} onChange={(e) => update({ whatsapp: e.target.checked })} />On WhatsApp</label>`. Its accessible name includes "WhatsApp".
   - The phone row's `newItem` becomes `{ label: "Mobile", number: "", whatsapp: false }`.
3. **"Website and address" card:** replace the Website `TextField` with a `SortableList`:
   - `label="Websites"`, `items={page.websites}`, `max={LIMITS.websites}`, `addLabel="Add website"`, `addAt="end"`, `path="websites"`;
   - `newItem={() => ({ label: "", url: "" })}`;
   - `itemLabel={(w, i) => rowName("website", w.label || w.url, i)}`;
   - each row renders "Label" (path `websites.${i}.label`, placeholder "Portfolio") and "Website address" (type url, path `websites.${i}.url`, placeholder "example.com");
   - `newRowFocus="input[type='url']"`.
4. **A new "Quick buttons" card,** after Phone numbers and Email addresses, with the note "Under your name, from your first phone, email and address":
   - five `ToggleField`s: "Call", "Text", "Email", "WhatsApp" and "Directions";
   - WhatsApp's description is "Uses the first number marked On WhatsApp."

`features/pages/editor/look/HeaderCard.tsx`:
- When `type === "vcard"` and the page has a cover, show `<p className="text-sm text-fg-muted">Your cover photo runs across the top, with your photo over it.</p>` above the controls.
- The card receives `page`, so read `page.cover`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS, including Release 1's every-box-has-a-limit test. The new paths are `pronouns`, `department` and `websites.N.label/url`.

- [ ] **Step 5: Commit.**

```bash
git add features/pages/editor
git commit -m "Edit the Contact page's cover, pronouns, department, websites, WhatsApp and quick buttons"
```

---

### Task 4: Business hours: split days, closures, time zone, and Open now

**Files:**
- Create:
  - `lib/pages/hours.ts`
  - `lib/pages/hours.test.ts`
  - `features/pages/OpenStatus.tsx`
- Modify:
  - `lib/pages/types.ts` (`DayHours`, `BusinessPage`, defaults)
  - `lib/pages/sanitize.ts` (hours, closures, timeZone)
  - `lib/pages/validate.ts` (hours, closures, timeZone)
  - `features/pages/PageView.tsx` (the hours card)
- Test: `features/pages/PageView.test.tsx`

**Interfaces:**
- Produces:
  - `DayHours` gains `from2: string; to2: string` ("" for none).
  - `Closure = { date: string; note: string }`.
  - `BusinessPage` gains `timeZone: string; closures: Closure[]`.
  - `zonedNow(at: Date, timeZone: string): ZonedNow`, where `ZonedNow = { day: number; minutes: number; date: string }` and day 0 is Monday.
  - `openStatus(hours, closures, now): OpenState | null`.
  - `statusText(state): string`.
  - `formatTime(hhmm): string`.
  - `<OpenStatus hours closures timeZone />`.

- [ ] **Step 1: Write the failing tests.** Create `lib/pages/hours.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { formatTime, openStatus, statusText, zonedNow, type ZonedNow } from "./hours";
import type { DayHours } from "./types";

const day = (open: boolean, from = "09:00", to = "17:00", from2 = "", to2 = ""): DayHours => ({
  open,
  from,
  to,
  from2,
  to2,
});
// Monday–Friday 9–12 and 13–17; closed weekends.
const week = [0, 1, 2, 3, 4].map(() => day(true, "09:00", "12:00", "13:00", "17:00"));
week.push(day(false), day(false));
// Monday 2030-01-07 is day 0.
const at = (day: number, hhmm: string, date = `2030-01-${String(7 + day).padStart(2, "0")}`): ZonedNow => {
  const [h, m] = hhmm.split(":").map(Number);
  return { day, minutes: h! * 60 + m!, date };
};
const say = (now: ZonedNow, closures = [] as { date: string; note: string }[], hours = week) =>
  statusText(openStatus(hours, closures, now));

describe("Open now", () => {
  it("says open, closes soon, and between a split day's two ranges", () => {
    expect(say(at(0, "09:00"))).toBe("Open now · closes 12:00 PM");
    expect(say(at(0, "11:40"))).toBe("Closes soon · 12:00 PM");
    expect(say(at(0, "12:00"))).toBe("Closed · opens 1:00 PM");
    expect(say(at(0, "16:59"))).toBe("Closes soon · 5:00 PM");
  });

  it("says when it opens next: later today, tomorrow, or on a weekday", () => {
    expect(say(at(0, "08:59"))).toBe("Closed · opens 9:00 AM");
    expect(say(at(0, "17:00"))).toBe("Closed · opens 9:00 AM tomorrow");
    expect(say(at(4, "18:00"))).toBe("Closed · opens 9:00 AM Monday");
    expect(say(at(5, "10:00"))).toBe("Closed · opens 9:00 AM Monday");
  });

  it("says closed today on a closure date, and skips a closed tomorrow", () => {
    expect(say(at(0, "10:00"), [{ date: "2030-01-07", note: "Staff day" }])).toBe(
      "Closed today · Staff day",
    );
    expect(say(at(0, "18:00"), [{ date: "2030-01-08", note: "" }])).toBe(
      "Closed · opens 9:00 AM Wednesday",
    );
  });

  it("says nothing for a place that's never open", () => {
    expect(openStatus([0, 1, 2, 3, 4, 5, 6].map(() => day(false)), [], at(0, "10:00"))).toBeNull();
  });

  it("reads the time in the business's zone, and the visitor's when it has none or a bad one", () => {
    const moment = new Date("2030-01-07T15:30:00Z"); // a Monday
    expect(zonedNow(moment, "America/New_York")).toEqual({ day: 0, minutes: 10 * 60 + 30, date: "2030-01-07" });
    expect(zonedNow(moment, "Asia/Tokyo")).toEqual({ day: 1, minutes: 30, date: "2030-01-08" });
    expect(() => zonedNow(moment, "Not/AZone")).not.toThrow();
    expect(() => zonedNow(moment, "")).not.toThrow();
  });

  it("writes times the way the page does", () => {
    expect(formatTime("09:00")).toBe("9:00 AM");
    expect(formatTime("17:30")).toBe("5:30 PM");
  });
});
```

In `features/pages/PageView.test.tsx`:

```tsx
  it("lists a split day's two ranges in the opening hours", () => {
    const hours = PAGE_DEFAULTS.business().hours.map((h) => ({ ...h, from2: "", to2: "" }));
    hours[0] = { open: true, from: "09:00", to: "12:00", from2: "13:00", to2: "17:00" };
    view("business", { ...PAGE_DEFAULTS.business(), name: "Bakery", hours }, false);
    expect(screen.getByText("9:00 AM – 12:00 PM, 1:00 PM – 5:00 PM")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages/hours.test.ts features/pages/PageView.test.tsx`
Expected: FAIL. `./hours` doesn't exist, and the hours card shows one range.

- [ ] **Step 3: Implement.**

`lib/pages/types.ts`:
- `DayHours` gains `/** A second range the same day ("" for none). */ from2: string; to2: string;`.
- Add `export interface Closure { /** YYYY-MM-DD */ date: string; note: string }`.
- `BusinessPage` gains `/** IANA zone for Open now; "" means each visitor's own. */ timeZone: string; closures: Closure[];`.
- `LIMITS` gains `closures: 10`.
- The `day()` helper sets `from2: "", to2: ""`, and `PAGE_DEFAULTS.business` adds `timeZone: "", closures: []`.

`lib/pages/sanitize.ts`:
- `sanitizeHours` also reads `from2` and `to2`, each `TIME`-valid or "".
- The business schema gains:

```ts
    timeZone: str(64),
    closures: {
      kind: "list",
      max: LIMITS.closures,
      item: { date: str(10), note: str(60) },
    },
```

`lib/pages/hours.ts`:

```ts
import { isTimeZone } from "@/lib/time/zone";

import type { Closure, DayHours } from "./types";

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "9:00 AM" from "09:00". Written by hand: Intl puts a narrow no-break space before AM/PM,
 * and the server's and the phone's versions of it can differ. */
export function formatTime(value: string): string {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export interface ZonedNow {
  /** 0 = Monday. */
  day: number;
  minutes: number;
  /** YYYY-MM-DD */
  date: string;
}

/** The weekday, minute of the day and date in a time zone; the device's own when it has none. */
export function zonedNow(at: Date, timeZone: string): ZonedNow {
  const zone = timeZone && isTimeZone(timeZone) ? timeZone : undefined;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: SHORT.indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

const minutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** A day's ranges, in order: the first, and a second when both its times are set. */
export const rangesOf = (h: DayHours): [string, string][] =>
  h.open ? [[h.from, h.to], ...(h.from2 && h.to2 ? [[h.from2, h.to2] as [string, string]] : [])] : [];

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
};

export type OpenState =
  | { kind: "open"; closes: string; soon: boolean }
  | { kind: "closed"; opens: string; when: "today" | "tomorrow" | string }
  | { kind: "closure"; note: string };

/** Open now, or when it opens next (spec item 16); null for a place that's never open. */
export function openStatus(hours: DayHours[], closures: Closure[], now: ZonedNow): OpenState | null {
  const closed = (date: string) => closures.find((c) => c.date === date);
  const today = closed(now.date);
  if (today) return { kind: "closure", note: today.note.trim() };
  const ranges = rangesOf(hours[now.day] ?? { open: false, from: "", to: "", from2: "", to2: "" });
  for (const [from, to] of ranges) {
    if (now.minutes >= minutes(from) && now.minutes < minutes(to)) {
      return { kind: "open", closes: to, soon: minutes(to) - now.minutes <= 30 };
    }
  }
  const later = ranges.find(([from]) => minutes(from) > now.minutes);
  if (later) return { kind: "closed", opens: later[0], when: "today" };
  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = (now.day + ahead) % 7;
    if (closed(addDays(now.date, ahead))) continue;
    const first = rangesOf(hours[day]!)[0];
    if (first) return { kind: "closed", opens: first[0], when: ahead === 1 ? "tomorrow" : DAY_NAMES[day]! };
  }
  return null;
}

export function statusText(state: OpenState | null): string {
  if (!state) return "";
  if (state.kind === "closure") return state.note ? `Closed today · ${state.note}` : "Closed today";
  if (state.kind === "open") {
    return state.soon ? `Closes soon · ${formatTime(state.closes)}` : `Open now · closes ${formatTime(state.closes)}`;
  }
  const when = state.when === "today" ? "" : ` ${state.when}`;
  return `Closed · opens ${formatTime(state.opens)}${when}`;
}
```

The test's "tomorrow" case at 17:00 on Monday expects "tomorrow". The weekday cases expect the day's name. Check `isTimeZone`'s signature in `lib/time/zone.ts`; it's exported and takes a string.

`features/pages/OpenStatus.tsx`:

```tsx
"use client";

import { useSyncExternalStore } from "react";

import { openStatus, statusText, zonedNow } from "@/lib/pages/hours";
import type { Closure, DayHours } from "@/lib/pages/types";

const subscribe = (tick: () => void) => {
  const id = window.setInterval(tick, 30_000);
  return () => window.clearInterval(id);
};
// The minute, so the snapshot only changes when the text could.
const minute = () => Math.floor(Date.now() / 60_000);

/** "Open now · closes 5:00 PM", worked out in the browser so it's always current (spec item 16). */
export function OpenStatus({
  hours,
  closures,
  timeZone,
}: {
  hours: DayHours[];
  closures: Closure[];
  timeZone: string;
}) {
  const now = useSyncExternalStore(subscribe, minute, () => null);
  if (now === null) return null;
  const state = openStatus(hours, closures, zonedNow(new Date(now * 60_000), timeZone));
  if (!state) return null;
  const open = state.kind === "open";
  return (
    <p className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-fg">
      <span
        aria-hidden
        className={open ? "size-2.5 rounded-full bg-(--page-accent)" : "size-2.5 rounded-full bg-fg-muted"}
      />
      {statusText(state)}
    </p>
  );
}
```

`features/pages/PageView.tsx` hours card:
- Delete the local `DAYS` and `formatTime` (PageView.tsx:249–258) and import `formatTime`, `DAY_NAMES` and `rangesOf` from `@/lib/pages/hours`.
- Under the "Opening hours" heading, render `<OpenStatus hours={page.hours} closures={page.closures} timeZone={page.timeZone} />`. Don't render it in preview, so the editor's preview never shows a clock-dependent line.
- Each day's `<dd>` reads `rangesOf(h).map(([f, t]) => \`${formatTime(f)} – ${formatTime(t)}\`).join(", ") || "Closed"`.

`lib/pages/validate.ts` business: alongside the existing first-range check, add:

```ts
    p.hours.forEach((h, i) => {
      if (!h.open || !(h.from2 || h.to2)) return;
      if (!h.from2 || !h.to2 || h.from2 >= h.to2 || h.from2 < h.to) {
        errors[`hours.${i}`] ??= "The second hours must start after the first and end after they start";
      }
    });
    p.closures.forEach((c, i) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date)) errors[`closures.${i}.date`] = "Pick a date";
    });
    if (p.timeZone && !isTimeZone(p.timeZone)) errors.timeZone = "Choose a time zone";
```

`isTimeZone` is already imported in `validate.ts`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages features/pages && npx tsc --noEmit`
Expected: PASS. Update every `DayHours` literal TypeScript flags (fixtures and tests) with `from2: "", to2: ""`.

- [ ] **Step 5: Commit.**

```bash
git add lib/pages features/pages e2e/accounts/fixtures.ts
git commit -m "Business hours: two ranges a day, closure dates, a time zone, and Open now"
```

---

### Task 5: The Business gallery, services, ready-made buttons, and editing them

**Files:**
- Modify:
  - `lib/pages/types.ts` (`gallery`, `services`; LinkItem preset icons)
  - `lib/pages/sanitize.ts`
  - `lib/pages/links.ts` (preset icons)
  - `features/pages/LinkIcon.tsx`
  - `features/pages/PageView.tsx` (`BusinessView`)
  - `features/pages/editor/fields.tsx` (`HoursField` second range; `TimeZoneField` hint; `LinksField` presets)
  - `features/pages/editor/editors/BusinessEditor.tsx`
- Test:
  - `features/pages/PageView.test.tsx`
  - `features/pages/editor/PageEditor.test.tsx`
  - `lib/pages/links.test.ts`

**Interfaces:**
- Consumes:
  - `Gallery` and `ViewerImage` (Task 1);
  - `rangesOf` (Task 4);
  - `LinksField` and `linkIcon` (Release 2a).
- Produces:
  - `BusinessPage.gallery: Media[]` (max 6).
  - `BusinessPage.services: { name: string; price: string; description: string }[]` (max 30).
  - `LinkItem.icon` adds `"review" | "book" | "order"`.
  - `LinkIcon` adds `{ kind: "preset"; preset: "review" | "book" | "order" }`.
  - `LinksField` prop `presets?: boolean`.

- [ ] **Step 1: Write the failing tests.**

`lib/pages/links.test.ts`:

```ts
  it("gives a ready-made button its own icon", () => {
    expect(linkIcon(link({ icon: "review", url: "g.page/r/abc" }))).toEqual({ kind: "preset", preset: "review" });
  });
```

`features/pages/PageView.test.tsx`:

```tsx
describe("Business extras", () => {
  const UID = "11111111-1111-4111-8111-111111111111";
  const img = (n: number) => ({ path: `${UID}/${n}.jpg`, name: `${n}.jpg`, type: "image/jpeg", size: 1 });

  it("shows a gallery row that opens the viewer, and the services under About", () => {
    view(
      "business",
      {
        ...PAGE_DEFAULTS.business(),
        name: "Bakery",
        about: "Fresh bread",
        gallery: [img(1), img(2)],
        services: [{ name: "Cake order", price: "$40", description: "Two days' notice" }],
      },
      false,
    );
    expect(screen.getByRole("button", { name: "Open photo 1 of 2" })).toBeInTheDocument();
    const services = within(screen.getByRole("region", { name: "Services" }));
    expect(services.getByText("Cake order")).toBeInTheDocument();
    expect(services.getByText("$40")).toBeInTheDocument();
  });

  it("draws a ready-made button with its icon", () => {
    const { container } = view(
      "business",
      {
        ...PAGE_DEFAULTS.business(),
        name: "Bakery",
        buttons: [{ ...newLink(), label: "Leave a Google review", url: "g.page/r/abc", icon: "review" }],
      },
      false,
    );
    expect(screen.getByRole("link", { name: /Leave a Google review/ })).toBeInTheDocument();
    expect(container.querySelector("[data-link-icon]")).not.toBeNull();
  });
});
```

`features/pages/editor/PageEditor.test.tsx`:

```tsx
describe("Business editor extras", () => {
  function Biz() {
    const [page, setPage] = useState(PAGE_DEFAULTS.business());
    return (
      <>
        <PageEditor type="business" page={page} errors={{}} onUpdate={(u) => setPage((p) => u(p))} />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);

  it("adds a ready-made Google review button with its label and icon", async () => {
    const user = userEvent.setup();
    render(<Biz />);
    await user.click(screen.getByRole("button", { name: "Add Google review" }));
    expect(saved().buttons[0]).toMatchObject({ label: "Leave a Google review", icon: "review", url: "" });
  });

  it("adds second hours to a day, a closure date, and a service", async () => {
    const user = userEvent.setup();
    render(<Biz />);
    await user.click(screen.getByRole("button", { name: "Add second hours for Monday" }));
    expect(saved().hours[0]).toMatchObject({ from2: "13:00", to2: "17:00" });
    await user.click(screen.getByRole("button", { name: "Add closure" }));
    expect(saved().closures).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Add service" }));
    await user.type(screen.getByRole("textbox", { name: /^Service/ }), "Cake order");
    expect(saved().services[0].name).toBe("Cake order");
  });

  it("fills in the owner's time zone the first time on a new page", () => {
    render(<Biz />);
    expect(saved().timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });
});
```

Import `newLink` and `within` where needed.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages/links.test.ts features/pages/PageView.test.tsx features/pages/editor/PageEditor.test.tsx`
Expected: FAIL. There are no presets, gallery, services, second hours, closures or time-zone fill yet.

- [ ] **Step 3: Implement the data and page.**

`lib/pages/types.ts`:
- `LinkItem.icon` becomes `"auto" | "none" | "image" | "review" | "book" | "order"`.
- `BusinessPage` gains `gallery: Media[]; services: { name: string; price: string; description: string }[];`.
- `LIMITS` gains `gallery: 6, services: 30`, and `PAGE_DEFAULTS.business` adds `gallery: [], services: []`.

`lib/pages/sanitize.ts`:
- In the `link` spec, `icon` becomes `{ kind: "enum", values: ["auto", "none", "image", "review", "book", "order"] }`.
- The business schema gains:

```ts
    gallery: { kind: "mediaList", max: LIMITS.gallery },
    services: {
      kind: "list",
      max: LIMITS.services,
      item: { name: str(80), price: str(20), description: str(LIMITS.medium) },
    },
```

`lib/pages/links.ts`:
- `LinkIcon` gains `| { kind: "preset"; preset: "review" | "book" | "order" }`.
- In `linkIcon`, after the `image` case: `if (link.icon === "review" || link.icon === "book" || link.icon === "order") return { kind: "preset", preset: link.icon };`.

`features/pages/LinkIcon.tsx`: the `preset` case renders a lucide icon with `data-link-icon`: `{ review: Star, book: CalendarCheck, order: ShoppingBag }`.

`features/pages/PageView.tsx` `BusinessView`:
- Buttons now pass `icon={linkIcon(b) ? <LinkIconMark icon={linkIcon(b)!} /> : undefined}`. Compute it once per button.
- **After the buttons:** `<Gallery images={page.gallery.map((media, i) => ({ media, alt: \`Photo ${i + 1} of ${page.name || "the business"}\` }))} label="Photos" preview={preview} />`.
- **After About:** when any service has a name, render:

```tsx
        <PageCard>
          <section aria-labelledby="services-heading">
            <h2 id="services-heading" className="mb-3 font-page-heading text-lg font-bold text-fg">
              Services
            </h2>
            <ul className="divide-y divide-border">
              {page.services
                .filter((s) => s.name.trim())
                .map((s, i) => (
                  <li key={i} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium text-fg">{s.name}</span>
                      {s.price.trim() && <span className="shrink-0 font-semibold text-fg tabular-nums">{s.price}</span>}
                    </div>
                    {s.description.trim() && <p className="text-sm text-fg-muted">{s.description}</p>}
                  </li>
                ))}
            </ul>
          </section>
        </PageCard>
```

Import `Gallery` from `./Viewer`.

- [ ] **Step 4: Implement the editor.**

`features/pages/editor/fields.tsx`:
- **`HoursField`:** each open day keeps its first range. Then:
  - Without a second range, add a button `aria-label={\`Add second hours for ${DAY_NAMES[i]}\`}` with visible text "Add hours". It calls `update(i, { from2: "13:00", to2: "17:00" })`.
  - With one, show two more time boxes labeled `${DAY_NAMES[i]} opens again` and `${DAY_NAMES[i]} closes again`, plus a "Remove" button (`aria-label={\`Remove second hours for ${DAY_NAMES[i]}\`}`) that sets them to "".
  - Buttons are `min-h-11` on phones.
- **`TimeZoneField`:** add a `hint?: ReactNode` prop, passed to `Field`.
- **`LinksField`:** add `presets?: boolean`. When it's on, the adder shows "Add button" plus four preset buttons. Each preset is `add({ ...newLink(), label, icon })`:

  | Button | Label | Icon |
  | --- | --- | --- |
  | Add Google review | "Leave a Google review" | review |
  | Add Yelp | "Review us on Yelp" | review |
  | Add Book now | "Book now" | book |
  | Add Order online | "Order online" | order |

  Use the same `adder` shape as `extras`. If both `extras` and `presets` are off, keep the default adder.

`features/pages/editor/editors/BusinessEditor.tsx`:
1. **Buttons card:** add `presets` to `LinksField`.
2. **Opening hours card:**
   - Under the toggle, add `<TimeZoneField value={page.timeZone} onChange={(timeZone) => set({ timeZone })} error={errors.error("timeZone")} hint="For Open now. If it's not set, each visitor's own time is used." />`.
   - After `HoursField`, add a closures `SortableList`:
     - `label="Closures"`, `max={LIMITS.closures}`, `addLabel="Add closure"`, `addAt="end"`, `path="closures"`, `newItem={() => ({ date: "", note: "" })}`;
     - `itemLabel={(c, i) => rowName("closure", c.note || c.date, i)}`;
     - each row has a "Date" `TextField` (type date, path `closures.${i}.date`) and a "Note" `TextField` (optional, path `closures.${i}.note`, placeholder "Thanksgiving").
   - Put both inside `{page.showHours && …}`.
3. **Fill the owner's zone on a new page** (ruling 2): add this inside the component:

```tsx
  // A new page starts in the owner's own time zone (spec item 16): only when it's still blank
  // and has no hours changed yet, so an existing page is never edited by opening it.
  const zone = useRef(false);
  useEffect(() => {
    if (zone.current || page.timeZone) return;
    zone.current = true;
    const own = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (own && !page.name.trim()) set({ timeZone: own });
  }, [page.timeZone, page.name, set]);
```

   A page with a name is an existing one, so opening it doesn't change it. If filling the zone marks a new page as having unsaved changes, that's acceptable: it's a new page and is unsaved anyway.
4. **A "Photos" card** after the Header card: `<ImagesField value={page.gallery} onChange={(gallery) => set({ gallery })} onAdd={(media) => set((latest) => ({ gallery: [...latest.gallery, media].slice(0, LIMITS.gallery) }))} max={LIMITS.gallery} field="gallery" />`. `ImagesField` resizes to its default of 1600 px.
5. **A "Services" card** after About, with a `SortableList`:
   - `label="Services"`, `max={LIMITS.services}`, `addLabel="Add service"`, `addAt="end"`, `path="services"`, `newItem={() => ({ name: "", price: "", description: "" })}`;
   - `itemLabel={(s, i) => rowName("service", s.name, i)}`;
   - each row has "Service" (path `services.${i}.name`), "Price" (optional, path `services.${i}.price`) and "Description" (an optional `TextField`, path `services.${i}.description`).

- [ ] **Step 5: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS, including the every-box-has-a-limit test. The new paths are `closures.N.date/note` and `services.N.name/price/description`. If that test flags the closure's date box, exclude `type=date` the way Release 1 excluded `type=time`: a date box has a fixed length.

- [ ] **Step 6: Commit.**

```bash
git add lib/pages features/pages
git commit -m "Business: a photo gallery, services, ready-made review and booking buttons, and their editors"
```

---

### Task 6: Browser tests

**Files:**
- Modify: `e2e/accounts/fixtures.ts` (two pages with every extra)
- Create: `e2e/accounts/contact-business.spec.ts`

- [ ] **Step 1: Add the fixture pages to `PHONE_PAGES`.**

The images reuse the photo the phone fixtures already upload. Check `grep -n "image\|photo\|Media" e2e/accounts/fixtures.ts | head` for an existing media fixture, such as the LOOK_PAGES photo. If none exists, leave `gallery` empty in the Business fixture and test the viewer in unit tests only, as a ruling.

```ts
  {
    type: "vcard",
    slug: "PHONE-CONTACT-PLUS",
    content: {
      firstName: "Ana",
      lastName: "Rivera",
      pronouns: "she/her",
      jobTitle: "Designer",
      department: "Brand",
      company: "Acme",
      phones: [{ label: "Mobile", number: "+1 555 010 2030", whatsapp: true }],
      emails: [{ label: "Work", address: "ana@example.com" }],
      websites: [
        { label: "Portfolio", url: "example.com/ana" },
        { label: "Studio", url: "example.com/studio" },
      ],
      address: "1 Main St, Springfield",
      socials: [],
    },
  },
  {
    type: "business",
    slug: "PHONE-BIZ-PLUS",
    content: {
      name: "Mario's Pizzeria & Bakery",
      tagline: "Since 1999",
      timeZone: "America/New_York",
      showHours: true,
      closures: [{ date: "2099-12-25", note: "Christmas" }],
      buttons: [{ label: "Leave a Google review", url: "g.page/r/abc", on: true, icon: "review" }],
      services: Array.from({ length: 12 }, (_, i) => ({
        name: `Catering package ${i + 1}`,
        price: "$120",
        description: "Feeds ten",
      })),
      socials: [],
    },
  },
```

- [ ] **Step 2: Write the tests.** Create `e2e/accounts/contact-business.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { MAKER } from "./fixtures";

test.describe("Contact and Business extras", () => {
  test.use({ storageState: MAKER.state });

  test("the Contact page has quick buttons, pronouns, the department and every website", async ({
    page,
  }) => {
    await page.goto("p/PHONE-CONTACT-PLUS");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("(she/her)");
    const actions = page.getByRole("navigation", { name: "Quick actions" });
    for (const name of ["Call", "Text", "Email", "WhatsApp", "Directions"]) {
      await expect(actions.getByRole("link", { name })).toBeVisible();
    }
    await expect(page.getByText("Portfolio")).toBeVisible();
    const card = await page.request.get("p/PHONE-CONTACT-PLUS/contact.vcf");
    const text = await card.text();
    expect(text).toContain("ORG:Acme;Brand");
    expect(text).toContain("Pronouns: she/her");
  });

  test("the Business page says whether it's open, and lists its services and review button", async ({
    page,
  }) => {
    await page.goto("p/PHONE-BIZ-PLUS");
    await expect(page.getByText(/^(Open now|Closes soon|Closed)/)).toBeVisible();
    await expect(page.getByRole("region", { name: "Services" }).getByText("Catering package 12")).toBeVisible();
    await expect(page.getByRole("link", { name: /Leave a Google review/ })).toBeVisible();
  });

  test("the Business editor adds a Google review button and a closure", async ({ page }) => {
    await page.goto("codes/new?type=business");
    await page.getByRole("button", { name: "Add Google review" }).click();
    await expect(page.getByRole("textbox", { name: /^Button text/ }).first()).toHaveValue(
      "Leave a Google review",
    );
    await page.getByRole("button", { name: "Add closure" }).click();
    await expect(page.getByLabel("Date", { exact: true }).first()).toBeVisible();
  });
});
```

The new fixtures join the phone sweep, which checks sideways scroll and the footer on six phones, because it iterates `PHONE_PAGES`.

- [ ] **Step 3: Run the signed-in suite.**

Run: `npm run test:e2e:accounts`
Expected: all PASS. If a phone profile shows sideways scroll, fix the code, not the test:
- the services rows are flex with `min-w-0`;
- the gallery row scrolls inside itself.

- [ ] **Step 4: Commit.**

```bash
git add e2e/accounts
git commit -m "Browser tests: Contact quick buttons, pronouns and websites; Business Open now, services and review button"
```

---

### Task 7: Ship Release 2b

There's no migration in this release; it's all page content.

- [ ] **Step 1: Update the API docs.** In `app/(docs)/developers/page.tsx`, after the links sentence, add:

> Contact pages take `websites` (label and url, up to 4), `cover`, `pronouns`, `department`, a phone's `whatsapp`, and `showCall`, `showText`, `showEmail`, `showWhatsapp` and `showDirections`. Business pages take `timeZone`, `closures` (date and note), a day's `from2`/`to2`, `gallery` (up to 6 images), `services` (name, price and description), and buttons with `icon` `review`, `book` or `order`.

Commit it.

- [ ] **Step 2: Run the full local check.**

Run: `npm run format:check && npm run lint && npx tsc --noEmit && npm test && npm run test:e2e:accounts && npm run build && npm run test:e2e`
Expected: all PASS. `format:check` may list only git-ignored files under `.superpowers/`.

- [ ] **Step 3: Run the final whole-branch review.** Follow the "Final Review" section of superpowers:executing-plans, with this plan's Review Focus and the ledger's rulings. Do one fix pass.

- [ ] **Step 4: Push, open the PR, wait for CI, and merge.**

```bash
git push -u origin feat/page-enhancements-r2b
gh pr create --base main --head feat/page-enhancements-r2b --title "Page enhancements 2b: Contact quick buttons and websites; Business Open now, hours, gallery, services" --body "$(cat <<'EOF'
Release 2b of docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md (plan docs/superpowers/plans/2026-10-16-page-enhancements-release-2b-contact-business.md). Items 11–14 and 16–20.

- Contact page: a cover photo, Call/Text/Email/WhatsApp/Directions buttons (each can be off), pronouns, department, up to 4 websites (an old website becomes the first), all in the saved contact card.
- Business: Open now from the hours and a time zone, two ranges a day, closure dates, a photo gallery with a full-screen viewer, ready-made Google review / Yelp / Book now / Order online buttons, and services.
- No migration.
- Tests: fill in the unit, signed-in and public counts from Step 2.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks --watch
gh pr merge --merge
```

- [ ] **Step 5: Check the live site.**
1. Wait for the version in `https://ziplume.com/sw.js` to change.
2. Find a client chunk containing "Add Google review", and fetch it from ziplume.com. It must contain "Add Google review" and "Open photo".
3. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307.
4. Create nothing and change no data in David's account.
