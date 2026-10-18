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
-- may share 50 times per page per day: people on one venue's Wi-Fi often share a visitor hash.
-- Returns whether the details were stored.
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
  if v_recent >= 50 then
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
-- email is on the list), 'full' (fewer places left than guests), 'limited' (50 a day from one
-- visitor, since people on one venue's Wi-Fi often share a hash), 'invalid' (a missing name, a bad
-- email, or guests outside 1 to 10) or 'closed' (not an open event taking RSVPs).
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

  select count(*) into v_recent
    from public.event_rsvps r
   where r.code_id = v_id
     and r.visitor_hash = p_visitor_hash
     and r.created_at > now() - interval '1 day';
  if v_recent >= 50 then
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

  -- Checked last, so an email on the list gets the answer a new one would: nobody can find out
  -- who's coming by trying addresses.
  if exists (
    select 1 from public.event_rsvps r
     where r.code_id = v_id and lower(r.email) = lower(v_email)
  ) then
    return 'already';
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
