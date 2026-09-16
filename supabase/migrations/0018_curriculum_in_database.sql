-- 0018: lesson content moves into the database.
--
-- GENERATED ONCE by `node scripts/seed-curriculum.mjs` from the stages exported
-- by src/lib/curriculum.ts at the time. After this migration the database is
-- the source of truth for stage and lesson content; curriculum.ts is retired in
-- a later step. Edit lessons in the Supabase Table Editor, not here.
--
-- Why: lesson content was hardcoded, so fixing a typo meant a code change and a
-- deploy (architectural debt #1). Objectives already lived in the database
-- (0009/0010); this brings the lessons and stages that own them alongside.
--
-- Founder decisions, Sep 16 2026:
--   * The founder edits content in the Supabase Table Editor. No in-app editor
--     yet; that is a separate project, needed before CFIs can edit.
--   * Edits go live immediately, and every change is saved to
--     curriculum_edits so any edit can be undone.
--
-- Also enforced here, whatever anyone edits:
--   * Objective ids, lesson slugs and stage slugs cannot be changed. Mastery,
--     progress, tutor history and quiz cards all refer to them; changing one
--     would silently orphan a student's record.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

-- ---------------------------------------------------------------
-- Tables.
-- ---------------------------------------------------------------

create table public.curriculum_stages (
  slug text primary key,
  number integer not null unique check (number > 0),
  title text not null,
  tagline text not null,
  goal text not null,
  -- Planned topics for a stage that has no lessons written yet.
  outline text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.curriculum_lessons (
  slug text primary key,
  stage_slug text not null references public.curriculum_stages(slug),
  -- Order within the stage. Not unique, so two lessons can be swapped one
  -- edit at a time in the Table Editor; ties fall back to slug.
  position integer not null,
  title text not null,
  -- The one-line objective shown under the title. The detailed, permanent-id
  -- objectives are rows in learning_objectives.
  objective text not null,
  summary text not null,
  sources text[] not null
    check (cardinality(sources) > 0
           and sources <@ array['PHAK', 'AFH', 'AIM', '14 CFR']::text[]),
  -- ACS Areas of Operation BY NAME, never by task code.
  acs_areas text[] not null check (cardinality(acs_areas) > 0),
  topic text not null,
  -- An id from src/lib/instructor/history-cards.ts, or null. Reviewed history
  -- cards stay in code; an unknown id simply shows no card.
  history_card_id text,
  estimated_minutes integer not null check (estimated_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index curriculum_lessons_stage_idx
  on public.curriculum_lessons (stage_slug, position);

-- ---------------------------------------------------------------
-- Seed, from curriculum.ts.
-- ---------------------------------------------------------------

insert into public.curriculum_stages (slug, number, title, tagline, goal, outline)
values
  ('stage-1', 1, 'Foundations & Pre-Solo', 'Everything you need to know before you fly the airplane yourself.', 'Ready for dual instruction and first-solo knowledge.', array[]::text[]),
  ('stage-2', 2, 'Solo & Cross-Country', 'Going somewhere, and getting back.', 'Ready for solo cross-country knowledge and night operations.', array['Navigation and chart reading', 'Practical weather and go/no-go decisions', 'Cross-country flight planning', 'Night operations', 'Solo cross-country knowledge']::text[]),
  ('stage-3', 3, 'Checkride Ready', 'The oral, the judgment, and the confidence to walk in prepared.', 'Ready for the knowledge test and the practical test.', array['ACS oral preparation', 'Scenario-based judgment', 'Knowledge test review', 'Stage check readiness']::text[]);

insert into public.curriculum_lessons
  (slug, stage_slug, position, title, objective, summary, sources, acs_areas, topic, history_card_id, estimated_minutes)
values
  ('s1-welcome', 'stage-1', 1, 'Welcome to the flight deck', 'Explain the training path, the ACS, CFI vs AI, and what ''ready'' actually means.', 'What you are signing up for, who does what, and how you will know you are making progress.', array['14 CFR', 'PHAK']::text[], array['Preflight Preparation']::text[], 'Pilot qualifications and the training process', 'coleman', 20),
  ('s1-imsafe-pave', 'stage-1', 2, 'IMSAFE and PAVE — should we fly?', 'Use IMSAFE and PAVE before every lesson.', 'Two checklists that run on you and your situation, not the airplane. The first real pilot decision you will make.', array['PHAK', 'AIM']::text[], array['Preflight Preparation']::text[], 'Human factors and aeronautical decision making', 'bragg', 30),
  ('s1-airplane-parts', 'stage-1', 3, 'Airplane parts and what they do', 'Identify primary flight controls, flaps, landing gear, and powerplant at a trainer level.', 'Naming the pieces, and knowing what each one is for when you are standing at the airplane.', array['PHAK']::text[], array['Preflight Preparation']::text[], 'Airplanes and systems', 'latimer-engineering', 30),
  ('s1-four-forces', 'stage-1', 4, 'Four forces and why the wing flies', 'Explain lift, weight, thrust, and drag, and what happens when one changes.', 'The four forces, angle of attack, and why a stall is about angle — not speed.', array['PHAK']::text[], array['Preflight Preparation']::text[], 'Aerodynamics', null, 30),
  ('s1-axes-stability', 'stage-1', 5, 'Axes of flight and stability', 'Pitch, roll, and yaw; stability versus control.', 'How the airplane moves about three axes, and why a stable airplane wants to fly straight.', array['PHAK']::text[], array['Preflight Preparation']::text[], 'Aerodynamics', null, 25),
  ('s1-engines-fuel', 'stage-1', 6, 'Engine, fuel, and oil — what keeps you in the air', 'Describe a basic trainer fuel and oil system, and why fuel planning is non-negotiable.', 'Where the fuel goes, what the magnetos are for, and why running a tank dry is a decision, not an accident.', array['PHAK', 'AFH']::text[], array['Preflight Preparation']::text[], 'Airplanes and systems', null, 35),
  ('s1-pitot-static-gyro', 'stage-1', 7, 'Flight instruments you will live by', 'Pitot-static and gyroscopic instruments, and which fails how.', 'The six-pack, what drives each instrument, and how to spot one that is lying to you.', array['PHAK']::text[], array['Preflight Preparation']::text[], 'Airplanes and systems', null, 30),
  ('s1-airport-ramp', 'stage-1', 8, 'Airport, ramp, and runway language', 'Read a simple airport diagram: taxiways, hold short, run-up, active runway.', 'How to move around an airport without guessing — and without ending up somewhere you should not be.', array['PHAK', 'AIM']::text[], array['Airport and Seaplane Base Operations']::text[], 'Airport operations', 'community-airport', 35),
  ('s1-radio', 'stage-1', 9, 'Talking on the radio without freezing', 'Standard phraseology for taxi, takeoff, and pattern at towered and nontowered fields.', 'What to say, when to say it, and what to do when you say it wrong. Everyone sounds rough at first.', array['AIM']::text[], array['Airport and Seaplane Base Operations']::text[], 'Communications', 'willa-brown', 30),
  ('s1-airspace-intro', 'stage-1', 10, 'Airspace in plain English', 'Class B, C, D, E, and G — their purpose, who you talk to, and why they exist.', 'Classes of airspace, what each one asks of you, and how to tell which one you are in.', array['PHAK', 'AIM', '14 CFR']::text[], array['Preflight Preparation']::text[], 'Airports, airspace, and flight information', null, 40),
  ('s1-weather-intro', 'stage-1', 11, 'Weather that can end a first solo', 'Wind, visibility, ceiling, and convective weather; where to look it up and when to say no.', 'Why air moves, how clouds form, and the weather that decides whether you fly today.', array['PHAK']::text[], array['Preflight Preparation']::text[], 'Weather information', null, 45),
  ('s1-regs-pic', 'stage-1', 12, 'You are PIC — even as a student', 'Pilot-in-command authority and responsibility, careless and reckless operation, and student limitations.', 'The regulation that makes you the final authority, and what that actually costs you.', array['14 CFR', 'AIM']::text[], array['Preflight Preparation']::text[], 'Regulations and pilot qualifications', 'tuskegee', 35),
  ('s1-preflight', 'stage-1', 13, 'Preflight like it matters', 'Walk-around flow, required documents, the POH, and why ''good enough'' is not.', 'Airworthiness, the walkaround, and the habit of never taking someone''s word that the airplane is fine.', array['AFH', 'PHAK']::text[], array['Preflight Procedures']::text[], 'Preflight assessment', 'wasp', 35),
  ('s1-stalls', 'stage-1', 14, 'Stalls, spins, and angle of attack', 'Angle of attack, stall recognition, and recovery; spin awareness at knowledge level.', 'The most misunderstood idea in flying, and the one that matters most close to the ground.', array['PHAK', 'AFH']::text[], array['Slow Flight and Stalls']::text[], 'Slow flight, stalls, and spin awareness', null, 40),
  ('s1-pattern', 'stage-1', 15, 'The traffic pattern', 'Upwind, crosswind, downwind, base, and final; right-of-way basics.', 'The shape every airport flies, and how to fit into it without surprising anyone.', array['AIM', 'AFH', '14 CFR']::text[], array['Takeoffs, Landings, and Go-Arounds']::text[], 'Traffic patterns and right-of-way', null, 35),
  ('s1-solo-knowledge', 'stage-1', 16, 'Knowledge that stands between you and solo', 'What a CFI must see before endorsing solo — and why an AI cannot endorse.', 'The last knowledge checkpoint before the day the instructor gets out of the airplane.', array['14 CFR', 'AFH']::text[], array['Preflight Preparation']::text[], 'Solo requirements', 'coleman', 30);

-- Objectives now point at real lessons and stages. If any objective names a
-- lesson that was not seeded, this fails and the whole migration rolls back.
alter table public.learning_objectives
  add constraint learning_objectives_lesson_fk
    foreign key (lesson_slug) references public.curriculum_lessons(slug);

alter table public.learning_objectives
  add constraint learning_objectives_stage_fk
    foreign key (stage_slug) references public.curriculum_stages(slug);

-- ---------------------------------------------------------------
-- RLS: signed-in students read content. Nothing in the app writes it; the
-- Table Editor runs as a privileged role and is unaffected by RLS.
-- ---------------------------------------------------------------

alter table public.curriculum_stages  enable row level security;
alter table public.curriculum_lessons enable row level security;

create policy "Anyone signed in can read stages"
  on public.curriculum_stages for select to authenticated
  using (true);

create policy "Anyone signed in can read lessons"
  on public.curriculum_lessons for select to authenticated
  using (true);

-- ---------------------------------------------------------------
-- Identifiers cannot be changed.
-- ---------------------------------------------------------------

create or replace function public.forbid_identifier_change()
returns trigger
language plpgsql
set search_path to ''
as $$
declare
  column_name text := tg_argv[0];
begin
  if (to_jsonb(new) ->> column_name) is distinct from (to_jsonb(old) ->> column_name) then
    raise exception
      'The % of a row in % cannot be changed (it was %). Progress, mastery, tutor history and quiz cards refer to it, and changing it would orphan a student''s record. Edit the other columns instead.',
      column_name, tg_table_name, to_jsonb(old) ->> column_name;
  end if;
  return new;
end;
$$;

create trigger learning_objectives_id_is_permanent
  before update on public.learning_objectives
  for each row execute function public.forbid_identifier_change('id');

create trigger curriculum_lessons_slug_is_permanent
  before update on public.curriculum_lessons
  for each row execute function public.forbid_identifier_change('slug');

create trigger curriculum_stages_slug_is_permanent
  before update on public.curriculum_stages
  for each row execute function public.forbid_identifier_change('slug');

-- ---------------------------------------------------------------
-- updated_at keeps itself current on the two new tables.
-- ---------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger curriculum_stages_touch
  before update on public.curriculum_stages
  for each row execute function public.touch_updated_at();

create trigger curriculum_lessons_touch
  before update on public.curriculum_lessons
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Edit history. Every change to stages, lessons or objectives keeps a copy of
-- the row as it was, so a bad edit can be undone by copying old_row back.
-- ---------------------------------------------------------------

create table public.curriculum_edits (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_key text not null,
  action text not null check (action in ('update', 'delete')),
  old_row jsonb not null,
  new_row jsonb,
  -- The database role that made the change. In the Table Editor this is a
  -- privileged service role rather than a person; recorded anyway.
  edited_by text not null default current_user,
  edited_at timestamptz not null default now()
);

create index curriculum_edits_row_idx
  on public.curriculum_edits (table_name, row_key, edited_at desc);

-- No policies: nothing in the app reads or writes the history.
alter table public.curriculum_edits enable row level security;

create or replace function public.record_curriculum_edit()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  key_column text := tg_argv[0];
begin
  if tg_op = 'DELETE' then
    insert into public.curriculum_edits (table_name, row_key, action, old_row, new_row)
    values (tg_table_name, to_jsonb(old) ->> key_column, 'delete', to_jsonb(old), null);
    return old;
  end if;

  -- Ignore saves that change nothing but the timestamp — a re-run sync or an
  -- unchanged save must not bury real edits in noise.
  if (to_jsonb(old) - 'updated_at') is distinct from (to_jsonb(new) - 'updated_at') then
    insert into public.curriculum_edits (table_name, row_key, action, old_row, new_row)
    values (tg_table_name, to_jsonb(old) ->> key_column, 'update', to_jsonb(old), to_jsonb(new));
  end if;

  return new;
end;
$$;

create trigger curriculum_stages_history
  after update or delete on public.curriculum_stages
  for each row execute function public.record_curriculum_edit('slug');

create trigger curriculum_lessons_history
  after update or delete on public.curriculum_lessons
  for each row execute function public.record_curriculum_edit('slug');

create trigger learning_objectives_history
  after update or delete on public.learning_objectives
  for each row execute function public.record_curriculum_edit('id');

-- ---------------------------------------------------------------
-- Report. Expect 3 stages, 16 lessons, 48 linked objectives,
-- 0 lessons without objectives.
-- ---------------------------------------------------------------

select
  (select count(*) from public.curriculum_stages) as stages,
  (select count(*) from public.curriculum_lessons) as lessons,
  (select count(*) from public.learning_objectives o
     join public.curriculum_lessons l on l.slug = o.lesson_slug
     where o.retired_at is null) as linked_objectives,
  (select count(*) from public.curriculum_lessons l
     where not exists (
       select 1 from public.learning_objectives o
       where o.lesson_slug = l.slug and o.retired_at is null
     )) as lessons_without_objectives;
