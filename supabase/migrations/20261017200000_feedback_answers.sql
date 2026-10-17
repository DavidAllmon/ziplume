-- Feedback pages can ask up to three questions, each rated in its own style: stars or faces
-- (1 to 5), thumbs (1 up, 0 down), or 0 to 10 (page enhancements 4c, spec items 36-37). Each
-- response keeps its answers with the question as it was asked. The one-rating submit_feedback
-- stays as it is, so the live site keeps working until the new code is deployed.

alter table public.feedback_responses
  alter column rating drop not null,
  add column answers jsonb
    check (answers is null or (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) between 1 and 3));

-- Called by the app server with answers it built from the page's own questions. Returns whether
-- the response was stored: the page must be an active feedback page, every answer must fit its
-- style, and each visitor may send at most three responses per code per day.
create function public.submit_feedback_answers(
  p_slug text,
  p_answers jsonb,
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
  v_answer jsonb;
  v_style text;
  v_value int;
begin
  select c.id into v_id
    from public.qr_codes c
   where c.is_dynamic and c.qr_type = 'feedback'
     and public.code_state(c.status, c.active_from, c.active_until) = 'active'
     and upper(c.slug) = upper(p_slug);
  if v_id is null or p_answers is null or jsonb_typeof(p_answers) <> 'array'
     or jsonb_array_length(p_answers) not between 1 and 3 then
    return false;
  end if;

  for v_answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(v_answer) <> 'object'
       or jsonb_typeof(v_answer -> 'question') is distinct from 'string'
       or char_length(v_answer ->> 'question') > 200
       or jsonb_typeof(v_answer -> 'value') is distinct from 'number'
       or (v_answer ->> 'value') !~ '^[0-9]{1,2}$' then
      return false;
    end if;
    v_style := v_answer ->> 'style';
    v_value := (v_answer ->> 'value')::int;
    if not (
      (v_style in ('stars', 'faces') and v_value between 1 and 5)
      or (v_style = 'thumbs' and v_value in (0, 1))
      or (v_style = 'scale' and v_value between 0 and 10)
    ) then
      return false;
    end if;
  end loop;

  select count(*) into v_recent
    from public.feedback_responses r
   where r.code_id = v_id
     and r.visitor_hash = p_visitor_hash
     and r.created_at > now() - interval '1 day';
  if v_recent >= 3 then
    return false;
  end if;

  insert into public.feedback_responses (code_id, rating, answers, comment, contact, visitor_hash)
  values (
    v_id,
    -- The first answer's stars or faces, for anything that reads the one rating.
    case when p_answers -> 0 ->> 'style' in ('stars', 'faces') then (p_answers -> 0 ->> 'value')::int end,
    p_answers,
    nullif(left(btrim(p_comment), 2000), ''),
    nullif(left(btrim(p_contact), 200), ''),
    left(coalesce(nullif(p_visitor_hash, ''), 'unknown'), 128)
  );
  return true;
end;
$$;

revoke all on function public.submit_feedback_answers(text, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_feedback_answers(text, jsonb, text, text, text) to service_role;
