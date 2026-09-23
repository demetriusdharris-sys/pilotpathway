-- 0026: what the question bank needs to be authored in files.
--
-- Questions are written in markdown under docs/questions/, reviewed there, and
-- synced into the database — the same pipeline the lesson quiz cards use, for
-- the same reason: 400 questions without one is a pile rather than a
-- reviewable batch, and a CFI reviewing a database table is a CFI who will
-- stop reviewing.
--
-- Three things:
--
--   1. `source_key` — the stable id a sync upserts against. `question_bank.id`
--      is a generated uuid, which is fine for rows and useless for matching a
--      file to a row. The key is written in the document and never changes.
--
--   2. `source_note` — what the author checked the question against, for the
--      reviewer. A CFI verifying one claim against one named passage works in
--      minutes; reconstructing the author's reasoning takes an hour. Not
--      granted to students; it is review scaffolding, not teaching.
--
--   3. A trigger that **un-approves a question whenever its content changes**.
--      The card sync does this in SQL, which works only for content arriving
--      through the sync. A trigger binds every path — a fix typed into the
--      Table Editor, a script, anything. An approval covers the words that
--      were reviewed, not the row.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

alter table public.question_bank
  add column source_key text,
  add column source_note text;

create unique index question_bank_source_key_idx
  on public.question_bank (source_key)
  where source_key is not null;

comment on column public.question_bank.source_key is
  'Stable id from the authoring document, e.g. PA.I.C.K1.q3. What the sync upserts against. Never reuse one for different content.';
comment on column public.question_bank.source_note is
  'For the reviewing CFI: what this was written from. Never shown to a student.';

create or replace function public.unapprove_changed_question()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  -- Only content matters. Re-running a sync that changes nothing, or a
  -- reviewer approving a row, must not knock it back to draft.
  if old.stem is distinct from new.stem
     or old.choice_a is distinct from new.choice_a
     or old.choice_b is distinct from new.choice_b
     or old.choice_c is distinct from new.choice_c
     or old.correct_choice is distinct from new.correct_choice
     or old.explanation is distinct from new.explanation
     or old.figure_ref is distinct from new.figure_ref
     or old.acs_code is distinct from new.acs_code
  then
    new.review_status := 'draft';
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger question_bank_content_change
  before update on public.question_bank
  for each row execute function public.unapprove_changed_question();

comment on function public.unapprove_changed_question() is
  'An approval covers the words that were reviewed. Any content change resets the row to draft and clears the reviewer, whatever path the change arrived by.';

-- ---------------------------------------------------------------
-- Report. Expect both columns present, the index there, and the trigger
-- installed. The bank is empty, so 0 rows either way.
-- ---------------------------------------------------------------

select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'question_bank'
      and column_name in ('source_key', 'source_note')) as new_columns,
  to_regclass('public.question_bank_source_key_idx') is not null as source_key_indexed,
  exists (select 1 from pg_trigger where tgname = 'question_bank_content_change') as reset_trigger_installed,
  (select count(*) from public.question_bank) as questions_in_bank;
