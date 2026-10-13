// @vitest-environment node
//
// Applies the real migration to PGlite (Postgres in WebAssembly) on top of a small stand-in
// for Supabase's auth schema and roles, then checks row-level security and functions the way
// the API would see them: as anon, as two different signed-in users, and as service_role.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = resolve(process.cwd(), "supabase/migrations");
const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

// Mirrors the parts of a Supabase database the migration depends on.
const SUPABASE_STUB = `
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
  grant usage on schema auth, public to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
  -- Supabase grants new public tables and functions to the API roles by default.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

let db: PGlite;

async function as<T>(
  role: "anon" | "authenticated" | "service_role",
  userId: string | null,
  sql: string,
  params: unknown[] = [],
  aal: "aal1" | "aal2" = "aal1",
): Promise<T[]> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    userId ? JSON.stringify({ sub: userId, role, aal }) : "",
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
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS).sort()) {
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
    // user_id is not insertable, so impersonation through the column is impossible.
    await expect(
      asBob(`insert into public.qr_codes (user_id, name, qr_type) values ($1, 'x', 'text')`, [
        ALICE,
      ]),
    ).rejects.toThrow(/permission denied/);
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
      "select * from public.record_scan($1, $2, $3, 'California', 'Los Angeles', $4, 'iOS', 'Safari')",
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
