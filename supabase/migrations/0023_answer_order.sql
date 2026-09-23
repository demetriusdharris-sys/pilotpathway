-- 0023: remember how the choices were shuffled for each answer.
--
-- Choices are presented in a different order on every attempt, so a student
-- who half-remembers "it was the second one" gains nothing. That only works if
-- we record the order we showed, because the student submits a POSITION and we
-- have to map it back to the real choice to grade it.
--
-- Stored as a three-letter permutation: 'BCA' means the student saw choice B
-- first, C second, A third. `selected_choice` stays canonical — the letter as
-- it lives in question_bank — so analysis never has to unpick the shuffle.
--
-- Not granted to students, alongside the rest of practice_answers: they are
-- written and read back server-side. A client that knew the mapping would not
-- learn the answer from it, but it has no reason to hold it either.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

alter table public.practice_answers
  add column choice_order char(3) not null default 'ABC';

alter table public.practice_answers
  add constraint choice_order_is_a_permutation
  check (choice_order in ('ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA'));

-- The default exists only so the column can be NOT NULL on a table that may
-- already hold rows. Every row written from here on names its own order.
alter table public.practice_answers
  alter column choice_order drop default;

comment on column public.practice_answers.choice_order is
  'The order the three choices were displayed in, e.g. BCA. selected_choice is stored canonically, never as the displayed position.';

-- ---------------------------------------------------------------
-- Report. Expect column_exists true, and 0 rows, since nothing has been
-- written to this table yet.
-- ---------------------------------------------------------------

select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'practice_answers'
      and column_name = 'choice_order'
  ) as column_exists,
  (select count(*) from public.practice_answers) as existing_answers;
