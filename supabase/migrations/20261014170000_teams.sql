-- Teams, Phase 3 (spec: docs/superpowers/specs/2026-10-14-quickqreate-teams-design.md).
--
-- A team is its owner (the person who invited) plus members; each person is in at most one
-- team. Everyone owns what they make. Teammates see each other's codes both ways, except
-- private ones; the owner and editors may change teammates' codes, viewers only their own.
-- New codes and folders only ever go in your own space. Leaving ends the sharing both ways;
-- removing someone can move their shared codes to the owner (remove_member).
--
-- my_workspaces() and team_overview() stay unchanged so the app deployed before this
-- migration keeps working until the new one is live; a later phase drops them.

begin;

-- The live data must fit "one team per person" (checked when this was written: it does).
do $$
begin
  if exists (select 1 from public.team_members group by member_id having count(*) > 1) then
    raise exception 'Someone is in more than one team; resolve it before applying this migration';
  end if;
  if exists (
    select 1 from public.team_members m
     where exists (select 1 from public.team_members o where o.owner_id = m.member_id)
  ) then
    raise exception 'Someone both owns a team and belongs to another; resolve it first';
  end if;
end;
$$;

alter table public.team_members add constraint team_members_one_team unique (member_id);

-- The owner of the team p_user is in: themselves when they have members, their team's owner
-- when they are a member, null when they're on their own.
create function public.team_owner(p_user uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select m.owner_id from public.team_members m where m.member_id = p_user),
    (select p_user where exists (select 1 from public.team_members m where m.owner_id = p_user))
  );
$$;

revoke all on function public.team_owner(uuid) from public, anon;
grant execute on function public.team_owner(uuid) to authenticated, service_role;

-- Seeing someone's codes: your own, or a teammate's.
create or replace function public.can_view(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner = auth.uid()
      or (public.team_owner(auth.uid()) is not null
          and public.team_owner(auth.uid()) = public.team_owner(p_owner));
$$;

-- Changing someone's codes and folders: your own, or a teammate's when you're the team's owner
-- or an editor.
create or replace function public.can_edit(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner = auth.uid()
      or (public.team_owner(auth.uid()) is not null
          and public.team_owner(auth.uid()) = public.team_owner(p_owner)
          and (public.team_owner(auth.uid()) = auth.uid()
               or exists (
                 select 1 from public.team_members m
                  where m.member_id = auth.uid() and m.role = 'editor'
               )));
$$;

-- Private codes: only their maker sees or changes them, whatever the team.
alter table public.qr_codes add column is_private boolean not null default false;

drop policy "Team members can read codes" on public.qr_codes;
drop policy "Editors can create codes" on public.qr_codes;
drop policy "Editors can update codes" on public.qr_codes;
drop policy "Editors can delete codes" on public.qr_codes;

create policy "Teammates can read shared codes"
  on public.qr_codes for select to authenticated
  using (user_id = (select auth.uid()) or (not is_private and public.can_view(user_id)));

create policy "People create codes in their own space"
  on public.qr_codes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Owners and editors can change teammates' shared codes"
  on public.qr_codes for update to authenticated
  using (user_id = (select auth.uid()) or (not is_private and public.can_edit(user_id)))
  with check (user_id = (select auth.uid()) or (not is_private and public.can_edit(user_id)));

create policy "Owners and editors can delete teammates' shared codes"
  on public.qr_codes for delete to authenticated
  using (user_id = (select auth.uid()) or (not is_private and public.can_edit(user_id)));

revoke insert, update on public.qr_codes from authenticated;
grant insert (user_id, name, qr_type, content, design, is_dynamic, slug, destination, status, folder_id, active_from, active_until, is_private)
  on public.qr_codes to authenticated;
grant update (name, qr_type, content, design, slug, destination, status, folder_id, active_from, active_until, is_private)
  on public.qr_codes to authenticated;

drop policy "Editors can create folders" on public.folders;
create policy "People create folders in their own space"
  on public.folders for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy "Team members can read scans" on public.scan_events;
create policy "Teammates can read scans of shared codes"
  on public.scan_events for select to authenticated
  using (code_id in (
    select c.id from public.qr_codes c
     where c.user_id = (select auth.uid()) or (not c.is_private and public.can_view(c.user_id))
  ));

drop policy "Team members can read feedback" on public.feedback_responses;
drop policy "Editors can delete feedback" on public.feedback_responses;
create policy "Teammates can read feedback on shared codes"
  on public.feedback_responses for select to authenticated
  using (code_id in (
    select c.id from public.qr_codes c
     where c.user_id = (select auth.uid()) or (not c.is_private and public.can_view(c.user_id))
  ));
create policy "Owners and editors can delete feedback on shared codes"
  on public.feedback_responses for delete to authenticated
  using (code_id in (
    select c.id from public.qr_codes c
     where c.user_id = (select auth.uid()) or (not c.is_private and public.can_edit(c.user_id))
  ));

create or replace function public.recent_scan_counts(p_owner uuid, p_days int default 30)
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
     and (c.user_id = auth.uid() or not c.is_private)
     and public.mfa_satisfied()
     and e.scanned_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
   group by e.code_id;
$$;

create or replace function public.set_code_password(p_code uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.mfa_satisfied() or not exists (
    select 1 from public.qr_codes c
     where c.id = p_code and c.is_dynamic and public.can_edit(c.user_id)
       and (c.user_id = auth.uid() or not c.is_private)
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if coalesce(p_password, '') = '' then
    delete from public.code_secrets where code_id = p_code;
    update public.qr_codes set has_password = false where id = p_code;
    return;
  end if;

  if char_length(p_password) < 4 or char_length(p_password) > 128 then
    raise exception 'Passwords are 4 to 128 characters' using errcode = '22023';
  end if;

  insert into public.code_secrets (code_id, password_hash)
  values (p_code, extensions.crypt(p_password, extensions.gen_salt('bf', 10)))
  on conflict (code_id) do update set password_hash = excluded.password_hash, updated_at = now();
  update public.qr_codes set has_password = true where id = p_code;
end;
$$;

-- Members can't invite people: only someone on their own or a team's owner starts invites.
create policy "Team members can't invite people"
  on public.team_invites as restrictive for insert to authenticated
  with check (not exists (select 1 from public.team_members m where m.member_id = (select auth.uid())));

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.team_invites;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Sign in to accept this invite' using errcode = '42501';
  end if;
  select * into v_invite from public.team_invites where token = p_token for update;
  if v_invite.id is null or v_invite.accepted_at is not null or v_invite.expires_at <= now()
     or exists (select 1 from public.team_members where member_id = v_invite.owner_id) then
    raise exception 'This invite is no longer valid' using errcode = '22023';
  end if;
  if lower(v_invite.email) <> v_email then
    raise exception 'This invite is for a different email address' using errcode = '42501';
  end if;
  if v_invite.owner_id = auth.uid() then
    raise exception 'You can''t join your own workspace' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.team_members where member_id = auth.uid() and owner_id <> v_invite.owner_id
  ) then
    raise exception 'You''re already in another team' using errcode = '22023';
  end if;
  if exists (select 1 from public.team_members where owner_id = auth.uid()) then
    raise exception 'You have your own team' using errcode = '22023';
  end if;
  insert into public.team_members (owner_id, member_id, role)
  values (v_invite.owner_id, auth.uid(), v_invite.role)
  on conflict (owner_id, member_id) do update set role = excluded.role;
  update public.team_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;
  return v_invite.owner_id;
end;
$$;

-- Everyone in the caller's team, owner first; nothing for someone on their own.
create function public.my_team()
returns table (user_id uuid, email text, name text, avatar_url text, role text, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with team as (select public.team_owner(auth.uid()) as owner_id)
  select u.id, u.email::text, p.display_name, p.avatar_url,
         case when u.id = t.owner_id then 'owner' else m.role end,
         u.id = auth.uid()
    from team t
    join auth.users u
      on u.id = t.owner_id
      or u.id in (select x.member_id from public.team_members x where x.owner_id = t.owner_id)
    left join public.team_members m on m.member_id = u.id
    left join public.profiles p on p.id = u.id
   where t.owner_id is not null and public.mfa_satisfied()
   order by (u.id = t.owner_id) desc, coalesce(p.display_name, u.email::text);
$$;

revoke all on function public.my_team() from public, anon;
grant execute on function public.my_team() to authenticated;

-- Removes a member. With p_keep_codes their shared codes and their folders move to the owner
-- (printed codes keep their short links, scans and feedback); their private codes stay theirs
-- and come out of any folder that moves. All or nothing.
create function public.remove_member(p_member uuid, p_keep_codes boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_label text;
  v_files jsonb;
  v_codes int := 0;
  v_folders int := 0;
begin
  if v_owner is null or not public.mfa_satisfied() or not exists (
    select 1 from public.team_members where owner_id = v_owner and member_id = p_member
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if p_keep_codes then
    select left(coalesce(nullif(btrim(p.display_name), ''), split_part(u.email, '@', 1)), 20)
      into v_label
      from auth.users u left join public.profiles p on p.id = u.id
     where u.id = p_member;
    select coalesce(jsonb_object_agg(id::text, folder_id::text), '{}'::jsonb) into v_files
      from public.qr_codes
     where user_id = p_member and not is_private and folder_id is not null;
    -- A code and its folder always share an owner, so every code comes out of its folder
    -- while the folders change hands; shared ones go back in below.
    update public.qr_codes set folder_id = null where user_id = p_member and folder_id is not null;
    update public.folders f
       set user_id = v_owner,
           name = case
             when exists (
               select 1 from public.folders o
                where o.user_id = v_owner and lower(btrim(o.name)) = lower(btrim(f.name))
             ) then left(btrim(f.name), 37) || ' (' || v_label || ')'
             else f.name
           end
     where f.user_id = p_member;
    get diagnostics v_folders = row_count;
    update public.qr_codes set user_id = v_owner where user_id = p_member and not is_private;
    get diagnostics v_codes = row_count;
    update public.qr_codes c
       set folder_id = (v_files ->> c.id::text)::uuid
     where c.user_id = v_owner and c.id::text in (select jsonb_object_keys(v_files));
  end if;

  delete from public.team_members where owner_id = v_owner and member_id = p_member;
  return jsonb_build_object('codes', v_codes, 'folders', v_folders);
end;
$$;

revoke all on function public.remove_member(uuid, boolean) from public, anon;
grant execute on function public.remove_member(uuid, boolean) to authenticated;

commit;
