// Builds the printable CFI review packet from docs/cards/*.md.
//
//   node scripts/build-review-packet.mjs
//
// Writes docs/cards/review-packet.html. That file is GENERATED: re-run this
// rather than editing it, so the page a CFI signs and the rows a student sees
// come from the same source.
//
// The packet is a single self-contained HTML file with no scripts and no
// external requests — it can be opened from a USB stick, emailed as an
// attachment, or printed. Print styles keep each card on one page.
//
// No dependencies, deliberately, like scripts/import-cards.mjs.

import { writeFileSync } from "node:fs";
import { parseAllCardDocuments } from "./lib/cards.mjs";

const OUT = "docs/cards/review-packet.html";

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The card documents use a little Markdown inline: **bold** for the terms a
 * card is teaching, and `code` for option ids and the value gaps. Rendering
 * those two is the whole formatting requirement; everything else is escaped
 * first, so nothing in a card document can inject markup into the packet.
 *
 * `[CFI: confirm value]` is marked up as a gap so it cannot be skimmed past —
 * it is the one thing on the page that must not be left as it is.
 */
function inline(value) {
  return esc(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`\[CFI: confirm value\]`/g, '<mark class="gap">value needed</mark>')
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

const LETTERS = ["A", "B", "C", "D"];

let documents;
try {
  documents = parseAllCardDocuments();
} catch (error) {
  console.error(`build-review-packet: ${error.message}`);
  process.exit(1);
}

const allCards = documents.flatMap((d) => d.cards);
const gaps = allCards.filter((c) => c.hasValueGap);
const flags = allCards.filter((c) => c.hasOpenFlag);

// Numbered straight through the packet, so "card 12" means one thing in a
// phone call, an email, or a scribble in a margin.
allCards.forEach((card, index) => {
  card.number = index + 1;
});

function renderCard(card) {
  const options = card.options
    .map(
      (option, index) => `
          <li class="option${option.isCorrect ? " correct" : ""}">
            <span class="letter">${LETTERS[index] ?? "?"}</span>
            <span class="option-text">${inline(option.text)}</span>
            <span class="option-id"><code>${esc(option.optionId)}</code></span>
            <span class="mark">${option.isCorrect ? "correct answer" : ""}</span>
          </li>`,
    )
    .join("");

  return `
      <article class="card${card.hasValueGap || card.hasOpenFlag ? " needs-answer" : ""}">
        <header class="card-head">
          <span class="card-number">Card ${card.number}</span>
          <h4>${inline(card.title.replace(/^\d+\s*—\s*/, ""))}</h4>
          <span class="card-id"><code>${esc(card.id)}</code></span>
        </header>

        <p class="question">${inline(card.question)}</p>

        <ol class="options">${options}
        </ol>

        <p class="explanation"><span class="label">Shown after answering:</span>
          ${inline(card.explanation)}</p>
${
  card.visual
    ? `
        <p class="visual"><span class="label">Picture we plan to draw:</span>
          ${inline(card.visual)}</p>`
    : ""
}${
    card.flag
      ? `
        <p class="flag"><span class="label">Our own doubt about this card:</span>
          ${inline(card.flag)}</p>`
      : ""
  }

        <div class="review">
          <p class="review-choices">
            <span class="choice"><span class="box"></span>Approve as written</span>
            <span class="choice"><span class="box"></span>Approve with the changes below</span>
            <span class="choice"><span class="box"></span>Cut this card</span>
          </p>
          <p class="review-notes"><span class="label">Notes:</span></p>
          <p class="rule"></p>
          <p class="rule"></p>
        </div>
      </article>`;
}

function renderDocument(document) {
  const objectives = document.objectives
    .map(
      (objective) => `
      <section class="objective">
        <h3>${objective.text ? inline(objective.text) : esc(objective.id)}</h3>
        <p class="objective-id">Objective <code>${esc(objective.id)}</code>${
          objective.cards.length === 1
            ? " · 1 card"
            : ` · ${objective.cards.length} cards`
        }</p>
${objective.cards.map(renderCard).join("\n")}
      </section>`,
    )
    .join("\n");

  return `
    <section class="lesson">
      <h2>${esc(document.title.replace(/^Quiz cards for review — /, ""))}</h2>
      <p class="lesson-meta">Lesson <code>${esc(document.lessonSlug)}</code> · ${
        document.cards.length
      } cards · every card below is a draft</p>
${objectives}
    </section>`;
}

const summaryRows = documents
  .map(
    (d) => `
          <tr>
            <td>${esc(d.title.replace(/^Quiz cards for review — /, ""))}</td>
            <td class="num">${d.cards.length}</td>
            <td class="num">${d.cards.filter((c) => c.hasValueGap).length}</td>
            <td class="num">${d.cards.filter((c) => c.hasOpenFlag).length}</td>
          </tr>`,
  )
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quiz card review — PilotPathway.ai</title>
<style>
  :root { --ink: #1a1a1a; --muted: #5a5a5a; --line: #d6d6d6; --gold: #7a5c12; }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto; padding: 2rem 1.25rem 4rem; max-width: 46rem;
    font: 16px/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--ink); background: #fff;
  }
  h1 { font-size: 1.6rem; line-height: 1.2; margin: 0 0 .25rem; }
  h2 { font-size: 1.25rem; margin: 2.5rem 0 .25rem; }
  h3 { font-size: 1rem; margin: 1.75rem 0 .1rem; }
  h4 { font-size: 1rem; margin: 0; font-weight: 600; }
  p { margin: .6rem 0; }
  code { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-size: .85em; }
  .subtitle { color: var(--muted); margin-top: 0; }
  .label { font-weight: 600; }
  .intro { border: 1px solid var(--line); border-radius: 6px; padding: 1rem 1.25rem; }
  .intro ol, .intro ul { padding-left: 1.2rem; }
  .intro li { margin: .4rem 0; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: .95rem; }
  th, td { border-bottom: 1px solid var(--line); padding: .4rem .5rem; text-align: left; }
  .num { text-align: right; width: 6rem; }
  .lesson-meta, .objective-id { color: var(--muted); font-size: .9rem; margin-top: .1rem; }
  .objective h3 { padding-top: .75rem; border-top: 2px solid var(--ink); }
  .card {
    border: 1px solid var(--line); border-radius: 6px;
    padding: 1rem 1.1rem; margin: 1rem 0;
    break-inside: avoid; page-break-inside: avoid;
  }
  .card.needs-answer { border-left: 4px solid var(--gold); }
  .card-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: .5rem; }
  .card-number { font-weight: 700; }
  .card-id { color: var(--muted); font-size: .8rem; margin-left: auto; }
  .question { font-size: 1.02rem; }
  .options { list-style: none; margin: .75rem 0; padding: 0; }
  .option {
    display: grid; grid-template-columns: 1.4rem 1fr auto; gap: .1rem .5rem;
    align-items: baseline; padding: .35rem .5rem; border-radius: 4px;
  }
  .option.correct { background: #f4efe0; }
  .letter { font-weight: 600; color: var(--muted); }
  .option-id { color: var(--muted); font-size: .8rem; }
  .mark { grid-column: 2 / -1; font-size: .78rem; text-transform: uppercase;
          letter-spacing: .08em; color: var(--gold); font-weight: 700; }
  .mark:empty { display: none; }
  .explanation, .visual, .flag { font-size: .95rem; }
  .visual { color: var(--muted); }
  .flag { border-left: 3px solid var(--gold); padding-left: .75rem; }
  mark.gap { background: #ffe9a8; padding: 0 .25rem; border-radius: 3px; font-weight: 600; }
  .review { margin-top: 1rem; padding-top: .75rem; border-top: 1px dashed var(--line); }
  .review-choices { font-size: .9rem; display: flex; flex-wrap: wrap; gap: .35rem 1.25rem; }
  .choice { white-space: nowrap; }
  .box {
    display: inline-block; width: .85rem; height: .85rem;
    border: 1px solid var(--ink); margin-right: .4rem; vertical-align: middle;
  }
  .review-notes { margin-bottom: .2rem; font-size: .9rem; }
  .rule { border-bottom: 1px solid var(--line); height: 1.3rem; margin: 0; }
  .signoff { border: 2px solid var(--ink); border-radius: 6px; padding: 1rem 1.25rem; margin-top: 3rem; }
  footer { color: var(--muted); font-size: .85rem; margin-top: 3rem; }
  @media print {
    body { padding: 0; max-width: none; font-size: 11pt; }
    .card { box-shadow: none; }
    .option.correct { background: none; text-decoration: none; }
    .option.correct .option-text { font-weight: 700; }
    mark.gap { background: none; border: 1px solid var(--ink); }
    a { text-decoration: none; color: inherit; }
  }
</style>
</head>
<body>

<h1>Quiz card review</h1>
<p class="subtitle">PilotPathway.ai — Private Pilot ground school · ${allCards.length} draft cards · prepared ${new Date()
  .toISOString()
  .slice(0, 10)}</p>

<section class="intro">
  <h2 style="margin-top:.25rem">What we are asking you to do</h2>

  <p>These are multiple-choice cards for an AI-assisted ground school for students
  aged roughly 16 to 26, most of them new to aviation. <strong>No student has seen
  any of them.</strong> Nothing reaches a student until a CFI approves it by name,
  and that is what this packet is for.</p>

  <p>For each card, please judge three things:</p>

  <ol>
    <li><strong>Is it accurate?</strong> If a card is wrong, or right but
    misleading, say so. "Cut this one" is a useful answer.</li>
    <li><strong>Are the wrong answers realistic?</strong> Each wrong option is
    meant to be a mistake a real student pilot makes. An obviously silly option
    teaches nothing — the student picks the right answer by elimination and
    learns that they are good at tests.</li>
    <li><strong>Does the card test the objective it sits under?</strong> The
    objective is printed above each group of cards.</li>
  </ol>

  <p>Two things we need you to fill in, marked in the text:</p>

  <ul>
    <li><strong>value needed</strong> — a number that is aircraft-specific, or
    one we were not certain of. We left a gap rather than guess. Please fill it
    in, or tell us the card reads better with no number at all.
    ${gaps.length} card${gaps.length === 1 ? "" : "s"} carry one.</li>
    <li><strong>Our own doubt about this card</strong> — a specific question we
    have written down for you. ${flags.length} card${
      flags.length === 1 ? "" : "s"
    } carry one.</li>
  </ul>

  <p><strong>The options are shuffled every time a student sees a card.</strong>
  The A–D letters here exist only so we can talk about them; no student sees
  this order. Each option also has a permanent id (<code>opt-1</code> to
  <code>opt-4</code>) that does not change when the order does, so please use the
  id in any note about a specific option.</p>

  <p>Two consequences of the shuffling, worth knowing if you rewrite an option:
  an option must never refer to another by letter, and there is no "all of the
  above" or "none of the above" — they depend on there being an above.</p>

  <p>Sources are named, never numbered: no section numbers, ACS task codes, or
  figure numbers anywhere. A student who repeats a stale code to a DPE pays for
  our mistake.</p>

  <table>
    <thead>
      <tr><th>Lesson</th><th class="num">Cards</th><th class="num">Values needed</th><th class="num">Our questions</th></tr>
    </thead>
    <tbody>${summaryRows}
    </tbody>
  </table>
</section>

${documents.map(renderDocument).join("\n")}

<section class="signoff">
  <h2 style="margin-top:.25rem">Reviewer sign-off</h2>
  <p>Your name goes on record against every card you approve, with the date. We
  record the approval per card, so approving some and cutting others is a normal
  outcome — and no card without your approval is ever shown to a student.</p>
  <p class="review-notes"><span class="label">Name</span></p>
  <p class="rule"></p>
  <p class="review-notes"><span class="label">Certificate number and type (CFI / CFII / MEI)</span></p>
  <p class="rule"></p>
  <p class="review-notes"><span class="label">Date</span></p>
  <p class="rule"></p>
  <p class="review-notes"><span class="label">Anything you want said to the students about these cards</span></p>
  <p class="rule"></p>
  <p class="rule"></p>
</section>

<footer>
  <p>Generated from the reviewed card documents. Questions to Demetrius D. Harris,
  PilotPathway.ai.</p>
</footer>

</body>
</html>
`;

writeFileSync(OUT, html, "utf8");

console.log(`build-review-packet: ${documents.length} document(s) → ${OUT}`);
for (const document of documents) {
  console.log(`  ${document.file}: ${document.cards.length} cards`);
}
console.log(
  `  ${allCards.length} cards, ${gaps.length} with a value gap, ${flags.length} with an open question`,
);
