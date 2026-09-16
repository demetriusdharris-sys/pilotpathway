// One-time generator for supabase/migrations/0018_curriculum_in_database.sql.
//
//   node scripts/seed-curriculum.mjs
//
// Reads the live `stages` value out of src/lib/curriculum.ts — by compiling it
// with the project's own TypeScript compiler and importing the result, rather
// than pattern-matching the file's text — and writes the migration that moves
// stages and lessons into the database.
//
// After 0018, the database is the source of truth for lesson content and
// curriculum.ts is retired. This script is kept only as the record of how the
// seed was produced, and goes when curriculum.ts does.

import ts from "typescript";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SOURCE = "src/lib/curriculum.ts";
const OUT = "supabase/migrations/0018_curriculum_in_database.sql";

const compiled = ts.transpileModule(readFileSync(SOURCE, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const dir = mkdtempSync(join(tmpdir(), "pilotpathway-curriculum-"));
const file = join(dir, "curriculum.mjs");
writeFileSync(file, compiled, "utf8");

const { stages } = await import(pathToFileURL(file).href);

function fail(message) {
  console.error(`seed-curriculum: ${message}`);
  process.exit(1);
}

if (!Array.isArray(stages) || stages.length === 0) {
  fail("curriculum.ts exported no stages");
}

/** SQL string literal. */
function lit(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** SQL text[] literal. */
function arr(values) {
  return `array[${values.map(lit).join(", ")}]::text[]`;
}

const SOURCES = new Set(["PHAK", "AFH", "AIM", "14 CFR"]);

const stageRows = [];
const lessonRows = [];
const lessonSlugs = new Set();
let objectiveCount = 0;

for (const stage of stages) {
  stageRows.push(
    `  (${lit(stage.slug)}, ${stage.number}, ${lit(stage.title)}, ${lit(stage.tagline)}, ${lit(stage.goal)}, ${arr(stage.outline ?? [])})`,
  );

  stage.lessons.forEach((lesson, index) => {
    if (lessonSlugs.has(lesson.slug)) fail(`duplicate lesson slug ${lesson.slug}`);
    lessonSlugs.add(lesson.slug);

    for (const source of lesson.sources) {
      if (!SOURCES.has(source)) fail(`${lesson.slug}: unknown source ${source}`);
    }
    if (!Number.isInteger(lesson.estimatedMinutes) || lesson.estimatedMinutes <= 0) {
      fail(`${lesson.slug}: bad estimatedMinutes`);
    }

    objectiveCount += lesson.objectives.length;

    lessonRows.push(
      `  (${lit(lesson.slug)}, ${lit(stage.slug)}, ${index + 1}, ${lit(lesson.title)}, ${lit(lesson.objective)}, ${lit(lesson.summary)}, ${arr(lesson.sources)}, ${arr(lesson.acsAreas)}, ${lit(lesson.topic)}, ${lit(lesson.historyCardId ?? null)}, ${lesson.estimatedMinutes})`,
    );
  });
}

const sql = `-- 0018: lesson content moves into the database.
--
-- GENERATED ONCE by \`node scripts/seed-curriculum.mjs\` from the stages exported
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
${stageRows.join(",\n")};

insert into public.curriculum_lessons
  (slug, stage_slug, position, title, objective, summary, sources, acs_areas, topic, history_card_id, estimated_minutes)
values
${lessonRows.join(",\n")};

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
-- Report. Expect ${stages.length} stages, ${lessonRows.length} lessons, ${objectiveCount} linked objectives,
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
`;

writeFileSync(OUT, sql, "utf8");

console.log(`seed-curriculum: wrote ${OUT}`);
console.log(`  ${stages.length} stages, ${lessonRows.length} lessons, ${objectiveCount} objectives referenced`);
