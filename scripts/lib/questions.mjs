// Reads the question documents in docs/questions/*.md.
//
// Same shape as scripts/lib/cards.mjs and for the same reason: one parser, so
// the words a CFI reviews and the rows a student answers cannot drift apart.
// No dependencies — plain Node ESM.
//
// Every function throws on a malformed document rather than importing
// something half-formed. A question missing its explanation is not a question
// with a small gap; it is a question that cannot be reviewed.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export const QUESTIONS_DIR = "docs/questions";

const DOCUMENT_HEADING = "# Questions —";
const VALUE_GAP = "[CFI: confirm value]";

/**
 * Question documents, in a stable order. Identified by their own first line
 * rather than by filename, so the authoring rules can live in the same folder
 * without being mistaken for content.
 */
export function questionFiles() {
  if (!existsSync(QUESTIONS_DIR)) {
    return { files: [], skipped: [] };
  }

  const all = readdirSync(QUESTIONS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const files = [];
  const skipped = [];

  for (const file of all) {
    const first = readFileSync(join(QUESTIONS_DIR, file), "utf8").split("\n", 1)[0];
    if (first.startsWith(DOCUMENT_HEADING)) {
      files.push(file);
    } else {
      skipped.push(file);
    }
  }

  return { files, skipped };
}

/** One `**Label:** value` line. */
function field(block, label) {
  const m = block.match(new RegExp(`^\\*\\*${label}:\\*\\* (.+)$`, "m"));
  return m ? m[1].trim() : null;
}

/** A `**Label:** \`value\`` line, where the value is in backticks. */
function codeField(block, label) {
  const m = block.match(new RegExp(`^\\*\\*${label}:\\*\\* \`([^\`]+)\`$`, "m"));
  return m ? m[1].trim() : null;
}

function parseQuestion(block, file, knowledgeArea) {
  const label = block.split("\n", 1)[0].trim();
  const where = `${file}: question ${label}`;

  const key = codeField(block, "Key");
  if (!key) throw new Error(`${where} has no Key`);

  const acsCode = codeField(block, "ACS code");
  if (!acsCode) throw new Error(`${where} has no ACS code`);

  const stem = field(block, "Question");
  if (!stem) throw new Error(`${where} has no Question`);

  const explanation = field(block, "Explanation");
  if (!explanation) throw new Error(`${where} has no Explanation`);

  const source = field(block, "Source");
  if (!source) {
    throw new Error(
      `${where} has no Source — a reviewer needs to know what it was written from`,
    );
  }

  const choices = [
    ...block.matchAll(/^- \*\*([ABC])\.\*\* (.+)$/gm),
  ].map((m) => ({ letter: m[1], text: m[2].trim() }));

  if (choices.length !== 3) {
    throw new Error(
      `${where} has ${choices.length} choices, and the FAA test uses exactly 3`,
    );
  }

  const letters = new Set(choices.map((c) => c.letter));
  if (letters.size !== 3) {
    throw new Error(`${where} repeats a choice letter`);
  }

  const correct = codeField(block, "Correct");
  if (!correct) throw new Error(`${where} has no Correct answer`);
  if (!letters.has(correct)) {
    throw new Error(`${where} marks ${correct} correct, but has no such choice`);
  }

  // An explanation must not name a choice by its letter.
  //
  // The practice engine shuffles choice order for every attempt and stores the
  // permutation per answer, so the letter a student sees is not the letter
  // written here. "B is wrong because..." is therefore wrong itself for most
  // attempts — and it is wrong in the worst place, the explanation shown after
  // grading to a student who got it wrong and is trying to understand why.
  //
  // Refused here rather than left as a rule to remember: the first 24 questions
  // written for this bank all broke it, including the five written to prove the
  // pipeline worked. Describe the wrong idea instead of labelling it.
  // The lookbehind matters more than it looks: "Class B is the one place you
  // need a clearance" is correct aviation prose, and the airspace and
  // regulations batches are full of it. Without the exclusions this check would
  // start rejecting good questions, which is how a useful check gets deleted.
  const letterReference =
    /\b(?:option|choice|answer)\s+[ABC]\b|(?<!\b(?:Class|Category|Group|Type|Grade|Part|Appendix|Phase|Stage)\s)\b[ABC]\s+(?:is|was|would be|describes|confuses|states|has)\b/;

  for (const [label, text] of [
    ["explanation", explanation],
    ["question", stem],
  ]) {
    const match = text.match(letterReference);
    if (match) {
      throw new Error(
        `${where}: the ${label} refers to a choice by letter ("${match[0]}"). Choice order is shuffled per attempt, so the student's letters differ from these — describe the idea instead.`,
      );
    }
  }

  // "Figure 12 · CT-8080-2H" — the edition travels with the number, because a
  // figure number alone stops being checkable the moment the supplement
  // revises.
  const figureLine = field(block, "Figure");
  let figureRef = null;
  let figureSupplement = null;

  if (figureLine) {
    const parts = figureLine.split("·").map((part) => part.trim());
    figureRef = parts[0] || null;
    figureSupplement = parts[1] || null;

    if (!figureSupplement) {
      throw new Error(
        `${where} names a figure without its supplement edition — write "Figure 12 · CT-8080-2H"`,
      );
    }
  }

  const difficultyRaw = field(block, "Difficulty");
  const difficulty = difficultyRaw ? Number.parseInt(difficultyRaw, 10) : 2;

  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) {
    throw new Error(`${where} has difficulty "${difficultyRaw}", expected 1, 2 or 3`);
  }

  const hasValueGap = block.includes(VALUE_GAP);

  return {
    key,
    acsCode,
    knowledgeArea,
    objectiveId: codeField(block, "Objective"),
    stem,
    choiceA: choices.find((c) => c.letter === "A").text,
    choiceB: choices.find((c) => c.letter === "B").text,
    choiceC: choices.find((c) => c.letter === "C").text,
    correctChoice: correct,
    explanation,
    source,
    figureRef,
    figureSupplement,
    difficulty,
    // A question carrying a gap cannot be approved — the gap is a question for
    // the reviewer, and approving around it puts a placeholder in front of a
    // student.
    hasValueGap,
  };
}

export function parseQuestionDocument(file) {
  const raw = readFileSync(join(QUESTIONS_DIR, file), "utf8");

  const knowledgeArea = field(raw, "Knowledge area");
  if (!knowledgeArea) {
    throw new Error(`${file}: no "**Knowledge area:**" line`);
  }

  const authoredBy = field(raw, "Authored by") ?? "unattributed";

  const blocks = raw.split(/^### /m).slice(1);
  if (blocks.length === 0) throw new Error(`${file}: no questions found`);

  const questions = blocks.map((block) =>
    parseQuestion(block, file, knowledgeArea),
  );

  return { file, knowledgeArea, authoredBy, questions };
}

/** Every document, parsed, with duplicate keys refused. */
export function parseAllQuestionDocuments() {
  const { files, skipped } = questionFiles();
  const documents = files.map(parseQuestionDocument);
  const seen = new Map();

  for (const document of documents) {
    for (const question of document.questions) {
      const previous = seen.get(question.key);
      if (previous) {
        throw new Error(
          `duplicate key ${question.key} in ${document.file} and ${previous}`,
        );
      }
      seen.set(question.key, document.file);
    }
  }

  return { documents, skipped };
}
