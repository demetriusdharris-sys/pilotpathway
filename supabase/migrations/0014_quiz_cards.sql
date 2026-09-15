-- 0014: quiz card storage.
--
-- Cards live in the database, not in curriculum.ts. Lesson content was
-- hardcoded and we regret it: a CFI cannot fix a typo without a deploy. Cards
-- are the content a CFI corrects most often, so putting them in code would
-- repeat that mistake exactly where it hurts most.
--
-- Two things are structural here rather than left to convention:
--
--   1. A card cannot be 'approved' without a named reviewer and a timestamp.
--      Every card teaches toward a learning objective, and sixteen of the
--      forty-eight objectives are safety-critical. "Unreviewed content reached
--      a student" should be unrepresentable, not merely discouraged.
--
--   2. A student can read a card's question and its options. A student cannot
--      read which option is correct, or the explanation. That is enforced by
--      column GRANT, not by remembering to omit a column from a select —
--      same mechanism that stops a student setting their own profile role.
--      RLS restricts rows; the grant is what restricts columns.
--
-- Grading therefore happens server-side with the service role. If the correct
-- option id ever reaches the browser, objective_assessments stops meaning
-- anything, and it is the only mastery stream we would ever put in front of a
-- district.

-- ---------------------------------------------------------------
-- Cards.
--
-- id is `<objective_id>.c<n>` — readable, stable across re-imports, and
-- unlike an objective id it is not referenced by any mastery record, so a
-- card can be renumbered or cut without orphaning history.
-- ---------------------------------------------------------------

create table public.quiz_cards (
  id text primary key,
  objective_id text not null references public.learning_objectives(id),
  lesson_slug text not null,
  position integer not null,
  question text not null,
  explanation text not null,
  visual_description text,

  status text not null default 'draft'
    check (status in ('draft', 'approved', 'retired')),

  -- Who signed it off. Free text: a name and a certificate number, as written
  -- on the review document. Not a user reference — the reviewing CFI may have
  -- no account here.
  reviewed_by text,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint approved_requires_named_reviewer
    check (
      status <> 'approved'
      or (reviewed_by is not null and reviewed_at is not null)
    )
);

create index quiz_cards_objective_idx
  on public.quiz_cards (objective_id) where status = 'approved';

create index quiz_cards_lesson_idx
  on public.quiz_cards (lesson_slug) where status = 'approved';

-- ---------------------------------------------------------------
-- Options.
--
-- option_id is stable per card and travels with its text. Options are
-- shuffled when shown, so nothing may depend on their stored order, and the
-- correct answer is named by id rather than by position.
-- ---------------------------------------------------------------

create table public.quiz_card_options (
  card_id text not null references public.quiz_cards(id) on delete cascade,
  option_id text not null
    check (option_id in ('opt-1', 'opt-2', 'opt-3', 'opt-4')),
  text text not null,
  is_correct boolean not null default false,
  primary key (card_id, option_id)
);

-- Exactly one correct option per card. A card with two, or with none, is a
-- card that cannot be graded, and it should fail on import rather than in
-- front of a student.
create unique index quiz_card_options_one_correct
  on public.quiz_card_options (card_id) where is_correct;

-- ---------------------------------------------------------------
-- RLS: students read approved cards only.
-- ---------------------------------------------------------------

alter table public.quiz_cards         enable row level security;
alter table public.quiz_card_options  enable row level security;

create policy "Anyone signed in can read approved cards"
  on public.quiz_cards for select to authenticated
  using (status = 'approved');

create policy "Anyone signed in can read options of approved cards"
  on public.quiz_card_options for select to authenticated
  using (
    exists (
      select 1
      from public.quiz_cards c
      where c.id = card_id and c.status = 'approved'
    )
  );

-- No INSERT, UPDATE or DELETE policy on either table, deliberately. Cards are
-- written by the import migration and corrected by a reviewer with database
-- access. Nothing in the app writes them.

-- ---------------------------------------------------------------
-- Column grants: the part that actually hides the answer.
--
-- Supabase grants broadly by default, so revoke first and then hand back only
-- the columns a student may see. Selecting explanation or is_correct as a
-- student returns 42501 — not an empty result that looks like a bug, but a
-- refusal.
-- ---------------------------------------------------------------

revoke all on public.quiz_cards from anon, authenticated;
revoke all on public.quiz_card_options from anon, authenticated;

grant select (id, objective_id, lesson_slug, position, question)
  on public.quiz_cards to authenticated;

grant select (card_id, option_id, text)
  on public.quiz_card_options to authenticated;

comment on column public.quiz_cards.explanation is
  'Shown only after the student answers, returned by the grading route. Never granted to the client.';
comment on column public.quiz_card_options.is_correct is
  'Never granted to the client. Grading is server-side with the service role.';
comment on constraint approved_requires_named_reviewer on public.quiz_cards is
  'A card reaches students only with a CFI name and date attached.';

-- ---------------------------------------------------------------
-- Report.
-- ---------------------------------------------------------------

select
  count(*) as total_cards,
  count(*) filter (where status = 'approved') as approved_cards,
  count(*) filter (where status = 'draft') as draft_cards
from public.quiz_cards;
