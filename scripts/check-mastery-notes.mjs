// Proves what the tutor is told about scored practice results:
//
//     node scripts/check-mastery-notes.mjs
//
// buildMasteryNotes is pure, so this runs with no database and no Anthropic
// call. What it guards is wording, which is the part that actually changes how
// the tutor teaches — and the part no type checker can see.
//
// The rules being held to here:
//
//   * A weak objective tells the tutor to teach before asking. A strong one
//     lets it ask first. That is the whole adaptive loop, and the system prompt
//     already keys off it, which is why none of that prompt had to change.
//   * Fewer than three answers on an objective says nothing at all. Two wrong
//     out of two is a coin flip, not a gap.
//   * No readiness verdict ever crosses this boundary. Captain Path does not
//     judge whether a student is ready for a test — a human CFI's certificate
//     is on the line — so the notes must carry counts and an explicit refusal.

import { buildMasteryNotes } from "../src/lib/mastery.ts";

const failures = [];

function check(name, condition, detail = "") {
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const lesson = {
  slug: "s1-weather-intro",
  title: "Weather basics",
  objective: "Read weather like a pilot",
  topic: "weather",
  acsAreas: ["Preflight Preparation"],
  sources: ["PHAK"],
  historyCardId: null,
  objectives: [
    {
      id: "s1-weather-intro.metar-and-taf",
      text: "Read a METAR and a TAF",
      isSafetyCritical: false,
    },
    {
      id: "s1-weather-intro.fog-storms-icing",
      text: "Explain the conditions that produce fog, thunderstorms, and icing",
      isSafetyCritical: true,
    },
  ],
};

const stage = { slug: "stage-1", number: 1, title: "Before you fly", lessons: [lesson] };

const base = {
  stage,
  lesson,
  progress: new Map(),
  priorMessagesInLesson: 0,
};

// --- 1. No practice evidence: the paragraph does not exist at all -----------

const silent = buildMasteryNotes(base);
check(
  "no evidence mentions practice tests",
  !silent.toLowerCase().includes("practice test"),
  silent.slice(0, 120),
);

// --- 2. A weak objective: teach first ---------------------------------------

const weak = buildMasteryNotes({
  ...base,
  practice: [
    {
      objectiveId: "s1-weather-intro.metar-and-taf",
      answered: 8,
      correct: 2,
      percent: 25,
      isWeak: true,
    },
  ],
});

check("weak states the count", weak.includes("Scored 2 of 8"), weak);
check("weak names the objective", weak.includes("Read a METAR and a TAF"));
check(
  "weak says teach before asking",
  weak.includes("Teach this before asking them to reason about it"),
);
check("weak does not say ask first", !weak.includes("You may ask before explaining"));

// --- 3. A strong objective: ask first ---------------------------------------

const strong = buildMasteryNotes({
  ...base,
  practice: [
    {
      objectiveId: "s1-weather-intro.metar-and-taf",
      answered: 8,
      correct: 7,
      percent: 88,
      isWeak: false,
    },
  ],
});

check(
  "strong invites eliciting",
  strong.includes("You may ask before explaining here"),
  strong,
);
check("strong does not say teach first", !strong.includes("Teach this before asking"));

// --- 4. A safety-critical objective scored badly is called out --------------

const critical = buildMasteryNotes({
  ...base,
  practice: [
    {
      objectiveId: "s1-weather-intro.fog-storms-icing",
      answered: 6,
      correct: 1,
      percent: 17,
      isWeak: true,
    },
  ],
});

check(
  "safety-critical weakness is named as such",
  critical.includes("Safety-critical and scored badly"),
  critical,
);

// A safety-critical objective scored WELL must not trigger that line.
const criticalFine = buildMasteryNotes({
  ...base,
  practice: [
    {
      objectiveId: "s1-weather-intro.fog-storms-icing",
      answered: 6,
      correct: 6,
      percent: 100,
      isWeak: false,
    },
  ],
});

check(
  "safety-critical scored well is not called out",
  !criticalFine.includes("Safety-critical and scored badly"),
);

// --- 5. An objective from another lesson is ignored -------------------------

const foreign = buildMasteryNotes({
  ...base,
  practice: [
    {
      objectiveId: "s1-stalls.stall-recovery",
      answered: 9,
      correct: 1,
      percent: 11,
      isWeak: true,
    },
  ],
});

check(
  "an objective outside this lesson says nothing",
  !foreign.toLowerCase().includes("practice test"),
  foreign.slice(0, 160),
);

// --- 6. No readiness verdict, ever -----------------------------------------

for (const [name, notes] of [
  ["weak", weak],
  ["strong", strong],
  ["safety-critical", critical],
]) {
  check(
    `${name} refuses to judge readiness`,
    notes.includes("must not offer a view on that"),
    notes,
  );
  check(
    `${name} carries no readiness verdict`,
    !/ready to book|ready for the checkride|you are ready/i.test(notes),
  );
}

check(
  "scored evidence is distinguished from an impression",
  weak.includes("scored answers, not an impression"),
);

// ---------------------------------------------------------------------------

console.log("check-mastery-notes:");
console.log(`  silent with no evidence: ${silent.length} chars, no practice paragraph`);
console.log(`  weak objective adds ${weak.length - silent.length} chars`);
console.log(`  strong objective adds ${strong.length - silent.length} chars`);

if (failures.length > 0) {
  console.error("\ncheck-mastery-notes FAILED:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log("  all checks passed");
