-- Power tools: folders, active dates, password-protected codes, team members and personal
-- API keys.
--
-- Teams: every account is a workspace. Its owner can invite people as viewers (read codes,
-- scans and feedback) or editors (also create, change and delete codes and folders). Access
-- checks go through can_view()/can_edit(), which every policy below uses.

begin;

-- ---------------------------------------------------------------------------
-- Team membership and the access helpers
-- ---------------------------------------------------------------------------

create table public.team_members (
  owner_id uuid not null references auth.users (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  primary key (owner_id, member_id),
  check (owner_id <> member_id)
);

create index team_members_member on public.team_members (member_id);

create function public.can_view(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner = auth.uid()
      or exists (
        select 1 from public.team_members m
         where m.owner_id = p_owner and m.member_id = auth.uid()
      );
$$;

create function public.can_edit(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner = auth.uid()
      or exists (
        select 1 from public.team_members m
         where m.owner_id = p_owner and m.member_id = auth.uid() and m.role = 'editor'
      );
$$;

revoke all on function public.can_view(uuid), public.can_edit(uuid) from public, anon;
grant execute on function public.can_view(uuid), public.can_edit(uuid) to authenticated, service_role;

alter table public.team_members enable row level security;

create policy "Owners and members can see a membership"
  on public.team_members for select to authenticated
  using (owner_id = (select auth.uid()) or member_id = (select auth.uid()));

create policy "Owners can change roles"
  on public.team_members for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners can remove members and members can leave"
  on public.team_members for delete to authenticated
  using (owner_id = (select auth.uid()) or member_id = (select auth.uid()));

create policy "Two-factor accounts need a two-factor session"
  on public.team_members as restrictive for all to authenticated
  using ((select public.mfa_satisfied()))
  with check ((select public.mfa_satisfied()));

revoke all on public.team_members from public, anon, authenticated;
grant select, delete on public.team_members to authenticated;
grant update (role) on public.team_members to authenticated;
grant select, insert, update, delete on public.team_members to service_role;

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null check (role in ('viewer', 'editor')),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);

create index team_invites_owner on public.team_invites (owner_id, created_at desc);

alter table public.team_invites enable row level security;

create policy "Owners manage their invites"
  on public.team_invites for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Two-factor accounts need a two-factor session"
  on public.team_invites as restrictive for all to authenticated
  using ((select public.mfa_satisfied()))
  with check ((select public.mfa_satisfied()));

revoke all on public.team_invites from public, anon, authenticated;
grant select, delete on public.team_invites to authenticated;
grant insert (email, role) on public.team_invites to authenticated;
grant select, insert, update, delete on public.team_invites to service_role;

-- What an invite link shows before it's accepted: who invited you, and as what.
create function public.invite_details(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'owner_email', u.email,
    'owner_name', p.display_name,
    'email', i.email,
    'role', i.role,
    'valid', i.accepted_at is null and i.expires_at > now()
  )
    from public.team_invites i
    join auth.users u on u.id = i.owner_id
    left join public.profiles p on p.id = i.owner_id
   where i.token = p_token;
$$;

-- Joins the inviting workspace. The invite must be unused, unexpired and addressed to the
-- signed-in user's (verified) email address.
create function public.accept_invite(p_token text)
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
  if v_invite.id is null or v_invite.accepted_at is not null or v_invite.expires_at <= now() then
    raise exception 'This invite is no longer valid' using errcode = '22023';
  end if;
  if lower(v_invite.email) <> v_email then
    raise exception 'This invite is for a different email address' using errcode = '42501';
  end if;
  if v_invite.owner_id = auth.uid() then
    raise exception 'You can''t join your own workspace' using errcode = '22023';
  end if;
  insert into public.team_members (owner_id, member_id, role)
  values (v_invite.owner_id, auth.uid(), v_invite.role)
  on conflict (owner_id, member_id) do update set role = excluded.role;
  update public.team_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;
  return v_invite.owner_id;
end;
$$;

-- Workspaces the caller belongs to, with the owner's name for the workspace switcher.
create function public.my_workspaces()
returns table (owner_id uuid, owner_email text, owner_name text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.owner_id, u.email::text, p.display_name, m.role
    from public.team_members m
    join auth.users u on u.id = m.owner_id
    left join public.profiles p on p.id = m.owner_id
   where m.member_id = auth.uid()
   order by coalesce(p.display_name, u.email::text);
$$;

-- The owner's view of their team.
create function public.team_overview()
returns table (member_id uuid, email text, name text, role text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.member_id, u.email::text, p.display_name, m.role, m.created_at
    from public.team_members m
    join auth.users u on u.id = m.member_id
    left join public.profiles p on p.id = m.member_id
   where m.owner_id = auth.uid()
   order by m.created_at;
$$;

revoke all on function public.invite_details(text), public.accept_invite(text), public.my_workspaces(), public.team_overview()
  from public, anon;
grant execute on function public.invite_details(text), public.accept_invite(text), public.my_workspaces(), public.team_overview()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Folders
-- ---------------------------------------------------------------------------

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index folders_user_name on public.folders (user_id, lower(btrim(name)));

create trigger folders_touch_updated_at
  before update on public.folders
  for each row execute function public.touch_updated_at();

alter table public.folders enable row level security;

create policy "Team members can see folders"
  on public.folders for select to authenticated
  using (public.can_view(user_id));

create policy "Editors can create folders"
  on public.folders for insert to authenticated
  with check (public.can_edit(user_id));

create policy "Editors can rename folders"
  on public.folders for update to authenticated
  using (public.can_edit(user_id))
  with check (public.can_edit(user_id));

create policy "Editors can delete folders"
  on public.folders for delete to authenticated
  using (public.can_edit(user_id));

create policy "Two-factor accounts need a two-factor session"
  on public.folders as restrictive for all to authenticated
  using ((select public.mfa_satisfied()))
  with check ((select public.mfa_satisfied()));

revoke all on public.folders from public, anon, authenticated;
grant select, delete on public.folders to authenticated;
grant insert (name, user_id) on public.folders to authenticated;
grant update (name) on public.folders to authenticated;
grant select, insert, update, delete on public.folders to service_role;

-- ---------------------------------------------------------------------------
-- qr_codes: folders, active dates, passwords and team access
-- ---------------------------------------------------------------------------

alter table public.qr_codes
  add column folder_id uuid,
  add column active_from timestamptz,
  add column active_until timestamptz,
  add column has_password boolean not null default false;

-- A code can only be filed in a folder of the same workspace; deleting the folder unfiles it.
alter table public.qr_codes add constraint qr_codes_folder_fkey
  foreign key (folder_id, user_id) references public.folders (id, user_id) on delete set null (folder_id);

alter table public.qr_codes add constraint qr_codes_active_window
  check (active_from is null or active_until is null or active_until > active_from);

create index qr_codes_folder on public.qr_codes (folder_id) where folder_id is not null;

drop policy "Users can read their own codes" on public.qr_codes;
drop policy "Users can create their own codes" on public.qr_codes;
drop policy "Users can update their own codes" on public.qr_codes;
drop policy "Users can delete their own codes" on public.qr_codes;

create policy "Team members can read codes"
  on public.qr_codes for select to authenticated
  using (public.can_view(user_id));

create policy "Editors can create codes"
  on public.qr_codes for insert to authenticated
  with check (public.can_edit(user_id));

create policy "Editors can update codes"
  on public.qr_codes for update to authenticated
  using (public.can_edit(user_id))
  with check (public.can_edit(user_id));

create policy "Editors can delete codes"
  on public.qr_codes for delete to authenticated
  using (public.can_edit(user_id));

-- Editors create codes in the owner's workspace, so user_id is now insertable (the policy
-- above only accepts workspaces the caller can edit). It still can't be changed later.
revoke insert, update on public.qr_codes from authenticated;
grant insert (user_id, name, qr_type, content, design, is_dynamic, slug, destination, status, folder_id, active_from, active_until)
  on public.qr_codes to authenticated;
grant update (name, qr_type, content, design, slug, destination, status, folder_id, active_from, active_until)
  on public.qr_codes to authenticated;

drop policy "Users can read scans of their own codes" on public.scan_events;
create policy "Team members can read scans"
  on public.scan_events for select to authenticated
  using (code_id in (select c.id from public.qr_codes c where public.can_view(c.user_id)));

drop policy "Users can read feedback for their own codes" on public.feedback_responses;
drop policy "Users can delete feedback for their own codes" on public.feedback_responses;
create policy "Team members can read feedback"
  on public.feedback_responses for select to authenticated
  using (code_id in (select c.id from public.qr_codes c where public.can_view(c.user_id)));
create policy "Editors can delete feedback"
  on public.feedback_responses for delete to authenticated
  using (code_id in (select c.id from public.qr_codes c where public.can_edit(c.user_id)));

-- Password hashes live apart from qr_codes, readable only through the functions below.
create table public.code_secrets (
  code_id uuid primary key references public.qr_codes (id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.code_secrets enable row level security;
revoke all on public.code_secrets from public, anon, authenticated;
grant select, insert, update, delete on public.code_secrets to service_role;

-- Sets (or with an empty password, removes) a dynamic code's password. Hashed with bcrypt.
create function public.set_code_password(p_code uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.mfa_satisfied() or not exists (
    select 1 from public.qr_codes c where c.id = p_code and c.is_dynamic and public.can_edit(c.user_id)
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

revoke all on function public.set_code_password(uuid, text) from public, anon;
grant execute on function public.set_code_password(uuid, text) to authenticated;

-- Used by the app server (which rate-limits attempts) to unlock a protected code.
create function public.check_code_password(p_slug text, p_password text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select s.password_hash = extensions.crypt(p_password, s.password_hash)
      from public.qr_codes c
      join public.code_secrets s on s.code_id = c.id
     where c.is_dynamic and upper(c.slug) = upper(p_slug)
  ), false);
$$;

revoke all on function public.check_code_password(text, text) from public, anon, authenticated;
grant execute on function public.check_code_password(text, text) to service_role;

-- The state a scanner sees: paused, not active yet, ended, or active.
create function public.code_state(p_status text, p_from timestamptz, p_until timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_status = 'paused' then 'paused'
    when p_from is not null and now() < p_from then 'scheduled'
    when p_until is not null and now() >= p_until then 'expired'
    else 'active'
  end;
$$;

grant execute on function public.code_state(text, timestamptz, timestamptz) to anon, authenticated, service_role;

drop function public.record_scan(text, text, text, text, text, text, text, text, boolean);

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
returns table (destination text, status text, qr_type text, content jsonb, protected boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code public.qr_codes;
  v_state text;
  v_country text := upper(left(p_country, 2));
begin
  select * into v_code
    from public.qr_codes c
   where c.is_dynamic and upper(c.slug) = upper(p_slug);

  if v_code.id is null then
    return;
  end if;

  v_state := public.code_state(v_code.status, v_code.active_from, v_code.active_until);

  if v_state = 'active' and p_record then
    insert into public.scan_events (code_id, visitor_hash, country, region, city, device_type, os, browser)
    values (
      v_code.id,
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
     where id = v_code.id;
  end if;

  destination := v_code.destination;
  status := v_state;
  qr_type := v_code.qr_type;
  content := v_code.content;
  protected := v_code.has_password;
  return next;
end;
$$;

revoke all on function public.record_scan(text, text, text, text, text, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.record_scan(text, text, text, text, text, text, text, text, boolean)
  to service_role;

-- Public pages: password-protected ones reveal nothing but the fact that they're protected.
create or replace function public.public_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', c.slug,
    'qr_type', c.qr_type,
    'status', public.code_state(c.status, c.active_from, c.active_until),
    'protected', c.has_password,
    -- Content is withheld when a password is set or the page isn't open right now.
    'content', case
      when c.has_password or public.code_state(c.status, c.active_from, c.active_until) <> 'active'
        then '{}'::jsonb
      else c.content
    end,
    'updated_at', c.updated_at
  )
    from public.qr_codes c
   where c.is_dynamic
     and upper(c.slug) = upper(p_slug)
     and c.qr_type in ('links', 'vcard', 'business', 'menu', 'coupon', 'event', 'feedback', 'pdf', 'images', 'video', 'audio', 'app');
$$;

-- The full page, for the app server once a visitor has entered the password.
create function public.protected_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', c.slug,
    'qr_type', c.qr_type,
    'status', public.code_state(c.status, c.active_from, c.active_until),
    'protected', c.has_password,
    'content', c.content,
    'updated_at', c.updated_at
  )
    from public.qr_codes c
   where c.is_dynamic
     and upper(c.slug) = upper(p_slug)
     and c.qr_type in ('links', 'vcard', 'business', 'menu', 'coupon', 'event', 'feedback', 'pdf', 'images', 'video', 'audio', 'app');
$$;

revoke all on function public.protected_page(text) from public, anon, authenticated;
grant execute on function public.protected_page(text) to service_role;

create or replace function public.submit_feedback(
  p_slug text,
  p_rating int,
  p_comment text,
  p_contact text,
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
begin
  select c.id into v_id
    from public.qr_codes c
   where c.is_dynamic and c.qr_type = 'feedback'
     and public.code_state(c.status, c.active_from, c.active_until) = 'active'
     and upper(c.slug) = upper(p_slug);
  if v_id is null or p_rating is null or p_rating not between 1 and 5 then
    return false;
  end if;

  select count(*) into v_recent
    from public.feedback_responses r
   where r.code_id = v_id
     and r.visitor_hash = p_visitor_hash
     and r.created_at > now() - interval '1 day';
  if v_recent >= 3 then
    return false;
  end if;

  insert into public.feedback_responses (code_id, rating, comment, contact, visitor_hash)
  values (
    v_id,
    p_rating,
    nullif(left(btrim(p_comment), 2000), ''),
    nullif(left(btrim(p_contact), 200), ''),
    left(coalesce(nullif(p_visitor_hash, ''), 'unknown'), 128)
  );
  return true;
end;
$$;

-- Team editors can upload page media into the workspace owner's folder.
drop policy "Owners can add page media to their folder" on storage.objects;
drop policy "Owners can see their page media" on storage.objects;
drop policy "Owners can replace their page media" on storage.objects;
drop policy "Owners can delete their page media" on storage.objects;

create function public.can_edit_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and public.can_edit(p_folder::uuid);
$$;

revoke all on function public.can_edit_folder(text) from public, anon;
grant execute on function public.can_edit_folder(text) to authenticated;

create policy "Editors can add page media to the workspace folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'page-media' and public.can_edit_folder((storage.foldername(name))[1]));

create policy "Editors can see page media in the workspace folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'page-media' and public.can_edit_folder((storage.foldername(name))[1]));

create policy "Editors can replace page media in the workspace folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'page-media' and public.can_edit_folder((storage.foldername(name))[1]))
  with check (bucket_id = 'page-media' and public.can_edit_folder((storage.foldername(name))[1]));

create policy "Editors can delete page media in the workspace folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'page-media' and public.can_edit_folder((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------------
-- Personal API keys
-- ---------------------------------------------------------------------------

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index api_keys_user on public.api_keys (user_id, created_at desc);

alter table public.api_keys enable row level security;

create policy "Users can see their API keys"
  on public.api_keys for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can revoke their API keys"
  on public.api_keys for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Two-factor accounts need a two-factor session"
  on public.api_keys as restrictive for all to authenticated
  using ((select public.mfa_satisfied()));

revoke all on public.api_keys from public, anon, authenticated;
-- The hash is never readable by users; it's only compared by api_key_user().
grant select (id, user_id, name, prefix, created_at, last_used_at) on public.api_keys to authenticated;
grant delete on public.api_keys to authenticated;
grant select, insert, update, delete on public.api_keys to service_role;

-- Creates a key and returns it once; only its SHA-256 hash is stored.
create function public.create_api_key(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := 'qq_' || encode(extensions.gen_random_bytes(24), 'hex');
  v_id uuid;
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if (select count(*) from public.api_keys where user_id = auth.uid()) >= 10 then
    raise exception 'You can have up to 10 API keys' using errcode = '22023';
  end if;
  insert into public.api_keys (user_id, name, prefix, key_hash)
  values (auth.uid(), left(btrim(coalesce(p_name, '')), 60), left(v_key, 10), encode(extensions.digest(v_key, 'sha256'), 'hex'))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'key', v_key, 'prefix', left(v_key, 10));
end;
$$;

revoke all on function public.create_api_key(text) from public, anon;
grant execute on function public.create_api_key(text) to authenticated;

-- Resolves a key to its owner for the app's /api/v1 routes; records when it was last used.
create function public.api_key_user(p_key text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_user uuid;
  v_used timestamptz;
begin
  select k.id, k.user_id, k.last_used_at into v_id, v_user, v_used
    from public.api_keys k
   where k.key_hash = encode(extensions.digest(coalesce(p_key, ''), 'sha256'), 'hex');
  if v_id is null then
    return null;
  end if;
  if v_used is null or v_used < now() - interval '1 minute' then
    update public.api_keys set last_used_at = now() where id = v_id;
  end if;
  return v_user;
end;
$$;

revoke all on function public.api_key_user(text) from public, anon, authenticated;
grant execute on function public.api_key_user(text) to service_role;

-- ---------------------------------------------------------------------------
-- Public API data access. The app's /api/v1 routes authenticate the key with
-- api_key_user(), validate input, then call these with the key owner's id. Each one only
-- touches that user's own codes.
-- ---------------------------------------------------------------------------

create function public.api_code_json(c public.qr_codes, p_full boolean default false)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'type', c.qr_type,
    'dynamic', c.is_dynamic,
    'slug', c.slug,
    'destination', c.destination,
    'status', c.status,
    'state', public.code_state(c.status, c.active_from, c.active_until),
    'folder_id', c.folder_id,
    'active_from', c.active_from,
    'active_until', c.active_until,
    'password_protected', c.has_password,
    'scan_count', c.scan_count,
    'last_scanned_at', c.last_scanned_at,
    'created_at', c.created_at,
    'updated_at', c.updated_at,
    'content', c.content
  ) || case when p_full then jsonb_build_object('design', c.design) else '{}'::jsonb end;
$$;

create function public.api_codes(p_user uuid, p_limit int, p_offset int)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.api_code_json(c) order by c.created_at desc), '[]'::jsonb)
    from (
      select * from public.qr_codes
       where user_id = p_user
       order by created_at desc
       limit least(greatest(coalesce(p_limit, 50), 1), 200)
      offset greatest(coalesce(p_offset, 0), 0)
    ) c;
$$;

create function public.api_code(p_user uuid, p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.api_code_json(c, true) from public.qr_codes c where c.id = p_id and c.user_id = p_user;
$$;

create function public.api_create_code(p_user uuid, p_code jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.qr_codes;
  v_dynamic boolean := coalesce((p_code ->> 'dynamic')::boolean, false);
  v_slug text := nullif(p_code ->> 'slug', '');
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_bytes bytea;
begin
  for attempt in 1..8 loop
    if v_dynamic and nullif(p_code ->> 'slug', '') is null then
      v_bytes := extensions.gen_random_bytes(6);
      v_slug := '';
      for i in 0..5 loop
        v_slug := v_slug || substr(v_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
      end loop;
    end if;
    begin
      insert into public.qr_codes (
        user_id, name, qr_type, content, design, is_dynamic, slug, destination, status,
        folder_id, active_from, active_until
      )
      values (
        p_user,
        p_code ->> 'name',
        p_code ->> 'type',
        coalesce(p_code -> 'content', '{}'::jsonb),
        coalesce(p_code -> 'design', '{}'::jsonb),
        v_dynamic,
        case when v_dynamic then v_slug end,
        nullif(p_code ->> 'destination', ''),
        coalesce(nullif(p_code ->> 'status', ''), 'active'),
        nullif(p_code ->> 'folder_id', '')::uuid,
        nullif(p_code ->> 'active_from', '')::timestamptz,
        nullif(p_code ->> 'active_until', '')::timestamptz
      )
      returning * into v_row;
      return public.api_code_json(v_row, true);
    exception when unique_violation then
      -- A random ending collided; a chosen one is simply taken.
      if nullif(p_code ->> 'slug', '') is not null then
        raise;
      end if;
    end;
  end loop;
  raise exception 'Could not pick a unique link ending' using errcode = '23505';
end;
$$;

create function public.api_update_code(p_user uuid, p_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.qr_codes;
begin
  update public.qr_codes c set
    name = case when p_patch ? 'name' then p_patch ->> 'name' else c.name end,
    content = case when p_patch ? 'content' then p_patch -> 'content' else c.content end,
    design = case when p_patch ? 'design' then p_patch -> 'design' else c.design end,
    destination = case when p_patch ? 'destination' then nullif(p_patch ->> 'destination', '') else c.destination end,
    slug = case when p_patch ? 'slug' and c.is_dynamic then p_patch ->> 'slug' else c.slug end,
    status = case when p_patch ? 'status' then p_patch ->> 'status' else c.status end,
    folder_id = case when p_patch ? 'folder_id' then nullif(p_patch ->> 'folder_id', '')::uuid else c.folder_id end,
    active_from = case when p_patch ? 'active_from' then nullif(p_patch ->> 'active_from', '')::timestamptz else c.active_from end,
    active_until = case when p_patch ? 'active_until' then nullif(p_patch ->> 'active_until', '')::timestamptz else c.active_until end
  where c.id = p_id and c.user_id = p_user
  returning * into v_row;
  if v_row.id is null then
    return null;
  end if;
  return public.api_code_json(v_row, true);
end;
$$;

create function public.api_delete_code(p_user uuid, p_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.qr_codes where id = p_id and user_id = p_user returning id
  )
  select exists (select 1 from deleted);
$$;

create function public.api_code_analytics(p_user uuid, p_id uuid, p_from timestamptz, p_to timestamptz, p_tz text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.qr_codes where id = p_id and user_id = p_user) then
    return null;
  end if;
  return public.code_analytics(p_id, p_from, p_to, p_tz);
end;
$$;

revoke all on function
  public.api_codes(uuid, int, int),
  public.api_code(uuid, uuid),
  public.api_create_code(uuid, jsonb),
  public.api_update_code(uuid, uuid, jsonb),
  public.api_delete_code(uuid, uuid),
  public.api_code_analytics(uuid, uuid, timestamptz, timestamptz, text)
  from public, anon, authenticated;
grant execute on function
  public.api_codes(uuid, int, int),
  public.api_code(uuid, uuid),
  public.api_create_code(uuid, jsonb),
  public.api_update_code(uuid, uuid, jsonb),
  public.api_delete_code(uuid, uuid),
  public.api_code_analytics(uuid, uuid, timestamptz, timestamptz, text)
  to service_role;
revoke all on function public.api_code_json(public.qr_codes, boolean) from public, anon, authenticated;

commit;
