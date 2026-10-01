// Holds the lesson diagrams to the two rules that are easy to break silently:
//
//     node scripts/check-diagrams.mjs
//
// No database, no browser. Run it after editing any diagram.
//
// WHY THIS EXISTS. Two of the eight diagrams shipped with labels that rendered
// at 9px on a 375px phone. Nothing caught it — lint, typecheck and the build
// all passed, because an SVG with a wide viewBox is perfectly valid code and
// only becomes a problem when it is scaled down to fit a phone. It was found by
// measuring in a browser by hand, which is not a check, it is a memory. This is
// the check.
//
// The arithmetic it does is the arithmetic a browser does. An SVG with
// `className="h-auto w-full"` is scaled so its viewBox width fills the
// container, so a font size expressed in viewBox units renders at
//
//     px = fontUnits x (containerWidth / viewBoxWidth)
//
// On the narrowest phone this audience uses, the container is 285px: a 375px
// viewport, less the lesson page's px-6 on both sides, less the diagram card's
// p-5 on both sides, less its border. Keep those in step with
// `src/components/lesson-diagrams.tsx` if that wrapper ever changes.
//
// WHAT IT CANNOT SEE. Whether two labels overlap each other — that needs real
// text metrics and therefore a browser. It catches the size problem, which is
// the one that shipped. It also assumes a diagram carrying `<text>` is full
// width; the grid-of-panels diagrams carry their labels in HTML, where the
// browser handles wrapping, and none of them has SVG text today.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { DIAGRAMS } from "../src/lib/diagrams/catalogue.ts";

const COMPONENT_DIR = "src/components/diagrams";
const INDEX = `${COMPONENT_DIR}/index.tsx`;

// A 375px phone, less the lesson page's padding and the card's.
const PHONE_CONTAINER = 285;

// Below this, a label on a diagram is not readable on a cheap phone.
const MIN_RENDERED_PX = 11;

const failures = [];
const notes = [];

// ---------------------------------------------------------------------------
// 1. The catalogue and the drawings must name the same set of keys.
//
// A key in one and not the other fails quietly today: the lesson renders
// nothing and says nothing, which looks exactly like a diagram awaiting review.
// ---------------------------------------------------------------------------

const indexSource = readFileSync(INDEX, "utf8");
const mapBody = /const COMPONENTS[^{]*\{([\s\S]*?)\n\};/.exec(indexSource);

if (!mapBody) {
  failures.push(`could not find the COMPONENTS map in ${INDEX}`);
}

const componentKeys = new Set(
  mapBody ? [...mapBody[1].matchAll(/"([^"]+)"\s*:/g)].map((m) => m[1]) : [],
);
const catalogueKeys = new Set(DIAGRAMS.map((d) => d.key));

for (const key of catalogueKeys) {
  if (!componentKeys.has(key)) {
    failures.push(`${key} is in the catalogue but has no drawing in ${INDEX}`);
  }
}
for (const key of componentKeys) {
  if (!catalogueKeys.has(key)) {
    failures.push(`${key} has a drawing but is not in the catalogue, so it can never be approved`);
  }
}

// Counted here so the summary can report key matching on its own, rather than
// saying "keys match: no" because a font size was too small somewhere else.
const keyMismatch = failures.length;

// ---------------------------------------------------------------------------
// 2. Sources are named, never numbered.
//
// Figure and chapter numbers are revision-specific, and a student who repeats a
// stale one to an examiner pays for our mistake. Same rule as the cards.
// ---------------------------------------------------------------------------

const NUMBERED = [
  /\bfigures?\s*\.?\s*\d/i,
  /\bfig\.?\s*\d/i,
  /\bchapters?\s*\d/i,
  /\bch\.\s*\d/i,
  /\bpages?\s*\d/i,
];

for (const entry of DIAGRAMS) {
  for (const field of ["title", "caption", "sourceNote"]) {
    const value = entry[field];

    if (field !== "sourceNote" && (!value || String(value).trim() === "")) {
      failures.push(`${entry.key} has no ${field}`);
      continue;
    }
    if (!value) continue;

    for (const pattern of NUMBERED) {
      if (pattern.test(value)) {
        failures.push(
          `${entry.key} ${field} names a source by number: "${String(value).match(pattern)[0]}"`,
        );
        break;
      }
    }
  }

  if (!Number.isInteger(entry.position) || entry.position < 1) {
    failures.push(`${entry.key} has a bad position: ${entry.position}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Nothing may render below MIN_RENDERED_PX on a phone.
// ---------------------------------------------------------------------------

const files = readdirSync(COMPONENT_DIR).filter(
  (name) => name.endsWith(".tsx") && name !== "index.tsx",
);

const measured = [];

for (const name of files) {
  const source = readFileSync(`${COMPONENT_DIR}/${name}`, "utf8");

  const widths = [...source.matchAll(/viewBox="0 0 (\d+(?:\.\d+)?) /g)].map((m) =>
    Number(m[1]),
  );

  // EVERY `text-[Npx]` IN THE FILE, not the ones sitting on a `<text>` tag.
  //
  // The first version of this read the class off each `<text>` and missed most
  // of the labels, because a diagram usually sets the size once on a wrapping
  // `<g>` and lets its children inherit. airplane-parts does exactly that, and
  // its five callouts were reported as "size inherited, not checked" while
  // rendering at 8.7px. A check with a blind spot over most of the labels is
  // worse than none, because it reads as a clean pass.
  //
  // Safe to sweep the whole file: the HTML labels in these components use
  // Tailwind's own scale (text-sm), never an arbitrary pixel value, so every
  // `text-[Npx]` here belongs to the drawing.
  const sizes = [...source.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) =>
    Number(m[1]),
  );

  if (sizes.length === 0) continue;

  if (widths.length === 0) {
    failures.push(`${name} sets a text size but has no viewBox, so it cannot be checked`);
    continue;
  }

  const textCount = [...source.matchAll(/<text\b/g)].length;

  // Worst case: the widest viewBox scales its contents down the most.
  const width = Math.max(...widths);
  const scale = PHONE_CONTAINER / width;

  const smallest = Math.min(...sizes) * scale;

  for (const size of [...new Set(sizes)].sort((a, b) => a - b)) {
    const rendered = size * scale;

    if (rendered < MIN_RENDERED_PX) {
      failures.push(
        `${name}: text-[${size}px] in a ${width}-wide viewBox renders at ` +
          `${rendered.toFixed(1)}px on a 375px phone (needs ${MIN_RENDERED_PX}) — ` +
          `use at least ${Math.ceil((MIN_RENDERED_PX * width) / PHONE_CONTAINER)}px or narrow the viewBox`,
      );
    }
  }

  measured.push({ name, width, texts: textCount, smallest });
}

// ---------------------------------------------------------------------------
// 4. A lesson slug nobody recognises is worth saying out loud, not failing on.
//
// Lesson slugs live in the database, so the card documents are the best list
// available without one. A Stage 2 lesson would have no card document yet and
// must not be blocked by that.
// ---------------------------------------------------------------------------

const knownLessons = existsSync("docs/cards")
  ? new Set(
      readdirSync("docs/cards")
        .filter((n) => n.endsWith(".md"))
        .map((n) => n.replace(/\.md$/, "")),
    )
  : new Set();

for (const entry of DIAGRAMS) {
  if (knownLessons.size > 0 && !knownLessons.has(entry.lessonSlug)) {
    notes.push(
      `${entry.key} points at "${entry.lessonSlug}", which has no card document — check it is a real lesson`,
    );
  }
}

// ---------------------------------------------------------------------------

console.log("check-diagrams:");
console.log(
  `  ${DIAGRAMS.length} diagrams, ${componentKeys.size} drawings, keys match: ${keyMismatch === 0 ? "yes" : "no"}`,
);
console.log(`  smallest text at 375px (container ${PHONE_CONTAINER}px):`);

for (const m of measured.sort((a, b) => (a.smallest ?? 99) - (b.smallest ?? 99))) {
  console.log(
    `    ${m.name.padEnd(22)} viewBox ${String(m.width).padStart(3)}  ` +
      `${String(m.texts).padStart(2)} labels  ` +
      `${m.smallest === null ? "n/a" : m.smallest.toFixed(1) + "px"}`,
  );
}

for (const note of notes) console.log(`  note: ${note}`);

if (failures.length > 0) {
  console.error("\ncheck-diagrams FAILED:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log("  all checks passed");
