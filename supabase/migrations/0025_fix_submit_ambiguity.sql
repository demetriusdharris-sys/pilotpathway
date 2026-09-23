-- 0025: submit_practice_attempt could not run.
--
-- 0024 declared it `returns table (raw_score smallint, question_count
-- smallint)`. In plpgsql, the names in a RETURNS TABLE clause are variables
-- in the function's scope — so inside the body `question_count` matched both
-- that variable and the column on practice_attempts, and Postgres refused
-- rather than guess:
--
--     column reference "question_count" is ambiguous
--
-- Found by submitting a practice test on the live site. Nothing in lint, the
-- typecheck, or the build can see inside a function body, and the migration
-- applied cleanly because the ambiguity only bites when it runs.
--
-- Two changes:
--
--   1. It returns void. The caller already ignored the result and re-reads
--      the attempt, so the return type was carrying no weight while causing
--      all of this.
--   2. Every column reference is qualified. Belt and braces: a future
--      variable named after a column cannot reintroduce the same problem
--      silently.
--
-- Output parameter names cannot be changed by CREATE OR REPLACE, so this
-- drops first.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

drop function if exists public.submit_practice_attempt(uuid, uuid);

create function public.submit_practice_attempt(
  p_attempt_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_completed timestamptz;
  v_score smallint;
begin
  -- Locks the attempt, so a double tap or a retry after a timeout cannot
  -- score it twice and double-count exposure.
  select att.completed_at
    into v_completed
  from public.practice_attempts att
  where att.id = p_attempt_id and att.user_id = p_user_id
  for update;

  if not found then
    raise exception 'No such attempt for this student.';
  end if;

  if v_completed is not null then
    raise exception 'That attempt has already been submitted.';
  end if;

  -- 1. Grade. Unanswered questions stay null rather than counting as wrong:
  -- a skipped question and a wrong answer are different facts, and only the
  -- score treats them the same.
  update public.practice_answers ans
  set is_correct = (ans.selected_choice = q.correct_choice)
  from public.question_bank q
  where q.id = ans.question_id
    and ans.attempt_id = p_attempt_id
    and ans.selected_choice is not null;

  -- 2. Exposure, for every question SHOWN, answered or not — seeing a
  -- question is what makes it stale for the non-repeat engine.
  insert into public.question_exposure (user_id, question_id, times_seen, times_correct, last_seen_at)
  select p_user_id, ans.question_id, 1, case when ans.is_correct then 1 else 0 end, now()
  from public.practice_answers ans
  where ans.attempt_id = p_attempt_id
  on conflict (user_id, question_id) do update
  set times_seen = public.question_exposure.times_seen + 1,
      times_correct = public.question_exposure.times_correct + excluded.times_correct,
      last_seen_at = now();

  select count(*) filter (where ans.is_correct)
    into v_score
  from public.practice_answers ans
  where ans.attempt_id = p_attempt_id;

  -- 3. Close the attempt.
  update public.practice_attempts att
  set completed_at = now(), raw_score = v_score
  where att.id = p_attempt_id;
end;
$$;

revoke all on function public.submit_practice_attempt(uuid, uuid) from public, anon, authenticated;

comment on function public.submit_practice_attempt(uuid, uuid) is
  'Grades an attempt, updates exposure, and closes it — in one transaction. Service role only; the caller establishes who the student is. Returns void: the caller re-reads the attempt.';

-- ---------------------------------------------------------------
-- Report. Expect returns_void true and student_can_execute false.
-- ---------------------------------------------------------------

select
  (select pg_get_function_result(oid) from pg_proc
    where oid = 'public.submit_practice_attempt(uuid,uuid)'::regprocedure) as returns_void,
  has_function_privilege('authenticated', 'public.submit_practice_attempt(uuid,uuid)', 'execute')
    as student_can_execute;
