// Reads the reviewed card documents in docs/cards/*.md.
//
// Shared on purpose: scripts/import-cards.mjs turns these cards into the sync
// migration a student eventually answers, and scripts/build-review-packet.mjs
// turns the same cards into the page a CFI signs off. Two parsers would let
// the words a CFI reviewed and the rows a student sees drift apart, which is
// the one failure this whole card pipeline exists to prevent.
//
// No dependencies, deliberately — plain Node ESM, like its callers.
//
// Every function here throws on a malformed document rather than guessing.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const CARDS_DIR = "docs/cards";

/**
 * Card documents, in a stable order.
 *
 * A file counts as one by its own first line — `# Quiz cards for review …` —
 * not by its name. docs/cards also holds the authoring rules and the guide to
 * recording approvals, and naming every exception in here would mean the next
 * document added to the folder breaks the import until someone remembers this
 * function. Skipped files are returned so the scripts can say what they
 * ignored; a card document with a mistyped heading shows up there rather than
 * disappearing silently.
 */
const CARD_DOCUMENT_HEADING = "# Quiz cards for review";

export function cardFiles() {
  const all = readdirSync(CARDS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const files = [];
  const skipped = [];

  for (const file of all) {
    const first = readFileSync(join(CARDS_DIR, file), "utf8").split("\n", 1)[0];
    if (first.startsWith(CARD_DOCUMENT_HEADING)) {
      files.push(file);
    } else {
      skipped.push(file);
    }
  }

  if (files.length === 0) {
    throw new Error("no card documents found in docs/cards");
  }

  return { files, skipped };
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
  const where = `${file}: card "${titleLine}"`;

  const objectiveId = (block.match(/^\*\*Objective ID:\*\* `([^`]+)`$/m) ??
    [])[1];
  if (!objectiveId) throw new Error(`${where} has no Objective ID`);

  const question = field(block, "Question");
  if (!question) throw new Error(`${where} has no Question`);

  const explanation = field(block, "Explanation");
  if (!explanation) throw new Error(`${where} has no Explanation`);

  // Optional. A card with no visual described yet is still importable.
  const visual = field(block, "Visual");

  const options = [
    ...block.matchAll(/^- \*\*[A-D]\.\*\* \(`(opt-[1-4])`\) (.+)$/gm),
  ].map((m) => ({ optionId: m[1], text: m[2].trim() }));

  if (options.length < 3 || options.length > 4) {
    throw new Error(
      `${where} has ${options.length} options, expected 3 or 4`,
    );
  }

  const ids = new Set(options.map((o) => o.optionId));
  if (ids.size !== options.length) {
    throw new Error(`${where} reuses an option id`);
  }

  const correct = (block.match(/^\*\*Correct answer:\*\* `(opt-[1-4])`$/m) ??
    [])[1];
  if (!correct) {
    throw new Error(
      `${where} has no Correct answer, or it still names a letter`,
    );
  }
  if (!ids.has(correct)) {
    throw new Error(`${where} marks ${correct} correct, but has no such option`);
  }

  // The reviewer's own doubt, written down where it applies. Carried through
  // so the review page shows it next to the card rather than losing it.
  const flag = field(block, "FLAG FOR CFI");

  return {
    title: titleLine,
    objectiveId,
    lessonSlug: objectiveId.split(".")[0],
    question,
    explanation,
    visual,
    flag,
    options: options.map((o) => ({ ...o, isCorrect: o.optionId === correct })),
    // A card still carrying a value gap or an open flag is not ready for a
    // reviewer to approve without answering it first.
    hasValueGap: block.includes("[CFI: confirm value]"),
    hasOpenFlag: flag !== null,
  };
}

/**
 * One card document: its heading, the lesson it belongs to, its objectives in
 * document order, and its cards.
 *
 * Card ids are `<objective id>.c<n>`, where n counts that objective's cards
 * from 1 in document order. Ids are therefore stable as long as card order in
 * the document is stable — reordering cards within an objective renames them,
 * which is why order is treated as part of the content.
 */
export function parseCardDocument(file) {
  const raw = readFileSync(join(CARDS_DIR, file), "utf8");

  const title = (raw.match(/^# (.+)$/m) ?? [])[1]?.trim() ?? file;

  // The objective headings carry the objective's wording, which a reviewer
  // needs in order to judge whether a card actually tests it.
  const objectiveText = new Map();
  for (const m of raw.matchAll(
    /^## Objective \d+ — `([^`]+)`\s*\n+> (.+)$/gm,
  )) {
    objectiveText.set(m[1], m[2].trim());
  }

  // Everything before the first card heading is the reviewer intro.
  const blocks = raw.split(/^### Card /m).slice(1);
  if (blocks.length === 0) throw new Error(`${file}: no cards found`);

  const cards = blocks.map((b) => parseCard(b, file));

  const seen = new Map();
  for (const card of cards) {
    const n = (seen.get(card.objectiveId) ?? 0) + 1;
    seen.set(card.objectiveId, n);
    card.position = n;
    card.id = `${card.objectiveId}.c${n}`;
  }

  // Objectives in the order they appear, each with its own cards.
  const objectives = [];
  for (const card of cards) {
    let objective = objectives.find((o) => o.id === card.objectiveId);
    if (!objective) {
      objective = {
        id: card.objectiveId,
        text: objectiveText.get(card.objectiveId) ?? null,
        cards: [],
      };
      objectives.push(objective);
    }
    objective.cards.push(card);
  }

  return {
    file,
    title,
    lessonSlug: cards[0].lessonSlug,
    objectives,
    cards,
  };
}

/**
 * Every card document, parsed, with duplicate card ids refused, plus the
 * markdown files in the folder that are not card documents.
 */
export function parseAllCardDocuments() {
  const { files, skipped } = cardFiles();
  const documents = files.map(parseCardDocument);
  const seen = new Set();

  for (const document of documents) {
    for (const card of document.cards) {
      if (seen.has(card.id)) {
        throw new Error(`duplicate card id ${card.id}`);
      }
      seen.add(card.id);
    }
  }

  return { documents, skipped };
}
