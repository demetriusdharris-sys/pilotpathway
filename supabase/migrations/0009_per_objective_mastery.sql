-- 0009: per-objective mastery.
--
-- Two evidence streams with a hard wall between them:
--   objective_signals — Captain Path's read of a conversation. Drives adaptive
--     tutoring only. AI-inferred, never reportable.
--   objective_assessments — scored quiz answers. The only stream that feeds a
--     report a district or CFI will see.
--
-- The wall is structural: the reportable view reads only from assessments, so
-- a dashboard query cannot pull in inferred mastery by mistake.
--
-- Both streams are append-only. Mastery is computed, never stored, so the
-- weighting can change without a migration and without rewriting history.

-- ---------------------------------------------------------------
-- Objectives. Mirrored from src/lib/curriculum.ts, which stays the
-- source of truth. Rows are retired, never deleted, so mastery
-- history survives a curriculum edit.
-- ---------------------------------------------------------------

create table public.learning_objectives (
  id text primary key,
  lesson_slug text not null,
  stage_slug text not null,
  position integer not null,
  text text not null,
  is_safety_critical boolean not null default false,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learning_objectives_lesson_idx
  on public.learning_objectives (lesson_slug) where retired_at is null;

-- ---------------------------------------------------------------
-- Stream 1: conversation signal. Not reportable.
-- ---------------------------------------------------------------

create table public.objective_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_id text not null references public.learning_objectives(id),
  reading text not null check (reading in ('solid', 'shaky', 'missing')),
  -- How much weight this single read deserves. One exchange is weaker
  -- evidence than a sustained thread; the schema should say so rather
  -- than flatten both into 'passed'.
  confidence text not null default 'low'
    check (confidence in ('low', 'medium', 'high')),
  lesson_slug text,
  observed_at timestamptz not null default now()
);

create index objective_signals_user_objective_idx
  on public.objective_signals (user_id, objective_id, observed_at desc);

-- ---------------------------------------------------------------
-- Stream 2: scored evidence. Reportable.
-- ---------------------------------------------------------------

create table public.objective_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_id text not null references public.learning_objectives(id),
  is_correct boolean not null,
  question_text text not null,
  student_answer text,
  lesson_slug text,
  assessed_at timestamptz not null default now()
);

create index objective_assessments_user_objective_idx
  on public.objective_assessments (user_id, objective_id, assessed_at desc);

-- ---------------------------------------------------------------
-- Computed mastery. Reportable stream only.
-- security_invoker so the caller's RLS applies — the view does not
-- become a way around row policies.
-- ---------------------------------------------------------------

create view public.objective_mastery
with (security_invoker = true)
as
select
  a.user_id,
  a.objective_id,
  o.lesson_slug,
  o.is_safety_critical,
  count(*) as attempts,
  count(*) filter (where a.is_correct) as correct,
  max(a.assessed_at) as last_assessed_at,
  -- Three correct out of the last attempts, with no recent miss, is the
  -- working definition. Deliberately simple and deliberately in a view.
  (count(*) filter (where a.is_correct) >= 3
   and bool_and(a.is_correct) filter (
     where a.assessed_at > now() - interval '90 days'
   )) as is_mastered
from public.objective_assessments a
join public.learning_objectives o on o.id = a.objective_id
group by a.user_id, a.objective_id, o.lesson_slug, o.is_safety_critical;

-- ---------------------------------------------------------------
-- RLS.
-- ---------------------------------------------------------------

alter table public.learning_objectives   enable row level security;
alter table public.objective_signals     enable row level security;
alter table public.objective_assessments enable row level security;

create policy "Anyone signed in can read active objectives"
  on public.learning_objectives for select to authenticated
  using (retired_at is null);

-- Signals are written by the tutor route with the service role, never
-- by the client. Students can read their own.
create policy "Students read their own signals"
  on public.objective_signals for select to authenticated
  using (user_id = auth.uid());

-- Assessments: students read their own; staff read them for students in
-- their org with active school_progress consent. Same gate as milestones.
create policy "Students read their own assessments"
  on public.objective_assessments for select to authenticated
  using (
    user_id = auth.uid()
    or (
      public.shares_org_with(user_id)
      and public.has_active_consent(user_id, 'school_progress')
    )
  );

comment on table public.objective_signals is
  'AI-inferred. Adaptive tutoring only. Never feeds a district or CFI report.';
comment on table public.objective_assessments is
  'Scored evidence. The only mastery stream that is reportable.';
comment on view public.objective_mastery is
  'Computed from assessments only, by design. Signals are excluded structurally.';
