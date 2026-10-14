-- Create a code and its settings in one step, for the Create page (Phase 2 of the redesign).
--
-- Runs as the caller (security invoker), so the usual rules for adding codes still apply:
-- a two-step session for two-step accounts, editors only in a team workspace, and only the
-- columns signed-in users may insert. A password goes through set_code_password, which hashes
-- it and allows it on trackable codes only. It all happens in the caller's statement, so if
-- any part fails (a taken link ending, an end before the start, a short password) nothing is
-- saved.
create function public.create_code(p_code jsonb, p_password text default null)
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
    folder_id, active_from, active_until
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
    nullif(p_code ->> 'active_until', '')::timestamptz
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
