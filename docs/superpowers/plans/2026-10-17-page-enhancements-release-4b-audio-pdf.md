# Page enhancements, Release 4b: Audio and PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- **PDF:** up to 10 files per page, each with a title and a first-page preview image drawn in the browser when the file is uploaded.
- **Audio:**
  - Spotify, SoundCloud and Apple Music or Apple Podcasts players;
  - up to 8 "Listen on" buttons with each service's icon;
  - a tracklist of up to 10 tracks that play one at a time.

**Architecture:**
- **Content:** everything is optional page content with defaults, read through `SCHEMAS`.
  - `UPGRADES` turns an old PDF page's single `file` into its first file.
  - A "Listen on" link names its service from its own address, so the page stores only links.
- **PDF previews:**
  - **Library:** pdf.js 6.3.289, pinned exactly. A `prebuild` step copies its two browser files into `public/vendor/pdfjs/`. The offline cache only takes `.next/static` and the icons, so pdf.js never reaches visitors.
  - **Loading:** the editor imports it from there, untouched by the bundler, only when a PDF is uploaded.
  - **Drawing:** it draws page 1 at 800 px in a worker, and the image uploads like any other.
- **Audio:**
  - **Players:** reuse Release 4a's `TapToPlay`, generalised to any player URL and height.
  - **One at a time:** a small client component pauses other players when one starts.
- **Brand icons:** six marks from Simple Icons 16.33.0, the set and version the social icons already use. They're stored as path data in a new data file.

**Tech Stack:**
- Next.js 16, React 19, Tailwind 4, Vitest with jsdom, Playwright 1.56.
- New: `pdfjs-dist@6.3.289` (Mozilla, Apache-2.0, 34.8 MB in node_modules; two files of about 1.4 MB together are served to the editor).
- No database migration.

**Spec:** `docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md`, section 7 (items 39–40 and 48–50) and section 3. Release 4a is live: `TapToPlay`, `videoEmbed`, `SortableList` row updates by row id, and the image items exist.

## Downloads this plan makes (David approves them by approving this plan)

1. **Six brand icons** (SVG, about 1–3 KB each) from `https://cdn.jsdelivr.net/npm/simple-icons@16.33.0/icons/`:
   - `applemusic.svg`, `applepodcasts.svg`, `youtubemusic.svg`, `deezer.svg`, `tidal.svg`, `bandcamp.svg`.
   - They're saved to the scratchpad, read only for their single `<path d>`, and copied into `lib/pages/music-icons.data.ts`.
   - Simple Icons is CC0. Amazon Music isn't in the set (Amazon's marks were removed), so it gets a plain music note.
2. **`pdfjs-dist@6.3.289`** from the npm registry, through `npm install --save-exact`. This version is from 2026-08-29; the newer 6.4.299 is only two weeks old.

## Global Constraints

- **PDF** (spec 39–40):
  - **Several files:** up to 10 PDFs, each with a title, shown as a list with View and Download. "Open the PDF straight away" still applies when there's only one file.
  - **First-page preview:** when a PDF is uploaded, the browser draws its first page as an image (800 px), and the page shows that image as the file's preview.
- **Audio** (spec 48–50):
  - **Embedded players:** Spotify, SoundCloud and Apple Music or Apple Podcasts links show those sites' own players, not just a button.
  - **"Listen on" buttons:** up to 8 platform buttons with icons: Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, Tidal, SoundCloud and Bandcamp.
  - **Tracklist:** up to 10 tracks, each a title plus an uploaded file (15 MB cap) or a link. They play one at a time.
- **Section 3 rules apply:**
  - old pages keep working, and the API docs list the new fields;
  - new images are resized;
  - previews stay inert;
  - visible labels and 44 px targets, with no sideways scroll from 320 px;
  - axe clean;
  - limits are visible;
  - each new field gets tests;
  - browser tests are added, and the new pages join the sweeps.

## Rulings made in this plan (for David's review)

1. **The Spotify, SoundCloud and Apple players load after a tap**, as TikTok and Instagram do since 4a ("Tap to play from Spotify"). The reason is the same: they carry trackers, and the page stays fast.
2. **With a Spotify, SoundCloud or Apple link as the page's main link, the player replaces the old "Listen" button.** Other links keep the button.
3. **A "Listen on" link knows its service from its address.** Paste a link and the right name and icon appear. A link from another site is refused, with the list of services it can be. Apple Podcasts is accepted too, as a ninth service.
4. **Amazon Music gets a plain music-note icon,** since Simple Icons no longer carries Amazon's marks.
5. **With one PDF, the page keeps today's layout, now with its first-page preview above the buttons.** With 2 or more, it shows a list with View and Download for each.
6. **"Open the PDF straight away" works when the page has one PDF.** With several, scanning shows the list, and the editor says so.
7. **pdf.js runs only in the editor:**
   - it's loaded from the site's own files when a PDF is uploaded;
   - it runs in a worker;
   - it's kept out of the offline cache.
8. **If a preview can't be drawn** (an unusual or password-protected PDF), the file still uploads and shows the PDF icon. Previews are made for new uploads; a PDF saved earlier gets one when it's uploaded again.
9. **Tracks:** a file plays in place, and a link opens in a new tab. Starting any player pauses the others on the page.

## Review Focus

1. **Old pages:**
   - a PDF page with one file, with `direct` on or off, and with no file;
   - an Audio page with a file, a Spotify link, or another link.

   Each reads, shows and scans as before (direct opens the file), and keeps working after its first edit and save. *Tasks 2 and 5 tests.*
2. **PDF previews:**
   - a PDF that pdf.js can't read;
   - the upload of the preview failing;
   - replacing or removing a file while its preview is still being drawn;
   - a wide or tall first page;
   - uploading a second PDF before the first preview is done.

   The preview must land on its own file or nowhere. *Task 4 test.*
3. **Player links:**
   - Spotify `intl-xx` paths, `spotify.link` short links, episodes, shows and artists;
   - SoundCloud sets and `on.soundcloud.com` short links;
   - Apple Music songs (`?i=`), albums and playlists; Apple Podcasts episodes;
   - look-alike hosts.

   *Task 5 test.*
4. **"Listen on":**
   - Amazon Music on other countries' sites (`music.amazon.co.uk`);
   - Bandcamp artist subdomains;
   - Deezer `link.deezer.com`;
   - Tidal `listen.tidal.com`;
   - 8 buttons on a 320 px phone.

   *Tasks 5 and 8.*
5. **One at a time:** starting a track pauses the main file and the other tracks. A player loaded after a tap isn't paused by mistake. *Task 6 test.*

---

### Task 1: The downloads, pdf.js served from the site, and the brand icons

**Files:**
- Create:
  - `scripts/copy-vendor.mjs`
  - `lib/pages/music-icons.data.ts`
- Modify:
  - `package.json`, `package-lock.json` (`pdfjs-dist@6.3.289`; `prebuild` and `predev`)
  - `.gitignore` (`public/vendor/`)
- Test: `scripts/copy-vendor.test.ts`

**Interfaces:**
- Produces:
  - `/vendor/pdfjs/pdf.min.mjs` and `/vendor/pdfjs/pdf.worker.min.mjs`, served from `public/`;
  - `MUSIC_ICONS: { id: "applemusic" | "applepodcasts" | "youtubemusic" | "deezer" | "tidal" | "bandcamp"; label: string; path: string }[]`.

- [ ] **Step 1: Create the branch and commit this plan.**

```bash
git checkout -b feat/page-enhancements-r4b main
git add docs/superpowers/plans/2026-10-17-page-enhancements-release-4b-audio-pdf.md
git commit -m "Plan: page enhancements release 4b, Audio and PDF"
```

- [ ] **Step 2: Download the six icons** into a new scratchpad folder, as untrusted data:

```bash
D=<scratchpad>/simple-icons-16.33.0 && mkdir -p "$D"
for s in applemusic applepodcasts youtubemusic deezer tidal bandcamp; do
  curl -sf "https://cdn.jsdelivr.net/npm/simple-icons@16.33.0/icons/$s.svg" -o "$D/$s.svg"
done
ls -l "$D"
```

Then check each file:
- it's a small SVG on a 24×24 `viewBox`;
- it has exactly one `<path d="…">`;
- the path holds only path commands and numbers.

Copy each `d` into `lib/pages/music-icons.data.ts`, using `social-icons.data.ts`'s header and shape:

```ts
// Brand marks from Simple Icons 16.33.0 (CC0 1.0, https://simpleicons.org), each a single path
// on a 24×24 grid. Used only to label "Listen on" links to the owner's own music (spec item 49).

export const MUSIC_ICONS = [
  { id: "applemusic", label: "Apple Music", path: "<d from applemusic.svg>" },
  { id: "applepodcasts", label: "Apple Podcasts", path: "<d from applepodcasts.svg>" },
  { id: "youtubemusic", label: "YouTube Music", path: "<d from youtubemusic.svg>" },
  { id: "deezer", label: "Deezer", path: "<d from deezer.svg>" },
  { id: "tidal", label: "Tidal", path: "<d from tidal.svg>" },
  { id: "bandcamp", label: "Bandcamp", path: "<d from bandcamp.svg>" },
] as const;
```

The `<d from …>` markers are the downloaded values, pasted in at this step. They aren't placeholders left for later.

- [ ] **Step 3: Install pdf.js, pinned.**

```bash
npm install --save-exact pdfjs-dist@6.3.289
ls node_modules/pdfjs-dist/build/pdf.min.mjs node_modules/pdfjs-dist/build/pdf.worker.min.mjs
```

Expected: both files exist. If a name differs in this version, use the minified ESM build and worker it ships, and update Step 5's names.

- [ ] **Step 4: Write the failing test.** Create `scripts/copy-vendor.test.ts`:

```ts
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { copyVendor, VENDOR_FILES } from "./copy-vendor.mjs";

describe("copy-vendor", () => {
  it("copies pdf.js's browser build and worker into public/vendor/pdfjs", () => {
    const out = mkdtempSync(join(tmpdir(), "vendor-"));
    copyVendor(out);
    for (const name of VENDOR_FILES) {
      const copied = join(out, "pdfjs", name);
      expect(existsSync(copied), name).toBe(true);
      expect(readFileSync(copied).length).toBeGreaterThan(10_000);
    }
  });
});
```

- [ ] **Step 5: Run it and watch it fail.**

Run: `npx vitest run scripts/copy-vendor.test.ts`
Expected: FAIL. `./copy-vendor.mjs` doesn't exist.

- [ ] **Step 6: Implement.** Create `scripts/copy-vendor.mjs`:

```js
// Copies pdf.js's browser files into public/vendor/pdfjs, where the editor loads them from when
// a PDF is uploaded (to draw its first-page preview). They're served as plain files: not bundled,
// and not in the service worker's precache (which takes only .next/static and the icons), so
// visitors never download them.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const VENDOR_FILES = ["pdf.min.mjs", "pdf.worker.min.mjs"];

export function copyVendor(out = join(root, "public", "vendor")) {
  const dir = join(out, "pdfjs");
  mkdirSync(dir, { recursive: true });
  for (const name of VENDOR_FILES) {
    copyFileSync(join(root, "node_modules", "pdfjs-dist", "build", name), join(dir, name));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) copyVendor();
```

- `package.json` scripts gain `"prebuild": "node scripts/copy-vendor.mjs"` and `"predev": "node scripts/copy-vendor.mjs"`.
- Every build runs through `npm run build`: CI, the Dockerfile and `scripts/accounts-e2e.mjs`. The Dockerfile copies `public/` from the build stage, so the files ship.
- `.gitignore` gains `public/vendor/`.

- [ ] **Step 7: Run the test and watch it pass; check the build.**

Run:

```bash
npx vitest run scripts/copy-vendor.test.ts && npx tsc --noEmit && npm run build \
  && ls public/vendor/pdfjs \
  && grep -c "vendor/pdfjs" public/sw.js
```

Expected:
- the test passes;
- the build succeeds;
- both files are listed;
- the last `grep` prints `0`: they aren't precached.

- [ ] **Step 8: Commit.**

```bash
git add package.json package-lock.json .gitignore scripts/copy-vendor.mjs scripts/copy-vendor.test.ts lib/pages/music-icons.data.ts
git commit -m "pdf.js 6.3.289 served from the site for PDF previews, and six music service marks from Simple Icons"
```

---

### Task 2: PDF data: several files, each with a title and a preview

**Files:**
- Modify:
  - `lib/pages/types.ts` (`PdfFile`, `PdfPage`, `LIMITS.pdfs`, defaults)
  - `lib/pages/sanitize.ts` (pdf schema; pdf upgrade)
  - `lib/pages/validate.ts` (pdf)
  - `lib/dynamic/target.ts` (direct with one file)
  - `features/pages/PageView.tsx` and `features/pages/editor/editors/PdfEditor.tsx` (still compile; Tasks 3 and 4 finish them)
- Test:
  - `lib/pages/pages.test.ts`
  - `lib/dynamic/dynamic.test.ts`

**Interfaces:**
- Produces:
  - `PdfFile = { file: Media | null; title: string; preview: Media | null }`;
  - `PdfPage.files: PdfFile[]` (max 10), which replaces `file`;
  - `direct` is unchanged.

- [ ] **Step 1: Write the failing tests.** In `lib/pages/pages.test.ts`:

```ts
describe("PDF pages with several files", () => {
  const pdf = (name: string) => ({ path: `${UID}/${name}`, name, type: "application/pdf", size: 10 });

  it("reads an old page's file as its first, and an empty one as one empty row", () => {
    expect(sanitizePage("pdf", { title: "Menu", file: pdf("menu.pdf"), direct: true })).toMatchObject({
      files: [{ file: pdf("menu.pdf"), title: "", preview: null }],
      direct: true,
    });
    expect(sanitizePage("pdf", { title: "Menu", file: null }).files).toEqual([
      { file: null, title: "", preview: null },
    ]);
    expect(sanitizePage("pdf", { file: pdf("a.pdf") })).not.toHaveProperty("file");
  });

  it("needs one PDF, and a file on any row that has a title", () => {
    const page = (files: object[]) => ({ ...PAGE_DEFAULTS.pdf(), files });
    expect(validatePage("pdf", page([{ file: null, title: "", preview: null }]))).toEqual({
      "files.0.file": "Upload a PDF",
    });
    expect(
      validatePage(
        "pdf",
        page([
          { file: pdf("a.pdf"), title: "", preview: null },
          { file: null, title: "Wine list", preview: null },
        ]),
      ),
    ).toEqual({ "files.1.file": "Upload a PDF, or remove this row" });
  });
});
```

In `lib/dynamic/dynamic.test.ts`:

```ts
  it("opens a PDF straight away only when the page has one", () => {
    const file = (name: string) => ({ path: `${UID}/${name}`, name, type: "application/pdf", size: 1 });
    const code = (files: object[]) => ({
      destination: null,
      qr_type: "pdf",
      content: { direct: true, files },
    });
    expect(scanTarget(code([{ file: file("a.pdf") }]), "PDF1", null, site)).toMatch(/\/a\.pdf$/);
    expect(scanTarget(code([{ file: file("a.pdf") }, { file: file("b.pdf") }]), "PDF1", null, site)).toBe(
      `${site}/p/PDF1`,
    );
  });
```

Use the `UID` constant and `site` constant the file already has. If `UID` isn't defined there, add `const UID = "11111111-1111-4111-8111-111111111111";`.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages/pages.test.ts lib/dynamic/dynamic.test.ts -t "PDF pages with several|PDF straight away"`
Expected: FAIL.

- [ ] **Step 3: Implement.**

`lib/pages/types.ts`:

```ts
export interface PdfFile {
  file: Media | null;
  /** Shown in the list; the file's name when empty (spec item 39). */
  title: string;
  /** Page 1 drawn as an image when the file was uploaded (spec item 40). */
  preview: Media | null;
}

export interface PdfPage extends Themed {
  title: string;
  description: string;
  /** Up to 10; an old page's single file becomes the first. */
  files: PdfFile[];
  /** Skip the page and open the file straight away (only with one file). */
  direct: boolean;
}
```

- `LIMITS.pdfs = 10`.
- The defaults are `files: [{ file: null, title: "", preview: null }]`.

`lib/pages/sanitize.ts`:
- The pdf schema becomes:

```ts
  pdf: {
    title: str(),
    description: str(LIMITS.text),
    files: {
      kind: "list",
      max: LIMITS.pdfs,
      item: { file: media, title: str(), preview: media },
    },
    direct: bool,
  },
```

- Add an `UPGRADES` entry:

```ts
  // PDF pages had one file before they had several (spec item 39).
  pdf: (raw) =>
    !("files" in raw) && "file" in raw
      ? { ...raw, files: [{ file: raw.file, title: "", preview: null }] }
      : raw,
```

`lib/pages/validate.ts`:

```ts
  pdf: (p) => {
    const errors: PageErrors = {};
    if (!p.files.some((f) => f.file)) errors[p.files.length ? "files.0.file" : "files"] = "Upload a PDF";
    p.files.forEach((f, i) => {
      if (!f.file && f.title.trim()) errors[`files.${i}.file`] = "Upload a PDF, or remove this row";
    });
    return errors;
  },
```

`lib/dynamic/target.ts`:

```ts
  if (code.qr_type === "pdf") {
    const page = sanitizePage("pdf", code.content);
    // Straight to the file only when there's one to go to (spec item 39).
    const files = page.files.filter((f) => f.file);
    if (page.direct && files.length === 1) return mediaUrl(files[0]!.file!.path);
  }
```

Make the rest compile:
- **`PdfView`:** reads `page.files[0]?.file` for now.
- **`PdfEditor`:** binds its one `MediaField` to `files[0].file` through `set((latest) => …)`.
- **The old pdf tests** that used `file: media("a.pdf")` move to `files: [{ file: media("a.pdf"), title: "", preview: null }]`. Their messages become `files.0.file`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib features && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib features
git commit -m "PDF data: up to 10 files, each with a title and a preview; an old file becomes the first; direct opens only a lone file"
```

---

### Task 3: The PDF page: one file as today, several as a list, with previews

**Files:**
- Modify: `features/pages/PageView.tsx` (`PdfView`)
- Test: `features/pages/PageView.test.tsx`

**Interfaces:**
- Consumes: Task 2's `PdfFile`.

- [ ] **Step 1: Write the failing tests.**

```tsx
describe("PDF extras", () => {
  const pdf = (name: string, size = 2048) => ({
    path: `00000000-0000-0000-0000-000000000000/${name}`,
    name,
    type: "application/pdf",
    size,
  });
  const row = (name: string, patch: object = {}) => ({ file: pdf(name), title: "", preview: null, ...patch });

  it("keeps one PDF's page as it was, with its first page shown when there is one", () => {
    view(
      "pdf",
      {
        ...PAGE_DEFAULTS.pdf(),
        title: "Menu",
        files: [row("menu.pdf", { preview: media("p.webp", "image/webp") })],
      },
      false,
    );
    expect(screen.getByRole("img", { name: "First page of Menu" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open PDF/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download/ })).toBeInTheDocument();
  });

  it("lists several PDFs, each with View and Download, named by title or file", () => {
    view(
      "pdf",
      {
        ...PAGE_DEFAULTS.pdf(),
        title: "Menus",
        files: [row("food.pdf", { title: "Food" }), row("wine-list.pdf"), { file: null, title: "", preview: null }],
      },
      false,
    );
    const list = within(screen.getByRole("list", { name: "PDFs" }));
    expect(list.getAllByRole("listitem")).toHaveLength(2);
    expect(list.getByText("Food")).toBeInTheDocument();
    expect(list.getByText("wine-list.pdf")).toBeInTheDocument();
    expect(list.getByRole("link", { name: "View Food" })).toBeInTheDocument();
    expect(list.getByRole("link", { name: "Download Food, 2 KB" })).toBeInTheDocument();
  });
});
```

Check `fileSize(2048)`'s output in `parts.tsx` ("2 KB" or "2.0 KB") and match it.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/PageView.test.tsx -t "PDF extras"`
Expected: FAIL.

- [ ] **Step 3: Implement.** `PdfView`:

```tsx
function PdfView({ page, preview }: ViewProps<PdfPage>) {
  const look = page.look;
  // Drawn as given: an old page may still have one `file`.
  const old = (page as unknown as { file?: Media | null }).file ?? null;
  const files = (page.files ?? [{ file: old, title: "", preview: null }]).filter(
    (f): f is PdfFile & { file: Media } => Boolean(f.file),
  );
  const name = (f: PdfFile & { file: Media }) => f.title.trim() || f.file.name;
  const first = files[0];
  return (
    <PageFrame look={look} preview={preview}>
      {!first?.preview && (
        <span className="grid size-20 place-items-center self-center rounded-(--pg-radius) bg-[var(--page-accent)] text-[var(--page-accent-fg)]">
          <FileText aria-hidden className="size-10" />
        </span>
      )}
      <PageHeader look={look} layout="classic" image={null} imageAlt="" title={page.title || first?.file.name || "Document"} sub={page.description || undefined} />
      {files.length > 1 ? (
        <PageCard>
          <ul aria-label="PDFs" className="divide-y divide-border">
            {files.map((f) => {
              const href = mediaUrl(f.file.path);
              return (
                <li key={f.file.path} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {f.preview ? (
                    <MediaImage media={f.preview} alt="" className="h-16 w-12 shrink-0 rounded border border-border bg-white object-cover object-top" />
                  ) : (
                    <FileText aria-hidden className="size-8 shrink-0 text-[var(--page-accent)]" />
                  )}
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    <span className="block font-medium text-fg">{name(f)}</span>
                    <span className="block text-sm text-fg-muted">{fileSize(f.file.size)}</span>
                  </span>
                  <a href={preview ? undefined : href} target="_blank" rel="noopener noreferrer" aria-label={`View ${name(f)}`} className={iconLink}>
                    <ExternalLink aria-hidden className="size-5" />
                  </a>
                  <a href={preview ? undefined : href} download={f.file.name} aria-label={`Download ${name(f)}, ${fileSize(f.file.size)}`} className={iconLink}>
                    <Download aria-hidden className="size-5" />
                  </a>
                </li>
              );
            })}
          </ul>
        </PageCard>
      ) : (
        <PageCard className="flex flex-col items-center gap-4 text-center">
          {first ? (
            <>
              {first.preview && (
                <MediaImage
                  media={first.preview}
                  alt={`First page of ${page.title.trim() || name(first)}`}
                  className="w-full max-w-xs rounded border border-border bg-white shadow-card"
                />
              )}
              <PageLink href={mediaUrl(first.file.path)} preview={preview}>
                <ExternalLink aria-hidden /> Open PDF
              </PageLink>
              <PageLink href={mediaUrl(first.file.path)} variant="secondary" download={first.file.name} preview={preview}>
                <Download aria-hidden /> Download · {fileSize(first.file.size)}
              </PageLink>
            </>
          ) : (
            <EmptyNote>Your PDF appears here.</EmptyNote>
          )}
        </PageCard>
      )}
    </PageFrame>
  );
}
```

with:

```ts
const iconLink =
  "grid size-11 shrink-0 place-items-center rounded-full border border-border text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)";
```

In the preview, the icon links have no `href`, like every link there. Import `type PdfFile`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npx eslint features/pages`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add features/pages
git commit -m "The PDF page: one file as before with its first page shown; several as a list with View and Download"
```

---

### Task 4: The PDF editor: several files, and drawing each first page

**Files:**
- Create: `features/pages/editor/pdfFirstPage.ts`
- Modify:
  - `features/pages/editor/fields.tsx` (`MediaField`'s `onFile`)
  - `features/pages/editor/editors/PdfEditor.tsx`
- Test: `features/pages/editor/PageEditor.test.tsx`

**Interfaces:**
- Produces:
  - `pdfFirstPage(file: File, width?: number): Promise<Blob | null>`;
  - `MediaField`'s `onFile?: (file: File, media: Media) => void`, called after a successful upload with the original file.

- [ ] **Step 1: Write the failing tests.** In `features/pages/editor/PageEditor.test.tsx`, mock the drawing next to the existing upload mock:

```tsx
vi.mock("./pdfFirstPage", () => ({ pdfFirstPage: vi.fn() }));
```

```tsx
describe("PDF editor extras", () => {
  function Pdf() {
    const [page, setPage] = useState(PAGE_DEFAULTS.pdf());
    return (
      <>
        <PageEditor type="pdf" page={page} errors={{}} onUpdate={(update) => setPage((p) => update(p))} />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);
  const doc = { path: `${UID}/a.pdf`, name: "menu.pdf", type: "application/pdf", size: 1 };
  const shot = { path: `${UID}/p.webp`, name: "menu.webp", type: "image/webp", size: 1 };

  it("draws a PDF's first page and saves it as the file's preview", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadMedia)
      .mockResolvedValueOnce({ ok: true, media: doc })
      .mockResolvedValueOnce({ ok: true, media: shot });
    vi.mocked(pdfFirstPage).mockResolvedValueOnce(new Blob(["x"], { type: "image/webp" }));
    const { container } = render(<Pdf />);
    await user.upload(container.querySelector<HTMLInputElement>("input[type=file]")!, new File(["%PDF"], "menu.pdf", { type: "application/pdf" }));
    await waitFor(() => expect(saved().files[0]).toEqual({ file: doc, title: "", preview: shot }));
    expect(saved().title).toBe("menu");
    expect(vi.mocked(uploadMedia).mock.calls[1]![1]).toBe("image");
  });

  it("keeps the PDF, without a preview, when its first page can't be drawn", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadMedia).mockResolvedValueOnce({ ok: true, media: doc });
    vi.mocked(pdfFirstPage).mockResolvedValueOnce(null);
    const { container } = render(<Pdf />);
    await user.upload(container.querySelector<HTMLInputElement>("input[type=file]")!, new File(["%PDF"], "menu.pdf", { type: "application/pdf" }));
    await waitFor(() => expect(saved().files[0]).toEqual({ file: doc, title: "", preview: null }));
  });

  it("adds a second PDF with its own title, and says direct opening needs one file", async () => {
    const user = userEvent.setup();
    render(<Pdf />);
    await user.click(screen.getByRole("button", { name: "Add PDF" }));
    await user.type(screen.getAllByRole("textbox", { name: /^PDF title/ })[1]!, "Wine list");
    expect(saved().files[1]).toMatchObject({ title: "Wine list" });
    expect(screen.getByText(/with several, scanning shows the list/)).toBeInTheDocument();
  });
});
```

Import `waitFor` from `@testing-library/react`, and `pdfFirstPage` from `./pdfFirstPage`.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx -t "PDF editor extras"`
Expected: FAIL. `./pdfFirstPage` doesn't exist.

- [ ] **Step 3: Implement.**

Create `features/pages/editor/pdfFirstPage.ts`:

```ts
"use client";

// Draws a PDF's first page as an image, in the browser, when it's uploaded (spec item 40).
// pdf.js comes from the site's own files (scripts/copy-vendor.mjs), loaded only now, and runs
// in a worker. It isn't bundled or precached, so visitors never download it (ruling 7).

type PdfJs = typeof import("pdfjs-dist");
const BASE = "/vendor/pdfjs";
let loading: Promise<PdfJs> | null = null;

function load(): Promise<PdfJs> {
  loading ??= (
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${BASE}/pdf.min.mjs`) as Promise<PdfJs>
  ).then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.mjs`;
    return pdfjs;
  });
  return loading;
}

/** Page 1 as a WebP `width` pixels wide, or null when the file can't be drawn. */
export async function pdfFirstPage(file: File, width = 800): Promise<Blob | null> {
  try {
    const pdfjs = await load();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    try {
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) return null;
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    } finally {
      await doc.destroy();
    }
  } catch {
    // An unusual or protected PDF: it still uploads, just without a preview (ruling 8).
    return null;
  }
}
```

If TypeScript rejects `canvas` or `canvasContext` in `render`'s parameters for 6.3.289, pass the one its types require. If the bundler still tries to resolve the import, keep the URL in a variable (`const url = …; import(/* … */ url)`).

`features/pages/editor/fields.tsx` `MediaField`:
- Add `onFile?: (file: File, media: Media) => void` to its props.
- In `pick`, after a successful upload: `if (result.ok) { onChange(result.media); onFile?.(file, result.media); }`.

`features/pages/editor/editors/PdfEditor.tsx`: the File card becomes a "PDFs" card with a `SortableList`:

```tsx
        <SortableList
          label="PDFs"
          showLabel={false}
          items={page.files}
          onChange={(files) => set({ files })}
          max={LIMITS.pdfs}
          addLabel="Add PDF"
          addAt="end"
          path="files"
          errors={errors}
          itemLabel={(item, i) => rowName("PDF", item.title || item.file?.name || "", i)}
          newItem={() => ({ file: null, title: "", preview: null })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <MediaField
                label="PDF"
                kind="pdf"
                field={`files.${i}.file`}
                value={item.file}
                hint="Up to 10 MB. Its first page is shown as a preview."
                error={touched ? errors.error(`files.${i}.file`) : undefined}
                // Replacing or removing the file drops the old preview.
                onChange={(file) => {
                  update({ file, preview: null });
                  // The page's title starts as the first PDF's name, unless one was typed.
                  if (file && i === 0) {
                    set((latest) => (latest.title ? {} : { title: file.name.replace(/\.pdf$/i, "") }));
                  }
                }}
                onFile={(original, uploaded) => {
                  void previewOf(original, ownerId).then((preview) => {
                    // Only onto the file it was drawn from, if that's still the row's file.
                    if (preview) {
                      set((latest) => ({
                        files: latest.files.map((f) =>
                          f.file?.path === uploaded.path ? { ...f, preview } : f,
                        ),
                      }));
                    }
                  });
                }}
              />
              {item.preview && (
                // eslint-disable-next-line @next/next/no-img-element -- uploaded preview
                <img src={mediaUrl(item.preview.path)} alt="First page preview" className="h-24 w-auto self-start rounded border border-border bg-white" />
              )}
              <TextField
                path={`files.${i}.title`}
                errors={errors}
                label="PDF title"
                optional
                placeholder={item.file?.name.replace(/\.pdf$/i, "") || "Wine list"}
                value={item.title}
                onChange={(title) => update({ title })}
              />
            </div>
          )}
        />
```

with:

```ts
/** Draws the PDF's first page and uploads it as an 800px image; null if either step fails. */
async function previewOf(file: File, ownerId: string | null): Promise<Media | null> {
  const blob = await pdfFirstPage(file, 800);
  if (!blob) return null;
  const image = new File([blob], file.name.replace(/\.pdf$/i, "") + ".webp", { type: "image/webp" });
  const result = await uploadMedia(image, "image", { maxSide: 800, ownerId });
  return result.ok ? result.media : null;
}
```

- The preview is set by matching the file's path on the latest page, so a file replaced or removed meanwhile doesn't get another file's preview.
- `ownerId` comes from `useContext(MediaOwnerContext)` in `PdfEditor`, as `MediaField` does.
- The Opening card's toggle description becomes: "Skip the page: scanning opens the file directly. This works with one PDF; with several, scanning shows the list."
- Imports: `LIMITS`, `rowName`, `SortableList`, `MediaOwnerContext`, `mediaUrl`, `pdfFirstPage`, `uploadMedia` and `type Media`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS. Update the LABELS and CARDS lists for pdf ("PDFs" card; "PDF", "PDF title") and the every-box-has-a-limit test (`files.N.title`).

- [ ] **Step 5: Commit.**

```bash
git add features/pages
git commit -m "The PDF editor: up to 10 PDFs with titles, each previewed by drawing its first page in the browser"
```

---

### Task 5: Audio data: players, "Listen on" links, tracks

**Files:**
- Modify:
  - `lib/pages/urls.ts` (`audioEmbed`, `listenService`)
  - `lib/pages/types.ts` (`AudioPage.listen`, `AudioPage.tracks`, `LIMITS.listen/tracks`)
  - `lib/pages/sanitize.ts`
  - `lib/pages/validate.ts` (audio)
- Test: `lib/pages/pages.test.ts`

**Interfaces:**
- Produces:
  - `AudioEmbed = { provider: "spotify" | "soundcloud" | "apple"; src: string; name: string; height: number }`;
  - `audioEmbed(link): AudioEmbed | null`;
  - `ListenService = { id: "spotify" | "applemusic" | "applepodcasts" | "youtubemusic" | "amazon" | "deezer" | "tidal" | "soundcloud" | "bandcamp"; label: string }`;
  - `listenService(url): ListenService | null`;
  - `AudioPage.listen: { url: string }[]` (max 8);
  - `AudioPage.tracks: { title: string; file: Media | null; link: string }[]` (max 10).

- [ ] **Step 1: Write the failing tests.** In `lib/pages/pages.test.ts`, add `audioEmbed` and `listenService` to the urls import:

```ts
describe("audio links", () => {
  it("embeds Spotify, SoundCloud and Apple players at their own heights", () => {
    expect(audioEmbed("https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC?si=x")).toEqual({
      provider: "spotify",
      src: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
      name: "Spotify",
      height: 152,
    });
    expect(audioEmbed("https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3")?.height).toBe(352);
    expect(audioEmbed("https://soundcloud.com/artist/a-song")).toEqual({
      provider: "soundcloud",
      src: "https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Fa-song&visual=false",
      name: "SoundCloud",
      height: 166,
    });
    expect(audioEmbed("https://soundcloud.com/artist/sets/an-album")?.height).toBe(450);
    expect(audioEmbed("https://music.apple.com/us/album/x/1440857781?i=1440857798")).toMatchObject({
      provider: "apple",
      src: "https://embed.music.apple.com/us/album/x/1440857781?i=1440857798",
      height: 175,
    });
    expect(audioEmbed("https://podcasts.apple.com/us/podcast/a-show/id1200361736")).toMatchObject({
      src: "https://embed.podcasts.apple.com/us/podcast/a-show/id1200361736",
      height: 450,
    });
    // Short links and look-alikes aren't embedded.
    expect(audioEmbed("https://spotify.link/abc123")).toBeNull();
    expect(audioEmbed("https://on.soundcloud.com/abc")).toBeNull();
    expect(audioEmbed("https://open.spotify.com.evil.example/track/4uLU6hMCjMI75M1A2tKUQC")).toBeNull();
  });

  it("names a Listen on link's service from its address", () => {
    expect(listenService("https://open.spotify.com/artist/x")?.label).toBe("Spotify");
    expect(listenService("https://spotify.link/abc")?.id).toBe("spotify");
    expect(listenService("https://music.apple.com/us/artist/x/1")?.label).toBe("Apple Music");
    expect(listenService("https://podcasts.apple.com/us/podcast/x/id1")?.label).toBe("Apple Podcasts");
    expect(listenService("https://music.youtube.com/channel/x")?.label).toBe("YouTube Music");
    expect(listenService("https://music.amazon.co.uk/artists/x")?.label).toBe("Amazon Music");
    expect(listenService("https://www.deezer.com/artist/1")?.id).toBe("deezer");
    expect(listenService("https://link.deezer.com/s/abc")?.id).toBe("deezer");
    expect(listenService("https://listen.tidal.com/artist/1")?.id).toBe("tidal");
    expect(listenService("https://on.soundcloud.com/abc")?.id).toBe("soundcloud");
    expect(listenService("https://artist.bandcamp.com/album/x")?.label).toBe("Bandcamp");
    expect(listenService("https://example.com/music")).toBeNull();
    expect(listenService("https://bandcamp.com.evil.example/x")).toBeNull();
  });

  it("reads an old audio page with no Listen on links or tracks", () => {
    expect(sanitizePage("audio", { title: "T", link: "https://open.spotify.com/track/x" })).toMatchObject({
      listen: [],
      tracks: [],
    });
  });

  it("checks Listen on links and tracks", () => {
    const page = { ...PAGE_DEFAULTS.audio(), title: "T", link: "https://example.com/a" };
    expect(
      validatePage("audio", {
        ...page,
        listen: [{ url: "https://example.com/music" }],
        tracks: [{ title: "Intro", file: null, link: "" }],
      }),
    ).toEqual({
      "listen.0.url":
        "Use a link from Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, Tidal, SoundCloud or Bandcamp",
      "tracks.0.file": "Upload the track or add its link",
    });
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages/pages.test.ts -t "audio links"`
Expected: FAIL.

- [ ] **Step 3: Implement.** In `lib/pages/urls.ts`:

```ts
export type AudioEmbed = {
  provider: "spotify" | "soundcloud" | "apple";
  src: string;
  /** For "Tap to play from Spotify". */
  name: string;
  /** The player's own height, in pixels. */
  height: number;
};

/** A Spotify, SoundCloud or Apple Music / Podcasts link as that site's player (spec item 48). */
export function audioEmbed(input: string): AudioEmbed | null {
  const href = safeHref(input);
  if (!href) return null;
  const url = new URL(href);
  const host = url.hostname.replace(/^www\./, "");
  if (host === "open.spotify.com") {
    const match = /^(?:\/intl-[a-z-]+)?\/(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{22})/.exec(url.pathname);
    if (match) {
      const [, kind, id] = match;
      return {
        provider: "spotify",
        src: `https://open.spotify.com/embed/${kind}/${id}`,
        name: "Spotify",
        height: kind === "track" || kind === "episode" ? 152 : 352,
      };
    }
  }
  if (host === "soundcloud.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return {
        provider: "soundcloud",
        src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(`https://soundcloud.com/${parts.join("/")}`)}&visual=false`,
        name: "SoundCloud",
        height: parts[1] === "sets" ? 450 : 166,
      };
    }
  }
  if (host === "music.apple.com" || host === "podcasts.apple.com") {
    if (/^\/[a-z]{2}\/(album|playlist|song|podcast)\//.test(url.pathname)) {
      const one = url.searchParams.has("i") || url.pathname.includes("/song/");
      return {
        provider: "apple",
        src: `https://embed.${host}${url.pathname}${url.search}`,
        name: host === "music.apple.com" ? "Apple Music" : "Apple Podcasts",
        height: one ? 175 : 450,
      };
    }
  }
  return null;
}

export type ListenService = {
  id: "spotify" | "applemusic" | "applepodcasts" | "youtubemusic" | "amazon" | "deezer" | "tidal" | "soundcloud" | "bandcamp";
  label: string;
};

/** Which service a "Listen on" link is from, by its address (spec item 49, ruling 3). */
export function listenService(input: string): ListenService | null {
  const href = safeHref(input);
  if (!href) return null;
  const host = new URL(href).hostname.replace(/^www\./, "");
  const is = (...hosts: string[]) => hosts.includes(host);
  if (is("open.spotify.com", "spotify.link")) return { id: "spotify", label: "Spotify" };
  if (is("music.apple.com")) return { id: "applemusic", label: "Apple Music" };
  if (is("podcasts.apple.com")) return { id: "applepodcasts", label: "Apple Podcasts" };
  if (is("music.youtube.com")) return { id: "youtubemusic", label: "YouTube Music" };
  if (/^music\.amazon\.[a-z.]{2,6}$/.test(host)) return { id: "amazon", label: "Amazon Music" };
  if (is("deezer.com", "link.deezer.com", "deezer.page.link")) return { id: "deezer", label: "Deezer" };
  if (is("tidal.com", "listen.tidal.com")) return { id: "tidal", label: "Tidal" };
  if (is("soundcloud.com", "on.soundcloud.com")) return { id: "soundcloud", label: "SoundCloud" };
  if (host === "bandcamp.com" || /^[a-z0-9-]+\.bandcamp\.com$/.test(host)) return { id: "bandcamp", label: "Bandcamp" };
  return null;
}
```

`lib/pages/types.ts` `AudioPage` gains:

```ts
  /** Up to 8 "Listen on" buttons; each link's service comes from its address (spec item 49). */
  listen: { url: string }[];
  /** Up to 10, each an uploaded file or a link; they play one at a time (spec item 50). */
  tracks: { title: string; file: Media | null; link: string }[];
```

- `LIMITS` gains `listen: 8, tracks: 10`.
- The defaults add `listen: [], tracks: []`.

`lib/pages/sanitize.ts` audio schema gains:

```ts
    listen: { kind: "list", max: LIMITS.listen, item: { url: str(2048) } },
    tracks: {
      kind: "list",
      max: LIMITS.tracks,
      item: { title: str(), file: media, link: str(2048) },
    },
```

`lib/pages/validate.ts` audio becomes:

```ts
  audio: (p) => {
    const errors: PageErrors = {};
    const anyTrack = p.tracks.some((t) => t.file || t.link.trim());
    if (!p.file && !p.link.trim() && !anyTrack) errors.file = "Upload an audio file or add a link";
    checkUrl(errors, "link", p.link);
    p.listen.forEach((l, i) => {
      if (!l.url.trim()) return;
      if (!safeHref(l.url)) errors[`listen.${i}.url`] = URL_MESSAGE;
      else if (!listenService(l.url)) {
        errors[`listen.${i}.url`] =
          "Use a link from Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, Tidal, SoundCloud or Bandcamp";
      }
    });
    p.tracks.forEach((t, i) => {
      if (t.title.trim() && !t.file && !t.link.trim()) errors[`tracks.${i}.file`] = "Upload the track or add its link";
      checkUrl(errors, `tracks.${i}.link`, t.link);
    });
    return errors;
  },
```

Import `listenService`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/pages
git commit -m "Audio data: Spotify, SoundCloud and Apple players, Listen on links named by their address, and a tracklist"
```

---

### Task 6: The Audio page: players after a tap, Listen on buttons, tracks one at a time

**Files:**
- Create:
  - `features/pages/OneAtATime.tsx`
  - `features/pages/MusicIcon.tsx`
- Modify:
  - `features/pages/TapToPlay.tsx` (any player, any height)
  - `features/pages/PageView.tsx` (`AudioView`; `VideoPlayer` passes the new props)
- Test:
  - `features/pages/TapToPlay.test.tsx`
  - `features/pages/PageView.test.tsx`
  - `features/pages/OneAtATime.test.tsx`

**Interfaces:**
- Consumes: Task 5's `audioEmbed`, `listenService`, `listen` and `tracks`; Task 1's `MUSIC_ICONS`.
- Produces:
  - `<TapToPlay src name title frame? height? />`, which replaces `embed`;
  - `<OneAtATime />`;
  - `<MusicIcon service={ListenService["id"]} />`.

- [ ] **Step 1: Write the failing tests.**

`features/pages/OneAtATime.test.tsx`:

```tsx
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OneAtATime } from "./OneAtATime";

describe("OneAtATime", () => {
  it("pauses the other players when one starts", () => {
    const { container } = render(
      <>
        <OneAtATime />
        <audio data-testid="a" />
        <audio data-testid="b" />
        <video data-testid="c" />
      </>,
    );
    const [a, b, c] = container.querySelectorAll<HTMLMediaElement>("audio, video");
    for (const el of [a!, b!, c!]) el.pause = vi.fn();
    fireEvent.play(b!);
    expect(a!.pause).toHaveBeenCalled();
    expect(c!.pause).toHaveBeenCalled();
    expect(b!.pause).not.toHaveBeenCalled();
  });
});
```

In `features/pages/TapToPlay.test.tsx`, update the existing test to the new props (`src`, `name`) and add:

```tsx
  it("holds a player of a set height until it's tapped", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TapToPlay src="https://open.spotify.com/embed/track/x" name="Spotify" title="Song" height={152} />,
    );
    const button = screen.getByRole("button", { name: "Tap to play from Spotify" });
    expect(button).toHaveStyle({ height: "152px" });
    await user.click(button);
    expect(container.querySelector("iframe")).toHaveAttribute("height", "152");
  });
```

In `features/pages/PageView.test.tsx`:

```tsx
describe("Audio extras", () => {
  const audio = (patch: object) => ({ ...PAGE_DEFAULTS.audio(), title: "Album", ...patch });

  it("shows the Spotify player after a tap, in place of the Listen button", async () => {
    const user = userEvent.setup();
    const { container } = view("audio", audio({ link: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" }), false);
    expect(screen.queryByRole("link", { name: /^Listen$/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Tap to play from Spotify" }));
    expect(container.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
    );
  });

  it("keeps the Listen button for another link", () => {
    view("audio", audio({ link: "https://example.com/song" }), false);
    expect(screen.getByRole("link", { name: /Listen/ })).toHaveAttribute("href", "https://example.com/song");
  });

  it("shows a Listen on button per service, and the tracks", () => {
    const { container } = view(
      "audio",
      audio({
        link: "https://example.com/song",
        listen: [{ url: "https://music.apple.com/us/album/x/1" }, { url: "https://music.amazon.com/albums/x" }, { url: "" }],
        tracks: [
          { title: "Intro", file: media("1.mp3", "audio/mpeg"), link: "" },
          { title: "Live", file: null, link: "https://example.com/live" },
        ],
      }),
      false,
    );
    expect(screen.getByRole("link", { name: /Listen on Apple Music/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Listen on Amazon Music/ })).toBeInTheDocument();
    const tracks = within(screen.getByRole("region", { name: "Tracks" }));
    expect(tracks.getByText("Intro")).toBeInTheDocument();
    expect(container.querySelectorAll("section[aria-label=Tracks] audio")).toHaveLength(1);
    expect(tracks.getByRole("link", { name: /Live/ })).toHaveAttribute("href", "https://example.com/live");
  });

  it("plays nothing in the editor's preview", () => {
    const { container } = view(
      "audio",
      audio({
        link: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
        tracks: [{ title: "Intro", file: media("1.mp3", "audio/mpeg"), link: "" }],
      }),
      true,
    );
    expect(container.querySelector("audio, iframe")).toBeNull();
    expect(screen.queryByRole("button", { name: /Tap to play/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages -t "OneAtATime|holds a player|Audio extras"`
Expected: FAIL.

- [ ] **Step 3: Implement.**

`features/pages/TapToPlay.tsx`:
- The props become `{ src: string; name: string; title: string; frame?: string; height?: number }`.
- The size is `height ? "w-full" : (frame ?? "aspect-video w-full")`, with `style={height ? { height } : undefined}` on the button, and `height={height}` with the same style on the iframe.
- Keep the focus move from 4a.
- `VideoPlayer` passes `src={embed.src} name={embed.name} frame={embed.vertical ? "mx-auto aspect-[9/16] w-full max-w-[22rem]" : "aspect-video w-full"}`.

`features/pages/OneAtATime.tsx`:

```tsx
"use client";

import { useEffect } from "react";

/** Starting one player pauses the others on the page (spec item 50). */
export function OneAtATime() {
  useEffect(() => {
    const onPlay = (event: Event) => {
      for (const el of document.querySelectorAll<HTMLMediaElement>("audio, video")) {
        if (el !== event.target) el.pause();
      }
    };
    // "play" doesn't bubble, so it's caught on the way down.
    document.addEventListener("play", onPlay, true);
    return () => document.removeEventListener("play", onPlay, true);
  }, []);
  return null;
}
```

A player inside a tapped iframe is another site's page, so it isn't touched.

`features/pages/MusicIcon.tsx`:

```tsx
import { Music } from "lucide-react";

import { MUSIC_ICONS } from "@/lib/pages/music-icons.data";
import { SOCIAL_ICONS } from "@/lib/pages/social-icons.data";
import type { ListenService } from "@/lib/pages/urls";

/** A music service's mark; Amazon Music has none in Simple Icons, so a note (ruling 4). */
export function MusicIcon({ service }: { service: ListenService["id"] }) {
  const mark =
    MUSIC_ICONS.find((icon) => icon.id === service) ?? SOCIAL_ICONS.find((icon) => icon.id === service);
  if (!mark) return <Music aria-hidden className="size-5" />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="currentColor">
      <path d={mark.path} />
    </svg>
  );
}
```

`features/pages/PageView.tsx` `AudioView`:
1. **The main link:** `const embed = audioEmbed(page.link)`. When `embed`:
   - outside the preview, render `<TapToPlay src={embed.src} name={embed.name} title={page.title || "Audio"} height={embed.height} />` in the card, in place of the Listen `PageLink`;
   - in the preview, render the existing "Plays on the live page" line.
   Otherwise keep the Listen link as today.
2. **"Listen on" buttons:** after the card, when any link names a service:

```tsx
      {listen.length > 0 && (
        <div className="flex flex-col gap-2">
          {listen.map(({ url, service }) => (
            <PageLink key={url} href={safeHref(url)} variant="secondary" preview={preview} icon={<MusicIcon service={service.id} />}>
              Listen on {service.label}
            </PageLink>
          ))}
        </div>
      )}
```

   `listen` is `(page.listen ?? []).flatMap((l) => { const service = listenService(l.url); return service ? [{ url: l.url, service }] : []; })`.
3. **Tracks:** when any track has a file or link:

```tsx
      {tracks.length > 0 && (
        <PageCard>
          <section aria-label="Tracks">
            <h2 className="mb-3 font-page-heading text-lg font-bold text-fg">Tracks</h2>
            <ol className="flex flex-col gap-4">
              {tracks.map((t, i) => (
                <li key={i} className="flex flex-col gap-2">
                  <span className="flex items-baseline gap-2">
                    <span className="text-sm text-fg-muted tabular-nums">{i + 1}.</span>
                    <span className="min-w-0 font-medium [overflow-wrap:anywhere] text-fg">
                      {t.title.trim() || t.file?.name || "Track"}
                    </span>
                  </span>
                  {t.file ? (
                    preview ? (
                      <p className="text-sm text-fg-muted">Plays on the live page</p>
                    ) : (
                      <audio src={mediaUrl(t.file.path)} controls preload="none" className="w-full" />
                    )
                  ) : (
                    <PageLink href={safeHref(t.link)} variant="secondary" preview={preview}>
                      <Music aria-hidden /> Listen to {t.title.trim() || "this track"}
                    </PageLink>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </PageCard>
      )}
      {!preview && <OneAtATime />}
```

   `tracks` is `(page.tracks ?? []).filter((t) => t.file || safeHref(t.link))`.

Imports: `TapToPlay`, `OneAtATime`, `MusicIcon`, `audioEmbed` and `listenService`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS, including Release 4a's video tests with the new `TapToPlay` props.

- [ ] **Step 5: Commit.**

```bash
git add features/pages
git commit -m "The Audio page: Spotify, SoundCloud and Apple players after a tap; Listen on buttons with each service's mark; tracks that play one at a time"
```

---

### Task 7: The Audio editor: Listen on links and tracks

**Files:**
- Modify: `features/pages/editor/editors/AudioEditor.tsx`
- Test: `features/pages/editor/PageEditor.test.tsx`

**Interfaces:**
- Consumes: Task 5's fields and `listenService`.

- [ ] **Step 1: Write the failing tests.**

```tsx
describe("Audio editor extras", () => {
  function Audio() {
    const [page, setPage] = useState(PAGE_DEFAULTS.audio());
    return (
      <>
        <PageEditor type="audio" page={page} errors={{}} onUpdate={(update) => setPage((p) => update(p))} />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);

  it("adds a Listen on link, naming its service, and a track with a link", async () => {
    const user = userEvent.setup();
    render(<Audio />);
    await user.click(screen.getByRole("button", { name: "Add Listen on link" }));
    await user.type(screen.getByRole("textbox", { name: /^Listen on link/ }), "music.apple.com/us/album/x/1");
    expect(screen.getByText("Shows as Listen on Apple Music")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add track" }));
    await user.type(screen.getByRole("textbox", { name: /^Track title/ }), "Intro");
    await user.type(screen.getByRole("textbox", { name: /^Or the track’s link/ }), "example.com/intro");
    expect(saved()).toMatchObject({
      listen: [{ url: "music.apple.com/us/album/x/1" }],
      tracks: [{ title: "Intro", file: null, link: "example.com/intro" }],
    });
  });
});
```

Add the cards to `CARDS.audio`: `["Audio", "Listen on", "Tracks", "Header", "Details"]`. Seed the every-box-has-a-limit test: `if (type === "audio") { page.listen = [{ url: "" }]; page.tracks = [{ title: "", file: null, link: "" }]; }`.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx -t "Audio editor extras|audio:"`
Expected: FAIL.

- [ ] **Step 3: Implement.** In `features/pages/editor/editors/AudioEditor.tsx`:
1. **The main link's hint** becomes "A Spotify, SoundCloud or Apple Music link shows its player; others show a Listen button."
2. **A "Listen on" card** after Audio:

```tsx
      <FormCard title="Listen on" note="Buttons to your music on other services, up to 8">
        <SortableList
          label="Listen on links"
          showLabel={false}
          items={page.listen}
          onChange={(listen) => set({ listen })}
          max={LIMITS.listen}
          addLabel="Add Listen on link"
          addAt="end"
          newRowFocus="input[type='url']"
          path="listen"
          errors={errors}
          itemLabel={(item, i) => rowName("link", listenService(item.url)?.label ?? item.url, i)}
          newItem={() => ({ url: "" })}
          render={(item, update, i) => {
            const service = listenService(item.url);
            return (
              <TextField
                label="Listen on link"
                type="url"
                inputMode="url"
                value={item.url}
                onChange={(url) => update({ url })}
                path={`listen.${i}.url`}
                errors={errors}
                placeholder="open.spotify.com/artist/…"
                hint={
                  service
                    ? `Shows as Listen on ${service.label}`
                    : "Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, Tidal, SoundCloud or Bandcamp"
                }
              />
            );
          }}
        />
      </FormCard>
```

3. **A "Tracks" card** after it:

```tsx
      <FormCard title="Tracks" note="Up to 10; starting one pauses the others">
        <SortableList
          label="Tracks"
          showLabel={false}
          items={page.tracks}
          onChange={(tracks) => set({ tracks })}
          max={LIMITS.tracks}
          addLabel="Add track"
          addAt="end"
          newRowFocus="input[data-field$='.title']"
          path="tracks"
          errors={errors}
          itemLabel={(item, i) => rowName("track", item.title, i)}
          newItem={() => ({ title: "", file: null, link: "" })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <TextField
                path={`tracks.${i}.title`}
                errors={errors}
                label="Track title"
                value={item.title}
                onChange={(title) => update({ title })}
              />
              <MediaField
                label="Track file"
                kind="audio"
                field={`tracks.${i}.file`}
                value={item.file}
                onChange={(file) => update({ file })}
                hint="MP3, M4A, WAV or OGG, up to 15 MB."
                error={touched ? errors.error(`tracks.${i}.file`) : undefined}
              />
              <TextField
                label="Or the track’s link"
                optional
                type="url"
                inputMode="url"
                value={item.link}
                onChange={(link) => update({ link })}
                path={`tracks.${i}.link`}
                errors={errors}
              />
            </div>
          )}
        />
      </FormCard>
```

Imports: `LIMITS`, `rowName`, `SortableList` and `listenService`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add features/pages/editor
git commit -m "The Audio editor: Listen on links that name their service, and tracks with a file or link"
```

---

### Task 8: Browser tests, including a real first-page preview

**Files:**
- Modify: `e2e/accounts/fixtures.ts`
- Create: `e2e/accounts/audio-pdf.spec.ts`

- [ ] **Step 1: Add the fixture pages to `PHONE_PAGES`.** File paths are placeholders, as before; previews use `photo()`.

```ts
  {
    type: "pdf",
    slug: "PHONE-PDF-LIST",
    content: {
      title: "Phone menus",
      files: [
        { file: { path: "00000000-0000-4000-8000-000000000000/food.pdf", name: "food.pdf", type: "application/pdf", size: 120000 }, title: "Food menu with a long name that wraps on phones", preview: photo("food-page") },
        { file: { path: "00000000-0000-4000-8000-000000000000/wine.pdf", name: "wine.pdf", type: "application/pdf", size: 80000 }, title: "", preview: null },
      ],
    },
  },
  {
    type: "audio",
    slug: "PHONE-AUDIO-PLUS",
    content: {
      title: "Phone album",
      artist: "Ziplume",
      link: "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3",
      listen: [
        "https://music.apple.com/us/album/x/1",
        "https://music.youtube.com/playlist?list=x",
        "https://music.amazon.com/albums/x",
        "https://www.deezer.com/album/1",
        "https://listen.tidal.com/album/1",
        "https://soundcloud.com/artist/sets/x",
        "https://artist.bandcamp.com/album/x",
        "https://podcasts.apple.com/us/podcast/x/id1",
      ].map((url) => ({ url })),
      tracks: [
        { title: "Intro", file: { path: "00000000-0000-4000-8000-000000000000/intro.mp3", name: "intro.mp3", type: "audio/mpeg", size: 1000 }, link: "" },
        { title: "Live at the hall, a very long track title", file: null, link: "https://example.com/live" },
      ],
    },
  },
```

- [ ] **Step 2: Write the tests.** Create `e2e/accounts/audio-pdf.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { MAKER } from "./fixtures";

// A one-page PDF, small enough to write here. pdf.js rebuilds its missing cross-reference table.
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 400]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

test.describe("Audio and PDF extras", () => {
  test.use({ storageState: MAKER.state });
  test.beforeEach(async ({ page }) => {
    await page.route(/spotify\.com|soundcloud\.com|apple\.com/, (route) => route.abort());
  });

  test("uploading a PDF draws its first page as the preview", async ({ page }) => {
    await page.goto("codes/new?type=pdf");
    await page.locator("input[type=file][data-field='files.0.file']").setInputFiles({
      name: "menu.pdf",
      mimeType: "application/pdf",
      buffer: PDF,
    });
    await expect(page.getByRole("img", { name: "First page preview" })).toBeVisible({ timeout: 20_000 });
    const preview = page.getByRole("complementary", { name: "Preview" });
    await expect(preview.getByRole("img", { name: /^First page of/ })).toBeVisible();
  });

  test("several PDFs show as a list with View and Download", async ({ page }) => {
    await page.goto("p/PHONE-PDF-LIST");
    const list = page.getByRole("list", { name: "PDFs" });
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await expect(list.getByRole("link", { name: /^Download wine\.pdf/ })).toBeVisible();
  });

  test("the Spotify player waits for a tap; Listen on buttons show each service", async ({ page }) => {
    await page.goto("p/PHONE-AUDIO-PLUS");
    await expect(page.locator("iframe")).toHaveCount(0);
    for (const name of ["Apple Music", "YouTube Music", "Amazon Music", "Deezer", "Tidal", "SoundCloud", "Bandcamp", "Apple Podcasts"]) {
      await expect(page.getByRole("link", { name: `Listen on ${name}` })).toBeVisible();
    }
    await page.getByRole("button", { name: "Tap to play from Spotify" }).click();
    await expect(page.locator("iframe")).toHaveAttribute("src", "https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3");
    await expect(page.getByRole("region", { name: "Tracks" }).locator("audio")).toHaveCount(1);
  });
});
```

The PDF test needs the vendor files served by the test build (`npm run build` runs `prebuild`) and local storage uploads, as other upload tests do. If the editor's file input carries another `data-field`, use the PDFs card's first file input.

- [ ] **Step 3: Run the signed-in suite.**

Run: `npm run test:e2e:accounts`
Expected: all PASS, including the phone and look sweeps for the new pages. If the preview test fails because pdf.js can't load, check the network tab in the trace for `/vendor/pdfjs/…`, and fix the import or the copy step.

- [ ] **Step 4: Commit.**

```bash
git add e2e/accounts
git commit -m "Browser tests: a real PDF first-page preview, the PDF list, Spotify after a tap, Listen on buttons and tracks"
```

---

### Task 9: Ship Release 4b

There's no migration in this release.

- [ ] **Step 1: Update the API docs.** After the Images, Video and App paragraph:

> PDF pages take `files` (up to 10, each an uploaded `file`, a `title` and a `preview` image); a single `file` still works, as the first. `direct` opens the file only when there's one. Audio pages take `listen` (up to 8, each a `url` from Spotify, Apple Music, Apple Podcasts, YouTube Music, Amazon Music, Deezer, Tidal, SoundCloud or Bandcamp) and `tracks` (up to 10, each a `title` with an uploaded `file` or a `link`). A Spotify, SoundCloud or Apple `link` shows that site's player.

Commit it.

- [ ] **Step 2: Run the full local check.**

Run: `npm run format:check && npm run lint && npx tsc --noEmit && npm test && npm run test:e2e:accounts && npm run build && npm run test:e2e`
Expected: all PASS. `format:check` may list only git-ignored files.

- [ ] **Step 3: Run the final whole-branch review,** with this plan's Review Focus and the ledger's rulings. Do one fix pass.

- [ ] **Step 4: Push, open the PR, wait for CI, and merge.**

```bash
git push -u origin feat/page-enhancements-r4b
gh pr create --base main --head feat/page-enhancements-r4b --title "Page enhancements 4b: several PDFs with first-page previews; Audio players, Listen on buttons and tracks" --body "<items 39–40 and 48–50, the two downloads, no migration, rulings, and the test counts>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
gh pr merge --merge
```

- [ ] **Step 5: Check the live site.**
1. Wait for the version in `https://ziplume.com/sw.js` to change.
2. Check that `https://ziplume.com/vendor/pdfjs/pdf.min.mjs` returns 200, and that `sw.js` doesn't mention `vendor/pdfjs`.
3. Find client chunks containing "Add Listen on link" and "Add PDF".
4. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307.
5. Create nothing in David's account.
