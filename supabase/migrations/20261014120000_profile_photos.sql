-- Profile photos: each profile can have a photo, shown in the account menu, team lists and
-- invite emails. It starts as the Google account photo (when there is one) and can be replaced
-- with an upload (see the avatar storage migration) or removed.

begin;

alter table public.profiles
  add column avatar_url text
    check (avatar_url is null or (avatar_url like 'https://%' and char_length(avatar_url) <= 2048));

grant update (avatar_url) on public.profiles to authenticated;

-- New accounts take their photo from sign-up metadata (Google sends avatar_url and picture).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_photo text;
begin
  v_photo := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture');
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    case when v_photo like 'https://%' and char_length(v_photo) <= 2048 then v_photo end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Accounts made before photos existed get their Google photo now.
update public.profiles p
   set avatar_url = m.photo
  from (
    select u.id,
           coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') as photo
      from auth.users u
  ) m
 where m.id = p.id
   and p.avatar_url is null
   and m.photo like 'https://%'
   and char_length(m.photo) <= 2048;

-- Team lists and invite links show photos. The return types change, so these two functions are
-- dropped and created again, with the same grants.
drop function public.my_workspaces();

create function public.my_workspaces()
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
   order by coalesce(p.display_name, u.email::text);
$$;

drop function public.team_overview();

create function public.team_overview()
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
   order by m.created_at;
$$;

revoke all on function public.my_workspaces(), public.team_overview() from public, anon;
grant execute on function public.my_workspaces(), public.team_overview() to authenticated;

create or replace function public.invite_details(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'owner_email', u.email,
    'owner_name', p.display_name,
    'owner_avatar_url', p.avatar_url,
    'email', i.email,
    'role', i.role,
    'valid', i.accepted_at is null and i.expires_at > now()
  )
    from public.team_invites i
    join auth.users u on u.id = i.owner_id
    left join public.profiles p on p.id = i.owner_id
   where i.token = p_token;
$$;

commit;
