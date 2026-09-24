import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Assembling a practice test.
 *
 * Two halves, deliberately separated:
 *
 *   - `planTest` is pure. Given candidate questions and a clock it returns the
 *     test, with no database and no globals. That is what makes the engine
 *     testable without inserting fake approved questions into production — a
 *     bank row marked `cfi_approved` is servable to real students, so seeding
 *     one to run a test would be putting synthetic content in front of
 *     learners.
 *   - `assemblePracticeTest` is the thin wrapper that reads the bank and the
 *     student's exposure, then calls it.
 *
 * Only `cfi_approved` questions are ever candidates. The RLS policy in 0022
 * enforces that too; this is the belt to its braces, and the read goes through
 * the student's own client so the policy is what actually decides.
 */

/** The choices as they live in the bank. */
export type CanonicalChoice = "A" | "B" | "C";

/**
 * THE BLUEPRINT IS OURS, NOT THE FAA'S.
 *
 * 14 CFR 61.105(b) names the knowledge areas a private pilot applicant is
 * tested on; it does not publish how many questions of each appear on a test,
 * and the FAA's active bank is not public. These weights are our judgment
 * about a sensible spread, they sum to 60, and **a CFI should review them**
 * before anyone reads a readiness number built on them.
 *
 * Tune here. Nothing below reads a hard-coded area name.
 */
export const TEST_BLUEPRINT: readonly { area: string; slots: number }[] = [
  { area: "Regulations", slots: 7 },
  { area: "Accident reporting", slots: 1 },
  { area: "FAA publications and charts", slots: 3 },
  { area: "Radio communications and ATC", slots: 3 },
  { area: "Aviation weather and weather services", slots: 8 },
  { area: "Safe and efficient operation", slots: 4 },
  { area: "Density altitude and performance", slots: 4 },
  { area: "Weight and balance", slots: 4 },
  { area: "Aerodynamics, powerplants and systems", slots: 7 },
  { area: "Stall awareness, spins and recovery", slots: 3 },
  { area: "Aeronautical decision making", slots: 4 },
  { area: "Preflight action and flight planning", slots: 5 },
  { area: "Airspace and navigation", slots: 7 },
];

export const FULL_TEST_QUESTIONS = TEST_BLUEPRINT.reduce(
  (total, entry) => total + entry.slots,
  0,
);

export const QUICK_TEST_QUESTIONS = 20;

/** A question as the engine sees it. Never includes the answer. */
export type CandidateQuestion = {
  id: string;
  knowledgeArea: string;
  acsCode: string;
  objectiveId: string | null;
  stem: string;
  choices: Record<CanonicalChoice, string>;
  figureRef: string | null;
  figureSupplement: string | null;
  difficulty: number;
  /** This student's history with it. Absent means never seen. */
  exposure?: {
    timesSeen: number;
    timesCorrect: number;
    lastSeenAt: string | null;
  };
};

export type PlannedQuestion = {
  position: number;
  question: CandidateQuestion;
  /** Display order, e.g. "BCA" — the student sees B first. */
  choiceOrder: string;
};

export type AssemblyRelaxation = {
  area: string;
  /** How far the recency exclusion had to be loosened to fill the slots. */
  relaxedTo: "24h" | "none";
  slotsRequested: number;
  candidatesAvailable: number;
};

export type TestPlan = {
  questions: PlannedQuestion[];
  /** Areas the blueprint asked for and the bank could not fill. */
  shortfalls: { area: string; requested: number; supplied: number }[];
  relaxations: AssemblyRelaxation[];
};

export type PlanOptions = {
  candidates: CandidateQuestion[];
  /** Area name → slots. Defaults to the full blueprint. */
  blueprint?: readonly { area: string; slots: number }[];
  now?: Date;
  /** Injected so tests are reproducible. Defaults to Math.random. */
  random?: () => number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HARD_EXCLUSION_DAYS = 3;
const SPACED_REPETITION_DAYS = 7;

const CHOICE_ORDERS: readonly string[] = [
  "ABC",
  "ACB",
  "BAC",
  "BCA",
  "CAB",
  "CBA",
];

/** Fisher–Yates. Returns a new array; never mutates the input. */
function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function ageInMs(lastSeenAt: string | null | undefined, now: Date): number {
  if (!lastSeenAt) return Number.POSITIVE_INFINITY;
  const seen = Date.parse(lastSeenAt);
  return Number.isNaN(seen) ? Number.POSITIVE_INFINITY : now.getTime() - seen;
}

/**
 * Priority tiers, highest first:
 *
 *   0. Never seen by this student.
 *   1. Answered wrong at least once and not seen for a week — the spaced
 *      repetition case, and the reason a practice test is worth more than a
 *      quiz: it brings back what you got wrong, late enough to be a real test
 *      of whether it stuck.
 *   2. Everything else, oldest first.
 */
function tierOf(question: CandidateQuestion, now: Date): number {
  const exposure = question.exposure;

  if (!exposure || exposure.timesSeen === 0) return 0;

  const wrongBefore = exposure.timesCorrect < exposure.timesSeen;
  const staleEnough =
    ageInMs(exposure.lastSeenAt, now) >= SPACED_REPETITION_DAYS * DAY_MS;

  if (wrongBefore && staleEnough) return 1;

  return 2;
}

/**
 * Picks the questions for one area.
 *
 * The recency rule is a floor, not a preference: a question seen in the last
 * three days is excluded outright. It relaxes to 24 hours, and then to nothing,
 * only when the bank for that area cannot otherwise fill the slots — and every
 * relaxation is reported, because a relaxation is the bank telling you it is
 * too thin in that area, which is information the admin page exists to show.
 */
function selectForArea(
  area: string,
  slots: number,
  pool: CandidateQuestion[],
  now: Date,
  random: () => number,
): { chosen: CandidateQuestion[]; relaxation: AssemblyRelaxation | null } {
  const thresholds: {
    ms: number;
    relaxedTo: AssemblyRelaxation["relaxedTo"] | null;
  }[] = [
    { ms: HARD_EXCLUSION_DAYS * DAY_MS, relaxedTo: null },
    { ms: DAY_MS, relaxedTo: "24h" },
    { ms: 0, relaxedTo: "none" },
  ];

  let relaxation: AssemblyRelaxation | null = null;
  let eligible: CandidateQuestion[] = [];

  for (const threshold of thresholds) {
    eligible = pool.filter(
      (question) => ageInMs(question.exposure?.lastSeenAt, now) >= threshold.ms,
    );

    if (eligible.length >= slots) {
      if (threshold.relaxedTo) {
        relaxation = {
          area,
          relaxedTo: threshold.relaxedTo,
          slotsRequested: slots,
          candidatesAvailable: eligible.length,
        };
      }
      break;
    }

    // Last threshold: take what there is and report the shortfall upward.
    if (threshold.ms === 0) {
      relaxation = {
        area,
        relaxedTo: "none",
        slotsRequested: slots,
        candidatesAvailable: eligible.length,
      };
    }
  }

  // Shuffle within each tier before taking, so two students with identical
  // histories still get different tests.
  const byTier = new Map<number, CandidateQuestion[]>();
  for (const question of eligible) {
    const tier = tierOf(question, now);
    byTier.set(tier, [...(byTier.get(tier) ?? []), question]);
  }

  const chosen: CandidateQuestion[] = [];

  for (const tier of [...byTier.keys()].sort((a, b) => a - b)) {
    if (chosen.length >= slots) break;

    const bucket = byTier.get(tier) ?? [];

    // Tier 2 is "seen and answered correctly", where oldest-first is the
    // meaningful order; shuffling then breaks ties among equally stale ones.
    const ordered =
      tier === 2
        ? shuffle(bucket, random).sort(
            (a, b) =>
              ageInMs(b.exposure?.lastSeenAt, now) -
              ageInMs(a.exposure?.lastSeenAt, now),
          )
        : shuffle(bucket, random);

    chosen.push(...ordered.slice(0, slots - chosen.length));
  }

  return { chosen, relaxation };
}

/** Scales the blueprint to a shorter test, keeping the shape. */
/**
 * Can the bank fill this blueprint, area by area?
 *
 * A test that silently leaves out regulations or weather is worse than no
 * test, so both whole-test modes are refused rather than quietly shortened.
 * The rule lives here, next to the blueprint it depends on, and is used for
 * the full test and the quick test alike — they differ only in their
 * blueprint, and having two copies of the rule is how the quick test came to
 * be offered on four questions in one area.
 *
 * Areas with no slots are skipped: at the quick test's size the smallest areas
 * round to zero, which is why a quick test cannot mature a readiness score.
 */
export function canFillBlueprint(
  health: readonly { area: string; approved: number }[],
  blueprint: readonly { area: string; slots: number }[],
): boolean {
  const approvedByArea = new Map(
    health.map((entry) => [entry.area, entry.approved] as const),
  );

  return blueprint
    .filter((entry) => entry.slots > 0)
    .every((entry) => (approvedByArea.get(entry.area) ?? 0) >= entry.slots);
}

export function scaleBlueprint(
  blueprint: readonly { area: string; slots: number }[],
  total: number,
): { area: string; slots: number }[] {
  const full = blueprint.reduce((sum, entry) => sum + entry.slots, 0);

  const scaled = blueprint.map((entry) => {
    const exact = (entry.slots / full) * total;
    return { area: entry.area, slots: Math.floor(exact), remainder: exact % 1 };
  });

  // Largest remainder, so the rounding loss lands on the areas that deserve it
  // rather than always on the last one in the list.
  let assigned = scaled.reduce((sum, entry) => sum + entry.slots, 0);
  const byRemainder = [...scaled].sort((a, b) => b.remainder - a.remainder);

  let index = 0;
  while (assigned < total && byRemainder.length > 0) {
    byRemainder[index % byRemainder.length].slots += 1;
    assigned += 1;
    index += 1;
  }

  return scaled.map(({ area, slots }) => ({ area, slots }));
}

/** The pure core. No database, no clock of its own, no global randomness. */
export function planTest({
  candidates,
  blueprint = TEST_BLUEPRINT,
  now = new Date(),
  random = Math.random,
}: PlanOptions): TestPlan {
  const byArea = new Map<string, CandidateQuestion[]>();
  for (const question of candidates) {
    byArea.set(question.knowledgeArea, [
      ...(byArea.get(question.knowledgeArea) ?? []),
      question,
    ]);
  }

  const picked: CandidateQuestion[] = [];
  const shortfalls: TestPlan["shortfalls"] = [];
  const relaxations: AssemblyRelaxation[] = [];

  for (const { area, slots } of blueprint) {
    if (slots <= 0) continue;

    const { chosen, relaxation } = selectForArea(
      area,
      slots,
      byArea.get(area) ?? [],
      now,
      random,
    );

    if (relaxation) relaxations.push(relaxation);
    if (chosen.length < slots) {
      shortfalls.push({ area, requested: slots, supplied: chosen.length });
    }

    picked.push(...chosen);
  }

  // The whole test is shuffled at the end so areas are interleaved rather than
  // arriving in blueprint blocks — a student should not be able to tell where
  // the weather section starts.
  const ordered = shuffle(picked, random);

  return {
    questions: ordered.map((question, index) => ({
      position: index + 1,
      question,
      choiceOrder:
        CHOICE_ORDERS[Math.floor(random() * CHOICE_ORDERS.length)] ?? "ABC",
    })),
    shortfalls,
    relaxations,
  };
}

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toCandidate(row: Row): CandidateQuestion | null {
  const id = text(row.id);
  const knowledgeArea = text(row.knowledge_area);
  const acsCode = text(row.acs_code);
  const stem = text(row.stem);
  const a = text(row.choice_a);
  const b = text(row.choice_b);
  const c = text(row.choice_c);

  if (!id || !knowledgeArea || !acsCode || !stem || !a || !b || !c) {
    return null;
  }

  return {
    id,
    knowledgeArea,
    acsCode,
    objectiveId: text(row.objective_id),
    stem,
    choices: { A: a, B: b, C: c },
    figureRef: text(row.figure_ref),
    figureSupplement: text(row.figure_supplement),
    difficulty: typeof row.difficulty === "number" ? row.difficulty : 2,
  };
}

export type AssembleOptions = {
  mode: "full_60" | "quick_20" | "targeted";
  /** Required for `targeted`: a knowledge area name. */
  target?: string;
  now?: Date;
  random?: () => number;
};

/**
 * Reads the bank and this student's exposure, then plans the test.
 *
 * Reads with the caller's own client, so 0022's policy — approved questions
 * only, own exposure only — is what decides what can be seen. The answer
 * columns are not granted to that role at all, so nothing here could leak one
 * even if it tried to.
 */
export async function assemblePracticeTest(
  supabase: SupabaseClient,
  userId: string,
  options: AssembleOptions,
): Promise<TestPlan> {
  const { data: questionRows, error: questionError } = await supabase
    .from("question_bank")
    .select(
      "id, acs_code, knowledge_area, objective_id, stem, choice_a, choice_b, choice_c, figure_ref, figure_supplement, difficulty",
    )
    .eq("review_status", "cfi_approved");

  if (questionError) {
    throw new Error(`question bank: ${questionError.message}`);
  }

  const { data: exposureRows, error: exposureError } = await supabase
    .from("question_exposure")
    .select("question_id, times_seen, times_correct, last_seen_at")
    .eq("user_id", userId);

  if (exposureError) {
    throw new Error(`question exposure: ${exposureError.message}`);
  }

  const exposureById = new Map<string, CandidateQuestion["exposure"]>();
  for (const row of (exposureRows ?? []) as Row[]) {
    const questionId = text(row.question_id);
    if (!questionId) continue;

    exposureById.set(questionId, {
      timesSeen: typeof row.times_seen === "number" ? row.times_seen : 0,
      timesCorrect:
        typeof row.times_correct === "number" ? row.times_correct : 0,
      lastSeenAt: text(row.last_seen_at),
    });
  }

  const candidates: CandidateQuestion[] = [];
  for (const row of (questionRows ?? []) as Row[]) {
    const candidate = toCandidate(row);
    if (!candidate) continue;

    candidate.exposure = exposureById.get(candidate.id);
    candidates.push(candidate);
  }

  const blueprint =
    options.mode === "targeted"
      ? [{ area: options.target ?? "", slots: QUICK_TEST_QUESTIONS }]
      : options.mode === "quick_20"
        ? scaleBlueprint(TEST_BLUEPRINT, QUICK_TEST_QUESTIONS)
        : TEST_BLUEPRINT;

  const plan = planTest({
    candidates,
    blueprint,
    now: options.now,
    random: options.random,
  });

  // A relaxation means the bank is too thin in that area to keep a student off
  // questions they just saw. That is the signal to write more, and it is worth
  // a log line rather than being swallowed by the admin page nobody opens.
  for (const relaxation of plan.relaxations) {
    console.info("Practice assembly relaxed the recency rule:", {
      userId,
      ...relaxation,
    });
  }

  for (const shortfall of plan.shortfalls) {
    console.info("Practice assembly could not fill an area:", {
      userId,
      ...shortfall,
    });
  }

  return plan;
}

export type BankHealthEntry = {
  area: string;
  slots: number;
  approved: number;
  /** Approved questions per slot. Below 1 means a test cannot be filled. */
  ratio: number;
};

/**
 * How healthy the bank is, per area. For an admin page, never for a student:
 * a learner does not need to know the weather section is thin, and telling
 * them would only undermine a score that is already honest about its
 * confidence.
 */
export async function getBankHealth(
  supabase: SupabaseClient,
): Promise<BankHealthEntry[]> {
  const { data, error } = await supabase
    .from("question_bank")
    .select("knowledge_area")
    .eq("review_status", "cfi_approved");

  if (error) {
    throw new Error(`bank health: ${error.message}`);
  }

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Row[]) {
    const area = text(row.knowledge_area);
    if (!area) continue;
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }

  const health = TEST_BLUEPRINT.map(({ area, slots }) => {
    const approved = counts.get(area) ?? 0;
    return { area, slots, approved, ratio: slots === 0 ? 0 : approved / slots };
  });

  // Areas in the bank that the blueprint does not name — a typo in a question's
  // knowledge_area would otherwise be invisible, since it can never be drawn.
  for (const [area, approved] of counts) {
    if (!TEST_BLUEPRINT.some((entry) => entry.area === area)) {
      health.push({ area, slots: 0, approved, ratio: 0 });
    }
  }

  return health.sort((a, b) => a.ratio - b.ratio);
}
