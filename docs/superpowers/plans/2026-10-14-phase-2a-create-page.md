# Phase 2a: Create Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in `/codes/new` Create page. You pick a type, fill in the content and design it. You set tracking, a password, dates and a short link, then name it, file it in a folder and create it in one step. Every visit starts fresh, and an unfinished code comes back only when you choose Resume.

**Architecture:**
- A new `features/create/` folder holds:
  - pure state (`state.ts`, `catalog.ts`, `submit.ts`)
  - drafts (`draft.ts`, `useDraftStorage.ts`)
  - derived values (`useCodeDraft.ts`)
  - five section components, a preview column and `CreatePage`.
- It reuses the generator engine: the reducer, content forms, style sections and preview pieces.
- A new database function, `create_code(p_code, p_password)`, creates the row and its password in one transaction.
- The Create button, the phone Create tab, the Codes header and the quick starts move to `/codes/new`.

**Tech Stack:** Next.js 16.4 App Router, React 19.3, Tailwind 4.3, Headless UI 2.2, Supabase (RLS, plpgsql), Vitest 5 with Testing Library and PGlite, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md` (§4.2, §4.7, §6.1, §7, §8 Phase 2)

## Scope

Phase 2 is split into two PRs, like Phase 1:

- **2a (this plan):** the Create page with settings at creation, drafts and create-in-folder. It also adds the `create_code` migration (§6.1), and every signed-in "Create" entry point moves to `/codes/new`.
- **2b (next plan):** `/codes/bulk` inside the app, and the `PageEditor.tsx` split per hosted-page type.

Signed-in `/` stays the old generator until Phase 4. The code page keeps its "Edit design" link to `/?edit=<id>` until Phase 3.

## Global Constraints

- **Wording:** plain, short, sentence case. Say "Trackable", not "dynamic". Buttons say what they do: "Create code", "Download without saving".
- **Readability:** 13px minimum text. Color only through the theme tokens (`text-fg`, `text-fg-muted`, `text-danger`…). 44px tap targets on phones (`min-h-11`).
- **Responsive:** every page is checked at 390, 820 and 1280px wide. No sideways scroll, and no axe violations (wcag2a, wcag2aa).
- **What's remembered:** only the theme and the Codes list/grid choice. Design, type and export settings are not persisted.
- **Drafts:**
  - stored under `quickqreate:draft:v2:<userId>`
  - written 500 ms after a change
  - never hold the password
  - cleared on a successful create or on Discard
  - copy: "You have an unfinished code from 2 hours ago: Resume · Discard"
- **Fresh state:** every visit to `/codes/new` starts from the defaults. Only the type and folder come from the URL.
- **Printed codes:** `/r/<slug>` and `/p/<slug>` never change. No feature is removed.
- **Passwords:** 4–128 characters, hashed with bcrypt by `set_code_password`.
- **Migrations:**
  - a new versioned file in `supabase/migrations/`, with no backslashes (the live SQL bridge rejects them)
  - applied live after a verified backup and before merging
  - recorded in the runbook.
- **CI:** the jobs "Lint, test & build" and "Signed-in browser tests" must both pass.

## Review Focus

1. **An older draft is on offer while the person starts a new code.** The old draft is never overwritten or deleted until they choose Resume or Discard. *Task 4, "offers an older draft and leaves it alone until Resume or Discard".*
2. **Create is pressed twice** (a double click or a slow network). Exactly one code is created. *Task 7, "creates only once when Create is pressed twice".*
3. **Creating fails** (a taken ending, or the network). The page stays, says why, keeps every field, and Create works again. *Task 7, "stays on the page and explains when creating fails".*
4. **A resumed draft names a folder that no longer exists, or belongs to another workspace.** It falls back to the page's folder, so saving doesn't fail. *Task 7, "offers an unfinished code and restores it only on Resume".*
5. **Settings were typed, then the code became static.** For example, a Link with a password and dates is switched to Wi-Fi, or Trackable is turned off. It is created as a static code without the password or dates, not rejected. *Task 3, "keeps Wi-Fi static even with Trackable on, ignoring settings".*

## Rulings Made While Planning

Ledger each of these at setup. They are decisions the spec left open or that this plan makes differently.

1. **`create_code` runs as `security invoker`, not `security definer` (§6.1).** The existing row rules already enforce every check in §6.1 (two-step policy, `can_edit`, column grants), and the password reuses `set_code_password`. Cost if wrong: none for users.
2. **`useCodeDraft` has no `load(code)` yet (§4.7).** Only the code page tabs need it, so it arrives with them in Phase 3. Drafts live in a separate `useDraftStorage` that only the Create page uses, which keeps `useCodeDraft` free of implicit persistence. Cost if wrong: Phase 3 adds one reducer action.
3. **"Start from a style" reuses the existing quick styles and "My templates" (§4.2).** The spec's "Classic + 4 color styles, default template marked" comes with `/templates` and default templates in Phase 3. Cost if wrong: the style set differs slightly until Phase 3.
4. **The phone "full-screen preview" is the existing bottom Sheet.** It holds the full preview column and Create button. Cost if wrong: a styling change.
5. **The live check doesn't create a code in David's account.** Creating real data there is his call. It checks rendering and the disabled reasons, and leaves one real create to David. Cost if wrong: one unverified live create until he tries it.

## File Structure

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20261014160000_create_code.sql` | `create_code(p_code jsonb, p_password text)`: the row and its password, all or nothing |
| `types/supabase.ts` | `create_code` RPC typing |
| `features/codes/api.ts` | `createCodeWithSettings(input, settings)`, `CodeSettingsInput` |
| `features/create/state.ts` | `CreateState`, `CreateSettings`, `createReducer`, `initialCreateState`, `isTrackable`, `settingsErrors`, `settingsProblem` |
| `features/create/catalog.ts` | the 8 common types, descriptions, "More types" groups and search, Contact merging |
| `features/create/submit.ts` | `toNewCode`: page state → `createCodeWithSettings` arguments |
| `features/create/draft.ts` | draft key, save/parse/clear, `isBlank` |
| `features/create/useDraftStorage.ts` | debounced draft writes, the Resume/Discard offer |
| `features/create/useCodeDraft.ts` | the reducer plus everything derived: preview data, scan check, name, blocker |
| `features/generator/content/types.ts` | `ContentEditor`: what the content forms need (so both pages can use them) |
| `features/create/sections/*.tsx` | `TypeSection`, `ContentSection`, `DesignSection`, `SettingsSection`, `NameFolderSection` |
| `features/create/PreviewColumn.tsx`, `CreateMobileBar.tsx`, `DraftBanner.tsx`, `CreatePage.tsx` | preview, phone bar, draft offer, page composition and create |
| `app/(app)/codes/new/page.tsx` | the route: workspace, folders, type and folder from the URL |
| `components/app/nav.ts` | `newCodeHref({ type, folderId, ownerId })` |
| `components/app/CreateButton.tsx`, `components/app/AppShell.tsx`, `app/(app)/codes/page.tsx`, `features/codes/list/CodesView.tsx` | entry points to `/codes/new` |
| `features/dashboard/CodeEditor.tsx` | `id="download"` on the Download card |
| `e2e/accounts/*` | a Maker account; create, draft and folder tests; `/codes/new` in the page sweep |

---
### Task 1: `create_code`, the code and its password in one step

**Files:**
- Create: `supabase/migrations/20261014160000_create_code.sql`
- Modify: `supabase/test/migration.test.ts` (append a `describe`)
- Modify: `types/supabase.ts` (Functions)

**Interfaces:**
- Consumes: `public.qr_codes` (RLS "Editors can create codes", the restrictive two-step policy, column insert grants), `public.set_code_password(uuid, text)`.
- Produces: `public.create_code(p_code jsonb, p_password text default null) returns public.qr_codes`. Accepted `p_code` keys: `user_id`, `name`, `qr_type`, `content`, `design`, `is_dynamic`, `destination`, `slug`, `folder_id`, `active_from`, `active_until`. Errors: `42501` (not allowed: RLS, or a password on a static code), `22023` (password length), `23505` (taken ending), `23514` (`qr_codes_active_window`).

Ruling for this task (ledger it): the spec (§6.1) says `security definer` with hand-written checks. This plan uses **`security invoker`** instead. The insert then runs under the caller's existing row rules, which give the same checks as the spec's list:
- the two-step policy covers `mfa_satisfied()`
- "Editors can create codes" covers `can_edit(owner)`
- the column grants cover the allowed columns.

The password goes through the existing `set_code_password`, so there is still one hashing path. Cost if wrong: none for users; the spec's security list is still met.

- [ ] **Step 1: Write the failing tests.** Append to `supabase/test/migration.test.ts`:

```ts
describe("create_code", () => {
  const XAVI = "19191919-1919-4919-8919-191919191919"; // owner
  const UMA = "1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a1a"; // editor on Xavi's team
  const VERA = "1b1b1b1b-1b1b-4b1b-8b1b-1b1b1b1b1b1b"; // viewer on Xavi's team
  const asXavi = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", XAVI, sql, params);
  const asUma = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", UMA, sql, params);
  const asVera = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", VERA, sql, params);
  const CREATE = "select * from public.create_code($1::jsonb, $2)";
  const code = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
      name: "Poster",
      qr_type: "url",
      is_dynamic: true,
      destination: "https://xavi.example",
      content: { url: "https://xavi.example" },
      slug: "XAVI01",
      ...overrides,
    });
  const countXavi = async () =>
    Number(
      (
        await asService<{ n: string | number }>(
          "select count(*) as n from public.qr_codes where user_id = $1",
          [XAVI],
        )
      )[0]!.n,
    );

  beforeAll(async () => {
    await db.query(
      `insert into auth.users (id, email) values
         ($1, 'xavi@example.com'), ($2, 'uma@example.com'), ($3, 'vera@example.com')`,
      [XAVI, UMA, VERA],
    );
    await asService(
      `insert into public.team_members (owner_id, member_id, role) values
         ($1, $2, 'editor'), ($1, $3, 'viewer')`,
      [XAVI, UMA, VERA],
    );
  });

  it("creates a trackable code with its password and dates in one step", async () => {
    const [row] = await asXavi<{
      user_id: string;
      is_dynamic: boolean;
      has_password: boolean;
      active_from: unknown;
      active_until: unknown;
    }>(CREATE, [
      code({ active_from: "2030-01-01T09:00:00Z", active_until: "2030-02-01T09:00:00Z" }),
      "open sesame",
    ]);
    expect(row).toMatchObject({ user_id: XAVI, is_dynamic: true, has_password: true });
    expect(new Date(row!.active_from as string).toISOString()).toBe("2030-01-01T09:00:00.000Z");
    expect(new Date(row!.active_until as string).toISOString()).toBe("2030-02-01T09:00:00.000Z");
    const check = (password: string) =>
      asService<{ ok: boolean }>("select public.check_code_password('xavi01', $1) as ok", [
        password,
      ]);
    expect((await check("open sesame"))[0]?.ok).toBe(true);
    expect((await check("wrong"))[0]?.ok).toBe(false);
  });

  it("lets editors create in the owner's workspace and refuses viewers, outsiders and anon", async () => {
    const [row] = await asUma<{ user_id: string; has_password: boolean }>(CREATE, [
      code({ user_id: XAVI, slug: "XAVI02" }),
      null,
    ]);
    expect(row).toMatchObject({ user_id: XAVI, has_password: false });
    const before = await countXavi();
    await expect(asVera(CREATE, [code({ user_id: XAVI, slug: "XAVI03" }), null])).rejects.toThrow(
      /row-level security/,
    );
    await expect(asBob(CREATE, [code({ user_id: XAVI, slug: "XAVI04" }), null])).rejects.toThrow(
      /row-level security/,
    );
    await expect(asAnon(CREATE, [code({ user_id: XAVI, slug: "XAVI05" }), null])).rejects.toThrow(
      /permission denied/,
    );
    expect(await countXavi()).toBe(before);
  });

  it("needs a two-step session for two-step accounts", async () => {
    await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [XAVI]);
    try {
      await expect(asXavi(CREATE, [code({ slug: "XAVI06" }), null])).rejects.toThrow(
        /row-level security/,
      );
      const rows = await as<{ slug: string }>(
        "authenticated",
        XAVI,
        CREATE,
        [code({ slug: "XAVI06" }), null],
        "aal2",
      );
      expect(rows[0]?.slug).toBe("XAVI06");
    } finally {
      await db.query("delete from auth.mfa_factors where user_id = $1", [XAVI]);
    }
  });

  it("saves nothing when any part fails", async () => {
    const before = await countXavi();
    // A password on a static code.
    await expect(
      asXavi(CREATE, [
        code({
          qr_type: "text",
          is_dynamic: false,
          destination: null,
          slug: null,
          content: { text: "Hi" },
        }),
        "secret",
      ]),
    ).rejects.toThrow(/Not allowed/);
    // An end before the start.
    await expect(
      asXavi(CREATE, [
        code({
          slug: "XAVI07",
          active_from: "2030-02-01T00:00:00Z",
          active_until: "2030-01-01T00:00:00Z",
        }),
        null,
      ]),
    ).rejects.toThrow(/qr_codes_active_window/);
    // A password that's too short, after the row went in.
    await expect(asXavi(CREATE, [code({ slug: "XAVI08" }), "abc"])).rejects.toThrow(/4 to 128/);
    // A date that isn't one.
    await expect(
      asXavi(CREATE, [code({ slug: "XAVI09", active_from: "next tuesday" }), null]),
    ).rejects.toThrow(/invalid input syntax/);
    // A link ending that's taken (endings ignore case).
    await expect(asXavi(CREATE, [code({ slug: "xavi01" }), null])).rejects.toThrow(
      /duplicate key/,
    );
    expect(await countXavi()).toBe(before);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run supabase/test/migration.test.ts -t create_code`
Expected: FAIL. Each test errors with `function public.create_code(jsonb, unknown) does not exist` (or the `text` signature).

- [ ] **Step 3: Write the migration.** Create `supabase/migrations/20261014160000_create_code.sql`:

```sql
-- Create a code and its settings in one step, for the Create page (Phase 2 of the redesign).
--
-- Runs as the caller (security invoker), so the usual rules for adding codes still apply:
-- a two-step session for two-step accounts, editors only in a team workspace, and only the
-- columns signed-in users may insert. A password goes through set_code_password, which hashes
-- it and allows it on trackable codes only. It all happens in the caller's statement, so if
-- any part fails (a taken link ending, an end before the start, a short password) nothing is
-- saved.
create function public.create_code(p_code jsonb, p_password text default null)
returns public.qr_codes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.qr_codes;
begin
  insert into public.qr_codes (
    user_id, name, qr_type, content, design, is_dynamic, destination, slug,
    folder_id, active_from, active_until
  )
  values (
    coalesce(nullif(p_code ->> 'user_id', '')::uuid, auth.uid()),
    p_code ->> 'name',
    p_code ->> 'qr_type',
    coalesce(p_code -> 'content', '{}'::jsonb),
    coalesce(p_code -> 'design', '{}'::jsonb),
    coalesce((p_code ->> 'is_dynamic')::boolean, false),
    nullif(p_code ->> 'destination', ''),
    nullif(p_code ->> 'slug', ''),
    nullif(p_code ->> 'folder_id', '')::uuid,
    nullif(p_code ->> 'active_from', '')::timestamptz,
    nullif(p_code ->> 'active_until', '')::timestamptz
  )
  returning * into v_row;

  if coalesce(p_password, '') <> '' then
    perform public.set_code_password(v_row.id, p_password);
    select * into v_row from public.qr_codes where id = v_row.id;
  end if;
  return v_row;
end;
$$;

revoke all on function public.create_code(jsonb, text) from public, anon;
grant execute on function public.create_code(jsonb, text) to authenticated;
```

- [ ] **Step 4: Type the RPC.** In `types/supabase.ts`, add this to `Functions` (next to `recent_scan_counts`):

```ts
      create_code: {
        Args: { p_code: Json; p_password?: string | null };
        Returns: Database["public"]["Tables"]["qr_codes"]["Row"];
      };
```

- [ ] **Step 5: Run the tests to see them pass, and check for backslashes.**

Run: `npx vitest run supabase/test/migration.test.ts && grep -c '\\' supabase/migrations/20261014160000_create_code.sql`
Expected: every test passes (the four new ones included), and grep prints `0`.

- [ ] **Step 6: Commit.**

```bash
git add supabase/migrations/20261014160000_create_code.sql supabase/test/migration.test.ts types/supabase.ts
git commit -m "Create a code and its password in one step"
```

### Task 2: `createCodeWithSettings` on the client

**Files:**
- Modify: `features/codes/api.ts`
- Create: `features/codes/api.test.ts`

**Interfaces:**
- Consumes: `create_code` RPC (Task 1); existing `NewCode`, `Result`, `designForStorage`, `generateSlug`, `isValidSlug`.
- Produces:
  ```ts
  export interface CodeSettingsInput { password?: string; activeFrom?: string | null; activeUntil?: string | null }
  export async function createCodeWithSettings(input: NewCode, settings?: CodeSettingsInput): Promise<Result<QrCodeRow>>
  ```
  Error messages (exact):
  - "That link ending is already taken. Try another."
  - "The end date must be after the start date."
  - "Passwords are 4 to 128 characters."
  - "You can't add codes to this workspace."
  - "Link endings use 3–40 letters, numbers or dashes."
  - "The code couldn't be saved. Please try again."

- [ ] **Step 1: Write the failing tests.** Create `features/codes/api.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";

import { createCodeWithSettings, type NewCode } from "./api";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ getBrowserSupabase: () => ({ rpc }) }));

const row = { id: "c1", name: "Poster" };
const base: NewCode = {
  name: "Poster",
  qrType: "url",
  content: { url: "" },
  design: DEFAULT_DESIGN,
};
const link = { destination: "https://example.com" };

beforeEach(() => rpc.mockReset());

describe("createCodeWithSettings", () => {
  it("sends the code, its folder, dates and password in one call", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    const result = await createCodeWithSettings(
      { ...base, ownerId: "owner-1", folderId: "f1", dynamic: { ...link, slug: "SPRING" } },
      { password: "open sesame", activeFrom: "2030-01-01T09:00:00.000Z", activeUntil: null },
    );
    expect(result).toEqual({ ok: true, value: row });
    expect(rpc).toHaveBeenCalledWith("create_code", {
      p_code: expect.objectContaining({
        user_id: "owner-1",
        folder_id: "f1",
        name: "Poster",
        qr_type: "url",
        content: { url: "https://example.com" },
        is_dynamic: true,
        slug: "SPRING",
        destination: "https://example.com",
        active_from: "2030-01-01T09:00:00.000Z",
        active_until: null,
      }),
      p_password: "open sesame",
    });
  });

  it("sends a static code with no ending, destination or password", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    await createCodeWithSettings({ ...base, qrType: "text", content: { text: "Hi" } });
    expect(rpc).toHaveBeenCalledWith("create_code", {
      p_code: expect.objectContaining({
        is_dynamic: false,
        slug: null,
        destination: null,
        content: { text: "Hi" },
      }),
      p_password: null,
    });
  });

  it("picks a new random ending when one collides", async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: { code: "23505", message: "duplicate key" } })
      .mockResolvedValueOnce({ data: row, error: null });
    const result = await createCodeWithSettings({ ...base, dynamic: link });
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(2);
    const [first, second] = rpc.mock.calls.map(([, args]) => args.p_code.slug as string);
    expect(first).not.toBe(second);
  });

  it.each([
    [{ code: "23505", message: "duplicate key" }, "That link ending is already taken. Try another."],
    [
      { code: "23514", message: 'violates check constraint "qr_codes_active_window"' },
      "The end date must be after the start date.",
    ],
    [{ code: "22023", message: "Passwords are 4 to 128 characters" }, "Passwords are 4 to 128 characters."],
    [
      { code: "42501", message: "new row violates row-level security policy" },
      "You can't add codes to this workspace.",
    ],
    [{ code: "08006", message: "connection failure" }, "The code couldn't be saved. Please try again."],
  ])("explains %o", async (error, message) => {
    rpc.mockResolvedValue({ data: null, error });
    const result = await createCodeWithSettings({ ...base, dynamic: { ...link, slug: "MINE" } });
    expect(result).toEqual({ ok: false, error: message });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("refuses a malformed ending before asking the server", async () => {
    const result = await createCodeWithSettings({ ...base, dynamic: { ...link, slug: "no spaces" } });
    expect(result).toEqual({ ok: false, error: "Link endings use 3–40 letters, numbers or dashes." });
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/codes/api.test.ts`
Expected: FAIL with `createCodeWithSettings is not a function` (or a TypeScript/import error naming it).

- [ ] **Step 3: Implement.** In `features/codes/api.ts`, add after `createCode`:

```ts
export interface CodeSettingsInput {
  /** A password scanners must enter (4–128 characters); trackable codes only. */
  password?: string;
  /** ISO times; null or missing means no limit. */
  activeFrom?: string | null;
  activeUntil?: string | null;
}

function createError(error: { code?: string; message: string } | null, customSlug: boolean) {
  if (error?.code === UNIQUE_VIOLATION && customSlug)
    return "That link ending is already taken. Try another.";
  if (error?.message.includes("qr_codes_active_window"))
    return "The end date must be after the start date.";
  if (error?.code === "22023") return "Passwords are 4 to 128 characters.";
  if (error?.code === "42501") return "You can't add codes to this workspace.";
  return "The code couldn't be saved. Please try again.";
}

/**
 * Creates a code and its settings (password, active dates) in one step, so a failure saves
 * nothing. Random link endings that collide are re-rolled; a chosen ending that's taken is an
 * error.
 */
export async function createCodeWithSettings(
  input: NewCode,
  settings: CodeSettingsInput = {},
): Promise<Result<QrCodeRow>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const customSlug = input.dynamic?.slug;
  if (customSlug && !isValidSlug(customSlug)) {
    return { ok: false, error: "Link endings use 3–40 letters, numbers or dashes." };
  }
  const { design } = designForStorage(input.design);

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase.rpc("create_code", {
      p_code: {
        ...(input.ownerId && { user_id: input.ownerId }),
        ...(input.folderId && { folder_id: input.folderId }),
        name: input.name.slice(0, 120),
        qr_type: input.qrType,
        content: (input.dynamic?.destination
          ? { url: input.dynamic.destination }
          : input.content) as Json,
        design,
        is_dynamic: Boolean(input.dynamic),
        slug: input.dynamic ? (customSlug ?? generateSlug()) : null,
        destination: input.dynamic?.destination ?? null,
        active_from: settings.activeFrom ?? null,
        active_until: settings.activeUntil ?? null,
      },
      p_password: settings.password || null,
    });
    if (!error && data) return { ok: true, value: data };
    if (error?.code === UNIQUE_VIOLATION && input.dynamic && !customSlug) continue;
    return { ok: false, error: createError(error, Boolean(customSlug)) };
  }
  return { ok: false, error: "The code couldn't be saved. Please try again." };
}
```

- [ ] **Step 4: Run them to see them pass.**

Run: `npx vitest run features/codes/api.test.ts && npm run typecheck`
Expected: 9 tests pass; typecheck exits 0.

- [ ] **Step 5: Commit.**

```bash
git add features/codes/api.ts features/codes/api.test.ts
git commit -m "Save a new code with its settings in one call"
```

### Task 3: Create state, type catalog and `toNewCode`

**Files:**
- Create: `features/create/state.ts`, `features/create/state.test.ts`
- Create: `features/create/catalog.ts`, `features/create/catalog.test.ts`
- Create: `features/create/submit.ts`, `features/create/submit.test.ts`

**Interfaces:**
- Consumes: `generatorReducer`, `initialState` (generator state); `NewCode`, `CodeSettingsInput` (Task 2); `withUtm`, `UtmParams`; `normalizeUrl`; `isValidSlug`.
- Produces:
  ```ts
  // state.ts
  export interface CreateSettings { trackable: boolean; password: string; startsAt: string; endsAt: string; slug: string; utm: UtmParams }
  export const DEFAULT_SETTINGS: CreateSettings
  export interface CreateState { code: GeneratorState; settings: CreateSettings; folderId: string | null; styleDesign: DesignState }
  export interface CreateDefaults { type: CodeTypeId; folderId: string | null }
  export type CreateAction =
    | { type: "code"; action: GeneratorAction } | { type: "settings"; patch: Partial<CreateSettings> }
    | { type: "setFolder"; folderId: string | null } | { type: "resetToStyle" }
    | { type: "reset"; defaults: CreateDefaults } | { type: "restore"; state: CreateState }
  export function initialCreateState(defaults: CreateDefaults): CreateState
  export function createReducer(state: CreateState, action: CreateAction): CreateState
  export const isTrackable: (state: CreateState) => boolean
  export interface SettingsErrors { password?: string; endsAt?: string; slug?: string }
  export function settingsErrors(settings: CreateSettings): SettingsErrors
  export function settingsProblem(settings: CreateSettings): string | null
  // catalog.ts
  export const COMMON_TYPES: readonly CodeTypeId[]  // url, links, wifi, contact, pdf, menu, text, email
  export const isContactType: (id: CodeTypeId) => boolean
  export const tileFor: (id: CodeTypeId) => CodeTypeId
  export const typeLabel: (id: CodeTypeId) => string
  export function typeDescription(id: CodeTypeId): string
  export interface TypeGroup { title: string; ids: CodeTypeId[] }
  export function moreTypes(query: string): TypeGroup[]
  // submit.ts
  export function taggedDestination(url: string, utm: UtmParams): string
  export const localToIso: (value: string) => string | null
  export function toNewCode(state: CreateState, ownerId: string | null, name: string): { input: NewCode; settings: CodeSettingsInput }
  ```

- [ ] **Step 1: Write the failing tests.**

`features/create/state.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  createReducer,
  DEFAULT_SETTINGS,
  initialCreateState,
  isTrackable,
  settingsErrors,
  settingsProblem,
  type CreateAction,
  type CreateState,
} from "./state";

const defaults = { type: "url" as const, folderId: null };
const run = (state: CreateState, ...actions: CreateAction[]) => actions.reduce(createReducer, state);

describe("createReducer", () => {
  it("starts from the defaults with the type and folder from the address", () => {
    const state = initialCreateState({ type: "wifi", folderId: "f1" });
    expect(state.code.activeType).toBe("wifi");
    expect(state.code.name).toBe("");
    expect(state.folderId).toBe("f1");
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
    expect(state.settings.trackable).toBe(true);
  });

  it("reset forgets the content, design, settings, name and folder", () => {
    const edited = run(
      initialCreateState(defaults),
      { type: "code", action: { type: "setField", qrType: "url", field: "url", value: "example.com" } },
      { type: "code", action: { type: "setDesign", patch: { fgColor: "#123456" } } },
      { type: "code", action: { type: "setName", name: "Poster" } },
      { type: "settings", patch: { password: "secret", slug: "SPRING" } },
      { type: "setFolder", folderId: "f2" },
    );
    expect(edited.code.content.url.url).toBe("example.com");
    expect(createReducer(edited, { type: "reset", defaults })).toEqual(initialCreateState(defaults));
  });

  it("Reset to style goes back to the last style applied, not the plain default", () => {
    const state = run(
      initialCreateState(defaults),
      { type: "code", action: { type: "applyDesign", design: { fgColor: "#3730A3", bgColor: "#FFF1F2" } } },
      { type: "code", action: { type: "setDesign", patch: { fgColor: "#000000" } } },
      { type: "resetToStyle" },
    );
    expect(state.code.design.fgColor).toBe("#3730A3");
    expect(state.code.design.bgColor).toBe("#FFF1F2");
  });

  it("restore replaces the whole page", () => {
    const other = run(initialCreateState({ type: "text", folderId: "f9" }), {
      type: "settings",
      patch: { slug: "MINE" },
    });
    expect(createReducer(initialCreateState(defaults), { type: "restore", state: other })).toBe(other);
  });

  it("knows which codes are trackable", () => {
    const link = initialCreateState(defaults);
    expect(isTrackable(link)).toBe(true);
    expect(isTrackable(run(link, { type: "settings", patch: { trackable: false } }))).toBe(false);
    expect(isTrackable(initialCreateState({ type: "links", folderId: null }))).toBe(true);
    expect(isTrackable(initialCreateState({ type: "wifi", folderId: null }))).toBe(false);
  });
});

describe("settingsErrors", () => {
  it("accepts settings left empty", () => {
    expect(settingsErrors(DEFAULT_SETTINGS)).toEqual({});
    expect(settingsProblem(DEFAULT_SETTINGS)).toBeNull();
  });

  it("explains a short password, an end before the start and a bad ending", () => {
    expect(
      settingsErrors({
        ...DEFAULT_SETTINGS,
        password: "abc",
        startsAt: "2030-02-01T09:00",
        endsAt: "2030-01-01T09:00",
        slug: "no spaces",
      }),
    ).toEqual({
      password: "Passwords are 4 to 128 characters",
      endsAt: "The end date must be after the start date",
      slug: "Link endings use 3–40 letters, numbers or dashes",
    });
    expect(settingsProblem({ ...DEFAULT_SETTINGS, slug: "no spaces" })).toBe(
      "Link endings use 3–40 letters, numbers or dashes",
    );
  });

  it("treats an end equal to the start as too early", () => {
    expect(
      settingsErrors({ ...DEFAULT_SETTINGS, startsAt: "2030-01-01T09:00", endsAt: "2030-01-01T09:00" })
        .endsAt,
    ).toBe("The end date must be after the start date");
  });
});
```

`features/create/catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { PAGE_TYPE_IDS, QR_TYPE_IDS } from "@/lib/qr/types";

import { COMMON_TYPES, isContactType, moreTypes, tileFor, typeDescription, typeLabel } from "./catalog";

describe("type catalog", () => {
  it("offers the eight common types as tiles", () => {
    expect(COMMON_TYPES.map(typeLabel)).toEqual([
      "Link",
      "Link list",
      "Wi-Fi",
      "Contact",
      "PDF",
      "Menu",
      "Text",
      "Email",
    ]);
    expect(typeDescription("url")).toBe("Open a website");
  });

  it("lists every type once under More types, with Contact covering both kinds", () => {
    const groups = moreTypes("");
    expect(groups.map((group) => group.title)).toEqual(["Works without internet", "Hosted pages"]);
    const ids = groups.flatMap((group) => group.ids);
    expect(ids).toContain("contact");
    expect(ids).not.toContain("vcard");
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(QR_TYPE_IDS.length + PAGE_TYPE_IDS.length - 1);
  });

  it("searches names and descriptions", () => {
    expect(moreTypes("whatsapp").flatMap((group) => group.ids)).toEqual(["whatsapp"]);
    expect(moreTypes("  MENU ").flatMap((group) => group.ids)).toEqual(["menu"]);
    expect(moreTypes("zzz")).toEqual([]);
  });

  it("shows both contact kinds as Contact", () => {
    expect(tileFor("vcard")).toBe("contact");
    expect(tileFor("wifi")).toBe("wifi");
    expect(isContactType("vcard") && isContactType("contact")).toBe(true);
    expect(typeLabel("vcard")).toBe("Contact");
  });
});
```

`features/create/submit.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createReducer, initialCreateState, type CreateAction, type CreateState } from "./state";
import { localToIso, taggedDestination, toNewCode } from "./submit";

const run = (state: CreateState, ...actions: CreateAction[]) => actions.reduce(createReducer, state);
const base = initialCreateState({ type: "url", folderId: "f1" });
const withLink = run(base, {
  type: "code",
  action: { type: "setField", qrType: "url", field: "url", value: "https://example.com/menu" },
});

describe("toNewCode", () => {
  it("sends a trackable link with its tags, ending, password and dates", () => {
    const state = run(withLink, {
      type: "settings",
      patch: {
        password: "open sesame",
        startsAt: "2030-01-01T09:00",
        slug: "SPRING",
        utm: { source: "flyer", medium: "qr", campaign: "" },
      },
    });
    const { input, settings } = toNewCode(state, "team-1", "Menu");
    expect(input).toMatchObject({
      ownerId: "team-1",
      folderId: "f1",
      name: "Menu",
      qrType: "url",
      dynamic: {
        destination: "https://example.com/menu?utm_source=flyer&utm_medium=qr",
        slug: "SPRING",
      },
    });
    expect(settings).toEqual({
      password: "open sesame",
      activeFrom: new Date("2030-01-01T09:00").toISOString(),
      activeUntil: null,
    });
  });

  it("makes a static link when Trackable is off, ignoring settings typed earlier", () => {
    const state = run(withLink, {
      type: "settings",
      patch: { trackable: false, password: "secret", startsAt: "2030-01-01T09:00" },
    });
    const { input, settings } = toNewCode(state, null, "Menu");
    expect(input.dynamic).toBeUndefined();
    expect(input.content).toEqual({ url: "https://example.com/menu" });
    expect(settings).toEqual({});
  });

  it("keeps Wi-Fi static even with Trackable on, ignoring settings", () => {
    const state = run(
      withLink,
      { type: "settings", patch: { password: "secret", endsAt: "2030-01-01T09:00" } },
      { type: "code", action: { type: "setActiveType", activeType: "wifi" } },
      { type: "code", action: { type: "setField", qrType: "wifi", field: "ssid", value: "Cafe" } },
    );
    const { input, settings } = toNewCode(state, null, "Cafe Wi-Fi");
    expect(input).toMatchObject({ qrType: "wifi", content: expect.objectContaining({ ssid: "Cafe" }) });
    expect(input.dynamic).toBeUndefined();
    expect(settings).toEqual({});
  });

  it("sends a hosted page as trackable with no destination", () => {
    const state = run(base, { type: "code", action: { type: "setActiveType", activeType: "links" } });
    const { input } = toNewCode(state, null, "Links");
    expect(input.dynamic).toEqual({ destination: null });
    expect(input.content).toBe(state.code.pages.links);
  });

  it("leaves the owner out for your own codes", () => {
    expect(toNewCode(withLink, null, "Menu").input).not.toHaveProperty("ownerId");
  });
});

describe("helpers", () => {
  it("adds campaign tags only when some are filled in", () => {
    const none = { source: "", medium: "", campaign: "" };
    expect(taggedDestination("example.com", none)).toBe("https://example.com");
    expect(taggedDestination("https://example.com/?a=1", { ...none, campaign: "fall" })).toBe(
      "https://example.com/?a=1&utm_campaign=fall",
    );
  });

  it("reads a local date-time as the viewer's time zone", () => {
    expect(localToIso("")).toBeNull();
    expect(localToIso("2030-01-01T09:00")).toBe(new Date(2030, 0, 1, 9, 0).toISOString());
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/create`
Expected: FAIL. The imports `./state`, `./catalog` and `./submit` can't be resolved.

- [ ] **Step 3: Implement `features/create/state.ts`.**

```ts
import { initialState } from "@/features/generator/state/defaults";
import { generatorReducer } from "@/features/generator/state/reducer";
import type {
  DesignState,
  GeneratorAction,
  GeneratorState,
} from "@/features/generator/state/types";
import { isValidSlug } from "@/lib/dynamic/slug";
import type { UtmParams } from "@/lib/dynamic/utm";
import { isPageType, type CodeTypeId } from "@/lib/qr/types";

/** Settings for trackable codes and hosted pages, chosen while creating. */
export interface CreateSettings {
  /** Link codes only: open through a short link that can change later, with scan counts. */
  trackable: boolean;
  /** Optional, 4–128 characters. Never kept in a draft. */
  password: string;
  /** datetime-local values in the viewer's time zone; "" for no limit. */
  startsAt: string;
  endsAt: string;
  /** A chosen short-link ending; "" picks a random one. */
  slug: string;
  /** Campaign tags added to a Link's address. */
  utm: UtmParams;
}

export const DEFAULT_SETTINGS: CreateSettings = {
  trackable: true,
  password: "",
  startsAt: "",
  endsAt: "",
  slug: "",
  utm: { source: "", medium: "", campaign: "" },
};

export interface CreateState {
  code: GeneratorState;
  settings: CreateSettings;
  folderId: string | null;
  /** The style or template last applied; "Reset to style" returns to it. */
  styleDesign: DesignState;
}

/** What a fresh Create page starts from: the defaults plus the type and folder in the URL. */
export interface CreateDefaults {
  type: CodeTypeId;
  folderId: string | null;
}

export type CreateAction =
  | { type: "code"; action: GeneratorAction }
  | { type: "settings"; patch: Partial<CreateSettings> }
  | { type: "setFolder"; folderId: string | null }
  | { type: "resetToStyle" }
  | { type: "reset"; defaults: CreateDefaults }
  | { type: "restore"; state: CreateState };

export function initialCreateState(defaults: CreateDefaults): CreateState {
  const code = { ...initialState(), activeType: defaults.type };
  return {
    code,
    settings: { ...DEFAULT_SETTINGS, utm: { ...DEFAULT_SETTINGS.utm } },
    folderId: defaults.folderId,
    styleDesign: code.design,
  };
}

export function createReducer(state: CreateState, action: CreateAction): CreateState {
  switch (action.type) {
    case "code": {
      const code = generatorReducer(state.code, action.action);
      // Remember an applied style (or the plain default) so "Reset to style" can return to it.
      const styled = action.action.type === "applyDesign" || action.action.type === "resetDesign";
      return { ...state, code, styleDesign: styled ? code.design : state.styleDesign };
    }
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "setFolder":
      return { ...state, folderId: action.folderId };
    case "resetToStyle":
      return {
        ...state,
        code: { ...state.code, design: { ...state.styleDesign }, ecBeforeLogo: null },
      };
    case "reset":
      return initialCreateState(action.defaults);
    case "restore":
      return action.state;
  }
}

/** Hosted pages always are; Link codes are while Trackable is on; other types never. */
export const isTrackable = (state: CreateState) =>
  isPageType(state.code.activeType) ||
  (state.code.activeType === "url" && state.settings.trackable);

export interface SettingsErrors {
  password?: string;
  endsAt?: string;
  slug?: string;
}

/** What's wrong with the settings, field by field (empty when they can be saved). */
export function settingsErrors(settings: CreateSettings): SettingsErrors {
  const errors: SettingsErrors = {};
  const { password, startsAt, endsAt, slug } = settings;
  if (password && (password.length < 4 || password.length > 128))
    errors.password = "Passwords are 4 to 128 characters";
  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime())
    errors.endsAt = "The end date must be after the start date";
  if (slug && !isValidSlug(slug)) errors.slug = "Link endings use 3–40 letters, numbers or dashes";
  return errors;
}

/** The first settings problem, or null. */
export const settingsProblem = (settings: CreateSettings): string | null =>
  Object.values(settingsErrors(settings))[0] ?? null;
```

- [ ] **Step 4: Implement `features/create/catalog.ts`.**

```ts
import { PAGE_TYPES } from "@/lib/pages/types";
import { codeTypeInfo } from "@/lib/qr/code-types";
import { isPageType, PAGE_TYPE_IDS, QR_TYPE_IDS, type CodeTypeId, type QrTypeId } from "@/lib/qr/types";

/** One line for each static type (hosted pages describe themselves in PAGE_TYPES). */
const STATIC_DESCRIPTIONS: Record<QrTypeId, string> = {
  url: "Open a website",
  text: "Show a short note",
  wifi: "Join a Wi-Fi network",
  contact: "Share contact details",
  email: "Write an email",
  phone: "Call a number",
  sms: "Send a text message",
  whatsapp: "Start a WhatsApp chat",
  location: "Open a place on a map",
  payment: "Send a payment",
};

/** The eight types most people need, shown as tiles. Contact covers both contact kinds. */
export const COMMON_TYPES: readonly CodeTypeId[] = [
  "url",
  "links",
  "wifi",
  "contact",
  "pdf",
  "menu",
  "text",
  "email",
];

/** Contact is one choice with two kinds: a card saved straight to the phone, or a hosted page. */
export const isContactType = (id: CodeTypeId) => id === "contact" || id === "vcard";

/** The tile a type belongs to: both contact kinds show as Contact. */
export const tileFor = (id: CodeTypeId): CodeTypeId => (id === "vcard" ? "contact" : id);

/** "Contact" for both contact kinds; otherwise the type's own name. */
export const typeLabel = (id: CodeTypeId) =>
  isContactType(id) ? "Contact" : codeTypeInfo(id).label;

export function typeDescription(id: CodeTypeId): string {
  return isPageType(id) ? PAGE_TYPES[id].description : STATIC_DESCRIPTIONS[id];
}

export interface TypeGroup {
  title: string;
  ids: CodeTypeId[];
}

/** Every type for "More types", grouped, filtered by a search. Contact appears once. */
export function moreTypes(query: string): TypeGroup[] {
  const needle = query.trim().toLowerCase();
  const matches = (id: CodeTypeId) =>
    !needle || `${typeLabel(id)} ${typeDescription(id)}`.toLowerCase().includes(needle);
  const groups: TypeGroup[] = [
    { title: "Works without internet", ids: QR_TYPE_IDS.filter(matches) },
    { title: "Hosted pages", ids: PAGE_TYPE_IDS.filter((id) => id !== "vcard" && matches(id)) },
  ];
  return groups.filter((group) => group.ids.length > 0);
}
```

- [ ] **Step 5: Implement `features/create/submit.ts`.**

```ts
import type { CodeSettingsInput, NewCode } from "@/features/codes/api";
import { withUtm, type UtmParams } from "@/lib/dynamic/utm";
import { normalizeUrl } from "@/lib/qr/normalize";
import { isPageType } from "@/lib/qr/types";

import { isTrackable, type CreateState } from "./state";

/** A Link's address with campaign tags added (when any are filled in). */
export function taggedDestination(url: string, utm: UtmParams): string {
  const address = normalizeUrl(url);
  if (!Object.values(utm).some((value) => value?.trim())) return address;
  try {
    return withUtm(address, utm);
  } catch {
    return address;
  }
}

/** A datetime-local value (the viewer's time zone) as an ISO time, or null when empty. */
export const localToIso = (value: string): string | null =>
  value ? new Date(value).toISOString() : null;

/**
 * What to send to createCodeWithSettings. Settings only apply to trackable codes: a static code
 * ignores a password or dates typed before Trackable was switched off or the type changed.
 */
export function toNewCode(
  state: CreateState,
  ownerId: string | null,
  name: string,
): { input: NewCode; settings: CodeSettingsInput } {
  const { code, settings, folderId } = state;
  const type = code.activeType;
  const trackable = isTrackable(state);
  const input: NewCode = {
    ...(ownerId && { ownerId }),
    folderId,
    name,
    qrType: type,
    content: isPageType(type) ? code.pages[type] : code.content[type],
    design: code.design,
    ...(trackable && {
      dynamic: {
        destination: type === "url" ? taggedDestination(code.content.url.url, settings.utm) : null,
        ...(settings.slug && { slug: settings.slug }),
      },
    }),
  };
  if (!trackable) return { input, settings: {} };
  return {
    input,
    settings: {
      ...(settings.password && { password: settings.password }),
      activeFrom: localToIso(settings.startsAt),
      activeUntil: localToIso(settings.endsAt),
    },
  };
}
```

- [ ] **Step 6: Run them to see them pass.**

Run: `npx vitest run features/create && npm run typecheck`
Expected: all tests in the three files pass; typecheck exits 0. If `taggedDestination("example.com", none)` gives `https://example.com/`, the plan's expected string is wrong for `normalizeUrl`. Ledger a ruling and match `normalizeUrl`'s real output; don't change `normalizeUrl`.

- [ ] **Step 7: Commit.**

```bash
git add features/create
git commit -m "Add the Create page's state, type catalog and save request"
```

### Task 4: Drafts, saved in this browser and offered back once

**Files:**
- Create: `features/create/draft.ts`, `features/create/draft.test.ts`
- Create: `features/create/useDraftStorage.ts`, `features/create/useDraftStorage.test.tsx`

**Interfaces:**
- Consumes: `CreateState`, `CreateDefaults`, `initialCreateState` (Task 3); `sanitizeContent`, `sanitizeDesign`, `sanitizePage`; `saveJSON`, `removeKey`.
- Produces:
  ```ts
  // draft.ts
  export const draftKey: (userId: string) => string            // "quickqreate:draft:v2:<userId>"
  export interface StoredDraft { savedAt: string; state: CreateState }
  export function saveDraft(userId: string, state: CreateState, now?: Date): void
  export const clearDraft: (userId: string) => void
  export function isBlank(state: CreateState, defaults: CreateDefaults): boolean
  export function rawDraft(userId: string): string | null
  export function parseDraft(raw: string | null): StoredDraft | null
  // useDraftStorage.ts
  export function useDraftStorage(args: { userId: string; state: CreateState; defaults: CreateDefaults; onRestore: (state: CreateState) => void }):
    { offer: StoredDraft | null; resume: () => void; discard: () => void; finished: () => void }
  ```

- [ ] **Step 1: Write the failing tests.**

`features/create/draft.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearDraft, draftKey, isBlank, parseDraft, rawDraft, saveDraft } from "./draft";
import { createReducer, initialCreateState, type CreateAction, type CreateState } from "./state";

const USER = "user-1";
const defaults = { type: "url" as const, folderId: "f1" };
const run = (state: CreateState, ...actions: CreateAction[]) => actions.reduce(createReducer, state);
const edited = run(
  initialCreateState(defaults),
  { type: "code", action: { type: "setActiveType", activeType: "text" } },
  { type: "code", action: { type: "setField", qrType: "text", field: "text", value: "Hello" } },
  { type: "code", action: { type: "setDesign", patch: { fgColor: "#3730A3" } } },
  { type: "code", action: { type: "setName", name: "Greeting" } },
  { type: "settings", patch: { password: "open sesame", slug: "HELLO", startsAt: "2030-01-01T09:00" } },
  { type: "setFolder", folderId: "f2" },
);

beforeEach(() => window.localStorage.clear());

describe("drafts", () => {
  it("are kept per person under a versioned key", () => {
    expect(draftKey(USER)).toBe("quickqreate:draft:v2:user-1");
  });

  it("never store the password", () => {
    saveDraft(USER, edited);
    expect(window.localStorage.getItem(draftKey(USER))).not.toContain("open sesame");
    expect(parseDraft(rawDraft(USER))?.state.settings.password).toBe("");
  });

  it("bring back the type, content, design, settings, name and folder", () => {
    saveDraft(USER, edited, new Date("2026-10-14T10:00:00Z"));
    const draft = parseDraft(rawDraft(USER));
    expect(draft?.savedAt).toBe("2026-10-14T10:00:00.000Z");
    expect(draft?.state).toEqual({ ...edited, settings: { ...edited.settings, password: "" } });
  });

  it("ignore anything that isn't a current draft", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 1, savedAt: "2026-10-14T10:00:00Z" }))).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 2, savedAt: "yesterday" }))).toBeNull();
  });

  it("fill in missing or bad fields with defaults", () => {
    const draft = parseDraft(
      JSON.stringify({
        v: 2,
        savedAt: "2026-10-14T10:00:00Z",
        code: { activeType: "bogus", name: 42 },
        settings: { trackable: "yes", slug: ["x"] },
      }),
    );
    const fresh = initialCreateState({ type: "url", folderId: null });
    expect(draft?.state.code.activeType).toBe("url");
    expect(draft?.state.code.name).toBe("");
    expect(draft?.state.code.content).toEqual(fresh.code.content);
    expect(draft?.state.settings).toEqual(fresh.settings);
    expect(draft?.state.folderId).toBeNull();
  });

  it("count as blank only while nothing has changed", () => {
    expect(isBlank(initialCreateState(defaults), defaults)).toBe(true);
    expect(isBlank(edited, defaults)).toBe(false);
    expect(
      isBlank(run(initialCreateState(defaults), { type: "settings", patch: { password: "x" } }), defaults),
    ).toBe(true); // The password alone is never kept, so it isn't worth a draft.
  });

  it("can be cleared, and survive storage that is blocked", () => {
    saveDraft(USER, edited);
    clearDraft(USER);
    expect(rawDraft(USER)).toBeNull();
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(rawDraft(USER)).toBeNull();
    getItem.mockRestore();
  });
});
```

`features/create/useDraftStorage.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { draftKey, saveDraft } from "./draft";
import { createReducer, initialCreateState, type CreateState } from "./state";
import { useDraftStorage } from "./useDraftStorage";

const USER = "user-1";
const defaults = { type: "url" as const, folderId: null };
const fresh = initialCreateState(defaults);
const typed = (url: string, password = ""): CreateState =>
  createReducer(
    createReducer(fresh, {
      type: "code",
      action: { type: "setField", qrType: "url", field: "url", value: url },
    }),
    { type: "settings", patch: { password } },
  );
const stored = () => window.localStorage.getItem(draftKey(USER));

function setup(state: CreateState, onRestore = vi.fn()) {
  return renderHook(
    (props: { state: CreateState }) =>
      useDraftStorage({ userId: USER, state: props.state, defaults, onRestore }),
    { initialProps: { state } },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe("useDraftStorage", () => {
  it("saves unfinished work half a second after it changes, never the password", () => {
    const { rerender, result } = setup(fresh);
    rerender({ state: typed("https://example.com/a", "open sesame") });
    act(() => vi.advanceTimersByTime(499));
    expect(stored()).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(stored()).toContain("https://example.com/a");
    expect(stored()).not.toContain("open sesame");
    expect(result.current.offer).toBeNull();
  });

  it("offers an older draft and leaves it alone until Resume or Discard", () => {
    saveDraft(USER, typed("https://example.com/old"), new Date("2026-10-14T10:00:00Z"));
    const before = stored();
    const onRestore = vi.fn();
    const { rerender, result } = setup(fresh, onRestore);
    expect(result.current.offer?.savedAt).toBe("2026-10-14T10:00:00.000Z");
    rerender({ state: typed("https://example.com/new") });
    act(() => vi.advanceTimersByTime(2000));
    expect(stored()).toBe(before);

    act(() => result.current.resume());
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore.mock.calls[0]![0].code.content.url.url).toBe("https://example.com/old");
    expect(result.current.offer).toBeNull();
  });

  it("Discard removes the draft", () => {
    saveDraft(USER, typed("https://example.com/old"));
    const { result } = setup(fresh);
    act(() => result.current.discard());
    expect(stored()).toBeNull();
    expect(result.current.offer).toBeNull();
  });

  it("finishing removes this page's draft, even if a save was still waiting", () => {
    const { rerender, result } = setup(fresh);
    rerender({ state: typed("https://example.com/mine") });
    act(() => vi.advanceTimersByTime(500));
    expect(stored()).toContain("mine");
    rerender({ state: typed("https://example.com/mine-2") });
    act(() => result.current.finished());
    act(() => vi.advanceTimersByTime(1000));
    expect(stored()).toBeNull();
  });

  it("finishing keeps an older draft that is still on offer", () => {
    saveDraft(USER, typed("https://example.com/old"));
    const { result } = setup(fresh);
    act(() => result.current.finished());
    expect(stored()).toContain("https://example.com/old");
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/create/draft.test.ts features/create/useDraftStorage.test.tsx`
Expected: FAIL. `./draft` and `./useDraftStorage` can't be resolved.

- [ ] **Step 3: Implement `features/create/draft.ts`.**

```ts
import { MAX_CODE_NAME } from "@/features/generator/state/defaults";
import { sanitizeContent, sanitizeDesign } from "@/features/generator/state/sanitize";
import type { GeneratorState } from "@/features/generator/state/types";
import { sanitizePage } from "@/lib/pages/sanitize";
import type { PageContentMap } from "@/lib/pages/types";
import {
  isPageType,
  isStaticType,
  PAGE_TYPE_IDS,
  QR_TYPE_IDS,
  type ContentValues,
  type ErrorCorrection,
} from "@/lib/qr/types";
import { removeKey, saveJSON } from "@/lib/storage";

import {
  initialCreateState,
  type CreateDefaults,
  type CreateSettings,
  type CreateState,
} from "./state";

const EC_LEVELS: readonly ErrorCorrection[] = ["L", "M", "Q", "H"];

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

/** One unfinished code per person per browser. */
export const draftKey = (userId: string) => `quickqreate:draft:v2:${userId}`;

export interface StoredDraft {
  /** When it was last saved (ISO). */
  savedAt: string;
  /** The page as it was, with the password empty. */
  state: CreateState;
}

/** The parts of the page a draft keeps, picked one by one so a password can never slip in. */
function draftBody(state: CreateState) {
  const { activeType, content, pages, design, ecBeforeLogo, name } = state.code;
  const { trackable, startsAt, endsAt, slug, utm } = state.settings;
  return {
    code: { activeType, content, pages, design, ecBeforeLogo, name },
    settings: { trackable, startsAt, endsAt, slug, utm },
    folderId: state.folderId,
    styleDesign: state.styleDesign,
  };
}

export function saveDraft(userId: string, state: CreateState, now = new Date()): void {
  saveJSON(draftKey(userId), { v: 2, savedAt: now.toISOString(), ...draftBody(state) });
}

export const clearDraft = (userId: string) => removeKey(draftKey(userId));

/** True while the page holds nothing a draft would keep: it matches a fresh page. */
export function isBlank(state: CreateState, defaults: CreateDefaults): boolean {
  return (
    JSON.stringify(draftBody(state)) === JSON.stringify(draftBody(initialCreateState(defaults)))
  );
}

/** The saved draft as stored (a string, so renders can compare it cheaply), or null. */
export function rawDraft(userId: string): string | null {
  try {
    return window.localStorage.getItem(draftKey(userId));
  } catch {
    return null;
  }
}

/** A saved draft as a full page state, with anything missing or invalid set to its default. */
export function parseDraft(raw: string | null): StoredDraft | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const draft = record(value);
  if (draft.v !== 2 || typeof draft.savedAt !== "string") return null;
  const savedAt = new Date(draft.savedAt);
  if (Number.isNaN(savedAt.getTime())) return null;

  const fresh = initialCreateState({ type: "url", folderId: null });
  const code = record(draft.code);
  const content = record(code.content);
  const pages = record(code.pages);
  const settings = record(draft.settings);
  const utm = record(settings.utm);
  const activeType =
    typeof code.activeType === "string" &&
    (isStaticType(code.activeType) || isPageType(code.activeType))
      ? code.activeType
      : "url";

  const restored: GeneratorState = {
    ...fresh.code,
    activeType,
    content: Object.fromEntries(
      QR_TYPE_IDS.map((id) => [
        id,
        content[id] === undefined ? fresh.code.content[id] : sanitizeContent(id, content[id]),
      ]),
    ) as unknown as ContentValues,
    pages: Object.fromEntries(
      PAGE_TYPE_IDS.map((id) => [
        id,
        pages[id] === undefined ? fresh.code.pages[id] : sanitizePage(id, pages[id]),
      ]),
    ) as unknown as PageContentMap,
    design: sanitizeDesign(code.design),
    ecBeforeLogo: EC_LEVELS.includes(code.ecBeforeLogo as ErrorCorrection)
      ? (code.ecBeforeLogo as ErrorCorrection)
      : null,
    name: text(code.name, MAX_CODE_NAME),
  };
  const restoredSettings: CreateSettings = {
    trackable: settings.trackable !== false,
    password: "",
    startsAt: text(settings.startsAt, 19),
    endsAt: text(settings.endsAt, 19),
    slug: text(settings.slug, 40),
    utm: {
      source: text(utm.source, 200),
      medium: text(utm.medium, 200),
      campaign: text(utm.campaign, 200),
    },
  };
  return {
    savedAt: savedAt.toISOString(),
    state: {
      code: restored,
      settings: restoredSettings,
      folderId: typeof draft.folderId === "string" ? draft.folderId : null,
      styleDesign: sanitizeDesign(draft.styleDesign),
    },
  };
}
```

A non-boolean `trackable` (the test passes `"yes"`) counts as on, which is the default.

- [ ] **Step 4: Implement `features/create/useDraftStorage.ts`.**

```ts
"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { clearDraft, isBlank, parseDraft, rawDraft, saveDraft, type StoredDraft } from "./draft";
import type { CreateDefaults, CreateState } from "./state";

const DRAFT_DELAY_MS = 500;

/** Other tabs can save or clear the draft; this tab's own changes show on its next render. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Keeps an unfinished code in this browser and offers it back once. Nothing is read on the
 * server, so the page renders the same there and while hydrating. While an older draft is on
 * offer, nothing is written, so it can't be lost by accident: it's replaced only after Resume
 * or Discard.
 */
export function useDraftStorage({
  userId,
  state,
  defaults,
  onRestore,
}: {
  userId: string;
  state: CreateState;
  defaults: CreateDefaults;
  onRestore: (state: CreateState) => void;
}) {
  const raw = useSyncExternalStore(
    subscribe,
    () => rawDraft(userId),
    () => null,
  );
  /** This page owns the draft slot: it saved a draft, or the person chose Resume or Discard. */
  const [owned, setOwned] = useState(false);
  /** The code was created; stop saving. */
  const [done, setDone] = useState(false);
  const offer: StoredDraft | null = useMemo(
    () => (owned || done ? null : parseDraft(raw)),
    [owned, done, raw],
  );

  useEffect(() => {
    if (offer || done) return;
    const timer = window.setTimeout(() => {
      if (isBlank(state, defaults)) clearDraft(userId);
      else saveDraft(userId, state);
      setOwned(true);
    }, DRAFT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [offer, done, state, defaults, userId]);

  const resume = useCallback(() => {
    if (offer) onRestore(offer.state);
    setOwned(true);
  }, [offer, onRestore]);

  const discard = useCallback(() => {
    clearDraft(userId);
    setOwned(true);
  }, [userId]);

  /** After creating: drop this page's draft. An older draft still on offer stays. */
  const finished = useCallback(() => {
    if (!offer) clearDraft(userId);
    setDone(true);
  }, [offer, userId]);

  return { offer, resume, discard, finished };
}
```

Caution: when `finished()` runs with an unresolved offer, `done` flips to true and `offer` becomes null. That's intended: the page is leaving.

- [ ] **Step 5: Run them to see them pass.**

Run: `npx vitest run features/create && npm run lint -- features/create && npm run typecheck`
Expected: all `features/create` tests pass; lint and typecheck exit 0.
If lint flags `react-hooks/set-state-in-effect`: the only `setOwned` in the effect runs inside the timer callback. Don't move it into the effect body.

- [ ] **Step 6: Commit.**

```bash
git add features/create
git commit -m "Keep an unfinished code as a draft and offer it back once"
```

### Task 5: `useCodeDraft`, the page state and everything derived from it

**Files:**
- Modify: `features/generator/useGenerator.ts` (export `moduleColors`)
- Create: `features/create/useCodeDraft.ts`, `features/create/useCodeDraft.test.tsx`

**Interfaces:**
- Consumes: `createReducer`, `initialCreateState`, `isTrackable`, `settingsProblem` (Task 3); the generator's measure/scan/encode helpers; `useScanVerification`.
- Produces:
  ```ts
  export function useCodeDraft(defaults: CreateDefaults): {
    state: CreateState; dispatch: Dispatch<CreateAction>; codeAction: (action: GeneratorAction) => void;
    setField: (qrType: QrTypeId, field: string, value: string | boolean) => void;
    setPage: (type: PageTypeId, content: PageContentMap[PageTypeId]) => void;
    pageErrors: Record<string, string>; pageType: PageTypeId | null; trackable: boolean; previewSlug: string;
    info: CodeTypeInfo; data: string; measurement: Measurement; report: ScanReport; renderOptions: RenderOptions;
    summary: string; defaultName: string; filename: string; blocker: string | null;
  }
  export type CodeDraft = ReturnType<typeof useCodeDraft>;
  ```

- [ ] **Step 1: Write the failing tests.** Create `features/create/useCodeDraft.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { dynamicPayload } from "@/lib/dynamic/slug";

import { useCodeDraft } from "./useCodeDraft";

// Real scan checks render to a canvas, which jsdom does not have.
vi.mock("@/features/generator/preview/useScanVerification", () => ({
  useScanVerification: () => null,
}));

const setup = (type: "url" | "wifi" | "links" = "url") =>
  renderHook(() => useCodeDraft({ type, folderId: null }));

describe("useCodeDraft", () => {
  it("says what's missing, then previews a trackable link's short link", () => {
    const { result } = setup();
    expect(result.current.trackable).toBe(true);
    expect(result.current.blocker).toBe("Add a link to start");
    act(() => result.current.setField("url", "url", "example.com/menu"));
    expect(result.current.blocker).toBeNull();
    expect(result.current.data).toBe(dynamicPayload("PREVIEW"));
    expect(result.current.defaultName).toBe("example.com/menu");
  });

  it("explains a bad link before anything else", () => {
    const { result } = setup();
    act(() => result.current.setField("url", "url", "not a link"));
    expect(result.current.blocker).toBe("Enter a web address, like example.com");
  });

  it("previews the chosen ending, and blocks a malformed one", () => {
    const { result } = setup();
    act(() => result.current.setField("url", "url", "example.com"));
    act(() => result.current.dispatch({ type: "settings", patch: { slug: "SPRING" } }));
    expect(result.current.data).toBe(dynamicPayload("SPRING"));
    act(() => result.current.dispatch({ type: "settings", patch: { slug: "no spaces" } }));
    expect(result.current.data).toBe(dynamicPayload("PREVIEW"));
    expect(result.current.blocker).toBe("Link endings use 3–40 letters, numbers or dashes");
  });

  it("encodes a static link directly and ignores its settings", () => {
    const { result } = setup();
    act(() => result.current.setField("url", "url", "example.com"));
    act(() =>
      result.current.dispatch({ type: "settings", patch: { trackable: false, password: "ab" } }),
    );
    expect(result.current.trackable).toBe(false);
    expect(result.current.data).toBe("https://example.com");
    expect(result.current.blocker).toBeNull();
  });

  it("never makes Wi-Fi trackable", () => {
    const { result } = setup("wifi");
    expect(result.current.trackable).toBe(false);
  });

  it("names the file after the content", () => {
    const { result } = setup();
    act(() => result.current.setField("url", "url", "example.com"));
    expect(result.current.filename).toMatch(/example-com.*\.png$/);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/create/useCodeDraft.test.tsx`
Expected: FAIL. `./useCodeDraft` can't be resolved.

- [ ] **Step 3: Export the module-color helper.** In `features/generator/useGenerator.ts`, change `function moduleColors(` to `export function moduleColors(`.

- [ ] **Step 4: Implement `features/create/useCodeDraft.ts`.**

```ts
"use client";

import { useCallback, useMemo, useReducer } from "react";

import { useScanVerification } from "@/features/generator/preview/useScanVerification";
import type { GeneratorAction } from "@/features/generator/state/types";
import { moduleColors } from "@/features/generator/useGenerator";
import { dynamicPayload, isValidSlug } from "@/lib/dynamic/slug";
import type { PageContentMap } from "@/lib/pages/types";
import { pageSummary, validatePage } from "@/lib/pages/validate";
import { measure } from "@/lib/qr/capacity";
import { codeTypeInfo } from "@/lib/qr/code-types";
import { buildFilename } from "@/lib/qr/filename";
import {
  encodeContent,
  filenameLabelFor,
  summarizeContent,
  validateContent,
} from "@/lib/qr/qr-types";
import type { RenderOptions } from "@/lib/qr/renderer";
import { checkScannability, withVerification } from "@/lib/qr/scannability";
import { isPageType, type PageTypeId, type QrTypeId } from "@/lib/qr/types";

import {
  createReducer,
  initialCreateState,
  isTrackable,
  settingsProblem,
  type CreateDefaults,
} from "./state";

/**
 * The Create page's state and everything derived from it: preview data, the scan check, a
 * suggested name and why it can't be created yet. Nothing here is stored anywhere; drafts are
 * the page's explicit job (useDraftStorage).
 */
export function useCodeDraft(defaults: CreateDefaults) {
  const [state, dispatch] = useReducer(createReducer, defaults, initialCreateState);
  const { code, settings } = state;
  const { activeType, design, exportSettings } = code;
  const pageType = isPageType(activeType) ? activeType : null;
  const staticType = isPageType(activeType) ? null : activeType;
  const values = staticType ? code.content[staticType] : null;
  const page = pageType ? code.pages[pageType] : null;
  const trackable = isTrackable(state);
  /** The ending the preview shows: the chosen one, or a placeholder until the code exists. */
  const previewSlug = settings.slug && isValidSlug(settings.slug) ? settings.slug : "PREVIEW";

  const errors: Record<string, string> = useMemo(() => {
    if (pageType && page) return validatePage(pageType, page);
    if (staticType && values) return validateContent(staticType, values) as Record<string, string>;
    return {};
  }, [pageType, page, staticType, values]);
  const isValid = Object.keys(errors).length === 0;
  const encoded = useMemo(
    () => (staticType && values ? encodeContent(staticType, values) : ""),
    [staticType, values],
  );
  const data = !isValid ? (trackable ? "" : encoded) : trackable ? dynamicPayload(previewSlug) : encoded;

  const measurement = useMemo(
    () => measure(data, design.errorCorrection),
    [data, design.errorCorrection],
  );
  const heuristics = useMemo(
    () =>
      checkScannability({
        data,
        measurement,
        fgColor: design.fgColor,
        extraColors: moduleColors(design),
        bgColor: design.bgColor,
        transparent: design.transparent,
        errorCorrection: design.errorCorrection,
        logoSize: design.logo ? design.logoSize : 0,
        exportSize: exportSettings.format === "svg" ? 4096 : exportSettings.size,
      }),
    [data, measurement, design, exportSettings],
  );
  const renderOptions: RenderOptions = useMemo(
    () => ({ ...design, data, size: exportSettings.size }),
    [design, data, exportSettings.size],
  );
  const verification = useScanVerification(renderOptions, data !== "" && measurement.fits);
  const report = useMemo(
    () => withVerification(heuristics, verification),
    [heuristics, verification],
  );

  const info = codeTypeInfo(activeType);
  const summary =
    pageType && page
      ? pageSummary(pageType, page)
      : encoded && staticType && values
        ? summarizeContent(staticType, values)
        : "";
  const defaultName = summary || info.label;
  const filename = buildFilename(
    activeType,
    staticType && values ? filenameLabelFor(staticType, values) : summary,
    "png",
  );
  const firstError = Object.values(errors)[0] ?? null;
  /** Why the code can't be created yet, or null when it's ready. */
  const blocker =
    staticType && !encoded
      ? info.emptyHint
      : !isValid
        ? (firstError ?? info.emptyHint)
        : !measurement.fits
          ? "Too much content for a QR code"
          : trackable
            ? settingsProblem(settings)
            : null;

  const codeAction = useCallback(
    (action: GeneratorAction) => dispatch({ type: "code", action }),
    [],
  );
  const setField = useCallback(
    (qrType: QrTypeId, field: string, value: string | boolean) =>
      codeAction({ type: "setField", qrType, field, value }),
    [codeAction],
  );
  const setPage = useCallback(
    (type: PageTypeId, content: PageContentMap[PageTypeId]) =>
      codeAction({ type: "setPage", pageType: type, content }),
    [codeAction],
  );

  return {
    state,
    dispatch,
    codeAction,
    setField,
    setPage,
    pageErrors: pageType ? errors : {},
    pageType,
    trackable,
    previewSlug,
    info,
    data,
    measurement,
    report,
    renderOptions,
    summary,
    defaultName,
    filename,
    blocker,
  };
}

export type CodeDraft = ReturnType<typeof useCodeDraft>;
```

- [ ] **Step 5: Run them to see them pass.**

Run: `npx vitest run features/create features/generator && npm run typecheck`
Expected: all pass; typecheck exits 0.
If the filename regex doesn't match `buildFilename`'s real output, print `result.current.filename` once and tighten the regex to the real slug format. Ledger it as a test-only ruling.

- [ ] **Step 6: Commit.**

```bash
git add features/create features/generator/useGenerator.ts
git commit -m "Derive the Create page's preview, name and readiness"
```

### Task 6: The five sections

**Files:**
- Modify: `features/generator/content/types.ts` (add `ContentEditor`)
- Modify: `features/generator/content/ContentForm.tsx`, `features/generator/content/HostedPageForm.tsx` (take a `ContentEditor`)
- Modify: `features/generator/style/StyleCard.tsx` (export `Swatches`)
- Create: `features/create/sections/TypeSection.tsx`, `ContentSection.tsx`, `DesignSection.tsx`, `SettingsSection.tsx`, `NameFolderSection.tsx`
- Create: `features/create/sections/sections.test.tsx`

**Interfaces:**
- Consumes: catalog (Task 3), `CreateSettings`, `settingsErrors`, `DEFAULT_SETTINGS` (Task 3); the generator's forms and style sections.
- Produces:
  ```ts
  // features/generator/content/types.ts
  export interface ContentEditor {
    state: Pick<GeneratorState, "activeType" | "content" | "pages">;
    setField: (qrType: QrTypeId, field: string, value: string | boolean) => void;
    setPage: (type: PageTypeId, content: PageContentMap[PageTypeId]) => void;
    pageErrors: Record<string, string>;
    workspace: { ownerId: string } | null;
  }
  // sections
  TypeSection({ value: CodeTypeId; onChange: (type: CodeTypeId) => void })
  ContentSection({ editor: ContentEditor; onTypeChange: (type: CodeTypeId) => void })
  DesignSection({ design: DesignState; dispatch: (action: GeneratorAction) => void; onResetToStyle: () => void })
  SettingsSection({ type: CodeTypeId; settings: CreateSettings; onChange: (patch: Partial<CreateSettings>) => void })
  NameFolderSection({ name: string; placeholder: string; onName: (name: string) => void; folderId: string | null; folders: FolderRow[]; onFolder: (folderId: string | null) => void })
  ```
  Field labels the tests and the browser suite rely on: "Code type" (tile group), "More types" (button), "Search types", "How should it work?", "Trackable" (switch), "Code password", "Starts", "Ends", "Short link ending", "Source", "Medium", "Campaign", "Code name", "Folder", "Reset to style".

- [ ] **Step 1: Write the failing tests.** Create `features/create/sections/sections.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ContentEditor } from "@/features/generator/content/types";
import { initialState } from "@/features/generator/state/defaults";
import type { CodeTypeId } from "@/lib/qr/types";
import type { FolderRow } from "@/types/supabase";

import { DEFAULT_SETTINGS } from "../state";
import { ContentSection } from "./ContentSection";
import { DesignSection } from "./DesignSection";
import { NameFolderSection } from "./NameFolderSection";
import { SettingsSection } from "./SettingsSection";
import { TypeSection } from "./TypeSection";

// Style previews draw on a canvas, which jsdom does not have.
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));

const editorFor = (type: CodeTypeId): ContentEditor => ({
  state: { ...initialState(), activeType: type },
  setField: vi.fn(),
  setPage: vi.fn(),
  pageErrors: {},
  workspace: null,
});

describe("TypeSection", () => {
  it("offers eight common types and finds the rest by search", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TypeSection value="url" onChange={onChange} />);
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByRole("radio", { name: /Open a website/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "More types" }));
    await user.type(screen.getByLabelText("Search types"), "whatsapp");
    await user.click(screen.getByRole("button", { name: /WhatsApp/ }));
    expect(onChange).toHaveBeenCalledWith("whatsapp");
    expect(screen.queryByLabelText("Search types")).toBeNull();
  });

  it("says when no type matches", async () => {
    const user = userEvent.setup();
    render(<TypeSection value="url" onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "More types" }));
    await user.type(screen.getByLabelText("Search types"), "zzz");
    expect(screen.getByText("No types match “zzz”.")).toBeInTheDocument();
  });

  it("shows a less common type as its own tile, and Contact for both contact kinds", () => {
    const { rerender } = render(<TypeSection value="whatsapp" onChange={vi.fn()} />);
    expect(screen.getAllByRole("radio")).toHaveLength(9);
    expect(screen.getByRole("radio", { name: /Start a WhatsApp chat/ })).toBeChecked();
    rerender(<TypeSection value="vcard" onChange={vi.fn()} />);
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByRole("radio", { name: /Share contact details/ })).toBeChecked();
  });
});

describe("ContentSection", () => {
  it("asks how a contact should work", async () => {
    const user = userEvent.setup();
    const onTypeChange = vi.fn();
    render(<ContentSection editor={editorFor("contact")} onTypeChange={onTypeChange} />);
    expect(screen.getByRole("radio", { name: /Save straight to phone/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /Show a contact page/ }));
    expect(onTypeChange).toHaveBeenCalledWith("vcard");
  });

  it("shows the type's form", () => {
    render(<ContentSection editor={editorFor("url")} onTypeChange={vi.fn()} />);
    expect(screen.getByLabelText("Website address")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "How should it work?" })).toBeNull();
  });
});

describe("DesignSection", () => {
  it("starts from a style, keeps scan reliability under More design options, and resets", async () => {
    const user = userEvent.setup();
    const onResetToStyle = vi.fn();
    render(
      <DesignSection design={initialState().design} dispatch={vi.fn()} onResetToStyle={onResetToStyle} />,
    );
    expect(screen.getByRole("button", { name: /Start from a style/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /More design options/ }));
    expect(screen.getByText(/Scan reliability rises on its own/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset to style" }));
    expect(onResetToStyle).toHaveBeenCalled();
  });

  it("lets several groups be open at once", async () => {
    const user = userEvent.setup();
    render(<DesignSection design={initialState().design} dispatch={vi.fn()} onResetToStyle={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /^Colors/ }));
    await user.click(screen.getByRole("button", { name: /^Shape/ }));
    expect(screen.getByRole("button", { name: /^Colors/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /^Shape/ })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("SettingsSection", () => {
  it("turns the settings off for codes that work without internet, and says why", () => {
    render(<SettingsSection type="wifi" settings={DEFAULT_SETTINGS} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Code password/)).toBeDisabled();
    expect(
      screen.getByText("Wi-Fi codes work without internet, so they can’t change after printing."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /Trackable/ })).toBeNull();
  });

  it("lets a Link switch tracking off, which turns its settings off", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <SettingsSection type="url" settings={DEFAULT_SETTINGS} onChange={onChange} />,
    );
    expect(screen.getByLabelText(/Code password/)).toBeEnabled();
    expect(screen.getByLabelText("Source")).toBeEnabled();
    await user.click(screen.getByRole("switch", { name: /Trackable/ }));
    expect(onChange).toHaveBeenCalledWith({ trackable: false });
    rerender(
      <SettingsSection type="url" settings={{ ...DEFAULT_SETTINGS, trackable: false }} onChange={onChange} />,
    );
    expect(screen.getByLabelText(/Code password/)).toBeDisabled();
    expect(screen.getByText("Static codes can’t change after printing.")).toBeInTheDocument();
  });

  it("keeps hosted pages trackable, without campaign fields", () => {
    render(<SettingsSection type="links" settings={DEFAULT_SETTINGS} onChange={vi.fn()} />);
    expect(screen.getByText(/Hosted pages are always trackable/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Code password/)).toBeEnabled();
    expect(screen.queryByLabelText("Source")).toBeNull();
  });

  it("points out a short password, an end before the start and a bad ending", () => {
    render(
      <SettingsSection
        type="url"
        settings={{
          ...DEFAULT_SETTINGS,
          password: "abc",
          startsAt: "2030-02-01T09:00",
          endsAt: "2030-01-01T09:00",
          slug: "no spaces",
        }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Passwords are 4 to 128 characters")).toBeInTheDocument();
    expect(screen.getByText("The end date must be after the start date")).toBeInTheDocument();
    expect(screen.getByText("Link endings use 3–40 letters, numbers or dashes")).toBeInTheDocument();
  });
});

describe("NameFolderSection", () => {
  it("suggests a name and files the code in a folder", async () => {
    const user = userEvent.setup();
    const onFolder = vi.fn();
    const folders = [
      { id: "f1", name: "Flyers" },
      { id: "f2", name: "Menus" },
    ] as FolderRow[];
    render(
      <NameFolderSection
        name=""
        placeholder="example.com"
        onName={vi.fn()}
        folderId="f1"
        folders={folders}
        onFolder={onFolder}
      />,
    );
    expect(screen.getByLabelText("Code name")).toHaveAttribute("placeholder", "example.com");
    expect(screen.getByLabelText("Folder")).toHaveValue("f1");
    await user.selectOptions(screen.getByLabelText("Folder"), "");
    expect(onFolder).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/create/sections`
Expected: FAIL. The section modules can't be resolved.

- [ ] **Step 3: Let the content forms take a `ContentEditor`.** In `features/generator/content/types.ts`, add (keeping `FormProps`):

```ts
import type { PageContentMap } from "@/lib/pages/types";
import type { ContentValues, PageTypeId, QrTypeId } from "@/lib/qr/types";

import type { GeneratorState } from "../state/types";

/** What the content forms need, so the generator and the Create page can both use them. */
export interface ContentEditor {
  state: Pick<GeneratorState, "activeType" | "content" | "pages">;
  setField: (qrType: QrTypeId, field: string, value: string | boolean) => void;
  setPage: (type: PageTypeId, content: PageContentMap[PageTypeId]) => void;
  pageErrors: Record<string, string>;
  /** Hosted-page media is stored in this workspace; null = the signed-in person's own. */
  workspace: { ownerId: string } | null;
}
```

(Merge the `ContentValues`/`QrTypeId` import with the file's existing one.)

In `features/generator/content/ContentForm.tsx` and `features/generator/content/HostedPageForm.tsx`, replace `import type { Generator } from "../useGenerator";` with `import type { ContentEditor } from "./types";`. Change each `generator: Generator` parameter type to `generator: ContentEditor`. `useGenerator`'s return value already fits `ContentEditor`, so `Generator.tsx` needs no change.

In `features/generator/style/StyleCard.tsx`, change `function Swatches(` to `export function Swatches(`.

- [ ] **Step 4: Create `features/create/sections/TypeSection.tsx`.**

```tsx
"use client";

import { Radio, RadioGroup } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { TYPE_ICONS } from "@/features/generator/content/registry";
import { cn } from "@/lib/cn";
import type { CodeTypeId } from "@/lib/qr/types";

import { COMMON_TYPES, moreTypes, tileFor, typeDescription, typeLabel } from "../catalog";

const tileClass =
  "flex min-h-11 cursor-pointer flex-col gap-1 rounded-control border border-border bg-surface p-3 text-left transition-colors hover:border-field-border data-checked:border-primary data-checked:bg-surface-2 data-checked:ring-1 data-checked:ring-primary data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring";

/** Step 1: the eight common types as tiles, and every other type behind a search. */
export function TypeSection({
  value,
  onChange,
}: {
  value: CodeTypeId;
  onChange: (type: CodeTypeId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelId = useId();
  const current = tileFor(value);
  const tiles = COMMON_TYPES.includes(current) ? COMMON_TYPES : [...COMMON_TYPES, current];
  const groups = moreTypes(query);

  function pick(type: CodeTypeId) {
    onChange(type);
    setOpen(false);
    setQuery("");
  }

  return (
    <Card aria-labelledby="type-heading">
      <CardHeader id="type-heading" step={1} title="What should it open?" />
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
        <RadioGroup
          value={current}
          onChange={onChange}
          aria-label="Code type"
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          {tiles.map((id) => {
            const Icon = TYPE_ICONS[id];
            return (
              <Radio key={id} value={id} className={tileClass}>
                <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {typeLabel(id)}
                </span>
                <span className="text-[13px] text-fg-muted">{typeDescription(id)}</span>
              </Radio>
            );
          })}
        </RadioGroup>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 items-center gap-1.5 self-start rounded-control px-1 text-sm font-semibold text-link focus-ring"
        >
          More types
          <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div id={panelId} className="flex flex-col gap-4">
            <Field label="Search types">
              {(control) => (
                <TextInput
                  {...control}
                  type="search"
                  autoFocus
                  placeholder="Wi-Fi, menu, PDF…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              )}
            </Field>
            {groups.length === 0 && (
              <p className="text-sm text-fg-muted">No types match “{query.trim()}”.</p>
            )}
            {groups.map((group) => (
              <section key={group.title} aria-label={group.title} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-fg">{group.title}</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {group.ids.map((id) => {
                    const Icon = TYPE_ICONS[id];
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          aria-pressed={current === id}
                          onClick={() => pick(id)}
                          className="flex min-h-11 w-full items-start gap-3 rounded-control border border-border bg-surface p-3 text-left focus-ring hover:bg-surface-2 aria-pressed:border-primary"
                        >
                          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" />
                          <span className="flex flex-col">
                            <span className="text-sm font-semibold text-fg">{typeLabel(id)}</span>
                            <span className="text-[13px] text-fg-muted">{typeDescription(id)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Create `features/create/sections/ContentSection.tsx`.**

```tsx
"use client";

import { Radio, RadioGroup } from "@headlessui/react";

import { Card, CardHeader } from "@/components/ui/Card";
import { ContentForm } from "@/features/generator/content/ContentForm";
import type { ContentEditor } from "@/features/generator/content/types";
import type { CodeTypeId } from "@/lib/qr/types";

import { isContactType, typeDescription } from "../catalog";

const CONTACT_KINDS = [
  {
    value: "contact",
    label: "Save straight to phone",
    hint: "Works without internet. The details can’t change after printing.",
  },
  {
    value: "vcard",
    label: "Show a contact page",
    hint: "A page you can edit any time, with a Save contact button.",
  },
] as const;

/** Step 2: the chosen type's form. Contact first asks how it should work. */
export function ContentSection({
  editor,
  onTypeChange,
}: {
  editor: ContentEditor;
  onTypeChange: (type: CodeTypeId) => void;
}) {
  const type = editor.state.activeType;
  return (
    <Card aria-labelledby="content-heading">
      <CardHeader id="content-heading" step={2} title="Content" description={typeDescription(type)} />
      <div className="flex flex-col gap-6 px-5 pt-4 pb-6 sm:px-6">
        {isContactType(type) && (
          <RadioGroup
            value={type}
            onChange={onTypeChange}
            aria-label="How should it work?"
            className="grid gap-2 sm:grid-cols-2"
          >
            {CONTACT_KINDS.map((kind) => (
              <Radio
                key={kind.value}
                value={kind.value}
                className="flex min-h-11 cursor-pointer flex-col gap-1 rounded-control border border-border bg-surface p-3 data-checked:border-primary data-checked:bg-surface-2 data-checked:ring-1 data-checked:ring-primary data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
              >
                <span className="text-sm font-semibold text-fg">{kind.label}</span>
                <span className="text-[13px] text-fg-muted">{kind.hint}</span>
              </Radio>
            ))}
          </RadioGroup>
        )}
        <ContentForm generator={editor} />
      </div>
    </Card>
  );
}
```

- [ ] **Step 6: Create `features/create/sections/DesignSection.tsx`.**

```tsx
"use client";

import {
  Frame,
  Image as ImageIcon,
  LayoutTemplate,
  Palette,
  RotateCcw,
  Shapes,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import type { DesignState, GeneratorAction } from "@/features/generator/state/types";
import { ColorsSection } from "@/features/generator/style/ColorsSection";
import { EC_LEVELS, ErrorCorrectionSection } from "@/features/generator/style/ErrorCorrectionSection";
import { FRAME_STYLES, FrameSection } from "@/features/generator/style/FrameSection";
import { LogoSection } from "@/features/generator/style/LogoSection";
import { DOT_STYLES, ShapeSection } from "@/features/generator/style/ShapeSection";
import { Swatches } from "@/features/generator/style/StyleCard";
import { TemplatesSection } from "@/features/generator/style/TemplatesSection";
import { LOGO_ICONS } from "@/lib/qr/logo-icons";

/** Step 3: start from a style, then colors, shape, logo and frame (several can be open). */
export function DesignSection({
  design,
  dispatch,
  onResetToStyle,
}: {
  design: DesignState;
  dispatch: (action: GeneratorAction) => void;
  onResetToStyle: () => void;
}) {
  const logo = design.logo
    ? "Your image"
    : design.logoIcon
      ? `${LOGO_ICONS.find((icon) => icon.id === design.logoIcon)?.label} icon`
      : "None";
  return (
    <Card aria-labelledby="design-heading">
      <CardHeader
        id="design-heading"
        step={3}
        title="Design"
        description="Start from a style, then make it yours. The preview updates as you go."
        action={
          <Button variant="ghost" size="sm" onClick={onResetToStyle}>
            <RotateCcw aria-hidden />
            <span className="max-sm:sr-only">Reset to style</span>
          </Button>
        }
      />
      <div className="mt-4">
        <Section
          title="Start from a style"
          icon={<LayoutTemplate />}
          summary="Styles and your templates"
          defaultOpen
        >
          <TemplatesSection design={design} dispatch={dispatch} />
        </Section>
        <Section title="Colors" icon={<Palette />} summary={<Swatches design={design} />}>
          <ColorsSection design={design} dispatch={dispatch} />
        </Section>
        <Section
          title="Shape"
          icon={<Shapes />}
          summary={DOT_STYLES.find((style) => style.value === design.dotStyle)?.label}
        >
          <ShapeSection design={design} dispatch={dispatch} />
        </Section>
        <Section title="Logo" icon={<ImageIcon />} summary={logo}>
          <LogoSection design={design} dispatch={dispatch} />
        </Section>
        <Section
          title="Frame"
          icon={<Frame />}
          summary={FRAME_STYLES.find((frame) => frame.value === design.frame)?.label}
        >
          <FrameSection design={design} dispatch={dispatch} />
        </Section>
        <Section
          title="More design options"
          icon={<SlidersHorizontal />}
          summary={`Scan reliability: ${EC_LEVELS.find((level) => level.value === design.errorCorrection)?.label}`}
        >
          <p className="text-sm text-fg-muted">
            Scan reliability rises on its own when you add a logo. Change it here only if you need
            to.
          </p>
          <ErrorCorrectionSection design={design} dispatch={dispatch} />
        </Section>
      </div>
    </Card>
  );
}
```

- [ ] **Step 7: Create `features/create/sections/SettingsSection.tsx`.**

```tsx
"use client";

import { useId } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { Toggle } from "@/components/ui/Toggle";
import { shortLinkLabel } from "@/lib/env";
import { isPageType, type CodeTypeId } from "@/lib/qr/types";

import { typeLabel } from "../catalog";
import { settingsErrors, type CreateSettings } from "../state";

const UTM_FIELDS = [
  { key: "source", label: "Source", placeholder: "flyer" },
  { key: "medium", label: "Medium", placeholder: "qr" },
  { key: "campaign", label: "Campaign", placeholder: "fall-menu" },
] as const;

/** Step 4: tracking, a password, active dates and the short link. Off, with why, when static. */
export function SettingsSection({
  type,
  settings,
  onChange,
}: {
  type: CodeTypeId;
  settings: CreateSettings;
  onChange: (patch: Partial<CreateSettings>) => void;
}) {
  const reasonId = useId();
  const hosted = isPageType(type);
  const link = type === "url";
  const trackable = hosted || (link && settings.trackable);
  const errors = trackable ? settingsErrors(settings) : {};
  const reason = link
    ? "Static codes can’t change after printing."
    : `${typeLabel(type)} codes work without internet, so they can’t change after printing.`;

  return (
    <Card aria-labelledby="settings-heading">
      <CardHeader
        id="settings-heading"
        step={4}
        title="Settings"
        description="Tracking, a password, active dates and the short link."
      />
      <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
        {link && (
          <Toggle
            label="Trackable"
            description="Change where it points after printing, and see scans."
            checked={settings.trackable}
            onChange={(on) => onChange({ trackable: on })}
          />
        )}
        {hosted && (
          <p className="text-sm text-fg-muted">
            Hosted pages are always trackable: edit them any time and see scans.
          </p>
        )}
        {!trackable && (
          <p id={reasonId} className="rounded-control bg-surface-2 px-3.5 py-2.5 text-sm text-fg">
            {reason}
          </p>
        )}
        <fieldset
          disabled={!trackable}
          aria-describedby={trackable ? undefined : reasonId}
          className="flex min-w-0 flex-col gap-5"
        >
          <legend className="sr-only">Settings for trackable codes</legend>
          <Field
            label="Code password"
            optional
            hint="4 to 128 characters. Scanners need it to open the code."
            error={errors.password}
          >
            {(control) => (
              <TextInput
                {...control}
                type="password"
                autoComplete="new-password"
                maxLength={128}
                value={settings.password}
                onChange={(event) => onChange({ password: event.target.value })}
              />
            )}
          </Field>
          <div className="flex flex-col gap-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" optional hint="Before this, scanners see “not active yet”.">
                {(control) => (
                  <TextInput
                    {...control}
                    type="datetime-local"
                    value={settings.startsAt}
                    onChange={(event) => onChange({ startsAt: event.target.value })}
                  />
                )}
              </Field>
              <Field
                label="Ends"
                optional
                hint="After this, scanners see “expired”."
                error={errors.endsAt}
              >
                {(control) => (
                  <TextInput
                    {...control}
                    type="datetime-local"
                    value={settings.endsAt}
                    onChange={(event) => onChange({ endsAt: event.target.value })}
                  />
                )}
              </Field>
            </div>
            <p className="text-sm text-fg-muted">Times are in your time zone.</p>
          </div>
          <Field
            label="Short link ending"
            optional
            hint={
              settings.slug && !errors.slug
                ? `Opens ${shortLinkLabel(settings.slug)}`
                : "Leave it blank for a random ending."
            }
            error={errors.slug}
          >
            {(control) => (
              <TextInput
                {...control}
                maxLength={40}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={settings.slug}
                onChange={(event) => onChange({ slug: event.target.value.trim() })}
              />
            )}
          </Field>
          {link && (
            <fieldset className="flex min-w-0 flex-col gap-3">
              <legend className="text-sm font-medium text-fg">
                Campaign tracking <span className="font-normal text-fg-muted">(optional)</span>
              </legend>
              <p className="text-sm text-fg-muted">
                Adds utm_ tags to the link so Google Analytics shows these visits as coming from
                this code.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {UTM_FIELDS.map((field) => (
                  <Field key={field.key} label={field.label}>
                    {(control) => (
                      <TextInput
                        {...control}
                        placeholder={field.placeholder}
                        value={settings.utm[field.key] ?? ""}
                        onChange={(event) =>
                          onChange({ utm: { ...settings.utm, [field.key]: event.target.value } })
                        }
                      />
                    )}
                  </Field>
                ))}
              </div>
            </fieldset>
          )}
        </fieldset>
      </div>
    </Card>
  );
}
```

- [ ] **Step 8: Create `features/create/sections/NameFolderSection.tsx`.**

```tsx
"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select, TextInput } from "@/components/ui/inputs";
import { MAX_CODE_NAME } from "@/features/generator/state/defaults";
import type { FolderRow } from "@/types/supabase";

/** Step 5: a name (suggested from the content) and a folder (the one you came from). */
export function NameFolderSection({
  name,
  placeholder,
  onName,
  folderId,
  folders,
  onFolder,
}: {
  name: string;
  placeholder: string;
  onName: (name: string) => void;
  folderId: string | null;
  folders: FolderRow[];
  onFolder: (folderId: string | null) => void;
}) {
  return (
    <Card aria-labelledby="name-heading">
      <CardHeader id="name-heading" step={5} title="Name & folder" />
      <div className="grid gap-4 px-5 pt-4 pb-6 sm:grid-cols-2 sm:px-6">
        <Field label="Code name" hint="Leave it blank to use the suggestion.">
          {(control) => (
            <TextInput
              {...control}
              placeholder={placeholder}
              maxLength={MAX_CODE_NAME}
              value={name}
              onChange={(event) => onName(event.target.value)}
            />
          )}
        </Field>
        <Field label="Folder">
          {(control) => (
            <Select
              {...control}
              value={folderId ?? ""}
              onChange={(event) => onFolder(event.target.value || null)}
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

- [ ] **Step 9: Run them to see them pass.**

Run: `npx vitest run features/create features/generator && npm run lint && npm run typecheck`
Expected: all pass; lint and typecheck exit 0.

- [ ] **Step 10: Commit.**

```bash
git add features/create features/generator
git commit -m "Build the Create page's five sections"
```

### Task 7: Preview, phone bar, draft offer, the page and its route

**Files:**
- Create: `features/create/PreviewColumn.tsx`, `features/create/CreateMobileBar.tsx`, `features/create/DraftBanner.tsx`, `features/create/CreatePage.tsx`, `features/create/CreatePage.test.tsx`
- Create: `app/(app)/codes/new/page.tsx`
- Modify: `features/dashboard/CodeEditor.tsx` (the Download card becomes `id="download"`)

**Interfaces:**
- Consumes: everything from Tasks 2–6; `withWorkspace`; `relativePhrase`; `requireUser`; `workspaceLabel`.
- Produces: `CreatePage(props: CreatePageProps)`, with
  ```ts
  interface CreatePageProps {
    userId: string;
    teamId: string | null;
    workspaceLabel: string | null;
    folders: FolderRow[];
    initialType: CodeTypeId;
    initialFolderId: string | null;
  }
  ```
  - The route is `/codes/new?type=&folder=&workspace=`.
  - A successful create goes to `/codes/<id>#download` (with `?workspace=` for a team) and shows the toast "Code created".

- [ ] **Step 1: Write the failing tests.** Create `features/create/CreatePage.test.tsx`:

```tsx
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type * as CodesApi from "@/features/codes/api";
import { createCodeWithSettings, type Result } from "@/features/codes/api";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { CreatePage, type CreatePageProps } from "./CreatePage";
import { saveDraft } from "./draft";
import { createReducer, initialCreateState } from "./state";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/codes/api", async (original) => ({
  ...(await original<typeof CodesApi>()),
  createCodeWithSettings: vi.fn(),
}));
// Real scan checks and QR drawing need a canvas, which jsdom does not have.
vi.mock("@/features/generator/preview/useScanVerification", () => ({
  useScanVerification: () => null,
}));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));

const USER = "user-1";
const FOLDERS = [
  { id: "f1", name: "Flyers" },
  { id: "f2", name: "Menus" },
] as FolderRow[];
const created = { id: "c1" } as QrCodeRow;

/** A promise the test resolves when it wants the "network" to answer. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function renderPage(props: Partial<CreatePageProps> = {}) {
  return render(
    <ToastProvider>
      <CreatePage
        userId={USER}
        teamId={null}
        workspaceLabel={null}
        folders={FOLDERS}
        initialType="url"
        initialFolderId={null}
        {...props}
      />
    </ToastProvider>,
  );
}

/** The desktop preview column (the phone bar repeats some of it). */
const preview = () => within(screen.getByRole("complementary", { name: "Preview" }));

beforeEach(() => {
  window.localStorage.clear();
  push.mockReset();
  vi.mocked(createCodeWithSettings).mockReset();
});

describe("CreatePage", () => {
  it("starts clean, with the type and folder from the address", () => {
    renderPage({ initialType: "wifi", initialFolderId: "f1" });
    expect(screen.getByRole("radio", { name: /Join a Wi-Fi network/ })).toBeChecked();
    expect(screen.getByLabelText("Folder")).toHaveValue("f1");
    expect(screen.getByLabelText("Code name")).toHaveValue("");
    expect(screen.getByLabelText(/Code password/)).toBeDisabled();
  });

  it("says what's missing, then creates a trackable link with its settings and opens it", async () => {
    const user = userEvent.setup();
    vi.mocked(createCodeWithSettings).mockResolvedValue({ ok: true, value: created });
    renderPage();
    const create = preview().getByRole("button", { name: "Create code" });
    expect(create).toBeDisabled();
    expect(preview().getByText("Add a link to start")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Website address"), "https://example.com/menu");
    await user.type(screen.getByLabelText(/Code password/), "open sesame");
    await user.click(create);

    expect(createCodeWithSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        qrType: "url",
        folderId: null,
        name: "example.com/menu",
        dynamic: { destination: "https://example.com/menu" },
      }),
      { password: "open sesame", activeFrom: null, activeUntil: null },
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/codes/c1#download"));
    expect(await screen.findByText("Code created")).toBeInTheDocument();
  });

  it("creates in the team it was opened for", async () => {
    const user = userEvent.setup();
    vi.mocked(createCodeWithSettings).mockResolvedValue({ ok: true, value: created });
    renderPage({ teamId: "t1", workspaceLabel: "Cafe team" });
    expect(screen.getByText("Saving to Cafe team’s codes")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Website address"), "https://example.com");
    await user.click(preview().getByRole("button", { name: "Create code" }));
    expect(createCodeWithSettings).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "t1" }),
      expect.anything(),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/codes/c1?workspace=t1#download"));
  });

  it("creates only once when Create is pressed twice", async () => {
    const user = userEvent.setup();
    const answer = deferred<Result<QrCodeRow>>();
    vi.mocked(createCodeWithSettings).mockReturnValue(answer.promise);
    renderPage();
    await user.type(screen.getByLabelText("Website address"), "https://example.com");
    await user.click(preview().getByRole("button", { name: "Create code" }));
    const pending = preview().getByRole("button", { name: /Creating/ });
    expect(pending).toBeDisabled();
    await user.click(pending);
    expect(createCodeWithSettings).toHaveBeenCalledTimes(1);
    await act(async () => answer.resolve({ ok: true, value: created }));
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("stays on the page and explains when creating fails", async () => {
    const user = userEvent.setup();
    vi.mocked(createCodeWithSettings).mockResolvedValue({
      ok: false,
      error: "That link ending is already taken. Try another.",
    });
    renderPage();
    await user.type(screen.getByLabelText("Website address"), "https://example.com");
    await user.click(preview().getByRole("button", { name: "Create code" }));
    expect(
      await screen.findByText("That link ending is already taken. Try another."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Website address")).toHaveValue("https://example.com");
    expect(preview().getByRole("button", { name: "Create code" })).toBeEnabled();
  });

  it("offers an unfinished code and restores it only on Resume", async () => {
    const user = userEvent.setup();
    const old = createReducer(
      createReducer(initialCreateState({ type: "url", folderId: "gone" }), {
        type: "code",
        action: { type: "setField", qrType: "url", field: "url", value: "https://example.com/old" },
      }),
      { type: "code", action: { type: "setName", name: "Old poster" } },
    );
    saveDraft(USER, old, new Date(Date.now() - 2 * 60 * 60 * 1000));
    renderPage({ initialFolderId: "f1" });

    expect(
      await screen.findByText(/You have an unfinished code from 2 hours ago/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Website address")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByLabelText("Website address")).toHaveValue("https://example.com/old");
    expect(screen.getByLabelText("Code name")).toHaveValue("Old poster");
    // The draft's folder is gone, so it stays in the folder the page was opened for.
    expect(screen.getByLabelText("Folder")).toHaveValue("f1");
    expect(screen.queryByText(/unfinished code/)).toBeNull();
  });

  it("Discard clears the draft and keeps the page fresh", async () => {
    const user = userEvent.setup();
    saveDraft(
      USER,
      createReducer(initialCreateState({ type: "text", folderId: null }), {
        type: "code",
        action: { type: "setName", name: "Old note" },
      }),
    );
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    expect(screen.queryByText(/unfinished code/)).toBeNull();
    expect(window.localStorage.getItem("quickqreate:draft:v2:user-1")).toBeNull();
    expect(screen.getByLabelText("Code name")).toHaveValue("");
  });

  it("offers Download without saving for static codes only", () => {
    const { unmount } = renderPage({ initialType: "text" });
    expect(preview().getByRole("button", { name: "Download without saving" })).toBeInTheDocument();
    unmount();
    renderPage({ initialType: "url" });
    expect(preview().queryByRole("button", { name: "Download without saving" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/create/CreatePage.test.tsx`
Expected: FAIL. `./CreatePage` can't be resolved.

- [ ] **Step 3: Create `features/create/DraftBanner.tsx`.**

```tsx
"use client";

import { History } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { relativePhrase } from "@/features/dashboard/format";

/** "You have an unfinished code from 2 hours ago." with Resume and Discard. */
export function DraftBanner({
  savedAt,
  onResume,
  onDiscard,
}: {
  savedAt: string;
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Unfinished code"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-center gap-2 text-sm text-fg">
        <History aria-hidden className="size-4 shrink-0 text-fg-muted" />
        You have an unfinished code from {relativePhrase(savedAt)}.
      </p>
      <div className="flex gap-2">
        <Button onClick={onResume}>Resume</Button>
        <Button variant="ghost" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `features/create/PreviewColumn.tsx`.**

```tsx
"use client";

import { Download, Loader2, Plus } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useExport } from "@/features/generator/export/useExport";
import { PagePreview } from "@/features/generator/preview/PagePreview";
import { QrTile } from "@/features/generator/preview/QrTile";
import { ScanBadge, ScanIssues } from "@/features/generator/preview/ScanCheck";

import { typeLabel } from "./catalog";
import type { CodeDraft } from "./useCodeDraft";

export interface CreateControls {
  creating: boolean;
  onCreate: () => void;
}

/** The live code (or page), its scan check and the one Create button. */
export function PreviewColumn({ draft, creating, onCreate }: { draft: CodeDraft } & CreateControls) {
  const { state, renderOptions, summary, info, report, blocker, pageType, trackable, previewSlug } =
    draft;
  const [view, setView] = useState<"code" | "page">("code");
  const reasonId = useId();
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
          onChange={setView}
          options={[
            { value: "code", label: "QR code" },
            { value: "page", label: "Page" },
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
      <div className="flex flex-col gap-2">
        <Button
          onClick={onCreate}
          disabled={blocker !== null || creating}
          aria-describedby={blocker ? reasonId : undefined}
          className="w-full"
        >
          {creating ? <Loader2 aria-hidden className="animate-spin" /> : <Plus aria-hidden />}
          {creating ? "Creating…" : "Create code"}
        </Button>
        {blocker && (
          <p id={reasonId} className="text-center text-sm text-fg-muted">
            {blocker}
          </p>
        )}
        {!trackable && (
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
    </div>
  );
}
```

- [ ] **Step 5: Create `features/create/CreateMobileBar.tsx`.**

The app's phone tab bar is fixed at the bottom below 640px (`sm:hidden`, `min-h-14` plus a 1px border). This bar sits just above it there, and at the bottom from 640px until the preview column appears at 768px.

```tsx
"use client";

import { ChevronUp, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { QrTile } from "@/features/generator/preview/QrTile";

import { PreviewColumn, type CreateControls } from "./PreviewColumn";
import type { CodeDraft } from "./useCodeDraft";

/** Phones: a small live preview above the bottom tabs; tap it for the full preview. */
export function CreateMobileBar({ draft, creating, onCreate }: { draft: CodeDraft } & CreateControls) {
  const [open, setOpen] = useState(false);
  const { renderOptions, summary, info, blocker } = draft;
  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-20 border-t border-border bg-surface/95 shadow-pop backdrop-blur-md sm:bottom-0 sm:pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-control text-left focus-ring"
          >
            <QrTile
              compact
              options={renderOptions}
              summary={summary}
              emptyHint={info.emptyHint}
              resolution={192}
              className="size-12 shrink-0"
            />
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1 text-sm font-semibold text-fg">
                Preview <ChevronUp aria-hidden className="size-4 text-fg-muted" />
              </span>
              <span className="truncate text-[13px] text-fg-muted">{blocker ?? summary}</span>
            </span>
          </button>
          <Button onClick={onCreate} disabled={blocker !== null || creating} className="px-4">
            {creating ? <Loader2 aria-hidden className="animate-spin" /> : <Plus aria-hidden />}
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Preview">
        <div className="pt-2">
          <PreviewColumn draft={draft} creating={creating} onCreate={onCreate} />
        </div>
      </Sheet>
    </>
  );
}
```

- [ ] **Step 6: Create `features/create/CreatePage.tsx`.**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { withWorkspace } from "@/components/app/nav";
import { Card, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { createCodeWithSettings } from "@/features/codes/api";
import type { ContentEditor } from "@/features/generator/content/types";
import type { CodeTypeId } from "@/lib/qr/types";
import type { FolderRow } from "@/types/supabase";

import { CreateMobileBar } from "./CreateMobileBar";
import { DraftBanner } from "./DraftBanner";
import { PreviewColumn } from "./PreviewColumn";
import { ContentSection } from "./sections/ContentSection";
import { DesignSection } from "./sections/DesignSection";
import { NameFolderSection } from "./sections/NameFolderSection";
import { SettingsSection } from "./sections/SettingsSection";
import { TypeSection } from "./sections/TypeSection";
import type { CreateState } from "./state";
import { toNewCode } from "./submit";
import { useCodeDraft } from "./useCodeDraft";
import { useDraftStorage } from "./useDraftStorage";

export interface CreatePageProps {
  userId: string;
  /** The team workspace to create in (its owner's id); null for your own codes. */
  teamId: string | null;
  /** The team owner's name for the header; null for your own codes. */
  workspaceLabel: string | null;
  folders: FolderRow[];
  initialType: CodeTypeId;
  initialFolderId: string | null;
}

/** One page: sections on the left in any order, the live preview and Create on the right. */
export function CreatePage({
  userId,
  teamId,
  workspaceLabel,
  folders,
  initialType,
  initialFolderId,
}: CreatePageProps) {
  const router = useRouter();
  const toast = useToast();
  const defaults = useMemo(
    () => ({ type: initialType, folderId: initialFolderId }),
    [initialType, initialFolderId],
  );
  const draft = useCodeDraft(defaults);
  const { state, dispatch, codeAction } = draft;
  const restore = useCallback(
    (saved: CreateState) =>
      dispatch({
        type: "restore",
        state: {
          ...saved,
          // A folder that's gone (or in another workspace) falls back to this page's folder.
          folderId: folders.some((folder) => folder.id === saved.folderId)
            ? saved.folderId
            : defaults.folderId,
        },
      }),
    [dispatch, folders, defaults.folderId],
  );
  const drafts = useDraftStorage({ userId, state, defaults, onRestore: restore });
  const [creating, setCreating] = useState(false);
  /** Set the moment Create is pressed, so a second press can't start another save. */
  const inFlight = useRef(false);

  const editor: ContentEditor = {
    state: state.code,
    setField: draft.setField,
    setPage: draft.setPage,
    pageErrors: draft.pageErrors,
    workspace: teamId ? { ownerId: teamId } : null,
  };

  async function create() {
    if (inFlight.current || draft.blocker) return;
    inFlight.current = true;
    setCreating(true);
    const name = state.code.name.trim() || draft.defaultName;
    const { input, settings } = toNewCode(state, teamId, name);
    const result = await createCodeWithSettings(input, settings);
    if (!result.ok) {
      inFlight.current = false;
      setCreating(false);
      toast(result.error, "error");
      return;
    }
    drafts.finished();
    toast("Code created");
    router.push(`${withWorkspace(`/codes/${result.value.id}`, teamId)}#download`);
  }

  const controls = { creating, onCreate: () => void create() };

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-0">
      <PageHeader
        title="Create a code"
        description={
          workspaceLabel
            ? `Saving to ${workspaceLabel}’s codes`
            : "Fill in the sections in any order. The preview updates as you go."
        }
      />
      {drafts.offer && (
        <DraftBanner
          savedAt={drafts.offer.savedAt}
          onResume={drafts.resume}
          onDiscard={drafts.discard}
        />
      )}
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18.5rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <TypeSection
            value={state.code.activeType}
            onChange={(activeType) => codeAction({ type: "setActiveType", activeType })}
          />
          <ContentSection
            editor={editor}
            onTypeChange={(activeType) => codeAction({ type: "setActiveType", activeType })}
          />
          <DesignSection
            design={state.code.design}
            dispatch={codeAction}
            onResetToStyle={() => dispatch({ type: "resetToStyle" })}
          />
          <SettingsSection
            type={state.code.activeType}
            settings={state.settings}
            onChange={(patch) => dispatch({ type: "settings", patch })}
          />
          <NameFolderSection
            name={state.code.name}
            placeholder={draft.defaultName}
            onName={(name) => codeAction({ type: "setName", name })}
            folderId={state.folderId}
            folders={folders}
            onFolder={(folderId) => dispatch({ type: "setFolder", folderId })}
          />
        </div>
        <aside aria-labelledby="preview-heading" className="hidden md:sticky md:top-6 md:block">
          <Card>
            <CardHeader id="preview-heading" title="Preview" />
            <div className="px-5 pt-4 pb-6">
              <PreviewColumn draft={draft} {...controls} />
            </div>
          </Card>
        </aside>
      </div>
      <CreateMobileBar draft={draft} {...controls} />
    </div>
  );
}
```

- [ ] **Step 7: Create the route `app/(app)/codes/new/page.tsx`.**

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { withWorkspace } from "@/components/app/nav";
import { CreatePage } from "@/features/create/CreatePage";
import { workspaceLabel } from "@/features/teams/roles";
import { requireUser } from "@/lib/auth/server";
import { isPageType, isStaticType, type CodeTypeId } from "@/lib/qr/types";

export const metadata: Metadata = { title: "Create a code · QuickQReate" };

const isCodeType = (value: string): value is CodeTypeId => isStaticType(value) || isPageType(value);

export default async function NewCodePage({ searchParams }: PageProps<"/codes/new">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const typeParam = typeof params.type === "string" ? params.type : null;
  const { supabase, user } = await requireUser(withWorkspace("/codes/new", requested));

  const { data: workspaces } = await supabase.rpc("my_workspaces");
  const membership = requested
    ? (workspaces?.find((workspace) => workspace.owner_id === requested) ?? null)
    : null;
  // Viewers can't add codes; send them to the codes they can see.
  if (membership && membership.role !== "editor") {
    redirect(withWorkspace("/codes", membership.owner_id));
  }
  const ownerId = membership?.owner_id ?? user.id;
  const teamId = membership?.owner_id ?? null;

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", ownerId)
    .order("name");
  // Only a folder of this workspace counts; anything else starts outside any folder.
  const folder = (folders ?? []).find((f) => f.id === folderParam) ?? null;
  const initialType = typeParam && isCodeType(typeParam) ? typeParam : "url";

  return (
    <CreatePage
      // A new address (type, folder or team) is a new visit: start from fresh defaults.
      key={`${ownerId}:${folder?.id ?? ""}:${initialType}`}
      userId={user.id}
      teamId={teamId}
      workspaceLabel={membership ? workspaceLabel(membership) : null}
      folders={folders ?? []}
      initialType={initialType}
      initialFolderId={folder?.id ?? null}
    />
  );
}
```

- [ ] **Step 8: Mark the code page's Download card.** In `features/dashboard/CodeEditor.tsx`, the aside holds the Download card:

```tsx
        <aside className="md:sticky md:top-20 lg:top-24">
          <Card>
            <CardHeader title="Download" />
```

Change `<Card>` there to `<Card id="download" className="scroll-mt-6">`, so `/codes/<id>#download` lands on it.

- [ ] **Step 9: Run them to see them pass.**

Run: `npx vitest run features/create && npm run lint && npm run typecheck && npm run build`
Expected:
- all `features/create` tests pass (8 in `CreatePage.test.tsx`)
- lint and typecheck exit 0
- the build lists `/codes/new` as a dynamic route.

- [ ] **Step 10: Commit.**

```bash
git add features/create "app/(app)/codes/new" features/dashboard/CodeEditor.tsx
git commit -m "Add the Create page at /codes/new"
```

### Task 8: Every signed-in "Create" goes to `/codes/new`

**Files:**
- Modify: `components/app/nav.ts`, `components/app/nav.test.ts`
- Modify: `components/app/CreateButton.tsx`, `components/app/AppShell.tsx`, `components/app/AppShell.test.tsx`
- Modify: `app/(app)/codes/page.tsx`
- Modify: `features/codes/list/CodesView.tsx`, `features/codes/list/CodesView.test.tsx`

**Interfaces:**
- Consumes: `withWorkspace`.
- Produces: `export function newCodeHref(options: { type?: string; folderId?: string | null; ownerId: string | null }): string`.

- [ ] **Step 1: Write the failing tests.**

In `components/app/nav.test.ts`, add `newCodeHref` to the import from `./nav`, then append:

```ts
describe("newCodeHref", () => {
  it("opens the Create page with a type, a folder and the team when given", () => {
    expect(newCodeHref({ ownerId: null })).toBe("/codes/new");
    expect(newCodeHref({ type: "wifi", ownerId: null })).toBe("/codes/new?type=wifi");
    expect(newCodeHref({ folderId: "f1", ownerId: "t1" })).toBe(
      "/codes/new?folder=f1&workspace=t1",
    );
    expect(newCodeHref({ type: "links", folderId: "f1", ownerId: null })).toBe(
      "/codes/new?type=links&folder=f1",
    );
  });
});
```

In `components/app/AppShell.test.tsx`, change the Create expectation:

```ts
    expect(new Set(hrefs(/^Create( code)?$/))).toEqual(new Set(["/codes/new?workspace=t1"]));
```

In `features/codes/list/CodesView.test.tsx`:
- In "welcomes a first-time user with quick starts", change the expected href to `"/codes/new?type=wifi"`.
- At the end of "says when a folder is empty", add:

```ts
    expect(screen.getByRole("link", { name: "Create a code here" })).toHaveAttribute(
      "href",
      "/codes/new?folder=f1",
    );
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run components/app features/codes/list`
Expected: FAIL. `newCodeHref is not a function` (or not exported). The shell still links `/?workspace=t1`, the quick start still links `/?type=wifi`, and there is no "Create a code here" link.

- [ ] **Step 3: Add the helper.** In `components/app/nav.ts`, after `withWorkspace`:

```ts
/** The Create page, optionally for a type and inside a folder, in the given team's codes. */
export function newCodeHref({
  type,
  folderId,
  ownerId,
}: {
  type?: string;
  folderId?: string | null;
  ownerId: string | null;
}): string {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (folderId) params.set("folder", folderId);
  const query = params.toString();
  return withWorkspace(query ? `/codes/new?${query}` : "/codes/new", ownerId);
}
```

- [ ] **Step 4: Point the entry points at it.**
- `components/app/CreateButton.tsx`: change the main link's `href={withWorkspace("/", ownerId)}` to `href={newCodeHref({ ownerId })}`. Import `newCodeHref` from `./nav`. Keep `withWorkspace`; the bulk link still uses it.
- `components/app/AppShell.tsx`: change the phone Create tab's `href={withWorkspace("/", ownerId)}` to `href={newCodeHref({ ownerId })}`, and import `newCodeHref`.
- `app/(app)/codes/page.tsx`: change the header's Create link `href={withWorkspace("/", teamId)}` to `href={newCodeHref({ folderId: folder?.id, ownerId: teamId })}`. Import `newCodeHref` from `@/components/app/nav`.
- `features/codes/list/CodesView.tsx`, which needs to import `newCodeHref`:
  - The quick starts change from `href={withWorkspace(`/?type=${type}`, teamId)}` to `href={newCodeHref({ type, ownerId: teamId })}`.
  - "Other types" changes from `href={withWorkspace("/", teamId)}` to `href={newCodeHref({ ownerId: teamId })}`.
  - The empty-folder state becomes:

```tsx
        <p className="max-w-md text-sm text-fg-muted">
          {canEdit
            ? "Create a code here, or use “Move to folder” on any code to add it."
            : "Codes added to this folder will show up here."}
        </p>
        {canEdit && (
          <Link
            href={newCodeHref({ folderId: folder.id, ownerId: teamId })}
            className={buttonClasses("outline", "md")}
          >
            <Plus aria-hidden /> Create a code here
          </Link>
        )}
```

After the edits, remove any import of `withWorkspace` that is now unused (lint will say).

- [ ] **Step 5: Run them to see them pass.**

Run: `npx vitest run && npm run lint && npm run typecheck`
Expected: the whole unit suite passes; lint and typecheck exit 0.

- [ ] **Step 6: Commit.**

```bash
git add components/app "app/(app)/codes/page.tsx" features/codes/list
git commit -m "Open the Create page from every Create button"
```

### Task 9: Signed-in browser tests for creating

**Files:**
- Modify: `e2e/accounts/fixtures.ts`, `e2e/accounts/global-setup.ts`
- Create: `e2e/accounts/create.spec.ts`
- Modify: `e2e/accounts/app.spec.ts` (add `codes/new` to `PAGES`)

**Interfaces:**
- Consumes: the Create page labels (Tasks 6–7); the codes list (`listitem` named by code name, status pill text); the code page (`h1` code name, "Password protected").
- Produces: a third test account, `MAKER`, whose codes the other tests never count. `Seed` gains `makerId` and `makerFolderId`; the folder is called "Posters".

- [ ] **Step 1: Add the Maker account.** In `e2e/accounts/fixtures.ts`, after `VIEWER`:

```ts
/** Creates codes in the Create tests, so the owner's seeded list stays as the other tests expect. */
export const MAKER = {
  email: "maker@example.com",
  password: "maker-e2e-pass-2026",
  name: "Max Maker",
  state: `${AUTH_DIR}/maker.json`,
};
```

Add to `Seed`:

```ts
  /** The Maker account, and its empty "Posters" folder. */
  makerId: string;
  makerFolderId: string;
```

In `e2e/accounts/global-setup.ts`:
- Import `MAKER`.
- Make both `[OWNER, VIEWER]` loops (deleting old users and signing in) run over `[OWNER, VIEWER, MAKER]`.
- After `const viewerId = await create(VIEWER);` add `const makerId = await create(MAKER);`.
- Before `const seeded: Seed`, add:

```ts
  const { data: posters, error: postersError } = await admin
    .from("folders")
    .insert({ user_id: makerId, name: "Posters" })
    .select("id")
    .single();
  if (postersError || !posters) throw postersError ?? new Error("Couldn't create the folder");
```

and extend `seeded` with `makerId, makerFolderId: posters.id`.

- [ ] **Step 2: Write the tests.** Create `e2e/accounts/create.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

import { MAKER, seed } from "./fixtures";

/** A datetime-local value at 09:00, some days from now, in the browser's time zone. */
function localDateTime(daysFromNow: number) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
}

const createButton = (page: Page) =>
  page.getByRole("complementary", { name: "Preview" }).getByRole("button", { name: "Create code" });

const draftKey = () => `quickqreate:draft:v2:${seed().makerId}`;
const storedDraft = (page: Page) =>
  page.evaluate((key) => window.localStorage.getItem(key), draftKey());

test.describe("creating codes", () => {
  test.use({ storageState: MAKER.state });

  test("creates a trackable, password-protected, scheduled code in one pass", async ({ page }) => {
    await page.goto("codes/new");
    await page.getByLabel("Website address").fill("https://example.com/launch");
    await page.getByLabel(/Code password/).fill("launch-2026");
    await page.getByLabel("Starts").fill(localDateTime(1));
    await page.getByLabel("Ends").fill(localDateTime(30));
    await page.getByLabel("Code name").fill("Launch poster");
    await createButton(page).click();

    await expect(page).toHaveURL(/\/codes\/[0-9a-f-]+#download$/);
    await expect(page.getByRole("heading", { level: 1, name: "Launch poster" })).toBeVisible();
    await expect(page.getByText("Password protected")).toBeVisible();
    await page.goto("codes");
    const row = page.getByRole("listitem", { name: "Launch poster" });
    await expect(row.getByText("Scheduled").filter({ visible: true }).first()).toBeVisible();
  });

  test("starts clean, and an unfinished code comes back only on Resume", async ({ page }) => {
    await page.goto("codes/new");
    await page.getByLabel("Website address").fill("https://example.com/draft");
    await page.getByLabel(/Code password/).fill("draft-secret");
    await page.getByLabel("Code name").fill("Draft poster");
    // Drafts are saved half a second after the last change, without the password.
    await expect.poll(() => storedDraft(page)).toContain("example.com/draft");
    expect(await storedDraft(page)).not.toContain("draft-secret");

    await page.goto("codes");
    await page.goto("codes/new");
    await expect(page.getByText(/You have an unfinished code from/)).toBeVisible();
    await expect(page.getByLabel("Website address")).toHaveValue("");
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByLabel("Website address")).toHaveValue("https://example.com/draft");
    await expect(page.getByLabel("Code name")).toHaveValue("Draft poster");
    await expect(page.getByLabel(/Code password/)).toHaveValue("");

    await page.reload();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect.poll(() => storedDraft(page)).toBeNull();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/You have an unfinished code/)).toHaveCount(0);
  });

  test("a code started from a folder is created in that folder", async ({ page }) => {
    const { makerFolderId } = seed();
    await page.goto(`codes?folder=${makerFolderId}`);
    await page.getByRole("main").getByRole("link", { name: "Create code" }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/new\\?folder=${makerFolderId}$`));
    await expect(page.getByLabel("Folder", { exact: true })).toHaveValue(makerFolderId);
    await page.getByRole("radio", { name: /Show a short note/ }).click();
    await page.getByLabel("Text", { exact: true }).fill("Doors open at 6");
    await page.getByLabel("Code name").fill("Door note");
    await createButton(page).click();

    await expect(page).toHaveURL(/#download$/);
    await page.goto(`codes?folder=${makerFolderId}`);
    await expect(page.getByRole("listitem", { name: "Door note" })).toBeVisible();
  });
});
```

- [ ] **Step 3: Add the Create page to the responsive and axe sweep.** In `e2e/accounts/app.spec.ts`, add `"codes/new",` to `PAGES` after `"codes?folder={folder}",`.

- [ ] **Step 4: Run the signed-in suite.** The local Supabase must be running (`npm run db:start`). If it was started before Task 1's migration existed, apply that migration with `npx --yes supabase@2.120.0 migration up --local`.

Run: `npm run test:e2e:accounts`
Expected:
- all tests pass, including the 3 new `create.spec.ts` tests and 3 new `codes/new` sweep tests (390, 820 and 1280px).
- If axe flags `/codes/new`, fix the markup (not the test) and rerun.
- If a create test fails on a label, check the label against Task 6's list.

- [ ] **Step 5: Commit.**

```bash
git add e2e/accounts
git commit -m "Check creating, drafts and folders signed in"
```

### Task 10: Ship Phase 2a

**Files:** none new.

- [ ] **Step 1: Run the full local check.**

Run: `npx prettier --check . --ignore-path .gitignore --ignore-path .prettierignore --ignore-path .git/info/exclude && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e && npm run test:e2e:accounts -- --no-build`
Expected: all PASS.

- [ ] **Step 2: Push and open the PR.**

```bash
git push -u origin feat/create-page
gh pr create --base main --head feat/create-page --title "Create page with settings and drafts" --body "$(cat <<'EOF'
Phase 2a of the redesign (spec §4.2, §4.7, §6.1; plan docs/superpowers/plans/2026-10-14-phase-2a-create-page.md).

- `/codes/new`: one page with five sections (type, content, design, settings, name & folder), a live preview and a single Create code button that says why it's disabled. Phones get a preview bar above the tabs.
- Settings at creation: Trackable (on by default for links), password, start and end dates, custom short link, campaign tags. Static codes show why they're off.
- Fresh every visit; unfinished work is kept as a draft (never the password) and comes back only on Resume.
- Create in a folder: the folder header, empty folders and quick starts open the page in that folder.
- Migration (applied live before merge): `create_code` saves a code and its password in one step, all or nothing.
- Every signed-in Create button now opens `/codes/new`. `/codes/bulk` and the hosted-page editor split follow in 2b.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Run the final whole-branch review before merging.** Follow the "Final Review" section of superpowers:executing-plans, with this plan's Review Focus and the ledger's rulings. Do one fix pass if needed. Both CI jobs must pass.

- [ ] **Step 4: Confirm a recent verified backup, then apply the migration through the private SQL bridge.** Do this exactly as in Phase 1c:
1. Read `/var/lib/techitdave-offserver/health.json` on the host through the strict SSH wrapper.
   Expected: a verified archive from the last 24 hours that includes quickqreate.
2. Run `grep -c '\\' supabase/migrations/20261014160000_create_code.sql`.
   Expected: `0`.
3. Run `python3 tsb.py execute_sql db12f7ce-3e77-4461-a686-c8cd6de6f764 supabase/migrations/20261014160000_create_code.sql`.

Verify with:

```sql
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_code') as create_fn,
  has_function_privilege('anon', 'public.create_code(jsonb,text)', 'execute') as anon_can_call,
  has_function_privilege('authenticated', 'public.create_code(jsonb,text)', 'execute') as users_can_call,
  (select prosecdef from pg_proc where oid = 'public.create_code(jsonb,text)'::regprocedure) as definer;
```

Expected: `create_fn` is 1, `anon_can_call` is `f`, `users_can_call` is `t`, and `definer` is `f`. Append the migration to the runbook under "QuickQReate Phase 2a migration".

- [ ] **Step 5: Merge and check the live site.**
  1. Run `gh pr merge --merge --delete-branch`.
  2. Wait until the new release is serving. `/api/health` has no version, so poll for a file this release changed. If a page shows "This page couldn't load" during the switch, reload once.
  3. Check:
     - `/api/health` is OK.
     - In David's Chrome, the sidebar's Create code opens `/codes/new`.
     - The page shows the eight type tiles, the five sections and the preview.
     - Create code is disabled with "Add a link to start".
     - Picking Wi-Fi turns the settings off with the reason.
  4. Don't create a code in David's account. A real create is left for David to try, and the final message says so.

