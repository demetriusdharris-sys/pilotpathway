// Turns the reviewed card documents in docs/cards/*.md into a sync migration.
//
//   node scripts/import-cards.mjs
//
// Writes supabase/migrations/0015_sync_quiz_cards.sql. That file is GENERATED:
// re-run this rather than editing it. Hand-editing is how the markdown a CFI
// reviewed and the rows a student sees drift apart.
//
// No dependencies, deliberately. The project has no TypeScript runner and
// adding one is outside the locked stack, so this is plain Node ESM.
//
// Everything imports as status 'draft'. Nothing here can approve a card —
// approval means a CFI's name and the date, written against the row.

import { writeFileSync } from "node:fs";
import { parseAllCardDocuments } from "./lib/cards.mjs";

const OUT = "supabase/migrations/0015_sync_quiz_cards.sql";

/** SQL single-quoted literal. */
function lit(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

let documents;
let skipped;
try {
  ({ documents, skipped } = parseAllCardDocuments());
} catch (error) {
  console.error(`import-cards: ${error.message}`);
  process.exit(1);
}

const cards = documents.flatMap((document) => document.cards);

const cardRows = cards
  .map(
    (c) =>
      `  (${lit(c.id)}, ${lit(c.objectiveId)}, ${lit(c.lessonSlug)}, ${c.position}, ${lit(c.question)}, ${lit(c.explanation)}, ${lit(c.visual)}, ${lit(c.flag)})`,
  )
  .join(",\n");

const optionRows = cards
  .flatMap((c) =>
    c.options.map(
      (o) =>
        `  (${lit(c.id)}, ${lit(o.optionId)}, ${lit(o.text)}, ${o.isCorrect})`,
    ),
  )
  .join(",\n");

const sql = `-- 0015: sync quiz cards from docs/cards/*.md.
--
-- GENERATED FILE. Do not hand-edit it. Regenerate with:
--
--     node scripts/import-cards.mjs
--
-- The reviewed markdown is the source of truth. Hand-editing this file is how
-- the document a CFI signed and the rows a student sees drift apart.
--
-- Safe to re-run. Two things it will never do:
--
--   * It never approves a card. Everything arrives as 'draft'. Approval means
--     a CFI's name and the date written against the row, and that is a human
--     act, not something an import can perform.
--   * It never silently keeps an approval alive across a content change. If a
--     card's question, options, explanation or visual changed since the last
--     import, the card is knocked back to 'draft' and its reviewer cleared —
--     an approval covers the words that were reviewed, not the id.
--
-- It also carries each card's FLAG FOR CFI line into author_note, so the review
-- page can show a CFI the doubt we wrote down rather than losing it. A NEW or
-- CHANGED flag resets the review; a REMOVED one does not. Requires 0029.
--
-- Cards that have disappeared from the markdown are retired, not deleted, so
-- a cut card stops reaching students without erasing that it existed.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create temp table incoming_cards (
  id text primary key,
  objective_id text not null,
  lesson_slug text not null,
  position integer not null,
  question text not null,
  explanation text not null,
  visual_description text,
  author_note text
);

insert into incoming_cards
  (id, objective_id, lesson_slug, position, question, explanation, visual_description, author_note)
values
${cardRows};

create temp table incoming_options (
  card_id text not null,
  option_id text not null,
  text text not null,
  is_correct boolean not null,
  primary key (card_id, option_id)
);

insert into incoming_options (card_id, option_id, text, is_correct)
values
${optionRows};

-- ---------------------------------------------------------------
-- Refuse to run if a card points at an objective that does not exist.
-- A typo in an objective id would otherwise import a card that can never be
-- scored against anything.
-- ---------------------------------------------------------------

do $check$
declare
  unknown_objectives text;
begin
  select string_agg(distinct i.objective_id, ', ' order by i.objective_id)
    into unknown_objectives
  from incoming_cards i
  where not exists (
    select 1 from public.learning_objectives o where o.id = i.objective_id
  );

  if unknown_objectives is not null then
    raise exception
      'Refusing to import: these objective ids do not exist in learning_objectives: %. Check the ids in docs/cards against the learning_objectives table.',
      unknown_objectives;
  end if;
end;
$check$;

-- ---------------------------------------------------------------
-- Cards. Content is overwritten; a content change resets the review.
-- ---------------------------------------------------------------

-- A NEW OR CHANGED FLAG ALSO RESETS THE REVIEW, but a REMOVED one does not.
-- The asymmetry is the point. A doubt added after an approval is a doubt the
-- reviewer never saw, so their approval no longer covers the card. A doubt
-- that disappeared is one they answered, and un-approving the card for that
-- would punish answering it — and loop forever, since the answer is what
-- removed it. Hence the "excluded.author_note is not null" guard rather than a
-- bare "is distinct from".

insert into public.quiz_cards
  (id, objective_id, lesson_slug, position, question, explanation, visual_description, author_note, status)
select id, objective_id, lesson_slug, position, question, explanation, visual_description, author_note, 'draft'
from incoming_cards
on conflict (id) do update set
  objective_id       = excluded.objective_id,
  lesson_slug        = excluded.lesson_slug,
  position           = excluded.position,
  question           = excluded.question,
  explanation        = excluded.explanation,
  visual_description = excluded.visual_description,
  author_note        = excluded.author_note,
  updated_at         = now(),
  status = case
    when public.quiz_cards.question is distinct from excluded.question
      or public.quiz_cards.explanation is distinct from excluded.explanation
      or public.quiz_cards.visual_description is distinct from excluded.visual_description
      or (excluded.author_note is not null
          and public.quiz_cards.author_note is distinct from excluded.author_note)
    then 'draft'
    else public.quiz_cards.status
  end,
  reviewed_by = case
    when public.quiz_cards.question is distinct from excluded.question
      or public.quiz_cards.explanation is distinct from excluded.explanation
      or public.quiz_cards.visual_description is distinct from excluded.visual_description
      or (excluded.author_note is not null
          and public.quiz_cards.author_note is distinct from excluded.author_note)
    then null
    else public.quiz_cards.reviewed_by
  end,
  reviewed_at = case
    when public.quiz_cards.question is distinct from excluded.question
      or public.quiz_cards.explanation is distinct from excluded.explanation
      or public.quiz_cards.visual_description is distinct from excluded.visual_description
      or (excluded.author_note is not null
          and public.quiz_cards.author_note is distinct from excluded.author_note)
    then null
    else public.quiz_cards.reviewed_at
  end;

-- ---------------------------------------------------------------
-- Options. Changed option text also invalidates a review.
-- ---------------------------------------------------------------

-- A card already sent back also returns to 'draft' when its options change:
-- the author has acted on the note, so it belongs in the waiting queue again
-- rather than sitting under "sent back" looking untouched.
update public.quiz_cards c
set status = 'draft', reviewed_by = null, reviewed_at = null, updated_at = now()
where c.status in ('approved', 'needs_changes')
  and exists (
    select 1
    from incoming_options i
    left join public.quiz_card_options o
      on o.card_id = i.card_id and o.option_id = i.option_id
    where i.card_id = c.id
      and (o.text is distinct from i.text or o.is_correct is distinct from i.is_correct)
  );

insert into public.quiz_card_options (card_id, option_id, text, is_correct)
select card_id, option_id, text, is_correct
from incoming_options
on conflict (card_id, option_id) do update set
  text       = excluded.text,
  is_correct = excluded.is_correct;

delete from public.quiz_card_options o
where exists (select 1 from incoming_cards i where i.id = o.card_id)
  and not exists (
    select 1 from incoming_options i
    where i.card_id = o.card_id and i.option_id = o.option_id
  );

-- ---------------------------------------------------------------
-- Retire what the documents no longer contain.
-- ---------------------------------------------------------------

update public.quiz_cards c
set status = 'retired', updated_at = now()
where c.status <> 'retired'
  and not exists (select 1 from incoming_cards i where i.id = c.id);

drop table incoming_cards;
drop table incoming_options;

-- ---------------------------------------------------------------
-- Report.
-- ---------------------------------------------------------------

select
  count(*) as total_cards,
  count(*) filter (where status = 'draft') as draft_cards,
  count(*) filter (where status = 'needs_changes') as sent_back_cards,
  count(*) filter (where status = 'approved') as approved_cards,
  count(*) filter (where status = 'retired') as retired_cards,
  -- The doubts we wrote down, now readable on the review page. If this is 0
  -- after a sync, the flags did not land and a CFI would review 17 cards blind.
  count(*) filter (where author_note is not null) as flags_carried
from public.quiz_cards;
`;

writeFileSync(OUT, sql, "utf8");

const gaps = cards.filter((c) => c.hasValueGap).length;
const flags = cards.filter((c) => c.hasOpenFlag).length;

console.log(`import-cards: ${documents.length} document(s) → ${OUT}`);
for (const document of documents) {
  console.log(`  ${document.file}: ${document.cards.length} cards`);
}
console.log(`  ${cards.length} cards, ${cards.length * 4} option rows (max)`);
console.log(
  `  ${gaps} card(s) still carry [CFI: confirm value], ${flags} still carry an open FLAG FOR CFI`,
);
console.log("  all imported as draft — nothing here approves a card");

if (skipped.length > 0) {
  console.log(`  ignored (not card documents): ${skipped.join(", ")}`);
}
