-- Saved design templates: a user's own styles (colors, shapes, frame, logo), synced across
-- devices. Same access model as qr_codes: owners only, enforced by grants and RLS.

begin;

create table public.design_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  design jsonb not null
    check (jsonb_typeof(design) = 'object' and pg_column_size(design) <= 262144),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index design_templates_user_created on public.design_templates (user_id, created_at desc);

create trigger design_templates_touch_updated_at
  before update on public.design_templates
  for each row execute function public.touch_updated_at();

alter table public.design_templates enable row level security;

create policy "Users can read their own templates"
  on public.design_templates for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own templates"
  on public.design_templates for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own templates"
  on public.design_templates for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own templates"
  on public.design_templates for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Two-factor accounts need a two-factor session"
  on public.design_templates as restrictive for all to authenticated
  using ((select public.mfa_satisfied()))
  with check ((select public.mfa_satisfied()));

revoke all on public.design_templates from public, anon, authenticated;
grant select, delete on public.design_templates to authenticated;
grant insert (name, design) on public.design_templates to authenticated;
grant update (name, design) on public.design_templates to authenticated;
grant select, insert, update, delete on public.design_templates to service_role;

commit;
