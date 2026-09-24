-- 0028: reviewing questions — a state for "needs changes", and who may set it.
--
-- A reviewer needs three answers, not two: approve, send back with a reason,
-- or leave it alone. 0022 had only draft / cfi_approved / retired, so a CFI
-- who spotted an ambiguous stem had nowhere to put that except an email.
--
-- `needs_changes` is deliberately NOT a fourth servable state. Like draft, it
-- is invisible to students. The difference is that it carries a note saying
-- what is wrong, addressed to whoever writes the markdown.
--
-- WHY THE REVIEWER CANNOT EDIT THE WORDING HERE. The markdown in
-- docs/questions is the source, and `import-questions.mjs` overwrites the row
-- from it. A fix typed into the database would be silently reverted by the
-- next sync — and a reviewer who watches their correction vanish stops
-- trusting the whole pipeline. So the flow is: reviewer writes what is wrong,
-- author fixes the markdown, the sync brings it back as draft, reviewer looks
-- again.
--
-- Who may review: `mentor` (where a CFI account sits) and `admin`. Enforced in
-- a SECURITY DEFINER function rather than trusted to the page, because a page
-- decides what to show and a function decides what may happen.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

alter table public.question_bank
  drop constraint question_bank_review_status_check;

alter table public.question_bank
  add constraint question_bank_review_status_check
  check (review_status in ('draft', 'needs_changes', 'cfi_approved', 'retired'));

alter table public.question_bank
  add column review_note text,
  add column review_note_at timestamptz;

comment on column public.question_bank.review_note is
  'What the reviewer said was wrong, for whoever edits the markdown. Never shown to a student.';

-- ---------------------------------------------------------------
-- Is the caller allowed to review at all?
-- ---------------------------------------------------------------

create or replace function public.may_review_questions()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('mentor', 'admin')
  );
$$;

comment on function public.may_review_questions() is
  'Reviewers are mentors (where a CFI account sits) and admins. Students and school staff are not reviewers.';

-- ---------------------------------------------------------------
-- The one way a question changes state.
--
-- Takes the reviewer's name as text — "Jane Doe, CFI 1234567" — because who
-- signed a piece of safety content should be legible to a funder or the FAA
-- without joining tables to an auth schema. The user id is recorded in the
-- same breath so the claim can still be traced to an account.
-- ---------------------------------------------------------------

create or replace function public.review_question(
  p_question_id uuid,
  p_decision text,
  p_reviewer text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_status text;
begin
  if not public.may_review_questions() then
    raise exception 'Only a flight instructor or an administrator can review questions.';
  end if;

  if coalesce(trim(p_reviewer), '') = '' then
    raise exception 'Say who is approving this — a name and certificate number.';
  end if;

  if p_decision not in ('approve', 'needs_changes', 'retire') then
    raise exception 'Unknown decision: %', p_decision;
  end if;

  if p_decision = 'needs_changes' and coalesce(trim(p_note), '') = '' then
    raise exception 'Say what needs changing — the note is the whole point of sending it back.';
  end if;

  -- A question still carrying a value gap cannot be approved. The gap is a
  -- question FOR the reviewer; approving around it puts a placeholder in
  -- front of a student.
  if p_decision = 'approve' then
    if exists (
      select 1 from public.question_bank q
      where q.id = p_question_id
        and (q.stem like '%[CFI: confirm value]%'
             or q.explanation like '%[CFI: confirm value]%'
             or q.choice_a like '%[CFI: confirm value]%'
             or q.choice_b like '%[CFI: confirm value]%'
             or q.choice_c like '%[CFI: confirm value]%')
    ) then
      raise exception 'This question still has a [CFI: confirm value] gap. Fill the value in the source document first.';
    end if;
  end if;

  v_status := case p_decision
    when 'approve' then 'cfi_approved'
    when 'needs_changes' then 'needs_changes'
    else 'retired'
  end;

  update public.question_bank q
  set review_status = v_status,
      reviewed_by = case when p_decision = 'approve' then p_reviewer else q.reviewed_by end,
      reviewed_at = case when p_decision = 'approve' then now() else q.reviewed_at end,
      review_note = case when p_decision = 'needs_changes' then p_note else null end,
      review_note_at = case when p_decision = 'needs_changes' then now() else null end
  where q.id = p_question_id;

  if not found then
    raise exception 'No such question.';
  end if;
end;
$$;

revoke all on function public.review_question(uuid, text, text, text) from public, anon;
grant execute on function public.review_question(uuid, text, text, text) to authenticated;

comment on function public.review_question(uuid, text, text, text) is
  'Approve, send back with a note, or retire. Checks the caller is a reviewer and refuses to approve a question that still carries a [CFI: confirm value] gap.';

-- ---------------------------------------------------------------
-- NO EXTRA GRANTS, DELIBERATELY.
--
-- The first draft of this migration granted correct_choice and explanation to
-- `authenticated` so a reviewer could see them. That would have handed the
-- answer key to every student in the app: a GRANT is role-wide, and RLS
-- restricts rows rather than columns. It is the same mistake 0014 made, in
-- reverse.
--
-- The review page therefore reads with the service role, in server code, after
-- checking the caller's role — the same pattern the results page uses to show
-- an explanation only after an attempt is submitted.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- Report. Expect reviewer_function true, review_function true, and the four
-- states allowed. `you_may_review` reflects whichever role your own account
-- has — set it below if it is false.
-- ---------------------------------------------------------------

select
  to_regprocedure('public.may_review_questions()') is not null as reviewer_function,
  to_regprocedure('public.review_question(uuid,text,text,text)') is not null as review_function,
  (select count(*) from public.question_bank where review_status = 'draft') as drafts_waiting;
