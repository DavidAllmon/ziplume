// @vitest-environment node
//
// Applies the real migration to PGlite (Postgres in WebAssembly) on top of a small stand-in
// for Supabase's auth schema and roles, then checks row-level security and functions the way
// the API would see them: as anon, as two different signed-in users, and as service_role.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = resolve(process.cwd(), "supabase/migrations");
const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
// Signed up before profile photos existed, so the back-fill has someone to fill in.
const OLIVE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PROFILE_PHOTOS = "20261014120000_profile_photos.sql";

// Mirrors the parts of a Supabase database the migration depends on.
const SUPABASE_STUB = `
  create schema extensions;
  create extension pgcrypto with schema extensions;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, status text);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable
    as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
  grant usage on schema auth, public, extensions to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
  -- Supabase grants new public tables and functions to the API roles by default.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  -- Storage: buckets plus objects guarded by row-level security, as in Supabase.
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
    name text not null, owner uuid default auth.uid(), created_at timestamptz default now()
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable
    as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
  grant execute on function storage.foldername(text) to anon, authenticated, service_role;
`;

let db: PGlite;

async function emailOf(userId: string): Promise<string | null> {
  const { rows } = await db.query<{ email: string }>("select email from auth.users where id = $1", [
    userId,
  ]);
  return rows[0]?.email ?? null;
}

async function as<T>(
  role: "anon" | "authenticated" | "service_role",
  userId: string | null,
  sql: string,
  params: unknown[] = [],
  aal: "aal1" | "aal2" = "aal1",
): Promise<T[]> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  const email = userId ? await emailOf(userId) : null;
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    userId ? JSON.stringify({ sub: userId, role, aal, email }) : "",
  ]);
  await db.exec(`set role ${role}`);
  try {
    const result = await db.query<T>(sql, params);
    return result.rows;
  } finally {
    await db.exec("reset role");
  }
}

const asAlice = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", ALICE, sql, params);
const asBob = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", BOB, sql, params);
const asAnon = <T>(sql: string, params?: unknown[]) => as<T>("anon", null, sql, params);
const asService = <T>(sql: string, params?: unknown[]) => as<T>("service_role", null, sql, params);

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUB);
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
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'alice@example.com', '{"full_name":"Alice Example"}'),
       ($2, 'bob@example.com', '{}')`,
    [ALICE, BOB],
  );
});

afterAll(async () => {
  await db?.close();
});

describe("profiles", () => {
  it("are created on sign-up and visible only to their owner", async () => {
    expect(await asAlice("select id, display_name from public.profiles")).toEqual([
      { id: ALICE, display_name: "Alice Example" },
    ]);
    expect(await asBob("select id from public.profiles")).toEqual([{ id: BOB }]);
  });

  it("let users rename themselves but not others", async () => {
    await asAlice("update public.profiles set display_name = 'Al' where id = $1", [ALICE]);
    await asBob("update public.profiles set display_name = 'Hacked' where id = $1", [ALICE]);
    const [row] = await asService<{ display_name: string }>(
      "select display_name from public.profiles where id = $1",
      [ALICE],
    );
    expect(row?.display_name).toBe("Al");
  });
});

describe("qr_codes", () => {
  let aliceCode = "";

  it("users can create static and dynamic codes for themselves", async () => {
    const [stat] = await asAlice<{ id: string; user_id: string }>(
      `insert into public.qr_codes (name, qr_type, content) values ('Wi-Fi', 'wifi', '{"ssid":"Home"}')
       returning id, user_id`,
    );
    expect(stat?.user_id).toBe(ALICE);

    const [dyn] = await asAlice<{ id: string }>(
      `insert into public.qr_codes (name, qr_type, is_dynamic, slug, destination)
       values ('Menu', 'url', true, 'MENU42', 'https://example.com/menu') returning id`,
    );
    aliceCode = dyn!.id;
  });

  it("rejects codes created for someone else", async () => {
    const [own] = await asBob<{ user_id: string }>(
      `insert into public.qr_codes (name, qr_type) values ('Note', 'text') returning user_id`,
    );
    expect(own?.user_id).toBe(BOB);
    // user_id can name a workspace (for team editors), but only one the caller may edit.
    await expect(
      asBob(`insert into public.qr_codes (user_id, name, qr_type) values ($1, 'x', 'text')`, [
        ALICE,
      ]),
    ).rejects.toThrow(/row-level security/);
  });

  it("hides other users' codes for select, update and delete", async () => {
    expect(await asBob("select id from public.qr_codes where id = $1", [aliceCode])).toEqual([]);
    await asBob("update public.qr_codes set destination = 'https://evil.example' where id = $1", [
      aliceCode,
    ]);
    await asBob("delete from public.qr_codes where id = $1", [aliceCode]);
    const [row] = await asAlice<{ destination: string }>(
      "select destination from public.qr_codes where id = $1",
      [aliceCode],
    );
    expect(row?.destination).toBe("https://example.com/menu");
  });

  it("protects counters, ownership and the dynamic flag", async () => {
    await expect(asAlice("update public.qr_codes set scan_count = 999")).rejects.toThrow(
      /permission denied/,
    );
    await expect(asAlice("update public.qr_codes set user_id = $1", [BOB])).rejects.toThrow(
      /permission denied/,
    );
    await expect(asAlice("update public.qr_codes set is_dynamic = false")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("enforces slug format, uniqueness (case-insensitive) and safe destinations", async () => {
    await expect(
      asBob(`insert into public.qr_codes (name, qr_type, is_dynamic, slug, destination)
             values ('dup', 'url', true, 'menu42', 'https://example.com')`),
    ).rejects.toThrow(/duplicate key/);
    await expect(
      asBob(`insert into public.qr_codes (name, qr_type, is_dynamic, slug, destination)
             values ('bad', 'url', true, 'no spaces', 'https://example.com')`),
    ).rejects.toThrow(/check constraint/);
    await expect(
      asBob(`insert into public.qr_codes (name, qr_type, is_dynamic, slug, destination)
             values ('xss', 'url', true, 'XSS1', 'javascript:alert(1)')`),
    ).rejects.toThrow(/check constraint/);
    await expect(
      asBob(`insert into public.qr_codes (name, qr_type, is_dynamic) values ('half', 'url', true)`),
    ).rejects.toThrow(/qr_codes_dynamic_fields/);
  });

  it("updates updated_at on change", async () => {
    const [before] = await asAlice<{ updated_at: string }>(
      "select updated_at from public.qr_codes where id = $1",
      [aliceCode],
    );
    await new Promise((r) => setTimeout(r, 5));
    await asAlice("update public.qr_codes set name = 'Lunch menu' where id = $1", [aliceCode]);
    const [after] = await asAlice<{ updated_at: string }>(
      "select updated_at from public.qr_codes where id = $1",
      [aliceCode],
    );
    expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
      new Date(before!.updated_at).getTime(),
    );
  });

  it("anon has no access", async () => {
    await expect(asAnon("select * from public.qr_codes")).rejects.toThrow(/permission denied/);
    await expect(asAnon("select * from public.profiles")).rejects.toThrow(/permission denied/);
  });
});

describe("two-factor accounts", () => {
  const bobAal2 = <T>(sql: string, params?: unknown[]) =>
    as<T>("authenticated", BOB, sql, params, "aal2");

  it("hide everything from password-only sessions once a factor is verified", async () => {
    await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'unverified')", [
      BOB,
    ]);
    // An unfinished enrollment doesn't lock the account.
    expect(await asBob("select id from public.qr_codes")).toHaveLength(1);

    await db.query("update auth.mfa_factors set status = 'verified' where user_id = $1", [BOB]);
    expect(await asBob("select id from public.qr_codes")).toEqual([]);
    expect(await asBob("select id from public.profiles")).toEqual([]);
    await expect(
      asBob("insert into public.qr_codes (name, qr_type) values ('x', 'text')"),
    ).rejects.toThrow(/row-level security/);

    expect(await bobAal2("select id from public.qr_codes")).toHaveLength(1);
    expect(await bobAal2("select id from public.profiles")).toEqual([{ id: BOB }]);
    // Alice has no factor, so her aal1 session is unaffected.
    expect((await asAlice("select id from public.qr_codes")).length).toBeGreaterThan(0);

    await db.query("delete from auth.mfa_factors where user_id = $1", [BOB]);
    expect(await asBob("select id from public.qr_codes")).toHaveLength(1);
  });
});

describe("record_scan and analytics", () => {
  const scan = (slug: string, visitor: string, country: string | null = "US", device = "mobile") =>
    asService<{ destination: string; status: string }>(
      "select destination, status from public.record_scan($1, $2, $3, 'California', 'Los Angeles', $4, 'iOS', 'Safari')",
      [slug, visitor, country, device],
    );

  it("is only callable by the service role", async () => {
    await expect(asAnon("select * from public.record_scan('MENU42', 'v')")).rejects.toThrow(
      /permission denied/,
    );
    await expect(asAlice("select * from public.record_scan('MENU42', 'v')")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asAnon(
        "insert into public.scan_events (code_id, visitor_hash) values (gen_random_uuid(), 'x')",
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asAlice(
        "insert into public.scan_events (code_id, visitor_hash) select id, 'x' from public.qr_codes limit 1",
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("returns the destination, matches slugs case-insensitively and counts scans", async () => {
    expect(await scan("menu42", "visitor-a")).toEqual([
      { destination: "https://example.com/menu", status: "active" },
    ]);
    await scan("MENU42", "visitor-a");
    await scan("Menu42", "visitor-b", "XX", "desktop");
    const [code] = await asAlice<{ scan_count: string; last_scanned_at: string | null }>(
      "select scan_count, last_scanned_at from public.qr_codes where slug = 'MENU42'",
    );
    expect(Number(code?.scan_count)).toBe(3);
    expect(code?.last_scanned_at).not.toBeNull();
  });

  it("returns the destination without counting when recording is off (bots, previews)", async () => {
    const rows = await asService<{ destination: string }>(
      "select destination from public.record_scan('MENU42', 'bot', p_record => false)",
    );
    expect(rows).toEqual([{ destination: "https://example.com/menu" }]);
    const [code] = await asAlice<{ scan_count: string }>(
      "select scan_count from public.qr_codes where slug = 'MENU42'",
    );
    expect(Number(code?.scan_count)).toBe(3);
  });

  it("returns nothing for unknown slugs and does not count paused codes", async () => {
    expect(await scan("NOPE99", "v")).toEqual([]);
    await asAlice("update public.qr_codes set status = 'paused' where slug = 'MENU42'");
    expect(await scan("MENU42", "visitor-c")).toEqual([
      { destination: "https://example.com/menu", status: "paused" },
    ]);
    const [code] = await asAlice<{ scan_count: string }>(
      "select scan_count from public.qr_codes where slug = 'MENU42'",
    );
    expect(Number(code?.scan_count)).toBe(3);
    await asAlice("update public.qr_codes set status = 'active' where slug = 'MENU42'");
  });

  it("lets owners read their scans and aggregates them; others see nothing", async () => {
    const [{ id }] = (await asAlice<{ id: string }>(
      "select id from public.qr_codes where slug = 'MENU42'",
    )) as [{ id: string }];
    const range = [id, "2000-01-01T00:00:00Z", "2100-01-01T00:00:00Z", "UTC"];

    const [{ stats }] = (await asAlice<{ stats: Record<string, unknown> }>(
      "select public.code_analytics($1, $2, $3, $4) as stats",
      range,
    )) as [{ stats: Record<string, unknown> }];
    expect(stats.total).toBe(3);
    expect(stats.unique).toBe(2);
    expect(stats.countries).toEqual([
      { label: "US", scans: 2 },
      { label: "??", scans: 1 },
    ]);
    expect(stats.devices).toEqual([
      { label: "mobile", scans: 2 },
      { label: "desktop", scans: 1 },
    ]);
    expect((stats.daily as unknown[]).length).toBe(1);

    expect(await asBob("select * from public.scan_events")).toEqual([]);
    const [{ stats: bobView }] = (await asBob<{ stats: Record<string, unknown> }>(
      "select public.code_analytics($1, $2, $3, $4) as stats",
      range,
    )) as [{ stats: Record<string, unknown> }];
    expect(bobView.total).toBe(0);
    await expect(asAnon("select public.code_analytics($1, $2, $3, $4)", range)).rejects.toThrow(
      /permission denied/,
    );
  });

  it("deleting a user removes their codes and scans", async () => {
    await db.query("delete from auth.users where id = $1", [ALICE]);
    const rows = await asService<{ n: string }>("select count(*) as n from public.scan_events");
    expect(Number(rows[0]?.n)).toBe(0);
    expect(await asService("select id from public.qr_codes where user_id = $1", [ALICE])).toEqual(
      [],
    );
  });
});

describe("design templates", () => {
  const CAROL = "33333333-3333-4333-8333-333333333333";
  const DAN = "44444444-4444-4444-8444-444444444444";
  const asCarol = <T>(sql: string, params?: unknown[]) =>
    as<T>("authenticated", CAROL, sql, params);
  const asDan = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", DAN, sql, params);

  beforeAll(async () => {
    await db.query(
      "insert into auth.users (id, email) values ($1, 'carol@example.com'), ($2, 'dan@example.com')",
      [CAROL, DAN],
    );
  });

  it("belong to their owner only", async () => {
    const [row] = await asCarol<{ id: string; user_id: string }>(
      `insert into public.design_templates (name, design) values ('Brand', '{"fgColor":"#112233"}') returning id, user_id`,
    );
    expect(row?.user_id).toBe(CAROL);
    expect(await asDan("select id from public.design_templates")).toEqual([]);
    await asDan("update public.design_templates set name = 'Stolen' where id = $1", [row!.id]);
    await asDan("delete from public.design_templates where id = $1", [row!.id]);
    const [kept] = await asCarol<{ name: string }>(
      "select name from public.design_templates where id = $1",
      [row!.id],
    );
    expect(kept?.name).toBe("Brand");
    await expect(asAnon("select * from public.design_templates")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("can't be created for someone else and validate their fields", async () => {
    await expect(
      asDan(`insert into public.design_templates (user_id, name, design) values ($1, 'x', '{}')`, [
        CAROL,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asDan(`insert into public.design_templates (name, design) values ('', '{}')`),
    ).rejects.toThrow(/check constraint/);
    await expect(
      asDan(`insert into public.design_templates (name, design) values ('x', '[]')`),
    ).rejects.toThrow(/check constraint/);
  });

  it("are removed with their owner", async () => {
    await db.query("delete from auth.users where id = $1", [CAROL]);
    const rows = await asService<{ n: string }>(
      "select count(*) as n from public.design_templates where user_id = $1",
      [CAROL],
    );
    expect(Number(rows[0]?.n)).toBe(0);
  });
});

describe("hosted pages", () => {
  const EVE = "55555555-5555-4555-8555-555555555555";
  const FRANK = "66666666-6666-4666-8666-666666666666";
  const asEve = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", EVE, sql, params);
  const asFrank = <T>(sql: string, params?: unknown[]) =>
    as<T>("authenticated", FRANK, sql, params);
  let pageId = "";

  beforeAll(async () => {
    await db.query(
      "insert into auth.users (id, email) values ($1, 'eve@example.com'), ($2, 'frank@example.com')",
      [EVE, FRANK],
    );
  });

  it("are dynamic codes without a destination", async () => {
    const [row] = await asEve<{ id: string }>(
      `insert into public.qr_codes (name, qr_type, is_dynamic, slug, content)
       values ('Menu page', 'menu', true, 'EVEMENU', '{"name":"Eve''s Diner"}') returning id`,
    );
    pageId = row!.id;
    await expect(
      asEve(`insert into public.qr_codes (name, qr_type, content) values ('x', 'links', '{}')`),
    ).rejects.toThrow(/qr_codes_pages_are_dynamic/);
    await expect(
      asEve(
        `insert into public.qr_codes (name, qr_type, is_dynamic, slug) values ('x', 'url', true, 'NODEST')`,
      ),
    ).rejects.toThrow(/qr_codes_dynamic_fields/);
    // New static types still work without an account-hosted page.
    await asEve(
      `insert into public.qr_codes (name, qr_type, content) values ('Pay', 'payment', '{"method":"paypal"}')`,
    );
  });

  it("can be read by anyone with the link, without revealing the owner", async () => {
    const [{ page }] = (await asAnon<{ page: Record<string, unknown> }>(
      "select public.public_page('evemenu') as page",
    )) as [{ page: Record<string, unknown> }];
    expect(page).toMatchObject({
      slug: "EVEMENU",
      qr_type: "menu",
      status: "active",
      content: { name: "Eve's Diner" },
    });
    expect(JSON.stringify(page)).not.toContain(EVE);
    // Ordinary dynamic links and unknown slugs aren't pages.
    await asEve(
      `insert into public.qr_codes (name, qr_type, is_dynamic, slug, destination) values ('L', 'url', true, 'EVELINK', 'https://e.com')`,
    );
    const [{ none }] = (await asAnon<{ none: unknown }>(
      "select public.public_page('EVELINK') as none",
    )) as [{ none: unknown }];
    expect(none).toBeNull();
  });

  it("route through record_scan with their type and content", async () => {
    const rows = await asService<{
      destination: string | null;
      qr_type: string;
      content: { name: string };
    }>("select destination, qr_type, content from public.record_scan('EVEMENU', 'v1')");
    expect(rows).toEqual([
      { destination: null, qr_type: "menu", content: { name: "Eve's Diner" } },
    ]);
  });

  it("collect feedback through the server only, rate limited, visible to the owner only", async () => {
    await asEve(
      `insert into public.qr_codes (name, qr_type, is_dynamic, slug, content) values ('FB', 'feedback', true, 'EVEFB', '{}')`,
    );
    await expect(
      asAnon("select public.submit_feedback('EVEFB', 5, 'Great', null, 'v')"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asAnon(
        "insert into public.feedback_responses (code_id, rating, visitor_hash) values ($1, 5, 'v')",
        [pageId],
      ),
    ).rejects.toThrow(/permission denied/);

    const submit = (rating: number, visitor = "visitor-1", slug = "EVEFB") =>
      asService<{ ok: boolean }>(
        "select public.submit_feedback($1, $2, 'Lovely', 'eve@x.com', $3) as ok",
        [slug, rating, visitor],
      );
    expect((await submit(5))[0]?.ok).toBe(true);
    expect((await submit(4))[0]?.ok).toBe(true);
    expect((await submit(3))[0]?.ok).toBe(true);
    expect((await submit(2))[0]?.ok).toBe(false); // fourth from the same visitor today
    expect((await submit(5, "visitor-2"))[0]?.ok).toBe(true);
    expect((await submit(9, "visitor-3"))[0]?.ok).toBe(false); // out of range
    expect((await submit(5, "visitor-3", "EVEMENU"))[0]?.ok).toBe(false); // not a feedback page

    const mine = await asEve<{ rating: number }>(
      "select rating from public.feedback_responses order by id",
    );
    expect(mine.map((r) => r.rating)).toEqual([5, 4, 3, 5]);
    expect(await asFrank("select * from public.feedback_responses")).toEqual([]);
  });

  it("store media only in the owner's folder", async () => {
    await asEve(`insert into storage.objects (bucket_id, name) values ('page-media', $1)`, [
      `${EVE}/menu.pdf`,
    ]);
    await expect(
      asFrank(`insert into storage.objects (bucket_id, name) values ('page-media', $1)`, [
        `${EVE}/evil.pdf`,
      ]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asAnon(`insert into storage.objects (bucket_id, name) values ('page-media', 'x/y.pdf')`),
    ).rejects.toThrow(/row-level security/);
    expect(await asFrank("select name from storage.objects")).toEqual([]);
    expect(await asEve("select name from storage.objects")).toEqual([{ name: `${EVE}/menu.pdf` }]);
    await asFrank("delete from storage.objects");
    expect(await asEve("select name from storage.objects")).toHaveLength(1);
    const [bucket] = await asService<{ public: boolean; file_size_limit: string }>(
      "select public, file_size_limit from storage.buckets where id = 'page-media'",
    );
    expect(bucket).toMatchObject({ public: true });
    expect(Number(bucket?.file_size_limit)).toBe(52428800);
  });
});

describe("power tools", () => {
  const GINA = "77777777-7777-4777-8777-777777777777"; // workspace owner
  const HANK = "88888888-8888-4888-8888-888888888888"; // editor
  const IVY = "99999999-9999-4999-8999-999999999999"; // viewer
  const JAY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // outsider
  const asGina = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", GINA, sql, params);
  const asHank = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", HANK, sql, params);
  const asIvy = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", IVY, sql, params);
  const asJay = <T>(sql: string, params?: unknown[]) => as<T>("authenticated", JAY, sql, params);
  let codeId = "";
  let folderId = "";

  beforeAll(async () => {
    await db.query(
      `insert into auth.users (id, email, raw_user_meta_data) values
         ($1, 'gina@example.com', '{"full_name":"Gina"}'), ($2, 'Hank@Example.com', '{}'),
         ($3, 'ivy@example.com', '{}'), ($4, 'jay@example.com', '{}')`,
      [GINA, HANK, IVY, JAY],
    );
    const [folder] = await asGina<{ id: string }>(
      "insert into public.folders (name) values ('Flyers') returning id",
    );
    folderId = folder!.id;
    const [code] = await asGina<{ id: string }>(
      `insert into public.qr_codes (name, qr_type, is_dynamic, slug, destination, folder_id)
       values ('Gina menu', 'url', true, 'GINA01', 'https://gina.example', $1) returning id`,
      [folderId],
    );
    codeId = code!.id;
  });

  it("invites join a workspace only for the invited email, once", async () => {
    const [editor] = await asGina<{ token: string }>(
      "insert into public.team_invites (email, role) values ('hank@example.com', 'editor') returning token",
    );
    const [viewer] = await asGina<{ token: string }>(
      "insert into public.team_invites (email, role) values ('ivy@example.com', 'viewer') returning token",
    );
    const [{ details }] = (await asJay<{ details: Record<string, unknown> }>(
      "select public.invite_details($1) as details",
      [editor!.token],
    )) as [{ details: Record<string, unknown> }];
    expect(details).toMatchObject({
      owner_email: "gina@example.com",
      owner_name: "Gina",
      role: "editor",
      valid: true,
    });

    await expect(asJay("select public.accept_invite($1)", [editor!.token])).rejects.toThrow(
      /different email/,
    );
    // Email matching ignores case.
    expect(
      (
        await asHank<{ owner: string }>("select public.accept_invite($1) as owner", [editor!.token])
      )[0]?.owner,
    ).toBe(GINA);
    await expect(asHank("select public.accept_invite($1)", [editor!.token])).rejects.toThrow(
      /no longer valid/,
    );
    await asIvy("select public.accept_invite($1)", [viewer!.token]);

    // Nobody but the owner can read invites or add members directly.
    expect(await asJay("select * from public.team_invites")).toEqual([]);
    await expect(
      asJay(
        "insert into public.team_members (owner_id, member_id, role) values ($1, $2, 'editor')",
        [GINA, JAY],
      ),
    ).rejects.toThrow(/permission denied/);
    expect(
      await asHank<{ owner_email: string; role: string }>(
        "select owner_email, role from public.my_workspaces()",
      ),
    ).toEqual([{ owner_email: "gina@example.com", role: "editor" }]);
    expect(
      (await asGina<{ email: string }>("select email from public.team_overview()")).map(
        (r) => r.email,
      ),
    ).toEqual(["Hank@Example.com", "ivy@example.com"]);
  });

  it("editors work in the workspace, viewers only look, outsiders see nothing", async () => {
    expect(await asHank("select id from public.qr_codes where id = $1", [codeId])).toHaveLength(1);
    expect(await asIvy("select id from public.qr_codes where id = $1", [codeId])).toHaveLength(1);
    expect(await asJay("select id from public.qr_codes where id = $1", [codeId])).toEqual([]);

    await asHank("update public.qr_codes set name = 'Edited by Hank' where id = $1", [codeId]);
    await asIvy("update public.qr_codes set name = 'Edited by Ivy' where id = $1", [codeId]);
    const [row] = await asGina<{ name: string }>("select name from public.qr_codes where id = $1", [
      codeId,
    ]);
    expect(row?.name).toBe("Edited by Hank");

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
    expect(await asGina("select id from public.qr_codes where id = $1", [hanks!.id])).toHaveLength(
      1,
    );
    await expect(
      asIvy(`insert into public.qr_codes (user_id, name, qr_type) values ($1, 'x', 'text')`, [
        GINA,
      ]),
    ).rejects.toThrow(/row-level security/);
    expect(await asIvy("select id from public.folders")).toHaveLength(1);
    await expect(
      asIvy("insert into public.folders (user_id, name) values ($1, 'Nope')", [GINA]),
    ).rejects.toThrow(/row-level security/);

    // Only the owner manages roles.
    await asHank("update public.team_members set role = 'editor' where member_id = $1", [IVY]);
    const [ivy] = await asGina<{ role: string }>(
      "select role from public.team_members where member_id = $1",
      [IVY],
    );
    expect(ivy?.role).toBe("viewer");
  });

  it("files codes only in folders of the same workspace, and unfiles them when a folder goes", async () => {
    const [jayFolder] = await asJay<{ id: string }>(
      "insert into public.folders (name) values ('Mine') returning id",
    );
    await expect(
      asGina("update public.qr_codes set folder_id = $1 where id = $2", [jayFolder!.id, codeId]),
    ).rejects.toThrow(/qr_codes_folder_fkey/);
    await expect(asGina("insert into public.folders (name) values (' flyers ')")).rejects.toThrow(
      /folders_user_name/,
    );
    const [temp] = await asGina<{ id: string }>(
      "insert into public.folders (name) values ('Temp') returning id",
    );
    await asGina("update public.qr_codes set folder_id = $1 where id = $2", [temp!.id, codeId]);
    await asGina("delete from public.folders where id = $1", [temp!.id]);
    const [row] = await asGina<{ folder_id: string | null; user_id: string }>(
      "select folder_id, user_id from public.qr_codes where id = $1",
      [codeId],
    );
    expect(row).toEqual({ folder_id: null, user_id: GINA });
  });

  it("protects codes with a password nobody can read", async () => {
    await expect(asIvy("select public.set_code_password($1, 'secret')", [codeId])).rejects.toThrow(
      /Not allowed/,
    );
    await asHank("select public.set_code_password($1, 'open sesame')", [codeId]);
    await expect(asGina("select * from public.code_secrets")).rejects.toThrow(/permission denied/);
    await expect(
      asGina("select public.check_code_password('GINA01', 'open sesame')"),
    ).rejects.toThrow(/permission denied/);

    const check = (password: string) =>
      asService<{ ok: boolean }>("select public.check_code_password('gina01', $1) as ok", [
        password,
      ]);
    expect((await check("open sesame"))[0]?.ok).toBe(true);
    expect((await check("wrong"))[0]?.ok).toBe(false);
    const [scan] = await asService<{ protected: boolean; destination: string }>(
      "select protected, destination from public.record_scan('GINA01', 'v')",
    );
    expect(scan).toEqual({ protected: true, destination: "https://gina.example" });

    await asGina("select public.set_code_password($1, '')", [codeId]);
    const [after] = await asGina<{ has_password: boolean }>(
      "select has_password from public.qr_codes where id = $1",
      [codeId],
    );
    expect(after?.has_password).toBe(false);
  });

  it("hides protected page content from the public", async () => {
    const [page] = await asGina<{ id: string }>(
      `insert into public.qr_codes (name, qr_type, is_dynamic, slug, content) values ('Secret menu', 'menu', true, 'GINAPG', '{"name":"Secret"}') returning id`,
    );
    await asGina("select public.set_code_password($1, 'pass1234')", [page!.id]);
    const [{ pub }] = (await asAnon<{ pub: Record<string, unknown> }>(
      "select public.public_page('GINAPG') as pub",
    )) as [{ pub: Record<string, unknown> }];
    expect(pub).toMatchObject({ protected: true, content: {} });
    await expect(asAnon("select public.protected_page('GINAPG')")).rejects.toThrow(
      /permission denied/,
    );
    const [{ full }] = (await asService<{ full: Record<string, unknown> }>(
      "select public.protected_page('GINAPG') as full",
    )) as [{ full: Record<string, unknown> }];
    expect(full).toMatchObject({ content: { name: "Secret" } });

    // Pages that aren't open right now don't reveal their content either.
    await asGina("select public.set_code_password($1, '')", [page!.id]);
    const publicPage = async () =>
      (
        await asAnon<{ pub: Record<string, unknown> }>("select public.public_page('GINAPG') as pub")
      )[0]?.pub;
    expect(await publicPage()).toMatchObject({ status: "active", content: { name: "Secret" } });
    await asGina("update public.qr_codes set status = 'paused' where id = $1", [page!.id]);
    expect(await publicPage()).toMatchObject({ status: "paused", content: {} });
    await asGina(
      "update public.qr_codes set status = 'active', active_until = now() - interval '1 hour', active_from = null where id = $1",
      [page!.id],
    );
    expect(await publicPage()).toMatchObject({ status: "expired", content: {} });
  });

  it("only counts scans inside the active dates", async () => {
    const before = await asGina<{ n: string }>(
      "select scan_count as n from public.qr_codes where id = $1",
      [codeId],
    );
    await asGina(
      "update public.qr_codes set active_from = now() + interval '1 day' where id = $1",
      [codeId],
    );
    expect(
      (
        await asService<{ status: string }>("select status from public.record_scan('GINA01', 'v')")
      )[0]?.status,
    ).toBe("scheduled");
    await asGina(
      "update public.qr_codes set active_from = now() - interval '2 days', active_until = now() - interval '1 day' where id = $1",
      [codeId],
    );
    expect(
      (
        await asService<{ status: string }>("select status from public.record_scan('GINA01', 'v')")
      )[0]?.status,
    ).toBe("expired");
    await expect(
      asGina(
        "update public.qr_codes set active_from = now(), active_until = now() - interval '1 hour' where id = $1",
        [codeId],
      ),
    ).rejects.toThrow(/qr_codes_active_window/);
    await asGina(
      "update public.qr_codes set active_from = null, active_until = null where id = $1",
      [codeId],
    );
    expect(
      (
        await asService<{ status: string }>("select status from public.record_scan('GINA01', 'v')")
      )[0]?.status,
    ).toBe("active");
    const after = await asGina<{ n: string }>(
      "select scan_count as n from public.qr_codes where id = $1",
      [codeId],
    );
    expect(Number(after[0]?.n)).toBe(Number(before[0]?.n) + 1);
    // Viewers can read the scans too.
    expect(
      (await asIvy("select id from public.scan_events where code_id = $1", [codeId])).length,
    ).toBeGreaterThan(0);
  });

  it("API keys are shown once, stored hashed and resolve to their owner", async () => {
    const [{ created }] = (await asJay<{ created: { key: string; prefix: string; id: string } }>(
      "select public.create_api_key('CI') as created",
    )) as [{ created: { key: string; prefix: string; id: string } }];
    expect(created.key).toMatch(/^qq_[0-9a-f]{48}$/);
    expect(created.prefix).toBe(created.key.slice(0, 10));
    await expect(asJay("select key_hash from public.api_keys")).rejects.toThrow(
      /permission denied/,
    );
    expect(await asJay<{ name: string }>("select name from public.api_keys")).toEqual([
      { name: "CI" },
    ]);
    expect(await asGina("select id from public.api_keys")).toEqual([]);
    await expect(asJay("select public.api_key_user($1)", [created.key])).rejects.toThrow(
      /permission denied/,
    );

    const owner = async (key: string) =>
      (await asService<{ u: string | null }>("select public.api_key_user($1) as u", [key]))[0]?.u;
    expect(await owner(created.key)).toBe(JAY);
    expect(await owner("qq_wrong")).toBeNull();
    await asJay("delete from public.api_keys where id = $1", [created.id]);
    expect(await owner(created.key)).toBeNull();
  });

  it("API functions only reach the key owner's codes", async () => {
    const [{ made }] = (await asService<{ made: Record<string, unknown> }>(
      `select public.api_create_code($1, '{"name":"From API","type":"url","dynamic":true,"destination":"https://api.example"}') as made`,
      [JAY],
    )) as [{ made: Record<string, unknown> }];
    expect(made).toMatchObject({ name: "From API", type: "url", dynamic: true, state: "active" });
    expect(String(made.slug)).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);

    const list = (
      await asService<{ l: unknown[] }>("select public.api_codes($1, 50, 0) as l", [JAY])
    )[0]!.l;
    expect(list.map((c) => (c as { name: string }).name)).toContain("From API");
    expect(JSON.stringify(list)).not.toContain("Gina");

    expect(
      (await asService<{ c: unknown }>("select public.api_code($1, $2) as c", [JAY, codeId]))[0]?.c,
    ).toBeNull();
    expect(
      (
        await asService<{ c: unknown }>(
          `select public.api_update_code($1, $2, '{"name":"Hijacked"}') as c`,
          [JAY, codeId],
        )
      )[0]?.c,
    ).toBeNull();
    expect(
      (
        await asService<{ d: boolean }>("select public.api_delete_code($1, $2) as d", [JAY, codeId])
      )[0]?.d,
    ).toBe(false);

    const [{ updated }] = (await asService<{ updated: Record<string, unknown> }>(
      `select public.api_update_code($1, $2, '{"destination":"https://new.example","status":"paused"}') as updated`,
      [JAY, made.id],
    )) as [{ updated: Record<string, unknown> }];
    expect(updated).toMatchObject({ destination: "https://new.example", state: "paused" });
    await expect(
      asService(`select public.api_create_code($1, '{"name":"Bad","type":"url","dynamic":true}')`, [
        JAY,
      ]),
    ).rejects.toThrow(/qr_codes_dynamic_fields/);
    expect(
      (
        await asService<{ a: Record<string, unknown> }>(
          "select public.api_code_analytics($1, $2, now() - interval '1 day', now(), 'UTC') as a",
          [JAY, made.id],
        )
      )[0]?.a,
    ).toMatchObject({ total: 0 });
    expect(
      (
        await asService<{ a: unknown }>(
          "select public.api_code_analytics($1, $2, now() - interval '1 day', now(), 'UTC') as a",
          [JAY, codeId],
        )
      )[0]?.a,
    ).toBeNull();
    expect(
      (
        await asService<{ d: boolean }>("select public.api_delete_code($1, $2) as d", [
          JAY,
          made.id,
        ])
      )[0]?.d,
    ).toBe(true);
  });

  it("members can leave and lose access", async () => {
    await asIvy("delete from public.team_members where member_id = $1", [IVY]);
    expect(await asIvy("select id from public.qr_codes where id = $1", [codeId])).toEqual([]);
  });
});

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
      {
        owner_email: "pat@example.com",
        owner_avatar_url: "https://lh3.googleusercontent.com/a/pat",
      },
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
    expect(await asSam("select name from storage.objects where bucket_id = 'avatars'")).toEqual([]);
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
    }>(
      "select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars'",
    );
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
    await expect(asAnon("select public.my_pending_invite()")).rejects.toThrow(/permission denied/);
  });

  it("stop at 50 emails a day per owner and 200 a day for everyone", async () => {
    const VERA = "15151515-1515-4515-8515-151515151515";
    const asVera = <T>(sql: string, params?: unknown[]) =>
      as<T>("authenticated", VERA, sql, params);
    await db.query("insert into auth.users (id, email) values ($1, 'vera@example.com')", [VERA]);
    const [invite] = await asUma<{ id: string }>(
      "insert into public.team_invites (email, role) values ('yan@example.com', 'viewer') returning id",
    );
    // Earlier today, outside the hourly window.
    await asService(
      `insert into public.invite_sends (owner_id, sent_at)
       select $1, now() - interval '3 hours' from generate_series(1, 50)`,
      [UMA],
    );
    await expect(record(asUma, invite!.id)).rejects.toThrow(/50 invites today/);

    await asService(
      `insert into public.invite_sends (owner_id, sent_at)
       select $1, now() - interval '5 hours' from generate_series(1, 150)`,
      [TESS],
    );
    const [mine] = await asVera<{ id: string }>(
      "insert into public.team_invites (email, role) values ('zoe@example.com', 'viewer') returning id",
    );
    await expect(record(asVera, mine!.id)).rejects.toThrow(/all the invite emails it can today/);
    await asService("delete from public.invite_sends where sent_at < now() - interval '2 hours'");
    await record(asVera, mine!.id);
  });
});

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

  it("lets everyone create only in their own space and refuses anon", async () => {
    await expect(asUma(CREATE, [code({ user_id: XAVI, slug: "XAVI02" }), null])).rejects.toThrow(
      /row-level security/,
    );
    const [row] = await asUma<{ user_id: string; has_password: boolean }>(CREATE, [
      code({ slug: "XAVI02" }),
      null,
    ]);
    expect(row).toMatchObject({ user_id: UMA, has_password: false });
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
    await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [
      XAVI,
    ]);
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
    await expect(asXavi(CREATE, [code({ slug: "xavi01" }), null])).rejects.toThrow(/duplicate key/);
    expect(await countXavi()).toBe(before);
  });
});

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
    asService("insert into public.team_members (owner_id, member_id, role) values ($1, $2, $3)", [
      owner,
      member,
      role,
    ]);

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
      (
        await asKim<{ name: string }>("select name from public.folders where id = $1", [
          kimFolder!.id,
        ])
      )[0]?.name,
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
      (
        await asMia<{ name: string }>("select name from public.qr_codes where id = $1", [
          codes.secret,
        ])
      )[0]?.name,
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

  it("teammates add files to pages they change, but only a folder's owner lists, replaces or deletes them", async () => {
    const files = async (who: ReturnType<typeof by>) =>
      (
        await who<{ name: string }>(
          "select name from storage.objects where name like $1 order by name",
          [`${KIM}/%`],
        )
      ).map((row) => row.name);
    await asKim(`insert into storage.objects (bucket_id, name) values ('page-media', $1)`, [
      `${KIM}/kim.png`,
    ]);
    await asLeo(`insert into storage.objects (bucket_id, name) values ('page-media', $1)`, [
      `${KIM}/from-leo.png`,
    ]);
    await expect(
      asMia(`insert into storage.objects (bucket_id, name) values ('page-media', $1)`, [
        `${KIM}/from-mia.png`,
      ]),
    ).rejects.toThrow(/row-level security/);
    expect(await files(asLeo)).toEqual([]);
    await asLeo("delete from storage.objects where name = $1", [`${KIM}/kim.png`]);
    expect(await files(asKim)).toEqual([`${KIM}/from-leo.png`, `${KIM}/kim.png`]);
  });

  it("nobody looks up someone else's team directly", async () => {
    await expect(asNed("select public.team_owner($1)", [KIM])).rejects.toThrow(/permission denied/);
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

    await expect(by(UNA)("select public.remove_member($1, true)", [UNA])).rejects.toThrow(
      /Not allowed/,
    );
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
