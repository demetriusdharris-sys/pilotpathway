// Turns the reviewed card documents in docs/cards/*.md into a sync migration.
//
//   node scripts/import-cards.mjs
//
// Writes supabase/migrations/0015_sync_quiz_cards.sql. That file is GENERATED:
// re-run this rather than editing it, the same way 0010 is regenerated from
// curriculum.ts. Hand-editing is how the markdown a CFI reviewed and the rows
// a student sees drift apart.
//
// No dependencies, deliberately. The project has no TypeScript runner and
// adding one is outside the locked stack, so this is plain Node ESM.
//
// Everything imports as status 'draft'. Nothing here can approve a card —
// approval means a CFI's name and the date, written against the row.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CARDS_DIR = "docs/cards";
const OUT = "supabase/migrations/0015_sync_quiz_cards.sql";

/** SQL single-quoted literal. */
function lit(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function fail(message) {
  console.error(`import-cards: ${message}`);
  process.exit(1);
}

/**
 * Pulls one `**Label:** value` field from a card block. Single line only —
 * every field in the card format is written on one line.
 */
function field(block, label) {
  const m = block.match(new RegExp(`^\\*\\*${label}:\\*\\* (.+)$`, "m"));
  return m ? m[1].trim() : null;
}

function parseCard(block, file) {
  const titleLine = block.split("\n", 1)[0].trim();

  const objectiveId = (block.match(/^\*\*Objective ID:\*\* `([^`]+)`$/m) ??
    [])[1];
  if (!objectiveId) fail(`${file}: card "${titleLine}" has no Objective ID`);

  const question = field(block, "Question");
  if (!question) fail(`${file}: card "${titleLine}" has no Question`);

  const explanation = field(block, "Explanation");
  if (!explanation) fail(`${file}: card "${titleLine}" has no Explanation`);

  // Optional. A card with no visual described yet is still importable.
  const visual = field(block, "Visual");

  const options = [
    ...block.matchAll(/^- \*\*[A-D]\.\*\* \(`(opt-[1-4])`\) (.+)$/gm),
  ].map((m) => ({ optionId: m[1], text: m[2].trim() }));

  if (options.length < 3 || options.length > 4) {
    fail(
      `${file}: card "${titleLine}" has ${options.length} options, expected 3 or 4`,
    );
  }

  const ids = new Set(options.map((o) => o.optionId));
  if (ids.size !== options.length) {
    fail(`${file}: card "${titleLine}" reuses an option id`);
  }

  const correct = (block.match(/^\*\*Correct answer:\*\* `(opt-[1-4])`$/m) ??
    [])[1];
  if (!correct) {
    fail(
      `${file}: card "${titleLine}" has no Correct answer, or it still names a letter`,
    );
  }
  if (!ids.has(correct)) {
    fail(
      `${file}: card "${titleLine}" marks ${correct} correct, but has no such option`,
    );
  }

  return {
    objectiveId,
    lessonSlug: objectiveId.split(".")[0],
    question,
    explanation,
    visual,
    options: options.map((o) => ({ ...o, isCorrect: o.optionId === correct })),
    // Carried for the report only: a card still carrying a value gap or an
    // open flag is not ready for a reviewer to approve.
    hasValueGap: block.includes("[CFI: confirm value]"),
    hasOpenFlag: /^\*\*FLAG FOR CFI:\*\*/m.test(block),
  };
}

function parseFile(file) {
  const raw = readFileSync(join(CARDS_DIR, file), "utf8");

  // Everything before the first card heading is the reviewer intro.
  const blocks = raw.split(/^### Card /m).slice(1);
  if (blocks.length === 0) fail(`${file}: no cards found`);

  const cards = blocks.map((b) => parseCard(b, file));

  // Position is the card's index within its objective, from 1, and the card
  // id is built from it. Stable across re-imports as long as card order in
  // the document is stable.
  const seen = new Map();
  for (const card of cards) {
    const n = (seen.get(card.objectiveId) ?? 0) + 1;
    seen.set(card.objectiveId, n);
    card.position = n;
    card.id = `${card.objectiveId}.c${n}`;
  }

  return cards;
}

const files = readdirSync(CARDS_DIR)
  .filter((f) => f.endsWith(".md") && f !== "AUTHORING-RULES.md")
  .sort();

if (files.length === 0) fail("no card documents found in docs/cards");

const cards = files.flatMap(parseFile);

const byId = new Set();
for (const card of cards) {
  if (byId.has(card.id)) fail(`duplicate card id ${card.id}`);
  byId.add(card.id);
}

const cardRows = cards
  .map(
    (c) =>
      `  (${lit(c.id)}, ${lit(c.objectiveId)}, ${lit(c.lessonSlug)}, ${c.position}, ${lit(c.question)}, ${lit(c.explanation)}, ${lit(c.visual)})`,
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
  visual_description text
);

insert into incoming_cards
  (id, objective_id, lesson_slug, position, question, explanation, visual_description)
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
      'Refusing to import: these objective ids do not exist in learning_objectives: %. Check the ids in docs/cards against curriculum.ts.',
      unknown_objectives;
  end if;
end;
$check$;

-- ---------------------------------------------------------------
-- Cards. Content is overwritten; a content change resets the review.
-- ---------------------------------------------------------------

insert into public.quiz_cards
  (id, objective_id, lesson_slug, position, question, explanation, visual_description, status)
select id, objective_id, lesson_slug, position, question, explanation, visual_description, 'draft'
from incoming_cards
on conflict (id) do update set
  objective_id       = excluded.objective_id,
  lesson_slug        = excluded.lesson_slug,
  position           = excluded.position,
  question           = excluded.question,
  explanation        = excluded.explanation,
  visual_description = excluded.visual_description,
  updated_at         = now(),
  status = case
    when public.quiz_cards.question is distinct from excluded.question
      or public.quiz_cards.explanation is distinct from excluded.explanation
      or public.quiz_cards.visual_description is distinct from excluded.visual_description
    then 'draft'
    else public.quiz_cards.status
  end,
  reviewed_by = case
    when public.quiz_cards.question is distinct from excluded.question
      or public.quiz_cards.explanation is distinct from excluded.explanation
      or public.quiz_cards.visual_description is distinct from excluded.visual_description
    then null
    else public.quiz_cards.reviewed_by
  end,
  reviewed_at = case
    when public.quiz_cards.question is distinct from excluded.question
      or public.quiz_cards.explanation is distinct from excluded.explanation
      or public.quiz_cards.visual_description is distinct from excluded.visual_description
    then null
    else public.quiz_cards.reviewed_at
  end;

-- ---------------------------------------------------------------
-- Options. Changed option text also invalidates a review.
-- ---------------------------------------------------------------

update public.quiz_cards c
set status = 'draft', reviewed_by = null, reviewed_at = null, updated_at = now()
where c.status = 'approved'
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
  count(*) filter (where status = 'approved') as approved_cards,
  count(*) filter (where status = 'retired') as retired_cards
from public.quiz_cards;
`;

writeFileSync(OUT, sql, "utf8");

const gaps = cards.filter((c) => c.hasValueGap).length;
const flags = cards.filter((c) => c.hasOpenFlag).length;

console.log(`import-cards: ${files.length} document(s) → ${OUT}`);
for (const file of files) {
  const n = parseFile(file).length;
  console.log(`  ${file}: ${n} cards`);
}
console.log(`  ${cards.length} cards, ${cards.length * 4} option rows (max)`);
console.log(
  `  ${gaps} card(s) still carry [CFI: confirm value], ${flags} still carry an open FLAG FOR CFI`,
);
console.log("  all imported as draft — nothing here approves a card");
