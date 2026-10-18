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
