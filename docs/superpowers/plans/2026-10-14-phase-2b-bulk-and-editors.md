# Phase 2b: In-App Bulk Create and Hosted-Page Editor Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in people turn a spreadsheet into codes saved in their account (or team), filed in a folder and trackable, at `/codes/bulk`. The public `/bulk` stays a download-only tool. The 1,004-line hosted-page editor is split into one component per page type, and every page's saved content stays exactly the same.

**Architecture:**
- **Shared bulk pieces** in `features/bulk/`: the list card, the check card and the ZIP helper. They serve two pages:
  - the public `BulkGenerator` (download only)
  - the new in-app `BulkCreatePage`, which always saves, can be trackable, picks a folder, and can resume after a partial failure.
- **API change:** `createCodes` now reports each saved batch, so a save that stops partway can create only the rest.
- **Editor split:** a script moves each editor out of `PageEditor.tsx` verbatim. Characterization tests that pass before and after prove nothing changed.

**Tech Stack:** Next.js 16.4 App Router, React 19.3, Tailwind 4.3, Headless UI 2.2, Supabase, Vitest 5 with Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md` (§3.2 routes, §4.7 component boundaries, §8 Phase 2, §10 "Hosted page editor split")

## Global Constraints

- **Wording:** plain, short, sentence case. Say "Trackable", not "dynamic". Buttons say what they do ("Create 3 codes", "Download ZIP").
- **Readability:** 13px minimum text, theme color tokens only, and 44px tap targets on phones (`min-h-11`).
- **Responsive:** every page is checked at 390, 820 and 1280px wide, with no sideways scroll and no axe violations.
- **Bulk design:** bulk codes use the classic default design (`DEFAULT_DESIGN`), never the last code's.
- **Hosted pages:** the split must keep each page type's saved `content` shape unchanged (§10).
- **Unchanged:** printed codes and links (`/r/<slug>`, `/p/<slug>`) never change. No feature is removed.
- **No migration** in this phase.
- **CI:** the jobs "Lint, test & build" and "Signed-in browser tests" must both pass.

## Review Focus

1. **A save stops partway** (network drop at row 120 of 300). The page says how many were created, and "Create the remaining N" creates only the rest, never duplicates. *Task 4, "when saving stops partway, it creates only the rest".*
2. **A trackable list has some rows that aren't web addresses** (`mailto:`, `tel:`). Those rows are flagged and left out, and the rest are created. The whole batch doesn't fail on the database check. *Task 2, "flags links that aren't web addresses and keeps the rest", and Task 4, "creates every ready row as a trackable link in the folder it was opened for".*
3. **A new folder is named, then creating fails and is retried.** Exactly one folder is made. *Task 4, "makes a new folder once, even when creating has to be retried".*
4. **A team viewer opens `/codes/bulk`.** They're sent to the codes they can see. *Task 6, "can't open bulk creation in a team they only view".*
5. **The editor split drops a field or changes a page's saved content.** It's caught before merge. *Task 1, "%s shows all of its fields" and "%s: editing a field changes only that field".*

## Rulings Made While Planning

Ledger each of these at setup.

1. **Public `/bulk` becomes download-only; saving moves to `/codes/bulk` (§3.2).** It shows signed-in people a link to `/codes/bulk`, rather than redirecting: `/bulk` stays a static public page (§3.2, "Unchanged"). Cost if wrong: someone who bookmarked `/bulk` clicks through once.
2. **In-app bulk always saves.** The ZIP is offered after creating, not forced. Cost if wrong: one extra click to download.
3. **Trackable starts on for lists of links,** matching the Create page. Cost if wrong: people who want static links turn it off.
4. **The editor is split by a script that moves code verbatim.** Characterization tests pass before and after, and typecheck and lint check the imports. Cost if wrong: none.

## File Structure

| File | Responsibility |
| --- | --- |
| `features/pages/editor/editors/*.tsx` | One editor per hosted-page type (12), plus `shared.tsx` (`EditorProps`, `Appearance`) |
| `features/pages/editor/PageEditor.tsx` | The dispatcher only: touched-state, error wiring, picking the type's editor |
| `features/pages/editor/PageEditor.test.tsx` | Characterization: every field shows, edits keep the content shape, one file per type |
| `lib/bulk/rows.ts` | `requireWebLinks`, `NOT_A_WEB_ADDRESS` |
| `features/codes/api.ts` | `createCodes(inputs, onProgress?(saved, batch))` |
| `features/bulk/zip.ts` | `ZipItem`, `ZIP_FORMATS`, `itemsFromCodes`, `itemsFromRows`, `indexCsv`, `downloadZip` |
| `features/bulk/BulkListCard.tsx`, `features/bulk/BulkCheckCard.tsx` | Step 1 (type, template, upload, paste) and step 2 (check table), shared by both pages |
| `features/bulk/BulkGenerator.tsx` | Public `/bulk`: download only, with a link to `/codes/bulk` |
| `features/bulk/BulkCreatePage.tsx`, `app/(app)/codes/bulk/page.tsx` | In-app bulk: save, trackable, folder, resume, then download |
| `components/app/nav.ts`, `CreateButton.tsx`, `app/(app)/codes/page.tsx` | `bulkCreateHref`; entry points to `/codes/bulk` keep the folder and team |
| `e2e/accounts/bulk.spec.ts`, `e2e/accounts/app.spec.ts` | Signed-in bulk create, viewer redirect, `/codes/bulk` in the page sweep |

---

### Task 1: Split the hosted-page editor, one component per type

**Files:**
- Create: `features/pages/editor/PageEditor.test.tsx`
- Create (by script): `features/pages/editor/editors/{Links,Vcard,Business,Menu,Coupon,Event,Feedback,Pdf,Images,Video,Audio,App}Editor.tsx`, `features/pages/editor/editors/shared.tsx`
- Modify (by script): `features/pages/editor/PageEditor.tsx` (keeps only `PageEditorProps` and `PageEditor`)

**Interfaces:**
- Consumes: `PageEditor` (unchanged signature: `{ type, page, errors, onChange }`), `PAGE_DEFAULTS`, the field primitives in `features/pages/editor/fields.tsx`.
- Produces: the same `PageEditor` export, now importing `./editors/<Type>Editor`. `editors/shared.tsx` exports `EditorProps<T>` and `Appearance`. No caller changes.

- [ ] **Step 1: Write the tests.** Create `features/pages/editor/PageEditor.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { PAGE_DEFAULTS } from "@/lib/pages/types";
import { PAGE_TYPE_IDS, type PageTypeId } from "@/lib/qr/types";

import { PageEditor } from "./PageEditor";

/** Every field each hosted-page form shows for a new page. Splitting the editor must keep them. */
const LABELS: Record<PageTypeId, string[]> = {
  links: ["Profile picture", "Title", "Bio"],
  vcard: [
    "Photo",
    "First name",
    "Last name",
    "Job title",
    "Company",
    "About",
    "Phone numbers",
    "Email addresses",
    "Website",
    "Address",
  ],
  business: [
    "Business name",
    "Tagline",
    "Logo",
    "Cover photo",
    "About",
    "Phone",
    "Email",
    "Website",
    "Address",
    "Show opening hours",
    "Buttons",
  ],
  menu: [
    "Restaurant name",
    "Currency",
    "Description",
    "Logo",
    "Sections",
    "Section name",
    "Dishes and drinks",
    "Name",
    "Price",
    "Tags",
    "Note",
  ],
  coupon: [
    "Business",
    "Offer",
    "Coupon code",
    "Headline",
    "Description",
    "Valid until",
    "Button text",
    "Button link",
    "Terms and conditions",
    "Image",
  ],
  event: [
    "Event name",
    "All-day event",
    "Starts",
    "Ends",
    "Location",
    "Description",
    "Organizer",
    "Ticket button text",
    "Ticket link",
    "Image",
  ],
  feedback: [
    "Business name",
    "Logo",
    "Question",
    "Ask for a comment",
    "Ask for contact details",
    "Thank-you message",
  ],
  pdf: ["PDF", "Title", "Description", "Open the PDF straight away"],
  images: ["Title", "Description"],
  video: ["Title", "Description"],
  audio: ["Audio file", "Or a link", "Title", "Artist", "Cover art", "Description"],
  app: ["App name", "Description", "App icon", "App Store link", "Google Play link", "Website"],
};

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("PageEditor", () => {
  it("keeps one editor file per hosted-page type", () => {
    const dir = resolve(process.cwd(), "features/pages/editor/editors");
    const editors = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith("Editor.tsx")) : [];
    expect(editors).toHaveLength(PAGE_TYPE_IDS.length);
  });

  it.each(PAGE_TYPE_IDS)("%s shows all of its fields", (type) => {
    render(<PageEditor type={type} page={PAGE_DEFAULTS[type]()} errors={{}} onChange={vi.fn()} />);
    const missing = LABELS[type].filter(
      (label) => screen.queryAllByText(new RegExp(`^${escape(label)}`)).length === 0,
    );
    expect(missing).toEqual([]);
    if (type === "video") {
      expect(screen.getByRole("radiogroup", { name: "Video source" })).toBeInTheDocument();
    }
  });

  it.each(PAGE_TYPE_IDS)("%s: editing a field changes only that field", (type) => {
    const onChange = vi.fn();
    const page = PAGE_DEFAULTS[type]() as unknown as Record<string, unknown>;
    render(<PageEditor type={type} page={PAGE_DEFAULTS[type]()} errors={{}} onChange={onChange} />);
    fireEvent.change(screen.getAllByRole("textbox")[0]!, { target: { value: "Q" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as Record<string, unknown>;
    expect(Object.keys(next).sort()).toEqual(Object.keys(page).sort());
    const changed = Object.keys(page).filter(
      (key) => JSON.stringify(next[key]) !== JSON.stringify(page[key]),
    );
    expect(changed).toHaveLength(1);
    expect(JSON.stringify(next[changed[0]!])).toContain("Q");
  });
});
```

- [ ] **Step 2: Run them.**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx`
Expected: the 24 characterization tests (12 "shows all of its fields", 12 "editing a field changes only that field") PASS against today's editor. "keeps one editor file per hosted-page type" FAILS: expected length 12, got 0. That failure is this task's RED.

- [ ] **Step 3: Split the editor.** Save this script outside the repo (for example, the session scratchpad) as `split_editor.py`. Run it from the repo root: `python3 <path>/split_editor.py`. It moves code verbatim and writes only the imports each file uses.

```python
"""Splits features/pages/editor/PageEditor.tsx into one file per hosted-page type.

Moves code verbatim. Each editor goes to features/pages/editor/editors/<Name>.tsx with only
the imports it uses; EditorProps and Appearance go to editors/shared.tsx; PageEditor.tsx keeps
the dispatcher and imports the editors.
"""
import pathlib, re

SRC = pathlib.Path("features/pages/editor/PageEditor.tsx")
OUT = pathlib.Path("features/pages/editor/editors")
lines = SRC.read_text().split("\n")
top = [i for i, l in enumerate(lines) if re.match(r"^(function|interface|export function) ", l)]

def block(start):
    nxt = [i for i in top if i > start]
    end = nxt[0] if nxt else len(lines)
    return "\n".join(lines[start:end]).rstrip("\n") + "\n"

names = {}
for i in top:
    m = re.match(r"^(?:export )?(?:function|interface) (\w+)", lines[i])
    names[m.group(1)] = i

PAGE_TYPES_IMPORTS = ["LIMITS", "AppPage", "AudioPage", "BusinessPage", "CouponPage", "EventPage",
                      "FeedbackPage", "ImagesPage", "LinksPage", "MenuPage", "PdfPage", "VcardPage", "VideoPage"]
FIELD_IMPORTS = ["AccentField", "AreaField", "HoursField", "ImagesField", "LinksField", "ListField",
                 "MediaField", "SocialsField", "TextField", "TimeZoneField", "ToggleField", "ErrorsApi"]
VALUE_TYPES = {"ErrorsApi", "EditorProps"} | {n for n in PAGE_TYPES_IMPORTS if n != "LIMITS"}

def used(code, ident):
    return re.search(rf"\b{ident}\b", code) is not None

def imports_for(code, shared_names):
    out = ['"use client";', ""]
    hooks = [h for h in ["useCallback", "useEffect", "useMemo", "useState"] if used(code, h)]
    if hooks:
        out.append(f'import {{ {", ".join(hooks)} }} from "react";')
        out.append("")
    if used(code, "SegmentedControl"):
        out.append('import { SegmentedControl } from "@/components/ui/SegmentedControl";')
    pt = [n for n in PAGE_TYPES_IMPORTS if used(code, n)]
    if pt:
        spec = ", ".join(("type " + n) if n in VALUE_TYPES else n for n in pt)
        out.append(f'import {{ {spec} }} from "@/lib/pages/types";')
    out.append("")
    fi = [n for n in FIELD_IMPORTS if used(code, n)]
    if fi:
        spec = ", ".join(("type " + n) if n in VALUE_TYPES else n for n in fi)
        out.append(f'import {{ {spec} }} from "../fields";')
    sh = [n for n in shared_names if used(code, n)]
    if sh:
        spec = ", ".join(("type " + n) if n in VALUE_TYPES else n for n in sh)
        out.append(f'import {{ {spec} }} from "./shared";')
    return "\n".join(out).rstrip("\n") + "\n\n"

OUT.mkdir(exist_ok=True)
shared_code = block(names["EditorProps"]) + "\n" + block(names["Appearance"])
shared_code = shared_code.replace("interface EditorProps<T>", "export interface EditorProps<T>", 1)
shared_code = shared_code.replace("function Appearance(", "export function Appearance(", 1)
(OUT / "shared.tsx").write_text(imports_for(shared_code, []) + shared_code)

editors = [n for n in names if n.endswith("Editor") and n != "PageEditor"]
for name in editors:
    code = block(names[name]).replace(f"function {name}(", f"export function {name}(", 1)
    (OUT / f"{name}.tsx").write_text(imports_for(code, ["Appearance", "EditorProps"]) + code)

head_end = names["EditorProps"]
rest = "\n".join(lines[names["PageEditorProps"]:])
editor_imports = "\n".join(f'import {{ {n} }} from "./editors/{n}";' for n in sorted(editors))
page_types = [n for n in PAGE_TYPES_IMPORTS if used(rest, n)] + ["PageContentMap"]
header = ['"use client";', "", 'import { useCallback, useMemo, useState } from "react";', "",
          "import {", *[f"  type {n}," for n in page_types], '} from "@/lib/pages/types";',
          'import type { PageErrors } from "@/lib/pages/validate";',
          'import type { PageTypeId } from "@/lib/qr/types";', "",
          editor_imports,
          'import type { ErrorsApi } from "./fields";', ""]
SRC.write_text("\n".join(header) + "\n" + rest)
print("editors:", len(editors), "->", ", ".join(editors))
```

Then run `npx prettier --write features/pages/editor`.

- [ ] **Step 4: Run the tests, typecheck and lint.**

Run: `npx vitest run features/pages/editor features/generator && npm run typecheck && npx eslint features/pages`
Expected:
- all 25 editor tests pass, and the generator tests pass
- typecheck and lint exit 0
- `wc -l features/pages/editor/PageEditor.tsx` is under 200.

- [ ] **Step 5: Commit.** Don't commit the script.

```bash
git add features/pages/editor
git commit -m "Split the hosted-page editor into one component per type"
```

### Task 2: Bulk building blocks: web-only rows, batch reports, the ZIP helper

**Files:**
- Modify: `lib/bulk/rows.ts`, `lib/bulk/rows.test.ts`
- Modify: `features/codes/api.ts`, `features/codes/api.test.ts`
- Create: `features/bulk/zip.ts`, `features/bulk/zip.test.ts`

**Interfaces:**
- Consumes: `parseBulk`, `BulkRow`; `codeRenderOptions`, `codePayload`; `csvField`; `saveBlob`; `shortLink`; `uniqueFilenames`, `zipCodes` (`lib/qr/zip`).
- Produces:
  ```ts
  // lib/bulk/rows.ts
  export const NOT_A_WEB_ADDRESS: string   // "Trackable links need a web address (http or https)"
  export function requireWebLinks(rows: BulkRow[]): BulkRow[]
  // features/codes/api.ts — the callback now also gets the rows each batch saved
  export async function createCodes(inputs: NewCode[], onProgress?: (saved: number, batch: QrCodeRow[]) => void): Promise<Result<QrCodeRow[]>>
  // features/bulk/zip.ts
  export const ZIP_FORMATS: { value: ExportFormat; label: string }[]
  export interface ZipItem { label: string; options: RenderOptions; content: string; shortLink: string }
  export function itemsFromRows(rows: BulkRow[]): ZipItem[]
  export function itemsFromCodes(codes: QrCodeRow[]): ZipItem[]
  export function indexCsv(items: ZipItem[], names: string[]): string
  export async function downloadZip(items: ZipItem[], format: ExportFormat, filename: string, onProgress?: (done: number) => void): Promise<void>
  ```

- [ ] **Step 1: Write the failing tests.**

Append to `lib/bulk/rows.test.ts`. Add `NOT_A_WEB_ADDRESS`, `requireWebLinks` and `parseBulk` to its import from `./rows` if they aren't there yet.

```ts
describe("requireWebLinks", () => {
  it("flags links that aren't web addresses and keeps the rest", () => {
    const { rows } = parseBulk(
      "url",
      "name,url\nMenu,example.com/menu\nMail,mailto:hi@example.com\nBad,not a link",
      "M",
    );
    const checked = requireWebLinks(rows);
    expect(checked[0]!.error).toBeNull();
    expect(checked[1]!.error).toBe(NOT_A_WEB_ADDRESS);
    // A row that already needs fixing keeps its own reason.
    expect(checked[2]!.error).toBe(rows[2]!.error);
    expect(checked[2]!.error).not.toBeNull();
  });
});
```

In `features/codes/api.test.ts`, change the client mock so it also has `from`:

```ts
const rpc = vi.fn();
const from = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ getBrowserSupabase: () => ({ rpc, from }) }));
```

Add `createCodes` to the import from `./api`, add `from.mockReset();` to the `beforeEach`, and append:

```ts
describe("createCodes", () => {
  it("reports each saved batch, so a save that stops partway can resume with the rest", async () => {
    const insert = vi.fn((rows: { name: string }[]) => ({
      select: async () => ({
        data: rows.map((row) => ({ id: `id-${row.name}`, name: row.name })),
        error: null,
      }),
    }));
    from.mockReturnValue({ insert });
    const inputs = Array.from({ length: 150 }, (_, i) => ({ ...base, name: `Code ${i + 1}` }));
    const onProgress = vi.fn();
    const result = await createCodes(inputs, onProgress);
    expect(result.ok && result.value).toHaveLength(150);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0]![0]).toBe(100);
    expect(onProgress.mock.calls[0]![1]).toHaveLength(100);
    expect(onProgress.mock.calls[1]![0]).toBe(150);
    expect(onProgress.mock.calls[1]![1]).toHaveLength(50);
    expect(onProgress.mock.calls[1]![1][0]).toMatchObject({ name: "Code 101" });
  });
});
```

Create `features/bulk/zip.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import { shortLink } from "@/lib/env";
import type { QrCodeRow } from "@/types/supabase";

import { indexCsv, itemsFromCodes, itemsFromRows } from "./zip";

const code = (overrides: Record<string, unknown>) =>
  ({
    id: "c1",
    user_id: "u1",
    name: "Menu",
    qr_type: "url",
    content: { url: "https://example.com/menu" },
    design: {},
    is_dynamic: false,
    slug: null,
    destination: null,
    status: "active",
    ...overrides,
  }) as unknown as QrCodeRow;

describe("bulk ZIP", () => {
  it("lists each file with its code's name, what it opens and its short link", () => {
    const options = { ...DEFAULT_DESIGN, data: "x", size: 64 };
    const items = [
      { label: "Menu", options, content: "https://example.com/menu", shortLink: "https://qr.example/r/ABC" },
      { label: "Guest, Wi-Fi", options, content: "WIFI:S:Guest;;", shortLink: "" },
    ];
    expect(indexCsv(items, ["menu.png", "guest-wi-fi.png"])).toBe(
      'file,name,content,short_link\r\nmenu.png,Menu,https://example.com/menu,https://qr.example/r/ABC\r\nguest-wi-fi.png,"Guest, Wi-Fi",WIFI:S:Guest;;,',
    );
  });

  it("uses a saved trackable code's destination and short link", () => {
    const [item] = itemsFromCodes([
      code({ is_dynamic: true, slug: "ABC123", destination: "https://example.com/menu" }),
    ]);
    expect(item).toMatchObject({
      label: "Menu",
      content: "https://example.com/menu",
      shortLink: shortLink("ABC123"),
    });
    expect(item!.options.data).not.toBe("");
  });

  it("encodes rows from a list directly, in the classic design", () => {
    const [item] = itemsFromRows([
      { line: 2, name: "Menu", values: { url: "https://example.com/menu" }, payload: "https://example.com/menu", error: null },
    ]);
    expect(item).toMatchObject({ label: "Menu", content: "https://example.com/menu", shortLink: "" });
    expect(item!.options).toMatchObject({ ...DEFAULT_DESIGN, data: "https://example.com/menu", size: 1024 });
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run lib/bulk features/codes/api.test.ts features/bulk/zip.test.ts`
Expected:
- FAIL: `requireWebLinks` is not exported.
- FAIL: `createCodes` reports `(100)` without a batch (`calls[0][1]` is undefined).
- FAIL: `./zip` can't be resolved.

- [ ] **Step 3: Implement.**

In `lib/bulk/rows.ts`, append:

```ts
/** Trackable links redirect, so they can only open web pages (the database checks this too). */
export const NOT_A_WEB_ADDRESS = "Trackable links need a web address (http or https)";

/** Marks rows whose link isn't a web address, for lists saved as trackable links. */
export function requireWebLinks(rows: BulkRow[]): BulkRow[] {
  return rows.map((row) =>
    row.error || /^https?:\/\//i.test(row.payload) ? row : { ...row, error: NOT_A_WEB_ADDRESS },
  );
}
```

In `features/codes/api.ts`, change `createCodes`:
- The signature becomes `onProgress?: (saved: number, batch: QrCodeRow[]) => void`.
- `onProgress?.(saved.length);` becomes `onProgress?.(saved.length, rows);`.
- Update the doc comment: "Reports the running total and the rows each batch saved, so a caller can resume after a failure with the rows that weren't saved."

Create `features/bulk/zip.ts`:

```ts
import { codePayload, codeRenderOptions } from "@/features/dashboard/codeRender";
import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import { csvField } from "@/lib/analytics/shape";
import type { BulkRow } from "@/lib/bulk/rows";
import { saveBlob } from "@/lib/download";
import { shortLink } from "@/lib/env";
import type { RenderOptions } from "@/lib/qr/renderer";
import type { ExportFormat } from "@/lib/qr/types";
import type { QrCodeRow } from "@/types/supabase";

/** Image formats offered for a bulk ZIP. */
export const ZIP_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "svg", label: "SVG (vector)" },
  { value: "pdf", label: "PDF (vector)" },
  { value: "eps", label: "EPS (vector)" },
  { value: "jpeg", label: "JPG" },
];

const ZIP_SIZE = 1024;

/** One code in a bulk ZIP, plus its line in index.csv. */
export interface ZipItem {
  label: string;
  options: RenderOptions;
  /** What the code opens. */
  content: string;
  /** The short link of a trackable code, or "". */
  shortLink: string;
}

/** Codes straight from a list (nothing saved): the classic design and the row's content. */
export function itemsFromRows(rows: BulkRow[]): ZipItem[] {
  return rows.map((row) => ({
    label: row.name,
    options: { ...DEFAULT_DESIGN, data: row.payload, size: ZIP_SIZE },
    content: row.payload,
    shortLink: "",
  }));
}

/** Saved codes: their own design, and the short link for trackable ones. */
export function itemsFromCodes(codes: QrCodeRow[]): ZipItem[] {
  return codes.map((code) => ({
    label: code.name,
    options: codeRenderOptions(code, ZIP_SIZE),
    content: code.is_dynamic ? (code.destination ?? "") : codePayload(code),
    shortLink: code.is_dynamic && code.slug ? shortLink(code.slug) : "",
  }));
}

/** index.csv, which travels with the images: which file is which code. */
export function indexCsv(items: ZipItem[], names: string[]): string {
  return [
    ["file", "name", "content", "short_link"],
    ...items.map((item, i) => [names[i]!, item.label, item.content, item.shortLink]),
  ]
    .map((row) => row.map((cell) => csvField(cell)).join(","))
    .join("\r\n");
}

/** Renders every code into one ZIP with index.csv and downloads it. Throws if it can't. */
export async function downloadZip(
  items: ZipItem[],
  format: ExportFormat,
  filename: string,
  onProgress?: (done: number) => void,
): Promise<void> {
  const { uniqueFilenames, zipCodes } = await import("@/lib/qr/zip");
  const names = uniqueFilenames(
    items.map((item) => item.label),
    format,
  );
  const blob = await zipCodes(
    items.map(({ label, options }) => ({ label, options })),
    format,
    onProgress,
    { "index.csv": indexCsv(items, names) },
  );
  saveBlob(blob, filename);
}
```

- [ ] **Step 4: Run them to see them pass.**

Run: `npx vitest run lib/bulk features/codes features/bulk && npm run typecheck`
Expected: all pass; typecheck exits 0. `BulkGenerator.tsx` still calls `createCodes(inputs, (count) => …)`, and the extra parameter is compatible.

- [ ] **Step 5: Commit.**

```bash
git add lib/bulk features/codes features/bulk/zip.ts features/bulk/zip.test.ts
git commit -m "Add bulk building blocks: web-only rows, batch reports and the ZIP helper"
```

### Task 3: Shared list and check cards; public `/bulk` becomes download-only

**Files:**
- Create: `features/bulk/BulkListCard.tsx`, `features/bulk/BulkCheckCard.tsx`
- Modify: `features/bulk/BulkGenerator.tsx` (rewrite)
- Create: `features/bulk/BulkGenerator.test.tsx`

**Interfaces:**
- Consumes: `parseBulk`, `BulkResult`, `BulkRow`, `bulkColumns`, `templateCsv`, `MAX_BULK_ROWS`; `downloadZip`, `itemsFromRows`, `ZIP_FORMATS` (Task 2).
- Produces:
  ```ts
  BulkListCard({ type: QrTypeId; onTypeChange: (type: QrTypeId) => void; text: string; onTextChange: (text: string) => void })
  BulkCheckCard({ result: BulkResult; rows: BulkRow[] })   // rows may carry extra errors (e.g. requireWebLinks)
  BulkGenerator()   // public, download only
  ```
  Labels: "Type of code", "CSV template", "Upload CSV", "CSV", "Codes from your list" (table region). The check card's description is "<n> ready." or "<n> ready, <m> need fixing.".

- [ ] **Step 1: Write the failing tests.** Create `features/bulk/BulkGenerator.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type * as Env from "@/lib/env";

import { BulkGenerator } from "./BulkGenerator";
import type * as Zip from "./zip";
import { downloadZip } from "./zip";

let user: { id: string } | null = null;
vi.mock("@/features/auth/useSession", () => ({ useSession: () => ({ user, loading: false }) }));
vi.mock("@/lib/env", async (original) => ({ ...(await original<typeof Env>()), accountsEnabled: true }));
// QR drawing needs a canvas, which jsdom does not have.
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("./zip", async (original) => ({ ...(await original<typeof Zip>()), downloadZip: vi.fn() }));

const renderBulk = () =>
  render(
    <ToastProvider>
      <BulkGenerator />
    </ToastProvider>,
  );

beforeEach(() => {
  user = null;
  vi.mocked(downloadZip).mockReset();
});

describe("BulkGenerator (public)", () => {
  it("checks a pasted list and downloads it, without saving anything", async () => {
    user = { id: "u1" };
    renderBulk();
    fireEvent.change(screen.getByLabelText("CSV"), {
      target: { value: "name,url\nMenu,example.com/menu\nBad,not a link" },
    });
    expect(screen.getByText("1 ready, 1 need fixing.")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Download 1 code" }));
    await waitFor(() =>
      expect(downloadZip).toHaveBeenCalledWith(
        [expect.objectContaining({ label: "Menu", content: "https://example.com/menu" })],
        "png",
        "quickqreate-url-codes.zip",
        expect.any(Function),
      ),
    );
  });

  it("points signed-in people to bulk create in their codes", () => {
    user = { id: "u1" };
    renderBulk();
    expect(screen.getByRole("link", { name: "Create them in your codes" })).toHaveAttribute(
      "href",
      "/codes/bulk",
    );
  });

  it("asks everyone else to sign in to save", () => {
    renderBulk();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=/codes/bulk",
    );
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/bulk/BulkGenerator.test.tsx`
Expected: FAIL.
- The signed-in render still has the "Also save to my codes" switch.
- There is no "Create them in your codes" link.
- The sign-in link still points to `/login?next=/bulk`.
- The old inline ZIP code never calls `downloadZip`.

- [ ] **Step 3: Create `features/bulk/BulkListCard.tsx`.**

```tsx
"use client";

import { Download, FileUp } from "lucide-react";
import { useId, useState } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select, Textarea } from "@/components/ui/inputs";
import { bulkColumns, MAX_BULK_ROWS, templateCsv } from "@/lib/bulk/rows";
import { saveBlob } from "@/lib/download";
import { codeTypeInfo } from "@/lib/qr/code-types";
import { QR_TYPE_IDS, type QrTypeId } from "@/lib/qr/types";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Step 1 of bulk creation: pick a type, then upload or paste a spreadsheet. */
export function BulkListCard({
  type,
  onTypeChange,
  text,
  onTextChange,
}: {
  type: QrTypeId;
  onTypeChange: (type: QrTypeId) => void;
  text: string;
  onTextChange: (text: string) => void;
}) {
  const fileId = useId();
  const [fileError, setFileError] = useState("");

  function downloadTemplate() {
    saveBlob(
      new Blob([templateCsv(type)], { type: "text/csv;charset=utf-8" }),
      `quickqreate-${type}-template.csv`,
    );
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setFileError("");
    if (file.size > MAX_FILE_BYTES) return setFileError("That file is over 2 MB.");
    try {
      onTextChange(await file.text());
    } catch {
      setFileError("That file couldn’t be read.");
    }
  }

  return (
    <Card aria-labelledby="bulk-list">
      <CardHeader
        id="bulk-list"
        step={1}
        title="Your list"
        description={`One code per row, up to ${MAX_BULK_ROWS}. Export from Excel, Google Sheets or Numbers as CSV, or paste the cells.`}
      />
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Type of code">
            {(control) => (
              <Select
                {...control}
                value={type}
                onChange={(event) => onTypeChange(event.target.value as QrTypeId)}
              >
                {QR_TYPE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {codeTypeInfo(id).label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download aria-hidden /> CSV template
          </Button>
        </div>
        <p className="text-sm text-fg-muted">
          Columns:{" "}
          {bulkColumns(type).map((column, i) => (
            <span key={column}>
              {i > 0 && ", "}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs text-fg">
                {column}
              </code>
            </span>
          ))}
          . Only the ones you need; extra columns are ignored.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={fileId} className={`${buttonClasses("secondary", "md")} cursor-pointer`}>
            <FileUp aria-hidden /> Upload CSV
          </label>
          <input
            id={fileId}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            className="sr-only"
            onChange={(event) => {
              void readFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <span className="text-sm text-fg-muted">or paste below</span>
        </div>
        {fileError && <p className="text-sm text-danger">{fileError}</p>}
        <Field label="CSV">
          {(control) => (
            <Textarea
              {...control}
              rows={8}
              spellCheck={false}
              className="font-mono text-sm"
              placeholder={templateCsv(type)}
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
            />
          )}
        </Field>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create `features/bulk/BulkCheckCard.tsx`.**

```tsx
"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/Card";
import { MAX_BULK_ROWS, type BulkResult, type BulkRow } from "@/lib/bulk/rows";

const PREVIEW_ROWS = 100;

/** Step 2: which rows are ready and which need fixing (with why). */
export function BulkCheckCard({ result, rows }: { result: BulkResult; rows: BulkRow[] }) {
  const ready = rows.filter((row) => !row.error).length;
  const invalid = rows.length - ready;
  return (
    <Card aria-labelledby="bulk-check">
      <CardHeader
        id="bulk-check"
        step={2}
        title="Check your codes"
        description={
          result.error ? undefined : `${ready} ready${invalid ? `, ${invalid} need fixing` : ""}.`
        }
      />
      <div className="flex flex-col gap-3 px-5 pt-4 pb-6 sm:px-6">
        {result.error ? (
          <p className="flex items-start gap-2 rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {result.error}
          </p>
        ) : (
          <>
            {(result.ignored.length > 0 || result.skipped > 0) && (
              <p className="text-sm text-fg-muted">
                {result.ignored.length > 0 && `Ignored columns: ${result.ignored.join(", ")}. `}
                {result.skipped > 0 &&
                  `Only the first ${MAX_BULK_ROWS} rows are used; ${result.skipped} more were left out.`}
              </p>
            )}
            <div
              role="region"
              aria-label="Codes from your list"
              tabIndex={0}
              className="max-h-96 overflow-auto rounded-control border border-border focus-ring"
            >
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-surface-2 text-fg">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Row</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, PREVIEW_ROWS).map((row) => (
                    <tr key={row.line} className="border-t border-border align-top">
                      <td className="px-3 py-2 text-fg-muted tabular-nums">{row.line}</td>
                      <td className="max-w-56 truncate px-3 py-2 text-fg">{row.name}</td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <span className="flex items-start gap-1.5 text-danger">
                            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                            {row.error}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-success">
                            <CheckCircle2 aria-hidden className="size-4 shrink-0" />
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > PREVIEW_ROWS && (
              <p className="text-sm text-fg-muted">
                Showing the first {PREVIEW_ROWS} of {rows.length} rows.
              </p>
            )}
            {invalid > 0 && (
              <p className="text-sm text-fg-muted">
                Rows that need fixing are left out. Fix them in your file and upload it again.
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Rewrite `features/bulk/BulkGenerator.tsx`** (public, download only):

```tsx
"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/features/auth/useSession";
import { QrTile } from "@/features/generator/preview/QrTile";
import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import { parseBulk } from "@/lib/bulk/rows";
import { accountsEnabled } from "@/lib/env";
import type { ExportFormat, QrTypeId } from "@/lib/qr/types";

import { BulkCheckCard } from "./BulkCheckCard";
import { BulkListCard } from "./BulkListCard";
import { downloadZip, itemsFromRows, ZIP_FORMATS } from "./zip";

const linkClass = "font-medium text-link underline-offset-4 hover:underline";

/** The public bulk tool: one QR code per spreadsheet row, downloaded together as a ZIP. */
export function BulkGenerator() {
  const toast = useToast();
  const { user } = useSession();
  const [type, setType] = useState<QrTypeId>("url");
  const [text, setText] = useState("");
  const [format, setFormat] = useState<ExportFormat>("png");
  const [progress, setProgress] = useState<string | null>(null);

  const result = useMemo(
    () => (text.trim() ? parseBulk(type, text, DEFAULT_DESIGN.errorCorrection) : null),
    [type, text],
  );
  const valid = result?.rows.filter((row) => !row.error) ?? [];
  const preview = valid[0];

  async function run() {
    if (!valid.length || progress) return;
    setProgress(`Preparing 0 of ${valid.length}…`);
    try {
      await downloadZip(itemsFromRows(valid), format, `quickqreate-${type}-codes.zip`, (done) =>
        setProgress(`Preparing ${done} of ${valid.length}…`),
      );
      toast(`Downloaded ${valid.length} ${valid.length === 1 ? "code" : "codes"}`);
    } catch {
      toast("The ZIP file couldn’t be made. Please try again.", "error");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <BulkListCard type={type} onTypeChange={setType} text={text} onTextChange={setText} />
        {result && <BulkCheckCard result={result} rows={result.rows} />}
      </div>

      <aside className="lg:sticky lg:top-24">
        <Card aria-labelledby="bulk-download">
          <CardHeader id="bulk-download" step={result ? 3 : 2} title="Download" />
          <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
            <div className="flex items-center gap-4">
              <QrTile
                compact
                options={{ ...DEFAULT_DESIGN, data: preview?.payload ?? "", size: 256 }}
                summary={preview?.name ?? ""}
                emptyHint=""
                resolution={192}
                className="size-24 shrink-0"
              />
              <p className="text-sm text-fg-muted">
                Every code uses the classic black-and-white design, which scans most reliably.
              </p>
            </div>
            <Field label="File format">
              {(control) => (
                <Select
                  {...control}
                  value={format}
                  onChange={(event) => setFormat(event.target.value as ExportFormat)}
                >
                  {ZIP_FORMATS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button size="lg" disabled={!valid.length || progress !== null} onClick={() => void run()}>
              <Download aria-hidden />
              {progress ??
                (valid.length
                  ? `Download ${valid.length} ${valid.length === 1 ? "code" : "codes"}`
                  : "Download ZIP")}
            </Button>
            {accountsEnabled && (
              <p className="text-sm text-fg-muted">
                {user ? (
                  <>
                    Want them in your account, with folders and tracking?{" "}
                    <Link href="/codes/bulk" className={linkClass}>
                      Create them in your codes
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    <Link href="/login?next=/codes/bulk" className={linkClass}>
                      Sign in
                    </Link>{" "}
                    to save them to your account, with folders and tracking.
                  </>
                )}
              </p>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
```

- [ ] **Step 6: Run the tests to see them pass.**

Run: `npx vitest run features/bulk && npm run lint && npm run typecheck && npm run build && npm run test:e2e -- e2e/bulk.spec.ts`
Expected:
- the 3 new tests and the zip tests pass
- lint and typecheck exit 0
- the public bulk browser tests pass (ZIP download, Wi-Fi tabs, and axe in both themes); they run with accounts off.

- [ ] **Step 7: Commit.**

```bash
git add features/bulk
git commit -m "Share the bulk list and check cards; public bulk downloads only"
```

### Task 4: `/codes/bulk`, bulk creation inside the app

**Files:**
- Create: `features/bulk/BulkCreatePage.tsx`, `features/bulk/BulkCreatePage.test.tsx`
- Create: `app/(app)/codes/bulk/page.tsx`

**Interfaces:**
- Consumes:
  - `BulkListCard`, `BulkCheckCard` (Task 3)
  - `requireWebLinks`, `createCodes(…, onProgress(saved, batch))`, `downloadZip`, `itemsFromCodes`, `ZIP_FORMATS` (Task 2)
  - `createFolder`, `MAX_FOLDER_NAME`; `withWorkspace`; `requireUser`; `workspaceLabel`
- Produces:
  ```ts
  interface BulkCreatePageProps { ownerId: string; teamId: string | null; workspaceLabel: string | null; folders: FolderRow[]; initialFolderId: string | null }
  export function BulkCreatePage(props: BulkCreatePageProps): JSX.Element
  ```
  - The route is `/codes/bulk?folder=&workspace=`. Viewers are redirected to `/codes?workspace=<owner>`.
  - Labels:
    - "Trackable" (switch, links only), "Folder", "New folder name", "File format"
    - buttons "Create <n> code(s)", "Create the remaining <n>", "Download ZIP"
    - link "Open <folder name>" or "Open your codes".

- [ ] **Step 1: Write the failing tests.** Create `features/bulk/BulkCreatePage.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type * as CodesApi from "@/features/codes/api";
import { createCodes, type NewCode, type Result } from "@/features/codes/api";
import type * as FoldersApi from "@/features/folders/api";
import { createFolder } from "@/features/folders/api";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { BulkCreatePage, type BulkCreatePageProps } from "./BulkCreatePage";
import type * as Zip from "./zip";
import { downloadZip } from "./zip";

vi.mock("@/features/codes/api", async (original) => ({
  ...(await original<typeof CodesApi>()),
  createCodes: vi.fn(),
}));
vi.mock("@/features/folders/api", async (original) => ({
  ...(await original<typeof FoldersApi>()),
  createFolder: vi.fn(),
}));
vi.mock("./zip", async (original) => ({ ...(await original<typeof Zip>()), downloadZip: vi.fn() }));

const FOLDERS = [{ id: "f1", name: "Flyers" }] as FolderRow[];
const LINKS = "name,url\nMenu,https://example.com/menu\nMail,mailto:hi@example.com";

/** What the database hands back for each saved input. */
const rowsFor = (inputs: NewCode[]) =>
  inputs.map(
    (input) =>
      ({
        id: `id-${input.name}`,
        name: input.name,
        qr_type: input.qrType,
        content: input.content,
        design: {},
        is_dynamic: Boolean(input.dynamic),
        slug: input.dynamic ? "ABC123" : null,
        destination: input.dynamic?.destination ?? null,
      }) as unknown as QrCodeRow,
  );

/** createCodes that saves everything and reports it as one batch. */
function savesAll() {
  vi.mocked(createCodes).mockImplementation(async (inputs, onProgress) => {
    const rows = rowsFor(inputs);
    onProgress?.(rows.length, rows);
    return { ok: true, value: rows };
  });
}

function renderPage(props: Partial<BulkCreatePageProps> = {}) {
  return render(
    <ToastProvider>
      <BulkCreatePage
        ownerId="u1"
        teamId={null}
        workspaceLabel={null}
        folders={FOLDERS}
        initialFolderId={null}
        {...props}
      />
    </ToastProvider>,
  );
}

const paste = (csv: string) =>
  fireEvent.change(screen.getByLabelText("CSV"), { target: { value: csv } });

beforeEach(() => {
  vi.mocked(createCodes).mockReset();
  vi.mocked(createFolder).mockReset();
  vi.mocked(downloadZip).mockReset();
});

describe("BulkCreatePage", () => {
  it("creates every ready row as a trackable link in the folder it was opened for", async () => {
    const user = userEvent.setup();
    savesAll();
    renderPage({ initialFolderId: "f1" });
    paste(LINKS);
    expect(screen.getByText("1 ready, 1 need fixing.")).toBeInTheDocument();
    expect(
      screen.getByText("Trackable links need a web address (http or https)"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    expect(createCodes).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          name: "Menu",
          folderId: "f1",
          qrType: "url",
          dynamic: { destination: "https://example.com/menu" },
        }),
      ],
      expect.any(Function),
    );
    expect(await screen.findByText(/Created 1 code in Flyers/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Flyers" })).toHaveAttribute(
      "href",
      "/codes?folder=f1",
    );
  });

  it("creates a static list when tracking is off", async () => {
    const user = userEvent.setup();
    savesAll();
    renderPage();
    paste(LINKS);
    await user.click(screen.getByRole("switch", { name: /Trackable/ }));
    expect(screen.getByText("2 ready.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create 2 codes" }));
    const inputs = vi.mocked(createCodes).mock.calls[0]![0];
    expect(inputs.map((input) => input.dynamic)).toEqual([undefined, undefined]);
    expect(inputs.map((input) => input.folderId)).toEqual([null, null]);
  });

  it("creates in the team it was opened for", async () => {
    const user = userEvent.setup();
    savesAll();
    renderPage({ ownerId: "t1", teamId: "t1", workspaceLabel: "Cafe team" });
    expect(screen.getByText("Saving to Cafe team’s codes")).toBeInTheDocument();
    paste("name,url\nMenu,https://example.com/menu");
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    expect(vi.mocked(createCodes).mock.calls[0]![0][0]).toMatchObject({ ownerId: "t1" });
    expect(await screen.findByRole("link", { name: "Open your codes" })).toHaveAttribute(
      "href",
      "/codes?workspace=t1",
    );
  });

  it("when saving stops partway, it creates only the rest", async () => {
    const user = userEvent.setup();
    const csv = [
      "name,url",
      ...Array.from({ length: 150 }, (_, i) => `Row ${i + 1},https://example.com/${i + 1}`),
    ].join("\n");
    vi.mocked(createCodes).mockImplementationOnce(async (inputs, onProgress) => {
      onProgress?.(100, rowsFor(inputs.slice(0, 100)));
      return {
        ok: false,
        error: "Saved 100 codes, then something went wrong. Please try the rest again.",
      };
    });
    renderPage();
    paste(csv);
    await user.click(screen.getByRole("button", { name: "Create 150 codes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Created 100 of 150 codes. The other 50 weren’t created.",
    );
    savesAll();
    await user.click(screen.getByRole("button", { name: "Create the remaining 50" }));
    const retry = vi.mocked(createCodes).mock.calls[1]![0];
    expect(retry).toHaveLength(50);
    expect(retry[0]).toMatchObject({ name: "Row 101" });
    expect(await screen.findByText(/Created 150 codes/)).toBeInTheDocument();
  });

  it("makes a new folder once, even when creating has to be retried", async () => {
    const user = userEvent.setup();
    vi.mocked(createFolder).mockResolvedValue({
      ok: true,
      value: { id: "f9", name: "Spring" } as FolderRow,
    });
    vi.mocked(createCodes).mockResolvedValueOnce({
      ok: false,
      error: "The codes couldn't be saved. Please try again.",
    });
    renderPage();
    paste("name,url\nMenu,https://example.com/menu");
    await user.selectOptions(screen.getByLabelText("Folder"), "__new__");
    await user.type(screen.getByLabelText("New folder name"), "Spring");
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    savesAll();
    await user.click(await screen.findByRole("button", { name: "Create the remaining 1" }));
    expect(createFolder).toHaveBeenCalledTimes(1);
    expect(createFolder).toHaveBeenCalledWith("u1", "Spring");
    expect(vi.mocked(createCodes).mock.calls[1]![0][0]).toMatchObject({ folderId: "f9" });
    expect(await screen.findByText(/Created 1 code in Spring/)).toBeInTheDocument();
  });

  it("creates only once when Create is pressed twice", async () => {
    const user = userEvent.setup();
    let finish!: (value: Result<QrCodeRow[]>) => void;
    vi.mocked(createCodes).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPage();
    paste("name,url\nMenu,https://example.com/menu");
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    await user.click(screen.getByRole("button", { name: /Creating/ }));
    expect(createCodes).toHaveBeenCalledTimes(1);
    await act(async () =>
      finish({
        ok: true,
        value: rowsFor([
          { name: "Menu", qrType: "url", content: {}, design: {} as NewCode["design"] },
        ]),
      }),
    );
    expect(await screen.findByText(/Created 1 code/)).toBeInTheDocument();
  });

  it("downloads the created codes as a ZIP", async () => {
    const user = userEvent.setup();
    savesAll();
    renderPage();
    paste("name,url\nMenu,https://example.com/menu");
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    await user.click(await screen.findByRole("button", { name: "Download ZIP" }));
    expect(downloadZip).toHaveBeenCalledWith(
      [expect.objectContaining({ label: "Menu" })],
      "png",
      "quickqreate-url-codes.zip",
      expect.any(Function),
    );
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/bulk/BulkCreatePage.test.tsx`
Expected: FAIL. `./BulkCreatePage` can't be resolved.

- [ ] **Step 3: Create `features/bulk/BulkCreatePage.tsx`.**

```tsx
"use client";

import { CheckCircle2, Download, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { withWorkspace } from "@/components/app/nav";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select, TextInput } from "@/components/ui/inputs";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { createCodes } from "@/features/codes/api";
import { createFolder, MAX_FOLDER_NAME } from "@/features/folders/api";
import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import { parseBulk, requireWebLinks, type BulkRow } from "@/lib/bulk/rows";
import { codeTypeInfo } from "@/lib/qr/code-types";
import type { ExportFormat, QrTypeId } from "@/lib/qr/types";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { BulkCheckCard } from "./BulkCheckCard";
import { BulkListCard } from "./BulkListCard";
import { downloadZip, itemsFromCodes, ZIP_FORMATS } from "./zip";

const NEW_FOLDER = "__new__";
const codes = (n: number) => `${n} ${n === 1 ? "code" : "codes"}`;

export interface BulkCreatePageProps {
  /** The workspace the codes go into: yours, or a team owner's. */
  ownerId: string;
  /** The team owner's id when creating in a team; null for your own codes. */
  teamId: string | null;
  /** The team owner's name for the header; null for your own codes. */
  workspaceLabel: string | null;
  folders: FolderRow[];
  initialFolderId: string | null;
}

/** Bulk creation inside the app: every ready row becomes a code in your account or team. */
export function BulkCreatePage({
  ownerId,
  teamId,
  workspaceLabel,
  folders: initialFolders,
  initialFolderId,
}: BulkCreatePageProps) {
  const toast = useToast();
  const [type, setType] = useState<QrTypeId>("url");
  const [text, setText] = useState("");
  const [trackable, setTrackable] = useState(true);
  const [folders, setFolders] = useState(initialFolders);
  const [folderId, setFolderId] = useState(initialFolderId ?? "");
  const [newFolder, setNewFolder] = useState("");
  const [format, setFormat] = useState<ExportFormat>("png");
  const [progress, setProgress] = useState<string | null>(null);
  /** Codes created from this list so far, and the folder they went into. */
  const [created, setCreated] = useState<QrCodeRow[]>([]);
  const [placedIn, setPlacedIn] = useState<string | null>(null);
  /** Rows not created yet after a save stopped partway; null when nothing is waiting. */
  const [remaining, setRemaining] = useState<BulkRow[] | null>(null);
  /** Set the moment Create is pressed, so a second press can't start another save. */
  const inFlight = useRef(false);

  const result = useMemo(
    () => (text.trim() ? parseBulk(type, text, DEFAULT_DESIGN.errorCorrection) : null),
    [type, text],
  );
  const asLinks = type === "url" && trackable;
  const rows = useMemo(
    () => (!result ? [] : asLinks ? requireWebLinks(result.rows) : result.rows),
    [result, asLinks],
  );
  const ready = rows.filter((row) => !row.error);
  const toCreate = remaining ?? ready;
  const finished = created.length > 0 && remaining === null;
  const placedName = folders.find((folder) => folder.id === placedIn)?.name ?? null;

  /** A different list, type or tracking choice starts a new batch. */
  function startOver() {
    setCreated([]);
    setRemaining(null);
    setPlacedIn(null);
  }

  /** The chosen folder's id: null for none, undefined when a new one couldn't be made. */
  async function resolveFolder(): Promise<string | null | undefined> {
    if (folderId !== NEW_FOLDER) return folderId || null;
    const name = newFolder.trim();
    if (!name) {
      toast("Name the new folder first.", "error");
      return undefined;
    }
    const made = await createFolder(ownerId, name);
    if (!made.ok) {
      toast(made.error, "error");
      return undefined;
    }
    setFolders((current) => [...current, made.value]);
    setFolderId(made.value.id);
    setNewFolder("");
    return made.value.id;
  }

  async function create() {
    if (inFlight.current || toCreate.length === 0) return;
    inFlight.current = true;
    const folder = await resolveFolder();
    if (folder === undefined) {
      inFlight.current = false;
      return;
    }
    const batch = toCreate;
    let reported = 0;
    setProgress(`Creating 0 of ${batch.length}…`);
    const answer = await createCodes(
      batch.map((row) => ({
        ownerId: teamId ?? undefined,
        folderId: folder,
        name: row.name,
        qrType: type,
        content: row.values,
        design: DEFAULT_DESIGN,
        dynamic: asLinks ? { destination: row.payload } : undefined,
      })),
      (count, saved) => {
        reported = count;
        setCreated((current) => [...current, ...saved]);
        setProgress(`Creating ${count} of ${batch.length}…`);
      },
    );
    inFlight.current = false;
    setProgress(null);
    setPlacedIn(folder);
    if (answer.ok) {
      // Codes saved without a progress report (there shouldn't be any) still count.
      const unreported = answer.value.slice(reported);
      if (unreported.length) setCreated((current) => [...current, ...unreported]);
      setRemaining(null);
      toast(`Created ${codes(answer.value.length)}`);
    } else {
      setRemaining(batch.slice(reported));
      toast(answer.error, "error");
    }
  }

  async function download() {
    if (progress) return;
    setProgress(`Preparing 0 of ${created.length}…`);
    try {
      await downloadZip(itemsFromCodes(created), format, `quickqreate-${type}-codes.zip`, (done) =>
        setProgress(`Preparing ${done} of ${created.length}…`),
      );
      toast(`Downloaded ${codes(created.length)}`);
    } catch {
      toast("The ZIP file couldn’t be made. Please try again.", "error");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create codes in bulk"
        description={
          workspaceLabel
            ? `Saving to ${workspaceLabel}’s codes`
            : "Turn a spreadsheet into codes in your account, one per row."
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <BulkListCard
            type={type}
            onTypeChange={(next) => {
              setType(next);
              startOver();
            }}
            text={text}
            onTextChange={(next) => {
              setText(next);
              startOver();
            }}
          />
          {result && <BulkCheckCard result={result} rows={rows} />}
        </div>

        <aside className="lg:sticky lg:top-6">
          <Card aria-labelledby="bulk-create">
            <CardHeader id="bulk-create" step={result ? 3 : 2} title="Create" />
            <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
              {type === "url" ? (
                <Toggle
                  label="Trackable"
                  description="Change where they point after printing, and see scans."
                  checked={trackable}
                  onChange={(on) => {
                    setTrackable(on);
                    startOver();
                  }}
                />
              ) : (
                <p className="rounded-control bg-surface-2 px-3.5 py-2.5 text-sm text-fg">
                  {codeTypeInfo(type).label} codes work without internet, so they can’t change
                  after printing.
                </p>
              )}
              <Field label="Folder">
                {(control) => (
                  <Select
                    {...control}
                    value={folderId}
                    onChange={(event) => setFolderId(event.target.value)}
                  >
                    <option value="">No folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                    <option value={NEW_FOLDER}>New folder…</option>
                  </Select>
                )}
              </Field>
              {folderId === NEW_FOLDER && (
                <Field label="New folder name">
                  {(control) => (
                    <TextInput
                      {...control}
                      maxLength={MAX_FOLDER_NAME}
                      value={newFolder}
                      onChange={(event) => setNewFolder(event.target.value)}
                    />
                  )}
                </Field>
              )}
              {remaining && (
                <p
                  role="alert"
                  className="rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
                >
                  Created {created.length} of {created.length + remaining.length} codes. The other{" "}
                  {remaining.length} weren’t created.
                </p>
              )}
              {!finished && (
                <Button
                  size="lg"
                  disabled={toCreate.length === 0 || progress !== null}
                  onClick={() => void create()}
                >
                  {progress ? <Loader2 aria-hidden className="animate-spin" /> : <Plus aria-hidden />}
                  {progress ??
                    (remaining
                      ? `Create the remaining ${remaining.length}`
                      : toCreate.length
                        ? `Create ${codes(toCreate.length)}`
                        : "Create codes")}
                </Button>
              )}
              {created.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  {finished && (
                    <p className="flex items-center gap-2 text-sm text-fg">
                      <CheckCircle2 aria-hidden className="size-4 shrink-0 text-success" />
                      Created {codes(created.length)}
                      {placedName ? ` in ${placedName}` : ""}.
                    </p>
                  )}
                  <Field label="File format">
                    {(control) => (
                      <Select
                        {...control}
                        value={format}
                        onChange={(event) => setFormat(event.target.value as ExportFormat)}
                      >
                        {ZIP_FORMATS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Button
                    variant="outline"
                    disabled={progress !== null}
                    onClick={() => void download()}
                  >
                    <Download aria-hidden /> Download ZIP
                  </Button>
                  <Link
                    href={withWorkspace(placedIn ? `/codes?folder=${placedIn}` : "/codes", teamId)}
                    className={buttonClasses("ghost", "md")}
                  >
                    Open {placedName ?? "your codes"}
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the route `app/(app)/codes/bulk/page.tsx`.**

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { withWorkspace } from "@/components/app/nav";
import { BulkCreatePage } from "@/features/bulk/BulkCreatePage";
import { workspaceLabel } from "@/features/teams/roles";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Bulk create · QuickQReate" };

export default async function BulkCreateRoute({ searchParams }: PageProps<"/codes/bulk">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const { supabase, user } = await requireUser(withWorkspace("/codes/bulk", requested));

  const { data: workspaces } = await supabase.rpc("my_workspaces");
  const membership = requested
    ? (workspaces?.find((workspace) => workspace.owner_id === requested) ?? null)
    : null;
  // Viewers can't add codes; send them to the codes they can see.
  if (membership && membership.role !== "editor") {
    redirect(withWorkspace("/codes", membership.owner_id));
  }
  const ownerId = membership?.owner_id ?? user.id;

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", ownerId)
    .order("name");
  // Only a folder of this workspace counts; anything else starts outside any folder.
  const folder = (folders ?? []).find((f) => f.id === folderParam) ?? null;

  return (
    <BulkCreatePage
      key={`${ownerId}:${folder?.id ?? ""}`}
      ownerId={ownerId}
      teamId={membership?.owner_id ?? null}
      workspaceLabel={membership ? workspaceLabel(membership) : null}
      folders={folders ?? []}
      initialFolderId={folder?.id ?? null}
    />
  );
}
```

- [ ] **Step 5: Run them to see them pass.**

Run: `npx vitest run features/bulk && npm run lint && npm run typecheck && npm run build`
Expected:
- the 7 new tests pass, and the other bulk tests pass
- lint and typecheck exit 0
- the build lists `/codes/bulk` as a dynamic route.

- [ ] **Step 6: Commit.**

```bash
git add features/bulk "app/(app)/codes/bulk"
git commit -m "Add bulk creation inside the app at /codes/bulk"
```

### Task 5: Bulk entry points open `/codes/bulk`, in the folder and team you're in

**Files:**
- Modify: `components/app/nav.ts`, `components/app/nav.test.ts`
- Modify: `components/app/CreateButton.tsx`, `components/app/AppShell.test.tsx`
- Modify: `app/(app)/codes/page.tsx`

**Interfaces:**
- Consumes: `withWorkspace`. `CreateButton` already receives `folderId` from `AppShell` (Phase 2a).
- Produces: `export function bulkCreateHref(options: { folderId?: string | null; ownerId: string | null }): string`.

- [ ] **Step 1: Write the failing tests.**

In `components/app/nav.test.ts`, add `bulkCreateHref` to the import from `./nav` and append:

```ts
describe("bulkCreateHref", () => {
  it("opens bulk creation in the app, in a folder and team when given", () => {
    expect(bulkCreateHref({ ownerId: null })).toBe("/codes/bulk");
    expect(bulkCreateHref({ folderId: "f1", ownerId: "t1" })).toBe(
      "/codes/bulk?folder=f1&workspace=t1",
    );
  });
});
```

In `components/app/AppShell.test.tsx`, add inside `describe("AppShell", …)`:

```tsx
  it("opens bulk creation inside the app, in the folder being viewed", async () => {
    const user = userEvent.setup();
    search = new URLSearchParams("workspace=t1&folder=f1");
    renderShell();
    await user.click(screen.getAllByRole("button", { name: "More ways to create" })[0]!);
    expect(
      await screen.findByRole("menuitem", { name: /Bulk create from a spreadsheet/ }),
    ).toHaveAttribute("href", "/codes/bulk?folder=f1&workspace=t1");
  });
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run components/app`
Expected: FAIL. `bulkCreateHref` is not exported, and the menu item links `/bulk?workspace=t1`.

- [ ] **Step 3: Implement.**

In `components/app/nav.ts`, after `newCodeHref`:

```ts
/** Bulk creation inside the app, filing the codes in a folder when given, in the given team. */
export function bulkCreateHref({
  folderId,
  ownerId,
}: {
  folderId?: string | null;
  ownerId: string | null;
}): string {
  const params = new URLSearchParams();
  if (folderId) params.set("folder", folderId);
  const query = params.toString();
  return withWorkspace(query ? `/codes/bulk?${query}` : "/codes/bulk", ownerId);
}
```

- In `components/app/CreateButton.tsx`, change the menu link's `href={withWorkspace("/bulk", ownerId)}` to `href={bulkCreateHref({ folderId, ownerId })}`. Import `bulkCreateHref`, and drop `withWorkspace` from the import if nothing else uses it.
- In `app/(app)/codes/page.tsx`, change the header's Bulk create link `href={withWorkspace("/bulk", teamId)}` to `href={bulkCreateHref({ folderId: folder?.id, ownerId: teamId })}`. Import it, and drop `withWorkspace` if unused.

- [ ] **Step 4: Run them to see them pass.**

Run: `npx vitest run && npm run lint && npm run typecheck`
Expected: the whole unit suite passes; lint and typecheck exit 0.

- [ ] **Step 5: Commit.**

```bash
git add components/app "app/(app)/codes/page.tsx"
git commit -m "Open bulk creation in the app from every Bulk button"
```

### Task 6: Signed-in browser tests for bulk creation

**Files:**
- Create: `e2e/accounts/bulk.spec.ts`
- Modify: `e2e/accounts/app.spec.ts` (add `codes/bulk` to `PAGES`)

**Interfaces:**
- Consumes: the `MAKER` and `VIEWER` accounts and `seed()` (`makerFolderId` is "Posters", `ownerId` is the owner whose team the viewer is on); the labels from Tasks 3–4; the codes list (`listitem` named by code name, status pill "Active").
- Produces: nothing new.

- [ ] **Step 1: Write the tests.** Create `e2e/accounts/bulk.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { MAKER, seed, VIEWER } from "./fixtures";

test.describe("bulk creation in the app", () => {
  test.use({ storageState: MAKER.state });

  test("turns a list into trackable codes in the folder it was opened from", async ({ page }) => {
    const { makerFolderId } = seed();
    await page.goto(`codes?folder=${makerFolderId}`);
    await page.getByRole("main").getByRole("link", { name: "Bulk create" }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/bulk\\?folder=${makerFolderId}$`));
    await page
      .getByLabel("CSV")
      .fill("name,url\nBulk one,https://example.com/1\nBulk two,https://example.com/2");
    await expect(page.getByText("2 ready.")).toBeVisible();
    await page.getByRole("button", { name: "Create 2 codes" }).click();
    await expect(page.getByText("Created 2 codes in Posters.")).toBeVisible();

    await page.getByRole("link", { name: "Open Posters" }).click();
    for (const name of ["Bulk one", "Bulk two"]) {
      const row = page.getByRole("listitem", { name });
      await expect(row).toBeVisible();
      await expect(row.getByText("Active").filter({ visible: true }).first()).toBeVisible();
    }
  });
});

test.describe("team viewers", () => {
  test.use({ storageState: VIEWER.state });

  test("can't open bulk creation in a team they only view", async ({ page }) => {
    const { ownerId } = seed();
    await page.goto(`codes/bulk?workspace=${ownerId}`);
    await expect(page).toHaveURL(new RegExp(`/codes\\?workspace=${ownerId}$`));
  });
});
```

- [ ] **Step 2: Add bulk creation to the responsive and axe sweep.** In `e2e/accounts/app.spec.ts`, add `"codes/bulk",` to `PAGES` after `"codes/new",`.

- [ ] **Step 3: Run the signed-in suite.**

Run: `npm run test:e2e:accounts`
Expected:
- all tests pass, including the 2 new bulk tests and 3 new `codes/bulk` sweep tests (390, 820 and 1280px).
- If axe flags `/codes/bulk`, fix the markup (not the test) and rerun.

- [ ] **Step 4: Commit.**

```bash
git add e2e/accounts
git commit -m "Check bulk creation and its viewer guard signed in"
```

### Task 7: Ship Phase 2b

**Files:** none new. There is no migration in this phase.

- [ ] **Step 1: Run the full local check.** The public suite needs a build with accounts off, and the signed-in suite builds its own:

Run: `npx prettier --check . --ignore-path .gitignore --ignore-path .prettierignore --ignore-path .git/info/exclude && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e && npm run test:e2e:accounts`
Expected: all PASS.

- [ ] **Step 2: Push and open the PR.**

```bash
git push -u origin feat/bulk-and-editors
gh pr create --base main --head feat/bulk-and-editors --title "Bulk create in the app; hosted-page editor split" --body "$(cat <<'EOF'
Phase 2b of the redesign (spec §3.2, §4.7, §10; plan docs/superpowers/plans/2026-10-14-phase-2b-bulk-and-editors.md).

- `/codes/bulk`: turn a spreadsheet into codes in your account or team. Trackable links (on by default), a folder (or a new one), then download the ZIP. If saving stops partway, "Create the remaining N" creates only the rest. Rows that can't be trackable (not web addresses) are flagged instead of failing the batch.
- Every Bulk button (Create menu, Codes header) opens `/codes/bulk` in the folder and team you're in. Viewers are sent back to the codes they can see.
- Public `/bulk` is download-only and points signed-in people to `/codes/bulk`.
- The 1,004-line hosted-page editor is split into one component per page type (moved verbatim); characterization tests prove every field and every page's saved content are unchanged.
- No database changes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Run the final whole-branch review before merging.** Follow the "Final Review" section of superpowers:executing-plans, with this plan's Review Focus and the ledger's rulings. Do one fix pass if needed. Both CI jobs must pass.

- [ ] **Step 4: Merge and check the live site.**
  1. Note the live build ID: the `"b":"…"` value in `https://qr.techitdave.com/login`.
  2. Run `gh pr merge --merge --delete-branch`.
  3. Poll until the build ID changes. If a page shows "This page couldn't load" during the switch, reload once.
  4. Check:
     - `/api/health` is OK.
     - In David's Chrome, the sidebar's "More ways to create" menu opens `/codes/bulk`, which shows the list, the Trackable switch and the folder picker.
     - Public `/bulk` shows the download button and "Create them in your codes".
     - `/codes/new` with Link list shows its form.
  5. Create nothing in David's account.

