# Phase 3b: switching between people, Everyone, and Private codes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** People in a team can switch between each other's codes from a row on `/codes` and an Everyone view that shows who made each code. They can mark their own codes Private. Someone on their own sees none of this. Content uploads that finish later no longer overwrite edits made meanwhile, which release 3b's review carried over and David asked for on 2026-10-16.

**Architecture:** Phase 3a already shipped the sharing rules in the database, including the `is_private` column, and the Team page. This phase:
- Adds one small migration, so `create_code` and `update_code` save Private in the same step as the rest of a code.
- Adds a pure `codesScope` helper that reads `?workspace=` and `?view=everyone`.
- Has `CodesView` work out each code's rights from who made it, instead of one flag for the whole page.
- Adds three components: a switch row, a one-time joined tip and a Private card.

**Tech Stack:**
- Next.js 16 App Router with server components.
- React 19 and Tailwind 4.
- Headless UI 2.2 Menu.
- Supabase: RLS plus security-invoker functions.
- Vitest with jsdom, and PGlite for the database.
- Playwright: signed-in suite with local Supabase.

**Spec:** `docs/superpowers/specs/2026-10-14-quickqreate-teams-design.md`, sections 3, 5, 6, 8, 10 and 11. Phase 3a's plan is `docs/superpowers/plans/2026-10-14-phase-3a-teams.md`. Its migration `20261014170000_teams.sql` is live.

## Global Constraints

- **Solo accounts:** "No team UI at all: no switch row, no Private switch, no 'Created by', no role labels." (spec 2)
- **Private codes:** "visible only to the person who made them, the owner included. They never appear in teammates' lists, counts, scan summaries or the Everyone view." (spec 3) The database already enforces this. The app must never send `is_private` for a teammate's code.
- **Creating** "always puts the code in your own space." (spec 3)
- **Switch row:** "You · each teammate (photo and first name) · Everyone. On phones it scrolls sideways, with 44px targets. The heading tells you what you can do there: 'Alex's codes · You can view these' or '· You can edit these'." (spec 5)
- **Everyone** (`/codes?view=everyone`): "a 'Created by' photo and name on each row and tile. Each code's actions follow the role rules above. The sidebar's folder list is hidden here." (spec 5)
- **Joined tip:** "Accepting an invite opens `/codes?joined=1`. Once, it shows: 'You're in David's team now. Switch between people here.' It points at the switch row. Nothing is stored for it." (spec 5)
- **Links:** "`?workspace=<person id>` keeps meaning 'this person's codes'." (spec 5)
- **Private switch:** "in Settings on the Create page and the code page, only when you're in a team. It reads: 'Private: only you can see this code.'" Bulk create has no Private option. If you leave a team, the switch is hidden and the stored flag stays harmlessly. (spec 6)
- **Lock badge:** "a lock badge on the code in your own list, when you're in a team." (spec 6)
- **Copy style:** curly apostrophes (’) in UI text, as the app already uses.
- **Migrations:**
  - no backslashes;
  - a verified backup from the last 24 hours first;
  - applied through the private SQL bridge with project UUID `db12f7ce-3e77-4461-a686-c8cd6de6f764` **before merging**;
  - recorded in `~/.codex/memories/supabase-coolify.md`.
- **Accessibility:** the changed pages pass axe in light and dark at 390, 820 and 1280px, with no sideways page scroll. Targets on phones are 44px.

## Rulings made in this plan (for David's review)

1. **The Private badge reads "Private" with an eye-off icon.** In the list, a lock already means "Password protected".
2. **The Private switch shows only on your own codes.** Editing a teammate's code never shows it, because the database won't let anyone make someone else's code private.
3. **Duplicating a private code makes a private copy.** Only the maker can see a private code, so only they can copy it.
4. **Everyone shows Create code and Bulk create,** since those go to your own codes, which Everyone includes. A teammate's view still has no create buttons.
5. **"Created by you"** on your own codes in Everyone. Teammates appear by first name.
6. **First names.** A teammate with no name appears by their email's name part, e.g. "sam.lee", in the switch row and "Created by".
7. **Everyone's heading** says "You can edit these" for owners and editors. For viewers it says "You can view teammates’ codes and edit your own".
8. **Bulk actions in Everyone appear only when you may change every selected code.** Move also needs them all to be one person's, because folders belong to one person.

## Review Focus

1. **A mixed selection in Everyone.** Your code plus a teammate's, as a viewer: no Move, Pause or Delete. As an owner: Delete yes, Move no, because the two belong to different people. *Task 4 test.*
2. **A stale address.** `?workspace=` for someone who left, or `?view=everyone` on your own, shows your own codes and no team parts. *Task 3 test.*
3. **A teammate's code in the editor never shows the Private switch,** and a solo person's restored draft that had Private on is never sent as private. *Task 2 tests, plus the Task 6 browser test on the edit page.*
4. **A teammate with no name** shows the email's name part, not the whole address, in the switch row and "Created by". *Task 3 test.*
5. **Many teammates on a 320px phone.** The switch row scrolls inside itself, never the page. *Task 5 sets the classes, and Task 6's sweep checks `/codes` at 390px. The reviewer checks narrower widths.*

---

### Task 1: Save Private with the code (migration)

**Files:**
- Create: `supabase/migrations/20261015200000_private_codes.sql`
- Test: `supabase/test/migration.test.ts`, as a new `describe` at the end

**Interfaces:**
- Produces:
  - `create_code(p_code jsonb, p_password text)` reads `p_code ->> 'is_private'`, defaulting to false.
  - `update_code(p_id, p_patch, p_password, p_password_action)` accepts the key `is_private`.

- [ ] **Step 1: Create the branch and commit this plan.**

```bash
git checkout -b feat/team-views main
git add docs/superpowers/plans/2026-10-15-phase-3b-team-views.md
git commit -m "Plan Phase 3b: switching between people, Everyone, and Private codes"
```

- [ ] **Step 2: Write the failing database tests.** Append this to `supabase/test/migration.test.ts`:

```ts
describe("private codes from the editor", () => {
  const ABE = "4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a"; // owner
  const CAL = "4b4b4b4b-4b4b-4b4b-8b4b-4b4b4b4b4b4b"; // editor on Abe's team
  const asAbe = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", ABE, sql, params);
  const asCal = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", CAL, sql, params);
  const CREATE = "select * from public.create_code($1::jsonb, $2)";
  const UPDATE = "select * from public.update_code($1::uuid, $2::jsonb, $3, $4)";
  const note = (name: string, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ name, qr_type: "text", content: { text: "hi" }, ...extra });
  const seenByAbe = async (id: string) =>
    (await asAbe<{ id: string }>("select id from public.qr_codes where id = $1", [id])).length;

  beforeAll(async () => {
    await db.query(
      "insert into auth.users (id, email) values ($1, 'abe@example.com'), ($2, 'cal@example.com')",
      [ABE, CAL],
    );
    await asService(
      "insert into public.team_members (owner_id, member_id, role) values ($1, $2, 'editor')",
      [ABE, CAL],
    );
  });

  it("creates a private code that only its maker sees", async () => {
    const [made] = await asCal<{ id: string; is_private: boolean }>(CREATE, [
      note("Cal diary", { is_private: true }),
      null,
    ]);
    expect(made!.is_private).toBe(true);
    expect(await seenByAbe(made!.id)).toBe(0);
  });

  it("creates a shared code when Private is left out", async () => {
    const [made] = await asCal<{ id: string; is_private: boolean }>(CREATE, [
      note("Cal flyer"),
      null,
    ]);
    expect(made!.is_private).toBe(false);
    expect(await seenByAbe(made!.id)).toBe(1);
  });

  it("turns Private on and off in an update, with the other changes", async () => {
    const [made] = await asCal<{ id: string }>(CREATE, [note("Cal poster"), null]);
    const [hidden] = await asCal<{ is_private: boolean; name: string }>(UPDATE, [
      made!.id,
      JSON.stringify({ is_private: true, name: "Cal poster v2" }),
      null,
      "keep",
    ]);
    expect(hidden).toMatchObject({ is_private: true, name: "Cal poster v2" });
    expect(await seenByAbe(made!.id)).toBe(0);
    await asCal(UPDATE, [made!.id, JSON.stringify({ is_private: false }), null, "keep"]);
    expect(await seenByAbe(made!.id)).toBe(1);
  });

  it("won't let a teammate make someone else's code private", async () => {
    const [made] = await asCal<{ id: string }>(CREATE, [note("Cal sign"), null]);
    await expect(
      asAbe(UPDATE, [made!.id, JSON.stringify({ is_private: true }), null, "keep"]),
    ).rejects.toThrow(/row-level security|Not allowed/);
    const [row] = await asService<{ is_private: boolean }>(
      "select is_private from public.qr_codes where id = $1",
      [made!.id],
    );
    expect(row!.is_private).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests and watch them fail.**

Run: `npx vitest run supabase/test/migration.test.ts -t "private codes from the editor"`
Expected: 4 FAIL.
- The first expects `is_private` true and gets false.
- The update tests fail with "Unknown field: is_private", which matches neither `row-level security` nor `Not allowed`.

- [ ] **Step 4: Write the migration.** Create `supabase/migrations/20261015200000_private_codes.sql`. It copies the two functions from `20261014160000_create_code.sql` and `20261014180000_update_code.sql`, adding `is_private`. Keep the file free of backslashes.

```sql
-- Private codes from the editor (Phase 3b of the teams spec): create_code and update_code take
-- is_private, so marking a code Private saves in the same step as the rest of it.
--
-- Both still run as the caller (security invoker), so the teams rules hold: only the maker sees
-- or changes a private code, and a teammate who may edit a code can't make it private (the
-- update's check fails, because a private code must be the caller's own).
create or replace function public.create_code(p_code jsonb, p_password text default null)
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
    folder_id, active_from, active_until, is_private
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
    nullif(p_code ->> 'active_until', '')::timestamptz,
    coalesce((p_code ->> 'is_private')::boolean, false)
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

create or replace function public.update_code(
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
     'name', 'content', 'design', 'destination', 'slug', 'folder_id', 'active_from',
     'active_until', 'is_private'
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
           then nullif(v_patch ->> 'active_until', '')::timestamptz else c.active_until end,
         is_private = case when v_patch ? 'is_private'
           then coalesce((v_patch ->> 'is_private')::boolean, c.is_private) else c.is_private end
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

- [ ] **Step 5: Run the database tests and watch them pass.**

Run: `npx vitest run supabase/test/migration.test.ts`
Expected: everything passes. That includes the earlier `create_code`, `update_code` and teams describes, which shows that nothing they cover changed.

Run: `grep -c '\\' supabase/migrations/20261015200000_private_codes.sql`
Expected: `0`.

- [ ] **Step 6: Commit.**

```bash
git add supabase/migrations/20261015200000_private_codes.sql supabase/test/migration.test.ts
git commit -m "Save Private with the rest of a code in create_code and update_code"
```

---

### Task 2: The Private switch in the editor

**Files:**
- Modify:
  - `features/create/state.ts` (CreateSettings)
  - `features/create/draft.ts` (keep the setting in drafts)
  - `features/create/submit.ts` (toNewCode, toCodePatch)
  - `features/create/load.ts` (fromSavedCode)
  - `features/codes/api.ts` (NewCode, CodeUpdate, createCode, createCodeWithSettings, updateCodeWithSettings, duplicateCode)
  - `features/create/EditorLayout.tsx` (the `canBePrivate` prop)
  - `features/create/CreatePage.tsx` (the `inTeam` prop)
  - `features/create/EditCodePage.tsx` (the `canBePrivate` prop)
  - `app/(app)/codes/new/page.tsx`
  - `app/(app)/codes/[id]/edit/page.tsx`
- Create: `features/create/sections/PrivateSection.tsx`
- Test:
  - `features/create/submit.test.ts`
  - `features/create/load.test.ts`
  - `features/create/draft.test.ts`
  - `features/codes/api.test.ts`
  - `features/create/EditorLayout.test.tsx`

**Interfaces:**
- Consumes: Task 1's `is_private` in `create_code` and `update_code`.
- Produces:
  - `CreateSettings.isPrivate: boolean`, default false.
  - `NewCode.isPrivate?: boolean`.
  - `CodeUpdate.isPrivate?: boolean`.
  - `toNewCode(state, ownerId, name, { canBePrivate }?)`.
  - `EditorLayout` prop `canBePrivate?: boolean`.
  - `CreatePageProps.inTeam: boolean`.
  - `EditCodePageProps.canBePrivate: boolean`.

- [ ] **Step 1: Write the failing tests.**

In `features/create/submit.test.ts`, inside `describe("toNewCode")`:

```ts
  it("marks a code Private only where Private can be set", () => {
    const secret = run(withLink, { type: "settings", patch: { isPrivate: true } });
    expect(toNewCode(secret, null, "Menu", { canBePrivate: true }).input.isPrivate).toBe(true);
    // Someone who left their team may still have it on in a draft; it isn't sent.
    expect(toNewCode(secret, null, "Menu").input).not.toHaveProperty("isPrivate");
    expect(toNewCode(withLink, null, "Menu", { canBePrivate: true }).input).not.toHaveProperty(
      "isPrivate",
    );
    // Codes that work without internet can be private too: it's about who sees them here.
    const wifi = run(secret, { type: "code", action: { type: "setActiveType", activeType: "wifi" } });
    expect(toNewCode(wifi, null, "Wi-Fi", { canBePrivate: true }).input.isPrivate).toBe(true);
  });
```

Inside `describe("toCodePatch")`:

```ts
  it("sends Private only when it changed", () => {
    const initial = link();
    expect(toCodePatch(initial, initial, keepName(initial)).patch).not.toHaveProperty("isPrivate");
    const on = run(initial, { type: "settings", patch: { isPrivate: true } });
    expect(toCodePatch(initial, on, keepName(initial)).patch).toEqual({ isPrivate: true });
  });
```

In `features/create/load.test.ts`, add a describe:

```ts
describe("fromSavedCode and Private", () => {
  it("brings back whether the code is private", () => {
    expect(fromSavedCode(savedRow({ is_private: true })).settings.isPrivate).toBe(true);
    expect(fromSavedCode(savedRow()).settings.isPrivate).toBe(false);
  });
});
```

In `features/create/draft.test.ts`, inside `describe("drafts")`:

```ts
  it("keep Private, and treat older drafts as shared", () => {
    saveDraft(USER, run(edited, { type: "settings", patch: { isPrivate: true } }));
    expect(parseDraft(rawDraft(USER))?.state.settings.isPrivate).toBe(true);
    const old = parseDraft(
      JSON.stringify({ v: 2, savedAt: "2026-10-14T10:00:00Z", settings: { trackable: true } }),
    );
    expect(old?.state.settings.isPrivate).toBe(false);
  });
```

In `features/codes/api.test.ts`, in `describe("createCodeWithSettings")`:

```ts
  it("sends Private only when it's on", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    await createCodeWithSettings({ ...base, isPrivate: true });
    expect(rpc.mock.lastCall![1].p_code).toMatchObject({ is_private: true });
    await createCodeWithSettings(base);
    expect(rpc.mock.lastCall![1].p_code).not.toHaveProperty("is_private");
  });
```

In `describe("updateCodeWithSettings")`:

```ts
  it("sends a change to Private by column name", async () => {
    rpc.mockResolvedValue({ data: row, error: null });
    await updateCodeWithSettings("c1", { isPrivate: false });
    expect(rpc.mock.lastCall![1].p_patch).toEqual({ is_private: false });
  });
```

In `describe("duplicateCode")`:

```ts
  it("copies a private code as private", async () => {
    const insert = vi.fn((row: Record<string, unknown>) => ({
      select: () => ({ single: async () => ({ data: { id: "copy", ...row }, error: null }) }),
    }));
    from.mockReturnValue({ insert });
    const mine = {
      id: "c2",
      user_id: "me",
      folder_id: null,
      name: "Diary",
      qr_type: "text",
      content: { text: "hi" },
      design: {},
      is_dynamic: false,
      destination: null,
      is_private: true,
    } as unknown as QrCodeRow;
    await duplicateCode(mine, { keepFolder: true });
    expect(insert.mock.calls[0]![0]).toMatchObject({ is_private: true });
  });
```

In `features/create/EditorLayout.test.tsx`:
- Add a `canBePrivate?: boolean` option to `renderLayout`, defaulting to false.
- Pass it as `canBePrivate={canBePrivate}` on `<EditorLayout>`.
- Add these tests:

```ts
  it("offers Private in Settings only where it can be set", async () => {
    const user = userEvent.setup();
    const { unmount } = renderLayout({ canBePrivate: true });
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    const toggle = screen.getByRole("switch", { name: /Private/ });
    expect(screen.getByText("Only you can see this code.")).toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    unmount();
    renderLayout();
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.queryByRole("switch", { name: /Private/ })).toBeNull();
  });
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/create features/codes/api.test.ts`
Expected: the new tests FAIL:
- `isPrivate` is undefined on the input, the settings and drafts;
- `is_private` is missing from the payloads;
- no "Private" switch exists.

- [ ] **Step 3: Implement.**

`features/create/state.ts`: add the field and its default.

```ts
  /** Campaign tags added to a Link's address. */
  utm: UtmParams;
  /** In a team, on your own code: only you can see it. */
  isPrivate: boolean;
}

export const DEFAULT_SETTINGS: CreateSettings = {
  trackable: true,
  password: "",
  startsAt: "",
  endsAt: "",
  slug: "",
  utm: { source: "", medium: "", campaign: "" },
  isPrivate: false,
};
```

`features/create/draft.ts`:
- In `draftBody`, use `const { trackable, startsAt, endsAt, slug, utm, isPrivate } = state.settings;` and `settings: { trackable, startsAt, endsAt, slug, utm, isPrivate },`.
- In `restoredSettings`, add `isPrivate: settings.isPrivate === true,` after `utm`.

`features/create/load.ts`: in `fromSavedCode`'s settings, add `isPrivate: row.is_private,` after `utm`.

`features/create/submit.ts`:

```ts
export function toNewCode(
  state: CreateState,
  ownerId: string | null,
  name: string,
  { canBePrivate = false }: { canBePrivate?: boolean } = {},
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
    // Only in a team; a draft from before leaving one can't make a code private.
    ...(canBePrivate && settings.isPrivate && { isPrivate: true }),
    ...(trackable && {
```

Leave the rest of `toNewCode` as it is. In `toCodePatch`, after the folder line:

```ts
  if (current.settings.isPrivate !== initial.settings.isPrivate) {
    patch.isPrivate = current.settings.isPrivate;
  }
```

`features/codes/api.ts`:
- `NewCode`: add `/** Only you can see it (in a team). */ isPrivate?: boolean;`.
- `createCode`'s insert: add `...(input.isPrivate && { is_private: true }),` after the folder line.
- `createCodeWithSettings`'s `p_code`: add the same line after the folder line.
- `CodeUpdate`: add `isPrivate?: boolean;`.
- `updateCodeWithSettings`'s patch: add `...(changes.isPrivate !== undefined && { is_private: changes.isPrivate }),`.
- `duplicateCode`'s `createCode({...})`: add `...(code.is_private && { isPrivate: true }),`, with the comment `// Only its maker sees a private code, so only they can copy it, and the copy stays private.`

`features/create/sections/PrivateSection.tsx`:

```tsx
"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";

/** In a team, on your own code: keep it to yourself (teams spec 6). */
export function PrivateSection({
  isPrivate,
  onChange,
}: {
  isPrivate: boolean;
  onChange: (isPrivate: boolean) => void;
}) {
  return (
    <Card aria-labelledby="private-heading">
      <CardHeader
        id="private-heading"
        title="Sharing"
        description="Your teammates see your codes unless you make one private."
      />
      <div className="px-5 pt-4 pb-6 sm:px-6">
        <Toggle
          label="Private"
          description="Only you can see this code."
          checked={isPrivate}
          onChange={onChange}
        />
      </div>
    </Card>
  );
}
```

`features/create/EditorLayout.tsx`:
- Add the prop `canBePrivate = false`, typed `/** In a team, on your own code: offer Private in Settings. */ canBePrivate?: boolean;`.
- In the `settings` panel, between `SettingsSection` and `FolderSection`:

```tsx
        {canBePrivate && (
          <PrivateSection
            isPrivate={state.settings.isPrivate}
            onChange={(isPrivate) => dispatch({ type: "settings", patch: { isPrivate } })}
          />
        )}
```

`features/create/CreatePage.tsx`:
- Add `/** In a team: Private can be set. */ inTeam: boolean;` to `CreatePageProps`.
- Add `inTeam` to `CreateEditor`'s destructured props.
- In `create()`, call `toNewCode(state, null, name, { canBePrivate: inTeam })`.
- On its `<EditorLayout>`, add `canBePrivate={inTeam}`.
- Add `inTeam={false}` to `renderPage` in `CreatePage.test.tsx` and to the `<CreatePage …>` in `ShowMe.test.tsx`.

`features/create/EditCodePage.tsx`:
- Add `/** In a team, on your own code: Private can be set. */ canBePrivate: boolean;` to `EditCodePageProps`.
- Add `canBePrivate` to `EditForm`'s destructured props, and `canBePrivate={canBePrivate}` on its `<EditorLayout>`.
- Add `canBePrivate={false}` to the `<EditCodePage …>` in `EditCodePage.test.tsx`.

`app/(app)/codes/new/page.tsx`: import `loadTeam` from `@/lib/teams/server`. Load the team next to the folders:

```ts
  const [{ data: folders }, team] = await Promise.all([
    supabase.from("folders").select("*").eq("user_id", user.id).order("name"),
    loadTeam(supabase),
  ]);
```

Then pass `inTeam={team.length > 0}` to `CreatePage`.

`app/(app)/codes/[id]/edit/page.tsx`: in the existing `Promise.all`, load the team as well.

```ts
  const [team, { data: folders }] = await Promise.all([
    loadTeam(supabase),
    supabase.from("folders").select("*").eq("user_id", code.user_id).order("name"),
  ]);
  const access = accessTo(team, user.id, code.user_id);
```

- Import `accessTo` from `@/lib/teams/access` and `loadTeam` from `@/lib/teams/server`, replacing `personAccess`.
- Pass `canBePrivate={own && team.length > 0}` to `EditCodePage`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/create features/codes && npx tsc --noEmit`
Expected: PASS, and no type errors.

- [ ] **Step 5: Commit.**

```bash
git add features/create features/codes app/\(app\)/codes/new/page.tsx "app/(app)/codes/[id]/edit/page.tsx"
git commit -m "Mark your own codes Private in the editor while you're in a team"
```

---

### Task 3: Whose codes: the scope, the switch row and the joined tip

**Files:**
- Modify:
  - `lib/teams/access.ts` (`firstName`, `CodesScope`, `codesScope`)
  - `app/(auth)/invite/[token]/actions.ts` (the redirect)
- Create:
  - `features/teams/PeopleSwitch.tsx`
  - `features/teams/JoinedTip.tsx`
- Test:
  - `lib/teams/access.test.ts`
  - `features/teams/PeopleSwitch.test.tsx`
  - `features/teams/JoinedTip.test.tsx`
  - `app/(auth)/invite/[token]/actions.test.ts`

**Interfaces:**
- Produces:
  - `firstName(person: Pick<TeamPerson, "name" | "email">): string`.
  - `type CodesScope = { kind: "self" } | { kind: "person"; person: TeamPerson; canEdit: boolean } | { kind: "everyone"; canEditOthers: boolean }`.
  - `codesScope(team: TeamPerson[], meId: string, params: { workspace: string | null; view: string | null }): CodesScope`.
  - `<PeopleSwitch team={TeamPerson[]} current={"self" | "everyone" | string} />`, where a string is a teammate's user id.
  - `<JoinedTip ownerName={string} />`.

- [ ] **Step 1: Write the failing tests.**

`lib/teams/access.test.ts`: add `codesScope` and `firstName` to the import, then add:

```ts
describe("firstName", () => {
  it("uses the first word of a name, or the email's name part", () => {
    expect(firstName({ name: "  Alex  Rivera ", email: "a@example.com" })).toBe("Alex");
    expect(firstName({ name: null, email: "sam.lee@example.com" })).toBe("sam.lee");
    expect(firstName({ name: " ", email: "kim@example.com" })).toBe("kim");
  });
});

describe("codesScope", () => {
  const team = [person("kim", "owner"), person("me", "viewer", true)];

  it("shows your own codes on your own, and for anyone you can't see", () => {
    expect(codesScope([], "me", { workspace: null, view: "everyone" })).toEqual({ kind: "self" });
    expect(codesScope([], "me", { workspace: "kim", view: null })).toEqual({ kind: "self" });
    expect(codesScope(team, "me", { workspace: "stranger", view: null })).toEqual({ kind: "self" });
    expect(codesScope(team, "me", { workspace: "me", view: null })).toEqual({ kind: "self" });
  });

  it("opens a teammate's codes with what you may do there", () => {
    expect(codesScope(team, "me", { workspace: "kim", view: null })).toEqual({
      kind: "person",
      person: team[0],
      canEdit: false,
    });
  });

  it("shows Everyone, where viewers change only their own codes", () => {
    expect(codesScope(team, "me", { workspace: null, view: "everyone" })).toEqual({
      kind: "everyone",
      canEditOthers: false,
    });
    const asOwner = [person("me", "owner", true), person("leo", "viewer")];
    expect(codesScope(asOwner, "me", { workspace: "leo", view: "everyone" })).toEqual({
      kind: "everyone",
      canEditOthers: true,
    });
  });
});
```

`features/teams/PeopleSwitch.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TeamPerson } from "@/lib/teams/access";

import { PeopleSwitch } from "./PeopleSwitch";

const TEAM: TeamPerson[] = [
  {
    userId: "olivia",
    email: "olivia@example.com",
    name: "Olivia Owner",
    avatarUrl: null,
    role: "owner",
    isMe: false,
  },
  {
    userId: "me",
    email: "me@example.com",
    name: "Victor Viewer",
    avatarUrl: null,
    role: "viewer",
    isMe: true,
  },
  {
    userId: "sam",
    email: "sam.lee@example.com",
    name: null,
    avatarUrl: null,
    role: "editor",
    isMe: false,
  },
];

describe("PeopleSwitch", () => {
  it("reads You, each teammate by first name, then Everyone", () => {
    render(<PeopleSwitch team={TEAM} current="self" />);
    const nav = within(screen.getByRole("navigation", { name: "Whose codes" }));
    expect(nav.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/codes",
      "/codes?workspace=olivia",
      "/codes?workspace=sam",
      "/codes?view=everyone",
    ]);
    for (const name of ["You", "Olivia", "sam.lee", "Everyone"]) {
      expect(nav.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(nav.getByRole("link", { name: "You" })).toHaveAttribute("aria-current", "page");
  });

  it("marks the person or Everyone being shown", () => {
    const { rerender } = render(<PeopleSwitch team={TEAM} current="olivia" />);
    expect(screen.getByRole("link", { name: "Olivia" })).toHaveAttribute("aria-current", "page");
    rerender(<PeopleSwitch team={TEAM} current="everyone" />);
    expect(screen.getByRole("link", { name: "Everyone" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "You" })).not.toHaveAttribute("aria-current");
  });

  it("shows nothing to someone on their own", () => {
    const { container } = render(<PeopleSwitch team={[]} current="self" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

`features/teams/JoinedTip.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { JoinedTip } from "./JoinedTip";

describe("JoinedTip", () => {
  it("says whose team you joined and where to switch, once", async () => {
    window.history.replaceState(null, "", "/codes?joined=1");
    render(<JoinedTip ownerName="Olivia Owner" />);
    expect(
      screen.getByText("You’re in Olivia Owner’s team now. Switch between people here."),
    ).toBeInTheDocument();
    // A reload won't show it again: the address drops ?joined.
    expect(window.location.search).toBe("");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/You’re in/)).toBeNull();
  });
});
```

`app/(auth)/invite/[token]/actions.test.ts`:

```ts
// @vitest-environment node
import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import { acceptInvite } from "./actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ getServerSupabase: async () => ({ rpc }) }));

describe("acceptInvite", () => {
  it("opens your codes with the one-time joined tip", async () => {
    rpc.mockResolvedValue({ data: "owner-1", error: null });
    await acceptInvite("token");
    expect(redirect).toHaveBeenCalledWith("/codes?joined=1");
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/teams features/teams "app/(auth)/invite"`
Expected: FAIL.
- `firstName`, `codesScope`, `PeopleSwitch` and `JoinedTip` don't exist.
- `redirect` was called with `/codes?workspace=owner-1`.

- [ ] **Step 3: Implement.**

`lib/teams/access.ts`: append this.

```ts
/** A short name for small labels: the first word of a name, or the email's name part. */
export const firstName = (person: Pick<TeamPerson, "name" | "email">) =>
  person.name?.trim().split(/\s+/)[0] || person.email.split("@")[0]!;

/** Whose codes /codes shows (teams spec 5). */
export type CodesScope =
  | { kind: "self" }
  | { kind: "person"; person: TeamPerson; canEdit: boolean }
  | { kind: "everyone"; canEditOthers: boolean };

/**
 * Reads ?workspace= and ?view=everyone. Someone you can't see, or Everyone while you're on your
 * own, shows your own codes, so old links and bookmarks always land somewhere.
 */
export function codesScope(
  team: TeamPerson[],
  meId: string,
  { workspace, view }: { workspace: string | null; view: string | null },
): CodesScope {
  const me = team.find((person) => person.isMe);
  if (!me) return { kind: "self" };
  if (view === "everyone") return { kind: "everyone", canEditOthers: me.role !== "viewer" };
  const access = workspace ? accessTo(team, meId, workspace) : null;
  return access?.person
    ? { kind: "person", person: access.person, canEdit: access.canEdit }
    : { kind: "self" };
}
```

`features/teams/PeopleSwitch.tsx`:

```tsx
import { Users } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { firstName, type TeamPerson } from "@/lib/teams/access";

/**
 * Whose codes to show: you, each teammate, or everyone (teams spec 5). Only in a team. On phones
 * it scrolls sideways inside itself, never the page.
 */
export function PeopleSwitch({
  team,
  current,
}: {
  team: TeamPerson[];
  /** "self", "everyone", or the teammate's user id. */
  current: string;
}) {
  const me = team.find((person) => person.isMe);
  if (!me) return null;
  const items = [
    { key: "self", href: "/codes", label: "You", person: me as TeamPerson | null },
    ...team
      .filter((person) => !person.isMe)
      .map((person) => ({
        key: person.userId,
        href: `/codes?workspace=${person.userId}`,
        label: firstName(person),
        person: person as TeamPerson | null,
      })),
    { key: "everyone", href: "/codes?view=everyone", label: "Everyone", person: null },
  ];
  return (
    <nav aria-label="Whose codes" data-people-switch className="max-w-full overflow-x-auto">
      <ul className="flex w-max gap-2 pb-1">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={current === item.key ? "page" : undefined}
              className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface py-1 pr-4 pl-1.5 text-sm font-medium whitespace-nowrap text-fg focus-ring hover:bg-surface-2 aria-[current=page]:border-primary aria-[current=page]:bg-primary-soft"
            >
              {item.person ? (
                <Avatar
                  id={item.person.userId}
                  name={item.person.name}
                  email={item.person.email}
                  src={item.person.avatarUrl}
                  size="sm"
                />
              ) : (
                <span aria-hidden className="grid size-8 place-items-center rounded-full bg-surface-2">
                  <Users className="size-4" />
                </span>
              )}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

`features/teams/JoinedTip.tsx`:

```tsx
"use client";

import { ArrowUp, X } from "lucide-react";
import { useEffect, useState } from "react";

/** Shown once after accepting an invite (teams spec 5): where to switch between people. */
export function JoinedTip({ ownerName }: { ownerName: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    // Nothing is stored for it; dropping ?joined means a reload won't show it again.
    const url = new URL(window.location.href);
    url.searchParams.delete("joined");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  if (!open) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-control border border-primary bg-primary-soft px-4 py-3 text-sm text-fg"
    >
      {/* Points at the switch row just above. */}
      <ArrowUp aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1">You’re in {ownerName}’s team now. Switch between people here.</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setOpen(false)}
        className="-m-2 grid size-11 shrink-0 place-items-center rounded-control focus-ring hover:bg-surface sm:size-9"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
```

`app/(auth)/invite/[token]/actions.ts`:
- Change the last line to `redirect("/codes?joined=1");`.
- Change the doc comment to `/** Joins the team an invite is for, then opens your codes with the one-time joined tip. */`.

- [ ] **Step 4: Run them and watch them pass.**

Run: `npx vitest run lib/teams features/teams "app/(auth)/invite"`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/teams features/teams "app/(auth)/invite"
git commit -m "Whose codes: a scope for /codes, the switch row, and the one-time joined tip"
```

---

### Task 4: The codes list follows each code's maker

**Files:**
- Modify:
  - `features/codes/list/CodesView.tsx`
  - `features/codes/list/CodeRow.tsx`
  - `features/codes/list/CodeTile.tsx`
  - `features/codes/list/SelectionBar.tsx`
  - `components/ui/Avatar.tsx` (an `xs` size)
- Test: `features/codes/list/CodesView.test.tsx`

**Interfaces:**
- Consumes: `TeamPerson`, `firstName` (Task 3).
- Produces: new `CodesView` props.
  - `scope: "self" | "person" | "everyone"`.
  - `canEditOthers: boolean`.
  - `team: TeamPerson[]`.
  - These replace `ownerId`, `teamId` and `canEdit`. `userId`, `codes`, `folders`, `folder` and `recentScans` stay.
  - `folders` now holds the folders of everyone shown.
- Also produces: `CodeItemProps` gains `creator: TeamPerson | null` and `isPrivate: boolean`. `SelectionBar` gains `canMove: boolean`.

- [ ] **Step 1: Update the existing tests to the new props, and add the new ones.**

In `features/codes/list/CodesView.test.tsx`:
- Import `TeamPerson` from `@/lib/teams/access` and `FolderRow` from `@/types/supabase`.
- In `renderView`, replace `ownerId="owner" teamId={null} canEdit` with `scope="self" canEditOthers team={[]}`.
- Add the helper `const kims = (...codes: QrCodeRow[]) => codes.map((c) => ({ ...c, user_id: "kim" }));`.
- Change the existing teammate tests:
  - "viewers can open and download but not change codes": `renderView({ scope: "person", canEditOthers: false, codes: kims(MENU, FLYER, WIFI) })`.
  - "editors can open a code in the editor, in its team's codes": `renderView({ scope: "person", codes: kims(MENU) })`.
  - "a teammate's code is copied into your own codes": `renderView({ scope: "person", codes: kims(MENU) })`.
  - "a teammate's hosted page is copied with its images…": `renderView({ scope: "person", codes: kims(page) })`.
  - Any other test that passed `teamId` or `canEdit` gets the same treatment.

Then add:

```tsx
const TEAM: TeamPerson[] = [
  {
    userId: "owner",
    email: "olivia@example.com",
    name: "Olivia Owner",
    avatarUrl: null,
    role: "viewer",
    isMe: true,
  },
  {
    userId: "kim",
    email: "kim@example.com",
    name: "Kim Lee",
    avatarUrl: null,
    role: "owner",
    isMe: false,
  },
];
const KIM_FLYER = code("kimflyer", { name: "Kim flyer", user_id: "kim" });

describe("CodesView in a team", () => {
  it("shows who made each code in Everyone, on rows and tiles", async () => {
    renderView({ scope: "everyone", team: TEAM, codes: [MENU, KIM_FLYER] });
    expect(within(rowFor("Spring menu")).getByText("Created by you")).toBeInTheDocument();
    expect(within(rowFor("Kim flyer")).getByText("Created by Kim")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Grid view" }));
    expect(within(rowFor("Kim flyer")).getByText("Created by Kim")).toBeInTheDocument();
  });

  it("names no maker outside Everyone", () => {
    renderView({ scope: "self", team: TEAM, codes: [MENU] });
    expect(screen.queryByText(/Created by/)).toBeNull();
  });

  it("lets a viewer change their own codes in Everyone, and only look at teammates'", async () => {
    const user = userEvent.setup();
    renderView({ scope: "everyone", canEditOthers: false, team: TEAM, codes: [MENU, KIM_FLYER] });
    await user.click(screen.getByRole("button", { name: "Actions for Spring menu" }));
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveAttribute(
      "href",
      "/codes/menu/edit",
    );
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Actions for Kim flyer" }));
    expect(screen.queryByRole("menuitem", { name: "Edit" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Open" })).toHaveAttribute(
      "href",
      "/codes/kimflyer?workspace=kim",
    );
  });

  it("offers bulk changes only for codes you may change, and Move within one person", async () => {
    const user = userEvent.setup();
    const selectBoth = async () => {
      await user.click(screen.getByRole("checkbox", { name: "Select Spring menu" }));
      await user.click(screen.getByRole("checkbox", { name: "Select Kim flyer" }));
      return within(screen.getByRole("region", { name: "Selected codes" }));
    };
    const viewer = renderView({
      scope: "everyone",
      canEditOthers: false,
      team: TEAM,
      codes: [MENU, KIM_FLYER],
    });
    let bar = await selectBoth();
    for (const name of ["Move", "Pause", "Delete"]) {
      expect(bar.queryByRole("button", { name: new RegExp(name) })).toBeNull();
    }
    viewer.unmount();
    // An owner may change both, but folders belong to one person: no Move across people.
    renderView({ scope: "everyone", canEditOthers: true, team: TEAM, codes: [MENU, KIM_FLYER] });
    bar = await selectBoth();
    expect(bar.getByRole("button", { name: /Delete/ })).toBeInTheDocument();
    expect(bar.queryByRole("button", { name: /Move/ })).toBeNull();
  });

  it("moves a teammate's code only into that teammate's folders", async () => {
    const user = userEvent.setup();
    const folders = [
      { id: "f-mine", user_id: "owner", name: "My posters" },
      { id: "f-kim", user_id: "kim", name: "Kim menus" },
    ] as FolderRow[];
    renderView({ scope: "everyone", team: TEAM, codes: [MENU, KIM_FLYER], folders });
    await user.click(screen.getByRole("button", { name: "Actions for Kim flyer" }));
    await user.click(screen.getByRole("menuitem", { name: "Move to folder" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("radio", { name: /Kim menus/ })).toBeInTheDocument();
    expect(dialog.queryByRole("radio", { name: /My posters/ })).toBeNull();
  });

  it("labels your own private codes while you're in a team", () => {
    const secret = code("secret", { name: "Secret plan", is_private: true });
    const inTeam = renderView({ scope: "self", team: TEAM, codes: [secret, MENU] });
    expect(within(rowFor("Secret plan")).getByText("Private")).toBeInTheDocument();
    expect(within(rowFor("Spring menu")).queryByText("Private")).toBeNull();
    inTeam.unmount();
    // On your own (after leaving a team) the stored flag shows nothing.
    renderView({ scope: "self", team: [], codes: [secret] });
    expect(screen.queryByText("Private")).toBeNull();
  });

  it("adds your copy of a teammate's code to the Everyone list", async () => {
    const user = userEvent.setup();
    vi.mocked(duplicateCode).mockResolvedValue({
      ok: true,
      value: { ...KIM_FLYER, id: "copy", user_id: "owner", name: "Copy of Kim flyer" },
    });
    renderView({ scope: "everyone", team: TEAM, codes: [MENU, KIM_FLYER] });
    await user.click(screen.getByRole("button", { name: "Actions for Kim flyer" }));
    await user.click(screen.getByRole("menuitem", { name: /Duplicate/ }));
    expect(await screen.findByText("Copied “Kim flyer” to your codes")).toBeInTheDocument();
    expect(rowFor("Copy of Kim flyer")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail.**

Run: `npx vitest run features/codes/list`
Expected: FAIL. The existing teammate tests fail on the new props, and the new tests fail because there's no "Created by", no Private label and no per-code rules.

- [ ] **Step 3: Implement.**

`components/ui/Avatar.tsx`: add `xs: "size-5 text-[10px]",` to `SIZES`, before `sm`.

`features/codes/list/CodeRow.tsx`:
- Import `EyeOff` from lucide-react, `Avatar` from `@/components/ui/Avatar`, and `firstName` and `TeamPerson` from `@/lib/teams/access`.
- Add these to `CodeItemProps`:

```ts
  /** Who made it, in the Everyone view; null elsewhere. */
  creator: TeamPerson | null;
  /** Your own code marked Private, shown while you're in a team. */
  isPrivate: boolean;
```

Export two small parts from the same file:

```tsx
/** A code only its maker can see (teams spec 6). The lock already means a password here. */
export function PrivateBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted">
      <EyeOff aria-hidden className="size-3" />
      Private
    </span>
  );
}

/** Who made a code, in the Everyone view (teams spec 5). */
export function CreatedBy({ person }: { person: TeamPerson }) {
  return (
    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-fg-muted">
      <Avatar
        id={person.userId}
        name={person.name}
        email={person.email}
        src={person.avatarUrl}
        size="xs"
      />
      <span className="truncate">Created by {person.isMe ? "you" : firstName(person)}</span>
    </p>
  );
}
```

- In `CodeRow`, destructure `creator` and `isPrivate`.
- After the password `Lock` in the name line, add `{isPrivate && <PrivateBadge />}`.
- After the `codeDetail` line, add `{creator && <CreatedBy person={creator} />}`.

`features/codes/list/CodeTile.tsx`:
- Import `CreatedBy` and `PrivateBadge` from `./CodeRow`.
- Destructure `creator` and `isPrivate`.
- After the password `Lock`, add `{isPrivate && <PrivateBadge />}`.
- After the type line, add `{creator && <CreatedBy person={creator} />}`.

`features/codes/list/SelectionBar.tsx`:
- Add the prop `/** Every selected code is one person's, so their folders apply. */ canMove: boolean;`.
- Show Move only when `canEdit && canMove`.

`features/codes/list/CodesView.tsx`:

1. Replace the props interface's `ownerId`, `teamId` and `canEdit` with:

```ts
  /** Whose codes: your own, one teammate's, or everyone's in the team. */
  scope: "self" | "person" | "everyone";
  /** Owners and editors may change teammates' codes; viewers change only their own. */
  canEditOthers: boolean;
  /** Everyone in the team (empty on your own), for "Created by" and the Private label. */
  team: TeamPerson[];
```

Update the `folders` doc comment to `/** The folders of the people shown; a code moves only into its own maker's. */`.

2. Destructure `scope`, `canEditOthers` and `team` instead of `teamId` and `canEdit`. Add these right after `useListView`:

```ts
  const mine = (code: QrCodeRow) => code.user_id === userId;
  const canEdit = (code: QrCodeRow) => mine(code) || canEditOthers;
  /** A teammate's code opens inside their codes (?workspace=); yours needs nothing. */
  const workspaceOf = (code: QrCodeRow) => (mine(code) ? null : code.user_id);
  const inTeam = team.length > 0;
  const creatorOf = (code: QrCodeRow) =>
    scope === "everyone" ? (team.find((person) => person.userId === code.user_id) ?? null) : null;
  const allEditable = selected.every(canEdit);
  const oneOwner = new Set(selected.map((code) => code.user_id)).size === 1;
```

Put `allEditable` and `oneOwner` after `selected` is defined.

3. `duplicate`:

```ts
  async function duplicate(code: QrCodeRow) {
    // A teammate's code is copied into your own codes.
    const fromTeammate = !mine(code);
    const result = await copyToMyCodes(code, { fromTeammate });
    if (!result.ok) return toast(result.error, "error");
    // The copy joins the list when the list shows your codes: yours, or Everyone's.
    if (scope !== "person") setCodes((current) => [result.value, ...current]);
    toast(
      fromTeammate ? `Copied “${code.name}” to your codes` : `Duplicated as “${result.value.name}”`,
    );
    changed();
  }
```

4. In the empty states, read `scope` instead of `teamId` and `canEdit`.
- The folder case: `scope === "self"` replaces `canEdit && !teamId`, and `newCodeHref({ folderId: folder.id, ownerId: null })`.
- The heading: `{scope === "self" ? "Create your first QR code" : "No codes here yet"}`.
- The quick starts: `scope === "self" ? (...) : (...)`, with `ownerId: null` in their `newCodeHref` calls.

5. Rows and tiles get per-code values, the same for `CodeTile` and `CodeRow`:

```tsx
              canEdit={canEdit(code)}
              teamId={workspaceOf(code)}
              creator={creatorOf(code)}
              isPrivate={inTeam && mine(code) && code.is_private}
```

6. `SelectionBar`: `canEdit={allEditable}` and `canMove={oneOwner}`.

7. `MoveDialog`: `folders={folders.filter((f) => f.user_id === toMove?.[0]?.user_id)}`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/codes components/ui && npx tsc --noEmit`
Expected:
- The list tests PASS.
- `tsc` errors only in `app/(app)/codes/page.tsx`, which still passes the old props. Task 5 fixes that.
- If `tsc` errors anywhere else, fix it here.

- [ ] **Step 5: Commit.**

```bash
git add features/codes/list components/ui/Avatar.tsx
git commit -m "The codes list follows each code's maker: Created by, Private labels, and per-code rights"
```

---

### Task 5: `/codes` shows a person or Everyone, and the sidebar follows

**Files:**
- Modify:
  - `app/(app)/codes/page.tsx`
  - `components/app/AppShell.tsx`
  - `components/app/WorkspaceSwitcher.tsx`
- Test: `components/app/AppShell.test.tsx`

**Interfaces:**
- Consumes:
  - `codesScope`, `PeopleSwitch` and `JoinedTip` from Task 3.
  - `CodesView`'s new props from Task 4.
- Produces:
  - `WorkspaceSwitcher` prop `everyone: boolean`.
  - In Everyone, the shell's Codes link is `/codes?view=everyone`.

- [ ] **Step 1: Write the failing shell tests.** In `components/app/AppShell.test.tsx`:
- Mock the folder list so the tests can see whether it renders: `vi.mock("./FolderNav", () => ({ FolderNav: () => <p>Folder list</p> }));`.
- Add:

```tsx
  it("offers Everyone in the switcher, keeps it in the Codes link, and hides folders there", async () => {
    search = new URLSearchParams("view=everyone");
    renderShell();
    const switcher = screen.getAllByRole("button", { name: /Switch team/ })[0]!;
    expect(switcher).toHaveAccessibleName("Switch team (showing Everyone’s codes)");
    expect(hrefs("Codes")).toContain("/codes?view=everyone");
    expect(screen.queryByText("Folder list")).toBeNull();
    await userEvent.click(switcher);
    expect(
      within(screen.getByRole("menu")).getByRole("menuitem", { name: /Everyone’s codes/ }),
    ).toHaveAttribute("href", "/codes?view=everyone");
  });

  it("shows no Everyone to someone on their own", async () => {
    search = new URLSearchParams("view=everyone");
    render(
      <AppShell user={USER} teams={[]}>
        <h1>Page</h1>
      </AppShell>,
    );
    expect(screen.getAllByText("Folder list").length).toBeGreaterThan(0);
    await userEvent.click(screen.getAllByRole("button", { name: /Switch team/ })[0]!);
    expect(within(screen.getByRole("menu")).queryByRole("menuitem", { name: /Everyone/ })).toBeNull();
  });
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run components/app/AppShell.test.tsx`
Expected: the two new tests FAIL, since there's no Everyone entry and the folder list shows. The existing tests still pass with the mock.

- [ ] **Step 3: Implement the shell.**

`components/app/AppShell.tsx`:
- After `const team = …`, add:

```ts
  // Everyone's codes, in a team (teams spec 5). Folders belong to one person, so none show there.
  const everyone = pathname === "/codes" && searchParams.get("view") === "everyone" && teams.length > 0;
```

- Change `folderId` to `pathname === "/codes" && !team && !everyone ? searchParams.get("folder") : null`.
- Change `codesHref` to `everyone ? "/codes?view=everyone" : withWorkspace("/codes", ownerId)`.
- Render `FolderNav` only when `!everyone`.
- Pass `everyone={everyone}` to both `WorkspaceSwitcher`s.

`components/app/WorkspaceSwitcher.tsx`:
- Import `Users` from lucide-react.
- Add the prop `/** Everyone's codes are shown. */ everyone?: boolean` (default false).
- `const label = everyone ? "Everyone’s codes" : current ? `${current.label}’s codes` : "My codes";`.
- In the button, when `everyone`, show `<span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2"><Users className="size-4" /></span>` instead of the `Avatar`.
- "My codes" shows its check only when `!current && !everyone`.
- After the teammates, add:

```tsx
        {teams.length > 0 && (
          <MenuItem>
            <Link href="/codes?view=everyone" className={menuItemClass}>
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2">
                <Users className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">Everyone’s codes</span>
              {everyone && <Check aria-hidden className="text-fg-muted" />}
            </Link>
          </MenuItem>
        )}
```

- [ ] **Step 4: Implement the page.** Replace the body of `app/(app)/codes/page.tsx` from `const params` to the end with:

```tsx
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const view = typeof params.view === "string" ? params.view : null;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const { supabase, user } = await requireUser(
    requested
      ? `/codes?workspace=${requested}`
      : view === "everyone"
        ? "/codes?view=everyone"
        : "/codes",
  );
  const team = await loadTeam(supabase);
  // Someone you can't see, or Everyone while you're on your own, shows your own codes.
  const scope = codesScope(team, user.id, { workspace: requested, view });
  const person = scope.kind === "person" ? scope.person : null;
  const everyone = scope.kind === "everyone";
  const own = scope.kind === "self";
  const canEditOthers =
    scope.kind === "everyone" ? scope.canEditOthers : scope.kind === "person" ? scope.canEdit : true;
  const ownerId = person?.userId ?? user.id;
  // Teammates can read each other's codes, so always filter to the people shown.
  const owners = everyone ? team.map((p) => p.userId) : [ownerId];
  const label = person ? personLabel(person) : null;

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .in("user_id", owners)
    .order("name");
  // Only a folder of the person shown counts; Everyone has none (folders belong to one person).
  const folder = everyone
    ? null
    : ((folders ?? []).find((f) => f.id === folderParam && f.user_id === ownerId) ?? null);
  let query = supabase
    .from("qr_codes")
    .select("*")
    .in("user_id", owners)
    .order("updated_at", { ascending: false });
  if (folder) query = query.eq("folder_id", folder.id);
  const [{ data: codes }, scanLists] = await Promise.all([
    query,
    Promise.all(owners.map((owner) => supabase.rpc("recent_scan_counts", { p_owner: owner }))),
  ]);
  const list = codes ?? [];
  const recentScans = Object.fromEntries(
    scanLists.flatMap(({ data }) => data ?? []).map((row) => [row.code_id, Number(row.scans)]),
  );
  const totalScans = list.reduce((sum, code) => sum + (recentScans[code.id] ?? 0), 0);
  const title = folder
    ? folder.name
    : everyone
      ? "Everyone’s codes"
      : label
        ? `${label}’s codes`
        : "All codes";
  const roleNote = everyone
    ? canEditOthers
      ? "You can edit these"
      : "You can view teammates’ codes and edit your own"
    : label
      ? canEditOthers
        ? "You can edit these"
        : "You can view these"
      : null;
  const teamOwner = team.find((p) => p.role === "owner" && !p.isMe) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={
          <>
            {roleNote && <>{roleNote} · </>}
            {formatCount(list.length)} {list.length === 1 ? "code" : "codes"} ·{" "}
            {formatCount(totalScans)} {totalScans === 1 ? "scan" : "scans"} in the last 30 days
          </>
        }
        actions={
          (own || everyone || (canEditOthers && folder)) && (
            <>
              {folder && canEditOthers && (
                <FolderActions folder={folder} teamId={person?.userId ?? null} />
              )}
              {/* New codes always go in your own space, so creating shows with your codes. */}
              {(own || everyone) && (
                <>
                  <Link
                    href={bulkCreateHref({ folderId: folder?.id, ownerId: null })}
                    className={buttonClasses("outline", "md")}
                  >
                    <Rows3 aria-hidden /> Bulk create
                  </Link>
                  <Link
                    href={newCodeHref({ folderId: folder?.id, ownerId: null })}
                    className={buttonClasses("primary", "md")}
                  >
                    <Plus aria-hidden /> Create code
                  </Link>
                </>
              )}
            </>
          )
        }
      />

      {team.length > 0 && (
        <PeopleSwitch
          team={team}
          current={everyone ? "everyone" : person ? person.userId : "self"}
        />
      )}
      {params.joined === "1" && teamOwner && <JoinedTip ownerName={personLabel(teamOwner)} />}

      {person && !canEditOthers && (
        <p className="flex items-center gap-2 rounded-control bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          <Eye aria-hidden className="size-4 shrink-0" />
          You can view {label}’s codes and their analytics. Your own codes are under My codes.
        </p>
      )}

      {!everyone && (
        <FolderSelect
          folders={folders ?? []}
          current={folder?.id ?? null}
          ownerId={ownerId}
          teamId={person?.userId ?? null}
          canEdit={own}
        />
      )}

      <CodesView
        key={`${scope.kind}:${ownerId}:${folder?.id ?? "all"}`}
        userId={user.id}
        codes={list}
        folders={folders ?? []}
        folder={folder}
        scope={scope.kind}
        canEditOthers={canEditOthers}
        team={team}
        recentScans={recentScans}
      />
    </div>
  );
}
```

Imports:
- Replace `accessTo, personLabel` with `codesScope, personLabel` from `@/lib/teams/access`.
- Add `import { JoinedTip } from "@/features/teams/JoinedTip";` and `import { PeopleSwitch } from "@/features/teams/PeopleSwitch";`.

- [ ] **Step 5: Run the checks.**

Run: `npx vitest run components/app features && npx tsc --noEmit && npm run lint`
Expected: PASS, with no type or lint errors.

- [ ] **Step 6: Commit.**

```bash
git add "app/(app)/codes/page.tsx" components/app
git commit -m "Switch between people on /codes, with Everyone in the list and the sidebar"
```

---

### Task 6: Browser tests

**Files:**
- Modify:
  - `e2e/accounts/global-setup.ts` (one private code for the viewer)
  - `e2e/accounts/app.spec.ts` (sweep Everyone)
- Create: `e2e/accounts/team-views.spec.ts`

- [ ] **Step 1: Seed a private code.** In `global-setup.ts`'s `own` insert, add `{ user_id: viewerId, name: "Victor diary", is_private: true, ...note },` after "Victor note".

- [ ] **Step 2: Write the tests.** Create `e2e/accounts/team-views.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

import { MAKER, OWNER, VIEWER, seed } from "./fixtures";

const switchRow = (page: Page) => page.getByRole("navigation", { name: "Whose codes" });
const openTab = (page: Page, name: string) => page.getByRole("tab", { name }).click();
const createButton = (page: Page) =>
  page.getByRole("region", { name: "Code" }).getByRole("button", { name: "Create code" });

test.describe("an owner in a team", () => {
  test.use({ storageState: OWNER.state });

  test("switches to a teammate's codes from the switch row", async ({ page }) => {
    await page.goto("codes");
    await switchRow(page).getByRole("link", { name: "Victor" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Victor Viewer’s codes" }),
    ).toBeVisible();
    await expect(page.getByText(/You can edit these/)).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Victor note" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Victor diary" })).toHaveCount(0);
  });

  test("sees everyone's shared codes with who made them, and no folders", async ({ page }) => {
    await page.goto("codes");
    await switchRow(page).getByRole("link", { name: "Everyone" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Everyone’s codes" })).toBeVisible();
    await expect(
      page.getByRole("listitem", { name: "Spring menu" }).getByText("Created by you"),
    ).toBeVisible();
    await expect(
      page.getByRole("listitem", { name: "Victor note" }).getByText("Created by Victor"),
    ).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Victor diary" })).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /Flyers/ }),
    ).toHaveCount(0);
  });

  test("gets the Private switch on their own codes only", async ({ page }) => {
    await page.goto(`codes/${seed().menuId}/edit`);
    await openTab(page, "Settings");
    await expect(page.getByRole("switch", { name: /Private/ })).toBeVisible();
    // A teammate's code can't be made private by anyone but its maker.
    await page.goto(`codes/${seed().viewerCodeId}/edit`);
    await openTab(page, "Settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("switch", { name: /Private/ })).toHaveCount(0);
  });
});

test.describe("a viewer in a team", () => {
  test.use({ storageState: VIEWER.state });

  test("sees their private code labelled, and can view the owner's codes", async ({ page }) => {
    await page.goto("codes");
    await expect(
      page.getByRole("listitem", { name: "Victor diary" }).getByText("Private"),
    ).toBeVisible();
    await switchRow(page).getByRole("link", { name: "Olivia" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Olivia Owner’s codes" }),
    ).toBeVisible();
    await expect(page.getByText(/You can view these/)).toBeVisible();
  });

  test("makes a code Private while creating it, and teammates never see it", async ({
    page,
    browser,
  }) => {
    await page.goto("codes/new?type=text");
    await page.getByLabel("Text", { exact: true }).fill("Only for me");
    await openTab(page, "Settings");
    await page.getByRole("switch", { name: /Private/ }).click();
    await page.getByLabel("Code name").fill("Victor secret plan");
    await createButton(page).click();
    await expect(page).toHaveURL(/#download$/);
    await page.goto("codes");
    await expect(
      page.getByRole("listitem", { name: "Victor secret plan" }).getByText("Private"),
    ).toBeVisible();

    const owner = await browser.newContext({
      storageState: OWNER.state,
      baseURL: test.info().project.use.baseURL,
    });
    const ownerPage = await owner.newPage();
    await ownerPage.goto("codes?view=everyone");
    await expect(ownerPage.getByRole("listitem", { name: "Victor note" })).toBeVisible();
    await expect(ownerPage.getByRole("listitem", { name: "Victor secret plan" })).toHaveCount(0);
    await owner.close();
  });

  test("gets the one-time tip after joining", async ({ page }) => {
    await page.goto("codes?joined=1");
    await expect(
      page.getByText("You’re in Olivia Owner’s team now. Switch between people here."),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Whose codes" })).toBeVisible();
    await expect(page.getByText(/You’re in Olivia Owner’s team now/)).toHaveCount(0);
  });
});

test.describe("someone on their own", () => {
  test.use({ storageState: MAKER.state });

  test("sees no team parts: no switch row, no Everyone, no Private switch", async ({ page }) => {
    await page.goto("codes?view=everyone");
    await expect(page.getByRole("heading", { level: 1, name: "All codes" })).toBeVisible();
    await expect(switchRow(page)).toHaveCount(0);
    await page.goto("codes/new?type=text");
    await openTab(page, "Settings");
    await expect(page.getByRole("switch", { name: /Private/ })).toHaveCount(0);
  });
});
```

In `app.spec.ts`:
- Add `"codes?view=everyone"` to `PAGES`, after `"codes?folder={folder}"`.
- Add `"codes?view=everyone"` to the dark-mode list `["codes", "codes/new", "team"]`.

- [ ] **Step 3: Run the signed-in suite.**

Run: `npm run test:e2e:accounts 2>&1 | tail -30`
Expected: all PASS, including the 7 new tests and the Everyone sweep (3 widths) plus dark.

If an older test breaks because the viewer now has a third code or the owner's `/codes` has the switch row:
- Make its locator exact.
- Ledger it as a test-only ruling.
- Don't weaken what the test checks.

- [ ] **Step 4: Commit.**

```bash
git add e2e/accounts
git commit -m "Browser tests: the switch row, Everyone, Private codes, the joined tip, and no team parts on your own"
```

---

### Task 7: Content uploads keep edits made meanwhile (carried from release 3b's review)

Release 3b's final review found a bug in the Content tab. When an image, PDF, video or audio upload finishes, it writes the page as it was when the upload started, which wipes out anything typed, moved or removed in the meantime.
- 2a's and 2c's reviews deferred the same bug.
- David asked for it in this release (2026-10-16).

The fix uses the Look tab's mechanism (`setLook`): every content change is an update applied to the latest page.

**Files:**
- Modify:
  - `features/generator/state/types.ts` and `features/generator/state/reducer.ts` (an `updatePage` action)
  - `features/create/useCodeDraft.ts` and `features/generator/useGenerator.ts` (`updatePage`)
  - `features/generator/content/types.ts` (`ContentEditor.updatePage`)
  - `features/create/EditorLayout.tsx` (passes `updatePage` to the content editor)
  - `features/generator/content/HostedPageForm.tsx` (`onUpdate`)
  - `features/pages/editor/PageEditor.tsx` (the `onUpdate` prop; `set` applies patches to the latest page)
  - `features/pages/editor/editors/shared.tsx` (`set` also takes a function of the latest page)
  - `features/pages/editor/fields.tsx` (`ImagesField` gets `onAdd`)
  - `features/pages/editor/editors/ImagesEditor.tsx`
- Test:
  - `features/generator/state/reducer.test.ts`
  - `features/pages/editor/PageEditor.test.tsx`
  - `features/pages/editor/ImagesField.test.tsx`
  - plus the mocks in `features/create/sections/sections.test.tsx` and `features/generator/content/HostedPageForm.test.tsx`

**Interfaces:**
- Produces:
  - `GeneratorAction` gains `{ type: "updatePage"; pageType: PageTypeId; update: (page: PageContentMap[PageTypeId]) => PageContentMap[PageTypeId] }`.
  - `ContentEditor.updatePage(type, update)`.
  - `PageEditor` prop `onUpdate: (update: (page: PageContentMap[K]) => PageContentMap[K]) => void`, replacing `onChange`.
  - `EditorProps<T>.set: (patch: Partial<T> | ((page: T) => Partial<T>)) => void`.
  - `ImagesField` prop `onAdd: (media: Media) => void`.

- [ ] **Step 1: Write the failing tests.**

In `features/generator/state/reducer.test.ts`:

```ts
  it("changes a page from its latest content", () => {
    let state = initialState();
    state = reduce(state, {
      type: "setPage",
      pageType: "links",
      content: { ...state.pages.links, title: "Latest" },
    });
    state = reduce(state, {
      type: "updatePage",
      pageType: "links",
      update: (page) => ({ ...page, bio: "Hi" }),
    });
    expect(state.pages.links).toMatchObject({ title: "Latest", bio: "Hi" });
  });
```

In `features/pages/editor/PageEditor.test.tsx`:
- Mock the upload: `vi.mock("./upload", async (original) => ({ ...(await original<object>()), uploadMedia: vi.fn() }));`.
- Import `act` from `@testing-library/react`, and `uploadMedia` from `./upload`.
- Then add:

```tsx
describe("an upload that finishes later", () => {
  // The harness keeps the page the way the editor's reducer does. It hands PageEditor both the
  // old whole-page callback and the new update callback, so the test fails on the old code for
  // the right reason. Step 4 removes onChange.
  function Harness({ initial }: { initial: LinksPage }) {
    const [page, setPage] = useState(initial);
    return (
      <>
        <PageEditor
          type="links"
          page={page}
          errors={{}}
          onChange={(next) => setPage(next)}
          onUpdate={(update) => setPage((p) => update(p))}
        />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }

  it("keeps what was typed while it uploaded", async () => {
    const user = userEvent.setup();
    let finish!: (result: Awaited<ReturnType<typeof uploadMedia>>) => void;
    vi.mocked(uploadMedia).mockImplementation(() => new Promise((r) => (finish = r)));
    const { container } = render(<Harness initial={PAGE_DEFAULTS.links()} />);
    const input = container.querySelector<HTMLInputElement>("input[type=file]")!;
    await user.upload(input, new File(["x"], "me.png", { type: "image/png" }));
    await user.type(screen.getByLabelText("Title"), "Edited");
    const avatar = { path: `${UID}/me.png`, name: "me.png", type: "image/png", size: 1 };
    await act(async () => finish({ ok: true, media: avatar }));
    const page = JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);
    expect(page.title).toBe("Edited");
    expect(page.avatar).toEqual(avatar);
  });
});
```

Add `const UID = "11111111-1111-4111-8111-111111111111";` near the top if the file doesn't define one. The links page's first file input is the profile picture.

In `features/pages/editor/ImagesField.test.tsx`: add `act` to the testing-library import, mock `./upload` the same way, and import `uploadMedia` from `./upload`. Then:

```tsx
  it("adds an image that finishes uploading to the latest list", async () => {
    const user = userEvent.setup();
    let finish!: (result: Awaited<ReturnType<typeof uploadMedia>>) => void;
    vi.mocked(uploadMedia).mockImplementation(() => new Promise((r) => (finish = r)));
    function Later() {
      const [images, setImages] = useState([image("a.png"), image("b.png")]);
      return (
        <>
          <ImagesField
            value={images}
            onChange={setImages}
            onAdd={(media) => setImages((list) => [...list, media])}
            max={24}
          />
          <output aria-label="Order">{images.map((m) => m.name).join(",")}</output>
        </>
      );
    }
    const { container } = render(<Later />);
    const input = container.querySelector<HTMLInputElement>("input[type=file]")!;
    await user.upload(input, new File(["x"], "c.png", { type: "image/png" }));
    // Removed while c.png uploads: it must stay removed.
    await user.click(screen.getByRole("button", { name: "Actions for image 1" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove" }));
    await act(async () => finish({ ok: true, media: image("c.png") }));
    expect(order()).toHaveTextContent("b.png,c.png");
  });
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/generator/state/reducer.test.ts features/pages/editor/PageEditor.test.tsx features/pages/editor/ImagesField.test.tsx`
Expected: FAIL.
- The reducer test fails because `updatePage` isn't handled (the state comes back unchanged or undefined).
- The PageEditor test gets title "" because the upload wrote the old page.
- The ImagesField test gets "a.png,b.png,c.png", because the removed image came back.

- [ ] **Step 3: Implement.**

`features/generator/state/types.ts`, after `setLook`:

```ts
  /** Changes a page from its latest content, so an upload that finishes later keeps newer edits. */
  | {
      type: "updatePage";
      pageType: PageTypeId;
      update: (page: PageContentMap[PageTypeId]) => PageContentMap[PageTypeId];
    }
```

`features/generator/state/reducer.ts`, after the `setLook` case:

```ts
    case "updatePage":
      return {
        ...state,
        pages: {
          ...state.pages,
          [action.pageType]: sanitizePage(
            action.pageType,
            action.update(state.pages[action.pageType]),
          ),
        },
      };
```

`features/generator/content/types.ts`: add this to `ContentEditor`.

```ts
  /** Changes a page from its latest content (uploads that finish later keep newer edits). */
  updatePage: (
    type: PageTypeId,
    update: (page: PageContentMap[PageTypeId]) => PageContentMap[PageTypeId],
  ) => void;
```

`features/create/useCodeDraft.ts` and `features/generator/useGenerator.ts`: add a `updatePage` callback next to `setPage`. In useCodeDraft it is `codeAction({ type: "updatePage", pageType: type, update })`; in useGenerator it is `dispatch({...})`. Return it.

`features/create/EditorLayout.tsx`: in the `editor` object, add `updatePage: draft.updatePage,` after `setPage`.

`features/generator/content/HostedPageForm.tsx`: replace PageEditor's `onChange` with:

```tsx
          onUpdate={(update) =>
            generator.updatePage(
              type,
              update as (page: PageContentMap[PageTypeId]) => PageContentMap[PageTypeId],
            )
          }
```

`features/pages/editor/editors/shared.tsx`:

```ts
export interface EditorProps<T> {
  page: T;
  /** A patch, or a patch made from the latest page (for uploads that finish later). */
  set: (patch: Partial<T> | ((page: T) => Partial<T>)) => void;
  errors: ErrorsApi;
}
```

`features/pages/editor/PageEditor.tsx`:
- Replace the `onChange` prop with `/** Applied to the latest page, so an upload that finishes later keeps newer edits. */ onUpdate: (update: (page: PageContentMap[K]) => PageContentMap[K]) => void;`.
- Destructure `onUpdate`.
- `set` becomes:

```ts
  const set = (patch: object | ((page: PageContentMap[K]) => object)) => {
    if (!anyTouched) touch("*");
    onUpdate(
      (latest) =>
        ({
          ...latest,
          ...(typeof patch === "function" ? patch(latest) : patch),
        }) as PageContentMap[K],
    );
  };
```

Each editor passes `set` through as `EditorProps<XPage>["set"]`. If TypeScript objects to the generic, cast at the `props` object: `const props = { set: set as EditorProps<never>["set"], errors: errorsApi };`. Better still, give `set` the parameter type `Parameters<EditorProps<PageContentMap[K]>["set"]>[0]`.

`features/pages/editor/fields.tsx`:
- In `ImagesField`, add the prop `/** Adds an uploaded image to the latest list, so moves and removals made meanwhile stay. */ onAdd: (media: Media) => void;`.
- In `pick`, replace the `next` list with:

```ts
    for (const file of chosen) {
      const result = await uploadMedia(file, "image", { ownerId });
      setBusy((n) => n - 1);
      if (result.ok) onAdd(result.media);
      else setProblem(result.error);
    }
```

`features/pages/editor/editors/ImagesEditor.tsx`: on `ImagesField`, add:

```tsx
          onAdd={(media) =>
            set((latest) => ({ images: [...latest.images, media].slice(0, LIMITS.images) }))
          }
```

- [ ] **Step 4: Bring the existing tests to the new props, and run everything.**
- In `PageEditor.test.tsx`:
  - Every `onChange={…}` on `<PageEditor>` becomes `onUpdate={…}`.
  - Where a test read the new page as `fn.mock.lastCall![0]`, it reads `fn.mock.lastCall![0](page)`, the update applied to the page the test rendered.
  - The `useState` harnesses use `onUpdate={(update) => setPage((p) => update(p))}`.
  - Remove `onChange` from the new "upload that finishes later" harness.
- In `ImagesField.test.tsx`, the first harness gets `onAdd={(media) => setImages((list) => [...list, media])}`.
- In `sections.test.tsx`'s `editorFor` and `HostedPageForm.test.tsx`'s generator mock, add `updatePage: vi.fn()`.
- Wherever a HostedPageForm test expected `setPage` to receive a content edit, expect `updatePage` instead, and apply its update to the page.

Run: `npx vitest run features && npx tsc --noEmit && npm run lint`
Expected: PASS, with no type or lint errors.

- [ ] **Step 5: Commit.**

```bash
git add features
git commit -m "Content uploads keep edits made meanwhile: page changes apply to the latest page"
```

---

### Task 8: Ship Phase 3b

**Files:** none new.

- [ ] **Step 1: Run the full local check.** The public suite needs a plain build. The signed-in suite builds its own.

Run: `npm run format:check && npm run lint && npx tsc --noEmit && npm test && npm run test:e2e:accounts && npm run build && npm run test:e2e`
Expected: all PASS. `format:check` may only list git-ignored files under `.superpowers/`.

- [ ] **Step 2: Run the final whole-branch review.** Follow the "Final Review" section of superpowers:executing-plans, with this plan's Review Focus and the ledger's rulings, and do one fix pass if needed.

- [ ] **Step 3: Confirm a recent verified backup, then apply the migration through the private SQL bridge.** This must happen before merging. The new app sends `is_private`, which the live functions don't read yet.
1. Read `/var/lib/techitdave-offserver/health.json` on the host through the strict SSH wrapper.
   Expected: a verified archive from the last 24 hours. If there isn't one, stop and tell David.
2. Run `grep -c '\\' supabase/migrations/20261015200000_private_codes.sql`.
   Expected: `0`.
3. Apply it with the bridge's `execute_sql` on project `db12f7ce-3e77-4461-a686-c8cd6de6f764`, passing the file's contents.
4. Run `notify pgrst, 'reload schema';`.

Verify with:

```sql
select
  position('is_private' in pg_get_functiondef('public.create_code(jsonb,text)'::regprocedure)) > 0 as create_reads_private,
  position('is_private' in pg_get_functiondef('public.update_code(uuid,jsonb,text,text)'::regprocedure)) > 0 as update_reads_private,
  has_function_privilege('anon', 'public.create_code(jsonb,text)', 'execute') as anon_can_create;
```

Expected: `t`, `t`, `f`. Append the migration to `~/.codex/memories/supabase-coolify.md` under "Ziplume Phase 3b migration (private codes)".

- [ ] **Step 4: Push, open the PR, and wait for CI.**

```bash
git push -u origin feat/team-views
gh pr create --base main --head feat/team-views --title "Teams 3b: switch between people, Everyone, and Private codes" --body "$(cat <<'EOF'
Phase 3b of the teams spec (docs/superpowers/specs/2026-10-14-quickqreate-teams-design.md; plan docs/superpowers/plans/2026-10-15-phase-3b-team-views.md).

- A switch row on /codes for people in a team: You, each teammate, Everyone. The sidebar switcher lists Everyone too.
- Everyone (/codes?view=everyone): your codes and teammates' shared ones, each with who made it. Actions follow each code's maker and your role, and there are no folders there.
- Private: a switch in Settings on your own codes while you're in a team, and a Private label in your list. Teammates never see private codes.
- Accepting an invite opens /codes with a one-time tip pointing at the switch row.
- Someone on their own sees none of this.
- Content uploads (images, PDFs, video, audio) that finish later keep edits made meanwhile.
- Migration (applied live before merge): create_code and update_code save is_private with the rest of a code.
- Tests: unit N passed, signed-in browser N passed, public browser N passed (fill in from Step 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks --watch
```

- [ ] **Step 5: Merge and check the live site.**
1. Merge with `gh pr merge --merge`.
2. Wait for the service worker version at `https://ziplume.com/sw.js` to change.
3. Find the chunk with "Whose codes" in the local `.next/static/chunks`, and fetch the same path from ziplume.com. It must contain "Whose codes" and "Everyone’s codes".
4. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307 when signed out.
5. Create nothing and change no data in David's account.
