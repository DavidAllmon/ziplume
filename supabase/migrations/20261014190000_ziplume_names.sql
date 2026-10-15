-- Ziplume Release 2: the product's new name where the database shows it.
--
-- New API keys start with zl_ (Ziplume). Keys issued before keep working, because
-- api_key_user() compares hashes, not prefixes. The site-wide invite limit names Ziplume.
-- Grants are unchanged (create or replace keeps them).

create or replace function public.create_api_key(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := 'zl_' || encode(extensions.gen_random_bytes(24), 'hex'); -- was qq_
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

create or replace function public.record_invite_send(p_invite uuid)
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
    raise exception 'Ziplume has sent all the invite emails it can today' using errcode = '54000'; -- was QuickQReate
  end if;
  insert into public.invite_sends (owner_id, invite_id) values (auth.uid(), v_invite.id);
  update public.team_invites
     set last_sent_at = now(), send_count = send_count + 1
   where id = v_invite.id;
end;
$$;
