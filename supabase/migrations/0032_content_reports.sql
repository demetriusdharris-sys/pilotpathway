-- 0032: a student can say "this looks wrong".
--
-- The point of a beta is finding what is broken. Until now a student who spotted
-- a wrong regulation had to email demetrius@pilotpathway.ai and hope — nothing
-- tied to the card, question or reply they were looking at, and no queue. A beta
-- you cannot capture findings from is a beta you run twice.
--
-- WHY THE TUTOR MATTERS MOST HERE. Quiz cards and practice questions are read by
-- a CFI before any student sees them. Tutor replies are not: Captain Path
-- generates fresh text every turn, and "never invent regulations" is a prompt
-- instruction rather than a guarantee. The one surface with no review step is
-- the one most likely to put a wrong fact in front of a learner.
--
-- A REPORT NEVER CHANGES CONTENT STATE, AND MUST NOT LEARN TO.
--
-- It would be tempting to flip a reported card to 'needs_changes' so it appears
-- in the CFI's queue automatically. That would let any student remove content
-- from every other student by reporting it — a denial of service on the
-- curriculum, available to anyone with an account. A report is a claim. A human
-- reads it and decides what reaches the reviewer.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create table public.content_reports (
  id bigint generated always as identity primary key,

  -- Nullable with ON DELETE SET NULL on purpose. A correction is worth keeping
  -- after its author deletes their account, and the report's substance is not
  -- personal data — but the id is, so deletion removes it. Nullable from the
  -- start, because 0017 is the migration that had to fix NOT NULL paired with
  -- SET NULL after an account deletion failed on it.
  reporter_user_id uuid references auth.users(id) on delete set null,

  subject_kind text not null
    check (subject_kind in ('quiz_card', 'practice_question', 'tutor_message')),

  -- Text rather than uuid: a quiz card id is text and a question id is a uuid.
  -- One column holding the printed form of each keeps this table from growing a
  -- column per content type.
  --
  -- For a tutor reply there is no id the browser could know, so the server puts
  -- a hash of the reply text here. That is what makes the one-per-person index
  -- below work for generated content: the same student reporting the same reply
  -- twice collides, and two students reporting the same reply do not.
  subject_id text not null,

  -- Where they were when they reported it. Context for whoever triages, and the
  -- only way to find a tutor reply again.
  lesson_slug text,

  -- What the student was actually looking at, snapshotted.
  --
  -- Two reasons this is not just a join away. A card's wording can be edited
  -- before anyone triages the report, so the row alone cannot tell you what was
  -- on screen when the student objected. And a tutor reply is generated text —
  -- it exists in instructor_messages, but a student reporting one has no id for
  -- it, so for those this excerpt is the content.
  subject_excerpt text
    check (subject_excerpt is null or length(subject_excerpt) <= 1000),

  reason text not null
    check (length(btrim(reason)) between 1 and 2000),

  status text not null default 'new'
    check (status in ('new', 'triaged', 'actioned', 'dismissed')),

  -- What the triager concluded. Not shown to the student — there is no screen
  -- for that yet, and promising a reply we cannot deliver would be worse than
  -- saying nothing.
  triage_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.content_reports is
  'Student reports that a card, question or tutor reply looks wrong. A claim, never an action: nothing here changes content state, because a report that unapproved content would let one student remove it from everyone.';

-- One report per person per item. Stops a student filing the same complaint
-- forty times, and makes "you have already reported this" a clean state rather
-- than something the application has to remember.
create unique index content_reports_one_per_person
  on public.content_reports (reporter_user_id, subject_kind, subject_id)
  where reporter_user_id is not null;

create index content_reports_open_idx
  on public.content_reports (created_at desc) where status = 'new';

alter table public.content_reports enable row level security;

-- ---------------------------------------------------------------
-- No policies, deliberately.
--
-- Writes go through a Server Action with the service role, which is what lets
-- the daily cap and the duplicate check be enforced in one place. A student
-- inserting directly could also set `status` or `triage_note`, and a report that
-- arrives pre-triaged is worse than no report.
--
-- Reads are the admin page, also with the service role, after checking the
-- caller's role. Nothing here is reachable from a browser in either direction.
-- ---------------------------------------------------------------

revoke all on public.content_reports from anon, authenticated;

-- ---------------------------------------------------------------
-- Report. Expect table true, rls_on true, rows 0, policies 0.
-- ---------------------------------------------------------------

select
  to_regclass('public.content_reports') is not null as table_exists,
  (select relrowsecurity from pg_class where oid = 'public.content_reports'::regclass) as rls_on,
  (select count(*) from public.content_reports) as row_count,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'content_reports') as policy_count;
