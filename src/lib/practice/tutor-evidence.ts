import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lesson } from "@/lib/curriculum";

/**
 * Scored practice-test evidence for the objectives of one lesson, for the tutor.
 *
 * Closes rule 6 of the practice-test spec: a weak ACS code already links to its
 * lesson, but until now the tutor had no idea a student had just scored 30% on
 * the very thing it was about to teach — so it taught identically either way,
 * which is the opposite of adaptive.
 *
 * WHY NOT REUSE loadReadiness. That reads every answer the student has ever
 * given and computes a whole report, including a recommendation. Two reasons
 * not to: it is wasteful on a latency-sensitive call that runs on every tutor
 * message, and the tutor must never see a readiness verdict. Captain Path does
 * not judge checkride readiness — that is a human CFI's certificate on the
 * line — so what crosses this boundary is counts, and nothing else.
 *
 * WHY THE SERVICE ROLE. `practice_answers.is_correct` is granted to nobody in
 * the browser, so a student cannot ask mid-test whether they were right. The
 * caller passes an admin client; every query here is scoped to the user id the
 * route already authenticated.
 *
 * This is scored evidence, unlike `objective_signals`, which is the tutor's own
 * read of a conversation. The structural wall between those two streams runs in
 * one direction only: inferred evidence must never reach a report, but scored
 * evidence reaching the tutor is exactly what it is for.
 */

/** Below this, teach before asking. The same threshold readiness uses. */
const WEAK_BELOW_PERCENT = 70;

/**
 * Fewer answers than this on one objective and nothing is said.
 *
 * Two wrong out of two is not evidence of a gap, and telling the tutor it is
 * would have it re-teach something on a coin flip.
 */
const MINIMUM_ANSWERS = 3;

export type PracticeEvidence = {
  objectiveId: string;
  answered: number;
  correct: number;
  percent: number;
  isWeak: boolean;
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function loadPracticeEvidenceForLesson(
  admin: SupabaseClient,
  userId: string,
  lesson: Lesson,
): Promise<PracticeEvidence[]> {
  const objectiveIds = lesson.objectives.map((objective) => objective.id);

  if (objectiveIds.length === 0) return [];

  // Questions keyed to this lesson's objectives. A question with no objective
  // is ignored: it may well be relevant, but we cannot say which lesson it
  // belongs to, and guessing is how a tutor re-teaches the wrong thing.
  const { data: questions, error: questionError } = await admin
    .from("question_bank")
    .select("id, objective_id")
    .in("objective_id", objectiveIds);

  if (questionError) {
    throw new Error(`practice evidence questions: ${questionError.message}`);
  }

  const objectiveByQuestion = new Map<string, string>();
  for (const row of (questions ?? []) as Row[]) {
    const id = text(row.id);
    const objectiveId = text(row.objective_id);
    if (id && objectiveId) objectiveByQuestion.set(id, objectiveId);
  }

  if (objectiveByQuestion.size === 0) return [];

  const { data: attempts, error: attemptError } = await admin
    .from("practice_attempts")
    .select("id")
    .eq("user_id", userId)
    .not("completed_at", "is", null);

  if (attemptError) {
    throw new Error(`practice evidence attempts: ${attemptError.message}`);
  }

  const attemptIds = ((attempts ?? []) as Row[])
    .map((row) => text(row.id))
    .filter((id): id is string => id !== null);

  if (attemptIds.length === 0) return [];

  // Only graded answers. An unanswered question is null and stays out — a
  // skipped question and a wrong one are different facts.
  const { data: answers, error: answerError } = await admin
    .from("practice_answers")
    .select("question_id, is_correct")
    .in("attempt_id", attemptIds)
    .in("question_id", [...objectiveByQuestion.keys()])
    .not("is_correct", "is", null);

  if (answerError) {
    throw new Error(`practice evidence answers: ${answerError.message}`);
  }

  const tally = new Map<string, { answered: number; correct: number }>();

  for (const row of (answers ?? []) as Row[]) {
    const questionId = text(row.question_id);
    if (!questionId || typeof row.is_correct !== "boolean") continue;

    const objectiveId = objectiveByQuestion.get(questionId);
    if (!objectiveId) continue;

    const entry = tally.get(objectiveId) ?? { answered: 0, correct: 0 };
    entry.answered += 1;
    if (row.is_correct) entry.correct += 1;
    tally.set(objectiveId, entry);
  }

  const evidence: PracticeEvidence[] = [];

  // Lesson order, so the tutor reads them in the sequence it teaches them.
  for (const objective of lesson.objectives) {
    const entry = tally.get(objective.id);
    if (!entry || entry.answered < MINIMUM_ANSWERS) continue;

    const percent = Math.round((entry.correct / entry.answered) * 100);

    evidence.push({
      objectiveId: objective.id,
      answered: entry.answered,
      correct: entry.correct,
      percent,
      isWeak: percent < WEAK_BELOW_PERCENT,
    });
  }

  return evidence;
}
