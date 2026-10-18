# Redesign Phase 4b: the Analytics overview, and editing templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- A `/analytics` page: scans across every code in a workspace. It has a range control (7, 30 and 90 days, 12 months, all time, or custom dates), totals and unique visitors, a daily chart, top codes, countries and devices, and a CSV export.
- Saved templates can be edited in place.

**Architecture:**
- **Database:** one migration with two security-invoker functions, so each person's own access rules apply. That means your codes, and teammates' shared codes but not their private ones.
  - `workspace_analytics(p_owner, p_from, p_to, p_tz)` returns the same shape as `code_analytics`, plus top codes. A null owner means Everyone: every code you can see.
  - `workspace_scans(…)` pages through the scans for the CSV.
- **Page:**
  - `app/(app)/analytics/page.tsx` works out the scope the way `/codes` does, and passes it to the client `WorkspaceAnalytics`.
  - Its stat tiles and helpers move into `features/analytics/parts.tsx`, shared with the per-code view.
  - `app/(app)/analytics/export/route.ts` streams the CSV.
- **Ranges:** `lib/analytics/shape.ts` gains `customBounds` for whole days chosen in the viewer's time zone.
- **Navigation:**
  - Analytics joins the sidebar after Codes, and the phone's bottom tabs, as spec 3.1 says.
  - `proxy.ts` refreshes the session on `/analytics`.
- **Templates:**
  - `/templates/[id]/edit` reuses the New template editor, renamed `TemplateEditor`, which takes an optional template.
  - `updateTemplate` saves the name and design.
  - The ⋯ menu gains Edit.

**Tech Stack:**
- Next.js 16, React 19, Headless UI 2.2, Supabase (self-hosted, through the private SQL bridge), PGlite migration tests, Vitest, Playwright 1.56.
- No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md`. This plan covers:
- section 4.4 (the Analytics overview);
- 6.4 (`workspace_analytics`);
- 3.1 (Analytics in the sidebar and the phone tabs);
- 3.2 (`/analytics`);
- 9 (responsive and axe checks);
- section 8, Phase 4.

Template editing is David's request of 2026-10-18 ("yes I do"), after Phase 4a shipped without it.

## Global Constraints

- **Analytics overview** (spec 4.4):
  - a range control (7, 30 and 90 days, custom), scan totals and unique visitors, and a daily chart;
  - top codes, countries, devices, and CSV export;
  - workspace-scoped: the same viewers and editors as the codes;
  - backed by `workspace_analytics(p_owner uuid, p_from timestamptz, p_to timestamptz, p_tz text)`, modelled on `code_analytics`, with the same `can_view` check.
- **Navigation** (spec 3.1):
  - Analytics (new): scans across all codes in the workspace, placed after Codes in the sidebar;
  - phone bottom tabs: Codes, Analytics, a centered + (Create), Team, More.
- **`proxy.ts`:** session refresh extends to the new app routes (spec 3.2).
- **Every page** passes the responsive and axe checks at 390, 820 and 1280 px (spec 9). New controls have visible labels and 44 px targets on phones, with no sideways scroll from 320 px.
- **Migration:**
  - a verified backup from the last 24 hours, after checking the disk has room;
  - no backslashes;
  - applied through the private SQL bridge before merging;
  - recorded in the runbook.
- **Every commit is formatted:** run `npx prettier --write` on the files it touches. `$WS` is this plan's workspace from `sdd-workspace`; long test output goes there.

## Rulings made in this plan (for David's review)

1. **The page follows the workspace you're in,** as the codes list does: your codes, a teammate's, or Everyone. A teammate's private codes never count.
2. **The ranges are the same as a code's analytics** (7 days, 30 days, 90 days, 12 months, all time), **plus Custom** with From and To dates. "All time" starts at the workspace's first trackable code.
3. **What the page shows:**
   - the spec's top codes, countries and devices;
   - the four stat tiles from a code's analytics;
   - the daily chart;
   - a code in Top codes opens that code's analytics.

   Cities, operating systems, browsers and time of day stay on each code's own page.
4. **Unique visitors are counted across the whole workspace,** so one phone scanning two of your codes on the same day counts once. This matches how a single code counts per day.
5. **The CSV has one row per scan,** with its code's name and short link added, and is limited to a million rows as a code's CSV is.
6. **Editing a template changes only codes you make from now on.** Codes already made keep their design. The editor has the same name, "Use for new codes" and Save as New template.
7. **The migration needs a verified backup from the last 24 hours.** If there isn't one, I start the backup service myself before applying it; approving this plan approves that. I make no other server changes.

## Review Focus

1. **Scope:**
   - a teammate's private code;
   - a viewer looking at the owner's workspace;
   - an outsider passing someone else's id;
   - Everyone across several teammates;
   - a workspace with no trackable codes.

   Expected: private codes never counted; an outsider gets zeros, not an error; Everyone is the codes you can see. *Task 1 tests.*
2. **Custom ranges:**
   - From after To;
   - dates in the future;
   - a range crossing a daylight-saving change;
   - one day;
   - an empty date.

   Expected: a clear message instead of a request for impossible ranges; days counted in the viewer's zone; a future To cut to today. *Task 2 tests.*
3. **Big workspaces:**
   - Top codes with more than 20 codes;
   - a CSV across many codes, more than a page of 1,000;
   - code names with commas, quotes or formulas.

   Expected: the top 20 by scans, every scan in the CSV, and safe CSV fields. *Task 1 and Task 4 tests.*
4. **Editing a template:**
   - renaming it to blank;
   - editing the default;
   - turning "Use for new codes" off on the default;
   - editing a template deleted in another tab.

   Expected: blank refused; the default stays or clears as chosen; a deleted template gives a clear error. *Task 5 tests.*
5. **Phones at 320 px:** the range control with Custom open, the stat tiles and Top codes. Expected: no sideways scroll, 44 px targets, and axe clean. *Task 6 sweep.*

---

### Task 1: The migration: analytics and scans across a workspace

**Files:**
- Create: `supabase/migrations/20261018190000_workspace_analytics.sql`
- Test: `supabase/test/migration.test.ts` (a new `describe("workspace analytics")` at the end)

**Interfaces:**
- Produces:
  - `workspace_analytics(p_owner uuid, p_from timestamptz, p_to timestamptz, p_tz text default 'UTC') returns jsonb`. It has the keys `total`, `unique`, `daily`, `countries` and `devices`, shaped as in `code_analytics`, plus `codes`: up to 20 rows of `{ id, name, owner, scans, unique }`, ordered by scans, then name. A null `p_owner` means every code the caller can see.
  - `workspace_scans(p_owner uuid, p_from timestamptz, p_to timestamptz, p_before bigint default null, p_limit int default 1000)`. It returns a table of `id bigint, scanned_at timestamptz, code_name text, code_slug text, country text, region text, city text, device_type text, os text, browser text`, newest first, at most 1,000 rows per call.
  - Both are `security invoker`, for `authenticated` only.

- [ ] **Step 1: Write the failing tests.** Append to `supabase/test/migration.test.ts`:

```ts
describe("workspace analytics", () => {
  const FAY = "7c7c7c7c-7c7c-4c7c-8c7c-7c7c7c7c7c7c"; // owner
  const GUS = "7d7d7d7d-7d7d-4d7d-8d7d-7d7d7d7d7d7d"; // viewer on Fay's team
  const HAZ = "7e7e7e7e-7e7e-4e7e-8e7e-7e7e7e7e7e7e"; // outsider
  const by =
    (id: string) =>
    <T>(sql: string, params?: unknown[]) =>
      as<T>("authenticated", id, sql, params);
  const asFay = by(FAY);
  const asGus = by(GUS);
  const asHaz = by(HAZ);
  const ids = {} as Record<"menu" | "flyer" | "secret" | "gus", string>;
  const make = async (who: ReturnType<typeof by>, slug: string, isPrivate = false) =>
    (
      await who<{ id: string }>(
        `insert into public.qr_codes (name, qr_type, is_dynamic, slug, destination, content, is_private)
         values ($1, 'url', true, $2, 'https://example.com', '{"url":"https://example.com"}', $3)
         returning id`,
        [`${slug} code`, slug, isPrivate],
      )
    )[0]!.id;
  const scan = (code: string, at: string, visitor: string, country: string | null, device = "mobile") =>
    asService(
      "insert into public.scan_events (code_id, scanned_at, visitor_hash, country, device_type) values ($1, $2, $3, $4, $5)",
      [code, at, visitor, country, device],
    );
  const FROM = "2030-01-01T00:00:00Z";
  const TO = "2030-02-01T00:00:00Z";
  const stats = async (who: ReturnType<typeof by>, owner: string | null) =>
    (
      await who<{ s: Record<string, unknown> }>(
        "select public.workspace_analytics($1, $2, $3, 'America/New_York') as s",
        [owner, FROM, TO],
      )
    )[0]!.s as {
      total: number;
      unique: number;
      daily: { day: string; scans: number; unique: number }[];
      countries: { label: string; scans: number }[];
      devices: { label: string; scans: number }[];
      codes: { id: string; name: string; owner: string; scans: number; unique: number }[];
    };

  beforeAll(async () => {
    await db.query(
      `insert into auth.users (id, email) values
         ($1, 'fay@example.com'), ($2, 'gus@example.com'), ($3, 'haz@example.com')`,
      [FAY, GUS, HAZ],
    );
    await asService(
      "insert into public.team_members (owner_id, member_id, role) values ($1, $2, 'viewer')",
      [FAY, GUS],
    );
    ids.menu = await make(asFay, "FAYMENU");
    ids.flyer = await make(asFay, "FAYFLYER");
    ids.secret = await make(asFay, "FAYSECRET", true);
    ids.gus = await make(asGus, "GUSCARD");
    // 03:00 UTC on Jan 10 is still Jan 9 in New York.
    await scan(ids.menu, "2030-01-10T03:00:00Z", "v1", "US");
    await scan(ids.menu, "2030-01-10T15:00:00Z", "v1", "US");
    await scan(ids.flyer, "2030-01-10T16:00:00Z", "v1", "CA", "desktop");
    await scan(ids.flyer, "2030-01-11T16:00:00Z", "v2", null);
    await scan(ids.secret, "2030-01-12T16:00:00Z", "v3", "US");
    await scan(ids.gus, "2030-01-12T16:00:00Z", "v4", "GB");
    // Outside the range.
    await scan(ids.menu, "2029-12-31T12:00:00Z", "v9", "US");
  });

  it("sum a workspace's scans by day, country, device and code, in the viewer's zone", async () => {
    const s = await stats(asFay, FAY);
    expect(s.total).toBe(5);
    // v1 scanned two codes on Jan 10 (New York), but is one visitor that day.
    expect(s.daily).toEqual([
      { day: "2030-01-09", scans: 1, unique: 1 },
      { day: "2030-01-10", scans: 2, unique: 1 },
      { day: "2030-01-11", scans: 1, unique: 1 },
      { day: "2030-01-12", scans: 1, unique: 1 },
    ]);
    expect(s.unique).toBe(3);
    expect(s.countries).toEqual([
      { label: "US", scans: 3 },
      { label: "??", scans: 1 },
      { label: "CA", scans: 1 },
    ]);
    expect(s.devices).toEqual([
      { label: "mobile", scans: 4 },
      { label: "desktop", scans: 1 },
    ]);
    expect(s.codes.map((c) => [c.name, c.scans, c.unique, c.owner])).toEqual([
      ["FAYMENU code", 2, 1, FAY],
      ["FAYFLYER code", 2, 2, FAY],
      ["FAYSECRET code", 1, 1, FAY],
    ]);
  });

  it("follow the codes each person can see: no private codes for teammates, nothing for outsiders", async () => {
    const seen = await stats(asGus, FAY);
    expect(seen.total).toBe(4);
    expect(seen.codes.map((c) => c.name)).not.toContain("FAYSECRET code");
    const outsider = await stats(asHaz, FAY);
    expect(outsider).toMatchObject({ total: 0, unique: 0, daily: [], codes: [] });
    // Everyone: every code the viewer can see, their own included.
    const everyone = await stats(asGus, null);
    expect(everyone.total).toBe(5);
    expect(everyone.codes.map((c) => c.owner).sort()).toEqual([FAY, FAY, GUS].sort());
    await expect(
      asAnon("select public.workspace_analytics(null, now(), now())"),
    ).rejects.toThrow(/permission denied/);
  });

  it("list at most 20 top codes", async () => {
    for (let n = 0; n < 22; n++) {
      const id = await make(asFay, `FAYBULK${n}`);
      await scan(id, "2030-01-20T12:00:00Z", `b${n}`, null);
    }
    expect((await stats(asFay, FAY)).codes).toHaveLength(20);
  });

  it("page through every scan for the CSV, newest first", async () => {
    const page = (before: number | null, limit: number) =>
      asFay<{ id: number; code_name: string; code_slug: string; country: string | null }>(
        "select * from public.workspace_scans($1, $2, $3, $4, $5)",
        [FAY, FROM, TO, before, limit],
      );
    const first = await page(null, 10);
    expect(first).toHaveLength(10);
    expect(first[0]!.id).toBeGreaterThan(first[1]!.id);
    const rest = await page(first.at(-1)!.id, 1000);
    expect(first.length + rest.length).toBe(5 + 22);
    expect(rest.every((r) => r.id < first.at(-1)!.id)).toBe(true);
    expect(first.find((r) => r.code_slug === "FAYMENU")?.code_name).toBe("FAYMENU code");
    // Never more than 1,000 in one call, and teammates still don't see private codes.
    expect(await page(null, 5000)).toHaveLength(27);
    const gus = await asGus<{ code_slug: string }>(
      "select code_slug from public.workspace_scans($1, $2, $3)",
      [FAY, FROM, TO],
    );
    expect(gus.map((r) => r.code_slug)).not.toContain("FAYSECRET");
    await expect(
      asAnon("select * from public.workspace_scans(null, now(), now())"),
    ).rejects.toThrow(/permission denied/);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run supabase/test/migration.test.ts -t "workspace analytics"`
Expected: FAIL. `function public.workspace_analytics(...) does not exist`.

- [ ] **Step 3: Write the migration.** Create `supabase/migrations/20261018190000_workspace_analytics.sql`. It must contain no backslashes.

```sql
-- The Analytics overview (redesign Phase 4b, spec 4.4 and 6.4): scans across every code in a
-- workspace. Both functions run as the caller, so row-level security keeps them to the codes that
-- person can see: their own, and teammates' shared codes, never their private ones. A null owner
-- means every code the caller can see (the Everyone view).

create function public.workspace_analytics(
  p_owner uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_tz text default 'UTC'
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with codes as (
    select c.id, c.name, c.user_id
      from public.qr_codes c
     where p_owner is null or c.user_id = p_owner
  ),
  ev as (
    select e.*
      from public.scan_events e
     where e.code_id in (select id from codes)
       and e.scanned_at >= p_from
       and e.scanned_at < p_to
  ),
  daily as (
    select (scanned_at at time zone p_tz)::date as day,
           count(*) as scans,
           count(distinct visitor_hash) as visitors
      from ev
     group by 1
  ),
  top as (
    select code_id, count(*) as scans, count(distinct visitor_hash) as visitors
      from ev
     group by 1
  )
  select jsonb_build_object(
    'total', (select count(*) from ev),
    'unique', (select count(distinct visitor_hash) from ev),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'scans', scans, 'unique', visitors) order by day) from daily), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'scans', scans) order by scans desc, label)
                             from (select coalesce(country, '??') as label, count(*) as scans from ev group by 1 order by 2 desc, 1 limit 50) t), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'scans', scans) order by scans desc, label)
                           from (select device_type as label, count(*) as scans from ev group by 1) t), '[]'::jsonb),
    'codes', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'owner', t.owner, 'scans', t.scans, 'unique', t.visitors) order by t.scans desc, t.name)
                         from (select c.id, c.name, c.user_id as owner, top.scans, top.visitors
                                 from top join codes c on c.id = top.code_id
                                order by top.scans desc, c.name
                                limit 20) t), '[]'::jsonb)
  );
$$;

-- One page of a workspace's scans for its CSV, newest first: at most 1,000 at a time, before
-- the id given (none for the first page).
create function public.workspace_scans(
  p_owner uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_before bigint default null,
  p_limit int default 1000
)
returns table (
  id bigint,
  scanned_at timestamptz,
  code_name text,
  code_slug text,
  country text,
  region text,
  city text,
  device_type text,
  os text,
  browser text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.id, e.scanned_at, c.name, c.slug, e.country, e.region, e.city, e.device_type, e.os,
         e.browser
    from public.scan_events e
    join public.qr_codes c on c.id = e.code_id
   where (p_owner is null or c.user_id = p_owner)
     and e.scanned_at >= p_from
     and e.scanned_at < p_to
     and (p_before is null or e.id < p_before)
   order by e.id desc
   limit least(greatest(coalesce(p_limit, 1000), 1), 1000);
$$;

revoke all on function public.workspace_analytics(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.workspace_analytics(uuid, timestamptz, timestamptz, text) to authenticated;
revoke all on function public.workspace_scans(uuid, timestamptz, timestamptz, bigint, int) from public, anon;
grant execute on function public.workspace_scans(uuid, timestamptz, timestamptz, bigint, int) to authenticated;
```

- [ ] **Step 4: Run the tests to see them pass, and check for backslashes.**

Run: `npx vitest run supabase/test/migration.test.ts && ! grep -n '\\' supabase/migrations/20261018190000_workspace_analytics.sql`
Expected: every migration test passes, the earlier ones included, and grep finds no backslash.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20261018190000_workspace_analytics.sql supabase/test/migration.test.ts
git commit -m "Workspace analytics migration: totals, days, countries, devices, top codes and the CSV's scans"
```

---

### Task 2: Custom ranges, the workspace data, and the shared analytics parts

**Files:**
- Modify: `lib/analytics/shape.ts` (`customBounds`, `TopCode`, `WorkspaceAnalyticsData`, `parseWorkspaceAnalytics`), `lib/analytics/shape.test.ts`
- Create: `features/analytics/parts.tsx` (moved from `AnalyticsView.tsx`: `StatTile`, `DEVICE_LABELS`, `toItems`, `useViewerTimeZone`)
- Modify: `features/analytics/AnalyticsView.tsx` (imports them)
- Modify: `features/analytics/BreakdownList.tsx` (an item can link)
- Modify: `types/supabase.ts` (`Functions.workspace_analytics`, `Functions.workspace_scans`)

**Interfaces:**
- Produces:
  - `customBounds(fromDay: string, toDay: string, timeZone: string, now: Date): { from: Date; to: Date } | null`;
  - `interface TopCode { id: string; name: string; owner: string; scans: number; unique: number }`;
  - `type WorkspaceAnalyticsData = AnalyticsData & { codes: TopCode[] }`;
  - `parseWorkspaceAnalytics(raw: unknown): WorkspaceAnalyticsData`;
  - `BreakdownItem.href?: string`;
  - from `features/analytics/parts.tsx`: `StatTile`, `DEVICE_LABELS`, `toItems` and `useViewerTimeZone(): string | null`.

- [ ] **Step 1: Write the failing tests.** Append to `lib/analytics/shape.test.ts`, and add `customBounds` and `parseWorkspaceAnalytics` to its import from `./shape`:

```ts
describe("custom ranges", () => {
  const now = new Date("2030-03-15T12:00:00Z");

  it("are whole days in the viewer's zone, the end day included", () => {
    expect(customBounds("2030-03-01", "2030-03-02", "UTC", now)).toEqual({
      from: new Date("2030-03-01T00:00:00Z"),
      to: new Date("2030-03-03T00:00:00Z"),
    });
    // New York moves its clocks on March 10, 2030.
    expect(customBounds("2030-03-09", "2030-03-10", "America/New_York", now)).toEqual({
      from: new Date("2030-03-09T05:00:00Z"),
      to: new Date("2030-03-11T04:00:00Z"),
    });
    expect(customBounds("2030-03-05", "2030-03-05", "UTC", now)).toEqual({
      from: new Date("2030-03-05T00:00:00Z"),
      to: new Date("2030-03-06T00:00:00Z"),
    });
  });

  it("cut an end in the future to today, and refuse what isn't a range", () => {
    expect(customBounds("2030-03-14", "2030-04-01", "UTC", now)?.to).toEqual(
      new Date("2030-03-16T00:00:00Z"),
    );
    expect(customBounds("2030-03-10", "2030-03-01", "UTC", now)).toBeNull();
    expect(customBounds("2030-04-01", "2030-04-02", "UTC", now)).toBeNull();
    expect(customBounds("", "2030-03-01", "UTC", now)).toBeNull();
    expect(customBounds("2030-02-30", "2030-03-01", "UTC", now)).toBeNull();
  });
});

describe("workspace analytics data", () => {
  it("reads the totals like a code's, plus its top codes", () => {
    const data = parseWorkspaceAnalytics({
      total: 3,
      unique: 2,
      daily: [{ day: "2030-01-10", scans: 3, unique: 2 }],
      countries: [{ label: "US", scans: 3 }],
      devices: [{ label: "mobile", scans: 3 }],
      codes: [{ id: "c1", name: "Menu", owner: "u1", scans: "3", unique: 2 }, { name: "no id" }],
    });
    expect(data.total).toBe(3);
    expect(data.codes).toEqual([{ id: "c1", name: "Menu", owner: "u1", scans: 3, unique: 2 }]);
    expect(parseWorkspaceAnalytics(null)).toMatchObject({ total: 0, codes: [] });
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run lib/analytics`
Expected: FAIL. `customBounds` and `parseWorkspaceAnalytics` aren't exported.

- [ ] **Step 3: Add them to `lib/analytics/shape.ts`,** after `fillDays`:

```ts
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar day: "2030-02-30" isn't one. */
const isDay = (day: string) =>
  DAY.test(day) && new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day;

/**
 * [from, to) for a custom range of whole days chosen in the viewer's time zone, the end day
 * included. An end after today is cut to today. Null when it isn't a range: a missing or impossible
 * day, a start after the end, or a start in the future.
 */
export function customBounds(
  fromDay: string,
  toDay: string,
  timeZone: string,
  now: Date,
): { from: Date; to: Date } | null {
  if (!isDay(fromDay) || !isDay(toDay) || fromDay > toDay) return null;
  const today = dayInZone(now, timeZone);
  if (fromDay > today) return null;
  const last = toDay > today ? today : toDay;
  return {
    from: startOfDayInZone(fromDay, timeZone),
    to: startOfDayInZone(addDays(last, 1), timeZone),
  };
}

export interface TopCode {
  id: string;
  name: string;
  /** Whose code it is: a teammate's opens inside their workspace. */
  owner: string;
  scans: number;
  unique: number;
}

export type WorkspaceAnalyticsData = AnalyticsData & { codes: TopCode[] };

/** workspace_analytics() output: a code's totals and breakdowns, plus its top codes. */
export function parseWorkspaceAnalytics(raw: unknown): WorkspaceAnalyticsData {
  const base = parseAnalytics(raw);
  const list = raw && typeof raw === "object" ? (raw as { codes?: unknown }).codes : null;
  const codes = Array.isArray(list)
    ? list
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .filter((c) => typeof c.id === "string" && typeof c.name === "string")
        .map((c) => ({
          id: String(c.id),
          name: String(c.name),
          owner: String(c.owner ?? ""),
          scans: Number(c.scans ?? 0),
          unique: Number(c.unique ?? 0),
        }))
    : [];
  return { ...base, codes };
}
```

(`parseAnalytics` is declared further down the file. Function declarations are hoisted, so calling it here is fine.)

- [ ] **Step 4: Move the shared view parts.** Create `features/analytics/parts.tsx`, moving `StatTile`, `DEVICE_LABELS`, `toItems` and the time-zone reading out of `AnalyticsView.tsx` unchanged:

```tsx
"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import type { Breakdown } from "@/lib/analytics/shape";

import type { BreakdownItem } from "./BreakdownList";

export const DEVICE_LABELS: Record<string, string> = {
  mobile: "Phone",
  tablet: "Tablet",
  desktop: "Computer",
  other: "Other",
};

const noSubscribe = () => () => {};

function viewerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * The viewer's time zone. The server can't know it, so it renders without one (null) and the
 * browser fills it in after hydration.
 */
export function useViewerTimeZone(): string | null {
  return useSyncExternalStore(noSubscribe, viewerTimeZone, () => null);
}

export const toItems = (
  rows: Breakdown[],
  map: (row: Breakdown) => Omit<BreakdownItem, "scans">,
): BreakdownItem[] => rows.map((row) => ({ ...map(row), scans: Number(row.scans) }));

export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-card border border-border bg-surface px-4 py-3.5 shadow-card">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="truncate font-display text-2xl font-bold tracking-tight text-fg tabular-nums">
        {value}
      </span>
      {detail && <span className="truncate text-xs text-fg-muted">{detail}</span>}
    </div>
  );
}
```

In `features/analytics/AnalyticsView.tsx`:
1. Delete `DEVICE_LABELS`, `noSubscribe`, `viewerTimeZone`, `toItems` and `StatTile`.
2. Import them with `import { DEVICE_LABELS, StatTile, toItems, useViewerTimeZone } from "./parts";`.
3. Replace `const timeZone = useSyncExternalStore(noSubscribe, viewerTimeZone, () => null);` with `const timeZone = useViewerTimeZone();`.
4. Drop `useSyncExternalStore` and `ReactNode` from its React import if nothing else uses them.

In `features/analytics/BreakdownList.tsx`:
1. Add `href?: string;` to `BreakdownItem`, with the comment `/** Opens this item, e.g. a code's own analytics. */`.
2. Where the label renders (`<span className="min-w-0 truncate text-fg">…</span>`), render a `next/link` `Link` with the same class plus `underline-offset-4 hover:underline` when `item.href` is set.

- [ ] **Step 5: Add the types.** In `types/supabase.ts` `Functions`, after `rsvp_guests`:

```ts
      workspace_analytics: {
        Args: { p_owner: string | null; p_from: string; p_to: string; p_tz?: string };
        Returns: Json;
      };
      workspace_scans: {
        Args: {
          p_owner: string | null;
          p_from: string;
          p_to: string;
          p_before?: number | null;
          p_limit?: number;
        };
        Returns: {
          id: number;
          scanned_at: string;
          code_name: string;
          code_slug: string | null;
          country: string | null;
          region: string | null;
          city: string | null;
          device_type: string;
          os: string | null;
          browser: string | null;
        }[];
      };
```

- [ ] **Step 6: Run the tests, lint and the type check.**

Run: `npx vitest run lib/analytics features/analytics && npm run lint && npm run typecheck`
Expected: all pass, the existing analytics tests included, and lint and the type check are clean.

- [ ] **Step 7: Commit.**

```bash
git add lib/analytics features/analytics types/supabase.ts
git commit -m "Custom date ranges, workspace analytics data, and analytics parts shared by both views"
```

---

### Task 3: The Analytics page

**Files:**
- Create: `features/analytics/WorkspaceAnalytics.tsx`, `features/analytics/WorkspaceAnalytics.test.tsx`
- Create: `app/(app)/analytics/page.tsx`

**Interfaces:**
- Consumes: Task 1's `workspace_analytics`, and Task 2's `customBounds`, `parseWorkspaceAnalytics`, `StatTile`, `toItems`, `useViewerTimeZone` and `DEVICE_LABELS`.
- Produces: `WorkspaceAnalytics({ owner, meId, title, description, since, hasCodes })`, where:
  - `owner: string | null` is null for Everyone;
  - `since: string` is the ISO time "All time" starts from.

- [ ] **Step 1: Write the failing tests.** Create `features/analytics/WorkspaceAnalytics.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceAnalytics } from "./WorkspaceAnalytics";

const rpc = vi.fn(async (_name: string, _args: Record<string, unknown>) => ({
  data: {
    total: 5,
    unique: 3,
    daily: [{ day: "2030-01-10", scans: 5, unique: 3 }],
    countries: [{ label: "US", scans: 5 }],
    devices: [{ label: "mobile", scans: 5 }],
    codes: [
      { id: "c1", name: "Spring menu", owner: "me", scans: 3, unique: 2 },
      { id: "c2", name: "Cafe flyer", owner: "pat", scans: 2, unique: 1 },
    ],
  },
  error: null,
}));
vi.mock("@/lib/supabase/client", () => ({ getBrowserSupabase: () => ({ rpc }) }));

const show = (props: Partial<Parameters<typeof WorkspaceAnalytics>[0]> = {}) =>
  render(
    <WorkspaceAnalytics
      owner="me"
      meId="me"
      title="Analytics"
      description="Scans across all your codes."
      since="2030-01-01T00:00:00Z"
      hasCodes
      {...props}
    />,
  );

describe("WorkspaceAnalytics", () => {
  beforeEach(() => rpc.mockClear());
  afterEach(() => vi.useRealTimers());

  it("shows the workspace's totals and top codes, each opening its own analytics", async () => {
    show();
    expect(await screen.findByText("Spring menu")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith(
      "workspace_analytics",
      expect.objectContaining({ p_owner: "me" }),
    );
    const scans = within(screen.getByText("Scans").parentElement!);
    expect(scans.getByText("5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Spring menu" })).toHaveAttribute(
      "href",
      "/codes/c1/analytics",
    );
    // A teammate's code opens inside their workspace.
    expect(screen.getByRole("link", { name: "Cafe flyer" })).toHaveAttribute(
      "href",
      "/codes/c2/analytics?workspace=pat",
    );
    expect(screen.getByRole("link", { name: /CSV/ }).getAttribute("href")).toMatch(
      /^\/analytics\/export\?range=30d&tz=.+&workspace=me$/,
    );
  });

  it("asks Everyone for every code the viewer can see", async () => {
    show({ owner: null });
    await screen.findByText("Spring menu");
    expect(rpc).toHaveBeenCalledWith(
      "workspace_analytics",
      expect.objectContaining({ p_owner: null }),
    );
    expect(screen.getByRole("link", { name: /CSV/ }).getAttribute("href")).toMatch(/&view=everyone$/);
  });

  it("takes a custom range of days, and says when it isn't one", async () => {
    // A clock after the days picked, so they're in the past.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-03-01T12:00:00Z"));
    const user = userEvent.setup();
    show();
    await screen.findByText("Spring menu");
    await user.click(screen.getByRole("radio", { name: "Custom dates" }));
    const from = screen.getByLabelText("From");
    const to = screen.getByLabelText("To");
    // Date boxes take a whole value at once.
    fireEvent.change(from, { target: { value: "2030-01-10" } });
    fireEvent.change(to, { target: { value: "2030-01-05" } });
    expect(await screen.findByText("Pick a start on or before the end.")).toBeInTheDocument();
    const calls = rpc.mock.calls.length;
    fireEvent.change(to, { target: { value: "2030-01-12" } });
    await vi.waitFor(() => expect(rpc.mock.calls.length).toBeGreaterThan(calls));
    expect(rpc.mock.lastCall![1]).toMatchObject({ p_owner: "me" });
    expect(screen.getByRole("link", { name: /CSV/ }).getAttribute("href")).toMatch(
      /range=custom&tz=[^&]+&from=2030-01-10&to=2030-01-12/,
    );
  });

  it("points to Create when the workspace has no trackable codes", () => {
    show({ hasCodes: false });
    expect(screen.getByText("No trackable codes yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create a trackable code/ })).toHaveAttribute(
      "href",
      "/codes/new?type=url",
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/analytics/WorkspaceAnalytics.test.tsx`
Expected: FAIL. `./WorkspaceAnalytics` can't be found.

- [ ] **Step 3: Write `features/analytics/WorkspaceAnalytics.tsx`.**

```tsx
"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import { withWorkspace } from "@/components/app/nav";
import { buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatCount } from "@/features/dashboard/format";
import {
  RANGES,
  countryFlag,
  countryName,
  customBounds,
  dayInZone,
  fillDays,
  groupByWeek,
  parseWorkspaceAnalytics,
  rangeBounds,
  type RangeKey,
  type WorkspaceAnalyticsData,
} from "@/lib/analytics/shape";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { BreakdownList } from "./BreakdownList";
import { DailyChart } from "./DailyChart";
import { DEVICE_LABELS, StatTile, toItems, useViewerTimeZone } from "./parts";

type Range = RangeKey | "custom";

const RANGE_OPTIONS: { value: Range; label: string; ariaLabel: string }[] = [
  ...RANGES.map((r) => ({
    value: r.value as Range,
    label: r.value === "all" ? "All" : r.value.toUpperCase(),
    ariaLabel: r.label,
  })),
  { value: "custom", label: "Custom", ariaLabel: "Custom dates" },
];

type Result = { key: string; data: WorkspaceAnalyticsData } | { key: string; error: string };

/**
 * Scans across every code in a workspace (redesign spec 4.4): yours, a teammate's, or everyone's
 * you can see (owner null). Row-level security keeps teammates' private codes out.
 */
export function WorkspaceAnalytics({
  owner,
  meId,
  title,
  description,
  since,
  hasCodes,
}: {
  owner: string | null;
  meId: string;
  title: string;
  description: string;
  /** When "All time" starts: the workspace's first trackable code. */
  since: string;
  hasCodes: boolean;
}) {
  const fromId = useId();
  const toId = useId();
  const timeZone = useViewerTimeZone();
  const [now] = useState(() => new Date());
  const [range, setRange] = useState<Range>("30d");
  const [fromDay, setFromDay] = useState(() =>
    dayInZone(new Date(now.getTime() - 29 * 86_400_000), "UTC"),
  );
  const [toDay, setToDay] = useState(() => dayInZone(now, "UTC"));
  const [result, setResult] = useState<Result | null>(null);

  const bounds = useMemo(() => {
    const zone = timeZone ?? "UTC";
    return range === "custom"
      ? customBounds(fromDay, toDay, zone, now)
      : rangeBounds(range, now, new Date(since), zone);
  }, [range, fromDay, toDay, now, since, timeZone]);
  const requestKey = `${range}|${fromDay}|${toDay}|${timeZone}`;

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !timeZone || !bounds || !hasCodes) return;
    let cancelled = false;
    void supabase
      .rpc("workspace_analytics", {
        p_owner: owner,
        p_from: bounds.from.toISOString(),
        p_to: bounds.to.toISOString(),
        p_tz: timeZone,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        setResult(
          error
            ? {
                key: requestKey,
                error: "Couldn't load analytics. Check your connection and try again.",
              }
            : { key: requestKey, data: parseWorkspaceAnalytics(data) },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [owner, bounds, timeZone, hasCodes, requestKey]);

  const loading = hasCodes && bounds !== null && result?.key !== requestKey;
  const data = result && "data" in result && result.key === requestKey ? result.data : null;
  const error = !loading && result && "error" in result ? result.error : null;

  const weekly = bounds ? bounds.to.getTime() - bounds.from.getTime() > 120 * 86_400_000 : false;
  const points = useMemo(() => {
    if (!data || !bounds) return [];
    const days = fillDays(data.daily, bounds.from, bounds.to, timeZone ?? "UTC");
    return weekly ? groupByWeek(days) : days;
  }, [data, bounds, timeZone, weekly]);
  const busiest = data?.daily.reduce<{ day: string; scans: number } | null>(
    (best, d) => (d.scans > (best?.scans ?? 0) ? d : best),
    null,
  );
  const topCountry = data?.countries.find((c) => c.label !== "??");

  const exportParams = new URLSearchParams({ range, tz: timeZone ?? "UTC" });
  if (range === "custom") {
    exportParams.set("from", fromDay);
    exportParams.set("to", toDay);
  }
  if (owner) exportParams.set("workspace", owner);
  else exportParams.set("view", "everyone");
  const exportHref = `/analytics/export?${exportParams.toString()}`;
  const rangeLabel =
    range === "custom"
      ? "Chosen dates"
      : `Last ${RANGES.find((r) => r.value === range)?.label.toLowerCase()}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-fg">{title}</h1>
          <p className="mt-1 text-sm text-fg-muted">{description}</p>
        </div>
        {hasCodes && (
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              aria-label="Date range"
              size="touch"
              value={range}
              onChange={setRange}
              options={RANGE_OPTIONS}
              className="min-w-0 flex-1 sm:flex-none"
            />
            <a href={exportHref} download className={buttonClasses("outline", "md")}>
              <Download aria-hidden /> CSV
            </a>
          </div>
        )}
      </div>

      {hasCodes && range === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={fromId} className="text-sm font-medium text-fg">
              From
            </label>
            <TextInput
              id={fromId}
              type="date"
              value={fromDay}
              max={toDay}
              onChange={(event) => setFromDay(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={toId} className="text-sm font-medium text-fg">
              To
            </label>
            <TextInput
              id={toId}
              type="date"
              value={toDay}
              min={fromDay}
              onChange={(event) => setToDay(event.target.value)}
            />
          </div>
          {!bounds && (
            <p role="alert" className="pb-2.5 text-sm text-danger">
              Pick a start on or before the end.
            </p>
          )}
        </div>
      )}

      {!hasCodes ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <h2 className="font-display text-lg font-bold text-fg">No trackable codes yet</h2>
          <p className="max-w-md text-sm text-fg-muted">
            Analytics counts scans of trackable codes and hosted pages. Static codes encode their
            content directly, so their scans never reach Ziplume.
          </p>
          <Link href="/codes/new?type=url" className={buttonClasses("primary", "md")}>
            Create a trackable code
          </Link>
        </Card>
      ) : (
        <>
          {error && (
            <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}
          <div
            className="flex flex-col gap-6 transition-opacity aria-busy:opacity-60"
            aria-busy={loading}
            aria-live="polite"
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Scans" value={data ? formatCount(data.total) : "–"} detail={rangeLabel} />
              <StatTile
                label="Unique visitors"
                value={data ? formatCount(data.unique) : "–"}
                detail={
                  data && data.total > 0
                    ? `${(data.total / Math.max(data.unique, 1)).toFixed(1)} scans per visitor`
                    : undefined
                }
              />
              <StatTile
                label="Busiest day"
                value={
                  busiest
                    ? new Date(`${busiest.day}T12:00:00Z`).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })
                    : "–"
                }
                detail={busiest ? `${formatCount(busiest.scans)} scans` : undefined}
              />
              <StatTile
                label="Top country"
                value={
                  topCountry ? (
                    <span>
                      {countryFlag(topCountry.label)} {topCountry.label}
                    </span>
                  ) : (
                    "–"
                  )
                }
                detail={topCountry ? countryName(topCountry.label) : undefined}
              />
            </div>

            {data && data.total === 0 ? (
              <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <h2 className="font-display text-lg font-bold text-fg">No scans in this range yet</h2>
                <p className="max-w-md text-sm text-fg-muted">Try a longer date range.</p>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader
                    title={weekly ? "Scans per week" : "Scans per day"}
                    description={
                      timeZone ? `Times shown in ${timeZone.replace(/_/g, " ")}.` : undefined
                    }
                  />
                  <div className="px-5 pt-4 pb-6 sm:px-6">
                    {data ? <DailyChart points={points} weekly={weekly} /> : <div className="h-56" />}
                  </div>
                </Card>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="lg:col-span-2">
                    <CardHeader title="Top codes" description="The 20 most scanned in this range." />
                    <div className="px-5 pt-4 pb-6 sm:px-6">
                      <BreakdownList
                        total={data?.total ?? 0}
                        empty="No scans yet."
                        items={(data?.codes ?? []).map((c) => ({
                          key: c.id,
                          label: c.name,
                          scans: c.scans,
                          href: withWorkspace(
                            `/codes/${c.id}/analytics`,
                            c.owner && c.owner !== meId ? c.owner : null,
                          ),
                        }))}
                      />
                    </div>
                  </Card>
                  <Card>
                    <CardHeader title="Countries" />
                    <div className="px-5 pt-4 pb-6 sm:px-6">
                      <BreakdownList
                        total={data?.total ?? 0}
                        empty="No location data yet."
                        items={toItems(data?.countries ?? [], (c) => ({
                          key: c.label,
                          label: countryName(c.label),
                          icon: countryFlag(c.label),
                        }))}
                      />
                    </div>
                  </Card>
                  <Card>
                    <CardHeader title="Devices" />
                    <div className="px-5 pt-4 pb-6 sm:px-6">
                      <BreakdownList
                        total={data?.total ?? 0}
                        empty="No scans yet."
                        items={toItems(data?.devices ?? [], (d) => ({
                          key: d.label,
                          label: DEVICE_LABELS[d.label] ?? d.label,
                        }))}
                      />
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <p className="text-sm text-fg-muted">
        Scans from link previewers and bots aren’t counted. Unique visitors are counted per day
        across these codes, without storing IP addresses.
      </p>
    </div>
  );
}
```

If the `SegmentedControl`'s six options don't fit at 320 px, record a ruling and give it `className="w-full"` on phones, so it wraps under the title. The range default for "From" uses UTC days only until the viewer picks dates: both boxes start at the last 30 days, and the zone matters only once Custom is chosen.

- [ ] **Step 4: Write the route,** `app/(app)/analytics/page.tsx`:

```tsx
import type { Metadata } from "next";

import { WorkspaceAnalytics } from "@/features/analytics/WorkspaceAnalytics";
import { requireUser } from "@/lib/auth/server";
import { codesScope, personLabel } from "@/lib/teams/access";
import { loadTeam } from "@/lib/teams/server";

export const metadata: Metadata = { title: "Analytics" };

/** Scans across a workspace's codes, scoped like the codes list (spec 4.4). */
export default async function AnalyticsRoute({ searchParams }: PageProps<"/analytics">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const view = typeof params.view === "string" ? params.view : null;
  const { supabase, user } = await requireUser(
    requested
      ? `/analytics?workspace=${requested}`
      : view === "everyone"
        ? "/analytics?view=everyone"
        : "/analytics",
  );
  const team = await loadTeam(supabase);
  const scope = codesScope(team, user.id, { workspace: requested, view });
  const owner =
    scope.kind === "everyone" ? null : scope.kind === "person" ? scope.person.userId : user.id;

  // The first trackable code anyone here can see starts "All time".
  let first = supabase
    .from("qr_codes")
    .select("created_at")
    .eq("is_dynamic", true)
    .order("created_at", { ascending: true })
    .limit(1);
  if (owner) first = first.eq("user_id", owner);
  const { data: firstCode } = await first.maybeSingle();

  const description =
    scope.kind === "everyone"
      ? "Scans across every code you can see."
      : scope.kind === "person"
        ? `Scans across ${personLabel(scope.person)}’s codes.`
        : "Scans across all your codes.";
  return (
    <WorkspaceAnalytics
      owner={owner}
      meId={user.id}
      title="Analytics"
      description={description}
      since={firstCode?.created_at ?? new Date().toISOString()}
      hasCodes={Boolean(firstCode)}
    />
  );
}
```

- [ ] **Step 5: Run the tests, lint and the type check.**

Run: `npx vitest run features/analytics lib/analytics && npm run lint && npm run typecheck`
Expected: all pass, and lint and the type check are clean.

- [ ] **Step 6: Commit.**

```bash
git add features/analytics "app/(app)/analytics/page.tsx"
git commit -m "Analytics overview: a workspace's scans by day, top codes, countries and devices"
```

---

### Task 4: The CSV export, and Analytics in the navigation

**Files:**
- Create: `app/(app)/analytics/export/route.ts`, `app/(app)/analytics/export/route.test.ts`
- Modify: `components/app/AppShell.tsx`, `components/app/AppShell.test.tsx`
- Modify: `proxy.ts`, `proxy.test.ts`

**Interfaces:**
- Consumes: Task 1's `workspace_scans`, `customBounds`, `rangeBounds` and `csvField`.
- Produces: `GET /analytics/export?range&tz[&from&to][&workspace|&view=everyone]`, which returns a CSV.

- [ ] **Step 1: Write the failing tests.**

Create `app/(app)/analytics/export/route.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Env from "@/lib/env";

const pages: unknown[][] = [];
// The signed-in person owns a team, so Everyone is a real scope.
const team = [
  { user_id: "me", email: "me@example.com", name: "Me", avatar_url: null, role: "owner", is_me: true },
  { user_id: "pat", email: "pat@example.com", name: "Pat", avatar_url: null, role: "editor", is_me: false },
];
const rpc = vi.fn(async (name: string, _args: Record<string, unknown>) => {
  if (name === "my_team") return { data: team, error: null };
  return { data: pages.shift() ?? [], error: null };
});
const firstCode = { created_at: "2030-01-01T00:00:00Z" };
const chain: Record<string, unknown> = {};
for (const m of ["select", "eq", "order", "limit"]) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: firstCode, error: null });
vi.mock("@/lib/auth/server", () => ({
  getAuthState: async () => ({
    supabase: { rpc, from: () => chain },
    user: { id: "me" },
    needsMfa: false,
  }),
}));
vi.mock("@/lib/env", async (original) => ({
  ...(await original<typeof Env>()),
  accountsEnabled: true,
}));

import { GET } from "./route";

const get = (query: string) =>
  GET(new Request(`https://ziplume.com/analytics/export?${query}`) as never);
const row = (id: number, name: string) => ({
  id,
  scanned_at: "2030-01-10T15:00:00Z",
  code_name: name,
  code_slug: "MENU12",
  country: "US",
  region: null,
  city: "Austin",
  device_type: "mobile",
  os: "iOS",
  browser: "Safari",
});

describe("GET /analytics/export", () => {
  beforeEach(() => {
    pages.length = 0;
    rpc.mockClear();
  });

  it("streams every page of the workspace's scans, with each code's name and link", async () => {
    pages.push(
      Array.from({ length: 1000 }, (_, i) => row(5000 - i, "Spring menu")),
      [row(10, "=SUM(A1)"), row(9, 'Cafe, "flyer"')],
    );
    const response = await get("range=30d&tz=UTC");
    expect(response.headers.get("content-type")).toMatch(/text\/csv/);
    const lines = (await response.text()).trim().split("\r\n");
    expect(lines[0]).toBe(
      "scanned_at_utc,local_date,local_time,code,short_link,country,region,city,device,os,browser",
    );
    expect(lines).toHaveLength(1 + 1002);
    expect(lines.at(-2)).toContain("'=SUM(A1)");
    expect(lines.at(-1)).toContain('"Cafe, ""flyer"""');
    const scanCalls = rpc.mock.calls.filter(([name]) => name === "workspace_scans");
    expect(scanCalls[0]![1]).toMatchObject({ p_owner: "me", p_before: null });
    expect(scanCalls[1]![1]).toMatchObject({ p_before: 4001 });
  });

  it("uses Everyone and a custom range when asked, and refuses an impossible range", async () => {
    await (await get("view=everyone&range=custom&from=2030-01-05&to=2030-01-06&tz=UTC")).text();
    expect(rpc.mock.calls.find(([name]) => name === "workspace_scans")![1]).toMatchObject({
      p_owner: null,
      p_from: "2030-01-05T00:00:00.000Z",
      p_to: "2030-01-07T00:00:00.000Z",
    });
    expect((await get("range=custom&from=2030-01-09&to=2030-01-01&tz=UTC")).status).toBe(400);
  });
});
```

Append to `proxy.test.ts`'s "refreshes the session on app pages" list: add `"/analytics"`, and raise the expected count by one.

Append to `components/app/AppShell.test.tsx`:

```tsx
describe("Analytics in the navigation", () => {
  it("is in the sidebar and the phone's tabs", () => {
    renderShell();
    const sidebar = within(screen.getByRole("complementary", { name: "Sidebar" }));
    expect(sidebar.getByRole("link", { name: "Analytics" })).toHaveAttribute("href", "/analytics");
    const tabs = screen
      .getAllByRole("navigation", { name: "Main" })
      .find((nav) => nav.hasAttribute("data-tabbar"))!;
    expect(within(tabs).getByRole("link", { name: "Analytics" })).toHaveAttribute(
      "href",
      "/analytics",
    );
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run "app/(app)/analytics" proxy.test.ts components/app/AppShell.test.tsx`
Expected: FAIL. `./route` can't be found, `/analytics` isn't refreshed, and there's no Analytics link.

- [ ] **Step 3: Write the route,** `app/(app)/analytics/export/route.ts`:

```ts
import type { NextRequest } from "next/server";

import {
  RANGES,
  csvField,
  customBounds,
  dayInZone,
  rangeBounds,
  type RangeKey,
} from "@/lib/analytics/shape";
import { getAuthState } from "@/lib/auth/server";
import { accountsEnabled, shortLink } from "@/lib/env";
import { codesScope } from "@/lib/teams/access";
import { loadTeam } from "@/lib/teams/server";

export const dynamic = "force-dynamic";

const PAGE = 1000;
const MAX_ROWS = 1_000_000;
const COLUMNS = [
  "scanned_at_utc",
  "local_date",
  "local_time",
  "code",
  "short_link",
  "country",
  "region",
  "city",
  "device",
  "os",
  "browser",
];

function validTimeZone(tz: string | null): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

const text = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });

/**
 * Downloads a workspace's scans as CSV, scoped like the Analytics page. Row-level security keeps
 * them to the codes the person can see.
 */
export async function GET(request: NextRequest) {
  if (!accountsEnabled) return text("Not found", 404);
  const { supabase, user, needsMfa } = await getAuthState();
  if (!user || needsMfa) return text("Sign in to download analytics.", 401);

  const search = request.nextUrl.searchParams;
  const team = await loadTeam(supabase);
  const scope = codesScope(team, user.id, {
    workspace: search.get("workspace"),
    view: search.get("view"),
  });
  const owner =
    scope.kind === "everyone" ? null : scope.kind === "person" ? scope.person.userId : user.id;
  const timeZone = validTimeZone(search.get("tz"));
  const now = new Date();
  const rangeParam = search.get("range");

  let bounds: { from: Date; to: Date } | null;
  if (rangeParam === "custom") {
    bounds = customBounds(search.get("from") ?? "", search.get("to") ?? "", timeZone, now);
    if (!bounds) return text("Pick a start on or before the end.", 400);
  } else {
    const range: RangeKey = RANGES.some((r) => r.value === rangeParam)
      ? (rangeParam as RangeKey)
      : "all";
    let first = supabase
      .from("qr_codes")
      .select("created_at")
      .eq("is_dynamic", true)
      .order("created_at", { ascending: true })
      .limit(1);
    if (owner) first = first.eq("user_id", owner);
    const { data: firstCode } = await first.maybeSingle();
    bounds = rangeBounds(range, now, new Date(firstCode?.created_at ?? now.toISOString()), timeZone);
  }
  const { from, to } = bounds;

  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`${COLUMNS.join(",")}\r\n`));
      let before: number | null = null;
      let sent = 0;
      try {
        while (sent < MAX_ROWS) {
          const { data, error } = await supabase.rpc("workspace_scans", {
            p_owner: owner,
            p_from: from.toISOString(),
            p_to: to.toISOString(),
            p_before: before,
            p_limit: PAGE,
          });
          if (error) throw new Error(error.message);
          if (!data?.length) break;
          const lines = data.map((row) => {
            const at = new Date(row.scanned_at);
            return [
              at.toISOString(),
              localDate.format(at),
              localTime.format(at),
              row.code_name,
              row.code_slug ? shortLink(row.code_slug) : "",
              row.country,
              row.region,
              row.city,
              row.device_type,
              row.os,
              row.browser,
            ]
              .map(csvField)
              .join(",");
          });
          controller.enqueue(encoder.encode(`${lines.join("\r\n")}\r\n`));
          sent += data.length;
          before = data.at(-1)!.id;
          if (data.length < PAGE) break;
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  const filename = `ziplume-scans-${rangeParam === "custom" ? "custom" : (rangeParam ?? "all")}-${dayInZone(now, timeZone)}.csv`;
  return new Response(stream, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
```

- [ ] **Step 4: Analytics in the navigation and the session refresh.**

In `components/app/AppShell.tsx`:
1. Import `BarChart3` from `lucide-react`.
2. Next to `codesHref`, add `const analyticsHref = everyone ? "/analytics?view=everyone" : withWorkspace("/analytics", ownerId);`.
3. Make `main` start with Codes, then `{ href: analyticsHref, label: "Analytics", icon: BarChart3 }`, then Templates, Team and Settings.
4. In the phone tab bar, change `"grid-cols-4"` to `"grid-cols-5"`, and add an Analytics link after Codes:

```tsx
          <Link
            href={analyticsHref}
            aria-current={isCurrent(pathname, analyticsHref) ? "page" : undefined}
            className={tabClass}
          >
            <BarChart3 aria-hidden /> Analytics
          </Link>
```

If an existing AppShell test counts the sidebar links or the tab bar's columns, update it with a ruling.

In `proxy.ts`, add `analytics` to `SESSION_PATHS`: `codes|analytics|templates|team|settings|account`.

- [ ] **Step 5: Run the tests, lint and the type check.**

Run: `npx vitest run "app/(app)/analytics" proxy.test.ts components/app && npm run lint && npm run typecheck`
Expected: all pass, and lint and the type check are clean.

- [ ] **Step 6: Commit.**

```bash
git add "app/(app)/analytics/export" components/app proxy.ts proxy.test.ts
git commit -m "Analytics CSV for a workspace, and Analytics in the sidebar and the phone tabs"
```

---

### Task 5: Edit a saved template

**Files:**
- Modify: `features/templates/api.ts` (`updateTemplate`), `features/templates/api.test.ts`
- Rename: `features/templates/NewTemplatePage.tsx` → `features/templates/TemplateEditor.tsx`, and its test, with `git mv`
- Modify: `app/(app)/templates/new/page.tsx`
- Create: `app/(app)/templates/[id]/edit/page.tsx`
- Modify: `features/templates/TemplatesPage.tsx` (an Edit menu item), `features/templates/TemplatesPage.test.tsx`

**Interfaces:**
- Consumes: Task 4a's `saveTemplate`, `setDefaultTemplate` and `designForStorage`.
- Produces:
  - `updateTemplate(id: string, name: string, design: DesignState): Promise<Result<DesignTemplateRow> & { droppedLogo?: boolean }>`;
  - `TemplateEditor({ template }: { template?: DesignTemplateRow })`.

- [ ] **Step 1: Rename the editor.**

```bash
git mv features/templates/NewTemplatePage.tsx features/templates/TemplateEditor.tsx
git mv features/templates/NewTemplatePage.test.tsx features/templates/TemplateEditor.test.tsx
```

In the moved test:
1. Change the import to `import { TemplateEditor } from "./TemplateEditor";`.
2. Change `<NewTemplatePage />` to `<TemplateEditor />`.
3. Rename `describe("NewTemplatePage"` to `describe("TemplateEditor, new"`.

In `app/(app)/templates/new/page.tsx`, import and render `TemplateEditor` instead of `NewTemplatePage`.

- [ ] **Step 2: Write the failing tests.**

Append to `features/templates/api.test.ts`, adding `updateTemplate` to its import:

```ts
  it("saves an edited template's name and design", async () => {
    expect((await updateTemplate("t1", "  Brand  ", { ...DEFAULT_DESIGN, fgColor: "#0B6E8C" })).ok).toBe(true);
    const update = calls.find((c) => c.op === "update")!.args[0] as { name: string; design: { fgColor: string } };
    expect(update.name).toBe("Brand");
    expect(update.design.fgColor).toBe("#0B6E8C");
    expect(calls).toContainEqual({ op: "eq", args: ["id", "t1"] });
    answer = { data: null, error: { message: "gone" } };
    expect(await updateTemplate("t9", "Brand", DEFAULT_DESIGN)).toEqual({
      ok: false,
      error: "The template couldn't be saved. It may have been deleted.",
    });
  });
```

(Put this test inside that file's `describe`, and import `DEFAULT_DESIGN` from `@/features/generator/state/defaults`.)

Append to `features/templates/TemplateEditor.test.tsx`:

```tsx
describe("TemplateEditor, editing", () => {
  const brand = {
    id: "t1",
    user_id: "u1",
    name: "Brand",
    design: { fgColor: "#BE123C" },
    is_default: true,
    created_at: "",
    updated_at: "",
  };

  it("starts from the template, and saves changes in place", async () => {
    const user = userEvent.setup();
    vi.mocked(setDefaultTemplate).mockClear();
    vi.mocked(updateTemplate).mockResolvedValue({ ok: true, value: { ...brand, name: "Brand 2" } as never });
    render(
      <ToastProvider>
        <TemplateEditor template={brand as never} />
      </ToastProvider>,
    );
    expect(screen.getByRole("heading", { name: "Edit template" })).toBeInTheDocument();
    const name = screen.getByRole("textbox", { name: /^Name/ });
    expect(name).toHaveValue("Brand");
    expect(screen.getByRole("switch", { name: "Use for new codes" })).toBeChecked();
    await user.clear(name);
    await user.type(name, "Brand 2");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(updateTemplate).toHaveBeenCalledWith(
      "t1",
      "Brand 2",
      expect.objectContaining({ fgColor: "#BE123C" }),
    );
    // Still the default, so the default isn't touched.
    expect(setDefaultTemplate).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/templates");
  });

  it("stops it being the default when that's switched off", async () => {
    const user = userEvent.setup();
    vi.mocked(updateTemplate).mockResolvedValue({ ok: true, value: brand as never });
    vi.mocked(setDefaultTemplate).mockClear();
    render(
      <ToastProvider>
        <TemplateEditor template={brand as never} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("switch", { name: "Use for new codes" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(setDefaultTemplate).toHaveBeenCalledWith(null);
  });
});
```

(Add `updateTemplate` to that file's `./api` mock, as `updateTemplate: vi.fn()`, and to its import from `./api`.)

Append to `features/templates/TemplatesPage.test.tsx`:

```tsx
  it("offers Edit for each template", async () => {
    const user = userEvent.setup();
    show([row("t1", "Brand")]);
    await user.click(screen.getByRole("button", { name: "Actions for Brand" }));
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveAttribute(
      "href",
      "/templates/t1/edit",
    );
  });
```

(Inside its `describe`.)

- [ ] **Step 3: Run them to see them fail.**

Run: `npx vitest run features/templates`
Expected: FAIL. `updateTemplate` doesn't exist, there's no "Edit template" heading, and there's no Edit menu item.

- [ ] **Step 4: Add `updateTemplate`** to `features/templates/api.ts`:

```ts
/** Saves an edited template's name and design; codes already made from it don't change. */
export async function updateTemplate(
  id: string,
  name: string,
  design: DesignState,
): Promise<Result<DesignTemplateRow> & { droppedLogo?: boolean }> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const stored = designForStorage(design);
  const { data, error } = await supabase
    .from("design_templates")
    .update({ name: nameOf(name) || "My template", design: stored.design })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    return { ok: false, error: "The template couldn't be saved. It may have been deleted." };
  }
  return { ok: true, value: data, droppedLogo: stored.droppedLogo };
}
```

(`nameOf` is defined above `renameTemplate`. If it's declared below this function, move `updateTemplate` after it.)

- [ ] **Step 5: Make the editor take a template.** In `features/templates/TemplateEditor.tsx`:
1. Rename the component `export function TemplateEditor({ template }: { template?: DesignTemplateRow } = {})`, importing `DesignTemplateRow` from `@/types/supabase` and `updateTemplate` from `./api`.
2. Start the state from the template:

```tsx
  const [state, dispatchCode] = useReducer(generatorReducer, template, (saved) =>
    saved
      ? generatorReducer(initialState(), { type: "applyDesign", design: saved.design })
      : initialState(),
  );
  const [name, setName] = useState(template?.name ?? "");
  const [makeDefault, setMakeDefault] = useState(template?.is_default ?? false);
```

3. In `save`, after the name check, branch on `template`:

```tsx
    setSaving(true);
    const result = template
      ? await updateTemplate(template.id, name, state.design)
      : await saveTemplate(name, state.design);
    if (!result.ok) {
      setSaving(false);
      return toast(result.error, "error");
    }
    // Only a change to "Use for new codes" touches the default.
    if (makeDefault !== (template?.is_default ?? false)) {
      const set = await setDefaultTemplate(makeDefault ? result.value.id : null);
      if (!set.ok) toast(set.error, "error");
    }
    toast(
      result.droppedLogo
        ? `Saved “${result.value.name}”. The logo was too large to store and was left out.`
        : template
          ? `Saved changes to “${result.value.name}”`
          : `Saved “${result.value.name}”`,
    );
    router.push("/templates");
```

4. Title, description and button follow the mode:
   - `PageHeader title={template ? "Edit template" : "New template"}`;
   - `description={template ? "Codes already made with it keep their design." : "Design it once, then use it for any code."}`;
   - the submit button reads `{saving ? "Saving…" : template ? "Save changes" : "Save template"}`.

- [ ] **Step 6: The edit route and the menu item.**

Create `app/(app)/templates/[id]/edit/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TemplateEditor } from "@/features/templates/TemplateEditor";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Edit template" };

/** Edits one of your templates; row-level security keeps other people's out. */
export default async function EditTemplateRoute({ params }: PageProps<"/templates/[id]/edit">) {
  const { id } = await params;
  const { supabase } = await requireUser(`/templates/${id}/edit`);
  const { data: template } = await supabase
    .from("design_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!template) notFound();
  return <TemplateEditor template={template} />;
}
```

In `features/templates/TemplatesPage.tsx`, add a first `MenuItem` to each template's menu (importing `SquarePen` from `lucide-react`):

```tsx
                    <MenuItem>
                      <Link href={`/templates/${template.id}/edit`} className={menuItemClass}>
                        <SquarePen aria-hidden /> Edit
                      </Link>
                    </MenuItem>
```

- [ ] **Step 7: Run the tests, lint and the type check.**

Run: `npx vitest run features/templates && npm run lint && npm run typecheck`
Expected: all pass, and lint and the type check are clean.

- [ ] **Step 8: Commit.**

```bash
git add features/templates "app/(app)/templates"
git commit -m "Edit a saved template's name, design and default in place"
```

---

### Task 6: Browser tests, and ship Phase 4b with the migration

**Files:**
- Create: `e2e/accounts/analytics.spec.ts`
- Modify: `e2e/accounts/templates.spec.ts` (an edit test at the end)
- Modify: `e2e/accounts/app.spec.ts` (`PAGES` gains `analytics`)

- [ ] **Step 1: Write the analytics spec.** Create `e2e/accounts/analytics.spec.ts`. The owner's "Spring menu" has three scans from the global setup, and the viewer is on the owner's team.

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { expectNoSidewaysScroll } from "../phone-fit";
import { OWNER, VIEWER, seed } from "./fixtures";

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("Analytics as the owner", () => {
  test.use({ storageState: OWNER.state });

  test("shows the workspace's scans and top codes, and downloads them", async ({ page }) => {
    await page.goto("analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    const menu = page.getByRole("link", { name: "Spring menu" });
    await expect(menu).toHaveAttribute("href", `/codes/${seed().menuId}/analytics`);
    await expect(page.getByText("Scans", { exact: true }).locator("..")).toContainText("3");

    const href = await page.getByRole("link", { name: /CSV/ }).getAttribute("href");
    const csv = await (await page.request.get(href!)).text();
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toContain("code,short_link");
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain("Spring menu");
  });

  test("fits a small phone with Custom open, and passes axe", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("analytics");
    await expect(page.getByRole("link", { name: "Spring menu" })).toBeVisible();
    await page.getByRole("radio", { name: "Custom dates" }).check({ force: true });
    await expect(page.getByLabel("From")).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectAxeClean(page);
  });
});

test.describe("Analytics as a teammate", () => {
  test.use({ storageState: VIEWER.state });

  test("shows the owner's shared codes inside their workspace", async ({ page }) => {
    await page.goto(`analytics?workspace=${seed().ownerId}`);
    await expect(page.getByText(/Scans across .*’s codes/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Spring menu" })).toHaveAttribute(
      "href",
      `/codes/${seed().menuId}/analytics?workspace=${seed().ownerId}`,
    );
  });
});
```

Append this test inside the `Templates` describe in `e2e/accounts/templates.spec.ts`, after the 320 px test:

```ts
  test("a template's design is edited in place, and new codes use the change", async ({ page }) => {
    await page.goto("templates");
    await page.getByRole("button", { name: "Actions for Brand 2" }).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit template" })).toBeVisible();
    await page.getByRole("button", { name: /^Colors/ }).click();
    const color = page.getByRole("textbox", { name: "Code color", exact: true });
    await color.fill("#0B6E8C");
    await color.press("Tab");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/templates$/);

    await page.goto("codes/new?type=text");
    await page.getByRole("tab", { name: "QR code" }).click();
    await page.getByRole("button", { name: /^Colors/ }).click();
    await expect(page.getByRole("textbox", { name: "Code color", exact: true })).toHaveValue(
      "#0B6E8C",
    );
  });
```

(The 320 px test leaves "Brand 2" as the default, so new codes start from it.)

- [ ] **Step 2: Add Analytics to the sweep.** In `e2e/accounts/app.spec.ts`, add `"analytics"` to `PAGES`, after `"codes/bulk"`.

- [ ] **Step 3: Run the signed-in browser tests.** Apply the migration locally first.

Run: `npx --yes supabase@2.120.0 migration up --local && npm run test:e2e:accounts`
Expected: every test passes, the new specs and the sweep's new page included.

- [ ] **Step 4: Rebuild plain, and run the signed-out browser tests.**

Run: `npm run build && npm run test:e2e`
Expected: all PASS.

Commit:

```bash
git add e2e
git commit -m "Browser tests for the Analytics overview and editing templates"
```

- [ ] **Step 5: Run the full local check.**

Run: `npx prettier --check . --ignore-path .gitignore --ignore-path .prettierignore --ignore-path .git/info/exclude && npm run lint && npm run typecheck && npm test`
Expected: all PASS.

- [ ] **Step 6: Run the final whole-branch review,** with this plan's Review Focus and the ledger's rulings. Then do one fix pass.

- [ ] **Step 7: Apply the migration to the live database before merging** (ruling 7). This uses the scratchpad's `srv.sh` and `bridge_read.py` (project `db12f7ce-3e77-4461-a686-c8cd6de6f764`). Nothing else on the server changes.
1. **Disk:** run `srv.sh 'df -h /'`. There must be room for a backup: 3 GiB plus headroom.
2. **Backup:** read `/var/lib/techitdave-offserver/health.json`. The latest verified archive must be from the last 24 hours. If it isn't:
   - run `srv.sh 'systemctl start --no-block techitdave-supabase-backup.service'`;
   - re-read `health.json` until a new archive is verified;
   - then run `techitdave-offserver retain`.
3. **Apply:** send the migration through `bridge_read.py` as one `begin; … commit;` batch, using Python's `subprocess`. Then send `notify pgrst, 'reload schema'`, and check the `quickqreate-1791927515091-rest` log for the reload.
4. **Verify** through the bridge:
   - both functions exist, with `prosecdef` false (security invoker);
   - `authenticated` has execute and `anon` doesn't;
   - `select public.workspace_analytics(null, now() - interval '1 day', now())` run as the bridge's role returns an object with `total`;
   - nothing else changed: the `scan_events` count is the same.
5. **Record it in the runbook** `~/.codex/memories/supabase-coolify.md`, with the rollback: `drop function public.workspace_scans(uuid, timestamptz, timestamptz, bigint, int); drop function public.workspace_analytics(uuid, timestamptz, timestamptz, text);`.

- [ ] **Step 8: Push, open the PR, wait for CI, and merge.**

```bash
git push -u origin feat/redesign-phase-4b
gh pr create --base main --head feat/redesign-phase-4b --title "Redesign 4b: the Analytics overview, and editing templates" --body "<spec 4.4 and 6.4, template editing, the migration (applied live before merge), rulings, and test counts>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
gh pr merge --merge
```

- [ ] **Step 9: Check the live site.**
1. Wait for the version in `https://ziplume.com/sw.js` to change.
2. Download every asset `sw.js` lists into a new folder, and find "Custom dates" and "Save changes" in them.
3. `/analytics` and `/analytics/export` return 307 and 401 when signed out.
4. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307.
5. Create nothing in David's account.
