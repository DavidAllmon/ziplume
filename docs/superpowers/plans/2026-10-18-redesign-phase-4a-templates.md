# Redesign Phase 4a: Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- A `/templates` page in the app: saved designs with a preview, a "Default" badge, and Rename, Set as default, Duplicate and Delete.
- "New template" opens the Design panel alone.
- Every new code, made one at a time or in bulk, starts from your default template.

**Architecture:**
- **Database:** one migration. It adds `design_templates.is_default` with a partial unique index (at most one per person), and `set_default_template`, which clears the old default before setting the new one.
- **Data helpers:**
  - `features/templates/api.ts` gains rename, duplicate and set-default;
  - `lib/templates/server.ts` reads the default design for server pages.
- **Pages:**
  - `app/(app)/templates/page.tsx` lists your templates in `TemplatesPage`.
  - `app/(app)/templates/new/page.tsx` shows `NewTemplatePage`: the Create page's `DesignSection`, with a preview, a name and "Use for new codes".
- **Create and Bulk:** their server pages read your default design and pass it in. `initialCreateState` starts from it, and "Reset to style" returns to it.
- **Navigation:** Templates joins the sidebar (after Codes and its folders) and the phone's More sheet.

**Tech Stack:**
- Next.js 16, React 19, Headless UI 2.2, Supabase (self-hosted, through the private SQL bridge), PGlite migration tests, Vitest, Playwright 1.56.
- No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md`. This plan covers:
- section 4.5 (Templates);
- 6.4 (`is_default`);
- 4.2's default design for Create;
- 3.1 (Templates in the sidebar, and in More on phones);
- 3.2 (`/templates`);
- section 8, Phase 4.

Phase 4 is split three ways: 4a is templates, 4b is the `/analytics` overview, and 4c is the code page overview polish. Each gets its own plan.

## Global Constraints

- **Templates** (spec 4.5):
  - a grid of saved designs, each with a preview, its name and a "Default" badge;
  - Rename, Set as default, Duplicate and Delete;
  - "New template" opens the Design panel alone;
  - adds `design_templates.is_default boolean not null default false`, with a partial unique index per user, so at most one default.
- **Create** (spec 4.2): every visit to `/codes/new` starts from defaults. The default design is the user's default template if they have set one; otherwise Classic.
- **Navigation** (spec 3.1):
  - Templates holds saved designs, including one default design;
  - on phones, More holds Templates, Settings, Help and Sign out.
- **Migration:**
  - a verified backup from the last 24 hours, after checking the disk has room;
  - no backslashes;
  - applied through the private SQL bridge before merging;
  - recorded in the runbook.
- **Every page** passes the responsive and axe checks at 390, 820 and 1280 px (spec 9). New controls have visible labels and 44 px targets on phones, with no sideways scroll from 320 px.
- **Every commit is formatted:** run `npx prettier --write` on the files it touches. `$WS` is this plan's workspace from `sdd-workspace`; long test output goes there.

## Rulings made in this plan (for David's review)

1. **Templates stay yours alone, even in a team,** as today. New codes are always made in your own space, so your default applies to every code you make.
2. **Bulk-created codes start from your default template too,** like single codes. Before this, bulk always used Classic.
3. **A new template starts from Classic.** "Start from a style" on that page still offers the quick styles and your templates as starting points.
4. **A saved template's design isn't edited in place.** The spec lists Rename, Set as default, Duplicate and Delete; to change a design, make a new template. Say if you want an Edit too.
5. **Deleting your default template leaves you with no default,** so new codes go back to Classic. Existing codes never change when the default does.
6. **The "Save design" box in a code's Design section stays.** What it saves appears on `/templates`. That section now marks your default and links to "Manage templates".
7. **The default is set through one database function.** It clears the old default before setting the new one, so two tabs can't leave two defaults.
8. **The migration needs a verified backup from the last 24 hours.** If there isn't one, I start the backup service myself before applying it; approving this plan approves that. I make no other server changes.

## Review Focus

1. **Two tabs setting different defaults at once,** and setting a default for a template that was just deleted. Expected: never two defaults, and a clear error rather than a broken page. *Task 1 and Task 4 tests.*
2. **Names:**
   - renaming to blank or to 61 characters;
   - duplicating a 60-character name.

   Expected: blank is refused, the rest are cut to 60, and "Copy of …" stays within 60. *Task 2 and Task 4 tests.*
3. **An old or odd saved design as the default:** missing fields, an unknown frame, or a logo too large to store. Expected: Create still opens, with the design cleaned by `sanitizeDesign`. *Task 2 and Task 3 tests.*
4. **Drafts:**
   - a draft started before a default was set: Resume keeps the draft's design;
   - a blank page with a default set doesn't count as an unfinished draft.

   *Task 3 tests.*
5. **Phones at 320 px:** the templates grid with its ⋯ menus, and the new template page. Expected: no sideways scroll, 44 px targets, and axe clean. *Task 5 sweep.*

---

### Task 1: The migration: one default template per person

**Files:**
- Create: `supabase/migrations/20261018160000_default_templates.sql`
- Test: `supabase/test/migration.test.ts` (a new `describe("default templates")` at the end)

**Interfaces:**
- Produces:
  - `design_templates.is_default boolean not null default false`, and a unique index `design_templates_one_default` on `(user_id) where is_default`;
  - `set_default_template(p_template uuid) returns void`, for `authenticated`. With null it clears the default. It refuses someone else's template, and password-only sessions of two-step accounts.

- [ ] **Step 1: Write the failing tests.** Append to `supabase/test/migration.test.ts`:

```ts
describe("default templates", () => {
  const DEB = "7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a";
  const ELI = "7b7b7b7b-7b7b-4b7b-8b7b-7b7b7b7b7b7b";
  const asDeb = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", DEB, sql, params);
  const asEli = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", ELI, sql, params);
  const make = async (name: string) =>
    (
      await asDeb<{ id: string }>(
        `insert into public.design_templates (name, design) values ($1, '{}'::jsonb) returning id`,
        [name],
      )
    )[0]!.id;
  const defaults = async () =>
    (
      await asDeb<{ name: string }>(
        "select name from public.design_templates where is_default order by name",
      )
    ).map((t) => t.name);
  let first = "";
  let second = "";

  beforeAll(async () => {
    await db.query(
      "insert into auth.users (id, email) values ($1, 'deb@example.com'), ($2, 'eli@example.com')",
      [DEB, ELI],
    );
    first = await make("Brand");
    second = await make("Party");
  });

  it("keep one default per person, switched by the function", async () => {
    expect(await defaults()).toEqual([]);
    await asDeb("select public.set_default_template($1)", [first]);
    expect(await defaults()).toEqual(["Brand"]);
    await asDeb("select public.set_default_template($1)", [second]);
    expect(await defaults()).toEqual(["Party"]);
    await asDeb("select public.set_default_template($1)", [second]);
    expect(await defaults()).toEqual(["Party"]);
    await asDeb("select public.set_default_template(null)");
    expect(await defaults()).toEqual([]);
    // Only the function sets it.
    await expect(
      asDeb("update public.design_templates set is_default = true where id = $1", [first]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asDeb(
        `insert into public.design_templates (name, design, is_default) values ('X', '{}'::jsonb, true)`,
      ),
    ).rejects.toThrow(/permission denied/);
    // Even the server can't store two.
    await expect(
      asService("update public.design_templates set is_default = true where id in ($1, $2)", [
        first,
        second,
      ]),
    ).rejects.toThrow(/design_templates_one_default/);
  });

  it("only for your own templates, with a full session", async () => {
    await expect(asEli("select public.set_default_template($1)", [first])).rejects.toThrow(
      /isn't yours/,
    );
    await expect(asAnon("select public.set_default_template($1)", [first])).rejects.toThrow(
      /permission denied/,
    );
    await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [DEB]);
    await expect(asDeb("select public.set_default_template($1)", [first])).rejects.toThrow(
      /Sign in/,
    );
    await db.query("delete from auth.mfa_factors where user_id = $1", [DEB]);
    // A template deleted since: refused, and the old default stays.
    await asDeb("select public.set_default_template($1)", [first]);
    await asDeb("delete from public.design_templates where id = $1", [second]);
    await expect(asDeb("select public.set_default_template($1)", [second])).rejects.toThrow(
      /isn't yours/,
    );
    expect(await defaults()).toEqual(["Brand"]);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run supabase/test/migration.test.ts -t "default templates"`
Expected: FAIL. `column "is_default" does not exist`.

- [ ] **Step 3: Write the migration.** Create `supabase/migrations/20261018160000_default_templates.sql`. It must contain no backslashes.

```sql
-- Templates (redesign Phase 4, spec 4.5 and 6.4): each person can mark one saved design as their
-- default, which every new code they make starts from.

alter table public.design_templates add column is_default boolean not null default false;

-- At most one default per person.
create unique index design_templates_one_default
  on public.design_templates (user_id) where is_default;

-- Makes one of your templates your default, or with null leaves you with none. The old default is
-- cleared first, so the index never sees two. Only this function sets the flag: it isn't in the
-- columns people can insert or update directly.
create function public.set_default_template(p_template uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Sign in to change your templates' using errcode = '42501';
  end if;
  -- One person's changes one at a time, so two tabs can't both set a default.
  perform pg_advisory_xact_lock(hashtextextended('default_template:' || auth.uid()::text, 0));
  if p_template is not null and not exists (
    select 1 from public.design_templates t where t.id = p_template and t.user_id = auth.uid()
  ) then
    raise exception 'That template isn''t yours' using errcode = '42501';
  end if;
  update public.design_templates
     set is_default = false
   where user_id = auth.uid() and is_default and id is distinct from p_template;
  if p_template is not null then
    update public.design_templates set is_default = true where id = p_template;
  end if;
end;
$$;

revoke all on function public.set_default_template(uuid) from public, anon;
grant execute on function public.set_default_template(uuid) to authenticated;
```

- [ ] **Step 4: Run the tests to see them pass, and check for backslashes.**

Run: `npx vitest run supabase/test/migration.test.ts && ! grep -n '\\' supabase/migrations/20261018160000_default_templates.sql`
Expected: every migration test passes, the earlier ones included, and grep finds no backslash.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20261018160000_default_templates.sql supabase/test/migration.test.ts
git commit -m "Default templates migration: one default per person, set by one function"
```

---

### Task 2: Template data: types, rename, duplicate, default, and the default design for server pages

**Files:**
- Modify: `types/supabase.ts` (`design_templates.Row.is_default`, and `Functions.set_default_template`)
- Modify: `features/templates/api.ts`
- Create: `features/templates/api.test.ts`
- Create: `lib/templates/server.ts`, `lib/templates/server.test.ts`

**Interfaces:**
- Consumes: Task 1's `set_default_template`.
- Produces:
  - `renameTemplate(id: string, name: string): Promise<Result<DesignTemplateRow>>`;
  - `duplicateTemplate(template: DesignTemplateRow): Promise<Result<DesignTemplateRow>>`;
  - `setDefaultTemplate(id: string | null): Promise<Result<null>>`;
  - `defaultDesign(supabase, userId): Promise<DesignState | null>`.

- [ ] **Step 1: Write the failing tests.**

Create `features/templates/api.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DesignTemplateRow } from "@/types/supabase";

import { duplicateTemplate, renameTemplate, setDefaultTemplate } from "./api";

const calls: { op: string; args: unknown[] }[] = [];
let answer: { data: unknown; error: unknown } = { data: null, error: null };
const chain = {
  update: (...args: unknown[]) => (calls.push({ op: "update", args }), chain),
  insert: (...args: unknown[]) => (calls.push({ op: "insert", args }), chain),
  eq: (...args: unknown[]) => (calls.push({ op: "eq", args }), chain),
  select: () => chain,
  single: async () => answer,
};
const rpc = vi.fn(async (_name: string, _args: unknown) => answer);
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({ from: () => chain, rpc }),
}));

const template = {
  id: "t1",
  user_id: "u1",
  name: "x".repeat(60),
  design: { fgColor: "#BE123C" },
  is_default: true,
  created_at: "",
  updated_at: "",
} as DesignTemplateRow;

describe("template data", () => {
  beforeEach(() => {
    calls.length = 0;
    answer = { data: template, error: null };
  });

  it("renames a template, trimmed and cut to 60 characters", async () => {
    expect((await renameTemplate("t1", `  ${"y".repeat(70)}  `)).ok).toBe(true);
    expect(calls).toContainEqual({ op: "update", args: [{ name: "y".repeat(60) }] });
    expect(calls).toContainEqual({ op: "eq", args: ["id", "t1"] });
    answer = { data: null, error: { message: "no" } };
    expect(await renameTemplate("t1", "Brand")).toEqual({
      ok: false,
      error: "The template couldn't be renamed.",
    });
  });

  it("duplicates a template as a copy that isn't the default, its name within 60", async () => {
    expect((await duplicateTemplate(template)).ok).toBe(true);
    const insert = calls.find((c) => c.op === "insert")!.args[0] as { name: string; design: unknown };
    expect(insert.name).toBe(`Copy of ${"x".repeat(52)}`);
    expect(insert.name.length).toBe(60);
    expect(insert.design).toEqual(template.design);
    expect(insert).not.toHaveProperty("is_default");
  });

  it("sets or clears the default through the database function", async () => {
    answer = { data: null, error: null };
    expect(await setDefaultTemplate("t1")).toEqual({ ok: true, value: null });
    expect(rpc).toHaveBeenLastCalledWith("set_default_template", { p_template: "t1" });
    await setDefaultTemplate(null);
    expect(rpc).toHaveBeenLastCalledWith("set_default_template", { p_template: null });
    answer = { data: null, error: { message: "That template isn't yours" } };
    expect(await setDefaultTemplate("t9")).toEqual({
      ok: false,
      error: "The default couldn't be changed. Reload and try again.",
    });
  });
});
```

Create `lib/templates/server.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";

import { defaultDesign } from "./server";

const supabase = (row: unknown) =>
  ({
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      }),
    }),
  }) as never;

describe("defaultDesign", () => {
  it("is the person's default template, cleaned, or null without one", async () => {
    const design = await defaultDesign(supabase({ design: { fgColor: "#BE123C", frame: "nope" } }), "u1");
    expect(design?.fgColor).toBe("#BE123C");
    // Anything unknown or missing falls back to Classic's.
    expect(design?.frame).toBe(DEFAULT_DESIGN.frame);
    expect(design?.dotStyle).toBe(DEFAULT_DESIGN.dotStyle);
    expect(await defaultDesign(supabase(null), "u1")).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/templates lib/templates`
Expected: FAIL. `renameTemplate` and `./server` don't exist.

- [ ] **Step 3: Add the types.** In `types/supabase.ts`:
- In `design_templates.Row`, add `is_default: boolean;` after `design: Json;`. Leave `Insert` and `Update` as they are: only the function sets it.
- In `Functions`, add:

```ts
      set_default_template: { Args: { p_template: string | null }; Returns: undefined };
```

- [ ] **Step 4: Add the data functions** to `features/templates/api.ts`:

```ts
const nameOf = (name: string) => name.trim().slice(0, 60);

export async function renameTemplate(id: string, name: string): Promise<Result<DesignTemplateRow>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { data, error } = await supabase
    .from("design_templates")
    .update({ name: nameOf(name) })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: "The template couldn't be renamed." };
  return { ok: true, value: data };
}

/** A copy of a template under "Copy of …"; a copy is never the default. */
export async function duplicateTemplate(
  template: DesignTemplateRow,
): Promise<Result<DesignTemplateRow>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { data, error } = await supabase
    .from("design_templates")
    .insert({ name: nameOf(`Copy of ${template.name}`), design: template.design })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: "The template couldn't be duplicated." };
  return { ok: true, value: data };
}

/** Makes a template your default for new codes, or with null leaves you with none (Classic). */
export async function setDefaultTemplate(id: string | null): Promise<Result<null>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { error } = await supabase.rpc("set_default_template", { p_template: id });
  return error
    ? { ok: false, error: "The default couldn't be changed. Reload and try again." }
    : { ok: true, value: null };
}
```

- [ ] **Step 5: Write `lib/templates/server.ts`.**

```ts
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeDesign } from "@/features/generator/state/sanitize";
import type { DesignState } from "@/features/generator/state/types";
import type { Database } from "@/types/supabase";

/**
 * The design a person's new codes start from (redesign spec 4.2): their default template, cleaned
 * like any saved design; null without one, which means Classic.
 */
export async function defaultDesign(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<DesignState | null> {
  const { data } = await supabase
    .from("design_templates")
    .select("design")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  return data ? sanitizeDesign(data.design) : null;
}
```

- [ ] **Step 6: Run the tests and the type check.**

Run: `npx vitest run features/templates lib/templates && npm run typecheck`
Expected:
- the tests pass;
- the type check is clean. If a test fixture builds a whole `DesignTemplateRow`, the type check names it; add `is_default: false` to it.

- [ ] **Step 7: Commit.**

```bash
git add types/supabase.ts features/templates lib/templates
git commit -m "Template data: rename, duplicate, set the default, and read it for new codes"
```

---

### Task 3: New codes start from the default template

**Files:**
- Modify: `features/create/state.ts` (`CreateDefaults.design`, `initialCreateState`), `features/create/state.test.ts`, `features/create/draft.test.ts`
- Modify: `features/create/CreatePage.tsx` (prop `defaultDesign`)
- Modify: `app/(app)/codes/new/page.tsx`
- Modify: `features/bulk/BulkCreatePage.tsx` (prop `design`), `features/bulk/BulkCreatePage.test.tsx`
- Modify: `app/(app)/codes/bulk/page.tsx`

**Interfaces:**
- Consumes: Task 2's `defaultDesign`.
- Produces:
  - `CreateDefaults.design?: DesignState | null`;
  - `CreatePage` prop `defaultDesign?: DesignState | null`;
  - `BulkCreatePage` prop `design?: DesignState | null`.

- [ ] **Step 1: Write the failing tests.**

Append to `features/create/state.test.ts` (with any imports it lacks: `DEFAULT_DESIGN` from `@/features/generator/state/defaults`, and `createReducer` and `initialCreateState` from `./state`):

```ts
describe("the default template", () => {
  const brand = { ...DEFAULT_DESIGN, fgColor: "#BE123C", dotStyle: "rounded" as const };

  it("starts a new code, and Reset to style returns to it", () => {
    const state = initialCreateState({ type: "url", folderId: null, design: brand });
    expect(state.code.design).toEqual(brand);
    const changed = createReducer(state, {
      type: "code",
      action: { type: "setDesign", patch: { fgColor: "#000000" } },
    });
    expect(createReducer(changed, { type: "resetToStyle" }).code.design.fgColor).toBe("#BE123C");
  });

  it("is Classic without one", () => {
    expect(initialCreateState({ type: "url", folderId: null }).code.design).toEqual(DEFAULT_DESIGN);
    expect(initialCreateState({ type: "url", folderId: null, design: null }).code.design).toEqual(
      DEFAULT_DESIGN,
    );
  });

  it("brings a template's logo with the raised scan reliability a logo needs", () => {
    const withLogo = { ...brand, logoIcon: "link" as never, errorCorrection: "M" as const };
    const state = initialCreateState({ type: "url", folderId: null, design: withLogo });
    expect(state.code.design.errorCorrection).toBe("H");
    expect(state.code.ecBeforeLogo).toBe("M");
  });
});
```

Append to `features/create/draft.test.ts` (with any imports it lacks, such as `isBlank` and `initialCreateState`):

```ts
describe("drafts with a default template", () => {
  it("don't count a fresh page that starts from the default as unfinished", () => {
    const defaults = {
      type: "url" as const,
      folderId: null,
      design: { ...DEFAULT_DESIGN, fgColor: "#BE123C" },
    };
    expect(isBlank(initialCreateState(defaults), defaults)).toBe(true);
    // Against the plain defaults, the same page is a change.
    expect(isBlank(initialCreateState(defaults), { type: "url", folderId: null })).toBe(false);
  });
});
```

Append to `features/bulk/BulkCreatePage.test.tsx`, inside its `describe`:

```tsx
  it("makes each code in the default template's design", async () => {
    const user = userEvent.setup();
    savesAll();
    const brand = { ...DEFAULT_DESIGN, fgColor: "#BE123C" };
    renderPage({ design: brand });
    paste("name,url\nMenu,https://example.com/menu");
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    expect(createCodes).toHaveBeenCalledWith(
      [expect.objectContaining({ design: brand })],
      expect.any(Function),
    );
  });
```

(Import `DEFAULT_DESIGN` from `@/features/generator/state/defaults` in that file if it doesn't already.)

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/create/state.test.ts features/create/draft.test.ts features/bulk/BulkCreatePage.test.tsx`
Expected: FAIL. The state starts from Classic whatever `design` says, and bulk uses `DEFAULT_DESIGN`.

- [ ] **Step 3: Start Create from the default.** In `features/create/state.ts`:
- **`CreateDefaults`:** add

```ts
  /** The person's default template (redesign spec 4.2); Classic without one. */
  design?: DesignState | null;
```

- **`initialCreateState`:** replace it with

```ts
export function initialCreateState(defaults: CreateDefaults): CreateState {
  const fresh = { ...initialState(), activeType: defaults.type };
  // Applied like any template, so a template's logo raises scan reliability as it should.
  const code = defaults.design
    ? generatorReducer(fresh, { type: "applyDesign", design: defaults.design })
    : fresh;
  return {
    code,
    settings: { ...DEFAULT_SETTINGS, utm: { ...DEFAULT_SETTINGS.utm } },
    folderId: defaults.folderId,
    styleDesign: code.design,
  };
}
```

In `features/create/CreatePage.tsx`:
1. Add `defaultDesign?: DesignState | null;` to `CreatePageProps`, with the comment `/** Your default template's design, which a new code starts from. */`.
2. Destructure it in `CreateEditor`.
3. Change the `defaults` memo to:

```ts
  const defaults = useMemo(
    () => ({ type: initialType, folderId: initialFolderId, design: defaultDesign ?? null }),
    [initialType, initialFolderId, defaultDesign],
  );
```

In `app/(app)/codes/new/page.tsx`:
1. Import `defaultDesign` from `@/lib/templates/server`.
2. Add it to the `Promise.all`:

```ts
  const [{ data: folders }, team, design] = await Promise.all([
    supabase.from("folders").select("*").eq("user_id", user.id).order("name"),
    loadTeam(supabase),
    defaultDesign(supabase, user.id),
  ]);
```

3. Pass `defaultDesign={design}` to `CreatePage`.

- [ ] **Step 4: Bulk too.** In `features/bulk/BulkCreatePage.tsx`:
1. Add this to `BulkCreatePageProps`:

```ts
  /** Your default template's design; Classic without one. */
  design?: DesignState | null;
```

2. Destructure it as `design: defaultDesignProp`, and add `const design = defaultDesignProp ?? DEFAULT_DESIGN;` near the top of the component.
3. Use `design` in place of `DEFAULT_DESIGN` in both places: `parseBulk(type, text, design.errorCorrection)` (adding `design` to that memo's dependencies), and `design,` in the `createCodes` inputs.

In `app/(app)/codes/bulk/page.tsx`:
1. Import `defaultDesign`.
2. Read it alongside the folders:

```ts
  const [{ data: folders }, design] = await Promise.all([
    supabase.from("folders").select("*").eq("user_id", user.id).order("name"),
    defaultDesign(supabase, user.id),
  ]);
```

3. Pass `design={design}` to `BulkCreatePage`.

- [ ] **Step 5: Run the tests and the type check.**

Run: `npx vitest run features/create features/bulk && npm run typecheck`
Expected: all pass, and the type check is clean.

- [ ] **Step 6: Commit.**

```bash
git add features/create features/bulk "app/(app)/codes/new/page.tsx" "app/(app)/codes/bulk/page.tsx"
git commit -m "New codes, one at a time or in bulk, start from your default template"
```

---

### Task 4: The Templates page, New template, and Templates in the navigation

**Files:**
- Modify: `features/generator/style/TemplatesSection.tsx` (export `DesignPreview`; `canSave`; Default badge; "Manage templates" link)
- Modify: `features/create/sections/DesignSection.tsx` (prop `saveTemplates`)
- Create: `features/templates/TemplatesPage.tsx`, `features/templates/TemplatesPage.test.tsx`
- Create: `features/templates/NewTemplatePage.tsx`, `features/templates/NewTemplatePage.test.tsx`
- Create: `app/(app)/templates/page.tsx`, `app/(app)/templates/new/page.tsx`
- Modify: `components/app/AppShell.tsx`, `components/app/AppShell.test.tsx`

**Interfaces:**
- Consumes:
  - Task 2's data functions, together with `saveTemplate` and `deleteTemplate`;
  - `DesignSection({ design, dispatch, onResetToStyle, saveTemplates })`.
- Produces:
  - `TemplatesPage({ templates })`;
  - `NewTemplatePage()`;
  - `DesignPreview({ design })`.

- [ ] **Step 1: Write the failing tests.**

Create `features/templates/TemplatesPage.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type { DesignTemplateRow } from "@/types/supabase";

import { deleteTemplate, duplicateTemplate, renameTemplate, setDefaultTemplate } from "./api";
import { TemplatesPage } from "./TemplatesPage";

vi.mock("./api", () => ({
  setDefaultTemplate: vi.fn(async () => ({ ok: true, value: null })),
  renameTemplate: vi.fn(),
  duplicateTemplate: vi.fn(),
  deleteTemplate: vi.fn(async () => ({ ok: true, value: null })),
}));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));

const row = (id: string, name: string, isDefault = false) =>
  ({
    id,
    user_id: "u1",
    name,
    design: {},
    is_default: isDefault,
    created_at: "",
    updated_at: "",
  }) as DesignTemplateRow;
const show = (templates: DesignTemplateRow[]) =>
  render(
    <ToastProvider>
      <TemplatesPage templates={templates} />
    </ToastProvider>,
  );
const card = (name: string) => within(screen.getByRole("listitem", { name }));

describe("TemplatesPage", () => {
  beforeEach(() => vi.mocked(setDefaultTemplate).mockClear());

  it("says what to do when there are none", () => {
    show([]);
    expect(screen.getByText(/No templates yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New template/ })).toHaveAttribute(
      "href",
      "/templates/new",
    );
  });

  it("marks the default, and moves it when another is set", async () => {
    const user = userEvent.setup();
    show([row("t1", "Brand", true), row("t2", "Party")]);
    expect(card("Brand").getByText("Default")).toBeInTheDocument();
    expect(card("Party").queryByText("Default")).toBeNull();
    await user.click(card("Party").getByRole("button", { name: "Actions for Party" }));
    await user.click(screen.getByRole("menuitem", { name: "Set as default" }));
    expect(setDefaultTemplate).toHaveBeenCalledWith("t2");
    expect(card("Party").getByText("Default")).toBeInTheDocument();
    expect(card("Brand").queryByText("Default")).toBeNull();
    // The default's own menu offers to go back to Classic.
    await user.click(card("Party").getByRole("button", { name: "Actions for Party" }));
    await user.click(screen.getByRole("menuitem", { name: "Stop using as default" }));
    expect(setDefaultTemplate).toHaveBeenLastCalledWith(null);
  });

  it("renames, duplicates and deletes", async () => {
    const user = userEvent.setup();
    vi.mocked(renameTemplate).mockResolvedValue({ ok: true, value: row("t1", "Brand 2") });
    vi.mocked(duplicateTemplate).mockResolvedValue({ ok: true, value: row("t3", "Copy of Brand 2") });
    show([row("t1", "Brand")]);
    await user.click(screen.getByRole("button", { name: "Actions for Brand" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    const field = screen.getByRole("textbox", { name: "Name" });
    await user.clear(field);
    await user.type(field, "Brand 2");
    await user.click(screen.getByRole("button", { name: "Rename" }));
    expect(renameTemplate).toHaveBeenCalledWith("t1", "Brand 2");
    expect(await screen.findByRole("listitem", { name: "Brand 2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actions for Brand 2" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(await screen.findByRole("listitem", { name: "Copy of Brand 2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actions for Copy of Brand 2" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete template" }));
    expect(deleteTemplate).toHaveBeenCalledWith("t3");
    await vi.waitFor(() =>
      expect(screen.queryByRole("listitem", { name: "Copy of Brand 2" })).toBeNull(),
    );
  });

  it("keeps the default where it was when setting one fails", async () => {
    const user = userEvent.setup();
    vi.mocked(setDefaultTemplate).mockResolvedValueOnce({
      ok: false,
      error: "The default couldn't be changed. Reload and try again.",
    });
    show([row("t1", "Brand", true), row("t2", "Party")]);
    await user.click(card("Party").getByRole("button", { name: "Actions for Party" }));
    await user.click(screen.getByRole("menuitem", { name: "Set as default" }));
    expect(await screen.findByText(/couldn't be changed/)).toBeInTheDocument();
    expect(card("Brand").getByText("Default")).toBeInTheDocument();
  });
});
```

Create `features/templates/NewTemplatePage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { saveTemplate, setDefaultTemplate } from "./api";
import { NewTemplatePage } from "./NewTemplatePage";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./api", () => ({
  saveTemplate: vi.fn(async (name: string) => ({
    ok: true,
    value: { id: "t1", name },
    droppedLogo: false,
  })),
  setDefaultTemplate: vi.fn(async () => ({ ok: true, value: null })),
}));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));
vi.mock("@/features/auth/useSession", () => ({
  useSession: () => ({ user: null, loading: true }),
}));

const show = () =>
  render(
    <ToastProvider>
      <NewTemplatePage />
    </ToastProvider>,
  );

describe("NewTemplatePage", () => {
  it("is the Design panel alone, without a second Save box", () => {
    show();
    expect(screen.getByRole("heading", { name: "QR code design" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save design" })).toBeNull();
  });

  it("needs a name, then saves the design and can make it the default", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Save template" }));
    expect(screen.getByText("Name the template")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Name/ })).toHaveFocus();
    expect(saveTemplate).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Brand");
    await user.click(screen.getByRole("switch", { name: "Use for new codes" }));
    await user.click(screen.getByRole("button", { name: "Save template" }));
    expect(saveTemplate).toHaveBeenCalledWith("Brand", expect.objectContaining({ dotStyle: "rounded" }));
    expect(setDefaultTemplate).toHaveBeenCalledWith("t1");
    expect(push).toHaveBeenCalledWith("/templates");
  });
});
```

(`dotStyle: "rounded"` is Classic's, from `features/generator/state/defaults.ts`.)

Append to `components/app/AppShell.test.tsx`. Follow the file's own render helper for a signed-in user; if its helper isn't called `renderShell`, use the file's name.

```tsx
describe("Templates in the navigation", () => {
  it("is in the sidebar after Codes, and in More on phones", async () => {
    const user = userEvent.setup();
    renderShell();
    const sidebar = within(screen.getByRole("complementary", { name: "Sidebar" }));
    expect(sidebar.getByRole("link", { name: "Templates" })).toHaveAttribute("href", "/templates");
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(
      within(screen.getByRole("dialog", { name: "More" })).getByRole("link", { name: "Templates" }),
    ).toHaveAttribute("href", "/templates");
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/templates components/app/AppShell.test.tsx`
Expected: FAIL. `./TemplatesPage` and `./NewTemplatePage` can't be found, and there's no Templates link.

- [ ] **Step 3: Let the Design section share its preview and skip its Save box.**

In `features/generator/style/TemplatesSection.tsx`:
1. Rename `StylePreview` to `DesignPreview`, `export` it, and update its uses.
2. Add `canSave?: boolean` to `TemplatesSectionProps`, with the comment `/** The "Save design" box; off where the page has its own Save (New template). */`. Pass it from `TemplatesSection` to `MyTemplates` (`<MyTemplates design={design} dispatch={dispatch} canSave={canSave} />`, with `canSave = true` in `TemplatesSection`'s destructuring).
3. In `MyTemplates`:
   - wrap the `<form onSubmit={onSave}>` in `{canSave !== false && (...)}`;
   - replace the `My templates` heading span with:

```tsx
      <div className="flex items-center justify-between gap-2">
        <span id="my-templates" className="text-sm font-medium text-fg">
          My templates
        </span>
        <Link
          href="/templates"
          className="text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          Manage templates
        </Link>
      </div>
```

   - after the template's name `<span>`, add `{template.is_default && <span className="px-0.5 text-[11px] font-semibold text-fg-muted">Default</span>}`.

In `features/create/sections/DesignSection.tsx`:
1. Add a prop `saveTemplates = true`, typed `saveTemplates?: boolean`, with the comment `/** Shows the "Save design" box under your templates. */`.
2. Render `<TemplatesSection design={design} dispatch={dispatch} canSave={saveTemplates} />`.

- [ ] **Step 4: Write `features/templates/TemplatesPage.tsx`.**

```tsx
"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Copy, MoreHorizontal, Pencil, Plus, Star, StarOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { menuItemClass, menuPanelClass } from "@/components/app/nav";
import { PageHeader } from "@/components/app/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { useToast } from "@/components/ui/Toast";
import { sanitizeDesign } from "@/features/generator/state/sanitize";
import { DesignPreview } from "@/features/generator/style/TemplatesSection";
import type { DesignTemplateRow } from "@/types/supabase";

import { deleteTemplate, duplicateTemplate, renameTemplate, setDefaultTemplate } from "./api";

/** Saved designs (redesign spec 4.5). One can be the default that every new code starts from. */
export function TemplatesPage({ templates: initial }: { templates: DesignTemplateRow[] }) {
  const toast = useToast();
  const [templates, setTemplates] = useState(initial);
  const [renaming, setRenaming] = useState<DesignTemplateRow | null>(null);
  const [deleting, setDeleting] = useState<DesignTemplateRow | null>(null);
  const [pending, setPending] = useState(false);

  async function makeDefault(template: DesignTemplateRow | null) {
    const result = await setDefaultTemplate(template?.id ?? null);
    if (!result.ok) return toast(result.error, "error");
    setTemplates((list) => list.map((t) => ({ ...t, is_default: t.id === template?.id })));
    toast(
      template ? `New codes now start from “${template.name}”` : "New codes now start from Classic",
    );
  }

  async function duplicate(template: DesignTemplateRow) {
    const result = await duplicateTemplate(template);
    if (!result.ok) return toast(result.error, "error");
    setTemplates((list) => [result.value, ...list]);
    toast(`Duplicated as “${result.value.name}”`);
  }

  async function rename(name: string) {
    if (!renaming) return;
    const result = await renameTemplate(renaming.id, name);
    if (!result.ok) return result.error;
    setTemplates((list) => list.map((t) => (t.id === renaming.id ? result.value : t)));
  }

  async function remove() {
    if (!deleting) return;
    setPending(true);
    const result = await deleteTemplate(deleting.id);
    setPending(false);
    if (!result.ok) return toast(result.error, "error");
    setTemplates((list) => list.filter((t) => t.id !== deleting.id));
    toast(`Deleted “${deleting.name}”`);
    setDeleting(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Templates"
        description="Saved designs. Your default one starts every new code."
        actions={
          <Link href="/templates/new" className={buttonClasses("primary")}>
            <Plus aria-hidden /> New template
          </Link>
        }
      />
      {templates.length === 0 ? (
        <p className="rounded-card border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-fg-muted">
          No templates yet. Make one here, or save a code’s design from its Design section.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {templates.map((template) => (
            <li
              key={template.id}
              aria-label={template.name}
              className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface p-2.5 sm:p-3"
            >
              <DesignPreview design={sanitizeDesign(template.design)} />
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 pt-1">
                  <p className="truncate text-sm font-semibold text-fg">{template.name}</p>
                  {template.is_default && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-fg">
                      <Star aria-hidden className="size-3" /> Default
                    </p>
                  )}
                </div>
                <Menu as="div" className="relative shrink-0">
                  <MenuButton
                    aria-label={`Actions for ${template.name}`}
                    className="grid size-11 place-items-center rounded-control text-fg-muted hover:bg-surface-2 hover:text-fg data-focus:outline-2 data-focus:outline-ring sm:size-9"
                  >
                    <MoreHorizontal aria-hidden className="size-5" />
                  </MenuButton>
                  <MenuItems
                    anchor={{ to: "bottom end", gap: 4 }}
                    transition
                    className={menuPanelClass}
                  >
                    <MenuItem>
                      {template.is_default ? (
                        <button
                          type="button"
                          className={menuItemClass}
                          onClick={() => void makeDefault(null)}
                        >
                          <StarOff aria-hidden /> Stop using as default
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={menuItemClass}
                          onClick={() => void makeDefault(template)}
                        >
                          <Star aria-hidden /> Set as default
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      <button
                        type="button"
                        className={menuItemClass}
                        onClick={() => setRenaming(template)}
                      >
                        <Pencil aria-hidden /> Rename
                      </button>
                    </MenuItem>
                    <MenuItem>
                      <button
                        type="button"
                        className={menuItemClass}
                        onClick={() => void duplicate(template)}
                      >
                        <Copy aria-hidden /> Duplicate
                      </button>
                    </MenuItem>
                    <MenuItem>
                      <button
                        type="button"
                        className={menuItemClass}
                        onClick={() => setDeleting(template)}
                      >
                        <Trash2 aria-hidden /> Delete
                      </button>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </div>
            </li>
          ))}
        </ul>
      )}
      <PromptDialog
        open={renaming !== null}
        title="Rename template"
        label="Name"
        initialValue={renaming?.name ?? ""}
        confirmLabel="Rename"
        maxLength={60}
        onSubmit={rename}
        onClose={() => setRenaming(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description={
          deleting?.is_default
            ? "It’s your default, so new codes will start from Classic. Codes already made with it don’t change."
            : "Codes already made with it don’t change."
        }
        confirmLabel="Delete template"
        danger
        pending={pending}
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
```

- [ ] **Step 5: Write `features/templates/NewTemplatePage.tsx`.**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useReducer, useRef, useState, type FormEvent } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/inputs";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { DesignSection } from "@/features/create/sections/DesignSection";
import { QrView } from "@/features/generator/preview/QrView";
import { initialState } from "@/features/generator/state/defaults";
import { generatorReducer } from "@/features/generator/state/reducer";
import type { DesignState, GeneratorAction } from "@/features/generator/state/types";
import type { RenderOptions } from "@/lib/qr/renderer";

import { saveTemplate, setDefaultTemplate } from "./api";

const SAMPLE = "https://ziplume.com";

/** "New template" (redesign spec 4.5): the Design panel alone, with a name and Save. */
export function NewTemplatePage() {
  const router = useRouter();
  const toast = useToast();
  const nameId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [state, dispatchCode] = useReducer(generatorReducer, undefined, initialState);
  // The style last applied, for Reset to style.
  const [style, setStyle] = useState<DesignState>(() => state.design);
  const [name, setName] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const dispatch = (action: GeneratorAction) => {
    if (action.type === "applyDesign") setStyle(action.design);
    dispatchCode(action);
  };
  const preview: RenderOptions = useMemo(
    () => ({ ...state.design, data: SAMPLE, size: 600 }),
    [state.design],
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Name the template");
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    const result = await saveTemplate(name, state.design);
    if (!result.ok) {
      setSaving(false);
      return toast(result.error, "error");
    }
    if (makeDefault) {
      const set = await setDefaultTemplate(result.value.id);
      if (!set.ok) toast(set.error, "error");
    }
    toast(
      result.droppedLogo
        ? `Saved “${result.value.name}”. The logo was too large to store and was left out.`
        : `Saved “${result.value.name}”`,
    );
    router.push("/templates");
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-6">
      <PageHeader title="New template" description="Design it once, then use it for any code." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <DesignSection
          design={state.design}
          dispatch={dispatch}
          onResetToStyle={() => dispatchCode({ type: "applyDesign", design: style })}
          saveTemplates={false}
        />
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4 p-5">
              <div className="mx-auto w-full max-w-60 overflow-hidden rounded-xl bg-white p-3 ring-1 ring-black/5">
                <QrView options={preview} resolution={600} label="Preview of the template" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={nameId} className="text-sm font-medium text-fg">
                  Name
                </label>
                <TextInput
                  ref={nameRef}
                  id={nameId}
                  value={name}
                  maxLength={60}
                  placeholder="Brand"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${nameId}-error` : undefined}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                  }}
                />
                {error && (
                  <p id={`${nameId}-error`} className="text-sm text-danger">
                    {error}
                  </p>
                )}
              </div>
              <Toggle
                label="Use for new codes"
                description="Every code you make will start from this design."
                checked={makeDefault}
                onChange={setMakeDefault}
              />
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save template"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
```

`TextInput` spreads its props onto the `<input>`, and React 19 passes `ref` as a prop, so the ref reaches the field.

- [ ] **Step 6: Add the routes.**

`app/(app)/templates/page.tsx`:

```tsx
import type { Metadata } from "next";

import { TemplatesPage } from "@/features/templates/TemplatesPage";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Templates" };

/** Your saved designs; templates are always your own, whichever team's codes you're in. */
export default async function TemplatesRoute() {
  const { supabase } = await requireUser("/templates");
  const { data: templates } = await supabase
    .from("design_templates")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return <TemplatesPage templates={templates ?? []} />;
}
```

`app/(app)/templates/new/page.tsx`:

```tsx
import type { Metadata } from "next";

import { NewTemplatePage } from "@/features/templates/NewTemplatePage";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "New template" };

export default async function NewTemplateRoute() {
  await requireUser("/templates/new");
  return <NewTemplatePage />;
}
```

- [ ] **Step 7: Templates in the navigation.** In `components/app/AppShell.tsx`:
1. Import `LayoutTemplate` from `lucide-react`.
2. Change `main` to:

```ts
  const main: NavItem[] = [
    { href: codesHref, label: "Codes", icon: QrCode },
    { href: "/templates", label: "Templates", icon: LayoutTemplate },
    { href: "/team", label: "Team", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
```

3. Change `more` to start with Templates:

```ts
  const more: NavItem[] = [
    { href: "/templates", label: "Templates", icon: LayoutTemplate },
    { href: "/settings", label: "Settings", icon: Settings },
    ...help,
  ];
```

- [ ] **Step 8: Run the tests, lint and the type check.**

Run: `npx vitest run features/templates features/create features/generator components/app && npm run lint && npm run typecheck`
Expected:
- all pass;
- the existing AppShell tests still pass. If one counts the sidebar's links, update its count with a ruling;
- lint and the type check are clean.

- [ ] **Step 9: Commit.**

```bash
git add features/templates features/generator/style/TemplatesSection.tsx features/create/sections/DesignSection.tsx "app/(app)/templates" components/app
git commit -m "Templates page: set a default, rename, duplicate, delete, and New template"
```

---

### Task 5: Browser tests, and ship Phase 4a with the migration

**Files:**
- Modify: `e2e/accounts/fixtures.ts` (a `DESIGNER` account)
- Modify: `e2e/accounts/global-setup.ts` (create and sign in the account)
- Create: `e2e/accounts/templates.spec.ts`
- Modify: `e2e/accounts/app.spec.ts` (`PAGES` gains `templates` and `templates/new`)

- [ ] **Step 1: Add an account of its own,** so other tests' new codes never pick up its default. In `e2e/accounts/fixtures.ts`, after `SKY`:

```ts
/** Sets a default template in the Templates tests, so no other test's new codes start from it. */
export const DESIGNER = {
  email: "designer@example.com",
  password: "designer-e2e-pass-2026",
  name: "Dana Designer",
  state: `${AUTH_DIR}/designer.json`,
};
```

In `e2e/accounts/global-setup.ts`:
1. Import `DESIGNER`.
2. Add it to the delete-old-users list and to the sign-in list.
3. Add `await create(DESIGNER);` after `const pagesId = await create(PAGES);`.

- [ ] **Step 2: Write the spec.** Create `e2e/accounts/templates.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { DESIGNER } from "./fixtures";

test.use({ storageState: DESIGNER.state });
// One account's templates, used in order.
test.describe.configure({ mode: "serial", retries: 0 });

test.describe("Templates", () => {
  test("a new template becomes the default, and new codes start from it", async ({ page }) => {
    await page.goto("templates");
    await expect(page.getByText(/No templates yet/)).toBeVisible();
    await page.getByRole("link", { name: "New template" }).click();
    await expect(page).toHaveURL(/\/templates\/new$/);

    await page.getByRole("button", { name: /^Colors/ }).click();
    const color = page.getByRole("textbox", { name: "Code color" });
    await color.fill("#BE123C");
    await color.press("Tab");
    await page.getByRole("textbox", { name: /^Name/ }).fill("Brand");
    await page.getByRole("switch", { name: "Use for new codes" }).click();
    await page.getByRole("button", { name: "Save template" }).click();

    await expect(page).toHaveURL(/\/templates$/);
    const brand = page.getByRole("listitem", { name: "Brand" });
    await expect(brand.getByText("Default")).toBeVisible();

    await page.goto("codes/new?type=text");
    // The editor keeps the design on its QR code tab.
    await page.getByRole("tab", { name: "QR code" }).click();
    await page.getByRole("button", { name: /^Colors/ }).click();
    await expect(page.getByRole("textbox", { name: "Code color" })).toHaveValue("#BE123C");
  });

  test("templates are renamed, duplicated, made default and deleted", async ({ page }) => {
    await page.goto("templates");
    await page.getByRole("button", { name: "Actions for Brand" }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("Brand 2");
    await page.getByRole("button", { name: "Rename" }).click();
    await expect(page.getByRole("listitem", { name: "Brand 2" })).toBeVisible();

    await page.getByRole("button", { name: "Actions for Brand 2" }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    const copy = page.getByRole("listitem", { name: "Copy of Brand 2" });
    await expect(copy).toBeVisible();
    await expect(copy.getByText("Default")).toHaveCount(0);

    await copy.getByRole("button", { name: "Actions for Copy of Brand 2" }).click();
    await page.getByRole("menuitem", { name: "Set as default" }).click();
    await expect(copy.getByText("Default")).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Brand 2" }).getByText("Default")).toHaveCount(0);

    await copy.getByRole("button", { name: "Actions for Copy of Brand 2" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete template" }).click();
    await expect(page.getByRole("listitem", { name: "Copy of Brand 2" })).toHaveCount(0);
    // A reload shows what the database kept.
    await page.reload();
    await expect(page.getByRole("listitem", { name: "Brand 2" })).toBeVisible();
    await expect(page.getByText("Default")).toHaveCount(0);
  });
});
```

- [ ] **Step 3: Add the pages to the responsive and axe sweep.** In `e2e/accounts/app.spec.ts`, add `"templates"` and `"templates/new"` to `PAGES`, after `"codes/bulk"`.

- [ ] **Step 4: Run the signed-in browser tests.** Apply the migration locally first.

Run: `npx --yes supabase@2.120.0 migration up --local && npm run test:e2e:accounts`
Expected: every test passes, the new spec and the sweep's new pages included.

- [ ] **Step 5: Rebuild plain, and run the signed-out browser tests.**

Run: `npm run build && npm run test:e2e`
Expected: all PASS.

Commit:

```bash
git add e2e
git commit -m "Browser tests for templates, and Templates in the axe and phone sweep"
```

- [ ] **Step 6: Run the full local check.**

Run: `npx prettier --check . --ignore-path .gitignore --ignore-path .prettierignore --ignore-path .git/info/exclude && npm run lint && npm run typecheck && npm test`
Expected: all PASS.

- [ ] **Step 7: Run the final whole-branch review,** with this plan's Review Focus and the ledger's rulings. Then do one fix pass.

- [ ] **Step 8: Apply the migration to the live database before merging** (ruling 8). This uses the scratchpad's `srv.sh` and `bridge_read.py` (project `db12f7ce-3e77-4461-a686-c8cd6de6f764`). Nothing else on the server changes.
1. **Disk:** run `srv.sh 'df -h /'`. There must be room for a backup: 3 GiB plus headroom.
2. **Backup:** read `/var/lib/techitdave-offserver/health.json`. The latest verified archive must be from the last 24 hours. If it isn't:
   - run `srv.sh 'systemctl start --no-block techitdave-supabase-backup.service'`;
   - re-read `health.json` until a new archive is verified;
   - then run `techitdave-offserver retain`.
3. **Apply:** send the migration through `bridge_read.py` as one `begin; … commit;` batch, using Python's `subprocess`. Then send `notify pgrst, 'reload schema'`, and check the `quickqreate-1791927515091-rest` log for the reload.
4. **Verify** through the bridge:
   - `is_default` exists with default `false`, and no row is true;
   - the index `design_templates_one_default` exists;
   - `has_function_privilege('authenticated', 'public.set_default_template(uuid)', 'execute')` is true, and the same for `anon` is false;
   - `has_column_privilege('authenticated', 'public.design_templates', 'is_default', 'update')` is false;
   - `select count(*) from public.design_templates` is unchanged.
5. **Record it in the runbook** `~/.codex/memories/supabase-coolify.md`, with the rollback: `drop function public.set_default_template(uuid); drop index public.design_templates_one_default; alter table public.design_templates drop column is_default;`.

- [ ] **Step 9: Push, open the PR, wait for CI, and merge.**

```bash
git push -u origin feat/redesign-phase-4a
gh pr create --base main --head feat/redesign-phase-4a --title "Redesign 4a: Templates, with a default design for new codes" --body "<spec 4.5 and 6.4, the migration (applied live before merge), rulings, and test counts>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
gh pr merge --merge
```

- [ ] **Step 10: Check the live site.**
1. Wait for the version in `https://ziplume.com/sw.js` to change.
2. Find client chunks containing "Stop using as default" and "Use for new codes".
3. `/templates` returns 307 when signed out.
4. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307.
5. Create nothing in David's account.
