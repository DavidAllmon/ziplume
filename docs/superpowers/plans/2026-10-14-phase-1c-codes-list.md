# Phase 1c: Codes List and Sidebar Folders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/codes` becomes the clean list from the approved mockup:
- a table or grid of codes, with one status word each and the last 30 days' scans
- Type, Status and sort controls
- select-to-download, move, pause or delete
- clear empty states
- folders under Codes in the sidebar

This plan also closes the small follow-ups left over from Phase 1b.

**Architecture:**
- **Database:** one additive migration.
  - `recent_scan_counts(owner)` gives the 30-day Scans column.
  - The team lookups also start requiring two-step verification.
- **List logic:** pure filter and sort helpers in `features/codes/list/filters.ts`, which are unit-tested.
- **List view:**
  - A new client `CodesView` replaces `CodeList`/`CodeCard`. It is built from `Toolbar`, `CodeRow` (list), `CodeTile` (grid), `CodeActions` (⋯ menu) and `SelectionBar`.
  - The list or grid choice is remembered per user in `localStorage`.
- **Folders:**
  - The server page filters by `?folder=` and passes in the folder, its title and the scan counts.
  - Folders move into the sidebar (a client `FolderNav` inside `AppShell`).
  - Rename and Delete move into the folder page's header (`FolderActions`).

**Tech Stack:** Next.js 16.4, React 19.3, Tailwind 4.3, Headless UI, lucide-react, Supabase (PGlite tests), Vitest 5 with Testing Library, Playwright with the local-Supabase signed-in suite from Phase 1b.

**Spec:** `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md`. This plan covers:
- §3.1 (folders under Codes)
- §4.1 (the Codes list)
- §5 (status pills, wording, the 44px targets)
- §7 (tests)
- the deferred Phase 1b minors

## Scope

Creating a code while a folder is selected doesn't yet put the code in that folder. That arrives with the new Create page in Phase 2 (`/codes/new?folder=`). Until then, the "Create code" links keep the team but not the folder.

The sidebar lists only "All codes" and your folders, as in the mockup. There is no "No folder" entry.

## Global Constraints

- **Status words:**
  - Active, Paused, Scheduled and Expired are for trackable codes.
  - Static is for the rest.
  - Each code shows exactly one status pill.
  - Pill colors come from the tokens: Active `success`, Scheduled `warning`, Expired `danger`, Paused and Static `neutral`.
- **Wording:**
  - "Trackable", not "Dynamic".
  - "Short link".
  - Curly apostrophes.
  - Copy is in sentence case.
  - Buttons start with a verb.
- **Readability:**
  - Text is at least 13px.
  - Use `text-fg` for primary text and `text-fg-muted` for secondary text.
  - Numbers use `tabular-nums`.
- **Responsive:**
  - The list is a table on 768px and up, and stacked rows below.
  - The grid has 1, 2, 3 or 4 columns depending on width.
  - Nothing scrolls sideways from 320px.
  - Touch targets are at least 44px on phones.
- **Database:**
  - The new migration goes in `supabase/migrations/`, wrapped in `begin; … commit;`, with **no backslashes**.
  - Apply it through the private SQL bridge (exact UUID `db12f7ce-3e77-4461-a686-c8cd6de6f764`) after a verified backup and **before** merging.
- **Types:** `types/supabase.ts` is updated by hand.
- **Dependencies:** no new dependencies.

## Review Focus

1. **Big lists and bulk actions:**
   - With 200 codes, select-all → Pause → Delete must keep the counts right, never touch codes outside the selection, and show progress or errors.
   - Test: Task 3 "pauses and deletes only the selected codes".
2. **Team viewers:**
   - They can select, download and open codes, but never see Move, Pause, Delete, Duplicate, New folder, Rename or Delete folder.
   - Test: Task 3 "viewers can open and download but not change codes", plus Task 4 "viewers see folders but can't add one".
3. **Folder that isn't yours or no longer exists:**
   - `?folder=<id of another account's folder>` or a deleted folder shows all codes, never another account's folder name or codes.
   - Test: Task 6 "an unknown folder shows all codes".
4. **Statuses at their boundaries:**
   - A code whose `active_until` is now, or that starts later today, shows the right single status in the list, the filter and the code page alike.
   - Test: Task 2's `listStatus` cases.
5. **Remembered view across accounts:**
   - One person's grid choice doesn't leak to another account in the same browser.
   - Test: Task 3 "remembers grid view for this person only".

---

### Task 1: Scans in the last 30 days, and team lookups behind two-step

**Files:**
- Create: `supabase/migrations/20261014150000_codes_list_scans.sql`
- Modify:
  - `supabase/test/migration.test.ts` (new `describe` at the end)
  - `types/supabase.ts`

**Interfaces:**
- Produces:
  - `recent_scan_counts(p_owner uuid, p_days int default 30) returns table (code_id uuid, scans bigint)`
  - Types: `recent_scan_counts: { Args: { p_owner: string; p_days?: number }; Returns: { code_id: string; scans: number }[] }`
  - `my_workspaces()` and `team_overview()` return nothing for a password-only session on a two-step account.

- [ ] **Step 1: Write the failing tests.** Append to `supabase/test/migration.test.ts`:

```ts
describe("codes list scans", () => {
  const WREN = "16161616-1616-4616-8616-161616161616"; // owner
  const YUKI = "17171717-1717-4717-8717-171717171717"; // viewer on Wren's team
  const ZED = "18181818-1818-4818-8818-181818181818"; // outsider
  const asWren = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", WREN, sql, params);
  const asYuki = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", YUKI, sql, params);
  const asZed = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", ZED, sql, params);
  let scanned = "";

  beforeAll(async () => {
    await db.query(
      `insert into auth.users (id, email) values
         ($1, 'wren@example.com'), ($2, 'yuki@example.com'), ($3, 'zed@example.com')`,
      [WREN, YUKI, ZED],
    );
    const codes = await asWren<{ id: string }>(
      `insert into public.qr_codes (name, qr_type, is_dynamic, slug, destination) values
         ('Busy', 'url', true, 'WREN01', 'https://a.example'),
         ('Quiet', 'url', true, 'WREN02', 'https://b.example')
       returning id`,
    );
    scanned = codes[0]!.id;
    await asService(
      `insert into public.scan_events (code_id, visitor_hash, scanned_at) values
         ($1, 'a', now() - interval '1 day'), ($1, 'b', now() - interval '2 days'),
         ($1, 'c', now() - interval '29 days'), ($1, 'd', now() - interval '40 days')`,
      [scanned],
    );
    await asService(
      "insert into public.team_members (owner_id, member_id, role) values ($1, $2, 'viewer')",
      [WREN, YUKI],
    );
  });

  it("count each code's scans in the last 30 days, for people who can see the codes", async () => {
    const counts = async (who: typeof asWren) =>
      (
        await who<{ code_id: string; scans: string | number }>(
          "select code_id, scans from public.recent_scan_counts($1)",
          [WREN],
        )
      ).map((row) => [row.code_id, Number(row.scans)]);
    expect(await counts(asWren)).toEqual([[scanned, 3]]);
    expect(await counts(asYuki)).toEqual([[scanned, 3]]);
    expect(await counts(asZed)).toEqual([]);
    await expect(asAnon("select * from public.recent_scan_counts($1)", [WREN])).rejects.toThrow(
      /permission denied/,
    );
  });

  it("hide team details from password-only sessions of two-step accounts", async () => {
    await db.query(
      "insert into auth.mfa_factors (user_id, status) values ($1, 'verified'), ($2, 'verified')",
      [YUKI, WREN],
    );
    expect(await asYuki("select owner_id from public.my_workspaces()")).toEqual([]);
    expect(
      await as("authenticated", YUKI, "select owner_id from public.my_workspaces()", [], "aal2"),
    ).toHaveLength(1);
    expect(await asWren("select member_id from public.team_overview()")).toEqual([]);
    expect(
      await as("authenticated", WREN, "select member_id from public.team_overview()", [], "aal2"),
    ).toHaveLength(1);
    await db.query("delete from auth.mfa_factors where user_id in ($1, $2)", [YUKI, WREN]);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run supabase/test/migration.test.ts`
Expected: the two new tests FAIL (`recent_scan_counts` doesn't exist, and `my_workspaces` returns a row at aal1). All earlier tests PASS.

- [ ] **Step 3: Write the migration.** Create `supabase/migrations/20261014150000_codes_list_scans.sql`:

```sql
-- Codes list: each code's scans in the last 30 days, for the list's Scans column. The team
-- lookups also respect two-step verification now, like the tables do: a password-only session
-- on a two-step account sees no team details.

begin;

create function public.recent_scan_counts(p_owner uuid, p_days int default 30)
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
     and public.mfa_satisfied()
     and e.scanned_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
   group by e.code_id;
$$;

revoke all on function public.recent_scan_counts(uuid, int) from public, anon;
grant execute on function public.recent_scan_counts(uuid, int) to authenticated;

create or replace function public.my_workspaces()
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
     and public.mfa_satisfied()
   order by coalesce(p.display_name, u.email::text);
$$;

create or replace function public.team_overview()
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
     and public.mfa_satisfied()
   order by m.created_at;
$$;

commit;
```

- [ ] **Step 4: Update the types.** In `types/supabase.ts` `Functions`, after `my_pending_invite`, add:

```ts
      recent_scan_counts: {
        Args: { p_owner: string; p_days?: number };
        Returns: { code_id: string; scans: number }[];
      };
```

- [ ] **Step 5: Run the tests and confirm they pass.**

Run: `npx vitest run supabase/test/migration.test.ts && npm run typecheck && grep -c '\\' supabase/migrations/20261014150000_codes_list_scans.sql`
Expected:
- All PASS.
- Typecheck has 0 errors.
- The backslash count prints `0`.

- [ ] **Step 6: Commit.**

```bash
npx prettier --write supabase/test/migration.test.ts types/supabase.ts
git add supabase/migrations/20261014150000_codes_list_scans.sql supabase/test/migration.test.ts types/supabase.ts
git commit -m "Count each code's scans in the last 30 days

recent_scan_counts feeds the codes list's Scans column for anyone who
can see the codes. The team lookups now need a two-step session on
two-step accounts, like the tables.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: List statuses, filters and sorting

**Files:**
- Create:
  - `features/codes/list/filters.ts` and `features/codes/list/filters.test.ts`
  - `features/codes/list/StatusPill.tsx`

**Interfaces:**
- Produces:
  - Types:
    - `ListStatus = "active" | "paused" | "scheduled" | "expired" | "static"`
    - `StatusFilter = "all" | ListStatus`
    - `SortKey = "newest" | "updated" | "scans" | "name"`
    - `TypeFilter = "all" | CodeTypeId`
    - `ListFilters { query; type; status }`
  - Functions:
    - `listStatus(code, now?)`
    - `filterCodes(codes, filters, now?)`
    - `sortCodes(codes, sort, recentScans)`
    - `typesIn(codes)`
  - Constants: `STATUS_LABELS`, `STATUS_FILTERS`, `SORTS`, `NO_FILTERS`
  - Component: `<StatusPill status />`

- [ ] **Step 1: Write the failing tests.** Create `features/codes/list/filters.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { QrCodeRow } from "@/types/supabase";

import { filterCodes, listStatus, NO_FILTERS, sortCodes, typesIn } from "./filters";

const NOW = Date.parse("2026-10-14T12:00:00Z");

function code(patch: Partial<QrCodeRow>): QrCodeRow {
  return {
    id: "id",
    user_id: "u1",
    name: "Code",
    qr_type: "url",
    content: { url: "https://example.com" },
    design: {},
    is_dynamic: false,
    slug: null,
    destination: null,
    status: "active",
    scan_count: 0,
    last_scanned_at: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    folder_id: null,
    active_from: null,
    active_until: null,
    has_password: false,
    ...patch,
  } as QrCodeRow;
}

const trackable = (patch: Partial<QrCodeRow> = {}) =>
  code({ is_dynamic: true, slug: "ABC123", destination: "https://example.com/menu", ...patch });

describe("listStatus", () => {
  it("gives static codes one status: Static", () => {
    expect(listStatus(code({ status: "paused" }), NOW)).toBe("static");
  });

  it("gives trackable codes Active, Paused, Scheduled or Expired", () => {
    expect(listStatus(trackable(), NOW)).toBe("active");
    expect(listStatus(trackable({ status: "paused" }), NOW)).toBe("paused");
    expect(listStatus(trackable({ active_from: "2026-10-14T18:00:00Z" }), NOW)).toBe("scheduled");
    expect(listStatus(trackable({ active_until: "2026-10-14T12:00:00Z" }), NOW)).toBe("expired");
    expect(listStatus(trackable({ active_until: "2026-10-14T12:00:01Z" }), NOW)).toBe("active");
  });
});

describe("filterCodes", () => {
  const menu = trackable({ id: "menu", name: "Spring menu" });
  const wifi = code({
    id: "wifi",
    name: "Front desk",
    qr_type: "wifi",
    content: { ssid: "Guest", password: "x", security: "WPA", hidden: false },
  });
  const paused = trackable({ id: "paused", name: "Old flyer", status: "paused", slug: "OLD999" });

  it("searches names, content and short links", () => {
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, query: "spring" }, NOW)).toEqual([menu]);
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, query: "guest" }, NOW)).toEqual([wifi]);
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, query: "old999" }, NOW)).toEqual([paused]);
  });

  it("filters by type and by status", () => {
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, type: "wifi" }, NOW)).toEqual([wifi]);
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, status: "paused" }, NOW)).toEqual([paused]);
    expect(filterCodes([menu, wifi, paused], { ...NO_FILTERS, status: "static" }, NOW)).toEqual([wifi]);
  });
});

describe("sortCodes", () => {
  const a = code({ id: "a", name: "Banana", created_at: "2026-10-03T00:00:00Z", updated_at: "2026-10-04T00:00:00Z" });
  const b = code({ id: "b", name: "apple", created_at: "2026-10-05T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" });
  const c = code({ id: "c", name: "Cherry", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-06T00:00:00Z" });

  it("sorts by newest, recently updated, most scans or name", () => {
    const ids = (list: QrCodeRow[]) => list.map((x) => x.id);
    expect(ids(sortCodes([a, b, c], "newest", {}))).toEqual(["b", "a", "c"]);
    expect(ids(sortCodes([a, b, c], "updated", {}))).toEqual(["c", "a", "b"]);
    expect(ids(sortCodes([a, b, c], "scans", { a: 2, c: 9 }))).toEqual(["c", "a", "b"]);
    expect(ids(sortCodes([a, b, c], "name", {}))).toEqual(["b", "a", "c"]);
  });

  it("doesn't change the list it was given", () => {
    const list = [a, b, c];
    sortCodes(list, "name", {});
    expect(list.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("typesIn", () => {
  it("lists each type once", () => {
    expect(typesIn([code({}), code({ qr_type: "wifi" }), code({})])).toEqual(["url", "wifi"]);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run features/codes/list/filters.test.ts`
Expected: FAIL with "Failed to resolve import ./filters".

- [ ] **Step 3: Implement.** Create `features/codes/list/filters.ts`:

```ts
import { codeState, codeSummary, codeType } from "@/features/dashboard/codeRender";
import type { CodeTypeId } from "@/lib/qr/types";
import type { QrCodeRow } from "@/types/supabase";

/** One status per code in the list (spec §5 status words). */
export type ListStatus = "active" | "paused" | "scheduled" | "expired" | "static";
export type StatusFilter = "all" | ListStatus;
export type SortKey = "newest" | "updated" | "scans" | "name";
export type TypeFilter = "all" | CodeTypeId;

export interface ListFilters {
  query: string;
  type: TypeFilter;
  status: StatusFilter;
}

export const NO_FILTERS: ListFilters = { query: "", type: "all", status: "all" };

export const STATUS_LABELS: Record<ListStatus, string> = {
  active: "Active",
  paused: "Paused",
  scheduled: "Scheduled",
  expired: "Expired",
  static: "Static",
};

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  ...(Object.keys(STATUS_LABELS) as ListStatus[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
  })),
];

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "updated", label: "Recently updated" },
  { value: "scans", label: "Most scans" },
  { value: "name", label: "Name" },
];

/** Trackable codes are Active, Paused, Scheduled or Expired; everything else is Static. */
export function listStatus(
  code: Pick<QrCodeRow, "is_dynamic" | "status" | "active_from" | "active_until">,
  now = Date.now(),
): ListStatus {
  return code.is_dynamic ? codeState(code, now) : "static";
}

/** Search (name, content or short link), then the Type and Status filters. */
export function filterCodes(codes: QrCodeRow[], filters: ListFilters, now = Date.now()) {
  const query = filters.query.trim().toLowerCase();
  return codes.filter((code) => {
    if (filters.type !== "all" && codeType(code) !== filters.type) return false;
    if (filters.status !== "all" && listStatus(code, now) !== filters.status) return false;
    if (!query) return true;
    return [code.name, codeSummary(code), code.slug ?? ""].some((field) =>
      field.toLowerCase().includes(query),
    );
  });
}

/** A sorted copy. "Most scans" uses the last 30 days' scans; ties fall back to recently updated. */
export function sortCodes(codes: QrCodeRow[], sort: SortKey, recentScans: Record<string, number>) {
  const byUpdated = (a: QrCodeRow, b: QrCodeRow) => b.updated_at.localeCompare(a.updated_at);
  const copy = [...codes];
  switch (sort) {
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    case "scans":
      return copy.sort(
        (a, b) => (recentScans[b.id] ?? 0) - (recentScans[a.id] ?? 0) || byUpdated(a, b),
      );
    case "updated":
      return copy.sort(byUpdated);
    default:
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

/** The types present in a list, in first-seen order, for the Type filter. */
export function typesIn(codes: QrCodeRow[]): CodeTypeId[] {
  return [...new Set(codes.map(codeType))];
}
```

Create `features/codes/list/StatusPill.tsx`:

```tsx
import { cn } from "@/lib/cn";

import { STATUS_LABELS, type ListStatus } from "./filters";

const TONES: Record<ListStatus, string> = {
  active: "bg-success-soft text-success",
  scheduled: "bg-warning-soft text-warning",
  expired: "bg-danger-soft text-danger",
  paused: "bg-neutral-soft text-neutral",
  static: "bg-neutral-soft text-neutral",
};

/** The one status a code shows in lists. */
export function StatusPill({ status, className }: { status: ListStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap",
        TONES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 4: Run the tests and confirm they pass.**

Run: `npx vitest run features/codes/list/filters.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write features/codes/list
git add features/codes/list
git commit -m "Add the codes list's statuses, filters and sorting

One status per code (Active, Paused, Scheduled, Expired or Static),
search across name, content and short link, Type and Status filters,
and Newest / Recently updated / Most scans / Name sorting.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: The new Codes list

**Files:**
- Create:
  - `features/codes/list/events.ts`
  - `features/codes/list/useListView.ts`
  - `features/codes/list/download.ts`
  - `features/codes/list/CodeActions.tsx`
  - `features/codes/list/CodeRow.tsx`
  - `features/codes/list/CodeTile.tsx`
  - `features/codes/list/Toolbar.tsx`
  - `features/codes/list/SelectionBar.tsx`
  - `features/codes/list/CodesView.tsx`
  - `features/codes/list/CodesView.test.tsx`
- Modify: `app/(app)/codes/page.tsx`
- Delete: `features/dashboard/CodeList.tsx` and `features/dashboard/CodeCard.tsx`

**Interfaces:**
- Consumes:
  - from Task 2: `filters.ts` and `StatusPill`
  - from Task 1: `recent_scan_counts`
  - from Phase 1b: `withWorkspace`
  - existing modules: `features/codes/api` (`updateCode`, `deleteCode`, `duplicateCode`), `features/folders/api` (`moveCodes`), `MoveDialog`, `ConfirmDialog`, `QrTile`, `codeRender`, `lib/qr/zip`, `lib/qr/renderer` and `lib/download`
- Produces:
  - `CODES_CHANGED` and `announceCodesChanged()`
  - `useListView(userId): [ListView, (view) => void]`
  - The component and its props:

```ts
<CodesView
  userId
  codes
  folders
  folder={FolderRow | null}
  ownerId
  teamId={string | null}
  canEdit
  recentScans
/>
```

- [ ] **Step 1: Write the failing tests.** Create `features/codes/list/CodesView.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { deleteCode, updateCode } from "@/features/codes/api";
import type { QrCodeRow } from "@/types/supabase";

import { CodesView } from "./CodesView";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/features/codes/api", () => ({
  updateCode: vi.fn(),
  deleteCode: vi.fn(),
  duplicateCode: vi.fn(),
}));
vi.mock("@/features/folders/api", () => ({ moveCodes: vi.fn() }));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <span /> }));

function code(id: string, patch: Partial<QrCodeRow> = {}): QrCodeRow {
  return {
    id,
    user_id: "owner",
    name: id,
    qr_type: "url",
    content: { url: `https://example.com/${id}` },
    design: {},
    is_dynamic: true,
    slug: `SLUG${id.toUpperCase()}`,
    destination: `https://example.com/${id}`,
    status: "active",
    scan_count: 0,
    last_scanned_at: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    folder_id: null,
    active_from: null,
    active_until: null,
    has_password: false,
    ...patch,
  } as QrCodeRow;
}

const MENU = code("menu", { name: "Spring menu" });
const FLYER = code("flyer", { name: "Old flyer", status: "paused" });
const WIFI = code("wifi", {
  name: "Front desk",
  qr_type: "wifi",
  is_dynamic: false,
  slug: null,
  destination: null,
  content: { ssid: "Guest", password: "x", security: "WPA", hidden: false },
});

function renderView(props: Partial<ComponentProps<typeof CodesView>> = {}) {
  return render(
    <ToastProvider>
      <CodesView
        userId="owner"
        codes={[MENU, FLYER, WIFI]}
        folders={[]}
        folder={null}
        ownerId="owner"
        teamId={null}
        canEdit
        recentScans={{ menu: 12 }}
        {...props}
      />
    </ToastProvider>,
  );
}

const rowFor = (name: string) => screen.getByRole("listitem", { name });

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(updateCode).mockReset();
  vi.mocked(deleteCode).mockReset();
});

describe("CodesView", () => {
  it("shows one status, the short link or content, and 30-day scans per code", () => {
    renderView();
    // Each row has the pill twice: in the phone line and in the wide-screen column.
    expect(within(rowFor("Spring menu")).getAllByText("Active").length).toBeGreaterThan(0);
    expect(within(rowFor("Spring menu")).getByText(/r\/SLUGMENU/)).toBeInTheDocument();
    expect(within(rowFor("Spring menu")).getAllByText("12").length).toBeGreaterThan(0);
    expect(within(rowFor("Old flyer")).getAllByText("Paused").length).toBeGreaterThan(0);
    expect(within(rowFor("Front desk")).getAllByText("Static").length).toBeGreaterThan(0);
  });

  it("filters by status, and offers to clear filters that match nothing", async () => {
    renderView();
    await userEvent.selectOptions(screen.getByLabelText("Status"), "expired");
    expect(screen.getByText("No codes match")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(rowFor("Spring menu")).toBeInTheDocument();
  });

  it("remembers grid view for this person only", async () => {
    const { unmount } = renderView();
    await userEvent.click(screen.getByRole("radio", { name: "Grid view" }));
    expect(screen.getByRole("list", { name: "Codes" })).toHaveAttribute("data-view", "grid");
    unmount();
    renderView();
    expect(screen.getByRole("list", { name: "Codes" })).toHaveAttribute("data-view", "grid");
    unmount();
    renderView({ userId: "someone-else" });
    expect(screen.getByRole("list", { name: "Codes" })).toHaveAttribute("data-view", "list");
  });

  it("pauses and deletes only the selected codes", async () => {
    vi.mocked(updateCode).mockImplementation(async (id) => ({
      ok: true,
      value: { ...MENU, id, status: "paused" },
    }));
    vi.mocked(deleteCode).mockResolvedValue({ ok: true, value: null });
    renderView();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Spring menu" }));
    const bar = screen.getByRole("region", { name: "Selected codes" });
    expect(within(bar).getByText("1 selected")).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole("button", { name: "Pause" }));
    expect(updateCode).toHaveBeenCalledTimes(1);
    expect(updateCode).toHaveBeenCalledWith("menu", { status: "paused" });
    await userEvent.click(within(bar).getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete 1 code" }));
    expect(deleteCode).toHaveBeenCalledTimes(1);
    expect(deleteCode).toHaveBeenCalledWith("menu");
    expect(screen.queryByRole("listitem", { name: "Spring menu" })).toBeNull();
    expect(rowFor("Old flyer")).toBeInTheDocument();
  });

  it("viewers can open and download but not change codes", async () => {
    renderView({ canEdit: false });
    await userEvent.click(screen.getByRole("button", { name: "Actions for Spring menu" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Open" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Download PNG" })).toBeInTheDocument();
    for (const name of ["Duplicate", "Move to folder", "Pause", "Delete"]) {
      expect(within(menu).queryByRole("menuitem", { name })).toBeNull();
    }
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Spring menu" }));
    const bar = screen.getByRole("region", { name: "Selected codes" });
    expect(within(bar).getByRole("button", { name: "Download ZIP" })).toBeInTheDocument();
    for (const name of ["Move", "Pause", "Delete"]) {
      expect(within(bar).queryByRole("button", { name })).toBeNull();
    }
  });

  it("welcomes a first-time user with quick starts", () => {
    renderView({ codes: [] });
    expect(screen.getByRole("heading", { name: "Create your first QR code" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Wi-Fi/ })).toHaveAttribute("href", "/?type=wifi");
  });

  it("says when a folder is empty", () => {
    renderView({
      codes: [],
      folder: {
        id: "f1",
        user_id: "owner",
        name: "Flyers",
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      },
    });
    expect(screen.getByRole("heading", { name: "This folder is empty" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run features/codes/list/CodesView.test.tsx`
Expected: FAIL with "Failed to resolve import ./CodesView".

- [ ] **Step 3: Implement the building blocks.** Create `features/codes/list/events.ts`:

```ts
/** Fired after codes or folders change, so the sidebar's folder counts refresh. */
export const CODES_CHANGED = "quickqreate:codes-changed";

export function announceCodesChanged() {
  window.dispatchEvent(new Event(CODES_CHANGED));
}
```

Create `features/codes/list/useListView.ts`:

```ts
"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ListView = "list" | "grid";

const EVENT = "quickqreate:codes-view";
const keyFor = (userId: string) => `quickqreate:codes-view:${userId}`;

function read(userId: string): ListView {
  try {
    return window.localStorage.getItem(keyFor(userId)) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** List or grid, remembered on this device for this person (spec §4.1). */
export function useListView(userId: string): [ListView, (view: ListView) => void] {
  const view = useSyncExternalStore(
    subscribe,
    () => read(userId),
    () => "list" as const,
  );
  const setView = useCallback(
    (next: ListView) => {
      try {
        window.localStorage.setItem(keyFor(userId), next);
      } catch {
        // Storage is unavailable; the choice lasts until the page closes.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [userId],
  );
  return [view, setView];
}
```

Create `features/codes/list/download.ts`:

```ts
"use client";

import { codeRenderOptions } from "@/features/dashboard/codeRender";
import { saveBlob } from "@/lib/download";
import { buildFilename } from "@/lib/qr/filename";
import type { QrCodeRow } from "@/types/supabase";

/** Downloads one saved code as a 1024px PNG. */
export async function downloadPng(code: QrCodeRow) {
  const { renderBlob } = await import("@/lib/qr/renderer");
  const blob = await renderBlob(codeRenderOptions(code, 1024), "png");
  saveBlob(blob, buildFilename(code.name, "png"));
}
```

Check `buildFilename`'s signature with `grep -n "export function buildFilename" -A3 lib/qr/filename.ts`. If it differs, build the name with `` `${code.name.replace(/[^\w-]+/g, "-").slice(0, 60) || "qr-code"}.png` `` instead, and record a ruling.

Create `features/codes/list/CodeActions.tsx`:

```tsx
"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  BarChart3,
  Copy,
  Download,
  ExternalLink,
  FolderInput,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { menuItemClass, menuPanelClass, withWorkspace } from "@/components/app/nav";
import type { QrCodeRow } from "@/types/supabase";

export interface CodeActionHandlers {
  onDuplicate: (code: QrCodeRow) => void;
  onMove: (codes: QrCodeRow[]) => void;
  onToggleStatus: (code: QrCodeRow) => void;
  onDelete: (codes: QrCodeRow[]) => void;
  onDownload: (code: QrCodeRow) => void;
}

/** The ⋯ menu on each code: Open, Analytics, Download, and for editors the changes. */
export function CodeActions({
  code,
  canEdit,
  teamId,
  ...on
}: { code: QrCodeRow; canEdit: boolean; teamId: string | null } & CodeActionHandlers) {
  const paused = code.status === "paused";
  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label={`Actions for ${code.name}`}
        className="grid size-11 place-items-center rounded-control text-fg-muted hover:bg-surface-2 hover:text-fg data-focus:outline-2 data-focus:outline-ring sm:size-9"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </MenuButton>
      <MenuItems anchor={{ to: "bottom end", gap: 4 }} transition className={menuPanelClass}>
        <MenuItem>
          <Link href={withWorkspace(`/codes/${code.id}`, teamId)} className={menuItemClass}>
            <ExternalLink aria-hidden /> Open
          </Link>
        </MenuItem>
        {code.is_dynamic && (
          <MenuItem>
            <Link
              href={withWorkspace(`/codes/${code.id}/analytics`, teamId)}
              className={menuItemClass}
            >
              <BarChart3 aria-hidden /> Analytics
            </Link>
          </MenuItem>
        )}
        <MenuItem as="button" type="button" onClick={() => on.onDownload(code)} className={menuItemClass}>
          <Download aria-hidden /> Download PNG
        </MenuItem>
        {canEdit && (
          <>
            <MenuItem as="button" type="button" onClick={() => on.onDuplicate(code)} className={menuItemClass}>
              <Copy aria-hidden /> Duplicate
            </MenuItem>
            <MenuItem as="button" type="button" onClick={() => on.onMove([code])} className={menuItemClass}>
              <FolderInput aria-hidden /> Move to folder
            </MenuItem>
            {code.is_dynamic && (
              <MenuItem as="button" type="button" onClick={() => on.onToggleStatus(code)} className={menuItemClass}>
                {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
                {paused ? "Resume" : "Pause"}
              </MenuItem>
            )}
            <MenuItem
              as="button"
              type="button"
              onClick={() => on.onDelete([code])}
              className={`${menuItemClass} text-danger`}
            >
              <Trash2 aria-hidden /> Delete
            </MenuItem>
          </>
        )}
      </MenuItems>
    </Menu>
  );
}
```

Create `features/codes/list/CodeRow.tsx`:

```tsx
"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

import { withWorkspace } from "@/components/app/nav";
import { codeRenderOptions, codeSummary, codeTypeLabel } from "@/features/dashboard/codeRender";
import { formatCount, relativeTime } from "@/features/dashboard/format";
import { QrTile } from "@/features/generator/preview/QrTile";
import { shortLinkLabel } from "@/lib/env";
import type { QrCodeRow } from "@/types/supabase";

import { CodeActions, type CodeActionHandlers } from "./CodeActions";
import { listStatus } from "./filters";
import { StatusPill } from "./StatusPill";

/** Column template shared by the table header and every row (768px and up). */
export const LIST_COLUMNS =
  "md:grid-cols-[auto_auto_minmax(0,2.5fr)_minmax(0,1fr)_7rem_6rem_7rem_auto]";

export interface CodeItemProps extends CodeActionHandlers {
  code: QrCodeRow;
  canEdit: boolean;
  teamId: string | null;
  scans: number;
  selected: boolean;
  onSelect: (code: QrCodeRow, selected: boolean) => void;
}

/** The short link for trackable codes, what it encodes for static ones. */
export const codeDetail = (code: QrCodeRow) =>
  code.is_dynamic && code.slug ? shortLinkLabel(code.slug) : codeSummary(code);

/** One code in the list view: a table row on wider screens, a stacked row on phones. */
export function CodeRow({ code, canEdit, teamId, scans, selected, onSelect, ...on }: CodeItemProps) {
  const href = withWorkspace(`/codes/${code.id}`, teamId);
  const status = listStatus(code);
  const scanText = code.is_dynamic ? formatCount(scans) : "—";
  return (
    <li
      aria-label={code.name}
      className={`grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-border px-3 py-3 last:border-b-0 ${LIST_COLUMNS} ${selected ? "bg-primary-soft/40" : ""}`}
    >
      <input
        type="checkbox"
        aria-label={`Select ${code.name}`}
        checked={selected}
        onChange={(e) => onSelect(code, e.target.checked)}
        className="size-5 cursor-pointer accent-primary"
      />
      <Link href={href} tabIndex={-1} aria-hidden className="shrink-0 rounded-lg">
        <QrTile
          compact
          options={codeRenderOptions(code, 160)}
          summary={code.name}
          emptyHint=""
          resolution={96}
          className="size-10"
        />
      </Link>
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-1.5">
          <Link
            href={href}
            className="truncate font-medium text-fg underline-offset-4 hover:underline focus-ring"
          >
            {code.name}
          </Link>
          {code.has_password && (
            <Lock aria-label="Password protected" className="size-3.5 shrink-0 text-fg-muted" />
          )}
        </p>
        <p className="truncate text-sm text-fg-muted">{codeDetail(code)}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted md:hidden">
          {codeTypeLabel(code)} <StatusPill status={status} />
          {code.is_dynamic && (
            <span className="tabular-nums">
              {scanText} <span className="sr-only">scans in the last 30 days</span>
            </span>
          )}
        </p>
      </div>
      <span className="hidden truncate text-sm text-fg-muted md:block">{codeTypeLabel(code)}</span>
      <span className="hidden md:block">
        <StatusPill status={status} />
      </span>
      <span className="hidden text-right text-sm text-fg tabular-nums md:block">
        {scanText}
        <span className="sr-only"> scans in the last 30 days</span>
      </span>
      <span className="hidden text-sm text-fg-muted md:block">{relativeTime(code.updated_at)}</span>
      <CodeActions code={code} canEdit={canEdit} teamId={teamId} {...on} />
    </li>
  );
}
```

Create `features/codes/list/CodeTile.tsx`:

```tsx
"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

import { withWorkspace } from "@/components/app/nav";
import { codeRenderOptions, codeTypeLabel } from "@/features/dashboard/codeRender";
import { formatCount } from "@/features/dashboard/format";
import { QrTile } from "@/features/generator/preview/QrTile";

import { CodeActions } from "./CodeActions";
import type { CodeItemProps } from "./CodeRow";
import { listStatus } from "./filters";
import { StatusPill } from "./StatusPill";

/** One code in the grid view: thumbnail, name, type, status and scans. No badge pile. */
export function CodeTile({ code, canEdit, teamId, scans, selected, onSelect, ...on }: CodeItemProps) {
  const href = withWorkspace(`/codes/${code.id}`, teamId);
  return (
    <li
      aria-label={code.name}
      className={`flex min-w-0 flex-col gap-3 rounded-card border bg-surface p-4 ${selected ? "border-primary" : "border-border"}`}
    >
      <div className="flex items-center justify-between">
        <input
          type="checkbox"
          aria-label={`Select ${code.name}`}
          checked={selected}
          onChange={(e) => onSelect(code, e.target.checked)}
          className="size-5 cursor-pointer accent-primary"
        />
        <CodeActions code={code} canEdit={canEdit} teamId={teamId} {...on} />
      </div>
      <Link href={href} tabIndex={-1} aria-hidden className="mx-auto rounded-lg">
        <QrTile
          compact
          options={codeRenderOptions(code, 320)}
          summary={code.name}
          emptyHint=""
          resolution={224}
          className="size-28"
        />
      </Link>
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-1.5">
          <Link
            href={href}
            className="truncate font-medium text-fg underline-offset-4 hover:underline focus-ring"
          >
            {code.name}
          </Link>
          {code.has_password && (
            <Lock aria-label="Password protected" className="size-3.5 shrink-0 text-fg-muted" />
          )}
        </p>
        <p className="truncate text-sm text-fg-muted">{codeTypeLabel(code)}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusPill status={listStatus(code)} />
        {code.is_dynamic && (
          <span className="text-sm text-fg-muted tabular-nums">
            {formatCount(scans)} {scans === 1 ? "scan" : "scans"}
            <span className="sr-only"> in the last 30 days</span>
          </span>
        )}
      </div>
    </li>
  );
}
```

Create `features/codes/list/Toolbar.tsx`:

```tsx
"use client";

import { LayoutGrid, List, Search } from "lucide-react";

import { Select, TextInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { codeTypeInfo } from "@/lib/qr/code-types";
import type { CodeTypeId } from "@/lib/qr/types";

import { SORTS, STATUS_FILTERS, type ListFilters, type SortKey } from "./filters";
import type { ListView } from "./useListView";

const VIEWS = [
  { value: "list", label: <List aria-hidden />, ariaLabel: "List view" },
  { value: "grid", label: <LayoutGrid aria-hidden />, ariaLabel: "Grid view" },
] as const;

/** Search, Type, Status, sort and the list/grid switch. */
export function Toolbar({
  filters,
  onFilters,
  sort,
  onSort,
  view,
  onView,
  types,
}: {
  filters: ListFilters;
  onFilters: (filters: ListFilters) => void;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  view: ListView;
  onView: (view: ListView) => void;
  types: CodeTypeId[];
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search codes</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted"
        />
        <TextInput
          type="search"
          placeholder="Search by name, link or content"
          className="pl-9"
          value={filters.query}
          onChange={(e) => onFilters({ ...filters, query: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
        <label className="sm:w-40">
          <span className="sr-only">Type</span>
          <Select
            aria-label="Type"
            value={filters.type}
            onChange={(e) => onFilters({ ...filters, type: e.target.value as ListFilters["type"] })}
          >
            <option value="all">All types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {codeTypeInfo(type).label}
              </option>
            ))}
          </Select>
        </label>
        <label className="sm:w-40">
          <span className="sr-only">Status</span>
          <Select
            aria-label="Status"
            value={filters.status}
            onChange={(e) =>
              onFilters({ ...filters, status: e.target.value as ListFilters["status"] })
            }
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="sm:w-44">
          <span className="sr-only">Sort</span>
          <Select aria-label="Sort" value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <SegmentedControl
          aria-label="Layout"
          value={view}
          onChange={onView}
          options={VIEWS}
          className="w-28"
        />
      </div>
    </div>
  );
}
```

Create `features/codes/list/SelectionBar.tsx`:

```tsx
"use client";

import { Download, FolderInput, Pause, Play, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { codePayload, codeRenderOptions } from "@/features/dashboard/codeRender";
import { saveBlob } from "@/lib/download";
import type { ExportFormat } from "@/lib/qr/types";
import type { QrCodeRow } from "@/types/supabase";

const ZIP_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "svg", label: "SVG" },
  { value: "pdf", label: "PDF" },
  { value: "eps", label: "EPS" },
];

/** Sticky bar for the selected codes: Download (ZIP), Move, Pause/Resume, Delete, Clear. */
export function SelectionBar({
  selected,
  canEdit,
  onMove,
  onSetPaused,
  onDelete,
  onClear,
}: {
  selected: QrCodeRow[];
  canEdit: boolean;
  onMove: () => void;
  onSetPaused: (paused: boolean) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const toast = useToast();
  const [format, setFormat] = useState<ExportFormat>("png");
  const [progress, setProgress] = useState<string | null>(null);
  const trackable = selected.filter((code) => code.is_dynamic);
  const allPaused = trackable.length > 0 && trackable.every((code) => code.status === "paused");

  async function downloadZip() {
    const entries = selected
      .filter((code) => codePayload(code))
      .map((code) => ({ label: code.name, options: codeRenderOptions(code, 1024) }));
    if (!entries.length) return;
    setProgress(`Preparing 0 of ${entries.length}…`);
    try {
      const { zipCodes } = await import("@/lib/qr/zip");
      const blob = await zipCodes(entries, format, (done) =>
        setProgress(`Preparing ${done} of ${entries.length}…`),
      );
      saveBlob(blob, `quickqreate-codes-${new Date().toISOString().slice(0, 10)}.zip`);
      toast(`Downloaded ${entries.length} ${entries.length === 1 ? "code" : "codes"}`);
    } catch {
      toast("The ZIP file couldn’t be made. Please try again.", "error");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div
      role="region"
      aria-label="Selected codes"
      className="sticky bottom-24 z-20 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3 shadow-pop sm:bottom-4"
    >
      <span className="px-1 text-sm font-semibold text-fg">{selected.length} selected</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <label>
          <span className="sr-only">ZIP file format</span>
          <Select
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            className="w-24"
          >
            {ZIP_FORMATS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <Button onClick={downloadZip} disabled={progress !== null}>
          <Download aria-hidden />
          {progress ?? "Download ZIP"}
        </Button>
        {canEdit && (
          <Button variant="outline" onClick={onMove}>
            <FolderInput aria-hidden /> Move
          </Button>
        )}
        {canEdit && trackable.length > 0 && (
          <Button variant="outline" onClick={() => onSetPaused(!allPaused)}>
            {allPaused ? <Play aria-hidden /> : <Pause aria-hidden />}
            {allPaused ? "Resume" : "Pause"}
          </Button>
        )}
        {canEdit && (
          <Button variant="outline" onClick={onDelete} className="text-danger">
            <Trash2 aria-hidden /> Delete
          </Button>
        )}
        <Button variant="ghost" onClick={onClear}>
          <X aria-hidden /> Clear
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `CodesView`.** Create `features/codes/list/CodesView.tsx`:

```tsx
"use client";

import { FolderOpen, Link2, ListChecks, Plus, Wifi } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { withWorkspace } from "@/components/app/nav";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { deleteCode, duplicateCode, updateCode } from "@/features/codes/api";
import { moveCodes } from "@/features/folders/api";
import { MoveDialog } from "@/features/folders/MoveDialog";
import { cn } from "@/lib/cn";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { CodeRow, LIST_COLUMNS } from "./CodeRow";
import { CodeTile } from "./CodeTile";
import { downloadPng } from "./download";
import { announceCodesChanged } from "./events";
import { filterCodes, NO_FILTERS, sortCodes, typesIn, type ListFilters, type SortKey } from "./filters";
import { SelectionBar } from "./SelectionBar";
import { Toolbar } from "./Toolbar";
import { useListView } from "./useListView";

const QUICK_STARTS = [
  { type: "url", label: "Link", hint: "Open a website", icon: Link2 },
  { type: "wifi", label: "Wi-Fi", hint: "Join a network", icon: Wifi },
  { type: "links", label: "Link list", hint: "Several links on one page", icon: ListChecks },
] as const;

interface CodesViewProps {
  userId: string;
  codes: QrCodeRow[];
  folders: FolderRow[];
  /** The folder being shown, or null for all codes. */
  folder: FolderRow | null;
  /** Whose codes these are: you, or a team owner. */
  ownerId: string;
  /** The team being viewed (for links), or null for your own codes. */
  teamId: string | null;
  canEdit: boolean;
  /** Scans in the last 30 days, by code id. */
  recentScans: Record<string, number>;
}

/** The Codes list: search, filters, list or grid, selection and the bulk actions. */
export function CodesView({
  userId,
  codes: initialCodes,
  folders,
  folder,
  teamId,
  canEdit,
  recentScans,
}: CodesViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [codes, setCodes] = useState(initialCodes);
  const [filters, setFilters] = useState<ListFilters>(NO_FILTERS);
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useListView(userId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [toDelete, setToDelete] = useState<QrCodeRow[] | null>(null);
  const [toMove, setToMove] = useState<QrCodeRow[] | null>(null);
  const [working, setWorking] = useState(false);

  const visible = useMemo(
    () => sortCodes(filterCodes(codes, filters), sort, recentScans),
    [codes, filters, sort, recentScans],
  );
  const selected = codes.filter((code) => selectedIds.has(code.id));
  const allVisibleSelected = visible.length > 0 && visible.every((c) => selectedIds.has(c.id));
  const filtered = filters.query.trim() !== "" || filters.type !== "all" || filters.status !== "all";

  function changed() {
    announceCodesChanged();
    router.refresh();
  }

  function select(code: QrCodeRow, on: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (on) next.add(code.id);
      else next.delete(code.id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const code of visible) {
        if (allVisibleSelected) next.delete(code.id);
        else next.add(code.id);
      }
      return next;
    });
  }

  async function setPaused(list: QrCodeRow[], paused: boolean) {
    const targets = list.filter((code) => code.is_dynamic);
    let failed = 0;
    const updated = new Map<string, QrCodeRow>();
    for (const code of targets) {
      const result = await updateCode(code.id, { status: paused ? "paused" : "active" });
      if (result.ok) updated.set(code.id, result.value);
      else failed++;
    }
    setCodes((current) => current.map((code) => updated.get(code.id) ?? code));
    if (failed) toast(`${failed} ${failed === 1 ? "code" : "codes"} couldn’t be changed.`, "error");
    else if (updated.size === 1) {
      toast(paused ? `Paused “${targets[0]!.name}”` : `“${targets[0]!.name}” is active again`);
    } else toast(paused ? `Paused ${updated.size} codes` : `Resumed ${updated.size} codes`);
    changed();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setWorking(true);
    const removed = new Set<string>();
    for (const code of toDelete) {
      const result = await deleteCode(code.id);
      if (result.ok) removed.add(code.id);
    }
    setWorking(false);
    setCodes((current) => current.filter((code) => !removed.has(code.id)));
    setSelectedIds((current) => new Set([...current].filter((id) => !removed.has(id))));
    const failed = toDelete.length - removed.size;
    if (failed) toast(`${failed} ${failed === 1 ? "code" : "codes"} couldn’t be deleted.`, "error");
    else toast(removed.size === 1 ? `Deleted “${toDelete[0]!.name}”` : `Deleted ${removed.size} codes`);
    setToDelete(null);
    changed();
  }

  async function confirmMove(folderId: string | null) {
    if (!toMove) return;
    setWorking(true);
    const ids = toMove.map((code) => code.id);
    const result = await moveCodes(ids, folderId);
    setWorking(false);
    if (!result.ok) return toast(result.error, "error");
    // In a folder view, codes moved elsewhere leave the list.
    setCodes((current) =>
      folder && folderId !== folder.id
        ? current.filter((code) => !ids.includes(code.id))
        : current.map((code) => (ids.includes(code.id) ? { ...code, folder_id: folderId } : code)),
    );
    const where = folderId ? `to “${folders.find((f) => f.id === folderId)?.name}”` : "out of its folder";
    toast(ids.length === 1 ? `Moved “${toMove[0]!.name}” ${where}` : `Moved ${ids.length} codes`);
    setToMove(null);
    changed();
  }

  async function duplicate(code: QrCodeRow) {
    const result = await duplicateCode(code);
    if (!result.ok) return toast(result.error, "error");
    setCodes((current) => [result.value, ...current]);
    toast(`Duplicated as “${result.value.name}”`);
    changed();
  }

  async function download(code: QrCodeRow) {
    try {
      await downloadPng(code);
    } catch {
      toast("The code couldn’t be downloaded. Please try again.", "error");
    }
  }

  const handlers = {
    onDuplicate: duplicate,
    onMove: setToMove,
    onToggleStatus: (code: QrCodeRow) => setPaused([code], code.status !== "paused"),
    onDelete: setToDelete,
    onDownload: download,
  };

  if (codes.length === 0) {
    return folder ? (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-field-border px-6 py-14 text-center">
        <FolderOpen aria-hidden className="size-8 text-fg-muted" />
        <h2 className="text-lg font-semibold text-fg">This folder is empty</h2>
        <p className="max-w-md text-sm text-fg-muted">
          {canEdit ? "Use “Move to folder” on any code to add it here." : "Codes added to this folder will show up here."}
        </p>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-field-border px-6 py-12 text-center">
        <h2 className="text-lg font-semibold text-fg">Create your first QR code</h2>
        {canEdit ? (
          <>
            <p className="max-w-md text-sm text-fg-muted">Pick what it should open. You can change everything later.</p>
            <ul className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
              {QUICK_STARTS.map(({ type, label, hint, icon: Icon }) => (
                <li key={type}>
                  <Link
                    href={withWorkspace(`/?type=${type}`, teamId)}
                    className="flex min-h-11 flex-col items-center gap-1 rounded-control border border-border bg-surface px-4 py-4 text-center hover:bg-surface-2 focus-ring"
                  >
                    <Icon aria-hidden className="size-5 text-fg-muted" />
                    <span className="font-medium text-fg">{label}</span>
                    <span className="text-sm text-fg-muted">{hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={withWorkspace("/", teamId)} className={buttonClasses("outline", "md")}>
              <Plus aria-hidden /> Other types
            </Link>
          </>
        ) : (
          <p className="max-w-md text-sm text-fg-muted">Codes added here will show up for you.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Toolbar
        filters={filters}
        onFilters={setFilters}
        sort={sort}
        onSort={setSort}
        view={view}
        onView={setView}
        types={typesIn(codes)}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-fg-muted">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 sm:min-h-0">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={allVisibleSelected}
            disabled={visible.length === 0}
            onChange={toggleAllVisible}
          />
          Select all shown
        </label>
        <span>
          {visible.length} {visible.length === 1 ? "code" : "codes"}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <h2 className="text-lg font-semibold text-fg">No codes match</h2>
          <p className="text-sm text-fg-muted">Try a different search or filter.</p>
          {filtered && (
            <Button variant="outline" onClick={() => setFilters(NO_FILTERS)}>
              Clear filters
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <ul
          aria-label="Codes"
          data-view="grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {visible.map((code) => (
            <CodeTile
              key={code.id}
              code={code}
              canEdit={canEdit}
              teamId={teamId}
              scans={recentScans[code.id] ?? 0}
              selected={selectedIds.has(code.id)}
              onSelect={select}
              {...handlers}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-card border border-border bg-surface">
          <div
            aria-hidden
            className={cn(
              "hidden gap-x-3 border-b border-border px-3 py-2 text-sm font-medium text-fg-muted md:grid",
              LIST_COLUMNS,
            )}
          >
            <span className="w-5" />
            <span className="w-10" />
            <span>Name</span>
            <span>Type</span>
            <span>Status</span>
            <span className="text-right">Scans (30 days)</span>
            <span>Updated</span>
            <span className="w-9" />
          </div>
          <ul aria-label="Codes" data-view="list">
            {visible.map((code) => (
              <CodeRow
                key={code.id}
                code={code}
                canEdit={canEdit}
                teamId={teamId}
                scans={recentScans[code.id] ?? 0}
                selected={selectedIds.has(code.id)}
                onSelect={select}
                {...handlers}
              />
            ))}
          </ul>
        </div>
      )}

      {selected.length > 0 && (
        <SelectionBar
          selected={selected}
          canEdit={canEdit}
          onMove={() => setToMove(selected)}
          onSetPaused={(paused) => void setPaused(selected, paused)}
          onDelete={() => setToDelete(selected)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={
          toDelete?.length === 1
            ? `Delete “${toDelete[0]!.name}”?`
            : `Delete ${toDelete?.length ?? 0} codes?`
        }
        description={
          toDelete?.some((code) => code.is_dynamic)
            ? "Trackable codes stop working and their scan history is deleted. Printed copies will show “not set up”."
            : "This removes the saved codes from your account. Downloaded copies keep working."
        }
        confirmLabel={`Delete ${toDelete?.length ?? 0} ${toDelete?.length === 1 ? "code" : "codes"}`}
        danger
        pending={working}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
      <MoveDialog
        open={toMove !== null}
        count={toMove?.length ?? 0}
        folders={folders}
        current={
          toMove && toMove.every((code) => code.folder_id === toMove[0]?.folder_id)
            ? (toMove[0]?.folder_id ?? null)
            : null
        }
        pending={working}
        onMove={confirmMove}
        onClose={() => setToMove(null)}
      />
    </div>
  );
}
```

- [ ] **Step 5: Wire it into the page, and delete the old list.** Replace `app/(app)/codes/page.tsx` with:

```tsx
import { Eye, Plus, Rows3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/PageHeader";
import { withWorkspace } from "@/components/app/nav";
import { buttonClasses } from "@/components/ui/Button";
import { CodesView } from "@/features/codes/list/CodesView";
import { FolderActions } from "@/features/codes/list/FolderActions";
import { formatCount } from "@/features/dashboard/format";
import { ROLE_LABELS, workspaceLabel } from "@/features/teams/roles";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Codes · QuickQReate" };

export default async function CodesPage({ searchParams }: PageProps<"/codes">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const { supabase, user } = await requireUser(
    requested ? `/codes?workspace=${requested}` : "/codes",
  );
  const { data: workspaces } = await supabase.rpc("my_workspaces");
  const membership = workspaces?.find((w) => w.owner_id === requested) ?? null;
  // Members can read their teams' codes too, so always filter to the workspace shown.
  const ownerId = membership?.owner_id ?? user.id;
  const teamId = membership?.owner_id ?? null;
  const canEdit = !membership || membership.role === "editor";

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", ownerId)
    .order("name");
  // Only a folder of this workspace counts; anything else shows all codes.
  const folder = (folders ?? []).find((f) => f.id === folderParam) ?? null;
  let query = supabase
    .from("qr_codes")
    .select("*")
    .eq("user_id", ownerId)
    .order("updated_at", { ascending: false });
  if (folder) query = query.eq("folder_id", folder.id);
  const [{ data: codes }, { data: scans }] = await Promise.all([
    query,
    supabase.rpc("recent_scan_counts", { p_owner: ownerId }),
  ]);
  const list = codes ?? [];
  const recentScans = Object.fromEntries((scans ?? []).map((row) => [row.code_id, Number(row.scans)]));
  const totalScans = list.reduce((sum, code) => sum + (recentScans[code.id] ?? 0), 0);
  const title = folder ? folder.name : membership ? `${workspaceLabel(membership)}’s codes` : "All codes";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={
          <>
            {membership && <>{ROLE_LABELS[membership.role]} · </>}
            {formatCount(list.length)} {list.length === 1 ? "code" : "codes"} ·{" "}
            {formatCount(totalScans)} {totalScans === 1 ? "scan" : "scans"} in the last 30 days
          </>
        }
        actions={
          canEdit && (
            <>
              {folder && <FolderActions folder={folder} teamId={teamId} />}
              <Link href={withWorkspace("/bulk", teamId)} className={buttonClasses("outline", "md")}>
                <Rows3 aria-hidden /> Bulk create
              </Link>
              <Link href={withWorkspace("/", teamId)} className={buttonClasses("primary", "md")}>
                <Plus aria-hidden /> Create code
              </Link>
            </>
          )
        }
      />

      {!canEdit && (
        <p className="flex items-center gap-2 rounded-control bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          <Eye aria-hidden className="size-4 shrink-0" />
          You can view these codes and their analytics. Ask the owner to make you an editor to
          change them.
        </p>
      )}

      <CodesView
        key={`${ownerId}:${folder?.id ?? "all"}`}
        userId={user.id}
        codes={list}
        folders={folders ?? []}
        folder={folder}
        ownerId={ownerId}
        teamId={teamId}
        canEdit={canEdit}
        recentScans={recentScans}
      />
    </div>
  );
}
```

`FolderActions` comes in Task 4. Until then, create a placeholder file so this task compiles. Create `features/codes/list/FolderActions.tsx`:

```tsx
"use client";

import type { FolderRow } from "@/types/supabase";

/** Rename and Delete for the folder being shown (filled in by the next task). */
export function FolderActions(_props: { folder: FolderRow; teamId: string | null }) {
  return null;
}
```

Then run `git rm features/dashboard/CodeList.tsx features/dashboard/CodeCard.tsx`, and confirm nothing else imports them: `grep -rn "dashboard/CodeList\|dashboard/CodeCard" app features components` should print nothing.

- [ ] **Step 6: Run the tests and checks, and confirm they pass.**

Run: `npx vitest run features/codes/list && npm run lint && npm run typecheck && npm test`
Expected: PASS. Fix any formatting with Prettier first.

- [ ] **Step 7: Commit.**

```bash
npx prettier --write features/codes/list "app/(app)/codes/page.tsx"
git add -A features/codes/list features/dashboard "app/(app)/codes/page.tsx"
git commit -m "Redesign the Codes list

A table (or grid) with one status per code, the short link or content,
the last 30 days' scans and a single ⋯ menu; Type, Status and sort
controls; select-to-download, move, pause or delete; first-code quick
starts and clear empty states. List or grid is remembered per person.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Folders in the sidebar

**Files:**
- Create:
  - `components/app/FolderNav.tsx` and `components/app/FolderNav.test.tsx`
- Modify:
  - `features/codes/list/FolderActions.tsx` (full version)
  - `components/app/AppShell.tsx` (render `FolderNav` under the Codes link)

**Interfaces:**
- Consumes:
  - `CODES_CHANGED` and `announceCodesChanged` (Task 3)
  - `createFolder`, `renameFolder`, `deleteFolder` and `MAX_FOLDER_NAME`
  - `PromptDialog`, `ConfirmDialog` and `withWorkspace`
- Produces:
  - `<FolderNav ownerId teamId canEdit expanded onNavigate />`
  - `<FolderActions folder teamId />`

- [ ] **Step 1: Write the failing tests.** Create `components/app/FolderNav.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFolder } from "@/features/folders/api";

import { FolderNav } from "./FolderNav";

const push = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  usePathname: () => "/codes",
  useSearchParams: () => search,
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
vi.mock("@/features/folders/api", () => ({ createFolder: vi.fn(), MAX_FOLDER_NAME: 60 }));
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () =>
          table === "folders"
            ? { order: async () => ({ data: [{ id: "f1", name: "Flyers" }] }) }
            : Promise.resolve({ data: [{ folder_id: "f1" }, { folder_id: null }, { folder_id: "f1" }] }),
      }),
    }),
  }),
}));

beforeEach(() => {
  search = new URLSearchParams();
  push.mockReset();
});

describe("FolderNav", () => {
  it("lists all codes and each folder with counts, keeping the team", async () => {
    render(<FolderNav ownerId="t1" teamId="t1" canEdit expanded onNavigate={() => {}} />);
    const all = await screen.findByRole("link", { name: /All codes/ });
    expect(all).toHaveAttribute("href", "/codes?workspace=t1");
    expect(all).toHaveTextContent("3");
    const flyers = screen.getByRole("link", { name: /Flyers/ });
    expect(flyers).toHaveAttribute("href", "/codes?folder=f1&workspace=t1");
    expect(flyers).toHaveTextContent("2");
  });

  it("marks the folder being shown", async () => {
    search = new URLSearchParams("folder=f1");
    render(<FolderNav ownerId="u1" teamId={null} canEdit expanded onNavigate={() => {}} />);
    expect(await screen.findByRole("link", { name: /Flyers/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: /All codes/ })).not.toHaveAttribute("aria-current");
  });

  it("creates a folder and opens it", async () => {
    vi.mocked(createFolder).mockResolvedValue({
      ok: true,
      value: { id: "f2", user_id: "u1", name: "Menus", created_at: "", updated_at: "" },
    });
    render(<FolderNav ownerId="u1" teamId={null} canEdit expanded onNavigate={() => {}} />);
    await userEvent.click(await screen.findByRole("button", { name: "New folder" }));
    await userEvent.type(screen.getByLabelText("Folder name"), "Menus");
    await userEvent.click(screen.getByRole("button", { name: "Create folder" }));
    expect(createFolder).toHaveBeenCalledWith("u1", "Menus");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/codes?folder=f2"));
  });

  it("viewers see folders but can't add one", async () => {
    render(<FolderNav ownerId="t1" teamId="t1" canEdit={false} expanded onNavigate={() => {}} />);
    await screen.findByRole("link", { name: /Flyers/ });
    expect(screen.queryByRole("button", { name: "New folder" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run components/app/FolderNav.test.tsx`
Expected: FAIL with "Failed to resolve import ./FolderNav".

- [ ] **Step 3: Implement.** Create `components/app/FolderNav.tsx`:

```tsx
"use client";

import { FolderPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PromptDialog } from "@/components/ui/PromptDialog";
import { announceCodesChanged, CODES_CHANGED } from "@/features/codes/list/events";
import { createFolder, MAX_FOLDER_NAME } from "@/features/folders/api";
import { cn } from "@/lib/cn";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { withWorkspace } from "./nav";

interface FolderCounts {
  ownerId: string;
  total: number;
  folders: { id: string; name: string; count: number }[];
}

const folderLinkClass =
  "flex min-h-9 items-center gap-2 rounded-control px-2.5 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg aria-[current=true]:bg-surface-2 aria-[current=true]:font-semibold aria-[current=true]:text-fg focus-ring max-sm:min-h-11";

/** "All codes" and each folder (with counts) under Codes in the sidebar; one click filters. */
export function FolderNav({
  ownerId,
  teamId,
  canEdit,
  expanded,
  onNavigate,
}: {
  ownerId: string;
  teamId: string | null;
  canEdit: boolean;
  /** False on the collapsed tablet rail, where the folder list is hidden. */
  expanded: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<FolderCounts | null>(null);
  const [version, setVersion] = useState(0);
  const [naming, setNaming] = useState(false);
  const onCodes = pathname === "/codes";
  const currentFolder = onCodes ? searchParams.get("folder") : null;

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let active = true;
    void Promise.all([
      supabase.from("folders").select("id, name").eq("user_id", ownerId).order("name"),
      supabase.from("qr_codes").select("folder_id").eq("user_id", ownerId),
    ]).then(([folders, codes]) => {
      if (!active) return;
      const counts = new Map<string, number>();
      for (const code of codes.data ?? []) {
        if (code.folder_id) counts.set(code.folder_id, (counts.get(code.folder_id) ?? 0) + 1);
      }
      setData({
        ownerId,
        total: codes.data?.length ?? 0,
        folders: (folders.data ?? []).map((f) => ({ ...f, count: counts.get(f.id) ?? 0 })),
      });
    });
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(CODES_CHANGED, onChange);
    return () => {
      active = false;
      window.removeEventListener(CODES_CHANGED, onChange);
    };
  }, [ownerId, version, pathname]);

  const shown = data?.ownerId === ownerId ? data : null;

  async function create(name: string): Promise<string | void> {
    const result = await createFolder(ownerId, name);
    if (!result.ok) return result.error;
    setNaming(false);
    announceCodesChanged();
    onNavigate();
    router.push(withWorkspace(`/codes?folder=${result.value.id}`, teamId));
  }

  return (
    <div className={cn("flex flex-col", !expanded && "max-lg:hidden")}>
      <ul aria-label="Folders" className="ml-4 flex flex-col gap-0.5 border-l border-border pl-2">
        <li>
          <Link
            href={withWorkspace("/codes", teamId)}
            aria-current={onCodes && !currentFolder ? "true" : undefined}
            onClick={onNavigate}
            className={folderLinkClass}
          >
            <span className="min-w-0 flex-1 truncate">All codes</span>
            <span className="tabular-nums">{shown?.total ?? ""}</span>
          </Link>
        </li>
        {shown?.folders.map((folder) => (
          <li key={folder.id}>
            <Link
              href={withWorkspace(`/codes?folder=${folder.id}`, teamId)}
              aria-current={currentFolder === folder.id ? "true" : undefined}
              onClick={onNavigate}
              className={folderLinkClass}
            >
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
              <span className="tabular-nums">{folder.count}</span>
            </Link>
          </li>
        ))}
        {canEdit && (
          <li>
            <button type="button" onClick={() => setNaming(true)} className={cn(folderLinkClass, "w-full")}>
              <FolderPlus aria-hidden className="size-4" /> New folder
            </button>
          </li>
        )}
      </ul>
      <PromptDialog
        open={naming}
        title="New folder"
        label="Folder name"
        confirmLabel="Create folder"
        maxLength={MAX_FOLDER_NAME}
        onSubmit={create}
        onClose={() => setNaming(false)}
      />
    </div>
  );
}
```

In `components/app/AppShell.tsx`:
- Add `import { FolderNav } from "./FolderNav";`.
- In the sidebar `<nav aria-label="Main">`, render the Codes link, then `FolderNav`, then the rest. Replace `{main.map(sideLink)}` with:

```tsx
          {sideLink(main[0]!)}
          <FolderNav
            ownerId={team?.ownerId ?? user.id}
            teamId={ownerId}
            canEdit={canCreate}
            expanded={expanded}
            onNavigate={collapse}
          />
          {main.slice(1).map(sideLink)}
```

Replace `features/codes/list/FolderActions.tsx` with:

```tsx
"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { withWorkspace } from "@/components/app/nav";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { useToast } from "@/components/ui/Toast";
import { deleteFolder, MAX_FOLDER_NAME, renameFolder } from "@/features/folders/api";
import type { FolderRow } from "@/types/supabase";

import { announceCodesChanged } from "./events";

/** Rename and Delete for the folder being shown, in the page header. */
export function FolderActions({ folder, teamId }: { folder: FolderRow; teamId: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);

  async function rename(name: string): Promise<string | void> {
    const result = await renameFolder(folder.id, name);
    if (!result.ok) return result.error;
    setRenaming(false);
    toast(`Renamed to “${result.value.name}”`);
    announceCodesChanged();
    router.refresh();
  }

  async function remove() {
    setPending(true);
    const result = await deleteFolder(folder.id);
    setPending(false);
    if (!result.ok) return toast(result.error, "error");
    setDeleting(false);
    toast(`Deleted the folder “${folder.name}”`);
    announceCodesChanged();
    router.push(withWorkspace("/codes", teamId));
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setRenaming(true)}>
        <Pencil aria-hidden /> Rename folder
      </Button>
      <Button variant="ghost" onClick={() => setDeleting(true)}>
        <Trash2 aria-hidden /> Delete folder
      </Button>
      <PromptDialog
        open={renaming}
        title="Rename folder"
        label="Folder name"
        initialValue={folder.name}
        confirmLabel="Rename"
        maxLength={MAX_FOLDER_NAME}
        onSubmit={rename}
        onClose={() => setRenaming(false)}
      />
      <ConfirmDialog
        open={deleting}
        title={`Delete the folder “${folder.name}”?`}
        description="The codes in it aren’t deleted. They move out of the folder."
        confirmLabel="Delete folder"
        danger
        pending={pending}
        onConfirm={remove}
        onClose={() => setDeleting(false)}
      />
    </>
  );
}
```

- [ ] **Step 4: Run the tests and checks, and confirm they pass.**

Run: `npx vitest run components/app features/codes && npm run lint && npm run typecheck && npm test`
Expected: PASS. The Phase 1b AppShell tests must still pass; they don't mock Supabase, so `FolderNav` shows "All codes" with no counts.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write components/app features/codes/list/FolderActions.tsx
git add components/app features/codes/list/FolderActions.tsx
git commit -m "Put folders under Codes in the sidebar

All codes and each folder with its count; one click filters, and New
folder is right there. Rename and Delete sit in the folder's header.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Quick starts open the right type

**Files:**
- Modify: `features/generator/useGenerator.ts`, `features/generator/useGenerator.test.tsx`

**Interfaces:**
- Consumes: the existing `useSearchParams` reads in `useGenerator`.
- Produces: `/?type=<code type id>` opens a new code of that type.

- [ ] **Step 1: Write the failing test.** Append to the `describe` in `features/generator/useGenerator.test.tsx`:

```tsx
  it("opens a new code of the type in ?type= (the Codes page's quick starts)", async () => {
    search = new URLSearchParams("type=wifi");
    const { result } = renderHook(() => useGenerator());
    await waitFor(() => expect(result.current.state.activeType).toBe("wifi"));
  });
```

- [ ] **Step 2: Run it and confirm it fails.**

Run: `npx vitest run features/generator/useGenerator.test.tsx`
Expected: FAIL. `activeType` stays `"url"`.

- [ ] **Step 3: Implement.** In `features/generator/useGenerator.ts`, after `const ownerParam = searchParams.get("workspace");`, add `const typeParam = searchParams.get("type");`. After the address-bar effect (the one ending `}, [editId, ownerParam]);`), add:

```ts
  // /?type=wifi (from the Codes page's quick starts) opens a new code of that type.
  useEffect(() => {
    if (!editId && typeParam && isCodeType(typeParam)) {
      dispatch({ type: "setActiveType", activeType: typeParam });
    }
  }, [editId, typeParam]);
```

- [ ] **Step 4: Run the tests and confirm they pass.**

Run: `npx vitest run features/generator && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add features/generator/useGenerator.ts features/generator/useGenerator.test.tsx
git commit -m "Open the generator on the type a quick start asks for

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Signed-in checks for the list and folders

**Files:**
- Modify:
  - `e2e/accounts/global-setup.ts` (seed a folder and some scans)
  - `e2e/accounts/fixtures.ts` (`Seed.folderId`)
  - `e2e/accounts/app.spec.ts`

**Interfaces:**
- Consumes: the seeded owner and viewer (Phase 1b), and the list and folders (Tasks 3–4).

- [ ] **Step 1: Write the tests and seed.**

In `e2e/accounts/fixtures.ts`, add to `Seed`:

```ts
  /** The owner's "Flyers" folder, holding the Wi-Fi code. */
  folderId: string;
```

In `e2e/accounts/global-setup.ts`, after the team member insert, add:

```ts
  const wifi = codes.find((code) => code.name === "Front desk Wi-Fi")!;
  const { data: flyers, error: folderError } = await admin
    .from("folders")
    .insert({ user_id: ownerId, name: "Flyers" })
    .select("id")
    .single();
  if (folderError || !flyers) throw folderError ?? new Error("Couldn't create the folder");
  await admin.from("qr_codes").update({ folder_id: flyers.id }).eq("id", wifi.id);
  // Three recent scans for the menu, so the Scans column has something to show.
  await admin.from("scan_events").insert(
    ["a", "b", "c"].map((visitor) => ({ code_id: menu!.id, visitor_hash: visitor })),
  );
```

Change `const seeded: Seed = { ownerId, viewerId, menuId: menu!.id };` to `const seeded: Seed = { ownerId, viewerId, menuId: menu!.id, folderId: flyers.id };`. Move the `const menu = …` line above this block if it isn't already.

In `e2e/accounts/app.spec.ts`:
- Add `"codes?folder={folder}",` to `PAGES` after `"codes",`.
- Change `resolve` to:

```ts
const resolve = (path: string) =>
  path.replace("{menu}", seed().menuId).replace("{folder}", seed().folderId);
```

- Inside the `"signed in as an owner"` describe, add:

```ts
  test("the list shows one status and recent scans per code", async ({ page }) => {
    await page.goto("codes");
    const menu = page.getByRole("listitem", { name: "Spring menu" });
    // The phone line comes first in the DOM and is hidden at this width; check the visible copy.
    await expect(menu.getByText("Active").filter({ visible: true }).first()).toBeVisible();
    await expect(menu.getByText("3", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(
      page
        .getByRole("listitem", { name: "Front desk Wi-Fi" })
        .getByText("Static")
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });

  test("grid view is remembered after a reload", async ({ page }) => {
    await page.goto("codes");
    await page.getByRole("radio", { name: "Grid view" }).click();
    await page.reload();
    await expect(page.getByRole("list", { name: "Codes" })).toHaveAttribute("data-view", "grid");
  });

  test("folders in the sidebar filter the list", async ({ page }) => {
    await page.goto("codes");
    await page.getByRole("list", { name: "Folders" }).getByRole("link", { name: /Flyers/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Flyers" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Front desk Wi-Fi" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Spring menu" })).toHaveCount(0);
  });

  test("an unknown folder shows all codes", async ({ page }) => {
    await page.goto(`codes?folder=${"0".repeat(8)}-0000-4000-8000-${"0".repeat(12)}`);
    await expect(page.getByRole("heading", { level: 1, name: "All codes" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: "Spring menu" })).toBeVisible();
  });

  test("filters that match nothing offer to clear them", async ({ page }) => {
    await page.goto("codes");
    await page.getByLabel("Status").selectOption("expired");
    await expect(page.getByRole("heading", { name: "No codes match" })).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByRole("listitem", { name: "Spring menu" })).toBeVisible();
  });
```

- [ ] **Step 2: Run the signed-in suite and confirm the new tests pass.** The local Supabase must be running (`npm run db:start`).

Run: `npm run test:e2e:accounts`
Expected: every test PASSES, including 27 page × width checks (9 pages × 3 widths). If a page fails a width or axe check, fix the component at its source and record a ruling for each fix.

- [ ] **Step 3: Commit.**

```bash
npx prettier --write e2e/accounts
git add e2e/accounts
git commit -m "Check the codes list, grid, folders and filters signed in

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Phase 1b follow-ups

**Files:**
- Modify:
  - `components/ui/Toast.tsx`
  - `scripts/build-brand-assets.mjs`
  - `components/app/AppShell.tsx`
  - `components/app/UserMenu.tsx`, `components/app/UserMenu.test.tsx`
  - `public/email-templates/magic-link.html`, `public/email-templates/email-change.html`
  - `.prettierignore`
  - `.github/workflows/ci.yml`
  - `app/(app)/settings/page.tsx`
  - `docs/superpowers/specs/2026-10-14-quickqreate-redesign-design.md`
  - `e2e/accounts/app.spec.ts`
- Create:
  - `app/(app)/settings/HashRedirect.tsx` and `app/(app)/settings/HashRedirect.test.tsx`
  - `public/email-templates/templates.test.ts`

**Interfaces:** none new.

- [ ] **Step 1: Write the failing tests.**

Create `app/(app)/settings/HashRedirect.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HashRedirect } from "./HashRedirect";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("HashRedirect", () => {
  it("sends old /account#api-keys links to the API keys tab", () => {
    window.location.hash = "#api-keys";
    render(<HashRedirect />);
    expect(replace).toHaveBeenCalledWith("/settings/api-keys");
    window.location.hash = "";
  });
});
```

Create `public/email-templates/templates.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = resolve(process.cwd(), "public/email-templates");

describe("email templates", () => {
  it("link only to current app addresses", () => {
    for (const file of readdirSync(DIR).filter((name) => name.endsWith(".html"))) {
      const html = readFileSync(resolve(DIR, file), "utf8");
      expect(html, file).not.toMatch(/next=\/dashboard|next=\/account(?!\/update-password)/);
    }
  });
});
```

In `components/app/UserMenu.test.tsx`, change `screen.getByRole("button", { name: /Account menu/ })` to `screen.getByRole("button", { name: /David Allmon/ })`. The button's name now comes from its visible text (WCAG 2.5.3).

In `e2e/accounts/app.spec.ts`, inside the `"phones get bottom tabs instead of the sidebar"` test, after the existing assertions, add:

```ts
    const logo = page.getByRole("banner").getByRole("link", { name: "QuickQReate codes" });
    expect((await logo.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await tabs.getByRole("button", { name: "More" }).click();
    for (const link of await page.getByRole("dialog", { name: "More" }).getByRole("link").all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
```

- [ ] **Step 2: Run the tests and confirm they fail.**

Run: `npx vitest run "app/(app)/settings/HashRedirect.test.tsx" public/email-templates/templates.test.ts components/app/UserMenu.test.tsx`
Expected: FAIL.
- `./HashRedirect` doesn't exist.
- `magic-link.html` and `email-change.html` still use old addresses.
- The menu button is still named "Account menu".

- [ ] **Step 3: Implement.**

Create `app/(app)/settings/HashRedirect.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Old /account#api-keys bookmarks land on /settings#api-keys; send them to the right tab. */
export function HashRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (window.location.hash === "#api-keys") router.replace("/settings/api-keys");
  }, [router]);
  return null;
}
```

In `app/(app)/settings/page.tsx`:
- Add `import { HashRedirect } from "./HashRedirect";`.
- Return `<><HashRedirect /><SettingsSection …>…</SettingsSection></>` around the existing section.

In `public/email-templates/magic-link.html`, replace every `next=/dashboard` with `next=/codes`. In `public/email-templates/email-change.html`, replace every `next=/account` with `next=/settings`.

In `components/app/UserMenu.tsx`, delete the line `aria-label="Account menu"`.

In `components/app/AppShell.tsx`:
- Change `sideLinkClass`'s `min-h-10` to `min-h-11`.
- Give the phone header's logo link the class `grid size-11 place-items-center rounded-control focus-ring` in place of `rounded-control focus-ring`.

In `components/ui/Toast.tsx`, change the success icon's `text-success` to `text-success-soft`. It sits on the inverted (`bg-fg`) toast.

In `scripts/build-brand-assets.mjs`:
- Delete the `fontFace("Space Grotesk", …)` entry from `fonts`.
- Replace every `"Space Grotesk"` in the CSS strings with `"Inter"`.
- Run `npm run brand` and confirm it finishes. If it changes files in `public/`, look at them and commit them.

In `.prettierignore`, add a line `e2e/accounts/.auth`.

In `.github/workflows/ci.yml`, add `timeout-minutes: 20` to the `accounts` job, after `runs-on: ubuntu-latest`.

In the spec's §5 neutrals table, change the light field border `#98a2b3` to `#848d9c` and the dark field border `#5a606b` to `#6b7280`. Add a sentence after the table: "Field borders are darker than first proposed so they meet the 3:1 rule below."

- [ ] **Step 4: Run the tests and checks, and confirm they pass.**

Run: `npx vitest run "app/(app)/settings" public/email-templates components/app && npm run lint && npm run typecheck && npm test && npm run test:e2e:accounts`
Expected: all PASS, including the 44px checks in the phone test.

- [ ] **Step 5: Commit.**

```bash
npx prettier --write "app/(app)/settings" components public/email-templates/templates.test.ts scripts/build-brand-assets.mjs .github/workflows/ci.yml
git add -A "app/(app)/settings" components public scripts .prettierignore .github/workflows/ci.yml docs/superpowers/specs e2e/accounts/app.spec.ts
git commit -m "Tidy up after the app shell

Readable toast check icon, 44px phone targets, the account button named
by its visible text, old #api-keys bookmarks and email links pointing at
current pages, the brand script on Inter, a CI timeout for the signed-in
tests, and the spec's field-border colors corrected.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Ship Phase 1c

**Files:** none new.

- [ ] **Step 1: Run the full local check.**

Run: `npx prettier --check . && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e && npm run test:e2e:accounts`
Expected: all PASS.

- [ ] **Step 2: Push and open the PR.**

```bash
git push -u origin feat/codes-list
gh pr create --base main --head feat/codes-list --title "Codes list redesign and sidebar folders" --body "$(cat <<'EOF'
Phase 1c of the redesign (spec §3.1, §4.1, §5; plan docs/superpowers/plans/2026-10-14-phase-1c-codes-list.md).

- Codes list: table or grid, one status per code (Active / Paused / Scheduled / Expired / Static), short link or content, last 30 days' scans, a single ⋯ menu; Type, Status and sort; select to download, move, pause or delete; quick-start and empty states. List/grid remembered per person.
- Folders under Codes in the sidebar with counts and New folder; Rename and Delete in the folder header.
- Migration (applied live before merge): recent_scan_counts; team lookups now need a two-step session on two-step accounts.
- Phase 1b follow-ups: toast icon contrast, 44px phone targets, account button name, old email/bookmark links, brand script, CI timeout, spec border colors.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Run the final whole-branch review before merging.** Follow superpowers:executing-plans "Final Review", with this plan's Review Focus and the ledger's rulings. Then run one fix pass if needed. Both CI jobs must pass.

- [ ] **Step 4: Confirm a recent verified backup, then apply the migration through the private SQL bridge.** Do this exactly as in Phase 1a, Task 13, Steps 4–5. The backslash count must be 0.

Verify with:

```sql
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'recent_scan_counts') as recent_fn,
  has_function_privilege('anon', 'public.recent_scan_counts(uuid,integer)', 'execute') as anon_can_call;
```

Expected: `recent_fn` is 1 and `anon_can_call` is `f`. Append the migration to the runbook under a "QuickQReate Phase 1c migration" heading.

- [ ] **Step 5: Merge and check the live site.**
  1. Run `gh pr merge --merge --delete-branch`.
  2. Wait for the deploy.
  3. Then check:
     - `/api/health` is OK.
     - In David's Chrome, `/codes` shows the new table with statuses, scans and the ⋯ menu. Grid view works.
     - The sidebar lists his folders ("test") with counts, and clicking one filters the list.
