// Turns the diagram catalogue into a sync migration:
//
//     node scripts/import-diagrams.mjs
//
// Writes supabase/migrations/0043_sync_lesson_diagrams.sql. Regenerate it after
// editing the catalogue; never hand-edit the migration, and re-apply it in the
// SQL Editor or the change exists only in the repo.
//
// Safe to re-run. It never approves anything, and a changed title or caption
// knocks the diagram back to draft and clears its reviewer — an approval covers
// the words that were reviewed, the same rule the cards follow.
//
// Plain Node with TypeScript stripping, which is why the catalogue carries no
// JSX. The drawings live beside it in src/components/diagrams and are joined by
// key at render time.

import { writeFileSync } from "node:fs";
import { DIAGRAMS } from "../src/lib/diagrams/catalogue.ts";

const OUT = "supabase/migrations/0043_sync_lesson_diagrams.sql";

function lit(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

const seen = new Set();

for (const entry of DIAGRAMS) {
  if (seen.has(entry.key)) {
    console.error(`import-diagrams: two diagrams share the key ${entry.key}`);
    process.exit(1);
  }
  seen.add(entry.key);

  for (const field of ["key", "lessonSlug", "title", "caption"]) {
    if (!entry[field] || String(entry[field]).trim() === "") {
      console.error(`import-diagrams: ${entry.key} has no ${field}`);
      process.exit(1);
    }
  }
}

const rows = DIAGRAMS.map(
  (entry) =>
    `  (${lit(entry.key)}, ${lit(entry.lessonSlug)}, ${entry.position}, ${lit(entry.title)}, ${lit(entry.caption)}, ${lit(entry.sourceNote)})`,
).join(",\n");

const sql = `-- GENERATED FILE. Do not hand-edit it. Regenerate with:
--
--     node scripts/import-diagrams.mjs
--
-- The catalogue in src/lib/diagrams/catalogue.ts is the source of truth, and
-- the drawings are React components joined to it by key. This file carries only
-- what a reviewer reads and what a student reads underneath the picture.
--
-- Safe to re-run. Two things it will never do:
--
--   * It never approves a diagram. Everything arrives as 'draft', and a diagram
--     asserts facts — the four forces are only equal in unaccelerated flight,
--     and a picture that implied otherwise teaches something to unlearn.
--   * It never keeps an approval alive across a wording change. A changed title
--     or caption knocks the diagram back to draft and clears its reviewer.
--
-- Diagrams dropped from the catalogue are retired, not deleted.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create temp table incoming_diagrams (
  diagram_key text primary key,
  lesson_slug text not null,
  position integer not null,
  title text not null,
  caption text not null,
  source_note text
);

insert into incoming_diagrams
  (diagram_key, lesson_slug, position, title, caption, source_note)
values
${rows};

-- ---------------------------------------------------------------
-- Refuse to run if a diagram points at a lesson that does not exist. A typo in
-- a slug would otherwise import a diagram nobody ever sees.
-- ---------------------------------------------------------------

do $check$
declare
  unknown_lessons text;
begin
  select string_agg(distinct i.lesson_slug, ', ' order by i.lesson_slug)
    into unknown_lessons
  from incoming_diagrams i
  where not exists (
    select 1 from public.curriculum_lessons l where l.slug = i.lesson_slug
  );

  if unknown_lessons is not null then
    raise exception
      'Refusing to import: these lesson slugs do not exist: %.', unknown_lessons;
  end if;
end;
$check$;

insert into public.lesson_diagrams
  (diagram_key, lesson_slug, position, title, caption, source_note, status)
select diagram_key, lesson_slug, position, title, caption, source_note, 'draft'
from incoming_diagrams
on conflict (diagram_key) do update set
  lesson_slug = excluded.lesson_slug,
  position    = excluded.position,
  title       = excluded.title,
  caption     = excluded.caption,
  source_note = excluded.source_note,
  updated_at  = now(),
  status = case
    when public.lesson_diagrams.title is distinct from excluded.title
      or public.lesson_diagrams.caption is distinct from excluded.caption
    then 'draft'
    else public.lesson_diagrams.status
  end,
  reviewed_by = case
    when public.lesson_diagrams.title is distinct from excluded.title
      or public.lesson_diagrams.caption is distinct from excluded.caption
    then null
    else public.lesson_diagrams.reviewed_by
  end,
  reviewed_at = case
    when public.lesson_diagrams.title is distinct from excluded.title
      or public.lesson_diagrams.caption is distinct from excluded.caption
    then null
    else public.lesson_diagrams.reviewed_at
  end;

update public.lesson_diagrams d
set status = 'retired', updated_at = now()
where d.status <> 'retired'
  and not exists (
    select 1 from incoming_diagrams i where i.diagram_key = d.diagram_key
  );

drop table incoming_diagrams;

-- ---------------------------------------------------------------
-- Report.
-- ---------------------------------------------------------------

select
  count(*) as total_diagrams,
  count(*) filter (where status = 'draft') as draft_diagrams,
  count(*) filter (where status = 'approved') as approved_diagrams,
  count(*) filter (where status = 'retired') as retired_diagrams
from public.lesson_diagrams;
`;

writeFileSync(OUT, sql, "utf8");

console.log(`import-diagrams: ${DIAGRAMS.length} diagram(s) → ${OUT}`);
for (const entry of DIAGRAMS) {
  console.log(`  ${entry.key} → ${entry.lessonSlug}`);
}
console.log("  all imported as draft — nothing here approves a diagram");
