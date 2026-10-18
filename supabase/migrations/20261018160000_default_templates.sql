-- Templates (redesign Phase 4, spec 4.5 and 6.4): each person can mark one saved design as their
-- default, which every new code they make starts from.

alter table public.design_templates add column is_default boolean not null default false;

-- At most one default per person.
create unique index design_templates_one_default
  on public.design_templates (user_id) where is_default;

-- Makes one of your templates your default, or with null leaves you with none. The old default is
-- cleared first, so the index never sees two. Only this function sets the flag: it isn't in the
-- columns people can insert or update directly.
create function public.set_default_template(p_template uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Sign in to change your templates' using errcode = '42501';
  end if;
  -- One person's changes one at a time, so two tabs can't both set a default.
  perform pg_advisory_xact_lock(hashtextextended('default_template:' || auth.uid()::text, 0));
  if p_template is not null and not exists (
    select 1 from public.design_templates t where t.id = p_template and t.user_id = auth.uid()
  ) then
    raise exception 'That template isn''t yours' using errcode = '42501';
  end if;
  update public.design_templates
     set is_default = false
   where user_id = auth.uid() and is_default and id is distinct from p_template;
  if p_template is not null then
    update public.design_templates set is_default = true where id = p_template;
  end if;
end;
$$;

revoke all on function public.set_default_template(uuid) from public, anon;
grant execute on function public.set_default_template(uuid) to authenticated;
