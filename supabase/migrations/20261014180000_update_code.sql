-- Save changes to a code in one step, for the editor at /codes/<id>/edit (Ziplume Release 1).
--
-- Runs as the caller (security invoker), so the usual rules for changing codes still apply: a
-- two-step session for two-step accounts, the owner or a teammate who can edit (never another
-- member's private code), and only the columns signed-in users may update. Fields missing from
-- p_patch stay as they are. A folder must belong to the code's owner (the composite foreign key
-- qr_codes_folder_fkey checks it). The password goes through set_code_password, which hashes it
-- and allows it on trackable codes only. It all runs in the caller's statement, so if any part
-- fails (a taken link ending, a folder from another space, a short password) nothing is saved.
create function public.update_code(
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
     'name', 'content', 'design', 'destination', 'slug', 'folder_id', 'active_from', 'active_until'
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
           then nullif(v_patch ->> 'active_until', '')::timestamptz else c.active_until end
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
