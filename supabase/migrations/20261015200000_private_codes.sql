-- Private codes from the editor (Phase 3b of the teams spec): create_code and update_code take
-- is_private, so marking a code Private saves in the same step as the rest of it.
--
-- Both still run as the caller (security invoker), so the teams rules hold: only the maker sees
-- or changes a private code, and a teammate who may edit a code can't make it private (the
-- update's check fails, because a private code must be the caller's own).
create or replace function public.create_code(p_code jsonb, p_password text default null)
returns public.qr_codes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.qr_codes;
begin
  insert into public.qr_codes (
    user_id, name, qr_type, content, design, is_dynamic, destination, slug,
    folder_id, active_from, active_until, is_private
  )
  values (
    coalesce(nullif(p_code ->> 'user_id', '')::uuid, auth.uid()),
    p_code ->> 'name',
    p_code ->> 'qr_type',
    coalesce(p_code -> 'content', '{}'::jsonb),
    coalesce(p_code -> 'design', '{}'::jsonb),
    coalesce((p_code ->> 'is_dynamic')::boolean, false),
    nullif(p_code ->> 'destination', ''),
    nullif(p_code ->> 'slug', ''),
    nullif(p_code ->> 'folder_id', '')::uuid,
    nullif(p_code ->> 'active_from', '')::timestamptz,
    nullif(p_code ->> 'active_until', '')::timestamptz,
    coalesce((p_code ->> 'is_private')::boolean, false)
  )
  returning * into v_row;

  if coalesce(p_password, '') <> '' then
    perform public.set_code_password(v_row.id, p_password);
    select * into v_row from public.qr_codes where id = v_row.id;
  end if;
  return v_row;
end;
$$;

revoke all on function public.create_code(jsonb, text) from public, anon;
grant execute on function public.create_code(jsonb, text) to authenticated;

create or replace function public.update_code(
  p_id uuid,
  p_patch jsonb,
  p_password text default null,
  p_password_action text default 'keep'
)
returns public.qr_codes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_unknown text;
  v_row public.qr_codes;
begin
  select key into v_unknown
    from jsonb_object_keys(v_patch) as key
   where key not in (
     'name', 'content', 'design', 'destination', 'slug', 'folder_id', 'active_from',
     'active_until', 'is_private'
   )
   limit 1;
  if v_unknown is not null then
    raise exception 'Unknown field: %', v_unknown using errcode = '22023';
  end if;
  if p_password_action is null or p_password_action not in ('keep', 'set', 'clear') then
    raise exception 'Unknown password action: %', p_password_action using errcode = '22023';
  end if;
  if p_password_action = 'set' and coalesce(p_password, '') = '' then
    raise exception 'Passwords are 4 to 128 characters' using errcode = '22023';
  end if;

  update public.qr_codes c
     set name = case when v_patch ? 'name' then v_patch ->> 'name' else c.name end,
         content = case when v_patch ? 'content' then v_patch -> 'content' else c.content end,
         design = case when v_patch ? 'design' then v_patch -> 'design' else c.design end,
         destination = case when v_patch ? 'destination'
           then nullif(v_patch ->> 'destination', '') else c.destination end,
         slug = case when v_patch ? 'slug' then nullif(v_patch ->> 'slug', '') else c.slug end,
         folder_id = case when v_patch ? 'folder_id'
           then nullif(v_patch ->> 'folder_id', '')::uuid else c.folder_id end,
         active_from = case when v_patch ? 'active_from'
           then nullif(v_patch ->> 'active_from', '')::timestamptz else c.active_from end,
         active_until = case when v_patch ? 'active_until'
           then nullif(v_patch ->> 'active_until', '')::timestamptz else c.active_until end,
         is_private = case when v_patch ? 'is_private'
           then coalesce((v_patch ->> 'is_private')::boolean, c.is_private) else c.is_private end
   where c.id = p_id
  returning * into v_row;

  -- Row-level security hides codes the caller may not change, so no row means not allowed.
  if not found then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if p_password_action = 'set' then
    perform public.set_code_password(p_id, p_password);
  elsif p_password_action = 'clear' then
    perform public.set_code_password(p_id, null);
  end if;
  if p_password_action <> 'keep' then
    select * into v_row from public.qr_codes where id = p_id;
  end if;
  return v_row;
end;
$$;

revoke all on function public.update_code(uuid, jsonb, text, text) from public, anon;
grant execute on function public.update_code(uuid, jsonb, text, text) to authenticated;
