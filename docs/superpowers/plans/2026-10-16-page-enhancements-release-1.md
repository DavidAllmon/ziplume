# Page enhancements, Release 1: fixes and every page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release 1 does five things:
- Video pages take links only.
- Every text box shows its limit and never cuts text silently.
- Descriptions get room for 1,000 characters.
- PDF and audio files are capped.
- Web addresses in page text become links, and every hosted page gets a Share button.

**Architecture:**
- **Limits:** `lib/pages/sanitize.ts`'s schemas already hold every text limit. This release makes them the only source:
  - `limitAt(type, path)` feeds each field's counter through a context;
  - `overLimit(type, page)` turns long text into validation errors, so Create and Save block with Show me;
  - the editor's reducer keeps long text (`keepLongText`) instead of trimming it.
- **Video:** upload support is removed end to end: types, schema, editor, view, upload kinds and the storage bucket.
- **Share button:** a small client `ShareButton` in the shared `PageFrame`.
- **Clickable links:** a `linkify` helper used by `Prose` and the header's subtitle.

**Tech Stack:**
- Next.js 16 App Router and React 19.
- Tailwind 4.
- Supabase storage, set up by a migration on `storage.buckets`.
- Vitest with jsdom, and PGlite for the database.
- Playwright: the signed-in suite.

**Spec:** `docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md`. This release covers section 4 (items 1, 2, 3, 4, 54 and 55), plus the shared rules in section 3 and the Release 1 row of section 9.

## Global Constraints

- **Counter wording:**
  - The counter reads like "245 / 1,000", with thousands separators.
  - Boxes of several lines show it always.
  - One-line boxes show it within 20 characters of the limit.
  - Over the limit, the error reads "Shorten by 120 characters" ("Shorten by 1 character" for one).
- **Never cut silently:**
  - No native `maxLength` on page text boxes.
  - Text over the limit stays in the box.
  - Create and Save are blocked with Show me.
  - `sanitizePage` still trims, for stored pages and the API.
- **Limits:**
  - Every box of several lines allows at least 1,000 characters, except the Link list bio (300) and a dish description (300).
  - The Business About, Event description and Coupon terms stay at 2,000.
- **Video:** links only, for YouTube (Shorts included) and Vimeo. A saved `source: "upload"` page becomes a link page with no file.
- **Caps:** PDFs up to 10 MB, audio up to 15 MB, images up to 15 MB before resizing. The messages are:
  - "PDFs can be up to 10 MB."
  - "Audio files can be up to 15 MB."
  - "Images can be up to 15 MB."
- **Storage bucket:** `page-media` has `file_size_limit` 15728640 and no video types. Files already stored keep working.
- **Clickable links:**
  - `https://…`, `http://…`, `www.…` and email addresses become links.
  - They use `target="_blank"` and `rel="noopener noreferrer nofollow ugc"`.
  - Only http(s) and mailto links are allowed.
- **Share button:**
  - It's labeled "Share this page" and sits in the page's top corner.
  - It uses `navigator.share` when there is one; otherwise it copies the link and says "Link copied".
  - It's inert in previews.
- **Every task** keeps the editor's rules: visible labels, 44 px targets on phones, no sideways scroll from 320 px, and axe clean in light and dark.
- **The migration:**
  - First check the disk has room and there's a verified backup from the last 24 hours.
  - No backslashes.
  - Apply it through the bridge with project `db12f7ce-3e77-4461-a686-c8cd6de6f764` before merging.
  - Record it in `~/.codex/memories/supabase-coolify.md`.

## Rulings made in this plan (for David's review)

1. **Code names and the static code forms keep their limits.** The counters and the 1,000-character room apply to hosted pages, which is where text was cut. Wi-Fi, Text and the other static types are bounded by what fits in a QR code.
2. **Characters are counted the way the browser counts them.** An emoji can count as 2.
3. **The editor holds at most 20,000 characters per box,** as a guard against an accidental huge paste. Anything under that stays and shows the "Shorten by" error.
4. **A page's subtitle keeps its line breaks.** The subtitle under the title is the Menu, PDF, Images and App description and the Link list bio. Its links are clickable too.

## Review Focus

1. **Pasting text far over a limit,** say 5,000 characters into a 1,000 box. The text stays and the error shows at once. Create is blocked and Show me lands on that box. *Task 2 test.*
2. **Every text box in every page editor has a limit** from the schema, with no path that resolves to nothing, including list rows like `sections.0.items.0.name`. *Task 2 test.*
3. **The "Sample: Video" page** (`source: "upload"`, no link) opens with the link box and a "Paste a YouTube or Vimeo link" error. Its public page shows the placeholder, not a broken player. *Task 3 test.*
4. **Links inside text:**
   - Trailing punctuation stays out of the link ("example.com.", "(https://x.com)").
   - Emails become mailto links.
   - `javascript:` never becomes a link.

   *Task 5 test.*
5. **Share on a browser without the share sheet** copies the link. If copying is blocked, it says where to find the link instead of failing silently. *Task 5 test.*

---

### Task 1: One source for text limits, with room to write

**Files:**
- Modify:
  - `lib/pages/types.ts` (`LIMITS.text`, `LIMITS.paste`)
  - `lib/pages/sanitize.ts` (limits; `keepLongText`; `limitAt`; `overLimit`; `shortenBy`)
  - `lib/pages/validate.ts` (merge `overLimit`)
  - `features/generator/state/reducer.ts` (the editor keeps long text)
  - `features/create/draft.ts` (drafts keep long text)
- Test:
  - Create `lib/pages/limits.test.ts`.
  - Modify `features/generator/state/reducer.test.ts`.

**Interfaces:**
- Produces:
  - `LIMITS.text = 1000` and `LIMITS.paste = 20000`.
  - `sanitizePage(type, raw, { missingLook?, keepLongText? })`.
  - `limitAt(type: PageTypeId, path: string): number | null`.
  - `overLimit<K extends PageTypeId>(type: K, page: PageContentMap[K]): Record<string, string>`.
  - `shortenBy(n: number): string`.
  - `validatePage` includes over-limit errors after the type's own errors.

- [ ] **Step 1: Create the branch.** The spec commit is already on `feat/page-enhancements-r1`. Commit this plan there:

```bash
git checkout feat/page-enhancements-r1
git add docs/superpowers/plans/2026-10-16-page-enhancements-release-1.md
git commit -m "Plan: page enhancements release 1"
```

- [ ] **Step 2: Write the failing tests.** Create `lib/pages/limits.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { limitAt, overLimit, sanitizePage, shortenBy } from "./sanitize";
import { LIMITS, PAGE_DEFAULTS } from "./types";
import { validatePage } from "./validate";

const long = (n: number) => "x".repeat(n);

describe("text limits", () => {
  it("finds a field's limit by its path, in lists too", () => {
    expect(limitAt("video", "description")).toBe(1000);
    expect(limitAt("links", "bio")).toBe(300);
    expect(limitAt("links", "links.3.label")).toBe(80);
    expect(limitAt("menu", "sections.0.items.2.description")).toBe(300);
    expect(limitAt("business", "about")).toBe(2000);
    expect(limitAt("video", "nope")).toBeNull();
    expect(limitAt("links", "links.label")).toBeNull();
    expect(limitAt("links", "avatar")).toBeNull();
  });

  it("gives descriptions room for 1,000 characters, and keeps short ones short", () => {
    for (const [type, path] of [
      ["video", "description"],
      ["pdf", "description"],
      ["images", "description"],
      ["audio", "description"],
      ["app", "description"],
      ["menu", "description"],
      ["menu", "note"],
      ["coupon", "description"],
      ["vcard", "bio"],
      ["feedback", "thanks"],
    ] as const) {
      expect(limitAt(type, path), `${type}.${path}`).toBe(LIMITS.text);
    }
    expect(limitAt("event", "description")).toBe(2000);
    expect(limitAt("coupon", "terms")).toBe(2000);
  });

  it("says how much to shorten", () => {
    expect(shortenBy(1)).toBe("Shorten by 1 character");
    expect(shortenBy(1200)).toBe("Shorten by 1,200 characters");
  });

  it("names every field over its limit, nested ones included", () => {
    const menu = PAGE_DEFAULTS.menu();
    menu.description = long(1005);
    menu.sections = [
      {
        name: "Mains",
        items: [{ name: "Pie", description: long(301), price: "9", tags: "" }],
      },
    ];
    expect(overLimit("menu", menu)).toEqual({
      description: "Shorten by 5 characters",
      "sections.0.items.0.description": "Shorten by 1 character",
    });
  });

  it("keeps long text in the editor, and trims it everywhere else", () => {
    const raw = { ...PAGE_DEFAULTS.video(), description: long(1500) };
    expect(sanitizePage("video", raw).description).toHaveLength(1000);
    expect(sanitizePage("video", raw, { keepLongText: true }).description).toHaveLength(1500);
    const huge = { ...raw, description: long(25000) };
    expect(sanitizePage("video", huge, { keepLongText: true }).description).toHaveLength(
      LIMITS.paste,
    );
  });

  it("blocks saving a page with text over its limit, after its other problems", () => {
    const page = { ...PAGE_DEFAULTS.links(), bio: long(310) };
    const errors = validatePage("links", page);
    expect(Object.keys(errors)[0]).toBe("title");
    expect(errors.bio).toBe("Shorten by 10 characters");
  });
});
```

In `features/generator/state/reducer.test.ts`, add:

```ts
  it("keeps text over a limit in the editor, so nothing is cut while typing", () => {
    const state = reduce(initialState(), {
      type: "updatePage",
      pageType: "video",
      update: (page) => ({ ...page, description: "x".repeat(1200) }),
    });
    expect(state.pages.video.description).toHaveLength(1200);
  });
```

- [ ] **Step 3: Run the tests and watch them fail.**

Run: `npx vitest run lib/pages/limits.test.ts features/generator/state/reducer.test.ts`
Expected: FAIL. `limitAt`, `overLimit` and `shortenBy` aren't exported, and the reducer trims to 300.

- [ ] **Step 4: Implement.**

`lib/pages/types.ts`: extend `LIMITS`.

```ts
export const LIMITS = {
  links: 30,
  socials: 16,
  phones: 4,
  emails: 4,
  buttons: 6,
  sections: 20,
  items: 60,
  images: 24,
  short: 120,
  medium: 300,
  /** Descriptions and other text of several lines. */
  text: 1000,
  long: 2000,
  /** The most the editor holds in one box while it's too long (a guard against huge pastes). */
  paste: 20000,
} as const;
```

`lib/pages/sanitize.ts`:
1. **Schemas:** change these from `str(LIMITS.medium)` to `str(LIMITS.text)`:
   - `vcard.bio`, `menu.description`, `menu.note`, `coupon.description`, `feedback.thanks`;
   - the `description` of `pdf`, `images`, `video`, `audio` and `app`.

   Leave `links.bio`, the menu item `description` and every `address`/`location` at `LIMITS.medium`.
2. **Threading `keepLongText`:**
   - Add a module-level type: `type CleanOptions = { keepLongText: boolean };`.
   - Give `clean` and `cleanObject` a final `options: CleanOptions` parameter and pass it down every recursion. In `clean`'s string case:

```ts
    case "string":
      return typeof raw === "string"
        ? raw.replaceAll("\u0000", "").slice(0, options.keepLongText ? LIMITS.paste : spec.max)
        : fallback;
```

   - In the `list` case, call `cleanObject(spec.item, item, {}, options)`.
3. **`sanitizePage`** takes `{ missingLook = "legacy", keepLongText = false }` and calls `cleanObject(SCHEMAS[type], raw, defaults, { keepLongText })`. Add this to its doc comment: "The editor passes `keepLongText`, so text over a limit stays (up to `LIMITS.paste`) and validation asks to shorten it."
4. **Append the new helpers:**

```ts
/** "Shorten by 120 characters". */
export const shortenBy = (n: number) =>
  `Shorten by ${n.toLocaleString("en-US")} ${n === 1 ? "character" : "characters"}`;

/** A text field's limit by its path ("bio", "links.3.label"), or null when it isn't text. */
export function limitAt(type: PageTypeId, path: string): number | null {
  let schema: Record<string, Spec> | undefined = SCHEMAS[type];
  const parts = path.split(".");
  for (let i = 0; i < parts.length; i++) {
    const spec: Spec | undefined = schema?.[parts[i]!];
    if (!spec) return null;
    if (i === parts.length - 1) return spec.kind === "string" ? spec.max : null;
    // Only a list goes deeper, and only through an item's index.
    if (spec.kind !== "list" || !/^\d+$/.test(parts[i + 1] ?? "")) return null;
    i++;
    if (i === parts.length - 1) return null;
    schema = spec.item;
  }
  return null;
}

/** Every text field over its limit, by path, with how much to shorten it. */
export function overLimit<K extends PageTypeId>(
  type: K,
  page: PageContentMap[K],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const walk = (schema: Record<string, Spec>, value: unknown, prefix: string) => {
    if (!isObject(value)) return;
    for (const [key, spec] of Object.entries(schema)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const field = value[key];
      if (spec.kind === "string" && typeof field === "string" && field.length > spec.max) {
        errors[path] = shortenBy(field.length - spec.max);
      }
      if (spec.kind === "list" && Array.isArray(field)) {
        field.forEach((item, i) => walk(spec.item, item, `${path}.${i}`));
      }
    }
  };
  walk(SCHEMAS[type], page, "");
  return errors;
}
```

`lib/pages/validate.ts`:
- Import `overLimit` from `./sanitize`. Check for an import cycle first: `sanitize.ts` must not import `validate.ts`. Run `grep -n "validate" lib/pages/sanitize.ts`; it should find nothing.
- Then:

```ts
export function validatePage<K extends PageTypeId>(type: K, page: PageContentMap[K]): PageErrors {
  const errors = VALIDATORS[type](page);
  // Text over its limit comes after the type's own problems, so Show me goes to those first.
  for (const [path, message] of Object.entries(overLimit(type, page))) errors[path] ??= message;
  return errors;
}
```

`features/generator/state/reducer.ts`: in the `setPage`, `updatePage` and `setLook` cases, call `sanitizePage(action.pageType, …, { keepLongText: true })`. Leave `loadCode` alone: what comes from the database is already within limits.

`features/create/draft.ts`: in `parseDraft`, call `sanitizePage(id, pages[id], { keepLongText: true })`, so a draft with too-long text comes back as typed.

- [ ] **Step 5: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages features/generator features/create`
Expected: PASS. If an older test expected a description trimmed to 300, change it to the new limit and record a test-only ruling.

- [ ] **Step 6: Commit.**

```bash
git add lib/pages features/generator/state features/create/draft.ts
git commit -m "Text limits come from one place, descriptions get 1,000 characters, and the editor keeps long text"
```

---

### Task 2: Every text box shows its limit, and too-long text blocks saving

**Files:**
- Modify:
  - `components/ui/Field.tsx` (a `counter` slot)
  - `features/pages/editor/fields.tsx` (`TextField`/`AreaField`: `path` required, counters, no native `maxLength`)
  - `features/pages/editor/PageEditor.tsx` (provides the limits)
  - every file in `features/pages/editor/editors/*Editor.tsx`: paths on every text box, and no `maxLength` props
- Create: `features/pages/editor/limits.ts`
- Test:
  - `features/pages/editor/PageEditor.test.tsx`
  - `components/ui/Field.test.tsx`, if it exists; otherwise create it

**Interfaces:**
- Consumes: `limitAt` and `shortenBy` (Task 1).
- Produces:
  - `LimitsContext` (React context of `(path: string) => number | null`) and `useLimit(path)`.
  - `limitNote(length: number, limit: number | null, multiline: boolean): { counter: string | null; error: string | null }`.
  - `Field` prop `counter?: ReactNode`.
  - `TextField`/`AreaField` take `path: string` (required) and `errors?: ErrorsApi`, and no `maxLength`.

- [ ] **Step 1: Write the failing tests.** In `features/pages/editor/PageEditor.test.tsx`, add:

```tsx
import { limitAt } from "@/lib/pages/sanitize";

describe("text limits in the editor", () => {
  function Typing({ initial }: { initial: PageContentMap["video"] }) {
    const [page, setPage] = useState(initial);
    return (
      <PageEditor
        type="video"
        page={page}
        errors={validatePage("video", page)}
        onUpdate={(update) => setPage((p) => update(p))}
      />
    );
  }

  it("shows a counter on text of several lines, and keeps a paste over the limit", async () => {
    const user = userEvent.setup();
    render(<Typing initial={PAGE_DEFAULTS.video()} />);
    const box = screen.getByRole("textbox", { name: /^Description/ });
    expect(screen.getByText("0 / 1,000")).toBeInTheDocument();
    await user.click(box);
    await user.paste("x".repeat(1200));
    expect(box).toHaveValue("x".repeat(1200));
    expect(screen.getByText("Shorten by 200 characters")).toBeInTheDocument();
    expect(screen.getByText("1,200 / 1,000")).toBeInTheDocument();
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).not.toHaveAttribute("maxlength");
  });

  it("shows a one-line box's counter only near its limit", async () => {
    const user = userEvent.setup();
    render(<Typing initial={PAGE_DEFAULTS.video()} />);
    const title = screen.getByRole("textbox", { name: /^Title/ });
    await user.type(title, "x".repeat(99));
    expect(screen.queryByText(/ \/ 120$/)).toBeNull();
    await user.type(title, "x");
    expect(screen.getByText("100 / 120")).toBeInTheDocument();
  });

  it.each(PAGE_TYPE_IDS)("%s: every text box has a limit from the page's schema", (type) => {
    const page = PAGE_DEFAULTS[type]() as unknown as Record<string, unknown>;
    // One of everything in lists, so their rows render.
    if (type === "menu") {
      page.sections = [
        { name: "", items: [{ name: "", description: "", price: "", tags: "" }] },
      ];
    }
    if (type === "business" || type === "links") {
      page.socials = [{ network: "instagram", url: "" }];
    }
    if (type === "business") page.buttons = [{ label: "", url: "", on: true }];
    if (type === "vcard") page.socials = [{ network: "instagram", url: "" }];
    const { container } = render(
      <PageEditor
        type={type}
        page={page as never}
        errors={{}}
        onUpdate={vi.fn()}
        reveal
      />,
    );
    const boxes = [...container.querySelectorAll<HTMLElement>("input:not([type=file]), textarea")]
      .filter((el) => !["checkbox", "radio", "range", "color"].includes(el.getAttribute("type") ?? ""));
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      const path = box.getAttribute("data-field");
      expect(path, `${type}: ${box.outerHTML.slice(0, 80)}`).toBeTruthy();
      expect(limitAt(type, path!), `${type}.${path}`).not.toBeNull();
    }
  });
});
```

Selects aren't matched by the selector: the Business hours and the Event time zone are `<select>`s. Toggles are role switch, not inputs. Radios, ranges and colors are filtered out.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx -t "text limits in the editor"`
Expected: FAIL.
- There's no counter.
- The paste is cut at 300, because the box still has its built-in hard stop and the old limit.
- Many boxes have no `data-field`.

- [ ] **Step 3: Implement the field parts.**

`features/pages/editor/limits.ts`:

```ts
"use client";

import { createContext, useContext } from "react";

import { shortenBy } from "@/lib/pages/sanitize";

/** A text field's limit by its path; PageEditor provides it from the page's schema. */
export const LimitsContext = createContext<(path: string) => number | null>(() => null);

export const useLimit = (path: string) => useContext(LimitsContext)(path);

const count = (n: number) => n.toLocaleString("en-US");

/** The counter under a box ("245 / 1,000") and, over the limit, the error to show. */
export function limitNote(
  length: number,
  limit: number | null,
  multiline: boolean,
): { counter: string | null; error: string | null } {
  if (limit === null) return { counter: null, error: null };
  const over = length - limit;
  const near = multiline || length >= limit - 20;
  return {
    counter: near || over > 0 ? `${count(length)} / ${count(limit)}` : null,
    error: over > 0 ? shortenBy(over) : null,
  };
}
```

`components/ui/Field.tsx`:
- Add the prop `/** A character count, shown at the end of the line under the box. */ counter?: ReactNode;`.
- Compute `const counterId = counter ? \`${id}-counter\` : undefined;` and add it to `describedBy` after the hint.
- Replace the error/hint block with a row that keeps the message on the left and the count on the right:

```tsx
      {(error || hint || counter) && (
        <div className="flex items-start justify-between gap-3">
          {error ? (
            <p id={errorId} className="text-sm text-danger">
              {error}
            </p>
          ) : hint ? (
            <p id={hintId} className="text-sm text-fg-muted">
              {hint}
            </p>
          ) : (
            <span />
          )}
          {counter && (
            <p
              id={counterId}
              className={cn(
                "shrink-0 text-sm tabular-nums",
                error ? "text-danger" : "text-fg-muted",
              )}
            >
              {counter}
            </p>
          )}
        </div>
      )}
```

`features/pages/editor/fields.tsx`:
- `TextFieldProps`: make `path: string` required and remove `maxLength`.
- `TextField`:

```tsx
  const limit = useLimit(path);
  // Dates and times have a fixed shape; they need no counter.
  const plain = !["date", "datetime-local", "time"].includes(type);
  const note = limitNote(value.length, plain ? limit : null, false);
  const error = note.error ?? errors?.error(path);
```

- Then pass `error={error}` and `counter={note.counter}` to `Field`, and drop `maxLength={maxLength}` from `TextInput`. Keep `data-field={path}` and the `onBlur` touch.
- `AreaField`:
  - Its props become `Omit<TextFieldProps, "type"> & { rows?: number }`, so it takes `path` and `errors`.
  - It computes `limitNote(value.length, useLimit(path), true)` the same way.
  - It passes `data-field={path}` and `onBlur={() => errors?.touch(path)}` to the `Textarea`, and drops `maxLength`.
- Import `limitNote` and `useLimit` from `./limits`.
- `LinksField`'s "Button text" `TextField` gets `path={\`${prefix}.${i}.label\`}` and `errors={errors}`. Remove its `maxLength`, the Link's `maxLength`, and the social URL's `maxLength`.

`features/pages/editor/PageEditor.tsx`:
- Import `LimitsContext` from `./limits` and `limitAt` from `@/lib/pages/sanitize`.
- Wrap the returned body: `<LimitsContext value={(path) => limitAt(type, path)}>…</LimitsContext>`.

- [ ] **Step 4: Give every text box its path, and remove every `maxLength` in the editors.** The path is the field's key in the schema. For a list row it's `<list>.<index>.<key>`, using the row index the `render` callback receives. TypeScript now flags every `TextField`/`AreaField` without a `path`; run `npx tsc --noEmit` to list them. The boxes to change:

| File | Box | `path` |
| --- | --- | --- |
| AppEditor | Description | `description` |
| AudioEditor | Title, Artist, Description | `title`, `artist`, `description` |
| BusinessEditor | Tagline, Address, About | `tagline`, `address`, `about` |
| CouponEditor | Business, Coupon code, Headline, Description, Button text, Terms and conditions | `business`, `code`, `headline`, `description`, `buttonLabel`, `terms` |
| EventEditor | Organizer, Location, Description, Ticket button text | `organizer`, `location`, `description`, `ticketLabel` |
| FeedbackEditor | Thank-you message | `thanks` |
| ImagesEditor | Title, Description | `title`, `description` |
| LinksEditor | Bio | `bio` |
| MenuEditor | Description, Note, Currency | `description`, `note`, `currency` |
| MenuEditor (rows) | Section name | `sections.${s}.name` |
| MenuEditor (rows) | Dish Price, Description, Tags | `sections.${s}.items.${i}.price`, `…description`, `…tags` |
| PdfEditor | Title, Description | `title`, `description` |
| VcardEditor | Last name, Job title, Company, About, Address | `lastName`, `jobTitle`, `company`, `bio`, `address` |
| VcardEditor (rows) | phone Label, email Label | `phones.${i}.label`, `emails.${i}.label` |
| VideoEditor | Title, Description | `title`, `description` |

- Use the existing variable names in each `render` callback for `s` and `i`.
- Give each changed box `errors={errors}`, if the editor has `errors` in scope (every editor does, through `EditorProps`). That way the over-limit validation error shows on that box after Show me.
- Then delete every remaining `maxLength={…}` in `features/pages/editor/editors/*.tsx`.

- [ ] **Step 5: Run the tests and watch them pass.**

Run: `npx vitest run features/pages components/ui && npx tsc --noEmit && npm run lint`
Expected: PASS. If an existing test finds a box by a name the counter now joins, such as `getByText` on a hint, make the locator exact and record a test-only ruling.

- [ ] **Step 6: Commit.**

```bash
git add components/ui/Field.tsx features/pages/editor
git commit -m "Every page text box shows its limit, and text over it stays and blocks saving instead of being cut"
```

---

### Task 3: Video pages take links only

**Files:**
- Modify:
  - `lib/pages/types.ts` (`VideoPage`, `PAGE_DEFAULTS.video`, the type's description)
  - `lib/pages/sanitize.ts` (the video schema)
  - `lib/pages/validate.ts` (the video validator)
  - `features/pages/editor/editors/VideoEditor.tsx`
  - `features/pages/PageView.tsx` (`VideoView`)
  - `features/pages/editor/upload.ts` and `features/pages/editor/fields.tsx` (no video kind)
  - `app/(docs)/developers/page.tsx` (one sentence)
  - `e2e/accounts/fixtures.ts` (drop `source`)
- Test:
  - `lib/pages/pages.test.ts`
  - `features/pages/PageView.test.tsx`
  - `features/pages/editor/PageEditor.test.tsx`

**Interfaces:**
- Produces:
  - `VideoPage = Themed & { title: string; description: string; url: string }`.
  - `MediaKind = "image" | "pdf" | "audio"`.

- [ ] **Step 1: Write the failing tests.** In `lib/pages/pages.test.ts`:

```ts
describe("video pages take links only", () => {
  it("turns a saved upload page into a link page with no file", () => {
    const page = sanitizePage("video", {
      title: "Sample: Video",
      source: "upload",
      file: { path: "00000000-0000-0000-0000-000000000000/v.mp4", name: "v.mp4", type: "video/mp4", size: 1 },
      url: "",
    });
    expect(page).not.toHaveProperty("source");
    expect(page).not.toHaveProperty("file");
    expect(validatePage("video", page)).toEqual({ url: "Paste a YouTube or Vimeo link" });
  });
});
```

Import `validatePage` if this file doesn't already.

In `features/pages/PageView.test.tsx`:

```tsx
  it("shows a video page saved with an upload as a placeholder, never a player", () => {
    const old = { ...PAGE_DEFAULTS.video(), title: "Sample: Video", source: "upload", file: media("v.mp4", "video/mp4") };
    const { container } = view("video", old, false);
    expect(container.querySelector("video, iframe")).toBeNull();
  });
```

In `features/pages/editor/PageEditor.test.tsx`:
- Replace the `if (type === "video") { … "Video source" … }` assertion inside "%s shows all of its fields" with:

```ts
    if (type === "video") {
      expect(screen.queryByRole("radiogroup", { name: "Video source" })).toBeNull();
      expect(screen.getByRole("textbox", { name: /^Video link/ })).toBeInTheDocument();
    }
```

- Add `"Video link"` to `LABELS.video`, so it reads `["Video link", "Title", "Description"]`.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages/pages.test.ts features/pages/PageView.test.tsx features/pages/editor/PageEditor.test.tsx`
Expected: FAIL.
- `source` and `file` are still in the sanitized page.
- `VideoView` renders a `<video>` for the old upload.
- The "Video source" radio group exists.

- [ ] **Step 3: Implement.**

`lib/pages/types.ts`:
- Change `VideoPage` to:

```ts
export interface VideoPage extends Themed {
  title: string;
  description: string;
  /** A YouTube (Shorts included) or Vimeo link. Ziplume is free, so videos aren't uploaded. */
  url: string;
}
```

- In `PAGE_DEFAULTS.video`, remove `source` and `file`.
- In the type catalog entry (the `video:` entry near line 422), set the description to `"A YouTube or Vimeo video"`.

`lib/pages/sanitize.ts`: the video schema becomes `video: { title: str(), description: str(LIMITS.text), url: str(2048) },`. Unknown keys, including an old `source` or `file`, are already dropped.

`lib/pages/validate.ts`: in the video validator, delete the `p.source === "upload"` line.

`features/pages/editor/editors/VideoEditor.tsx`: replace the "Video" card's contents with the link box alone, and drop the `SegmentedControl` and `MediaField` imports and the `touched` prop use.

```tsx
      <FormCard title="Video">
        <TextField
          label="Video link"
          type="url"
          inputMode="url"
          value={page.url}
          onChange={(url) => set({ url })}
          path="url"
          errors={errors}
          placeholder="https://youtu.be/…"
          hint="A YouTube or Vimeo link."
        />
      </FormCard>
```

Keep `touched` in the props type only if `PageEditor` still passes it. If it doesn't, remove it from both places.

`features/pages/PageView.tsx` `VideoView`:
- `const embed = videoEmbed(page.url); const link = !embed ? safeHref(page.url) : null;`.
- The player area becomes: preview with an embed → `StillMedia`; an embed → the iframe; otherwise the placeholder.
- Delete the `<video>` branch. Remove `mediaUrl` from the imports if nothing else uses it.

`features/pages/editor/upload.ts`: remove `video` from `MediaKind`, `ACCEPT`, `MIME_OK`, `EXTENSION` and the `checkFile` messages. `features/pages/editor/fields.tsx`: remove `video` from `KIND_ICON` and `KIND_LABEL`, and the `FileVideo` import.

`app/(docs)/developers/page.tsx`: after the sentence listing the page types (near line 251), add: `Video pages take a YouTube or Vimeo link in <code>url</code>.`

`e2e/accounts/fixtures.ts`: in the "Phone video" fixture, remove `source: "link",`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS, with no type errors (TypeScript finds any remaining `page.source`/`page.file` use for video).

- [ ] **Step 5: Commit.**

```bash
git add lib/pages features/pages "app/(docs)/developers/page.tsx" e2e/accounts/fixtures.ts
git commit -m "Video pages take YouTube or Vimeo links only; a saved upload page shows the link box"
```

---

### Task 4: File caps, in the app and in the storage bucket

**Files:**
- Modify:
  - `lib/pages/types.ts` (replace `MAX_UPLOAD_BYTES` with `UPLOAD_CAPS`)
  - `features/pages/editor/upload.ts` (`checkFile`)
  - `features/pages/editor/editors/PdfEditor.tsx` and `AudioEditor.tsx` (the hints)
- Create:
  - `supabase/migrations/20261016200000_page_media_limits.sql`
  - `features/pages/editor/upload.test.ts`
- Test: also `supabase/test/migration.test.ts`

**Interfaces:**
- Produces: `UPLOAD_CAPS: Record<"image" | "pdf" | "audio", number>` (bytes), and `checkFile(file, kind)` messages that name the cap.

- [ ] **Step 1: Write the failing tests.** Create `features/pages/editor/upload.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { checkFile } from "./upload";

const MB = 1024 * 1024;
const file = (type: string, size: number, name = "f") => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("checkFile", () => {
  it("caps PDFs at 10 MB, audio at 15 MB and images at 15 MB", () => {
    expect(checkFile(file("application/pdf", 10 * MB), "pdf")).toBeNull();
    expect(checkFile(file("application/pdf", 10 * MB + 1), "pdf")).toBe("PDFs can be up to 10 MB.");
    expect(checkFile(file("audio/mpeg", 15 * MB), "audio")).toBeNull();
    expect(checkFile(file("audio/mpeg", 15 * MB + 1), "audio")).toBe(
      "Audio files can be up to 15 MB.",
    );
    expect(checkFile(file("image/jpeg", 15 * MB + 1), "image")).toBe("Images can be up to 15 MB.");
  });
});
```

In `supabase/test/migration.test.ts`, change the page-media assertion from `52428800` to the new cap, and check that video is gone:

```ts
    const [bucket] = await asService<{
      public: boolean;
      file_size_limit: string;
      allowed_mime_types: string[];
    }>("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'page-media'");
    expect(bucket).toMatchObject({ public: true });
    expect(Number(bucket?.file_size_limit)).toBe(15728640);
    expect(bucket?.allowed_mime_types.some((t) => t.startsWith("video/"))).toBe(false);
    expect(bucket?.allowed_mime_types).toContain("application/pdf");
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/editor/upload.test.ts supabase/test/migration.test.ts`
Expected: FAIL. A PDF just over 10 MB passes with "Files can be up to 50 MB.", and the bucket is still 52428800 and allows video.

- [ ] **Step 3: Implement.**

`lib/pages/types.ts`: replace `MAX_UPLOAD_BYTES` with:

```ts
const MB = 1024 * 1024;
/** Ziplume is free, so files stay small: images are also resized before they're stored. */
export const UPLOAD_CAPS = { image: 15 * MB, pdf: 10 * MB, audio: 15 * MB } as const;
```

`features/pages/editor/upload.ts`: import `UPLOAD_CAPS`, and replace the size line with:

```ts
  if (file.size > UPLOAD_CAPS[kind]) {
    return {
      image: "Images can be up to 15 MB.",
      pdf: "PDFs can be up to 10 MB.",
      audio: "Audio files can be up to 15 MB.",
    }[kind];
  }
```

Hints: in `PdfEditor`, `hint="Up to 10 MB."`; in `AudioEditor`, `hint="MP3, M4A, WAV or OGG, up to 15 MB."`.

`supabase/migrations/20261016200000_page_media_limits.sql`:

```sql
-- Ziplume is free, so files stay small (page enhancements, release 1): no video files, and every
-- file in page-media is at most 15 MB. The app checks the smaller caps (PDFs up to 10 MB, audio up
-- to 15 MB). Files already stored are untouched and keep working.
update storage.buckets
   set file_size_limit = 15728640,
       allowed_mime_types = array[
         'image/png', 'image/jpeg', 'image/webp', 'image/gif',
         'application/pdf',
         'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'
       ]
 where id = 'page-media';
```

Run: `grep -c '\\' supabase/migrations/20261016200000_page_media_limits.sql`
Expected: `0`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages supabase/test/migration.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/pages/types.ts features/pages/editor supabase
git commit -m "PDFs up to 10 MB and audio up to 15 MB; the storage bucket takes no video and caps files at 15 MB"
```

---

### Task 5: Clickable links in page text, and a Share button on every page

**Files:**
- Create:
  - `features/pages/linkify.tsx`
  - `features/pages/ShareButton.tsx`
  - `features/pages/linkify.test.tsx`
  - `features/pages/ShareButton.test.tsx`
- Modify: `features/pages/parts.tsx` (`Prose`, `PageHeader`'s subtitle, `PageFrame`)
- Test: also `features/pages/PageView.test.tsx`

**Interfaces:**
- Produces:
  - `linkify(text: string): ReactNode[]`.
  - `<ShareButton preview?: boolean />`.

- [ ] **Step 1: Write the failing tests.** Create `features/pages/linkify.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { linkify } from "./linkify";

const show = (text: string) => render(<p>{linkify(text)}</p>);

describe("linkify", () => {
  it("links web addresses and emails, keeping the text as written", () => {
    show("Menu at www.example.com or https://example.com/a?b=1, or write hi@example.com.");
    expect(screen.getByRole("link", { name: "www.example.com" })).toHaveAttribute(
      "href",
      "https://www.example.com",
    );
    expect(screen.getByRole("link", { name: "https://example.com/a?b=1" })).toHaveAttribute(
      "href",
      "https://example.com/a?b=1",
    );
    expect(screen.getByRole("link", { name: "hi@example.com" })).toHaveAttribute(
      "href",
      "mailto:hi@example.com",
    );
    const link = screen.getByRole("link", { name: "www.example.com" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow ugc");
  });

  it("leaves trailing punctuation and brackets out of the link", () => {
    show("See (https://x.com). Or example.org!");
    expect(screen.getByRole("link", { name: "https://x.com" })).toHaveAttribute(
      "href",
      "https://x.com",
    );
    expect(screen.queryByRole("link", { name: /example\.org/ })).toBeNull();
  });

  it("never makes a script link", () => {
    show("javascript:alert(1) and data:text/html,hi");
    expect(screen.queryByRole("link")).toBeNull();
  });
});
```

A bare `example.org` without `www.` or a scheme stays text, so ordinary sentences like "Version 2.0" are never linked.

Create `features/pages/ShareButton.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShareButton } from "./ShareButton";

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
});

describe("ShareButton", () => {
  it("opens the share sheet where there is one", async () => {
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    document.title = "Spring menu";
    render(<ShareButton />);
    await userEvent.click(screen.getByRole("button", { name: "Share this page" }));
    expect(share).toHaveBeenCalledWith({ title: "Spring menu", url: window.location.href });
  });

  it("copies the link elsewhere, and says where to find it if copying is blocked", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { unmount } = render(<ShareButton />);
    await userEvent.click(screen.getByRole("button", { name: "Share this page" }));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
    unmount();
    writeText.mockRejectedValueOnce(new Error("blocked"));
    render(<ShareButton />);
    await userEvent.click(screen.getByRole("button", { name: "Share this page" }));
    expect(screen.getByRole("status")).toHaveTextContent("Copy the link from the address bar");
  });

  it("is a still picture in the editor's preview", () => {
    render(<ShareButton preview />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

In `features/pages/PageView.test.tsx`, add:

```tsx
  it("puts a Share button on every public page, and links addresses in its text", () => {
    for (const type of PAGE_TYPE_IDS) {
      const { unmount } = view(type, PAGE_DEFAULTS[type](), false);
      expect(screen.getByRole("button", { name: "Share this page" }), type).toBeInTheDocument();
      unmount();
    }
    view("pdf", { ...PAGE_DEFAULTS.pdf(), title: "Menu", description: "Order at www.example.com" }, false);
    expect(screen.getByRole("link", { name: "www.example.com" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/linkify.test.tsx features/pages/ShareButton.test.tsx features/pages/PageView.test.tsx`
Expected: FAIL. The modules don't exist, and there's no Share button.

- [ ] **Step 3: Implement.**

`features/pages/linkify.tsx`:

```tsx
import type { ReactNode } from "react";

// Web addresses with a scheme or "www.", and email addresses. A bare "example.org" stays text,
// so sentences like "Version 2.0" are never linked.
const PATTERN = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
const TRAILING = /[.,;:!?'"]+$/;

/** A match without trailing punctuation, and a closing bracket it didn't open. */
function trim(match: string): string {
  let text = match.replace(TRAILING, "");
  if (text.endsWith(")") && !text.includes("(")) text = text.slice(0, -1).replace(TRAILING, "");
  return text;
}

function hrefFor(text: string): string | null {
  if (text.includes("@") && !/^https?:\/\//i.test(text)) return `mailto:${text}`;
  const url = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    // Checked, but kept as written (URL would add a trailing slash to a bare host).
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** Page text with its web and email addresses as links (spec item 54). */
export function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(PATTERN)) {
    const start = match.index;
    const shown = trim(match[0]);
    const href = shown ? hrefFor(shown) : null;
    if (!href) continue;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <a
        key={start}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="font-medium break-words text-fg underline underline-offset-4"
      >
        {shown}
      </a>,
    );
    last = start + shown.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
```

Links use the page's main text color with an underline. That is readable wherever the surrounding muted text is: the readability guard keeps text at 4.5:1 on every page surface.

`features/pages/ShareButton.tsx`:

```tsx
"use client";

import { Check, Share2 } from "lucide-react";
import { useRef, useState } from "react";

const BUTTON =
  "absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full border border-border bg-surface text-fg shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)";

/** Share this page: the phone's share sheet, or copy the link (spec item 55). */
export function ShareButton({ preview = false }: { preview?: boolean }) {
  const [note, setNote] = useState("");
  const timer = useRef<number | undefined>(undefined);
  if (preview) {
    return (
      <span aria-hidden className={BUTTON}>
        <Share2 className="size-5" />
      </span>
    );
  }
  const say = (text: string) => {
    setNote(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(""), 2500);
  };
  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch (error) {
        // Closing the sheet isn't a failure; anything else falls back to copying.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      say("Link copied");
    } catch {
      say("Copy the link from the address bar");
    }
  }
  return (
    <>
      <button type="button" aria-label="Share this page" onClick={() => void share()} className={BUTTON}>
        {note === "Link copied" ? (
          <Check aria-hidden className="size-5" />
        ) : (
          <Share2 aria-hidden className="size-5" />
        )}
      </button>
      <p
        role="status"
        className={
          note
            ? "absolute top-16 right-3 z-10 rounded-full bg-fg px-3 py-1.5 text-sm text-bg"
            : "sr-only"
        }
      >
        {note}
      </p>
    </>
  );
}
```

The plan's test calls `share({ title, url: window.location.href })`. Keep `url: window.location.href` exactly.

`features/pages/parts.tsx`:
- Import `linkify` and `ShareButton`.
- `PageFrame`: add `relative` to the root's `className`, and render `<ShareButton preview={preview} />` as the root's first child.
- `Prose`: render each paragraph's text as `{linkify(p)}`.
- `PageHeader`'s subtitle: `{sub && <p className="text-[15px] text-balance whitespace-pre-line text-fg-muted">{linkify(sub)}</p>}`.

The subtitle is typed as `ReactNode` or `string`. If it isn't always a string, linkify only when `typeof sub === "string"`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add features/pages
git commit -m "Web addresses in page text are links, and every page has a Share button"
```

---

### Task 6: Browser tests

**Files:**
- Create: `e2e/accounts/page-text.spec.ts`
- Modify: `e2e/accounts/fixtures.ts`, only if a test below needs a page

- [ ] **Step 1: Write the tests.** Create `e2e/accounts/page-text.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

import { MAKER } from "./fixtures";

const openTab = (page: Page, name: string) => page.getByRole("tab", { name }).click();

test.describe("page text and files", () => {
  test.use({ storageState: MAKER.state });

  test("a video page takes a link, and a long description stays with a note to shorten it", async ({
    page,
  }) => {
    await page.goto("codes/new?type=video");
    await expect(page.getByRole("radiogroup", { name: "Video source" })).toHaveCount(0);
    await page.getByRole("textbox", { name: /^Video link/ }).fill("https://youtu.be/dQw4w9WgXcQ");
    const description = page.getByRole("textbox", { name: /^Description/ });
    await description.fill("x".repeat(1200));
    await expect(description).toHaveValue("x".repeat(1200));
    await expect(page.getByText("Shorten by 200 characters").first()).toBeVisible();
    await expect(page.getByText("1,200 / 1,000").first()).toBeVisible();
    // Create can't go ahead: it says what to fix, and Show me goes to the box.
    const bar = page.getByRole("region", { name: "Code" });
    await expect(bar.getByText(/Shorten by 200 characters/)).toBeVisible();
    await page.getByRole("textbox", { name: /^Title/ }).focus();
    await bar.getByRole("button", { name: "Show me" }).click();
    await expect(description).toBeFocused();
  });

  test("a public page has a Share button that copies its link", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    // The phone fixtures are published at /p/<slug>.
    await page.goto("p/PHONE-LINKS");
    await page.evaluate(() => Object.defineProperty(navigator, "share", { value: undefined }));
    await page.getByRole("button", { name: "Share this page" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Link copied" })).toBeVisible();
  });
});
```

`PHONE-LINKS` is a published Link list fixture. The "Code" region is the Create bar, which shows the first problem with Show me, as in `create.spec.ts`'s "Show me takes you to what's missing".

- [ ] **Step 2: Run the signed-in suite.** The suite reuses the running local Supabase, so apply the new migration to it first:

```bash
npx --yes supabase@2.120.0 migration up --local
npm run test:e2e:accounts
```

Expected: all PASS, including the axe and phone sweeps over the changed editors and pages. If an older test broke because a box lost its built-in limit or gained a counter, make its locator exact and record a test-only ruling.

- [ ] **Step 3: Commit.**

```bash
git add e2e/accounts
git commit -m "Browser tests: video links only, long text kept with a note to shorten, and the Share button"
```

---

### Task 7: Ship Release 1

- [ ] **Step 1: Run the full local check.**

Run: `npm run format:check && npm run lint && npx tsc --noEmit && npm test && npm run test:e2e:accounts && npm run build && npm run test:e2e`
Expected: all PASS. `format:check` may list only git-ignored files under `.superpowers/`.

- [ ] **Step 2: Run the final whole-branch review.** Follow the "Final Review" section of superpowers:executing-plans, with this plan's Review Focus and the ledger's rulings. Do one fix pass.

- [ ] **Step 3: Check the server, then apply the migration through the bridge, before merging.**
1. Disk: `df -h /` on the host. Expected: more than 6 GB free. If not, stop and tell David.
2. Backup: `/var/lib/techitdave-offserver/health.json` is ok, and the newest verified archive is from the last 24 hours. If not, run `systemctl start techitdave-supabase-backup.service` and wait for `newly_verified: 1`.
3. Run `grep -c '\\' supabase/migrations/20261016200000_page_media_limits.sql`. Expected: `0`.
4. Apply the file with the bridge's `execute_sql` on `db12f7ce-3e77-4461-a686-c8cd6de6f764`.
5. Verify:

```sql
select file_size_limit, allowed_mime_types from storage.buckets where id = 'page-media';
```

Expected: `15728640`, and no `video/` types. Append the result to the runbook under "Ziplume page enhancements release 1 migration".

- [ ] **Step 4: Push, open the PR, wait for CI, and merge.**

```bash
git push -u origin feat/page-enhancements-r1
gh pr create --base main --head feat/page-enhancements-r1 --title "Page enhancements 1: video links only, visible limits, file caps, links in text, Share" --body "$(cat <<'EOF'
Release 1 of docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md (plan docs/superpowers/plans/2026-10-16-page-enhancements-release-1.md).

- Video pages take YouTube or Vimeo links only; a page saved with an upload shows the link box.
- Every page text box shows its limit; text over it stays and blocks saving instead of being cut.
- Descriptions allow 1,000 characters (Link list bio and dish descriptions stay at 300).
- PDFs up to 10 MB, audio up to 15 MB; the storage bucket takes no video and caps files at 15 MB.
- Web addresses and emails in page text are links; every page has a Share button.
- Migration (applied live before merge): page-media bucket limits.
- Tests: fill in the unit, signed-in and public counts from Step 1.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks --watch
gh pr merge --merge
```

- [ ] **Step 5: Check the live site.**
1. Wait for `https://ziplume.com/sw.js`'s version to change.
2. Find the chunk with "Shorten by" in the local `.next/static/chunks`, and fetch the same path from ziplume.com. It must contain "Shorten by" and "Share this page".
3. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307.
4. Create nothing and change no data in David's account.
