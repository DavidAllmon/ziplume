# Phase 0: "New code" starts clean, plus go-live wrap-up. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every new QR code in the current generator starts from default settings, with nothing carried over from the previous code. Then finish the qr.techitdave.com go-live: docs PR and GitHub Pages redirect.

**Architecture:**

- The generator (`features/generator/useGenerator.ts` with `state/reducer.ts`) stops writing its type, design and export settings to localStorage. It deletes the old key once.
- The typed code name moves into reducer state. A new `reset` action returns everything to `initialState()`, and "New code" uses it.
- Edit mode follows the `?edit=` search parameter through `useSearchParams`, using a small pure function that decides between reset, load and nothing. So clicking the logo while editing gives a clean form, and saving does not reset.
- Bulk create uses the default design instead of reading the generator's storage.

**Tech Stack:** Next.js 16.4 (App Router), React 19.3, TypeScript, Vitest 5 + Testing Library (jsdom), Playwright 1.56, Prettier, ESLint.

**Spec:** `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md` (sections 4.2 "Fresh state and drafts" and 8, Phase 0).

## Global Constraints

- **Toolchain:** Node 22 (`.nvmrc`). `npm ci` for installs. Never change `package-lock.json` in this phase.
- **Code quality:** formatting must pass `npm run format:check` (Prettier), and `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e` must all pass.
- **What may persist:** only the theme (next-themes) is remembered. The generator's design, type, export settings, name and content are never written to localStorage.
- **Legacy key:** the old key `quickqreate:v1` is removed on load and never read again.
- **Links:** printed links `/r/<slug>` and `/p/<slug>` are not touched.
- **Commits:** every commit message ends with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- **Secrets:** no secrets, keys or passwords in code, docs, commit messages or PR text.
- **UI copy:** plain words, sentence case.

## Review Focus

Each of these failure modes has its test in the task that owns the code.

1. **Logo click while editing.** Clicking the logo (or any link to `/`) while editing a saved code must show a fresh, empty form, not the old code. Test in Task 3: `editTransition(null, "a") === "reset"`.
2. **Saving a new code.** The URL becomes `/?edit=<newId>`, and the form must stay as it is, with no reset or reload. Test in Task 3: `editTransition("a", "a") === "none"`. The hook also sets the saved id before changing the URL.
3. **Old saved settings.** Visitors who still have settings from before this fix must get defaults, and the old key must be deleted. Test in Task 2: the "settings saved by older versions" e2e test.
4. **"New code" after saving.** It must clear the name, content, hosted-page drafts, design and export settings. Test in Task 1: the "reset" reducer test compares against `initialState()`.
5. **Opening a different code.** Using "Edit design" for another code while one is open must load the new code. Test in Task 3: `editTransition("b", "a") === "load"`.

---

### Task 1: Name in generator state, and a full `reset`

**Files:**
- Modify: `features/generator/state/types.ts` (`GeneratorState`, `GeneratorAction`)
- Modify: `features/generator/state/defaults.ts` (`initialState`, new `MAX_CODE_NAME`)
- Modify: `features/generator/state/reducer.ts` (new `setName` and `reset` cases; `loadCode` clears the name)
- Modify: `features/generator/useGenerator.ts` (`setName`, `startNew`)
- Modify: `features/generator/SavePanel.tsx` (use generator state for the name)
- Test: `features/generator/state/reducer.test.ts`

**Interfaces:**
- Produces:
  - `GeneratorState.name: string`
  - actions `{ type: "setName"; name: string }` and `{ type: "reset" }`
  - `MAX_CODE_NAME = 120`
  - from `useGenerator()`: `setName(name: string): void`
  - `startNew()`, which now resets every setting. Task 3 relies on it.

- [ ] **Step 1: Write the failing tests.** Append to `features/generator/state/reducer.test.ts`:

```ts
describe("reset", () => {
  it("returns every setting to its default", () => {
    let state = initialState();
    state = reduce(state, { type: "setActiveType", activeType: "wifi" });
    state = reduce(state, { type: "setField", qrType: "wifi", field: "ssid", value: "Home" });
    state = reduce(state, { type: "setDesign", patch: { fgColor: "#123456", dotStyle: "dots" } });
    state = reduce(state, { type: "setLogo", logo: "data:image/png;base64,AAA" });
    state = reduce(state, { type: "setExport", patch: { format: "svg", size: 2048 } });
    state = reduce(state, { type: "setName", name: "Front desk" });
    expect(reduce(state, { type: "reset" })).toEqual(initialState());
  });
});

describe("name", () => {
  it("is stored and capped at 120 characters", () => {
    let state = reduce(initialState(), { type: "setName", name: "Spring menu" });
    expect(state.name).toBe("Spring menu");
    state = reduce(state, { type: "setName", name: "x".repeat(200) });
    expect(state.name).toHaveLength(120);
  });

  it("is cleared when a saved code is loaded", () => {
    let state = reduce(initialState(), { type: "setName", name: "Typed name" });
    state = reduce(state, {
      type: "loadCode",
      qrType: "url",
      content: { url: "https://example.com" },
      design: DEFAULT_DESIGN,
    });
    expect(state.name).toBe("");
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run features/generator/state/reducer.test.ts`
Expected: FAIL. The types reject `setName` and `reset`, and `state.name` is undefined.

- [ ] **Step 3: Implement.**

In `features/generator/state/types.ts`, add to `GeneratorState`, after `ecBeforeLogo`:

```ts
  /** The name typed for the code (empty means "use the suggested name"). */
  name: string;
```

and add two members to the `GeneratorAction` union, before the `loadCode` member:

```ts
  | { type: "setName"; name: string }
  /** Start a brand-new code: every setting back to its default. */
  | { type: "reset" }
```

In `features/generator/state/defaults.ts`, add after `MAX_FRAME_TEXT`:

```ts
/** Longest code name the account stores (matches the save field's maxLength). */
export const MAX_CODE_NAME = 120;
```

and in `initialState()`, add `name: "",` after `ecBeforeLogo: null,`.

In `features/generator/state/reducer.ts`:
- Change the first import to `import { DEFAULT_DESIGN, initialState, MAX_CODE_NAME, MAX_EXPORT_SIZE, MIN_EXPORT_SIZE } from "./defaults";`.
- Add these cases before `case "loadCode":`:

```ts
    case "setName":
      return { ...state, name: action.name.slice(0, MAX_CODE_NAME) };

    case "reset":
      return initialState();
```

- In both `return` objects inside `case "loadCode":`, add `name: "",` after `ecBeforeLogo: null,`.

In `features/generator/useGenerator.ts`:
- Add after `setPage`:

```ts
  const setName = useCallback((name: string) => dispatch({ type: "setName", name }), []);
```

- Replace the `startNew` block with:

```ts
  /** Leaves edit mode and starts a brand-new code with default settings. */
  const startNew = useCallback(() => {
    dispatch({ type: "reset" });
    setSaved(null);
    setWantsDynamic(false);
    window.history.replaceState(null, "", workspace ? `/?workspace=${workspace.ownerId}` : "/");
  }, [workspace]);
```

- Add `setName,` to the returned object after `setPage,`.

In `features/generator/SavePanel.tsx`:
- Remove the line `const [name, setName] = useState("");`. Keep the React import as it is, because `pending` still uses `useState`.
- After `const { saved, defaultName, save, data, isDynamic, workspace } = generator;`, add `const name = generator.state.name;`.
- Change the input's `onChange` to `onChange={(e) => generator.setName(e.target.value)}`.
- Change `maxLength={120}` to `maxLength={MAX_CODE_NAME}`, importing it with `import { MAX_CODE_NAME } from "./state/defaults";`.

- [ ] **Step 4: Run the tests and typecheck, and confirm they pass.**

Run: `npx vitest run features/generator/state/reducer.test.ts && npm run typecheck`
Expected: PASS. Typecheck has 0 errors.

- [ ] **Step 5: Commit.**

```bash
git add features/generator/state/types.ts features/generator/state/defaults.ts features/generator/state/reducer.ts features/generator/state/reducer.test.ts features/generator/useGenerator.ts features/generator/SavePanel.tsx
git commit -m "Reset every setting when starting a new code

The code name now lives in generator state, and a reset action returns
type, content, hosted-page drafts, design, export settings and name to
their defaults. The New code button uses it.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Stop remembering generator settings

**Files:**
- Delete: `features/generator/state/persistence.ts`, `features/generator/state/persistence.test.ts`
- Modify: `features/generator/state/types.ts` (remove `PersistedSettings` and the `hydrate` action)
- Modify: `features/generator/state/reducer.ts` (remove `case "hydrate"`)
- Modify: `features/generator/state/reducer.test.ts` (remove `describe("hydrate", …)`)
- Modify: `features/generator/useGenerator.ts` (remove save and load effects; clear the legacy key once)
- Modify: `features/bulk/BulkGenerator.tsx` (use `DEFAULT_DESIGN`; update copy)
- Test: `e2e/experience.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `LEGACY_SETTINGS_KEY = "quickqreate:v1"`, exported from `features/generator/useGenerator.ts` for tests.

- [ ] **Step 1: Write the failing e2e tests.** In `e2e/experience.spec.ts`, replace the whole test `"design and theme are remembered, content is not"` (lines 27–38) with:

```ts
test("only the theme is remembered; design, type and content start fresh", async ({ page }) => {
  await page.getByRole("radio", { name: "Dark theme" }).click();
  await page.getByRole("button", { name: "Forest preset" }).click();
  await page.getByLabel("Website address").fill("example.com/private");
  await chooseType(page, "Wi-Fi");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Forest preset" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  // Link is the default type, so its field is back, and empty.
  await expect(page.getByLabel("Website address")).toHaveValue("");
});

test("settings saved by older versions are ignored and removed", async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem(
      "quickqreate:v1",
      JSON.stringify({
        version: 1,
        activeType: "wifi",
        design: { fgColor: "#14532D", bgColor: "#F0FDF4" },
        exportSettings: { format: "svg", size: 2048 },
      }),
    );
  });
  await page.reload();
  await expect(page.getByLabel("Website address")).toBeVisible();
  await expect(page.getByRole("button", { name: "Forest preset" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("quickqreate:v1")))
    .toBeNull();
});
```

- [ ] **Step 2: Build and run the two tests, and confirm they fail.**

Run:
```bash
npm ci
npm run build
npx playwright install chromium
npx playwright test e2e/experience.spec.ts -g "start fresh|older versions" --project=desktop
```
Expected: both FAIL. The Forest preset is still pressed after reload, and the old key is still present.

- [ ] **Step 3: Implement.**
  1. Delete `features/generator/state/persistence.ts` and `features/generator/state/persistence.test.ts`.
  2. In `features/generator/state/types.ts`, delete the line `| { type: "hydrate"; saved: PersistedSettings }` and the whole `export interface PersistedSettings { … }` block.
  3. In `features/generator/state/reducer.ts`, delete the whole `case "hydrate": { … }` block.
  4. In `features/generator/state/reducer.test.ts`, delete the whole `describe("hydrate", () => { … });` block.
  5. In `features/generator/useGenerator.ts`:
     - Delete `import { loadSettings, saveSettings } from "./state/persistence";`.
     - Add `import { removeKey } from "@/lib/storage";` with the other `@/lib` imports.
     - Delete `const hydrated = useRef(false);`, and both effects that call `saveSettings` and `loadSettings`, including their comments.
     - Remove `useRef` from the React import if nothing else uses it. Task 3 adds it back.
     - Above `export function useGenerator()`, add:

```ts
/** Versions before October 2026 remembered the last design here; it is cleared on load. */
export const LEGACY_SETTINGS_KEY = "quickqreate:v1";
```

     - At the top of the hook body, after the `useState` declarations, add:

```ts
  // New codes always start from the defaults. Remove settings an older version remembered.
  useEffect(() => removeKey(LEGACY_SETTINGS_KEY), []);
```

  6. In `features/bulk/BulkGenerator.tsx`:
     - Delete the imports of `loadSettings`/`STORAGE_KEY`, `sanitizeDesign` and `DesignState`.
     - Remove `useSyncExternalStore` from the React import.
     - Delete `const noopSubscribe…`, `let cachedDesign…` and the whole `storedDesign()` function with its comment.
     - Replace the two lines starting `// The generator's current design` and `const design = useSyncExternalStore(` with:

```ts
  // Bulk codes use the classic design; they never copy the last code you designed.
  const design = DEFAULT_DESIGN;
```

     - Replace the paragraph `Every code uses your current design. <Link …>Change it in the generator</Link>.` with:

```tsx
              <p className="text-sm text-fg-muted">
                Every code uses the classic black-and-white design, which scans most reliably.
              </p>
```

     - Remove the `Link` import if it is now unused. Check with `grep -n "<Link" features/bulk/BulkGenerator.tsx`.

- [ ] **Step 4: Rebuild and run the checks, and confirm they pass.**

Run:
```bash
npm run lint && npm run typecheck && npm test && npm run build
npx playwright test e2e/experience.spec.ts e2e/bulk.spec.ts
```
Expected: all PASS, in every project (desktop, tablet, mobile) where each test applies.

- [ ] **Step 5: Commit.**

```bash
git add -A features/generator features/bulk/BulkGenerator.tsx e2e/experience.spec.ts
git commit -m "Stop carrying settings from one code to the next

The generator no longer remembers type, design or export settings in
localStorage, and clears what older versions stored. Bulk codes use the
classic design. Only the theme is remembered.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Edit mode follows the address bar

**Files:**
- Create: `features/generator/editTransition.ts`
- Test: `features/generator/editTransition.test.ts`
- Modify: `features/generator/useGenerator.ts` (replace the mount-only `?edit=`/`?workspace=` effect)
- Modify: `app/page.tsx` (wrap `<Generator />` in `<Suspense>`, which `useSearchParams` requires)

**Interfaces:**
- Consumes: `startNew` and the `reset` action from Task 1.
- Produces: `editTransition(editParam: string | null, savedId: string | null): "none" | "load" | "reset"`.

- [ ] **Step 1: Write the failing test.** Create `features/generator/editTransition.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { editTransition } from "./editTransition";

describe("editTransition", () => {
  it("does nothing for a fresh page", () => {
    expect(editTransition(null, null)).toBe("none");
  });

  it("starts fresh when ?edit= disappears (for example, clicking the logo)", () => {
    expect(editTransition(null, "a")).toBe("reset");
  });

  it("does nothing when the URL names the code already open (right after saving it)", () => {
    expect(editTransition("a", "a")).toBe("none");
  });

  it("loads a code named in the URL", () => {
    expect(editTransition("a", null)).toBe("load");
    expect(editTransition("b", "a")).toBe("load");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails.**

Run: `npx vitest run features/generator/editTransition.test.ts`
Expected: FAIL with "Failed to resolve import ./editTransition".

- [ ] **Step 3: Implement.**

Create `features/generator/editTransition.ts`:

```ts
export type EditTransition = "none" | "load" | "reset";

/**
 * What the generator does when `?edit=` in the address bar changes.
 * - It disappears while a code is open (for example, the logo was clicked): start fresh.
 * - It names a code other than the open one: load that code.
 * - It names the open code (it was just saved), or both are empty: nothing.
 */
export function editTransition(editParam: string | null, savedId: string | null): EditTransition {
  if (editParam === null) return savedId === null ? "none" : "reset";
  return editParam === savedId ? "none" : "load";
}
```

In `features/generator/useGenerator.ts`:
- Ensure the React import includes `useRef`.
- Add `import { useSearchParams } from "next/navigation";` and `import { editTransition } from "./editTransition";`.
- After the `useState` declarations, add:

```ts
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const ownerParam = searchParams.get("workspace");
  /** The open code's id, updated before the URL changes so a save never looks like "leave". */
  const savedIdRef = useRef<string | null>(null);
```

- Replace the entire effect that begins with the comment `// Opening /?edit=<id> from the dashboard loads that saved code for editing, and` (through its closing `}, []);`) with:

```ts
  // The address bar decides what is open: /?edit=<id> edits that saved code, plain / is a new
  // code, and /?workspace=<owner id> saves new codes into a team workspace.
  useEffect(() => {
    const transition = editTransition(editId, savedIdRef.current);
    if (transition === "reset") {
      dispatch({ type: "reset" });
      savedIdRef.current = null;
      setSaved(null);
      setWantsDynamic(false);
      setWorkspace(null);
    }
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    if (!editId) {
      if (ownerParam) void editableWorkspace(ownerParam).then(setWorkspace);
      return;
    }
    if (transition !== "load") return;
    let cancelled = false;
    void supabase
      .from("qr_codes")
      .select("id, user_id, name, qr_type, content, design, is_dynamic, slug, destination")
      .eq("id", editId)
      .maybeSingle()
      .then(async ({ data: code }) => {
        if (cancelled || !code || !isCodeType(code.qr_type)) return;
        const { data: session } = await supabase.auth.getSession();
        if (cancelled) return;
        setWorkspace(
          code.user_id !== session.session?.user.id ? await editableWorkspace(code.user_id) : null,
        );
        const linkCode = code.is_dynamic && code.qr_type === "url";
        dispatch({
          type: "loadCode",
          qrType: code.qr_type,
          content: linkCode ? { url: code.destination ?? "" } : code.content,
          design: code.design,
        });
        savedIdRef.current = code.id;
        setSaved({ id: code.id, name: code.name, isDynamic: code.is_dynamic, slug: code.slug });
      });
    return () => {
      cancelled = true;
    };
  }, [editId, ownerParam]);
```

- In `save`, inside the new-code branch, set the ref before changing the URL. Replace the two lines `setSaved({ id: code.id, … });` and `window.history.replaceState(null, "", `/?edit=${code.id}`);` with:

```ts
      savedIdRef.current = code.id;
      setSaved({ id: code.id, name: code.name, isDynamic: code.is_dynamic, slug: code.slug });
      window.history.replaceState(null, "", `/?edit=${code.id}`);
```

- In `startNew`, add `savedIdRef.current = null;` right after `dispatch({ type: "reset" });`.
- In `leaveWorkspace`, keep the existing behavior. The URL it writes, `/`, has no `edit`, and `savedIdRef` is null for an unsaved code, so the transition is `"none"`.

In `app/page.tsx`:
- Add `import { Suspense } from "react";`.
- Replace `<Generator />` with:

```tsx
      {/* Generator reads ?edit= and ?workspace= with useSearchParams, which needs a boundary. */}
      <Suspense fallback={<div className="min-h-[36rem]" aria-busy="true" />}>
        <Generator />
      </Suspense>
```

- [ ] **Step 4: Run the checks and confirm they pass.**

Run:
```bash
npx vitest run features/generator/editTransition.test.ts
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
Expected:
- all PASS
- `next build` reports no "useSearchParams() should be wrapped in a suspense boundary" error
- the "works offline after the first visit" test still passes.

- [ ] **Step 5: Commit.**

```bash
git add features/generator/editTransition.ts features/generator/editTransition.test.ts features/generator/useGenerator.ts app/page.tsx
git commit -m "Follow the address bar for edit mode

Leaving /?edit=<id> (for example, by clicking the logo) now starts a
fresh code, another code's id loads that code, and saving a new code no
longer looks like leaving it.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Ship the fix

**Files:** none new. This is branch, PR, CI, merge, deploy and a live check.

- [ ] **Step 1: Run the full local check on the branch.**

Run:
```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e
```
Expected: all PASS. If formatting fails, run `npx prettier --write <files>` and amend the commit.

- [ ] **Step 2: Push and open the PR.**

```bash
git push -u origin fix/new-code-starts-clean
gh pr create --base main --head fix/new-code-starts-clean \
  --title "New codes start clean" \
  --body "$(cat <<'EOF'
Phase 0 of the redesign (docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md).

- New code resets type, content, hosted-page drafts, design, export settings and name.
- The generator no longer remembers settings in localStorage and clears the old key; only the theme is remembered.
- Leaving /?edit=<id> (e.g. the logo) starts fresh; saving no longer resets; another code's link loads that code.
- Bulk codes use the classic design.

Tests: reducer reset/name tests, editTransition tests, updated e2e (fresh start, legacy key removed).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for CI and merge.**

Run: `gh pr checks --watch`
Expected: "Lint, test & build" passes. Then run `gh pr merge --merge --delete-branch`.

- [ ] **Step 4: Confirm the auto-deploy and check the live site.**
  1. Coolify starts a deployment from the GitHub webhook. Confirm the new container is healthy:

```bash
curl -s https://qr.techitdave.com/api/health
```
Expected: `{"ok":true,"accounts":true}`.

  2. In a browser on https://qr.techitdave.com:
     - **Fresh after reload:** choose Wi-Fi, pick the Forest preset and reload. The page shows Link with the default colors.
     - **New code (signed in):** save a code, click "New code", and the form is empty with default design.
     - **Logo click:** open a saved code with Edit design, click the logo, and the form is fresh.

---

### Task 5: Go-live docs PR

**Files:**
- Modify: `supabase/migrations/20261013150000_power_tools.sql:84` (make the file match what was applied)
- Modify: `docs/accounts-setup.md`
- Modify (outside Git): `~/.codex/memories/supabase-coolify.md`, by appending a QuickQReate section

- [ ] **Step 1: Make the migration match the database.** On a branch `docs/go-live` from `main`, change line 84 from

```sql
  email text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
```

to

```sql
  email text not null check (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
```

It is identical in PostgreSQL, because `\s` inside brackets means `[:space:]` and `\.` means `[.]`. It was applied in this form because the private SQL bridge rejects backslashes.

Run: `npx vitest run supabase/test/migration.test.ts`
Expected: PASS. This includes the invite tests that exercise this check.

- [ ] **Step 2: Update `docs/accounts-setup.md`.**
  1. Add this section after "## Decisions":

```markdown
## Live deployment (verified 14 October 2026)

| Item | Value |
| --- | --- |
| Supabase project | QuickQReate, TechitDave organization, UUID `db12f7ce-3e77-4461-a686-c8cd6de6f764`, slug `quickqreate-1791927515091` |
| API URL | `https://quickqreate-1791927515091.supabase.techitdave.com` |
| Child Studio | `https://quickqreate-1791927515091-studio.supabase.techitdave.com` (panel login required) |
| Database | `supabase_multitenant`, PostgreSQL 17.6, GoTrue v2.196.0, Storage v1.74.0 |
| Migrations applied | All five files, in order, through the private SQL bridge, 13 October 2026 |
| Coolify app | TechitDave Infrastructure → production → QuickQReate (`4gko88co580xlr70qkda3jhx`), Dockerfile build, `https://qr.techitdave.com` |
| Health check | `GET http://127.0.0.1:3000/api/health` (use `127.0.0.1`, not `localhost`: the image has busybox `wget` only, and `localhost` resolves to IPv6) |
| DNS | Cloudflare `qr` A `152.44.42.29`, DNS only |
| Email | Brevo SMTP relay, sender `QuickQReate <no-reply@techitdave.com>` (verified, techitdave.com DKIM/DMARC) |
| Google sign-in | Google Cloud project `quickqreate` (External, in production, no logo), web client ID `31907044023-urs4031kmta7apq7rkkn9sa7b606sh92.apps.googleusercontent.com`, redirect `<API URL>/auth/v1/callback` |
| Auto-deploy | GitHub webhook (push) → Coolify manual GitHub webhook |
| Backups | Included in the host's daily backup with an off-server copy that is restored and hash-checked (first receipt: archive `20261014T003300Z`) |
```

  2. In step 2, add after the list of files:

```markdown
When applying through the private SQL bridge (which rejects backslashes), the email check in the
fifth file uses `[:space:]` and `[.]` instead of `\s` and `\.`; the repository file matches what
was applied.
```

  3. Replace the `ADDITIONAL_REDIRECT_URLS=…` line in step 5 with:

```
ADDITIONAL_REDIRECT_URLS=https://qr.techitdave.com/auth/callback,https://qr.techitdave.com/auth/confirm   [GOTRUE_URI_ALLOW_LIST]
ENABLE_PHONE_SIGNUP=false                                            [GOTRUE_EXTERNAL_PHONE_ENABLED]
```

  4. Add to step 5:

```markdown
On the panel these values are set through the project's environment (`Manage` → `Configure`, or
the panel's `POST /api/projects/<id>/env`, which merges keys). The pinned compose file does not wire
Google sign-in or mail templates, so the project's `docker-compose.yml` adds these auth variables,
read from `.env`: `GOTRUE_EXTERNAL_GOOGLE_ENABLED/CLIENT_ID/SECRET/REDIRECT_URI` and
`GOTRUE_MAILER_TEMPLATES_*` / `GOTRUE_MAILER_SUBJECTS_*`. Redeploy from the panel; only the auth
container is recreated.
```

  5. In step 7, change "health check path `/api/health`" to "health check `127.0.0.1:3000/api/health` (see Live deployment)".
  6. Mark the verified items in "Verification checklist" with `[x]`, leaving the unverified ones unchecked:
     - `[x]` the auth health item
     - `[x]` sign-up email
     - `[x]` Google sign-in
     - `[x]` the scan analytics item
     - `[x]` nightly backup receipts
     - the rest stay unchecked until David confirms them.

Run: `npx prettier --write docs/accounts-setup.md && npm run format:check`
Expected: PASS.

- [ ] **Step 3: Append the QuickQReate section to the runbook**, outside Git, at `~/.codex/memories/supabase-coolify.md`.

```markdown
## QuickQReate go-live (13–14 October 2026)

- Host disk grown 50 GB → 75 GB at UpCloud (live resize, then growpart/resize2fs online, no downtime); infrastructure now about $44.24/month before tax, approved by David over the old $42 cap. Pre-resize partition table: `/root/vda-gpt-before-resize-20261013T213518Z.sfdisk`.
- Project QuickQReate: UUID `db12f7ce-3e77-4461-a686-c8cd6de6f764`, slug `quickqreate-1791927515091`, TechitDave org. The dashboard "New Project" form does not attach an organization; use the org page (`/org/<id>`) or `POST /api/projects` with `organizationId`.
- Auth env set through the panel env API (merges keys). The project compose was patched to wire GOTRUE_EXTERNAL_GOOGLE_* and GOTRUE_MAILER_TEMPLATES/SUBJECTS_* (original kept as `docker-compose.yml.orig-20261013T214209Z`); `.env` set to 600 like the production projects.
- All five migrations applied through the bridge. The fifth's email regex used `[:space:]` and `[.]` because the bridge rejects backslashes; the repository file was changed to match.
- Coolify app `4gko88co580xlr70qkda3jhx`: health check host must be `127.0.0.1` (busybox wget; `localhost` resolves to IPv6). GitHub manual webhook for auto-deploy.
- Google OAuth lives in Google Cloud project `quickqreate` (hopelinx.com org), so HopeLinx's consent screen is untouched.
- First verified backup containing quickqreate: `20261014T003300Z`, off-server snapshot `e167b2eb…`, verified 00:39:16 UTC.
- Local backup tree was over its 5 GiB cap after that run, so watch the next nightly; retention (08:46 UTC) trims it.
```

- [ ] **Step 4: Commit, push and open the docs PR.**

```bash
git add supabase/migrations/20261013150000_power_tools.sql docs/accounts-setup.md
git commit -m "Record the live QuickQReate setup

Adds the verified, non-secret deployment details to accounts-setup.md
and makes the fifth migration's email check match what was applied
(identical regex without backslashes).

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push -u origin docs/go-live
gh pr create --base main --head docs/go-live --title "Record the live QuickQReate setup" --body "$(cat <<'EOF'
- docs/accounts-setup.md: verified live details (project, URLs, Coolify, DNS, Brevo sender, Google client ID, health-check note, backups) and the auth/compose steps as actually done.
- Fifth migration: email check written with `[:space:]` / `[.]` instead of `\s` / `\.`. Same behavior; matches the live database, which was migrated through a bridge that rejects backslashes.

No secrets included.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks --watch
```
Expected: CI passes. Leave the PR for David to merge, or merge it if he asks.

---

### Task 6: Point the old GitHub Pages site at the new address

**Files:** none. This runs the existing workflow.

- [ ] **Step 1: Run the CI workflow with the redirect input.**

```bash
gh workflow run CI --ref main -f redirect_to=https://qr.techitdave.com
sleep 5; gh run list --workflow CI --limit 1
gh run watch "$(gh run list --workflow CI --limit 1 --json databaseId --jq '.[0].databaseId')"
```
Expected: both jobs, "Lint, test & build" and "Point GitHub Pages at the new site", succeed.

- [ ] **Step 2: Verify the redirect.**

```bash
curl -sL https://davidallmon.github.io/QuickQReate/ | grep -o "https://qr.techitdave.com[^\"']*" | head -3
curl -sL https://davidallmon.github.io/QuickQReate/some/deep/link | grep -c "qr.techitdave.com"
```
Expected: the first prints `https://qr.techitdave.com` (possibly with a path), and the second prints a count of at least 1. In a browser, the old address forwards to https://qr.techitdave.com.

---

## Owner verification (David)

These remaining go-live checks need David's own accounts or secrets, so they are not engineer tasks. Mark them in `docs/accounts-setup.md` when done.

- **Password reset:** request a reset at `/forgot-password` for dvdallmon@gmail.com. The email arrives and the new password works.
- **API key:** run `curl -s -H "Authorization: Bearer $(pbpaste)" https://qr.techitdave.com/api/v1/codes | head -c 400`. It returns your codes.
- **Second account isolation:** sign up as dvdallmon+qrtest@gmail.com and confirm. That account sees no codes or files from the first account.
- **Hosted page and password code:**
  - a Link list with an uploaded picture shows at `/p/<slug>`
  - the password-protected code asks for its password and opens with the right one.
