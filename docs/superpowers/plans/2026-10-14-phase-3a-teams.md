# Phase 3a: Teams — Sharing Rules, Team Page, Leaving and Removing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teammates see each other's codes both ways, roles decide who can change teammates' codes, everyone creates in their own space, and leaving or being removed (with keep-or-take) ends the sharing cleanly.

**Architecture:**
- **Database:** one migration rewrites `can_view` and `can_edit`, the two functions every access rule already calls. It adds:
  - one team per person
  - a `my_team()` lookup
  - a `remove_member(…, keep)` function
  - Private-code rules (the `is_private` column; its switch arrives in 3b).
- **App:** reads the team through `my_team()` via small access helpers. Creating always targets your own space. The Team page gets owner, member and solo views, and a keep-or-take removal dialog. That dialog copies hosted-page images on the server before moving codes.

**Tech Stack:** Next.js 16.4 App Router (server actions), React 19.3, Tailwind 4.3, Headless UI 2.2, Supabase (RLS, plpgsql, Storage), Vitest 5 with Testing Library and PGlite, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-14-quickqreate-teams-design.md` (all sections; 3a covers §3, §4, §7, §8 and the rules part of §6). The redesign spec's §8 lists this as Phase 3.

## Scope

- **3a (this plan):** the rules, the Team page, leaving and removing, and creating in your own space. Private codes are enforced by the database here, but their switch is 3b.
- **3b (next plan):**
  - the switch row and the Everyone view on `/codes`
  - the Private switch and lock badge
  - the one-time "joined" tip, and "Created by" labels.

## Global Constraints

- **Wording:** plain, short, sentence case. Roles are Owner, Editor and Viewer.
- **Readability:** 13px minimum text, theme tokens only, 44px tap targets on phones.
- **Responsive:** every changed page passes the 390, 820 and 1280px sweep, with no sideways scroll and no axe violations.
- **Unchanged:** printed codes and links (`/r/<slug>`, `/p/<slug>`) never change, including when codes move to the owner.
- **Two-step accounts:** they still need a two-step session for every team read and write.
- **Solo accounts:** no team wording or controls appear for someone who isn't in a team.
- **Migration:**
  - a new versioned file with no backslashes
  - applied live after a verified backup and before merging
  - recorded in the runbook
  - it must keep the live app working between the migration and the deploy, so `my_workspaces()` and `team_overview()` stay unchanged, and a later phase drops them.
- **CI:** the jobs "Lint, test & build" and "Signed-in browser tests" must both pass.

## Review Focus

1. **Removal stops partway** (a page image fails to copy, or a folder name clashes). Nothing is half-moved: the member stays on the team, and the owner sees why. *Task 5, "if a page image can't be copied, nobody is removed"; Task 1, "removing with keep moves shared codes and folders to the owner; private codes stay".*
2. **A Private code is reached sideways:** through scans, feedback, scan counts, a password change or an update by an editor. Every path is closed to everyone but its maker. *Task 1, "private codes stay private: no reads, scans, counts or changes by teammates".*
3. **Someone already in a team opens another invite, or a member tries to invite.** They get a clear message naming the teams, and nothing changes. *Task 1, "one team per person"; Task 5, "explains why an invite can't be accepted".*
4. **A viewer opens a teammate's code.** They can look but see no edit controls. Their own codes stay fully editable. *Task 6, "a viewer looks at a teammate's code but edits their own".*
5. **Duplicating a teammate's code.** The copy lands in your own codes (the database forbids creating elsewhere). The page says so rather than failing. *Task 3, "a teammate's code is copied into your own codes".*

## Rulings Made While Planning

Ledger each at setup.

1. **Keep `my_workspaces()` and `team_overview()` unchanged in this phase,** though the app stops calling them. `my_workspaces()` still returns the team a member is in. The migration lands before the deploy, and dropping them would break the old app in between. Cost if wrong: two unused functions until a later cleanup.
2. **Removal copies hosted-page images in a server action (service role) before calling `remove_member`.** The database can't copy storage files. If copying fails, nothing is removed. Cost if wrong: copied images left over if the later database step fails (harmless; public files nobody links to).
3. **The old generator (`/`) keeps editing teammates' codes, but new codes there always save to your own account.** Its `?workspace=` branch for new codes is removed. Cost if wrong: none; Phase 5 replaces it.
4. **"Remove" defaults to "Keep their codes"** in the dialog. It's the safe choice for printed codes. Cost if wrong: one extra click to let them take their codes.

## File Structure

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20261014170000_teams.sql` | One team per person; `team_owner`; new `can_view`/`can_edit`; `is_private` and its rules; own-space inserts; `my_team()`; `remove_member`; one-team `accept_invite`; members can't invite |
| `supabase/test/migration.test.ts` | New "teams" tests; two old one-way tests updated |
| `types/supabase.ts` | `is_private`, `my_team`, `remove_member` |
| `lib/teams/access.ts` (+ test) | `TeamPerson`, `toTeam`, `personLabel`, `accessTo` (pure) |
| `lib/teams/server.ts` | `loadTeam`, `personAccess` (replace `workspaceAccess`), `codesHref` |
| `features/teams/workspace.ts` | `editableWorkspace` via `my_team()` (used by the old generator when editing a teammate's code) |
| `app/(app)/layout.tsx`, `components/app/AppShell.tsx`, `components/app/WorkspaceSwitcher.tsx`, `components/app/nav.ts` | Teammates in the switcher; Create always yours; New folder only in your own space |
| `app/(app)/codes/page.tsx`, `app/(app)/codes/[id]/page.tsx`, `features/codes/list/CodesView.tsx`, `features/codes/api.ts` | Access from `my_team()`; teammate pages show no create controls; duplicates go to your own codes |
| `app/(app)/codes/new/page.tsx`, `app/(app)/codes/bulk/page.tsx`, `features/create/*`, `features/bulk/BulkCreatePage.tsx`, `features/generator/useGenerator.ts` | Creating always in your own space |
| `features/teams/TeamManager.tsx` (+ test), `features/teams/roles.ts`, `features/teams/actions.ts` (+ test), `features/teams/media.ts`, `lib/pages/media.ts` (+ test), `features/teams/acceptError.ts` (+ test), `app/(auth)/invite/[token]/actions.ts`, `app/(app)/team/page.tsx` | Team page owner/member/solo views; leave; keep-or-take removal with media copy; members can't invite; one-team accept messages |
| `e2e/accounts/*` | New team accounts; two-way sharing, viewer limits, leave, remove-and-keep; updated viewer tests |

---

### Task 1: The teams migration

**Files:**
- Create: `supabase/migrations/20261014170000_teams.sql`
- Modify: `supabase/test/migration.test.ts` (append a describe; update two old tests)
- Modify: `types/supabase.ts`

**Interfaces:**
- Consumes: `team_members`, `team_invites`, `qr_codes`, `folders`, `scan_events`, `feedback_responses`, `profiles`, `mfa_satisfied()`, `set_code_password`, `recent_scan_counts`, `accept_invite`.
- Produces:
  ```sql
  public.team_owner(p_user uuid) returns uuid
  public.can_view(p_owner uuid) returns boolean   -- self, or same team
  public.can_edit(p_owner uuid) returns boolean   -- self, or same team and caller is owner/editor
  public.my_team() returns table (user_id uuid, email text, name text, avatar_url text, role text, is_me boolean)
  public.remove_member(p_member uuid, p_keep_codes boolean) returns jsonb  -- {"codes": n, "folders": m}
  qr_codes.is_private boolean not null default false
  ```
  Error texts the app maps:
  - `accept_invite`: "You're already in another team", "You have your own team", plus the existing "no longer valid" and "different email".
  - `remove_member`: "Not allowed". A clashing folder name raises a unique violation on `folders_user_name`.

- [ ] **Step 1: Write the failing tests.**

Append to `supabase/test/migration.test.ts`:

```ts
describe("teams (two-way sharing)", () => {
  const KIM = "2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a"; // owner
  const LEO = "2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b2b"; // editor
  const MIA = "2c2c2c2c-2c2c-4c2c-8c2c-2c2c2c2c2c2c"; // viewer
  const NED = "2d2d2d2d-2d2d-4d2d-8d2d-2d2d2d2d2d2d"; // outsider
  const OLA = "2e2e2e2e-2e2e-4e2e-8e2e-2e2e2e2e2e2e"; // another owner
  const RAY = "2f2f2f2f-2f2f-4f2f-8f2f-2f2f2f2f2f2f"; // owner (leaving)
  const SKY = "30303030-3030-4030-8030-303030303030"; // member who leaves
  const TOM = "31313131-3131-4131-8131-313131313131"; // owner (removing)
  const UNA = "32323232-3232-4232-8232-323232323232"; // member removed, codes kept
  const WES = "33333333-3333-4333-8333-333333333334"; // member removed, codes taken
  const by =
    (id: string) =>
    <T>(sql: string, params?: unknown[]) =>
      as<T>("authenticated", id, sql, params);
  const asKim = by(KIM);
  const asLeo = by(LEO);
  const asMia = by(MIA);
  const asNed = by(NED);
  const codes: Record<string, string> = {};
  const names = async (who: ReturnType<typeof by>) =>
    (await who<{ name: string }>("select name from public.qr_codes order by name")).map(
      (r) => r.name,
    );
  const make = async (who: ReturnType<typeof by>, name: string, extra = "") =>
    (
      await who<{ id: string }>(
        `insert into public.qr_codes (name, qr_type, content${extra ? ", is_private" : ""})
         values ($1, 'text', '{"text":"hi"}'${extra ? ", true" : ""}) returning id`,
        [name],
      )
    )[0]!.id;
  const join = async (owner: string, member: string, role: "editor" | "viewer") =>
    asService(
      "insert into public.team_members (owner_id, member_id, role) values ($1, $2, $3)",
      [owner, member, role],
    );

  beforeAll(async () => {
    await db.query(
      `insert into auth.users (id, email, raw_user_meta_data) values
         ($1, 'kim@example.com', '{"full_name":"Kim"}'), ($2, 'leo@example.com', '{"full_name":"Leo"}'),
         ($3, 'mia@example.com', '{"full_name":"Mia"}'), ($4, 'ned@example.com', '{}'),
         ($5, 'ola@example.com', '{}'), ($6, 'ray@example.com', '{}'), ($7, 'sky@example.com', '{}'),
         ($8, 'tom@example.com', '{}'), ($9, 'una@example.com', '{"full_name":"Una"}'),
         ($10, 'wes@example.com', '{}')`,
      [KIM, LEO, MIA, NED, OLA, RAY, SKY, TOM, UNA, WES],
    );
    await join(KIM, LEO, "editor");
    await join(KIM, MIA, "viewer");
    codes.kim = await make(asKim, "Kim code");
    codes.leo = await make(asLeo, "Leo code");
    codes.mia = await make(asMia, "Mia code");
    codes.secret = await make(asMia, "Mia secret", "private");
    codes.ned = await make(asNed, "Ned code");
  });

  it("teammates see each other's shared codes both ways; outsiders see nothing", async () => {
    const team = ["Kim code", "Leo code", "Mia code"];
    expect(await names(asKim)).toEqual(team);
    expect(await names(asLeo)).toEqual(team);
    expect(await names(asMia)).toEqual(["Kim code", "Leo code", "Mia code", "Mia secret"]);
    expect(await names(asNed)).toEqual(["Ned code"]);
  });

  it("owner and editors change teammates' codes; viewers change only their own", async () => {
    await asLeo("update public.qr_codes set name = 'Mia code (by Leo)' where id = $1", [codes.mia]);
    await asKim("update public.qr_codes set name = 'Leo code (by Kim)' where id = $1", [codes.leo]);
    await asMia("update public.qr_codes set name = 'Kim code (by Mia)' where id = $1", [codes.kim]);
    await asMia("update public.qr_codes set name = 'Mia own edit' where id = $1", [codes.mia]);
    expect(await names(asKim)).toEqual(["Kim code", "Leo code (by Kim)", "Mia own edit"]);
    // A viewer can't delete a teammate's code either.
    await asMia("delete from public.qr_codes where id = $1", [codes.kim]);
    expect(await names(asKim)).toContain("Kim code");
  });

  it("everyone creates codes and folders only in their own space", async () => {
    await expect(
      asLeo("insert into public.qr_codes (user_id, name, qr_type) values ($1, 'x', 'text')", [KIM]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asLeo("insert into public.folders (user_id, name) values ($1, 'Nope')", [KIM]),
    ).rejects.toThrow(/row-level security/);
    const [mine] = await asLeo<{ user_id: string }>(
      "insert into public.folders (name) values ('Leo folder') returning user_id",
    );
    expect(mine?.user_id).toBe(LEO);
    // Editors can still rename a teammate's folder.
    const [kimFolder] = await asKim<{ id: string }>(
      "insert into public.folders (name) values ('Kim folder') returning id",
    );
    await asLeo("update public.folders set name = 'Kim folder (by Leo)' where id = $1", [
      kimFolder!.id,
    ]);
    expect(
      (await asKim<{ name: string }>("select name from public.folders where id = $1", [kimFolder!.id]))[0]
        ?.name,
    ).toBe("Kim folder (by Leo)");
  });

  it("private codes stay private: no reads, scans, counts or changes by teammates", async () => {
    await asService(
      "insert into public.scan_events (code_id, visitor_hash) values ($1, 'a'), ($2, 'b')",
      [codes.secret, codes.mia],
    );
    expect(
      await asKim("select id from public.scan_events where code_id = $1", [codes.secret]),
    ).toEqual([]);
    const counts = await asKim<{ code_id: string }>(
      "select code_id from public.recent_scan_counts($1)",
      [MIA],
    );
    expect(counts.map((row) => row.code_id)).toEqual([codes.mia]);
    await asLeo("update public.qr_codes set name = 'Seen it' where id = $1", [codes.secret]);
    expect(
      (await asMia<{ name: string }>("select name from public.qr_codes where id = $1", [codes.secret]))[0]
        ?.name,
    ).toBe("Mia secret");
    // Only a code's maker can make it private.
    await expect(
      asLeo("update public.qr_codes set is_private = true where id = $1", [codes.kim]),
    ).rejects.toThrow(/row-level security/);
    // Not even the owner can password-protect a teammate's private trackable code.
    const [link] = await asMia<{ id: string }>(
      `insert into public.qr_codes (name, qr_type, is_dynamic, slug, destination, content, is_private)
       values ('Mia link', 'url', true, 'MIA001', 'https://mia.example', '{"url":"https://mia.example"}', true)
       returning id`,
    );
    await expect(
      asKim("select public.set_code_password($1, 'secret1')", [link!.id]),
    ).rejects.toThrow(/Not allowed/);
    await asMia("select public.set_code_password($1, 'secret1')", [link!.id]);
  });

  it("one team per person", async () => {
    const invite = async (owner: ReturnType<typeof by>, email: string) =>
      (
        await owner<{ token: string }>(
          "insert into public.team_invites (email, role) values ($1, 'viewer') returning token",
          [email],
        )
      )[0]!.token;
    const olaToMia = await invite(by(OLA), "mia@example.com");
    await expect(asMia("select public.accept_invite($1)", [olaToMia])).rejects.toThrow(
      /already in another team/,
    );
    const olaToKim = await invite(by(OLA), "kim@example.com");
    await expect(asKim("select public.accept_invite($1)", [olaToKim])).rejects.toThrow(
      /your own team/,
    );
    await expect(
      asLeo("insert into public.team_invites (email, role) values ('x@example.com', 'viewer')"),
    ).rejects.toThrow(/row-level security/);
    await expect(join(OLA, LEO, "viewer")).rejects.toThrow(/team_members_one_team/);
  });

  it("my_team lists everyone with their roles, and nothing for people on their own", async () => {
    expect(
      await asLeo<{ email: string; role: string; is_me: boolean }>(
        "select email, role, is_me from public.my_team()",
      ),
    ).toEqual([
      { email: "kim@example.com", role: "owner", is_me: false },
      { email: "leo@example.com", role: "editor", is_me: true },
      { email: "mia@example.com", role: "viewer", is_me: false },
    ]);
    expect(await asNed("select * from public.my_team()")).toEqual([]);
  });

  it("leaving ends sharing both ways, and the member keeps their codes", async () => {
    await join(RAY, SKY, "editor");
    const rayCode = await make(by(RAY), "Ray code");
    const skyCode = await make(by(SKY), "Sky code");
    expect(await names(by(RAY))).toEqual(["Ray code", "Sky code"]);
    await by(SKY)("delete from public.team_members where member_id = $1", [SKY]);
    expect(await names(by(RAY))).toEqual(["Ray code"]);
    expect(await names(by(SKY))).toEqual(["Sky code"]);
    expect([rayCode, skyCode]).toHaveLength(2);
  });

  it("removing with keep moves shared codes and folders to the owner; private codes stay", async () => {
    await join(TOM, UNA, "editor");
    await by(TOM)("insert into public.folders (name) values ('Menus')");
    const [unaMenus] = await by(UNA)<{ id: string }>(
      "insert into public.folders (name) values ('Menus') returning id",
    );
    const shared = await make(by(UNA), "Una poster");
    const hidden = await make(by(UNA), "Una diary", "private");
    await by(UNA)("update public.qr_codes set folder_id = $1 where id in ($2, $3)", [
      unaMenus!.id,
      shared,
      hidden,
    ]);
    await asService("insert into public.scan_events (code_id, visitor_hash) values ($1, 'x')", [
      shared,
    ]);

    await expect(
      by(UNA)("select public.remove_member($1, true)", [UNA]),
    ).rejects.toThrow(/Not allowed/);
    const [{ moved }] = (await by(TOM)<{ moved: { codes: number; folders: number } }>(
      "select public.remove_member($1, true) as moved",
      [UNA],
    )) as [{ moved: { codes: number; folders: number } }];
    expect(moved).toEqual({ codes: 1, folders: 1 });

    const [poster] = await by(TOM)<{ user_id: string; folder: string }>(
      `select c.user_id, f.name as folder from public.qr_codes c
         join public.folders f on f.id = c.folder_id where c.id = $1`,
      [shared],
    );
    expect(poster).toEqual({ user_id: TOM, folder: "Menus (Una)" });
    expect(
      await by(TOM)("select id from public.scan_events where code_id = $1", [shared]),
    ).toHaveLength(1);
    const [diary] = await by(UNA)<{ user_id: string; folder_id: string | null }>(
      "select user_id, folder_id from public.qr_codes where id = $1",
      [hidden],
    );
    expect(diary).toEqual({ user_id: UNA, folder_id: null });
    expect(await names(by(UNA))).toEqual(["Una diary"]);
  });

  it("removing without keep moves nothing", async () => {
    await join(TOM, WES, "viewer");
    await make(by(WES), "Wes code");
    const [{ moved }] = (await by(TOM)<{ moved: { codes: number; folders: number } }>(
      "select public.remove_member($1, false) as moved",
      [WES],
    )) as [{ moved: { codes: number; folders: number } }];
    expect(moved).toEqual({ codes: 0, folders: 0 });
    expect(await names(by(WES))).toEqual(["Wes code"]);
    expect(await names(by(TOM))).not.toContain("Wes code");
  });
});
```

Update the two existing tests that encode the old one-way model:

- In `describe("power tools")`, the test "editors work in the workspace, viewers only look, outsiders see nothing" currently has Hank create a code with `user_id` = Gina. Replace that block from `const [created] = await asHank` through its `expect(created?.user_id).toBe(GINA);` with:

```ts
    // Everyone creates in their own space, and teammates see it.
    await expect(
      asHank(
        `insert into public.qr_codes (user_id, name, qr_type) values ($1, 'Hank made this', 'text')`,
        [GINA],
      ),
    ).rejects.toThrow(/row-level security/);
    const [hanks] = await asHank<{ id: string }>(
      `insert into public.qr_codes (name, qr_type) values ('Hank made this', 'text') returning id`,
    );
    expect(await asGina("select id from public.qr_codes where id = $1", [hanks!.id])).toHaveLength(1);
```

- In `describe("create_code")`, rename the test to "lets everyone create only in their own space and refuses anon". Replace its first two lines (Uma creating with `user_id: XAVI`) with:

```ts
    await expect(asUma(CREATE, [code({ user_id: XAVI, slug: "XAVI02" }), null])).rejects.toThrow(
      /row-level security/,
    );
    const [row] = await asUma<{ user_id: string; has_password: boolean }>(CREATE, [
      code({ slug: "XAVI02" }),
      null,
    ]);
    expect(row).toMatchObject({ user_id: UMA, has_password: false });
```

Keep the rest of that test: Vera, Bob and anon are still refused when they target Xavi, and the count check still holds, because Uma's code is hers.

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run supabase/test/migration.test.ts`
Expected:
- FAIL across the new "teams" describe (no `is_private` column, `my_team` and `remove_member` don't exist, viewers can't see owners'… etc.)
- FAIL in the two updated old tests (Hank's and Uma's cross-space inserts still succeed).

- [ ] **Step 3: Write the migration.** Create `supabase/migrations/20261014170000_teams.sql` (no backslashes anywhere):

```sql
-- Teams, Phase 3 (spec: docs/superpowers/specs/2026-10-14-quickqreate-teams-design.md).
--
-- A team is its owner (the person who invited) plus members; each person is in at most one
-- team. Everyone owns what they make. Teammates see each other's codes both ways, except
-- private ones; the owner and editors may change teammates' codes, viewers only their own.
-- New codes and folders only ever go in your own space. Leaving ends the sharing both ways;
-- removing someone can move their shared codes to the owner (remove_member).
--
-- my_workspaces() and team_overview() stay unchanged so the app deployed before this
-- migration keeps working until the new one is live; a later phase drops them.

begin;

-- The live data must fit "one team per person" (checked when this was written: it does).
do $$
begin
  if exists (select 1 from public.team_members group by member_id having count(*) > 1) then
    raise exception 'Someone is in more than one team; resolve it before applying this migration';
  end if;
  if exists (
    select 1 from public.team_members m
     where exists (select 1 from public.team_members o where o.owner_id = m.member_id)
  ) then
    raise exception 'Someone both owns a team and belongs to another; resolve it first';
  end if;
end;
$$;

alter table public.team_members add constraint team_members_one_team unique (member_id);

-- The owner of the team p_user is in: themselves when they have members, their team's owner
-- when they are a member, null when they're on their own.
create function public.team_owner(p_user uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select m.owner_id from public.team_members m where m.member_id = p_user),
    (select p_user where exists (select 1 from public.team_members m where m.owner_id = p_user))
  );
$$;

revoke all on function public.team_owner(uuid) from public, anon;
grant execute on function public.team_owner(uuid) to authenticated, service_role;

-- Seeing someone's codes: your own, or a teammate's.
create or replace function public.can_view(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner = auth.uid()
      or (public.team_owner(auth.uid()) is not null
          and public.team_owner(auth.uid()) = public.team_owner(p_owner));
$$;

-- Changing someone's codes and folders: your own, or a teammate's when you're the team's owner
-- or an editor.
create or replace function public.can_edit(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner = auth.uid()
      or (public.team_owner(auth.uid()) is not null
          and public.team_owner(auth.uid()) = public.team_owner(p_owner)
          and (public.team_owner(auth.uid()) = auth.uid()
               or exists (
                 select 1 from public.team_members m
                  where m.member_id = auth.uid() and m.role = 'editor'
               )));
$$;

-- Private codes: only their maker sees or changes them, whatever the team.
alter table public.qr_codes add column is_private boolean not null default false;

drop policy "Team members can read codes" on public.qr_codes;
drop policy "Editors can create codes" on public.qr_codes;
drop policy "Editors can update codes" on public.qr_codes;
drop policy "Editors can delete codes" on public.qr_codes;

create policy "Teammates can read shared codes"
  on public.qr_codes for select to authenticated
  using (user_id = (select auth.uid()) or (not is_private and public.can_view(user_id)));

create policy "People create codes in their own space"
  on public.qr_codes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Owners and editors can change teammates' shared codes"
  on public.qr_codes for update to authenticated
  using (user_id = (select auth.uid()) or (not is_private and public.can_edit(user_id)))
  with check (user_id = (select auth.uid()) or (not is_private and public.can_edit(user_id)));

create policy "Owners and editors can delete teammates' shared codes"
  on public.qr_codes for delete to authenticated
  using (user_id = (select auth.uid()) or (not is_private and public.can_edit(user_id)));

revoke insert, update on public.qr_codes from authenticated;
grant insert (user_id, name, qr_type, content, design, is_dynamic, slug, destination, status, folder_id, active_from, active_until, is_private)
  on public.qr_codes to authenticated;
grant update (name, qr_type, content, design, slug, destination, status, folder_id, active_from, active_until, is_private)
  on public.qr_codes to authenticated;

drop policy "Editors can create folders" on public.folders;
create policy "People create folders in their own space"
  on public.folders for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy "Team members can read scans" on public.scan_events;
create policy "Teammates can read scans of shared codes"
  on public.scan_events for select to authenticated
  using (code_id in (
    select c.id from public.qr_codes c
     where c.user_id = (select auth.uid()) or (not c.is_private and public.can_view(c.user_id))
  ));

drop policy "Team members can read feedback" on public.feedback_responses;
drop policy "Editors can delete feedback" on public.feedback_responses;
create policy "Teammates can read feedback on shared codes"
  on public.feedback_responses for select to authenticated
  using (code_id in (
    select c.id from public.qr_codes c
     where c.user_id = (select auth.uid()) or (not c.is_private and public.can_view(c.user_id))
  ));
create policy "Owners and editors can delete feedback on shared codes"
  on public.feedback_responses for delete to authenticated
  using (code_id in (
    select c.id from public.qr_codes c
     where c.user_id = (select auth.uid()) or (not c.is_private and public.can_edit(c.user_id))
  ));

create or replace function public.recent_scan_counts(p_owner uuid, p_days int default 30)
returns table (code_id uuid, scans bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select e.code_id, count(*)::bigint
    from public.scan_events e
    join public.qr_codes c on c.id = e.code_id
   where c.user_id = p_owner
     and public.can_view(p_owner)
     and (c.user_id = auth.uid() or not c.is_private)
     and public.mfa_satisfied()
     and e.scanned_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
   group by e.code_id;
$$;

create or replace function public.set_code_password(p_code uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.mfa_satisfied() or not exists (
    select 1 from public.qr_codes c
     where c.id = p_code and c.is_dynamic and public.can_edit(c.user_id)
       and (c.user_id = auth.uid() or not c.is_private)
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if coalesce(p_password, '') = '' then
    delete from public.code_secrets where code_id = p_code;
    update public.qr_codes set has_password = false where id = p_code;
    return;
  end if;

  if char_length(p_password) < 4 or char_length(p_password) > 128 then
    raise exception 'Passwords are 4 to 128 characters' using errcode = '22023';
  end if;

  insert into public.code_secrets (code_id, password_hash)
  values (p_code, extensions.crypt(p_password, extensions.gen_salt('bf', 10)))
  on conflict (code_id) do update set password_hash = excluded.password_hash, updated_at = now();
  update public.qr_codes set has_password = true where id = p_code;
end;
$$;

-- Members can't invite people: only someone on their own or a team's owner starts invites.
create policy "Team members can't invite people"
  on public.team_invites as restrictive for insert to authenticated
  with check (not exists (select 1 from public.team_members m where m.member_id = (select auth.uid())));

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.team_invites;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Sign in to accept this invite' using errcode = '42501';
  end if;
  select * into v_invite from public.team_invites where token = p_token for update;
  if v_invite.id is null or v_invite.accepted_at is not null or v_invite.expires_at <= now()
     or exists (select 1 from public.team_members where member_id = v_invite.owner_id) then
    raise exception 'This invite is no longer valid' using errcode = '22023';
  end if;
  if lower(v_invite.email) <> v_email then
    raise exception 'This invite is for a different email address' using errcode = '42501';
  end if;
  if v_invite.owner_id = auth.uid() then
    raise exception 'You can''t join your own workspace' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.team_members where member_id = auth.uid() and owner_id <> v_invite.owner_id
  ) then
    raise exception 'You''re already in another team' using errcode = '22023';
  end if;
  if exists (select 1 from public.team_members where owner_id = auth.uid()) then
    raise exception 'You have your own team' using errcode = '22023';
  end if;
  insert into public.team_members (owner_id, member_id, role)
  values (v_invite.owner_id, auth.uid(), v_invite.role)
  on conflict (owner_id, member_id) do update set role = excluded.role;
  update public.team_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;
  return v_invite.owner_id;
end;
$$;

-- Everyone in the caller's team, owner first; nothing for someone on their own.
create function public.my_team()
returns table (user_id uuid, email text, name text, avatar_url text, role text, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with team as (select public.team_owner(auth.uid()) as owner_id)
  select u.id, u.email::text, p.display_name, p.avatar_url,
         case when u.id = t.owner_id then 'owner' else m.role end,
         u.id = auth.uid()
    from team t
    join auth.users u
      on u.id = t.owner_id
      or u.id in (select x.member_id from public.team_members x where x.owner_id = t.owner_id)
    left join public.team_members m on m.member_id = u.id
    left join public.profiles p on p.id = u.id
   where t.owner_id is not null and public.mfa_satisfied()
   order by (u.id = t.owner_id) desc, coalesce(p.display_name, u.email::text);
$$;

revoke all on function public.my_team() from public, anon;
grant execute on function public.my_team() to authenticated;

-- Removes a member. With p_keep_codes their shared codes and their folders move to the owner
-- (printed codes keep their short links, scans and feedback); their private codes stay theirs
-- and come out of any folder that moves. All or nothing.
create function public.remove_member(p_member uuid, p_keep_codes boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_label text;
  v_files jsonb;
  v_codes int := 0;
  v_folders int := 0;
begin
  if v_owner is null or not public.mfa_satisfied() or not exists (
    select 1 from public.team_members where owner_id = v_owner and member_id = p_member
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if p_keep_codes then
    select left(coalesce(nullif(btrim(p.display_name), ''), split_part(u.email, '@', 1)), 20)
      into v_label
      from auth.users u left join public.profiles p on p.id = u.id
     where u.id = p_member;
    select coalesce(jsonb_object_agg(id::text, folder_id::text), '{}'::jsonb) into v_files
      from public.qr_codes
     where user_id = p_member and not is_private and folder_id is not null;
    -- A code and its folder always share an owner, so every code comes out of its folder
    -- while the folders change hands; shared ones go back in below.
    update public.qr_codes set folder_id = null where user_id = p_member and folder_id is not null;
    update public.folders f
       set user_id = v_owner,
           name = case
             when exists (
               select 1 from public.folders o
                where o.user_id = v_owner and lower(btrim(o.name)) = lower(btrim(f.name))
             ) then left(btrim(f.name), 37) || ' (' || v_label || ')'
             else f.name
           end
     where f.user_id = p_member;
    get diagnostics v_folders = row_count;
    update public.qr_codes set user_id = v_owner where user_id = p_member and not is_private;
    get diagnostics v_codes = row_count;
    update public.qr_codes c
       set folder_id = (v_files ->> c.id::text)::uuid
     where c.user_id = v_owner and c.id::text in (select jsonb_object_keys(v_files));
  end if;

  delete from public.team_members where owner_id = v_owner and member_id = p_member;
  return jsonb_build_object('codes', v_codes, 'folders', v_folders);
end;
$$;

revoke all on function public.remove_member(uuid, boolean) from public, anon;
grant execute on function public.remove_member(uuid, boolean) to authenticated;

commit;
```

`my_workspaces()` and `team_overview()` need no change: they still list the team a member is in, and the members of the caller's own team.

- [ ] **Step 4: Type the new pieces.** In `types/supabase.ts`:
  - Add `is_private: boolean;` to `qr_codes.Row`, and `is_private?: boolean;` to its `Insert` and `Update`.
  - Add these entries to `Functions`:

```ts
      my_team: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          role: "owner" | TeamRole;
          is_me: boolean;
        }[];
      };
      remove_member: {
        Args: { p_member: string; p_keep_codes: boolean };
        Returns: Json;
      };
```

- [ ] **Step 5: Run the tests to see them pass, and check for backslashes.**

Run: `npx vitest run supabase/test/migration.test.ts && npm run typecheck && grep -c '\\' supabase/migrations/20261014170000_teams.sql`
Expected:
- every migration test passes, the 9 new team tests included
- typecheck exits 0
- grep prints `0`.

If another existing test encodes the old one-way model (a member creating in an owner's space, or an owner not seeing a member's code), update it to the spec's rule. Ledger each such update as a ruling, naming the test.

- [ ] **Step 6: Commit.**

```bash
git add supabase/migrations/20261014170000_teams.sql supabase/test/migration.test.ts types/supabase.ts
git commit -m "Share codes both ways in a team, with clear roles and clean leaving"
```

### Task 2: Team access helpers and the pages that use them

**Files:**
- Create: `lib/teams/access.ts`, `lib/teams/access.test.ts`
- Modify: `lib/teams/server.ts`, `features/teams/workspace.ts`
- Modify: `app/(app)/layout.tsx`, `app/(app)/codes/page.tsx`, `app/(app)/codes/[id]/page.tsx`, `components/app/nav.ts`

**Interfaces:**
- Consumes: `my_team()` (Task 1).
- Produces:
  ```ts
  // lib/teams/access.ts
  export interface TeamPerson { userId: string; email: string; name: string | null; avatarUrl: string | null; role: "owner" | TeamRole; isMe: boolean }
  export function toTeam(rows: MyTeamRow[]): TeamPerson[]
  export const personLabel: (person: Pick<TeamPerson, "name" | "email">) => string
  export interface PersonAccess { self: boolean; canEdit: boolean; person: TeamPerson | null }
  export function accessTo(team: TeamPerson[], meId: string, personId: string): PersonAccess | null
  // lib/teams/server.ts
  export async function loadTeam(supabase): Promise<TeamPerson[]>
  export async function personAccess(supabase, userId: string, personId: string): Promise<PersonAccess | null>
  export const codesHref: (ownerId: string, userId: string) => string   // unchanged
  // features/teams/workspace.ts (old generator)
  export async function editableWorkspace(ownerId: string): Promise<Workspace | null>   // via my_team
  ```
  `ShellTeam.role` now means what *you* can do with that teammate's codes ("editor" = can edit).

- [ ] **Step 1: Write the failing tests.** Create `lib/teams/access.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { accessTo, personLabel, toTeam, type TeamPerson } from "./access";

const person = (userId: string, role: TeamPerson["role"], isMe = false): TeamPerson => ({
  userId,
  email: `${userId}@example.com`,
  name: userId === "kim" ? "Kim" : null,
  avatarUrl: null,
  role,
  isMe,
});

describe("team access", () => {
  it("your own codes are always yours to change", () => {
    expect(accessTo([], "me", "me")).toEqual({ self: true, canEdit: true, person: null });
  });

  it("viewers look at teammates' codes; editors and owners change them", () => {
    const asViewer = [person("kim", "owner"), person("me", "viewer", true)];
    expect(accessTo(asViewer, "me", "kim")).toEqual({
      self: false,
      canEdit: false,
      person: asViewer[0],
    });
    const asEditor = [person("kim", "owner"), person("me", "editor", true)];
    expect(accessTo(asEditor, "me", "kim")?.canEdit).toBe(true);
    const asOwner = [person("me", "owner", true), person("leo", "viewer")];
    expect(accessTo(asOwner, "me", "leo")?.canEdit).toBe(true);
  });

  it("nobody outside your team, and nobody at all when you're on your own", () => {
    expect(accessTo([person("kim", "owner"), person("me", "editor", true)], "me", "ned")).toBeNull();
    expect(accessTo([], "me", "kim")).toBeNull();
  });

  it("names people by name, or by email when they haven't set one", () => {
    expect(personLabel({ name: " Kim ", email: "kim@example.com" })).toBe("Kim");
    expect(personLabel({ name: null, email: "leo@example.com" })).toBe("leo@example.com");
  });

  it("reads my_team rows", () => {
    expect(
      toTeam([
        { user_id: "kim", email: "kim@example.com", name: "Kim", avatar_url: null, role: "owner", is_me: false },
      ]),
    ).toEqual([
      { userId: "kim", email: "kim@example.com", name: "Kim", avatarUrl: null, role: "owner", isMe: false },
    ]);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run lib/teams`
Expected: FAIL. `./access` can't be resolved.

- [ ] **Step 3: Create `lib/teams/access.ts`.**

```ts
import type { Database, TeamRole } from "@/types/supabase";

type MyTeamRow = Database["public"]["Functions"]["my_team"]["Returns"][number];

/** Someone in the signed-in person's team, as my_team() lists them. */
export interface TeamPerson {
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "owner" | TeamRole;
  isMe: boolean;
}

export const toTeam = (rows: MyTeamRow[]): TeamPerson[] =>
  rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    isMe: row.is_me,
  }));

/** A person's name, or their email when they haven't set one. */
export const personLabel = (person: Pick<TeamPerson, "name" | "email">) =>
  person.name?.trim() || person.email;

/** What the signed-in person may do with someone's codes. */
export interface PersonAccess {
  /** The codes are the signed-in person's own. */
  self: boolean;
  /** They may change these codes: always for your own; for a teammate's, owners and editors. */
  canEdit: boolean;
  /** The teammate, for someone else's codes; null for your own. */
  person: TeamPerson | null;
}

/** What the signed-in person may do with personId's codes; null when they can't see them. */
export function accessTo(team: TeamPerson[], meId: string, personId: string): PersonAccess | null {
  if (personId === meId) return { self: true, canEdit: true, person: null };
  const me = team.find((p) => p.isMe);
  const person = team.find((p) => p.userId === personId && !p.isMe);
  if (!me || !person) return null;
  return { self: false, canEdit: me.role !== "viewer", person };
}
```

- [ ] **Step 4: Replace the server helper.** Rewrite `lib/teams/server.ts`:

```ts
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { accessTo, toTeam, type PersonAccess, type TeamPerson } from "@/lib/teams/access";
import type { Database } from "@/types/supabase";

/** Everyone in the signed-in user's team (empty on their own). */
export async function loadTeam(supabase: SupabaseClient<Database>): Promise<TeamPerson[]> {
  const { data } = await supabase.rpc("my_team");
  return toTeam(data ?? []);
}

/** What the signed-in user may do with personId's codes; null when they can't see them. */
export async function personAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  personId: string,
): Promise<PersonAccess | null> {
  return accessTo(await loadTeam(supabase), userId, personId);
}

/** The codes list for a person: your own, or a teammate's. */
export const codesHref = (ownerId: string, userId: string) =>
  ownerId === userId ? "/codes" : `/codes?workspace=${ownerId}`;
```

Rewrite `features/teams/workspace.ts`:

```ts
"use client";

import { accessTo, personLabel, toTeam } from "@/lib/teams/access";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { TeamRole } from "@/types/supabase";

/** A teammate's codes the signed-in person may change. */
export interface Workspace {
  ownerId: string;
  /** The teammate's name, or their email when they haven't set one. */
  label: string;
  role: TeamRole;
}

/** The teammate who owns `ownerId`'s codes, if the signed-in person may change them. */
export async function editableWorkspace(ownerId: string): Promise<Workspace | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;
  const [{ data: session }, { data }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.rpc("my_team"),
  ]);
  const me = session.session?.user.id;
  if (!me) return null;
  const access = accessTo(toTeam(data ?? []), me, ownerId);
  if (!access?.person || !access.canEdit) return null;
  return { ownerId, label: personLabel(access.person), role: "editor" };
}
```

In `components/app/nav.ts`, change the `ShellTeam` doc comment and `role` comment to:

```ts
/** A teammate whose codes the signed-in person can open. */
export interface ShellTeam {
  ownerId: string;
  /** The teammate's name, or their email. */
  label: string;
  /** What the signed-in person may do with their codes: "editor" = change, "viewer" = look. */
  role: TeamRole;
  avatarUrl: string | null;
}
```

- [ ] **Step 5: Use the team in the layout and pages.**

`app/(app)/layout.tsx`:
- Replace the `my_workspaces` call with `loadTeam(supabase)` (import from `@/lib/teams/server`).
- Build `teams` from it, and drop the `workspaceLabel` import:

```tsx
  const [{ data: profile }, team] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
    loadTeam(supabase),
  ]);
  const me = team.find((person) => person.isMe);
```

```tsx
      teams={team
        .filter((person) => !person.isMe)
        .map((person) => ({
          ownerId: person.userId,
          label: personLabel(person),
          role: me?.role === "viewer" ? "viewer" : "editor",
          avatarUrl: person.avatarUrl,
        }))}
```

(import `personLabel` from `@/lib/teams/access`)

`app/(app)/codes/page.tsx`:
- Replace the `my_workspaces` lookup and the `membership`, `ownerId`, `teamId` and `canEdit` lines with:

```tsx
  const team = await loadTeam(supabase);
  // Anyone who isn't a teammate (or no one asked for) shows your own codes.
  const access = (requested && accessTo(team, user.id, requested)) || {
    self: true,
    canEdit: true,
    person: null,
  };
  const ownerId = access.person?.userId ?? user.id;
  const teamId = access.person?.userId ?? null;
  const canEdit = access.canEdit;
  const label = access.person ? personLabel(access.person) : null;
```

- Then make these replacements:
  - **Title:** `folder ? folder.name : label ? \`${label}’s codes\` : "All codes"`.
  - **Description:** replace `{membership && <>{ROLE_LABELS[membership.role]} · </>}` with `{label && <>{canEdit ? "You can edit these" : "You can view these"} · </>}`.
  - **Header actions:** `(access.self || (canEdit && folder)) && (<> … </>)`. `FolderActions` shows when `folder && canEdit`. The Bulk create and Create code links show only when `access.self`.
  - **View-only note:** replace its text with `You can view {label}’s codes and their analytics. Your own codes are under My codes.`, keeping the `!canEdit` condition.
  - **`FolderSelect`:** pass `canEdit={access.self}`, so New folder only appears in your own space.
- Remove the now-unused `ROLE_LABELS` and `workspaceLabel` imports. Import `loadTeam` from `@/lib/teams/server`, and `accessTo` and `personLabel` from `@/lib/teams/access`.

`app/(app)/codes/[id]/page.tsx`:
- Replace `workspaceAccess(supabase, user.id, code.user_id)` with `personAccess(supabase, user.id, code.user_id)`.
- Replace the back label with:

```tsx
        label: access?.person ? `${personLabel(access.person)}’s codes` : "All codes",
```

(import `personAccess` and `codesHref` from `@/lib/teams/server`, `personLabel` from `@/lib/teams/access`)

- [ ] **Step 6: Run the tests, typecheck and build.**

Run: `npx vitest run lib/teams && npm run typecheck && npm run lint`
Expected: the 5 access tests pass; typecheck and lint exit 0 (no remaining `workspaceAccess` or `my_workspaces` call in `app/`: `grep -rn "workspaceAccess\|my_workspaces" app lib features components` prints nothing).

- [ ] **Step 7: Commit.**

```bash
git add lib/teams features/teams/workspace.ts "app/(app)/layout.tsx" "app/(app)/codes/page.tsx" "app/(app)/codes/[id]/page.tsx" components/app/nav.ts
git commit -m "Read the team from my_team and open teammates' codes by role"
```

### Task 3: The shell and codes list: create in your own space, copy teammates' codes to yours

**Files:**
- Modify: `components/app/AppShell.tsx`, `components/app/AppShell.test.tsx`, `components/app/CreateButton.tsx`, `components/app/WorkspaceSwitcher.tsx`
- Modify: `features/codes/api.ts`, `features/codes/api.test.ts`
- Modify: `features/codes/list/CodesView.tsx`, `features/codes/list/CodesView.test.tsx`

**Interfaces:**
- Consumes: `newCodeHref`, `bulkCreateHref`, `ShellTeam`.
- Produces:
  ```ts
  export async function duplicateCode(code: QrCodeRow, options: { keepFolder: boolean }): Promise<Result<QrCodeRow>>
  CreateButton({ folderId?: string | null; collapsed?: boolean; onNavigate?: () => void })   // no ownerId: always yours
  ```

- [ ] **Step 1: Write the failing tests.**

In `components/app/AppShell.test.tsx`:
- In "links every section, keeping the team you're looking at", change the Create expectation to:

```ts
    // Creating always happens in your own codes, whoever's codes you're looking at.
    expect(new Set(hrefs(/^Create( code)?$/))).toEqual(new Set(["/codes/new"]));
```

- Replace the bodies of "creates in the folder being viewed" and "opens bulk creation inside the app, in the folder being viewed" so they use your *own* folder (`search = new URLSearchParams("folder=f1")`) and expect `"/codes/new?folder=f1"` and `"/codes/bulk?folder=f1"`.
- Add:

```tsx
  it("doesn't create in a teammate's folder", () => {
    search = new URLSearchParams("workspace=t1&folder=f1");
    renderShell();
    expect(new Set(hrefs(/^Create( code)?$/))).toEqual(new Set(["/codes/new"]));
  });
```

- If a test there expects a viewer's team to hide Create, change it to expect Create (`"/codes/new"`): everyone can create their own codes.

In `features/codes/api.test.ts`, append (the client mock already has `from`):

```ts
describe("duplicateCode", () => {
  it("copies a code into your own codes, keeping its folder only when asked", async () => {
    const insert = vi.fn((row: Record<string, unknown>) => ({
      select: () => ({ single: async () => ({ data: { id: "copy", ...row }, error: null }) }),
    }));
    from.mockReturnValue({ insert });
    const teammate = {
      id: "c1",
      user_id: "kim",
      folder_id: "f-kim",
      name: "Menu",
      qr_type: "text",
      content: { text: "hi" },
      design: {},
      is_dynamic: false,
      destination: null,
    } as unknown as QrCodeRow;
    await duplicateCode(teammate, { keepFolder: false });
    expect(insert.mock.calls[0]![0]).not.toHaveProperty("user_id");
    expect(insert.mock.calls[0]![0]).not.toHaveProperty("folder_id");
    await duplicateCode(teammate, { keepFolder: true });
    expect(insert.mock.calls[1]![0]).toMatchObject({ folder_id: "f-kim" });
  });
});
```

(add `duplicateCode` to its import from `./api`, and `import type { QrCodeRow } from "@/types/supabase";`)

In `features/codes/list/CodesView.test.tsx`, add (inside its main describe; reuse its `renderView` and the mocked `duplicateCode`):

```tsx
  it("a teammate's code is copied into your own codes", async () => {
    const user = userEvent.setup();
    vi.mocked(duplicateCode).mockResolvedValue({
      ok: true,
      value: { ...CODES[0]!, id: "copy", name: "Copy of Spring menu" },
    });
    renderView({ teamId: "kim" });
    await user.click(screen.getAllByRole("button", { name: /More actions for Spring menu/ })[0]!);
    await user.click(screen.getByRole("menuitem", { name: /Duplicate/ }));
    expect(duplicateCode).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Spring menu" }),
      { keepFolder: false },
    );
    expect(await screen.findByText("Copied “Spring menu” to your codes")).toBeInTheDocument();
    expect(screen.queryByText("Copy of Spring menu")).toBeNull();
  });
```

Use the file's existing fixture name for its codes list (`CODES` or whatever it's called) and the action menu's real accessible names. Read them before writing; ledger any renaming as a test-only ruling.

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run components/app features/codes`
Expected: FAIL.
- The shell links Create to `/codes/new?workspace=t1` and to the teammate's folder.
- `duplicateCode` is called with one argument and puts the copy in the teammate's space (`user_id` is set).
- No "Copied … to your codes" toast.

- [ ] **Step 3: Implement.**

`features/codes/api.ts`, replace `duplicateCode`:

```ts
/**
 * Copies a code into your own codes (a teammate's code too: new codes only ever go in your own
 * space). Its folder is kept only when it's yours.
 */
export async function duplicateCode(
  code: QrCodeRow,
  { keepFolder }: { keepFolder: boolean },
): Promise<Result<QrCodeRow>> {
  return createCode({
    folderId: keepFolder ? code.folder_id : null,
    name: `Copy of ${code.name}`.slice(0, 120),
    qrType: code.qr_type as CodeTypeId,
    content: code.content,
    design: code.design as unknown as DesignState,
    dynamic: code.is_dynamic ? { destination: code.destination } : undefined,
  });
}
```

`features/codes/list/CodesView.tsx`, replace `duplicate`:

```tsx
  async function duplicate(code: QrCodeRow) {
    // A teammate's code is copied into your own codes, so it doesn't join this list.
    const result = await duplicateCode(code, { keepFolder: !teamId });
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

In the same file's empty states:
- The empty-folder "Create a code here" link and its "Create a code here, or…" sentence show only when `canEdit && !teamId`. Otherwise the sentence is "Codes added to this folder will show up here."
- The first-code welcome (quick starts) shows only when `canEdit && !teamId`. A teammate's empty list shows the heading "No codes here yet" with no create links.

`components/app/CreateButton.tsx`:
- Remove the `ownerId` prop.
- The main link becomes `href={newCodeHref({ folderId, ownerId: null })}` and the bulk link `href={bulkCreateHref({ folderId, ownerId: null })}`.
- Update its doc comment: "Creating always happens in your own codes."

`components/app/AppShell.tsx`:
- Remove `canCreate`. Always render `<CreateButton … />` and the phone Create tab (the bottom bar is always `grid-cols-4`).
- `folderId` becomes `pathname === "/codes" && !team ? searchParams.get("folder") : null`.
- The phone Create tab uses `newCodeHref({ folderId, ownerId: null })`.
- Pass `canEdit={!team}` to `FolderNav`, so New folder only appears in your own space.

`components/app/WorkspaceSwitcher.tsx`:
- The right-hand text of each teammate becomes `{team.role === "editor" ? "Can edit" : "Can view"}`. Remove the `ROLE_LABELS` import if it's unused.
- The empty text becomes "Teammates show up here once you invite someone or join a team."

- [ ] **Step 4: Run them to see them pass.**

Run: `npx vitest run && npm run lint && npm run typecheck`
Expected: the whole unit suite passes; lint and typecheck exit 0.

- [ ] **Step 5: Commit.**

```bash
git add components/app features/codes
git commit -m "Create in your own codes from anywhere, and copy teammates' codes to yours"
```

### Task 4: Creating always happens in your own space

**Files:**
- Modify: `app/(app)/codes/new/page.tsx`, `features/create/CreatePage.tsx`, `features/create/CreatePage.test.tsx`
- Modify: `app/(app)/codes/bulk/page.tsx`, `features/bulk/BulkCreatePage.tsx`, `features/bulk/BulkCreatePage.test.tsx`
- Modify: `features/generator/useGenerator.ts`, `features/generator/useGenerator.test.tsx`, `features/generator/SavePanel.tsx`

**Interfaces:**
- Consumes: none new.
- Produces:
  - `CreatePage` props become `{ userId, folders, initialType, initialFolderId }`.
  - `BulkCreatePage` props become `{ ownerId, folders, initialFolderId }`.
  - `useGenerator` no longer returns `leaveWorkspace`.

- [ ] **Step 1: Write the failing tests.**
- In `features/create/CreatePage.test.tsx`, delete "creates in the team it was opened for", and remove `teamId` and `workspaceLabel` from `renderPage`.
- In `features/bulk/BulkCreatePage.test.tsx`, delete "creates in the team it was opened for", and remove `teamId` and `workspaceLabel` from `renderPage`.
- In `features/generator/useGenerator.test.tsx`, replace "a team workspace lookup that finishes after you left it is ignored" with:

```tsx
  it("new codes always save to your own account, whatever ?workspace= says", async () => {
    search = new URLSearchParams("workspace=owner-1");
    const { result } = renderHook(() => useGenerator());
    await act(async () => {});
    expect(editableWorkspace).not.toHaveBeenCalled();
    expect(result.current.workspace).toBeNull();
  });
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/create features/bulk features/generator && npm run typecheck`
Expected:
- the new generator test FAILS, because `editableWorkspace` is called for `?workspace=`
- typecheck still passes (the deleted tests only removed uses).

- [ ] **Step 3: Implement.**

`app/(app)/codes/new/page.tsx`:
- Remove the `workspace` parameter, the `my_workspaces` lookup, the membership and viewer redirect, `teamId` and `workspaceLabel`.
- Call `requireUser("/codes/new")`.
- Folders come from `.eq("user_id", user.id)`.
- Render `<CreatePage key={\`${folder?.id ?? ""}:${initialType}\`} userId={user.id} folders={folders ?? []} initialType={initialType} initialFolderId={folder?.id ?? null} />`.
- Remove unused imports (`redirect`, `withWorkspace`, `workspaceLabel`).

`features/create/CreatePage.tsx`:
- Remove `teamId` and `workspaceLabel` from `CreatePageProps` and the parameters.
- `editor.workspace` is `null`.
- `toNewCode(state, null, name)`.
- The redirect is `router.push(\`/codes/${result.value.id}#download\`)`.
- The header description is always "Fill in the sections in any order. The preview updates as you go."
- Remove `withWorkspace` if it's unused.

`app/(app)/codes/bulk/page.tsx`:
- Same simplification: `requireUser("/codes/bulk")`, own folders.
- `<BulkCreatePage key={folder?.id ?? ""} ownerId={user.id} folders={folders ?? []} initialFolderId={folder?.id ?? null} />`.

`features/bulk/BulkCreatePage.tsx`:
- Remove `teamId` and `workspaceLabel` (props, parameters, the header's team description, `ownerId: teamId ?? undefined` in the inputs).
- The "Open …" link is `placedIn ? \`/codes?folder=${placedIn}\` : "/codes"`.
- Remove `withWorkspace` if it's unused.

`features/generator/useGenerator.ts`:
- Remove `ownerParam`, the `if (!editId) { if (ownerParam) … }` branch, and `leaveWorkspace`.
- Keep the edit (`loadCode`) path's `editableWorkspace(code.user_id)`, which still lets an editor edit a teammate's code and its page media.
- Update the effect comment: "plain / is a new code (always saved to your own account)". Drop `ownerParam` from the effect's dependency list.

`features/generator/SavePanel.tsx`:
- Drop the "Use my account instead" button and its `leaveWorkspace` use.
- The workspace line shows only for a saved teammate code: `In <strong>{workspace.label}</strong>’s codes`.

- [ ] **Step 4: Run them to see them pass.**

Run: `npx vitest run && npm run lint && npm run typecheck && npm run build`
Expected: the whole unit suite passes; lint, typecheck and build exit 0.

- [ ] **Step 5: Commit.**

```bash
git add "app/(app)/codes/new" "app/(app)/codes/bulk" features/create features/bulk features/generator
git commit -m "Create and bulk create always in your own codes"
```

### Task 5: The Team page: owner, member and solo views; leave; keep-or-take removal

**Files:**
- Create: `lib/pages/media.ts`, `lib/pages/media.test.ts`
- Create: `features/teams/media.ts` (server only)
- Create: `features/teams/acceptError.ts`, `features/teams/acceptError.test.ts`
- Modify: `features/teams/actions.ts`, `features/teams/actions.test.ts`
- Modify: `features/teams/TeamManager.tsx` (rewrite), `features/teams/TeamManager.test.tsx`
- Modify: `features/teams/roles.ts`, `components/ui/ConfirmDialog.tsx`
- Modify: `app/(app)/team/page.tsx`, `app/(auth)/invite/[token]/actions.ts`, `app/(auth)/invite/[token]/page.tsx`

**Interfaces:**
- Consumes: `my_team`, `remove_member`, `invite_details` (Task 1); `TeamPerson`, `personLabel`, `toTeam` (Task 2); `mediaPaths`, `sanitizeMedia`; `getAdminSupabase`.
- Produces:
  ```ts
  // lib/pages/media.ts
  export function replaceMediaPaths(content: unknown, renamed: ReadonlyMap<string, string>): unknown
  // features/teams/media.ts
  export async function copyPageMedia(memberId: string, ownerId: string): Promise<{ ok: true; files: number } | { ok: false; error: string }>
  // features/teams/acceptError.ts
  export function acceptError(message: string, names: { currentOwner: string | null; inviter: string | null }): string
  // features/teams/actions.ts
  export async function removeMember(memberId: string, keepCodes: boolean): Promise<{ error?: string; codes?: number; folders?: number }>
  // features/teams/roles.ts
  export const roleLabel: (role: "owner" | TeamRole) => string
  // components/ui/ConfirmDialog.tsx: optional children (shown under the description)
  // TeamManager props: { userId: string; team: TeamPerson[]; invites: Invite[]; emailEnabled: boolean }
  ```
  Labels:
  - buttons "Leave team" and "Remove <name>"
  - radios "Keep their codes" and "Let them take their codes" (group "What happens to their codes?")
  - texts "Nobody else is on your team yet." and "Only the team owner can invite people."

- [ ] **Step 1: Write the failing tests.**

`lib/pages/media.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { replaceMediaPaths } from "./media";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("replaceMediaPaths", () => {
  it("swaps the paths it's given, wherever they are, and leaves everything else", () => {
    const content = {
      title: "Menu",
      logo: { path: `${A}/logo.png`, name: "logo.png", type: "image/png", size: 10 },
      images: [{ path: `${A}/one.jpg`, name: "one.jpg", type: "image/jpeg", size: 20 }],
      other: { path: "not-a-media-path" },
    };
    const renamed = new Map([
      [`${A}/logo.png`, `${B}/logo.png`],
      [`${A}/one.jpg`, `${B}/one.jpg`],
    ]);
    expect(replaceMediaPaths(content, renamed)).toEqual({
      title: "Menu",
      logo: { path: `${B}/logo.png`, name: "logo.png", type: "image/png", size: 10 },
      images: [{ path: `${B}/one.jpg`, name: "one.jpg", type: "image/jpeg", size: 20 }],
      other: { path: "not-a-media-path" },
    });
  });
});
```

`features/teams/acceptError.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { acceptError } from "./acceptError";

const names = { currentOwner: "Sam", inviter: "David" };

describe("acceptError", () => {
  it("names both teams when you're already in one", () => {
    expect(acceptError("You're already in another team", names)).toBe(
      "You’re in Sam’s team. Leave it before joining David’s.",
    );
    expect(acceptError("You're already in another team", { currentOwner: null, inviter: null })).toBe(
      "You’re already in a team. Leave it before joining this one.",
    );
  });

  it("explains owning a team, wrong addresses and old links", () => {
    expect(acceptError("You have your own team", names)).toBe(
      "You have your own team. Remove its members before joining another.",
    );
    expect(acceptError("This invite is for a different email address", names)).toBe(
      "This invite is for a different email address.",
    );
    expect(acceptError("This invite is no longer valid", names)).toBe(
      "This invite has expired or was already used. Ask for a new link.",
    );
    expect(acceptError("boom", names)).toBe("The invite couldn’t be accepted. Please try again.");
  });
});
```

In `features/teams/actions.test.ts`:
- Give `fakeSupabase` three more options: `team = [] as unknown[]`, `removed = { codes: 0, folders: 0 }` and `removeError = null as { message: string } | null`.
- Add to its `rpc` before the `throw`:

```ts
      if (fn === "my_team") return { data: team, error: null };
      if (fn === "remove_member")
        return removeError ? { data: null, error: removeError } : { data: removed, error: null };
```

- Then mock the media copier at the top of the file (`vi.mock("./media", () => ({ copyPageMedia: vi.fn() }));`), import `copyPageMedia` from `./media` and `removeMember` from `./actions`, and append:

```ts
const OWNER_ROW = { user_id: "owner-1", email: "david@example.com", name: "David", avatar_url: null, role: "owner", is_me: true };
const SAM_ROW = { user_id: "m1", email: "sam@cafe.com", name: "Sam", avatar_url: null, role: "editor", is_me: false };

describe("sendInvites from a member", () => {
  it("refuses: only the team owner can invite people", async () => {
    const fake = fakeSupabase({ team: [{ ...OWNER_ROW, is_me: false }, { ...SAM_ROW, user_id: "owner-1", is_me: true }] });
    signIn(fake);
    const result = await sendInvites({ emails: "lee@cafe.com", role: "viewer", email: true });
    expect(result).toEqual({ error: "Only the team owner can invite people.", outcomes: [] });
    expect(fake.inserted).toEqual([]);
  });
});

describe("removeMember", () => {
  beforeEach(() => vi.mocked(copyPageMedia).mockReset());

  it("keeping their codes copies page images first, then moves the codes", async () => {
    const fake = fakeSupabase({ team: [OWNER_ROW, SAM_ROW], removed: { codes: 3, folders: 1 } });
    signIn(fake);
    vi.mocked(copyPageMedia).mockResolvedValue({ ok: true, files: 2 });
    expect(await removeMember("m1", true)).toEqual({ codes: 3, folders: 1 });
    expect(copyPageMedia).toHaveBeenCalledWith("m1", "owner-1");
    expect(fake.client.rpc).toHaveBeenCalledWith("remove_member", { p_member: "m1", p_keep_codes: true });
  });

  it("if a page image can't be copied, nobody is removed", async () => {
    const fake = fakeSupabase({ team: [OWNER_ROW, SAM_ROW] });
    signIn(fake);
    vi.mocked(copyPageMedia).mockResolvedValue({ ok: false, error: "Their page images couldn’t be copied, so nobody was removed. Please try again." });
    expect(await removeMember("m1", true)).toEqual({
      error: "Their page images couldn’t be copied, so nobody was removed. Please try again.",
    });
    expect(fake.client.rpc).not.toHaveBeenCalledWith("remove_member", expect.anything());
  });

  it("letting them take their codes copies nothing", async () => {
    const fake = fakeSupabase({ team: [OWNER_ROW, SAM_ROW] });
    signIn(fake);
    expect(await removeMember("m1", false)).toEqual({ codes: 0, folders: 0 });
    expect(copyPageMedia).not.toHaveBeenCalled();
  });

  it("explains a folder name clash, and only owners can remove people", async () => {
    const clash = fakeSupabase({
      team: [OWNER_ROW, SAM_ROW],
      removeError: { message: 'duplicate key value violates unique constraint "folders_user_name"' },
    });
    signIn(clash);
    vi.mocked(copyPageMedia).mockResolvedValue({ ok: true, files: 0 });
    expect(await removeMember("m1", true)).toEqual({
      error: "One of their folders has the same name as one of yours. Rename it and try again.",
    });
    const member = fakeSupabase({ team: [{ ...OWNER_ROW, is_me: false }, { ...SAM_ROW, is_me: true }] });
    signIn(member);
    expect(await removeMember("owner-1", false)).toEqual({ error: "Only the team owner can remove people." });
  });
});
```

In `features/teams/TeamManager.test.tsx`:
- Mock `removeMember` too: `vi.mock("./actions", () => ({ sendInvites: vi.fn(), resendInvite: vi.fn(), removeMember: vi.fn() }))`.
- Change `renderTeam`'s default props to `userId="owner" team={[]} invites={[]} emailEnabled`.
- Append:

```tsx
const KIM = { userId: "owner", email: "kim@example.com", name: "Kim", avatarUrl: null, role: "owner", isMe: true } as const;
const SAM = { userId: "sam", email: "sam@cafe.com", name: "Sam", avatarUrl: null, role: "editor", isMe: false } as const;

describe("TeamManager team", () => {
  it("on your own, invites people and says nobody else is here", () => {
    renderTeam();
    expect(screen.getByText("Nobody else is on your team yet.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email addresses")).toBeInTheDocument();
  });

  it("removing someone keeps their codes unless you choose otherwise", async () => {
    const user = userEvent.setup();
    vi.mocked(removeMember).mockResolvedValue({ codes: 2, folders: 1 });
    renderTeam({ team: [KIM, SAM] });
    await user.click(screen.getByRole("button", { name: "Remove Sam" }));
    expect(screen.getByRole("radio", { name: /Keep their codes/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(removeMember).toHaveBeenCalledWith("sam", true);
    expect(await screen.findByText("Removed Sam. 2 codes moved to your codes.")).toBeInTheDocument();
  });

  it("can let them take their codes", async () => {
    const user = userEvent.setup();
    vi.mocked(removeMember).mockResolvedValue({ codes: 0, folders: 0 });
    renderTeam({ team: [KIM, SAM] });
    await user.click(screen.getByRole("button", { name: "Remove Sam" }));
    await user.click(screen.getByRole("radio", { name: /Let them take their codes/ }));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(removeMember).toHaveBeenCalledWith("sam", false);
  });

  it("a member sees the team, can't invite, and can leave keeping their codes", async () => {
    const user = userEvent.setup();
    renderTeam({
      team: [
        { ...KIM, userId: "kim", isMe: false },
        { ...SAM, userId: "owner", name: "Me", role: "viewer", isMe: true },
      ],
    });
    expect(screen.getByText(/You’re in Kim’s team as a viewer/)).toBeInTheDocument();
    expect(screen.getByText("Only the team owner can invite people.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email addresses")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Leave team" }));
    expect(
      screen.getByText("You’ll keep your codes. You and Kim’s team will stop seeing each other’s codes."),
    ).toBeInTheDocument();
  });
});
```

Import `removeMember` from `./actions` in the test.

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run lib/pages features/teams`
Expected: FAIL. `./media` and `./acceptError` can't be resolved, `removeMember` isn't exported, and TeamManager has no `team` prop.

- [ ] **Step 3: Implement the helpers.**

`lib/pages/media.ts`:

```ts
import { sanitizeMedia } from "./sanitize";

/** A copy of page content with media paths swapped by `renamed`; everything else is untouched. */
export function replaceMediaPaths(content: unknown, renamed: ReadonlyMap<string, string>): unknown {
  if (Array.isArray(content)) return content.map((item) => replaceMediaPaths(item, renamed));
  if (content !== null && typeof content === "object") {
    const record = content as Record<string, unknown>;
    const media = sanitizeMedia(record);
    if (media && renamed.has(media.path)) return { ...record, path: renamed.get(media.path) };
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, replaceMediaPaths(value, renamed)]),
    );
  }
  return content;
}
```

`features/teams/media.ts`:

```ts
import "server-only";

import { replaceMediaPaths } from "@/lib/pages/media";
import { mediaPaths } from "@/lib/pages/sanitize";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

const BUCKET = "page-media";
const FAILED = {
  ok: false as const,
  error: "Their page images couldn’t be copied, so nobody was removed. Please try again.",
};

/**
 * Copies a member's hosted-page images and files into the owner's media folder and points their
 * shared pages at the copies, so the pages keep working once they move to the owner (even if
 * the member deletes their account later). Runs before remove_member: if anything fails here,
 * nobody is removed. Pages already pointed at copies keep working either way.
 */
export async function copyPageMedia(
  memberId: string,
  ownerId: string,
): Promise<{ ok: true; files: number } | { ok: false; error: string }> {
  const admin = getAdminSupabase();
  if (!admin) return FAILED;
  const { data: pages, error } = await admin
    .from("qr_codes")
    .select("id, content")
    .eq("user_id", memberId)
    .eq("is_private", false);
  if (error) return FAILED;

  let files = 0;
  for (const page of pages ?? []) {
    const paths = mediaPaths(page.content).filter((path) => path.startsWith(`${memberId}/`));
    if (paths.length === 0) continue;
    const renamed = new Map<string, string>();
    for (const path of paths) {
      const copy = `${ownerId}/${path.slice(memberId.length + 1)}`;
      const { error: copyError } = await admin.storage.from(BUCKET).copy(path, copy);
      // A file copied on an earlier attempt is already there, which is fine.
      if (copyError && !/exist|duplicate/i.test(copyError.message)) return FAILED;
      renamed.set(path, copy);
      files += 1;
    }
    const { error: updateError } = await admin
      .from("qr_codes")
      .update({ content: replaceMediaPaths(page.content, renamed) as Json })
      .eq("id", page.id);
    if (updateError) return FAILED;
  }
  return { ok: true, files };
}
```

`features/teams/acceptError.ts`:

```ts
/** What to tell someone whose invite couldn't be accepted, from the database's reason. */
export function acceptError(
  message: string,
  names: { currentOwner: string | null; inviter: string | null },
): string {
  if (/already in another team/i.test(message)) {
    const where = names.currentOwner
      ? `You’re in ${names.currentOwner}’s team.`
      : "You’re already in a team.";
    const joining = names.inviter ? `${names.inviter}’s` : "this one";
    return `${where} Leave it before joining ${joining}.`;
  }
  if (/your own team/i.test(message))
    return "You have your own team. Remove its members before joining another.";
  if (/different email/i.test(message)) return "This invite is for a different email address.";
  if (/no longer valid/i.test(message))
    return "This invite has expired or was already used. Ask for a new link.";
  return "The invite couldn’t be accepted. Please try again.";
}
```

`features/teams/roles.ts`, replace the descriptions and add `roleLabel`:

```ts
export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  viewer:
    "As a viewer you see everyone’s codes in the team, with their analytics and feedback, and you create and change your own.",
  editor:
    "As an editor you see and change everyone’s codes and folders in the team, and you create your own.",
};

/** "Owner", "Editor" or "Viewer". */
export const roleLabel = (role: "owner" | TeamRole) =>
  role === "owner" ? "Owner" : ROLE_LABELS[role];
```

`components/ui/ConfirmDialog.tsx`:
- Add `children?: ReactNode` to the props, and destructure it.
- Render `{children && <div className="mt-4">{children}</div>}` right after the `Description`.

- [ ] **Step 4: Implement the actions.**

`features/teams/actions.ts`:
- Add `import { copyPageMedia } from "./media";`.
- In `sendInvites`, right after `const { supabase, inviter } = current;`:

```ts
  const { data: team } = await supabase.rpc("my_team");
  if ((team ?? []).some((person) => person.is_me && person.role !== "owner")) {
    return { error: "Only the team owner can invite people.", outcomes: [] };
  }
```

- Append:

```ts
export interface RemoveResult {
  error?: string;
  codes?: number;
  folders?: number;
}

/**
 * Removes someone from your team. With keepCodes their shared codes and folders move to you,
 * after their page images are copied: if copying fails, nobody is removed.
 */
export async function removeMember(memberId: string, keepCodes: boolean): Promise<RemoveResult> {
  const { supabase, user, needsMfa } = await getAuthState();
  if (!user) return { error: "Your session has expired. Sign in again." };
  if (needsMfa) return { error: "Enter your two-factor code first, then try again." };
  const { data: team } = await supabase.rpc("my_team");
  const me = (team ?? []).find((person) => person.is_me);
  const member = (team ?? []).find((person) => person.user_id === memberId && !person.is_me);
  if (me?.role !== "owner" || !member) return { error: "Only the team owner can remove people." };
  if (keepCodes) {
    const copied = await copyPageMedia(memberId, user.id);
    if (!copied.ok) return { error: copied.error };
  }
  const { data, error } = await supabase.rpc("remove_member", {
    p_member: memberId,
    p_keep_codes: keepCodes,
  });
  if (error) {
    return {
      error: /folders_user_name/.test(error.message)
        ? "One of their folders has the same name as one of yours. Rename it and try again."
        : "They couldn’t be removed. Please try again.",
    };
  }
  const moved = (data ?? {}) as { codes?: number; folders?: number };
  return { codes: moved.codes ?? 0, folders: moved.folders ?? 0 };
}
```

`app/(auth)/invite/[token]/actions.ts`, replace the error branch:

```ts
  if (error || !ownerId) {
    const message = error?.message ?? "";
    let names: { currentOwner: string | null; inviter: string | null } = {
      currentOwner: null,
      inviter: null,
    };
    if (/another team/i.test(message)) {
      const [{ data: team }, { data: details }] = await Promise.all([
        supabase.rpc("my_team"),
        supabase.rpc("invite_details", { p_token: token }),
      ]);
      const owner = toTeam(team ?? []).find((person) => person.role === "owner");
      const invite = details as { owner_name?: string | null; owner_email?: string } | null;
      names = {
        currentOwner: owner ? personLabel(owner) : null,
        inviter: invite?.owner_name?.trim() || invite?.owner_email || null,
      };
    }
    return { error: acceptError(message, names) };
  }
```

(imports: `acceptError` from `@/features/teams/acceptError`; `personLabel` and `toTeam` from `@/lib/teams/access`)

`app/(auth)/invite/[token]/page.tsx`: change the card title `Join ${owner}’s codes` to `Join ${owner}’s team`.

- [ ] **Step 5: Rewrite the Team page.**

`app/(app)/team/page.tsx`:
- Load `team` with `loadTeam(supabase)` instead of `team_overview` and `my_workspaces`. Keep the invites query.
- Render `<TeamManager userId={user.id} team={team} invites={invites.data ?? []} emailEnabled={emailConfigured()} />`.
- The page description is "Teammates see each other’s codes. Choose who can change them."

`features/teams/TeamManager.tsx`, rewritten:
- **Keep unchanged:** `Invite`, `MAX_SENDS_PER_INVITE`, `inviteLink`, `Section`, `OutcomeRow`, the invite form, the pending-invites list, `submit`, `onSubmit` and `resend`.
- **Remove:** the `Member` and `Membership` interfaces and the "Teams you’re in" section.
- **Imports:** add `Radio` and `RadioGroup` from `@headlessui/react`; `personLabel` and `type TeamPerson` from `@/lib/teams/access`; `removeMember` from `./actions`; and `roleLabel` from `./roles`. Drop the imports that are no longer used (`ArrowRight`, `Link`, `buttonClasses`, `workspaceLabel`).
- **Code:** use exactly the following:

```tsx
type Pending =
  | { kind: "remove"; member: TeamPerson }
  | { kind: "leave" }
  | { kind: "revoke"; invite: Invite };

/** "Keep their codes" or "Let them take their codes", for removing someone. */
function RemoveChoice({ keep, onChange }: { keep: boolean; onChange: (keep: boolean) => void }) {
  const options = [
    {
      value: "keep",
      label: "Keep their codes",
      hint: "Their codes and folders move to your account. Printed codes keep working.",
    },
    { value: "take", label: "Let them take their codes", hint: "They keep everything they made." },
  ] as const;
  return (
    <RadioGroup
      value={keep ? "keep" : "take"}
      onChange={(value) => onChange(value === "keep")}
      aria-label="What happens to their codes?"
      className="flex flex-col gap-2"
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          value={option.value}
          className="flex min-h-11 cursor-pointer flex-col gap-0.5 rounded-control border border-border p-3 data-checked:border-primary data-checked:bg-surface-2 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
        >
          <span className="text-sm font-semibold text-fg">{option.label}</span>
          <span className="text-[13px] text-fg-muted">{option.hint}</span>
        </Radio>
      ))}
    </RadioGroup>
  );
}

/** One person in a team list: photo, name and their role (or a control to change it). */
function PersonRow({ person, children }: { person: TeamPerson; children?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <Avatar
        id={person.userId}
        name={person.name}
        email={person.email}
        src={person.avatarUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate font-medium text-fg">
          {personLabel(person)}
          {person.isMe && <span className="font-normal text-fg-muted"> (you)</span>}
        </p>
        <p className="truncate text-sm text-fg-muted">
          {person.name ? `${person.email} · ` : ""}
          {roleLabel(person.role)}
        </p>
      </div>
      {children}
    </li>
  );
}

/** Your team: invite and manage people (as its owner or on your own), or see it and leave it. */
export function TeamManager({
  userId,
  team,
  invites,
  emailEnabled,
}: {
  userId: string;
  team: TeamPerson[];
  invites: Invite[];
  /** This server can email invites (BREVO_API_KEY is set). */
  emailEnabled: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [addresses, setAddresses] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [error, setError] = useState("");
  const [sending, setSending] = useState<"email" | "link" | null>(null);
  const [outcomes, setOutcomes] = useState<InviteOutcome[]>([]);
  const [resending, setResending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [keepCodes, setKeepCodes] = useState(true);
  const [working, setWorking] = useState(false);

  const me = team.find((person) => person.isMe) ?? null;
  const owner = team.find((person) => person.role === "owner") ?? null;
  const ownerName = owner ? personLabel(owner) : "";
  const isMember = me !== null && me.role !== "owner";
  const others = team.filter((person) => !person.isMe);

  // submit, onSubmit and resend: unchanged from before.

  async function changeRole(member: TeamPerson, next: TeamRole) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("team_members")
      .update({ role: next })
      .eq("owner_id", userId)
      .eq("member_id", member.userId);
    if (updateError) return toast("The role couldn’t be changed. Please try again.", "error");
    toast(`${personLabel(member)} is now ${next === "editor" ? "an editor" : "a viewer"}`);
    router.refresh();
  }

  async function runConfirmed() {
    if (!confirm) return;
    setWorking(true);
    if (confirm.kind === "remove") {
      let result: Awaited<ReturnType<typeof removeMember>>;
      try {
        result = await removeMember(confirm.member.userId, keepCodes);
      } catch {
        result = { error: "They couldn’t be removed. Check your connection and try again." };
      }
      setWorking(false);
      if (result.error) return toast(result.error, "error");
      const name = personLabel(confirm.member);
      const moved = result.codes ?? 0;
      toast(
        keepCodes && moved
          ? `Removed ${name}. ${moved} ${moved === 1 ? "code" : "codes"} moved to your codes.`
          : `Removed ${name}`,
      );
      setConfirm(null);
      router.refresh();
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) return setWorking(false);
    const { error: deleteError } =
      confirm.kind === "leave"
        ? await supabase.from("team_members").delete().eq("member_id", userId)
        : await supabase.from("team_invites").delete().eq("id", confirm.invite.id);
    setWorking(false);
    if (deleteError) return toast("That didn’t work. Please try again.", "error");
    toast(confirm.kind === "leave" ? `You left ${ownerName}’s team` : "Invite revoked");
    if (confirm.kind === "revoke") {
      const token = confirm.invite.token;
      setOutcomes((current) => current.filter((o) => o.token !== token));
    }
    setConfirm(null);
    router.refresh();
  }

  const dialog =
    confirm?.kind === "remove"
      ? {
          title: `Remove ${personLabel(confirm.member)}?`,
          description: "They’ll stop seeing your team’s codes, and you’ll stop seeing theirs.",
          label: "Remove",
        }
      : confirm?.kind === "leave"
        ? {
            title: `Leave ${ownerName}’s team?`,
            description: `You’ll keep your codes. You and ${ownerName}’s team will stop seeing each other’s codes.`,
            label: "Leave",
          }
        : {
            title: "Revoke this invite?",
            description: "The link stops working. You can create a new one any time.",
            label: "Revoke",
          };

  const canSubmit = sending === null && addresses.trim() !== "";

  return (
    <div className="flex flex-col gap-6">
      {isMember ? (
        <Section
          title="Your team"
          description={`You’re in ${ownerName}’s team as ${me!.role === "editor" ? "an editor" : "a viewer"}. ${
            me!.role === "editor"
              ? "You can see and change everyone’s codes."
              : "You can see everyone’s codes and change your own."
          }`}
        >
          <ul className="divide-y divide-border rounded-control border border-border">
            {team.map((person) => (
              <PersonRow key={person.userId} person={person} />
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button variant="outline" onClick={() => setConfirm({ kind: "leave" })}>
              <LogOut aria-hidden /> Leave team
            </Button>
            <p className="text-sm text-fg-muted">Only the team owner can invite people.</p>
          </div>
        </Section>
      ) : (
        <>
          {/* "Invite people": the existing Section and form, unchanged except its description:
              "Teammates see each other’s codes. Editors can change everyone’s codes; viewers change only their own." */}
          {/* "Pending invites": the existing Section, unchanged. */}
          <Section
            title="Your team"
            description={
              others.length
                ? "People you’ve invited. You see each other’s codes."
                : "Nobody else is on your team yet."
            }
          >
            {others.length > 0 && (
              <ul className="divide-y divide-border rounded-control border border-border">
                {others.map((member) => (
                  <PersonRow key={member.userId} person={member}>
                    <label className="w-32">
                      <span className="sr-only">Role for {personLabel(member)}</span>
                      <Select
                        value={member.role}
                        onChange={(e) => changeRole(member, e.target.value as TeamRole)}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </Select>
                    </label>
                    <IconButton
                      label={`Remove ${personLabel(member)}`}
                      size="icon-sm"
                      onClick={() => {
                        setKeepCodes(true);
                        setConfirm({ kind: "remove", member });
                      }}
                    >
                      <Trash2 aria-hidden />
                    </IconButton>
                  </PersonRow>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={dialog.title}
        description={dialog.description}
        confirmLabel={dialog.label}
        danger
        pending={working}
        onConfirm={runConfirmed}
        onClose={() => setConfirm(null)}
      >
        {confirm?.kind === "remove" && <RemoveChoice keep={keepCodes} onChange={setKeepCodes} />}
      </ConfirmDialog>
    </div>
  );
}
```

The two comment placeholders in the JSX stand for the existing "Invite people" and "Pending invites" sections. Move them in verbatim (with the new Invite description) when you rewrite the file. Don't leave the comments in the code.

- [ ] **Step 6: Run them to see them pass.**

Run: `npx vitest run && npm run lint && npm run typecheck && npm run build`
Expected: the whole unit suite passes (the new media, acceptError, actions and TeamManager tests included); lint, typecheck and build exit 0.

- [ ] **Step 7: Commit.**

```bash
git add lib/pages/media.ts lib/pages/media.test.ts features/teams components/ui/ConfirmDialog.tsx "app/(app)/team/page.tsx" "app/(auth)/invite"
git commit -m "Team page for owners and members: leave, and remove with keep-or-take"
```

### Task 6: Signed-in browser tests for teams

**Files:**
- Modify: `e2e/accounts/fixtures.ts`, `e2e/accounts/global-setup.ts`
- Create: `e2e/accounts/teams.spec.ts`
- Modify: `e2e/accounts/app.spec.ts`, `e2e/accounts/bulk.spec.ts` (viewer tests for the new rules)

**Interfaces:**
- Consumes: the labels from Tasks 2–5. `/codes?workspace=<person>` shows that person's codes, or your own (heading "All codes") when they aren't a teammate.
- Produces: accounts `PAT` (owner) with `QUINN` (editor), and `RAY` (owner) with `SKY` (viewer). These run destructive team tests, so the seeded owner and viewer stay untouched. A seeded code for the viewer, "Victor note". `Seed` gains `viewerCodeId`, `rayId` and `skyId`.

- [ ] **Step 1: Add the accounts.**

In `e2e/accounts/fixtures.ts`, after `MAKER`:

```ts
/** Teams whose tests remove or leave: kept apart so the owner's and viewer's tests never change. */
export const PAT = { email: "pat@example.com", password: "pat-e2e-pass-2026", name: "Pat Owner", state: `${AUTH_DIR}/pat.json` };
export const QUINN = { email: "quinn@example.com", password: "quinn-e2e-pass-2026", name: "Quinn Editor", state: `${AUTH_DIR}/quinn.json` };
export const RAY = { email: "ray@example.com", password: "ray-e2e-pass-2026", name: "Ray Owner", state: `${AUTH_DIR}/ray.json` };
export const SKY = { email: "sky@example.com", password: "sky-e2e-pass-2026", name: "Sky Viewer", state: `${AUTH_DIR}/sky.json` };
```

Add to `Seed`:

```ts
  /** The viewer's own code, "Victor note". */
  viewerCodeId: string;
  /** Ray's team, which Sky leaves in a test. */
  rayId: string;
  skyId: string;
```

In `e2e/accounts/global-setup.ts`:
- Every `[OWNER, VIEWER, MAKER]` list becomes `[OWNER, VIEWER, MAKER, PAT, QUINN, RAY, SKY]`, and the import follows.
- Create the four users (`const patId = await create(PAT);` and so on).
- Then, before `const seeded`:

```ts
  const { error: teamsError } = await admin.from("team_members").insert([
    { owner_id: patId, member_id: quinnId, role: "editor" },
    { owner_id: rayId, member_id: skyId, role: "viewer" },
  ]);
  if (teamsError) throw teamsError;
  const note = { qr_type: "text", content: { text: "hello" } };
  const { data: own, error: ownError } = await admin
    .from("qr_codes")
    .insert(
      [
        { user_id: viewerId, name: "Victor note", ...note },
        { user_id: quinnId, name: "Quinn poster", ...note },
        { user_id: rayId, name: "Ray sign", ...note },
        { user_id: skyId, name: "Sky flyer", ...note },
      ],
      { defaultToNull: false },
    )
    .select("id, name");
  if (ownError || !own) throw ownError ?? new Error("Couldn't create team codes");
```

- Extend `seeded` with `viewerCodeId: own.find((c) => c.name === "Victor note")!.id, rayId, skyId`.

- [ ] **Step 2: Write the tests.** Create `e2e/accounts/teams.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { OWNER, PAT, RAY, SKY, VIEWER, seed } from "./fixtures";

test.describe("an owner", () => {
  test.use({ storageState: OWNER.state });

  test("sees a member's codes", async ({ page }) => {
    await page.goto(`codes?workspace=${seed().viewerId}`);
    await expect(page.getByRole("heading", { level: 1, name: "Victor Viewer’s codes" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Victor note" })).toBeVisible();
  });
});

test.describe("a viewer", () => {
  test.use({ storageState: VIEWER.state });

  test("looks at a teammate's code but edits their own", async ({ page }) => {
    await page.goto(`codes/${seed().menuId}`);
    await expect(page.getByText(/view-only access/)).toBeVisible();
    await page.goto(`codes/${seed().viewerCodeId}`);
    await expect(page.getByRole("heading", { level: 1, name: "Victor note" })).toBeVisible();
    await expect(page.getByText(/view-only access/)).toHaveCount(0);
  });
});

test.describe("leaving a team", () => {
  test.use({ storageState: SKY.state });

  test("ends the sharing both ways, and you keep your codes", async ({ page, browser }) => {
    const { rayId, skyId } = seed();
    await page.goto(`codes?workspace=${rayId}`);
    await expect(page.getByRole("listitem", { name: "Ray sign" })).toBeVisible();

    await page.goto("team");
    await page.getByRole("button", { name: "Leave team" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Leave" }).click();
    await expect(page.getByText(/You left .*’s team/)).toBeVisible();

    await page.goto(`codes?workspace=${rayId}`);
    await expect(page.getByRole("heading", { level: 1, name: "All codes" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Ray sign" })).toHaveCount(0);
    await expect(page.getByRole("listitem", { name: "Sky flyer" })).toBeVisible();

    const ray = await browser.newContext({
      storageState: RAY.state,
      baseURL: test.info().project.use.baseURL,
    });
    const rayPage = await ray.newPage();
    await rayPage.goto(`codes?workspace=${skyId}`);
    await expect(rayPage.getByRole("listitem", { name: "Sky flyer" })).toHaveCount(0);
    await ray.close();
  });
});

test.describe("removing someone", () => {
  test.use({ storageState: PAT.state });

  test("and keeping their codes moves them to you", async ({ page }) => {
    await page.goto("codes");
    await expect(page.getByRole("listitem", { name: "Quinn poster" })).toHaveCount(0);
    await page.goto("team");
    await page.getByRole("button", { name: /^Remove Quinn/ }).click();
    await expect(page.getByRole("radio", { name: /Keep their codes/ })).toBeChecked();
    await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(/Removed Quinn.* moved to your codes/)).toBeVisible();
    await page.goto("codes");
    await expect(page.getByRole("listitem", { name: "Quinn poster" })).toBeVisible();
  });
});
```

- [ ] **Step 3: Update the old viewer tests to the new rules.**

In `e2e/accounts/app.spec.ts`:
- "sees the owner's codes with no create controls" becomes "sees the owner's codes; Create makes their own":

```ts
  test("sees the owner's codes; Create makes their own", async ({ page }) => {
    await page.goto(`codes?workspace=${seed().ownerId}`);
    await expect(page.getByText("Spring menu")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /Create( code)?$/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Create code" }).first()).toHaveAttribute("href", "/codes/new");
  });
```

- "stay in that team, without create controls" keeps its URL check and checks `page.getByRole("main").getByRole("link", { name: /Create( code)?$/ })` has count 0.
- Add, inside `describe("signed in as a viewer")`:

```ts
  test("the member view of /team fits 390px and passes axe", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("team");
    await expect(page.getByRole("button", { name: "Leave team" })).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectNoAxeViolations(page);
  });
```

In `e2e/accounts/bulk.spec.ts`, the team viewer test becomes:

```ts
  test("bulk create in their own codes from anywhere", async ({ page }) => {
    const { ownerId } = seed();
    await page.goto(`codes/bulk?workspace=${ownerId}`);
    await expect(page.getByRole("heading", { level: 1, name: "Create codes in bulk" })).toBeVisible();
    await expect(page.getByText(/Saving to/)).toHaveCount(0);
  });
```

- [ ] **Step 4: Run the signed-in suite.**

The local Supabase predates this migration, so first run `npx --yes supabase@2.120.0 migration up --local`.

Run: `npm run test:e2e:accounts`
Expected: all tests pass, including the 4 new team tests and the updated viewer tests.

- [ ] **Step 5: Commit.**

```bash
git add e2e/accounts
git commit -m "Check two-way team sharing, leaving and removing signed in"
```

### Task 7: Ship Phase 3a

**Files:** none new.

- [ ] **Step 1: Run the full local check.** The public suite needs a build with accounts off; the signed-in suite builds its own.

Run: `npx prettier --check . --ignore-path .gitignore --ignore-path .prettierignore --ignore-path .git/info/exclude && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e && npm run test:e2e:accounts`
Expected: all PASS.

- [ ] **Step 2: Push and open the PR.**

```bash
git push -u origin feat/teams
gh pr create --base main --head feat/teams --title "Teams: two-way sharing, roles, leaving and removing" --body "$(cat <<'EOF'
Phase 3a of the redesign (spec docs/superpowers/specs/2026-10-14-quickqreate-teams-design.md; plan docs/superpowers/plans/2026-10-14-phase-3a-teams.md).

- Teammates see each other's codes both ways. Owners and editors can change teammates' codes; viewers change only their own. Everyone creates in their own space (duplicating a teammate's code copies it to yours).
- One team per person, with clear messages when an invite can't be accepted. Only the owner invites.
- Team page: owners invite and manage people; members see the team and can leave (they keep their codes; sharing ends both ways).
- Removing someone: keep their codes (codes, folders, scans and page images move to you; printed codes keep working) or let them take them.
- Private codes are enforced by the database (only their maker sees them); the switch to mark one arrives in 3b with the switch row and Everyone view.
- Migration (applied live before merge): new can_view/can_edit, my_team, remove_member, is_private.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Run the final whole-branch review before merging.** Follow the "Final Review" section of superpowers:executing-plans, with this plan's Review Focus and the ledger's rulings. Do one fix pass if needed. Both CI jobs must pass.

- [ ] **Step 4: Confirm a recent verified backup, then apply the migration through the private SQL bridge.**
1. Read `health.json` on the host through the strict SSH wrapper.
   Expected: a verified archive from the last 24 hours.
2. Rerun the live pre-check, with the same counts as the 2026-10-14 planning check.
   Expected: `members_in_several_teams` and `members_who_also_own` are both 0.
3. Run `grep -c '\\'` on the migration.
   Expected: `0`.
4. Apply it with `tsb.py execute_sql db12f7ce-3e77-4461-a686-c8cd6de6f764 supabase/migrations/20261014170000_teams.sql`.
5. Run `notify pgrst, 'reload schema';`.

Verify with:

```sql
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('my_team', 'remove_member', 'team_owner')) as new_functions,
  (select count(*) from information_schema.columns
    where table_name = 'qr_codes' and column_name = 'is_private') as private_column,
  (select count(*) from pg_constraint where conname = 'team_members_one_team') as one_team,
  has_function_privilege('anon', 'public.remove_member(uuid,boolean)', 'execute') as anon_can_remove;
```

Expected: `new_functions` is 3, `private_column` is 1, `one_team` is 1, and `anon_can_remove` is `f`. Append the migration to the runbook under "QuickQReate Phase 3a migration".

- [ ] **Step 5: Merge and check the live site.**
  1. Note the live build ID, then run `gh pr merge --merge --delete-branch`.
  2. Poll until the build ID changes. If a page shows "This page couldn't load" during the switch, reload once.
  3. Check:
     - `/api/health` is OK.
     - In David's Chrome, the account it's signed in to sees the other person's codes through the sidebar switcher (whichever side of the team that is).
     - `/team` shows the owner view or the member view to match.
  4. Remove no one and create nothing.

