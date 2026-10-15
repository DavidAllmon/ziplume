# Pages release 2c: the content forms — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every hosted page's Content tab reads the same way (a Header card first, then the page's own cards, then Social icons), lists can be dragged into order by mouse, touch or keyboard, links and Business buttons can be switched off, and social profiles are picked from a grid of icons.

**Architecture:** One `SortableList` (built on `@dnd-kit/core` + `@dnd-kit/sortable`) replaces today's `ListField` for every list. Each row keeps a stable key while it moves, and the "you left this field" marks that decide which errors show are moved with their rows (`remapTouched`). Links and buttons gain `on: boolean` (default `true`); the sanitizer fills it in for older pages, the validator skips rows that are off, and the public page leaves them out. A `FormCard` draws each part of a form as its own card in the Create editor and as a titled section inside the home page's form.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Headless UI 2.2 (Menu, Switch), `@dnd-kit/core` 6.3.1 and `@dnd-kit/sortable` 10.0.0 (new), Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-ziplume-pages-redesign-design.md` — section 5.4 (Content tab) and section 7 (Release 2 testing). Releases 2a (editor frame) and 2b (device preview) are live; 2d (phones) follows.

## Global Constraints

- "Every page type uses the same order: a **Header** card first, then the type's own cards, then **Social icons** where the type has them. Cards have plain headings." The cards per type are the spec's table, copied into Task 5's `CARDS`.
- "**Drag to reorder** with a handle, by mouse, touch or keyboard (focus the handle, Space, arrow keys, Space). Each row's "⋯" menu also has Move up, Move down and Remove. Images can move both ways. This uses `@dnd-kit/core` and `@dnd-kit/sortable` (MIT; keyboard and touch support built in)."
- "Rows keep a stable identity while being moved, so an error stays on the row it belongs to."
- "**On/off switch** on each link (Link list) and button (Business): off hides it from the public page but keeps it in the editor. Stored as `on: boolean` on the item, default `true`."
- "**Social icons**: a grid of network icons; picking one adds a row for its address."
- New dependencies are exactly `@dnd-kit/core` and `@dnd-kit/sortable` (no `@dnd-kit/utilities` or `@dnd-kit/modifiers`).
- Copy: sentence case, curly quotes (“ ” ’), plain words; row names read like `link “Shop”` or `link 2`.
- No sideways scroll at 320–430px and axe-clean in light and dark (the existing suites enforce both).
- `next build` type-checks test files: every test file must compile.

## Rulings made in this plan (David can overrule before Task 2)

1. **Where a new row goes.** The spec says "Add sits at the top of the list and the new row opens focused, as on Linktree." Links and Business buttons do exactly that: Add on top, new row on top. Phone numbers, email addresses and menu sections and dishes are read in order (the first phone is the main one; a menu is typed top to bottom), so there the new row goes at the end and the Add button sits under the list, where the row appears. Images: the Add images box moves to the top and new images go at the end. Social icons: the icon grid is on top and new profiles go at the end. *Cost if wrong:* `addAt` is one prop per list.
2. **A link that's off isn't checked.** You can park an unfinished link by switching it off. "Add at least one link" counts only links that are on; if every filled-in link is off, the message is "Turn on at least one link".
3. **Social icons don't add a network twice.** Picking a network that's already in the list puts the cursor in its address instead. Older pages with two rows for one network keep both.
4. **Social profiles can be dragged too**, like every other list.
5. **The home page** (signed-in people making a page from the generator) gets the same parts as titled sections inside its own card, not cards inside a card; Phase 5 owns its layout.
6. **Gallery flows, desktop and phone:** the spec asks for a Link list, a Business and an Event from the gallery "on desktop and on a phone". Task 6 makes the Link list and the Event on desktop and the Business on a 390px phone; the six-phone layout suite already opens the editor on every phone profile. *Cost if wrong:* two more tests.
7. **Single-field cards** (Contact page About, Business About, App Website) hide the field's label visually, since the card heading says the same thing; screen readers still hear it.

## Review Focus

1. **Rows replaced from outside** (Discard, opening a saved code, Resume of a draft) while the list holds row keys: the editor must show exactly the new rows, in order, with their values. — Test in Task 2 (`SortableList` "lines up with a list replaced from outside").
2. **Pages saved before 2c** (and API content) have no `on`: every link and button must stay on the live page. — Test in Task 1 ("are on unless saved as off").
3. **An off link that's unfinished or broken** (label but no address, or `javascript:`) must not block Create, and turning it back on must bring its error back. — Test in Task 1 ("aren't checked while off").
4. **Nested lists:** moving a menu section must carry its dishes and their errors, and moving a dish must never move a section. — Tests in Task 2 (`touched.test.ts` nested case; PageEditor "a section moves with its dishes").
5. **Keyboard drag cancelled with Escape** must leave the order as it was. — e2e in Task 2.

---

## File structure

| File | Responsibility |
|---|---|
| `lib/pages/types.ts` | `LinkItem.on`; default rows get `on: true` |
| `lib/pages/sanitize.ts` | `bool` specs take a `fallback`; link items default `on` to `true` |
| `lib/pages/validate.ts` | off links and buttons aren't checked or counted |
| `features/pages/PageView.tsx` | the public page leaves off links and buttons out |
| `app/(docs)/developers/page.tsx` | one sentence on `"on": false` |
| `features/pages/editor/touched.ts` | `remapTouched`: moves "left this field" marks with their rows |
| `features/pages/editor/sortable/rowIds.ts` | stable row keys |
| `features/pages/editor/sortable/SortableArea.tsx` | the dnd-kit context: sensors, announcements, drop |
| `features/pages/editor/sortable/RowMenu.tsx` | a row's ⋯ menu |
| `features/pages/editor/sortable/SortableList.tsx` | a list of small forms: Add, drag, menu, focus |
| `features/pages/editor/fields.tsx` | `ErrorsApi.reorder`, `ShowSwitch`, `LinksField`, `SocialsField`, `ImagesField`; `ListField` and `move` removed |
| `features/pages/editor/PageEditor.tsx` | implements `reorder`; `cards` prop |
| `features/pages/editor/FormCard.tsx` | a titled part of a form: card or section |
| `features/pages/editor/editors/*.tsx` | each type's cards in the spec's order |
| `components/ui/Field.tsx` | `hideLabel` |
| `features/generator/content/types.ts`, `HostedPageForm.tsx` | `pageCards` flag |
| `features/create/EditorLayout.tsx`, `sections/ContentSection.tsx` | cards in the Create editor; no outer Content card for pages |

---

### Task 1: Links and buttons can be switched off

**Files:**
- Modify: `lib/pages/types.ts` (LinkItem; `PAGE_DEFAULTS.links`)
- Modify: `lib/pages/sanitize.ts` (Spec `bool`, `link`, `emptyFor`)
- Modify: `lib/pages/validate.ts` (links, business)
- Modify: `features/pages/PageView.tsx` (LinksView, BusinessView buttons)
- Modify: `app/(docs)/developers/page.tsx` (hosted pages paragraph)
- Test: `lib/pages/pages.test.ts`, `features/pages/PageView.test.tsx`

**Interfaces:**
- Produces: `interface LinkItem { label: string; url: string; on: boolean }`. Every later task builds link rows with `on: true`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/pages/pages.test.ts`:

```ts
describe("links and buttons can be switched off", () => {
  it("are on unless saved as off, including pages saved before the switch existed", () => {
    const page = sanitizePage("links", {
      links: [
        { label: "A", url: "a.com" },
        { label: "B", url: "b.com", on: false },
        { label: "C", url: "c.com", on: "no" },
      ],
    });
    expect(page.links.map((link) => link.on)).toEqual([true, false, true]);
    expect(sanitizePage("business", { buttons: [{ label: "Order", url: "o.com" }] }).buttons[0]?.on).toBe(
      true,
    );
    expect(PAGE_DEFAULTS.links().links[0]?.on).toBe(true);
  });

  it("aren't checked while off, and only links that are on count", () => {
    const base = { ...PAGE_DEFAULTS.links(), title: "Me" };
    const shop = { label: "Shop", url: "shop.com", on: true };
    expect(
      validatePage("links", { ...base, links: [{ label: "Later", url: "", on: false }, shop] }),
    ).toEqual({});
    expect(
      validatePage("links", {
        ...base,
        links: [{ label: "Bad", url: "javascript:alert(1)", on: false }, shop],
      }),
    ).toEqual({});
    expect(validatePage("links", { ...base, links: [{ ...shop, on: false }] })).toEqual({
      "links.0.url": "Turn on at least one link",
    });
    // Back on, its problem is back.
    expect(
      validatePage("links", { ...base, links: [{ label: "Later", url: "", on: true }] }),
    ).toMatchObject({ "links.0.url": "Add the link for “Later”" });
    expect(
      validatePage("business", {
        ...PAGE_DEFAULTS.business(),
        name: "Cafe",
        buttons: [{ label: "Order", url: "", on: false }],
      }),
    ).toEqual({});
  });
});
```

Append to `features/pages/PageView.test.tsx` (add `screen` to the `@testing-library/react` import):

```tsx
  it("leaves switched-off links and buttons off the live page", () => {
    const links = {
      ...PAGE_DEFAULTS.links(),
      title: "Me",
      links: [
        { label: "Shown", url: "a.com", on: true },
        { label: "Hidden", url: "b.com", on: false },
      ],
    };
    const first = view("links", links, false);
    expect(screen.getByRole("link", { name: "Shown" })).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).toBeNull();
    first.unmount();

    const business = {
      ...PAGE_DEFAULTS.business(),
      name: "Cafe",
      buttons: [
        { label: "Order", url: "o.com", on: false },
        { label: "Call us", url: "c.com", on: true },
      ],
    };
    view("business", business, false);
    expect(screen.queryByText("Order")).toBeNull();
    expect(screen.getByRole("link", { name: "Call us" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/pages/pages.test.ts features/pages/PageView.test.tsx`
Expected: FAIL — `on` is `undefined` after sanitizing, the off "Bad" link is flagged, and "Hidden" and "Order" are on the page.

- [ ] **Step 3: Add `on` to the data**

`lib/pages/types.ts`:

```ts
export interface LinkItem {
  label: string;
  url: string;
  /** Off keeps the link in the editor but not on the page. */
  on: boolean;
}
```

and in `PAGE_DEFAULTS.links`: `links: [{ label: "", url: "", on: true }],`

`lib/pages/sanitize.ts`: the `bool` spec takes a fallback, used when a list item has no value.

```ts
type Spec =
  | { kind: "string"; max: number }
  | { kind: "bool"; fallback?: boolean }
  // …the other kinds unchanged
```

```ts
const link: Record<string, Spec> = {
  label: str(80),
  url: str(2048),
  // Pages saved before links could be switched off show every link.
  on: { kind: "bool", fallback: true },
};
```

and in `emptyFor`:

```ts
    case "bool":
      return spec.fallback ?? false;
```

- [ ] **Step 4: Skip off rows in the validator**

`lib/pages/validate.ts`, the `links` validator:

```ts
  links: (p) => {
    const errors: PageErrors = {};
    if (!p.title.trim()) errors.title = "Add a title";
    const filled = (l: LinkItem) => Boolean(l.label.trim() || l.url.trim());
    // A link that's off is parked: it isn't checked and doesn't count.
    if (!p.links.some((l) => l.on && filled(l)) && !p.socials.some((s) => s.url.trim())) {
      errors["links.0.url"] = p.links.some(filled)
        ? "Turn on at least one link"
        : "Add at least one link";
    }
    p.links.forEach((l, i) => {
      if (!l.on) return;
      if (l.label.trim() && !l.url.trim())
        errors[`links.${i}.url`] = `Add the link for “${l.label.trim()}”`;
      checkUrl(errors, `links.${i}.url`, l.url);
    });
    checkSocials(errors, p.socials);
    return errors;
  },
```

(import `type LinkItem` alongside `PageContentMap, SocialItem`), and in `business`:

```ts
    p.buttons.forEach((b, i) => {
      if (!b.on) return;
      if (b.label.trim() && !b.url.trim())
        errors[`buttons.${i}.url`] = `Add the link for “${b.label.trim()}”`;
      checkUrl(errors, `buttons.${i}.url`, b.url);
    });
```

- [ ] **Step 5: Leave off rows off the page**

`features/pages/PageView.tsx`, `LinksView`:

```ts
  const links = page.links
    .filter((link) => link.on)
    .map((link) => ({ ...link, href: safeHref(link.url) }))
    .filter((link) => link.href && (link.label.trim() || link.url.trim()));
```

and the Business buttons:

```tsx
      {page.buttons
        .filter((b) => b.on && safeHref(b.url))
```

- [ ] **Step 6: Document it for API users**

`app/(docs)/developers/page.tsx`, end of the hosted pages paragraph, after "the API can refer to them but not upload them.":

```tsx
        Upload images and files in the app first; the API can refer to them but not upload them.
        A link or button with <code>&quot;on&quot;: false</code> stays saved but isn’t shown on the
        page; without it, it’s shown.
```

- [ ] **Step 7: Fix the tests that build links without `on`**

Run: `npx tsc --noEmit`
Expected: errors only where test files build `{ label, url }` link or button items. Add `on: true` to each one it lists (in `lib/pages/pages.test.ts` the "flags unsafe or broken links", "says which field to fill in" cases, and the `toEqual({ label: "L0", url: "https://e.com" })` expectation becomes `{ label: "L0", url: "https://e.com", on: true }`). Re-run until clean.

- [ ] **Step 8: Run the tests**

Run: `npx vitest run lib/pages features/pages`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/pages features/pages/PageView.tsx features/pages/PageView.test.tsx "app/(docs)/developers/page.tsx"
git commit -m "Links and Business buttons can be switched off: on by default, left off the page, not checked while off"
```

---

### Task 2: Lists you can drag, with a ⋯ menu, Add on top and an on/off switch

**Files:**
- Modify: `package.json`, `package-lock.json` (`@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0`)
- Create: `features/pages/editor/touched.ts`, `features/pages/editor/touched.test.ts`
- Create: `features/pages/editor/sortable/rowIds.ts`, `features/pages/editor/sortable/rowIds.test.ts`
- Create: `features/pages/editor/sortable/SortableArea.tsx`
- Create: `features/pages/editor/sortable/RowMenu.tsx`
- Create: `features/pages/editor/sortable/SortableList.tsx`, `features/pages/editor/sortable/SortableList.test.tsx`
- Modify: `features/pages/editor/fields.tsx` (`ErrorsApi.reorder`, `ShowSwitch`, `LinksField`, `SocialsField`; delete `ListField`)
- Modify: `features/pages/editor/PageEditor.tsx` (`reorder`)
- Modify: `features/pages/editor/editors/VcardEditor.tsx`, `MenuEditor.tsx`, `BusinessEditor.tsx`
- Test: `features/pages/editor/PageEditor.test.tsx`, `e2e/accounts/create.spec.ts`

**Interfaces:**
- Consumes: `LinkItem.on` (Task 1).
- Produces:
  - `ErrorsApi { error(path): string | undefined; touch(path): void; reorder?(prefix: string, order: number[]): void }` — `order[newIndex]` is the row's old index, `-1` for a new row.
  - `remapTouched(touched: ReadonlySet<string>, prefix: string, order: number[]): ReadonlySet<string>`
  - `SortableArea({ ids: string[]; names: string[]; grid?: boolean; onMove(from: number, to: number): void; children })`
  - `RowMenu({ name: string; first: boolean; last: boolean; onMove(by: -1 | 1): void; onRemove(): void; layout?: "list" | "grid" })`
  - `SortableList<T>(props: SortableListProps<T>)` (below), with `adder` used by Task 3.
  - `ShowSwitch({ checked, onChange, label })`; `LinksField({ …, itemName?: string })`.
  - Accessible names: handle `Drag <row>`, menu `Actions for <row>`, items `Move up` / `Move down` / `Remove`, switch `Show <row> on the page`, where `<row>` is `link “Shop”` or `link 2`.

- [ ] **Step 1: Add the packages**

Run: `npm install @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0`
Expected: both in `dependencies`; `npm ls @dnd-kit/core` shows 6.3.1.

- [ ] **Step 2: Write the failing tests for the pure parts**

`features/pages/editor/touched.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { remapTouched } from "./touched";

const sorted = (set: ReadonlySet<string>) => [...set].sort();

describe("remapTouched", () => {
  it("moves a row's marks with it, and drops a removed row's", () => {
    const touched = new Set(["title", "links.0.url", "links.2.url"]);
    // Row 0 moves to the end: the new order is the old rows 1, 2, 0.
    expect(sorted(remapTouched(touched, "links", [1, 2, 0]))).toEqual([
      "links.1.url",
      "links.2.url",
      "title",
    ]);
    expect(sorted(remapTouched(touched, "links", [0, 1]))).toEqual(["links.0.url", "title"]);
    // A new row on top pushes the others down.
    expect(sorted(remapTouched(touched, "links", [-1, 0, 1, 2]))).toEqual([
      "links.1.url",
      "links.3.url",
      "title",
    ]);
  });

  it("moves dishes with their section, and leaves other lists alone", () => {
    const touched = new Set(["sections.0.items.1.name", "sections.1.items.0.name", "socials.0.url"]);
    expect(sorted(remapTouched(touched, "sections", [1, 0]))).toEqual([
      "sections.0.items.0.name",
      "sections.1.items.1.name",
      "socials.0.url",
    ]);
    expect(sorted(remapTouched(touched, "sections.0.items", [1, 0]))).toEqual([
      "sections.0.items.0.name",
      "sections.1.items.0.name",
      "socials.0.url",
    ]);
  });

  it("returns the same set when nothing in the list was touched", () => {
    const touched = new Set(["title"]);
    expect(remapTouched(touched, "links", [1, 0])).toBe(touched);
  });
});
```

`features/pages/editor/sortable/rowIds.test.ts`:

```ts
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRowIds } from "./rowIds";

describe("useRowIds", () => {
  it("keeps each row's key, and makes keys to match a list resized from outside", () => {
    const { result, rerender } = renderHook(({ count }) => useRowIds(count), {
      initialProps: { count: 2 },
    });
    const [first] = result.current;
    expect(new Set(first).size).toBe(2);
    rerender({ count: 2 });
    expect(result.current[0]).toEqual(first);
    rerender({ count: 3 });
    expect(result.current[0]).toHaveLength(3);
    expect(result.current[0].slice(0, 2)).toEqual(first);
    rerender({ count: 1 });
    expect(result.current[0]).toEqual([first[0]]);
  });
});
```

- [ ] **Step 3: Run them to make sure they fail**

Run: `npx vitest run features/pages/editor/touched.test.ts features/pages/editor/sortable/rowIds.test.ts`
Expected: FAIL — cannot find `./touched` and `./rowIds`.

- [ ] **Step 4: Write `remapTouched` and `useRowIds`**

`features/pages/editor/touched.ts`:

```ts
/**
 * Moves the "left this field" marks of a list's rows along with the rows, so a row's error stays
 * on it when it moves. `order[newIndex]` is the row's old index, or -1 for a new row; a row whose
 * old index isn't in `order` was removed. Paths look like "links.2.url" or
 * "sections.1.items.0.name".
 */
export function remapTouched(
  touched: ReadonlySet<string>,
  prefix: string,
  order: number[],
): ReadonlySet<string> {
  const head = `${prefix}.`;
  const newIndex = new Map(order.map((old, i) => [old, i]));
  let changed = false;
  const next = new Set<string>();
  for (const path of touched) {
    const rest = path.startsWith(head) ? path.slice(head.length) : null;
    const dot = rest?.indexOf(".") ?? -1;
    const old = rest === null ? NaN : Number(dot === -1 ? rest : rest.slice(0, dot));
    if (!Number.isInteger(old)) {
      next.add(path);
      continue;
    }
    changed = true;
    const moved = newIndex.get(old);
    if (moved !== undefined) next.add(`${head}${moved}${dot === -1 ? "" : rest!.slice(dot)}`);
  }
  return changed ? next : touched;
}
```

`features/pages/editor/sortable/rowIds.ts`:

```ts
import { useState } from "react";

let last = 0;

/** A key for a new row, unique in this tab. */
export const newRowId = () => `row-${++last}`;

/**
 * Keys for a list's rows that stay with each row while it moves, so its fields, focus and drag
 * follow it. The list's own changes (add, move, remove) set them; when the list changes length
 * from outside (Discard, a restored draft), keys are made again to match.
 */
export function useRowIds(count: number): [string[], (ids: string[]) => void] {
  const [ids, setIds] = useState<string[]>(() => Array.from({ length: count }, newRowId));
  if (ids.length !== count) {
    const next = Array.from({ length: count }, (_, i) => ids[i] ?? newRowId());
    setIds(next);
    return [next, setIds];
  }
  return [ids, setIds];
}
```

- [ ] **Step 5: Run them to make sure they pass**

Run: `npx vitest run features/pages/editor/touched.test.ts features/pages/editor/sortable/rowIds.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Write the failing `SortableList` tests**

`features/pages/editor/sortable/SortableList.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { TextField, type ErrorsApi } from "../fields";
import { SortableList } from "./SortableList";

interface Row {
  label: string;
}

function Harness({
  initial,
  addAt,
  errors,
  max = 10,
}: {
  initial: Row[];
  addAt?: "start" | "end";
  errors?: ErrorsApi;
  max?: number;
}) {
  const [items, setItems] = useState(initial);
  return (
    <>
      <SortableList
        label="Links"
        items={items}
        onChange={setItems}
        max={max}
        newItem={() => ({ label: "" })}
        addLabel="Add link"
        addAt={addAt}
        path="links"
        errors={errors}
        itemLabel={(item, i) => (item.label ? `link “${item.label}”` : `link ${i + 1}`)}
        render={(item, update) => (
          <TextField label="Button text" value={item.label} onChange={(label) => update({ label })} />
        )}
      />
      <button type="button" onClick={() => setItems([{ label: "X" }])}>
        Replace
      </button>
    </>
  );
}

const values = () =>
  screen.getAllByLabelText("Button text").map((input) => (input as HTMLInputElement).value);

describe("SortableList", () => {
  it("adds a row on top and puts the cursor in it", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ label: "A" }]} />);
    await user.click(screen.getByRole("button", { name: "Add link" }));
    expect(values()).toEqual(["", "A"]);
    expect(screen.getAllByLabelText("Button text")[0]).toHaveFocus();
  });

  it("adds at the end for lists read in order", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ label: "A" }]} addAt="end" />);
    await user.click(screen.getByRole("button", { name: "Add link" }));
    expect(values()).toEqual(["A", ""]);
    expect(screen.getAllByLabelText("Button text")[1]).toHaveFocus();
  });

  it("moves and removes rows from each row's ⋯ menu, and what's typed goes with its row", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ label: "A" }, { label: "B" }, { label: "C" }]} />);
    await user.click(screen.getByRole("button", { name: "Actions for link “A”" }));
    expect(screen.getByRole("menuitem", { name: "Move up" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("menuitem", { name: "Move down" }));
    expect(values()).toEqual(["B", "A", "C"]);
    await user.click(screen.getByRole("button", { name: "Actions for link “C”" }));
    await user.click(screen.getByRole("menuitem", { name: "Move up" }));
    expect(values()).toEqual(["B", "C", "A"]);
    await user.click(screen.getByRole("button", { name: "Actions for link “C”" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove" }));
    expect(values()).toEqual(["B", "A"]);
  });

  it("tells the form which way rows moved, so their errors follow", async () => {
    const user = userEvent.setup();
    const reorder = vi.fn();
    const errors: ErrorsApi = { error: () => undefined, touch: vi.fn(), reorder };
    render(<Harness initial={[{ label: "A" }, { label: "B" }]} errors={errors} />);
    await user.click(screen.getByRole("button", { name: "Actions for link “B”" }));
    await user.click(screen.getByRole("menuitem", { name: "Move up" }));
    expect(reorder).toHaveBeenLastCalledWith("links", [1, 0]);
    await user.click(screen.getByRole("button", { name: "Add link" }));
    expect(reorder).toHaveBeenLastCalledWith("links", [-1, 0, 1]);
  });

  it("lines up with a list replaced from outside", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ label: "A" }, { label: "B" }]} />);
    await user.click(screen.getByRole("button", { name: "Replace" }));
    expect(values()).toEqual(["X"]);
  });

  it("gives each row a drag handle keyboard users can reach", () => {
    render(<Harness initial={[{ label: "A" }]} />);
    const handle = screen.getByRole("button", { name: "Drag link “A”" });
    expect(handle).toHaveAttribute("aria-roledescription", "sortable");
    expect(handle).toHaveAttribute("tabindex", "0");
  });

  it("hides Add once the list is full", () => {
    render(<Harness initial={[{ label: "A" }]} max={1} />);
    expect(screen.queryByRole("button", { name: "Add link" })).toBeNull();
  });
});
```

- [ ] **Step 7: Run them to make sure they fail**

Run: `npx vitest run features/pages/editor/sortable/SortableList.test.tsx`
Expected: FAIL — cannot find `./SortableList`.

- [ ] **Step 8: Write the drag area and the row menu**

`features/pages/editor/sortable/SortableArea.tsx`:

```tsx
"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useId, type ReactNode } from "react";

const INSTRUCTIONS =
  "To move it, press Space. Use the arrow keys to move it, then Space to drop it, or Escape to cancel.";

/**
 * Lets the rows inside be dragged into a new order by mouse, touch (from the handle) or keyboard
 * (focus the handle, Space, arrow keys, Space). `names` say each row's name in announcements.
 */
export function SortableArea({
  ids,
  names,
  grid = false,
  onMove,
  children,
}: {
  ids: string[];
  names: string[];
  /** Rows wrap in a grid (images) rather than stack. */
  grid?: boolean;
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}) {
  const id = useId();
  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a tap on the handle stays a tap.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const index = (rowId: UniqueIdentifier) => ids.indexOf(String(rowId));
  const name = (rowId: UniqueIdentifier) => names[index(rowId)] ?? "the item";
  const of = ` of ${ids.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${name(active.id)}, position ${index(active.id) + 1}${of}.`,
    onDragOver: ({ active, over }) =>
      over ? `${name(active.id)} is at position ${index(over.id) + 1}${of}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${name(active.id)} at position ${index(over.id) + 1}${of}.`
        : `Dropped ${name(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Cancelled. ${name(active.id)} is back at position ${index(active.id) + 1}${of}.`,
  };
  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) onMove(index(active.id), index(over.id));
      }}
    >
      <SortableContext
        items={ids}
        strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}
```

`features/pages/editor/sortable/RowMenu.tsx`:

```tsx
"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MoreHorizontal, Trash2 } from "lucide-react";

import { menuItemClass, menuPanelClass } from "@/components/app/nav";
import { cn } from "@/lib/cn";

const WORDS = {
  list: { earlier: "Move up", later: "Move down", Earlier: ArrowUp, Later: ArrowDown },
  grid: { earlier: "Move earlier", later: "Move later", Earlier: ArrowLeft, Later: ArrowRight },
};

const itemClass = cn(menuItemClass, "data-disabled:cursor-not-allowed data-disabled:opacity-50");

/** A row's ⋯ menu: move it one place either way, or remove it. */
export function RowMenu({
  name,
  first,
  last,
  onMove,
  onRemove,
  layout = "list",
}: {
  /** e.g. link “Shop” */
  name: string;
  first: boolean;
  last: boolean;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  layout?: "list" | "grid";
}) {
  const { earlier, later, Earlier, Later } = WORDS[layout];
  return (
    <Menu as="div" className="relative">
      <MenuButton
        data-row-menu
        aria-label={`Actions for ${name}`}
        className="grid size-11 place-items-center rounded-control text-fg-muted hover:bg-surface-2 hover:text-fg data-focus:outline-2 data-focus:outline-ring sm:size-9"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </MenuButton>
      <MenuItems anchor={{ to: "bottom end", gap: 4 }} transition className={menuPanelClass}>
        <MenuItem disabled={first}>
          <button type="button" className={itemClass} onClick={() => onMove(-1)}>
            <Earlier aria-hidden /> {earlier}
          </button>
        </MenuItem>
        <MenuItem disabled={last}>
          <button type="button" className={itemClass} onClick={() => onMove(1)}>
            <Later aria-hidden /> {later}
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={itemClass} onClick={onRemove}>
            <Trash2 aria-hidden /> Remove
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
```

- [ ] **Step 9: Write `SortableList`**

`features/pages/editor/sortable/SortableList.tsx`:

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, Plus } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

import type { ErrorsApi } from "../fields";
import { RowMenu } from "./RowMenu";
import { newRowId, useRowIds } from "./rowIds";
import { SortableArea } from "./SortableArea";

/** Where the cursor goes in a new row: its first field (not a file picker). */
const FIRST_FIELD =
  "input:not([type='hidden']):not([type='file']):not(:disabled), textarea:not(:disabled), select:not(:disabled)";

type Update<T> = (patch: Partial<T>) => void;

export interface SortableListProps<T> {
  /** Names the list, e.g. "Links". Read by screen readers; shown unless `showLabel` is false. */
  label: string;
  showLabel?: boolean;
  items: T[];
  onChange: (items: T[]) => void;
  max: number;
  newItem: () => T;
  addLabel: string;
  /** Where Add puts the new row, and where the Add button sits. */
  addAt?: "start" | "end";
  /** A row's name in its controls and announcements: “link “Shop”” or “link 2”. */
  itemLabel: (item: T, index: number) => string;
  /** The rows' error path ("links", "sections.0.items"), so errors move with their rows. */
  path?: string;
  errors?: ErrorsApi;
  /** A row that's switched off: shown dashed, with a note. */
  off?: (item: T) => boolean;
  /** Controls before a row's ⋯ menu, e.g. the on/off switch. */
  rowActions?: (item: T, update: Update<T>, index: number) => ReactNode;
  /** Replaces the Add button (the social icon grid): `add` adds a row, `focus` goes to one. */
  adder?: (actions: { add: (item: T) => void; focus: (index: number) => void }) => ReactNode;
  render: (item: T, update: Update<T>, index: number) => ReactNode;
}

/** A list of small forms (links, phone numbers, dishes…): Add, drag to reorder, and a ⋯ menu. */
export function SortableList<T>({
  label,
  showLabel = true,
  items,
  onChange,
  max,
  newItem,
  addLabel,
  addAt = "start",
  itemLabel,
  path,
  errors,
  off,
  rowActions,
  adder,
  render,
}: SortableListProps<T>) {
  const [ids, setIds] = useRowIds(items.length);
  const rows = useRef(new Map<string, HTMLElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  // Where focus goes once the list has re-rendered: a row's first field or its ⋯ button, or
  // (id null) the Add button.
  const pending = useRef<{ id: string | null; target: "field" | "menu" } | null>(null);

  useLayoutEffect(() => {
    const want = pending.current;
    if (!want) return;
    pending.current = null;
    if (!want.id) {
      addButton.current?.focus();
      return;
    }
    const row = rows.current.get(want.id);
    row
      ?.querySelector<HTMLElement>(want.target === "menu" ? "[data-row-menu]" : FIRST_FIELD)
      ?.focus();
  });

  const register = useCallback((id: string, element: HTMLElement | null) => {
    if (element) rows.current.set(id, element);
    else rows.current.delete(id);
  }, []);

  function commit(order: number[], added?: { id: string; item: T }) {
    setIds(order.map((old) => (old === -1 ? added!.id : ids[old]!)));
    if (path) errors?.reorder?.(path, order);
    onChange(order.map((old) => (old === -1 ? added!.item : items[old]!)));
  }
  const indexes = () => items.map((_, i) => i);

  function add(item: T) {
    const id = newRowId();
    pending.current = { id, target: "field" };
    commit(addAt === "start" ? [-1, ...indexes()] : [...indexes(), -1], { id, item });
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const order = indexes();
    order.splice(to, 0, ...order.splice(from, 1));
    commit(order);
  }
  function remove(index: number) {
    pending.current = { id: ids[index + 1] ?? ids[index - 1] ?? null, target: "menu" };
    commit(indexes().filter((i) => i !== index));
  }
  const update =
    (index: number): Update<T> =>
    (patch) =>
      onChange(items.map((item, j) => (j === index ? { ...item, ...patch } : item)));
  const focus = (index: number) => {
    const id = ids[index];
    (id ? rows.current.get(id) : undefined)?.querySelector<HTMLElement>(FIRST_FIELD)?.focus();
  };

  const names = items.map(itemLabel);
  const addControl =
    !adder && items.length < max ? (
      <Button
        ref={addButton}
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => add(newItem())}
      >
        <Plus aria-hidden /> {addLabel}
      </Button>
    ) : null;

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className={cn("mb-2 text-sm font-medium text-fg", !showLabel && "sr-only")}>
        {label}
      </legend>
      {adder?.({ add, focus })}
      {addAt === "start" && addControl}
      {items.length > 0 && (
        <SortableArea ids={ids} names={names} onMove={move}>
          <ul className="flex flex-col gap-3">
            {items.map((item, i) => (
              <SortableRow
                key={ids[i]}
                id={ids[i]!}
                name={names[i]!}
                off={off?.(item) ?? false}
                register={register}
                actions={rowActions?.(item, update(i), i)}
                menu={
                  <RowMenu
                    name={names[i]!}
                    first={i === 0}
                    last={i === items.length - 1}
                    onMove={(by) => {
                      pending.current = { id: ids[i]!, target: "menu" };
                      move(i, i + by);
                    }}
                    onRemove={() => remove(i)}
                  />
                }
              >
                {render(item, update(i), i)}
              </SortableRow>
            ))}
          </ul>
        </SortableArea>
      )}
      {addAt === "end" && addControl}
    </fieldset>
  );
}

function SortableRow({
  id,
  name,
  off,
  register,
  actions,
  menu,
  children,
}: {
  id: string;
  name: string;
  off: boolean;
  register: (id: string, element: HTMLElement | null) => void;
  actions: ReactNode;
  menu: ReactNode;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const ref = useCallback(
    (element: HTMLLIElement | null) => {
      setNodeRef(element);
      register(id, element);
    },
    [setNodeRef, register, id],
  );
  return (
    <li
      ref={ref}
      style={{
        transform: transform
          ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
          : undefined,
        transition,
      }}
      className={cn(
        "flex gap-2 rounded-control border border-border bg-surface p-3",
        off && "border-dashed bg-surface-2",
        isDragging && "relative z-10 shadow-pop",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${name}`}
        className="-my-1 -ml-1 flex w-8 shrink-0 cursor-grab touch-none justify-center rounded-control pt-2.5 text-fg-muted hover:text-fg focus-ring active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-5" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {children}
        {off && <p className="text-[13px] text-fg-muted">Hidden from your page</p>}
      </div>
      <div className="flex shrink-0 items-start gap-1">
        {actions}
        {menu}
      </div>
    </li>
  );
}
```

- [ ] **Step 10: Run the `SortableList` tests**

Run: `npx vitest run features/pages/editor/sortable`
Expected: PASS (8 tests). If `toHaveFocus` fails after Add, check that `onChange` re-renders the list in the same event (the harness's `setItems`) — the layout effect runs on that render.

- [ ] **Step 11: Write the failing form tests**

Append to `features/pages/editor/PageEditor.test.tsx` (add `within` and `useState` imports, plus `userEvent`, `validatePage` from `@/lib/pages/validate`, and `type LinksPage, type MenuPage` from `@/lib/pages/types`):

```tsx
function LinksForm({ initial }: { initial: LinksPage }) {
  const [page, setPage] = useState(initial);
  return (
    <PageEditor type="links" page={page} errors={validatePage("links", page)} onChange={setPage} />
  );
}

describe("PageEditor lists", () => {
  const links = (rows: { label: string; url: string }[]): LinksPage => ({
    ...PAGE_DEFAULTS.links(),
    title: "Me",
    links: rows.map((row) => ({ ...row, on: true })),
  });

  it("keeps an error on its row when the row moves", async () => {
    const user = userEvent.setup();
    render(<LinksForm initial={links([{ label: "A", url: "a.com" }, { label: "B", url: "" }])} />);
    await user.click(screen.getAllByLabelText("Link")[1]!);
    await user.tab();
    const message = "Add the link for “B”";
    expect(screen.getByText(message)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Actions for link “B”" }));
    await user.click(screen.getByRole("menuitem", { name: "Move up" }));
    const row = screen.getByText(message).closest("li")!;
    expect(within(row).getByLabelText("Button text")).toHaveValue("B");
  });

  it("switches a link off and back on", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PageEditor
        type="links"
        page={links([{ label: "Shop", url: "shop.com" }])}
        errors={{}}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("switch", { name: "Show link “Shop” on the page" }));
    expect(onChange.mock.lastCall![0].links[0].on).toBe(false);
  });

  it("moves a menu section with its dishes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const dish = (name: string) => ({ name, description: "", price: "", tags: "" });
    const menu: MenuPage = {
      ...PAGE_DEFAULTS.menu(),
      name: "Diner",
      sections: [
        { name: "Starters", items: [dish("Soup")] },
        { name: "Mains", items: [dish("Pie"), dish("Fish")] },
      ],
    };
    render(<PageEditor type="menu" page={menu} errors={{}} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Actions for section “Mains”" }));
    await user.click(screen.getByRole("menuitem", { name: "Move up" }));
    const next = onChange.mock.lastCall![0] as MenuPage;
    expect(next.sections.map((s) => [s.name, s.items.map((d) => d.name)])).toEqual([
      ["Mains", ["Pie", "Fish"]],
      ["Starters", ["Soup"]],
    ]);
  });
});
```

- [ ] **Step 12: Run them to make sure they fail**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx`
Expected: FAIL — there's no "Actions for link “B”" button or "Show link “Shop” on the page" switch yet.

- [ ] **Step 13: Move every list onto `SortableList`**

`features/pages/editor/fields.tsx`:
1. Extend the interface:

```ts
/** Shows a field's error once it has been left (or after a save attempt). */
export interface ErrorsApi {
  error: (path: string) => string | undefined;
  touch: (path: string) => void;
  /** A list under `prefix` changed order: `order[newIndex]` is each row's old index (-1: new). */
  reorder?: (prefix: string, order: number[]) => void;
}
```

2. Delete `ListField` and `ListFieldProps` (keep `move`: `ImagesField` uses it until Task 4). Remove imports that become unused (`ArrowDown`).
3. Add the switch and a row-name helper, and rewrite `LinksField` and `SocialsField`:

```tsx
/** How a row is named in its controls: link “Shop”, or link 2 while it has no text. */
export const rowName = (kind: string, text: string, index: number) =>
  text.trim() ? `${kind} “${text.trim()}”` : `${kind} ${index + 1}`;

/** Shows or hides one link or button on the page; off keeps it in the editor. */
export function ShowSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="group relative mt-1.5 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-field-border bg-surface-2 transition-colors data-checked:border-primary data-checked:bg-primary data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
    >
      <span
        aria-hidden
        className="ml-0.5 size-5.5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform group-data-checked:translate-x-5"
      />
    </Switch>
  );
}

export function LinksField({
  label = "Links",
  items,
  onChange,
  max,
  errors,
  prefix = "links",
  itemName = "link",
}: {
  label?: string;
  items: LinkItem[];
  onChange: (items: LinkItem[]) => void;
  max: number;
  errors: ErrorsApi;
  prefix?: string;
  /** "link", or "button" on a Business page. */
  itemName?: string;
}) {
  const name = (item: LinkItem, i: number) => rowName(itemName, item.label, i);
  return (
    <SortableList
      label={label}
      items={items}
      onChange={onChange}
      max={max}
      addLabel={`Add ${itemName}`}
      path={prefix}
      errors={errors}
      itemLabel={name}
      newItem={() => ({ label: "", url: "", on: true })}
      off={(item) => !item.on}
      rowActions={(item, update, i) => (
        <ShowSwitch
          checked={item.on}
          onChange={(on) => update({ on })}
          label={`Show ${name(item, i)} on the page`}
        />
      )}
      render={(item, update, i) => (
        <>
          <TextField
            label="Button text"
            value={item.label}
            onChange={(labelText) => update({ label: labelText })}
            placeholder="My website"
            maxLength={80}
          />
          <TextField
            label="Link"
            type="url"
            inputMode="url"
            value={item.url}
            onChange={(url) => update({ url })}
            path={`${prefix}.${i}.url`}
            errors={errors}
            placeholder="example.com"
            maxLength={2048}
          />
        </>
      )}
    />
  );
}
```

`SocialsField` keeps today's network select and address for now (Task 3 replaces how rows are added); only the list changes:

```tsx
    <SortableList
      label="Social profiles"
      items={items}
      onChange={onChange}
      max={max}
      addLabel="Add profile"
      addAt="end"
      path="socials"
      errors={errors}
      itemLabel={(item) => socialLabel(item.network)}
      newItem={(): SocialItem => ({ network: "instagram", url: "" })}
      render={/* today's render, unchanged */}
    />
```

Imports: `Switch` from `@headlessui/react`, `SortableList` from `./sortable/SortableList`.

`features/pages/editor/PageEditor.tsx`: implement `reorder` and pass it in `errorsApi`:

```tsx
  const reorder = useCallback(
    (prefix: string, order: number[]) =>
      setTouched((current) => remapTouched(current, prefix, order)),
    [],
  );
  const errorsApi = useMemo<ErrorsApi>(
    () => ({
      error: (path) => (reveal || touched.has(path) ? errors[path] : undefined),
      touch,
      reorder,
    }),
    [errors, touched, touch, reorder, reveal],
  );
```

(import `remapTouched` from `./touched`).

`features/pages/editor/editors/BusinessEditor.tsx`: `<LinksField label="Buttons" prefix="buttons" itemName="button" … />`.

`features/pages/editor/editors/VcardEditor.tsx`: replace both `ListField`s with `SortableList`, keeping each `render`:

```tsx
      <SortableList
        label="Phone numbers"
        items={page.phones}
        onChange={(phones) => set({ phones })}
        max={LIMITS.phones}
        addLabel="Add phone"
        addAt="end"
        path="phones"
        errors={errors}
        itemLabel={(item, i) => rowName("phone", item.number, i)}
        newItem={() => ({ label: "Mobile", number: "" })}
        render={/* today's phone render */}
      />
      <SortableList
        label="Email addresses"
        items={page.emails}
        onChange={(emails) => set({ emails })}
        max={LIMITS.emails}
        addLabel="Add email"
        addAt="end"
        path="emails"
        errors={errors}
        itemLabel={(item, i) => rowName("email", item.address, i)}
        newItem={() => ({ label: "Work", address: "" })}
        render={/* today's email render */}
      />
```

`features/pages/editor/editors/MenuEditor.tsx`: the same for sections and dishes:

```tsx
      <SortableList
        label="Sections"
        items={page.sections}
        onChange={(sections) => set({ sections })}
        max={LIMITS.sections}
        addLabel="Add section"
        addAt="end"
        path="sections"
        errors={errors}
        itemLabel={(section, s) => rowName("section", section.name, s)}
        newItem={() => ({ name: "", items: [{ name: "", description: "", price: "", tags: "" }] })}
        render={(section, update, s) => (
          <>
            {/* Section name TextField unchanged */}
            <SortableList
              label="Dishes and drinks"
              items={section.items}
              onChange={(items) => update({ items })}
              max={LIMITS.items}
              addLabel="Add item"
              addAt="end"
              path={`sections.${s}.items`}
              errors={errors}
              itemLabel={(item, i) => rowName("item", item.name, i)}
              newItem={() => ({ name: "", description: "", price: "", tags: "" })}
              render={/* today's dish render */}
            />
          </>
        )}
      />
```

- [ ] **Step 14: Run the unit tests**

Run: `npx vitest run features/pages features/generator features/create`
Expected: PASS. Fix any test that clicked the old "Move link 1 up" style buttons to use the ⋯ menu.

- [ ] **Step 15: Write the drag e2e**

Append inside `test.describe("creating codes", …)` in `e2e/accounts/create.spec.ts`:

```ts
  test("drags links into order by keyboard and by mouse, and Escape puts one back", async ({
    page,
  }) => {
    await page.goto("codes/new?type=links");
    const addLink = page.getByRole("button", { name: "Add link" });
    while ((await page.getByLabel("Button text").count()) < 3) await addLink.click();
    for (const [i, name] of ["A", "B", "C"].entries()) {
      await page.getByLabel("Button text").nth(i).fill(name);
      await page.getByLabel("Link", { exact: true }).nth(i).fill(`${name.toLowerCase()}.example.com`);
    }
    const order = () =>
      page
        .getByLabel("Button text")
        .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
    expect(await order()).toEqual(["A", "B", "C"]);

    // Keyboard: focus the handle, Space, arrow keys, Space.
    await page.getByRole("button", { name: "Drag link “A”" }).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect.poll(order).toEqual(["B", "C", "A"]);

    // Escape cancels a move.
    await page.getByRole("button", { name: "Drag link “C”" }).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Escape");
    await expect.poll(order).toEqual(["B", "C", "A"]);

    // Mouse: drag A's handle onto B.
    const from = (await page.getByRole("button", { name: "Drag link “A”" }).boundingBox())!;
    const to = (await page.getByRole("button", { name: "Drag link “B”" }).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + 4, { steps: 12 });
    await page.mouse.up();
    await expect.poll(order).toEqual(["A", "B", "C"]);

    // The preview follows.
    const links = page
      .getByRole("complementary", { name: "Preview" })
      .getByRole("navigation", { name: "Links" });
    await expect(links.getByText(/^[ABC]$/)).toHaveText(["A", "B", "C"]);
  });
```

- [ ] **Step 16: Run the e2e**

Run: `npm run test:e2e:accounts -- -g "drags links"`
Expected: PASS. (The first run rebuilds the app with the local database; later runs can add `--no-build`.)

- [ ] **Step 17: Commit**

```bash
git add package.json package-lock.json features/pages/editor e2e/accounts/create.spec.ts
git commit -m "Lists drag into order by mouse, touch or keyboard, with a ⋯ menu; Add puts links on top; links and buttons switch on and off"
```

---

### Task 3: Social icons from a grid

**Files:**
- Modify: `features/pages/editor/fields.tsx` (`SocialsField`)
- Create: `features/pages/editor/SocialsField.test.tsx`

**Interfaces:**
- Consumes: `SortableList` `adder` (Task 2), `SocialIcon` and `socialLabel` from `features/pages/parts.tsx`, `SOCIAL_NETWORKS`.
- Produces: icon buttons named `Add Instagram` or, once added, `Edit Instagram`; each row's address field is labelled with the network's name ("Instagram").

- [ ] **Step 1: Write the failing tests**

`features/pages/editor/SocialsField.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { SocialItem } from "@/lib/pages/types";

import { SocialsField, type ErrorsApi } from "./fields";

const errors: ErrorsApi = { error: () => undefined, touch: vi.fn(), reorder: vi.fn() };

function Harness({ initial, max = 16 }: { initial: SocialItem[]; max?: number }) {
  const [items, setItems] = useState(initial);
  return <SocialsField items={items} onChange={setItems} max={max} errors={errors} />;
}

describe("SocialsField", () => {
  it("adds a profile from its icon, with the cursor in its address", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[]} />);
    await user.click(screen.getByRole("button", { name: "Add Instagram" }));
    expect(screen.getByLabelText("Instagram")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Add TikTok" }));
    expect(screen.getByLabelText("TikTok")).toHaveFocus();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Edit Instagram" })).toBeInTheDocument();
  });

  it("goes to a network that's already there instead of adding it twice", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ network: "instagram", url: "@me" }]} />);
    await user.click(screen.getByRole("button", { name: "Edit Instagram" }));
    expect(screen.getByLabelText("Instagram")).toHaveFocus();
    expect(screen.getAllByLabelText("Instagram")).toHaveLength(1);
  });

  it("stops adding at the limit", () => {
    render(<Harness initial={[{ network: "instagram", url: "@me" }]} max={1} />);
    expect(screen.getByRole("button", { name: "Add TikTok" })).toBeDisabled();
    expect(screen.getByText("You can add up to 1 profile.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run features/pages/editor/SocialsField.test.tsx`
Expected: FAIL — no "Add Instagram" button.

- [ ] **Step 3: Rewrite `SocialsField`**

In `features/pages/editor/fields.tsx` (import `SocialIcon` and `socialLabel` from `../parts`; drop the `Select` import if nothing else uses it):

```tsx
/** Social profiles: pick a network's icon to add its address; drag to reorder. */
export function SocialsField({
  items,
  onChange,
  max,
  errors,
}: {
  items: SocialItem[];
  onChange: (items: SocialItem[]) => void;
  max: number;
  errors: ErrorsApi;
}) {
  return (
    <SortableList
      label="Social icons"
      items={items}
      onChange={onChange}
      max={max}
      addLabel="Add profile"
      addAt="end"
      path="socials"
      errors={errors}
      itemLabel={(item) => socialLabel(item.network)}
      newItem={(): SocialItem => ({ network: "instagram", url: "" })}
      adder={({ add, focus }) => (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
            {SOCIAL_NETWORKS.map((network) => {
              const at = items.findIndex((item) => item.network === network);
              const name = socialLabel(network);
              return (
                <button
                  key={network}
                  type="button"
                  title={name}
                  aria-label={at === -1 ? `Add ${name}` : `Edit ${name}`}
                  disabled={at === -1 && items.length >= max}
                  onClick={() => (at === -1 ? add({ network, url: "" }) : focus(at))}
                  className={cn(
                    "grid size-11 place-items-center rounded-control border focus-ring disabled:cursor-not-allowed disabled:opacity-40",
                    at === -1
                      ? "border-border text-fg hover:bg-surface-2"
                      : "border-primary bg-primary-soft text-primary-soft-fg",
                  )}
                >
                  <SocialIcon network={network} className="size-5" />
                </button>
              );
            })}
          </div>
          {items.length >= max && (
            <p className="text-sm text-fg-muted">
              You can add up to {max} {max === 1 ? "profile" : "profiles"}.
            </p>
          )}
        </div>
      )}
      render={(item, update, i) => (
        <div className="flex items-start gap-3">
          <SocialIcon network={item.network} className="mt-9 size-5 shrink-0 text-fg-muted" />
          <div className="min-w-0 flex-1">
            <TextField
              label={socialLabel(item.network)}
              value={item.url}
              onChange={(url) => update({ url })}
              path={`socials.${i}.url`}
              errors={errors}
              placeholder={item.network === "website" ? "example.com" : "Profile link or @handle"}
              maxLength={2048}
            />
          </div>
        </div>
      )}
    />
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run features/pages/editor`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/pages/editor/fields.tsx features/pages/editor/SocialsField.test.tsx
git commit -m "Social icons: pick a network from a grid of icons to add its address"
```

---

### Task 4: Images drag both ways, with a ⋯ menu, and Add images on top

**Files:**
- Modify: `features/pages/editor/fields.tsx` (`ImagesField`; delete `move`)
- Create: `features/pages/editor/ImagesField.test.tsx`

**Interfaces:**
- Consumes: `SortableArea` (grid), `RowMenu` (`layout="grid"`).
- Produces: tiles with `Drag image N` handles and `Actions for image N` menus (`Move earlier`, `Move later`, `Remove`).

- [ ] **Step 1: Write the failing tests**

`features/pages/editor/ImagesField.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { Media } from "@/lib/pages/types";

import { ImagesField } from "./fields";

const UID = "11111111-1111-4111-8111-111111111111";
const image = (name: string): Media => ({ path: `${UID}/${name}`, name, type: "image/png", size: 1 });

function Harness() {
  const [images, setImages] = useState([image("a.png"), image("b.png"), image("c.png")]);
  return (
    <>
      <ImagesField value={images} onChange={setImages} max={24} />
      <output>{images.map((m) => m.name).join(",")}</output>
    </>
  );
}

describe("ImagesField", () => {
  it("moves images earlier and later, and removes them, from each image's ⋯ menu", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Actions for image 2" }));
    await user.click(screen.getByRole("menuitem", { name: "Move earlier" }));
    expect(screen.getByRole("status")).toHaveTextContent("b.png,a.png,c.png");
    await user.click(screen.getByRole("button", { name: "Actions for image 1" }));
    await user.click(screen.getByRole("menuitem", { name: "Move later" }));
    expect(screen.getByRole("status")).toHaveTextContent("a.png,b.png,c.png");
    await user.click(screen.getByRole("button", { name: "Actions for image 3" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove" }));
    expect(screen.getByRole("status")).toHaveTextContent("a.png,b.png");
  });

  it("puts Add images before the images, with a drag handle on each", () => {
    render(<Harness />);
    const add = screen.getByText("Add images");
    const first = screen.getByRole("button", { name: "Drag image 1" });
    expect(add.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run features/pages/editor/ImagesField.test.tsx`
Expected: FAIL — no "Actions for image 2" button.

- [ ] **Step 3: Rewrite the image grid**

In `features/pages/editor/fields.tsx`: keep `pick` as it is, delete the `move` helper, and render (import `arrayMove`, `useSortable` from `@dnd-kit/sortable`, `GripVertical` from `lucide-react`, `SortableArea` and `RowMenu`):

```tsx
  const ids = value.map((media) => media.path);
  const names = value.map((_, i) => `image ${i + 1}`);
  const moveImage = (from: number, to: number) => {
    if (to >= 0 && to < value.length) onChange(arrayMove(value, from, to));
  };

  return (
    <div className="flex flex-col gap-3">
      {value.length < max && (
        <label /* today's Add images label, unchanged, now first */ />
      )}
      {value.length > 0 && (
        <SortableArea ids={ids} names={names} grid onMove={moveImage}>
          <ul aria-label="Images" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {value.map((media, i) => (
              <ImageTile key={media.path} id={media.path} name={names[i]!} src={mediaUrl(media.path)}>
                <RowMenu
                  layout="grid"
                  name={names[i]!}
                  first={i === 0}
                  last={i === value.length - 1}
                  onMove={(by) => moveImage(i, i + by)}
                  onRemove={() => onChange(value.filter((_, j) => j !== i))}
                />
              </ImageTile>
            ))}
          </ul>
        </SortableArea>
      )}
      {/* problem / error paragraph, unchanged */}
    </div>
  );
```

and the tile:

```tsx
function ImageTile({
  id,
  name,
  src,
  children,
}: {
  id: string;
  name: string;
  src: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
          : undefined,
        transition,
      }}
      className={cn("relative", isDragging && "z-10")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded file preview */}
      <img
        src={src}
        alt={name.replace(/^i/, "I")}
        className="aspect-square w-full rounded-lg object-cover"
      />
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${name}`}
        className="absolute top-1 left-1 grid size-9 cursor-grab touch-none place-items-center rounded-control bg-surface/90 text-fg shadow-sm focus-ring active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-4" />
      </button>
      <div className="absolute right-1 bottom-1 rounded-control bg-surface/90 shadow-sm">
        {children}
      </div>
    </li>
  );
}
```

Remove the field's own `<span>Images</span>` label: the card heading names it from Task 5 on, and the `<ul aria-label="Images">` names the grid now.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run features/pages/editor`
Expected: PASS. `npx tsc --noEmit` shows no unused-import errors (`IconButton`, `ArrowUp`, `ArrowDown` go if unused).

- [ ] **Step 5: Commit**

```bash
git add features/pages/editor/fields.tsx features/pages/editor/ImagesField.test.tsx
git commit -m "Images drag both ways, with Move earlier, Move later and Remove; Add images comes first"
```

---

### Task 5: Every page's form in cards: Header first, then its own parts

**Files:**
- Create: `features/pages/editor/FormCard.tsx`
- Modify: `components/ui/Field.tsx` (`hideLabel`)
- Modify: `features/pages/editor/fields.tsx` (`TextField`/`AreaField` `hideLabel`; `HoursField` legend `sr-only`; `LinksField`/`SocialsField` lists `showLabel={false}`)
- Modify: `features/pages/editor/PageEditor.tsx` (`cards`)
- Modify: all 12 `features/pages/editor/editors/*Editor.tsx`
- Modify: `features/generator/content/types.ts` (`pageCards`), `features/generator/content/HostedPageForm.tsx`
- Modify: `features/create/EditorLayout.tsx` (`pageCards: true`), `features/create/sections/ContentSection.tsx`
- Test: `features/pages/editor/PageEditor.test.tsx`, `features/generator/content/HostedPageForm.test.tsx`, `features/create/EditorLayout.test.tsx`

**Interfaces:**
- Consumes: `SortableList` (`showLabel`), `LinksField`, `SocialsField`, `ImagesField`.
- Produces: `FormCard({ title, note?, children })`, `FormCardStyle` context (`"card" | "section"`), `PageEditor` prop `cards?: boolean`, `ContentEditor.pageCards?: boolean`.

- [ ] **Step 1: Write the failing tests**

Append to `features/pages/editor/PageEditor.test.tsx`:

```tsx
/** The spec's cards for each type, in order (5.4). */
const CARDS: Record<PageTypeId, string[]> = {
  links: ["Header", "Links", "Social icons"],
  vcard: ["Header", "About", "Phone numbers", "Email addresses", "Website and address", "Social icons"],
  business: ["Header", "Contact", "About", "Opening hours", "Buttons", "Social icons"],
  menu: ["Header", "Sections and dishes", "Currency and note"],
  coupon: ["Header", "Offer", "Button", "Terms"],
  event: ["Header", "When", "Where", "Details", "Tickets"],
  feedback: ["Header", "Question", "After sending"],
  pdf: ["File", "Details", "Opening"],
  images: ["Details", "Images"],
  video: ["Video", "Details"],
  audio: ["Audio", "Header", "Details"],
  app: ["Header", "Store links", "Website"],
};

describe("PageEditor cards", () => {
  it.each(PAGE_TYPE_IDS)("%s: its cards come in the spec's order", (type) => {
    render(
      <PageEditor type={type} page={PAGE_DEFAULTS[type]()} errors={{}} onChange={vi.fn()} cards />,
    );
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(CARDS[type]);
  });

  it("draws the parts as sections inside the home page's form", () => {
    render(<PageEditor type="links" page={PAGE_DEFAULTS.links()} errors={{}} onChange={vi.fn()} />);
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(CARDS.links);
  });
});
```

Append to `features/generator/content/HostedPageForm.test.tsx`:

```tsx
  it("shows the page's parts as cards in the editor", () => {
    render(<HostedPageForm generator={editor({ pageCards: true })} type="links" />);
    expect(screen.getByRole("heading", { level: 2, name: "Header" })).toBeInTheDocument();
  });
```

In `features/create/EditorLayout.test.tsx`, next to the existing `seen.editor?.workspace` assertion:

```ts
    expect(seen.editor?.pageCards).toBe(true);
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx features/generator/content/HostedPageForm.test.tsx features/create/EditorLayout.test.tsx`
Expected: FAIL — no `cards` prop, no headings, `pageCards` undefined.

- [ ] **Step 3: Write `FormCard`, `hideLabel` and the flags**

`features/pages/editor/FormCard.tsx`:

```tsx
"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

import { Card, CardHeader } from "@/components/ui/Card";

/**
 * How the parts of a page's form are drawn: "card", each its own card (the Create editor's
 * Content tab); "section", titled sections inside the form's own card (the home page).
 */
export const FormCardStyle = createContext<"card" | "section">("section");

/** One titled part of a hosted page's form, e.g. Header or Links. */
export function FormCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  const id = useId();
  const style = useContext(FormCardStyle);
  if (style === "card") {
    return (
      <Card aria-labelledby={id}>
        <CardHeader id={id} title={title} description={note} />
        <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">{children}</div>
      </Card>
    );
  }
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-5 border-t border-border pt-5 first:border-t-0 first:pt-0"
    >
      <div>
        <h3 id={id} className="font-display text-base font-bold text-fg">
          {title}
        </h3>
        {note && <p className="mt-0.5 text-sm text-fg-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}
```

`components/ui/Field.tsx`: add `hideLabel?: boolean` ("The card's heading already says it; screen readers still hear the label.") and put `hideLabel && "sr-only"` on the label row: `<div className={cn("flex items-center gap-1.5", hideLabel && "sr-only")}>`.

`features/pages/editor/fields.tsx`: `TextField` and `AreaField` take `hideLabel?: boolean` and pass it to `Field`. `HoursField`'s legend gets `className="sr-only"`. `LinksField` and `SocialsField` pass `showLabel={false}` to `SortableList`.

`features/pages/editor/PageEditor.tsx`: a `cards?: boolean` prop ("Each part of the form is its own card (the Create editor)."), and

```tsx
  return (
    <FormCardStyle value={cards ? "card" : "section"}>
      <div className={cards ? "flex flex-col gap-6" : "flex flex-col gap-5"}>{body}</div>
    </FormCardStyle>
  );
```

`features/generator/content/types.ts`:

```ts
  /** Each part of a hosted page's form is its own card (the Create editor's Content tab). */
  pageCards?: boolean;
```

`HostedPageForm.tsx`: `<PageEditor … cards={generator.pageCards ?? false} />`. `EditorLayout.tsx`: `pageCards: true,` next to `pageColorInLook: true`.

`features/create/sections/ContentSection.tsx`: hosted pages drop the outer Content card; a contact page keeps its "How should it work?" choice in a card of its own:

```tsx
export function ContentSection({ editor, onTypeChange, typeLocked = false }: { … }) {
  const type = editor.state.activeType;
  const kindPicker =
    isContactType(type) && !typeLocked ? (
      <RadioGroup /* unchanged */ >…</RadioGroup>
    ) : null;
  if (isPageType(type)) {
    // A hosted page's form is a stack of cards: Header, then the page's own parts.
    return (
      <div className="flex flex-col gap-6">
        {kindPicker && (
          <Card aria-labelledby="content-heading">
            <CardHeader id="content-heading" title="Contact" description="How should it work?" />
            <div className="px-5 pt-4 pb-6 sm:px-6">{kindPicker}</div>
          </Card>
        )}
        <ContentForm generator={editor} />
      </div>
    );
  }
  return (
    <Card aria-labelledby="content-heading">
      <CardHeader id="content-heading" title="Content" description={typeDescription(type)} />
      <div className="flex flex-col gap-6 px-5 pt-4 pb-6 sm:px-6">
        {kindPicker}
        <ContentForm generator={editor} />
      </div>
    </Card>
  );
}
```

(import `isPageType` from `@/lib/qr/types`).

- [ ] **Step 4: Put each editor's fields into its cards**

Every field keeps its label, path, placeholder and limits; only the grouping and order change. Each editor imports `FormCard` from `../FormCard`.

`LinksEditor.tsx`:

```tsx
    <>
      <FormCard title="Header" note="At the top of your page">
        {/* Profile picture, Title, Bio */}
      </FormCard>
      <FormCard title="Links">
        {/* LinksField, and the "links.0.url" message when there are no links */}
      </FormCard>
      <FormCard title="Social icons">{/* SocialsField */}</FormCard>
    </>
```

`VcardEditor.tsx`: **Header** (Photo; the First name / Last name / Job title / Company grid) · **About** (`<AreaField label="About" hideLabel …>`) · **Phone numbers** (its `SortableList`, `showLabel={false}`) · **Email addresses** (`showLabel={false}`) · **Website and address** (Website, Address) · **Social icons**.

`BusinessEditor.tsx`: **Header** (the Logo / Cover photo grid, Business name, Tagline) · **Contact** (the Phone / Email / Website / Address grid) · **About** (`<AreaField label="About" hideLabel …>`) · **Opening hours** (Show opening hours toggle, then `HoursField` when on) · **Buttons** (`LinksField label="Buttons" prefix="buttons" itemName="button"`) · **Social icons**.

`MenuEditor.tsx`: **Header** (Logo, Restaurant name, Description) · **Sections and dishes** (the sections `SortableList` with `showLabel={false}`; the dishes list keeps its visible "Dishes and drinks" label) · **Currency and note** (Currency as its own `max-w-32` field, then Note).

`CouponEditor.tsx`: **Header** (Image, Business) · **Offer** (the Offer / Coupon code grid, Headline, Description, Valid until) · **Button** (the Button text / Button link grid) · **Terms** (Terms and conditions).

`EventEditor.tsx`: **Header** (Image, Event name, Organizer) · **When** (All-day event, the Starts / Ends grid, Time zone) · **Where** (Location) · **Details** (Description) · **Tickets** (the Ticket button text / Ticket link grid).

`FeedbackEditor.tsx`: **Header** (Logo, Business name) · **Question** (Question, Ask for a comment, Ask for contact details) · **After sending** (Thank-you message, then the "Responses appear…" note).

`PdfEditor.tsx`: **File** (PDF) · **Details** (Title, Description) · **Opening** (Open the PDF straight away).

`ImagesEditor.tsx`: **Details** (Title, Description) · **Images** (ImagesField).

`VideoEditor.tsx`: **Video** (Video source control, then the link or the upload) · **Details** (Title, Description).

`AudioEditor.tsx`: **Audio** (Audio file, Or a link) · **Header** (Cover art, the Title / Artist grid) · **Details** (Description).

`AppEditor.tsx`: **Header** (App icon, App name, Description) · **Store links** (App Store link, Google Play link, then the "iPhones go straight…" note) · **Website** (`<TextField label="Website" hideLabel …>` with its hint).

- [ ] **Step 5: Run the tests**

Run: `npx vitest run features/pages features/generator features/create`
Expected: PASS, including the existing "shows all of its fields" and "editing a field changes only that field" tests (labels and first textboxes are unchanged per type).

- [ ] **Step 6: Commit**

```bash
git add components/ui/Field.tsx features/pages/editor features/generator/content features/create
git commit -m "Each hosted page's form in cards: Header first, then the page's own parts, then Social icons"
```

---

### Task 6: Making pages from the gallery, end to end

**Files:**
- Modify: `e2e/accounts/create.spec.ts`
- Modify: `e2e/accounts/app.spec.ts` (`PAGES`)

**Interfaces:**
- Consumes: everything above; the gallery tiles are links named by type ("Link list…", "Business…", "Event…").

- [ ] **Step 1: Write the e2e tests**

Add to `PAGES` in `e2e/accounts/app.spec.ts`, after `"codes/new?type=links"`:

```ts
  "codes/new?type=vcard",
  "codes/new?type=business",
  "codes/new?type=menu",
  "codes/new?type=event",
```

Append inside `test.describe("creating codes", …)` in `e2e/accounts/create.spec.ts`:

```ts
  /** From the code page, the address of its live page. */
  async function livePage(page: Page) {
    await expect(page).toHaveURL(/\/codes\/[0-9a-f-]+#download$/);
    return (await page.getByRole("link", { name: /View page/ }).getAttribute("href"))!;
  }

  test("makes a Link list from the gallery; a link switched off stays off the page", async ({
    page,
  }) => {
    await page.goto("codes/new");
    await page.getByRole("link", { name: /^Link list/ }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Header" })).toBeVisible();
    await page.getByLabel("Title").fill("Gallery links");
    await page.getByLabel("Button text").first().fill("Old offer");
    await page.getByLabel("Link", { exact: true }).first().fill("example.com/old");
    await page.getByRole("button", { name: "Add link" }).click();
    // The new link goes on top, with the cursor in it.
    await expect(page.getByLabel("Button text").first()).toBeFocused();
    await page.keyboard.type("Shop");
    await page.getByLabel("Link", { exact: true }).first().fill("example.com/shop");
    await page.getByRole("switch", { name: "Show link “Old offer” on the page" }).click();
    await expect(page.getByText("Hidden from your page")).toBeVisible();
    await page.getByLabel("Code name").fill("Gallery links");
    await createButton(page).click();

    await page.goto(await livePage(page));
    await expect(page.getByRole("link", { name: "Shop" })).toBeVisible();
    await expect(page.getByText("Old offer")).toHaveCount(0);
  });

  test("makes a Business page from the gallery on a phone, with a button switched off", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("codes/new");
    await page.getByRole("link", { name: /^Business/ }).click();
    await page.getByLabel("Business name").fill("Corner Cafe");
    await page.getByRole("button", { name: "Add button" }).click();
    await page.keyboard.type("Order");
    await page.getByLabel("Link", { exact: true }).first().fill("example.com/order");
    await page.getByRole("button", { name: "Add button" }).click();
    await page.keyboard.type("Catering");
    await page.getByLabel("Link", { exact: true }).first().fill("example.com/catering");
    await page.getByRole("switch", { name: "Show button “Catering” on the page" }).click();
    await page.locator('[data-actionbar="create"]').getByRole("button", { name: "Create" }).click();

    await page.goto(await livePage(page));
    await expect(page.getByRole("link", { name: "Order" })).toBeVisible();
    await expect(page.getByText("Catering")).toHaveCount(0);
  });

  test("makes an Event from the gallery, card by card", async ({ page }) => {
    await page.goto("codes/new");
    await page.getByRole("link", { name: /^Event/ }).click();
    for (const name of ["Header", "When", "Where", "Details", "Tickets"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await page.getByLabel("Event name").fill("Spring fair");
    await page.getByLabel("Starts").fill(localDateTime(10));
    await page.getByLabel("Location").fill("Town hall");
    await page.getByLabel("Code name").fill("Spring fair");
    await createButton(page).click();

    await page.goto(await livePage(page));
    await expect(page.getByRole("heading", { level: 1, name: "Spring fair" })).toBeVisible();
    await expect(page.getByText("Town hall")).toBeVisible();
  });
```

- [ ] **Step 2: Run the new e2e**

Run: `npm run test:e2e:accounts -- -g "from the gallery|type=vcard|type=business|type=menu|type=event"`
Expected: PASS, including axe at 390, 820 and 1280px for the four new editor paths. If axe flags the dashed off row or the icon grid, fix the markup (not the test).

- [ ] **Step 3: Run every suite**

Run, in order:
- `npm run lint && npx tsc --noEmit && npx prettier --check .` (the git-ignored `.superpowers/` is the only allowed noise)
- `npm test`
- `npm run test:e2e:accounts -- --no-build`
- `npm run build && npm run test:e2e`

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add e2e/accounts/create.spec.ts e2e/accounts/app.spec.ts
git commit -m "Browser tests: Link list, Business (on a phone) and Event from the gallery; axe on four more editors"
```
