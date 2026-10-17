# Page enhancements, Release 5a: things visitors send back — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- **Contact pages** can show "Share your details": a visitor sends their name with a phone or an email, and a note.
- **Coupons** can show "Mark as used", tapped at the till, once per phone. Afterwards the page says "Used on this phone", and the owner sees how many were used.
- **Events** can take RSVPs: a name, an email, 1 to 10 guests and a note, up to a number of places. The visitor sees "You're on the list".
- **The owner and teammates** see each on the code's page, with a CSV, under the teams rules. Private codes stay with their maker.

**Architecture:**
- **Database:** one migration.
  - Three tables: `contact_shares`, `coupon_redemptions` and `event_rsvps`, with RLS like `feedback_responses`.
  - Visitors write only through `security definer` functions that the app server calls. Each checks that the code is active, that its page has the feature on, and a per-visitor daily limit.
  - People read every column except the visitor hashes.
  - `submit_rsvp` locks the event's row, so two RSVPs can't both take the last places.
- **Server routes** `/p/[slug]/share`, `/p/[slug]/redeem` and `/p/[slug]/rsvp` share one set of checks in `lib/pages/visitor-post.ts`:
  - our own origin;
  - a JSON body;
  - the honeypot;
  - an unlocked page of the right type;
  - bots get a quiet success.

  The feedback route is not changed.
- **The visitor's side:**
  - `ShareDetails`, `MarkUsed` and `RsvpForm` components, drawn by `PageView` only when the page turns them on, and inert in the editor's preview.
  - `useRemembered` keeps "Used on this phone" and "You're on the list" in the phone's own storage.
- **The owner's side:**
  - `ContactShares`, `CouponUses` and `EventRsvps` cards on the code page, loading through one `useCodeRows` hook.
  - CSV helpers in `lib/responses/csv.ts`.
- **Pure helpers, each tested:** `lib/pages/responses.ts` holds the visitor forms' rules, shared by the forms and the routes, and an event's capacity.

**Tech Stack:**
- Next.js 16, React 19, Supabase (self-hosted, through the private SQL bridge), PGlite migration tests, Vitest, Playwright 1.56.
- No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md`. This plan covers:
- section 8, items 15, 29 and 33, and the section's opening rules;
- section 9's Release 5 migration, without the email parts;
- section 10, ruling 7;
- section 3.

Item 38 ("Email me new responses"), the `notify_responses` flag and the email log are Release 5b. Release 4 is live.

## Global Constraints

- **Every submission** (spec 8) goes through a server function that runs as the database owner, following the feedback pattern:
  - the code must be active and inside its active dates;
  - each visitor is rate limited;
  - there's a hidden-field honeypot.
- **The owner and teammates** see submissions on the code page, following the teams rules, with CSV export. Private codes stay with their maker.
- **Share your details** (spec 15):
  - an optional button opens a short form: name, phone, email and note;
  - a name plus a phone or an email is required;
  - stored in `contact_shares`.
- **One use per coupon** (spec 29):
  - an optional "Mark as used" button, meant to be tapped at the till;
  - remembered per phone, in `coupon_redemptions`; afterwards the page says "Used on this phone";
  - the owner sees how many were used;
  - ruling 7: without sign-in this is per phone, not per person, and it stops casual reuse, not someone determined.
- **RSVP** (spec 33):
  - an optional form: name, email, number of guests (1–10) and a note;
  - it can have a capacity, and is full once the guest total reaches it;
  - stored in `event_rsvps`; the visitor sees "You're on the list".
- **Migration** (spec 9):
  - `contact_shares`, `coupon_redemptions` and `event_rsvps`, with RLS by code owner and team, and their record functions;
  - a verified backup from the last 24 hours, after checking the disk has room;
  - no backslashes;
  - applied through the private SQL bridge before merging;
  - recorded in the runbook.
- **Section 3 rules apply:**
  - old pages keep working: every new field is optional, with a default;
  - the API accepts the new fields, and its docs list them;
  - previews stay inert;
  - visible labels and 44 px targets, with no sideways scroll from 320 px;
  - axe clean;
  - limits visible;
  - every new field gets sanitize, validation, editor and renderer tests;
  - browser tests, and the new pages join the axe and phone sweep.
- **Every commit is formatted:** run `npx prettier --write` on the files it touches. `$WS` is this plan's workspace from `sdd-workspace`; long test output goes there.

## Rulings made in this plan (for David's review)

1. **"Mark as used" remembers the phone by a random ID kept on the phone, not the scan hash.**
   - The scan hash changes every day, so a coupon could be used again tomorrow.
   - It's also the same for two identical phones on one café's Wi-Fi, so it could turn away the next customer.
   - The ID is made only when someone taps, it stays in the phone's browser storage, and the server keeps only a one-way hash of it.
   - Clearing the browser's data makes a new one. That's ruling 7's "not someone determined".
2. **Marking a coupon used asks first:** "Mark this coupon as used? Do this at the till." This way, a tap at home doesn't use it up.
3. **Once the offer has ended, "Mark as used" goes away,** by the phone's own date as the deadline is now. The server also refuses uses once the last valid day is over everywhere.
4. **What each form needs:**
   - Share your details: a name, and a phone or an email; the note is optional.
   - RSVP: a name and an email, and 1 to 10 guests including the visitor; the note is optional.
5. **One RSVP per email per event.** Sending again says "You're already on the list".
6. **Limits per visitor:**
   - Shared details and RSVPs: three a day per page from one visitor, like feedback.
   - Coupon uses: up to 100 a day from one phone network and browser. That stops a script, and still leaves room for a busy café's shared Wi-Fi.
   - "Mark as used" has no boxes to fill, so it has no honeypot; that cap stands in for it.
7. **Places count guests, not RSVPs.**
   - When fewer than 10 are left, the guest picker offers only what's left.
   - With none left, the form says "This event is full".
   - Lowering the places below the guests already listed just makes the event full; nobody is taken off the list.
8. **RSVPs close when the event ends,** by the phone's clock (as with ruling 6).
9. **The phone remembers what it sent.** "Used on this phone" and "You're on the list" still show after a reload, kept in the phone's browser storage.
10. **The code page lists the latest 1,000 of each,** and the CSV holds the same. The counts of uses and places taken are exact.
11. **Who can delete:**
    - Owners and editors can delete shared details and RSVPs; viewers only see them.
    - Deleting an RSVP frees its places.
    - Coupon uses can't be deleted.
12. **Visitor hashes stay on the server.** Owners and teammates can read every other column, but not the hashes.
13. **The privacy page** gets a "What visitors send" section. It covers feedback, shared details, coupon uses and RSVPs, and what the phone keeps.
14. **The migration needs a verified backup from the last 24 hours.** If there isn't one, I start the backup service myself before applying it; approving this plan approves that. I make no other server changes.
15. **The live feedback route stays as it is.** Only the three new routes share the new checks.

## Review Focus

1. **Places, under pressure and at the edges:**
   - more guests than places left;
   - the last places with one place left;
   - places lowered below the guests already listed;
   - places empty, `0` or text (no limit);
   - RSVPs turned off with a tab still open.

   Expected: `full` with the right `left`, `0` and never below it, `null` for no limit, and `closed`. *Task 1 and Task 3 tests.*
2. **Posts made by hand to the routes:**
   - no name;
   - no phone or email;
   - a bad email;
   - guests 0, 11, 2.5 or `"3"`;
   - a phone ID that isn't 32 hex characters;
   - a note over 500 characters;
   - a page of another type, a locked page, or one with the feature off.

   Each is refused with 400 or 404, and nothing is stored. *Task 3 tests.*
3. **Teams and privacy:**
   - outsiders, and teammates of private codes, read nothing;
   - viewers can't delete;
   - anon can't call the functions or read the tables;
   - nobody but the server reads `visitor_hash` or `phone_hash`;
   - password-only sessions of two-step accounts see nothing.

   *Task 1 tests.*
4. **The same phone again:**
   - a second tap is `already`, not a second use;
   - a reload still says "Used on this phone";
   - a lost answer retried with the same ID counts once;
   - an ended offer shows no button, and the server says `closed`.

   *Task 1, 3 and 4 tests.*
5. **Phones at 320 px with each form open and its errors showing:** no sideways scroll, 44 px targets, and axe clean on two looks. *Task 7.*

---

### Task 1: The migration: three tables, their rules, and the functions that fill them

**Files:**
- Create: `supabase/migrations/20261017210000_visitor_responses.sql`
- Test: `supabase/test/migration.test.ts` (a new `describe("visitor responses")` at the end)

**Interfaces:**
- Produces, for Task 3 (all `security definer`, granted only to `service_role`):
  - `submit_contact_share(p_slug text, p_name text, p_phone text, p_email text, p_note text, p_visitor_hash text) returns boolean`;
  - `record_coupon_use(p_slug text, p_phone_hash text, p_visitor_hash text) returns text`, one of `used`, `already`, `limited` or `closed`;
  - `submit_rsvp(p_slug text, p_name text, p_email text, p_guests int, p_note text, p_visitor_hash text) returns text`, one of `listed`, `already`, `full`, `limited`, `invalid` or `closed`;
  - `rsvp_places_left(p_slug text) returns int`: null without a limit.
- Produces, for Task 6:
  - `rsvp_guests(p_code uuid) returns int`, `security invoker`, granted to `authenticated`;
  - readable columns:
    - `contact_shares`: `id, code_id, created_at, name, phone, email, note`;
    - `coupon_redemptions`: `id, code_id, created_at`;
    - `event_rsvps`: `id, code_id, created_at, name, email, guests, note`.
- Page content keys it reads, from Task 2: `shareDetails`, `markUsed`, `validUntil`, `rsvp` and `rsvpCapacity`.

- [ ] **Step 1: Write the failing tests.** Append to `supabase/test/migration.test.ts`:

```ts
describe("visitor responses", () => {
  const GIL = "5a5a5a5a-5a5a-4a5a-8a5a-5a5a5a5a5a5a"; // owner
  const HAL = "5b5b5b5b-5b5b-4b5b-8b5b-5b5b5b5b5b5b"; // editor on Gil's team
  const IVY = "5c5c5c5c-5c5c-4c5c-8c5c-5c5c5c5c5c5c"; // viewer on Gil's team
  const JOY = "5d5d5d5d-5d5d-4d5d-8d5d-5d5d5d5d5d5d"; // outsider
  const by =
    (id: string) =>
    <T>(sql: string, params?: unknown[]) =>
      as<T>("authenticated", id, sql, params);
  const asGil = by(GIL);
  const asHal = by(HAL);
  const asIvy = by(IVY);
  const asJoy = by(JOY);
  const ids: Record<string, string> = {};
  const make = async (
    who: ReturnType<typeof by>,
    slug: string,
    type: string,
    content: object,
    isPrivate = false,
  ) =>
    (
      await who<{ id: string }>(
        `insert into public.qr_codes (name, qr_type, is_dynamic, slug, content, is_private)
         values ($1, $2, true, $1, $3::jsonb, $4) returning id`,
        [slug, type, JSON.stringify(content), isPrivate],
      )
    )[0]!.id;
  const hash = (n: number) => n.toString(16).padStart(64, "0");
  const share = (slug: string, name: string, phone: string | null, email: string | null, visitor = "share-1") =>
    asService<{ ok: boolean }>(
      "select public.submit_contact_share($1, $2, $3, $4, 'Met at the fair', $5) as ok",
      [slug, name, phone, email, visitor],
    );
  const use = (slug: string, phone: string, visitor = "use-1") =>
    asService<{ status: string }>("select public.record_coupon_use($1, $2, $3) as status", [
      slug,
      phone,
      visitor,
    ]);
  const rsvp = (slug: string, name: string, email: string, guests: number, visitor = "rsvp-1") =>
    asService<{ status: string }>(
      "select public.submit_rsvp($1, $2, $3, $4, null, $5) as status",
      [slug, name, email, guests, visitor],
    );
  const left = async (slug: string) =>
    (await asService<{ left: number | null }>("select public.rsvp_places_left($1) as left", [slug]))[0]
      ?.left;
  const setContent = (id: string, patch: object) =>
    asGil("update public.qr_codes set content = content || $2::jsonb where id = $1", [
      id,
      JSON.stringify(patch),
    ]);

  beforeAll(async () => {
    await db.query(
      `insert into auth.users (id, email) values
         ($1, 'gil@example.com'), ($2, 'hal@example.com'), ($3, 'ivy@example.com'), ($4, 'joy@example.com')`,
      [GIL, HAL, IVY, JOY],
    );
    await asService(
      "insert into public.team_members (owner_id, member_id, role) values ($1, $2, 'editor'), ($1, $3, 'viewer')",
      [GIL, HAL, IVY],
    );
    ids.card = await make(asGil, "GILCARD", "vcard", { firstName: "Gil", shareDetails: true });
    ids.cardOff = await make(asGil, "GILCARD2", "vcard", { firstName: "Gil" });
    ids.coupon = await make(asGil, "GILCOUP", "coupon", { offer: "20% OFF", markUsed: true });
    ids.ended = await make(asGil, "GILOLD", "coupon", {
      offer: "Old",
      markUsed: true,
      validUntil: "2020-01-01",
    });
    ids.event = await make(asGil, "GILEVT", "event", { title: "Launch", rsvp: true, rsvpCapacity: "4" });
    ids.open = await make(asGil, "GILOPEN", "event", { title: "Open", rsvp: true, rsvpCapacity: "" });
    ids.secret = await make(asHal, "HALEVT", "event", { title: "Hal's", rsvp: true }, true);
  });

  it("take shared details only from the server, for open pages that ask for them", async () => {
    await expect(
      asAnon("select public.submit_contact_share('GILCARD', 'A', null, 'a@x.com', null, 'v')"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asGil("select public.submit_contact_share('GILCARD', 'A', null, 'a@x.com', null, 'v')"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asAnon(
        "insert into public.contact_shares (code_id, name, email, visitor_hash) values ($1, 'A', 'a@x.com', 'v')",
        [ids.card],
      ),
    ).rejects.toThrow(/permission denied/);

    expect((await share("gilcard", " Ana Rivera ", null, "ana@example.com"))[0]?.ok).toBe(true);
    expect((await share("GILCARD", "Ben", "+1 555 0100", null))[0]?.ok).toBe(true);
    expect((await share("GILCARD", "  ", "+1 555 0100", null, "share-2"))[0]?.ok).toBe(false); // no name
    expect((await share("GILCARD", "Cy", null, null, "share-2"))[0]?.ok).toBe(false); // no way to reach them
    expect((await share("GILCARD2", "Cy", null, "cy@x.com", "share-2"))[0]?.ok).toBe(false); // doesn't ask
    expect((await share("GILCOUP", "Cy", null, "cy@x.com", "share-2"))[0]?.ok).toBe(false); // a coupon
    expect((await share("GILCARD", "Dee", null, "dee@x.com"))[0]?.ok).toBe(true); // third today
    expect((await share("GILCARD", "Eve", null, "eve@x.com"))[0]?.ok).toBe(false); // fourth today
    await asGil("update public.qr_codes set status = 'paused' where id = $1", [ids.card]);
    expect((await share("GILCARD", "Fay", null, "fay@x.com", "share-3"))[0]?.ok).toBe(false);
    await asGil("update public.qr_codes set status = 'active' where id = $1", [ids.card]);

    expect(
      await asGil("select name, phone, email, note from public.contact_shares order by id"),
    ).toEqual([
      { name: "Ana Rivera", phone: null, email: "ana@example.com", note: "Met at the fair" },
      { name: "Ben", phone: "+1 555 0100", email: null, note: "Met at the fair" },
      { name: "Dee", phone: null, email: "dee@x.com", note: "Met at the fair" },
    ]);
  });

  it("count one use per phone, and none once the offer has ended", async () => {
    await expect(asAnon("select public.record_coupon_use('GILCOUP', $1, 'v')", [hash(1)])).rejects.toThrow(
      /permission denied/,
    );
    expect((await use("GILCOUP", hash(1)))[0]?.status).toBe("used");
    expect((await use("GILCOUP", hash(1)))[0]?.status).toBe("already");
    expect((await use("GILCOUP", hash(2)))[0]?.status).toBe("used");
    expect((await use("GILCOUP", "not-a-hash"))[0]?.status).toBe("closed");
    expect((await use("GILOLD", hash(3)))[0]?.status).toBe("closed"); // ended in 2020
    expect((await use("GILCARD", hash(3)))[0]?.status).toBe("closed"); // not a coupon
    // A date that doesn't exist is no end date, rather than an error.
    await setContent(ids.coupon, { validUntil: "2030-02-30" });
    expect((await use("GILCOUP", hash(4)))[0]?.status).toBe("used");
    await asGil("update public.qr_codes set status = 'paused' where id = $1", [ids.coupon]);
    expect((await use("GILCOUP", hash(5)))[0]?.status).toBe("closed");
    await asGil("update public.qr_codes set status = 'active' where id = $1", [ids.coupon]);
    // A script making up phones is held to 100 a day from one visitor.
    for (let n = 100; n < 200; n++) {
      expect((await use("GILCOUP", hash(n), "script"))[0]?.status, String(n)).toBe("used");
    }
    expect((await use("GILCOUP", hash(200), "script"))[0]?.status).toBe("limited");
    expect(
      (await asGil<{ n: number }>("select count(*)::int as n from public.coupon_redemptions"))[0]?.n,
    ).toBe(103);
  });

  it("take RSVPs up to the event's places, one per email", async () => {
    await expect(
      asAnon("select public.submit_rsvp('GILEVT', 'A', 'a@x.com', 1, null, 'v')"),
    ).rejects.toThrow(/permission denied/);
    expect(await left("GILEVT")).toBe(4);
    expect(await left("GILOPEN")).toBeNull(); // no limit
    expect((await rsvp("GILEVT", "Ana", "ana@example.com", 3))[0]?.status).toBe("listed");
    expect((await rsvp("GILEVT", "Ana", "ANA@example.com", 1))[0]?.status).toBe("already");
    expect((await rsvp("GILEVT", "Ben", "ben@example.com", 2, "rsvp-2"))[0]?.status).toBe("full");
    expect(await left("GILEVT")).toBe(1);
    expect((await rsvp("GILEVT", "Ben", "ben@example.com", 1, "rsvp-2"))[0]?.status).toBe("listed");
    expect(await left("GILEVT")).toBe(0);
    expect((await rsvp("GILEVT", "Cy", "cy@example.com", 1, "rsvp-3"))[0]?.status).toBe("full");
    for (const [name, email, guests] of [
      ["Cy", "not an email", 1],
      ["Cy", "cy@example.com", 0],
      ["Cy", "cy@example.com", 11],
      [" ", "cy@example.com", 1],
    ] as const) {
      expect((await rsvp("GILOPEN", name, email, guests, "rsvp-4"))[0]?.status, email).toBe("invalid");
    }
    // Without a limit, up to ten guests each; three RSVPs a day from one visitor.
    for (const n of [1, 2, 3]) {
      expect((await rsvp("GILOPEN", "Guest", `g${n}@example.com`, 10, "rsvp-5"))[0]?.status).toBe(
        "listed",
      );
    }
    expect((await rsvp("GILOPEN", "Guest", "g4@example.com", 1, "rsvp-5"))[0]?.status).toBe("limited");
    // Fewer places than guests already listed: full, never below none.
    await setContent(ids.event, { rsvpCapacity: "2" });
    expect(await left("GILEVT")).toBe(0);
    // Places that aren't a number are no limit.
    await setContent(ids.event, { rsvpCapacity: "lots" });
    expect(await left("GILEVT")).toBeNull();
    await setContent(ids.event, { rsvpCapacity: " 4 " });
    expect(await left("GILEVT")).toBe(0);
    // RSVPs turned off with a tab still open.
    await setContent(ids.open, { rsvp: false });
    expect((await rsvp("GILOPEN", "Guest", "g5@example.com", 1, "rsvp-6"))[0]?.status).toBe("closed");
    expect(await left("GILOPEN")).toBeNull();
  });

  it("show the team what visitors sent, but not visitor hashes, and keep private codes private", async () => {
    expect(
      (await asIvy<{ name: string }>("select name from public.contact_shares order by id")).map(
        (r) => r.name,
      ),
    ).toEqual(["Ana Rivera", "Ben", "Dee"]);
    for (const table of ["contact_shares", "coupon_redemptions", "event_rsvps"]) {
      expect(await asJoy(`select id from public.${table}`), table).toEqual([]);
    }
    await expect(asGil("select visitor_hash from public.contact_shares")).rejects.toThrow(
      /permission denied/,
    );
    await expect(asGil("select phone_hash from public.coupon_redemptions")).rejects.toThrow(
      /permission denied/,
    );
    await expect(asGil("select visitor_hash from public.event_rsvps")).rejects.toThrow(
      /permission denied/,
    );
    // Counts need no hidden column.
    expect(
      (
        await asIvy<{ n: number }>(
          "select count(*)::int as n from public.coupon_redemptions where code_id = $1",
          [ids.coupon],
        )
      )[0]?.n,
    ).toBe(103);
    expect((await asIvy<{ n: number }>("select public.rsvp_guests($1) as n", [ids.event]))[0]?.n).toBe(4);
    expect((await asJoy<{ n: number }>("select public.rsvp_guests($1) as n", [ids.event]))[0]?.n).toBe(0);
    // A private code's RSVPs are its maker's alone, even from the team's owner.
    await asService("select public.submit_rsvp('HALEVT', 'Zed', 'zed@example.com', 2, null, 'priv')");
    expect(await asGil("select id from public.event_rsvps where code_id = $1", [ids.secret])).toEqual([]);
    expect((await asHal<{ n: number }>("select public.rsvp_guests($1) as n", [ids.secret]))[0]?.n).toBe(2);
    expect((await asGil<{ n: number }>("select public.rsvp_guests($1) as n", [ids.secret]))[0]?.n).toBe(0);
    // Viewers can't delete; editors can, which frees the places; nobody deletes coupon uses.
    await asIvy("delete from public.event_rsvps where code_id = $1", [ids.event]);
    expect((await asGil<{ n: number }>("select public.rsvp_guests($1) as n", [ids.event]))[0]?.n).toBe(4);
    await asHal("delete from public.event_rsvps where code_id = $1 and email = 'ben@example.com'", [
      ids.event,
    ]);
    expect((await asGil<{ n: number }>("select public.rsvp_guests($1) as n", [ids.event]))[0]?.n).toBe(3);
    expect(await left("GILEVT")).toBe(1);
    await expect(asGil("delete from public.coupon_redemptions")).rejects.toThrow(/permission denied/);
    await asHal("delete from public.contact_shares where name = 'Dee'");
    expect(await asGil("select name from public.contact_shares where name = 'Dee'")).toEqual([]);
    // Deleting the code takes what visitors sent with it.
    await asGil("delete from public.qr_codes where id = $1", [ids.cardOff]);
    await asGil("delete from public.qr_codes where id = $1", [ids.card]);
    expect(
      await asService("select id from public.contact_shares where code_id = $1", [ids.card]),
    ).toEqual([]);
  });

  it("hide what visitors sent from password-only sessions of two-step accounts", async () => {
    await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [IVY]);
    for (const table of ["coupon_redemptions", "event_rsvps"]) {
      expect(await asIvy(`select id from public.${table}`), table).toEqual([]);
      expect(
        (await as("authenticated", IVY, `select id from public.${table}`, [], "aal2")).length,
        table,
      ).toBeGreaterThan(0);
    }
    await db.query("delete from auth.mfa_factors where user_id = $1", [IVY]);
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run supabase/test/migration.test.ts -t "visitor responses"`
Expected: FAIL. The functions don't exist (`function public.submit_contact_share(...) does not exist`).

- [ ] **Step 3: Write the migration.** Create `supabase/migrations/20261017210000_visitor_responses.sql`. It must contain no backslashes.

```sql
-- Things visitors send back (page enhancements 5a, spec items 15, 29 and 33): details shared
-- from a Contact page, coupons marked used at the till, and RSVPs to an event. Visitors write
-- only through the functions below, which the app server calls. Owners and teammates read them
-- under the same rules as feedback, private codes stay with their maker, and visitor hashes
-- stay on the server.

create table public.contact_shares (
  id bigint generated always as identity primary key,
  code_id uuid not null references public.qr_codes (id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 100),
  phone text check (phone is null or char_length(phone) <= 40),
  email text check (email is null or char_length(email) <= 254),
  note text check (note is null or char_length(note) <= 500),
  visitor_hash text not null check (char_length(visitor_hash) <= 128),
  -- A name, and a way to reach them.
  constraint contact_shares_reachable check (phone is not null or email is not null)
);

create index contact_shares_code_time on public.contact_shares (code_id, created_at desc);

create table public.coupon_redemptions (
  id bigint generated always as identity primary key,
  code_id uuid not null references public.qr_codes (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- A one-way hash of the random ID the phone keeps for this coupon: one use per phone.
  phone_hash text not null check (char_length(phone_hash) = 64),
  visitor_hash text not null check (char_length(visitor_hash) <= 128),
  constraint coupon_redemptions_once unique (code_id, phone_hash)
);

create index coupon_redemptions_code_time on public.coupon_redemptions (code_id, created_at desc);

create table public.event_rsvps (
  id bigint generated always as identity primary key,
  code_id uuid not null references public.qr_codes (id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  guests smallint not null check (guests between 1 and 10),
  note text check (note is null or char_length(note) <= 500),
  visitor_hash text not null check (char_length(visitor_hash) <= 128)
);

create index event_rsvps_code_time on public.event_rsvps (code_id, created_at desc);
-- One RSVP per email address per event.
create unique index event_rsvps_one_per_email on public.event_rsvps (code_id, lower(email));

alter table public.contact_shares enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.event_rsvps enable row level security;

-- The teams rules, as for feedback: teammates read what's sent to shared codes, owners and
-- editors delete it, and private codes are their maker's alone.
create policy "Teammates can read shared details on shared codes"
  on public.contact_shares for select to authenticated
  using (code_id in (
    select c.id from public.qr_codes c
     where c.user_id = (select auth.uid()) or (not c.is_private and public.can_view(c.user_id))
  ));
create policy "Owners and editors can delete shared details on shared codes"
  on public.contact_shares for delete to authenticated
  using (code_id in (
    select c.id from public.qr_codes c
     where c.user_id = (select auth.uid()) or (not c.is_private and public.can_edit(c.user_id))
  ));
create policy "Teammates can read coupon uses on shared codes"
  on public.coupon_redemptions for select to authenticated
  using (code_id in (
    select c.id from public.qr_codes c
     where c.user_id = (select auth.uid()) or (not c.is_private and public.can_view(c.user_id))
  ));
create policy "Teammates can read RSVPs on shared codes"
  on public.event_rsvps for select to authenticated
  using (code_id in (
    select c.id from public.qr_codes c
     where c.user_id = (select auth.uid()) or (not c.is_private and public.can_view(c.user_id))
  ));
create policy "Owners and editors can delete RSVPs on shared codes"
  on public.event_rsvps for delete to authenticated
  using (code_id in (
    select c.id from public.qr_codes c
     where c.user_id = (select auth.uid()) or (not c.is_private and public.can_edit(c.user_id))
  ));

create policy "Two-factor accounts need a two-factor session"
  on public.contact_shares as restrictive for all to authenticated
  using ((select public.mfa_satisfied()));
create policy "Two-factor accounts need a two-factor session"
  on public.coupon_redemptions as restrictive for all to authenticated
  using ((select public.mfa_satisfied()));
create policy "Two-factor accounts need a two-factor session"
  on public.event_rsvps as restrictive for all to authenticated
  using ((select public.mfa_satisfied()));

-- People read every column but the visitor hashes, which stay on the server.
revoke all on public.contact_shares, public.coupon_redemptions, public.event_rsvps
  from public, anon, authenticated;
grant select (id, code_id, created_at, name, phone, email, note)
  on public.contact_shares to authenticated;
grant delete on public.contact_shares to authenticated;
grant select (id, code_id, created_at) on public.coupon_redemptions to authenticated;
grant select (id, code_id, created_at, name, email, guests, note)
  on public.event_rsvps to authenticated;
grant delete on public.event_rsvps to authenticated;
grant select, insert, update, delete
  on public.contact_shares, public.coupon_redemptions, public.event_rsvps to service_role;

-- An event's limit on guests, from its page: null when it has none (empty, 0 or not a number).
create function public.rsvp_capacity(p_content jsonb)
returns int
language sql
immutable
set search_path = ''
as $$
  select case when btrim(p_content ->> 'rsvpCapacity') ~ '^[0-9]{1,5}$'
              then nullif(btrim(p_content ->> 'rsvpCapacity')::int, 0) end;
$$;

revoke all on function public.rsvp_capacity(jsonb) from public, anon, authenticated;

-- Called by the app server with a daily-salted visitor hash. Stores a visitor's details when the
-- page is an open Contact page that asks for them: a name, and a phone or an email. Each visitor
-- may share three times per page per day. Returns whether the details were stored.
create function public.submit_contact_share(
  p_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_note text,
  p_visitor_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_recent int;
  v_name text := left(btrim(coalesce(p_name, '')), 100);
  v_phone text := nullif(left(btrim(coalesce(p_phone, '')), 40), '');
  v_email text := nullif(left(btrim(coalesce(p_email, '')), 254), '');
begin
  select c.id into v_id
    from public.qr_codes c
   where c.is_dynamic and c.qr_type = 'vcard'
     and c.content -> 'shareDetails' = 'true'::jsonb
     and public.code_state(c.status, c.active_from, c.active_until) = 'active'
     and upper(c.slug) = upper(p_slug);
  if v_id is null or v_name = '' or (v_phone is null and v_email is null) then
    return false;
  end if;

  select count(*) into v_recent
    from public.contact_shares s
   where s.code_id = v_id
     and s.visitor_hash = p_visitor_hash
     and s.created_at > now() - interval '1 day';
  if v_recent >= 3 then
    return false;
  end if;

  insert into public.contact_shares (code_id, name, phone, email, note, visitor_hash)
  values (
    v_id,
    v_name,
    v_phone,
    v_email,
    nullif(left(btrim(coalesce(p_note, '')), 500), ''),
    left(coalesce(nullif(p_visitor_hash, ''), 'unknown'), 128)
  );
  return true;
end;
$$;

-- Called by the app server when a phone marks a coupon used, with a one-way hash of the random
-- ID that phone keeps for it. Returns 'used', 'already' (this phone marked it before), 'limited'
-- (100 a day from one visitor, which stops scripts) or 'closed' (not an open coupon that takes
-- uses, or its offer has ended everywhere).
create function public.record_coupon_use(p_slug text, p_phone_hash text, p_visitor_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_until text;
  v_end date;
  v_recent int;
begin
  select c.id, c.content ->> 'validUntil' into v_id, v_until
    from public.qr_codes c
   where c.is_dynamic and c.qr_type = 'coupon'
     and c.content -> 'markUsed' = 'true'::jsonb
     and public.code_state(c.status, c.active_from, c.active_until) = 'active'
     and upper(c.slug) = upper(p_slug);
  if v_id is null or p_phone_hash is null or p_phone_hash !~ '^[0-9a-f]{64}$' then
    return 'closed';
  end if;

  -- The last valid day is over everywhere once it's over at UTC-12. A date that doesn't exist
  -- (like February 30) is no end date.
  if v_until ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    begin
      v_end := v_until::date;
    exception when others then
      v_end := null;
    end;
    if v_end is not null
       and now() >= ((v_end + 1)::timestamp at time zone 'UTC') + interval '12 hours' then
      return 'closed';
    end if;
  end if;

  if exists (
    select 1 from public.coupon_redemptions r
     where r.code_id = v_id and r.phone_hash = p_phone_hash
  ) then
    return 'already';
  end if;

  select count(*) into v_recent
    from public.coupon_redemptions r
   where r.code_id = v_id
     and r.visitor_hash = p_visitor_hash
     and r.created_at > now() - interval '1 day';
  if v_recent >= 100 then
    return 'limited';
  end if;

  insert into public.coupon_redemptions (code_id, phone_hash, visitor_hash)
  values (v_id, p_phone_hash, left(coalesce(nullif(p_visitor_hash, ''), 'unknown'), 128))
  on conflict (code_id, phone_hash) do nothing;
  -- Not found when the same phone's other request got there first.
  return case when found then 'used' else 'already' end;
end;
$$;

-- Called by the app server with a daily-salted visitor hash. Returns 'listed', 'already' (this
-- email is on the list), 'full' (fewer places left than guests), 'limited' (three a day from one
-- visitor), 'invalid' (a missing name, a bad email, or guests outside 1 to 10) or 'closed' (not
-- an open event taking RSVPs).
create function public.submit_rsvp(
  p_slug text,
  p_name text,
  p_email text,
  p_guests int,
  p_note text,
  p_visitor_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_capacity int;
  v_taken int;
  v_recent int;
  v_name text := left(btrim(coalesce(p_name, '')), 100);
  v_email text := btrim(coalesce(p_email, ''));
begin
  -- Locks the event's row, so two RSVPs for its last places can't both get in.
  select c.id, public.rsvp_capacity(c.content) into v_id, v_capacity
    from public.qr_codes c
   where c.is_dynamic and c.qr_type = 'event'
     and c.content -> 'rsvp' = 'true'::jsonb
     and public.code_state(c.status, c.active_from, c.active_until) = 'active'
     and upper(c.slug) = upper(p_slug)
     for update;
  if v_id is null then
    return 'closed';
  end if;
  if v_name = '' or char_length(v_email) > 254
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
     or p_guests is null or p_guests not between 1 and 10 then
    return 'invalid';
  end if;

  if exists (
    select 1 from public.event_rsvps r
     where r.code_id = v_id and lower(r.email) = lower(v_email)
  ) then
    return 'already';
  end if;

  select count(*) into v_recent
    from public.event_rsvps r
   where r.code_id = v_id
     and r.visitor_hash = p_visitor_hash
     and r.created_at > now() - interval '1 day';
  if v_recent >= 3 then
    return 'limited';
  end if;

  if v_capacity is not null then
    select coalesce(sum(r.guests), 0) into v_taken
      from public.event_rsvps r
     where r.code_id = v_id;
    if v_taken + p_guests > v_capacity then
      return 'full';
    end if;
  end if;

  insert into public.event_rsvps (code_id, name, email, guests, note, visitor_hash)
  values (
    v_id,
    v_name,
    v_email,
    p_guests,
    nullif(left(btrim(coalesce(p_note, '')), 500), ''),
    left(coalesce(nullif(p_visitor_hash, ''), 'unknown'), 128)
  );
  return 'listed';
end;
$$;

-- How many guests an open event taking RSVPs can still have, for its form: null when it has no
-- limit (or isn't taking RSVPs), and never below 0.
create function public.rsvp_places_left(p_slug text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case when e.capacity is null then null else greatest(e.capacity - e.taken, 0)::int end
    from (
      select public.rsvp_capacity(c.content) as capacity,
             (select coalesce(sum(r.guests), 0) from public.event_rsvps r where r.code_id = c.id) as taken
        from public.qr_codes c
       where c.is_dynamic and c.qr_type = 'event'
         and c.content -> 'rsvp' = 'true'::jsonb
         and public.code_state(c.status, c.active_from, c.active_until) = 'active'
         and upper(c.slug) = upper(p_slug)
    ) e;
$$;

-- Every guest on an event's list, for the code page. It runs as the caller, so it counts only
-- RSVPs they can read.
create function public.rsvp_guests(p_code uuid)
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(r.guests), 0)::int from public.event_rsvps r where r.code_id = p_code;
$$;

revoke all on function public.submit_contact_share(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.record_coupon_use(text, text, text) from public, anon, authenticated;
revoke all on function public.submit_rsvp(text, text, text, int, text, text) from public, anon, authenticated;
revoke all on function public.rsvp_places_left(text) from public, anon, authenticated;
grant execute on function public.submit_contact_share(text, text, text, text, text, text) to service_role;
grant execute on function public.record_coupon_use(text, text, text) to service_role;
grant execute on function public.submit_rsvp(text, text, text, int, text, text) to service_role;
grant execute on function public.rsvp_places_left(text) to service_role;
revoke all on function public.rsvp_guests(uuid) from public, anon;
grant execute on function public.rsvp_guests(uuid) to authenticated, service_role;
```

- [ ] **Step 4: Run the tests to see them pass, and check for backslashes.**

Run: `npx vitest run supabase/test/migration.test.ts && ! grep -n '\\' supabase/migrations/20261017210000_visitor_responses.sql`
Expected: every migration test passes, the earlier ones included, and grep finds no backslash.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20261017210000_visitor_responses.sql supabase/test/migration.test.ts
git commit -m "Visitor responses migration: shared details, coupon uses and RSVPs, under the teams rules"
```

---

### Task 2: Page fields, their defaults, the forms' rules, and the database types

**Files:**
- Modify: `lib/pages/types.ts` (`VcardPage`, `CouponPage`, `EventPage` and their `PAGE_DEFAULTS`)
- Modify: `lib/pages/sanitize.ts` (`SCHEMAS.vcard`, `.coupon`, `.event`)
- Modify: `lib/pages/validate.ts` (`event`)
- Create: `lib/pages/responses.ts`, `lib/pages/responses.test.ts`
- Modify: `lib/pages/pages.test.ts`
- Modify: `types/supabase.ts`

**Interfaces:**
- Produces page fields:
  - `VcardPage.shareDetails: boolean`;
  - `CouponPage.markUsed: boolean`;
  - `EventPage.rsvp: boolean`;
  - `EventPage.rsvpCapacity: string` (digits, or `""` for no limit).

  Each defaults to `false` or `""`.
- Produces from `lib/pages/responses.ts`:
  - `VISITOR_LIMITS = { name: 100, phone: 40, email: 254, note: 500 }` and `MAX_GUESTS = 10`;
  - `interface ShareInput { name: string; phone: string; email: string; note: string }`;
  - `interface RsvpInput { name: string; email: string; guests: number; note: string }`;
  - `type FormErrors<T> = Partial<Record<keyof T, string>>`;
  - `shareErrors(input: ShareInput): FormErrors<ShareInput>`;
  - `rsvpErrors(input: RsvpInput, left: number | null): FormErrors<RsvpInput>`;
  - `guestChoices(left: number | null): number[]`;
  - `rsvpCapacity(value: string | undefined): number | null`.
- Produces from `types/supabase.ts`:
  - row types `ContactShareRow`, `CouponUseRow` and `RsvpRow`;
  - function types for every function in Task 1.

- [ ] **Step 1: Write the failing tests.** Create `lib/pages/responses.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { guestChoices, rsvpCapacity, rsvpErrors, shareErrors } from "./responses";

const share = { name: "Ana", phone: "", email: "ana@example.com", note: "" };
const rsvp = { name: "Ana", email: "ana@example.com", guests: 2, note: "" };

describe("Share your details", () => {
  it("needs a name, and a phone or an email that work", () => {
    expect(shareErrors(share)).toEqual({});
    expect(shareErrors({ ...share, email: "", phone: "+1 555 0100" })).toEqual({});
    expect(shareErrors({ name: " ", phone: "", email: "", note: "" })).toEqual({
      name: "Add your name",
      phone: "Add a phone number or an email",
    });
    expect(shareErrors({ ...share, phone: "ab" }).phone).toBe("Check the phone number");
    expect(shareErrors({ ...share, email: "ana@" }).email).toBe("Check the email address");
  });

  it("says how much to shorten a note over 500 characters", () => {
    expect(shareErrors({ ...share, note: "x".repeat(501) }).note).toBe("Shorten by 1 character");
    expect(shareErrors({ ...share, note: "x".repeat(500) })).toEqual({});
  });
});

describe("RSVP", () => {
  it("needs a name, an email and 1 to 10 guests", () => {
    expect(rsvpErrors(rsvp, null)).toEqual({});
    expect(rsvpErrors({ name: "", email: "", guests: 1, note: "" }, null)).toEqual({
      name: "Add your name",
      email: "Add your email",
    });
    expect(rsvpErrors({ ...rsvp, email: "nope" }, null).email).toBe("Check the email address");
    for (const guests of [0, 11, 2.5, Number.NaN]) {
      expect(rsvpErrors({ ...rsvp, guests }, null).guests, String(guests)).toBe(
        "Pick how many are coming",
      );
    }
  });

  it("offers only the places left", () => {
    expect(guestChoices(null)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(guestChoices(3)).toEqual([1, 2, 3]);
    expect(guestChoices(0)).toEqual([]);
    expect(rsvpErrors({ ...rsvp, guests: 3 }, 2).guests).toBe("Pick how many are coming");
  });

  it("reads the places as a whole number, or no limit", () => {
    expect(rsvpCapacity("50")).toBe(50);
    expect(rsvpCapacity(" 50 ")).toBe(50);
    for (const value of ["", "0", "lots", "100000", "2.5", undefined]) {
      expect(rsvpCapacity(value), String(value)).toBeNull();
    }
  });
});
```

Append to `lib/pages/pages.test.ts`:

```ts
describe("Things visitors send back", () => {
  it("reads older Contact, Coupon and Event pages with nothing to send", () => {
    expect(sanitizePage("vcard", { firstName: "Old" }).shareDetails).toBe(false);
    expect(sanitizePage("coupon", { offer: "Old" }).markUsed).toBe(false);
    expect(sanitizePage("event", { title: "Old" })).toMatchObject({ rsvp: false, rsvpCapacity: "" });
    expect(sanitizePage("event", { title: "New", rsvp: "yes", rsvpCapacity: 50 })).toMatchObject({
      rsvp: false,
      rsvpCapacity: "",
    });
    expect(sanitizePage("event", { rsvp: true, rsvpCapacity: "1234567" }).rsvpCapacity).toBe("12345");
  });

  it("checks an event's places only while it takes RSVPs", () => {
    const event = {
      ...PAGE_DEFAULTS.event(),
      title: "Launch",
      start: "2030-01-10T13:00",
      timeZone: "America/New_York",
    };
    for (const rsvpCapacity of ["lots", "0", "2.5"]) {
      expect(validatePage("event", { ...event, rsvp: true, rsvpCapacity }), rsvpCapacity).toEqual({
        rsvpCapacity: "Enter a number of places, like 50",
      });
    }
    expect(validatePage("event", { ...event, rsvp: true, rsvpCapacity: "" })).toEqual({});
    expect(validatePage("event", { ...event, rsvp: true, rsvpCapacity: "50" })).toEqual({});
    expect(validatePage("event", { ...event, rsvp: false, rsvpCapacity: "lots" })).toEqual({});
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run lib/pages/responses.test.ts lib/pages/pages.test.ts`
Expected: FAIL. `./responses` can't be found, and `shareDetails` is `undefined`, not `false`.

- [ ] **Step 3: Add the fields.**

In `lib/pages/types.ts`, add these fields.
- `VcardPage`, after `showDirections`:

```ts
  /** Adds "Share your details": visitors send back their name, phone or email (spec item 15). */
  shareDetails: boolean;
```

- `CouponPage`, after `badge`:

```ts
  /** Adds "Mark as used", once per phone, for the till (spec item 29). */
  markUsed: boolean;
```

- `EventPage`, after `hosts`:

```ts
  /** Adds the RSVP form (spec item 33). */
  rsvp: boolean;
  /** The most guests in all, as digits; "" for no limit. */
  rsvpCapacity: string;
```

Add these defaults to `PAGE_DEFAULTS`:
- `vcard`: `shareDetails: false,` after `showDirections: true,`;
- `coupon`: `markUsed: false,` after `badge: "",`;
- `event`: `rsvp: false,` and `rsvpCapacity: "",` after `hosts: [],`.

In `lib/pages/sanitize.ts`, add to `SCHEMAS`:
- `vcard`: `shareDetails: bool,` after `showDirections`;
- `coupon`: `markUsed: bool,` after `badge: str(12),`;
- `event`: after `hosts`:

```ts
    rsvp: bool,
    rsvpCapacity: str(5),
```

- [ ] **Step 4: Write `lib/pages/responses.ts`.**

```ts
import { shortenBy } from "./sanitize";
import { mailHref, telHref } from "./urls";

/** The longest each thing a visitor sends can be (the database checks the same). */
export const VISITOR_LIMITS = { name: 100, phone: 40, email: 254, note: 500 } as const;
/** The most guests one RSVP can bring, the visitor included. */
export const MAX_GUESTS = 10;

export interface ShareInput {
  name: string;
  phone: string;
  email: string;
  note: string;
}

export interface RsvpInput {
  name: string;
  email: string;
  guests: number;
  note: string;
}

export type FormErrors<T> = Partial<Record<keyof T, string>>;

function checkLengths<T extends object>(errors: FormErrors<T>, input: T) {
  for (const [key, max] of Object.entries(VISITOR_LIMITS)) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > max) {
      errors[key as keyof T] ??= shortenBy(value.length - max);
    }
  }
}

/** What "Share your details" still needs: a name, and a phone or an email that work (spec 15). */
export function shareErrors(input: ShareInput): FormErrors<ShareInput> {
  const errors: FormErrors<ShareInput> = {};
  const phone = input.phone.trim();
  const email = input.email.trim();
  if (!input.name.trim()) errors.name = "Add your name";
  if (!phone && !email) errors.phone = "Add a phone number or an email";
  if (phone && !telHref(phone)) errors.phone = "Check the phone number";
  if (email && !mailHref(email)) errors.email = "Check the email address";
  checkLengths(errors, input);
  return errors;
}

/** How many guests one RSVP can bring: 1 to 10, or fewer when fewer places are left. */
export function guestChoices(left: number | null): number[] {
  const most = Math.max(Math.min(MAX_GUESTS, left ?? MAX_GUESTS), 0);
  return Array.from({ length: most }, (_, i) => i + 1);
}

/** What an RSVP still needs: a name, an email and a number of guests it can bring (spec 33). */
export function rsvpErrors(input: RsvpInput, left: number | null): FormErrors<RsvpInput> {
  const errors: FormErrors<RsvpInput> = {};
  const email = input.email.trim();
  if (!input.name.trim()) errors.name = "Add your name";
  if (!email) errors.email = "Add your email";
  else if (!mailHref(email)) errors.email = "Check the email address";
  if (!guestChoices(left).includes(input.guests)) errors.guests = "Pick how many are coming";
  checkLengths(errors, input);
  return errors;
}

/** An event's places as a whole number, or null for no limit (empty, 0 or not a number). */
export function rsvpCapacity(value: string | undefined): number | null {
  const digits = (value ?? "").trim();
  if (!/^\d{1,5}$/.test(digits)) return null;
  return Number(digits) || null;
}
```

- [ ] **Step 5: Check the places in the editor.** In `lib/pages/validate.ts`, import `rsvpCapacity` from `./responses`. In the `event` validator, add this before `p.agenda.forEach`:

```ts
    // Like the join link, the places are only checked while the form is on.
    if (p.rsvp && p.rsvpCapacity.trim() && rsvpCapacity(p.rsvpCapacity) === null) {
      errors.rsvpCapacity = "Enter a number of places, like 50";
    }
```

- [ ] **Step 6: Add the database types.** In `types/supabase.ts`, add these tables after `feedback_responses`:

```ts
      // What visitors send back (spec 15, 29 and 33). Their visitor hashes aren't readable.
      contact_shares: {
        Row: {
          id: number;
          code_id: string;
          created_at: string;
          name: string;
          phone: string | null;
          email: string | null;
          note: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      coupon_redemptions: {
        Row: { id: number; code_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          id: number;
          code_id: string;
          created_at: string;
          name: string;
          email: string;
          guests: number;
          note: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
```

Add these after `submit_feedback_answers` in `Functions`:

```ts
      submit_contact_share: {
        Args: {
          p_slug: string;
          p_name: string;
          p_phone: string | null;
          p_email: string | null;
          p_note: string | null;
          p_visitor_hash: string;
        };
        Returns: boolean;
      };
      record_coupon_use: {
        Args: { p_slug: string; p_phone_hash: string; p_visitor_hash: string };
        /** "used", "already", "limited" or "closed". */
        Returns: string;
      };
      submit_rsvp: {
        Args: {
          p_slug: string;
          p_name: string;
          p_email: string;
          p_guests: number;
          p_note: string | null;
          p_visitor_hash: string;
        };
        /** "listed", "already", "full", "limited", "invalid" or "closed". */
        Returns: string;
      };
      rsvp_places_left: { Args: { p_slug: string }; Returns: number | null };
      rsvp_guests: { Args: { p_code: string }; Returns: number };
```

Add these after `export type FeedbackRow`:

```ts
export type ContactShareRow = Database["public"]["Tables"]["contact_shares"]["Row"];
export type CouponUseRow = Database["public"]["Tables"]["coupon_redemptions"]["Row"];
export type RsvpRow = Database["public"]["Tables"]["event_rsvps"]["Row"];
```

- [ ] **Step 7: Run the whole suite and the type check.**

Run: `npm test > "$WS/task2.log" 2>&1; tail -20 "$WS/task2.log"; npm run typecheck`
Expected:
- both new tests pass;
- `pages.test.ts` still passes, including "falls back to defaults", which compares `sanitizePage(type, null)` with `PAGE_DEFAULTS`;
- every other test still passes. An API or renderer test that compares a whole sanitized page now sees the new fields; add their defaults to its expected value, with a ruling;
- the type check is clean. If an editor or fixture now misses a required field, the type check names it; add the default there.

- [ ] **Step 8: Commit.**

```bash
git add lib/pages/types.ts lib/pages/sanitize.ts lib/pages/validate.ts lib/pages/responses.ts lib/pages/responses.test.ts lib/pages/pages.test.ts types/supabase.ts
git commit -m "Page fields for shared details, coupon uses and RSVPs, with the forms' rules"
```

---

### Task 3: The three routes, with shared checks

**Files:**
- Create: `lib/pages/visitor-post.ts`
- Create: `app/p/[slug]/share/route.ts`, `app/p/[slug]/share/route.test.ts`
- Create: `app/p/[slug]/redeem/route.ts`, `app/p/[slug]/redeem/route.test.ts`
- Create: `app/p/[slug]/rsvp/route.ts`, `app/p/[slug]/rsvp/route.test.ts`

**Interfaces:**
- Consumes:
  - Task 1's functions and their statuses;
  - Task 2's `shareErrors`, `rsvpErrors` and the page fields.
- Produces, for Task 4's forms (every answer has `cache-control: no-store`):
  - `POST /p/[slug]/share` with `{ name, phone, email, note, website }` returns:
    - 200 `{ ok: true }`;
    - 400 for missing or wrong fields;
    - 404 when the page doesn't ask for details;
    - 429 at the limit.
  - `POST /p/[slug]/redeem` with `{ phone }` (32 hex characters) returns:
    - 200 `{ ok: true, already: boolean }`;
    - 409 `{ error: "closed" }`;
    - 429 at the limit;
    - 400 for a bad ID.
  - `GET /p/[slug]/rsvp` returns 200 `{ left: number | null }`.
  - `POST /p/[slug]/rsvp` with `{ name, email, guests, note, website }` returns:
    - 200 `{ ok: true, already?: true }`;
    - 409 `{ error: "full", left: number }` or `{ error: "closed" }`;
    - 400 for missing or wrong fields;
    - 429 at the limit.

- [ ] **Step 1: Write the failing tests.**

Create `app/p/[slug]/share/route.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => ({ rpc }) }));
const card = { type: "vcard", locked: false, content: { firstName: "Ana", shareDetails: true } };
vi.mock("@/lib/supabase/public", () => ({ getPublicPage: vi.fn(async () => card) }));

import { getPublicPage } from "@/lib/supabase/public";

import { POST } from "./route";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("https://ziplume.com/p/CARD1/share", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": IPHONE, ...headers },
      body: JSON.stringify(body),
    }) as never,
    { params: Promise.resolve({ slug: "CARD1" }) } as never,
  );

describe("POST /p/[slug]/share", () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: true, error: null });
    process.env.SCAN_HASH_SECRET = "test-secret";
  });

  it("stores a name with a phone or an email", async () => {
    const response = await post({ name: " Ana ", phone: "", email: "ana@example.com", note: "Hi" });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(rpc).toHaveBeenCalledWith("submit_contact_share", {
      p_slug: "CARD1",
      p_name: "Ana",
      p_phone: null,
      p_email: "ana@example.com",
      p_note: "Hi",
      p_visitor_hash: expect.stringMatching(/^[0-9a-f]{32}$/),
    });
  });

  it("refuses details that aren't enough, storing nothing", async () => {
    for (const body of [
      { name: "", email: "ana@example.com" },
      { name: "Ana" },
      { name: "Ana", email: "ana@" },
      { name: "Ana", email: "ana@example.com", note: "x".repeat(501) },
      { name: 5, email: "ana@example.com" },
      [],
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("is only for unlocked Contact pages that ask, from this site", async () => {
    const ok = { name: "Ana", email: "ana@example.com" };
    vi.mocked(getPublicPage).mockResolvedValueOnce({ ...card, content: { shareDetails: false } } as never);
    expect((await post(ok)).status).toBe(404);
    vi.mocked(getPublicPage).mockResolvedValueOnce({ ...card, type: "coupon" } as never);
    expect((await post(ok)).status).toBe(404);
    vi.mocked(getPublicPage).mockResolvedValueOnce({ ...card, locked: true } as never);
    expect((await post(ok)).status).toBe(403);
    expect((await post(ok, { origin: "https://evil.example" })).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("quietly ignores bots and the honeypot", async () => {
    const ok = { name: "Ana", email: "ana@example.com" };
    expect((await post({ ...ok, website: "spam.example" })).status).toBe(200);
    expect((await post(ok, { "user-agent": "curl/8.0" })).status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("says when today's limit is reached", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await post({ name: "Ana", email: "ana@example.com" })).status).toBe(429);
  });
});
```

Create `app/p/[slug]/redeem/route.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => ({ rpc }) }));
const coupon = { type: "coupon", locked: false, content: { offer: "20% OFF", markUsed: true } };
vi.mock("@/lib/supabase/public", () => ({ getPublicPage: vi.fn(async () => coupon) }));

import { getPublicPage } from "@/lib/supabase/public";

import { POST } from "./route";

const PHONE = "0123456789abcdef0123456789abcdef";
const post = (body: unknown, slug = "COUP1") =>
  POST(
    new Request(`https://ziplume.com/p/${slug}/redeem`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      },
      body: JSON.stringify(body),
    }) as never,
    { params: Promise.resolve({ slug }) } as never,
  );
const sentHash = () => (rpc.mock.calls.at(-1)![1] as { p_phone_hash: string }).p_phone_hash;

describe("POST /p/[slug]/redeem", () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: "used", error: null });
    process.env.SCAN_HASH_SECRET = "test-secret";
  });

  it("marks the coupon used by a one-way hash of the phone's ID, tied to the coupon", async () => {
    const response = await post({ phone: PHONE });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, already: false });
    const first = sentHash();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain(PHONE);
    await post({ phone: PHONE });
    expect(sentHash()).toBe(first);
    await post({ phone: PHONE }, "COUP2");
    expect(sentHash()).not.toBe(first);
  });

  it("says when this phone already used it, the offer is closed, or the limit is reached", async () => {
    rpc.mockResolvedValueOnce({ data: "already", error: null });
    expect(await (await post({ phone: PHONE })).json()).toEqual({ ok: true, already: true });
    rpc.mockResolvedValueOnce({ data: "closed", error: null });
    expect((await post({ phone: PHONE })).status).toBe(409);
    rpc.mockResolvedValueOnce({ data: "limited", error: null });
    expect((await post({ phone: PHONE })).status).toBe(429);
  });

  it("refuses an ID that isn't a phone's, or a coupon that doesn't take uses", async () => {
    for (const phone of ["", "xyz", PHONE.toUpperCase(), `${PHONE}0`, 42]) {
      expect((await post({ phone })).status, String(phone)).toBe(400);
    }
    vi.mocked(getPublicPage).mockResolvedValueOnce({ ...coupon, content: { markUsed: false } } as never);
    expect((await post({ phone: PHONE })).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

Create `app/p/[slug]/rsvp/route.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => ({ rpc }) }));
const event = { type: "event", locked: false, content: { title: "Launch", rsvp: true, rsvpCapacity: "4" } };
vi.mock("@/lib/supabase/public", () => ({ getPublicPage: vi.fn(async () => event) }));

import { getPublicPage } from "@/lib/supabase/public";

import { GET, POST } from "./route";

const context = { params: Promise.resolve({ slug: "EVT1" }) } as never;
const url = "https://ziplume.com/p/EVT1/rsvp";
const post = (body: unknown) =>
  POST(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      },
      body: JSON.stringify(body),
    }) as never,
    context,
  );
const ok = { name: "Ana", email: "ana@example.com", guests: 2, note: "" };
// Each function's answer, by name.
const answers = (byName: Record<string, unknown>) =>
  rpc.mockImplementation(async (name: string) => ({ data: byName[name] ?? null, error: null }));

describe("/p/[slug]/rsvp", () => {
  beforeEach(() => {
    rpc.mockReset();
    answers({ submit_rsvp: "listed", rsvp_places_left: 2 });
    process.env.SCAN_HASH_SECRET = "test-secret";
  });

  it("tells the form how many places are left, or none for no limit", async () => {
    const response = await GET(new Request(url) as never, context);
    expect(await response.json()).toEqual({ left: 2 });
    expect(response.headers.get("cache-control")).toBe("no-store");
    answers({ rsvp_places_left: null });
    expect(await (await GET(new Request(url) as never, context)).json()).toEqual({ left: null });
    vi.mocked(getPublicPage).mockResolvedValueOnce({ ...event, content: { rsvp: false } } as never);
    expect((await GET(new Request(url) as never, context)).status).toBe(404);
  });

  it("puts the visitor on the list", async () => {
    expect((await post(ok)).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("submit_rsvp", {
      p_slug: "EVT1",
      p_name: "Ana",
      p_email: "ana@example.com",
      p_guests: 2,
      p_note: null,
      p_visitor_hash: expect.stringMatching(/^[0-9a-f]{32}$/),
    });
    answers({ submit_rsvp: "already" });
    expect(await (await post(ok)).json()).toEqual({ ok: true, already: true });
  });

  it("says how many places are left when there aren't enough", async () => {
    answers({ submit_rsvp: "full", rsvp_places_left: 1 });
    const response = await post(ok);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "full", left: 1 });
    answers({ submit_rsvp: "closed" });
    expect(await (await post(ok)).json()).toEqual({ error: "closed" });
    answers({ submit_rsvp: "limited" });
    expect((await post(ok)).status).toBe(429);
  });

  it("refuses an RSVP that isn't complete, storing nothing", async () => {
    for (const body of [
      { ...ok, name: "" },
      { ...ok, email: "ana@" },
      { ...ok, guests: 0 },
      { ...ok, guests: 11 },
      { ...ok, guests: 2.5 },
      { ...ok, guests: "3" },
      { ...ok, note: "x".repeat(501) },
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run "app/p/[slug]/share" "app/p/[slug]/redeem" "app/p/[slug]/rsvp"`
Expected: FAIL. `./route` can't be found in each.

- [ ] **Step 3: Write the shared checks.** Create `lib/pages/visitor-post.ts`:

```ts
import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { scanContext, type ScanContext } from "@/lib/dynamic/scan-context";
import { isValidSlug } from "@/lib/dynamic/slug";
import { isOwnOrigin } from "@/lib/hosts";
import type { PageTypeId } from "@/lib/qr/types";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getPublicPage, type PublicPage } from "@/lib/supabase/public";

export const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

/** A visitor's text field, trimmed; anything that isn't text is empty. */
export const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export interface VisitorPost<K extends PageTypeId> {
  page: Extract<PublicPage, { type: K }>;
  body: Record<string, unknown>;
  admin: NonNullable<ReturnType<typeof getAdminSupabase>>;
  visitor: ScanContext;
  secret: string;
}

/**
 * The checks each visitor form's post shares, as feedback's do:
 * - it comes from our own pages (the site's address, or the old address a printed code opens);
 * - it's a JSON object;
 * - the honeypot is empty;
 * - the page is of the right type, and unlocked if it has a password.
 * Bots and the honeypot get a quiet success, so they learn nothing. Returns the response to send
 * when one of these settles it.
 */
export async function visitorPost<K extends PageTypeId>(
  request: NextRequest,
  slug: string,
  type: K,
): Promise<VisitorPost<K> | NextResponse> {
  if (!isValidSlug(slug)) return json({ error: "not_found" }, 404);
  const origin = request.headers.get("origin");
  if (origin && !isOwnOrigin(origin, request.headers.get("host"))) {
    return json({ error: "forbidden" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad body");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  // The hidden "website" field is a honeypot.
  if (typeof body.website === "string" && body.website.trim()) return json({ ok: true }, 200);

  const admin = getAdminSupabase();
  const secret = process.env.SCAN_HASH_SECRET;
  if (!admin || !secret) return json({ error: "unavailable" }, 503);
  const page = await getPublicPage(slug);
  if (page === "unavailable") return json({ error: "unavailable" }, 503);
  if (!page) return json({ error: "not_found" }, 404);
  if (page.locked) return json({ error: "locked" }, 403);
  if (page.type !== type) return json({ error: "not_found" }, 404);

  const visitor = scanContext(request.headers, secret);
  if (visitor.isBot) return json({ ok: true }, 200);
  return { page: page as Extract<PublicPage, { type: K }>, body, admin, visitor, secret };
}
```

- [ ] **Step 4: Write the routes.**

`app/p/[slug]/share/route.ts`:

```ts
import { type NextRequest } from "next/server";

import { shareErrors } from "@/lib/pages/responses";
import { json, text, visitorPost } from "@/lib/pages/visitor-post";

export const dynamic = "force-dynamic";

/**
 * "Share your details" from a Contact page (spec item 15). The database keeps at most three a
 * day per visitor per page (visitors are identified by a daily-salted hash, never their IP).
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/p/[slug]/share">) {
  const { slug } = await params;
  const post = await visitorPost(request, slug, "vcard");
  if (post instanceof Response) return post;
  if (!post.page.content.shareDetails) return json({ error: "not_found" }, 404);

  const { body } = post;
  const input = {
    name: text(body.name),
    phone: text(body.phone),
    email: text(body.email),
    note: text(body.note),
  };
  if (Object.keys(shareErrors(input)).length) return json({ error: "bad_request" }, 400);
  const { data, error } = await post.admin.rpc("submit_contact_share", {
    p_slug: slug,
    p_name: input.name,
    p_phone: input.phone || null,
    p_email: input.email || null,
    p_note: input.note || null,
    p_visitor_hash: post.visitor.visitorHash,
  });
  if (error) return json({ error: "unavailable" }, 503);
  return data ? json({ ok: true }, 200) : json({ error: "limited" }, 429);
}
```

`app/p/[slug]/redeem/route.ts`:

```ts
import { createHash } from "node:crypto";

import { type NextRequest } from "next/server";

import { json, visitorPost } from "@/lib/pages/visitor-post";

export const dynamic = "force-dynamic";

/**
 * "Mark as used" on a coupon (spec item 29, ruling 1): once per phone, by the random ID the
 * phone keeps for this coupon. Only a one-way hash of the ID is stored, tied to the coupon.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/p/[slug]/redeem">) {
  const { slug } = await params;
  const post = await visitorPost(request, slug, "coupon");
  if (post instanceof Response) return post;
  if (!post.page.content.markUsed) return json({ error: "not_found" }, 404);

  const phone = post.body.phone;
  if (typeof phone !== "string" || !/^[0-9a-f]{32}$/.test(phone)) {
    return json({ error: "bad_request" }, 400);
  }
  const phoneHash = createHash("sha256")
    .update(`${post.secret}:coupon:${slug.toUpperCase()}:${phone}`)
    .digest("hex");
  const { data, error } = await post.admin.rpc("record_coupon_use", {
    p_slug: slug,
    p_phone_hash: phoneHash,
    p_visitor_hash: post.visitor.visitorHash,
  });
  if (error) return json({ error: "unavailable" }, 503);
  if (data === "used" || data === "already") {
    return json({ ok: true, already: data === "already" }, 200);
  }
  if (data === "limited") return json({ error: "limited" }, 429);
  return json({ error: "closed" }, 409);
}
```

`app/p/[slug]/rsvp/route.ts`:

```ts
import { type NextRequest } from "next/server";

import { isValidSlug } from "@/lib/dynamic/slug";
import { rsvpErrors } from "@/lib/pages/responses";
import { json, text, visitorPost } from "@/lib/pages/visitor-post";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getPublicPage } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

/** The places an event has left, for its RSVP form: `left` is null when there's no limit. */
export async function GET(_request: NextRequest, { params }: RouteContext<"/p/[slug]/rsvp">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return json({ error: "not_found" }, 404);
  const admin = getAdminSupabase();
  if (!admin) return json({ error: "unavailable" }, 503);
  const page = await getPublicPage(slug);
  if (page === "unavailable") return json({ error: "unavailable" }, 503);
  if (!page || page.locked || page.type !== "event" || !page.content.rsvp) {
    return json({ error: "not_found" }, 404);
  }
  const { data, error } = await admin.rpc("rsvp_places_left", { p_slug: slug });
  if (error) return json({ error: "unavailable" }, 503);
  return json({ left: data ?? null }, 200);
}

/**
 * An RSVP (spec item 33): one per email, three a day per visitor, and only while places are left.
 * The database locks the event while it counts, so two RSVPs can't both take the last places.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/p/[slug]/rsvp">) {
  const { slug } = await params;
  const post = await visitorPost(request, slug, "event");
  if (post instanceof Response) return post;
  if (!post.page.content.rsvp) return json({ error: "not_found" }, 404);

  const { body } = post;
  const input = {
    name: text(body.name),
    email: text(body.email),
    guests: typeof body.guests === "number" ? body.guests : Number.NaN,
    note: text(body.note),
  };
  // The database checks the places left; here, any count from 1 to 10 will do.
  if (Object.keys(rsvpErrors(input, null)).length) return json({ error: "bad_request" }, 400);
  const { data, error } = await post.admin.rpc("submit_rsvp", {
    p_slug: slug,
    p_name: input.name,
    p_email: input.email,
    p_guests: input.guests,
    p_note: input.note || null,
    p_visitor_hash: post.visitor.visitorHash,
  });
  if (error) return json({ error: "unavailable" }, 503);
  switch (data) {
    case "listed":
      return json({ ok: true }, 200);
    case "already":
      return json({ ok: true, already: true }, 200);
    case "limited":
      return json({ error: "limited" }, 429);
    case "invalid":
      return json({ error: "bad_request" }, 400);
    case "full": {
      const places = await post.admin.rpc("rsvp_places_left", { p_slug: slug });
      return json({ error: "full", left: places.data ?? 0 }, 409);
    }
    default:
      return json({ error: "closed" }, 409);
  }
}
```

- [ ] **Step 5: Run the tests and the type check.**

Run: `npx vitest run "app/p/[slug]" && npm run typecheck`
Expected:
- the three new test files pass, and the feedback route's tests still pass;
- the type check is clean. `next typegen` writes the new routes' `RouteContext` types.

- [ ] **Step 6: Commit.**

```bash
git add lib/pages/visitor-post.ts "app/p/[slug]/share" "app/p/[slug]/redeem" "app/p/[slug]/rsvp"
git commit -m "Routes for shared details, coupon uses and RSVPs, with the feedback route's checks"
```

---

### Task 4: The visitor's side: Share your details, Mark as used, and the RSVP form

**Files:**
- Create: `features/pages/useRemembered.ts`
- Create: `features/pages/VisitorField.tsx`
- Create: `features/pages/ShareDetails.tsx`, `features/pages/ShareDetails.test.tsx`
- Create: `features/pages/MarkUsed.tsx`, `features/pages/MarkUsed.test.tsx`
- Create: `features/pages/RsvpForm.tsx`, `features/pages/RsvpForm.test.tsx`
- Modify: `features/pages/PageView.tsx` (`VcardView`, `CouponView`, `EventView`)
- Modify: `features/pages/PageView.test.tsx`

**Interfaces:**
- Consumes:
  - Task 2's rules and fields;
  - Task 3's routes and answers;
  - `limitNote` from `features/pages/editor/limits.ts`;
  - `couponDeadlineText` and `localDate` from `lib/pages/countdown.ts`;
  - `eventTimes` from `lib/pages/files.ts`;
  - `pageButton` and `PageCard` from `./parts`;
  - `useMinute`.
- Produces:
  - `useRemembered(key: string | null): [string | null, (value: string) => void]`;
  - `ShareDetails({ slug, owner, preview })`;
  - `MarkUsed({ slug, validUntil, preview })`;
  - `RsvpForm({ slug, event, preview })`.
- Phone storage keys:
  - `ziplume:coupon:<SLUG>` holds `{ id, usedAt? }`;
  - `ziplume:rsvp:<SLUG>` holds `{ guests }`.

- [ ] **Step 1: Write the failing tests.**

`features/pages/ShareDetails.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShareDetails } from "./ShareDetails";

describe("ShareDetails", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens a short form, asks for a name and a way to reach you, then sends", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    render(<ShareDetails slug="CARD1" owner="Ana" />);
    const open = screen.getByRole("button", { name: "Share your details" });
    expect(open).toHaveAttribute("aria-expanded", "false");
    await user.click(open);
    expect(open).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Send", exact: true }));
    expect(screen.getByText("Add your name")).toBeInTheDocument();
    expect(screen.getByText("Add a phone number or an email")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Name/ })).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ben Visitor");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ben@example.com");
    // The errors follow what's typed once you've tried to send.
    expect(screen.queryByText("Add your name")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Send", exact: true }));
    expect(fetch.mock.calls[0]![0]).toBe("/p/CARD1/share");
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({
      name: "Ben Visitor",
      phone: "",
      email: "ben@example.com",
      note: "",
      website: "",
    });
    expect(await screen.findByText("Thanks! Ana has your details.")).toBeInTheDocument();
  });

  it("shows how long the note is, and won't send one that's too long", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<ShareDetails slug="CARD1" owner="Ana" />);
    await user.click(screen.getByRole("button", { name: "Share your details" }));
    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ben");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ben@example.com");
    const note = screen.getByRole("textbox", { name: /^Note/ });
    await user.click(note);
    await user.paste("x".repeat(502));
    expect(screen.getByText("502 / 500")).toBeInTheDocument();
    expect(screen.getByText("Shorten by 2 characters")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send", exact: true }));
    expect(note).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stays shut in the editor's preview", async () => {
    const user = userEvent.setup();
    render(<ShareDetails slug="CARD1" owner="Ana" preview />);
    expect(screen.queryByRole("button", { name: "Share your details" })).toBeNull();
    await user.click(screen.getByText("Share your details"));
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
```

`features/pages/MarkUsed.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarkUsed } from "./MarkUsed";

const KEY = "ziplume:coupon:COUP1";

describe("MarkUsed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("asks first, then marks the coupon used on this phone", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true, already: false }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<MarkUsed slug="COUP1" validUntil="" />);
    await user.click(screen.getByRole("button", { name: "Mark as used" }));
    expect(screen.getByText("Mark this coupon as used?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, mark it used" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Not yet" }));
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Mark as used" }));
    await user.click(screen.getByRole("button", { name: "Yes, mark it used" }));
    expect(await screen.findByText("Used on this phone")).toBeInTheDocument();
    const sent = JSON.parse(fetch.mock.calls[0]![1]!.body as string) as { phone: string };
    expect(sent.phone).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toMatchObject({ id: sent.phone });
  });

  it("remembers a coupon this phone used, and sends the same phone's ID after a lost answer", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ id: "a".repeat(32), usedAt: "2030-01-01T12:00:00Z" }));
    const { unmount } = render(<MarkUsed slug="COUP1" validUntil="" />);
    expect(screen.getByText("Used on this phone")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as used" })).toBeNull();
    unmount();

    const user = userEvent.setup();
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    window.localStorage.setItem(KEY, JSON.stringify({ id: "b".repeat(32) }));
    render(<MarkUsed slug="COUP1" validUntil="" />);
    await user.click(screen.getByRole("button", { name: "Mark as used" }));
    await user.click(screen.getByRole("button", { name: "Yes, mark it used" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn’t be marked");
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({ phone: "b".repeat(32) });
  });

  it("goes away once the offer has ended, and says when the page won't take it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2030, 0, 5, 12));
    const { unmount } = render(<MarkUsed slug="COUP1" validUntil="2030-01-04" />);
    expect(screen.queryByRole("button", { name: "Mark as used" })).toBeNull();
    unmount();
    vi.useRealTimers();

    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 409 })));
    render(<MarkUsed slug="COUP1" validUntil="" />);
    await user.click(screen.getByRole("button", { name: "Mark as used" }));
    await user.click(screen.getByRole("button", { name: "Yes, mark it used" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("can’t be marked as used any more");
  });

  it("does nothing in the editor's preview", () => {
    render(<MarkUsed slug="COUP1" validUntil="" preview />);
    expect(screen.queryByRole("button", { name: "Mark as used" })).toBeNull();
    expect(screen.getByText("Mark as used")).toHaveAttribute("aria-disabled");
  });
});
```

`features/pages/RsvpForm.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PAGE_DEFAULTS } from "@/lib/pages/types";

import { RsvpForm } from "./RsvpForm";

const event = (patch: object = {}) => ({
  ...PAGE_DEFAULTS.event(),
  title: "Launch",
  start: "2099-01-10T13:00",
  end: "2099-01-10T16:00",
  timeZone: "America/New_York",
  rsvp: true,
  ...patch,
});
// The places-left answer for GET, and `post` for the RSVP itself.
const server = (left: number | null, post: Response = new Response("{}", { status: 200 })) =>
  vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === "POST" ? post : new Response(JSON.stringify({ left }), { status: 200 }),
  );

describe("RsvpForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("asks who's coming, checks it, and puts them on the list", async () => {
    const user = userEvent.setup();
    const fetch = server(null);
    vi.stubGlobal("fetch", fetch);
    render(<RsvpForm slug="EVT1" event={event()} />);
    // No limit, so nothing to ask the server before sending.
    expect(fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(screen.getByText("Add your name")).toBeInTheDocument();
    expect(screen.getByText("Add your email")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ana");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ana@example.com");
    await user.selectOptions(screen.getByRole("combobox", { name: /Guests/ }), "2");
    await user.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({
      name: "Ana",
      email: "ana@example.com",
      guests: 2,
      note: "",
      website: "",
    });
    expect(await screen.findByText("You’re on the list")).toBeInTheDocument();
    expect(window.localStorage.getItem("ziplume:rsvp:EVT1")).toBe(JSON.stringify({ guests: 2 }));
  });

  it("offers only the places left, and says when the event is full", async () => {
    vi.stubGlobal("fetch", server(2));
    const { unmount } = render(<RsvpForm slug="EVT1" event={event({ rsvpCapacity: "40" })} />);
    const guests = screen.getByRole("combobox", { name: /Guests/ });
    await vi.waitFor(() => expect(within(guests).getAllByRole("option")).toHaveLength(2));
    unmount();
    vi.stubGlobal("fetch", server(0));
    render(<RsvpForm slug="EVT1" event={event({ rsvpCapacity: "40" })} />);
    expect(await screen.findByText("This event is full.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send RSVP" })).toBeNull();
  });

  it("says how many are left when someone else took the places first", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      server(4, new Response(JSON.stringify({ error: "full", left: 1 }), { status: 409 })),
    );
    render(<RsvpForm slug="EVT1" event={event({ rsvpCapacity: "4" })} />);
    const guests = screen.getByRole("combobox", { name: /Guests/ });
    await vi.waitFor(() => expect(within(guests).getAllByRole("option")).toHaveLength(4));
    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ana");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ana@example.com");
    await user.selectOptions(guests, "3");
    await user.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Only 1 place is left");
    expect(within(guests).getAllByRole("option")).toHaveLength(1);
  });

  it("remembers this phone's RSVP, and closes when the event has ended", () => {
    window.localStorage.setItem("ziplume:rsvp:EVT1", JSON.stringify({ guests: 3 }));
    const { unmount } = render(<RsvpForm slug="EVT1" event={event()} />);
    expect(screen.getByText("You’re on the list")).toBeInTheDocument();
    unmount();
    window.localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2099-01-10T22:00:00Z"));
    render(<RsvpForm slug="EVT1" event={event()} />);
    expect(screen.getByText("RSVPs have closed.")).toBeInTheDocument();
  });

  it("sends nothing from the editor's preview", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<RsvpForm slug="EVT1" event={event({ rsvpCapacity: "40" })} preview />);
    expect(screen.getByRole("button", { name: "Send RSVP" })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
```

Append to `features/pages/PageView.test.tsx`:

```tsx
describe("Things visitors send back", () => {
  it("draws each form only when the page turns it on, inert in the preview", () => {
    const { unmount } = view("vcard", { ...PAGE_DEFAULTS.vcard(), firstName: "Ana" });
    expect(screen.queryByText("Share your details")).toBeNull();
    unmount();
    const card = view("vcard", { ...PAGE_DEFAULTS.vcard(), firstName: "Ana", shareDetails: true });
    expect(screen.getByText("Share your details")).toHaveAttribute("aria-disabled");
    card.unmount();

    const coupon = view("coupon", { ...PAGE_DEFAULTS.coupon(), offer: "20% OFF", markUsed: true });
    expect(screen.getByText("Mark as used")).toHaveAttribute("aria-disabled");
    coupon.unmount();
    const plain = view("coupon", { ...PAGE_DEFAULTS.coupon(), offer: "20% OFF" });
    expect(screen.queryByText("Mark as used")).toBeNull();
    plain.unmount();

    view("event", {
      ...PAGE_DEFAULTS.event(),
      title: "Launch",
      start: "2099-01-10T13:00",
      timeZone: "America/New_York",
      rsvp: true,
    });
    expect(screen.getByRole("heading", { name: "RSVP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send RSVP" })).toBeDisabled();
  });

  it("draws an older page without the new fields as before", () => {
    // Drawn as given: an event saved before RSVPs has neither field.
    const { rsvp: _rsvp, rsvpCapacity: _places, ...old } = PAGE_DEFAULTS.event();
    view(
      "event",
      { ...old, title: "Old", start: "2099-01-10T13:00", timeZone: "America/New_York" },
      false,
    );
    expect(screen.queryByRole("heading", { name: "RSVP" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/pages/ShareDetails.test.tsx features/pages/MarkUsed.test.tsx features/pages/RsvpForm.test.tsx features/pages/PageView.test.tsx`
Expected: FAIL. The three components can't be found, and the PageView tests find no "Share your details".

- [ ] **Step 3: Write `features/pages/useRemembered.ts`.**

```ts
"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "ziplume:remembered";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Something this phone remembers about a page, such as a coupon it marked used (spec item 29), as
 * the stored text. It's null while rendering on the server, with no key, or when storage is
 * blocked; callers keep their own state for that case.
 */
export function useRemembered(key: string | null): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => (key ? read(key) : null),
    () => null,
  );
  const remember = useCallback(
    (next: string) => {
      if (!key) return;
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Storage is blocked; the caller's own state carries it until the page closes.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, remember];
}
```

- [ ] **Step 4: Write `features/pages/VisitorField.tsx`.**

```tsx
"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";

import { limitNote } from "./editor/limits";

const box =
  "rounded-xl border border-field-border bg-surface px-3.5 text-base font-normal text-fg focus-visible:outline-2 focus-visible:outline-[var(--page-accent)] aria-invalid:border-danger";

/**
 * A box on a visitor's form: a visible label, its error, and its counter (spec item 2): always
 * for a note, near the limit for one line. Nothing is cut; text over the limit is an error.
 */
export function VisitorField({
  label,
  name,
  value,
  onChange,
  error,
  limit,
  multiline = false,
  optional = false,
  type = "text",
  autoComplete,
  inputMode,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  limit: number;
  multiline?: boolean;
  optional?: boolean;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel";
}) {
  const id = useId();
  const note = limitNote(value.length, limit, multiline);
  const message = error ?? note.error ?? undefined;
  const describedBy =
    [message && `${id}-error`, note.counter && `${id}-count`].filter(Boolean).join(" ") ||
    undefined;
  const control = {
    id,
    name,
    value,
    "aria-invalid": message ? true : undefined,
    "aria-describedby": describedBy,
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {optional && <span className="font-normal text-fg-muted"> (optional)</span>}
      </label>
      {multiline ? (
        <textarea
          {...control}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
          className={cn(box, "py-3")}
        />
      ) : (
        <input
          {...control}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          className={cn(box, "h-12")}
        />
      )}
      {(message || note.counter) && (
        <div className="flex justify-between gap-3 text-sm">
          {message ? (
            <p id={`${id}-error`} className="text-danger">
              {message}
            </p>
          ) : (
            <span />
          )}
          {note.counter && (
            <p id={`${id}-count`} className="text-fg-muted tabular-nums">
              {note.counter}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Write `features/pages/ShareDetails.tsx`.**

```tsx
"use client";

import { Send } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { shareErrors, VISITOR_LIMITS, type ShareInput } from "@/lib/pages/responses";

import { PageCard, pageButton } from "./parts";
import { VisitorField } from "./VisitorField";

const EMPTY: ShareInput = { name: "", phone: "", email: "", note: "" };
const ORDER = ["name", "phone", "email", "note"] as const;

/** "Share your details": a short form that sends a visitor's own details back (spec item 15). */
export function ShareDetails({
  slug,
  owner,
  preview,
}: {
  slug: string;
  /** Who gets them, for the thank-you: "Thanks! Ana has your details." */
  owner: string;
  preview?: boolean;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(EMPTY);
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "limited">("idle");
  // Once they've tried to send, the errors follow what's typed.
  const errors = tried ? shareErrors(input) : {};
  const set = (patch: Partial<ShareInput>) => setInput((old) => ({ ...old, ...patch }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const found = shareErrors(input);
    setTried(true);
    const first = ORDER.find((key) => found[key]);
    if (first) {
      (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    const website = new FormData(form).get("website") ?? "";
    setState("sending");
    try {
      const response = await fetch(`/p/${encodeURIComponent(slug)}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, website }),
      });
      setState(response.ok ? "done" : response.status === 429 ? "limited" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p
        role="status"
        className="rounded-(--pg-radius) border border-border bg-surface px-5 py-4 text-center font-semibold text-fg"
      >
        Thanks! {owner} has your details.
      </p>
    );
  }

  return (
    <>
      {preview ? (
        <span className={pageButton.secondary} aria-disabled>
          <Send aria-hidden /> Share your details
        </span>
      ) : (
        <button
          type="button"
          className={pageButton.secondary}
          aria-expanded={open}
          aria-controls={open ? formId : undefined}
          onClick={() => setOpen((was) => !was)}
        >
          <Send aria-hidden /> Share your details
        </button>
      )}
      {open && (
        <PageCard>
          <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-sm text-fg-muted">
              Send {owner} your name, with a phone number or an email.
            </p>
            <VisitorField
              label="Name"
              name="name"
              autoComplete="name"
              limit={VISITOR_LIMITS.name}
              value={input.name}
              onChange={(name) => set({ name })}
              error={errors.name}
            />
            <VisitorField
              label="Phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              limit={VISITOR_LIMITS.phone}
              value={input.phone}
              onChange={(phone) => set({ phone })}
              error={errors.phone}
            />
            <VisitorField
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              limit={VISITOR_LIMITS.email}
              value={input.email}
              onChange={(email) => set({ email })}
              error={errors.email}
            />
            <VisitorField
              label="Note"
              name="note"
              optional
              multiline
              limit={VISITOR_LIMITS.note}
              value={input.note}
              onChange={(note) => set({ note })}
              error={errors.note}
            />
            {/* Bots tend to fill every field; people never see this one. */}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <button type="submit" className={pageButton.primary} disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Send"}
            </button>
            {state === "error" && (
              <p role="alert" className="text-center text-sm text-danger">
                Your details couldn’t be sent. Please try again.
              </p>
            )}
            {state === "limited" && (
              <p role="alert" className="text-center text-sm text-fg-muted">
                Thanks, your details have already been sent today.
              </p>
            )}
          </form>
        </PageCard>
      )}
    </>
  );
}
```

- [ ] **Step 6: Write `features/pages/MarkUsed.tsx`.**

```tsx
"use client";

import { CircleCheck, TicketCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { couponDeadlineText, localDate } from "@/lib/pages/countdown";

import { pageButton } from "./parts";
import { useMinute } from "./useMinute";
import { useRemembered } from "./useRemembered";

interface Remembered {
  /** This phone's random ID for the coupon; the server keeps only a one-way hash of it. */
  id: string;
  usedAt?: string;
}

function parse(raw: string | null): Remembered | null {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== "object") return null;
    const { id, usedAt } = value as Record<string, unknown>;
    if (typeof id !== "string" || !/^[0-9a-f]{32}$/.test(id)) return null;
    return { id, usedAt: typeof usedAt === "string" ? usedAt : undefined };
  } catch {
    return null;
  }
}

function newPhoneId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const usedOn = (iso: string) =>
  new Date(iso).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** "Mark as used", for the till: once per phone, then "Used on this phone" (spec item 29). */
export function MarkUsed({
  slug,
  validUntil,
  preview,
}: {
  slug: string;
  validUntil: string;
  preview?: boolean;
}) {
  const now = useMinute();
  const [raw, remember] = useRemembered(preview ? null : `ziplume:coupon:${slug.toUpperCase()}`);
  const saved = useMemo(() => parse(raw), [raw]);
  // When storage is blocked, this phone's use lasts until the page closes.
  const [usedNow, setUsedNow] = useState<string | null>(null);
  const [step, setStep] = useState<
    "idle" | "confirm" | "sending" | "error" | "limited" | "closed"
  >("idle");
  const yes = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (step === "confirm") yes.current?.focus();
  }, [step]);

  const usedAt = saved?.usedAt ?? usedNow;
  if (usedAt) {
    return (
      <p role="status" className="flex flex-col items-center gap-0.5 text-center">
        <span className="flex items-center gap-2 font-semibold text-fg">
          <CircleCheck aria-hidden className="size-5 text-(--page-accent)" />
          Used on this phone
        </span>
        <span className="text-sm text-fg-muted">{usedOn(usedAt)}</span>
      </p>
    );
  }
  // Ended on this phone's own date, as the deadline above it says (ruling 3).
  if (now !== null && couponDeadlineText(validUntil, localDate(new Date(now))) === "This offer has ended") {
    return null;
  }

  async function confirm() {
    const id = saved?.id ?? newPhoneId();
    // Kept before sending, so trying again after a lost answer is the same phone.
    remember(JSON.stringify({ id }));
    setStep("sending");
    try {
      const response = await fetch(`/p/${encodeURIComponent(slug)}/redeem`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: id }),
      });
      if (response.ok) {
        const at = new Date().toISOString();
        remember(JSON.stringify({ id, usedAt: at }));
        setUsedNow(at);
        return;
      }
      setStep(response.status === 429 ? "limited" : response.status === 409 ? "closed" : "error");
    } catch {
      setStep("error");
    }
  }

  if (step === "confirm" || step === "sending") {
    return (
      <div className="flex w-full flex-col gap-3">
        <p className="font-semibold text-fg">Mark this coupon as used?</p>
        <p className="text-sm text-fg-muted">Do this at the till. It can’t be undone.</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={pageButton.secondary}
            disabled={step === "sending"}
            onClick={() => setStep("idle")}
          >
            Not yet
          </button>
          <button
            ref={yes}
            type="button"
            className={pageButton.primary}
            disabled={step === "sending"}
            onClick={() => void confirm()}
          >
            {step === "sending" ? "Marking…" : "Yes, mark it used"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {preview ? (
        <span className={pageButton.secondary} aria-disabled>
          <TicketCheck aria-hidden /> Mark as used
        </span>
      ) : (
        <button type="button" className={pageButton.secondary} onClick={() => setStep("confirm")}>
          <TicketCheck aria-hidden /> Mark as used
        </button>
      )}
      {step === "error" && (
        <p role="alert" className="text-sm text-danger">
          It couldn’t be marked as used. Please try again.
        </p>
      )}
      {step === "limited" && (
        <p role="alert" className="text-sm text-fg-muted">
          Too many tries today. Please show this coupon to staff.
        </p>
      )}
      {step === "closed" && (
        <p role="alert" className="text-sm text-fg-muted">
          This coupon can’t be marked as used any more.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Write `features/pages/RsvpForm.tsx`.**

```tsx
"use client";

import { CalendarCheck } from "lucide-react";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";

import { eventTimes } from "@/lib/pages/files";
import {
  guestChoices,
  rsvpCapacity,
  rsvpErrors,
  VISITOR_LIMITS,
  type RsvpInput,
} from "@/lib/pages/responses";
import type { EventPage } from "@/lib/pages/types";

import { pageButton } from "./parts";
import { useMinute } from "./useMinute";
import { useRemembered } from "./useRemembered";
import { VisitorField } from "./VisitorField";

const ORDER = ["name", "email", "guests", "note"] as const;
const heading = "mb-3 font-page-heading text-lg font-bold text-fg";

function Listed({ already }: { already?: boolean }) {
  return (
    <p role="status" className="flex items-center gap-2 font-semibold text-fg">
      <CalendarCheck aria-hidden className="size-5 text-(--page-accent)" />
      {already ? "You’re already on the list" : "You’re on the list"}
    </p>
  );
}

/** The RSVP form (spec item 33): who's coming and how many, while places are left. */
export function RsvpForm({
  slug,
  event,
  preview,
}: {
  slug: string;
  event: EventPage;
  preview?: boolean;
}) {
  const guestsId = useId();
  const now = useMinute();
  const capacity = rsvpCapacity(event.rsvpCapacity);
  // Places left: from the server once it answers; until then (and in the preview) the limit.
  const [fetched, setFetched] = useState<number | null | undefined>(undefined);
  const left = capacity === null ? null : (fetched ?? capacity);
  const [raw, remember] = useRemembered(preview ? null : `ziplume:rsvp:${slug.toUpperCase()}`);
  const [input, setInput] = useState<RsvpInput>({ name: "", email: "", guests: 1, note: "" });
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<
    "idle" | "sending" | "done" | "already" | "fewer" | "error" | "limited" | "closed"
  >("idle");

  useEffect(() => {
    if (preview || capacity === null) return;
    let active = true;
    fetch(`/p/${encodeURIComponent(slug)}/rsvp`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { left?: unknown } | null) => {
        if (active && typeof body?.left === "number") setFetched(body.left);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug, preview, capacity]);

  const choices = guestChoices(left);
  const guests = Math.min(input.guests, Math.max(choices.length, 1));
  const errors = tried ? rsvpErrors({ ...input, guests }, left) : {};
  const set = (patch: Partial<RsvpInput>) => setInput((old) => ({ ...old, ...patch }));
  const times = eventTimes(event);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (preview) return;
    const form = formEvent.currentTarget;
    const found = rsvpErrors({ ...input, guests }, left);
    setTried(true);
    const first = ORDER.find((key) => found[key]);
    if (first) {
      (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    const website = new FormData(form).get("website") ?? "";
    setState("sending");
    try {
      const response = await fetch(`/p/${encodeURIComponent(slug)}/rsvp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, guests, website }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        already?: boolean;
        error?: string;
        left?: unknown;
      };
      if (response.ok) {
        remember(JSON.stringify({ guests }));
        setState(body.already ? "already" : "done");
      } else if (body.error === "full" && typeof body.left === "number") {
        setFetched(body.left);
        setState(body.left > 0 ? "fewer" : "idle");
      } else {
        setState(response.status === 429 ? "limited" : response.status === 409 ? "closed" : "error");
      }
    } catch {
      setState("error");
    }
  }

  let body: ReactNode;
  if (state === "done" || state === "already" || raw !== null) {
    body = <Listed already={state === "already"} />;
  } else if (now !== null && times && now >= times.end.getTime()) {
    body = <p className="text-fg-muted">RSVPs have closed.</p>;
  } else if (left === 0) {
    body = <p className="font-semibold text-fg">This event is full.</p>;
  } else {
    body = (
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <VisitorField
          label="Name"
          name="name"
          autoComplete="name"
          limit={VISITOR_LIMITS.name}
          value={input.name}
          onChange={(name) => set({ name })}
          error={errors.name}
        />
        <VisitorField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          limit={VISITOR_LIMITS.email}
          value={input.email}
          onChange={(email) => set({ email })}
          error={errors.email}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={guestsId} className="text-sm font-medium text-fg">
            Guests, including you
          </label>
          <select
            id={guestsId}
            name="guests"
            value={guests}
            onChange={(e) => set({ guests: Number(e.target.value) })}
            className="h-12 rounded-xl border border-field-border bg-surface px-3.5 text-base text-fg focus-visible:outline-2 focus-visible:outline-[var(--page-accent)]"
          >
            {choices.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <VisitorField
          label="Note"
          name="note"
          optional
          multiline
          limit={VISITOR_LIMITS.note}
          value={input.note}
          onChange={(note) => set({ note })}
          error={errors.note}
        />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button
          type="submit"
          className={pageButton.primary}
          disabled={state === "sending" || preview}
        >
          {state === "sending" ? "Sending…" : "Send RSVP"}
        </button>
        {state === "fewer" && left !== null && (
          <p role="alert" className="text-center text-sm text-fg">
            {left === 1 ? "Only 1 place is left." : `Only ${left} places are left.`} Pick fewer
            guests.
          </p>
        )}
        {state === "error" && (
          <p role="alert" className="text-center text-sm text-danger">
            Your RSVP couldn’t be sent. Please try again.
          </p>
        )}
        {state === "limited" && (
          <p role="alert" className="text-center text-sm text-fg-muted">
            Thanks, you’ve already sent RSVPs today.
          </p>
        )}
        {state === "closed" && (
          <p role="alert" className="text-center text-sm text-fg-muted">
            This event isn’t taking RSVPs any more.
          </p>
        )}
      </form>
    );
  }

  return (
    <section aria-labelledby={`${guestsId}-heading`}>
      <h2 id={`${guestsId}-heading`} className={heading}>
        RSVP
      </h2>
      {body}
    </section>
  );
}
```

- [ ] **Step 8: Draw them on the pages.** In `features/pages/PageView.tsx`, import `MarkUsed`, `RsvpForm` and `ShareDetails`.
- `VcardView`, right after the Save contact `PageLink`:

```tsx
      {page.shareDetails && (
        <ShareDetails slug={slug} owner={page.firstName.trim() || name} preview={preview} />
      )}
```

- `CouponView`: add `slug` to its props (`function CouponView({ page, slug, preview }: ViewProps<CouponPage>)`). Then, right after `<CouponDeadline validUntil={page.validUntil} />`:

```tsx
        {page.markUsed && (
          <MarkUsed slug={slug} validUntil={page.validUntil} preview={preview} />
        )}
```

- `EventView`, right after the first `PageCard` closes (before "About this event"):

```tsx
      {page.rsvp && (
        <PageCard>
          <RsvpForm slug={slug} event={page} preview={preview} />
        </PageCard>
      )}
```

- [ ] **Step 9: Run the tests, lint and the type check.**

Run: `npx vitest run features/pages && npm run lint && npm run typecheck`
Expected:
- every `features/pages` test passes, the new ones included;
- lint and the type check are clean. If `react-hooks` flags the `MarkUsed` focus effect, use a ruling and focus inside the click handler after `setStep("confirm")` with `queueMicrotask`.

- [ ] **Step 10: Commit.**

```bash
git add features/pages
git commit -m "Share your details, Mark as used and the RSVP form on the visitor's page"
```

---

### Task 5: The editor: switches for each, and the event's places

**Files:**
- Modify: `features/pages/editor/editors/VcardEditor.tsx`
- Modify: `features/pages/editor/editors/CouponEditor.tsx`
- Modify: `features/pages/editor/editors/EventEditor.tsx`
- Modify: `features/pages/editor/fields.tsx` (`TextFieldProps.inputMode` gains `"numeric"`)
- Test: `features/pages/editor/PageEditor.test.tsx`

**Interfaces:**
- Consumes: Task 2's fields, and the `rsvpCapacity` error from `validatePage`.

- [ ] **Step 1: Write the failing tests.** Append to `features/pages/editor/PageEditor.test.tsx`:

```tsx
describe("Things visitors send back, in the editor", () => {
  function Editor({ type }: { type: "vcard" | "coupon" | "event" }) {
    const [page, setPage] = useState<unknown>(() => PAGE_DEFAULTS[type]());
    return (
      <>
        <PageEditor
          type={type}
          page={page as never}
          errors={{}}
          onUpdate={(update) => setPage((p: unknown) => update(p as never))}
        />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);

  it("turns on Share your details", async () => {
    const user = userEvent.setup();
    render(<Editor type="vcard" />);
    await user.click(screen.getByRole("switch", { name: /^Share your details button/ }));
    expect(saved().shareDetails).toBe(true);
  });

  it("turns on Mark as used", async () => {
    const user = userEvent.setup();
    render(<Editor type="coupon" />);
    await user.click(screen.getByRole("switch", { name: /^Mark as used button/ }));
    expect(saved().markUsed).toBe(true);
  });

  it("turns on RSVPs, then asks for the places", async () => {
    const user = userEvent.setup();
    render(<Editor type="event" />);
    expect(screen.queryByRole("textbox", { name: /^Places/ })).toBeNull();
    await user.click(screen.getByRole("switch", { name: /^RSVP form/ }));
    await user.type(screen.getByRole("textbox", { name: /^Places/ }), "50");
    expect(saved()).toMatchObject({ rsvp: true, rsvpCapacity: "50" });
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx -t "visitors send back"`
Expected: FAIL. No switch named "Share your details button".

- [ ] **Step 3: Add the switches and the field.**

In `features/pages/editor/fields.tsx`, change `inputMode?: "text" | "url" | "email" | "tel" | "decimal";` to `inputMode?: "text" | "url" | "email" | "tel" | "decimal" | "numeric";`.

`VcardEditor.tsx`, after the "Quick buttons" `FormCard`:

```tsx
      <FormCard title="Share your details" note="Visitors send you theirs">
        <ToggleField
          label="Share your details button"
          description="Visitors can send you their name with a phone number or email. You’ll find them on this code’s page."
          checked={page.shareDetails}
          onChange={(shareDetails) => set({ shareDetails })}
        />
      </FormCard>
```

`CouponEditor.tsx`: import `ToggleField` with the other fields. After the "Offer" `FormCard`:

```tsx
      <FormCard title="At the till">
        <ToggleField
          label="Mark as used button"
          description="Each phone can mark the coupon used once. You’ll see how many were used on this code’s page."
          checked={page.markUsed}
          onChange={(markUsed) => set({ markUsed })}
        />
      </FormCard>
```

`EventEditor.tsx`, after the "Tickets" `FormCard`:

```tsx
      <FormCard title="RSVPs">
        <ToggleField
          label="RSVP form"
          description="Visitors tell you they’re coming, with how many guests. You’ll find the list on this code’s page."
          checked={page.rsvp}
          onChange={(rsvp) => set({ rsvp })}
        />
        {page.rsvp && (
          <TextField
            path="rsvpCapacity"
            errors={errors}
            label="Places"
            optional
            inputMode="numeric"
            placeholder="50"
            hint="The most guests in all. Leave it empty for no limit."
            value={page.rsvpCapacity}
            onChange={(rsvpCapacity) => set({ rsvpCapacity })}
          />
        )}
      </FormCard>
```

- [ ] **Step 4: Run the editor tests and the type check.**

Run: `npx vitest run features/pages/editor && npm run typecheck`
Expected: all pass, and the type check is clean.

- [ ] **Step 5: Commit.**

```bash
git add features/pages/editor
git commit -m "Editor switches for Share your details, Mark as used and RSVPs, with the event's places"
```

---

### Task 6: The code page: shared details, coupon uses and RSVPs

**Files:**
- Create: `lib/responses/csv.ts`, `lib/responses/csv.test.ts`
- Create: `features/dashboard/useCodeRows.ts`
- Create: `features/dashboard/ContactShares.tsx`, `features/dashboard/CouponUses.tsx`, `features/dashboard/EventRsvps.tsx`
- Create: `features/dashboard/VisitorResponses.test.tsx`
- Modify: `features/dashboard/CodeOverview.tsx`

**Interfaces:**
- Consumes:
  - Task 1's readable columns and `rsvp_guests`;
  - Task 2's row types and `rsvpCapacity`;
  - `csvField` from `lib/analytics/shape.ts`.
- Produces:
  - `sharesCsv(rows)`, `rsvpsCsv(rows)`, `usesCsv(rows)` and `csvHref(csv)`;
  - `useCodeRows<T>(table, codeId, columns)`, returning `{ rows, total, failed, remove }`;
  - cards that take `{ codeId, content, canEdit }` (`CouponUses` has no `canEdit`).

- [ ] **Step 1: Write the failing tests.**

`lib/responses/csv.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { csvHref, rsvpsCsv, sharesCsv, usesCsv } from "./csv";

describe("visitor response CSVs", () => {
  it("writes a header and a line per row, quoting and defusing what visitors typed", () => {
    expect(
      sharesCsv([
        {
          id: 1,
          code_id: "c",
          created_at: "2030-01-01T12:00:00Z",
          name: "=HYPERLINK(1)",
          phone: null,
          email: "ana@example.com",
          note: 'Hi, "there"',
        },
      ]),
    ).toBe(
      'received_at,name,phone,email,note\r\n2030-01-01T12:00:00Z,\'=HYPERLINK(1),,ana@example.com,"Hi, ""there"""',
    );
    expect(
      rsvpsCsv([
        {
          id: 1,
          code_id: "c",
          created_at: "2030-01-01T12:00:00Z",
          name: "Ana",
          email: "ana@example.com",
          guests: 3,
          note: null,
        },
      ]),
    ).toBe("received_at,name,email,guests,note\r\n2030-01-01T12:00:00Z,Ana,ana@example.com,3,");
    expect(usesCsv([{ id: 1, code_id: "c", created_at: "2030-01-01T12:00:00Z" }])).toBe(
      "used_at\r\n2030-01-01T12:00:00Z",
    );
    expect(csvHref("a,b")).toBe("data:text/csv;charset=utf-8,a%2Cb");
  });
});
```

`features/dashboard/VisitorResponses.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { ContactShares } from "./ContactShares";
import { CouponUses } from "./CouponUses";
import { EventRsvps } from "./EventRsvps";

let result: { data: unknown[]; count: number } = { data: [], count: 0 };
const query = {
  select: () => query,
  eq: () => query,
  order: () => query,
  limit: async () => ({ data: result.data, error: null, count: result.count }),
};
const rpc = vi.fn(async (_name: string, _args: unknown) => ({ data: 5, error: null }));
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({ from: () => query, rpc }),
}));

const at = "2030-01-02T12:00:00Z";
const wrap = (node: ReactNode) => render(<ToastProvider>{node}</ToastProvider>);

describe("what visitors sent, on the code page", () => {
  beforeEach(() => {
    result = { data: [], count: 0 };
  });

  it("lists shared details with ways to reach them, and a CSV; viewers can't delete", async () => {
    result = {
      data: [
        { id: 1, code_id: "c", created_at: at, name: "Ben", phone: "+1 555 0100", email: null, note: "Call me" },
      ],
      count: 1,
    };
    wrap(<ContactShares codeId="c" content={{ shareDetails: true }} canEdit={false} />);
    expect(await screen.findByText("Ben")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+1 555 0100" })).toHaveAttribute("href", "tel:+15550100");
    expect(screen.getByText("Call me")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CSV/ })).toHaveAttribute("download", "shared-details.csv");
    expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull();
  });

  it("isn't shown for a page that doesn't ask and has nothing", async () => {
    wrap(<ContactShares codeId="c" content={{}} canEdit />);
    // After the (empty) list has loaded.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("Shared details")).toBeNull();
  });

  it("counts every coupon use, not just the ones loaded", async () => {
    result = { data: [{ id: 9, code_id: "c", created_at: at }], count: 1234 };
    wrap(<CouponUses codeId="c" content={{ markUsed: true }} />);
    expect(await screen.findByText("1,234 used")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CSV/ })).toHaveAttribute("download", "coupon-uses.csv");
  });

  it("shows the places taken, and each RSVP with its guests", async () => {
    result = {
      data: [
        { id: 2, code_id: "c", created_at: at, name: "Ana", email: "ana@example.com", guests: 3, note: null },
        { id: 1, code_id: "c", created_at: at, name: "Ben", email: "ben@example.com", guests: 2, note: "Vegan" },
      ],
      count: 2,
    };
    wrap(<EventRsvps codeId="c" content={{ rsvp: true, rsvpCapacity: "8" }} canEdit />);
    expect(await screen.findByText("5 of 8 places taken")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith("rsvp_guests", { p_code: "c" });
    expect(screen.getByText("3 guests")).toBeInTheDocument();
    expect(screen.getByText("Vegan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Ana’s RSVP" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run lib/responses features/dashboard/VisitorResponses.test.tsx`
Expected: FAIL. `./csv`, `./ContactShares`, `./CouponUses` and `./EventRsvps` can't be found.

- [ ] **Step 3: Write `lib/responses/csv.ts`.**

```ts
import { csvField } from "@/lib/analytics/shape";
import type { ContactShareRow, CouponUseRow, RsvpRow } from "@/types/supabase";

const table = (header: string[], rows: (string | number | null)[][]) =>
  [header, ...rows].map((row) => row.map((v) => csvField(v)).join(",")).join("\r\n");

export const sharesCsv = (rows: ContactShareRow[]) =>
  table(
    ["received_at", "name", "phone", "email", "note"],
    rows.map((r) => [r.created_at, r.name, r.phone, r.email, r.note]),
  );

export const rsvpsCsv = (rows: RsvpRow[]) =>
  table(
    ["received_at", "name", "email", "guests", "note"],
    rows.map((r) => [r.created_at, r.name, r.email, r.guests, r.note]),
  );

export const usesCsv = (rows: CouponUseRow[]) =>
  table(
    ["used_at"],
    rows.map((r) => [r.created_at]),
  );

/** A CSV as a link a download button can point at. */
export const csvHref = (csv: string) => `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
```

- [ ] **Step 4: Write `features/dashboard/useCodeRows.ts`.**

```ts
"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Table = "contact_shares" | "coupon_redemptions" | "event_rsvps";

/** The most a list loads, and its CSV holds: the newest (ruling 10). */
export const ROW_LIMIT = 1000;

/**
 * What visitors sent to one code, newest first: the latest 1,000, the exact total, and a way to
 * delete one (the database lets only owners and editors).
 */
export function useCodeRows<T extends { id: number }>(table: Table, codeId: string, columns: string) {
  const toast = useToast();
  const [rows, setRows] = useState<T[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let active = true;
    supabase
      .from(table)
      .select(columns, { count: "exact" })
      .eq("code_id", codeId)
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT)
      .then(({ data, error, count }) => {
        if (!active) return;
        if (error || !data) return setFailed(true);
        setRows(data as unknown as T[]);
        setTotal(count ?? data.length);
      });
    return () => {
      active = false;
    };
  }, [table, codeId, columns]);

  async function remove(id: number) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast("That couldn't be deleted.", "error");
    setRows((list) => list?.filter((r) => r.id !== id) ?? null);
    setTotal((n) => Math.max(n - 1, 0));
  }

  return { rows, total, failed, remove };
}
```

- [ ] **Step 5: Write the three cards.**

`features/dashboard/ContactShares.tsx`:

```tsx
"use client";

import { Download, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { IconButton, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { sanitizePage } from "@/lib/pages/sanitize";
import { mailHref, telHref } from "@/lib/pages/urls";
import { csvHref, sharesCsv } from "@/lib/responses/csv";
import type { ContactShareRow } from "@/types/supabase";

import { formatCount, relativeTime } from "./format";
import { useCodeRows } from "./useCodeRows";

const COLUMNS = "id, code_id, created_at, name, phone, email, note";
const link = "text-accent underline-offset-4 hover:underline [overflow-wrap:anywhere]";

/** Details visitors shared from a Contact page (spec item 15), newest first, with a CSV. */
export function ContactShares({
  codeId,
  content,
  canEdit,
}: {
  codeId: string;
  content: unknown;
  canEdit: boolean;
}) {
  const on = useMemo(() => sanitizePage("vcard", content).shareDetails, [content]);
  const { rows, total, failed, remove } = useCodeRows<ContactShareRow>(
    "contact_shares",
    codeId,
    COLUMNS,
  );
  // Shown once the page asks, and kept while anything shared is left.
  if (!on && !rows?.length) return null;
  return (
    <Card>
      <CardHeader
        title="Shared details"
        description={
          total
            ? `${formatCount(total)} ${total === 1 ? "person" : "people"}`
            : "Details visitors send you from your page."
        }
        action={
          rows?.length ? (
            <a
              href={csvHref(sharesCsv(rows))}
              download="shared-details.csv"
              className={buttonClasses("outline", "sm")}
            >
              <Download aria-hidden /> CSV
            </a>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-3 px-5 pt-4 pb-6 sm:px-6">
        {failed ? (
          <p className="text-sm text-danger">Shared details couldn’t be loaded.</p>
        ) : rows === null ? (
          <p className="text-sm text-fg-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
            Nobody has shared their details yet. They appear here as soon as someone does.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const tel = r.phone ? telHref(r.phone) : null;
              const mail = r.email ? mailHref(r.email) : null;
              return (
                <li key={r.id} className="flex gap-3 py-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                    <span className="font-semibold [overflow-wrap:anywhere] text-fg">{r.name}</span>
                    {r.phone && (tel ? <a href={tel} className={link}>{r.phone}</a> : <span>{r.phone}</span>)}
                    {r.email && (mail ? <a href={mail} className={link}>{r.email}</a> : <span>{r.email}</span>)}
                    {r.note && <p className="whitespace-pre-line text-fg">{r.note}</p>}
                    <span className="text-xs text-fg-muted">{relativeTime(r.created_at)}</span>
                  </div>
                  {canEdit && (
                    <IconButton
                      label={`Delete ${r.name}’s details`}
                      size="icon-sm"
                      onClick={() => void remove(r.id)}
                    >
                      <Trash2 aria-hidden />
                    </IconButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {rows && total > rows.length && (
          <p className="text-xs text-fg-muted">Showing the latest {formatCount(rows.length)}.</p>
        )}
      </div>
    </Card>
  );
}
```

`features/dashboard/CouponUses.tsx`:

```tsx
"use client";

import { Download } from "lucide-react";
import { useMemo } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { sanitizePage } from "@/lib/pages/sanitize";
import { csvHref, usesCsv } from "@/lib/responses/csv";
import type { CouponUseRow } from "@/types/supabase";

import { formatCount, relativeTime } from "./format";
import { useCodeRows } from "./useCodeRows";

/** How many times a coupon was marked used, once per phone (spec item 29). */
export function CouponUses({ codeId, content }: { codeId: string; content: unknown }) {
  const on = useMemo(() => sanitizePage("coupon", content).markUsed, [content]);
  const { rows, total, failed } = useCodeRows<CouponUseRow>(
    "coupon_redemptions",
    codeId,
    "id, code_id, created_at",
  );
  if (!on && !rows?.length) return null;
  return (
    <Card>
      <CardHeader
        title="Uses"
        description="Each phone can mark the coupon used once."
        action={
          rows?.length ? (
            <a
              href={csvHref(usesCsv(rows))}
              download="coupon-uses.csv"
              className={buttonClasses("outline", "sm")}
            >
              <Download aria-hidden /> CSV
            </a>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-1 px-5 pt-4 pb-6 sm:px-6">
        {failed ? (
          <p className="text-sm text-danger">Uses couldn’t be loaded.</p>
        ) : rows === null ? (
          <p className="text-sm text-fg-muted">Loading…</p>
        ) : (
          <>
            <p className="text-2xl font-semibold text-fg tabular-nums">{formatCount(total)} used</p>
            <p className="text-sm text-fg-muted">
              {rows[0]
                ? `Last used ${relativeTime(rows[0].created_at).toLowerCase()}`
                : "Not used yet. Each use appears here as soon as it’s marked."}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
```

`features/dashboard/EventRsvps.tsx`:

```tsx
"use client";

import { Download, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { IconButton, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { rsvpCapacity } from "@/lib/pages/responses";
import { sanitizePage } from "@/lib/pages/sanitize";
import { mailHref } from "@/lib/pages/urls";
import { csvHref, rsvpsCsv } from "@/lib/responses/csv";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { RsvpRow } from "@/types/supabase";

import { formatCount, relativeTime } from "./format";
import { useCodeRows } from "./useCodeRows";

const COLUMNS = "id, code_id, created_at, name, email, guests, note";

/** Who's coming to an event (spec item 33): the places taken, and each RSVP, with a CSV. */
export function EventRsvps({
  codeId,
  content,
  canEdit,
}: {
  codeId: string;
  content: unknown;
  canEdit: boolean;
}) {
  const page = useMemo(() => sanitizePage("event", content), [content]);
  const capacity = rsvpCapacity(page.rsvpCapacity);
  const { rows, total, failed, remove } = useCodeRows<RsvpRow>("event_rsvps", codeId, COLUMNS);
  // Every guest, counted by the database: the list holds only the latest 1,000.
  const [guests, setGuests] = useState<number | null>(null);
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let active = true;
    supabase.rpc("rsvp_guests", { p_code: codeId }).then(({ data }) => {
      if (active && typeof data === "number") setGuests(data);
    });
    return () => {
      active = false;
    };
  }, [codeId, total]);

  if (!page.rsvp && !rows?.length) return null;
  const taken = guests ?? 0;
  return (
    <Card>
      <CardHeader
        title="RSVPs"
        description={
          total ? `${formatCount(total)} ${total === 1 ? "RSVP" : "RSVPs"}` : "Who’s coming, from your page."
        }
        action={
          rows?.length ? (
            <a href={csvHref(rsvpsCsv(rows))} download="rsvps.csv" className={buttonClasses("outline", "sm")}>
              <Download aria-hidden /> CSV
            </a>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-3 px-5 pt-4 pb-6 sm:px-6">
        {failed ? (
          <p className="text-sm text-danger">RSVPs couldn’t be loaded.</p>
        ) : rows === null ? (
          <p className="text-sm text-fg-muted">Loading…</p>
        ) : (
          <>
            <p className="text-lg font-semibold text-fg tabular-nums">
              {capacity
                ? `${formatCount(taken)} of ${formatCount(capacity)} places taken`
                : `${formatCount(taken)} ${taken === 1 ? "guest" : "guests"}`}
            </p>
            {rows.length === 0 ? (
              <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
                No RSVPs yet. They appear here as soon as someone sends one.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((r) => {
                  const mail = mailHref(r.email);
                  return (
                    <li key={r.id} className="flex gap-3 py-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                        <span className="font-semibold [overflow-wrap:anywhere] text-fg">{r.name}</span>
                        {mail ? (
                          <a href={mail} className="text-accent underline-offset-4 hover:underline [overflow-wrap:anywhere]">
                            {r.email}
                          </a>
                        ) : (
                          <span>{r.email}</span>
                        )}
                        <span className="text-fg">{r.guests === 1 ? "1 guest" : `${r.guests} guests`}</span>
                        {r.note && <p className="whitespace-pre-line text-fg">{r.note}</p>}
                        <span className="text-xs text-fg-muted">{relativeTime(r.created_at)}</span>
                      </div>
                      {canEdit && (
                        <IconButton
                          label={`Delete ${r.name}’s RSVP`}
                          size="icon-sm"
                          onClick={() => void remove(r.id)}
                        >
                          <Trash2 aria-hidden />
                        </IconButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {total > rows.length && (
              <p className="text-xs text-fg-muted">Showing the latest {formatCount(rows.length)}.</p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 6: Put them on the code page.** In `features/dashboard/CodeOverview.tsx`, import the three cards. Then, right after the feedback card's block:

```tsx
          {code.qr_type === "vcard" && (
            <ContactShares codeId={code.id} content={code.content} canEdit={canEdit} />
          )}
          {code.qr_type === "coupon" && <CouponUses codeId={code.id} content={code.content} />}
          {code.qr_type === "event" && (
            <EventRsvps codeId={code.id} content={code.content} canEdit={canEdit} />
          )}
```

- [ ] **Step 7: Run the tests, lint and the type check.**

Run: `npx vitest run lib/responses features/dashboard && npm run lint && npm run typecheck`
Expected:
- all pass, `CodeOverview.test.tsx` included;
- lint and the type check are clean. If `.from(table)` on the union of tables doesn't type, record a ruling and narrow it with a cast to one table's name: the columns are passed as text anyway.

- [ ] **Step 8: Commit.**

```bash
git add lib/responses features/dashboard
git commit -m "The code page shows shared details, coupon uses and RSVPs, with CSVs"
```

---

### Task 7: Browser tests

**Files:**
- Modify: `e2e/accounts/fixtures.ts` (`PHONE_PAGES`, `Seed`)
- Modify: `e2e/accounts/global-setup.ts`
- Create: `e2e/accounts/visitor-responses.spec.ts`

**Interfaces:**
- Consumes:
  - every task's UI text;
  - `expectNoSidewaysScroll` from `e2e/phone-fit.ts`;
  - `MAKER` and `seed()`.
- Produces seed fields: `makerCardId`, `makerCouponId` and `makerDinnerId`.

- [ ] **Step 1: Add the pages.**

In `e2e/accounts/fixtures.ts`, add these to `PHONE_PAGES`, before the PDF pages. They also get `TYPE-` copies on their type's theme.

```ts
  {
    // Every visitor form, for the phone and axe sweeps (spec items 15, 29 and 33).
    type: "vcard",
    slug: "PHONE-CONTACT-SHARE",
    content: {
      firstName: "Sam",
      lastName: "Share",
      phones: [{ label: "Mobile", number: "+1 555 010 2031" }],
      emails: [],
      socials: [],
      shareDetails: true,
    },
  },
  {
    type: "coupon",
    slug: "PHONE-COUPON-USE",
    content: {
      business: "Phone Cafe",
      offer: "FREE COFFEE",
      code: "COFFEE",
      validUntil: "2099-12-31",
      markUsed: true,
    },
  },
  {
    type: "event",
    slug: "PHONE-EVENT-RSVP",
    content: {
      title: "Phone dinner",
      start: "2099-12-05T18:00",
      end: "2099-12-05T21:00",
      timeZone: "America/New_York",
      location: "100 Main Street, Springfield",
      rsvp: true,
      rsvpCapacity: "40",
    },
  },
```

Add to `Seed`:

```ts
  /** Maker's pages that take visitors' details, coupon uses and RSVPs (4 places). */
  makerCardId: string;
  makerCouponId: string;
  makerDinnerId: string;
```

In `e2e/accounts/global-setup.ts`, after the Maker feedback insert:

```ts
  // Maker's pages that take what visitors send back, so tests can send it and read it.
  const { data: makerPages, error: makerPagesError } = await admin
    .from("qr_codes")
    .insert([
      {
        user_id: makerId,
        name: "Maker card",
        qr_type: "vcard",
        is_dynamic: true,
        slug: "MAKER-CARD",
        content: {
          firstName: "Max",
          lastName: "Maker",
          phones: [],
          emails: [{ label: "Work", address: "max@example.com" }],
          socials: [],
          shareDetails: true,
        },
      },
      {
        user_id: makerId,
        name: "Maker coupon",
        qr_type: "coupon",
        is_dynamic: true,
        slug: "MAKER-COUPON",
        content: { business: "Maker Cafe", offer: "FREE COFFEE", code: "COFFEE", markUsed: true },
      },
      {
        user_id: makerId,
        name: "Maker dinner",
        qr_type: "event",
        is_dynamic: true,
        slug: "MAKER-DINNER",
        content: {
          title: "Maker dinner",
          start: "2099-12-05T18:00",
          end: "2099-12-05T21:00",
          timeZone: "America/New_York",
          rsvp: true,
          rsvpCapacity: "4",
        },
      },
    ])
    .select("id, slug");
  if (makerPagesError || !makerPages) throw makerPagesError ?? new Error("Couldn't create pages");
  const makerPage = (slug: string) => makerPages.find((p) => p.slug === slug)!.id;
```

Add these to `seeded`:

```ts
    makerCardId: makerPage("MAKER-CARD"),
    makerCouponId: makerPage("MAKER-COUPON"),
    makerDinnerId: makerPage("MAKER-DINNER"),
```

- [ ] **Step 2: Write the spec.** Create `e2e/accounts/visitor-responses.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { expectNoSidewaysScroll } from "../phone-fit";
import { MAKER, seed } from "./fixtures";

/** A signed-out visitor on a phone of their own. */
async function visitor(browser: Browser) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    storageState: { cookies: [], origins: [] },
  });
  return { page: await context.newPage(), close: () => context.close() };
}

async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
}

async function expectTargets(page: Page, names: string[]) {
  for (const name of names) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box?.height, name).toBeGreaterThanOrEqual(44);
  }
}

// These fill pages' places and limits, so a retry would start from a different state.
test.describe.configure({ retries: 0 });

test.describe("Things visitors send back", () => {
  test.use({ storageState: MAKER.state });

  test("a visitor shares their details, and the owner sees them", async ({ page, browser }) => {
    const v = await visitor(browser);
    await v.page.goto("p/MAKER-CARD");
    await v.page.getByRole("button", { name: "Share your details" }).click();
    await v.page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(v.page.getByText("Add your name")).toBeVisible();
    await expect(v.page.getByRole("textbox", { name: /^Name/ })).toBeFocused();
    await v.page.getByRole("textbox", { name: /^Name/ }).fill("Vera Visitor");
    await v.page.getByRole("textbox", { name: /^Email/ }).fill("vera@example.com");
    await v.page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(v.page.getByText("Thanks! Max has your details.")).toBeVisible();
    await v.close();

    await page.goto(`codes/${seed().makerCardId}`);
    await expect(page.getByText("Vera Visitor")).toBeVisible();
    await expect(page.getByRole("link", { name: "vera@example.com" })).toHaveAttribute(
      "href",
      "mailto:vera@example.com",
    );
    await expect(page.getByRole("link", { name: /CSV/ })).toHaveAttribute(
      "download",
      "shared-details.csv",
    );
  });

  test("a coupon is marked used once on a phone, and the owner sees the count", async ({
    page,
    browser,
  }) => {
    const v = await visitor(browser);
    await v.page.goto("p/MAKER-COUPON");
    await v.page.getByRole("button", { name: "Mark as used" }).click();
    await v.page.getByRole("button", { name: "Not yet" }).click();
    await v.page.getByRole("button", { name: "Mark as used" }).click();
    await v.page.getByRole("button", { name: "Yes, mark it used" }).click();
    await expect(v.page.getByText("Used on this phone")).toBeVisible();
    await v.page.reload();
    await expect(v.page.getByText("Used on this phone")).toBeVisible();
    await expect(v.page.getByRole("button", { name: "Mark as used" })).toHaveCount(0);
    await v.close();

    await page.goto(`codes/${seed().makerCouponId}`);
    await expect(page.getByText("1 used")).toBeVisible();
  });

  test("RSVPs take the event's places until it's full", async ({ page, browser }) => {
    const first = await visitor(browser);
    await first.page.goto("p/MAKER-DINNER");
    await first.page.getByRole("textbox", { name: /^Name/ }).fill("Ana Guest");
    await first.page.getByRole("textbox", { name: /^Email/ }).fill("ana@example.com");
    await first.page.getByRole("combobox", { name: /Guests/ }).selectOption("3");
    await first.page.getByRole("button", { name: "Send RSVP" }).click();
    await expect(first.page.getByText("You’re on the list")).toBeVisible();
    await first.close();

    const second = await visitor(browser);
    await second.page.goto("p/MAKER-DINNER");
    // One place is left, so one guest is all it offers.
    await expect(
      second.page.getByRole("combobox", { name: /Guests/ }).locator("option"),
    ).toHaveCount(1);
    await second.page.getByRole("textbox", { name: /^Name/ }).fill("Ben Guest");
    await second.page.getByRole("textbox", { name: /^Email/ }).fill("ben@example.com");
    await second.page.getByRole("button", { name: "Send RSVP" }).click();
    await expect(second.page.getByText("You’re on the list")).toBeVisible();
    await second.page.reload();
    await expect(second.page.getByText("You’re on the list")).toBeVisible();
    await second.close();

    const third = await visitor(browser);
    await third.page.goto("p/MAKER-DINNER");
    await expect(third.page.getByText("This event is full.")).toBeVisible();
    await third.close();

    await page.goto(`codes/${seed().makerDinnerId}`);
    await expect(page.getByText("4 of 4 places taken")).toBeVisible();
    await expect(page.getByText("Ana Guest")).toBeVisible();
    await expect(page.getByText("Ben Guest")).toBeVisible();
  });
});

test.describe("Visitor forms on a small phone", () => {
  for (const look of ["PHONE", "TYPE"]) {
    test(`fit at 320px with their errors showing, and pass axe (${look})`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(`p/${look}-CONTACT-SHARE`);
      await page.getByRole("button", { name: "Share your details" }).click();
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await expect(page.getByText("Add your name")).toBeVisible();
      await expectNoSidewaysScroll(page);
      await expectTargets(page, ["Share your details", "Send"]);
      await expectAxeClean(page);

      await page.goto(`p/${look}-COUPON-USE`);
      await page.getByRole("button", { name: "Mark as used" }).click();
      await expectNoSidewaysScroll(page);
      await expectTargets(page, ["Not yet", "Yes, mark it used"]);
      await expectAxeClean(page);

      await page.goto(`p/${look}-EVENT-RSVP`);
      await page.getByRole("button", { name: "Send RSVP" }).click();
      await expect(page.getByText("Add your email")).toBeVisible();
      await expectNoSidewaysScroll(page);
      await expectTargets(page, ["Send RSVP"]);
      await expectAxeClean(page);
    });
  }
});
```

- [ ] **Step 3: Run the signed-in browser tests.** Apply the migration locally first.

Run: `npx --yes supabase@2.120.0 migration up --local && npm run test:e2e:accounts`
Expected:
- every test passes, the new spec included;
- the phone and axe sweep covers the three new `PHONE-` pages and their `TYPE-` copies.

If an older spec counts Maker's codes, record a ruling and update its expected count for the three new pages.

- [ ] **Step 4: Rebuild plain, and run the signed-out browser tests.**

Run: `npm run build && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 5: Commit.**

```bash
git add e2e
git commit -m "Browser tests: sharing details, marking a coupon used, and RSVPs up to the places"
```

---

### Task 8: Docs, and ship Release 5a with the migration

**Files:**
- Modify: `app/(docs)/developers/page.tsx`
- Modify: `app/(docs)/privacy/page.tsx`

- [ ] **Step 1: Update the API docs.** Add this paragraph after the Feedback paragraph, written in the page's JSX style with `<code>`:

> Contact pages take `shareDetails` (true adds Share your details) and coupons take `markUsed` (true adds Mark as used). Events take `rsvp` (true adds the RSVP form) and `rsvpCapacity`: the most guests in all, as digits like `"50"`, or empty for no limit. What visitors send appears on the code's page in the app.

- [ ] **Step 2: Update the privacy page.**
1. Change the Teams bullet's "can see your codes, analytics and feedback" to "can see your codes, analytics and what visitors send".
2. Replace the "Feedback pages" section with:

> **What visitors send**
>
> When someone answers a feedback page, shares their details from a Contact page, marks a coupon used, or RSVPs to an event, Ziplume stores what they send:
> - ratings and comments;
> - a name with a phone number or email, and a note;
> - the time a coupon was used;
> - or a name, email, number of guests and note.
>
> It also stores the same daily-salted visitor hash used for scans, to stop repeat submissions; only Ziplume's server can read it. A visitor's phone remembers, in its own browser storage, the coupons it marked used and the events it RSVPed to. For a coupon, that includes a random ID, of which Ziplume keeps only a one-way hash. The page's owner and their team can see and delete what visitors send, except on codes the owner keeps private. The page's owner decides what to do with details visitors share.

3. In "Keeping and deleting data", change "every saved code, uploaded file, feedback response and all scan history" to "every saved code, uploaded file, everything visitors sent and all scan history".

Commit both:

```bash
git add "app/(docs)/developers/page.tsx" "app/(docs)/privacy/page.tsx"
git commit -m "Docs: the new page fields, and what visitors send on the privacy page"
```

- [ ] **Step 3: Run the full local check.**

Run: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run test:e2e:accounts && npm run build && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 4: Run the final whole-branch review,** with this plan's Review Focus and the ledger's rulings. Then do one fix pass.

- [ ] **Step 5: Apply the migration to the live database before merging** (ruling 14). This uses the scratchpad's `srv.sh` (SSH) and `bridge_read.py` (the private SQL bridge, project `db12f7ce-3e77-4461-a686-c8cd6de6f764`). Nothing else on the server changes.
1. **Disk:** run `srv.sh 'df -h /'`. There must be room for a backup: the runbook's reserve of 3 GiB plus headroom.
2. **Backup:** read `/var/lib/techitdave-offserver/health.json`. The latest verified archive must be from the last 24 hours. If it isn't:
   - run `srv.sh 'systemctl start --no-block techitdave-supabase-backup.service'`;
   - re-read `health.json` until a new archive is verified (about 12 minutes);
   - then run `techitdave-offserver retain`.
3. **Apply:** send the migration file's SQL through `bridge_read.py` as one `begin; … commit;` batch, using Python's `subprocess`. Then send `notify pgrst, 'reload schema'`, and check the `quickqreate-1791927515091-rest` container's log for the reload.
4. **Verify** through the bridge:
   - `select relname, relrowsecurity from pg_class where relname in ('contact_shares', 'coupon_redemptions', 'event_rsvps')` returns three rows, all `true`;
   - `has_table_privilege('anon', 'public.event_rsvps', 'select')` is false;
   - `has_column_privilege('authenticated', 'public.contact_shares', 'visitor_hash', 'select')` is false;
   - `has_column_privilege('authenticated', 'public.contact_shares', 'name', 'select')` is true;
   - for each of `submit_contact_share(text, text, text, text, text, text)`, `record_coupon_use(text, text, text)`, `submit_rsvp(text, text, text, int, text, text)` and `rsvp_places_left(text)`:
     - `has_function_privilege('anon', …, 'execute')` is false;
     - `has_function_privilege('service_role', …, 'execute')` is true;
     - `prosecdef` is true;
   - `has_function_privilege('authenticated', 'public.rsvp_guests(uuid)', 'execute')` is true;
   - `select count(*) from public.feedback_responses` is unchanged from before.
5. **Record it in the runbook** `~/.codex/memories/supabase-coolify.md`, following the earlier entries: disk, backup, time applied, what changed, the checks, and the rollback. The rollback is:

```sql
drop function public.submit_contact_share(text, text, text, text, text, text);
drop function public.record_coupon_use(text, text, text);
drop function public.submit_rsvp(text, text, text, int, text, text);
drop function public.rsvp_places_left(text);
drop function public.rsvp_guests(uuid);
drop function public.rsvp_capacity(jsonb);
drop table public.contact_shares, public.coupon_redemptions, public.event_rsvps;
```

- [ ] **Step 6: Push, open the PR, wait for CI, and merge.**

```bash
git push -u origin feat/page-enhancements-r5a
gh pr create --base main --head feat/page-enhancements-r5a --title "Page enhancements 5a: Share your details, Mark as used, and RSVPs with places" --body "<items 15, 29 and 33, the migration (applied live before merge), rulings, and test counts>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
gh pr merge --merge
```

- [ ] **Step 7: Check the live site.**
1. Wait for the version in `https://ziplume.com/sw.js` to change.
2. Find client chunks containing "Share your details", "Mark as used" and "Send RSVP".
3. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307.
4. `GET https://ziplume.com/p/NOSUCH1/rsvp` returns 404.
5. Send nothing to David's pages, and create nothing in his account.
