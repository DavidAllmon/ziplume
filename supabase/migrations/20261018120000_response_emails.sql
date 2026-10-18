-- "Email me new responses" (page enhancements 5b, spec item 38). A code's maker can have each new
-- feedback response, set of shared details and RSVP emailed to them through Brevo: at most one
-- email per response and 50 per account per day. Each response is queued here as it's stored, and
-- the app server sends the queue after the visitor has their answer.

-- Only the code's maker turns it on or off, through set_response_emails: it isn't in the columns
-- people can update directly.
alter table public.qr_codes add column notify_responses boolean not null default false;

-- A code that moves to someone else (a teammate removed with "keep their codes") stops emailing:
-- its new owner turns the emails on if they want them.
create function public.reset_response_emails()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    new.notify_responses := false;
  end if;
  return new;
end;
$$;

create trigger qr_codes_reset_response_emails
  before update of user_id on public.qr_codes
  for each row execute function public.reset_response_emails();

-- One row per email: queued, then handed to the server once, then sent or failed.
create table public.response_emails (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  code_id uuid not null references public.qr_codes (id) on delete cascade,
  kind text not null check (kind in ('feedback', 'share', 'rsvp')),
  response_id bigint not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  -- At most one email per response.
  constraint response_emails_once unique (kind, response_id)
);

create index response_emails_owner_time on public.response_emails (owner_id, created_at desc);
create index response_emails_time on public.response_emails (created_at);
create index response_emails_waiting on public.response_emails (code_id) where status = 'pending';

alter table public.response_emails enable row level security;
revoke all on public.response_emails from public, anon, authenticated;
grant select, insert, update, delete on public.response_emails to service_role;

-- Turns "Email me new responses" on or off for one of your own codes.
create function public.set_response_emails(p_code uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Sign in to change emails' using errcode = '42501';
  end if;
  update public.qr_codes set notify_responses = coalesce(p_on, false)
   where id = p_code and user_id = auth.uid();
  if not found then
    raise exception 'Only the code''s maker can change its emails' using errcode = '42501';
  end if;
end;
$$;

-- Queues an email for a new response when its code's maker has the switch on, under the limits:
-- 50 a day per account, and 250 a day for the whole site counting invites, which leaves room in
-- Brevo's 300 a day for sign-up and password emails. Past a limit the response is still stored.
create function public.queue_response_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select c.user_id into v_owner
    from public.qr_codes c
   where c.id = new.code_id and c.notify_responses;
  if v_owner is null then
    return null;
  end if;
  -- One at a time, so two responses can't both slip under a limit.
  perform pg_advisory_xact_lock(hashtextextended('response_emails', 0));
  if (select count(*) from public.response_emails e
       where e.owner_id = v_owner and e.created_at > now() - interval '1 day') >= 50 then
    return null;
  end if;
  if (select count(*) from public.response_emails e where e.created_at > now() - interval '1 day')
     + (select count(*) from public.invite_sends s where s.sent_at > now() - interval '1 day')
     >= 250 then
    return null;
  end if;
  insert into public.response_emails (owner_id, code_id, kind, response_id)
  values (v_owner, new.code_id, tg_argv[0], new.id)
  on conflict (kind, response_id) do nothing;
  return null;
end;
$$;

create trigger feedback_responses_email
  after insert on public.feedback_responses
  for each row execute function public.queue_response_email('feedback');
create trigger contact_shares_email
  after insert on public.contact_shares
  for each row execute function public.queue_response_email('share');
create trigger event_rsvps_email
  after insert on public.event_rsvps
  for each row execute function public.queue_response_email('rsvp');

-- Called by the app server after a response is stored: up to five of the page's waiting emails,
-- each handed out once, with who gets it and what the visitor sent (null when the response has
-- been deleted since). Nothing is handed out while the switch is off.
create function public.claim_response_emails(p_slug text)
returns table (
  id bigint,
  kind text,
  code_id uuid,
  code_name text,
  owner_id uuid,
  to_email text,
  to_name text,
  received_at timestamptz,
  details jsonb
)
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.response_emails e
       set status = 'sending'
     where e.id in (
       select q.id
         from public.response_emails q
         join public.qr_codes c on c.id = q.code_id
        where upper(c.slug) = upper(p_slug)
          and c.notify_responses
          and c.user_id = q.owner_id
          and q.status = 'pending'
          and q.created_at > now() - interval '1 day'
        order by q.id
        limit 5
          for update of q skip locked
     )
    returning e.id, e.kind, e.code_id, e.owner_id, e.response_id, e.created_at
  )
  select cl.id, cl.kind, cl.code_id, c.name, cl.owner_id, u.email::text, p.display_name,
         cl.created_at,
         case cl.kind
           when 'feedback' then (
             select jsonb_build_object('rating', f.rating, 'answers', f.answers,
                                       'comment', f.comment, 'contact', f.contact)
               from public.feedback_responses f where f.id = cl.response_id)
           when 'share' then (
             select jsonb_build_object('name', s.name, 'phone', s.phone,
                                       'email', s.email, 'note', s.note)
               from public.contact_shares s where s.id = cl.response_id)
           when 'rsvp' then (
             select jsonb_build_object('name', r.name, 'email', r.email,
                                       'guests', r.guests, 'note', r.note)
               from public.event_rsvps r where r.id = cl.response_id)
         end
    from claimed cl
    join public.qr_codes c on c.id = cl.code_id
    join auth.users u on u.id = cl.owner_id
    left join public.profiles p on p.id = cl.owner_id
   order by cl.id;
$$;

-- Records whether Brevo took an email the server was handed.
create function public.finish_response_email(p_id bigint, p_sent boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.response_emails
     set status = case when p_sent then 'sent' else 'failed' end,
         sent_at = case when p_sent then now() end
   where id = p_id and status = 'sending';
$$;

revoke all on function public.reset_response_emails() from public, anon, authenticated;
revoke all on function public.queue_response_email() from public, anon, authenticated;
revoke all on function public.set_response_emails(uuid, boolean) from public, anon;
grant execute on function public.set_response_emails(uuid, boolean) to authenticated;
revoke all on function public.claim_response_emails(text) from public, anon, authenticated;
revoke all on function public.finish_response_email(bigint, boolean) from public, anon, authenticated;
grant execute on function public.claim_response_emails(text) to service_role;
grant execute on function public.finish_response_email(bigint, boolean) to service_role;
