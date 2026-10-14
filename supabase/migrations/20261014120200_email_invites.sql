-- Email invites: QuickQReate emails team invites from the server (through Brevo). Each email is
-- recorded first, and the limits below stop invites being used to send lots of email: at most
-- 5 emails for one invite, 20 an hour and 50 a day for one owner, and 200 a day for the whole
-- site (Brevo also sends sign-up and password emails, which must keep working).

begin;

alter table public.team_invites
  add column last_sent_at timestamptz,
  add column send_count int not null default 0;

-- One row per email sent. Rows stay when an invite is revoked, so revoking and inviting again
-- doesn't reset the hourly limit.
create table public.invite_sends (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_id uuid,
  sent_at timestamptz not null default now()
);

create index invite_sends_owner on public.invite_sends (owner_id, sent_at desc);
create index invite_sends_sent_at on public.invite_sends (sent_at);

alter table public.invite_sends enable row level security;

revoke all on public.invite_sends from public, anon, authenticated;
grant select, insert, update, delete on public.invite_sends to service_role;

-- Records that the owner is emailing an invite, or refuses when a limit is reached. The server
-- calls it before sending and only sends when it succeeds.
create function public.record_invite_send(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.team_invites;
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Sign in to send invites' using errcode = '42501';
  end if;
  -- One owner's sends are counted one at a time, so two requests can't both slip under a limit.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select * into v_invite
    from public.team_invites
   where id = p_invite and owner_id = auth.uid()
     for update;
  if v_invite.id is null or v_invite.accepted_at is not null or v_invite.expires_at <= now() then
    raise exception 'This invite is no longer valid' using errcode = '22023';
  end if;
  if v_invite.send_count >= 5 then
    raise exception 'This invite has been emailed 5 times already' using errcode = '54000';
  end if;
  if (select count(*) from public.invite_sends s
       where s.owner_id = auth.uid() and s.sent_at > now() - interval '1 hour') >= 20 then
    raise exception 'You have sent 20 invites in the last hour' using errcode = '54000';
  end if;
  if (select count(*) from public.invite_sends s
       where s.owner_id = auth.uid() and s.sent_at > now() - interval '1 day') >= 50 then
    raise exception 'You have sent 50 invites today' using errcode = '54000';
  end if;
  if (select count(*) from public.invite_sends s where s.sent_at > now() - interval '1 day') >= 200 then
    raise exception 'QuickQReate has sent all the invite emails it can today' using errcode = '54000';
  end if;
  insert into public.invite_sends (owner_id, invite_id) values (auth.uid(), v_invite.id);
  update public.team_invites
     set last_sent_at = now(), send_count = send_count + 1
   where id = v_invite.id;
end;
$$;

-- The newest unused invite addressed to the signed-in user's email, so a new account goes
-- straight to it after confirming the address (even on another device).
create function public.my_pending_invite()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select i.token
    from public.team_invites i
   where lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     and i.accepted_at is null
     and i.expires_at > now()
     and i.owner_id <> auth.uid()
   order by i.created_at desc
   limit 1;
$$;

revoke all on function public.record_invite_send(uuid), public.my_pending_invite() from public, anon;
grant execute on function public.record_invite_send(uuid), public.my_pending_invite() to authenticated;

-- The invite page and sign-up page show who invited you before you have an account. The token
-- is the secret: only someone holding the link can look it up.
grant execute on function public.invite_details(text) to anon;

commit;
