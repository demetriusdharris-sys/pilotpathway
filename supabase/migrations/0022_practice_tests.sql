-- 0022: practice tests — the question bank, attempts, answers, and exposure.
--
-- Numbered 0022, not 0004 as the spec said: 0004 is instructor_messages and
-- has been applied since August. Nothing else about the spec changed here
-- except where noted below, and each of those is written down.
--
-- WHAT THIS IS FOR. A student sits a randomised, stratified practice test
-- drawn from original questions keyed to ACS codes. Assembly avoids what they
-- have recently seen. No Anthropic call happens at test time — explanations
-- are written once, stored, and read back — so a practice test costs a
-- database read and nothing else.
--
-- FOUR DEVIATIONS FROM THE SPEC, ALL DELIBERATE:
--
--   1. correct_choice and explanation are NEVER granted to authenticated.
--      The spec asked to hide them "until the student has submitted an
--      answer". Column privileges cannot express a per-row condition, and a
--      view that pretends to is how 0014 shipped a bug. Instead the answer is
--      unreachable from a browser at all, and a Server Action using the
--      service role grades the submission and returns that one explanation.
--      The student sees exactly what the spec intended; the column is simply
--      never askable.
--
--   2. Students do not write their own answers. The spec had students writing
--      practice_answers, is_correct included. 0009 settled this for mastery:
--      a student who can write is_correct has a readiness score that means
--      nothing, and an unverifiable number is worse than no number because
--      someone acts on it. Students read their own rows; writes go through
--      the service role.
--
--   3. objective_id is a real foreign key to learning_objectives, not the
--      "FK-ish" text the spec described. The 48 objectives are already a
--      table with permanent ids; a loose text column would silently orphan.
--
--   4. cfi_approved is impossible without a named reviewer and a date, the
--      same check quiz_cards carries. Approval is a person putting their name
--      to content, and a status that can be set without one is decoration.
--
-- Also added, per the standing rule that a figure number is meaningless
-- without its edition: figure_supplement travels with figure_ref, so a
-- revision of the testing supplement is one column to update rather than a
-- text hunt through the bank.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

-- ---------------------------------------------------------------
-- The bank.
-- ---------------------------------------------------------------

create table public.question_bank (
  id uuid primary key default gen_random_uuid(),

  -- Stratification and reporting only. ACS codes are revision-specific, so
  -- this is metadata and MUST NOT be rendered to a student: a learner who
  -- repeats a stale code to an examiner pays for our mistake. Areas of
  -- operation are shown by name. See CLAUDE.md, AI tutor rules.
  acs_code text not null,

  -- One of the 13 FAA knowledge areas, by name.
  knowledge_area text not null,

  -- Optional link to the curriculum. Nullable because a question may test
  -- something no lesson objective covers yet.
  objective_id text references public.learning_objectives(id),

  stem text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  correct_choice char(1) not null check (correct_choice in ('A', 'B', 'C')),

  -- Why the right answer is right AND why each distractor is wrong. Written
  -- once, stored, never generated at test time.
  explanation text not null,

  -- A figure from the FAA Airman Knowledge Testing Supplement, which is public
  -- domain. The number alone is not checkable: supplements revise, and the
  -- edition is what makes "Figure 21" mean something.
  figure_ref text,
  figure_supplement text,

  difficulty smallint not null default 2 check (difficulty between 1 and 3),

  review_status text not null default 'draft'
    check (review_status in ('draft', 'cfi_approved', 'retired')),

  authored_by text,
  reviewed_by text,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint approved_requires_named_reviewer
    check (
      review_status <> 'cfi_approved'
      or (reviewed_by is not null and reviewed_at is not null)
    ),

  constraint figure_needs_its_edition
    check (figure_ref is null or figure_supplement is not null)
);

create index question_bank_acs_idx on public.question_bank (acs_code)
  where review_status = 'cfi_approved';
create index question_bank_area_idx on public.question_bank (knowledge_area)
  where review_status = 'cfi_approved';
create index question_bank_objective_idx on public.question_bank (objective_id)
  where review_status = 'cfi_approved';

-- ---------------------------------------------------------------
-- Attempts.
-- ---------------------------------------------------------------

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  mode text not null check (mode in ('full_60', 'quick_20', 'targeted')),
  -- What a targeted attempt was aimed at: a knowledge area or an objective id.
  -- Null for the two whole-test modes.
  target text,

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  question_count smallint not null check (question_count > 0),
  raw_score smallint check (raw_score >= 0),

  -- Deliberately separate from raw score. A short test's percentage is close
  -- to meaningless on its own, so readiness carries its own confidence and is
  -- refused outright on thin data.
  readiness_score numeric check (readiness_score between 0 and 100),
  readiness_confidence text
    check (readiness_confidence in ('insufficient_data', 'low', 'moderate', 'high')),

  constraint targeted_names_a_target
    check (mode <> 'targeted' or target is not null),
  constraint score_within_question_count
    check (raw_score is null or raw_score <= question_count)
);

create index practice_attempts_user_idx
  on public.practice_attempts (user_id, started_at desc);

-- ---------------------------------------------------------------
-- Answers.
-- ---------------------------------------------------------------

create table public.practice_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.practice_attempts(id) on delete cascade,

  -- Restrict, not cascade: deleting a question must not quietly rewrite a
  -- student's past attempt into a shorter one. Questions are retired, never
  -- deleted, for the same reason cards are.
  question_id uuid not null references public.question_bank(id) on delete restrict,

  position smallint not null check (position > 0),
  selected_choice char(1) check (selected_choice in ('A', 'B', 'C')),
  is_correct boolean,
  seconds_spent integer check (seconds_spent >= 0),
  answered_at timestamptz,

  -- One slot per position, and a question appears once per attempt.
  unique (attempt_id, position),
  unique (attempt_id, question_id),

  constraint answered_rows_are_complete
    check (
      (selected_choice is null and is_correct is null and answered_at is null)
      or (selected_choice is not null and is_correct is not null and answered_at is not null)
    )
);

create index practice_answers_attempt_idx
  on public.practice_answers (attempt_id, position);

-- ---------------------------------------------------------------
-- Exposure. This is what makes tests non-repeating.
-- ---------------------------------------------------------------

create table public.question_exposure (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.question_bank(id) on delete cascade,
  times_seen integer not null default 0 check (times_seen >= 0),
  times_correct integer not null default 0 check (times_correct >= 0),
  last_seen_at timestamptz,
  primary key (user_id, question_id),
  constraint correct_cannot_exceed_seen check (times_correct <= times_seen)
);

create index question_exposure_recency_idx
  on public.question_exposure (user_id, last_seen_at desc);

-- ---------------------------------------------------------------
-- RLS.
--
-- Every table on. Students read what is theirs; nothing here has a client
-- INSERT or UPDATE policy, because every write is made server-side with the
-- service role after grading.
-- ---------------------------------------------------------------

alter table public.question_bank      enable row level security;
alter table public.practice_attempts  enable row level security;
alter table public.practice_answers   enable row level security;
alter table public.question_exposure  enable row level security;

create policy "Students read approved questions"
  on public.question_bank for select to authenticated
  using (review_status = 'cfi_approved');

create policy "Students read their own attempts"
  on public.practice_attempts for select to authenticated
  using (user_id = auth.uid());

create policy "Students read answers from their own attempts"
  on public.practice_answers for select to authenticated
  using (exists (
    select 1 from public.practice_attempts a
    where a.id = practice_answers.attempt_id and a.user_id = auth.uid()
  ));

create policy "Students read their own exposure"
  on public.question_exposure for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- Column privileges. THE ANSWER IS NOT GRANTED.
--
-- RLS restricts rows; grants restrict columns. correct_choice and explanation
-- are simply absent from what authenticated may select, so asking for them
-- returns 42501 no matter what the client sends.
--
-- review_status IS granted even though students never display it: the SELECT
-- policy above reads that column, and a policy cannot read a column the role
-- lacks. 0014 shipped exactly that bug and the quiz silently rendered
-- nothing. See CLAUDE.md, Environment gotchas.
-- ---------------------------------------------------------------

revoke all on public.question_bank from anon, authenticated;

grant select (
  id, acs_code, knowledge_area, objective_id, stem,
  choice_a, choice_b, choice_c,
  figure_ref, figure_supplement, difficulty, review_status
) on public.question_bank to authenticated;

-- ---------------------------------------------------------------
-- Report. Expect four tables, RLS on all four, and student_can_read_answer
-- false — that last one is the property this whole migration exists for.
-- ---------------------------------------------------------------

select
  (select count(*) from pg_tables
    where schemaname = 'public'
      and tablename in ('question_bank', 'practice_attempts', 'practice_answers', 'question_exposure')
  ) as tables_created,
  (select count(*) from pg_class
    where relname in ('question_bank', 'practice_attempts', 'practice_answers', 'question_exposure')
      and relrowsecurity
  ) as tables_with_rls,
  has_column_privilege('authenticated', 'public.question_bank', 'correct_choice', 'select')
    as student_can_read_answer,
  has_column_privilege('authenticated', 'public.question_bank', 'stem', 'select')
    as student_can_read_question;
