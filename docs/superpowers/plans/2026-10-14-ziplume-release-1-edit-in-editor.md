# Ziplume Release 1: Edit Saved Codes in the Create Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editing a saved code opens the same Create editor, inside the app with the sidebar, at
`/codes/<id>/edit`, and saves everything in one step. The code page becomes an overview with an
**Edit code** button.

**Architecture:** The Create page's layout moves into a shared `EditorLayout`, which runs in two
modes:
- `CreatePage` keeps drafts and creating.
- A new `EditCodePage` loads a saved code with `fromSavedCode`, works out what changed with
  `toCodePatch`, and saves through a new security-invoker database function `update_code`, which
  updates the fields and the password in one transaction.

The old home-page edit mode goes away: `/?edit=<id>` forwards to the new route.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Headless UI, Supabase (plpgsql, RLS),
Vitest + Testing Library, PGlite migration tests, Playwright (public and signed-in suites).

**Spec:** `docs/superpowers/specs/2026-10-14-ziplume-rebrand-design.md`, section 3 (Release 1).
Read sections 1–3 before starting.

## Global Constraints

- **Brand name:** still "QuickQReate" in this release. Page titles keep the `· QuickQReate` suffix;
  Release 2 renames everything.
- **Migrations:**
  - the new file is `supabase/migrations/20261014180000_update_code.sql`
  - no backslashes anywhere in it
  - applied live only after a verified backup and before merging
  - recorded in the runbook `~/.codex/memories/supabase-coolify.md`
- **Live database:** always use the exact Supabase project UUID
  `db12f7ce-3e77-4461-a686-c8cd6de6f764` with the SQL bridge, and leave the Supabase Multitenant
  resource untouched.
- **Secrets:** never written into code, docs, commits or messages. David enters secrets.
- **David's account:** live checks don't create or delete data there.
- **Copy rules:** verbs start buttons, sentence case, curly apostrophes in new UI copy. Use the
  wording glossary (Trackable, Short link, Team).
- **Touch targets:** at least 44 px on phones. New buttons use `size="md"` (`h-11`).
- **Commits** end with:
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
- **Test commands:**
  - unit: `npm test -- <path>`
  - all unit: `npm test`
  - `npm run typecheck` and `npm run lint`
  - public browser: `npm run build && npm run test:e2e`
  - signed-in browser: `npm run test:e2e:accounts`, which builds its own app and starts local
    Supabase; it needs Docker running

## Review Focus

These are the input classes and failure modes most likely to bite, each pinned by a test in the
task named:

1. **Dates and time zones:** opening a code and saving an unrelated change must not shift its
   start or end dates. Only changed dates are sent (Task 3, "unchanged dates are never sent").
2. **Query strings:** a trackable link whose saved address has other query parameters plus
   campaign tags keeps those parameters, and isn't rewritten when only the name changes (Task 3,
   "keeps other query parameters").
3. **Teammate's hosted page:** files uploaded while editing it go to the owner's space (Task 5,
   "hands the code owner's space to the content editor").
4. **Double Save:** pressing Save twice quickly sends one request (Task 7, "a second press while
   saving sends nothing").
5. **Leaving after a save:** leaving the editor after a successful save never asks "Leave without
   saving?" (Task 6, "turns off once inactive"; Task 7, "saves only what changed, then goes to
   the code page without asking").

---

## File map

| File | Change | Responsibility |
| --- | --- | --- |
| `supabase/migrations/20261014180000_update_code.sql` | Create | `update_code` RPC |
| `supabase/test/migration.test.ts` | Modify (append) | `update_code` rules |
| `types/supabase.ts` | Modify | `update_code` type |
| `features/codes/api.ts` | Modify | `CodeUpdate`, `PasswordChange`, `updateCodeWithSettings` |
| `features/codes/api.test.ts` | Modify | its tests |
| `features/create/load.ts` (+ `.test.ts`) | Create | `fromSavedCode`, `isoToLocalInput`, `splitDestination`, `isEditableType` |
| `features/create/submit.ts` (+ test) | Modify | `toCodePatch`, `hasChanges`, `CodeChanges` |
| `features/create/state.ts` (+ test) | Modify | `settingsErrors(…, { requireSlug })` |
| `features/create/useCodeDraft.ts` (+ test) | Modify | `initial` and `requireSlug` options |
| `features/create/sections/TypeSection.tsx` | Modify | `locked` |
| `features/create/sections/ContentSection.tsx` | Modify | `typeLocked` |
| `features/create/sections/SettingsSection.tsx` | Rewrite | edit mode: `saved` prop |
| `features/create/sections/sections.test.tsx` | Modify | edit-mode tests |
| `features/create/PreviewColumn.tsx`, `CreateMobileBar.tsx` | Modify | `CreateControls` with `mode`, `submitting`, `onSubmit`, `dirty`, `onDiscard` |
| `features/create/EditorLayout.tsx` (+ test) | Create | the shared editor layout |
| `features/create/CreatePage.tsx` | Modify | uses `EditorLayout` |
| `lib/useInBrowser.ts` | Create | browser-only rendering flag |
| `features/create/useUnsavedChangesGuard.ts` (+ test) | Create | "Leave without saving?" |
| `features/create/EditCodePage.tsx` (+ test) | Create | Edit mode page |
| `app/(app)/codes/[id]/edit/page.tsx` | Create | route |
| `features/codes/duplicate.ts` (+ test) | Create | `copyToMyCodes` |
| `features/codes/list/CodesView.tsx` | Modify | uses `copyToMyCodes` |
| `features/codes/list/CodeActions.tsx` | Modify | **Edit** item |
| `features/dashboard/CodeEditor.tsx` → `CodeOverview.tsx` (+ test) | Rename + rewrite | overview |
| `features/dashboard/AccessCard.tsx` | Delete | |
| `app/(app)/codes/[id]/page.tsx` | Modify | renders `CodeOverview` |
| `lib/redirects.ts` (+ test) | Create | `editRedirect` |
| `proxy.ts` | Modify | `/?edit=` → 308 |
| `features/generator/useGenerator.ts` (+ test), `Generator.tsx`, `SavePanel.tsx` | Modify | edit mode removed |
| `features/generator/editTransition.ts` (+ test) | Delete | |
| `app/(app)/codes/[id]/analytics/page.tsx` | Modify | link to `/codes/new?type=url` |
| `e2e/accounts/edit.spec.ts` | Create | signed-in browser tests |
| `e2e/accounts/app.spec.ts`, `e2e/accounts/teams.spec.ts` | Modify | axe page and wording |
| `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md` | Modify | Phase 4 note |

---

### Task 1: The `update_code` database function

**Files:**
- Create: `supabase/migrations/20261014180000_update_code.sql`
- Modify: `types/supabase.ts` (Functions, after `create_code`)
- Test: `supabase/test/migration.test.ts` (append a `describe("update_code")` at the end)

**Interfaces:**
- Produces: the SQL function
  `public.update_code(p_id uuid, p_patch jsonb, p_password text default null, p_password_action text default 'keep') returns public.qr_codes`.
- Produces: the TypeScript type
  `update_code: { Args: { p_id: string; p_patch: Json; p_password?: string | null; p_password_action?: string }; Returns: QrCodeRow }`.

- [ ] **Step 1: Write the failing tests.** Append this block to the end of
  `supabase/test/migration.test.ts`. The helpers `as`, `asService`, `asAnon`, `db`, `BOB` and
  `beforeAll` already exist in the file.

```ts
describe("update_code", () => {
  const ZOE = "3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c3c"; // owner
  const YAN = "3d3d3d3d-3d3d-4d3d-8d3d-3d3d3d3d3d3d"; // editor on Zoe's team
  const XIA = "3e3e3e3e-3e3e-4e3e-8e3e-3e3e3e3e3e3e"; // viewer on Zoe's team
  const by =
    (userId: string, aal: "aal1" | "aal2" = "aal1") =>
    <T,>(sql: string, params?: unknown[]) =>
      as<T>("authenticated", userId, sql, params, aal);
  const UPDATE = "select * from public.update_code($1::uuid, $2::jsonb, $3, $4)";
  const ids = { menu: "", diary: "", note: "", zoeFolder: "", bobFolder: "" };
  const read = async (id: string) =>
    (await asService<Record<string, unknown>>("select * from public.qr_codes where id = $1", [id]))[0]!;
  const passwordOk = async (slug: string, password: string) =>
    (await asService<{ ok: boolean }>("select public.check_code_password($1, $2) as ok", [slug, password]))[0]!.ok;

  beforeAll(async () => {
    await db.query(
      `insert into auth.users (id, email) values
         ($1, 'zoe@example.com'), ($2, 'yan@example.com'), ($3, 'xia@example.com')`,
      [ZOE, YAN, XIA],
    );
    await asService(
      `insert into public.team_members (owner_id, member_id, role) values
         ($1, $2, 'editor'), ($1, $3, 'viewer')`,
      [ZOE, YAN, XIA],
    );
    const folder = async (owner: string, name: string) =>
      (await asService<{ id: string }>(
        "insert into public.folders (user_id, name) values ($1, $2) returning id",
        [owner, name],
      ))[0]!.id;
    ids.zoeFolder = await folder(ZOE, "Zoe folder");
    ids.bobFolder = await folder(BOB, "Bob folder");
    const code = async (values: string) =>
      (await asService<{ id: string }>(
        `insert into public.qr_codes
           (user_id, name, qr_type, content, design, is_dynamic, slug, destination, is_private)
         values ${values} returning id`,
        [ZOE],
      ))[0]!.id;
    ids.menu = await code(
      `($1, 'Menu', 'url', '{"url":"https://zoe.example"}', '{}', true, 'ZOE001', 'https://zoe.example', false)`,
    );
    ids.diary = await code(
      `($1, 'Diary', 'url', '{"url":"https://zoe.example/d"}', '{}', true, 'ZOE002', 'https://zoe.example/d', true)`,
    );
    ids.note = await code(`($1, 'Note', 'text', '{"text":"Hi"}', '{}', false, null, null, false)`);
  });

  it("saves only the fields it is given", async () => {
    const [row] = await by(ZOE)<{ name: string; destination: string; slug: string }>(UPDATE, [
      ids.menu,
      JSON.stringify({
        name: "Lunch menu",
        destination: "https://zoe.example/lunch",
        content: { url: "https://zoe.example/lunch" },
        active_until: "2030-02-01T09:00:00Z",
      }),
      null,
      "keep",
    ]);
    expect(row).toMatchObject({ name: "Lunch menu", destination: "https://zoe.example/lunch", slug: "ZOE001" });
    const saved = await read(ids.menu);
    expect(saved.content).toEqual({ url: "https://zoe.example/lunch" });
    expect(new Date(saved.active_until as string).toISOString()).toBe("2030-02-01T09:00:00.000Z");
    expect(saved.active_from).toBeNull();
  });

  it("lets a team editor change a shared code, and nobody else", async () => {
    const [row] = await by(YAN)<{ name: string }>(UPDATE, [ids.menu, '{"name":"Yan menu"}', null, "keep"]);
    expect(row?.name).toBe("Yan menu");
    await expect(by(XIA)(UPDATE, [ids.menu, '{"name":"Xia"}', null, "keep"])).rejects.toThrow(/Not allowed/);
    await expect(by(BOB)(UPDATE, [ids.menu, '{"name":"Bob"}', null, "keep"])).rejects.toThrow(/Not allowed/);
    await expect(asAnon(UPDATE, [ids.menu, '{"name":"Anon"}', null, "keep"])).rejects.toThrow(/permission denied/);
    expect((await read(ids.menu)).name).toBe("Yan menu");
  });

  it("keeps a private code to its owner", async () => {
    await expect(by(YAN)(UPDATE, [ids.diary, '{"name":"Peek"}', null, "keep"])).rejects.toThrow(/Not allowed/);
    const [row] = await by(ZOE)<{ name: string }>(UPDATE, [ids.diary, '{"name":"Dear diary"}', null, "keep"]);
    expect(row?.name).toBe("Dear diary");
  });

  it("refuses fields it doesn't allow and unknown password actions", async () => {
    await expect(by(ZOE)(UPDATE, [ids.menu, '{"is_dynamic":false}', null, "keep"])).rejects.toThrow(
      /Unknown field: is_dynamic/,
    );
    await expect(by(ZOE)(UPDATE, [ids.menu, JSON.stringify({ user_id: BOB }), null, "keep"])).rejects.toThrow(
      /Unknown field: user_id/,
    );
    await expect(by(ZOE)(UPDATE, [ids.menu, "{}", null, "maybe"])).rejects.toThrow(/Unknown password action/);
  });

  it("sets, keeps and clears the password with the other changes", async () => {
    await by(ZOE)(UPDATE, [ids.menu, '{"name":"Locked menu"}', "open sesame", "set"]);
    expect((await read(ids.menu)).has_password).toBe(true);
    expect(await passwordOk("zoe001", "open sesame")).toBe(true);
    await by(ZOE)(UPDATE, [ids.menu, '{"name":"Still locked"}', null, "keep"]);
    expect(await passwordOk("zoe001", "open sesame")).toBe(true);
    await by(ZOE)(UPDATE, [ids.menu, "{}", null, "clear"]);
    expect((await read(ids.menu)).has_password).toBe(false);
  });

  it("refuses a password on a static code", async () => {
    await expect(by(ZOE)(UPDATE, [ids.note, "{}", "secret", "set"])).rejects.toThrow(/Not allowed/);
    await expect(by(ZOE)(UPDATE, [ids.note, "{}", null, "clear"])).rejects.toThrow(/Not allowed/);
  });

  it("saves nothing when the password part fails", async () => {
    await expect(by(ZOE)(UPDATE, [ids.menu, '{"name":"Should not stick"}', "abc", "set"])).rejects.toThrow(/4 to 128/);
    await expect(by(ZOE)(UPDATE, [ids.menu, '{"name":"Should not stick"}', "", "set"])).rejects.toThrow(/4 to 128/);
    expect((await read(ids.menu)).name).toBe("Still locked");
  });

  it("refuses a taken link ending and a folder from another space", async () => {
    await expect(by(ZOE)(UPDATE, [ids.menu, '{"slug":"zoe002"}', null, "keep"])).rejects.toThrow(/duplicate key/);
    await expect(
      by(ZOE)(UPDATE, [ids.menu, JSON.stringify({ folder_id: ids.bobFolder }), null, "keep"]),
    ).rejects.toThrow(/qr_codes_folder_fkey/);
    await by(ZOE)(UPDATE, [ids.menu, JSON.stringify({ folder_id: ids.zoeFolder }), null, "keep"]);
    expect((await read(ids.menu)).folder_id).toBe(ids.zoeFolder);
    await by(ZOE)(UPDATE, [ids.menu, '{"folder_id":null}', null, "keep"]);
    expect((await read(ids.menu)).folder_id).toBeNull();
  });

  it("needs a two-step session for two-step accounts", async () => {
    await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [ZOE]);
    try {
      await expect(by(ZOE)(UPDATE, [ids.menu, '{"name":"aal1"}', null, "keep"])).rejects.toThrow(/Not allowed/);
      const [row] = await by(ZOE, "aal2")<{ name: string }>(UPDATE, [ids.menu, '{"name":"aal2"}', null, "keep"]);
      expect(row?.name).toBe("aal2");
    } finally {
      await db.query("delete from auth.mfa_factors where user_id = $1", [ZOE]);
    }
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- supabase/test/migration.test.ts -t update_code`
  Expected: FAIL. Every test errors with `function public.update_code(uuid, jsonb, unknown,
  unknown) does not exist`.

- [ ] **Step 3: Write the migration.** Create
  `supabase/migrations/20261014180000_update_code.sql`:

```sql
-- Save changes to a code in one step, for the editor at /codes/<id>/edit (Ziplume Release 1).
--
-- Runs as the caller (security invoker), so the usual rules for changing codes still apply: a
-- two-step session for two-step accounts, the owner or a teammate who can edit (never another
-- member's private code), and only the columns signed-in users may update. Fields missing from
-- p_patch stay as they are. A folder must belong to the code's owner (the composite foreign key
-- qr_codes_folder_fkey checks it). The password goes through set_code_password, which hashes it
-- and allows it on trackable codes only. It all runs in the caller's statement, so if any part
-- fails (a taken link ending, a folder from another space, a short password) nothing is saved.
create function public.update_code(
  p_id uuid,
  p_patch jsonb,
  p_password text default null,
  p_password_action text default 'keep'
)
returns public.qr_codes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_unknown text;
  v_row public.qr_codes;
begin
  select key into v_unknown
    from jsonb_object_keys(v_patch) as key
   where key not in (
     'name', 'content', 'design', 'destination', 'slug', 'folder_id', 'active_from', 'active_until'
   )
   limit 1;
  if v_unknown is not null then
    raise exception 'Unknown field: %', v_unknown using errcode = '22023';
  end if;
  if p_password_action is null or p_password_action not in ('keep', 'set', 'clear') then
    raise exception 'Unknown password action: %', p_password_action using errcode = '22023';
  end if;
  if p_password_action = 'set' and coalesce(p_password, '') = '' then
    raise exception 'Passwords are 4 to 128 characters' using errcode = '22023';
  end if;

  update public.qr_codes c
     set name = case when v_patch ? 'name' then v_patch ->> 'name' else c.name end,
         content = case when v_patch ? 'content' then v_patch -> 'content' else c.content end,
         design = case when v_patch ? 'design' then v_patch -> 'design' else c.design end,
         destination = case when v_patch ? 'destination'
           then nullif(v_patch ->> 'destination', '') else c.destination end,
         slug = case when v_patch ? 'slug' then nullif(v_patch ->> 'slug', '') else c.slug end,
         folder_id = case when v_patch ? 'folder_id'
           then nullif(v_patch ->> 'folder_id', '')::uuid else c.folder_id end,
         active_from = case when v_patch ? 'active_from'
           then nullif(v_patch ->> 'active_from', '')::timestamptz else c.active_from end,
         active_until = case when v_patch ? 'active_until'
           then nullif(v_patch ->> 'active_until', '')::timestamptz else c.active_until end
   where c.id = p_id
  returning * into v_row;

  -- Row-level security hides codes the caller may not change, so no row means not allowed.
  if not found then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if p_password_action = 'set' then
    perform public.set_code_password(p_id, p_password);
  elsif p_password_action = 'clear' then
    perform public.set_code_password(p_id, null);
  end if;
  if p_password_action <> 'keep' then
    select * into v_row from public.qr_codes where id = p_id;
  end if;
  return v_row;
end;
$$;

revoke all on function public.update_code(uuid, jsonb, text, text) from public, anon;
grant execute on function public.update_code(uuid, jsonb, text, text) to authenticated;
```

- [ ] **Step 4: Add the type.** In `types/supabase.ts`, right after the `create_code` entry,
  add:

```ts
      update_code: {
        Args: {
          p_id: string;
          p_patch: Json;
          p_password?: string | null;
          p_password_action?: string;
        };
        Returns: Database["public"]["Tables"]["qr_codes"]["Row"];
      };
```

- [ ] **Step 5: Run them and watch them pass.**
  Run: `npm test -- supabase/test/migration.test.ts`
  Expected: PASS, the whole file including the 9 new `update_code` tests. Then run
  `grep -c '\\' supabase/migrations/20261014180000_update_code.sql`.
  Expected: `0`.

- [ ] **Step 6: Commit.**

```bash
git add supabase/migrations/20261014180000_update_code.sql supabase/test/migration.test.ts types/supabase.ts
git commit -m "Save a code's changes and password in one step with update_code

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `updateCodeWithSettings` in the codes API

**Files:**
- Modify: `features/codes/api.ts`. Add after `setCodePassword`.
- Test: `features/codes/api.test.ts`

**Interfaces:**
- Consumes: the `update_code` RPC type (Task 1).
- Produces:

```ts
export interface CodeUpdate {
  name?: string;
  content?: unknown;
  design?: DesignState;
  destination?: string | null;
  slug?: string;
  folderId?: string | null;
  activeFrom?: string | null;
  activeUntil?: string | null;
}
export type PasswordChange =
  | { action: "keep" }
  | { action: "set"; password: string }
  | { action: "clear" };
export async function updateCodeWithSettings(
  id: string,
  changes: CodeUpdate,
  password?: PasswordChange, // default { action: "keep" }
): Promise<Result<QrCodeRow>>;
```

- [ ] **Step 1: Write the failing tests.** In `features/codes/api.test.ts`, add
  `updateCodeWithSettings` to the import from `./api`, then append:

```ts
describe("updateCodeWithSettings", () => {
  it("sends only the changed fields, by column name, with the password action", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    const result = await updateCodeWithSettings("c1", {
      name: "Lunch menu",
      destination: "https://example.com/lunch",
      content: { url: "https://example.com/lunch" },
      folderId: null,
      activeFrom: "2030-01-01T09:00:00.000Z",
    });
    expect(result).toEqual({ ok: true, value: row });
    expect(rpc).toHaveBeenCalledWith("update_code", {
      p_id: "c1",
      p_patch: {
        name: "Lunch menu",
        destination: "https://example.com/lunch",
        content: { url: "https://example.com/lunch" },
        folder_id: null,
        active_from: "2030-01-01T09:00:00.000Z",
      },
      p_password: null,
      p_password_action: "keep",
    });
  });

  it("sends a new password, or asks to clear it", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    await updateCodeWithSettings("c1", {}, { action: "set", password: "open sesame" });
    expect(rpc).toHaveBeenLastCalledWith("update_code", {
      p_id: "c1",
      p_patch: {},
      p_password: "open sesame",
      p_password_action: "set",
    });
    await updateCodeWithSettings("c1", {}, { action: "clear" });
    expect(rpc).toHaveBeenLastCalledWith("update_code", {
      p_id: "c1",
      p_patch: {},
      p_password: null,
      p_password_action: "clear",
    });
  });

  it("explains what went wrong", async () => {
    const failWith = async (code: string, message = "") => {
      rpc.mockResolvedValueOnce({ data: null, error: { code, message } });
      const result = await updateCodeWithSettings("c1", { name: "x" });
      return result.ok ? null : result.error;
    };
    expect(await failWith("23505")).toBe("That link ending is already taken. Try another.");
    expect(await failWith("23503")).toBe("That folder isn't in this code's space.");
    expect(await failWith("22023", "Passwords are 4 to 128 characters")).toBe(
      "Passwords are 4 to 128 characters.",
    );
    expect(await failWith("23514", 'violates check constraint "qr_codes_active_window"')).toBe(
      "The end date must be after the start date.",
    );
    expect(await failWith("42501", "Not allowed")).toBe("You can't change this code.");
    expect(await failWith("XX000", "boom")).toBe("Your changes couldn't be saved. Please try again.");
  });

  it("refuses a malformed link ending before asking the server", async () => {
    const result = await updateCodeWithSettings("c1", { slug: "no spaces" });
    expect(result).toEqual({ ok: false, error: "Link endings use 3–40 letters, numbers or dashes." });
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- features/codes/api.test.ts`
  Expected: FAIL with `updateCodeWithSettings is not a function` (or "has no exported member").

- [ ] **Step 3: Implement.** In `features/codes/api.ts`, add this after `setCodePassword`:

```ts
/** What the editor changed on a saved code; fields left out stay as they are. */
export interface CodeUpdate {
  name?: string;
  content?: unknown;
  design?: DesignState;
  destination?: string | null;
  slug?: string;
  folderId?: string | null;
  activeFrom?: string | null;
  activeUntil?: string | null;
}

/** What happens to a trackable code's password when the editor saves. */
export type PasswordChange =
  | { action: "keep" }
  | { action: "set"; password: string }
  | { action: "clear" };

function updateError(error: { code?: string; message: string }): string {
  if (error.code === UNIQUE_VIOLATION) return "That link ending is already taken. Try another.";
  if (error.message.includes("qr_codes_active_window"))
    return "The end date must be after the start date.";
  if (error.code === "23503") return "That folder isn't in this code's space.";
  if (error.code === "22023" && error.message.includes("4 to 128"))
    return "Passwords are 4 to 128 characters.";
  if (error.code === "42501") return "You can't change this code.";
  return "Your changes couldn't be saved. Please try again.";
}

/**
 * Saves the editor's changes and the password in one step (update_code), so a failure saves
 * nothing. Only the fields in `changes` are sent; the rest of the code stays as it is.
 */
export async function updateCodeWithSettings(
  id: string,
  changes: CodeUpdate,
  password: PasswordChange = { action: "keep" },
): Promise<Result<QrCodeRow>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  if (changes.slug !== undefined && !isValidSlug(changes.slug)) {
    return { ok: false, error: "Link endings use 3–40 letters, numbers or dashes." };
  }
  const patch: Record<string, Json> = {
    ...(changes.name !== undefined && { name: changes.name.slice(0, 120) }),
    ...(changes.content !== undefined && { content: changes.content as Json }),
    ...(changes.design !== undefined && { design: designForStorage(changes.design).design }),
    ...(changes.destination !== undefined && { destination: changes.destination }),
    ...(changes.slug !== undefined && { slug: changes.slug }),
    ...(changes.folderId !== undefined && { folder_id: changes.folderId }),
    ...(changes.activeFrom !== undefined && { active_from: changes.activeFrom }),
    ...(changes.activeUntil !== undefined && { active_until: changes.activeUntil }),
  };
  const { data, error } = await supabase.rpc("update_code", {
    p_id: id,
    p_patch: patch,
    p_password: password.action === "set" ? password.password : null,
    p_password_action: password.action,
  });
  if (error || !data) {
    return {
      ok: false,
      error: error ? updateError(error) : "Your changes couldn't be saved. Please try again.",
    };
  }
  return { ok: true, value: data };
}
```

- [ ] **Step 4: Run them and watch them pass.**
  Run: `npm test -- features/codes/api.test.ts && npm run typecheck`
  Expected: PASS; typecheck exits 0.

- [ ] **Step 5: Commit.**

```bash
git add features/codes/api.ts features/codes/api.test.ts
git commit -m "Add updateCodeWithSettings for saving the editor's changes

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Loading a saved code, and working out what changed

**Files:**
- Create: `features/create/load.ts`, `features/create/load.test.ts`
- Create: `features/create/fixtures.ts` (test fixture: a saved code row)
- Modify: `features/create/submit.ts`, `features/create/submit.test.ts`

**Interfaces:**
- Consumes: `CodeUpdate`, `PasswordChange` (Task 2).
- Consumes from existing code: `generatorReducer` with the `loadCode` action, `initialState`,
  `readUtm`, `withUtm`, `DEFAULT_SETTINGS`, `isTrackable`, `taggedDestination`, `localToIso`.
- Produces, in `load.ts`:
  - `isoToLocalInput(iso: string | null): string`
  - `splitDestination(destination: string): { url: string; utm: UtmParams }`
  - `isEditableType(type: string): type is CodeTypeId`
  - `fromSavedCode(row: QrCodeRow): CreateState`
- Produces, in `submit.ts`:
  - `interface CodeChanges { patch: CodeUpdate; password: PasswordChange }`
  - `toCodePatch(initial: CreateState, current: CreateState, opts: { name: string; removePassword: boolean }): CodeChanges`
  - `hasChanges(changes: CodeChanges): boolean`

- [ ] **Step 1: Write the fixture and the failing tests for loading.** Create
  `features/create/fixtures.ts`. Later tasks' tests import it too, and it isn't a test file, so
  importing it never re-runs another file's tests:

```ts
import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import type { QrCodeRow } from "@/types/supabase";

/** A saved code as the database returns it: a trackable link unless overridden. Tests only. */
export function savedRow(overrides: Partial<QrCodeRow> = {}): QrCodeRow {
  return {
    id: "c1",
    user_id: "u1",
    name: "Spring menu",
    qr_type: "url",
    content: { url: "https://example.com/menu" },
    design: { ...DEFAULT_DESIGN, fgColor: "#123456" },
    is_dynamic: true,
    slug: "SPRING",
    destination: "https://example.com/menu",
    status: "active",
    scan_count: 0,
    last_scanned_at: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    folder_id: null,
    active_from: null,
    active_until: null,
    has_password: false,
    is_private: false,
    ...overrides,
  } as unknown as QrCodeRow;
}
```

  Then create `features/create/load.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { sanitizePage } from "@/lib/pages/sanitize";

import { savedRow } from "./fixtures";
import { fromSavedCode, isEditableType, isoToLocalInput, splitDestination } from "./load";

describe("isoToLocalInput", () => {
  it("shows a time in this browser's time zone, and nothing for none", () => {
    expect(isoToLocalInput(new Date(2030, 0, 2, 9, 5).toISOString())).toBe("2030-01-02T09:05");
    expect(isoToLocalInput(null)).toBe("");
    expect(isoToLocalInput("not a date")).toBe("");
  });
});

describe("splitDestination", () => {
  it("separates campaign tags and keeps the address's other parameters", () => {
    expect(splitDestination("https://example.com/menu?table=4&utm_source=flyer&utm_campaign=fall")).toEqual({
      url: "https://example.com/menu?table=4",
      utm: { source: "flyer", medium: "", campaign: "fall", term: "", content: "" },
    });
  });

  it("leaves an address without tags exactly as it was", () => {
    expect(splitDestination("https://example.com")).toEqual({
      url: "https://example.com",
      utm: { source: "", medium: "", campaign: "", term: "", content: "" },
    });
  });
});

describe("fromSavedCode", () => {
  it("opens a trackable link with its tags, ending, dates, folder and name", () => {
    const from = new Date(2030, 0, 2, 9, 0).toISOString();
    const state = fromSavedCode(
      savedRow({
        destination: "https://example.com/menu?utm_source=flyer",
        content: { url: "https://example.com/menu?utm_source=flyer" },
        active_from: from,
        folder_id: "f1",
      }),
    );
    expect(state.code.activeType).toBe("url");
    expect(state.code.content.url.url).toBe("https://example.com/menu");
    expect(state.code.name).toBe("Spring menu");
    expect(state.code.design.fgColor).toBe("#123456");
    expect(state.styleDesign).toEqual(state.code.design);
    expect(state.settings).toMatchObject({
      trackable: true,
      password: "",
      slug: "SPRING",
      startsAt: "2030-01-02T09:00",
      endsAt: "",
      utm: { source: "flyer", medium: "", campaign: "" },
    });
    expect(state.folderId).toBe("f1");
  });

  it("opens a static code with its content and Trackable off", () => {
    const state = fromSavedCode(
      savedRow({
        qr_type: "wifi",
        is_dynamic: false,
        slug: null,
        destination: null,
        content: { ssid: "Cafe", password: "beans", security: "WPA", hidden: false },
      }),
    );
    expect(state.code.activeType).toBe("wifi");
    expect(state.code.content.wifi.ssid).toBe("Cafe");
    expect(state.settings.trackable).toBe(false);
    expect(state.settings.slug).toBe("");
  });

  it("opens a hosted page as its page", () => {
    const content = { title: "Cafe links" };
    const state = fromSavedCode(savedRow({ qr_type: "links", destination: null, content }));
    expect(state.code.activeType).toBe("links");
    expect(state.code.pages.links).toEqual(sanitizePage("links", content));
  });
});

describe("isEditableType", () => {
  it("knows the editor's types", () => {
    expect(isEditableType("url")).toBe(true);
    expect(isEditableType("links")).toBe(true);
    expect(isEditableType("fax")).toBe(false);
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- features/create/load.test.ts`
  Expected: FAIL with `Failed to resolve import "./load"`.

- [ ] **Step 3: Implement `load.ts`.** Create `features/create/load.ts`:

```ts
import { initialState } from "@/features/generator/state/defaults";
import { generatorReducer } from "@/features/generator/state/reducer";
import { readUtm, withUtm, type UtmParams } from "@/lib/dynamic/utm";
import { isPageType, isStaticType, type CodeTypeId } from "@/lib/qr/types";
import type { QrCodeRow } from "@/types/supabase";

import { DEFAULT_SETTINGS, type CreateState } from "./state";

const NO_UTM: UtmParams = { source: "", medium: "", campaign: "", term: "", content: "" };

/** "2026-11-14T19:00" in this browser's time zone, for a datetime-local input; "" for none. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A trackable link's saved address, split into the link and its campaign tags. */
export function splitDestination(destination: string): { url: string; utm: UtmParams } {
  const utm = readUtm(destination);
  if (!Object.values(utm).some(Boolean)) return { url: destination, utm: { ...NO_UTM } };
  try {
    return { url: withUtm(destination, NO_UTM), utm };
  } catch {
    return { url: destination, utm: { ...NO_UTM } };
  }
}

/** Types the editor can open. A code saved with any other type stays on its code page. */
export const isEditableType = (type: string): type is CodeTypeId =>
  isStaticType(type) || isPageType(type);

/**
 * A saved code as editor state, so the Create editor can open it. Check isEditableType first.
 * Dates come out in this browser's time zone, so call it in the browser, not on the server.
 */
export function fromSavedCode(row: QrCodeRow): CreateState {
  const type = row.qr_type as CodeTypeId;
  const link = row.is_dynamic && type === "url";
  const { url, utm } = link
    ? splitDestination(row.destination ?? "")
    : { url: "", utm: { ...NO_UTM } };
  const loaded = generatorReducer(initialState(), {
    type: "loadCode",
    qrType: type,
    content: link ? { url } : row.content,
    design: row.design,
  });
  const code = { ...loaded, name: row.name };
  return {
    code,
    settings: {
      ...DEFAULT_SETTINGS,
      trackable: row.is_dynamic,
      startsAt: isoToLocalInput(row.active_from),
      endsAt: isoToLocalInput(row.active_until),
      slug: row.slug ?? "",
      utm,
    },
    folderId: row.folder_id,
    styleDesign: code.design,
  };
}
```

- [ ] **Step 4: Run them and watch them pass.**
  Run: `npm test -- features/create/load.test.ts`
  Expected: PASS (7 tests).

- [ ] **Step 5: Write the failing tests for changes.** Append to `features/create/submit.test.ts`
  and add the imports shown:

```ts
import { fromSavedCode } from "./load";
import { savedRow } from "./fixtures";
import { createReducer, type CreateAction, type CreateState } from "./state";
import { hasChanges, toCodePatch } from "./submit";

const after = (state: CreateState, ...actions: CreateAction[]) => actions.reduce(createReducer, state);
const setField = (qrType: "url" | "text", field: string, value: string): CreateAction => ({
  type: "code",
  action: { type: "setField", qrType, field, value },
});
const keepName = (state: CreateState) => ({ name: state.code.name, removePassword: false });

describe("toCodePatch", () => {
  const link = () => fromSavedCode(savedRow());

  it("finds nothing to save in an untouched code", () => {
    const initial = link();
    expect(hasChanges(toCodePatch(initial, initial, keepName(initial)))).toBe(false);
  });

  it("sends only the name when only the name changed", () => {
    const initial = link();
    expect(toCodePatch(initial, initial, { name: "Lunch menu", removePassword: false })).toEqual({
      patch: { name: "Lunch menu" },
      password: { action: "keep" },
    });
  });

  it("sends a trackable link's new address with its tags, as its content too", () => {
    const initial = link();
    const current = after(initial, setField("url", "url", "example.com/lunch"), {
      type: "settings",
      patch: { utm: { source: "flyer", medium: "", campaign: "" } },
    });
    const { patch } = toCodePatch(initial, current, keepName(initial));
    expect(patch.destination).toBe("https://example.com/lunch?utm_source=flyer");
    expect(patch.content).toEqual({ url: "https://example.com/lunch?utm_source=flyer" });
  });

  it("keeps other query parameters and leaves the address alone when only the name changes", () => {
    const initial = fromSavedCode(
      savedRow({ destination: "https://example.com/menu?table=4&utm_source=flyer" }),
    );
    expect(toCodePatch(initial, initial, { name: "Renamed", removePassword: false }).patch).toEqual({
      name: "Renamed",
    });
    const current = after(initial, { type: "settings", patch: { utm: { ...initial.settings.utm, medium: "qr" } } });
    expect(toCodePatch(initial, current, keepName(initial)).patch.destination).toBe(
      "https://example.com/menu?table=4&utm_source=flyer&utm_medium=qr",
    );
  });

  it("sends a static code's content and never its settings", () => {
    const initial = fromSavedCode(
      savedRow({ qr_type: "text", is_dynamic: false, slug: null, destination: null, content: { text: "Hi" } }),
    );
    const current = after(initial, setField("text", "text", "Hello"), {
      type: "settings",
      patch: { startsAt: "2030-01-01T09:00", password: "secret" },
    });
    expect(toCodePatch(initial, current, keepName(initial))).toEqual({
      patch: { content: { text: "Hello" } },
      password: { action: "keep" },
    });
  });

  it("sends a hosted page's page as its content", () => {
    const initial = fromSavedCode(savedRow({ qr_type: "links", destination: null, content: { title: "Cafe" } }));
    const page = { ...initial.code.pages.links, title: "Cafe links" };
    const current = after(initial, { type: "code", action: { type: "setPage", pageType: "links", content: page } });
    expect(toCodePatch(initial, current, keepName(initial)).patch).toEqual({ content: page });
  });

  it("sends the design, folder, ending and dates only when they changed", () => {
    const initial = link();
    const current = after(
      initial,
      { type: "code", action: { type: "setDesign", patch: { fgColor: "#000000" } } },
      { type: "setFolder", folderId: "f2" },
      { type: "settings", patch: { slug: "LUNCH", endsAt: "2030-02-01T09:00" } },
    );
    const { patch } = toCodePatch(initial, current, keepName(initial));
    expect(Object.keys(patch).sort()).toEqual(["activeUntil", "design", "folderId", "slug"]);
    expect(patch.activeUntil).toBe(new Date("2030-02-01T09:00").toISOString());
  });

  it("unchanged dates are never sent, so saving can't shift them", () => {
    const initial = fromSavedCode(savedRow({ active_from: "2030-01-02T17:00:00.000Z" }));
    const current = after(initial, { type: "setFolder", folderId: "f2" });
    expect(toCodePatch(initial, current, keepName(initial)).patch).toEqual({ folderId: "f2" });
  });

  it("sets a typed password, clears one on Remove, and keeps it otherwise", () => {
    const initial = fromSavedCode(savedRow({ has_password: true }));
    const typed = after(initial, { type: "settings", patch: { password: "new secret" } });
    expect(toCodePatch(initial, typed, keepName(initial)).password).toEqual({ action: "set", password: "new secret" });
    expect(toCodePatch(initial, initial, { name: initial.code.name, removePassword: true }).password).toEqual({
      action: "clear",
    });
    expect(toCodePatch(initial, initial, keepName(initial)).password).toEqual({ action: "keep" });
  });
});
```

- [ ] **Step 6: Run them and watch them fail.**
  Run: `npm test -- features/create/submit.test.ts`
  Expected: FAIL with `toCodePatch is not a function` (or not exported).

- [ ] **Step 7: Implement `toCodePatch`.** In `features/create/submit.ts`:
  - change the first import to
    `import type { CodeSettingsInput, CodeUpdate, NewCode, PasswordChange } from "@/features/codes/api";`
  - append:

```ts
/** What saving a saved code will send: the changed fields, and what happens to its password. */
export interface CodeChanges {
  patch: CodeUpdate;
  password: PasswordChange;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * What the editor changed since it opened a saved code. Only fields whose part of the form
 * changed are included, so saving one thing never rewrites the rest (an untouched date can't
 * shift between time zones, and an untouched address keeps its exact text). `name` is the name
 * to save: the typed one, or the suggestion when the box was cleared.
 */
export function toCodePatch(
  initial: CreateState,
  current: CreateState,
  { name, removePassword }: { name: string; removePassword: boolean },
): CodeChanges {
  const type = initial.code.activeType;
  const trackable = isTrackable(initial);
  const patch: CodeUpdate = {};
  if (name !== initial.code.name) patch.name = name;

  if (isPageType(type)) {
    if (!same(current.code.pages[type], initial.code.pages[type])) {
      patch.content = current.code.pages[type];
    }
  } else if (trackable && type === "url") {
    const before = { url: initial.code.content.url.url, utm: initial.settings.utm };
    const now = { url: current.code.content.url.url, utm: current.settings.utm };
    if (!same(now, before)) {
      const destination = taggedDestination(now.url, now.utm);
      patch.destination = destination;
      patch.content = { url: destination };
    }
  } else if (!same(current.code.content[type], initial.code.content[type])) {
    patch.content = current.code.content[type];
  }

  if (!same(current.code.design, initial.code.design)) patch.design = current.code.design;
  if (current.folderId !== initial.folderId) patch.folderId = current.folderId;
  if (trackable) {
    if (current.settings.slug !== initial.settings.slug) patch.slug = current.settings.slug;
    if (current.settings.startsAt !== initial.settings.startsAt)
      patch.activeFrom = localToIso(current.settings.startsAt);
    if (current.settings.endsAt !== initial.settings.endsAt)
      patch.activeUntil = localToIso(current.settings.endsAt);
  }

  const password: PasswordChange = !trackable
    ? { action: "keep" }
    : removePassword
      ? { action: "clear" }
      : current.settings.password
        ? { action: "set", password: current.settings.password }
        : { action: "keep" };
  return { patch, password };
}

/** Whether saving would change anything. */
export const hasChanges = ({ patch, password }: CodeChanges) =>
  Object.keys(patch).length > 0 || password.action !== "keep";
```

- [ ] **Step 8: Run them and watch them pass.**
  Run: `npm test -- features/create && npm run typecheck`
  Expected: PASS for all of `features/create`; typecheck exits 0.

- [ ] **Step 9: Commit.**

```bash
git add features/create/fixtures.ts features/create/load.ts features/create/load.test.ts features/create/submit.ts features/create/submit.test.ts
git commit -m "Open a saved code as editor state and find only what changed

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Edit mode in the sections, settings rules and draft hook

**Files:**
- Modify: `features/create/state.ts`, `features/create/state.test.ts`
- Modify: `features/create/useCodeDraft.ts`, `features/create/useCodeDraft.test.tsx`
- Modify: `features/create/sections/TypeSection.tsx`, `ContentSection.tsx`
- Rewrite: `features/create/sections/SettingsSection.tsx`
- Test: `features/create/sections/sections.test.tsx`

**Interfaces:**
- Consumes: `fromSavedCode` (Task 3).
- Produces:
  - `settingsErrors(settings, options?: { requireSlug?: boolean })` and
    `settingsProblem(settings, options?)`
  - `useCodeDraft(defaults, options?: { initial?: CreateState; requireSlug?: boolean })`
  - `TypeSection` prop `locked?: boolean`
  - `ContentSection` prop `typeLocked?: boolean`
  - `SettingsSection` prop `saved?: SavedSettings`, and the exported
    `interface SavedSettings { slug: string | null; hasPassword: boolean; removePassword: boolean; onRemovePassword: (remove: boolean) => void }`

- [ ] **Step 1: Write the failing tests.**

  In `features/create/state.test.ts`, append (importing `DEFAULT_SETTINGS` and `settingsErrors`
  if they aren't imported yet):

```ts
describe("settingsErrors when editing", () => {
  it("asks for a link ending only when told to", () => {
    expect(settingsErrors({ ...DEFAULT_SETTINGS, slug: "" }).slug).toBeUndefined();
    expect(settingsErrors({ ...DEFAULT_SETTINGS, slug: "" }, { requireSlug: true }).slug).toBe(
      "Every trackable code needs a link ending",
    );
  });
});
```

  In `features/create/useCodeDraft.test.tsx`, append:

```ts
import { fromSavedCode } from "./load";
import { savedRow } from "./fixtures";

describe("useCodeDraft opening a saved code", () => {
  it("starts from the saved code and previews its real short link", () => {
    const initial = fromSavedCode(savedRow());
    const { result } = renderHook(() =>
      useCodeDraft({ type: "url", folderId: null }, { initial, requireSlug: true }),
    );
    expect(result.current.state).toBe(initial);
    expect(result.current.data).toBe(dynamicPayload("SPRING"));
    expect(result.current.blocker).toBeNull();
    act(() => result.current.dispatch({ type: "settings", patch: { slug: "" } }));
    expect(result.current.blocker).toBe("Every trackable code needs a link ending");
  });
});
```

  In `features/create/sections/sections.test.tsx`, append:

```ts
describe("the sections when editing a saved code", () => {
  it("shows the type without letting it change", () => {
    render(<TypeSection value="wifi" onChange={vi.fn()} locked />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "More types" })).toBeNull();
    expect(
      screen.getByText("Set when the code was created. Duplicate it to make a different type."),
    ).toBeInTheDocument();
  });

  it("hides the contact-kind switch", () => {
    render(<ContentSection editor={editorFor("contact")} onTypeChange={vi.fn()} typeLocked />);
    expect(screen.queryByRole("radiogroup", { name: "How should it work?" })).toBeNull();
  });

  const saved = (overrides: Partial<SavedSettings> = {}): SavedSettings => ({
    slug: "SPRING",
    hasPassword: false,
    removePassword: false,
    onRemovePassword: vi.fn(),
    ...overrides,
  });

  it("explains that Trackable can't change", () => {
    render(
      <SettingsSection type="url" settings={{ ...DEFAULT_SETTINGS, slug: "SPRING" }} onChange={vi.fn()} saved={saved()} />,
    );
    expect(screen.queryByRole("switch", { name: "Trackable" })).toBeNull();
    expect(screen.getByText(/Printed codes depend on this, so it can’t change/)).toBeInTheDocument();
  });

  it("keeps, replaces or removes an existing password", async () => {
    const user = userEvent.setup();
    const onRemovePassword = vi.fn();
    const onChange = vi.fn();
    const { rerender } = render(
      <SettingsSection
        type="url"
        settings={{ ...DEFAULT_SETTINGS, slug: "SPRING" }}
        onChange={onChange}
        saved={saved({ hasPassword: true, onRemovePassword })}
      />,
    );
    expect(screen.getByText(/This code has a password. Leave this blank to keep it/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove password" }));
    expect(onRemovePassword).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledWith({ password: "" });

    rerender(
      <SettingsSection
        type="url"
        settings={{ ...DEFAULT_SETTINGS, slug: "SPRING" }}
        onChange={onChange}
        saved={saved({ hasPassword: true, removePassword: true, onRemovePassword })}
      />,
    );
    expect(screen.getByText("The password will be removed when you save.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Code password/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Keep the password" }));
    expect(onRemovePassword).toHaveBeenLastCalledWith(false);
  });

  it("warns when the link ending changes, and needs one", () => {
    const { rerender } = render(
      <SettingsSection type="url" settings={{ ...DEFAULT_SETTINGS, slug: "LUNCH" }} onChange={vi.fn()} saved={saved()} />,
    );
    expect(
      screen.getByText("Codes you’ve already printed or shared use the current link and will stop working."),
    ).toBeInTheDocument();
    rerender(
      <SettingsSection type="url" settings={{ ...DEFAULT_SETTINGS, slug: "" }} onChange={vi.fn()} saved={saved()} />,
    );
    expect(screen.getByText("Every trackable code needs a link ending")).toBeInTheDocument();
  });
});
```

  Add `type SavedSettings` to the `./SettingsSection` import in that file.

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- features/create`
  Expected: FAIL. The new tests fail: `requireSlug` is ignored, `useCodeDraft` ignores `initial`,
  and `locked`, `typeLocked` and `saved` have no effect.

- [ ] **Step 3: Settings rules.** In `features/create/state.ts`, replace `settingsErrors` and
  `settingsProblem` with:

```ts
/** What's wrong with the settings, field by field (empty when they can be saved). */
export function settingsErrors(
  settings: CreateSettings,
  { requireSlug = false }: { requireSlug?: boolean } = {},
): SettingsErrors {
  const errors: SettingsErrors = {};
  const { password, startsAt, endsAt, slug } = settings;
  if (password && (password.length < 4 || password.length > 128))
    errors.password = "Passwords are 4 to 128 characters";
  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime())
    errors.endsAt = "The end date must be after the start date";
  if (slug && !isValidSlug(slug)) errors.slug = "Link endings use 3–40 letters, numbers or dashes";
  else if (!slug && requireSlug) errors.slug = "Every trackable code needs a link ending";
  return errors;
}

/** The first settings problem, or null. */
export const settingsProblem = (
  settings: CreateSettings,
  options?: { requireSlug?: boolean },
): string | null => Object.values(settingsErrors(settings, options))[0] ?? null;
```

- [ ] **Step 4: Draft hook options.** In `features/create/useCodeDraft.ts`:
  - change the signature and reducer setup:

```ts
export function useCodeDraft(
  defaults: CreateDefaults,
  options: { initial?: CreateState; requireSlug?: boolean } = {},
) {
  const [state, dispatch] = useReducer(
    createReducer,
    defaults,
    (fresh) => options.initial ?? initialCreateState(fresh),
  );
```

  - change the last branch of `blocker` from `settingsProblem(settings)` to
    `settingsProblem(settings, { requireSlug: options.requireSlug })`
  - add `type CreateState` to the `./state` import

- [ ] **Step 5: TypeSection `locked`.** In `features/create/sections/TypeSection.tsx`:
  - add `locked = false` to the props, typed `locked?: boolean`
  - after `const groups = moreTypes(query);`, which keeps every hook above the early return,
    insert:

```tsx
  if (locked) {
    const Icon = TYPE_ICONS[current];
    return (
      <Card aria-labelledby="type-heading">
        <CardHeader id="type-heading" step={1} title="What it opens" />
        <div className="flex flex-col gap-2 px-5 pt-4 pb-6 sm:px-6">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Icon aria-hidden className="size-4 shrink-0 text-fg" />
            <span className="font-semibold text-fg">{typeLabel(value)}</span>
            <span className="text-fg-muted">{typeDescription(value)}</span>
          </p>
          <p className="text-sm text-fg-muted">
            Set when the code was created. Duplicate it to make a different type.
          </p>
        </div>
      </Card>
    );
  }
```

- [ ] **Step 6: ContentSection `typeLocked`.** In
  `features/create/sections/ContentSection.tsx`:
  - add `typeLocked = false` to the props, typed `typeLocked?: boolean`
  - change `{isContactType(type) && (` to `{isContactType(type) && !typeLocked && (`

- [ ] **Step 7: SettingsSection with `saved`.** Replace `features/create/sections/SettingsSection.tsx`
  with:

```tsx
"use client";

import { useId } from "react";

import { Button } from "@/components/ui/Button";
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

/** Editing a saved code: what it has now, so the section can explain what can't change. */
export interface SavedSettings {
  /** The saved short-link ending (null for static codes). */
  slug: string | null;
  hasPassword: boolean;
  /** Remove was chosen: the password goes when the code is saved. */
  removePassword: boolean;
  onRemovePassword: (remove: boolean) => void;
}

/** Step 4: tracking, a password, active dates and the short link. Off, with why, when static. */
export function SettingsSection({
  type,
  settings,
  onChange,
  saved,
}: {
  type: CodeTypeId;
  settings: CreateSettings;
  onChange: (patch: Partial<CreateSettings>) => void;
  /** Present when editing a saved code. */
  saved?: SavedSettings;
}) {
  const reasonId = useId();
  const hosted = isPageType(type);
  const link = type === "url";
  const trackable = hosted || (link && settings.trackable);
  const errors = trackable ? settingsErrors(settings, { requireSlug: saved !== undefined }) : {};
  const slugChanged = saved?.slug != null && settings.slug !== saved.slug;
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
        {link && !saved && (
          <Toggle
            label="Trackable"
            description="Change where it points after printing, and see scans."
            checked={settings.trackable}
            onChange={(on) => onChange({ trackable: on })}
          />
        )}
        {link && saved && (
          <p className="text-sm text-fg-muted">
            <span className="font-medium text-fg">
              Trackable is {settings.trackable ? "on" : "off"}.
            </span>{" "}
            Printed codes depend on this, so it can’t change.
          </p>
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
          {saved?.hasPassword && saved.removePassword ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-fg">The password will be removed when you save.</p>
              <Button
                variant="outline"
                className="self-start"
                onClick={() => saved.onRemovePassword(false)}
              >
                Keep the password
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Field
                label="Code password"
                optional={!saved?.hasPassword}
                hint={
                  saved?.hasPassword
                    ? "This code has a password. Leave this blank to keep it, or type a new one."
                    : "4 to 128 characters. Scanners need it to open the code."
                }
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
              {saved?.hasPassword && (
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={() => {
                    onChange({ password: "" });
                    saved.onRemovePassword(true);
                  }}
                >
                  Remove password
                </Button>
              )}
            </div>
          )}
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
          <div className="flex flex-col gap-2">
            <Field
              label="Short link ending"
              optional={!saved}
              hint={
                settings.slug && !errors.slug
                  ? `Opens ${shortLinkLabel(settings.slug)}`
                  : saved
                    ? undefined
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
            {slugChanged && (
              <p className="text-sm text-warning">
                Codes you’ve already printed or shared use the current link and will stop working.
              </p>
            )}
          </div>
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

- [ ] **Step 8: Run them and watch them pass.**
  Run: `npm test -- features/create && npm run typecheck && npm run lint`
  Expected: PASS for all `features/create` tests (old and new). Typecheck and lint exit 0.

- [ ] **Step 9: Commit.**

```bash
git add features/create/state.ts features/create/state.test.ts features/create/useCodeDraft.ts features/create/useCodeDraft.test.tsx features/create/sections
git commit -m "Let the Create sections open a saved code: type and Trackable locked, password and ending explained

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: One editor layout for Create and Edit

**Files:**
- Create: `features/create/EditorLayout.tsx`, `features/create/EditorLayout.test.tsx`
- Modify: `features/create/PreviewColumn.tsx`, `features/create/CreateMobileBar.tsx`,
  `features/create/CreatePage.tsx`

**Interfaces:**
- Consumes: `SavedSettings`, `TypeSection locked`, `ContentSection typeLocked` (Task 4).
- Produces:

```ts
export interface CreateControls {
  mode: "create" | "edit";
  submitting: boolean;
  onSubmit: () => void;
  error: string | null;
  dirty?: boolean;
  onDiscard?: () => void;
}
export function EditorLayout(props: {
  draft: CodeDraft;
  folders: FolderRow[];
  mediaOwner: string | null;
  controls: CreateControls;
  saved?: SavedSettings;
}): JSX.Element;
```

- [ ] **Step 1: Write the failing test.** Create `features/create/EditorLayout.test.tsx`:

```tsx
import { render, renderHook, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ContentEditor } from "@/features/generator/content/types";

import { EditorLayout } from "./EditorLayout";
import { fromSavedCode } from "./load";
import { savedRow } from "./fixtures";
import { useCodeDraft } from "./useCodeDraft";

// The content editor this layout builds, as the Content section received it.
const seen: { editor: ContentEditor | null } = { editor: null };
vi.mock("./sections/ContentSection", () => ({
  ContentSection: ({ editor }: { editor: ContentEditor }) => {
    seen.editor = editor;
    return null;
  },
}));
vi.mock("@/features/generator/preview/useScanVerification", () => ({ useScanVerification: () => null }));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));

function renderLayout(mode: "create" | "edit", dirty = false) {
  const initial = fromSavedCode(savedRow());
  const { result } = renderHook(() =>
    useCodeDraft({ type: "url", folderId: null }, { initial, requireSlug: true }),
  );
  return render(
    <EditorLayout
      draft={result.current}
      folders={[]}
      mediaOwner="owner-1"
      controls={{ mode, submitting: false, onSubmit: vi.fn(), error: null, dirty, onDiscard: vi.fn() }}
    />,
  );
}

const preview = () => within(screen.getByRole("complementary", { name: "Preview" }));

describe("EditorLayout", () => {
  it("hands the code owner's space to the content editor", () => {
    renderLayout("edit");
    expect(seen.editor?.workspace).toEqual({ ownerId: "owner-1" });
  });

  it("says Create in create mode", () => {
    renderLayout("create");
    expect(preview().getByRole("button", { name: "Create code" })).toBeEnabled();
  });

  it("says Save changes in edit mode, enabled only once something changed", () => {
    const { unmount } = renderLayout("edit", false);
    expect(preview().getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(preview().queryByRole("button", { name: "Discard changes" })).toBeNull();
    expect(preview().queryByRole("button", { name: /Download without saving/ })).toBeNull();
    unmount();
    renderLayout("edit", true);
    expect(preview().getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(preview().getByRole("button", { name: "Discard changes" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**
  Run: `npm test -- features/create/EditorLayout.test.tsx`
  Expected: FAIL with `Failed to resolve import "./EditorLayout"`.

- [ ] **Step 3: Controls in PreviewColumn.** In `features/create/PreviewColumn.tsx`:
  - import `Save` from `lucide-react` alongside the existing icons
  - replace `CreateControls`, the props destructuring and the button group with:

```tsx
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

/** The live code (or page), its scan check and the one Create (or Save changes) button. */
export function PreviewColumn({
  draft,
  mode,
  submitting,
  onSubmit,
  error,
  dirty = false,
  onDiscard,
}: { draft: CodeDraft } & CreateControls) {
  const editing = mode === "edit";
```

  The button group, replacing the `<div className="flex flex-col gap-2">…</div>` at the end:

```tsx
      <div className="flex flex-col gap-2">
        <Button
          onClick={onSubmit}
          disabled={blocker !== null || submitting || (editing && !dirty)}
          aria-describedby={blocker ? reasonId : undefined}
          className="w-full"
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
        {editing && dirty && !submitting && onDiscard && (
          <Button variant="ghost" onClick={onDiscard} className="w-full">
            Discard changes
          </Button>
        )}
        {blocker && (
          <p id={reasonId} className="text-center text-sm text-fg-muted">
            {blocker}
          </p>
        )}
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {error}
          </p>
        )}
        {!trackable && !editing && (
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
```

- [ ] **Step 4: Controls in the phone bar.** In `features/create/CreateMobileBar.tsx`:
  - import `Save` from `lucide-react`
  - change the props to
    `({ draft, ...controls }: { draft: CodeDraft } & CreateControls)` with
    `const { mode, submitting, onSubmit, error, dirty = false } = controls;` and
    `const editing = mode === "edit";`
  - change the bar's button to:

```tsx
          <Button
            onClick={onSubmit}
            disabled={blocker !== null || submitting || (editing && !dirty)}
            className="px-4"
          >
            {submitting ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : editing ? (
              <Save aria-hidden />
            ) : (
              <Plus aria-hidden />
            )}
            {submitting ? (editing ? "Saving…" : "Creating…") : editing ? "Save" : "Create"}
          </Button>
```

  - pass everything on to the sheet: `<PreviewColumn draft={draft} {...controls} />`

- [ ] **Step 5: The shared layout.** Create `features/create/EditorLayout.tsx`:

```tsx
"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type { ContentEditor } from "@/features/generator/content/types";
import type { FolderRow } from "@/types/supabase";

import { CreateMobileBar } from "./CreateMobileBar";
import { PreviewColumn, type CreateControls } from "./PreviewColumn";
import { ContentSection } from "./sections/ContentSection";
import { DesignSection } from "./sections/DesignSection";
import { NameFolderSection } from "./sections/NameFolderSection";
import { SettingsSection, type SavedSettings } from "./sections/SettingsSection";
import { TypeSection } from "./sections/TypeSection";
import type { CodeDraft } from "./useCodeDraft";

/**
 * The editor Create and Edit share: the sections on the left in any order, the live preview and
 * the one button on the right (and above the bottom tabs on phones).
 */
export function EditorLayout({
  draft,
  folders,
  mediaOwner,
  controls,
  saved,
}: {
  draft: CodeDraft;
  folders: FolderRow[];
  /** Hosted-page files go to this person's space (a teammate's code); null means your own. */
  mediaOwner: string | null;
  controls: CreateControls;
  /** Edit mode only: what the saved code has, so the sections can lock and explain things. */
  saved?: SavedSettings;
}) {
  const { state, dispatch, codeAction } = draft;
  const editing = controls.mode === "edit";
  const editor: ContentEditor = {
    state: state.code,
    setField: draft.setField,
    setPage: draft.setPage,
    pageErrors: draft.pageErrors,
    workspace: mediaOwner ? { ownerId: mediaOwner } : null,
  };

  return (
    <>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18.5rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <TypeSection
            value={state.code.activeType}
            locked={editing}
            onChange={(activeType) => codeAction({ type: "setActiveType", activeType })}
          />
          <ContentSection
            editor={editor}
            typeLocked={editing}
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
            saved={saved}
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
    </>
  );
}
```

- [ ] **Step 6: CreatePage uses it.** In `features/create/CreatePage.tsx`:
  - delete the `editor` constant
  - delete the imports `Card`, `CardHeader`, `ContentEditor`, `CreateMobileBar`,
    `PreviewColumn`, and the five section imports
  - add `import { EditorLayout } from "./EditorLayout";`
  - replace `controls` and everything after `<PageHeader … />`/`DraftBanner` with:

```tsx
  const controls = {
    mode: "create" as const,
    submitting: creating,
    onSubmit: () => void create(),
    error: failure?.state === state ? failure.message : null,
  };

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-0">
      <PageHeader
        title="Create a code"
        description="Fill in the sections in any order. The preview updates as you go."
      />
      {drafts.offer && (
        <DraftBanner
          savedAt={drafts.offer.savedAt}
          onResume={drafts.resume}
          onDiscard={drafts.discard}
        />
      )}
      <EditorLayout draft={draft} folders={folders} mediaOwner={null} controls={controls} />
    </div>
  );
```

  `codeAction` and `dispatch` are still used by `restore`. Keep whichever names the file still
  uses, and remove the unused ones so lint passes.

- [ ] **Step 7: Run the tests and watch them pass.**
  Run: `npm test -- features/create && npm run typecheck && npm run lint`
  Expected: PASS. The new `EditorLayout` tests pass, and every existing `CreatePage.test.tsx`
  test passes unchanged, which proves Create behaves as before. Typecheck and lint exit 0.

- [ ] **Step 8: Commit.**

```bash
git add features/create
git commit -m "Share one editor layout between Create and Edit

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Browser-only rendering and the unsaved-changes guard

**Files:**
- Create: `lib/useInBrowser.ts`
- Create: `features/create/useUnsavedChangesGuard.ts`,
  `features/create/useUnsavedChangesGuard.test.tsx`

**Interfaces:**
- Produces:
  - `useInBrowser(): boolean`: false on the server and while hydrating, then true.
  - `LEAVE_MESSAGE: string`
  - `useUnsavedChangesGuard(active: boolean): void`

- [ ] **Step 1: Write the failing tests.** Create
  `features/create/useUnsavedChangesGuard.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LEAVE_MESSAGE, useUnsavedChangesGuard } from "./useUnsavedChangesGuard";

function Page({ active }: { active: boolean }) {
  useUnsavedChangesGuard(active);
  return (
    <>
      <a href="/codes">Codes</a>
      <a href="/codes" target="_blank">New tab</a>
      <a href="#settings">Settings</a>
    </>
  );
}

/** Clicks a link and reports whether the guard stopped the navigation. */
function clickBlocked(name: string, init: MouseEventInit = {}) {
  let prevented = false;
  const record = (event: Event) => (prevented = event.defaultPrevented);
  document.addEventListener("click", record);
  fireEvent.click(screen.getByRole("link", { name }), init);
  document.removeEventListener("click", record);
  return prevented;
}

let confirm: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  confirm = vi.spyOn(window, "confirm");
});
afterEach(() => vi.restoreAllMocks());

describe("useUnsavedChangesGuard", () => {
  it("asks before an in-app link leaves, and stays when you cancel", () => {
    render(<Page active />);
    confirm.mockReturnValue(false);
    expect(clickBlocked("Codes")).toBe(true);
    expect(confirm).toHaveBeenCalledWith(LEAVE_MESSAGE);
    confirm.mockReturnValue(true);
    expect(clickBlocked("Codes")).toBe(false);
  });

  it("leaves new-tab links, page anchors and modified clicks alone", () => {
    render(<Page active />);
    expect(clickBlocked("New tab")).toBe(false);
    expect(clickBlocked("Settings")).toBe(false);
    expect(clickBlocked("Codes", { metaKey: true })).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks the browser to confirm closing or reloading", () => {
    render(<Page active />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("asks before Back leaves, and stays when you cancel", () => {
    const push = vi.spyOn(window.history, "pushState");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    render(<Page active />);
    expect(push).toHaveBeenCalledTimes(1);
    confirm.mockReturnValue(false);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(push).toHaveBeenCalledTimes(2);
    expect(back).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("turns off once inactive", () => {
    const { rerender } = render(<Page active />);
    rerender(<Page active={false} />);
    expect(clickBlocked("Codes")).toBe(false);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- features/create/useUnsavedChangesGuard.test.tsx`
  Expected: FAIL with `Failed to resolve import "./useUnsavedChangesGuard"`.

- [ ] **Step 3: Implement both hooks.** Create `lib/useInBrowser.ts`:

```ts
"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False on the server and while the page hydrates, true in the browser after that. Use it for
 * anything the server can't know, like the viewer's time zone, so the HTML matches while hydrating.
 */
export function useInBrowser(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
```

  Create `features/create/useUnsavedChangesGuard.ts`:

```ts
"use client";

import { useEffect } from "react";

export const LEAVE_MESSAGE = "Leave without saving? Your changes will be lost.";

/**
 * While `active`, asks before the page is left: in-app links, Back and Forward, closing the tab
 * and reloading. Back works by keeping one copy of this page on the history stack: Back lands on
 * the copy first, and only goes on if the person says so.
 */
export function useUnsavedChangesGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      const here = window.location;
      if (url.origin === here.origin && url.pathname === here.pathname && url.search === here.search) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    let leaving = false;
    window.history.pushState(window.history.state, "", window.location.href);
    const onPopState = () => {
      if (leaving) return;
      if (window.confirm(LEAVE_MESSAGE)) {
        leaving = true;
        window.history.back();
      } else {
        window.history.pushState(window.history.state, "", window.location.href);
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [active]);
}
```

- [ ] **Step 4: Run them and watch them pass.**
  Run: `npm test -- features/create/useUnsavedChangesGuard.test.tsx && npm run typecheck && npm run lint`
  Expected: PASS (5 tests). Typecheck and lint exit 0.

- [ ] **Step 5: Commit.**

```bash
git add lib/useInBrowser.ts features/create/useUnsavedChangesGuard.ts features/create/useUnsavedChangesGuard.test.tsx
git commit -m "Ask before leaving unsaved changes, and add a browser-only rendering flag

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: The Edit page and its route

**Files:**
- Create: `features/create/EditCodePage.tsx`, `features/create/EditCodePage.test.tsx`
- Create: `app/(app)/codes/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `fromSavedCode`, `isEditableType` (Task 3); `toCodePatch`, `hasChanges` (Task 3);
  `updateCodeWithSettings` (Task 2); `useCodeDraft` options (Task 4); `EditorLayout` (Task 5);
  `useUnsavedChangesGuard`, `useInBrowser` (Task 6).
- Produces: `EditCodePage(props: { code: QrCodeRow; folders: FolderRow[]; mediaOwner: string | null; codeHref: string })`,
  and the route `/codes/<id>/edit`.

- [ ] **Step 1: Write the failing tests.** Create `features/create/EditCodePage.test.tsx`:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type * as CodesApi from "@/features/codes/api";
import { updateCodeWithSettings, type Result } from "@/features/codes/api";
import type { QrCodeRow } from "@/types/supabase";

import { EditCodePage } from "./EditCodePage";
import { savedRow } from "./fixtures";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/features/codes/api", async (original) => ({
  ...(await original<typeof CodesApi>()),
  updateCodeWithSettings: vi.fn(),
}));
vi.mock("@/features/generator/preview/useScanVerification", () => ({ useScanVerification: () => null }));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));

const CODE_HREF = "/codes/c1";

function renderPage(row: QrCodeRow = savedRow()) {
  return render(
    <ToastProvider>
      <EditCodePage code={row} folders={[]} mediaOwner={null} codeHref={CODE_HREF} />
    </ToastProvider>,
  );
}

const preview = () => within(screen.getByRole("complementary", { name: "Preview" }));
const saveButton = () => preview().getByRole("button", { name: "Save changes" });

beforeEach(() => {
  push.mockReset();
  vi.mocked(updateCodeWithSettings).mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("EditCodePage", () => {
  it("opens the saved code filled in, with Save off until something changes", async () => {
    renderPage();
    expect(screen.getByLabelText("Website address")).toHaveValue("https://example.com/menu");
    expect(screen.getByLabelText("Code name")).toHaveValue("Spring menu");
    expect(screen.getByLabelText("Short link ending")).toHaveValue("SPRING");
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByRole("radiogroup", { name: "Code type" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "Trackable" })).toBeNull();
  });

  it("saves only what changed, then goes to the code page without asking", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCodeWithSettings).mockResolvedValue({ ok: true, value: savedRow() });
    renderPage();
    await user.clear(screen.getByLabelText("Code name"));
    await user.type(screen.getByLabelText("Code name"), "Lunch menu");
    await user.click(saveButton());
    expect(updateCodeWithSettings).toHaveBeenCalledWith("c1", { name: "Lunch menu" }, { action: "keep" });
    await waitFor(() => expect(push).toHaveBeenCalledWith(CODE_HREF));
    expect(await screen.findByText("Changes saved")).toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("a second press while saving sends nothing", async () => {
    const user = userEvent.setup();
    let finish!: (value: Result<QrCodeRow>) => void;
    vi.mocked(updateCodeWithSettings).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPage();
    await user.type(screen.getByLabelText("Code name"), " 2");
    const button = saveButton();
    await user.click(button);
    await user.click(button);
    expect(updateCodeWithSettings).toHaveBeenCalledTimes(1);
    finish({ ok: true, value: savedRow() });
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });

  it("shows why a save failed and stays", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCodeWithSettings).mockResolvedValue({
      ok: false,
      error: "That link ending is already taken. Try another.",
    });
    renderPage();
    await user.clear(screen.getByLabelText("Short link ending"));
    await user.type(screen.getByLabelText("Short link ending"), "TAKEN");
    await user.click(saveButton());
    expect(await preview().findByRole("alert")).toHaveTextContent("That link ending is already taken");
    expect(push).not.toHaveBeenCalled();
  });

  it("Discard puts everything back the way it was saved", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Code name"), " 2");
    await user.click(preview().getByRole("button", { name: "Discard changes" }));
    expect(screen.getByLabelText("Code name")).toHaveValue("Spring menu");
    expect(saveButton()).toBeDisabled();
  });

  it("removes the password when asked", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCodeWithSettings).mockResolvedValue({ ok: true, value: savedRow() });
    renderPage(savedRow({ has_password: true }));
    await user.click(screen.getByRole("button", { name: "Remove password" }));
    await user.click(saveButton());
    expect(updateCodeWithSettings).toHaveBeenCalledWith("c1", {}, { action: "clear" });
  });

  it("mentions a logo too large to store when the design is saved", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCodeWithSettings).mockResolvedValue({ ok: true, value: savedRow() });
    renderPage(savedRow({ design: { logo: `data:image/png;base64,${"A".repeat(250_000)}` } as never }));
    // Only a changed design is sent, so change a color.
    await user.click(screen.getByRole("button", { name: /^Colors/ }));
    await user.clear(screen.getByLabelText("Background"));
    await user.type(screen.getByLabelText("Background"), "#FFF7E6");
    await user.click(saveButton());
    expect(
      await screen.findByText("Changes saved. The logo was too large to store and was left out."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- features/create/EditCodePage.test.tsx`
  Expected: FAIL with `Failed to resolve import "./EditCodePage"`.

- [ ] **Step 3: Implement the page component.** Create `features/create/EditCodePage.tsx`:

```tsx
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { designForStorage, updateCodeWithSettings } from "@/features/codes/api";
import { useInBrowser } from "@/lib/useInBrowser";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { EditorLayout } from "./EditorLayout";
import { fromSavedCode } from "./load";
import type { CreateState } from "./state";
import { hasChanges, toCodePatch } from "./submit";
import { useCodeDraft } from "./useCodeDraft";
import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard";

export interface EditCodePageProps {
  code: QrCodeRow;
  /** The code owner's folders. */
  folders: FolderRow[];
  /** A teammate's code: new page files go to their space. Null for your own code. */
  mediaOwner: string | null;
  /** The code's page: where Back and a finished save go. */
  codeHref: string;
}

/** The Create editor, opened on a saved code. */
export function EditCodePage(props: EditCodePageProps) {
  // Start and end times show in the viewer's time zone, which the server can't know, so the
  // form is built in the browser.
  const inBrowser = useInBrowser();
  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-3">
        <Link
          href={props.codeHref}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" /> Back to {props.code.name}
        </Link>
        <PageHeader
          title="Edit code"
          description="Change anything below, then save. The preview updates as you go."
        />
      </div>
      {inBrowser ? (
        <EditForm {...props} />
      ) : (
        <p aria-busy="true" className="text-sm text-fg-muted">
          Opening the editor…
        </p>
      )}
    </div>
  );
}

function EditForm({ code, folders, mediaOwner, codeHref }: EditCodePageProps) {
  const router = useRouter();
  const toast = useToast();
  const initial = useMemo(() => fromSavedCode(code), [code]);
  const draft = useCodeDraft(
    { type: initial.code.activeType, folderId: initial.folderId },
    { initial, requireSlug: Boolean(code.slug) },
  );
  const { state, dispatch } = draft;
  const [removePassword, setRemovePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Why the last save failed, shown until the form changes. */
  const [failure, setFailure] = useState<{ message: string; state: CreateState } | null>(null);
  /** Set the moment Save is pressed, so a second press can't start another save. */
  const inFlight = useRef(false);

  const name = state.code.name.trim() || draft.defaultName;
  const changes = toCodePatch(initial, state, { name, removePassword });
  const dirty = hasChanges(changes);
  useUnsavedChangesGuard(dirty && !saving);

  async function save() {
    if (inFlight.current || draft.blocker || !dirty) return;
    inFlight.current = true;
    setSaving(true);
    const result = await updateCodeWithSettings(code.id, changes.patch, changes.password);
    if (!result.ok) {
      inFlight.current = false;
      setSaving(false);
      setFailure({ message: result.error, state });
      toast(result.error, "error");
      return;
    }
    const droppedLogo = changes.patch.design && designForStorage(changes.patch.design).droppedLogo;
    toast(
      droppedLogo
        ? "Changes saved. The logo was too large to store and was left out."
        : "Changes saved",
    );
    router.push(codeHref);
  }

  function discard() {
    dispatch({ type: "restore", state: initial });
    setRemovePassword(false);
    setFailure(null);
  }

  return (
    <EditorLayout
      draft={draft}
      folders={folders}
      mediaOwner={mediaOwner}
      controls={{
        mode: "edit",
        submitting: saving,
        onSubmit: () => void save(),
        error: failure?.state === state ? failure.message : null,
        dirty,
        onDiscard: discard,
      }}
      saved={{
        slug: code.slug,
        hasPassword: code.has_password,
        removePassword,
        onRemovePassword: setRemovePassword,
      }}
    />
  );
}
```

- [ ] **Step 4: Run the component tests and watch them pass.**
  Run: `npm test -- features/create/EditCodePage.test.tsx`
  Expected: PASS (7 tests).

- [ ] **Step 5: The route.** Create `app/(app)/codes/[id]/edit/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { withWorkspace } from "@/components/app/nav";
import { EditCodePage } from "@/features/create/EditCodePage";
import { isEditableType } from "@/features/create/load";
import { requireUser } from "@/lib/auth/server";
import { personAccess } from "@/lib/teams/server";

export const metadata: Metadata = { title: "Edit code · QuickQReate" };

/** A saved code in the Create editor: the owner and teammates who can edit; others see the code page. */
export default async function EditCodeRoute({ params, searchParams }: PageProps<"/codes/[id]/edit">) {
  const { id } = await params;
  const { workspace } = await searchParams;
  const { supabase, user } = await requireUser(`/codes/${id}/edit`);
  const { data: code } = await supabase.from("qr_codes").select("*").eq("id", id).maybeSingle();
  if (!code) notFound();
  const own = code.user_id === user.id;
  // A teammate's code opens inside that team, so the sidebar stays in their codes.
  if (!own && workspace !== code.user_id) {
    redirect(withWorkspace(`/codes/${id}/edit`, code.user_id));
  }
  const codeHref = withWorkspace(`/codes/${id}`, own ? null : code.user_id);
  const [access, { data: folders }] = await Promise.all([
    personAccess(supabase, user.id, code.user_id),
    supabase.from("folders").select("*").eq("user_id", code.user_id).order("name"),
  ]);
  if (!access?.canEdit || !isEditableType(code.qr_type)) redirect(codeHref);
  return (
    <EditCodePage
      code={code}
      folders={folders ?? []}
      mediaOwner={own ? null : code.user_id}
      codeHref={codeHref}
    />
  );
}
```

- [ ] **Step 6: Typecheck and build the route.**
  Run: `npm run typecheck && npm run lint && npm test -- features/create`
  Expected: typecheck exits 0, after `next typegen` generates `PageProps<"/codes/[id]/edit">`.
  Lint exits 0, and all `features/create` tests pass.

- [ ] **Step 7: Commit.**

```bash
git add features/create/EditCodePage.tsx features/create/EditCodePage.test.tsx "app/(app)/codes/[id]/edit/page.tsx"
git commit -m "Edit a saved code in the Create editor at /codes/<id>/edit

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: The code page becomes an overview

**Files:**
- Create: `features/codes/duplicate.ts`, `features/codes/duplicate.test.ts`
- Modify: `features/codes/list/CodesView.tsx` (its `duplicate` function)
- Modify: `features/codes/list/CodeActions.tsx` (add **Edit**), `features/codes/list/CodesView.test.tsx`
- Rename and rewrite: `features/dashboard/CodeEditor.tsx` → `features/dashboard/CodeOverview.tsx`
- Create: `features/dashboard/CodeOverview.test.tsx`
- Delete: `features/dashboard/AccessCard.tsx`
- Modify: `app/(app)/codes/[id]/page.tsx`

**Interfaces:**
- Produces:
  - `copyToMyCodes(code: QrCodeRow, opts: { fromTeammate: boolean }): Promise<Result<QrCodeRow>>`
  - `activeWindow(from: string | null, until: string | null, format: (iso: string) => string): string`
  - `CodeOverview(props: { code; canEdit; folders; back: { href; label }; editHref: string; fromTeammate: boolean })`

- [ ] **Step 1: Write the failing tests.**

  Create `features/codes/duplicate.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QrCodeRow } from "@/types/supabase";

import { duplicateCode } from "./api";
import { copyCodeMedia } from "./copyMedia";
import { copyToMyCodes } from "./duplicate";

vi.mock("./api", () => ({ duplicateCode: vi.fn() }));
vi.mock("./copyMedia", () => ({ copyCodeMedia: vi.fn() }));

const page = { id: "p1", qr_type: "links", content: { title: "Links" } } as unknown as QrCodeRow;
const link = { id: "l1", qr_type: "url", content: { url: "https://x.example" } } as unknown as QrCodeRow;

beforeEach(() => {
  vi.mocked(duplicateCode).mockReset().mockResolvedValue({ ok: true, value: { id: "copy" } as QrCodeRow });
  vi.mocked(copyCodeMedia).mockReset();
});

describe("copyToMyCodes", () => {
  it("copies your own code into its folder, without touching files", async () => {
    await copyToMyCodes(page, { fromTeammate: false });
    expect(copyCodeMedia).not.toHaveBeenCalled();
    expect(duplicateCode).toHaveBeenCalledWith(page, { keepFolder: true });
  });

  it("gives a teammate's hosted page its own copies of the files", async () => {
    vi.mocked(copyCodeMedia).mockResolvedValue({ ok: true, content: { title: "Links (copied)" } });
    await copyToMyCodes(page, { fromTeammate: true });
    expect(duplicateCode).toHaveBeenCalledWith(
      { ...page, content: { title: "Links (copied)" } },
      { keepFolder: false },
    );
  });

  it("stops when the files can't be copied", async () => {
    vi.mocked(copyCodeMedia).mockResolvedValue({ ok: false, error: "Sign in again, then try once more." });
    expect(await copyToMyCodes(page, { fromTeammate: true })).toEqual({
      ok: false,
      error: "Sign in again, then try once more.",
    });
    expect(duplicateCode).not.toHaveBeenCalled();
  });

  it("copies a teammate's link without its folder", async () => {
    await copyToMyCodes(link, { fromTeammate: true });
    expect(copyCodeMedia).not.toHaveBeenCalled();
    expect(duplicateCode).toHaveBeenCalledWith(link, { keepFolder: false });
  });
});
```

  Create `features/dashboard/CodeOverview.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { copyToMyCodes } from "@/features/codes/duplicate";
import { savedRow } from "@/features/create/fixtures";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { activeWindow, CodeOverview } from "./CodeOverview";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/features/codes/api", () => ({ updateCode: vi.fn(), deleteCode: vi.fn() }));
vi.mock("@/features/codes/duplicate", () => ({ copyToMyCodes: vi.fn() }));
vi.mock("@/features/folders/api", () => ({ moveCodes: vi.fn() }));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("@/features/generator/export/ExportPanel", () => ({ ExportPanel: () => null }));

const FOLDERS = [{ id: "f1", name: "Flyers" }] as FolderRow[];

function renderOverview(code: QrCodeRow, canEdit = true, fromTeammate = false) {
  return render(
    <ToastProvider>
      <CodeOverview
        code={code}
        canEdit={canEdit}
        folders={FOLDERS}
        back={{ href: "/codes", label: "All codes" }}
        editHref="/codes/c1/edit"
        fromTeammate={fromTeammate}
      />
    </ToastProvider>,
  );
}

beforeEach(() => push.mockReset());

describe("CodeOverview", () => {
  it("shows a trackable link at a glance, with Edit code for editors", () => {
    renderOverview(savedRow({ has_password: true, folder_id: "f1" }));
    expect(screen.getByRole("link", { name: /Edit code/ })).toHaveAttribute("href", "/codes/c1/edit");
    expect(screen.getByText("https://example.com/menu")).toBeInTheDocument();
    expect(screen.getByText("Password protected")).toBeInTheDocument();
    expect(screen.getByText("Always")).toBeInTheDocument();
    expect(screen.getByText("Flyers")).toBeInTheDocument();
    expect(screen.queryByLabelText("Destination URL")).toBeNull();
    expect(screen.queryByLabelText("Name")).toBeNull();
  });

  it("lets a viewer look but not change anything", () => {
    renderOverview(savedRow(), false, true);
    expect(screen.queryByRole("link", { name: /Edit code/ })).toBeNull();
    expect(screen.getByText(/You can view this code but not change it/)).toBeInTheDocument();
    for (const name of [/Duplicate/, /Move to folder/, /Delete/]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(screen.getByRole("switch", { name: "Active" })).toBeDisabled();
  });

  it("summarizes a static code's content and has no access card", () => {
    renderOverview(
      savedRow({ qr_type: "text", is_dynamic: false, slug: null, destination: null, content: { text: "Hello" } }),
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.queryByText("Password protected")).toBeNull();
    expect(screen.queryByText("No password")).toBeNull();
  });

  it("duplicates into your codes and opens the copy", async () => {
    vi.mocked(copyToMyCodes).mockResolvedValue({ ok: true, value: savedRow({ id: "c2", name: "Copy of Spring menu" }) });
    renderOverview(savedRow());
    await userEvent.click(screen.getByRole("button", { name: /Duplicate/ }));
    expect(copyToMyCodes).toHaveBeenCalledWith(expect.objectContaining({ id: "c1" }), { fromTeammate: false });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/codes/c2"));
  });
});

describe("activeWindow", () => {
  const fmt = (iso: string) => iso.slice(0, 10);
  it("puts the active dates in words", () => {
    expect(activeWindow(null, null, fmt)).toBe("Always");
    expect(activeWindow("2030-01-01T00:00:00Z", null, fmt)).toBe("From 2030-01-01");
    expect(activeWindow(null, "2030-02-01T00:00:00Z", fmt)).toBe("Until 2030-02-01");
    expect(activeWindow("2030-01-01T00:00:00Z", "2030-02-01T00:00:00Z", fmt)).toBe("2030-01-01 to 2030-02-01");
  });
});
```

  In `features/codes/list/CodesView.test.tsx`, in the test with editor rights that loops over
  `["Duplicate", "Move to folder", "Pause", "Delete"]`, add a check that
  `within(menu).getByRole("menuitem", { name: "Edit" })` links to `/codes/<id>/edit`. Use that
  test's own code id variable. In "viewers can open and download but not change codes", add
  `"Edit"` to the list of items that must be missing.

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- features/codes features/dashboard`
  Expected: FAIL. The new modules don't resolve (`./duplicate`, `./CodeOverview`), and the
  CodesView **Edit** check fails.

- [ ] **Step 3: `copyToMyCodes`.** Create `features/codes/duplicate.ts`:

```ts
import { isHostedPage } from "@/features/dashboard/codeRender";
import type { QrCodeRow } from "@/types/supabase";

import { duplicateCode, type Result } from "./api";
import { copyCodeMedia } from "./copyMedia";

/**
 * Copies a code into your own codes. Your own code keeps its folder. A teammate's hosted page
 * gets its own copies of the page's files first, so your copy never depends on their account.
 */
export async function copyToMyCodes(
  code: QrCodeRow,
  { fromTeammate }: { fromTeammate: boolean },
): Promise<Result<QrCodeRow>> {
  let source = code;
  if (fromTeammate && isHostedPage(code)) {
    const media = await copyCodeMedia(code.id);
    if (!media.ok) return { ok: false, error: media.error };
    source = { ...code, content: media.content as QrCodeRow["content"] };
  }
  return duplicateCode(source, { keepFolder: !fromTeammate });
}
```

  In `features/codes/list/CodesView.tsx`, change `duplicate` to use it, keeping the toasts and
  list updates:

```tsx
  async function duplicate(code: QrCodeRow) {
    // A teammate's code is copied into your own codes, so it doesn't join this list.
    const result = await copyToMyCodes(code, { fromTeammate: Boolean(teamId) });
    if (!result.ok) return toast(result.error, "error");
    if (teamId) {
      toast(`Copied “${code.name}” to your codes`);
    } else {
      setCodes((current) => [result.value, ...current]);
      toast(`Duplicated as “${result.value.name}”`);
    }
    changed();
  }
```

  Replace the now-unused imports (`duplicateCode`, `copyCodeMedia`, and `isHostedPage` if unused)
  with `import { copyToMyCodes } from "@/features/codes/duplicate";`.

- [ ] **Step 4: Edit in the list menu.** In `features/codes/list/CodeActions.tsx`:
  - import `Pencil` from `lucide-react`
  - right after the `Open` item, add:

```tsx
        {canEdit && (
          <MenuItem>
            <Link href={withWorkspace(`/codes/${code.id}/edit`, teamId)} className={menuItemClass}>
              <Pencil aria-hidden /> Edit
            </Link>
          </MenuItem>
        )}
```

- [ ] **Step 5: The overview.** Run
  `git mv features/dashboard/CodeEditor.tsx features/dashboard/CodeOverview.tsx` and
  `git rm features/dashboard/AccessCard.tsx`, then replace the contents of
  `features/dashboard/CodeOverview.tsx` with:

```tsx
"use client";

import { ArrowLeft, BarChart3, Copy, ExternalLink, FolderInput, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { deleteCode, updateCode } from "@/features/codes/api";
import { copyToMyCodes } from "@/features/codes/duplicate";
import { moveCodes } from "@/features/folders/api";
import { MoveDialog } from "@/features/folders/MoveDialog";
import { ExportPanel } from "@/features/generator/export/ExportPanel";
import { QrTile } from "@/features/generator/preview/QrTile";
import { DEFAULT_EXPORT } from "@/features/generator/state/defaults";
import { shortLink, shortLinkLabel } from "@/lib/env";
import { buildFilename, slugify } from "@/lib/qr/filename";
import { isPageType } from "@/lib/qr/types";
import { useInBrowser } from "@/lib/useInBrowser";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { codeRenderOptions, codeSummary, codeType, codeTypeLabel } from "./codeRender";
import { CopyButton } from "./CopyButton";
import { FeedbackResponses } from "./FeedbackResponses";
import { formatCount, relativeTime } from "./format";

/** When a trackable code works, in words: "Always", "From …", "Until …" or "… to …". */
export function activeWindow(
  from: string | null,
  until: string | null,
  format: (iso: string) => string,
): string {
  if (from && until) return `${format(from)} to ${format(until)}`;
  if (from) return `From ${format(from)}`;
  if (until) return `Until ${format(until)}`;
  return "Always";
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** A saved code at a glance: its link, scans, access and download. Changes happen in the editor. */
export function CodeOverview({
  code: initial,
  canEdit,
  folders,
  back,
  editHref,
  fromTeammate,
}: {
  code: QrCodeRow;
  canEdit: boolean;
  /** The code owner's folders. */
  folders: FolderRow[];
  /** The codes list this code lives in (yours, or a teammate's). */
  back: { href: string; label: string };
  /** The editor for this code. */
  editHref: string;
  /** A teammate's code: Duplicate copies it into your own codes. */
  fromTeammate: boolean;
}) {
  const isPage = isPageType(initial.qr_type);
  const router = useRouter();
  const toast = useToast();
  const inBrowser = useInBrowser();
  const [code, setCode] = useState(initial);
  const [exportSettings, setExportSettings] = useState(DEFAULT_EXPORT);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);

  const options = useMemo(
    () => codeRenderOptions(code, exportSettings.size),
    [code, exportSettings.size],
  );
  const extension = exportSettings.format === "jpeg" ? "jpg" : exportSettings.format;
  const filename = buildFilename(codeType(code), slugify(code.name), extension);
  const folderName = folders.find((folder) => folder.id === code.folder_id)?.name ?? "No folder";

  async function setActive(active: boolean) {
    setBusy("status");
    const result = await updateCode(code.id, { status: active ? "active" : "paused" });
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    setCode(result.value);
    toast(active ? (isPage ? "The page is live again" : "The code is live again") : "Paused");
    router.refresh();
  }

  async function duplicate() {
    setBusy("duplicate");
    const result = await copyToMyCodes(code, { fromTeammate });
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    toast(
      fromTeammate
        ? `Copied “${code.name}” to your codes`
        : `Duplicated as “${result.value.name}”`,
    );
    router.push(`/codes/${result.value.id}`);
  }

  async function move(folderId: string | null) {
    setBusy("move");
    const result = await moveCodes([code.id], folderId);
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    setCode({ ...code, folder_id: folderId });
    setMoving(false);
    toast(
      folderId
        ? `Moved to “${folders.find((folder) => folder.id === folderId)?.name}”`
        : "Removed from its folder",
    );
    router.refresh();
  }

  async function onDelete() {
    setBusy("delete");
    const result = await deleteCode(code.id);
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    toast(`Deleted “${code.name}”`);
    router.replace(back.href);
    router.refresh();
  }

  const shortLinkRow = code.slug ? (
    <div className="flex flex-wrap items-center gap-2 rounded-control bg-surface-2 px-3.5 py-2.5 text-sm">
      <span className="text-fg-muted">Short link</span>
      <span className="font-mono text-fg">{shortLinkLabel(code.slug)}</span>
      <CopyButton text={shortLink(code.slug)} />
      <a
        href={isPage ? `/p/${code.slug}` : shortLink(code.slug)}
        target="_blank"
        rel="noopener"
        className="ml-auto inline-flex items-center gap-1 font-medium text-link"
      >
        {isPage ? "View page" : "Test"} <ExternalLink aria-hidden className="size-3.5" />
      </a>
    </div>
  ) : null;

  const activeToggle = (
    <Toggle
      label="Active"
      description={
        code.status === "active"
          ? isPage
            ? "Scans open the page."
            : "Scans redirect to the destination."
          : "Paused: scanners see a “paused” notice and scans aren't counted."
      }
      checked={code.status === "active"}
      disabled={!canEdit || busy !== null}
      onChange={(active) => void setActive(active)}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" /> {back.label}
        </Link>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-bold tracking-tight text-fg">
              {code.name}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              {codeTypeLabel(code)} ·{" "}
              {isPage ? "Hosted page" : code.is_dynamic ? "Trackable" : "Static"} · Updated{" "}
              {relativeTime(code.updated_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Link href={editHref} className={buttonClasses("primary", "md")}>
                <Pencil aria-hidden /> Edit code
              </Link>
            )}
            {code.is_dynamic && (
              <Link href={`/codes/${code.id}/analytics`} className={buttonClasses("outline", "md")}>
                <BarChart3 aria-hidden /> Analytics
              </Link>
            )}
          </div>
        </div>
      </div>

      {!canEdit && (
        <p className="rounded-control bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          You can view this code but not change it. Ask the code’s owner to make you an editor.
        </p>
      )}

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {isPage && (
            <Card>
              <CardHeader
                title="Hosted page"
                description="Edit the code to change the page. Printed codes always open the latest version."
              />
              <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
                {shortLinkRow}
                {activeToggle}
              </div>
            </Card>
          )}

          {code.is_dynamic && !isPage && (
            <Card>
              <CardHeader
                title="Where it points"
                description="Edit the code to change where it goes. Printed codes update instantly."
              />
              <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
                {shortLinkRow}
                {code.destination && (
                  <p className="text-sm">
                    <span className="text-fg-muted">Goes to </span>
                    <a
                      href={code.destination}
                      target="_blank"
                      rel="noopener"
                      className="break-all font-medium text-link"
                    >
                      {code.destination}
                    </a>
                  </p>
                )}
                {activeToggle}
              </div>
            </Card>
          )}

          {!code.is_dynamic && (
            <Card>
              <CardHeader
                title="Content"
                description="Static codes contain their content directly, so printed copies can't change."
              />
              <div className="px-5 pt-4 pb-6 sm:px-6">
                <p className="rounded-control bg-surface-2 px-3.5 py-2.5 text-sm break-words text-fg">
                  {codeSummary(code)}
                </p>
              </div>
            </Card>
          )}

          {code.is_dynamic && (
            <Card>
              <CardHeader title="Access" />
              <dl className="grid gap-4 px-5 pt-4 pb-6 text-sm sm:grid-cols-2 sm:px-6">
                <div className="flex flex-col gap-1">
                  <dt className="text-fg-muted">Password</dt>
                  <dd className="font-medium text-fg">
                    {code.has_password ? "Password protected" : "No password"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-fg-muted">Active dates</dt>
                  <dd className="font-medium text-fg">
                    {inBrowser
                      ? activeWindow(code.active_from, code.active_until, formatDate)
                      : "…"}
                  </dd>
                </div>
              </dl>
            </Card>
          )}

          {code.qr_type === "feedback" && <FeedbackResponses codeId={code.id} />}

          <Card>
            <CardHeader title="Details" />
            <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-fg-muted">Folder</dt>
                  <dd className="font-medium text-fg">{folderName}</dd>
                </div>
                {code.is_dynamic && (
                  <div className="flex flex-col gap-1">
                    <dt className="text-fg-muted">Scans</dt>
                    <dd className="font-medium text-fg">
                      {formatCount(code.scan_count)} {code.scan_count === 1 ? "scan" : "scans"} ·
                      last scanned {relativeTime(code.last_scanned_at).toLowerCase()}
                    </dd>
                  </div>
                )}
              </dl>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void duplicate()}
                    disabled={busy !== null}
                  >
                    <Copy aria-hidden /> Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setMoving(true)}
                    disabled={busy !== null || (folders.length === 0 && !code.folder_id)}
                  >
                    <FolderInput aria-hidden /> Move to folder
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-danger"
                    onClick={() => setConfirmDelete(true)}
                    disabled={busy !== null}
                  >
                    <Trash2 aria-hidden /> Delete code
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className="md:sticky md:top-20 lg:top-24">
          <Card id="download" className="scroll-mt-6">
            <CardHeader title="Download" />
            <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
              <QrTile
                options={options}
                summary={code.name}
                emptyHint=""
                className="mx-auto w-full max-w-[18rem]"
              />
              <ExportPanel
                options={options}
                settings={exportSettings}
                filename={filename}
                blocker={null}
                dispatch={(action) => {
                  if (action.type === "setExport")
                    setExportSettings((settings) => ({ ...settings, ...action.patch }));
                }}
              />
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${code.name}”?`}
        description={
          code.is_dynamic
            ? "The short link stops working and its scan history is deleted. Printed copies of this code will show “not set up”."
            : "This removes the saved code from your account. Downloaded copies keep working."
        }
        confirmLabel="Delete"
        danger
        pending={busy === "delete"}
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />
      <MoveDialog
        open={moving}
        count={1}
        folders={folders}
        current={code.folder_id}
        pending={busy === "move"}
        onMove={(folderId) => void move(folderId)}
        onClose={() => setMoving(false)}
      />
    </div>
  );
}
```

  The header says "Trackable" where the old page said "Dynamic", which is the glossary word.

- [ ] **Step 6: The code page renders it.** Replace the body of
  `app/(app)/codes/[id]/page.tsx` after the access lookups:

```tsx
  const own = code.user_id === user.id;
  return (
    <CodeOverview
      code={code}
      canEdit={access?.canEdit ?? false}
      folders={folders ?? []}
      back={{
        href: codesHref(code.user_id, user.id),
        label: access?.person ? `${personLabel(access.person)}’s codes` : "All codes",
      }}
      editHref={withWorkspace(`/codes/${id}/edit`, own ? null : code.user_id)}
      fromTeammate={!own}
    />
  );
```

  Then swap the import to `import { CodeOverview } from "@/features/dashboard/CodeOverview";`
  and change the metadata title to `"Code · QuickQReate"`.

- [ ] **Step 7: Run them and watch them pass.**
  Run: `npm test -- features/codes features/dashboard && npm run typecheck && npm run lint`
  Expected: PASS for the new and existing tests. Typecheck and lint exit 0, and nothing still
  imports `AccessCard` or `CodeEditor`. Check with
  `git grep -n "AccessCard\|dashboard/CodeEditor"`; expected: no output.

- [ ] **Step 8: Commit.**

```bash
git add -A features/codes features/dashboard "app/(app)/codes/[id]/page.tsx"
git commit -m "Make the code page an overview with Edit code; edits happen in the editor

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Old paths: `/?edit=` forwards, and the home generator's edit mode goes

**Files:**
- Create: `lib/redirects.ts`, `lib/redirects.test.ts`
- Modify: `proxy.ts`
- Modify: `features/generator/useGenerator.ts`, `features/generator/useGenerator.test.tsx`,
  `features/generator/Generator.tsx`, `features/generator/SavePanel.tsx`
- Delete: `features/generator/editTransition.ts`, `features/generator/editTransition.test.ts`
- Modify: `app/(app)/codes/[id]/analytics/page.tsx` (the "Create a trackable code" link)

**Interfaces:**
- Produces: `editRedirect(url: URL): URL | null`.
- `useGenerator().save(name)` now returns
  `Promise<{ ok: true; message: string; id: string } | { ok: false; message: string }>`.
- `useGenerator()` no longer returns `saved` or `startNew`. It still returns `workspace: null`
  (for `ContentEditor`) and `slug: null`.

- [ ] **Step 1: Write the failing tests.** Create `lib/redirects.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { editRedirect } from "./redirects";

const at = (path: string) => new URL(path, "https://qr.example");

describe("editRedirect", () => {
  it("sends the old home-page edit address to the code's editor", () => {
    expect(editRedirect(at("/?edit=abc-123"))?.toString()).toBe("https://qr.example/codes/abc-123/edit");
  });

  it("leaves everything else alone", () => {
    expect(editRedirect(at("/"))).toBeNull();
    expect(editRedirect(at("/?type=wifi"))).toBeNull();
    expect(editRedirect(at("/?edit="))).toBeNull();
    expect(editRedirect(at("/codes?edit=abc"))).toBeNull();
  });

  it("keeps odd characters from escaping the path", () => {
    expect(editRedirect(at("/?edit=..%2Fsettings"))?.pathname).toBe("/codes/..%2Fsettings/edit");
  });
});
```

  In `features/generator/useGenerator.test.tsx`:
  - delete the tests "a save that finishes after New code does not reopen the old code" and
    "a teammate's code that finishes loading after you left is not opened"
  - delete the `codes` fixture, `savedCode`, `TEAM`, `deferred`, the `@/lib/supabase/client`
    mock, and the `@/features/teams/workspace` mock and import, since nothing uses them any more
  - in "new codes always save to your own account, whatever ?workspace= says", delete the line
    `expect(editableWorkspace).not.toHaveBeenCalled();` and keep the `workspace` check
  - rename the describe to `"useGenerator"`
  - add, with `createCode` imported from `@/features/codes/api` (it's already mocked there):

```ts
  it("saving a new code reports its id, for opening its page", async () => {
    vi.mocked(createCode).mockResolvedValue({ ok: true, value: { id: "new-1", name: "Poster" } } as never);
    const { result } = renderHook(() => useGenerator());
    act(() => result.current.setField("url", "url", "example.com"));
    let outcome: Awaited<ReturnType<typeof result.current.save>> | undefined;
    await act(async () => {
      outcome = await result.current.save("Poster");
    });
    expect(outcome).toEqual({ ok: true, id: "new-1", message: "Saved “Poster” to your codes." });
    expect(result.current).not.toHaveProperty("saved");
  });

  it("ignores the old ?edit= address (it is forwarded before the page loads)", async () => {
    search = new URLSearchParams("edit=abc");
    const { result } = renderHook(() => useGenerator());
    await act(async () => {});
    expect(result.current.state.content.url.url).toBe("");
  });
```

- [ ] **Step 2: Run them and watch them fail.**
  Run: `npm test -- lib/redirects.test.ts features/generator`
  Expected: FAIL. `./redirects` doesn't resolve; `save` returns no `id`; `saved` is still a
  property.

- [ ] **Step 3: The redirect.** Create `lib/redirects.ts`:

```ts
/** /?edit=<id> was the old way to edit a saved code; it now opens the code in the editor. */
export function editRedirect(url: URL): URL | null {
  if (url.pathname !== "/") return null;
  const id = url.searchParams.get("edit");
  if (!id) return null;
  return new URL(`/codes/${encodeURIComponent(id)}/edit`, url.origin);
}
```

  In `proxy.ts`:
  - import `editRedirect` from `@/lib/redirects`
  - after the `/R/` rewrite block, add:

```ts
  // Old bookmarks and links to the home page's edit mode open the code in the editor.
  const edit = editRedirect(request.nextUrl);
  if (edit) return NextResponse.redirect(edit, 308);
```

  - add `"/"` as the first entry of `config.matcher`

- [ ] **Step 4: Remove the generator's edit mode.**
  - **`features/generator/useGenerator.ts`:**
    - delete the `SavedCode` interface; the `saved`, `workspace` and `savedIdRef` state; the whole
      `editId` effect; and `startNew`
    - delete the imports `updateCode`, `editableWorkspace`, `Workspace`, `getBrowserSupabase` and
      `editTransition`
    - keep `useSearchParams`, `removeKey` and the `LEGACY_SETTINGS_KEY` effect
    - the `?type=` effect becomes:

```ts
  // /?type=wifi (from the Codes page's quick starts) opens a new code of that type.
  useEffect(() => {
    if (typeParam && isCodeType(typeParam)) {
      dispatch({ type: "setActiveType", activeType: typeParam });
    }
  }, [typeParam]);
```

    - `isDynamic` becomes `pageType !== null || (wantsDynamic && activeType === "url")`
    - `slug` becomes `PREVIEW_SLUG`
    - in `blocker`, `isDynamic && !saved` becomes `isDynamic`
    - `save` becomes:

```ts
  /** Saves a new code to your account. Its page opens next, where it can be changed later. */
  const save = useCallback(
    async (
      name: string,
    ): Promise<{ ok: true; message: string; id: string } | { ok: false; message: string }> => {
      const label = name.trim() || defaultName;
      const { droppedLogo } = designForStorage(design);
      const note = droppedLogo ? " The logo was too large to store and was left out." : "";
      const result = await createCode({
        name: label,
        qrType: activeType,
        content: pageType ? page : values,
        design,
        dynamic: pageType ? { destination: null } : isDynamic ? { destination } : undefined,
      });
      if (!result.ok) return { ok: false, message: result.error };
      return {
        ok: true,
        id: result.value.id,
        message: `Saved “${result.value.name}” to your codes.${note}`,
      };
    },
    [design, destination, values, page, pageType, activeType, isDynamic, defaultName],
  );
```

    - in the returned object, remove `saved` and `startNew`, set `slug: null`, and set
      `workspace: null as { ownerId: string } | null`. Keep every other key.
  - **`features/generator/Generator.tsx`:**
    - `const { state, dispatch, report, isDynamic } = generator;`
    - CardHeader `title="What should it open?"` and
      `description="Pick a type, then fill in the details."`
    - remove `disabled` from `TypePicker`
    - DynamicToggle gets `slug={null}` and `locked={false}`
  - **`features/generator/SavePanel.tsx`:**
    - import `useRouter` from `next/navigation`
    - delete the `saved` and `workspace` uses
    - `onSubmit` becomes:

```tsx
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await save(name);
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok) {
      router.push(`/codes/${result.id}`);
      return;
    }
    setPending(false);
  }
```

    - the Field label is `"Save to my codes"`; the placeholder is `defaultName`
    - the button variant is `isDynamic ? "primary" : "outline"`; the text is
      `pending ? "Saving…" : "Save"`
    - delete the short-link line and the `saved && (…)` block, and the now-unused imports
      (`Check`, `LayoutGrid`, `Plus`, `Users`, `shortLinkLabel`, `buttonClasses` if unused)
    - keep the signed-out prompt as it is
  - Delete `features/generator/editTransition.ts` and `features/generator/editTransition.test.ts`
    with `git rm`.
  - In `app/(app)/codes/[id]/analytics/page.tsx`, change `<Link href="/" …>Create a trackable
    code</Link>` to `href="/codes/new?type=url"`.

- [ ] **Step 5: Run them and watch them pass.**
  Run: `npm test && npm run typecheck && npm run lint`
  Expected: the whole unit suite passes, and typecheck and lint exit 0.
  `git grep -n "editTransition\|startNew\|?edit="` prints only the forward in `lib/redirects.ts`
  and its test, and docs.

- [ ] **Step 6: Commit.**

```bash
git add -A lib/redirects.ts lib/redirects.test.ts proxy.ts features/generator "app/(app)/codes/[id]/analytics/page.tsx"
git commit -m "Forward /?edit= to the editor and retire the home page's edit mode

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Signed-in browser tests

**Files:**
- Create: `e2e/accounts/edit.spec.ts`
- Modify: `e2e/accounts/app.spec.ts` (add the page), `e2e/accounts/teams.spec.ts` (wording)

**Interfaces:**
- Consumes: the seed (`seed().menuId`, `seed().ownerId`) and `MAKER`, `OWNER`, `VIEWER` from
  `e2e/accounts/fixtures.ts`.

- [ ] **Step 1: Write the browser tests.** Create `e2e/accounts/edit.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

import { MAKER, VIEWER, seed } from "./fixtures";

const preview = (page: Page) => page.getByRole("complementary", { name: "Preview" });

/** Creates a trackable code as the signed-in person and returns its id. */
async function createCode(page: Page, name: string, address: string) {
  await page.goto("codes/new");
  await page.getByLabel("Website address").fill(address);
  await page.getByLabel("Code name").fill(name);
  await preview(page).getByRole("button", { name: "Create code" }).click();
  await expect(page).toHaveURL(/\/codes\/[0-9a-f-]+#download$/);
  return new URL(page.url()).pathname.split("/")[2]!;
}

test.describe("editing a saved code", () => {
  test.use({ storageState: MAKER.state });

  test("opens in the Create editor, and changes to content, design, dates and name stick", async ({ page }) => {
    const id = await createCode(page, "Edit me", "https://example.com/edit");
    await page.getByRole("link", { name: "Edit code" }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/${id}/edit$`));
    await expect(page.getByRole("navigation", { name: "Main" }).first()).toBeVisible();
    await expect(page.getByLabel("Website address")).toHaveValue("https://example.com/edit");
    await expect(preview(page).getByRole("button", { name: "Save changes" })).toBeDisabled();

    await page.getByLabel("Website address").fill("https://example.com/edited");
    await page.getByRole("button", { name: /^Colors/ }).click();
    await page.getByLabel("Background", { exact: true }).fill("#FFF7E6");
    await page.getByLabel("Ends").fill("2031-01-01T09:00");
    await page.getByLabel("Code name").fill("Edited poster");
    await preview(page).getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/codes/${id}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Edited poster" })).toBeVisible();
    await expect(page.getByText("https://example.com/edited")).toBeVisible();

    await page.goto(`codes/${id}/edit`);
    await expect(page.getByLabel("Website address")).toHaveValue("https://example.com/edited");
    await expect(page.getByLabel("Ends")).toHaveValue("2031-01-01T09:00");
    await page.getByRole("button", { name: /^Colors/ }).click();
    await expect(page.getByLabel("Background", { exact: true })).toHaveValue(/^#fff7e6$/i);
  });

  test("the old home-page edit address forwards to the editor", async ({ page }) => {
    const id = await createCode(page, "Old link", "https://example.com/old");
    await page.goto(`/?edit=${id}`);
    await expect(page).toHaveURL(new RegExp(`/codes/${id}/edit$`));
    await expect(page.getByRole("heading", { level: 1, name: "Edit code" })).toBeVisible();
  });

  test("asks before leaving unsaved changes", async ({ page }) => {
    const id = await createCode(page, "Unsaved", "https://example.com/unsaved");
    await page.goto(`codes/${id}/edit`);
    await page.getByLabel("Code name").fill("Unsaved 2");

    page.once("dialog", (dialog) => void dialog.dismiss());
    await page.getByRole("link", { name: /Back to Unsaved/ }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/${id}/edit$`));
    await expect(page.getByLabel("Code name")).toHaveValue("Unsaved 2");

    page.once("dialog", (dialog) => void dialog.dismiss());
    await page.evaluate(() => window.history.back());
    await expect(page).toHaveURL(new RegExp(`/codes/${id}/edit$`));
    await expect(page.getByLabel("Code name")).toHaveValue("Unsaved 2");

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("link", { name: /Back to Unsaved/ }).click();
    await expect(page).toHaveURL(new RegExp(`/codes/${id}$`));
  });
});

test.describe("a viewer", () => {
  test.use({ storageState: VIEWER.state });

  test("can't open a teammate's code in the editor", async ({ page }) => {
    const { menuId, ownerId } = seed();
    await page.goto(`codes/${menuId}/edit?workspace=${ownerId}`);
    await expect(page).toHaveURL(new RegExp(`/codes/${menuId}\\?workspace=${ownerId}$`));
    await expect(page.getByText(/You can view this code but not change it/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit code" })).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Add the page to the sweep and fix the wording.**
  - In `e2e/accounts/app.spec.ts`, add `"codes/{menu}/edit"` to `PAGES` right after
    `"codes/{menu}"`.
  - In `e2e/accounts/teams.spec.ts`, change both `/view-only access/` regexes to
    `/can view this code but not change it/`.

- [ ] **Step 3: Build and run both browser suites.**
  - Run: `npm run build && npm run test:e2e`
    Expected: the public suite passes. The home page generator still works signed out.
  - Run: `npm run test:e2e:accounts`
    Expected: the signed-in suite passes, including the 4 new tests in `edit.spec.ts`,
    `/codes/{menu}/edit` at 390, 820 and 1280 px with no axe violations, and the updated viewer
    test.
  - If one step fails, work out why with superpowers:systematic-debugging before changing the
    test. For example, the Back test can fail if the router changes history while it handles the
    guard's copy entry. Record any change in the ledger as a ruling.

- [ ] **Step 4: Commit.**

```bash
git add e2e/accounts/edit.spec.ts e2e/accounts/app.spec.ts e2e/accounts/teams.spec.ts
git commit -m "Check editing in the browser: changes stick, old links forward, viewers bounce, leaving asks

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Docs, the live migration and release

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md` (Phase 4 row and
  section 4.3 note)

- [ ] **Step 1: Note the change in the redesign spec.** In
  `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md`:
  - in the Phase 4 row of the Phases table, replace "Code page with tabs and the Save bar" with:

    > Code page overview polish (editing moved to the Create editor in Ziplume Release 1, see
    > `2026-10-14-ziplume-rebrand-design.md`)

    and replace "`/?edit=` redirect goes live" with "(`/?edit=` already forwards to
    `/codes/<id>/edit`)"
  - at the top of section 4.3, add one line:

    > Superseded in part: content, design and settings are edited in the Create editor at
    > `/codes/<id>/edit` (Ziplume Release 1). The code page is an overview.

  Commit:

```bash
git add docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md
git commit -m "Note in the redesign spec that editing moved to the Create editor

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 2: Full local check.**
  Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e && npm run test:e2e:accounts`
  Expected: everything passes. Then send the branch through the final whole-branch review
  (executing-plans, "Final Review") before anything goes live.

- [ ] **Step 3: Back up, then apply the migration live.** This only happens after the final
  review's fixes are in.
  - Take and verify a backup of the QuickQReate project, as at earlier phases: run the server
    backup helper and confirm the off-server verification. Skip a new backup only if the latest
    verified one is newer than the last schema change and the runbook says so.
  - Through the SQL bridge, with project UUID `db12f7ce-3e77-4461-a686-c8cd6de6f764`, run the
    migration file's contents exactly. It contains no backslashes. Then run
    `notify pgrst, 'reload schema';`.
  - Verify with these read-only queries:
    - `select count(*) from pg_proc where proname = 'update_code' and prosecdef = false;`
      → 1
    - `select has_function_privilege('anon', 'public.update_code(uuid, jsonb, text, text)', 'execute');`
      → f
    - `select has_function_privilege('authenticated', 'public.update_code(uuid, jsonb, text, text)', 'execute');`
      → t
  - Append an entry to `~/.codex/memories/supabase-coolify.md`: the migration name, the backup
    id, the time, and the three checks.

- [ ] **Step 4: Release.** Use superpowers:finishing-a-development-branch:
  - push `feat/edit-in-editor` and open a PR to `main`
  - after the two CI jobs ("Lint, test & build", "Signed-in browser tests") are green, merge
  - watch for the new build id in `https://qr.techitdave.com/login`'s HTML (`"b":"…"`) to
    confirm Coolify deployed it

- [ ] **Step 5: Live check, read-only, in the signed-in Chrome tab.** Pick an existing code in the
  signed-in account. Check that:
  - `/codes/<id>` shows the overview with **Edit code**
  - **Edit code** opens `/codes/<id>/edit` with the sidebar and the fields filled in
  - **Save changes** is disabled until something changes; leave without saving, accepting the
    prompt
  - `/?edit=<id>` forwards to the editor

  Make no saves in David's account; the browser tests cover saving.

- [ ] **Step 6: Record it.** Update the memory files `quickqreate-go-live-status.md` and
  `ziplume-rebrand.md` with the shipped release (PR, merge commit, migration), the deferred
  minors, and "next: Release 2 plan".
