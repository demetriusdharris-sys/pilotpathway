-- PilotPathway.ai — do not charge quota for requests the limiter refuses
--
-- Bug in 0002: consume_tutor_message incremented unconditionally and the
-- caller compared the new count against the limit afterwards. A student at
-- the cap was refused with a 429 AND still had their counter advanced, so
-- being blocked pushed them further past the limit. Observed live: count 4,
-- request refused, count 5.
--
-- The fix keeps the increment BEFORE the Anthropic call, which is deliberate:
-- a call that fails upstream must still burn quota, or a loop of failing
-- requests bypasses the cap entirely. What changes is that the limit check
-- moves INSIDE the same atomic statement as the increment, so a request
-- refused by the limiter never writes at all.
--
-- Atomicity is preserved. The guard lives in the UPDATE's WHERE clause, so
-- Postgres takes a row lock and re-evaluates message_count < p_limit against
-- the committed value. Two concurrent requests at the boundary cannot both
-- pass: the second blocks on the lock, re-checks, and fails the predicate.

drop function if exists public.consume_tutor_message(uuid);

create or replace function public.consume_tutor_message(
  p_user_id uuid,
  p_limit integer
)
returns table (allowed boolean, message_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := ((now() at time zone 'utc')::date);
  v_count integer;
begin
  -- Ensure today's row exists without counting anything toward the cap.
  insert into public.tutor_usage (user_id, day, message_count)
  values (p_user_id, v_today, 0)
  on conflict (user_id, day) do nothing;

  -- Guarded increment. The WHERE clause is the limit check; if it fails, no
  -- row is written and the student's counter is untouched.
  update public.tutor_usage
     set message_count = public.tutor_usage.message_count + 1,
         updated_at = now()
   where user_id = p_user_id
     and day = v_today
     and public.tutor_usage.message_count < p_limit
  returning public.tutor_usage.message_count into v_count;

  if found then
    return query select true, v_count;
  else
    select tu.message_count into v_count
      from public.tutor_usage tu
     where tu.user_id = p_user_id
       and tu.day = v_today;

    return query select false, coalesce(v_count, 0);
  end if;
end;
$$;

revoke execute on function public.consume_tutor_message(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.consume_tutor_message(uuid, integer)
  to service_role;
