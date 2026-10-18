# Page enhancements, Release 5b: Email me new responses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A code's maker can switch on "Email me new responses". Each new feedback response, set of shared details or RSVP is then emailed to them through Brevo, at most one email per response and 50 a day, and each email has a link that turns the emails off.

**Architecture:**
- **Database:** one migration.
  - `qr_codes.notify_responses`, set only through `set_response_emails` by the code's maker. It switches itself off when a code moves to someone else.
  - A `response_emails` log. An insert trigger on `feedback_responses`, `contact_shares` and `event_rsvps` queues one row per response while the switch is on, under the daily limits.
  - `claim_response_emails` hands each queued email out once, with the response's details. `finish_response_email` records the result.
- **Sending:** after a visitor's response is stored, the route calls `sendResponseEmailsLater`. It uses Next's `after()`, so Brevo never slows the visitor's answer. It claims the page's waiting emails, builds each one with `emails/response.ts`, and sends it with `sendEmail`. The `List-Unsubscribe` headers allow one-click unsubscribe.
- **Off link:** the link is signed with HMAC under the server's existing `SCAN_HASH_SECRET`, for one code and its maker.
  - `/email/responses-off` shows a "Turn off emails" button.
  - `/email/responses-off/stop` takes that button's post, and a mail app's one-click post.
  - Opening the link changes nothing, because mail scanners open links.
- **Code page:** `ResponseEmails` is the switch card. Only the code's maker sees it, on Feedback pages and on Contact and Event pages that take responses.

**Tech Stack:**
- Next.js 16 (`after` from `next/server`), React 19, Supabase (self-hosted, through the private SQL bridge), Brevo's HTTP API, PGlite migration tests, Vitest, Playwright 1.56.
- No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md`. This plan covers:
- section 8, item 38;
- section 9's Release 5 migration (the `notify_responses` flag and the email log);
- section 3.

Release 5a (items 15, 29 and 33) is live.

## Global Constraints

- **Email me new responses** (spec 38):
  - a switch per code: "Email me new responses";
  - it covers feedback, shared details and RSVPs;
  - it sends through Brevo, as invites do: at most one email per response and 50 per account per day;
  - each email has a link that turns it off.
- **Migration** (spec 9):
  - a per-code `notify_responses` flag and an email log for the daily cap;
  - a verified backup from the last 24 hours, after checking the disk has room;
  - no backslashes;
  - applied through the private SQL bridge before merging;
  - recorded in the runbook.
- **Section 3 rules apply:**
  - visible labels and 44 px targets, with no sideways scroll from 320 px;
  - axe clean;
  - tests for every new part;
  - browser tests for the main flow.
- **No real emails** are sent while building or checking this release. Local and CI runs have no `BREVO_API_KEY`, and live checks don't switch on any of David's codes.
- **Every commit is formatted:** run `npx prettier --write` on the files it touches. `$WS` is this plan's workspace from `sdd-workspace`; long test output goes there.

## Rulings made in this plan (for David's review)

1. **Only the code's maker gets the emails, and only they see the switch.** The emails carry what visitors sent, so they go only to the person whose page it is. Teammates still see every response on the code page.
2. **A code that moves to someone else switches its emails off.** This happens when a teammate is removed with "keep their codes". The new owner turns the emails on if they want them.
3. **The email shows what was sent,** so you can act without opening the app: ratings and comments, a name with a phone or email and a note, or an RSVP's name, email, guests and note.
   - The subject names only your code ("New RSVP for “Summer party”"), never what a visitor typed.
   - The privacy page says Brevo carries these emails.
4. **Limits:**
   - One email per response, never batched.
   - Up to 50 a day per account.
   - Response emails stop for the day once the whole site's invite and response emails reach 250. That leaves at least 50 of Brevo's free 300 a day for sign-up and password emails. If your Brevo plan sends more, I can raise these.
5. **Emails past a limit aren't sent later.** The responses still appear on the code page.
6. **The off link opens a page with a "Turn off emails" button** instead of turning them off as it opens, because mail scanners open links. A mail app's own Unsubscribe button turns them off in one step.
7. **The off link is signed with the server's existing secret,** so there's nothing new for you to set up. It stops working if the code moves to another owner.
8. **Each email goes out just after the visitor gets their answer,** so a slow Brevo never slows the form. An email Brevo refuses isn't retried.
9. **Coupon uses don't send emails.** Item 38 covers feedback, shared details and RSVPs.
10. **Where the switch shows:** on Feedback pages, and on Contact and Event pages once Share your details or RSVPs is on (or the switch is already on).
11. **Without a Brevo key** (local and CI tests), the switch still saves but says email isn't set up, and nothing is sent. After this ships, you can try it yourself: switch it on for one of your sample pages and send a response from your phone.
12. **The migration needs a verified backup from the last 24 hours.** If there isn't one, I start the backup service myself before applying it; approving this plan approves that. I make no other server changes.
13. **The feedback route gets one added line,** the call that sends emails. Nothing else in it changes.

## Review Focus

1. **Limits under pressure:**
   - two responses at once when the maker is at 49;
   - the 50th and 51st;
   - the site at 249 with invites;
   - a response deleted before its email goes;
   - the switch turned off between queueing and sending.

   Expected: never more than 50 per account or 250 for the site; nothing sent for a deleted response or a switched-off code. *Task 1 tests.*
2. **Off links:**
   - a wrong token;
   - another code's token;
   - a token after the code moved owner;
   - a mail scanner's GET;
   - a mail app's one-click POST;
   - a second click.

   Expected: only a matching token turns emails off; a GET never changes anything; a second click says they're off. *Task 2 and Task 4 tests.*
3. **What visitors type, inside the email:**
   - HTML, line breaks and very long text in names and notes;
   - quotes and line breaks in a code's name.

   Expected: escaped HTML, a one-line subject of at most 200 characters, and nothing a visitor typed in the subject. *Task 2 tests.*
4. **Brevo failing:** no key, a 4xx or 5xx, or a timeout. Expected: the visitor's answer is unaffected, the email is marked failed, and nothing throws out of `after()`. *Task 3 tests.*
5. **Teams:**
   - an editor or viewer trying the switch: the card is hidden, and the function refuses;
   - a password-only session of a two-step account;
   - a code moved by a removal.

   *Task 1 and Task 5 tests.*

---

### Task 1: The migration: the switch, the email log, and the queue

**Files:**
- Create: `supabase/migrations/20261018120000_response_emails.sql`
- Test: `supabase/test/migration.test.ts` (a new `describe("response emails")` at the end)

**Interfaces:**
- Produces:
  - `qr_codes.notify_responses boolean not null default false`;
  - `set_response_emails(p_code uuid, p_on boolean) returns void`, for `authenticated`; only the code's maker, with a two-step session where needed;
  - `claim_response_emails(p_slug text)`, for `service_role` only. It returns a table of `id bigint, kind text, code_id uuid, code_name text, owner_id uuid, to_email text, to_name text, received_at timestamptz, details jsonb`:
    - `kind` is `feedback`, `share` or `rsvp`;
    - `details` holds `{rating, answers, comment, contact}`, `{name, phone, email, note}` or `{name, email, guests, note}`, or null when the response is gone;
  - `finish_response_email(p_id bigint, p_sent boolean) returns void`, for `service_role` only.

- [ ] **Step 1: Write the failing tests.** Append to `supabase/test/migration.test.ts`:

```ts
describe("response emails", () => {
  const KAI = "6a6a6a6a-6a6a-4a6a-8a6a-6a6a6a6a6a6a"; // owner
  const LEX = "6b6b6b6b-6b6b-4b6b-8b6b-6b6b6b6b6b6b"; // editor on Kai's team
  const MOE = "6c6c6c6c-6c6c-4c6c-8c6c-6c6c6c6c6c6c"; // another owner
  const by =
    (id: string) =>
    <T>(sql: string, params?: unknown[]) =>
      as<T>("authenticated", id, sql, params);
  const asKai = by(KAI);
  const asLex = by(LEX);
  const asMoe = by(MOE);
  const ids = {} as Record<"feedback" | "card" | "event" | "moe" | "lex", string>;
  const make = async (who: ReturnType<typeof by>, slug: string, type: string, content: object) =>
    (
      await who<{ id: string }>(
        `insert into public.qr_codes (name, qr_type, is_dynamic, slug, content)
         values ($1, $2, true, $3, $4::jsonb) returning id`,
        [`${slug} page`, type, slug, JSON.stringify(content)],
      )
    )[0]!.id;
  const switchOn = (who: ReturnType<typeof by>, id: string, on = true) =>
    who("select public.set_response_emails($1, $2)", [id, on]);
  const queued = async (owner: string) =>
    (
      await asService<{ n: number }>(
        "select count(*)::int as n from public.response_emails where owner_id = $1",
        [owner],
      )
    )[0]!.n;
  const share = (slug: string, visitor: string, name = "Ana") =>
    asService<{ ok: boolean }>(
      "select public.submit_contact_share($1, $2, null, 'ana@example.com', 'Call me', $3) as ok",
      [slug, name, visitor],
    );
  const claim = (slug: string) =>
    asService<{
      id: number;
      kind: string;
      code_name: string;
      owner_id: string;
      to_email: string;
      to_name: string | null;
      details: Record<string, unknown> | null;
    }>("select * from public.claim_response_emails($1)", [slug]);

  beforeAll(async () => {
    await db.query(
      `insert into auth.users (id, email, raw_user_meta_data) values
         ($1, 'kai@example.com', '{"full_name":"Kai"}'), ($2, 'lex@example.com', '{}'),
         ($3, 'moe@example.com', '{}')`,
      [KAI, LEX, MOE],
    );
    await asService(
      "insert into public.team_members (owner_id, member_id, role) values ($1, $2, 'editor')",
      [KAI, LEX],
    );
    // The invite tests above sent invites today; this block starts the site's count afresh.
    await asService("delete from public.invite_sends");
    ids.feedback = await make(asKai, "KAIFB", "feedback", {
      questions: [{ text: "How was it?", style: "stars" }],
    });
    ids.card = await make(asKai, "KAICARD", "vcard", { firstName: "Kai", shareDetails: true });
    ids.event = await make(asKai, "KAIEVT", "event", { title: "Party", rsvp: true });
    ids.moe = await make(asMoe, "MOECARD", "vcard", { firstName: "Moe", shareDetails: true });
    ids.lex = await make(asLex, "LEXFB", "feedback", {});
  });

  it("can be switched on only by the code's maker, through the function", async () => {
    await switchOn(asKai, ids.feedback);
    expect(
      (
        await asKai<{ on: boolean }>(
          "select notify_responses as on from public.qr_codes where id = $1",
          [ids.feedback],
        )
      )[0]?.on,
    ).toBe(true);
    // An editor can change the page, but the emails are the maker's.
    await expect(switchOn(asLex, ids.card)).rejects.toThrow(/maker/);
    await expect(
      asKai("update public.qr_codes set notify_responses = true where id = $1", [ids.card]),
    ).rejects.toThrow(/permission denied/);
    await expect(asAnon("select public.set_response_emails($1, true)", [ids.card])).rejects.toThrow(
      /permission denied/,
    );
    await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [KAI]);
    await expect(switchOn(asKai, ids.card)).rejects.toThrow(/Sign in/);
    await db.query("delete from auth.mfa_factors where user_id = $1", [KAI]);
  });

  it("queue one email per response while the switch is on, and keep the log on the server", async () => {
    // Off: stored, not queued.
    expect((await share("KAICARD", "q-1"))[0]?.ok).toBe(true);
    expect(await queued(KAI)).toBe(0);
    await switchOn(asKai, ids.card);
    await switchOn(asKai, ids.event);
    expect((await share("KAICARD", "q-1", "Ben"))[0]?.ok).toBe(true);
    await asService("select public.submit_rsvp('KAIEVT', 'Cy', 'cy@example.com', 2, 'Vegan', 'q-1')");
    await asService(
      `select public.submit_feedback_answers('KAIFB', '[{"question":"How was it?","style":"stars","value":5}]'::jsonb, 'Lovely', null, 'q-1')`,
    );
    // The older one-rating form queues too.
    await asService("select public.submit_feedback('KAIFB', 4, null, null, 'q-2')");
    expect(
      (
        await asService<{ kind: string; status: string }>(
          "select kind, status from public.response_emails where owner_id = $1 order by id",
          [KAI],
        )
      ).map((r) => `${r.kind}:${r.status}`),
    ).toEqual(["share:pending", "rsvp:pending", "feedback:pending", "feedback:pending"]);
    await expect(asKai("select id from public.response_emails")).rejects.toThrow(
      /permission denied/,
    );
    await expect(asAnon("select * from public.claim_response_emails('KAICARD')")).rejects.toThrow(
      /permission denied/,
    );
    await expect(asKai("select public.finish_response_email(1, true)")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("hand each waiting email out once, to the maker, with what was sent", async () => {
    const [rsvp] = await claim("kaievt");
    expect(rsvp).toMatchObject({
      kind: "rsvp",
      code_name: "KAIEVT page",
      owner_id: KAI,
      to_email: "kai@example.com",
      to_name: "Kai",
      details: { name: "Cy", email: "cy@example.com", guests: 2, note: "Vegan" },
    });
    expect(await claim("KAIEVT")).toEqual([]);
    await asService("select public.finish_response_email($1, true)", [rsvp!.id]);
    const feedback = await claim("KAIFB");
    expect(feedback.map((f) => f.details)).toEqual([
      {
        rating: 5,
        answers: [{ question: "How was it?", style: "stars", value: 5 }],
        comment: "Lovely",
        contact: null,
      },
      { rating: 4, answers: null, comment: null, contact: null },
    ]);
    for (const f of feedback) await asService("select public.finish_response_email($1, false)", [f.id]);
    expect(
      (
        await asService<{ status: string; sent: boolean }>(
          "select status, sent_at is not null as sent from public.response_emails where owner_id = $1 order by id",
          [KAI],
        )
      ).map((r) => `${r.status}:${r.sent}`),
    ).toEqual(["pending:false", "sent:true", "failed:false", "failed:false"]);
    // Switched off before it went: it stays unsent.
    await switchOn(asKai, ids.card, false);
    expect(await claim("KAICARD")).toEqual([]);
    await switchOn(asKai, ids.card);
    // A response deleted before its email went: nothing to say.
    await asService("select public.submit_rsvp('KAIEVT', 'Dee', 'dee@example.com', 1, null, 'q-3')");
    await asKai("delete from public.event_rsvps where email = 'dee@example.com'");
    expect((await claim("KAIEVT"))[0]?.details).toBeNull();
  });

  it("stop at 50 a day per account, and at 250 for the whole site with invites", async () => {
    let visitor = 0;
    while ((await queued(KAI)) < 50) {
      expect((await share("KAICARD", `cap-${visitor++}`))[0]?.ok).toBe(true);
    }
    // Stored, but not emailed.
    expect((await share("KAICARD", `cap-${visitor++}`))[0]?.ok).toBe(true);
    expect(await queued(KAI)).toBe(50);

    await switchOn(asMoe, ids.moe);
    expect((await share("MOECARD", "moe-1"))[0]?.ok).toBe(true);
    expect(await queued(MOE)).toBe(1);
    await asService(
      "insert into public.invite_sends (owner_id) select $1 from generate_series(1, 250)",
      [MOE],
    );
    expect((await share("MOECARD", "moe-2"))[0]?.ok).toBe(true);
    expect(await queued(MOE)).toBe(1);
    await asService("delete from public.invite_sends");
  });

  it("switch off when a code moves to someone else", async () => {
    await switchOn(asLex, ids.lex);
    await asKai("select public.remove_member($1, true)", [LEX]);
    expect(
      (
        await asKai<{ user_id: string; on: boolean }>(
          "select user_id, notify_responses as on from public.qr_codes where id = $1",
          [ids.lex],
        )
      )[0],
    ).toEqual({ user_id: KAI, on: false });
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run supabase/test/migration.test.ts -t "response emails"`
Expected: FAIL. `function public.set_response_emails(...) does not exist`.

- [ ] **Step 3: Write the migration.** Create `supabase/migrations/20261018120000_response_emails.sql`. It must contain no backslashes.

```sql
-- "Email me new responses" (page enhancements 5b, spec item 38). A code's maker can have each new
-- feedback response, set of shared details and RSVP emailed to them through Brevo: at most one
-- email per response and 50 per account per day. Each response is queued here as it's stored, and
-- the app server sends the queue after the visitor has their answer.

-- Only the code's maker turns it on or off, through set_response_emails: it isn't in the columns
-- people can update directly.
alter table public.qr_codes add column notify_responses boolean not null default false;

-- A code that moves to someone else (a teammate removed with "keep their codes") stops emailing:
-- its new owner turns the emails on if they want them.
create function public.reset_response_emails()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    new.notify_responses := false;
  end if;
  return new;
end;
$$;

create trigger qr_codes_reset_response_emails
  before update of user_id on public.qr_codes
  for each row execute function public.reset_response_emails();

-- One row per email: queued, then handed to the server once, then sent or failed.
create table public.response_emails (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  code_id uuid not null references public.qr_codes (id) on delete cascade,
  kind text not null check (kind in ('feedback', 'share', 'rsvp')),
  response_id bigint not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  -- At most one email per response.
  constraint response_emails_once unique (kind, response_id)
);

create index response_emails_owner_time on public.response_emails (owner_id, created_at desc);
create index response_emails_time on public.response_emails (created_at);
create index response_emails_waiting on public.response_emails (code_id) where status = 'pending';

alter table public.response_emails enable row level security;
revoke all on public.response_emails from public, anon, authenticated;
grant select, insert, update, delete on public.response_emails to service_role;

-- Turns "Email me new responses" on or off for one of your own codes.
create function public.set_response_emails(p_code uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Sign in to change emails' using errcode = '42501';
  end if;
  update public.qr_codes set notify_responses = coalesce(p_on, false)
   where id = p_code and user_id = auth.uid();
  if not found then
    raise exception 'Only the code''s maker can change its emails' using errcode = '42501';
  end if;
end;
$$;

-- Queues an email for a new response when its code's maker has the switch on, under the limits:
-- 50 a day per account, and 250 a day for the whole site counting invites, which leaves room in
-- Brevo's 300 a day for sign-up and password emails. Past a limit the response is still stored.
create function public.queue_response_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select c.user_id into v_owner
    from public.qr_codes c
   where c.id = new.code_id and c.notify_responses;
  if v_owner is null then
    return null;
  end if;
  -- One at a time, so two responses can't both slip under a limit.
  perform pg_advisory_xact_lock(hashtextextended('response_emails', 0));
  if (select count(*) from public.response_emails e
       where e.owner_id = v_owner and e.created_at > now() - interval '1 day') >= 50 then
    return null;
  end if;
  if (select count(*) from public.response_emails e where e.created_at > now() - interval '1 day')
     + (select count(*) from public.invite_sends s where s.sent_at > now() - interval '1 day')
     >= 250 then
    return null;
  end if;
  insert into public.response_emails (owner_id, code_id, kind, response_id)
  values (v_owner, new.code_id, tg_argv[0], new.id)
  on conflict (kind, response_id) do nothing;
  return null;
end;
$$;

create trigger feedback_responses_email
  after insert on public.feedback_responses
  for each row execute function public.queue_response_email('feedback');
create trigger contact_shares_email
  after insert on public.contact_shares
  for each row execute function public.queue_response_email('share');
create trigger event_rsvps_email
  after insert on public.event_rsvps
  for each row execute function public.queue_response_email('rsvp');

-- Called by the app server after a response is stored: up to five of the page's waiting emails,
-- each handed out once, with who gets it and what the visitor sent (null when the response has
-- been deleted since). Nothing is handed out while the switch is off.
create function public.claim_response_emails(p_slug text)
returns table (
  id bigint,
  kind text,
  code_id uuid,
  code_name text,
  owner_id uuid,
  to_email text,
  to_name text,
  received_at timestamptz,
  details jsonb
)
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.response_emails e
       set status = 'sending'
     where e.id in (
       select q.id
         from public.response_emails q
         join public.qr_codes c on c.id = q.code_id
        where upper(c.slug) = upper(p_slug)
          and c.notify_responses
          and c.user_id = q.owner_id
          and q.status = 'pending'
          and q.created_at > now() - interval '1 day'
        order by q.id
        limit 5
          for update of q skip locked
     )
    returning e.id, e.kind, e.code_id, e.owner_id, e.response_id, e.created_at
  )
  select cl.id, cl.kind, cl.code_id, c.name, cl.owner_id, u.email::text, p.display_name,
         cl.created_at,
         case cl.kind
           when 'feedback' then (
             select jsonb_build_object('rating', f.rating, 'answers', f.answers,
                                       'comment', f.comment, 'contact', f.contact)
               from public.feedback_responses f where f.id = cl.response_id)
           when 'share' then (
             select jsonb_build_object('name', s.name, 'phone', s.phone,
                                       'email', s.email, 'note', s.note)
               from public.contact_shares s where s.id = cl.response_id)
           when 'rsvp' then (
             select jsonb_build_object('name', r.name, 'email', r.email,
                                       'guests', r.guests, 'note', r.note)
               from public.event_rsvps r where r.id = cl.response_id)
         end
    from claimed cl
    join public.qr_codes c on c.id = cl.code_id
    join auth.users u on u.id = cl.owner_id
    left join public.profiles p on p.id = cl.owner_id
   order by cl.id;
$$;

-- Records whether Brevo took an email the server was handed.
create function public.finish_response_email(p_id bigint, p_sent boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.response_emails
     set status = case when p_sent then 'sent' else 'failed' end,
         sent_at = case when p_sent then now() end
   where id = p_id and status = 'sending';
$$;

revoke all on function public.reset_response_emails() from public, anon, authenticated;
revoke all on function public.queue_response_email() from public, anon, authenticated;
revoke all on function public.set_response_emails(uuid, boolean) from public, anon;
grant execute on function public.set_response_emails(uuid, boolean) to authenticated;
revoke all on function public.claim_response_emails(text) from public, anon, authenticated;
revoke all on function public.finish_response_email(bigint, boolean) from public, anon, authenticated;
grant execute on function public.claim_response_emails(text) to service_role;
grant execute on function public.finish_response_email(bigint, boolean) to service_role;
```

- [ ] **Step 4: Run the tests to see them pass, and check for backslashes.**

Run: `npx vitest run supabase/test/migration.test.ts && ! grep -n '\\' supabase/migrations/20261018120000_response_emails.sql`
Expected: every migration test passes, the earlier ones included, and grep finds no backslash.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20261018120000_response_emails.sql supabase/test/migration.test.ts
git commit -m "Response emails migration: the maker's switch, the email log and its daily limits"
```

---

### Task 2: The email, its off link, and Brevo headers

**Files:**
- Modify: `lib/pages/feedback.ts` (add `answerText`), `lib/pages/feedback.test.ts`
- Create: `emails/response.ts`, `emails/response.test.ts`
- Create: `lib/email/response-links.ts`, `lib/email/response-links.test.ts`
- Modify: `lib/email/brevo.ts` (`OutgoingEmail.headers`), `lib/email/brevo.test.ts`

**Interfaces:**
- Produces:
  - `answerText(answer: FeedbackAnswer): string`. Examples: "4 out of 5 stars", "Good (4 out of 5)", "Thumbs up", "9 out of 10".
  - `type ResponseKind = "feedback" | "share" | "rsvp"`.
  - `responseLines(kind, details): [string, string][]`.
  - `responseEmail(input: ResponseEmailInput): EmailContent`, where the input is `{ kind, codeName, details, receivedAt, codeUrl, offUrl }`.
  - `offToken(secret, codeId, ownerId): string`.
  - `isOffToken(secret, codeId, ownerId, token): boolean`.
  - `offLinks(siteUrl, secret, codeId, ownerId): { page: string; oneClick: string }`.
  - `OutgoingEmail.headers?: Record<string, string>`.

- [ ] **Step 1: Write the failing tests.**

Append to `lib/pages/feedback.test.ts`. Add `answerText` to its import from `./feedback`.

```ts
describe("answerText", () => {
  it("says each answer in words for an email", () => {
    expect(answerText({ question: "Q", style: "stars", value: 4 })).toBe("4 out of 5 stars");
    expect(answerText({ question: "Q", style: "faces", value: 4 })).toBe("Good (4 out of 5)");
    expect(answerText({ question: "Q", style: "thumbs", value: 1 })).toBe("Thumbs up");
    expect(answerText({ question: "Q", style: "thumbs", value: 0 })).toBe("Thumbs down");
    expect(answerText({ question: "Q", style: "scale", value: 9 })).toBe("9 out of 10");
  });
});
```

Create `emails/response.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { responseEmail, responseLines, type ResponseEmailInput } from "./response";

const base: ResponseEmailInput = {
  kind: "rsvp",
  codeName: "Summer party",
  details: { name: "Ana", email: "ana@example.com", guests: 3, note: "Vegan" },
  receivedAt: "2030-01-02T12:30:00Z",
  codeUrl: "https://ziplume.example/codes/c1",
  offUrl: "https://ziplume.example/email/responses-off?c=c1&t=abc",
};

describe("responseEmail", () => {
  it("names only the code in the subject, never what a visitor typed", () => {
    expect(responseEmail(base).subject).toBe("New RSVP for “Summer party”");
    expect(responseEmail({ ...base, kind: "share", details: { name: "Click evil.example" } }).subject).toBe(
      "New shared details on “Summer party”",
    );
    expect(responseEmail({ ...base, kind: "feedback", details: {} }).subject).toBe(
      "New feedback on “Summer party”",
    );
    const odd = responseEmail({ ...base, codeName: `Line one\r\nBcc: x@example.com ${"x".repeat(300)}` });
    expect(odd.subject).not.toMatch(/[\r\n]/);
    expect(odd.subject.length).toBeLessThanOrEqual(200);
    expect(responseEmail({ ...base, codeName: "  " }).subject).toBe("New RSVP for “your code”");
  });

  it("shows what was sent, escaped in the HTML and plain in the text", () => {
    const { html, text } = responseEmail({
      ...base,
      details: { ...base.details, note: '<img src=x onerror="alert(1)">\nSecond line' },
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    for (const part of ["Ana", "ana@example.com", "3", "Jan 2, 2030"]) {
      expect(html).toContain(part);
      expect(text).toContain(part);
    }
    expect(text).toContain('Note: <img src=x onerror="alert(1)">\nSecond line');
  });

  it("links to the code's page and to turning the emails off, in both versions", () => {
    const { html, text } = responseEmail(base);
    expect(html).toContain('href="https://ziplume.example/codes/c1"');
    expect(html).toContain('href="https://ziplume.example/email/responses-off?c=c1&amp;t=abc"');
    expect(text).toContain("See all responses: https://ziplume.example/codes/c1");
    expect(text).toContain("Turn them off: https://ziplume.example/email/responses-off?c=c1&t=abc");
  });
});

describe("responseLines", () => {
  it("lists each kind's details, leaving out what's empty", () => {
    expect(
      responseLines("feedback", {
        rating: 5,
        answers: [
          { question: "Food?", style: "stars", value: 5 },
          { question: "Back?", style: "thumbs", value: 1 },
        ],
        comment: "Lovely",
        contact: null,
      }),
    ).toEqual([
      ["Food?", "5 out of 5 stars"],
      ["Back?", "Thumbs up"],
      ["Comment", "Lovely"],
    ]);
    // From the older one-rating form.
    expect(responseLines("feedback", { rating: 4, answers: null, comment: null })).toEqual([
      ["Rating", "4 out of 5 stars"],
    ]);
    expect(
      responseLines("share", { name: "Ben", phone: "+1 555 0100", email: null, note: " " }),
    ).toEqual([
      ["Name", "Ben"],
      ["Phone", "+1 555 0100"],
    ]);
    expect(responseLines("rsvp", base.details)).toEqual([
      ["Name", "Ana"],
      ["Email", "ana@example.com"],
      ["Guests", "3"],
      ["Note", "Vegan"],
    ]);
  });
});
```

Create `lib/email/response-links.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";

import { isOffToken, offLinks, offToken } from "./response-links";

const CODE = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const OWNER = "33333333-3333-4333-8333-333333333333";

describe("response email off links", () => {
  it("only match the code and maker they were made for", () => {
    const token = offToken("secret", CODE, OWNER);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isOffToken("secret", CODE, OWNER, token)).toBe(true);
    expect(isOffToken("secret", OTHER, OWNER, token)).toBe(false);
    expect(isOffToken("secret", CODE, OTHER, token)).toBe(false);
    expect(isOffToken("another-secret", CODE, OWNER, token)).toBe(false);
    for (const bad of ["", "x", `${token}x`, token.slice(0, -1)]) {
      expect(isOffToken("secret", CODE, OWNER, bad), bad).toBe(false);
    }
  });

  it("point a person at the page and a mail app at the one-click address", () => {
    const token = offToken("secret", CODE, OWNER);
    expect(offLinks("https://ziplume.example", "secret", CODE, OWNER)).toEqual({
      page: `https://ziplume.example/email/responses-off?c=${CODE}&t=${token}`,
      oneClick: `https://ziplume.example/email/responses-off/stop?c=${CODE}&t=${token}`,
    });
  });
});
```

Append to `lib/email/brevo.test.ts` inside its `describe`:

```ts
  it("passes extra headers, such as one-click unsubscribe", async () => {
    const fetcher = ok();
    await sendEmail(
      { ...message, headers: { "List-Unsubscribe": "<https://x.example/off>" } },
      { env: { BREVO_API_KEY: "key-123" }, fetcher },
    );
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body)).headers).toEqual({
      "List-Unsubscribe": "<https://x.example/off>",
    });
  });
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run lib/pages/feedback.test.ts emails/response.test.ts lib/email`
Expected: FAIL. `answerText` isn't exported, `./response` and `./response-links` can't be found, and Brevo's body has no `headers`.

- [ ] **Step 3: Add `answerText`** to `lib/pages/feedback.ts`, after `reviewLabel`:

```ts
const FACE_WORDS = ["Very bad", "Bad", "Okay", "Good", "Excellent"];

/** One answer in words, for an email: "4 out of 5 stars", "Good (4 out of 5)", "Thumbs up". */
export function answerText(answer: FeedbackAnswer): string {
  if (answer.style === "stars") return `${answer.value} out of 5 stars`;
  if (answer.style === "faces") {
    return `${FACE_WORDS[answer.value - 1] ?? answer.value} (${answer.value} out of 5)`;
  }
  if (answer.style === "thumbs") return answer.value ? "Thumbs up" : "Thumbs down";
  return `${answer.value} out of 10`;
}
```

- [ ] **Step 4: Write `emails/response.ts`.**

```ts
import { answerText, type FeedbackAnswer } from "@/lib/pages/feedback";

import { escapeHtml, type EmailContent } from "./invite";
import { emailLayout, paragraph } from "./layout";

export type ResponseKind = "feedback" | "share" | "rsvp";

export interface ResponseEmailInput {
  kind: ResponseKind;
  /** The code's name, as its maker typed it. */
  codeName: string;
  /** What the visitor sent, as the database stored it. */
  details: Record<string, unknown>;
  /** ISO time it arrived. */
  receivedAt: string;
  /** The code's page in the app. */
  codeUrl: string;
  /** The page that turns these emails off. */
  offUrl: string;
}

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();
const str = (value: unknown) => (typeof value === "string" ? value : "");

const SUBJECT: Record<ResponseKind, (name: string) => string> = {
  feedback: (name) => `New feedback on “${name}”`,
  share: (name) => `New shared details on “${name}”`,
  rsvp: (name) => `New RSVP for “${name}”`,
};

const INTRO: Record<ResponseKind, string> = {
  feedback: "Someone left feedback on your page.",
  share: "Someone shared their details from your page.",
  rsvp: "Someone RSVPed to your event.",
};

/** What the visitor sent, as label and value pairs of plain text; empty parts are left out. */
export function responseLines(
  kind: ResponseKind,
  details: Record<string, unknown>,
): [string, string][] {
  const lines: [string, string][] = [];
  const add = (label: string, value: string) => {
    if (value.trim()) lines.push([label, value.trim()]);
  };
  if (kind === "feedback") {
    const answers = Array.isArray(details.answers) ? (details.answers as FeedbackAnswer[]) : [];
    if (answers.length) {
      for (const answer of answers) add(str(answer.question) || "Rating", answerText(answer));
    } else if (typeof details.rating === "number") {
      add("Rating", answerText({ question: "", style: "stars", value: details.rating }));
    }
    add("Comment", str(details.comment));
    add("Contact", str(details.contact));
    return lines;
  }
  add("Name", str(details.name));
  if (kind === "share") add("Phone", str(details.phone));
  add("Email", str(details.email));
  if (kind === "rsvp" && typeof details.guests === "number") add("Guests", String(details.guests));
  add("Note", str(details.note));
  return lines;
}

/** The email that tells a code's maker what a visitor just sent (spec item 38). */
export function responseEmail(input: ResponseEmailInput): EmailContent {
  const e = escapeHtml;
  const name = oneLine(input.codeName).slice(0, 80) || "your code";
  const subject = SUBJECT[input.kind](name).slice(0, 200);
  const lines = responseLines(input.kind, input.details);
  const when = `${new Date(input.receivedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;
  const rows = lines
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;vertical-align:top;font-size:14px;color:#45506a;white-space:nowrap;">${e(label)}</td><td style="padding:6px 0;vertical-align:top;font-size:14px;color:#0a1330;white-space:pre-line;word-break:break-word;">${e(value)}</td></tr>`,
    )
    .join("");
  const html = emailLayout({
    title: e(subject),
    body:
      paragraph(`${INTRO[input.kind]} It arrived ${e(when)}.`) +
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${rows}</table>`,
    button: { label: "See all responses", href: e(input.codeUrl) },
    note: `You get these emails because you turned on “Email me new responses” for this code. <a href="${e(input.offUrl)}" style="color:#0b6e8c;">Turn them off</a>.`,
    siteUrl: new URL(input.codeUrl).origin,
  });
  const text = [
    `${INTRO[input.kind]} It arrived ${when}.`,
    "",
    ...lines.map(([label, value]) => `${label}: ${value}`),
    "",
    `See all responses: ${input.codeUrl}`,
    "",
    `You get these emails because you turned on “Email me new responses” for this code. Turn them off: ${input.offUrl}`,
    "",
    "Ziplume · Make it. Link it. Share it.",
  ].join("\n");
  return { subject, html, text };
}
```

- [ ] **Step 5: Write `lib/email/response-links.ts`.**

```ts
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const purpose = (codeId: string, ownerId: string) => `response-emails-off:${codeId}:${ownerId}`;

/**
 * The signature in a response email's off link (ruling 7): only this server can make one, and
 * only for that code and its maker, so it stops working if the code moves to someone else.
 */
export function offToken(secret: string, codeId: string, ownerId: string): string {
  return createHmac("sha256", secret).update(purpose(codeId, ownerId)).digest("base64url");
}

export function isOffToken(secret: string, codeId: string, ownerId: string, token: string): boolean {
  const expected = Buffer.from(offToken(secret, codeId, ownerId));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** The page a person opens, and the address a mail app posts to for one-click unsubscribe. */
export function offLinks(siteUrl: string, secret: string, codeId: string, ownerId: string) {
  const query = `c=${codeId}&t=${offToken(secret, codeId, ownerId)}`;
  return {
    page: `${siteUrl}/email/responses-off?${query}`,
    oneClick: `${siteUrl}/email/responses-off/stop?${query}`,
  };
}
```

- [ ] **Step 6: Let Brevo take headers.** In `lib/email/brevo.ts`, add this to `OutgoingEmail`:

```ts
  /** Extra mail headers, such as List-Unsubscribe. */
  headers?: Record<string, string>;
```

Then add this to the body object, after the `replyTo` spread:

```ts
        ...(message.headers ? { headers: message.headers } : {}),
```

- [ ] **Step 7: Run the tests.**

Run: `npx vitest run lib/pages/feedback.test.ts emails lib/email`
Expected: all pass, the invite and auth-template tests included.

- [ ] **Step 8: Commit.**

```bash
git add lib/pages/feedback.ts lib/pages/feedback.test.ts emails/response.ts emails/response.test.ts lib/email
git commit -m "The response email, its signed off link, and mail headers through Brevo"
```

---

### Task 3: Sending after each response, and the database types

**Files:**
- Create: `lib/email/response-emails.ts`, `lib/email/response-emails.test.ts`
- Modify: `app/p/[slug]/feedback/route.ts`, `app/p/[slug]/share/route.ts`, `app/p/[slug]/rsvp/route.ts`
- Modify: `app/p/[slug]/feedback/route.test.ts`, `app/p/[slug]/share/route.test.ts`, `app/p/[slug]/rsvp/route.test.ts`
- Modify: `types/supabase.ts`

**Interfaces:**
- Consumes:
  - Task 1's `claim_response_emails` and `finish_response_email`;
  - Task 2's `responseEmail`, `offLinks` and `sendEmail({ headers })`.
- Produces:
  - `sendResponseEmails(admin, slug, { env?, fetcher? }): Promise<number>`, which returns how many were sent;
  - `sendResponseEmailsLater(admin, slug): void`;
  - types for `qr_codes.notify_responses` and the three functions.

- [ ] **Step 1: Write the failing tests.**

Create `lib/email/response-emails.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { sendResponseEmails } from "./response-emails";

const row = {
  id: 7,
  kind: "rsvp",
  code_id: "11111111-1111-4111-8111-111111111111",
  code_name: "Summer party",
  owner_id: "33333333-3333-4333-8333-333333333333",
  to_email: "kai@example.com",
  to_name: "Kai",
  received_at: "2030-01-02T12:30:00Z",
  details: { name: "Ana", email: "ana@example.com", guests: 3, note: null },
};
const env = { BREVO_API_KEY: "key-123", SCAN_HASH_SECRET: "secret" };
const adminWith = (rows: unknown[]) => {
  const rpc = vi.fn(async (name: string, _args: unknown) => ({
    data: name === "claim_response_emails" ? rows : null,
    error: null,
  }));
  return { rpc, admin: { rpc } as never };
};
const brevo = (status: number) => vi.fn<typeof fetch>(async () => new Response("{}", { status }));

describe("sendResponseEmails", () => {
  it("emails each waiting response to the maker, with one-click unsubscribe, and records it", async () => {
    const { admin, rpc } = adminWith([row]);
    const fetcher = brevo(201);
    expect(await sendResponseEmails(admin, "EVT1", { env, fetcher })).toBe(1);
    expect(rpc).toHaveBeenCalledWith("claim_response_emails", { p_slug: "EVT1" });
    const body = JSON.parse(String(fetcher.mock.calls[0]![1]?.body));
    expect(body.to).toEqual([{ email: "kai@example.com" }]);
    expect(body.subject).toBe("New RSVP for “Summer party”");
    expect(body.headers).toEqual({
      "List-Unsubscribe": expect.stringMatching(/^<.+\/email\/responses-off\/stop\?c=1111.+&t=.+>$/),
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(rpc).toHaveBeenCalledWith("finish_response_email", { p_id: 7, p_sent: true });
  });

  it("records a failure when Brevo refuses, or the response is gone, and never throws", async () => {
    const refused = adminWith([row]);
    expect(await sendResponseEmails(refused.admin, "EVT1", { env, fetcher: brevo(500) })).toBe(0);
    expect(refused.rpc).toHaveBeenCalledWith("finish_response_email", { p_id: 7, p_sent: false });

    const gone = adminWith([{ ...row, details: null }]);
    const fetcher = brevo(201);
    expect(await sendResponseEmails(gone.admin, "EVT1", { env, fetcher })).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
    expect(gone.rpc).toHaveBeenCalledWith("finish_response_email", { p_id: 7, p_sent: false });

    const timeout = adminWith([row]);
    const offline = vi.fn<typeof fetch>(async () => {
      throw new Error("timeout");
    });
    expect(await sendResponseEmails(timeout.admin, "EVT1", { env, fetcher: offline })).toBe(0);
  });

  it("does nothing on a server without a Brevo key", async () => {
    const { admin, rpc } = adminWith([row]);
    expect(await sendResponseEmails(admin, "EVT1", { env: { SCAN_HASH_SECRET: "secret" } })).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

In each of the three route tests, mock the sender before the route is imported, and add a test.
- `app/p/[slug]/share/route.test.ts`, after the existing `vi.mock` lines:

```ts
const later = vi.fn();
// Read when called, not when mocked: vi.mock runs before this file's own lines.
vi.mock("@/lib/email/response-emails", () => ({
  sendResponseEmailsLater: (...args: unknown[]) => later(...args),
}));
```

  and inside its `describe`:

```ts
  it("emails the maker after storing the details, and not when nothing was stored", async () => {
    later.mockReset();
    await post({ name: "Ana", email: "ana@example.com" });
    expect(later).toHaveBeenCalledWith(expect.anything(), "CARD1");
    later.mockReset();
    rpc.mockResolvedValue({ data: false, error: null });
    await post({ name: "Ana", email: "ana@example.com" });
    expect(later).not.toHaveBeenCalled();
  });
```

- `app/p/[slug]/rsvp/route.test.ts`: the same `later` mock, and:

```ts
  it("emails the maker about a new RSVP, and not for an email already on the list", async () => {
    later.mockReset();
    await post(ok);
    expect(later).toHaveBeenCalledWith(expect.anything(), "EVT1");
    later.mockReset();
    answers({ submit_rsvp: "already" });
    await post(ok);
    expect(later).not.toHaveBeenCalled();
  });
```

- `app/p/[slug]/feedback/route.test.ts`: the same `later` mock, and:

```ts
  it("emails the maker after storing the answers", async () => {
    later.mockReset();
    await post({ answers: [4, 1] });
    expect(later).toHaveBeenCalledWith(expect.anything(), "FB1");
    later.mockReset();
    rpc.mockResolvedValue({ data: false, error: null });
    await post({ answers: [4, 1] });
    expect(later).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run lib/email/response-emails.test.ts app/p`
Expected: FAIL. `./response-emails` can't be found, and the routes never call `later`.

- [ ] **Step 3: Add the types.** In `types/supabase.ts`:
- **`qr_codes`:**
  - add `notify_responses: boolean;` to `Row`, after `is_private`;
  - add `notify_responses?: boolean;` to `Insert` and `Update`, after their `is_private`.
- **`Functions`**, after `rsvp_guests`:

```ts
      set_response_emails: { Args: { p_code: string; p_on: boolean }; Returns: undefined };
      claim_response_emails: {
        Args: { p_slug: string };
        Returns: {
          id: number;
          /** "feedback", "share" or "rsvp". */
          kind: string;
          code_id: string;
          code_name: string;
          owner_id: string;
          to_email: string;
          to_name: string | null;
          received_at: string;
          /** What the visitor sent; null when the response has been deleted since. */
          details: Json | null;
        }[];
      };
      finish_response_email: { Args: { p_id: number; p_sent: boolean }; Returns: undefined };
```

- [ ] **Step 4: Write `lib/email/response-emails.ts`.**

```ts
import "server-only";

import { after } from "next/server";

import { responseEmail, type ResponseKind } from "@/emails/response";
import { SITE_URL } from "@/lib/env";
import type { getAdminSupabase } from "@/lib/supabase/admin";

import { emailConfigured, sendEmail } from "./brevo";
import { offLinks } from "./response-links";

type Admin = NonNullable<ReturnType<typeof getAdminSupabase>>;
type Env = Record<string, string | undefined>;

/**
 * Emails a page's maker what visitors just sent, when they've turned on "Email me new responses"
 * (spec item 38). The database queued each response and keeps the limits; this takes the page's
 * waiting emails once each and records whether Brevo took them. Never throws.
 */
export async function sendResponseEmails(
  admin: Admin,
  slug: string,
  { env = process.env, fetcher = fetch }: { env?: Env; fetcher?: typeof fetch } = {},
): Promise<number> {
  const secret = env.SCAN_HASH_SECRET;
  if (!emailConfigured(env) || !secret) return 0;
  const { data, error } = await admin.rpc("claim_response_emails", { p_slug: slug });
  if (error || !data) return 0;
  let sent = 0;
  for (const row of data) {
    const details =
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : null;
    let ok = false;
    if (details && row.to_email) {
      const links = offLinks(SITE_URL, secret, row.code_id, row.owner_id);
      const content = responseEmail({
        kind: row.kind as ResponseKind,
        codeName: row.code_name,
        details,
        receivedAt: row.received_at,
        codeUrl: `${SITE_URL}/codes/${row.code_id}`,
        offUrl: links.page,
      });
      const result = await sendEmail(
        {
          to: row.to_email,
          ...content,
          headers: {
            "List-Unsubscribe": `<${links.oneClick}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        },
        { env, fetcher },
      );
      ok = result.ok;
      // The reason (never the key) helps the operator tell a wrong key from a blocked address.
      if (!result.ok) console.warn(`Response email failed: ${result.error}`);
    }
    if (ok) sent += 1;
    await admin.rpc("finish_response_email", { p_id: row.id, p_sent: ok });
  }
  return sent;
}

/** Sends a page's waiting response emails once the visitor has their answer (ruling 8). */
export function sendResponseEmailsLater(admin: Admin, slug: string): void {
  const task = () => sendResponseEmails(admin, slug).then(
    () => undefined,
    () => undefined,
  );
  try {
    after(task);
  } catch {
    // Outside a request (a script): send now, without waiting.
    void task();
  }
}
```

- [ ] **Step 5: Call it from the routes.** Import `sendResponseEmailsLater` from `@/lib/email/response-emails` in each route.
- `app/p/[slug]/feedback/route.ts`: replace the last line, `return data ? json({ ok: true }, 200) : json({ error: "limited" }, 429);`, with:

```ts
  if (!data) return json({ error: "limited" }, 429);
  sendResponseEmailsLater(admin, slug);
  return json({ ok: true }, 200);
```

- `app/p/[slug]/share/route.ts`: replace `return data ? json({ ok: true }, 200) : json({ error: "limited" }, 429);` with:

```ts
  if (!data) return json({ error: "limited" }, 429);
  sendResponseEmailsLater(post.admin, slug);
  return json({ ok: true }, 200);
```

- `app/p/[slug]/rsvp/route.ts`: replace the merged `case "listed":` / `case "already":` block with:

```ts
    case "listed":
      sendResponseEmailsLater(post.admin, slug);
      return json({ ok: true }, 200);
    // The same answer as a new RSVP, so nobody can find out who's coming by trying emails.
    case "already":
      return json({ ok: true }, 200);
```

- [ ] **Step 6: Run the tests and the type check.**

Run: `npx vitest run lib/email app/p && npm run typecheck`
Expected:
- the tests pass;
- the type check names any test fixture that builds a whole `QrCodeRow` (for example `savedRow` in `features/create/fixtures.ts`, or `code()` in `features/codes/list/CodesView.test.tsx`). Add `notify_responses: false` to each one it names, then rerun until it's clean.

- [ ] **Step 7: Commit.**

```bash
git add lib/email "app/p/[slug]" types/supabase.ts features
git commit -m "Send response emails after each stored response, once each, through Brevo"
```

---

### Task 4: The off page and the one-click address

**Files:**
- Modify: `lib/email/response-links.ts` (add `offLinkCode`), `lib/email/response-links.test.ts`
- Create: `app/email/responses-off/page.tsx`, `app/email/responses-off/page.test.tsx`
- Create: `app/email/responses-off/stop/route.ts`, `app/email/responses-off/stop/route.test.ts`

**Interfaces:**
- Consumes: Task 2's `isOffToken` and `offToken`, and Task 3's `qr_codes.notify_responses` type.
- Produces:
  - `offLinkCode(admin, secret, code, token): Promise<{ id: string; name: string; on: boolean; ownerId: string } | null>`;
  - `GET /email/responses-off?c&t`: a page;
  - `POST /email/responses-off/stop?c&t` returns 303 to the page when the form sends `from=page`, 200 for one-click, and 403 for a bad link.

- [ ] **Step 1: Write the failing tests.**

Append to `lib/email/response-links.test.ts` (add `offLinkCode` to the import, and `vi` from vitest):

```ts
describe("offLinkCode", () => {
  const admin = (row: unknown) =>
    ({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      }),
    }) as never;
  const row = { id: CODE, name: "Summer party", user_id: OWNER, notify_responses: true };

  it("finds the code only when the link was signed for it and its maker", async () => {
    const token = offToken("secret", CODE, OWNER);
    expect(await offLinkCode(admin(row), "secret", CODE, token)).toEqual({
      id: CODE,
      name: "Summer party",
      on: true,
      ownerId: OWNER,
    });
    // The code moved to someone else since the email was sent.
    expect(await offLinkCode(admin({ ...row, user_id: OTHER }), "secret", CODE, token)).toBeNull();
    expect(await offLinkCode(admin(row), "secret", CODE, "nope")).toBeNull();
    expect(await offLinkCode(admin(null), "secret", CODE, token)).toBeNull();
    const lookup = vi.fn();
    expect(await offLinkCode({ from: lookup } as never, "secret", "not-a-uuid", token)).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });
});
```

Create `app/email/responses-off/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { offLinkCode } from "@/lib/email/response-links";

import ResponsesOffPage from "./page";

vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => ({}) }));
vi.mock("@/lib/email/response-links", () => ({ offLinkCode: vi.fn() }));

const CODE = "11111111-1111-4111-8111-111111111111";
const open = async (c: string, t: string) => {
  process.env.SCAN_HASH_SECRET = "secret";
  render(await ResponsesOffPage({ searchParams: Promise.resolve({ c, t }) } as never));
};

describe("the response emails off page", () => {
  it("asks before turning the emails off, and opening it changes nothing", async () => {
    vi.mocked(offLinkCode).mockResolvedValue({ id: CODE, name: "Summer party", on: true, ownerId: "o" });
    await open(CODE, "tok");
    expect(screen.getByRole("heading", { name: "Stop emails for “Summer party”?" })).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Turn off emails" });
    expect(button.closest("form")).toHaveAttribute(
      "action",
      `/email/responses-off/stop?c=${CODE}&t=tok`,
    );
    expect(button.closest("form")).toHaveAttribute("method", "post");
  });

  it("says when they're already off, or the link doesn't work", async () => {
    vi.mocked(offLinkCode).mockResolvedValue({ id: CODE, name: "Summer party", on: false, ownerId: "o" });
    await open(CODE, "tok");
    expect(screen.getByRole("heading", { name: "Emails are off" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Turn off emails" })).toBeNull();
  });

  it("says the link doesn't work when it isn't signed for the code", async () => {
    vi.mocked(offLinkCode).mockResolvedValue(null);
    await open(CODE, "bad");
    expect(screen.getByRole("heading", { name: "This link doesn’t work" })).toBeInTheDocument();
  });
});
```

Create `app/email/responses-off/stop/route.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const update = vi.fn();
const lookup = { id: "11111111-1111-4111-8111-111111111111", name: "Summer party", on: true, ownerId: "o1" };
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: () => ({ update: (patch: unknown) => ({ eq: () => ({ eq: async () => update(patch) }) }) }),
  }),
}));
vi.mock("@/lib/email/response-links", () => ({ offLinkCode: vi.fn() }));

import { offLinkCode } from "@/lib/email/response-links";

import { POST } from "./route";

const CODE = lookup.id;
const stop = (body: string) =>
  POST(
    new Request(`https://ziplume.com/email/responses-off/stop?c=${CODE}&t=tok`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }) as never,
  );

describe("POST /email/responses-off/stop", () => {
  beforeEach(() => {
    update.mockReset().mockReturnValue({ error: null });
    process.env.SCAN_HASH_SECRET = "secret";
  });

  it("turns the emails off and goes back to the page, for the page's button", async () => {
    vi.mocked(offLinkCode).mockResolvedValue(lookup);
    const response = await stop("from=page");
    expect(update).toHaveBeenCalledWith({ notify_responses: false });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toMatch(
      new RegExp(`/email/responses-off\\?c=${CODE}&t=tok$`),
    );
  });

  it("turns them off for a mail app's one-click unsubscribe", async () => {
    vi.mocked(offLinkCode).mockResolvedValue(lookup);
    const response = await stop("List-Unsubscribe=One-Click");
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ notify_responses: false });
  });

  it("changes nothing for a link that isn't signed for the code", async () => {
    vi.mocked(offLinkCode).mockResolvedValue(null);
    expect((await stop("from=page")).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run lib/email/response-links.test.ts app/email`
Expected: FAIL. `offLinkCode` isn't exported, and `./page` and `./route` can't be found.

- [ ] **Step 3: Add `offLinkCode`** to `lib/email/response-links.ts`:

```ts
import type { getAdminSupabase } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof getAdminSupabase>>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The code an off link is for, when it was signed for that code and its current maker. */
export async function offLinkCode(
  admin: Admin,
  secret: string,
  code: string,
  token: string,
): Promise<{ id: string; name: string; on: boolean; ownerId: string } | null> {
  if (!UUID.test(code) || !token) return null;
  const { data } = await admin
    .from("qr_codes")
    .select("id, name, user_id, notify_responses")
    .eq("id", code)
    .maybeSingle();
  if (!data || !isOffToken(secret, data.id, data.user_id, token)) return null;
  return { id: data.id, name: data.name, on: data.notify_responses, ownerId: data.user_id };
}
```

- [ ] **Step 4: Write the page,** `app/email/responses-off/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { offLinkCode } from "@/lib/email/response-links";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Response emails", robots: { index: false } };

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <main className="grid flex-1 place-items-center px-4 py-10">
        <div className="flex max-w-md flex-col gap-4 rounded-[1.5rem] border border-border bg-surface p-8 text-center shadow-card">
          <h1 className="font-display text-xl font-bold [overflow-wrap:anywhere] text-fg">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * The page a response email's off link opens (spec item 38, ruling 6). Opening it changes nothing,
 * because mail scanners open links; the button does it.
 */
export default async function ResponsesOffPage({
  searchParams,
}: PageProps<"/email/responses-off">) {
  const { c, t } = await searchParams;
  const code = typeof c === "string" ? c : "";
  const token = typeof t === "string" ? t : "";
  const admin = getAdminSupabase();
  const secret = process.env.SCAN_HASH_SECRET;
  const found = admin && secret ? await offLinkCode(admin, secret, code, token) : null;

  if (!found) {
    return (
      <Card title="This link doesn’t work">
        <p className="text-fg-muted">
          It may be from an older email. You can turn response emails off on the code’s page in
          Ziplume.
        </p>
      </Card>
    );
  }
  if (!found.on) {
    return (
      <Card title="Emails are off">
        <p className="text-fg-muted">
          You won’t get emails about new responses to “{found.name}”. To turn them back on, open
          the code in Ziplume.
        </p>
        <Link href={`/codes/${found.id}`} className={buttonClasses("outline")}>
          Open the code
        </Link>
      </Card>
    );
  }
  return (
    <Card title={`Stop emails for “${found.name}”?`}>
      <p className="text-fg-muted">
        You won’t be emailed when visitors send feedback, details or RSVPs from this code’s page.
        They’ll still appear on the code’s page.
      </p>
      <form
        method="post"
        action={`/email/responses-off/stop?c=${found.id}&t=${encodeURIComponent(token)}`}
      >
        <input type="hidden" name="from" value="page" />
        <button type="submit" className={buttonClasses("primary")}>
          Turn off emails
        </button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 5: Write the route,** `app/email/responses-off/stop/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";

import { offLinkCode } from "@/lib/email/response-links";
import { SITE_URL } from "@/lib/env";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const reply = (body: string, status: number) =>
  new NextResponse(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });

/**
 * Turns off "Email me new responses" for one code: from the off page's button, or straight from a
 * mail app's one-click unsubscribe (RFC 8058), which posts here with no session. The signed link
 * is the permission.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("c") ?? "";
  const token = url.searchParams.get("t") ?? "";
  const admin = getAdminSupabase();
  const secret = process.env.SCAN_HASH_SECRET;
  if (!admin || !secret) return reply("Email settings can’t be changed right now.", 503);
  const found = await offLinkCode(admin, secret, code, token);
  if (!found) return reply("This link doesn’t work.", 403);
  const { error } = await admin
    .from("qr_codes")
    .update({ notify_responses: false })
    .eq("id", found.id)
    .eq("user_id", found.ownerId);
  if (error) return reply("Email settings can’t be changed right now.", 503);
  const form = await request.formData().catch(() => null);
  if (form?.get("from") === "page") {
    return NextResponse.redirect(
      `${SITE_URL}/email/responses-off?c=${found.id}&t=${encodeURIComponent(token)}`,
      303,
    );
  }
  return reply("Emails about new responses are off.", 200);
}
```

- [ ] **Step 6: Run the tests and the type check.**

Run: `npx vitest run lib/email app/email && npm run typecheck`
Expected: all pass, and the type check is clean.

- [ ] **Step 7: Commit.**

```bash
git add lib/email app/email
git commit -m "The response emails off page, and one-click unsubscribe"
```

---

### Task 5: The switch on the code page

**Files:**
- Create: `features/dashboard/ResponseEmails.tsx`, `features/dashboard/ResponseEmails.test.tsx`
- Modify: `features/dashboard/CodeOverview.tsx` (new optional prop `emailReady`), `features/dashboard/CodeOverview.test.tsx`
- Modify: `app/(app)/codes/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 1's `set_response_emails`, and Task 3's `notify_responses` type.
- Produces:
  - `ResponseEmails({ codeId, initial, emailReady })`;
  - `takesResponses(type: string, content: unknown, on: boolean): boolean`.

- [ ] **Step 1: Write the failing tests.**

Create `features/dashboard/ResponseEmails.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { ResponseEmails, takesResponses } from "./ResponseEmails";

const rpc = vi.fn(
  async (_name: string, _args: unknown): Promise<{ data: null; error: { message: string } | null }> => ({
    data: null,
    error: null,
  }),
);
vi.mock("@/lib/supabase/client", () => ({ getBrowserSupabase: () => ({ rpc }) }));

const CODE = "11111111-1111-4111-8111-111111111111";
const show = (initial = false, emailReady = true) =>
  render(
    <ToastProvider>
      <ResponseEmails codeId={CODE} initial={initial} emailReady={emailReady} />
    </ToastProvider>,
  );

describe("ResponseEmails", () => {
  it("switches the maker's emails on and off", async () => {
    const user = userEvent.setup();
    show();
    const toggle = screen.getByRole("switch", { name: "Email me new responses" });
    await user.click(toggle);
    expect(rpc).toHaveBeenLastCalledWith("set_response_emails", { p_code: CODE, p_on: true });
    expect(toggle).toBeChecked();
    expect(screen.getByText(/up to 50 a day/)).toBeInTheDocument();
  });

  it("goes back when the change doesn't save", async () => {
    const user = userEvent.setup();
    rpc.mockResolvedValueOnce({ data: null, error: { message: "no" } });
    show(true);
    const toggle = screen.getByRole("switch", { name: "Email me new responses" });
    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(await screen.findByText("Emails couldn’t be changed. Please try again.")).toBeInTheDocument();
  });

  it("says so when this server can't send email", () => {
    show(false, false);
    expect(screen.getByText(/Email isn’t set up on this server/)).toBeInTheDocument();
  });
});

describe("takesResponses", () => {
  it("is for feedback, and for Contact and Event pages that take responses", () => {
    expect(takesResponses("feedback", {}, false)).toBe(true);
    expect(takesResponses("vcard", { shareDetails: true }, false)).toBe(true);
    expect(takesResponses("vcard", {}, false)).toBe(false);
    expect(takesResponses("event", { rsvp: true }, false)).toBe(true);
    expect(takesResponses("event", {}, false)).toBe(false);
    expect(takesResponses("coupon", { markUsed: true }, false)).toBe(false);
    // Already on: shown, so it can be turned off.
    expect(takesResponses("vcard", {}, true)).toBe(true);
  });
});
```

Append to `features/dashboard/CodeOverview.test.tsx`. It uses the file's `renderOverview` helper and the shared `savedRow` fixture from `@/features/create/fixtures`.

```tsx
describe("Email me new responses", () => {
  it("shows the switch to the maker of a feedback page, and not to a teammate or on a menu", () => {
    const feedback = savedRow({ qr_type: "feedback", is_dynamic: true, content: {} });
    const { unmount } = renderOverview(feedback);
    expect(screen.getByRole("switch", { name: "Email me new responses" })).toBeInTheDocument();
    unmount();
    const teammate = renderOverview(feedback, true, true);
    expect(screen.queryByRole("switch", { name: "Email me new responses" })).toBeNull();
    teammate.unmount();
    renderOverview(savedRow({ qr_type: "menu", is_dynamic: true, content: {} }));
    expect(screen.queryByRole("switch", { name: "Email me new responses" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail.**

Run: `npx vitest run features/dashboard`
Expected: FAIL. `./ResponseEmails` can't be found, and the overview has no switch.

- [ ] **Step 3: Write `features/dashboard/ResponseEmails.tsx`.**

```tsx
"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { sanitizePage } from "@/lib/pages/sanitize";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Pages whose visitors send something back: feedback, shared details and RSVPs (ruling 10). */
export function takesResponses(type: string, content: unknown, on: boolean): boolean {
  if (on || type === "feedback") return true;
  if (type === "vcard") return sanitizePage("vcard", content).shareDetails;
  if (type === "event") return sanitizePage("event", content).rsvp;
  return false;
}

/** "Email me new responses" (spec item 38), for the code's maker only (ruling 1). */
export function ResponseEmails({
  codeId,
  initial,
  emailReady,
}: {
  codeId: string;
  initial: boolean;
  /** This server has a Brevo key; without one the switch saves, but nothing is sent. */
  emailReady: boolean;
}) {
  const toast = useToast();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function change(next: boolean) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setOn(next);
    const { error } = await supabase.rpc("set_response_emails", { p_code: codeId, p_on: next });
    setBusy(false);
    if (error) {
      setOn(!next);
      toast("Emails couldn’t be changed. Please try again.", "error");
    }
  }

  return (
    <Card>
      <div className="px-5 py-4 sm:px-6">
        <Toggle
          label="Email me new responses"
          description={
            emailReady
              ? "One email per response, up to 50 a day. Each email has a link to turn them off."
              : "Email isn’t set up on this server, so nothing will be sent for now."
          }
          checked={on}
          onChange={(next) => void change(next)}
          disabled={busy}
        />
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Put it on the code page.**
- **`features/dashboard/CodeOverview.tsx`:**
  1. Import `ResponseEmails` and `takesResponses`.
  2. Add `emailReady = false` to the destructured props, with this type field:

```ts
  /** This server can send email (BREVO_API_KEY is set). */
  emailReady?: boolean;
```

  3. Right before `{code.qr_type === "feedback" && (`, add:

```tsx
          {!fromTeammate && takesResponses(code.qr_type, code.content, code.notify_responses) && (
            <ResponseEmails
              codeId={code.id}
              initial={code.notify_responses}
              emailReady={emailReady}
            />
          )}
```

- **`app/(app)/codes/[id]/page.tsx`:** import `emailConfigured` from `@/lib/email/brevo`, and pass `emailReady={emailConfigured()}` to `CodeOverview`.

- [ ] **Step 5: Run the tests, lint and the type check.**

Run: `npx vitest run features/dashboard && npm run lint && npm run typecheck`
Expected: all pass, and lint and the type check are clean.

- [ ] **Step 6: Commit.**

```bash
git add features/dashboard "app/(app)/codes/[id]/page.tsx"
git commit -m "Email me new responses: the maker's switch on the code page"
```

---

### Task 6: Browser test, the privacy page, and ship Release 5b

**Files:**
- Create: `e2e/accounts/response-emails.spec.ts`
- Modify: `app/(docs)/privacy/page.tsx`

- [ ] **Step 1: Write the browser test.** Create `e2e/accounts/response-emails.spec.ts`:

```ts
import { createHmac } from "node:crypto";

import { expect, test } from "@playwright/test";

import { MAKER, seed } from "./fixtures";

// The test server's own secret (scripts/accounts-e2e.mjs), so the test can sign an off link.
const SECRET = "accounts-e2e-only-scan-hash-secret-0123456789";
const offLink = (code: string, owner: string) =>
  `email/responses-off?c=${code}&t=${createHmac("sha256", SECRET)
    .update(`response-emails-off:${code}:${owner}`)
    .digest("base64url")}`;

// The switch is shared state, so a retry would start from a different place.
test.describe.configure({ retries: 0 });

test.describe("Email me new responses", () => {
  test.use({ storageState: MAKER.state });

  test("the maker switches it on, and an email's off link turns it off", async ({
    page,
    browser,
  }) => {
    const { makerFeedbackId, makerId } = seed();
    await page.goto(`codes/${makerFeedbackId}`);
    const toggle = page.getByRole("switch", { name: "Email me new responses" });
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked();
    await page.reload();
    await expect(page.getByRole("switch", { name: "Email me new responses" })).toBeChecked();

    // Signed out, as from the email.
    const context = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const visitor = await context.newPage();
    await visitor.goto(offLink(makerFeedbackId, makerId));
    await expect(
      visitor.getByRole("heading", { name: "Stop emails for “Maker feedback”?" }),
    ).toBeVisible();
    await visitor.getByRole("button", { name: "Turn off emails" }).click();
    await expect(visitor.getByRole("heading", { name: "Emails are off" })).toBeVisible();
    await visitor.goto(offLink(makerFeedbackId, "00000000-0000-4000-8000-000000000000"));
    await expect(visitor.getByRole("heading", { name: "This link doesn’t work" })).toBeVisible();
    await context.close();

    await page.reload();
    await expect(page.getByRole("switch", { name: "Email me new responses" })).not.toBeChecked();
  });
});
```

- [ ] **Step 2: Run the signed-in browser tests.** Apply the migration locally first.

Run: `npx --yes supabase@2.120.0 migration up --local && npm run test:e2e:accounts`
Expected: every test passes, the new spec included. Nothing is emailed, because the local server has no `BREVO_API_KEY`.

- [ ] **Step 3: Update the privacy page.** In `app/(docs)/privacy/page.tsx`:
- In "What visitors send", after the sentence ending "except on codes the owner keeps private.", add: "If the page's owner turns on “Email me new responses”, Ziplume also emails them what was sent, through Brevo."
- Change the Brevo bullet under "Who processes data" to: "Brevo sends account emails such as confirmations and password resets, team invites, and emails about new responses."

Then rebuild plain and run the signed-out browser tests:

Run: `npm run build && npm run test:e2e`
Expected: all PASS.

Commit:

```bash
git add e2e/accounts/response-emails.spec.ts "app/(docs)/privacy/page.tsx"
git commit -m "Browser test for Email me new responses, and the privacy page"
```

- [ ] **Step 4: Run the full local check.**

Run: `npx prettier --check . --ignore-path .gitignore --ignore-path .prettierignore --ignore-path .git/info/exclude && npm run lint && npm run typecheck && npm test`
Expected: all PASS.

- [ ] **Step 5: Run the final whole-branch review,** with this plan's Review Focus and the ledger's rulings. Then do one fix pass.

- [ ] **Step 6: Apply the migration to the live database before merging** (ruling 12). This uses the scratchpad's `srv.sh` and `bridge_read.py` (project `db12f7ce-3e77-4461-a686-c8cd6de6f764`). Nothing else on the server changes.
1. **Disk:** run `srv.sh 'df -h /'`. There must be room for a backup: 3 GiB plus headroom.
2. **Backup:** read `/var/lib/techitdave-offserver/health.json`. The latest verified archive must be from the last 24 hours. If it isn't:
   - run `srv.sh 'systemctl start --no-block techitdave-supabase-backup.service'`;
   - re-read `health.json` until a new archive is verified;
   - then run `techitdave-offserver retain`.
3. **Apply:** send the migration file through `bridge_read.py` as one `begin; … commit;` batch, using Python's `subprocess`. Then send `notify pgrst, 'reload schema'`, and check the `quickqreate-1791927515091-rest` log for the reload.
4. **Verify** through the bridge:
   - `notify_responses` exists on `qr_codes` with default `false`, and every row is false;
   - `response_emails` has RLS on, and `has_table_privilege('authenticated', 'public.response_emails', 'select')` is false;
   - the four triggers exist: `qr_codes_reset_response_emails`, `feedback_responses_email`, `contact_shares_email` and `event_rsvps_email`;
   - `set_response_emails`: `authenticated` execute is true, `anon` false;
   - `claim_response_emails` and `finish_response_email`: `service_role` true, `authenticated` and `anon` false;
   - `select count(*) from public.response_emails` is 0;
   - the feedback, shared details and RSVP counts are unchanged.
5. **Record it in the runbook** `~/.codex/memories/supabase-coolify.md`: disk, backup, time applied, what changed, the checks, and the rollback. The rollback is:

```sql
drop trigger feedback_responses_email on public.feedback_responses;
drop trigger contact_shares_email on public.contact_shares;
drop trigger event_rsvps_email on public.event_rsvps;
drop trigger qr_codes_reset_response_emails on public.qr_codes;
drop function public.queue_response_email();
drop function public.reset_response_emails();
drop function public.claim_response_emails(text);
drop function public.finish_response_email(bigint, boolean);
drop function public.set_response_emails(uuid, boolean);
drop table public.response_emails;
alter table public.qr_codes drop column notify_responses;
```

- [ ] **Step 7: Push, open the PR, wait for CI, and merge.**

```bash
git push -u origin feat/page-enhancements-r5b
gh pr create --base main --head feat/page-enhancements-r5b --title "Page enhancements 5b: Email me new responses" --body "<item 38, the migration (applied live before merge), rulings, and test counts>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
gh pr merge --merge
```

- [ ] **Step 8: Check the live site.**
1. Wait for the version in `https://ziplume.com/sw.js` to change.
2. Find client chunks containing "Email me new responses".
3. Check that `https://ziplume.com/email/responses-off` returns 200 and says "This link doesn’t work".
4. Check that a POST to `https://ziplume.com/email/responses-off/stop` with no link returns 403.
5. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307.
6. Switch on nothing in David's account, send no responses to his pages, and send no emails.
