# Page enhancements, Release 2a: the Link list — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link list pages get:
- social icon styles and sizes;
- an icon or image on each link;
- section headers;
- one featured link;
- scheduled links;
- email, phone and text-message links.

**Architecture:**
- **Data:** `LinkItem` grows optional fields with defaults (`kind`, `type`, `icon`, `image`, `featured`, `showFrom`, `showUntil`), so old pages read exactly as before.
- **Pure helpers** in `lib/pages/links.ts` build the address, decide whether a link shows now, and pick its icon. The renderer and the editor both use them.
- **Social icons:** two new look fields (`socialStyle`, `socialSize`) drive the shared `SocialRow`, so the Contact and Business pages get the styles too.
- **Business buttons** use the same `LinkItem` and stay as they are until Release 2b. The Business page shows no new controls and no icons yet.

**Tech Stack:**
- Next.js 16, React 19, Tailwind 4.
- Headless UI 2.2.
- dnd-kit's sortable rows (the existing `SortableList`).
- Vitest with jsdom.
- Playwright: the signed-in suite.

**Spec:** `docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md`, section 5 items 5–10, plus section 3 (rules for every release). Release 2b covers the Contact page, Business and the photo viewer (items 11–14 and 16–20), with its own plan after this ships.

## Global Constraints

- **Social icon styles,** set in the Look tab's Social icons card and also used on the Contact and Business pages:
  - Style: Outline (today), Filled, Plain icon or Brand colors.
  - Size: Small, Medium or Large.
  - Brand colors draw the network's own color behind a white icon.
  - Every style keeps a 44 px tap target. (spec 5)
- **A link to a known site gets that site's icon automatically.** The owner can upload an image instead (resized to 256 px) or turn the icon off. (spec 6)
- **"Add header"** adds a text-only row between links, such as "Shop" or "Listen". Headers sort with the links. (spec 7)
- **One link can be marked Featured:** it's drawn taller and in the accent color. No animation. (spec 8)
- **Scheduled links** (spec 9):
  - A link can show only from a date and time, until one, or both.
  - The times use the owner's time zone, saved with the link.
  - Scheduled links show a "Scheduled" badge in the editor and appear on the page only inside their window.
- **Link types:** Website, Email, Phone or Text message, each with the right address (`mailto:`, `tel:`, `sms:`) and its own icon. (spec 10)
- **Old pages read exactly as before:**
  - Every new field has a default.
  - A link with no `type` is a Website.
  - No `kind` means a link.
  - No `icon` means Auto.
- Section 3 rules apply: visible labels, 44 px targets on phones, no sideways scroll from 320 px, axe clean in light and dark, limits visible, and previews inert.

## Rulings made in this plan (for David's review)

1. **Times are saved as exact moments (UTC).** The editor converts them from the owner's own clock, so "from Friday 9 AM" means 9 AM where the owner set it, for every visitor.
2. **A scheduled link outside its window is hidden in the editor's preview too,** so the preview matches what visitors see. The editor row says "Scheduled" and when.
3. **Only one link can be featured.** Turning Featured on for a link turns it off on the others.
4. **Auto icons appear only for links to a known site,** and for email, phone and text-message links. Other web links show no icon, so plain lists don't change.
5. **Filled circles use the page's text color with the icon in the wallpaper color.** The readability guard already keeps that pair readable on every theme.
6. **Brand colors pick a white or black icon,** whichever reads better on that brand's color. A white icon on Snapchat's yellow wouldn't read.

## Review Focus

1. **A link with a type but a malformed address** (an email without @, a phone number with letters). The editor says what's wrong, and the page never draws a dead button. *Task 1 and Task 3 tests.*
2. **Schedule edge cases:**
   - Only "from" set, only "until" set, or "until" before "from".
   - Times set in one time zone and shown in another.
   - The link appears at exactly the right moment.

   *Task 1 test.*
3. **Header rows can't break the page:**
   - An empty header isn't drawn.
   - A header row never needs a link.
   - Headers don't count toward "Add at least one link".

   *Task 1 and Task 2 tests.*
4. **Brand colors on every network,** including Website and LinkedIn (no brand mark), and every size at 320 px. Icons still wrap without sideways scroll, and targets stay 44 px. *Task 4 and Task 5 tests.*
5. **Old saved Link list pages and Business buttons** (no new fields) look exactly as before. *Task 1 and Task 2 tests.*

---

### Task 1: Links can be headers, typed, featured and scheduled (data and rules)

**Files:**
- Modify:
  - `lib/pages/types.ts` (`LinkItem`, `LinkType`)
  - `lib/pages/sanitize.ts` (the `link` spec)
  - `lib/pages/validate.ts` (links and buttons)
  - `lib/pages/urls.ts` (`smsHref`)
- Create:
  - `lib/pages/links.ts`
  - `lib/pages/links.test.ts`

**Interfaces:**
- Produces:
  - `type LinkType = "web" | "email" | "phone" | "sms"`.
  - `LinkItem` gains `{ kind: "link" | "header"; type: LinkType; icon: "auto" | "none" | "image"; image: Media | null; featured: boolean; showFrom: string; showUntil: string }`.
  - `smsHref(number: string): string | null`.
  - `linkHref(link: LinkItem): string | null`.
  - `isShown(link: LinkItem, now: Date): boolean`.
  - `networkFromUrl(url: string): SocialNetwork | null`.
  - `linkIcon(link: LinkItem): LinkIcon | null`, where `LinkIcon = { kind: "network"; network: SocialNetwork } | { kind: "type"; type: "email" | "phone" | "sms" } | { kind: "image"; image: Media }`.
  - `newLink(): LinkItem` and `newHeader(): LinkItem`.

- [ ] **Step 1: Create the branch and commit this plan.**

```bash
git checkout -b feat/page-enhancements-r2a main
git add docs/superpowers/plans/2026-10-16-page-enhancements-release-2a-link-list.md
git commit -m "Plan: page enhancements release 2a, the Link list"
```

- [ ] **Step 2: Write the failing tests.** Create `lib/pages/links.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { isShown, linkHref, linkIcon, networkFromUrl, newHeader, newLink } from "./links";
import { sanitizePage } from "./sanitize";
import { PAGE_DEFAULTS, type LinkItem } from "./types";
import { validatePage } from "./validate";

const link = (patch: Partial<LinkItem> = {}): LinkItem => ({ ...newLink(), ...patch });
const UID = "11111111-1111-4111-8111-111111111111";

describe("links on a Link list", () => {
  it("reads an old saved link as a shown website link with an automatic icon", () => {
    const page = sanitizePage("links", {
      title: "Hi",
      links: [{ label: "Shop", url: "shop.com", on: true }],
    });
    expect(page.links[0]).toEqual({
      label: "Shop",
      url: "shop.com",
      on: true,
      kind: "link",
      type: "web",
      icon: "auto",
      image: null,
      featured: false,
      showFrom: "",
      showUntil: "",
    });
  });

  it("builds each type's address, and none for a malformed one", () => {
    expect(linkHref(link({ url: "shop.com" }))).toBe("https://shop.com");
    expect(linkHref(link({ type: "email", url: "hi@shop.com" }))).toBe("mailto:hi@shop.com");
    expect(linkHref(link({ type: "phone", url: "+1 (555) 010-2030" }))).toBe("tel:+15550102030");
    expect(linkHref(link({ type: "sms", url: "555 010 2030" }))).toBe("sms:5550102030");
    expect(linkHref(link({ type: "email", url: "not an email" }))).toBeNull();
    expect(linkHref(link({ type: "phone", url: "call me" }))).toBeNull();
    expect(linkHref(newHeader())).toBeNull();
  });

  it("shows a scheduled link only inside its window", () => {
    const from = "2030-01-10T17:00:00.000Z";
    const until = "2030-01-12T17:00:00.000Z";
    const both = link({ showFrom: from, showUntil: until });
    expect(isShown(both, new Date("2030-01-10T16:59:59Z"))).toBe(false);
    expect(isShown(both, new Date(from))).toBe(true);
    expect(isShown(both, new Date("2030-01-12T16:59:59Z"))).toBe(true);
    expect(isShown(both, new Date(until))).toBe(false);
    expect(isShown(link({ showFrom: from }), new Date("2031-01-01T00:00:00Z"))).toBe(true);
    expect(isShown(link({ showUntil: until }), new Date("2020-01-01T00:00:00Z"))).toBe(true);
    expect(isShown(link({ on: false }), new Date())).toBe(false);
    expect(isShown(newHeader(), new Date())).toBe(false);
  });

  it("knows the sites people link to most, and nothing else", () => {
    expect(networkFromUrl("https://www.instagram.com/mybakery")).toBe("instagram");
    expect(networkFromUrl("youtu.be/abc")).toBe("youtube");
    expect(networkFromUrl("https://twitter.com/me")).toBe("x");
    expect(networkFromUrl("https://open.spotify.com/artist/1")).toBe("spotify");
    expect(networkFromUrl("https://www.linkedin.com/in/me")).toBe("linkedin");
    expect(networkFromUrl("https://example.com")).toBeNull();
    expect(networkFromUrl("not a url")).toBeNull();
  });

  it("picks a link's icon: a known site, its type, its image, or none", () => {
    expect(linkIcon(link({ url: "instagram.com/me" }))).toEqual({
      kind: "network",
      network: "instagram",
    });
    expect(linkIcon(link({ url: "example.com" }))).toBeNull();
    expect(linkIcon(link({ type: "email", url: "a@b.co" }))).toEqual({ kind: "type", type: "email" });
    expect(linkIcon(link({ url: "instagram.com/me", icon: "none" }))).toBeNull();
    const image = { path: `${UID}/i.png`, name: "i.png", type: "image/png", size: 1 };
    expect(linkIcon(link({ icon: "image", image }))).toEqual({ kind: "image", image });
    // An image icon with no image falls back to automatic.
    expect(linkIcon(link({ icon: "image", url: "instagram.com/me" }))).toEqual({
      kind: "network",
      network: "instagram",
    });
  });

  it("checks each link by its type, ignores headers, and wants an end after the start", () => {
    const page = {
      ...PAGE_DEFAULTS.links(),
      title: "Hi",
      links: [
        newHeader(),
        link({ label: "Mail", type: "email", url: "nope" }),
        link({ label: "Call", type: "phone", url: "letters" }),
        link({
          label: "Sale",
          url: "shop.com",
          showFrom: "2030-01-12T00:00:00.000Z",
          showUntil: "2030-01-10T00:00:00.000Z",
        }),
      ],
    };
    expect(validatePage("links", page)).toEqual({
      "links.1.url": "Enter a valid email",
      "links.2.url": "Enter a valid phone number",
      "links.3.showUntil": "End after the start",
    });
  });

  it("doesn't count headers as links", () => {
    const page = { ...PAGE_DEFAULTS.links(), title: "Hi", links: [{ ...newHeader(), label: "Shop" }] };
    expect(validatePage("links", page)).toEqual({ "links.0.url": "Add at least one link" });
  });
});
```

- [ ] **Step 3: Run the tests and watch them fail.**

Run: `npx vitest run lib/pages/links.test.ts`
Expected: FAIL. `./links` doesn't exist.

- [ ] **Step 4: Implement.**

`lib/pages/types.ts`: replace `LinkItem` with:

```ts
export type LinkType = "web" | "email" | "phone" | "sms";

export interface LinkItem {
  /** The button's text; a header's text. */
  label: string;
  /** A web address, an email address or a phone number, by `type`. */
  url: string;
  /** Off keeps the link in the editor but not on the page. */
  on: boolean;
  /** A header is a text-only row between links. */
  kind: "link" | "header";
  type: LinkType;
  /** Auto: a known site's icon, or the type's. */
  icon: "auto" | "none" | "image";
  image: Media | null;
  /** Drawn taller, in the accent color; one per page. */
  featured: boolean;
  /** When it shows, as ISO times ("" for no limit). */
  showFrom: string;
  showUntil: string;
}
```

Update every place that builds a `LinkItem` literal so TypeScript passes: `PAGE_DEFAULTS.links`, `LinksField`'s `newItem`, the fixtures, the API example and the tests. Use `newLink()` from `lib/pages/links.ts` where you can. Run `npx tsc --noEmit` to find them.

`lib/pages/sanitize.ts`, the `link` spec:

```ts
const link: Record<string, Spec> = {
  label: str(80),
  url: str(2048),
  // Pages saved before links could be switched off show every link.
  on: { kind: "bool", fallback: true },
  kind: { kind: "enum", values: ["link", "header"] },
  type: { kind: "enum", values: ["web", "email", "phone", "sms"] },
  icon: { kind: "enum", values: ["auto", "none", "image"] },
  image: media,
  featured: bool,
  showFrom: str(30),
  showUntil: str(30),
};
```

`lib/pages/urls.ts`, after `telHref`:

```ts
/** A text-message link: the number's digits (and a leading +). */
export const smsHref = (number: string) => telHref(number)?.replace(/^tel:/, "sms:") ?? null;
```

`lib/pages/links.ts`:

```ts
import type { SocialNetwork } from "./types";
import type { LinkItem, Media } from "./types";
import { mailHref, safeHref, smsHref, telHref } from "./urls";

export const newLink = (): LinkItem => ({
  label: "",
  url: "",
  on: true,
  kind: "link",
  type: "web",
  icon: "auto",
  image: null,
  featured: false,
  showFrom: "",
  showUntil: "",
});

export const newHeader = (): LinkItem => ({ ...newLink(), kind: "header" });

// PageView draws content as given (the public page and the editor sanitize first), so a link
// saved before these fields existed may lack them: read each with its default.
const typeOf = (link: LinkItem) => link.type ?? "web";

/** Where a link goes, by its type; null when the address isn't usable (or it's a header). */
export function linkHref(link: LinkItem): string | null {
  if (link.kind === "header") return null;
  const type = typeOf(link);
  if (type === "email") return mailHref(link.url);
  if (type === "phone") return telHref(link.url);
  if (type === "sms") return smsHref(link.url);
  return safeHref(link.url);
}

const time = (iso: string) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : t;
};

/** Whether a link is on the page right now: switched on, and inside its schedule. */
export function isShown(link: LinkItem, now: Date): boolean {
  if (link.kind === "header" || !link.on) return false;
  const from = time(link.showFrom ?? "");
  const until = time(link.showUntil ?? "");
  const at = now.getTime();
  return (from === null || at >= from) && (until === null || at < until);
}

const HOSTS: [RegExp, SocialNetwork][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "facebook"],
  [/(^|\.)(x\.com|twitter\.com)$/, "x"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)github\.com$/, "github"],
  [/(^|\.)(threads\.net|threads\.com)$/, "threads"],
  [/(^|\.)(pinterest\.com|pin\.it)$/, "pinterest"],
  [/(^|\.)snapchat\.com$/, "snapchat"],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, "whatsapp"],
  [/(^|\.)(t\.me|telegram\.me|telegram\.org)$/, "telegram"],
  [/(^|\.)(discord\.gg|discord\.com)$/, "discord"],
  [/(^|\.)twitch\.tv$/, "twitch"],
  [/(^|\.)spotify\.com$/, "spotify"],
  [/(^|\.)soundcloud\.com$/, "soundcloud"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)bsky\.app$/, "bluesky"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
];

/** The known site a web address points at, for its icon. */
export function networkFromUrl(url: string): SocialNetwork | null {
  const href = safeHref(url);
  if (!href) return null;
  const host = new URL(href).hostname.toLowerCase();
  return HOSTS.find(([pattern]) => pattern.test(host))?.[1] ?? null;
}

export type LinkIcon =
  | { kind: "network"; network: SocialNetwork }
  | { kind: "type"; type: "email" | "phone" | "sms" }
  | { kind: "image"; image: Media };

/** A link's icon: its uploaded image, or (Auto) its type's or a known site's; null for none. */
export function linkIcon(link: LinkItem): LinkIcon | null {
  if (link.icon === "none") return null;
  if (link.icon === "image" && link.image) return { kind: "image", image: link.image };
  const type = typeOf(link);
  if (type !== "web") return { kind: "type", type };
  const network = networkFromUrl(link.url);
  return network ? { kind: "network", network } : null;
}
```

Merge the two `import type` lines from `./types`.

`lib/pages/validate.ts`: replace the links validator with this, and use the same per-type checks for Business `buttons`:

```ts
const checkLink = (errors: PageErrors, path: string, l: LinkItem) => {
  if (l.kind === "header" || !l.on) return;
  if (l.label.trim() && !l.url.trim()) errors[`${path}.url`] = `Add the link for “${l.label.trim()}”`;
  else if (l.url.trim() && !linkHref(l)) {
    errors[`${path}.url`] =
      l.type === "email"
        ? "Enter a valid email"
        : l.type === "phone" || l.type === "sms"
          ? "Enter a valid phone number"
          : URL_MESSAGE;
  }
  const from = l.showFrom ? Date.parse(l.showFrom) : NaN;
  const until = l.showUntil ? Date.parse(l.showUntil) : NaN;
  if (!Number.isNaN(from) && !Number.isNaN(until) && until <= from) {
    errors[`${path}.showUntil`] = "End after the start";
  }
};
```

- In `links`, the "filled" helper counts only `kind === "link"` rows: `const filled = (l: LinkItem) => l.kind === "link" && Boolean(l.label.trim() || l.url.trim());`.
- Replace the per-link loop with `p.links.forEach((l, i) => checkLink(errors, \`links.${i}\`, l));`.
- In `business`, replace the `p.buttons.forEach((b, i) => { if (!b.on) return; … checkUrl(…) })` block with `p.buttons.forEach((b, i) => checkLink(errors, \`buttons.${i}\`, b));`. Keep the name, phone, email, website, hours and socials checks around it.
- Import `linkHref` from `./links`.

- [ ] **Step 5: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages && npx tsc --noEmit`
Expected: PASS. If an older test built a `LinkItem` literal without the new fields, use `newLink()` and record a test-only ruling.

- [ ] **Step 6: Commit.**

```bash
git add lib/pages features e2e
git commit -m "Links can be headers, typed (email, phone, text), featured and scheduled"
```

---

### Task 2: The Link list page draws headers, icons, the featured link and the schedule

**Files:**
- Modify:
  - `features/pages/PageView.tsx` (`LinksView`; Business buttons through `linkHref`)
  - `features/pages/parts.tsx` (`PageLink` takes an icon and a featured flag)
- Create: `features/pages/LinkIcon.tsx`
- Test: `features/pages/PageView.test.tsx`

**Interfaces:**
- Consumes: `linkHref`, `isShown`, `linkIcon` and `LinkIcon` (Task 1).
- Produces:
  - `<LinkIconMark icon={LinkIcon} />`.
  - `PageLink` props `icon?: ReactNode` and `featured?: boolean`.

- [ ] **Step 1: Write the failing tests.** In `features/pages/PageView.test.tsx`:

```tsx
import { newHeader, newLink } from "@/lib/pages/links";

describe("Link list extras", () => {
  const page = (links: object[]) => ({ ...PAGE_DEFAULTS.links(), title: "Hi", links });

  it("draws headers between links, and skips empty ones", () => {
    view(
      "links",
      page([
        { ...newHeader(), label: "Shop" },
        { ...newLink(), label: "Store", url: "shop.com" },
        { ...newHeader(), label: "  " },
      ]),
      false,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Shop" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
  });

  it("links each type to the right address, and draws no button for a bad one", () => {
    view(
      "links",
      page([
        { ...newLink(), label: "Email us", type: "email", url: "hi@shop.com" },
        { ...newLink(), label: "Text us", type: "sms", url: "555 010 2030" },
        { ...newLink(), label: "Broken", type: "phone", url: "letters" },
      ]),
      false,
    );
    expect(screen.getByRole("link", { name: /Email us/ })).toHaveAttribute("href", "mailto:hi@shop.com");
    expect(screen.getByRole("link", { name: /Text us/ })).toHaveAttribute("href", "sms:5550102030");
    expect(screen.queryByRole("link", { name: /Broken/ })).toBeNull();
  });

  it("puts a known site's icon on its link, and none on an unknown one", () => {
    const { container } = view(
      "links",
      page([
        { ...newLink(), label: "Instagram", url: "instagram.com/me" },
        { ...newLink(), label: "Blog", url: "example.com" },
      ]),
      false,
    );
    const links = container.querySelectorAll("nav[aria-label=Links] a");
    expect(links[0]!.querySelector("[data-link-icon]")).not.toBeNull();
    expect(links[1]!.querySelector("[data-link-icon]")).toBeNull();
  });

  it("draws the featured link taller, and only the first one", () => {
    const { container } = view(
      "links",
      page([
        { ...newLink(), label: "One", url: "a.com", featured: true },
        { ...newLink(), label: "Two", url: "b.com", featured: true },
      ]),
      false,
    );
    const links = container.querySelectorAll("nav[aria-label=Links] a");
    expect(links[0]).toHaveAttribute("data-featured");
    expect(links[1]).not.toHaveAttribute("data-featured");
  });

  it("hides a link outside its schedule", () => {
    view(
      "links",
      page([
        { ...newLink(), label: "Later", url: "a.com", showFrom: "2999-01-01T00:00:00.000Z" },
        { ...newLink(), label: "Now", url: "b.com" },
      ]),
      false,
    );
    expect(screen.queryByRole("link", { name: /Later/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Now/ })).toBeInTheDocument();
  });

  it("keeps an old saved list exactly as before: no icons, no headers", () => {
    const { container } = view(
      "links",
      { ...PAGE_DEFAULTS.links(), title: "Hi", links: [{ label: "Blog", url: "example.com", on: true }] },
      false,
    );
    expect(container.querySelector("[data-link-icon]")).toBeNull();
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "https://example.com");
  });
});
```

`PageView` draws content as given; the public page and the editor sanitize first. So the last test passes a raw link from before these fields existed, and checks that the helpers' defaults hold (`type ?? "web"`, no `icon`/`kind`/schedule).

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/PageView.test.tsx -t "Link list extras"`
Expected: FAIL. There are no headers, `type` is ignored, and there are no icons, no featured marker and no schedule.

- [ ] **Step 3: Implement.**

`features/pages/LinkIcon.tsx`:

```tsx
import { Mail, MessageSquare, Phone } from "lucide-react";

import type { LinkIcon } from "@/lib/pages/links";

import { MediaImage, SocialIcon } from "./parts";

const TYPE_ICON = { email: Mail, phone: Phone, sms: MessageSquare };

/** The small mark at the start of a link button (spec item 6). */
export function LinkIconMark({ icon }: { icon: LinkIcon }) {
  if (icon.kind === "image") {
    return (
      <span data-link-icon className="size-7 shrink-0 overflow-hidden rounded-md">
        <MediaImage media={icon.image} alt="" className="size-full object-cover" />
      </span>
    );
  }
  if (icon.kind === "type") {
    const Icon = TYPE_ICON[icon.type];
    return <Icon data-link-icon aria-hidden className="size-5 shrink-0" />;
  }
  return (
    <span data-link-icon className="grid size-5 shrink-0 place-items-center">
      <SocialIcon network={icon.network} className="size-5" />
    </span>
  );
}
```

`MediaImage` and `SocialIcon` are already exported from `parts.tsx`.

`features/pages/parts.tsx` `PageLink`:
- Add the props `icon?: ReactNode` and `featured?: boolean`.
- With an icon, lay the content out so the label stays centered:

```tsx
  const body = icon ? (
    <span className="grid w-full grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
      {icon}
      <span className="min-w-0">{children}</span>
      <span aria-hidden />
    </span>
  ) : (
    children
  );
  const classes = cn(
    pageButton[variant],
    featured &&
      "min-h-16 text-lg ring-2 ring-(--page-accent) ring-offset-2 ring-offset-(--bg)",
  );
```

Then:
- Use `className={classes}` and `{body}` in both the preview span and the anchor.
- Add `data-featured={featured || undefined}` to both.
- Treat `mailto:`, `tel:` and `sms:` as not external, so they get no `target="_blank"`. The existing `external = /^https?:/.test(href)` already does this.

`features/pages/PageView.tsx` `LinksView`:

```tsx
function LinksView({ page, preview }: ViewProps<LinksPage>) {
  const now = new Date();
  const rows = page.links
    .map((link) => ({ link, href: linkHref(link) }))
    .filter(({ link, href }) =>
      link.kind === "header"
        ? link.label.trim() !== ""
        : isShown(link, now) && href !== null && (link.label.trim() || link.url.trim()),
    );
  const featuredAt = rows.findIndex(({ link }) => link.kind === "link" && link.featured);
  const look = page.look;
  const socials = <SocialRow socials={page.socials} look={look} preview={preview} />;
  const anyLinks = rows.some(({ link }) => link.kind === "link");
  return (
    <PageFrame look={look} preview={preview}>
      <PageHeader
        look={look}
        layout={look.header}
        image={page.avatar}
        imageAlt={page.title || "Profile picture"}
        title={page.title || "Your name"}
        sub={page.bio || undefined}
      />
      {look.socials === "top" && socials}
      <nav aria-label="Links" className="flex flex-col gap-3">
        {anyLinks ? (
          rows.map(({ link, href }, i) => {
            if (link.kind === "header") {
              return (
                <h2
                  key={i}
                  className="mt-3 px-1 text-center font-page-heading text-sm font-semibold tracking-wide text-fg-muted uppercase first:mt-0"
                >
                  {link.label.trim()}
                </h2>
              );
            }
            const icon = linkIcon(link);
            return (
              <PageLink
                key={i}
                href={href}
                preview={preview}
                featured={i === featuredAt}
                icon={icon ? <LinkIconMark icon={icon} /> : undefined}
              >
                {link.label.trim() || link.url.replace(/^(https?:\/\/|mailto:|tel:|sms:)/, "")}
              </PageLink>
            );
          })
        ) : (
          <EmptyNote>Links you add appear here.</EmptyNote>
        )}
      </nav>
      {look.socials === "bottom" && socials}
    </PageFrame>
  );
}
```

Business buttons: build hrefs with `linkHref(b)`, filter `b.kind === "link" && b.on && linkHref(b)`, and draw no icon yet (that comes with presets in 2b).

`SocialRow` gains the `look` prop in Task 4. Until then, keep the existing `SocialRow` call (without `look`) here, so this task compiles on its own.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add features/pages
git commit -m "The Link list draws headers, icons, the featured link and only what's scheduled now"
```

---

### Task 3: Editing a link: type, icon, featured, schedule, and headers

**Files:**
- Modify:
  - `features/pages/editor/fields.tsx` (`LinksField`)
  - `features/pages/editor/editors/LinksEditor.tsx` (`extras`)
- Test: create `features/pages/editor/LinksField.test.tsx`

**Interfaces:**
- Consumes: `newLink`, `newHeader` and `linkIcon` (Task 1).
- Produces: `LinksField` prop `extras?: boolean` (default false), which adds the type, icon, featured, schedule and header controls. LinksEditor passes it; Business doesn't.

- [ ] **Step 1: Write the failing tests.** Create `features/pages/editor/LinksField.test.tsx`:

```tsx
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { newLink } from "@/lib/pages/links";
import type { LinkItem } from "@/lib/pages/types";

import { LinksField, type ErrorsApi } from "./fields";
import { uploadMedia } from "./upload";

vi.mock("./upload", async (original) => ({ ...(await original<object>()), uploadMedia: vi.fn() }));

const errors: ErrorsApi = { error: () => undefined, touch: () => {}, reorder: () => {} };

function Harness({ initial, extras = true }: { initial: LinkItem[]; extras?: boolean }) {
  const [links, setLinks] = useState(initial);
  return (
    <>
      <LinksField items={links} onChange={setLinks} max={30} errors={errors} extras={extras} />
      <output aria-label="Links">{JSON.stringify(links)}</output>
    </>
  );
}
const links = () => JSON.parse(screen.getByRole("status", { name: "Links" }).textContent!) as LinkItem[];

describe("LinksField with extras", () => {
  it("adds a header row, which has only its text", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ ...newLink(), label: "Shop", url: "shop.com" }]} />);
    await user.click(screen.getByRole("button", { name: "Add header" }));
    expect(links().some((l) => l.kind === "header")).toBe(true);
    expect(screen.getByRole("textbox", { name: /^Header text/ })).toBeInTheDocument();
  });

  it("switches a link to email, and asks for an email address", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[newLink()]} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Link type" }), "Email");
    expect(links()[0]!.type).toBe("email");
    expect(screen.getByRole("textbox", { name: /^Email address/ })).toBeInTheDocument();
  });

  it("features one link at a time", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={[
          { ...newLink(), label: "One", url: "a.com", featured: true },
          { ...newLink(), label: "Two", url: "b.com" },
        ]}
      />,
    );
    const second = screen.getAllByRole("listitem").find((li) => within(li).queryByDisplayValue("Two"))!;
    await user.click(within(second).getByRole("button", { name: /More options/ }));
    await user.click(within(second).getByRole("switch", { name: /Featured/ }));
    expect(links().map((l) => l.featured)).toEqual([false, true]);
  });

  it("schedules a link in the owner's own time, and says so on the row", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ ...newLink(), label: "Sale", url: "shop.com" }]} />);
    await user.click(screen.getByRole("button", { name: /More options/ }));
    const from = screen.getByLabelText(/^Show from/);
    await user.type(from, "2030-01-10T09:00");
    expect(links()[0]!.showFrom).toBe(new Date("2030-01-10T09:00").toISOString());
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("uploads a link's own image as a small square", async () => {
    const user = userEvent.setup();
    const image = { path: "11111111-1111-4111-8111-111111111111/i.png", name: "i.png", type: "image/png", size: 1 };
    vi.mocked(uploadMedia).mockResolvedValue({ ok: true, media: image });
    const { container } = render(<Harness initial={[{ ...newLink(), label: "Shop", url: "shop.com" }]} />);
    await user.click(screen.getByRole("button", { name: /More options/ }));
    await user.click(screen.getByRole("radio", { name: "Image" }));
    const input = container.querySelector<HTMLInputElement>("input[type=file]")!;
    await act(async () => user.upload(input, new File(["x"], "i.png", { type: "image/png" })));
    expect(vi.mocked(uploadMedia).mock.lastCall![2]).toMatchObject({ maxSide: 256 });
    expect(links()[0]).toMatchObject({ icon: "image", image });
  });

  it("shows none of this for Business buttons", () => {
    render(<Harness initial={[newLink()]} extras={false} />);
    expect(screen.queryByRole("button", { name: "Add header" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Link type" })).toBeNull();
    expect(screen.queryByRole("button", { name: /More options/ })).toBeNull();
  });
});
```

Check two things before relying on these tests:
- **`MediaField`'s `onChange` and `maxSide` path:** the link's image upload uses `MediaField` with `maxSide={256}`. Its call into `uploadMedia(file, kind, { maxSide, ownerId })` is what the test reads.
- **The "Two" row lookup:** if the row's input value lookup doesn't work, find the second row by its ⋯ button name "Actions for link “Two”".

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/editor/LinksField.test.tsx`
Expected: FAIL. There's no Add header, Link type, More options, Featured, schedule or icon control.

- [ ] **Step 3: Implement `LinksField` extras.**

In `features/pages/editor/fields.tsx`:
1. Add the prop `/** The Link list's extras: types, icons, featured, schedules and headers. */ extras?: boolean`.
2. `newItem={newLink}`.
3. When `extras` is on, pass an `adder`. It shows "Add link" and "Add header" buttons side by side (each `buttonClasses("outline", "md")`), and keeps the "You can add up to N" note at the max. The add buttons call `add(newLink())` and `add(newHeader())`. When `extras` is off, keep the default Add button.
4. **The row's `rowActions`:**
   - A header row shows only the ⋯ menu (no on/off switch).
   - A link row keeps its on/off switch.
   - When `extras` is on and `item.showFrom || item.showUntil`, it shows a small "Scheduled" chip before the switch: `<span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted">Scheduled</span>`.
5. **The row's `render`:**
   - **A header** (`item.kind === "header"`) renders one `TextField` labeled "Header text", with path `${prefix}.${i}.label` and placeholder "Shop".
   - **A link with `extras`** renders:
     - A native `<select>` labeled "Link type", using the `Select` from `@/components/ui/inputs` with a visible label. Its options are Website, Email, Phone and Text message, which map to `web`, `email`, `phone` and `sms`.
     - "Button text", as today.
     - The address box, whose label and input depend on the type:

       | Type | Label | type / inputMode | Placeholder |
       | --- | --- | --- | --- |
       | web | "Link" | `url` | example.com |
       | email | "Email address" | `email` | hi@example.com |
       | phone | "Phone number" | `tel` | +1 555 010 2030 |
       | sms | "Phone number" | `tel` | +1 555 010 2030 |

     - A "More options" disclosure, a `<details>` with a `<summary>` styled as a 44 px button. Inside:
       - "Icon": a `SegmentedControl` with Auto, Image and None, plus `Labeled` from the Look tab (move it to `features/pages/editor/Labeled.tsx` so both can use it). When Image is chosen, a `MediaField` with label "Icon image", kind image, `maxSide={256}`, `round={false}`, and `onChange={(image) => update({ image })}`.
       - "Featured": a `ToggleField` with label "Featured" and description "Drawn taller, in the accent color." Its `onChange` maps the whole list: `onChange(items.map((l, j) => ({ ...l, featured: j === i ? on : false })))`.
       - "Show from" and "Show until": `TextField`s of `type="datetime-local"`, with paths `${prefix}.${i}.showFrom` and `${prefix}.${i}.showUntil`. Their value is `isoToLocalInput(item.showFrom)`, and `onChange={(v) => update({ showFrom: localToIso(v) ?? "" })}`. The hint is "In your time zone. Leave blank to always show." Import `isoToLocalInput` from `@/features/create/load` and `localToIso` from `@/features/create/submit`. If importing those from the create feature makes a cycle, move them to `lib/time/local.ts` and import them from there in both places, then record a ruling.
   - **A link without `extras`** renders as today.
6. **The summary** is a `<summary>` with `aria-label` "More options for {rowName}" and visible text "More options". The tests find it by `/More options/`. Give the `<details>` `data-more`. Its summary is a real button: `role` defaults to button for summary, and it already has a 44 px minimum height.

`features/pages/editor/editors/LinksEditor.tsx`: pass `extras` to `LinksField`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS. The every-text-box-has-a-limit test from Release 1 must still pass. The new boxes use schema paths: `links.N.label`, `links.N.url`, `links.N.showFrom` and `links.N.showUntil`.

- [ ] **Step 5: Commit.**

```bash
git add features/pages/editor
git commit -m "Edit a link's type, icon, featured flag and schedule, and add headers"
```

---

### Task 4: Social icon styles and sizes

**Files:**
- Modify:
  - `lib/pages/look.ts` (`socialStyle`, `socialSize`)
  - `features/pages/parts.tsx` (`SocialRow` takes the look)
  - `features/pages/PageView.tsx` (pass `look` to the three `SocialRow` calls)
  - `features/pages/editor/look/SocialsCard.tsx`
- Create:
  - `lib/pages/social-brands.ts`
  - `lib/pages/social-brands.test.ts`
- Test:
  - `lib/pages/look.test.ts`
  - `features/pages/PageView.test.tsx`
  - `features/pages/editor/look/LookEditor.test.tsx`

**Interfaces:**
- Produces:
  - `PageLook.socialStyle: "outline" | "filled" | "plain" | "brand"` (default `"outline"`).
  - `PageLook.socialSize: "small" | "medium" | "large"` (default `"medium"`).
  - `BRAND_COLORS: Partial<Record<SocialNetwork, string>>`.
  - `brandGlyph(color: string): "#FFFFFF" | "#000000"`.
  - `SocialRow({ socials, look, preview })`.

- [ ] **Step 1: Write the failing tests.**

`lib/pages/social-brands.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/color/contrast";

import { BRAND_COLORS, brandGlyph } from "./social-brands";

describe("brand colors", () => {
  it("draw each network's icon in white or black, whichever reads on its color", () => {
    for (const [network, color] of Object.entries(BRAND_COLORS)) {
      expect(contrastRatio(brandGlyph(color), color), network).toBeGreaterThanOrEqual(3);
    }
    expect(brandGlyph("#FFFC00")).toBe("#000000");
    expect(brandGlyph("#0866FF")).toBe("#FFFFFF");
  });
});
```

`lib/pages/look.test.ts`, inside `describe("sanitizeLook")`:

```ts
  it("keeps social icon styles and sizes, and falls back to outline and medium", () => {
    const base = themeLook("paper", "links");
    expect(base).toMatchObject({ socialStyle: "outline", socialSize: "medium" });
    const brand = sanitizeLook({ ...base, socialStyle: "brand", socialSize: "large" }, base);
    expect(brand).toMatchObject({ socialStyle: "brand", socialSize: "large" });
    expect(sanitizeLook({ ...base, socialStyle: "neon", socialSize: 9 }, base)).toMatchObject({
      socialStyle: "outline",
      socialSize: "medium",
    });
  });
```

`features/pages/PageView.test.tsx`:

```tsx
  it("draws social icons in the look's style and size, keeping a 44px target", () => {
    const content = {
      ...PAGE_DEFAULTS.links(),
      title: "Hi",
      socials: [{ network: "facebook", url: "me" }],
      look: { ...themeLook("paper", "links"), socialStyle: "brand", socialSize: "small" },
    };
    const { container } = view("links", content, false);
    const link = container.querySelector<HTMLElement>("[data-socials] a")!;
    expect(link.className).toContain("size-11");
    const mark = link.querySelector<HTMLElement>("[data-social-mark]")!;
    expect(mark.className).toContain("size-9");
    expect(mark.style.backgroundColor).toBe("rgb(8, 102, 255)");
    expect(mark.style.color).toBe("rgb(255, 255, 255)");
  });
```

In `features/pages/editor/look/LookEditor.test.tsx`:

```tsx
  it("sets the social icons' style and size", async () => {
    const user = userEvent.setup();
    render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    const card = within(screen.getByRole("region", { name: "Social icons" }));
    await user.click(card.getByRole("radio", { name: "Brand colors" }));
    await user.click(card.getByRole("radio", { name: "Large" }));
    expect(look()).toMatchObject({ socialStyle: "brand", socialSize: "large" });
  });
```

Import `within` if it isn't already.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages features/pages`
Expected: FAIL. The module is missing, the look has no `socialStyle`, the row has no mark element, and the card has no controls.

- [ ] **Step 3: Implement.**

`lib/pages/social-brands.ts`:

```ts
import { contrastRatio } from "@/lib/color/contrast";

import type { SocialNetwork } from "./types";

/** Each network's brand color (Simple Icons). LinkedIn's too; Website has none. */
export const BRAND_COLORS: Partial<Record<SocialNetwork, string>> = {
  instagram: "#FF0069",
  facebook: "#0866FF",
  x: "#000000",
  tiktok: "#000000",
  youtube: "#FF0000",
  github: "#181717",
  threads: "#000000",
  pinterest: "#BD081C",
  snapchat: "#FFFC00",
  whatsapp: "#25D366",
  telegram: "#26A5E4",
  discord: "#5865F2",
  twitch: "#9146FF",
  spotify: "#1ED760",
  soundcloud: "#FF5500",
  reddit: "#FF4500",
  mastodon: "#6364FF",
  bluesky: "#0285FF",
  linkedin: "#0A66C2",
};

/** White or black, whichever reads better on a brand color. */
export const brandGlyph = (color: string): "#FFFFFF" | "#000000" =>
  contrastRatio("#FFFFFF", color) >= contrastRatio("#000000", color) ? "#FFFFFF" : "#000000";
```

`lib/pages/look.ts`:
- Add `socialStyle: "outline" | "filled" | "plain" | "brand"; socialSize: "small" | "medium" | "large";` to `PageLook`, with a doc comment.
- In `themeLook`, set `socialStyle: "outline", socialSize: "medium"`.
- `applyTheme` keeps them, since they're not theme fields; `{...look}` already carries them.
- In `sanitizeLook`:

```ts
    socialStyle: oneOf(["outline", "filled", "plain", "brand"] as const, raw.socialStyle, fallback.socialStyle),
    socialSize: oneOf(["small", "medium", "large"] as const, raw.socialSize, fallback.socialSize),
```

`legacyLook` builds on `themeLook`, so it gets the defaults.

`features/pages/parts.tsx` `SocialRow({ socials, look, preview })`:

```tsx
const MARK = { small: "size-9", medium: "size-11", large: "size-14" } as const;
const GLYPH = { small: "size-4", medium: "size-5", large: "size-6" } as const;

export function SocialRow({
  socials,
  look,
  preview,
}: {
  socials: SocialItem[];
  look: PageLook;
  preview?: boolean;
}) {
  const items = socials
    .map((s) => ({ ...s, href: socialHref(s.network, s.url) }))
    .filter((s): s is SocialItem & { href: string } => s.href !== null);
  if (!items.length) return null;
  const size = look.socialSize;
  return (
    <ul data-socials className={cn("flex flex-wrap justify-center", size === "large" ? "gap-3" : "gap-2")}>
      {items.map((s, i) => {
        const brand = look.socialStyle === "brand" ? BRAND_COLORS[s.network] : undefined;
        // A network with no brand color (Website) is drawn filled instead.
        const style = look.socialStyle === "brand" && !brand ? "filled" : look.socialStyle;
        return (
          <li key={`${s.network}-${i}`}>
            <a
              href={preview ? undefined : s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={socialLabel(s.network)}
              title={socialLabel(s.network)}
              className={cn(
                "grid place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
                size === "large" ? "size-14" : "size-11",
              )}
            >
              <span
                data-social-mark
                className={cn(
                  "grid place-items-center rounded-full transition-colors",
                  MARK[size],
                  style === "outline" && "border border-border bg-surface text-fg hover:bg-surface-2",
                  style === "filled" && "bg-fg text-(--bg)",
                  style === "plain" && "text-fg",
                )}
                style={brand ? { backgroundColor: brand, color: brandGlyph(brand) } : undefined}
              >
                <SocialIcon network={s.network} className={GLYPH[size]} />
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
```

Import `BRAND_COLORS` and `brandGlyph` from `@/lib/pages/social-brands`.

`features/pages/PageView.tsx`: pass `look={look}` in the three `SocialRow` calls (Links, Contact, Business).

`features/pages/editor/look/SocialsCard.tsx`: under the position control, add two `Labeled` segmented controls:

```tsx
        <Labeled label="Style">
          <SegmentedControl
            aria-label="Social icon style"
            size="touch"
            value={look.socialStyle}
            onChange={(socialStyle) => onLook({ ...look, socialStyle })}
            options={[
              { value: "outline", label: "Outline" },
              { value: "filled", label: "Filled" },
              { value: "plain", label: "Plain" },
              { value: "brand", label: "Brand", ariaLabel: "Brand colors" },
            ]}
          />
        </Labeled>
        <Labeled label="Size">
          <SegmentedControl
            aria-label="Social icon size"
            size="touch"
            value={look.socialSize}
            onChange={(socialSize) => onLook({ ...look, socialSize })}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
          />
        </Labeled>
```

The card's wrapper becomes `flex flex-col gap-4`. Import `Labeled` from where Task 3 put it.

No existing Look tab test clicks a "Small", "Medium", "Large" or "Brand colors" radio, so the new names don't collide.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/pages features/pages
git commit -m "Social icons come in outline, filled, plain or brand colors, in three sizes"
```

---

### Task 5: Browser tests

**Files:**
- Modify:
  - `e2e/accounts/fixtures.ts` (a Link list page with the extras)
  - `e2e/accounts/page-text.spec.ts`, or create `e2e/accounts/link-list.spec.ts`

- [ ] **Step 1: Add a fixture page.** In `PHONE_PAGES`, after `PHONE-LONG`, add:

```ts
  {
    // Every Link list extra: a header, an icon, a featured link, an email link, brand socials.
    type: "links",
    slug: "PHONE-EXTRAS",
    content: {
      title: "Link extras",
      bio: "",
      links: [
        { label: "Shop", url: "", on: true, kind: "header" },
        { label: "Instagram", url: "instagram.com/ziplume", on: true, featured: true },
        { label: "Email us", url: "hi@example.com", on: true, type: "email" },
        { label: "Later", url: "example.com/later", on: true, showFrom: "2999-01-01T00:00:00.000Z" },
      ],
      socials: [
        { network: "instagram", url: "ziplume" },
        { network: "snapchat", url: "ziplume" },
        { network: "website", url: "example.com" },
      ],
      look: { theme: "paper", socialStyle: "brand", socialSize: "large" },
    },
  },
```

The `look` here is partial. `sanitizeLook` fills the rest from the Paper theme, because `theme` is present. Check this with `grep -n "sanitizeLook(source.look" lib/pages/sanitize.ts`. It's read with `missingLook` "legacy", so a partial look with a valid theme is kept field by field.

- [ ] **Step 2: Write the tests.** Create `e2e/accounts/link-list.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { MAKER } from "./fixtures";

test.describe("Link list extras", () => {
  test.use({ storageState: MAKER.state });

  test("the page draws its header, icons, featured link and email link, and hides what's scheduled later", async ({
    page,
  }) => {
    await page.goto("p/PHONE-EXTRAS");
    await expect(page.getByRole("heading", { level: 2, name: "Shop" })).toBeVisible();
    const featured = page.getByRole("link", { name: /Instagram/ }).first();
    await expect(featured).toHaveAttribute("data-featured", "true");
    await expect(page.getByRole("link", { name: /Email us/ })).toHaveAttribute(
      "href",
      "mailto:hi@example.com",
    );
    await expect(page.getByRole("link", { name: /Later/ })).toHaveCount(0);
    const snapchat = page.locator("[data-socials] a[aria-label=Snapchat] [data-social-mark]");
    await expect(snapchat).toHaveCSS("background-color", "rgb(255, 252, 0)");
  });

  test("the editor adds a header and a scheduled email link", async ({ page }) => {
    await page.goto("codes/new?type=links");
    await page.getByRole("button", { name: "Add header" }).click();
    await page.getByRole("textbox", { name: /^Header text/ }).first().fill("Contact");
    await page.getByRole("combobox", { name: "Link type" }).first().selectOption({ label: "Email" });
    await page.getByRole("textbox", { name: /^Email address/ }).first().fill("hi@example.com");
    const preview = page.getByRole("complementary", { name: "Preview" });
    await expect(preview.getByRole("heading", { level: 2, name: "Contact" })).toBeVisible();
  });
});
```

Also add `p/PHONE-EXTRAS` to the axe sweep, if the public-page sweep exists in `e2e/accounts/app.spec.ts` or `looks.spec.ts`. Run `grep -n "PHONE-\|LOOK-" e2e/accounts/*.spec.ts | head`. If the hosted-page sweeps iterate `PHONE_PAGES`, the new page is already covered: it's in the phone-layout sweep for sideways scroll and footer.

- [ ] **Step 3: Run the signed-in suite.**

Run: `npm run test:e2e:accounts`
Expected: all PASS, including the phone sweep over `PHONE-EXTRAS` at 320 px. If a phone profile shows sideways scroll from the large brand icons, the row's `flex-wrap` should prevent it. Fix the code, not the test.

- [ ] **Step 4: Commit.**

```bash
git add e2e/accounts
git commit -m "Browser tests: Link list headers, icons, featured, email links, schedules and brand socials"
```

---

### Task 6: Ship Release 2a

There's no migration in this release; it's all page content.

- [ ] **Step 1: Run the full local check.**

Run: `npm run format:check && npm run lint && npx tsc --noEmit && npm test && npm run test:e2e:accounts && npm run build && npm run test:e2e`
Expected: all PASS. `format:check` may list only git-ignored files under `.superpowers/`.

- [ ] **Step 2: Run the final whole-branch review.** Follow the "Final Review" section of superpowers:executing-plans, with this plan's Review Focus and the ledger's rulings. Do one fix pass.

- [ ] **Step 3: Update the API docs.** In `app/(docs)/developers/page.tsx`, where the hosted-page content is described, add one sentence: links may set `kind` ("link" or "header"), `type` ("web", "email", "phone" or "sms"), `featured`, and `showFrom`/`showUntil` (ISO times). Commit with the review fixes.

- [ ] **Step 4: Push, open the PR, wait for CI, and merge.**

```bash
git push -u origin feat/page-enhancements-r2a
gh pr create --base main --head feat/page-enhancements-r2a --title "Page enhancements 2a: Link list headers, icons, featured, schedules, link types, social styles" --body "$(cat <<'EOF'
Release 2a of docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md (plan docs/superpowers/plans/2026-10-16-page-enhancements-release-2a-link-list.md). Items 5–10.

- Social icons: Outline, Filled, Plain or Brand colors, in Small, Medium or Large (Link list, Contact, Business).
- Each link gets a known site's icon automatically, or an uploaded image, or none.
- Section headers between links; one featured link, drawn taller in the accent color.
- Links can show only between two times, set in the owner's time zone.
- Email, phone and text-message links.
- No migration.
- Tests: fill in the unit, signed-in and public counts from Step 1.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks --watch
gh pr merge --merge
```

- [ ] **Step 5: Check the live site.**
1. Wait for the version in `https://ziplume.com/sw.js` to change.
2. Find a client chunk containing "Add header" (the editor), and fetch it from ziplume.com. It must contain "Add header" and "Brand colors".
3. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307.
4. Create nothing and change no data in David's account.
