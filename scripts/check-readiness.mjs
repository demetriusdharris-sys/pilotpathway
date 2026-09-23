// Three fixture students, and the judgment each one should get:
//
//     node scripts/check-readiness.mjs
//
// The third is the one that matters. A student at 80-something percent overall
// with one weak area is the case this whole module exists to catch — an
// average hides it, they book the real test, and it costs them $175 and an
// Airman Knowledge Test Report their examiner will read back to them.
//
// Pure functions, no database. What this cannot prove is that the answers read
// out of the database carry the ACS codes these fixtures assume; that is
// checked on the live site once real questions exist.

import {
  computeReadiness,
  readinessHeadline,
  AREA_PASS_PERCENT,
  MINIMUM_ANSWERS_PER_AREA,
} from "../src/lib/practice/readiness.ts";
import { TEST_BLUEPRINT } from "../src/lib/practice/assemble.ts";

const NOW = new Date("2026-09-23T12:00:00Z");
const failures = [];

function answersFor({ area, code, count, correct, daysAgo = 1 }) {
  const answers = [];
  for (let i = 0; i < count; i += 1) {
    answers.push({
      acsCode: code,
      knowledgeArea: area,
      objectiveId: "s1-weather-intro.metar-and-taf",
      isCorrect: i < correct,
      answeredAt: new Date(
        NOW.getTime() - daysAgo * 86_400_000,
      ).toISOString(),
    });
  }
  return answers;
}

/** Every area answered at the given rate, so only the named area differs. */
function student({ rate, count, exceptions = {} }) {
  return TEST_BLUEPRINT.flatMap(({ area }) => {
    const override = exceptions[area];
    const thisRate = override?.rate ?? rate;
    const thisCount = override?.count ?? count;
    return answersFor({
      area,
      code: `PA.${area.slice(0, 3).toUpperCase()}.K1`,
      count: thisCount,
      correct: Math.round(thisCount * thisRate),
    });
  });
}

function check(label, condition, detail) {
  if (!condition) failures.push(`${label}: ${detail}`);
}

// --- 1. Thin data ------------------------------------------------------
// Two answers per area: below the minimum everywhere.
const thin = computeReadiness(student({ rate: 1, count: 2 }), NOW);
const thinWords = readinessHeadline(thin);

check(
  "thin",
  thin.confidence === "insufficient_data",
  `confidence was ${thin.confidence}`,
);
check("thin", thin.score === null, `score was ${thin.score}, expected null`);
check(
  "thin",
  thin.recommendation === "not_enough_data",
  `recommendation was ${thin.recommendation}`,
);
// Every answer was correct — a naive implementation would call this 100%.
check(
  "thin",
  !thinWords.detail.includes("100"),
  "headline leaked a score despite insufficient data",
);

// --- 2. Uniformly strong ----------------------------------------------
const strong = computeReadiness(student({ rate: 0.9, count: 15 }), NOW);
const strongWords = readinessHeadline(strong);

check(
  "strong",
  strong.confidence === "high",
  `confidence was ${strong.confidence}`,
);
check(
  "strong",
  strong.recommendation === "ready_to_book",
  `recommendation was ${strong.recommendation}`,
);
check(
  "strong",
  strong.blockingAreas.length === 0,
  `blocked on ${strong.blockingAreas.map((a) => a.area).join(", ")}`,
);
check(
  "strong",
  strongWords.detail.includes("your instructor"),
  "a ready student was not pointed at their CFI before booking",
);

// --- 3. Strong overall, one weak area ---------------------------------
// The case the spec names: navigation well below the line, everything else
// comfortably above it.
const WEAK_AREA = "Airspace and navigation";
const lopsided = computeReadiness(
  student({
    rate: 0.9,
    count: 15,
    exceptions: { [WEAK_AREA]: { rate: 0.45, count: 15 } },
  }),
  NOW,
);
const lopsidedWords = readinessHeadline(lopsided);

check(
  "lopsided",
  lopsided.score !== null && lopsided.score >= 75,
  `overall score was ${lopsided.score} — the fixture is meant to look good on average`,
);
check(
  "lopsided",
  lopsided.recommendation === "keep_practising",
  `recommendation was ${lopsided.recommendation} — a weak area must block booking`,
);
check(
  "lopsided",
  lopsided.blockingAreas.some((area) => area.area === WEAK_AREA),
  `${WEAK_AREA} was not named as blocking`,
);
check(
  "lopsided",
  lopsidedWords.title.toLowerCase().includes("not yet"),
  `headline was "${lopsidedWords.title}" — it must not read as encouragement`,
);
check(
  "lopsided",
  lopsidedWords.detail.includes(WEAK_AREA),
  "the weak area was not named in the copy the student reads",
);
check(
  "lopsided",
  lopsided.weakCodes.length > 0 && lopsided.weakCodes[0].lessonSlug !== null,
  "no lesson to send them to for the weakest code",
);

// --- 4. Recency actually weights --------------------------------------
// Same student, same counts: wrong long ago and right recently should read
// better than the reverse.
const improving = computeReadiness(
  [
    ...answersFor({ area: "Regulations", code: "PA.REG.K1", count: 10, correct: 2, daysAgo: 120 }),
    ...answersFor({ area: "Regulations", code: "PA.REG.K1", count: 10, correct: 9, daysAgo: 2 }),
  ],
  NOW,
);
const declining = computeReadiness(
  [
    ...answersFor({ area: "Regulations", code: "PA.REG.K1", count: 10, correct: 9, daysAgo: 120 }),
    ...answersFor({ area: "Regulations", code: "PA.REG.K1", count: 10, correct: 2, daysAgo: 2 }),
  ],
  NOW,
);

const improvingArea = improving.areas.find((a) => a.area === "Regulations");
const decliningArea = declining.areas.find((a) => a.area === "Regulations");

check(
  "recency",
  (improvingArea?.percent ?? 0) > (decliningArea?.percent ?? 100),
  `improving read ${improvingArea?.percent}% and declining read ${decliningArea?.percent}% — recent answers are not weighted more`,
);

console.log("check-readiness: three fixture students");
console.log(
  `  thin data      → ${thin.confidence}, score ${thin.score}, ${thin.recommendation}`,
);
console.log(
  `  uniformly strong → ${strong.confidence}, score ${strong.score}%, ${strong.recommendation}`,
);
console.log(
  `  one weak area  → ${lopsided.confidence}, score ${lopsided.score}%, ${lopsided.recommendation}, blocked on: ${lopsided.blockingAreas.map((a) => a.area).join(", ")}`,
);
console.log(`     headline: "${lopsidedWords.title}"`);
console.log(
  `  recency        → improving ${improvingArea?.percent}% vs declining ${decliningArea?.percent}%`,
);
console.log(
  `  thresholds     → ${MINIMUM_ANSWERS_PER_AREA} answers minimum per area, ${AREA_PASS_PERCENT}% area floor`,
);

if (failures.length > 0) {
  console.error(`\ncheck-readiness FAILED:`);
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

console.log("  all checks passed");
