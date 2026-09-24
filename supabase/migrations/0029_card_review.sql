-- 0029: reviewing quiz cards in the app, the way 0028 did for questions.
--
-- 144 drafted cards are the single biggest thing between this product and
-- outcome data for a school, and until now approving one meant the founder
-- hand-pasting SQL out of docs/cards/recording-approvals.md after an email
-- exchange. That costs twice: a CFI's review time becomes transcription time,
-- and every transcription is a chance to approve wording that is not quite
-- what was actually reviewed.
--
-- This mirrors 0028 onto quiz_cards. Card ids are text, not uuid.
--
-- WHY A CARD CARRIES THE AUTHOR'S DOUBT. 17 of the 144 cards have a
-- `FLAG FOR CFI:` line in the markdown — a specific thing we were unsure of,
-- written down. The parser has always extracted it and the printed packet has
-- always shown it, but 0015 never carried it into the database. A review page
-- reading the database alone would therefore let a CFI approve exactly the 17
-- cards that most need a person, without ever showing them our doubt. So
-- `author_note` exists, and the regenerated 0015 fills it.
--
-- A FLAG AND A VALUE GAP ARE DIFFERENT, and this migration treats them
-- differently on purpose:
--
--   - `[CFI: confirm value]` BLOCKS approval. It is a placeholder that would
--     render to a student as written.
--   - `FLAG FOR CFI` does NOT block approval — it is a question *for* the
--     reviewer, and answering it is what approving means. Blocking it would
--     make those 17 cards unapprovable without a code change.
--   - But approving a flagged card REQUIRES a note, which is the reviewer's
--     answer to the doubt. Otherwise the doubt sits in the markdown forever
--     and nobody knows whether anyone considered it.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

alter table public.quiz_cards
  drop constraint quiz_cards_status_check;

alter table public.quiz_cards
  add constraint quiz_cards_status_check
  check (status in ('draft', 'needs_changes', 'approved', 'retired'));

-- `needs_changes` is not servable. 0014's SELECT policy is `status =
-- 'approved'`, so it is invisible to students with no policy change at all.

alter table public.quiz_cards
  add column review_note text,
  add column review_note_at timestamptz,
  add column author_note text;

comment on column public.quiz_cards.review_note is
  'What the reviewer said: the required fix when sent back, or their answer to author_note when approved. Never shown to a student.';

comment on column public.quiz_cards.author_note is
  'The FLAG FOR CFI line from the card markdown — our own doubt, written down. Filled by the regenerated 0015 sync, never by hand.';

-- ---------------------------------------------------------------
-- Who may review, for content of any kind.
--
-- 0028 named this function for questions because questions were all it
-- governed. Cards need the same answer, and two functions that must agree is
-- a bug waiting to happen — so the general one is the definition and the
-- question-shaped name delegates to it. Both keep working, and 0028's
-- review_question needs no change.
-- ---------------------------------------------------------------

create or replace function public.may_review_content()
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

comment on function public.may_review_content() is
  'Reviewers are mentors (where a CFI account sits) and admins. Governs quiz cards and practice questions alike.';

create or replace function public.may_review_questions()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select public.may_review_content();
$$;

comment on function public.may_review_questions() is
  'Kept for 0028. Delegates to may_review_content() so there is one definition of who may review.';

-- ---------------------------------------------------------------
-- The one way a card changes state.
-- ---------------------------------------------------------------

create or replace function public.review_card(
  p_card_id text,
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
  v_note   text;
  v_gap    boolean;
  v_flag   boolean;
begin
  if not public.may_review_content() then
    raise exception 'Only a flight instructor or an administrator can review cards.';
  end if;

  if coalesce(trim(p_reviewer), '') = '' then
    raise exception 'Say who is approving this — a name and certificate number.';
  end if;

  if p_decision not in ('approve', 'needs_changes', 'retire') then
    raise exception 'Unknown decision: %', p_decision;
  end if;

  v_note := nullif(trim(coalesce(p_note, '')), '');

  if p_decision = 'needs_changes' and v_note is null then
    raise exception 'Say what needs changing — the note is the whole point of sending it back.';
  end if;

  -- Read the card's own state once. A missing card is reported as such rather
  -- than falling through the gap and flag checks as though it were clean.
  select
    (c.question like '%[CFI: confirm value]%'
     or c.explanation like '%[CFI: confirm value]%'
     or coalesce(c.visual_description, '') like '%[CFI: confirm value]%'
     or exists (
       select 1 from public.quiz_card_options o
       where o.card_id = c.id
         and o.text like '%[CFI: confirm value]%'
     )),
    (coalesce(c.author_note, '') <> '')
  into v_gap, v_flag
  from public.quiz_cards c
  where c.id = p_card_id;

  if not found then
    raise exception 'No such card.';
  end if;

  if p_decision = 'approve' then
    if v_gap then
      raise exception 'This card still has a [CFI: confirm value] gap. Fill the value in the card document first.';
    end if;

    -- The flag does not block the approval; leaving it unanswered does. The
    -- reviewer's sentence is the answer, and it goes on the record.
    if v_flag and v_note is null then
      raise exception 'This card carries a flagged doubt. Answer it in the note, and your answer is recorded with the approval.';
    end if;
  end if;

  v_status := case p_decision
    when 'approve' then 'approved'
    when 'needs_changes' then 'needs_changes'
    else 'retired'
  end;

  update public.quiz_cards c
  set status = v_status,
      reviewed_by = case when p_decision = 'approve' then p_reviewer else c.reviewed_by end,
      reviewed_at = case when p_decision = 'approve' then now() else c.reviewed_at end,
      -- Unlike review_question, a note survives an approval: on a flagged card
      -- it is the CFI's answer to our doubt, which is worth more than the flag.
      review_note = case when p_decision = 'retire' then null else v_note end,
      review_note_at = case
        when p_decision = 'retire' then null
        when v_note is not null then now()
        else null
      end,
      updated_at = now()
  where c.id = p_card_id;
end;
$$;

revoke all on function public.review_card(text, text, text, text) from public, anon;
grant execute on function public.review_card(text, text, text, text) to authenticated;

comment on function public.review_card(text, text, text, text) is
  'Approve, send back with a note, or retire a quiz card. Refuses to approve one carrying a [CFI: confirm value] gap, and refuses to approve a flagged card without an answering note.';

-- ---------------------------------------------------------------
-- NO EXTRA GRANTS, DELIBERATELY — same reason as 0028.
--
-- A reviewer has to see which option is correct and read the explanation, and
-- `quiz_card_options.is_correct` and `quiz_cards.explanation` are ungranted so
-- a student cannot. Granting them here would hand the answer key to every
-- student in the app, because a GRANT is role-wide and RLS restricts rows
-- rather than columns. That is 0014's bug exactly.
--
-- The review page reads with the service role, in server code, after checking
-- the caller's role.
--
-- `status` stays granted (0016 needed it for the options policy) and
-- `needs_changes` being visible to a student is harmless: the policy still
-- returns approved rows only, so there is nothing to read.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- Report. author_note is 0 until the regenerated 0015 is re-applied — that is
-- expected, and it is the next step, not a failure.
-- ---------------------------------------------------------------

select
  to_regprocedure('public.may_review_content()') is not null as content_function,
  to_regprocedure('public.review_card(text,text,text,text)') is not null as review_card_function,
  (select count(*) from public.quiz_cards where status = 'draft') as cards_waiting,
  (select count(*) from public.quiz_cards where author_note is not null) as flags_carried;
