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
