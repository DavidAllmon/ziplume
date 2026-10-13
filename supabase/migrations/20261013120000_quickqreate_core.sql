-- QuickQReate core schema: profiles, saved QR codes, scan events and analytics.
--
-- Apply once to the QuickQReate project (SQL editor or psql). Everything lives in the
-- public schema except one trigger on auth.users that creates a profile row on sign-up.
--
-- Access model
--   * anon: no table access at all.
--   * authenticated: full control of their own codes, read-only access to scans of their
--     own codes, read/update their own profile. Enforced by grants AND row-level security.
--   * service_role (server only): records scans through record_scan(), which is the only
--     way rows enter scan_events.

begin;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Creates the profile when GoTrue inserts a user. The display name comes from user metadata
-- (for example Google's full_name); it is display-only and never used for authorization.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Saved QR codes
-- ---------------------------------------------------------------------------

create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  qr_type text not null check (qr_type in ('url', 'text', 'wifi', 'contact', 'email', 'phone', 'sms')),
  -- Form values and design settings as the generator stores them.
  content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(content) = 'object' and pg_column_size(content) <= 16384),
  design jsonb not null default '{}'::jsonb
    check (jsonb_typeof(design) = 'object' and pg_column_size(design) <= 262144),
  -- Dynamic codes encode <site>/r/<slug> and redirect to destination, which can change later.
  is_dynamic boolean not null default false,
  slug text check (slug ~ '^[A-Za-z0-9-]{3,40}$'),
  destination text check (destination is null or (char_length(destination) <= 4096 and destination ~* '^https?://')),
  status text not null default 'active' check (status in ('active', 'paused')),
  scan_count bigint not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_codes_dynamic_fields check (
    (is_dynamic and slug is not null and destination is not null)
    or (not is_dynamic and slug is null and destination is null)
  )
);

-- Slugs are matched case-insensitively so codes can be encoded in uppercase, which lets the
-- QR use its compact alphanumeric mode.
create unique index qr_codes_slug_key on public.qr_codes (upper(slug)) where slug is not null;
create index qr_codes_user_created on public.qr_codes (user_id, created_at desc);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public, anon, authenticated;

create trigger qr_codes_touch_updated_at
  before update on public.qr_codes
  for each row execute function public.touch_updated_at();

alter table public.qr_codes enable row level security;

create policy "Users can read their own codes"
  on public.qr_codes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own codes"
  on public.qr_codes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own codes"
  on public.qr_codes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own codes"
  on public.qr_codes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Scan events
-- ---------------------------------------------------------------------------

create table public.scan_events (
  id bigint generated always as identity primary key,
  code_id uuid not null references public.qr_codes (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  -- Daily-salted hash of IP + user agent: counts unique visitors without storing either.
  visitor_hash text not null check (char_length(visitor_hash) <= 128),
  country text check (country is null or country ~ '^[A-Z0-9]{2}$'),
  region text check (region is null or char_length(region) <= 100),
  city text check (city is null or char_length(city) <= 100),
  device_type text not null default 'other' check (device_type in ('mobile', 'tablet', 'desktop', 'other')),
  os text check (os is null or char_length(os) <= 40),
  browser text check (browser is null or char_length(browser) <= 40)
);

create index scan_events_code_time on public.scan_events (code_id, scanned_at desc);

alter table public.scan_events enable row level security;

create policy "Users can read scans of their own codes"
  on public.scan_events for select to authenticated
  using (code_id in (select id from public.qr_codes where user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Two-factor authentication: once an account has a verified factor, its rows are reachable
-- only from sessions that completed the second step (aal2), so a password alone can't read
-- or change them through the API.
-- ---------------------------------------------------------------------------

create function public.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1
          from auth.mfa_factors f
         where f.user_id = auth.uid()
           and f.status = 'verified'
      );
$$;

revoke all on function public.mfa_satisfied() from public, anon;
grant execute on function public.mfa_satisfied() to authenticated;

create policy "Two-factor accounts need a two-factor session"
  on public.profiles as restrictive for all to authenticated
  using ((select public.mfa_satisfied()))
  with check ((select public.mfa_satisfied()));

create policy "Two-factor accounts need a two-factor session"
  on public.qr_codes as restrictive for all to authenticated
  using ((select public.mfa_satisfied()))
  with check ((select public.mfa_satisfied()));

create policy "Two-factor accounts need a two-factor session"
  on public.scan_events as restrictive for all to authenticated
  using ((select public.mfa_satisfied()));

-- ---------------------------------------------------------------------------
-- Grants: start from nothing, then allow exactly what the app uses.
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.qr_codes, public.scan_events from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

grant select, delete on public.qr_codes to authenticated;
grant insert (name, qr_type, content, design, is_dynamic, slug, destination, status)
  on public.qr_codes to authenticated;
-- is_dynamic, user_id and the scan counters cannot be changed by users.
grant update (name, qr_type, content, design, slug, destination, status)
  on public.qr_codes to authenticated;

grant select on public.scan_events to authenticated;

grant select, insert, update, delete on public.profiles, public.qr_codes, public.scan_events to service_role;

-- ---------------------------------------------------------------------------
-- record_scan: called by the app's /r/<slug> route with the service role.
-- Returns the destination and status; records a scan only for active codes, and only when
-- p_record is true (the app passes false for link previewers and bots).
-- ---------------------------------------------------------------------------

create function public.record_scan(
  p_slug text,
  p_visitor_hash text,
  p_country text default null,
  p_region text default null,
  p_city text default null,
  p_device_type text default null,
  p_os text default null,
  p_browser text default null,
  p_record boolean default true
)
returns table (destination text, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_destination text;
  v_status text;
  v_country text := upper(left(p_country, 2));
begin
  select c.id, c.destination, c.status
    into v_id, v_destination, v_status
    from public.qr_codes c
   where c.is_dynamic and upper(c.slug) = upper(p_slug);

  if v_id is null then
    return;
  end if;

  if v_status = 'active' and p_record then
    insert into public.scan_events (code_id, visitor_hash, country, region, city, device_type, os, browser)
    values (
      v_id,
      left(coalesce(nullif(p_visitor_hash, ''), 'unknown'), 128),
      case when v_country ~ '^[A-Z0-9]{2}$' and v_country <> 'XX' then v_country end,
      nullif(left(p_region, 100), ''),
      nullif(left(p_city, 100), ''),
      case when p_device_type in ('mobile', 'tablet', 'desktop') then p_device_type else 'other' end,
      nullif(left(p_os, 40), ''),
      nullif(left(p_browser, 40), '')
    );

    update public.qr_codes
       set scan_count = scan_count + 1,
           last_scanned_at = now()
     where id = v_id;
  end if;

  destination := v_destination;
  status := v_status;
  return next;
end;
$$;

revoke all on function public.record_scan(text, text, text, text, text, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.record_scan(text, text, text, text, text, text, text, text, boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- code_analytics: one round trip for the analytics page. Runs as the caller, so
-- row-level security limits it to the caller's own codes.
-- ---------------------------------------------------------------------------

create function public.code_analytics(
  p_code uuid,
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
  with ev as (
    select *
      from public.scan_events
     where code_id = p_code
       and scanned_at >= p_from
       and scanned_at < p_to
  ),
  daily as (
    select (scanned_at at time zone p_tz)::date as day,
           count(*) as scans,
           count(distinct visitor_hash) as visitors
      from ev
     group by 1
  ),
  hours as (
    select extract(hour from scanned_at at time zone p_tz)::int as hour, count(*) as scans
      from ev
     group by 1
  )
  select jsonb_build_object(
    'total', (select count(*) from ev),
    'unique', (select count(distinct visitor_hash) from ev),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'scans', scans, 'unique', visitors) order by day) from daily), '[]'::jsonb),
    'hours', coalesce((select jsonb_agg(jsonb_build_object('hour', hour, 'scans', scans) order by hour) from hours), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'scans', scans) order by scans desc, label)
                             from (select coalesce(country, '??') as label, count(*) as scans from ev group by 1 order by 2 desc, 1 limit 50) t), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'country', country, 'scans', scans) order by scans desc, label)
                          from (select city as label, country, count(*) as scans from ev where city is not null group by 1, 2 order by 3 desc, 1 limit 50) t), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'scans', scans) order by scans desc, label)
                           from (select device_type as label, count(*) as scans from ev group by 1) t), '[]'::jsonb),
    'os', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'scans', scans) order by scans desc, label)
                      from (select coalesce(os, 'Unknown') as label, count(*) as scans from ev group by 1 order by 2 desc limit 20) t), '[]'::jsonb),
    'browsers', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'scans', scans) order by scans desc, label)
                            from (select coalesce(browser, 'Unknown') as label, count(*) as scans from ev group by 1 order by 2 desc limit 20) t), '[]'::jsonb)
  );
$$;

revoke all on function public.code_analytics(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.code_analytics(uuid, timestamptz, timestamptz, text) to authenticated;

commit;
