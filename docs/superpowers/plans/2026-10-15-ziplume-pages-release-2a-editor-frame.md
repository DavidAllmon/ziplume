# Pages Release 2a: The Editor Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Create code" opens a type gallery; the editor becomes a sticky top bar (back, type, name, Create/Save) over four tabs (Content, Look, QR code, Settings) with the live preview beside them, and the Create button names what's missing with a "Show me" that takes you there.

**Architecture:** `/codes/new` without a type renders a new `TypeGallery`. `EditorLayout` (shared by Create and Edit) becomes a Headless UI `TabGroup`: an `EditorTopBar`, a `TabList`, and one `TabPanel` per tab kept mounted (`unmount={false}`), next to the existing preview card. The open tab lives in the address hash (`#content`, `#look`, `#qr`, `#settings`) through `useEditorTab`. `useCodeDraft` reports its first problem as `{ message, tab, field }`; "Show me" switches to that tab, reveals the page's errors, and focuses the input marked `data-field`.

**Tech Stack:** Next.js 16 App Router, React 19 (`flushSync`), Headless UI 2 Tabs, Tailwind 4, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-ziplume-pages-redesign-design.md`, sections 5.1, 5.2, 5.5, 5.6, 5.7, 5.8. Release 2 ships in four parts: 2a (this plan: the frame), 2b (device preview, 5.3 and 5.10), 2c (content forms, 5.4), 2d (phones and tablets, 5.9).

## Global Constraints

- Tab labels, in order: **Content**, **Look** (hosted pages only), **QR code**, **Settings**. The open tab is kept in the address as `#content`, `#look`, `#qr` or `#settings`.
- Top bar copy: back arrow (create: aria-label "Change type", to the gallery; edit: "Back to {code name}", to the code page), the type as the page's `h1` (screen readers hear "New {type}" / "Edit {type}"), the name field (aria-label "Code name", placeholder = the suggested name), "Unsaved changes" and "Discard changes" when editing with changes, and "Create code" / "Save changes".
- While something is missing the button is disabled and the first problem shows beside it with **Show me**.
- Error copy from the spec: "Add a title", "Add the link for “Buy me a coffee”", "Pick when the event starts". Curly quotes and apostrophes, as in the rest of the app.
- Gallery heading "What do you want to make?"; groups: Link first, **Pages** (the 12 hosted types, Contact page among them), **Instant codes** ("Work without internet. They can’t change after printing."), and "Make many at once" linking to bulk create.
- QR code tab: "Match my page" (hosted pages); the QR "Logo" group is renamed **Image in the code**.
- Look tab holds the page color picker ("Page color", 8 swatches + "Custom color") moved out of Content.
- Settings tab: today's settings plus **Folder**.
- Phones (below 768px) keep today's bottom bar with Create/Save until release 2d; the top bar's Create/Save button and Show me line are hidden there. Discard stays visible at every width.
- No new dependencies. All phone-layout checks from release 1 keep passing.

## Review Focus

1. Switching Contact card ↔ Contact page (the Content tab's "How should it work?") while on a tab only one of them has: Look disappears for the card, so the editor must land on Content, not on nothing. Task 4.
2. An address with a tab this type doesn't have (`#look` on a Link) or an unknown hash (`#download`): open Content. Task 4.
3. "Show me" for a problem with no `data-field` input (static forms, business hours, a password input that's hidden because "Remove password" was chosen): focus the tab's first field and never throw. Task 5.
4. Editing with unsaved changes: switching tabs rewrites the hash with `replaceState`; that must not trigger the leave-page warning or lose the unsaved-changes guard's history copy. Task 4.
5. "Continue" from the gallery when the draft's folder was deleted, or when the draft was discarded in another tab: the editor opens in the page's folder, or fresh, without an error. Task 2.

---

### Task 1: Problems name the field, and say which tab they're in

**Files:**
- Create: `features/create/tabs.ts`
- Modify: `lib/pages/validate.ts`
- Modify: `features/create/useCodeDraft.ts`
- Test: `lib/pages/pages.test.ts` (append), `features/create/useCodeDraft.test.tsx` (append)

**Interfaces:**
- Produces (in `features/create/tabs.ts`):
  - `EDITOR_TABS`, `type EditorTab = "content" | "look" | "qr" | "settings"`
  - `TAB_LABELS: Record<EditorTab, string>`
  - `isEditorTab(value: string): value is EditorTab`
  - `tabsFor(hosted: boolean): EditorTab[]`
  - `interface Problem { message: string; tab: EditorTab; field: string | null }`
- Produces: `useCodeDraft(...).problem: Problem | null` (`blocker` stays, equal to `problem?.message ?? null`).

- [ ] **Step 1: Write the failing tests**

Append to `lib/pages/pages.test.ts` (it already imports `validatePage` and `PAGE_DEFAULTS`):

```ts
describe("validatePage names what's missing", () => {
  it("says which field to fill in", () => {
    expect(
      validatePage("links", {
        ...PAGE_DEFAULTS.links(),
        links: [{ label: "Buy me a coffee", url: "" }],
      }),
    ).toMatchObject({ title: "Add a title", "links.0.url": "Add the link for “Buy me a coffee”" });
    expect(validatePage("business", PAGE_DEFAULTS.business())).toMatchObject({
      name: "Add the business name",
    });
    expect(validatePage("menu", PAGE_DEFAULTS.menu())).toMatchObject({
      name: "Add the restaurant name",
    });
    expect(validatePage("event", PAGE_DEFAULTS.event())).toMatchObject({
      title: "Add the event name",
      start: "Pick when the event starts",
    });
    expect(
      validatePage("feedback", { ...PAGE_DEFAULTS.feedback(), business: "", question: "" }),
    ).toMatchObject({ business: "Add the business name", question: "Add a question" });
    expect(validatePage("app", PAGE_DEFAULTS.app())).toMatchObject({ name: "Add the app name" });
    expect(
      validatePage("coupon", { ...PAGE_DEFAULTS.coupon(), offer: "20% off", buttonLabel: "Shop" }),
    ).toMatchObject({ buttonUrl: "Add the button’s link" });
    expect(
      validatePage("business", {
        ...PAGE_DEFAULTS.business(),
        name: "Cafe",
        buttons: [{ label: "Order", url: "" }],
      }),
    ).toMatchObject({ "buttons.0.url": "Add the link for “Order”" });
  });
});
```

Append to `features/create/useCodeDraft.test.tsx`, inside `describe("useCodeDraft", …)`:

```ts
  it("says where the first problem is: the tab, and the field to show", () => {
    const { result } = setup("links");
    expect(result.current.problem).toEqual({
      message: "Add a title",
      tab: "content",
      field: "title",
    });
    expect(result.current.blocker).toBe("Add a title");
  });

  it("points settings problems at the Settings tab", () => {
    const { result } = setup();
    act(() => result.current.setField("url", "url", "example.com"));
    act(() => result.current.dispatch({ type: "settings", patch: { slug: "no spaces" } }));
    expect(result.current.problem).toEqual({
      message: "Link endings use 3–40 letters, numbers or dashes",
      tab: "settings",
      field: "settings.slug",
    });
  });

  it("sends an empty static code to the Content tab's first field", () => {
    const { result } = setup();
    expect(result.current.problem).toEqual({
      message: "Add a link to start",
      tab: "content",
      field: null,
    });
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/pages/pages.test.ts features/create/useCodeDraft.test.tsx`
Expected: FAIL. The validate test reports "This field is required" where it expects the named messages; the three `problem` tests get `undefined`.

- [ ] **Step 3: Name the fields in `lib/pages/validate.ts`**

Delete `const REQUIRED = "This field is required";` and change the validators:

- `links`: `if (!p.title.trim()) errors.title = "Add a title";` and
  `if (l.label.trim() && !l.url.trim()) errors[`links.${i}.url`] = `Add the link for “${l.label.trim()}”`;`
- `business`: `if (!p.name.trim()) errors.name = "Add the business name";` and
  `if (b.label.trim() && !b.url.trim()) errors[`buttons.${i}.url`] = `Add the link for “${b.label.trim()}”`;`
- `menu`: `if (!p.name.trim()) errors.name = "Add the restaurant name";`
- `coupon`: `if (p.buttonLabel.trim() && !p.buttonUrl.trim()) errors.buttonUrl = "Add the button’s link";`
- `event`: `errors.title = "Add the event name"`; both `"Pick a start date and time"` become `"Pick when the event starts"`; `"Pick an end date and time"` becomes `"Pick when the event ends"`.
- `feedback`: `errors.business = "Add the business name"`; `errors.question = "Add a question"`.
- `app`: `if (!p.name.trim()) errors.name = "Add the app name";`

- [ ] **Step 4: Create `features/create/tabs.ts`**

```ts
/** The editor's tabs, in order. Look is for hosted pages only. */
export const EDITOR_TABS = ["content", "look", "qr", "settings"] as const;
export type EditorTab = (typeof EDITOR_TABS)[number];

export const TAB_LABELS: Record<EditorTab, string> = {
  content: "Content",
  look: "Look",
  qr: "QR code",
  settings: "Settings",
};

export const isEditorTab = (value: string): value is EditorTab =>
  (EDITOR_TABS as readonly string[]).includes(value);

/** The tabs a type has: only hosted pages have a Look. */
export const tabsFor = (hosted: boolean): EditorTab[] =>
  hosted ? [...EDITOR_TABS] : EDITOR_TABS.filter((tab) => tab !== "look");

/** What stops a code from being created yet, and where to fix it. */
export interface Problem {
  message: string;
  tab: EditorTab;
  /** The `data-field` of the input to focus; null focuses the tab's first field. */
  field: string | null;
}
```

- [ ] **Step 5: Report the problem from `useCodeDraft`**

In `features/create/useCodeDraft.ts`:

- imports: replace `settingsProblem,` with `settingsErrors,` and add `type SettingsErrors,` in the `./state` import; add `import type { Problem } from "./tabs";`.
- replace the block from `const firstError = Object.values(errors)[0] ?? null;` through the end of the `const blocker = …;` expression with:

```ts
  const firstErrorPath = Object.keys(errors)[0] ?? null;
  const settingsProblems: SettingsErrors = trackable
    ? settingsErrors(settings, { requireSlug: options.requireSlug })
    : {};
  const settingsPath = (Object.keys(settingsProblems)[0] ?? null) as keyof SettingsErrors | null;
  /** Why the code can't be created yet, and where to fix it; null when it's ready. */
  const problem: Problem | null =
    staticType && !encoded
      ? { message: info.emptyHint, tab: "content", field: null }
      : !isValid
        ? {
            message: (firstErrorPath && errors[firstErrorPath]) || info.emptyHint,
            tab: "content",
            // Page fields carry their path; a static form's first field is the one to fix.
            field: pageType ? firstErrorPath : null,
          }
        : trackable && activeType === "url" && !WEB_ADDRESS.test(normalizeUrl(code.content.url.url))
          ? {
              message:
                "Trackable links need a web address (http or https). Turn off Trackable for other links.",
              tab: "content",
              field: null,
            }
          : !measurement.fits
            ? { message: "Too much content for a QR code", tab: "content", field: null }
            : settingsPath
              ? {
                  message: settingsProblems[settingsPath]!,
                  tab: "settings",
                  field: `settings.${settingsPath}`,
                }
              : null;
  /** Why the code can't be created yet, or null when it's ready. */
  const blocker = problem?.message ?? null;
```

- add `problem,` to the returned object, after `blocker,`.

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run lib/pages features/create`
Expected: PASS. If another test asserted an old message ("This field is required", "Pick a start date and time"), update its expectation to the new wording; record each in the ledger.

- [ ] **Step 7: Commit**

```bash
git add lib/pages/validate.ts lib/pages/pages.test.ts features/create/tabs.ts features/create/useCodeDraft.ts features/create/useCodeDraft.test.tsx
git commit -m "Editor problems name the field and the tab it's in"
```

---

### Task 2: The type gallery

**Files:**
- Create: `features/create/gallery/gallery.ts`, `features/create/gallery/gallery.test.ts`
- Create: `features/create/gallery/TypeGallery.tsx`, `features/create/gallery/TypeGallery.test.tsx`
- Modify: `app/(app)/codes/new/page.tsx`
- Modify: `features/create/CreatePage.tsx`, `features/create/useDraftStorage.ts`
- Test: `features/create/CreatePage.test.tsx` (append)

**Interfaces:**
- Produces:
  - `galleryLabel(id: CodeTypeId): string` ("Contact card" for `contact`; the type's own name otherwise, so `vcard` is "Contact page")
  - `LINK_DESCRIPTION`
  - `galleryGroups(query: string): GalleryGroup[]`
  - `TypeGallery({ userId, folderId })`
  - `CreatePageProps.resume?: boolean`
  - `useDraftStorage({ …, startOwned?: boolean })`

- [ ] **Step 1: Write the failing gallery tests**

`features/create/gallery/gallery.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { galleryGroups, galleryLabel } from "./gallery";

describe("galleryGroups", () => {
  it("puts Link first, then the 12 pages, then the instant codes", () => {
    const groups = galleryGroups("");
    expect(groups.map((group) => group.title)).toEqual(["Link", "Pages", "Instant codes"]);
    expect(groups[0]!.ids).toEqual(["url"]);
    expect(groups[1]!.ids).toHaveLength(12);
    expect(groups[1]!.ids).toContain("vcard");
    expect(groups[2]!.ids).toEqual([
      "text",
      "wifi",
      "contact",
      "email",
      "phone",
      "sms",
      "whatsapp",
      "location",
      "payment",
    ]);
  });

  it("tells the two contact kinds apart", () => {
    expect(galleryLabel("contact")).toBe("Contact card");
    expect(galleryLabel("vcard")).toBe("Contact page");
    expect(galleryLabel("url")).toBe("Link");
  });

  it("filters by name and description, dropping empty groups", () => {
    expect(galleryGroups("wi-fi").flatMap((group) => group.ids)).toEqual(["wifi"]);
    // Business describes its "contact buttons", so it matches too.
    expect(galleryGroups("contact").flatMap((group) => group.ids)).toEqual(
      expect.arrayContaining(["vcard", "contact"]),
    );
    expect(galleryGroups("zzz")).toEqual([]);
  });
});
```

`features/create/gallery/TypeGallery.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { saveDraft } from "../draft";
import { initialCreateState } from "../state";
import { TypeGallery } from "./TypeGallery";

beforeEach(() => window.localStorage.clear());

describe("TypeGallery", () => {
  it("links every type to its editor, keeping the folder", () => {
    render(<TypeGallery userId="u1" folderId="f1" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "What do you want to make?" }),
    ).toBeInTheDocument();
    // jsdom has no layout, so the name and description run together in the accessible name.
    expect(screen.getByRole("link", { name: /^Link\s*Send people/ })).toHaveAttribute(
      "href",
      "/codes/new?type=url&folder=f1",
    );
    expect(screen.getByRole("link", { name: /^Contact page/ })).toHaveAttribute(
      "href",
      "/codes/new?type=vcard&folder=f1",
    );
    expect(screen.getByRole("link", { name: /^Contact card/ })).toHaveAttribute(
      "href",
      "/codes/new?type=contact&folder=f1",
    );
    expect(screen.getByRole("link", { name: "Make many at once" })).toHaveAttribute(
      "href",
      "/codes/bulk?folder=f1",
    );
  });

  it("filters as you search, and says when nothing matches", async () => {
    const user = userEvent.setup();
    render(<TypeGallery userId="u1" folderId={null} />);
    await user.type(screen.getByLabelText("Search types"), "menu");
    expect(screen.getByRole("link", { name: /^Menu/ })).toHaveAttribute(
      "href",
      "/codes/new?type=menu",
    );
    expect(screen.queryByRole("link", { name: /^Wi-Fi/ })).toBeNull();
    await user.clear(screen.getByLabelText("Search types"));
    await user.type(screen.getByLabelText("Search types"), "zzz");
    expect(screen.getByText("No types match “zzz”.")).toBeInTheDocument();
  });

  it("offers an unfinished code to continue, or to discard", async () => {
    const user = userEvent.setup();
    saveDraft("u1", initialCreateState({ type: "menu", folderId: null }));
    render(<TypeGallery userId="u1" folderId={null} />);
    const banner = await screen.findByRole("region", { name: "Unfinished code" });
    expect(banner).toHaveTextContent("You have an unfinished Menu on this device.");
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      "/codes/new?type=menu&resume=1",
    );
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.queryByRole("region", { name: "Unfinished code" })).toBeNull();
    expect(window.localStorage.getItem("ziplume:draft:v2:u1")).toBeNull();
  });
});
```

Note: `saveDraft` stores any state; `parseDraft` rejects nothing here. If the draft module ignores a blank state, change the menu name first (`createReducer(..., { type: "code", action: { type: "setName", name: "Lunch" } })`); record a ruling if so.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run features/create/gallery`
Expected: FAIL (the modules don't exist).

- [ ] **Step 3: Write `features/create/gallery/gallery.ts`**

```ts
import { codeTypeInfo } from "@/lib/qr/code-types";
import { PAGE_TYPE_IDS, QR_TYPE_IDS, type CodeTypeId } from "@/lib/qr/types";

import { typeDescription } from "../catalog";

/** The name a type goes by on its own; the two contact kinds are told apart. */
export const galleryLabel = (id: CodeTypeId): string =>
  id === "contact" ? "Contact card" : codeTypeInfo(id).label;

export const LINK_DESCRIPTION = "Send people to a website. Change it any time.";

/** The line under a type's name. */
export const galleryDescription = (id: CodeTypeId) =>
  id === "url" ? LINK_DESCRIPTION : typeDescription(id);

export interface GalleryGroup {
  id: "link" | "pages" | "instant";
  title: string;
  note: string;
  ids: CodeTypeId[];
}

/** Every type, grouped as the gallery shows them, filtered by a search. */
export function galleryGroups(query: string): GalleryGroup[] {
  const needle = query.trim().toLowerCase();
  const matches = (id: CodeTypeId) =>
    !needle || `${galleryLabel(id)} ${galleryDescription(id)}`.toLowerCase().includes(needle);
  const groups: GalleryGroup[] = [
    { id: "link", title: "Link", note: "", ids: (["url"] as CodeTypeId[]).filter(matches) },
    {
      id: "pages",
      title: "Pages",
      note: "A mobile page Ziplume hosts for you. Change it any time.",
      ids: PAGE_TYPE_IDS.filter(matches),
    },
    {
      id: "instant",
      title: "Instant codes",
      note: "Work without internet. They can’t change after printing.",
      ids: QR_TYPE_IDS.filter((id) => id !== "url" && matches(id)),
    },
  ];
  return groups.filter((group) => group.ids.length > 0);
}
```

- [ ] **Step 4: Write `features/create/gallery/TypeGallery.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import { bulkCreateHref, newCodeHref } from "@/components/app/nav";
import { PageHeader } from "@/components/app/PageHeader";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { TYPE_ICONS } from "@/features/generator/content/registry";
import { cn } from "@/lib/cn";
import type { CodeTypeId } from "@/lib/qr/types";

import { clearDraft, parseDraft, rawDraft } from "../draft";
import { galleryDescription, galleryGroups, galleryLabel } from "./gallery";

/** Other tabs can save or clear the draft. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

const tileClass =
  "flex h-full min-h-11 flex-col gap-1 rounded-control border border-border bg-surface p-3 text-left transition-colors focus-ring hover:border-field-border hover:bg-surface-2";

/** The first step of Create: pick what the code opens. Each type opens its own editor. */
export function TypeGallery({ userId, folderId }: { userId: string; folderId: string | null }) {
  const [query, setQuery] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const raw = useSyncExternalStore(
    subscribe,
    () => rawDraft(userId),
    () => null,
  );
  const draft = useMemo(() => (dismissed ? null : parseDraft(raw)), [dismissed, raw]);
  const groups = galleryGroups(query);
  const href = (type: CodeTypeId) => newCodeHref({ type, folderId, ownerId: null });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="What do you want to make?"
        description="Pick what the code opens. Everything else can change later."
      />
      {draft && (
        <div
          role="region"
          aria-label="Unfinished code"
          className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface-2 px-4 py-3 text-sm"
        >
          <span className="text-fg">
            You have an unfinished{" "}
            <strong className="font-semibold">{galleryLabel(draft.state.code.activeType)}</strong>{" "}
            on this device.
          </span>
          <span className="flex gap-2">
            <Link
              href={`${href(draft.state.code.activeType)}&resume=1`}
              className={buttonClasses("primary", "sm")}
            >
              Continue
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearDraft(userId);
                setDismissed(true);
              }}
            >
              Discard
            </Button>
          </span>
        </div>
      )}
      <div className="max-w-sm">
        <Field label="Search types">
          {(control) => (
            <TextInput
              {...control}
              type="search"
              placeholder="Wi-Fi, menu, PDF…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
        </Field>
      </div>
      {groups.length === 0 && (
        <p className="text-sm text-fg-muted">No types match “{query.trim()}”.</p>
      )}
      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`gallery-${group.id}`}
          className="flex flex-col gap-3"
        >
          <div className={cn(group.id === "link" && "sr-only")}>
            <h2 id={`gallery-${group.id}`} className="font-display text-lg font-bold text-fg">
              {group.title}
            </h2>
            {group.note && <p className="text-sm text-fg-muted">{group.note}</p>}
          </div>
          <ul
            className={cn(
              "grid gap-2",
              group.id !== "link" && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
            )}
          >
            {group.ids.map((id) => {
              const Icon = TYPE_ICONS[id];
              return (
                <li key={id}>
                  <Link href={href(id)} className={tileClass}>
                    <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <Icon aria-hidden className="size-4 shrink-0" />
                      {galleryLabel(id)}
                    </span>
                    <span className="text-[13px] text-fg-muted">{galleryDescription(id)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-sm text-fg-muted">
        Need lots of codes?{" "}
        <Link
          href={bulkCreateHref({ folderId, ownerId: null })}
          className="font-medium text-link underline-offset-4 hover:underline"
        >
          Make many at once
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Run the gallery tests to see them pass**

Run: `npx vitest run features/create/gallery`
Expected: PASS.

- [ ] **Step 6: Write the failing resume tests**

Append to `features/create/CreatePage.test.tsx`, inside `describe("CreatePage", …)`:

```tsx
  it("opens an unfinished code straight away from the gallery's Continue", async () => {
    const old = createReducer(
      createReducer(initialCreateState({ type: "url", folderId: "gone" }), {
        type: "code",
        action: { type: "setField", qrType: "url", field: "url", value: "https://example.com/old" },
      }),
      { type: "code", action: { type: "setName", name: "Old poster" } },
    );
    saveDraft(USER, old);
    renderPage({ initialFolderId: "f1", resume: true });
    expect(await screen.findByLabelText("Website address")).toHaveValue("https://example.com/old");
    expect(screen.getByLabelText("Code name")).toHaveValue("Old poster");
    // The draft's folder is gone, so it goes in the folder the page was opened for.
    expect(screen.getByLabelText("Folder")).toHaveValue("f1");
    expect(screen.queryByText(/unfinished code/)).toBeNull();
  });

  it("opens fresh when Continue finds nothing to resume", async () => {
    renderPage({ resume: true });
    expect(await screen.findByLabelText("Website address")).toHaveValue("");
    expect(screen.queryByText(/unfinished code/)).toBeNull();
  });
```

Run: `npx vitest run features/create/CreatePage.test.tsx -t "Continue"`
Expected: FAIL (`resume` isn't a prop; the editor opens fresh and shows the Resume banner).

- [ ] **Step 7: Let `useDraftStorage` start out owning the draft**

`features/create/useDraftStorage.ts`: add `startOwned` to the options and use it as the initial `owned`:

```ts
export function useDraftStorage({
  userId,
  state,
  defaults,
  onRestore,
  startOwned = false,
}: {
  userId: string;
  state: CreateState;
  defaults: CreateDefaults;
  onRestore: (state: CreateState) => void;
  /** The page already opened the draft (Continue from the gallery): don't offer it again. */
  startOwned?: boolean;
}) {
```

and `const [owned, setOwned] = useState(startOwned);`.

- [ ] **Step 8: Resume in `CreatePage`**

`features/create/CreatePage.tsx`:

- imports: add `import { useInBrowser } from "@/lib/useInBrowser";` and `import { parseDraft, rawDraft } from "./draft";` and `import type { FolderRow } from "@/types/supabase";` is already there.
- `CreatePageProps` gains:

```ts
  /** Opened from the gallery's Continue: start from the unfinished code. */
  resume?: boolean;
```

- add, above `CreatePage`:

```ts
/** A saved folder that's gone (or in another workspace) falls back to the page's folder. */
const inFolders = (
  saved: CreateState,
  folders: FolderRow[],
  fallback: string | null,
): CreateState => ({
  ...saved,
  folderId: folders.some((folder) => folder.id === saved.folderId) ? saved.folderId : fallback,
});
```

- rename the current `export function CreatePage(...)` to `function CreateEditor({ userId, folders, initialType, initialFolderId, resume = false }: CreatePageProps)` and add a new export above it:

```tsx
/** One page: sections on the left in any order, the live preview and Create on the right. */
export function CreatePage(props: CreatePageProps) {
  // A draft lives in this browser only, so Continue opens it once the page is in the browser.
  const inBrowser = useInBrowser();
  if (props.resume && !inBrowser) {
    return (
      <p aria-busy="true" className="text-sm text-fg-muted">
        Opening your unfinished code…
      </p>
    );
  }
  return <CreateEditor {...props} />;
}
```

- in `CreateEditor`, before `useCodeDraft`:

```ts
  // Continue from the gallery: start from the saved draft, read once.
  const [resumed] = useState(() => {
    const saved = resume ? parseDraft(rawDraft(userId)) : null;
    return saved ? inFolders(saved.state, folders, initialFolderId) : null;
  });
  const draft = useCodeDraft(defaults, resumed ? { initial: resumed } : undefined);
```

  (replacing `const draft = useCodeDraft(defaults);`), change `restore` to dispatch `inFolders(saved, folders, defaults.folderId)`, and pass `startOwned: resumed !== null` to `useDraftStorage`.

- [ ] **Step 9: Route `/codes/new` to the gallery when there's no type**

`app/(app)/codes/new/page.tsx`:

- imports: add `import { TypeGallery } from "@/features/create/gallery/TypeGallery";`.
- replace the `const initialType = …` line and the `return (…)` with:

```tsx
  const initialType = typeParam && isCodeType(typeParam) ? typeParam : null;
  if (!initialType) return <TypeGallery userId={user.id} folderId={folder?.id ?? null} />;

  return (
    <CreatePage
      // A new address (type or folder) is a new visit: start from fresh defaults.
      key={`${folder?.id ?? ""}:${initialType}`}
      userId={user.id}
      folders={folders ?? []}
      initialType={initialType}
      initialFolderId={folder?.id ?? null}
      resume={params.resume === "1"}
    />
  );
```

- [ ] **Step 10: Run the tests to see them pass**

Run: `npx vitest run features/create app`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add features/create/gallery features/create/CreatePage.tsx features/create/CreatePage.test.tsx features/create/useDraftStorage.ts "app/(app)/codes/new/page.tsx"
git commit -m "Create code opens a type gallery; Continue picks up an unfinished code"
```

---

### Task 3: What the tabs hold

**Files:**
- Create: `features/create/sections/LookSection.tsx`, `features/create/sections/FolderSection.tsx`
- Create: `features/create/matchPage.ts`, `features/create/matchPage.test.ts`
- Modify: `features/create/sections/DesignSection.tsx`, `ContentSection.tsx`, `SettingsSection.tsx`
- Modify: the 12 files in `features/pages/editor/editors/*Editor.tsx`, and `features/pages/editor/editors/shared.tsx`
- Test: `features/create/sections/sections.test.tsx`

**Interfaces:**
- Produces:
  - `LookSection({ page, onChange }: { page: PageContentMap[PageTypeId]; onChange: (page: PageContentMap[PageTypeId]) => void })`
  - `FolderSection({ folderId, folders, onChange }: { folderId: string | null; folders: FolderRow[]; onChange: (folderId: string | null) => void })`
  - `matchPagePatch(pageColor: string, design: DesignState): Partial<DesignState>`
  - `DesignSection` gains `matchColor?: string | null`

- [ ] **Step 1: Write the failing tests**

`features/create/matchPage.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { initialState } from "@/features/generator/state/defaults";

import { matchPagePatch } from "./matchPage";

describe("matchPagePatch", () => {
  const design = initialState().design;

  it("uses the page's color for the code and frame when it scans well", () => {
    expect(matchPagePatch("#be123c", design)).toEqual({
      fgColor: "#BE123C",
      frameColor: "#BE123C",
      gradientType: "none",
      cornerColor: null,
      cornerDotColor: null,
    });
  });

  it("falls back to ink when the page's color is too light for the code's background", () => {
    expect(matchPagePatch("#7FE9FF", design).fgColor).toBe("#0F172A");
  });

  it("checks against the code's own background", () => {
    expect(matchPagePatch("#FFFFFF", { ...design, bgColor: "#0A1330" }).fgColor).toBe("#FFFFFF");
  });
});
```

In `features/create/sections/sections.test.tsx`:

- imports: remove `NameFolderSection` and `TypeSection`; add `import { FolderSection } from "./FolderSection";`, `import { LookSection } from "./LookSection";` and `import { PAGE_DEFAULTS } from "@/lib/pages/types";`.
- delete `describe("TypeSection", …)`, `describe("NameFolderSection", …)`, and the `it("shows the type without letting it change", …)` test in the editing block.
- add:

```tsx
describe("LookSection", () => {
  it("changes the page's color", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const page = PAGE_DEFAULTS.links();
    render(<LookSection page={page} onChange={onChange} />);
    expect(screen.getByRole("heading", { name: "Page look" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use #BE123C" }));
    expect(onChange).toHaveBeenCalledWith({ ...page, color: "#BE123C" });
  });
});

describe("FolderSection", () => {
  it("files the code in a folder", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const folders = [
      { id: "f1", name: "Flyers" },
      { id: "f2", name: "Menus" },
    ] as FolderRow[];
    render(<FolderSection folderId="f1" folders={folders} onChange={onChange} />);
    expect(screen.getByLabelText("Folder")).toHaveValue("f1");
    await user.selectOptions(screen.getByLabelText("Folder"), "");
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
```

- inside `describe("DesignSection", …)` add:

```tsx
  it("calls the logo the image in the code, and matches a hosted page's color", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const design = initialState().design;
    const { rerender } = render(
      <DesignSection design={design} dispatch={dispatch} onResetToStyle={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: "QR code design" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Image in the code/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Match my page" })).toBeNull();
    rerender(
      <DesignSection
        design={design}
        dispatch={dispatch}
        onResetToStyle={vi.fn()}
        matchColor="#BE123C"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Match my page" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "setDesign",
      patch: {
        fgColor: "#BE123C",
        frameColor: "#BE123C",
        gradientType: "none",
        cornerColor: null,
        cornerDotColor: null,
      },
    });
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run features/create/matchPage.test.ts features/create/sections`
Expected: FAIL (missing modules; "QR code design" and "Image in the code" not found).

- [ ] **Step 3: Write `features/create/matchPage.ts`**

```ts
import type { DesignState } from "@/features/generator/state/types";
import { contrastRatio, normalizeHex } from "@/lib/color/contrast";

const INK = "#0F172A";

/** "Match my page": the code and frame take the page's color, if it scans well on the code's
 * background (4.5:1); otherwise ink. Gradients and corner colors go, so the color shows. */
export function matchPagePatch(pageColor: string, design: DesignState): Partial<DesignState> {
  const background = design.transparent ? "#FFFFFF" : (normalizeHex(design.bgColor) ?? "#FFFFFF");
  const color = normalizeHex(pageColor);
  const chosen = color && contrastRatio(color, background) >= 4.5 ? color : INK;
  return {
    fgColor: chosen,
    frameColor: chosen,
    gradientType: "none",
    cornerColor: null,
    cornerDotColor: null,
  };
}
```

- [ ] **Step 4: Write `features/create/sections/LookSection.tsx`**

```tsx
"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { AccentField } from "@/features/pages/editor/fields";
import type { PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

/** The Look tab: how a hosted page looks to visitors. */
export function LookSection({
  page,
  onChange,
}: {
  page: PageContentMap[PageTypeId];
  onChange: (page: PageContentMap[PageTypeId]) => void;
}) {
  return (
    <Card aria-labelledby="look-heading">
      <CardHeader id="look-heading" title="Page look" description="How your page looks to visitors." />
      <div className="px-5 pt-4 pb-6 sm:px-6">
        <AccentField value={page.color} onChange={(color) => onChange({ ...page, color })} />
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Write `features/create/sections/FolderSection.tsx`**

```tsx
"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/inputs";
import type { FolderRow } from "@/types/supabase";

/** The Settings tab's folder: where the code is filed. */
export function FolderSection({
  folderId,
  folders,
  onChange,
}: {
  folderId: string | null;
  folders: FolderRow[];
  onChange: (folderId: string | null) => void;
}) {
  return (
    <Card aria-labelledby="folder-heading">
      <CardHeader id="folder-heading" title="Folder" />
      <div className="px-5 pt-4 pb-6 sm:px-6">
        <Field label="Folder">
          {(control) => (
            <Select
              {...control}
              value={folderId ?? ""}
              onChange={(event) => onChange(event.target.value || null)}
            >
              <option value="">No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </Card>
  );
}
```

- [ ] **Step 6: Update `DesignSection`**

`features/create/sections/DesignSection.tsx`:

- add `import { matchPagePatch } from "../matchPage";`.
- props: add `matchColor` to the destructuring and type:

```ts
  /** A hosted page's color, for "Match my page"; absent for other codes. */
  matchColor?: string | null;
```

- the comment above the function becomes `/** The QR code tab: start from a style, then colors, shape, image and frame (several can be open). */`.
- `CardHeader`: remove `step={3}`, change `title="Design"` to `title="QR code design"`.
- after the `CardHeader`, before `<div className="mt-4">`, insert:

```tsx
      {matchColor && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 sm:px-6">
          <p className="text-sm text-fg-muted">Use your page’s color for the code.</p>
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "setDesign", patch: matchPagePatch(matchColor, design) })}
          >
            Match my page
          </Button>
        </div>
      )}
```

- `<Section title="Logo" icon={<ImageIcon />} summary={logo}>` becomes `<Section title="Image in the code" icon={<ImageIcon />} summary={logo}>`.

- [ ] **Step 7: Drop the step numbers from Content and Settings**

`features/create/sections/ContentSection.tsx`: remove `step={2}` and change the comment to `/** The Content tab: the chosen type's form. Contact first asks how it should work. */`.
`features/create/sections/SettingsSection.tsx`: remove `step={4}` and change the comment to `/** The Settings tab: tracking, a password, active dates and the short link. Off, with why, when static. */`.

- [ ] **Step 8: Move the page color out of the 12 content forms**

Run:

```bash
python3 -I - <<'EOF'
import glob, re
for path in glob.glob("features/pages/editor/editors/*Editor.tsx"):
    s = open(path).read()
    s2 = s.replace('import { Appearance, type EditorProps } from "./shared";', 'import type { EditorProps } from "./shared";')
    s2 = re.sub(r"\n\s*<Appearance color=\{page\.color\} set=\{set\} />", "", s2)
    assert s2 != s and "Appearance" not in s2, path
    open(path, "w").write(s2)
EOF
```

Then in `features/pages/editor/editors/shared.tsx` delete the `Appearance` function and its `AccentField` import, leaving only:

```tsx
"use client";

import type { ErrorsApi } from "../fields";

export interface EditorProps<T> {
  page: T;
  set: (patch: Partial<T>) => void;
  errors: ErrorsApi;
}
```

- [ ] **Step 9: Run the tests to see them pass**

Run: `npx vitest run features/create features/pages`
Expected: PASS. (`EditorLayout` still renders `TypeSection` and `NameFolderSection` until Task 4; the page color is in no tab until Task 4 wires `LookSection`.)

- [ ] **Step 10: Commit**

```bash
git add features/create/sections features/create/matchPage.ts features/create/matchPage.test.ts features/pages/editor/editors
git commit -m "Tab contents: Look holds the page color, QR code can match the page, Settings files the code"
```

---

### Task 4: The editor frame: top bar, tabs, and a preview that follows them

**Files:**
- Create: `features/create/useEditorTab.ts`, `features/create/useEditorTab.test.tsx`
- Create: `features/create/EditorTopBar.tsx`, `features/create/EditorTopBar.test.tsx`
- Modify: `features/create/EditorLayout.tsx` (rewrite), `features/create/PreviewColumn.tsx`, `features/create/CreateMobileBar.tsx`
- Modify: `features/create/CreatePage.tsx`, `features/create/EditCodePage.tsx`
- Delete: `features/create/sections/TypeSection.tsx`, `features/create/sections/NameFolderSection.tsx`
- Test: `features/create/EditorLayout.test.tsx` (rewrite), `features/create/CreatePage.test.tsx`, `features/create/EditCodePage.test.tsx`

**Interfaces:**
- Consumes: `EditorTab`, `TAB_LABELS`, `tabsFor`, `isEditorTab`, `Problem` (Task 1); `LookSection`, `FolderSection`, `DesignSection.matchColor` (Task 3); `galleryLabel` (Task 2); `draft.problem` (Task 1).
- Produces:
  - `useEditorTab(tabs: readonly EditorTab[]): [EditorTab, (tab: EditorTab) => void]`
  - `EditorTopBar(props: EditorTopBarProps)`
  - `EditorLayout({ draft, folders, mediaOwner, controls, saved?, back: { href: string; label: string } })`
  - `type PreviewView = "code" | "page"`
  - `PreviewColumn({ draft, view, onViewChange, mode })`
  - `CreateMobileBar({ draft, view, onViewChange, ...controls })`

- [ ] **Step 1: Write the failing hook test**

`features/create/useEditorTab.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { EditorTab } from "./tabs";
import { useEditorTab } from "./useEditorTab";

const ALL = ["content", "look", "qr", "settings"] as const;
const NO_LOOK = ["content", "qr", "settings"] as const;

afterEach(() => window.history.replaceState(null, "", "/"));

describe("useEditorTab", () => {
  it("opens the tab in the address, and keeps the choice there", () => {
    window.history.replaceState({ kept: true }, "", "/codes/new?type=links#qr");
    const { result } = renderHook(() => useEditorTab(ALL));
    expect(result.current[0]).toBe("qr");
    act(() => result.current[1]("settings"));
    expect(result.current[0]).toBe("settings");
    expect(window.location.hash).toBe("#settings");
    expect(window.location.search).toBe("?type=links");
    // History state (Next's, and the unsaved-changes guard's copy marker) is left alone.
    expect(window.history.state).toEqual({ kept: true });
  });

  it("opens Content for an unknown tab or one this type doesn't have", () => {
    window.history.replaceState(null, "", "/codes/new#download");
    expect(renderHook(() => useEditorTab(ALL)).result.current[0]).toBe("content");
    window.history.replaceState(null, "", "/codes/new#look");
    expect(renderHook(() => useEditorTab(NO_LOOK)).result.current[0]).toBe("content");
  });

  it("falls back to Content when the chosen tab goes away", () => {
    window.history.replaceState(null, "", "/codes/new");
    const { result, rerender } = renderHook(({ tabs }) => useEditorTab(tabs), {
      initialProps: { tabs: [...ALL] as EditorTab[] },
    });
    act(() => result.current[1]("look"));
    rerender({ tabs: [...NO_LOOK] });
    expect(result.current[0]).toBe("content");
  });
});
```

Run: `npx vitest run features/create/useEditorTab.test.tsx`
Expected: FAIL (module missing).

- [ ] **Step 2: Write `features/create/useEditorTab.ts`**

```ts
"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { isEditorTab, type EditorTab } from "./tabs";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const tabInAddress = (): EditorTab | null => {
  const value = window.location.hash.slice(1);
  return isEditorTab(value) ? value : null;
};

/** The open editor tab, kept in the address (#content, #look, #qr, #settings) so a reload or a
 * shared link opens the same tab. A tab this type doesn't have opens Content. */
export function useEditorTab(tabs: readonly EditorTab[]): [EditorTab, (tab: EditorTab) => void] {
  const fromAddress = useSyncExternalStore(subscribe, tabInAddress, () => null);
  const [chosen, setChosen] = useState<EditorTab | null>(null);
  const wanted = chosen ?? fromAddress ?? "content";
  const tab = tabs.includes(wanted) ? wanted : "content";
  const select = useCallback((next: EditorTab) => {
    setChosen(next);
    // Replace, not push: switching tabs isn't a step Back should undo. Keep history.state, which
    // holds Next's router state and the unsaved-changes guard's marker.
    window.history.replaceState(window.history.state, "", `#${next}`);
  }, []);
  return [tab, select];
}
```

Run: `npx vitest run features/create/useEditorTab.test.tsx` — Expected: PASS.

- [ ] **Step 3: Write the failing top bar test**

`features/create/EditorTopBar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EditorTopBar, type EditorTopBarProps } from "./EditorTopBar";

const props = (overrides: Partial<EditorTopBarProps> = {}): EditorTopBarProps => ({
  mode: "create",
  type: "links",
  back: { href: "/codes/new", label: "Change type" },
  name: "",
  namePlaceholder: "Sample links",
  onName: vi.fn(),
  dirty: false,
  submitting: false,
  onSubmit: vi.fn(),
  problem: null,
  onShowMe: vi.fn(),
  error: null,
  ...overrides,
});

describe("EditorTopBar", () => {
  it("names what's being made, suggests a name, and goes back to the gallery", async () => {
    const user = userEvent.setup();
    const onName = vi.fn();
    render(<EditorTopBar {...props({ onName })} />);
    expect(screen.getByRole("heading", { level: 1, name: "New Link list" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change type" })).toHaveAttribute("href", "/codes/new");
    expect(screen.getByLabelText("Code name")).toHaveAttribute("placeholder", "Sample links");
    await user.type(screen.getByLabelText("Code name"), "A");
    expect(onName).toHaveBeenCalledWith("A");
    expect(screen.getByRole("button", { name: "Create code" })).toBeEnabled();
  });

  it("says what's missing, with Show me, and keeps Create off", async () => {
    const user = userEvent.setup();
    const onShowMe = vi.fn();
    render(
      <EditorTopBar
        {...props({
          onShowMe,
          problem: { message: "Add a title", tab: "content", field: "title" },
        })}
      />,
    );
    expect(screen.getByRole("button", { name: "Create code" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create code" })).toHaveAccessibleDescription(
      /Add a title/,
    );
    await user.click(screen.getByRole("button", { name: "Show me" }));
    expect(onShowMe).toHaveBeenCalled();
  });

  it("when editing, offers Discard once something changed, and shows a failed save", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    const { rerender } = render(
      <EditorTopBar {...props({ mode: "edit", back: { href: "/codes/c1", label: "Back to Menu" } })} />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Edit Link list" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    rerender(
      <EditorTopBar
        {...props({ mode: "edit", dirty: true, onDiscard, error: "That ending is taken." })}
      />,
    );
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(onDiscard).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("That ending is taken.");
  });
});
```

Run: `npx vitest run features/create/EditorTopBar.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 4: Write `features/create/EditorTopBar.tsx`**

```tsx
"use client";

import { ArrowLeft, Loader2, Plus, Save } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { TYPE_ICONS } from "@/features/generator/content/registry";
import { MAX_CODE_NAME } from "@/features/generator/state/defaults";
import type { CodeTypeId } from "@/lib/qr/types";

import { galleryLabel } from "./gallery/gallery";
import type { Problem } from "./tabs";

export interface EditorTopBarProps {
  mode: "create" | "edit";
  type: CodeTypeId;
  /** Create: the gallery ("Change type"). Edit: the code's page ("Back to …"). */
  back: { href: string; label: string };
  name: string;
  namePlaceholder: string;
  onName: (name: string) => void;
  /** Edit: whether anything differs from the saved code. */
  dirty: boolean;
  onDiscard?: () => void;
  submitting: boolean;
  onSubmit: () => void;
  problem: Problem | null;
  onShowMe: () => void;
  /** Why the last save failed, until the next change. */
  error: string | null;
}

/** Above the tabs: back, what's being made, its name, and the one Create (or Save) button with
 * what's still missing. */
export function EditorTopBar({
  mode,
  type,
  back,
  name,
  namePlaceholder,
  onName,
  dirty,
  onDiscard,
  submitting,
  onSubmit,
  problem,
  onShowMe,
  error,
}: EditorTopBarProps) {
  const editing = mode === "edit";
  const reasonId = useId();
  const Icon = TYPE_ICONS[type];
  return (
    <div
      role="region"
      aria-label="Code"
      className="sticky top-14 z-20 flex flex-col gap-2 border-b border-border bg-bg/95 py-3 backdrop-blur-md sm:top-0"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={back.href}
          aria-label={back.label}
          className="grid size-11 shrink-0 place-items-center rounded-control text-fg-muted focus-ring hover:bg-surface-2 hover:text-fg"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="flex shrink-0 items-center gap-2 font-display text-lg font-bold tracking-tight text-fg">
          <Icon aria-hidden className="size-5 shrink-0" />
          <span>
            <span className="sr-only">{editing ? "Edit " : "New "}</span>
            {galleryLabel(type)}
          </span>
        </h1>
        <TextInput
          aria-label="Code name"
          placeholder={namePlaceholder}
          maxLength={MAX_CODE_NAME}
          value={name}
          onChange={(event) => onName(event.target.value)}
          className="min-w-0 flex-1 basis-48"
        />
        {editing && dirty && !submitting && onDiscard && (
          <span className="flex items-center gap-2">
            <span className="text-sm text-fg-muted">Unsaved changes</span>
            <Button variant="ghost" onClick={onDiscard}>
              Discard changes
            </Button>
          </span>
        )}
        {/* Phones keep this button in the bar at the bottom of the screen. */}
        <Button
          onClick={onSubmit}
          disabled={problem !== null || submitting || (editing && !dirty)}
          aria-describedby={problem ? reasonId : undefined}
          className="max-md:hidden"
        >
          {submitting ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : editing ? (
            <Save aria-hidden />
          ) : (
            <Plus aria-hidden />
          )}
          {submitting
            ? editing
              ? "Saving…"
              : "Creating…"
            : editing
              ? "Save changes"
              : "Create code"}
        </Button>
      </div>
      {problem && (
        <p
          id={reasonId}
          className="flex flex-wrap items-center justify-end gap-x-2 text-sm text-fg-muted max-md:hidden"
        >
          {problem.message}
          <button
            type="button"
            onClick={onShowMe}
            className="min-h-11 rounded-control px-1 font-semibold text-link underline underline-offset-4 focus-ring"
          >
            Show me
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger md:text-right">
          {error}
        </p>
      )}
    </div>
  );
}
```

Run: `npx vitest run features/create/EditorTopBar.test.tsx` — Expected: PASS.

- [ ] **Step 5: Slim `PreviewColumn` to the preview, with its view controlled**

Replace `features/create/PreviewColumn.tsx` with:

```tsx
"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useExport } from "@/features/generator/export/useExport";
import { PagePreview } from "@/features/generator/preview/PagePreview";
import { QrTile } from "@/features/generator/preview/QrTile";
import { ScanBadge, ScanIssues } from "@/features/generator/preview/ScanCheck";

import { typeLabel } from "./catalog";
import type { CodeDraft } from "./useCodeDraft";

export interface CreateControls {
  /** "edit" saves changes to a saved code instead of creating one. */
  mode: "create" | "edit";
  submitting: boolean;
  onSubmit: () => void;
  /** Why the last save failed, until the next change. */
  error: string | null;
  /** Edit mode: whether anything differs from the saved code. */
  dirty?: boolean;
  /** Edit mode: puts the form back the way it was saved. */
  onDiscard?: () => void;
}

/** What the preview shows for a hosted page: the page, or its QR code. */
export type PreviewView = "code" | "page";

/** The live page (or code), its scan check, and Download for codes that don't need saving. */
export function PreviewColumn({
  draft,
  view,
  onViewChange,
  mode,
}: {
  draft: CodeDraft;
  view: PreviewView;
  onViewChange: (view: PreviewView) => void;
  mode: "create" | "edit";
}) {
  const { state, renderOptions, summary, info, report, blocker, pageType, trackable, previewSlug } =
    draft;
  const { download, busy } = useExport({
    options: renderOptions,
    format: "png",
    filename: draft.filename,
  });

  return (
    <div className="flex flex-col gap-5">
      {pageType && (
        <SegmentedControl
          aria-label="Preview"
          size="touch"
          value={view}
          onChange={onViewChange}
          options={[
            { value: "page", label: "Page" },
            { value: "code", label: "QR code" },
          ]}
        />
      )}
      {pageType && view === "page" ? (
        <PagePreview type={pageType} page={state.code.pages[pageType]} slug={previewSlug} />
      ) : (
        <QrTile
          options={renderOptions}
          summary={summary}
          emptyHint={info.emptyHint}
          className="mx-auto w-full max-w-[20rem]"
        />
      )}
      <div className="flex flex-col items-center gap-2 text-center">
        <ScanBadge report={report} />
        {summary && (
          <p className="max-w-full truncate text-sm text-fg-muted">
            <span className="font-medium text-fg">{typeLabel(state.code.activeType)}</span> ·{" "}
            {summary}
          </p>
        )}
      </div>
      <ScanIssues report={report} />
      {!trackable && mode === "create" && (
        <Button
          variant="ghost"
          onClick={() => void download()}
          disabled={blocker !== null || busy !== null}
          className="w-full"
        >
          <Download aria-hidden /> Download without saving
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Pass the view through `CreateMobileBar`**

`features/create/CreateMobileBar.tsx`:

- the import of `PreviewColumn` becomes `import { PreviewColumn, type CreateControls, type PreviewView } from "./PreviewColumn";`.
- the signature becomes:

```tsx
export function CreateMobileBar({
  draft,
  view,
  onViewChange,
  ...controls
}: {
  draft: CodeDraft;
  view: PreviewView;
  onViewChange: (view: PreviewView) => void;
} & CreateControls) {
```

- inside the `Sheet`, `<PreviewColumn draft={draft} {...controls} />` becomes
  `<PreviewColumn draft={draft} view={view} onViewChange={onViewChange} mode={mode} />`.

- [ ] **Step 7: Rewrite `features/create/EditorLayout.tsx`**

```tsx
"use client";

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useState, type ReactNode } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import type { ContentEditor } from "@/features/generator/content/types";
import type { FolderRow } from "@/types/supabase";

import { CreateMobileBar } from "./CreateMobileBar";
import { EditorTopBar } from "./EditorTopBar";
import { PreviewColumn, type CreateControls, type PreviewView } from "./PreviewColumn";
import { ContentSection } from "./sections/ContentSection";
import { DesignSection } from "./sections/DesignSection";
import { FolderSection } from "./sections/FolderSection";
import { LookSection } from "./sections/LookSection";
import { SettingsSection, type SavedSettings } from "./sections/SettingsSection";
import { TAB_LABELS, tabsFor, type EditorTab } from "./tabs";
import type { CodeDraft } from "./useCodeDraft";
import { useEditorTab } from "./useEditorTab";

/**
 * The editor Create and Edit share: a top bar with the name and the one button, tabs for the
 * content, the page's look, the QR code and the settings, and the live preview beside them (and
 * in the bar above the bottom tabs on phones).
 */
export function EditorLayout({
  draft,
  folders,
  mediaOwner,
  controls,
  saved,
  back,
}: {
  draft: CodeDraft;
  folders: FolderRow[];
  /** Hosted-page files go to this person's space (a teammate's code); null means your own. */
  mediaOwner: string | null;
  controls: CreateControls;
  /** Edit mode only: what the saved code has, so the sections can lock and explain things. */
  saved?: SavedSettings;
  /** Where the top bar's back arrow goes, and what it's called. */
  back: { href: string; label: string };
}) {
  const { state, dispatch, codeAction, pageType, problem } = draft;
  const editing = controls.mode === "edit";
  const tabs = tabsFor(pageType !== null);
  const [tab, selectTab] = useEditorTab(tabs);
  /** A hosted page's preview follows the tab: the page for Content and Look, the code for QR. */
  const [view, setView] = useState<PreviewView>("page");

  function changeTab(next: EditorTab) {
    selectTab(next);
    if (next === "qr") setView("code");
    else if (next === "content" || next === "look") setView("page");
  }

  const editor: ContentEditor = {
    state: state.code,
    setField: draft.setField,
    setPage: draft.setPage,
    pageErrors: draft.pageErrors,
    workspace: mediaOwner ? { ownerId: mediaOwner } : null,
  };
  const page = pageType ? state.code.pages[pageType] : null;

  const panels: Record<EditorTab, ReactNode> = {
    content: (
      <ContentSection
        editor={editor}
        typeLocked={editing}
        onTypeChange={(activeType) => codeAction({ type: "setActiveType", activeType })}
      />
    ),
    look:
      pageType && page ? (
        <LookSection page={page} onChange={(next) => draft.setPage(pageType, next)} />
      ) : null,
    qr: (
      <DesignSection
        design={state.code.design}
        dispatch={codeAction}
        onResetToStyle={() => dispatch({ type: "resetToStyle" })}
        matchColor={page?.color ?? null}
      />
    ),
    settings: (
      <div className="flex flex-col gap-6">
        <SettingsSection
          type={state.code.activeType}
          settings={state.settings}
          onChange={(patch) => dispatch({ type: "settings", patch })}
          saved={saved}
        />
        <FolderSection
          folderId={state.folderId}
          folders={folders}
          onChange={(folderId) => dispatch({ type: "setFolder", folderId })}
        />
      </div>
    ),
  };

  return (
    <TabGroup
      as="div"
      selectedIndex={tabs.indexOf(tab)}
      onChange={(index) => changeTab(tabs[index]!)}
      className="flex flex-col gap-5"
    >
      <EditorTopBar
        mode={controls.mode}
        type={state.code.activeType}
        back={back}
        name={state.code.name}
        namePlaceholder={draft.defaultName}
        onName={(name) => codeAction({ type: "setName", name })}
        dirty={controls.dirty ?? false}
        onDiscard={controls.onDiscard}
        submitting={controls.submitting}
        onSubmit={controls.onSubmit}
        problem={problem}
        onShowMe={() => problem && changeTab(problem.tab)}
        error={controls.error}
      />
      <TabList aria-label="Editor sections" className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((id) => (
          <Tab
            key={id}
            className="min-h-11 shrink-0 border-b-2 border-transparent px-3 text-sm font-semibold text-fg-muted focus-ring data-hover:text-fg data-selected:border-fg data-selected:text-fg"
          >
            {TAB_LABELS[id]}
          </Tab>
        ))}
      </TabList>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18.5rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <TabPanels className="min-w-0">
          {tabs.map((id) => (
            // Kept mounted, so open sections, uploads in progress and fields keep their state.
            <TabPanel key={id} unmount={false} data-editor-panel={id}>
              {panels[id]}
            </TabPanel>
          ))}
        </TabPanels>
        <aside aria-labelledby="preview-heading" className="hidden md:sticky md:top-28 md:block">
          <Card>
            <CardHeader id="preview-heading" title="Preview" />
            <div className="px-5 pt-4 pb-6">
              <PreviewColumn draft={draft} view={view} onViewChange={setView} mode={controls.mode} />
            </div>
          </Card>
        </aside>
      </div>
      <CreateMobileBar draft={draft} view={view} onViewChange={setView} {...controls} />
    </TabGroup>
  );
}
```

- [ ] **Step 8: Wire Create and Edit to the new layout**

`features/create/CreatePage.tsx`:

- remove the `PageHeader` import and the `<PageHeader … />` element.
- add `import { newCodeHref } from "@/components/app/nav";`.
- pass `back={{ href: newCodeHref({ folderId: initialFolderId, ownerId: null }), label: "Change type" }}` to `EditorLayout`.

`features/create/EditCodePage.tsx`:

- replace the body of `EditCodePage` with:

```tsx
export function EditCodePage(props: EditCodePageProps) {
  // Start and end times show in the viewer's time zone, which the server can't know, so the
  // form is built in the browser.
  const inBrowser = useInBrowser();
  if (!inBrowser) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Edit code" />
        <p aria-busy="true" className="text-sm text-fg-muted">
          Opening the editor…
        </p>
      </div>
    );
  }
  return <EditForm {...props} />;
}
```

- remove the now-unused `ArrowLeft` and `Link` imports.
- in `EditForm`, pass `back={{ href: codeHref, label: `Back to ${code.name}` }}` to `EditorLayout`.

Delete `features/create/sections/TypeSection.tsx` and `features/create/sections/NameFolderSection.tsx`.

- [ ] **Step 9: Rewrite the layout tests**

Replace `features/create/EditorLayout.test.tsx` with:

```tsx
import { render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ContentEditor } from "@/features/generator/content/types";
import type { CodeTypeId } from "@/lib/qr/types";

import { EditorLayout } from "./EditorLayout";
import { savedRow } from "./fixtures";
import { fromSavedCode } from "./load";
import { useCodeDraft } from "./useCodeDraft";

// The content editor this layout builds, as the Content tab received it.
const seen: { editor: ContentEditor | null } = { editor: null };
vi.mock("./sections/ContentSection", () => ({
  ContentSection: ({ editor }: { editor: ContentEditor }) => {
    seen.editor = editor;
    return <p>Content form</p>;
  },
}));
vi.mock("@/features/generator/preview/useScanVerification", () => ({
  useScanVerification: () => null,
}));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div>QR tile</div> }));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));
vi.mock("@/features/generator/preview/PagePreview", () => ({
  PagePreview: () => <div>Page preview</div>,
}));

afterEach(() => window.history.replaceState(null, "", "/"));

function renderLayout({
  mode = "create",
  dirty = false,
  type = "url",
}: { mode?: "create" | "edit"; dirty?: boolean; type?: CodeTypeId } = {}) {
  const initial = mode === "edit" ? fromSavedCode(savedRow()) : undefined;
  const { result } = renderHook(() =>
    useCodeDraft({ type, folderId: null }, { initial, requireSlug: mode === "edit" }),
  );
  return render(
    <EditorLayout
      draft={result.current}
      folders={[]}
      mediaOwner="owner-1"
      back={{ href: "/codes/new", label: "Change type" }}
      controls={{
        mode,
        submitting: false,
        onSubmit: vi.fn(),
        error: null,
        dirty,
        onDiscard: vi.fn(),
      }}
    />,
  );
}

const bar = () => within(screen.getByRole("region", { name: "Code" }));
const preview = () => within(screen.getByRole("complementary", { name: "Preview" }));
const tabNames = () => screen.getAllByRole("tab").map((tab) => tab.textContent);

describe("EditorLayout", () => {
  it("hands the code owner's space to the content editor", () => {
    renderLayout({ mode: "edit" });
    expect(seen.editor?.workspace).toEqual({ ownerId: "owner-1" });
  });

  it("gives hosted pages a Look tab, and other codes none", () => {
    const { unmount } = renderLayout({ type: "links" });
    expect(tabNames()).toEqual(["Content", "Look", "QR code", "Settings"]);
    unmount();
    renderLayout({ type: "url" });
    expect(tabNames()).toEqual(["Content", "QR code", "Settings"]);
  });

  it("opens Content, and keeps the chosen tab in the address", async () => {
    const user = userEvent.setup();
    renderLayout({ type: "links" });
    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(window.location.hash).toBe("#settings");
    expect(screen.getByRole("tabpanel")).toHaveTextContent(/Folder/);
  });

  it("opens the tab in the address", () => {
    window.history.replaceState(null, "", "/codes/new?type=links#look");
    renderLayout({ type: "links" });
    expect(screen.getByRole("tab", { name: "Look" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Page look" })).toBeVisible();
  });

  it("shows the page for Content and Look, and the code for the QR code tab", async () => {
    const user = userEvent.setup();
    renderLayout({ type: "links" });
    expect(preview().getByText("Page preview")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "QR code" }));
    expect(preview().getByText("QR tile")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Look" }));
    expect(preview().getByText("Page preview")).toBeInTheDocument();
  });

  it("says Create in create mode, and what's missing, with Show me opening the tab", async () => {
    const user = userEvent.setup();
    renderLayout({ type: "url" });
    expect(bar().getByRole("button", { name: "Create code" })).toBeDisabled();
    expect(bar().getByText(/Add a link to start/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.click(bar().getByRole("button", { name: "Show me" }));
    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
  });

  it("says Save changes in edit mode, enabled only once something changed", () => {
    const { unmount } = renderLayout({ mode: "edit", dirty: false });
    expect(bar().getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(bar().queryByRole("button", { name: "Discard changes" })).toBeNull();
    expect(preview().queryByRole("button", { name: /Download without saving/ })).toBeNull();
    unmount();
    renderLayout({ mode: "edit", dirty: true });
    expect(bar().getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(bar().getByRole("button", { name: "Discard changes" })).toBeInTheDocument();
  });
});
```

Add a test for Review Focus 1 to `features/create/CreatePage.test.tsx` (it renders the real Content tab):

```tsx
  it("lands on Content when switching a contact page to a card takes the Look tab away", async () => {
    const user = userEvent.setup();
    renderPage({ initialType: "vcard" });
    await user.click(screen.getByRole("tab", { name: "Look" }));
    await user.click(screen.getByRole("tab", { name: "Content" }));
    await user.click(screen.getByRole("radio", { name: /Save straight to phone/ }));
    expect(screen.queryByRole("tab", { name: "Look" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
  });
```

(The Look tab disappears while Content is selected here; `useEditorTab`'s own test covers losing the selected tab.)

- [ ] **Step 10: Update the Create and Edit page tests for the frame**

`features/create/CreatePage.test.tsx`:

- add `const bar = () => within(screen.getByRole("region", { name: "Code" }));` next to `preview`.
- every `preview().getByRole("button", { name: "Create code" })`, `preview().getByRole("button", { name: /Creating/ })`, `preview().findByRole("alert")`, `preview().queryByRole("alert")` and `preview().getByText("Add a link to start")` uses `bar()` instead of `preview()`. `Download without saving` stays on `preview()`.
- before typing into `/Code password/`, open the tab: `await user.click(screen.getByRole("tab", { name: "Settings" }));`. Then return with `await user.click(screen.getByRole("tab", { name: "Content" }));` before typing into "Website address" again.
- in "starts clean, with the type and folder from the address", replace `expect(screen.getByRole("radio", { name: /Join a Wi-Fi network/ })).toBeChecked();` with `expect(screen.getByRole("heading", { level: 1, name: "New Wi-Fi" })).toBeInTheDocument();`.

`features/create/EditCodePage.test.tsx`:

- add `const bar = () => within(screen.getByRole("region", { name: "Code" }));`; `saveButton` becomes `bar().getByRole("button", { name: "Save changes" })`; the alert and "Discard changes" use `bar()`.
- before `Short link ending`, `Remove password` and `/^Colors/` interactions, open the tab: `await user.click(screen.getByRole("tab", { name: "Settings" }))` or `{ name: "QR code" }`.
- add the Review Focus 4 test:

```tsx
  it("switching tabs with unsaved changes doesn't ask to leave", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Code name"), " 2");
    await user.click(screen.getByRole("tab", { name: "QR code" }));
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#settings");
    expect(screen.getByLabelText("Code name")).toHaveValue("Spring menu 2");
  });
```

- [ ] **Step 11: Run the tests**

Run: `npx vitest run features/create features/generator components`
Expected: PASS. Then `npm run typecheck && npx eslint features/create` — no errors.

- [ ] **Step 12: Commit**

```bash
git add -A features/create
git commit -m "Editor frame: a top bar with the name and Create, four tabs in the address, and a preview that follows them"
```

---

### Task 5: Show me takes you to the field

**Files:**
- Create: `features/create/focusField.ts`, `features/create/focusField.test.ts`
- Create: `features/create/ShowMe.test.tsx`
- Modify: `features/create/EditorLayout.tsx`
- Modify: `features/generator/content/types.ts`, `features/generator/content/HostedPageForm.tsx`
- Modify: `features/pages/editor/PageEditor.tsx`, `features/pages/editor/fields.tsx`
- Modify: `features/pages/editor/editors/PdfEditor.tsx`, `ImagesEditor.tsx`, `VideoEditor.tsx`, `AudioEditor.tsx`
- Modify: `features/create/sections/SettingsSection.tsx`
- Test: `features/pages/editor/PageEditor.test.tsx` (append)

**Interfaces:**
- Consumes: `Problem`, `EditorTab` (Task 1); `EditorLayout`'s `changeTab` and the `data-editor-panel` panels (Task 4).
- Produces:
  - `focusField(root: HTMLElement | null, tab: EditorTab, field: string | null): void`
  - `ContentEditor.revealErrors?: boolean`
  - `PageEditor` prop `reveal?: boolean`
  - `data-field` attributes:
    - `TextField` (its `path`)
    - `MediaField` / `ImagesField` (new `field` prop)
    - `TimeZoneField` (`timeZone`)
    - the settings inputs (`settings.password`, `settings.endsAt`, `settings.slug`)

- [ ] **Step 1: Write the failing tests**

`features/create/focusField.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";

import { focusField } from "./focusField";

afterEach(() => document.body.replaceChildren());

function editor() {
  document.body.innerHTML = `
    <div id="root">
      <div data-editor-panel="content">
        <input aria-label="First" />
        <input aria-label="Title" data-field="title" />
      </div>
      <div data-editor-panel="settings">
        <input aria-label="Off" disabled />
        <select aria-label="Folder"></select>
      </div>
    </div>`;
  return document.getElementById("root");
}

describe("focusField", () => {
  it("focuses the field the problem names", () => {
    focusField(editor(), "content", "title");
    expect(document.activeElement).toHaveAttribute("aria-label", "Title");
  });

  it("focuses the tab's first usable field when there's no match", () => {
    focusField(editor(), "content", "hours.2");
    expect(document.activeElement).toHaveAttribute("aria-label", "First");
    focusField(editor(), "settings", null);
    expect(document.activeElement).toHaveAttribute("aria-label", "Folder");
  });

  it("does nothing, without throwing, when the tab isn't there", () => {
    expect(() => focusField(editor(), "look", "color")).not.toThrow();
    expect(() => focusField(null, "content", "title")).not.toThrow();
  });
});
```

Append to `features/pages/editor/PageEditor.test.tsx`, inside `describe("PageEditor", …)`:

```tsx
  it("shows every error at once when asked to reveal them", () => {
    const errors = { title: "Add a title", "links.0.url": "Add at least one link" };
    const { rerender } = render(
      <PageEditor type="links" page={PAGE_DEFAULTS.links()} errors={errors} onChange={vi.fn()} />,
    );
    expect(screen.queryByText("Add a title")).toBeNull();
    rerender(
      <PageEditor
        type="links"
        page={PAGE_DEFAULTS.links()}
        errors={errors}
        onChange={vi.fn()}
        reveal
      />,
    );
    expect(screen.getByText("Add a title")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute("data-field", "title");
  });
```

`features/create/ShowMe.test.tsx` (the real Content form, so hosted pages need a signed-in session):

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type * as Env from "@/lib/env";

import { CreatePage } from "./CreatePage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/env", async (original) => ({ ...(await original<typeof Env>()), accountsEnabled: true }));
vi.mock("@/features/auth/useSession", () => ({
  useSession: () => ({ user: { id: "user-1" }, loading: false }),
}));
vi.mock("@/features/generator/preview/useScanVerification", () => ({
  useScanVerification: () => null,
}));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));
vi.mock("@/features/generator/preview/PagePreview", () => ({ PagePreview: () => <div /> }));

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

const renderPage = (initialType: "links" | "url") =>
  render(
    <ToastProvider>
      <CreatePage userId="user-1" folders={[]} initialType={initialType} initialFolderId={null} />
    </ToastProvider>,
  );
const bar = () => within(screen.getByRole("region", { name: "Code" }));

describe("Show me", () => {
  it("opens the tab, focuses the field and shows its error", async () => {
    const user = userEvent.setup();
    renderPage("links");
    await user.click(screen.getByRole("tab", { name: "QR code" }));
    expect(bar().getByText(/Add a title/)).toBeInTheDocument();
    await user.click(bar().getByRole("button", { name: "Show me" }));
    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Title")).toHaveFocus();
    expect(screen.getByLabelText("Title")).toHaveAccessibleDescription(/Add a title/);
  });

  it("goes to a settings problem's field", async () => {
    const user = userEvent.setup();
    renderPage("url");
    await user.type(screen.getByLabelText("Website address"), "example.com");
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    // Too short (the field trims spaces as you type, so "no spaces" would just become valid).
    await user.type(screen.getByLabelText(/Short link ending/), "ab");
    await user.click(screen.getByRole("tab", { name: "Content" }));
    await user.click(bar().getByRole("button", { name: "Show me" }));
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText(/Short link ending/)).toHaveFocus();
  });

  it("focuses the first field when the problem has no field of its own", async () => {
    const user = userEvent.setup();
    renderPage("url");
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.click(bar().getByRole("button", { name: "Show me" }));
    expect(screen.getByLabelText("Website address")).toHaveFocus();
  });
});
```

(`Field` wires a field's error to its input with `aria-describedby`; if it doesn't, assert `screen.getByText("Add a title")` instead and record a ruling.)

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run features/create/focusField.test.ts features/create/ShowMe.test.tsx features/pages/editor/PageEditor.test.tsx`
Expected: FAIL. `focusField` is missing; `reveal` is ignored, so the error stays hidden and `data-field` is absent; Show me only switches the tab, so nothing is focused.

- [ ] **Step 3: Write `features/create/focusField.ts`**

```ts
import type { EditorTab } from "./tabs";

const FIRST_FIELD =
  "input:not([type='hidden']):not(:disabled), textarea:not(:disabled), select:not(:disabled)";

/** Brings a field into view and focuses it: the input marked `data-field`, or else the tab's first
 * usable field. Quietly does nothing when the tab isn't there. */
export function focusField(root: HTMLElement | null, tab: EditorTab, field: string | null): void {
  const panel = root?.querySelector<HTMLElement>(`[data-editor-panel="${tab}"]`);
  if (!panel) return;
  const target =
    (field ? panel.querySelector<HTMLElement>(`[data-field="${field}"]`) : null) ??
    panel.querySelector<HTMLElement>(FIRST_FIELD);
  if (!target) return;
  target.scrollIntoView?.({ block: "center" });
  target.focus({ preventScroll: true });
}
```

- [ ] **Step 4: Reveal errors in the page editor**

`features/generator/content/types.ts`, in `ContentEditor`, add:

```ts
  /** Show every page error now, not only once a field has been left (after "Show me"). */
  revealErrors?: boolean;
```

`features/generator/content/HostedPageForm.tsx`: pass `reveal={generator.revealErrors ?? false}` to `<PageEditor … />`.

`features/pages/editor/PageEditor.tsx`:

- `PageEditorProps` gains `/** Show every error now, as if each field had been left. */ reveal?: boolean;` and the function destructures `reveal = false`.
- `errorsApi` becomes:

```ts
  const errorsApi = useMemo<ErrorsApi>(
    () => ({
      error: (path) => (reveal || touched.has(path) ? errors[path] : undefined),
      touch,
    }),
    [errors, touched, touch, reveal],
  );
  const anyTouched = touched.size > 0 || reveal;
```

- [ ] **Step 5: Mark the inputs `data-field`**

`features/pages/editor/fields.tsx`:

- `TextField`'s `<TextInput … />` gets `data-field={path}`.
- `MediaFieldProps` gains `/** Marks the file input for "Show me". */ field?: string;`; `MediaField` destructures `field` and its `<input id={inputId} type="file" …>` gets `data-field={field}`.
- `ImagesField`'s props gain `field?: string` (same comment) and its `<input id={inputId} type="file" multiple …>` gets `data-field={field}`.
- `TimeZoneField`'s `<Select {...control} …>` gets `data-field="timeZone"`.

Editors:
- `PdfEditor.tsx`: the `MediaField` for "PDF" gets `field="file"`.
- `ImagesEditor.tsx`: the `ImagesField` gets `field="images"`.
- `VideoEditor.tsx`: the upload `MediaField` ("Video") gets `field="file"`.
- `AudioEditor.tsx`: the "Audio file" `MediaField` gets `field="file"`.

`features/create/sections/SettingsSection.tsx`: the password `TextInput` gets `data-field="settings.password"`, the "Ends" `TextInput` gets `data-field="settings.endsAt"`, and the "Short link ending" `TextInput` gets `data-field="settings.slug"`.

- [ ] **Step 6: Make Show me open the tab, reveal and focus**

`features/create/EditorLayout.tsx`:

- imports: `useRef` joins the React import; add `import { flushSync } from "react-dom";` and `import { focusField } from "./focusField";`.
- after the `view` state:

```ts
  /** After "Show me", page errors show without waiting for each field to be left. */
  const [revealErrors, setRevealErrors] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  function showMe() {
    if (!problem) return;
    // Render the tab and the errors first, so the field is there to take focus.
    flushSync(() => {
      changeTab(problem.tab);
      setRevealErrors(true);
    });
    focusField(root.current, problem.tab, problem.field);
  }
```

- `editor` gains `revealErrors,`.
- `<TabGroup as="div" …>` gets `ref={root}`.
- `onShowMe={() => problem && changeTab(problem.tab)}` becomes `onShowMe={showMe}`.

- [ ] **Step 7: Run the tests to see them pass**

Run: `npx vitest run features/create features/pages features/generator`
Expected: PASS. Then `npm run typecheck && npx eslint features` — no errors.

- [ ] **Step 8: Commit**

```bash
git add features/create features/generator/content features/pages/editor
git commit -m "Show me opens the tab, shows the error and focuses the field"
```

---

### Task 6: Browser tests for the new flow

**Files:**
- Modify: `e2e/accounts/create.spec.ts`, `e2e/accounts/edit.spec.ts`, `e2e/accounts/app.spec.ts`, `e2e/accounts/phone-layout.spec.ts`

**Interfaces:**
- Consumes: the gallery, top bar region "Code", tabs and Show me from Tasks 2–5.

- [ ] **Step 1: Update `e2e/accounts/create.spec.ts`**

- `createButton` becomes `page.getByRole("region", { name: "Code" }).getByRole("button", { name: "Create code" })`.
- add `const openTab = (page: Page, name: string) => page.getByRole("tab", { name }).click();`.
- "creates a trackable, password-protected, scheduled code in one pass": `page.goto("codes/new?type=url")`; after filling "Website address", `await openTab(page, "Settings");` before the password and dates.
- "starts clean, and an unfinished code comes back only on Resume": use `codes/new?type=url` for both visits; `openTab(page, "Settings")` before filling and before checking the password; after the Resume part, add the gallery path:

```ts
    await page.goto("codes/new");
    await page.getByRole("link", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/codes\/new\?type=url&resume=1$/);
    await expect(page.getByLabel("Website address")).toHaveValue("https://example.com/draft");
```

  (place it before `await page.reload(); await page.getByRole("button", { name: "Discard" }).click();`, and make that reload go to `codes/new?type=url` so the editor's own banner offers Discard).
- "phones get full-size controls on the Create page": `page.goto("codes/new?type=url")`; the controls become the three tabs (`page.getByRole("tab")`, each ≥ 44px), the bottom bar's `Create` button, and, after `openTab(page, "QR code")`, "Reset to style".
- "a code started from a folder is created in that folder":

```ts
    await expect(page).toHaveURL(new RegExp(`/codes/new\\?folder=${makerFolderId}$`));
    await expect(page.getByRole("heading", { level: 1, name: "What do you want to make?" })).toBeVisible();
    await page.getByRole("link", { name: /^Text/ }).click();
    await expect(page).toHaveURL(new RegExp(`type=text&folder=${makerFolderId}$`));
    await page.getByLabel("Text", { exact: true }).fill("Doors open at 6");
    await page.getByLabel("Code name").fill("Door note");
    await openTab(page, "Settings");
    await expect(page.getByLabel("Folder", { exact: true })).toHaveValue(makerFolderId);
    await createButton(page).click();
```

- add:

```ts
  test("Show me takes you to what's missing", async ({ page }) => {
    await page.goto("codes/new?type=links");
    const bar = page.getByRole("region", { name: "Code" });
    await expect(bar.getByText("Add a title")).toBeVisible();
    await openTab(page, "QR code");
    await bar.getByRole("button", { name: "Show me" }).click();
    await expect(page.getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Title", { exact: true })).toBeFocused();
    await expect(page).toHaveURL(/#content$/);
  });
```

- [ ] **Step 2: Update `e2e/accounts/edit.spec.ts`**

- `createCode`: `page.goto("codes/new?type=url")`; the Create button is in the region "Code".
- `preview(page).getByRole("button", { name: "Save changes" | "Discard changes" })` → `page.getByRole("region", { name: "Code" }).getByRole(…)`.
- open the "QR code" tab before `/^Colors/`, and the "Settings" tab before "Ends" (both visits).
- "the old home-page edit address forwards to the editor": the heading check becomes `page.getByRole("heading", { level: 1, name: /^Edit / })`.

- [ ] **Step 3: Update `e2e/accounts/app.spec.ts` and `phone-layout.spec.ts`**

- `app.spec.ts` `PAGES`: keep `"codes/new"` (now the gallery) and add `"codes/new?type=links"` after it; the dark-mode axe loop adds `"codes/new?type=links"`.
- `phone-layout.spec.ts` `APP_PAGES`: keep `"codes/new"` and add `"codes/new?type=url"` and `"codes/new?type=links"`; the editor check becomes `if (path.startsWith("codes/new?") || path.endsWith("/edit"))`. The toast and landscape tests go to `codes/new?type=url`.

- [ ] **Step 4: Run every check**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all pass.

Run: `npm run test:e2e:accounts`
Expected: all projects pass (accounts and the six phones).

Run: `NEXT_PUBLIC_SITE_URL=http://localhost:4173 npm run build && npm run test:e2e`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add e2e
git commit -m "Browser tests: the gallery, the tabs, the top bar and Show me"
```
