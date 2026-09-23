-- 0024: submitting a practice attempt — scoring and exposure, atomically.
--
-- Three things have to happen together when a student submits:
--
--   1. every answered question is graded,
--   2. question_exposure is updated for every question they were shown,
--   3. the attempt is marked complete with its raw score.
--
-- supabase-js cannot wrap three statements in one transaction, so a dropped
-- connection between them would leave an attempt scored but not recorded as
-- seen — and the non-repeat engine would hand the same questions back an hour
-- later. A function is the only way to make it one write.
--
-- ALSO FIXES A CONSTRAINT 0022 GOT WRONG. `answered_rows_are_complete`
-- required is_correct to be set whenever selected_choice was, which forces
-- grading at the moment the student taps an answer. Two things are wrong with
-- that: students can read their own practice_answers rows, so a graded row
-- would tell them whether they were right before they submitted; and it makes
-- saving an answer depend on reading the answer key. Selections are now saved
-- ungraded, and grading happens once, here.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

alter table public.practice_answers
  drop constraint answered_rows_are_complete;

alter table public.practice_answers
  add constraint answered_rows_record_when
  check (
    (selected_choice is null and answered_at is null)
    or (selected_choice is not null and answered_at is not null)
  );

-- is_correct is never readable by a student even after submission: the results
-- page is rendered on the server, which reads with the service role. Leaving
-- it grantable would mean a client could ask mid-attempt.
revoke all on public.practice_answers from anon, authenticated;

grant select (
  id, attempt_id, question_id, position, selected_choice, answered_at, seconds_spent
) on public.practice_answers to authenticated;

create or replace function public.submit_practice_attempt(
  p_attempt_id uuid,
  p_user_id uuid
)
returns table (raw_score smallint, question_count smallint)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_completed timestamptz;
  v_count smallint;
  v_score smallint;
begin
  -- Locks the attempt for the duration, so two submits racing (a double tap,
  -- or a retry after a timeout) cannot both score it and double-count
  -- exposure.
  select completed_at, question_count
    into v_completed, v_count
  from public.practice_attempts
  where id = p_attempt_id and user_id = p_user_id
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
  update public.practice_answers a
  set is_correct = (a.selected_choice = q.correct_choice)
  from public.question_bank q
  where q.id = a.question_id
    and a.attempt_id = p_attempt_id
    and a.selected_choice is not null;

  -- 2. Exposure, for every question SHOWN, answered or not — seeing a question
  -- is what makes it stale for the non-repeat engine.
  insert into public.question_exposure (user_id, question_id, times_seen, times_correct, last_seen_at)
  select p_user_id, a.question_id, 1, case when a.is_correct then 1 else 0 end, now()
  from public.practice_answers a
  where a.attempt_id = p_attempt_id
  on conflict (user_id, question_id) do update
  set times_seen = public.question_exposure.times_seen + 1,
      times_correct = public.question_exposure.times_correct + excluded.times_correct,
      last_seen_at = now();

  select count(*) filter (where a.is_correct)
    into v_score
  from public.practice_answers a
  where a.attempt_id = p_attempt_id;

  -- 3. Close the attempt.
  update public.practice_attempts
  set completed_at = now(), raw_score = v_score
  where id = p_attempt_id;

  return query select v_score, v_count;
end;
$$;

-- Callable only by the service role. It takes the student id as a parameter,
-- so letting a browser call it would let a student submit someone else's
-- attempt; the server passes the id it got from getUser().
revoke all on function public.submit_practice_attempt(uuid, uuid) from public, anon, authenticated;

comment on function public.submit_practice_attempt(uuid, uuid) is
  'Grades an attempt, updates exposure, and closes it — in one transaction. Service role only; the caller is responsible for establishing who the student is.';

-- ---------------------------------------------------------------
-- Report. Expect function_exists true, student_can_read_correctness false.
-- ---------------------------------------------------------------

select
  to_regprocedure('public.submit_practice_attempt(uuid,uuid)') is not null as function_exists,
  has_column_privilege('authenticated', 'public.practice_answers', 'is_correct', 'select')
    as student_can_read_correctness,
  has_column_privilege('authenticated', 'public.practice_answers', 'selected_choice', 'select')
    as student_can_read_own_selection;
