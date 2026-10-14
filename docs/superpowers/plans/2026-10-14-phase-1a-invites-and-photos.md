# Phase 1a: Email Invites and Profile Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Team invites arrive by email (with a link as backup), new invitees join in one flow, and everyone gets a profile photo: their Google photo by default, or one they upload.

**Architecture:**
- Three additive migrations:
  - `profiles.avatar_url` plus photos in the team functions
  - a public `avatars` Storage bucket
  - email-send counters with rate limits, and a lookup that takes a new account to its pending invite.
- A server action creates invites under the user's session and records each send in the database, which enforces the limits. It then emails the invite through Brevo's transactional API from the server, and returns links whenever email isn't possible.
- Photos are cropped and resized in the browser and uploaded straight to Storage. They are shown by one `Avatar` component that only loads photos from trusted hosts.

**Tech Stack:** Next.js 16.4 App Router (server actions), React 19.3, Supabase (`@supabase/ssr`, Storage, PGlite tests), Tailwind 4.3, lucide-react, Vitest 5 with Testing Library, Brevo HTTP API (plain `fetch`, no new dependency).

**Spec:** `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md`. This plan implements sections 6.2 (profile photos) and 6.3 (email invites), plus their testing items in section 7.

## Scope: Phase 1 in two parts

The spec's Phase 1 is one PR covering:
- the app shell
- the new tokens and wording
- `/codes`, `/settings` and `/team`
- redirects
- profile photos and email invites

It ships as two PRs instead:

- **1a (this plan):** profile photos and email invites. They go into today's pages (`/account`, `/dashboard/team`, `/invite/<token>`, `/signup`, the header account menu) using today's tokens.
- **1b (next plan):** the app shell, new tokens and wording, `/codes`, `/settings` and `/team`, and redirects from the old routes. It moves the 1a components into the new pages.

1a delivers what David asked for first (invites that email, photos) without waiting for the larger visual change. Nothing in 1a is thrown away by 1b.

## Global Constraints

- **Wording:**
  - Copy is in sentence case.
  - Buttons start with a verb.
  - Use curly apostrophes (’) in UI and email text, as the existing UI does.
  - New copy says "team" and "codes", never "workspace" (spec §5 glossary).
- **Readability:**
  - New text is at least 13px. Use `text-sm` (14px) or larger, and never `text-xs` in new UI.
  - Primary text uses `text-fg`, secondary text uses `text-fg-muted`, and links use `text-link`.
  - Never use `text-fg-subtle` for text people need to read.
- **Responsive:**
  - New UI works from 320px to 1920px wide with no horizontal scrolling.
  - New buttons and controls on phone layouts are at least 44×44px: buttons use size `md` (`h-11`), and inline text buttons get `min-h-11`.
- **Secrets:**
  - `BREVO_API_KEY` is server-only and read only in `lib/email/brevo.ts`. It never gets a `NEXT_PUBLIC_` name and is never logged.
  - David enters it in Coolify (runtime only, not build time).
  - `INVITE_FROM_EMAIL` is optional and defaults to `no-reply@techitdave.com`.
- **Migrations:**
  - Add new files in `supabase/migrations/`, each wrapped in `begin; … commit;`.
  - Use **no backslashes** anywhere in the SQL, because the private SQL bridge rejects them.
  - Apply them to the live project through the bridge, using the exact UUID `db12f7ce-3e77-4461-a686-c8cd6de6f764`.
  - Apply them after a verified backup and **before** the PR merges. The old code keeps working with the new schema.
- **Types:** `types/supabase.ts` is hand-maintained. Update it in the same task as the migration.
- **Dependencies:** no new npm dependencies.
- **Photo trust:** the app and emails only load profile photos from this project's `avatars` bucket or from `*.googleusercontent.com` over https (`trustedAvatarUrl`).
- **Invite limits:** at most 10 addresses per request, 5 emails per invite, and 20 emails per owner per rolling hour, enforced in the database.

## Review Focus

1. **Brevo misconfigured or refusing:**
   - The failure cases are a wrong key (401), an unauthorized IP (401/403), an unverified sender (400) and a timeout.
   - Expected: invites are still created, the person sees a copyable link and "couldn’t be emailed", and nothing crashes.
   - Test: Task 9 "keeps the link when Brevo refuses the email", plus Task 8's error cases.
2. **New invitee confirms the email on another device:**
   - Expected: after the confirmation link they land on `/invite/<token>`, not the dashboard. Regular sign-ups still land on the dashboard.
   - Test: Task 3 "find the invite waiting for a new account’s address", plus Task 11 `confirmDestination`.
3. **Phone photo uploads:**
   - The cases are a 12 MB portrait JPEG from an iPhone, Safari (which can't encode WebP, so the photo is stored as PNG), and HEIC.
   - Expected: a clear message for unsupported files, a centered square crop, and an upload that stays under 2 MB.
   - Test: Task 5 `validateAvatarFile` and `squareCrop`.
4. **A removed or uploaded photo stays as chosen:**
   - Expected: signing in with Google again never brings back a removed photo or replaces an uploaded one. Google's photo is adopted only when Google is first linked and the profile has no photo.
   - Test: Task 6 `googleJustLinked`.
5. **Someone tries to use their photo URL to track others:**
   - An editor or teammate sets `avatar_url` to their own server through the API.
   - Expected: teammates' browsers and invite emails never load it, and initials show instead.
   - Test: Task 4 `trustedAvatarUrl`, plus Task 7 "shows only trusted photos".

---

### Task 1: Profile photos in the database

**Files:**
- Create: `supabase/migrations/20261014120000_profile_photos.sql`
- Modify: `supabase/test/migration.test.ts` (one account added before this migration; new `describe` at the end)
- Modify: `types/supabase.ts`

**Interfaces:**
- Produces:
  - `profiles.avatar_url text | null`
  - `my_workspaces()` gains `owner_avatar_url`
  - `team_overview()` gains `avatar_url`
  - `invite_details()` JSON gains `owner_avatar_url`
  - In types: `Database["public"]["Tables"]["profiles"]["Row"]["avatar_url"]`, and the matching function `Returns` fields.

- [ ] **Step 1: Write the failing tests.**

In `supabase/test/migration.test.ts`, after the line `const BOB = "22222222-2222-4222-8222-222222222222";`, add:

```ts
// Signed up before profile photos existed, so the back-fill has someone to fill in.
const OLIVE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PROFILE_PHOTOS = "20261014120000_profile_photos.sql";
```

In `beforeAll`, replace the migration loop

```ts
  for (const file of readdirSync(MIGRATIONS).sort()) {
    await db.exec(readFileSync(resolve(MIGRATIONS, file), "utf8"));
  }
```

with

```ts
  for (const file of readdirSync(MIGRATIONS).sort()) {
    if (file === PROFILE_PHOTOS) {
      await db.query(
        `insert into auth.users (id, email, raw_user_meta_data)
         values ($1, 'olive@example.com', '{"picture":"https://lh3.googleusercontent.com/a/olive"}')`,
        [OLIVE],
      );
    }
    await db.exec(readFileSync(resolve(MIGRATIONS, file), "utf8"));
  }
```

Append at the end of the file:

```ts
describe("profile photos", () => {
  const PAT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // signs up with Google
  const QUINN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; // signs up with email
  const asPat = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", PAT, sql, params);
  const asQuinn = <T>(sql: string, params?: unknown[]) =>
    as<T>("authenticated", QUINN, sql, params);
  const photo = async (id: string) =>
    (
      await asService<{ avatar_url: string | null }>(
        "select avatar_url from public.profiles where id = $1",
        [id],
      )
    )[0]?.avatar_url ?? null;

  beforeAll(async () => {
    await db.query(
      `insert into auth.users (id, email, raw_user_meta_data) values
         ($1, 'pat@example.com', '{"full_name":"Pat","avatar_url":"https://lh3.googleusercontent.com/a/pat"}'),
         ($2, 'quinn@example.com', '{"picture":"http://insecure.example/q.png"}')`,
      [PAT, QUINN],
    );
  });

  it("copy the Google photo at sign-up and back-fill older accounts", async () => {
    expect(await photo(PAT)).toBe("https://lh3.googleusercontent.com/a/pat");
    expect(await photo(OLIVE)).toBe("https://lh3.googleusercontent.com/a/olive");
  });

  it("ignore photo addresses that aren't https", async () => {
    expect(await photo(QUINN)).toBeNull();
  });

  it("let people set and clear only their own photo, and only https addresses", async () => {
    await asQuinn("update public.profiles set avatar_url = $1 where id = $2", [
      "https://cdn.example/q.webp",
      QUINN,
    ]);
    expect(await photo(QUINN)).toBe("https://cdn.example/q.webp");
    await asPat("update public.profiles set avatar_url = $1 where id = $2", [
      "https://evil.example/x.png",
      QUINN,
    ]);
    expect(await photo(QUINN)).toBe("https://cdn.example/q.webp");
    await expect(
      asQuinn("update public.profiles set avatar_url = 'javascript:alert(1)' where id = $1", [
        QUINN,
      ]),
    ).rejects.toThrow(/check constraint/);
    await expect(
      asQuinn("update public.profiles set avatar_url = $1 where id = $2", [
        `https://x.example/${"a".repeat(2048)}`,
        QUINN,
      ]),
    ).rejects.toThrow(/check constraint/);
    await asQuinn("update public.profiles set avatar_url = null where id = $1", [QUINN]);
    expect(await photo(QUINN)).toBeNull();
  });

  it("show in team lists and on invite links", async () => {
    await asService(
      "insert into public.team_members (owner_id, member_id, role) values ($1, $2, 'viewer')",
      [PAT, QUINN],
    );
    await asQuinn("update public.profiles set avatar_url = $1 where id = $2", [
      "https://cdn.example/q2.webp",
      QUINN,
    ]);
    expect(
      await asPat<{ email: string; avatar_url: string | null }>(
        "select email, avatar_url from public.team_overview()",
      ),
    ).toEqual([{ email: "quinn@example.com", avatar_url: "https://cdn.example/q2.webp" }]);
    expect(
      await asQuinn<{ owner_email: string; owner_avatar_url: string | null }>(
        "select owner_email, owner_avatar_url from public.my_workspaces()",
      ),
    ).toEqual([
      { owner_email: "pat@example.com", owner_avatar_url: "https://lh3.googleusercontent.com/a/pat" },
    ]);
    const [invite] = await asPat<{ token: string }>(
      "insert into public.team_invites (email, role) values ('rae@example.com', 'editor') returning token",
    );
    const [{ details }] = (await asQuinn<{ details: Record<string, unknown> }>(
      "select public.invite_details($1) as details",
      [invite!.token],
    )) as [{ details: Record<string, unknown> }];
    expect(details).toMatchObject({
      owner_name: "Pat",
      owner_avatar_url: "https://lh3.googleusercontent.com/a/pat",
    });
    await expect(asAnon("select public.team_overview()")).rejects.toThrow(/permission denied/);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run supabase/test/migration.test.ts`
Expected:
- The four new tests FAIL (column `avatar_url` doesn't exist).
- Every older test still PASSES.

- [ ] **Step 3: Write the migration.** Create `supabase/migrations/20261014120000_profile_photos.sql`:

```sql
-- Profile photos: each profile can have a photo, shown in the account menu, team lists and
-- invite emails. It starts as the Google account photo (when there is one) and can be replaced
-- with an upload (see the avatar storage migration) or removed.

begin;

alter table public.profiles
  add column avatar_url text
    check (avatar_url is null or (avatar_url like 'https://%' and char_length(avatar_url) <= 2048));

grant update (avatar_url) on public.profiles to authenticated;

-- New accounts take their photo from sign-up metadata (Google sends avatar_url and picture).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_photo text;
begin
  v_photo := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture');
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    case when v_photo like 'https://%' and char_length(v_photo) <= 2048 then v_photo end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Accounts made before photos existed get their Google photo now.
update public.profiles p
   set avatar_url = m.photo
  from (
    select u.id,
           coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') as photo
      from auth.users u
  ) m
 where m.id = p.id
   and p.avatar_url is null
   and m.photo like 'https://%'
   and char_length(m.photo) <= 2048;

-- Team lists and invite links show photos. The return types change, so these two functions are
-- dropped and created again, with the same grants.
drop function public.my_workspaces();

create function public.my_workspaces()
returns table (owner_id uuid, owner_email text, owner_name text, role text, owner_avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.owner_id, u.email::text, p.display_name, m.role, p.avatar_url
    from public.team_members m
    join auth.users u on u.id = m.owner_id
    left join public.profiles p on p.id = m.owner_id
   where m.member_id = auth.uid()
   order by coalesce(p.display_name, u.email::text);
$$;

drop function public.team_overview();

create function public.team_overview()
returns table (member_id uuid, email text, name text, role text, created_at timestamptz, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.member_id, u.email::text, p.display_name, m.role, m.created_at, p.avatar_url
    from public.team_members m
    join auth.users u on u.id = m.member_id
    left join public.profiles p on p.id = m.member_id
   where m.owner_id = auth.uid()
   order by m.created_at;
$$;

revoke all on function public.my_workspaces(), public.team_overview() from public, anon;
grant execute on function public.my_workspaces(), public.team_overview() to authenticated;

create or replace function public.invite_details(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'owner_email', u.email,
    'owner_name', p.display_name,
    'owner_avatar_url', p.avatar_url,
    'email', i.email,
    'role', i.role,
    'valid', i.accepted_at is null and i.expires_at > now()
  )
    from public.team_invites i
    join auth.users u on u.id = i.owner_id
    left join public.profiles p on p.id = i.owner_id
   where i.token = p_token;
$$;

commit;
```

- [ ] **Step 4: Update the types.** In `types/supabase.ts`:
  - Replace the `profiles` block with:

```ts
      profiles: {
        Row: { id: string; display_name: string | null; avatar_url: string | null; created_at: string };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: { display_name?: string | null; avatar_url?: string | null };
        Relationships: [];
      };
```

  - In `my_workspaces.Returns`, add `owner_avatar_url: string | null;` after `role: TeamRole;`.
  - In `team_overview.Returns`, add `avatar_url: string | null;` after `created_at: string;`.

- [ ] **Step 5: Run the tests and typecheck, and confirm they pass.**

Run: `npx vitest run supabase/test/migration.test.ts && npm run typecheck && grep -c '\\' supabase/migrations/20261014120000_profile_photos.sql`
Expected:
- All migration tests PASS.
- Typecheck has 0 errors.
- The backslash count prints `0`.

- [ ] **Step 6: Commit.**

```bash
npx prettier --write supabase/test/migration.test.ts types/supabase.ts
git add supabase/migrations/20261014120000_profile_photos.sql supabase/test/migration.test.ts types/supabase.ts
git commit -m "Add profile photos to profiles and team lists

profiles.avatar_url holds an https photo URL: the Google photo from
sign-up (back-filled for existing accounts) or a later upload. Team
lists and invite details return it.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Storage bucket for uploaded photos

**Files:**
- Create: `supabase/migrations/20261014120100_avatar_storage.sql`
- Modify: `supabase/test/migration.test.ts` (new `describe` at the end)

**Interfaces:**
- Produces: a public bucket `avatars` (2 MB, png/jpeg/webp). Owners write only under `<user id>/`, and two-factor accounts need an aal2 session.

- [ ] **Step 1: Write the failing tests.** Append to `supabase/test/migration.test.ts`:

```ts
describe("profile photo storage", () => {
  const RITA = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const SAM = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  const asRita = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", RITA, sql, params);
  const asSam = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", SAM, sql, params);
  const add = (who: typeof asRita, name: string) =>
    who("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [name]);

  beforeAll(async () => {
    await db.query(
      "insert into auth.users (id, email) values ($1, 'rita@example.com'), ($2, 'sam@example.com')",
      [RITA, SAM],
    );
  });

  it("keeps photos in each owner's folder, in a public 2 MB bucket for images", async () => {
    await add(asRita, `${RITA}/me.webp`);
    await expect(add(asSam, `${RITA}/evil.webp`)).rejects.toThrow(/row-level security/);
    await expect(
      asAnon("insert into storage.objects (bucket_id, name) values ('avatars', 'x/y.webp')"),
    ).rejects.toThrow(/row-level security/);
    expect(await asSam("select name from storage.objects where bucket_id = 'avatars'")).toEqual(
      [],
    );
    await asSam("delete from storage.objects where bucket_id = 'avatars'");
    expect(await asRita("select name from storage.objects where bucket_id = 'avatars'")).toEqual([
      { name: `${RITA}/me.webp` },
    ]);
    await asRita("delete from storage.objects where name = $1", [`${RITA}/me.webp`]);
    expect(await asRita("select name from storage.objects where bucket_id = 'avatars'")).toEqual(
      [],
    );
    const [bucket] = await asService<{
      public: boolean;
      file_size_limit: string;
      allowed_mime_types: string[];
    }>("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars'");
    expect(bucket).toMatchObject({
      public: true,
      allowed_mime_types: ["image/png", "image/jpeg", "image/webp"],
    });
    expect(Number(bucket?.file_size_limit)).toBe(2097152);
  });

  it("need a two-factor session for accounts with two-factor", async () => {
    await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [SAM]);
    await expect(add(asSam, `${SAM}/me.webp`)).rejects.toThrow(/row-level security/);
    await as(
      "authenticated",
      SAM,
      "insert into storage.objects (bucket_id, name) values ('avatars', $1)",
      [`${SAM}/me.webp`],
      "aal2",
    );
    await db.query("delete from auth.mfa_factors where user_id = $1", [SAM]);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run supabase/test/migration.test.ts`
Expected: the two new tests FAIL. The bucket is missing, so the inserts violate the foreign key, and the bucket row is undefined.

- [ ] **Step 3: Write the migration.** Create `supabase/migrations/20261014120100_avatar_storage.sql`:

```sql
-- Uploaded profile photos, in their own migration (like page media) so the rest of the schema
-- applies even if this project's Storage service isn't enabled yet.
--
-- Photos live in the public bucket "avatars" under "<user id>/<file>". Anyone can load a photo
-- by its URL (teammates and invite emails show it); only the owner can add, replace or remove
-- files in their own folder.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Owners can add a photo to their folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners can see their photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners can replace their photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners can delete their photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Two-factor accounts need a two-factor session for photos"
  on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'avatars' or (select public.mfa_satisfied()))
  with check (bucket_id <> 'avatars' or (select public.mfa_satisfied()));

commit;
```

- [ ] **Step 4: Run the tests and confirm they pass.**

Run: `npx vitest run supabase/test/migration.test.ts && grep -c '\\' supabase/migrations/20261014120100_avatar_storage.sql`
Expected: all PASS, and the backslash count prints `0`.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write supabase/test/migration.test.ts
git add supabase/migrations/20261014120100_avatar_storage.sql supabase/test/migration.test.ts
git commit -m "Add a Storage bucket for profile photos

Public avatars bucket (2 MB, PNG/JPEG/WebP). Owners can only write in
their own folder, and two-factor accounts need a two-factor session.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Invite email limits and pending-invite lookup

**Files:**
- Create: `supabase/migrations/20261014120200_email_invites.sql`
- Modify: `supabase/test/migration.test.ts` (new `describe` at the end)
- Modify: `types/supabase.ts`

**Interfaces:**
- Produces:
  - `team_invites.last_sent_at timestamptz | null` and `team_invites.send_count int`
  - `record_invite_send(p_invite uuid) returns void`. It raises exactly these messages:
    - `This invite is no longer valid`
    - `This invite has been emailed 5 times already`
    - `You have sent 20 invites in the last hour`
    - `Sign in to send invites`
  - `my_pending_invite() returns text` (a token or null)
  - `invite_details` is now callable by `anon`.

- [ ] **Step 1: Write the failing tests.** Append to `supabase/test/migration.test.ts`:

```ts
describe("email invites", () => {
  const TESS = "12121212-1212-4212-8212-121212121212"; // sends invites
  const UMA = "13131313-1313-4313-8313-131313131313"; // another owner
  const XENA = "14141414-1414-4414-8414-141414141414"; // signs up after being invited
  const asTess = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", TESS, sql, params);
  const asUma = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", UMA, sql, params);
  const asXena = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", XENA, sql, params);
  const record = (who: typeof asTess, id: string) =>
    who("select public.record_invite_send($1)", [id]);

  beforeAll(async () => {
    await db.query(
      "insert into auth.users (id, email) values ($1, 'tess@example.com'), ($2, 'uma@example.com')",
      [TESS, UMA],
    );
  });

  it("count each email and stop at 5 for one invite", async () => {
    const [invite] = await asTess<{ id: string }>(
      "insert into public.team_invites (email, role) values ('vic@example.com', 'viewer') returning id",
    );
    await expect(record(asUma, invite!.id)).rejects.toThrow(/no longer valid/);
    for (let i = 0; i < 5; i++) await record(asTess, invite!.id);
    await expect(record(asTess, invite!.id)).rejects.toThrow(/5 times/);
    const [row] = await asTess<{ send_count: number; last_sent_at: string | null }>(
      "select send_count, last_sent_at from public.team_invites where id = $1",
      [invite!.id],
    );
    expect(row?.send_count).toBe(5);
    expect(row?.last_sent_at).not.toBeNull();
  });

  it("allow 20 emails an hour per owner, even across revoked invites", async () => {
    const invites = await asTess<{ id: string }>(
      `insert into public.team_invites (email, role)
       select 'p' || g || '@example.com', 'viewer' from generate_series(1, 16) g returning id`,
    );
    for (const invite of invites.slice(0, 15)) await record(asTess, invite.id);
    // 5 + 15 = 20 emails this hour.
    await expect(record(asTess, invites[15]!.id)).rejects.toThrow(/20 invites/);
    await asTess("delete from public.team_invites");
    const [fresh] = await asTess<{ id: string }>(
      "insert into public.team_invites (email, role) values ('new@example.com', 'editor') returning id",
    );
    await expect(record(asTess, fresh!.id)).rejects.toThrow(/20 invites/);
  });

  it("keep the send log private", async () => {
    await expect(asTess("select * from public.invite_sends")).rejects.toThrow(/permission denied/);
    await expect(
      asTess("insert into public.invite_sends (owner_id) values ($1)", [TESS]),
    ).rejects.toThrow(/permission denied/);
    await expect(asAnon("select public.record_invite_send(gen_random_uuid())")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("refuse used or expired invites", async () => {
    const [used] = await asUma<{ id: string; token: string }>(
      "insert into public.team_invites (email, role) values ('tess@example.com', 'viewer') returning id, token",
    );
    await asTess("select public.accept_invite($1)", [used!.token]);
    await expect(record(asUma, used!.id)).rejects.toThrow(/no longer valid/);
    const [old] = await asUma<{ id: string }>(
      "insert into public.team_invites (email, role) values ('old@example.com', 'viewer') returning id",
    );
    await asService(
      "update public.team_invites set expires_at = now() - interval '1 minute' where id = $1",
      [old!.id],
    );
    await expect(record(asUma, old!.id)).rejects.toThrow(/no longer valid/);
  });

  it("show invite details to anyone holding the link", async () => {
    const [invite] = await asUma<{ token: string }>(
      "insert into public.team_invites (email, role) values ('wes@example.com', 'editor') returning token",
    );
    const [{ details }] = (await asAnon<{ details: Record<string, unknown> }>(
      "select public.invite_details($1) as details",
      [invite!.token],
    )) as [{ details: Record<string, unknown> }];
    expect(details).toMatchObject({
      email: "wes@example.com",
      role: "editor",
      valid: true,
      owner_email: "uma@example.com",
    });
    const [{ details: none }] = (await asAnon<{ details: unknown }>(
      "select public.invite_details($1) as details",
      ["0".repeat(48)],
    )) as [{ details: unknown }];
    expect(none).toBeNull();
  });

  it("find the invite waiting for a new account’s address", async () => {
    await db.query("insert into auth.users (id, email) values ($1, 'xena@example.com')", [XENA]);
    const [invite] = await asUma<{ token: string }>(
      "insert into public.team_invites (email, role) values ('Xena@Example.com', 'viewer') returning token",
    );
    const pending = async (who: typeof asTess) =>
      (await who<{ token: string | null }>("select public.my_pending_invite() as token"))[0]
        ?.token ?? null;
    expect(await pending(asXena)).toBe(invite!.token);
    expect(await pending(asTess)).toBeNull();
    await asXena("select public.accept_invite($1)", [invite!.token]);
    expect(await pending(asXena)).toBeNull();
    await expect(asAnon("select public.my_pending_invite()")).rejects.toThrow(
      /permission denied/,
    );
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run supabase/test/migration.test.ts`
Expected: the six new tests FAIL, because `record_invite_send`, `invite_sends` and `my_pending_invite` don't exist and anon can't call `invite_details`.

- [ ] **Step 3: Write the migration.** Create `supabase/migrations/20261014120200_email_invites.sql`:

```sql
-- Email invites: QuickQReate emails team invites from the server (through Brevo). Each email is
-- recorded first, and the limits below stop one account from using invites to send lots of
-- email: at most 5 emails for one invite and 20 an hour for one owner.

begin;

alter table public.team_invites
  add column last_sent_at timestamptz,
  add column send_count int not null default 0;

-- One row per email sent. Rows stay when an invite is revoked, so revoking and inviting again
-- doesn't reset the hourly limit.
create table public.invite_sends (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_id uuid,
  sent_at timestamptz not null default now()
);

create index invite_sends_owner on public.invite_sends (owner_id, sent_at desc);

alter table public.invite_sends enable row level security;

revoke all on public.invite_sends from public, anon, authenticated;
grant select, insert, update, delete on public.invite_sends to service_role;

-- Records that the owner is emailing an invite, or refuses when a limit is reached. The server
-- calls it before sending and only sends when it succeeds.
create function public.record_invite_send(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.team_invites;
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Sign in to send invites' using errcode = '42501';
  end if;
  -- One owner's sends are counted one at a time, so two requests can't both slip under a limit.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select * into v_invite
    from public.team_invites
   where id = p_invite and owner_id = auth.uid()
     for update;
  if v_invite.id is null or v_invite.accepted_at is not null or v_invite.expires_at <= now() then
    raise exception 'This invite is no longer valid' using errcode = '22023';
  end if;
  if v_invite.send_count >= 5 then
    raise exception 'This invite has been emailed 5 times already' using errcode = '54000';
  end if;
  if (select count(*) from public.invite_sends s
       where s.owner_id = auth.uid() and s.sent_at > now() - interval '1 hour') >= 20 then
    raise exception 'You have sent 20 invites in the last hour' using errcode = '54000';
  end if;
  insert into public.invite_sends (owner_id, invite_id) values (auth.uid(), v_invite.id);
  update public.team_invites
     set last_sent_at = now(), send_count = send_count + 1
   where id = v_invite.id;
end;
$$;

-- The newest unused invite addressed to the signed-in user's email, so a new account goes
-- straight to it after confirming the address (even on another device).
create function public.my_pending_invite()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select i.token
    from public.team_invites i
   where lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     and i.accepted_at is null
     and i.expires_at > now()
     and i.owner_id <> auth.uid()
   order by i.created_at desc
   limit 1;
$$;

revoke all on function public.record_invite_send(uuid), public.my_pending_invite() from public, anon;
grant execute on function public.record_invite_send(uuid), public.my_pending_invite() to authenticated;

-- The invite page and sign-up page show who invited you before you have an account. The token
-- is the secret: only someone holding the link can look it up.
grant execute on function public.invite_details(text) to anon;

commit;
```

- [ ] **Step 4: Update the types.** In `types/supabase.ts`:
  - In `team_invites.Row`, add `last_sent_at: string | null;` and `send_count: number;` after `accepted_by: string | null;`.
  - In `Functions`, after the `accept_invite` line, add:

```ts
      record_invite_send: { Args: { p_invite: string }; Returns: undefined };
      my_pending_invite: { Args: Record<string, never>; Returns: string | null };
```

- [ ] **Step 5: Run the tests and typecheck, and confirm they pass.**

Run: `npx vitest run supabase/test/migration.test.ts && npm run typecheck && grep -c '\\' supabase/migrations/20261014120200_email_invites.sql`
Expected:
- All PASS.
- Typecheck has 0 errors.
- The backslash count prints `0`.

- [ ] **Step 6: Commit.**

```bash
npx prettier --write supabase/test/migration.test.ts types/supabase.ts
git add supabase/migrations/20261014120200_email_invites.sql supabase/test/migration.test.ts types/supabase.ts
git commit -m "Count invite emails and find a new account's invite

record_invite_send enforces 5 emails per invite and 20 per owner per
hour, with a private send log that survives revoking. my_pending_invite
returns the invite waiting for the signed-in address, and invite links
can be looked up before signing in.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Avatar helpers and component

**Files:**
- Create: `lib/avatar.ts`, `lib/avatar.test.ts`
- Create: `components/ui/Avatar.tsx`, `components/ui/Avatar.test.tsx`

**Interfaces:**
- Produces:
  - `AVATAR_BUCKET = "avatars"`
  - `trustedAvatarUrl(url: string | null | undefined, supabaseUrl?: string): string | null`
  - `initialsOf(name?: string | null, email?: string | null): string`
  - `AVATAR_COLORS`
  - `avatarColors(id: string): { bg: string; fg: string }`
  - `<Avatar id name? email? src? size?: "sm" | "md" | "lg" className? />`

- [ ] **Step 1: Write the failing tests.** Create `lib/avatar.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/color/contrast";

import { AVATAR_COLORS, avatarColors, initialsOf, trustedAvatarUrl } from "./avatar";

const PROJECT = "https://proj.supabase.example";

describe("trustedAvatarUrl", () => {
  it("accepts photos uploaded to this project's avatars bucket", () => {
    const url = `${PROJECT}/storage/v1/object/public/avatars/u1/a.webp`;
    expect(trustedAvatarUrl(url, PROJECT)).toBe(url);
  });

  it("accepts Google account photos", () => {
    const url = "https://lh3.googleusercontent.com/a/abc=s96-c";
    expect(trustedAvatarUrl(url, PROJECT)).toBe(url);
  });

  it("rejects other buckets, other hosts, plain http and junk", () => {
    expect(
      trustedAvatarUrl(`${PROJECT}/storage/v1/object/public/page-media/u1/a.webp`, PROJECT),
    ).toBeNull();
    expect(trustedAvatarUrl("https://tracker.example/pixel.gif", PROJECT)).toBeNull();
    expect(trustedAvatarUrl("https://googleusercontent.com.evil.example/a.png", PROJECT)).toBeNull();
    expect(trustedAvatarUrl("http://lh3.googleusercontent.com/a/abc", PROJECT)).toBeNull();
    expect(trustedAvatarUrl("not a url", PROJECT)).toBeNull();
    expect(trustedAvatarUrl(null, PROJECT)).toBeNull();
  });
});

describe("initialsOf", () => {
  it("uses the first and last name, or the email's first part", () => {
    expect(initialsOf("David Allmon")).toBe("DA");
    expect(initialsOf("Madonna")).toBe("M");
    expect(initialsOf(null, "sam@cafe.com")).toBe("S");
    expect(initialsOf("", "jo.rivera@cafe.com")).toBe("JR");
    expect(initialsOf("émile zola")).toBe("ÉZ");
    expect(initialsOf("  ", "")).toBe("?");
  });
});

describe("avatarColors", () => {
  it("is stable for an id", () => {
    expect(avatarColors("user-1")).toBe(avatarColors("user-1"));
  });

  it("only uses pairs that are easy to read", () => {
    for (const pair of AVATAR_COLORS) expect(contrastRatio(pair.bg, pair.fg)).toBeGreaterThanOrEqual(7);
  });
});
```

Create `components/ui/Avatar.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar } from "./Avatar";

const GOOGLE = "https://lh3.googleusercontent.com/a/sam";

describe("Avatar", () => {
  it("shows a trusted photo", () => {
    const { container } = render(<Avatar id="u1" name="Sam Lee" src={GOOGLE} />);
    expect(container.querySelector("img")).toHaveAttribute("src", GOOGLE);
  });

  it("shows initials without a photo", () => {
    render(<Avatar id="u1" name="Sam Lee" />);
    expect(screen.getByText("SL")).toBeInTheDocument();
  });

  it("shows initials instead of untrusted or broken photos", () => {
    const { container, rerender } = render(
      <Avatar id="u1" name="Sam Lee" src="https://tracker.example/p.gif" />,
    );
    expect(container.querySelector("img")).toBeNull();
    rerender(<Avatar id="u1" name="Sam Lee" src={`${GOOGLE}-broken`} />);
    fireEvent.error(container.querySelector("img")!);
    expect(screen.getByText("SL")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run lib/avatar.test.ts components/ui/Avatar.test.tsx`
Expected: FAIL with "Failed to resolve import ./avatar" and "./Avatar".

- [ ] **Step 3: Implement.** Create `lib/avatar.ts`:

```ts
import { SUPABASE_URL } from "@/lib/env";

/** Storage bucket for uploaded profile photos (see the avatar storage migration). */
export const AVATAR_BUCKET = "avatars";

const GOOGLE_PHOTO_HOST = /(^|\.)googleusercontent\.com$/;

/**
 * A profile photo URL that is safe to show: an upload in this project's avatars bucket, or a
 * Google account photo. Anything else (another host, http, a broken value) gives null, so a
 * teammate can't make your browser or inbox load an image from a server they control.
 */
export function trustedAvatarUrl(
  url: string | null | undefined,
  supabaseUrl: string = SUPABASE_URL,
): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (GOOGLE_PHOTO_HOST.test(parsed.hostname)) return parsed.href;
  if (!supabaseUrl) return null;
  try {
    const storage = new URL(supabaseUrl);
    const uploaded =
      parsed.host === storage.host &&
      parsed.pathname.startsWith(`/storage/v1/object/public/${AVATAR_BUCKET}/`);
    return uploaded ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Up to two initials: "David Allmon" → "DA", "sam@cafe.com" → "S", "jo.rivera@x.com" → "JR". */
export function initialsOf(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "";
  const words = source.split(/[\s._-]+/).filter(Boolean);
  const first = words[0];
  if (!first) return "?";
  const last = words.length > 1 ? words[words.length - 1]! : "";
  return (Array.from(first)[0]! + (last ? Array.from(last)[0]! : "")).toUpperCase();
}

/** Background and text colors for initials; every pair has at least 7:1 contrast. */
export const AVATAR_COLORS = [
  { bg: "#c7d2fe", fg: "#1e1b4b" },
  { bg: "#fde68a", fg: "#451a03" },
  { bg: "#bbf7d0", fg: "#052e16" },
  { bg: "#fecdd3", fg: "#4c0519" },
  { bg: "#bae6fd", fg: "#082f49" },
  { bg: "#e9d5ff", fg: "#3b0764" },
] as const;

/** A stable color pair for an id, so a person's initials keep their color everywhere. */
export function avatarColors(id: string): (typeof AVATAR_COLORS)[number] {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}
```

Create `components/ui/Avatar.tsx`:

```tsx
"use client";

import { useState } from "react";

import { avatarColors, initialsOf, trustedAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/cn";

const SIZES = {
  sm: "size-8 text-[13px]",
  md: "size-9 text-sm",
  lg: "size-16 text-xl",
} as const;

interface AvatarProps {
  /** Stable id (user id, or an email for people without an account) that picks the color. */
  id: string;
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * A person's photo, or their initials on a color when there is no usable photo. It is
 * decorative: the name always appears next to it.
 */
export function Avatar({ id, name, email, src, size = "md", className }: AvatarProps) {
  const url = trustedAvatarUrl(src);
  const [failed, setFailed] = useState<string | null>(null);

  if (url && failed !== url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- photos come from Storage or Google
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(url)}
        className={cn("shrink-0 rounded-full bg-surface-2 object-cover", SIZES[size], className)}
      />
    );
  }
  const colors = avatarColors(id);
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold select-none",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      {initialsOf(name, email)}
    </span>
  );
}
```

- [ ] **Step 4: Run the tests and confirm they pass.**

Run: `npx vitest run lib/avatar.test.ts components/ui/Avatar.test.tsx && npm run typecheck`
Expected: PASS, and typecheck has 0 errors.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write lib/avatar.ts lib/avatar.test.ts components/ui/Avatar.tsx components/ui/Avatar.test.tsx
git add lib/avatar.ts lib/avatar.test.ts components/ui/Avatar.tsx components/ui/Avatar.test.tsx
git commit -m "Add an Avatar that shows photos or initials

Photos load only from the project's avatars bucket or Google, so a
teammate can't point everyone's browser at their own server. Otherwise
initials show on a readable color picked from the user id.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Upload, change and remove your photo

**Files:**
- Create: `features/profile/avatarImage.ts`, `features/profile/avatarImage.test.ts`
- Create: `features/profile/googlePhoto.ts`, `features/profile/googlePhoto.test.ts`
- Create: `features/profile/api.ts`
- Create: `features/profile/useProfile.ts`
- Create: `features/profile/ProfilePhoto.tsx`, `features/profile/ProfilePhoto.test.tsx`
- Modify: `features/auth/ProfileForm.tsx`, `features/auth/AccountMenu.tsx`, `app/account/page.tsx`, `app/account/actions.ts`

**Interfaces:**
- Consumes: `Avatar`, `trustedAvatarUrl` and `AVATAR_BUCKET` (Task 4), and `profiles.avatar_url` (Task 1).
- Produces:
  - `validateAvatarFile(file): string | null`, `squareCrop(w, h)`, `prepareAvatar(file)` and `AVATAR_ACCEPT`
  - `googlePhotoOf(user): string | null`
  - `uploadAvatar(userId, file)`, `removeAvatar(userId)` and `restoreGooglePhoto(userId, url)`, each returning `PhotoResult`
  - `useProfile(userId)`, `announceProfile(patch)` and `Profile`
  - `<ProfilePhoto userId name email initialUrl googlePhoto />`

- [ ] **Step 1: Write the failing tests.** Create `features/profile/avatarImage.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { squareCrop, validateAvatarFile } from "./avatarImage";

describe("validateAvatarFile", () => {
  it("accepts JPG, PNG and WebP photos up to 10 MB", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: 3_000_000 })).toBeNull();
    expect(validateAvatarFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateAvatarFile({ type: "image/webp", size: 1000 })).toBeNull();
  });

  it("explains what to use instead", () => {
    expect(validateAvatarFile({ type: "image/heic", size: 1000 })).toBe(
      "Use a JPG, PNG or WebP photo.",
    );
    expect(validateAvatarFile({ type: "image/gif", size: 1000 })).toBe(
      "Use a JPG, PNG or WebP photo.",
    );
    expect(validateAvatarFile({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 })).toBe(
      "That photo is over 10 MB. Try a smaller one.",
    );
  });
});

describe("squareCrop", () => {
  it("takes the largest centered square", () => {
    expect(squareCrop(1200, 800)).toEqual({ sx: 200, sy: 0, side: 800 });
    expect(squareCrop(800, 1201)).toEqual({ sx: 0, sy: 200, side: 800 });
    expect(squareCrop(512, 512)).toEqual({ sx: 0, sy: 0, side: 512 });
  });
});
```

Create `features/profile/googlePhoto.test.ts`:

```ts
import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { googlePhotoOf } from "./googlePhoto";

const user = (identities: unknown[], user_metadata: Record<string, unknown> = {}) =>
  ({ identities, user_metadata }) as unknown as User;
const PHOTO = "https://lh3.googleusercontent.com/a/sam";

describe("googlePhotoOf", () => {
  it("uses the photo from the Google sign-in", () => {
    expect(googlePhotoOf(user([{ provider: "google", identity_data: { avatar_url: PHOTO } }]))).toBe(
      PHOTO,
    );
    expect(googlePhotoOf(user([{ provider: "google", identity_data: { picture: PHOTO } }]))).toBe(
      PHOTO,
    );
    expect(googlePhotoOf(user([{ provider: "google", identity_data: {} }], { picture: PHOTO }))).toBe(
      PHOTO,
    );
  });

  it("is empty without Google, or for addresses that aren't https", () => {
    expect(googlePhotoOf(user([{ provider: "email", identity_data: {} }], { picture: PHOTO }))).toBeNull();
    expect(
      googlePhotoOf(user([{ provider: "google", identity_data: { picture: "http://x.example/a" } }])),
    ).toBeNull();
  });
});
```

Create `features/profile/ProfilePhoto.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { uploadAvatar } from "./api";
import { ProfilePhoto } from "./ProfilePhoto";

vi.mock("./api", () => ({
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
  restoreGooglePhoto: vi.fn(),
}));

const GOOGLE = "https://lh3.googleusercontent.com/a/google";
const UPLOADED = "https://lh3.googleusercontent.com/a/new";

function renderPhoto(props: Partial<ComponentProps<typeof ProfilePhoto>> = {}) {
  return render(
    <ToastProvider>
      <ProfilePhoto
        userId="u1"
        name="Sam Lee"
        email="sam@cafe.com"
        initialUrl={null}
        googlePhoto={null}
        {...props}
      />
    </ToastProvider>,
  );
}

beforeEach(() => vi.mocked(uploadAvatar).mockReset());

describe("ProfilePhoto", () => {
  it("with no photo, shows initials and offers the Google photo", () => {
    renderPhoto({ googlePhoto: GOOGLE });
    expect(screen.getByText("SL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use Google photo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });

  it("while using the Google photo, offers Remove instead", () => {
    renderPhoto({ initialUrl: GOOGLE, googlePhoto: GOOGLE });
    expect(screen.queryByRole("button", { name: "Use Google photo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.getByText(/Using your Google photo\./)).toBeInTheDocument();
  });

  it("shows an uploaded photo and tells the rest of the page", async () => {
    vi.mocked(uploadAvatar).mockResolvedValue({ ok: true, url: UPLOADED });
    const heard = vi.fn();
    window.addEventListener("quickqreate:profile", (event) =>
      heard((event as CustomEvent).detail),
    );
    const { container } = renderPhoto();
    const file = new File(["x"], "me.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText("Upload photo"), file);
    expect(uploadAvatar).toHaveBeenCalledWith("u1", file);
    await waitFor(() => expect(container.querySelector("img")).toHaveAttribute("src", UPLOADED));
    expect(heard).toHaveBeenCalledWith({ avatar_url: UPLOADED });
  });

  it("explains a failed upload", async () => {
    vi.mocked(uploadAvatar).mockResolvedValue({
      ok: false,
      error: "That photo is over 10 MB. Try a smaller one.",
    });
    renderPhoto();
    await userEvent.upload(
      screen.getByLabelText("Upload photo"),
      new File(["x"], "me.jpg", { type: "image/jpeg" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("That photo is over 10 MB.");
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run features/profile`
Expected: FAIL with "Failed to resolve import" for `./avatarImage`, `./googlePhoto`, `./api` and `./ProfilePhoto`.

- [ ] **Step 3: Implement the helpers.** Create `features/profile/avatarImage.ts`:

```ts
export const AVATAR_ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
/** Uploaded photos are at most this many pixels square (smaller photos aren't enlarged). */
const AVATAR_SIZE = 512;

export function validateAvatarFile(file: Pick<File, "type" | "size">): string | null {
  if (!AVATAR_ACCEPT.includes(file.type)) return "Use a JPG, PNG or WebP photo.";
  if (file.size > MAX_INPUT_BYTES) return "That photo is over 10 MB. Try a smaller one.";
  return null;
}

/** The largest centered square in a width × height image. */
export function squareCrop(width: number, height: number) {
  const side = Math.min(width, height);
  return { sx: Math.floor((width - side) / 2), sy: Math.floor((height - side) / 2), side };
}

/**
 * Crops a photo to a centered square, shrinks it to 512×512 and encodes it as WebP, or as PNG in
 * browsers that can't encode WebP (Safari). Either way it stays well under the 2 MB bucket limit.
 */
export async function prepareAvatar(
  file: File,
): Promise<{ blob: Blob; type: "image/webp" | "image/png" }> {
  const bitmap = await createImageBitmap(file);
  const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
  const size = Math.min(AVATAR_SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Canvas is unavailable");
  }
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86),
  );
  if (webp?.type === "image/webp") return { blob: webp, type: "image/webp" };
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!png) throw new Error("The photo couldn't be encoded");
  return { blob: png, type: "image/png" };
}
```

Create `features/profile/googlePhoto.ts`:

```ts
import type { User } from "@supabase/supabase-js";

const usable = (value: unknown): string | null =>
  typeof value === "string" && value.startsWith("https://") && value.length <= 2048 ? value : null;

/** The photo Google gave this account, when it signs in with Google. */
export function googlePhotoOf(user: Pick<User, "identities" | "user_metadata">): string | null {
  const google = user.identities?.find((identity) => identity.provider === "google");
  if (!google) return null;
  const data: Record<string, unknown> = google.identity_data ?? {};
  return (
    usable(data.avatar_url) ??
    usable(data.picture) ??
    usable(user.user_metadata?.avatar_url) ??
    usable(user.user_metadata?.picture)
  );
}
```

Create `features/profile/api.ts`:

```ts
"use client";

import { AVATAR_BUCKET } from "@/lib/avatar";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { prepareAvatar, validateAvatarFile } from "./avatarImage";

export type PhotoResult = { ok: true; url: string | null } | { ok: false; error: string };

const unavailable: PhotoResult = { ok: false, error: "Photos aren’t available right now." };

/** Deletes the user's uploaded photos except `keep`. Best effort: a leftover file is harmless. */
async function removeUploads(userId: string, keep: string | null) {
  const supabase = getBrowserSupabase();
  if (!supabase) return;
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  const { data } = await bucket.list(userId, { limit: 100 });
  const paths = (data ?? []).map((file) => `${userId}/${file.name}`).filter((p) => p !== keep);
  if (paths.length > 0) await bucket.remove(paths);
}

async function savePhoto(userId: string, url: string | null): Promise<boolean> {
  const supabase = getBrowserSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  return !error;
}

/** Crops, shrinks and uploads a photo, makes it the profile photo, and removes older uploads. */
export async function uploadAvatar(userId: string, file: File): Promise<PhotoResult> {
  const problem = validateAvatarFile(file);
  if (problem) return { ok: false, error: problem };
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  let prepared: Awaited<ReturnType<typeof prepareAvatar>>;
  try {
    prepared = await prepareAvatar(file);
  } catch {
    return { ok: false, error: "That photo couldn’t be read. Try a JPG or PNG." };
  }
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  const path = `${userId}/${crypto.randomUUID()}.${prepared.type === "image/webp" ? "webp" : "png"}`;
  const { error } = await bucket.upload(path, prepared.blob, {
    contentType: prepared.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return { ok: false, error: "The photo couldn’t be uploaded. Please try again." };
  const url = bucket.getPublicUrl(path).data.publicUrl;
  if (!(await savePhoto(userId, url))) {
    await bucket.remove([path]);
    return { ok: false, error: "The photo couldn’t be saved. Please try again." };
  }
  await removeUploads(userId, path);
  return { ok: true, url };
}

/** Removes the profile photo and deletes uploaded files. Initials show instead. */
export async function removeAvatar(userId: string): Promise<PhotoResult> {
  if (!(await savePhoto(userId, null))) {
    return { ok: false, error: "The photo couldn’t be removed. Please try again." };
  }
  await removeUploads(userId, null);
  return { ok: true, url: null };
}

/** Goes back to the Google account photo and deletes uploaded files. */
export async function restoreGooglePhoto(userId: string, googleUrl: string): Promise<PhotoResult> {
  if (!(await savePhoto(userId, googleUrl))) {
    return { ok: false, error: "Your Google photo couldn’t be used. Please try again." };
  }
  await removeUploads(userId, null);
  return { ok: true, url: googleUrl };
}
```

Create `features/profile/useProfile.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/client";

export interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

const EVENT = "quickqreate:profile";

/** Tells every useProfile() on the page that the profile changed (a new name or photo). */
export function announceProfile(patch: Partial<Profile>) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: patch }));
}

/** The signed-in user's name and photo, kept current when the account page changes them. */
export function useProfile(userId: string | null): Profile | null {
  const [state, setState] = useState<{ userId: string; profile: Profile } | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !userId) return;
    let active = true;
    void supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setState({ userId, profile: data });
      });
    const onChange = (event: Event) => {
      const patch = (event as CustomEvent<Partial<Profile>>).detail;
      setState((current) =>
        current?.userId === userId ? { userId, profile: { ...current.profile, ...patch } } : current,
      );
    };
    window.addEventListener(EVENT, onChange);
    return () => {
      active = false;
      window.removeEventListener(EVENT, onChange);
    };
  }, [userId]);

  return state?.userId === userId ? state.profile : null;
}
```

Create `features/profile/ProfilePhoto.tsx`:

```tsx
"use client";

import { Camera, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

import { removeAvatar, restoreGooglePhoto, uploadAvatar, type PhotoResult } from "./api";
import { AVATAR_ACCEPT } from "./avatarImage";
import { announceProfile } from "./useProfile";

interface ProfilePhotoProps {
  userId: string;
  name: string;
  email: string;
  initialUrl: string | null;
  /** The account's Google photo, when it signs in with Google. */
  googlePhoto: string | null;
}

/** Upload, change or remove your profile photo, or go back to your Google photo. */
export function ProfilePhoto({ userId, name, email, initialUrl, googlePhoto }: ProfilePhotoProps) {
  const toast = useToast();
  const inputId = useId();
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(task: () => Promise<PhotoResult>, success: string) {
    setBusy(true);
    setError("");
    const result = await task();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUrl(result.url);
    announceProfile({ avatar_url: result.url });
    toast(success);
  }

  const usingGoogle = Boolean(url && googlePhoto && url === googlePhoto);
  const status = usingGoogle
    ? "Using your Google photo."
    : url
      ? "Teammates and people you invite see this photo."
      : "No photo yet, so your initials show.";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar id={userId} name={name} email={email} src={url} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            id={inputId}
            type="file"
            accept={AVATAR_ACCEPT.join(",")}
            className="peer sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void run(() => uploadAvatar(userId, file), "Photo updated");
            }}
          />
          <label
            htmlFor={inputId}
            className={cn(
              buttonClasses("outline", "md"),
              "cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
              busy && "pointer-events-none opacity-50",
            )}
          >
            <Camera aria-hidden />
            {url && !usingGoogle ? "Change photo" : "Upload photo"}
          </label>
          {googlePhoto && !usingGoogle && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                run(() => restoreGooglePhoto(userId, googlePhoto), "Using your Google photo")
              }
            >
              Use Google photo
            </Button>
          )}
          {url && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => run(() => removeAvatar(userId), "Photo removed")}
            >
              <Trash2 aria-hidden /> Remove
            </Button>
          )}
        </div>
        <p className="text-sm text-fg-muted">
          {busy ? "Saving…" : status} JPG, PNG or WebP, cropped to a square.
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire the photo into the account page and the account menu.**

In `features/auth/ProfileForm.tsx`:
- Add these imports after the `useToast` import:

```tsx
import { ProfilePhoto } from "@/features/profile/ProfilePhoto";
import { announceProfile } from "@/features/profile/useProfile";
```

- Change the props to `{ userId, email, initialName, avatarUrl, googlePhoto }`, typed `{ userId: string; email: string; initialName: string; avatarUrl: string | null; googlePhoto: string | null; }`.
- Replace `else toast("Profile saved");` with:

```tsx
    else {
      announceProfile({ display_name: name.trim() || null });
      toast("Profile saved");
    }
```

- Wrap the returned `<form …>…</form>` so the component returns:

```tsx
    <div className="flex flex-col gap-6">
      <ProfilePhoto
        userId={userId}
        name={name}
        email={email}
        initialUrl={avatarUrl}
        googlePhoto={googlePhoto}
      />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {/* the existing fields, alert and submit button, unchanged */}
      </form>
    </div>
```

In `app/account/page.tsx`:
- Add `import { googlePhotoOf } from "@/features/profile/googlePhoto";`.
- Change `.select("display_name")` to `.select("display_name, avatar_url")`.
- Render the profile form as:

```tsx
        <ProfileForm
          userId={user.id}
          email={user.email ?? ""}
          initialName={profile?.display_name ?? ""}
          avatarUrl={profile?.avatar_url ?? null}
          googlePhoto={googlePhotoOf(user)}
        />
```

In `app/account/actions.ts`, delete account files from both buckets.
- Add `import { AVATAR_BUCKET } from "@/lib/avatar";`.
- Rename `removeUserMedia(admin, userId)` to `removeUserFiles(admin: Admin, userId: string, bucketName: string)`, using `admin.storage.from(bucketName)` in place of `admin.storage.from(MEDIA_BUCKET)`.
- Change the comment above it to `/** Best effort: a missing Storage service or a failed listing must not block deletion. */`.
- Replace the call and its comment with:

```ts
  // Remove the user's uploaded files first; their codes and scans cascade with the user.
  await removeUserFiles(admin, user.id, MEDIA_BUCKET);
  await removeUserFiles(admin, user.id, AVATAR_BUCKET);
```

Replace `features/auth/AccountMenu.tsx` with:

```tsx
"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { LayoutGrid, LogOut, UserRound, Users } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { useProfile } from "@/features/profile/useProfile";
import { accountsEnabled } from "@/lib/env";

import { useSession } from "./useSession";

const itemClass =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg data-focus:bg-surface-2";

export function AccountMenu() {
  const { user, loading } = useSession();
  // Name and photo come from the profile, so a rename or a new photo shows straight away.
  const profile = useProfile(user?.id ?? null);
  if (!accountsEnabled) return null;
  if (loading) return <span aria-hidden className="size-9" />;

  if (!user) {
    return (
      <Link href="/login" className={buttonClasses("primary", "sm")}>
        Sign in
      </Link>
    );
  }

  const name = profile?.display_name?.trim() || null;

  return (
    <div className="flex items-center gap-1.5">
      <Link href="/dashboard" className={`${buttonClasses("ghost", "sm")} max-sm:hidden`}>
        <LayoutGrid aria-hidden />
        My codes
      </Link>
      <Menu as="div" className="relative">
        <MenuButton
          aria-label="Account menu"
          className="rounded-full data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
        >
          <Avatar id={user.id} name={name} email={user.email} src={profile?.avatar_url} />
        </MenuButton>
        <MenuItems
          anchor={{ to: "bottom end", gap: 8 }}
          transition
          className="z-50 w-64 rounded-control border border-border bg-surface p-1.5 shadow-pop transition duration-150 data-closed:-translate-y-1 data-closed:opacity-0"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-fg">{name ?? user.email}</p>
            {name && <p className="truncate text-sm text-fg-muted">{user.email}</p>}
          </div>
          <MenuItem>
            <Link href="/dashboard" className={itemClass}>
              <LayoutGrid aria-hidden className="size-4" /> My codes
            </Link>
          </MenuItem>
          <MenuItem>
            <Link href="/dashboard/team" className={itemClass}>
              <Users aria-hidden className="size-4" /> Team
            </Link>
          </MenuItem>
          <MenuItem>
            <Link href="/account" className={itemClass}>
              <UserRound aria-hidden className="size-4" /> Account
            </Link>
          </MenuItem>
          <MenuItem>
            <form action="/auth/signout" method="post">
              <button type="submit" className={`${itemClass} w-full text-left`}>
                <LogOut aria-hidden className="size-4" /> Sign out
              </button>
            </form>
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );
}
```

- [ ] **Step 5: Run the tests and checks, and confirm they pass.**

Run: `npx vitest run features/profile && npm run lint && npm run typecheck && npm test`
Expected:
- All PASS.
- Lint has 0 errors.
- Typecheck has 0 errors.

- [ ] **Step 6: Commit.**

```bash
npx prettier --write features/profile features/auth/ProfileForm.tsx features/auth/AccountMenu.tsx app/account/page.tsx app/account/actions.ts
git add features/profile features/auth/ProfileForm.tsx features/auth/AccountMenu.tsx app/account/page.tsx app/account/actions.ts
git commit -m "Let people upload, change or remove a profile photo

Photos are cropped to a square and shrunk to 512px in the browser, then
stored in the avatars bucket. The account menu shows the photo and the
profile name (renames now show straight away). Deleting an account
removes its photos too.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Use the Google photo when Google is linked

**Files:**
- Modify: `features/profile/googlePhoto.ts`, `features/profile/googlePhoto.test.ts`
- Modify: `app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `googlePhotoOf` (Task 5).
- Produces: `googleJustLinked(user: Pick<User, "identities">, now?: number): boolean`.

- [ ] **Step 1: Write the failing tests.** Append to `features/profile/googlePhoto.test.ts` (and add `googleJustLinked` to its import from `./googlePhoto`):

```ts
describe("googleJustLinked", () => {
  const NOW = Date.parse("2026-10-14T12:00:00Z");
  const linked = (createdAt: string | undefined) =>
    ({ identities: [{ provider: "google", created_at: createdAt }] }) as unknown as User;

  it("is true only in the minute after Google was added to the account", () => {
    expect(googleJustLinked(linked("2026-10-14T11:59:50Z"), NOW)).toBe(true);
    expect(googleJustLinked(linked("2026-10-14T11:55:00Z"), NOW)).toBe(false);
  });

  it("is false without Google or a usable date", () => {
    expect(googleJustLinked({ identities: [] } as unknown as User, NOW)).toBe(false);
    expect(googleJustLinked(linked(undefined), NOW)).toBe(false);
    expect(googleJustLinked(linked("soon"), NOW)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run features/profile/googlePhoto.test.ts`
Expected: FAIL. `googleJustLinked` is not exported.

- [ ] **Step 3: Implement.** Append to `features/profile/googlePhoto.ts`:

```ts
/**
 * True when this account's Google sign-in was added within the last minute: Google was just
 * linked. Signing in with Google later never counts, so a removed photo stays removed.
 */
export function googleJustLinked(user: Pick<User, "identities">, now = Date.now()): boolean {
  const google = user.identities?.find((identity) => identity.provider === "google");
  const added = google?.created_at ? Date.parse(google.created_at) : Number.NaN;
  return Number.isFinite(added) && Math.abs(now - added) < 60_000;
}
```

In `app/auth/callback/route.ts`:
- Add `import { googleJustLinked, googlePhotoOf } from "@/features/profile/googlePhoto";` after the `safeNext` import.
- Add this function above `export async function GET`:

```ts
type ServerSupabase = Awaited<ReturnType<typeof getServerSupabase>>;

/**
 * When Google was just linked to an account without a photo, use the Google photo. New Google
 * accounts already get it at sign-up; an uploaded or removed photo is never touched.
 */
async function adoptGooglePhoto(supabase: ServerSupabase) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || !googleJustLinked(user)) return;
  const photo = googlePhotoOf(user);
  if (!photo) return;
  await supabase
    .from("profiles")
    .update({ avatar_url: photo })
    .eq("id", user.id)
    .is("avatar_url", null);
}
```

- After the `if (error) { … }` block that follows `exchangeCodeForSession`, add `await adoptGooglePhoto(supabase);`.

- [ ] **Step 4: Run the tests and checks, and confirm they pass.**

Run: `npx vitest run features/profile/googlePhoto.test.ts && npm run lint && npm run typecheck`
Expected: PASS, with 0 lint and type errors.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write features/profile/googlePhoto.ts features/profile/googlePhoto.test.ts app/auth/callback/route.ts
git add features/profile/googlePhoto.ts features/profile/googlePhoto.test.ts app/auth/callback/route.ts
git commit -m "Use the Google photo when Google is linked to an account

Only right after linking, and only when the profile has no photo, so an
uploaded or removed photo is never replaced.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: The invite email

**Files:**
- Create: `emails/invite.ts`, `emails/invite.test.ts`
- Modify: `features/teams/roles.ts` (team wording)

**Interfaces:**
- Consumes: `trustedAvatarUrl`, `initialsOf` and `avatarColors` (Task 4).
- Produces:
  - `inviteEmail(input: InviteEmailInput): { subject: string; html: string; text: string }`
  - `escapeHtml(value: string): string`
  - `InviteEmailInput` has these fields:
    - `inviter: { id: string; name: string | null; email: string; avatarUrl: string | null }`
    - `to: string`
    - `role: TeamRole`
    - `acceptUrl: string`
    - `expiresAt: string`
    - `supabaseUrl?: string`

- [ ] **Step 1: Write the failing tests.** Create `emails/invite.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { inviteEmail, type InviteEmailInput } from "./invite";

const base: InviteEmailInput = {
  inviter: { id: "u1", name: "David Allmon", email: "david@example.com", avatarUrl: null },
  to: "sam@cafe.com",
  role: "editor",
  acceptUrl: "https://qr.example/invite/abc",
  expiresAt: "2026-10-28T12:00:00Z",
};
const withInviter = (patch: Partial<InviteEmailInput["inviter"]>) => ({
  ...base,
  inviter: { ...base.inviter, ...patch },
});

describe("inviteEmail", () => {
  it("names the inviter in the subject, or uses their email", () => {
    expect(inviteEmail(base).subject).toBe("David Allmon invited you to their QuickQReate codes");
    expect(inviteEmail(withInviter({ name: null })).subject).toBe(
      "david@example.com invited you to their QuickQReate codes",
    );
    expect(inviteEmail(withInviter({ name: "Eve\r\nBcc: x@example.com" })).subject).not.toMatch(
      /[\r\n]/,
    );
  });

  it("escapes names in the HTML", () => {
    const { html } = inviteEmail(withInviter({ name: "<img src=x onerror=alert(1)>" }));
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("has the button link, role, address and expiry in both versions", () => {
    const { html, text } = inviteEmail(base);
    expect(html).toContain('href="https://qr.example/invite/abc"');
    for (const part of ["an Editor", "sam@cafe.com", "October 28, 2026"]) {
      expect(html).toContain(part);
      expect(text).toContain(part);
    }
    expect(text).toContain("Accept the invite: https://qr.example/invite/abc");
    expect(inviteEmail({ ...base, role: "viewer" }).text).toContain("a Viewer");
  });

  it("shows only trusted photos, and initials otherwise", () => {
    const google = "https://lh3.googleusercontent.com/a/david";
    expect(inviteEmail(withInviter({ avatarUrl: google })).html).toContain(`<img src="${google}"`);
    const tracked = inviteEmail(withInviter({ avatarUrl: "https://tracker.example/p.gif" })).html;
    expect(tracked).not.toContain("tracker.example");
    expect(tracked).toContain(">DA</div>");
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run emails/invite.test.ts`
Expected: FAIL with "Failed to resolve import ./invite".

- [ ] **Step 3: Implement.** Create `emails/invite.ts`:

```ts
import { avatarColors, initialsOf, trustedAvatarUrl } from "@/lib/avatar";
import type { TeamRole } from "@/types/supabase";

export interface InviteEmailInput {
  inviter: { id: string; name: string | null; email: string; avatarUrl: string | null };
  /** The invited address. */
  to: string;
  role: TeamRole;
  acceptUrl: string;
  /** ISO time the invite stops working. */
  expiresAt: string;
  /** The project's Supabase URL, so uploaded photos count as trusted. */
  supabaseUrl?: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

/** Collapses line breaks and runs of spaces (names go into a mail subject). */
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

const ROLE_LINE: Record<TeamRole, string> = {
  editor: "an Editor: you can create, change and delete codes and folders, and see their analytics",
  viewer: "a Viewer: you can see codes, scan analytics and feedback",
};

/** The email that invites someone to another person's codes. */
export function inviteEmail(input: InviteEmailInput): EmailContent {
  const e = escapeHtml;
  const inviter = oneLine(input.inviter.name ?? "") || input.inviter.email;
  const subject = `${inviter} invited you to their QuickQReate codes`.slice(0, 200);
  const expires = new Date(input.expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const role = ROLE_LINE[input.role];
  const photo = trustedAvatarUrl(input.inviter.avatarUrl, input.supabaseUrl);
  const colors = avatarColors(input.inviter.id);
  const badge = photo
    ? `<img src="${e(photo)}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border-radius:20px;" />`
    : `<div style="width:40px;height:40px;border-radius:20px;background:${colors.bg};color:${colors.fg};font-size:15px;font-weight:700;line-height:40px;text-align:center;">${e(initialsOf(input.inviter.name, input.inviter.email))}</div>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${e(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f2f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#101828;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #eaecf0;">
            <tr>
              <td style="padding:32px 32px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:12px;vertical-align:middle;">${badge}</td>
                    <td style="vertical-align:middle;font-size:17px;font-weight:700;line-height:1.4;color:#101828;">${e(inviter)} invited you to their QuickQReate codes</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;">
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#344054;">You’ll be ${e(role)}.</p>
                <a href="${e(input.acceptUrl)}" style="display:inline-block;background:#101828;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">Accept invite</a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#475467;">If the button doesn’t work, copy this link into your browser:<br /><a href="${e(input.acceptUrl)}" style="color:#1d4ed8;word-break:break-all;">${e(input.acceptUrl)}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#475467;">This invite is for ${e(input.to)} and expires ${e(expires)}. If you weren’t expecting it, you can ignore this email.</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:13px;color:#475467;">QuickQReate · Free QR codes that never stop working</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `${inviter} invited you to their QuickQReate codes.`,
    "",
    `You’ll be ${role}.`,
    "",
    `Accept the invite: ${input.acceptUrl}`,
    "",
    `This invite is for ${input.to} and expires ${expires}. If you weren’t expecting it, you can ignore this email.`,
    "",
    "QuickQReate · Free QR codes that never stop working",
  ].join("\n");

  return { subject, html, text };
}
```

In `features/teams/roles.ts`, replace `ROLE_DESCRIPTIONS` with:

```ts
export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  viewer: "As a viewer you can see their codes, scan analytics and feedback.",
  editor:
    "As an editor you can create, change and delete their codes and folders, and see their analytics.",
};
```

- [ ] **Step 4: Run the tests and confirm they pass.**

Run: `npx vitest run emails/invite.test.ts && npm run typecheck`
Expected: PASS, and typecheck has 0 errors.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write emails features/teams/roles.ts
git add emails features/teams/roles.ts
git commit -m "Add the team invite email

HTML and plain-text versions with the inviter's photo or initials, the
role, one Accept invite button, the invited address and the expiry
date. Names are escaped and only trusted photos are shown.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Sending email through Brevo

**Files:**
- Create: `lib/email/brevo.ts`, `lib/email/brevo.test.ts`

**Interfaces:**
- Produces:
  - `emailConfigured(env?): boolean`
  - `sendEmail(message: OutgoingEmail, options?: { env?; fetcher? }): Promise<{ ok: true } | { ok: false; error: string }>`
  - Error codes: `"not-configured"`, `"brevo-<status>"` and `"network"`.
  - `OutgoingEmail` has `{ to, subject, html, text, replyTo?: { email; name? } }`.

- [ ] **Step 1: Write the failing tests.** Create `lib/email/brevo.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { emailConfigured, sendEmail } from "./brevo";

const message = { to: "sam@cafe.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };
const ok = () => vi.fn<typeof fetch>(async () => new Response("{}", { status: 201 }));

describe("Brevo email", () => {
  it("is off without an API key, and sends nothing", async () => {
    const fetcher = ok();
    expect(emailConfigured({})).toBe(false);
    expect(emailConfigured({ BREVO_API_KEY: "  " })).toBe(false);
    expect(await sendEmail(message, { env: {}, fetcher })).toEqual({
      ok: false,
      error: "not-configured",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("posts the message from the QuickQReate sender", async () => {
    const fetcher = ok();
    const result = await sendEmail(
      { ...message, replyTo: { email: "david@example.com", name: "David" } },
      { env: { BREVO_API_KEY: "key-123" }, fetcher },
    );
    expect(result).toEqual({ ok: true });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ "api-key": "key-123" });
    expect(JSON.parse(String(init?.body))).toEqual({
      sender: { name: "QuickQReate", email: "no-reply@techitdave.com" },
      to: [{ email: "sam@cafe.com" }],
      subject: "Hi",
      htmlContent: "<p>Hi</p>",
      textContent: "Hi",
      replyTo: { email: "david@example.com", name: "David" },
    });
  });

  it("uses INVITE_FROM_EMAIL as the sender when set", async () => {
    const fetcher = ok();
    await sendEmail(message, {
      env: { BREVO_API_KEY: "k", INVITE_FROM_EMAIL: "team@example.com" },
      fetcher,
    });
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body)).sender.email).toBe(
      "team@example.com",
    );
  });

  it("reports refusals and network failures without throwing", async () => {
    const refused = vi.fn<typeof fetch>(async () => new Response("{}", { status: 401 }));
    expect(await sendEmail(message, { env: { BREVO_API_KEY: "k" }, fetcher: refused })).toEqual({
      ok: false,
      error: "brevo-401",
    });
    const down = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await sendEmail(message, { env: { BREVO_API_KEY: "k" }, fetcher: down })).toEqual({
      ok: false,
      error: "network",
    });
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run lib/email/brevo.test.ts`
Expected: FAIL with "Failed to resolve import ./brevo".

- [ ] **Step 3: Implement.** Create `lib/email/brevo.ts`:

```ts
import "server-only";

// Transactional email through Brevo's HTTP API. The key is a server-only secret entered in
// Coolify (BREVO_API_KEY); without it, nothing is sent and callers fall back to links.

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_FROM = "no-reply@techitdave.com";
const TIMEOUT_MS = 10_000;

type Env = Record<string, string | undefined>;

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: { email: string; name?: string };
}

export type SendResult = { ok: true } | { ok: false; error: string };

/** True when this server can send email (BREVO_API_KEY is set). */
export function emailConfigured(env: Env = process.env): boolean {
  return Boolean(env.BREVO_API_KEY?.trim());
}

/** Sends one email. Never throws; a refusal or network problem comes back as an error code. */
export async function sendEmail(
  message: OutgoingEmail,
  { env = process.env, fetcher = fetch }: { env?: Env; fetcher?: typeof fetch } = {},
): Promise<SendResult> {
  const key = env.BREVO_API_KEY?.trim();
  if (!key) return { ok: false, error: "not-configured" };
  const from = env.INVITE_FROM_EMAIL?.trim() || DEFAULT_FROM;
  try {
    const response = await fetcher(ENDPOINT, {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "QuickQReate", email: from },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? { ok: true } : { ok: false, error: `brevo-${response.status}` };
  } catch {
    return { ok: false, error: "network" };
  }
}
```

- [ ] **Step 4: Run the tests and confirm they pass.**

Run: `npx vitest run lib/email/brevo.test.ts && npm run typecheck`
Expected: PASS, and typecheck has 0 errors.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write lib/email
git add lib/email
git commit -m "Send transactional email through Brevo's API

Server only. Without BREVO_API_KEY nothing is sent. Refusals, timeouts
and network failures come back as error codes instead of throwing.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Invite and resend actions

**Files:**
- Create: `features/teams/inviteInput.ts`, `features/teams/inviteInput.test.ts`
- Create: `features/teams/actions.ts`, `features/teams/actions.test.ts`

**Interfaces:**
- Consumes:
  - `record_invite_send` and the `team_invites` columns (Task 3)
  - `team_overview` (Task 1)
  - `inviteEmail` (Task 7)
  - `emailConfigured` and `sendEmail` (Task 8)
- Produces:
  - `parseInviteEmails(raw, { self, members? }): { ok: true; emails: string[] } | { ok: false; error: string }`
  - `MAX_INVITES_PER_REQUEST = 10`
  - Server actions:
    - `sendInvites(input: { emails: string; role: TeamRole; email: boolean }): Promise<InviteActionResult>`
    - `resendInvite(inviteId: string): Promise<InviteActionResult>`
  - Types:
    - `InviteOutcome { email: string; token: string | null; status: "sent" | "link" | "failed"; message?: string }`
    - `InviteActionResult { error?: string; outcomes: InviteOutcome[] }`

- [ ] **Step 1: Write the failing tests.** Create `features/teams/inviteInput.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { parseInviteEmails } from "./inviteInput";

const parse = (raw: string, members: string[] = []) =>
  parseInviteEmails(raw, { self: "david@example.com", members });

describe("parseInviteEmails", () => {
  it("splits on commas, semicolons, spaces and new lines, dropping repeats", () => {
    expect(parse("sam@cafe.com, lee@cafe.com;\nSAM@cafe.com  jo@cafe.com")).toEqual({
      ok: true,
      emails: ["sam@cafe.com", "lee@cafe.com", "jo@cafe.com"],
    });
  });

  it("needs at least one address, and only real-looking ones", () => {
    expect(parse("  ,\n ")).toEqual({ ok: false, error: "Enter at least one email address." });
    expect(parse("sam@cafe.com, nope")).toEqual({
      ok: false,
      error: "“nope” isn’t an email address.",
    });
  });

  it("allows up to 10 at a time", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `p${i}@cafe.com`).join(",");
    expect(parse(eleven)).toEqual({ ok: false, error: "Invite up to 10 people at a time." });
  });

  it("won't invite you or someone already on the team", () => {
    expect(parse("David@Example.com")).toEqual({
      ok: false,
      error: "That’s your own address. Invite someone else.",
    });
    expect(parse("lee@cafe.com", ["LEE@cafe.com"])).toEqual({
      ok: false,
      error: "lee@cafe.com is already on your team. Change their role below instead.",
    });
  });
});
```

Create `features/teams/actions.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthState } from "@/lib/auth/server";
import { emailConfigured, sendEmail } from "@/lib/email/brevo";

import { resendInvite, sendInvites } from "./actions";

vi.mock("@/lib/auth/server", () => ({ getAuthState: vi.fn() }));
vi.mock("@/lib/email/brevo", () => ({ emailConfigured: vi.fn(), sendEmail: vi.fn() }));

const TOKEN = "b".repeat(48);
const EXPIRES = "2026-10-28T12:00:00Z";
type Role = "editor" | "viewer";
interface FakeInvite {
  id: string;
  email: string;
  role: Role;
  token: string;
  expires_at: string;
}

/** Just enough of the Supabase client for the invite actions, recording what they did. */
function fakeSupabase({
  members = [] as string[],
  pending = [] as FakeInvite[],
  recordError = null as { message: string } | null,
} = {}) {
  const inserted: { email: string; role: Role }[] = [];
  const deleted: string[] = [];
  const recorded: string[] = [];

  function table(name: string) {
    let op: "select" | "insert" | "delete" = "select";
    let row: { email: string; role: Role } | null = null;
    let id: string | null = null;
    const result = () => {
      if (name === "profiles") return { data: { display_name: "David", avatar_url: null }, error: null };
      if (op === "insert" && row) {
        inserted.push(row);
        return { data: { id: `id-${row.email}`, ...row, token: TOKEN, expires_at: EXPIRES }, error: null };
      }
      if (op === "delete") {
        if (id) deleted.push(id);
        return { data: null, error: null };
      }
      if (id) return { data: pending.find((p) => p.id === id) ?? null, error: null };
      return { data: pending, error: null };
    };
    const builder = {
      select: () => builder,
      insert: (value: { email: string; role: Role }) => {
        op = "insert";
        row = value;
        return builder;
      },
      delete: () => {
        op = "delete";
        return builder;
      },
      eq: (column: string, value: string) => {
        if (column === "id") id = value;
        return builder;
      },
      is: () => builder,
      gt: () => builder,
      single: async () => result(),
      maybeSingle: async () => result(),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(result()).then(resolve, reject),
    };
    return builder;
  }

  const client = {
    from: vi.fn(table),
    rpc: vi.fn(async (fn: string, args?: { p_invite: string }) => {
      if (fn === "team_overview") return { data: members.map((email) => ({ email })), error: null };
      if (fn === "record_invite_send") {
        if (!recordError) recorded.push(args!.p_invite);
        return { data: null, error: recordError };
      }
      throw new Error(`Unexpected rpc ${fn}`);
    }),
  };
  return { client, inserted, deleted, recorded };
}

function signIn(fake: ReturnType<typeof fakeSupabase>) {
  vi.mocked(getAuthState).mockResolvedValue({
    supabase: fake.client,
    user: { id: "owner-1", email: "david@example.com" },
    needsMfa: false,
  } as never);
}

beforeEach(() => {
  vi.mocked(emailConfigured).mockReturnValue(true);
  vi.mocked(sendEmail).mockReset().mockResolvedValue({ ok: true });
});

describe("sendInvites", () => {
  it("emails each new address once and reports it", async () => {
    const fake = fakeSupabase();
    signIn(fake);
    const result = await sendInvites({
      emails: "Sam@cafe.com, lee@cafe.com\nsam@cafe.com",
      role: "editor",
      email: true,
    });
    expect(result).toEqual({
      outcomes: [
        { email: "Sam@cafe.com", token: TOKEN, status: "sent" },
        { email: "lee@cafe.com", token: TOKEN, status: "sent" },
      ],
    });
    expect(fake.inserted).toEqual([
      { email: "Sam@cafe.com", role: "editor" },
      { email: "lee@cafe.com", role: "editor" },
    ]);
    expect(fake.recorded).toEqual(["id-Sam@cafe.com", "id-lee@cafe.com"]);
    expect(vi.mocked(sendEmail).mock.calls[0]![0]).toMatchObject({
      to: "Sam@cafe.com",
      subject: "David invited you to their QuickQReate codes",
      replyTo: { email: "david@example.com", name: "David" },
    });
  });

  it("gives links instead when this server can't send email", async () => {
    vi.mocked(emailConfigured).mockReturnValue(false);
    const fake = fakeSupabase();
    signIn(fake);
    const result = await sendInvites({ emails: "sam@cafe.com", role: "viewer", email: true });
    expect(result.outcomes).toEqual([{ email: "sam@cafe.com", token: TOKEN, status: "link" }]);
    expect(fake.recorded).toEqual([]);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("only makes links when asked to share a link", async () => {
    const fake = fakeSupabase();
    signIn(fake);
    const result = await sendInvites({ emails: "sam@cafe.com", role: "viewer", email: false });
    expect(result.outcomes).toEqual([{ email: "sam@cafe.com", token: TOKEN, status: "link" }]);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("keeps the link and explains when a sending limit is reached", async () => {
    const fake = fakeSupabase({
      recordError: { message: "You have sent 20 invites in the last hour" },
    });
    signIn(fake);
    const result = await sendInvites({ emails: "sam@cafe.com", role: "editor", email: true });
    expect(result.outcomes[0]).toEqual({
      email: "sam@cafe.com",
      token: TOKEN,
      status: "link",
      message: "You have sent 20 invites in the last hour. Share the link instead.",
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("keeps the link when Brevo refuses the email", async () => {
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: "brevo-401" });
    const fake = fakeSupabase();
    signIn(fake);
    const result = await sendInvites({ emails: "sam@cafe.com", role: "editor", email: true });
    expect(result.outcomes[0]).toEqual({
      email: "sam@cafe.com",
      token: TOKEN,
      status: "failed",
      message: "The email couldn’t be sent. Share the link instead.",
    });
  });

  it("reuses a pending invite for the same address, and replaces one with another role", async () => {
    const fake = fakeSupabase({
      pending: [
        { id: "p1", email: "sam@cafe.com", role: "editor", token: TOKEN, expires_at: EXPIRES },
        { id: "p2", email: "lee@cafe.com", role: "viewer", token: TOKEN, expires_at: EXPIRES },
      ],
    });
    signIn(fake);
    await sendInvites({ emails: "SAM@cafe.com lee@cafe.com", role: "editor", email: true });
    expect(fake.inserted).toEqual([{ email: "lee@cafe.com", role: "editor" }]);
    expect(fake.deleted).toEqual(["p2"]);
    expect(fake.recorded).toEqual(["p1", "id-lee@cafe.com"]);
  });

  it("checks the request before saving anything", async () => {
    const fake = fakeSupabase({ members: ["lee@cafe.com"] });
    signIn(fake);
    expect(await sendInvites({ emails: "nope", role: "editor", email: true })).toEqual({
      error: "“nope” isn’t an email address.",
      outcomes: [],
    });
    expect((await sendInvites({ emails: "LEE@cafe.com", role: "editor", email: true })).error).toMatch(
      /already on your team/,
    );
    expect(
      (await sendInvites({ emails: "a@b.co", role: "owner" as Role, email: true })).error,
    ).toBe("Choose Editor or Viewer.");
    expect(fake.inserted).toEqual([]);
  });

  it("asks you to sign in again when the session has ended", async () => {
    vi.mocked(getAuthState).mockResolvedValue({
      supabase: {},
      user: null,
      needsMfa: false,
    } as never);
    expect(await sendInvites({ emails: "a@b.co", role: "editor", email: true })).toEqual({
      error: "Your session has expired. Sign in again.",
      outcomes: [],
    });
  });
});

describe("resendInvite", () => {
  it("emails a pending invite again", async () => {
    const fake = fakeSupabase({
      pending: [{ id: "p1", email: "sam@cafe.com", role: "viewer", token: TOKEN, expires_at: EXPIRES }],
    });
    signIn(fake);
    expect(await resendInvite("p1")).toEqual({
      outcomes: [{ email: "sam@cafe.com", token: TOKEN, status: "sent" }],
    });
    expect(fake.recorded).toEqual(["p1"]);
  });

  it("says when the invite has ended", async () => {
    signIn(fakeSupabase());
    expect(await resendInvite("gone")).toEqual({
      error: "That invite has ended. Create a new one.",
      outcomes: [],
    });
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run features/teams/inviteInput.test.ts features/teams/actions.test.ts`
Expected: FAIL with "Failed to resolve import" for `./inviteInput` and `./actions`.

- [ ] **Step 3: Implement.** Create `features/teams/inviteInput.ts`:

```ts
export const MAX_INVITES_PER_REQUEST = 10;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type ParsedInvites = { ok: true; emails: string[] } | { ok: false; error: string };

/**
 * Reads the invite box: addresses separated by commas, semicolons, spaces or new lines. Repeats
 * are dropped (ignoring case), and everything is checked before anything is saved.
 */
export function parseInviteEmails(
  raw: string,
  { self, members = [] }: { self: string; members?: string[] },
): ParsedInvites {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim();
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    emails.push(email);
  }
  if (emails.length === 0) return { ok: false, error: "Enter at least one email address." };
  const invalid = emails.find((email) => email.length > 254 || !EMAIL.test(email));
  if (invalid) return { ok: false, error: `“${invalid}” isn’t an email address.` };
  if (emails.length > MAX_INVITES_PER_REQUEST) {
    return { ok: false, error: `Invite up to ${MAX_INVITES_PER_REQUEST} people at a time.` };
  }
  if (emails.some((email) => email.toLowerCase() === self.toLowerCase())) {
    return { ok: false, error: "That’s your own address. Invite someone else." };
  }
  const member = emails.find((email) =>
    members.some((m) => m.toLowerCase() === email.toLowerCase()),
  );
  if (member) {
    return {
      ok: false,
      error: `${member} is already on your team. Change their role below instead.`,
    };
  }
  return { ok: true, emails };
}
```

Create `features/teams/actions.ts`:

```ts
"use server";

import { inviteEmail } from "@/emails/invite";
import { getAuthState } from "@/lib/auth/server";
import { emailConfigured, sendEmail } from "@/lib/email/brevo";
import { SITE_URL, SUPABASE_URL } from "@/lib/env";
import type { TeamRole } from "@/types/supabase";

import { parseInviteEmails } from "./inviteInput";

export interface InviteOutcome {
  email: string;
  /** The invite's token, so its link can be shared by hand when it wasn't emailed. */
  token: string | null;
  status: "sent" | "link" | "failed";
  message?: string;
}

export interface InviteActionResult {
  error?: string;
  outcomes: InviteOutcome[];
}

const INVITE_COLUMNS = "id, email, role, token, expires_at";

interface InviteRow {
  id: string;
  email: string;
  role: TeamRole;
  token: string;
  expires_at: string;
}

interface Inviter {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

type Supabase = Awaited<ReturnType<typeof getAuthState>>["supabase"];

/** The signed-in user who is inviting, with the name and photo their invites show. */
async function currentInviter(): Promise<
  { error: string } | { supabase: Supabase; inviter: Inviter }
> {
  const { supabase, user, needsMfa } = await getAuthState();
  if (!user) return { error: "Your session has expired. Sign in again." };
  if (needsMfa) return { error: "Enter your two-factor code first, then try again." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return {
    supabase,
    inviter: {
      id: user.id,
      email: user.email ?? "",
      name: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    },
  };
}

/** Records the send (the database enforces the limits), then emails the invite. */
async function deliver(supabase: Supabase, inviter: Inviter, invite: InviteRow): Promise<InviteOutcome> {
  const base = { email: invite.email, token: invite.token };
  if (!emailConfigured()) return { ...base, status: "link" };
  const { error } = await supabase.rpc("record_invite_send", { p_invite: invite.id });
  if (error) {
    const limit = /invites in the last hour|emailed 5 times/.test(error.message);
    return {
      ...base,
      status: "link",
      message: limit
        ? `${error.message}. Share the link instead.`
        : "The invite couldn’t be emailed. Share the link instead.",
    };
  }
  const content = inviteEmail({
    inviter,
    to: invite.email,
    role: invite.role,
    acceptUrl: `${SITE_URL}/invite/${invite.token}`,
    expiresAt: invite.expires_at,
    supabaseUrl: SUPABASE_URL,
  });
  const sent = await sendEmail({
    to: invite.email,
    ...content,
    replyTo: inviter.email
      ? { email: inviter.email, ...(inviter.name ? { name: inviter.name } : {}) }
      : undefined,
  });
  return sent.ok
    ? { ...base, status: "sent" }
    : { ...base, status: "failed", message: "The email couldn’t be sent. Share the link instead." };
}

/**
 * Invites up to 10 people. With `email`, each invite is emailed when this server can send email;
 * otherwise (or when a limit is reached) its link comes back to share by hand.
 */
export async function sendInvites(input: {
  emails: string;
  role: TeamRole;
  email: boolean;
}): Promise<InviteActionResult> {
  if (input.role !== "editor" && input.role !== "viewer") {
    return { error: "Choose Editor or Viewer.", outcomes: [] };
  }
  const current = await currentInviter();
  if ("error" in current) return { error: current.error, outcomes: [] };
  const { supabase, inviter } = current;

  const [{ data: members }, { data: pending }] = await Promise.all([
    supabase.rpc("team_overview"),
    supabase
      .from("team_invites")
      .select(INVITE_COLUMNS)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ]);
  const parsed = parseInviteEmails(input.emails, {
    self: inviter.email,
    members: (members ?? []).map((m) => m.email),
  });
  if (!parsed.ok) return { error: parsed.error, outcomes: [] };

  const outcomes: InviteOutcome[] = [];
  for (const email of parsed.emails) {
    const sameAddress = (pending ?? []).filter((p) => p.email.toLowerCase() === email.toLowerCase());
    let invite: InviteRow | null = sameAddress.find((p) => p.role === input.role) ?? null;
    // An invite for the same address with another role is replaced, so only one link works.
    for (const stale of sameAddress.filter((p) => p.role !== input.role)) {
      await supabase.from("team_invites").delete().eq("id", stale.id);
    }
    if (!invite) {
      const { data, error } = await supabase
        .from("team_invites")
        .insert({ email, role: input.role })
        .select(INVITE_COLUMNS)
        .single();
      if (error || !data) {
        outcomes.push({
          email,
          token: null,
          status: "failed",
          message: "The invite couldn’t be created. Please try again.",
        });
        continue;
      }
      invite = data;
    }
    outcomes.push(
      input.email
        ? await deliver(supabase, inviter, invite)
        : { email: invite.email, token: invite.token, status: "link" },
    );
  }
  return { outcomes };
}

/** Emails a pending invite again. */
export async function resendInvite(inviteId: string): Promise<InviteActionResult> {
  const current = await currentInviter();
  if ("error" in current) return { error: current.error, outcomes: [] };
  const { supabase, inviter } = current;
  const { data: invite } = await supabase
    .from("team_invites")
    .select(INVITE_COLUMNS)
    .eq("id", inviteId)
    .is("accepted_at", null)
    .maybeSingle();
  if (!invite) return { error: "That invite has ended. Create a new one.", outcomes: [] };
  if (!emailConfigured()) {
    return { error: "Email invites aren’t set up on this server.", outcomes: [] };
  }
  return { outcomes: [await deliver(supabase, inviter, invite)] };
}
```

- [ ] **Step 4: Run the tests and checks, and confirm they pass.**

Run: `npx vitest run features/teams && npm run lint && npm run typecheck`
Expected: PASS, with 0 lint and type errors.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write features/teams/inviteInput.ts features/teams/inviteInput.test.ts features/teams/actions.ts features/teams/actions.test.ts
git add features/teams/inviteInput.ts features/teams/inviteInput.test.ts features/teams/actions.ts features/teams/actions.test.ts
git commit -m "Invite people by email from the server

sendInvites checks up to 10 addresses, creates the invites under your
session, records each send (which enforces the limits) and emails them
through Brevo. When email isn't possible, each invite's link comes back
to share by hand. resendInvite emails a pending invite again.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Team page: send, resend and see invites

**Files:**
- Modify: `features/teams/TeamManager.tsx` (full replacement below)
- Create: `features/teams/TeamManager.test.tsx`
- Modify: `app/dashboard/team/page.tsx`

**Interfaces:**
- Consumes:
  - `sendInvites`, `resendInvite` and `InviteOutcome` (Task 9)
  - `MAX_INVITES_PER_REQUEST` (Task 9)
  - `Avatar` (Task 4)
  - `emailConfigured` (Task 8)
  - the `avatar_url`/`owner_avatar_url` columns (Task 1) and the `last_sent_at`/`send_count` columns (Task 3)
- Produces: `TeamManager` props `{ userId, members, invites, workspaces, emailEnabled }`. The `email` prop is removed.

- [ ] **Step 1: Write the failing tests.** Create `features/teams/TeamManager.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { resendInvite, sendInvites } from "./actions";
import { TeamManager, type Invite } from "./TeamManager";

vi.mock("./actions", () => ({ sendInvites: vi.fn(), resendInvite: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const TOKEN = "a".repeat(48);
const HOUR = 3_600_000;

function renderTeam(props: Partial<ComponentProps<typeof TeamManager>> = {}) {
  return render(
    <ToastProvider>
      <TeamManager
        userId="owner"
        members={[]}
        invites={[]}
        workspaces={[]}
        emailEnabled
        {...props}
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.mocked(sendInvites).mockReset();
  vi.mocked(resendInvite).mockReset();
});

describe("TeamManager invites", () => {
  it("emails invites and says who got one", async () => {
    vi.mocked(sendInvites).mockResolvedValue({
      outcomes: [{ email: "sam@cafe.com", token: TOKEN, status: "sent" }],
    });
    renderTeam();
    await userEvent.type(screen.getByLabelText("Email addresses"), "sam@cafe.com");
    await userEvent.click(screen.getByRole("button", { name: "Send invites" }));
    expect(sendInvites).toHaveBeenCalledWith({ emails: "sam@cafe.com", role: "editor", email: true });
    expect(await screen.findByText(/Invite emailed to/)).toHaveTextContent(
      "Invite emailed to sam@cafe.com",
    );
  });

  it("without email, makes a link to share", async () => {
    vi.mocked(sendInvites).mockResolvedValue({
      outcomes: [{ email: "sam@cafe.com", token: TOKEN, status: "link" }],
    });
    renderTeam({ emailEnabled: false });
    expect(screen.getByText(/Email invites aren’t set up on this server/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Email addresses"), "sam@cafe.com");
    await userEvent.click(screen.getByRole("button", { name: "Create invite link" }));
    expect(sendInvites).toHaveBeenCalledWith({ emails: "sam@cafe.com", role: "editor", email: false });
    expect(await screen.findByText(`http://localhost:3000/invite/${TOKEN}`)).toBeInTheDocument();
  });

  it("shows why an invite couldn’t be sent", async () => {
    vi.mocked(sendInvites).mockResolvedValue({ error: "Invite up to 10 people at a time.", outcomes: [] });
    renderTeam();
    await userEvent.type(screen.getByLabelText("Email addresses"), "a@b.co");
    await userEvent.click(screen.getByRole("button", { name: "Send invites" }));
    expect(await screen.findByText("Invite up to 10 people at a time.")).toBeInTheDocument();
  });

  it("lists pending invites with when they were emailed, and resends them", async () => {
    const invite: Invite = {
      id: "i1",
      email: "lee@cafe.com",
      role: "viewer",
      token: TOKEN,
      created_at: new Date(Date.now() - 3 * HOUR).toISOString(),
      expires_at: new Date(Date.now() + 13 * 24 * HOUR).toISOString(),
      last_sent_at: new Date(Date.now() - 2 * HOUR).toISOString(),
      send_count: 1,
    };
    vi.mocked(resendInvite).mockResolvedValue({
      outcomes: [{ email: "lee@cafe.com", token: TOKEN, status: "sent" }],
    });
    renderTeam({ invites: [invite] });
    expect(screen.getByText("Viewer · emailed 2 hours ago · expires in 13 days")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resend" }));
    expect(resendInvite).toHaveBeenCalledWith("i1");
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run features/teams/TeamManager.test.tsx`
Expected: FAIL. There is no "Email addresses" field and no "Send invites" button, and `emailEnabled` and `Invite` don't exist.

- [ ] **Step 3: Implement.** Replace `features/teams/TeamManager.tsx` with:

```tsx
"use client";

import { ArrowRight, Link2, LogOut, MailCheck, Send, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Select, Textarea } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { CopyButton } from "@/features/dashboard/CopyButton";
import { relativePhrase } from "@/features/dashboard/format";
import { SITE_URL } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { TeamInviteRow, TeamRole } from "@/types/supabase";

import { resendInvite, sendInvites, type InviteOutcome } from "./actions";
import { MAX_INVITES_PER_REQUEST } from "./inviteInput";
import { ROLE_LABELS, workspaceLabel } from "./roles";

export interface Member {
  member_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: TeamRole;
  created_at: string;
}

export interface Membership {
  owner_id: string;
  owner_email: string;
  owner_name: string | null;
  owner_avatar_url: string | null;
  role: TeamRole;
}

export type Invite = Pick<
  TeamInviteRow,
  "id" | "email" | "role" | "token" | "created_at" | "expires_at" | "last_sent_at" | "send_count"
>;

/** Most emails one invite can get; the database enforces it too. */
const MAX_SENDS_PER_INVITE = 5;

const inviteLink = (token: string) => `${SITE_URL}/invite/${token}`;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg font-bold text-fg">{title}</h2>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** What happened to one address after "Send invites": emailed, or a link to share. */
function OutcomeRow({ outcome }: { outcome: InviteOutcome }) {
  if (outcome.status === "sent") {
    return (
      <li className="flex items-center gap-2 px-4 py-3 text-sm text-fg">
        <MailCheck aria-hidden className="size-4 shrink-0 text-success" />
        <span className="min-w-0 break-words">
          Invite emailed to <strong>{outcome.email}</strong>
        </span>
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-sm">
      <p className="flex items-start gap-2 text-fg">
        <Link2 aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" />
        <span className="min-w-0 break-words">
          {outcome.message
            ? `${outcome.email}: ${outcome.message}`
            : `Send this link to ${outcome.email}. It works once, for that address, for 14 days.`}
        </span>
      </p>
      {outcome.token && (
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 font-mono text-sm break-all text-fg">
            {inviteLink(outcome.token)}
          </code>
          <CopyButton text={inviteLink(outcome.token)} label={`Copy invite link for ${outcome.email}`} />
        </div>
      )}
    </li>
  );
}

type Pending =
  | { kind: "remove"; member: Member }
  | { kind: "leave"; workspace: Membership }
  | { kind: "revoke"; invite: Invite };

/** Invite people to your codes, manage their roles, and see the teams you're in. */
export function TeamManager({
  userId,
  members,
  invites,
  workspaces,
  emailEnabled,
}: {
  userId: string;
  members: Member[];
  invites: Invite[];
  workspaces: Membership[];
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
  const [working, setWorking] = useState(false);

  async function submit(mode: "email" | "link") {
    setSending(mode);
    setError("");
    const result = await sendInvites({ emails: addresses, role, email: mode === "email" });
    setSending(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOutcomes(result.outcomes);
    if (result.outcomes.every((o) => o.status !== "failed")) setAddresses("");
    const sent = result.outcomes.filter((o) => o.status === "sent").length;
    if (sent > 0) toast(sent === 1 ? "Invite sent" : `${sent} invites sent`);
    router.refresh();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(emailEnabled ? "email" : "link");
  }

  async function resend(invite: Invite) {
    setResending(invite.id);
    const result = await resendInvite(invite.id);
    setResending(null);
    const outcome = result.outcomes[0];
    if (result.error || !outcome) {
      toast(result.error ?? "The invite couldn’t be emailed. Please try again.", "error");
      return;
    }
    if (outcome.status === "sent") toast(`Invite emailed to ${invite.email}`);
    else toast(outcome.message ?? "The invite couldn’t be emailed. Share the link instead.", "error");
    router.refresh();
  }

  async function changeRole(member: Member, next: TeamRole) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("team_members")
      .update({ role: next })
      .eq("owner_id", userId)
      .eq("member_id", member.member_id);
    if (updateError) return toast("The role couldn’t be changed. Please try again.", "error");
    toast(`${member.name || member.email} is now ${next === "editor" ? "an editor" : "a viewer"}`);
    router.refresh();
  }

  async function runConfirmed() {
    const supabase = getBrowserSupabase();
    if (!supabase || !confirm) return;
    setWorking(true);
    const { error: deleteError } =
      confirm.kind === "remove"
        ? await supabase
            .from("team_members")
            .delete()
            .eq("owner_id", userId)
            .eq("member_id", confirm.member.member_id)
        : confirm.kind === "leave"
          ? await supabase
              .from("team_members")
              .delete()
              .eq("owner_id", confirm.workspace.owner_id)
              .eq("member_id", userId)
          : await supabase.from("team_invites").delete().eq("id", confirm.invite.id);
    setWorking(false);
    if (deleteError) return toast("That didn’t work. Please try again.", "error");
    toast(
      confirm.kind === "remove"
        ? "Removed from your team"
        : confirm.kind === "leave"
          ? `You left ${workspaceLabel(confirm.workspace)}’s team`
          : "Invite revoked",
    );
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
          title: `Remove ${confirm.member.name || confirm.member.email}?`,
          description:
            "They lose access to your codes straight away. You can invite them again later.",
          label: "Remove",
        }
      : confirm?.kind === "leave"
        ? {
            title: `Leave ${workspaceLabel(confirm.workspace)}’s team?`,
            description: "You’ll need a new invite to get back in.",
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
      <Section
        title="Invite people"
        description="Viewers see your codes, analytics and feedback. Editors can also create, change and delete codes and folders."
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_10rem] sm:items-start">
          <Field
            label="Email addresses"
            error={error}
            hint={`Separate addresses with commas or new lines, up to ${MAX_INVITES_PER_REQUEST} at a time.`}
          >
            {(control) => (
              <Textarea
                {...control}
                rows={2}
                autoComplete="off"
                placeholder="sam@example.com, lee@example.com"
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
              />
            )}
          </Field>
          <Field label="Role">
            {(control) => (
              <Select {...control} value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </Select>
            )}
          </Field>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-2">
            <Button type="submit" disabled={!canSubmit}>
              {emailEnabled ? <Send aria-hidden /> : <UserPlus aria-hidden />}
              {sending === "email"
                ? "Sending…"
                : sending === "link"
                  ? "Creating…"
                  : emailEnabled
                    ? "Send invites"
                    : "Create invite link"}
            </Button>
            {emailEnabled ? (
              <p className="text-sm text-fg-muted">
                They get an email with a button to join.{" "}
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => void submit("link")}
                  className="inline-flex min-h-11 items-center font-medium text-link underline-offset-4 hover:underline disabled:opacity-50"
                >
                  Share a link instead
                </button>
              </p>
            ) : (
              <p className="text-sm text-fg-muted">
                Email invites aren’t set up on this server, so you’ll get a link to share yourself.
              </p>
            )}
          </div>
        </form>
        {outcomes.length > 0 && (
          <ul
            aria-live="polite"
            className="flex flex-col divide-y divide-border rounded-control border border-border bg-surface-2"
          >
            {outcomes.map((outcome) => (
              <OutcomeRow key={outcome.email} outcome={outcome} />
            ))}
          </ul>
        )}
      </Section>

      {invites.length > 0 && (
        <Section title="Pending invites">
          <ul className="divide-y divide-border rounded-control border border-border">
            {invites.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                <Avatar id={item.email} email={item.email} size="sm" />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium text-fg">{item.email}</p>
                  <p className="text-sm text-fg-muted">
                    {ROLE_LABELS[item.role]} ·{" "}
                    {item.last_sent_at ? `emailed ${relativePhrase(item.last_sent_at)}` : "not emailed"} ·
                    expires {relativePhrase(item.expires_at)}
                  </p>
                </div>
                {emailEnabled && (
                  <Button
                    variant="outline"
                    disabled={resending === item.id || item.send_count >= MAX_SENDS_PER_INVITE}
                    onClick={() => void resend(item)}
                  >
                    <Send aria-hidden />
                    {resending === item.id ? "Sending…" : item.last_sent_at ? "Resend" : "Email invite"}
                  </Button>
                )}
                <CopyButton text={inviteLink(item.token)} label={`Copy invite link for ${item.email}`} />
                <IconButton
                  label={`Revoke invite for ${item.email}`}
                  size="icon-sm"
                  onClick={() => setConfirm({ kind: "revoke", invite: item })}
                >
                  <Trash2 aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title="Your team"
        description={
          members.length
            ? "People who can open your codes."
            : "Nobody else has access to your codes yet."
        }
      >
        {members.length > 0 && (
          <ul className="divide-y divide-border rounded-control border border-border">
            {members.map((member) => (
              <li
                key={member.member_id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
              >
                <Avatar
                  id={member.member_id}
                  name={member.name}
                  email={member.email}
                  src={member.avatar_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium text-fg">{member.name || member.email}</p>
                  <p className="truncate text-sm text-fg-muted">
                    {member.name ? `${member.email} · ` : ""}joined{" "}
                    {relativePhrase(member.created_at)}
                  </p>
                </div>
                <label className="w-32">
                  <span className="sr-only">Role for {member.name || member.email}</span>
                  <Select
                    value={member.role}
                    onChange={(e) => changeRole(member, e.target.value as TeamRole)}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                </label>
                <IconButton
                  label={`Remove ${member.name || member.email}`}
                  size="icon-sm"
                  onClick={() => setConfirm({ kind: "remove", member })}
                >
                  <Trash2 aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {workspaces.length > 0 && (
        <Section title="Teams you’re in" description="Codes other people have shared with you.">
          <ul className="divide-y divide-border rounded-control border border-border">
            {workspaces.map((workspace) => (
              <li
                key={workspace.owner_id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
              >
                <Avatar
                  id={workspace.owner_id}
                  name={workspace.owner_name}
                  email={workspace.owner_email}
                  src={workspace.owner_avatar_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium text-fg">{workspaceLabel(workspace)}</p>
                  <p className="text-sm text-fg-muted">{ROLE_LABELS[workspace.role]}</p>
                </div>
                <Link
                  href={`/dashboard?workspace=${workspace.owner_id}`}
                  className={buttonClasses("outline", "sm")}
                >
                  Open <ArrowRight aria-hidden />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirm({ kind: "leave", workspace })}
                >
                  <LogOut aria-hidden /> Leave
                </Button>
              </li>
            ))}
          </ul>
        </Section>
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
      />
    </div>
  );
}
```

In `app/dashboard/team/page.tsx`:
- Add `import { emailConfigured } from "@/lib/email/brevo";`.
- Change the invites select to `.select("id, email, role, token, created_at, expires_at, last_sent_at, send_count")`.
- Render:

```tsx
      <TeamManager
        userId={user.id}
        members={members.data ?? []}
        invites={invites.data ?? []}
        workspaces={workspaces.data ?? []}
        emailEnabled={emailConfigured()}
      />
```

- [ ] **Step 4: Run the tests and checks, and confirm they pass.**

Run: `npx vitest run features/teams && npm run lint && npm run typecheck && npm test`
Expected: all PASS, with 0 lint and type errors.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write features/teams app/dashboard/team/page.tsx
git add features/teams/TeamManager.tsx features/teams/TeamManager.test.tsx app/dashboard/team/page.tsx
git commit -m "Send, resend and track invites on the Team page

Invite several people at once by email, or share a link instead.
Pending invites show when they were emailed, with Resend, Copy link
and Revoke. Members and teams show photos. When email isn't set up the
page says so and creates links.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Joining from an invite

**Files:**
- Modify: `app/(auth)/invite/[token]/page.tsx` (full replacement below)
- Modify: `app/(auth)/signup/page.tsx` (full replacement below)
- Modify: `features/auth/SignupForm.tsx`
- Create: `features/auth/SignupForm.test.tsx`
- Modify: `features/auth/redirects.ts`, `features/auth/redirects.test.ts`
- Modify: `app/auth/confirm/route.ts`

**Interfaces:**
- Consumes:
  - `invite_details` for anon, with `owner_avatar_url`, and `my_pending_invite` (Tasks 1 and 3)
  - `Avatar` (Task 4)
  - `ROLE_DESCRIPTIONS` (Task 7)
- Produces:
  - `confirmDestination(next: string, type: string, pendingInvite: string | null): string`
  - `SignupForm` prop `invite?: { token: string; email: string }`

- [ ] **Step 1: Write the failing tests.** Append to `features/auth/redirects.test.ts` (and add `confirmDestination` to its import from `./redirects`):

```ts
describe("confirmDestination", () => {
  const TOKEN = "c".repeat(48);

  it("opens a waiting team invite after a new account confirms its email", () => {
    expect(confirmDestination("/dashboard", "email", TOKEN)).toBe(`/invite/${TOKEN}`);
    expect(confirmDestination("/dashboard", "signup", TOKEN)).toBe(`/invite/${TOKEN}`);
  });

  it("keeps the page it was going to otherwise", () => {
    expect(confirmDestination("/dashboard", "email", null)).toBe("/dashboard");
    expect(confirmDestination("/bulk", "email", TOKEN)).toBe("/bulk");
    expect(confirmDestination("/account/update-password", "recovery", TOKEN)).toBe(
      "/account/update-password",
    );
    expect(confirmDestination("/dashboard", "email", "../../evil")).toBe("/dashboard");
  });
});
```

Create `features/auth/SignupForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignupForm } from "./SignupForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./GoogleButton", () => ({ GoogleButton: () => null, OrDivider: () => null }));

describe("SignupForm", () => {
  it("fills in and locks the invited address", () => {
    render(<SignupForm next="/invite/x" invite={{ token: "a".repeat(48), email: "sam@cafe.com" }} />);
    const email = screen.getByLabelText("Email");
    expect(email).toHaveValue("sam@cafe.com");
    expect(email).toHaveAttribute("readonly");
    expect(screen.getByText("This invite is for this address.")).toBeInTheDocument();
  });

  it("leaves the address open without an invite", () => {
    render(<SignupForm next="/dashboard" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("readonly");
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run features/auth/redirects.test.ts features/auth/SignupForm.test.tsx`
Expected: FAIL. `confirmDestination` is not exported, and the email field is empty and not read-only.

- [ ] **Step 3: Implement.** Append to `features/auth/redirects.ts`:

```ts
const INVITE_TOKEN = /^[0-9a-f]{48}$/;

/**
 * Where a confirmed email link goes. A new account with a team invite waiting for its address
 * opens that invite instead of the default page, even when confirmed on another device.
 */
export function confirmDestination(
  next: string,
  type: string,
  pendingInvite: string | null,
): string {
  const confirmsSignup = type === "email" || type === "signup";
  return confirmsSignup && next === "/dashboard" && pendingInvite && INVITE_TOKEN.test(pendingInvite)
    ? `/invite/${pendingInvite}`
    : next;
}
```

In `app/auth/confirm/route.ts`:
- Change the redirects import to `import { confirmDestination, safeNext } from "@/features/auth/redirects";`.
- Replace `if (!error) return NextResponse.redirect(new URL(next, SITE_URL));` with:

```ts
    if (!error) {
      const signup = type === "email" || type === "signup";
      const { data: pending } = signup
        ? await supabase.rpc("my_pending_invite")
        : { data: null };
      return NextResponse.redirect(
        new URL(confirmDestination(next, type, pending ?? null), SITE_URL),
      );
    }
```

In `features/auth/SignupForm.tsx`:
- Change the signature to `export function SignupForm({ next, invite }: { next: string; invite?: { token: string; email: string } }) {`.
- Change the email state to `const [email, setEmail] = useState(invite?.email ?? "");`.
- Replace the Email field with:

```tsx
        <Field label="Email" hint={invite ? "This invite is for this address." : undefined}>
          {(control) => (
            <TextInput
              {...control}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              readOnly={Boolean(invite)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
```

Replace `app/(auth)/signup/page.tsx` with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/features/auth/AuthCard";
import { safeNext } from "@/features/auth/redirects";
import { SignupForm } from "@/features/auth/SignupForm";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create your account · QuickQReate" };

/** The unused invite a sign-up link carries (/signup?invite=<token>), checked on the server. */
async function inviteFor(token: unknown) {
  if (typeof token !== "string" || !/^[0-9a-f]{48}$/.test(token)) return null;
  const supabase = await getServerSupabase();
  const { data } = await supabase.rpc("invite_details", { p_token: token });
  const details = data as {
    email: string;
    valid: boolean;
    owner_name: string | null;
    owner_email: string;
  } | null;
  if (!details?.valid) return null;
  return { token, email: details.email, owner: details.owner_name?.trim() || details.owner_email };
}

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const invite = await inviteFor(params.invite);
  const next = safeNext(
    typeof params.next === "string" ? params.next : null,
    invite ? `/invite/${invite.token}` : undefined,
  );
  return (
    <AuthCard
      title="Create your free account"
      description={
        invite
          ? `Create your account with ${invite.email} to join ${invite.owner}’s codes.`
          : "Editable codes, scan analytics and unlimited saved designs. Free, with no limits."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="font-semibold text-link underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm
        next={next}
        invite={invite ? { token: invite.token, email: invite.email } : undefined}
      />
    </AuthCard>
  );
}
```

Replace `app/(auth)/invite/[token]/page.tsx` with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { AuthCard } from "@/features/auth/AuthCard";
import { AcceptInviteForm } from "@/features/teams/AcceptInviteForm";
import { ROLE_DESCRIPTIONS } from "@/features/teams/roles";
import { getAuthState } from "@/lib/auth/server";
import type { TeamRole } from "@/types/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Team invite · QuickQReate", robots: { index: false } };

interface InviteDetails {
  owner_email: string;
  owner_name: string | null;
  owner_avatar_url: string | null;
  email: string;
  role: TeamRole;
  valid: boolean;
}

function Problem({ title, message }: { title: string; message: string }) {
  return (
    <AuthCard title={title}>
      <p className="text-fg-muted">{message}</p>
      <Link href="/dashboard" className={`${buttonClasses("outline", "md")} mt-5 w-full`}>
        Go to my codes
      </Link>
    </AuthCard>
  );
}

/** Who sent the invite, with their photo, and which address it is for. */
function Inviter({ invite, owner }: { invite: InviteDetails; owner: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Avatar
        id={invite.owner_email}
        name={invite.owner_name}
        email={invite.owner_email}
        src={invite.owner_avatar_url}
      />
      <p className="min-w-0 text-sm text-fg-muted">
        <strong className="text-fg">{owner}</strong> invited{" "}
        <strong className="break-all text-fg">{invite.email}</strong>
      </p>
    </div>
  );
}

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const next = `/invite/${token}`;
  if (!/^[0-9a-f]{48}$/.test(token)) {
    return (
      <Problem title="This invite link isn’t valid" message="Check that you copied all of it." />
    );
  }

  const { supabase, user, needsMfa } = await getAuthState();
  if (user && needsMfa) redirect(`/login/verify?next=${encodeURIComponent(next)}`);

  const { data } = await supabase.rpc("invite_details", { p_token: token });
  const invite = data as InviteDetails | null;
  if (!invite) {
    return (
      <Problem title="This invite link isn’t valid" message="Check that you copied all of it." />
    );
  }
  if (!invite.valid) {
    return (
      <Problem
        title="This invite has ended"
        message="It has expired or was already used. Ask the person who invited you for a new one."
      />
    );
  }
  const owner = invite.owner_name?.trim() || invite.owner_email;

  if (!user) {
    return (
      <AuthCard
        title={`${owner} invited you to their QuickQReate codes`}
        description={ROLE_DESCRIPTIONS[invite.role]}
      >
        <Inviter invite={invite} owner={owner} />
        <div className="flex flex-col gap-3">
          <Link
            href={`/signup?invite=${token}&next=${encodeURIComponent(next)}`}
            className={buttonClasses("primary", "lg")}
          >
            Create free account
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className={buttonClasses("outline", "lg")}
          >
            I already have an account
          </Link>
        </div>
        <p className="mt-4 text-sm text-fg-muted">
          Use {invite.email} so the invite finds you.
        </p>
      </AuthCard>
    );
  }

  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return (
      <AuthCard title="This invite is for someone else">
        <div className="flex flex-col gap-4 text-fg-muted">
          <p>
            {owner} invited <strong className="text-fg">{invite.email}</strong>, but you’re signed
            in as <strong className="text-fg">{user.email}</strong>.
          </p>
          <p>Sign out, then sign in or create an account with the invited address.</p>
          <form action="/auth/signout" method="post">
            <button type="submit" className={`${buttonClasses("outline", "md")} w-full`}>
              Sign out
            </button>
          </form>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={`Join ${owner}’s codes`} description={ROLE_DESCRIPTIONS[invite.role]}>
      <Inviter invite={invite} owner={owner} />
      <AcceptInviteForm token={token} role={invite.role} />
    </AuthCard>
  );
}
```

- [ ] **Step 4: Run the tests and checks, and confirm they pass.**

Run: `npx vitest run features/auth && npm run lint && npm run typecheck && npm test && npm run build`
Expected: all PASS. The build lists `/invite/[token]` and `/signup` as dynamic (ƒ).

- [ ] **Step 5: Commit.**

```bash
npx prettier --write "app/(auth)/invite/[token]/page.tsx" "app/(auth)/signup/page.tsx" features/auth app/auth/confirm/route.ts
git add "app/(auth)/invite/[token]/page.tsx" "app/(auth)/signup/page.tsx" features/auth app/auth/confirm/route.ts
git commit -m "Join from an invite in one flow

The invite page shows who invited you and which address it is for, even
before you sign in. Create account fills in that address and locks it.
After confirming the email, a new account lands on its invite, on any
device. Copy no longer says an email was sent when it wasn't.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Privacy page and setup docs

**Files:**
- Modify: `app/(docs)/privacy/page.tsx`, `.env.example`, `docs/accounts-setup.md`

**Interfaces:** none.

- [ ] **Step 1: Update the privacy page.** In `app/(docs)/privacy/page.tsx`:
  - Change the sign-in details text from "or your Google account’s email and name if you sign in with Google." to "or your Google account’s email, name and photo if you sign in with Google."
  - Add a list item right after the Sign-in details item:

```tsx
        <li>
          <strong>Profile photo:</strong> your Google photo, or a photo you upload. Uploaded photos
          are stored as public images so your teammates and the invites you send can show them.
          Removing your photo deletes the uploaded file.
        </li>
```

  - In the Teams item, add this sentence after "…expires after 14 days.": " When you invite someone by email, QuickQReate sends the invite for you through Brevo; it shows your name and photo."
  - Change the providers item `<li>Brevo sends account emails such as confirmations and password resets.</li>` to `<li>Brevo sends account emails such as confirmations and password resets, and team invites.</li>`.

- [ ] **Step 2: Document the new variables.** Append to `.env.example`:

```
# Server only. Brevo API key (Brevo → Settings → SMTP & API → API keys) for emailing team
# invites. Leave empty to share invite links by hand instead.
BREVO_API_KEY=
# Optional sender for invite emails; must be a verified sender in Brevo.
# Defaults to no-reply@techitdave.com.
INVITE_FROM_EMAIL=
```

In `docs/accounts-setup.md`, in the step 7 environment variable table, add this row after the `SCAN_HASH_SECRET` row:

```
| `BREVO_API_KEY` | Brevo API key (`quickqreate-invites`), for team invite emails | no | **yes** |
```

Add this paragraph after the table, before "Enable automatic deployment on push to `main`.":

```markdown
`BREVO_API_KEY` is an API key, not the SMTP key the Supabase project uses: create it in Brevo
under **Settings → SMTP & API → API keys**. If Brevo's "authorized IPs" protection is on,
allow `152.44.42.29`. Without the key, the Team page creates invite links to share by hand.
```

- [ ] **Step 3: Run the checks and confirm they pass.**

Run: `npm run lint && npm run typecheck && npx prettier --check "app/(docs)/privacy/page.tsx"`
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add "app/(docs)/privacy/page.tsx" .env.example docs/accounts-setup.md
git commit -m "Describe invite emails and profile photos for users and operators

The privacy page covers photos and Brevo sending invites. The env
example and setup guide add BREVO_API_KEY and INVITE_FROM_EMAIL.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Ship Phase 1a

**Files:** none new. This task covers the live database, the PR, CI, the review, the merge, the deploy and the checks.

- [ ] **Step 1: Run the full local check.**

Run:
```bash
npx prettier --check . --ignore-path .prettierignore --ignore-path .git/info/exclude && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e
```
Expected: all PASS.

- [ ] **Step 2: Push and open the PR.**

```bash
git push -u origin feat/invites-and-photos
gh pr create --base main --head feat/invites-and-photos --title "Email invites and profile photos" --body "$(cat <<'EOF'
Phase 1a of the redesign (spec §6.2, §6.3; plan docs/superpowers/plans/2026-10-14-phase-1a-invites-and-photos.md).

- Team invites are emailed through Brevo (server only), with Resend and a link as backup. Limits: 10 per request, 5 emails per invite, 20 per hour.
- New invitees: the invite page shows who invited them, sign-up fills in the invited address, and confirming the email opens the invite on any device.
- Profile photos: Google photo by default (back-filled), upload/change/remove on Account, shown in the account menu, team lists and invite emails. Only photos from our Storage or Google are ever loaded.
- Migrations (already applied to the live project before merge): profile_photos, avatar_storage, email_invites.
- Needs BREVO_API_KEY in Coolify to email; without it the Team page makes links.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Run the final whole-branch review before merging.** Follow superpowers:executing-plans "Final Review". Use a fresh reviewer on the most capable model, the review package from the branch's merge base, this plan's Review Focus, and the ledger's rulings. Then run the fix pass if one is needed. Wait for CI to pass: `gh pr checks --watch`.

- [ ] **Step 4: Confirm a recent verified backup before touching the live database.** Run on the host through the strict SSH wrapper:

```bash
cat /var/lib/techitdave-offserver/last-sync.json; echo; cat /var/lib/techitdave-offserver/health.json
```
Expected: a verified off-server sync from the last 24 hours whose archive lists `quickqreate`.
- If there isn't one, start `systemctl start techitdave-supabase-backup.service`, wait for the new receipt, and check again.
- If the backup is skipped for disk reserve, stop and report it.

- [ ] **Step 5: Apply the three migrations to the live project, in order, through the private SQL bridge.** The bridge client runs `execute_sql` with the exact UUID. It is the session scratchpad's `tsb.py`, or the same JSON-RPC calls described in the `techitdave-infra-references` memory.

```bash
for f in 20261014120000_profile_photos 20261014120100_avatar_storage 20261014120200_email_invites; do
  grep -c '\\' supabase/migrations/$f.sql   # must print 0
  python3 tsb.py execute_sql db12f7ce-3e77-4461-a686-c8cd6de6f764 supabase/migrations/$f.sql
done
```
Expected: each file prints `0` backslashes, then COMMIT.

Verify with a read-only query through the bridge:

```sql
select
  (select count(*) from information_schema.columns where table_name = 'profiles' and column_name = 'avatar_url') as avatar_column,
  (select count(*) from storage.buckets where id = 'avatars') as avatar_bucket,
  (select count(*) from information_schema.columns where table_name = 'team_invites' and column_name = 'send_count') as send_count_column,
  (select count(*) from pg_proc where proname in ('record_invite_send', 'my_pending_invite')) as new_functions,
  (select count(*) from public.profiles where avatar_url is not null) as profiles_with_photos;
```
Expected:
- `avatar_column`, `avatar_bucket` and `send_count_column` are 1.
- `new_functions` is 2.
- `profiles_with_photos` is at least 1 (David's Google photo).

- [ ] **Step 6: Merge and check the live site.**
  1. Run `gh pr merge --merge --delete-branch`.
  2. Wait for the Coolify deploy, watching for a new static chunk hash on `https://qr.techitdave.com/`.
  3. Then check:
     - `curl -s https://qr.techitdave.com/api/health` returns `{"ok":true,"accounts":true}`.
     - In David's signed-in Chrome, the account menu shows his Google photo, and `/account` shows the photo with Upload, Change and Remove.
     - `/dashboard/team` loads. Without the key it says "Email invites aren’t set up on this server"; with the key it shows "Send invites".
     - `/invite/<48 zeros>` (signed out) says "This invite link isn’t valid".

- [ ] **Step 7: Record the migrations in the runbook.** Append to `~/.codex/memories/supabase-coolify.md` (outside Git):

```markdown
## QuickQReate Phase 1a migrations (14 October 2026)

- Applied through the bridge after a verified backup, before merging PR "Email invites and profile photos": `20261014120000_profile_photos`, `20261014120100_avatar_storage`, `20261014120200_email_invites`.
- New: `profiles.avatar_url` (back-filled from Google metadata), public bucket `avatars` (2 MB), `team_invites.last_sent_at/send_count`, private `invite_sends` log, `record_invite_send()`, `my_pending_invite()`; `invite_details()` callable by anon.
- App env: `BREVO_API_KEY` (runtime, secret, Brevo API key — not the SMTP key) emails invites; optional `INVITE_FROM_EMAIL`.
```

---

## Owner verification (David)

These steps need David's own accounts and secrets.

1. **Brevo API key:**
   - In Brevo, create an API key named `quickqreate-invites` (Settings → SMTP & API → API keys).
   - In Coolify, add it to the QuickQReate app as `BREVO_API_KEY`, runtime only, then redeploy.
   - If Brevo's authorized IPs are on, allow `152.44.42.29`.
2. **Invite email:** on `/dashboard/team`, invite `dvdallmon+qrtest@gmail.com` as a Viewer. The email arrives from QuickQReate <no-reply@techitdave.com> with your photo.
3. **New invitee flow:**
   - Open the email on your phone and choose Create free account. The address is filled in.
   - Confirm the email. You land on the invite, click Join, and see your codes as a viewer.
4. **Photo:** on `/account`, upload a photo from your phone. It shows in the account menu. Remove it and choose "Use Google photo" again.
