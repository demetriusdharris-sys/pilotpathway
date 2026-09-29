// Indexes every figure in the FAA's Pilot's Handbook of Aeronautical Knowledge:
//
//     node scripts/build-phak-figures.mjs
//
// Reads docs/reference/phak.pdf and writes docs/reference/phak-figures.json.
//
// WHY THIS EXISTS. The handbook's teaching diagrams cannot be lifted. They are
// not pictures sitting in the file — they are Illustrator artwork drawn by the
// page content stream itself, with gradient meshes, clipping paths and live
// text. Measured on the 25C edition: 501 figures, of which 378 are raster and
// nearly all of those are PHOTOGRAPHS — cockpits, buildings, an administrator's
// portrait. Every diagram worth teaching from is vector. The four forces, the
// axes of an airplane, the controls-and-stability table: all of them carry no
// extractable image at all.
//
// What IS extractable is everything the diagram MEANS. Each label is its own
// text block in the content stream, so the handbook will tell us that its four
// forces figure is labelled exactly Lift, Weight, Drag, Thrust, and that its
// controls figure pairs aileron with roll and the longitudinal axis. That is
// the specification for drawing our own — accurate to the source, checkable by
// a CFI against it, and a couple of kilobytes of themeable SVG instead of a
// fixed-size raster that blurs on a phone.
//
// So this script does not extract art. It extracts the brief.
//
// SOURCES ARE NAMED, NEVER NUMBERED. The index records figure numbers because
// that is how a reviewer finds the page in their own copy. Nothing here may
// reach a student: revision-specific numbers are exactly what the diagram
// catalogue's sourceNote rule exists to keep out.
//
// The handbook itself is ~78MB and is deliberately NOT committed — it is
// gitignored and this file's output is the durable artifact. Plain Node: zlib
// is standard library, so this adds nothing to the locked stack.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { inflateSync } from "node:zlib";

const PDF = process.argv[2] ?? "docs/reference/phak.pdf";
const OUT = "docs/reference/phak-figures.json";

if (!existsSync(PDF)) {
  console.error(`build-phak-figures: ${PDF} is missing.`);
  console.error(
    "  Download the Pilot's Handbook of Aeronautical Knowledge (FAA-H-8083-25) from",
  );
  console.error("  faa.gov and save it there. It is public domain.");
  console.error("  It is gitignored on purpose: ~78MB does not belong in git.");
  console.error(
    "  A copy elsewhere works too: node scripts/build-phak-figures.mjs <path>",
  );
  process.exit(1);
}

const data = readFileSync(PDF);

// ---------------------------------------------------------------- PDF reading

/** Bytes between a `stream` keyword's end-of-line and its `endstream`. */
function streamBytes(from) {
  const s = data.indexOf("stream", from);
  if (s === -1) return null;
  let i = s + 6;
  if (data[i] === 0x0d && data[i + 1] === 0x0a) i += 2;
  else if (data[i] === 0x0a || data[i] === 0x0d) i += 1;
  const e = data.indexOf("endstream", i);
  return e === -1 ? null : data.subarray(i, e);
}

function inflate(buf) {
  try {
    return inflateSync(buf);
  } catch {
    return null;
  }
}

const text = data.toString("latin1");

// Every top-level object, by number.
const objs = new Map();
for (const m of text.matchAll(/(?<![0-9])(\d+)\s+\d+\s+obj\b/g)) {
  const bodyStart = m.index + m[0].length;
  const end = text.indexOf("endobj", bodyStart);
  if (end === -1) continue;
  objs.set(Number(m[1]), {
    at: bodyStart,
    body: text.slice(bodyStart, end),
  });
}

// Page dictionaries are packed inside compressed object streams, so they are
// invisible to a plain scan. Unpack them all.
const inner = new Map();
for (const [, o] of objs) {
  if (!o.body.includes("/ObjStm")) continue;
  const raw = streamBytes(o.at);
  if (!raw) continue;
  const dec = inflate(raw);
  if (!dec) continue;
  const n = Number(/\/N\s+(\d+)/.exec(o.body)?.[1]);
  const first = Number(/\/First\s+(\d+)/.exec(o.body)?.[1]);
  if (!n || Number.isNaN(first)) continue;
  const head = dec.subarray(0, first).toString("latin1").trim().split(/\s+/);
  for (let k = 0; k < n; k++) {
    const num = Number(head[2 * k]);
    const off = Number(head[2 * k + 1]);
    const next = k + 1 < n ? Number(head[2 * k + 3]) : dec.length - first;
    if (Number.isNaN(num) || Number.isNaN(off)) continue;
    inner.set(num, dec.subarray(first + off, first + next).toString("latin1"));
  }
}

/** `{ body, at }` — `at` is null for an object that was packed in a stream. */
function getObj(num) {
  if (inner.has(num)) return { body: inner.get(num), at: null };
  const o = objs.get(num);
  return o ? { body: o.body, at: o.at } : { body: null, at: null };
}

function resolve(body, key) {
  const ref = new RegExp(`/${key}\\s+(\\d+)\\s+0\\s+R`).exec(body);
  if (ref) return getObj(Number(ref[1])).body;
  const direct = new RegExp(`/${key}\\s*(<<[\\s\\S]*)`).exec(body);
  return direct ? direct[1] : null;
}

/** Page object numbers, in the order a reader sees them. */
function pageOrder() {
  const roots = [...text.matchAll(/\/Root\s+(\d+)\s+0\s+R/g)];
  if (roots.length === 0) return [];
  const cat = getObj(Number(roots.at(-1)[1])).body;
  const top = /\/Pages\s+(\d+)\s+0\s+R/.exec(cat ?? "");
  if (!top) return [];

  const out = [];
  const walk = (num, depth) => {
    if (depth > 60) return;
    const { body } = getObj(num);
    if (!body) return;
    if (/\/Type\s*\/Page(?![s])/.test(body)) {
      out.push(num);
      return;
    }
    const kids = /\/Kids\s*\[([\s\S]*?)\]/.exec(body);
    if (!kids) return;
    for (const k of kids[1].matchAll(/(\d+)\s+0\s+R/g)) {
      walk(Number(k[1]), depth + 1);
    }
  };
  walk(Number(top[1]), 0);
  return out;
}

function contentStream(body) {
  const refs = [];
  const one = /\/Contents\s+(\d+)\s+0\s+R/.exec(body);
  if (one) {
    refs.push(Number(one[1]));
  } else {
    const arr = /\/Contents\s*\[([\s\S]*?)\]/.exec(body);
    if (arr) {
      for (const r of arr[1].matchAll(/(\d+)\s+0\s+R/g)) refs.push(Number(r[1]));
    }
  }

  const parts = [];
  for (const r of refs) {
    const { at } = getObj(r);
    if (at === null) continue;
    const raw = streamBytes(at);
    if (!raw) continue;
    const dec = inflate(raw);
    if (dec) parts.push(dec);
  }
  return Buffer.concat(parts).toString("latin1");
}

// --------------------------------------------------------------- text tidying

// The handbook is Windows-1252. Octal escapes survive the content stream, so a
// dash arrives as \227 and an apostrophe as \222 — left raw they would put
// literal backslashes into a diagram brief.
const CP1252 = {
  0x91: "‘",
  0x92: "’",
  0x93: "“",
  0x94: "”",
  0x95: "•",
  0x96: "–",
  0x97: "—",
};

function tidy(s) {
  return s
    .replace(/\\([nrtbf])/g, " ")
    .replace(/\\([0-7]{1,3})/g, (_, o) => {
      const code = parseInt(o, 8);
      return CP1252[code] ?? String.fromCharCode(code);
    })
    .replace(/\\([()\\])/g, "$1")
    .replace(/[\u0000-\u001f�]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SHOW = /\((?:\\[\s\S]|[^()\\])*\)/g;

/**
 * One entry per BT..ET block.
 *
 * Blocks are what separate a diagram's labels from the prose around them: a
 * caption or a paragraph is one block of many kerned fragments, while each
 * label on the artwork is a block of its own. Joining the whole page instead
 * would run "Lift" into the sentence after it.
 */
function textBlocks(cs) {
  const out = [];
  for (const b of cs.matchAll(/BT([\s\S]*?)ET/g)) {
    const runs = [];
    for (const m of b[1].matchAll(SHOW)) runs.push(m[0].slice(1, -1));
    const joined = tidy(runs.join(""));
    if (joined) out.push(joined);
  }
  return out;
}

/** Image XObjects a page uses, so a figure can be called raster or vector. */
function rasterCount(body) {
  const res = resolve(body, "Resources");
  if (!res) return 0;

  let block = "";
  const ref = /\/XObject\s+(\d+)\s+0\s+R/.exec(res);
  if (ref) {
    block = getObj(Number(ref[1])).body ?? "";
  } else {
    block = /\/XObject\s*<<([\s\S]*?)>>/.exec(res)?.[1] ?? "";
  }

  let n = 0;
  for (const m of block.matchAll(/\/[A-Za-z0-9_.\-]+\s+(\d+)\s+0\s+R/g)) {
    const { body: xb } = getObj(Number(m[1]));
    if (xb && xb.includes("/Image")) n++;
  }
  return n;
}

// ------------------------------------------------------------------- the pass

const FIGURE = /Figure\s+(\d+)[-–](\d+)\.\s*/g;

/**
 * The caption that follows a figure marker.
 *
 * Trimmed in code rather than by a lookahead. A lookahead for the next marker
 * only matches when the two are close together, so on a page whose figures are
 * a column apart it fails outright and the figure vanishes from the index —
 * which cost two thirds of them on the first pass.
 */
function captionAfter(whole, from) {
  let tail = whole.slice(from, from + 280);

  const next = /Figure\s+\d+[-–]\d+\./.exec(tail);
  if (next) tail = tail.slice(0, next.index);

  // Captions are one sentence, and the paragraph after one often sits in the
  // same text block with no space between — "The four forces.Weight is the
  // combined load". So a period touching a letter ends the caption, as does a
  // period before a space and a capital. The lookbehind spares an initial, so
  // "U.S. Department" is not cut in half.
  const stop = /(?<![A-Z])\.(?=[A-Za-z]|\s+[A-Z(]|\s*$)/.exec(tail);
  if (stop) tail = tail.slice(0, stop.index + 1);

  return tail.replace(/\s+/g, " ").trim();
}

const order = pageOrder();
if (order.length === 0) {
  console.error("build-phak-figures: could not read the page tree.");
  process.exit(1);
}

const figures = [];
let vectorOnly = 0;

for (let i = 0; i < order.length; i++) {
  const { body } = getObj(order[i]);
  if (!body) continue;

  const cs = contentStream(body);
  if (!cs) continue;

  const blocks = textBlocks(cs);
  const page = blocks.length > 0 ? blocks[0] : "";
  const folio = /^\d+-\d+$/.test(page) ? page : null;
  const rasters = rasterCount(body);

  const whole = blocks.join(" ");
  const captions = [];
  for (const m of whole.matchAll(FIGURE)) {
    const caption = captionAfter(whole, m.index + m[0].length);
    if (caption) captions.push({ number: `${m[1]}-${m[2]}`, caption });
  }
  if (captions.length === 0) continue;

  // A label is a block of its own that is not the folio, not a caption, and
  // short enough to be artwork rather than a sentence. Bullets and the symbol
  // font leave short noise behind, so anything without a letter is dropped.
  const labels = [];
  for (const b of blocks) {
    if (b === folio) continue;
    if (b.startsWith("Figure ")) continue;
    if (b.length > 60) continue;
    if (!/[A-Za-z]{2}/.test(b)) continue;
    if (!labels.includes(b)) labels.push(b);
  }

  const seen = new Set();
  for (const { number, caption } of captions) {
    if (seen.has(number)) continue;
    seen.add(number);
    if (rasters === 0) vectorOnly++;
    figures.push({
      number,
      caption,
      folio,
      pageIndex: i,
      // How many figures share this page. With two, the labels below belong to
      // both and a reader has to tell them apart — said plainly rather than
      // guessed at, because a wrong label is worse than an absent one.
      figuresOnPage: captions.length,
      kind: rasters === 0 ? "vector" : "mixed",
      labels,
    });
  }
}

figures.sort((a, b) => a.pageIndex - b.pageIndex);

writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      source: "FAA-H-8083-25, Pilot's Handbook of Aeronautical Knowledge",
      note: "Authoring aid. Figure numbers are revision-specific and must never reach a student — see src/lib/diagrams/catalogue.ts.",
      generated: new Date().toISOString().slice(0, 10),
      pages: order.length,
      figures,
    },
    null,
    2,
  )}\n`,
);

console.log(`build-phak-figures: ${order.length} pages read.`);
console.log(`  ${figures.length} figures indexed -> ${OUT}`);
console.log(
  `  ${vectorOnly} carry no image at all (vector artwork), ${figures.length - vectorOnly} sit on a page with one.`,
);
console.log(
  `  ${figures.filter((f) => f.figuresOnPage > 1).length} share a page with another figure; their labels are pooled.`,
);
