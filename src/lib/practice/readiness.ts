import type { SupabaseClient } from "@supabase/supabase-js";
// Relative, not the "@/" alias, on purpose: scripts/check-readiness.mjs runs
// this file directly under Node to exercise the fixtures, and Node does not
// know about tsconfig path aliases. The type-only import above is erased, so
// it costs nothing.
import { TEST_BLUEPRINT } from "./assemble.ts";

/**
 * Is this student ready to sit the real knowledge test?
 *
 * Being wrong here costs a student $175 and an Airman Knowledge Test Report
 * that follows them into the checkride oral, so the whole module is built to
 * fail toward "not yet":
 *
 *   - Readiness is computed per ACS code and rolled up. A single attempt's raw
 *     score is never the answer; it is one noisy sample of a much bigger bank.
 *   - Below three answered questions in an area, the honest output is "not
 *     enough data" — not a number with a caveat, which students read as a
 *     number.
 *   - Recent answers count for more than old ones, because what a student knew
 *     two months ago is weaker evidence than what they knew last week.
 *   - **The recommendation is gated separately from the score.** One weak area
 *     blocks it outright, however good the average looks.
 *
 * Everything here is pure except `loadReadiness`, so the fixtures in
 * scripts/check-readiness.mjs can exercise the judgment without a database.
 */

export type Confidence = "insufficient_data" | "low" | "moderate" | "high";

export type Recommendation =
  "not_enough_data" | "keep_practising" | "ready_to_book";

/** One answered question, as readiness sees it. */
export type ScoredAnswer = {
  acsCode: string;
  knowledgeArea: string;
  objectiveId: string | null;
  isCorrect: boolean;
  answeredAt: string;
};

export type CodeReadiness = {
  acsCode: string;
  knowledgeArea: string;
  objectiveId: string | null;
  /** Lesson to send them to, when the code maps to one of the 48 objectives. */
  lessonSlug: string | null;
  answered: number;
  percent: number;
};

export type AreaReadiness = {
  area: string;
  answered: number;
  /** Null when there is not enough data to say anything. */
  percent: number | null;
  confidence: Confidence;
};

export type ReadinessReport = {
  confidence: Confidence;
  /** Null whenever confidence is insufficient_data. Never a number with a shrug. */
  score: number | null;
  recommendation: Recommendation;
  /** Areas below the pass mark. Any entry here blocks a booking recommendation. */
  blockingAreas: AreaReadiness[];
  /** Weakest codes first — what to actually go and study. */
  weakCodes: CodeReadiness[];
  areas: AreaReadiness[];
  /** Areas still short of the minimum, named so the student knows what to do. */
  areasNeedingData: string[];
};

/** Below this in any one area, no booking recommendation. Matches the FAA pass mark. */
export const AREA_PASS_PERCENT = 70;

/** Fewer answers than this in an area and we say nothing about it. */
export const MINIMUM_ANSWERS_PER_AREA = 3;

/**
 * Recency weighting. An answer from today counts 1; one from 30 days ago
 * counts about half; one from 90 days about an eighth. Chosen so a student who
 * studies hard for a fortnight is not dragged down for months by early
 * mistakes — which is the behaviour that makes a student stop practising.
 */
const HALF_LIFE_DAYS = 30;

function weightFor(answeredAt: string, now: Date): number {
  const answered = Date.parse(answeredAt);
  if (Number.isNaN(answered)) return 1;

  const ageDays = Math.max(0, (now.getTime() - answered) / 86_400_000);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

/**
 * Objective ids are `lesson-slug.fragment` and that format is permanent (0018),
 * so the lesson is derivable without another read.
 */
export function lessonSlugFor(objectiveId: string | null): string | null {
  if (!objectiveId) return null;
  const [slug] = objectiveId.split(".");
  return slug && slug.length > 0 ? slug : null;
}

function confidenceFor(answered: number): Confidence {
  if (answered < MINIMUM_ANSWERS_PER_AREA) return "insufficient_data";
  if (answered < 6) return "low";
  if (answered < 12) return "moderate";
  return "high";
}

const CONFIDENCE_ORDER: Confidence[] = [
  "insufficient_data",
  "low",
  "moderate",
  "high",
];

function lowest(a: Confidence, b: Confidence): Confidence {
  return CONFIDENCE_ORDER.indexOf(a) <= CONFIDENCE_ORDER.indexOf(b) ? a : b;
}

type Tally = { weighted: number; weightedCorrect: number; answered: number };

function emptyTally(): Tally {
  return { weighted: 0, weightedCorrect: 0, answered: 0 };
}

function add(tally: Tally, isCorrect: boolean, weight: number): void {
  tally.weighted += weight;
  tally.answered += 1;
  if (isCorrect) tally.weightedCorrect += weight;
}

function percentOf(tally: Tally): number {
  return tally.weighted === 0
    ? 0
    : Math.round((tally.weightedCorrect / tally.weighted) * 100);
}

export function computeReadiness(
  answers: ScoredAnswer[],
  now: Date = new Date(),
): ReadinessReport {
  const byCode = new Map<
    string,
    Tally & Omit<CodeReadiness, "answered" | "percent">
  >();
  const byArea = new Map<string, Tally>();

  for (const answer of answers) {
    const weight = weightFor(answer.answeredAt, now);

    const code = byCode.get(answer.acsCode) ?? {
      ...emptyTally(),
      acsCode: answer.acsCode,
      knowledgeArea: answer.knowledgeArea,
      objectiveId: answer.objectiveId,
      lessonSlug: lessonSlugFor(answer.objectiveId),
    };
    add(code, answer.isCorrect, weight);
    byCode.set(answer.acsCode, code);

    const area = byArea.get(answer.knowledgeArea) ?? emptyTally();
    add(area, answer.isCorrect, weight);
    byArea.set(answer.knowledgeArea, area);
  }

  // Every area in the blueprint is reported, including ones with no answers at
  // all: a silent omission reads as "fine", and an untouched area is the most
  // common reason a confident-looking student is not ready.
  const areas: AreaReadiness[] = TEST_BLUEPRINT.map(({ area }) => {
    const tally = byArea.get(area) ?? emptyTally();
    const confidence = confidenceFor(tally.answered);

    return {
      area,
      answered: tally.answered,
      percent: confidence === "insufficient_data" ? null : percentOf(tally),
      confidence,
    };
  });

  const areasNeedingData = areas
    .filter((area) => area.confidence === "insufficient_data")
    .map((area) => area.area);

  // Overall confidence is the weakest area's, not an average. A student with
  // nine strong areas and four untouched ones does not have "moderate"
  // evidence about the test as a whole — they have no evidence about a third
  // of it.
  const overallConfidence = areas.reduce<Confidence>(
    (lowestSoFar, area) => lowest(lowestSoFar, area.confidence),
    "high",
  );

  // Weighted by how much of the real test each area is, so being strong in a
  // one-question area cannot offset being weak in an eight-question one.
  let scoreNumerator = 0;
  let scoreDenominator = 0;

  for (const { area, slots } of TEST_BLUEPRINT) {
    const entry = areas.find((candidate) => candidate.area === area);
    if (!entry || entry.percent === null) continue;

    scoreNumerator += entry.percent * slots;
    scoreDenominator += slots;
  }

  const score =
    overallConfidence === "insufficient_data" || scoreDenominator === 0
      ? null
      : Math.round(scoreNumerator / scoreDenominator);

  const blockingAreas = areas.filter(
    (area) => area.percent !== null && area.percent < AREA_PASS_PERCENT,
  );

  const weakCodes: CodeReadiness[] = [...byCode.values()]
    .map((code) => ({
      acsCode: code.acsCode,
      knowledgeArea: code.knowledgeArea,
      objectiveId: code.objectiveId,
      lessonSlug: code.lessonSlug,
      answered: code.answered,
      percent: percentOf(code),
    }))
    .filter((code) => code.percent < AREA_PASS_PERCENT)
    .sort((a, b) => a.percent - b.percent || b.answered - a.answered);

  // The gate, deliberately independent of the score. 82% overall with
  // navigation at 45% is a student about to fail navigation questions on a
  // real test, and an average is exactly what hides that.
  const recommendation: Recommendation =
    overallConfidence === "insufficient_data"
      ? "not_enough_data"
      : blockingAreas.length > 0 || score === null || score < AREA_PASS_PERCENT
        ? "keep_practising"
        : "ready_to_book";

  return {
    confidence: overallConfidence,
    score,
    recommendation,
    blockingAreas,
    weakCodes,
    areas,
    areasNeedingData,
  };
}

/**
 * Plain words for the student. Kept here rather than in the page so the
 * fixtures cover the wording too — this is the part that either tells someone
 * the truth or costs them $175.
 */
export function readinessHeadline(report: ReadinessReport): {
  title: string;
  detail: string;
} {
  if (report.recommendation === "not_enough_data") {
    const missing = report.areasNeedingData.length;

    // Deliberately asymmetric. We refuse to call anyone ready without
    // coverage of every area — but the moment an area is measurably weak, we
    // say so, even while the overall picture is thin. Withholding a known
    // problem because other areas are under-tested tells a student nothing is
    // wrong, which is the opposite of true.
    if (report.blockingAreas.length > 0) {
      const names = report.blockingAreas.map((area) => area.area).join(", ");
      return {
        title: "Too early to judge overall — but one area already looks weak",
        detail: `There is not enough practice across every area to give you a readiness score yet. What we can already see: ${names} ${report.blockingAreas.length === 1 ? "is" : "are"} below ${AREA_PASS_PERCENT}%. That is worth working on now rather than after another test.`,
      };
    }

    return {
      title: "Not enough practice yet to say",
      detail:
        missing === 1
          ? `One knowledge area still needs at least ${MINIMUM_ANSWERS_PER_AREA} answered questions before we can tell you anything useful. A full-length test covers every area at once.`
          : `${missing} knowledge areas still need at least ${MINIMUM_ANSWERS_PER_AREA} answered questions each. A full-length test covers every area at once — quick tests skip the smallest ones. We would rather say nothing than guess at this.`,
    };
  }

  if (report.recommendation === "keep_practising") {
    if (report.blockingAreas.length > 0) {
      const names = report.blockingAreas.map((area) => area.area).join(", ");
      return {
        title: "Not yet — one weak area is enough to fail",
        detail: `Your overall practice score is ${report.score}%, but ${names} ${report.blockingAreas.length === 1 ? "is" : "are"} below ${AREA_PASS_PERCENT}%. The real test draws from every area, so an average hides this. Work on that first.`,
      };
    }

    return {
      title: "Getting there",
      detail: `Your overall practice score is ${report.score}%, and the test passes at ${AREA_PASS_PERCENT}%. Keep practising until you are clear of the line rather than on it.`,
    };
  }

  return {
    title: "Your practice says you are ready",
    detail: `You are at ${report.score}% overall with every knowledge area above ${AREA_PASS_PERCENT}%. Practice is not the real test — talk to your instructor before you book, because the endorsement is theirs to give.`,
  };
}

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Every graded answer this student has given, across all their attempts.
 *
 * Read with the service role: `is_correct` is deliberately not granted to
 * students, so this cannot be done from the browser — which is the point.
 * Scoped to the one student id the caller read from `getUser()`.
 */
export async function loadReadiness(
  admin: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<ReadinessReport> {
  const { data: attempts, error: attemptError } = await admin
    .from("practice_attempts")
    .select("id")
    .eq("user_id", userId)
    .not("completed_at", "is", null);

  if (attemptError) {
    throw new Error(`readiness attempts: ${attemptError.message}`);
  }

  const attemptIds = ((attempts ?? []) as Row[])
    .map((row) => text(row.id))
    .filter((id): id is string => id !== null);

  if (attemptIds.length === 0) {
    return computeReadiness([], now);
  }

  const { data: answers, error: answerError } = await admin
    .from("practice_answers")
    .select("question_id, is_correct, answered_at")
    .in("attempt_id", attemptIds)
    .not("is_correct", "is", null);

  if (answerError) {
    throw new Error(`readiness answers: ${answerError.message}`);
  }

  const answerRows = (answers ?? []) as Row[];
  const questionIds = [
    ...new Set(
      answerRows
        .map((row) => text(row.question_id))
        .filter((id): id is string => id !== null),
    ),
  ];

  if (questionIds.length === 0) {
    return computeReadiness([], now);
  }

  const { data: questions, error: questionError } = await admin
    .from("question_bank")
    .select("id, acs_code, knowledge_area, objective_id")
    .in("id", questionIds);

  if (questionError) {
    throw new Error(`readiness questions: ${questionError.message}`);
  }

  const byId = new Map<string, Row>();
  for (const row of (questions ?? []) as Row[]) {
    const id = text(row.id);
    if (id) byId.set(id, row);
  }

  const scored: ScoredAnswer[] = [];

  for (const row of answerRows) {
    const questionId = text(row.question_id);
    const answeredAt = text(row.answered_at);
    if (!questionId || typeof row.is_correct !== "boolean") continue;

    const question = byId.get(questionId);
    const acsCode = text(question?.acs_code);
    const knowledgeArea = text(question?.knowledge_area);
    if (!acsCode || !knowledgeArea) continue;

    scored.push({
      acsCode,
      knowledgeArea,
      objectiveId: text(question?.objective_id),
      isCorrect: row.is_correct,
      answeredAt: answeredAt ?? new Date(0).toISOString(),
    });
  }

  return computeReadiness(scored, now);
}
