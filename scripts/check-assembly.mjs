// Proves the assembly engine does what Stage 2 claims:
//
//     node scripts/check-assembly.mjs
//
// Runs against a synthetic bank held in memory, NOT against production. A row
// in question_bank marked cfi_approved is servable to real students, so
// seeding one to run a check would be putting fake content in front of
// learners. The engine's selection logic is a pure function precisely so it
// can be exercised without that.
//
// What this does not prove: that the database reads return what the pure
// function expects. That needs approved questions in the bank and is checked
// on the live site once a CFI has signed the first batch.

import { planTest, TEST_BLUEPRINT } from "../src/lib/practice/assemble.ts";

const BANK_PER_AREA = 30;
const TESTS = 10;

function buildBank(perArea) {
  const questions = [];
  for (const { area } of TEST_BLUEPRINT) {
    for (let i = 0; i < perArea; i += 1) {
      questions.push({
        id: `${area}-${i}`,
        knowledgeArea: area,
        acsCode: "SYNTHETIC",
        objectiveId: null,
        stem: `Synthetic question ${i} for ${area}`,
        choices: { A: "a", B: "b", C: "c" },
        figureRef: null,
        figureSupplement: null,
        difficulty: 2,
      });
    }
  }
  return questions;
}

// A seeded generator, so a failure can be reproduced rather than re-rolled.
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const failures = [];

// How many back-to-back tests the bank can supply without ever re-showing a
// question inside the 3-day window. The tightest area decides it: with 30
// questions and 8 slots, weather is exhausted after 3 rounds. Relaxation
// after that point is correct behaviour, not a defect — and the engine
// reporting it is the whole point of the relaxation log.
const freshRounds = Math.min(
  ...TEST_BLUEPRINT.map(({ slots }) => Math.floor(BANK_PER_AREA / slots)),
);

function runRounds({ perArea, rounds, label }) {
  const bank = buildBank(perArea);
  const exposure = new Map();
  const random = seededRandom(20260923);
  let clock = new Date("2026-09-23T09:00:00Z");

  const served = [];
  const orders = new Set();
  const relaxedRounds = [];

  for (let round = 0; round < rounds; round += 1) {
    const candidates = bank.map((question) => ({
      ...question,
      exposure: exposure.get(question.id),
    }));

    const plan = planTest({ candidates, now: clock, random });
    served.push(plan.questions.map((entry) => entry.question.id));
    for (const entry of plan.questions) orders.add(entry.choiceOrder);

    if (plan.relaxations.length > 0) relaxedRounds.push(round + 1);

    if (plan.shortfalls.length > 0) {
      failures.push(
        `${label} round ${round + 1}: could not fill ${JSON.stringify(plan.shortfalls)}`,
      );
    }

    // Distribution must match the blueprint exactly, in every round, whether
    // or not the recency rule had to be relaxed.
    const perAreaCount = new Map();
    for (const entry of plan.questions) {
      const area = entry.question.knowledgeArea;
      perAreaCount.set(area, (perAreaCount.get(area) ?? 0) + 1);
    }
    for (const { area, slots } of TEST_BLUEPRINT) {
      const got = perAreaCount.get(area) ?? 0;
      if (got !== slots) {
        failures.push(
          `${label} round ${round + 1}: ${area} got ${got}, expected ${slots}`,
        );
      }
    }

    for (const entry of plan.questions) {
      const previous = exposure.get(entry.question.id) ?? {
        timesSeen: 0,
        timesCorrect: 0,
        lastSeenAt: null,
      };
      exposure.set(entry.question.id, {
        timesSeen: previous.timesSeen + 1,
        timesCorrect: previous.timesCorrect,
        lastSeenAt: clock.toISOString(),
      });
    }

    clock = new Date(clock.getTime() + 60 * 60 * 1000);
  }

  return { served, orders, relaxedRounds };
}

// --- Scenario 1: a thin bank, taken back to back ------------------------
const thin = runRounds({
  perArea: BANK_PER_AREA,
  rounds: TESTS,
  label: "thin",
});

// While the bank can still supply fresh questions, nothing may repeat and
// nothing may be relaxed.
const seen = new Set();
for (let round = 0; round < freshRounds; round += 1) {
  for (const id of thin.served[round]) {
    if (seen.has(id)) {
      failures.push(
        `Question ${id} repeated within the first ${freshRounds} tests`,
      );
    }
    seen.add(id);
  }
}

const earlyRelaxation = thin.relaxedRounds.filter(
  (round) => round <= freshRounds,
);
if (earlyRelaxation.length > 0) {
  failures.push(
    `Recency relaxed in round(s) ${earlyRelaxation.join(", ")} while fresh questions remained`,
  );
}

// And once it is exhausted, the engine must SAY so rather than silently
// serving a question the student saw an hour ago.
if (!thin.relaxedRounds.includes(freshRounds + 1)) {
  failures.push(
    `Bank was exhausted by round ${freshRounds + 1} but no relaxation was reported`,
  );
}

// --- Scenario 2: a bank deep enough for ten tests -----------------------
const deepPerArea = Math.max(...TEST_BLUEPRINT.map((e) => e.slots)) * TESTS;
const deep = runRounds({ perArea: deepPerArea, rounds: TESTS, label: "deep" });

if (deep.relaxedRounds.length > 0) {
  failures.push(
    `Deep bank relaxed the recency rule in round(s) ${deep.relaxedRounds.join(", ")} — it should never need to`,
  );
}

const deepSeen = new Set();
for (const round of deep.served) {
  for (const id of round) {
    if (deepSeen.has(id)) {
      failures.push(
        `Question ${id} repeated across ${TESTS} tests on a deep bank`,
      );
    }
    deepSeen.add(id);
  }
}

if (deep.orders.size < 4) {
  failures.push(
    `Only ${deep.orders.size} distinct choice orders across ${TESTS} tests — shuffling looks broken`,
  );
}

console.log(
  `check-assembly: ${TESTS} tests of ${thin.served[0].length} questions`,
);
console.log(
  `  thin bank (${BANK_PER_AREA}/area): fresh for ${freshRounds} tests, then relaxed in round(s) ${thin.relaxedRounds.join(", ") || "none"}`,
);
console.log(
  `  deep bank (${deepPerArea}/area): ${deepSeen.size} questions served, zero repeats, zero relaxations`,
);
console.log(`  distinct choice orders seen: ${deep.orders.size} of 6`);

if (failures.length > 0) {
  console.error(`\ncheck-assembly FAILED:`);
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

console.log("  all checks passed");
