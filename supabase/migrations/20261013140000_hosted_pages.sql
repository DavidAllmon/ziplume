-- Hosted pages and new code types.
--
--   * New static types (WhatsApp, location, payment) and hosted page types (link list,
--     contact page, business, menu, coupon, event, feedback, PDF, images, video, audio, app).
--   * Hosted pages are dynamic codes without a destination; their content is the page.
--   * public_page(): the published content of one page, readable by anyone with the link.
--   * Feedback responses, submitted through the app server (rate limited) and readable only
--     by the code's owner.
--   * record_scan() now also returns the type and content, so /r/<slug> can route pages,
--     direct PDFs and app-store links.

begin;

-- ---------------------------------------------------------------------------
-- qr_codes: types, content size and dynamic rules
-- ---------------------------------------------------------------------------

alter table public.qr_codes drop constraint qr_codes_qr_type_check;
alter table public.qr_codes add constraint qr_codes_qr_type_check check (qr_type in (
  'url', 'text', 'wifi', 'contact', 'email', 'phone', 'sms', 'whatsapp', 'location', 'payment',
  'links', 'vcard', 'business', 'menu', 'coupon', 'event', 'feedback', 'pdf', 'images', 'video',
  'audio', 'app'
));

-- Menus and link lists need more room than a single static payload.
alter table public.qr_codes drop constraint qr_codes_content_check;
alter table public.qr_codes add constraint qr_codes_content_check
  check (jsonb_typeof(content) = 'object' and pg_column_size(content) <= 65536);

-- Dynamic Link codes need a destination; hosted pages don't (the page is the destination).
alter table public.qr_codes drop constraint qr_codes_dynamic_fields;
alter table public.qr_codes add constraint qr_codes_dynamic_fields check (
  (is_dynamic and slug is not null and (destination is not null or qr_type <> 'url'))
  or (not is_dynamic and slug is null and destination is null)
);

-- Hosted pages only exist as dynamic codes.
alter table public.qr_codes add constraint qr_codes_pages_are_dynamic check (
  is_dynamic or qr_type in ('url', 'text', 'wifi', 'contact', 'email', 'phone', 'sms', 'whatsapp', 'location', 'payment')
);

-- ---------------------------------------------------------------------------
-- record_scan: same rules as before, plus type and content for routing.
-- ---------------------------------------------------------------------------

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
returns table (destination text, status text, qr_type text, content jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_destination text;
  v_status text;
  v_type text;
  v_content jsonb;
  v_country text := upper(left(p_country, 2));
begin
  select c.id, c.destination, c.status, c.qr_type, c.content
    into v_id, v_destination, v_status, v_type, v_content
    from public.qr_codes c
   where c.is_dynamic and upper(c.slug) = upper(p_slug);

  if v_id is null then
    return;
  end if;

  if v_status = 'active' and p_record then
    insert into public.scan_events (code_id, visitor_hash, country, region, city, device_type, os, browser)
    values (
      v_id,
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
     where id = v_id;
  end if;

  destination := v_destination;
  status := v_status;
  qr_type := v_type;
  content := v_content;
  return next;
end;
$$;

revoke all on function public.record_scan(text, text, text, text, text, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.record_scan(text, text, text, text, text, text, text, text, boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- public_page: what a scanner sees. Only hosted page types, never the owner's identity.
-- ---------------------------------------------------------------------------

create function public.public_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', c.slug,
    'qr_type', c.qr_type,
    'status', c.status,
    'content', c.content,
    'updated_at', c.updated_at
  )
    from public.qr_codes c
   where c.is_dynamic
     and upper(c.slug) = upper(p_slug)
     and c.qr_type in ('links', 'vcard', 'business', 'menu', 'coupon', 'event', 'feedback', 'pdf', 'images', 'video', 'audio', 'app');
$$;

revoke all on function public.public_page(text) from public;
grant execute on function public.public_page(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Feedback responses
-- ---------------------------------------------------------------------------

create table public.feedback_responses (
  id bigint generated always as identity primary key,
  code_id uuid not null references public.qr_codes (id) on delete cascade,
  created_at timestamptz not null default now(),
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  contact text check (contact is null or char_length(contact) <= 200),
  visitor_hash text not null check (char_length(visitor_hash) <= 128)
);

create index feedback_responses_code_time on public.feedback_responses (code_id, created_at desc);

alter table public.feedback_responses enable row level security;

create policy "Users can read feedback for their own codes"
  on public.feedback_responses for select to authenticated
  using (code_id in (select id from public.qr_codes where user_id = (select auth.uid())));

create policy "Users can delete feedback for their own codes"
  on public.feedback_responses for delete to authenticated
  using (code_id in (select id from public.qr_codes where user_id = (select auth.uid())));

create policy "Two-factor accounts need a two-factor session"
  on public.feedback_responses as restrictive for all to authenticated
  using ((select public.mfa_satisfied()));

revoke all on public.feedback_responses from public, anon, authenticated;
grant select, delete on public.feedback_responses to authenticated;
grant select, insert, update, delete on public.feedback_responses to service_role;

-- Called by the app server, which supplies a daily-salted visitor hash. Accepts at most
-- three responses per visitor per code per day; returns whether the response was stored.
create function public.submit_feedback(
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
   where c.is_dynamic and c.qr_type = 'feedback' and c.status = 'active'
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

revoke all on function public.submit_feedback(text, int, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_feedback(text, int, text, text, text) to service_role;

commit;
