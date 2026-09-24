// Turns the question documents in docs/questions/*.md into a sync migration.
//
//     node scripts/import-questions.mjs
//
// Writes supabase/migrations/0027_sync_question_bank.sql. That file is
// GENERATED: re-run this rather than editing it. Hand-editing is how the
// markdown a CFI reviewed and the rows a student answers drift apart.
//
// Everything lands as draft. Nothing here can approve a question — approval is
// a CFI's name and the date, written against the row, and 0026's trigger sends
// a question back to draft the moment its content changes, whatever changed
// it.

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { parseAllQuestionDocuments } from "./lib/questions.mjs";

const ACS_INDEX = "docs/reference/acs-codes.json";

const OUT = "supabase/migrations/0027_sync_question_bank.sql";

function lit(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Every ACS code the FAA document actually contains, so an invented or stale
 * one is refused here rather than ending up on a student's report. Built by
 * scripts/build-acs-index.mjs from the ACS PDF in docs/reference.
 */
function loadAcsCodes() {
  if (!existsSync(ACS_INDEX)) {
    console.error(`import-questions: ${ACS_INDEX} is missing.`);
    console.error("  Run: node scripts/build-acs-index.mjs");
    process.exit(1);
  }

  const index = JSON.parse(readFileSync(ACS_INDEX, "utf8"));
  return new Set(Object.keys(index.codes ?? {}));
}

const acsCodes = loadAcsCodes();

let documents;
let skipped;

try {
  ({ documents, skipped } = parseAllQuestionDocuments());
} catch (error) {
  console.error(`import-questions: ${error.message}`);
  process.exit(1);
}

const questions = documents.flatMap((document) =>
  document.questions.map((question) => ({
    ...question,
    authoredBy: document.authoredBy,
  })),
);

if (questions.length === 0) {
  console.error(
    "import-questions: no questions found in docs/questions — nothing to sync",
  );
  process.exit(1);
}

// A code the ACS does not contain is the exact failure these rules exist to
// prevent: it looks official, it reaches a student's report, and they repeat
// it to an examiner. Refuse the whole import rather than land part of it.
const unknownCodes = [
  ...new Set(
    questions.filter((q) => !acsCodes.has(q.acsCode)).map((q) => q.acsCode),
  ),
].sort();

if (unknownCodes.length > 0) {
  console.error("import-questions: these ACS codes are not in the FAA document:");
  for (const code of unknownCodes) {
    const users = questions.filter((q) => q.acsCode === code).map((q) => q.key);
    console.error(`  ${code} — used by ${users.join(", ")}`);
  }
  console.error(
    `  Check them against ${ACS_INDEX}, or regenerate it if the ACS has been revised.`,
  );
  process.exit(1);
}

const rows = questions
  .map(
    (q) =>
      `  (${lit(q.key)}, ${lit(q.acsCode)}, ${lit(q.knowledgeArea)}, ${lit(q.objectiveId)}, ` +
      `${lit(q.stem)}, ${lit(q.choiceA)}, ${lit(q.choiceB)}, ${lit(q.choiceC)}, ${lit(q.correctChoice)}, ` +
      `${lit(q.explanation)}, ${lit(q.figureRef)}, ${lit(q.figureSupplement)}, ${q.difficulty}, ` +
      `${lit(q.authoredBy)}, ${lit(q.source)})`,
  )
  .join(",\n");

const sql = `-- 0027: sync the question bank from docs/questions/*.md.
--
-- GENERATED FILE. Do not hand-edit it. Regenerate with:
--
--     node scripts/import-questions.mjs
--
-- The reviewed markdown is the source of truth.
--
-- Safe to re-run. Two things it will never do:
--
--   * It never approves a question. Everything arrives as 'draft'. Approval
--     means a CFI's name and the date written against the row — a human act.
--   * It never keeps an approval alive across a content change. 0026's
--     trigger resets any question whose words change back to draft and clears
--     its reviewer, whichever path the change arrived by.
--
-- Questions removed from the markdown are RETIRED, not deleted: a retired row
-- stops being served while the record that it existed, and any student's
-- answers to it, stay intact.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create temp table incoming_questions (
  source_key text primary key,
  acs_code text not null,
  knowledge_area text not null,
  objective_id text,
  stem text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  correct_choice char(1) not null,
  explanation text not null,
  figure_ref text,
  figure_supplement text,
  difficulty smallint not null,
  authored_by text,
  source_note text
);

insert into incoming_questions
  (source_key, acs_code, knowledge_area, objective_id, stem, choice_a, choice_b,
   choice_c, correct_choice, explanation, figure_ref, figure_supplement,
   difficulty, authored_by, source_note)
values
${rows};

-- ---------------------------------------------------------------
-- Refuse to run if a question points at an objective that does not exist. A
-- typo would otherwise import a question that can never be linked back to a
-- lesson for the student to go and read.
-- ---------------------------------------------------------------

do $check$
declare
  unknown_objectives text;
begin
  select string_agg(distinct i.objective_id, ', ' order by i.objective_id)
    into unknown_objectives
  from incoming_questions i
  where i.objective_id is not null
    and not exists (
      select 1 from public.learning_objectives o where o.id = i.objective_id
    );

  if unknown_objectives is not null then
    raise exception
      'Refusing to import: these objective ids do not exist: %. Check them against learning_objectives.',
      unknown_objectives;
  end if;
end;
$check$;

-- ---------------------------------------------------------------
-- Upsert on source_key. Content changes trip 0026's trigger, which returns
-- the row to draft and clears its reviewer.
-- ---------------------------------------------------------------

insert into public.question_bank
  (source_key, acs_code, knowledge_area, objective_id, stem, choice_a, choice_b,
   choice_c, correct_choice, explanation, figure_ref, figure_supplement,
   difficulty, authored_by, source_note, review_status)
select source_key, acs_code, knowledge_area, objective_id, stem, choice_a, choice_b,
       choice_c, correct_choice, explanation, figure_ref, figure_supplement,
       difficulty, authored_by, source_note, 'draft'
from incoming_questions
on conflict (source_key) do update set
  acs_code          = excluded.acs_code,
  knowledge_area    = excluded.knowledge_area,
  objective_id      = excluded.objective_id,
  stem              = excluded.stem,
  choice_a          = excluded.choice_a,
  choice_b          = excluded.choice_b,
  choice_c          = excluded.choice_c,
  correct_choice    = excluded.correct_choice,
  explanation       = excluded.explanation,
  figure_ref        = excluded.figure_ref,
  figure_supplement = excluded.figure_supplement,
  difficulty        = excluded.difficulty,
  authored_by       = excluded.authored_by,
  source_note       = excluded.source_note;

-- ---------------------------------------------------------------
-- Retire what the documents no longer contain. Only rows that came from this
-- pipeline: anything with no source_key was written by hand and is not ours
-- to retire.
-- ---------------------------------------------------------------

update public.question_bank q
set review_status = 'retired'
where q.source_key is not null
  and q.review_status <> 'retired'
  and not exists (
    select 1 from incoming_questions i where i.source_key = q.source_key
  );

drop table incoming_questions;

-- ---------------------------------------------------------------
-- Report. Expect ${questions.length} questions, all draft until a CFI signs them.
-- ---------------------------------------------------------------

select
  count(*) as total_questions,
  count(*) filter (where review_status = 'draft') as draft,
  count(*) filter (where review_status = 'cfi_approved') as approved,
  count(*) filter (where review_status = 'retired') as retired,
  count(distinct acs_code) as acs_codes_covered
from public.question_bank;
`;

writeFileSync(OUT, sql, "utf8");

const gaps = questions.filter((q) => q.hasValueGap);
const byArea = new Map();
for (const question of questions) {
  byArea.set(
    question.knowledgeArea,
    (byArea.get(question.knowledgeArea) ?? 0) + 1,
  );
}

console.log(`import-questions: ${documents.length} document(s) → ${OUT}`);
for (const document of documents) {
  console.log(`  ${document.file}: ${document.questions.length} questions`);
}
console.log(`  ${questions.length} questions across ${byArea.size} knowledge area(s)`);
console.log(
  `  ${new Set(questions.map((q) => q.acsCode)).size} distinct ACS codes`,
);
console.log(
  `  ${gaps.length} carry [CFI: confirm value] and MUST NOT be approved as they stand`,
);
console.log("  all imported as draft — nothing here approves a question");

if (skipped.length > 0) {
  console.log(`  ignored (not question documents): ${skipped.join(", ")}`);
}
